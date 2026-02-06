import z from 'zod';
import { DAY_MILLIS, dateDiff, toLocalIso } from '@/lib/date';
import { MessageClient } from '@/lib/messaging';
import { MonitorDownReason, type MonitorResponse } from '@/lib/monitor';
import { Monitor } from '@/lib/monitor/abc';
import type { DomainMonitorParams } from '@/lib/monitor/domain/schema';
import { isErrorLike, roundTo } from '@/lib/utils';
import { name, version } from '@/package.json';

const RE_BARE_HOST = /^(?:.*:\/\/)?(?<host>[a-z\d.]+)(:(?<port>\d+))?/;

const schema = z.object({ events: z.array(z.object({ eventAction: z.string(), eventDate: z.coerce.date() })) });

const messageClient = new MessageClient(import.meta.url);

export class DomainMonitor extends Monitor<DomainMonitorParams> {
  constructor(params: DomainMonitorParams) {
    super(params, messageClient);
  }
  async check(): Promise<MonitorResponse<'domain'>> {
    try {
      const match = RE_BARE_HOST.exec(this.params.address);
      if (!match?.groups)
        return {
          kind: 'domain',
          ok: false,
          reason: MonitorDownReason.InvalidParams,
          message: `Could not parse domain ${this.params.address}`,
        };
      const domain = match.groups.host;
      const url = `https://www.rdap.net/domain/${domain}`;
      const controller = new AbortController();
      const { promise, reject, resolve } = Promise.withResolvers<never>();
      const maxLatency = this.params.upWhen?.latency ?? this.messageClient.settings.monitor.defaultTimeout;
      // biome-ignore format: no
      const timeout = setTimeout(() => {
        controller.abort();
        reject(`Timed out after ${maxLatency}ms`);
      }, maxLatency );
      const started = performance.now();
      // fetch will throw on abort signal, though it may not be immediate (i.e. if the remote does not respond at all)
      // Promise.race works around this and leaves the fetch dangling until it hits some unknown timeout
      const response = await Promise.race([
        fetch(url, {
          headers: { 'User-Agent': `${name} ${version}` },
          signal: controller.signal,
          keepalive: false,
          cache: 'no-store',
        }),
        promise,
      ]);
      const latency = roundTo(performance.now() - started, 3);
      clearTimeout(timeout);
      resolve(null as never);
      const json = await response.json();
      const parsed = schema.safeParse(json);
      if (!parsed.success)
        return {
          kind: 'domain',
          ok: false,
          reason: MonitorDownReason.InvalidResponse,
          message: `Could not parse response: ${parsed.error}`,
        };
      const expirationDate = parsed.data.events.find((event) => event.eventAction === 'expiration')?.eventDate;
      if (!expirationDate)
        return {
          kind: 'domain',
          ok: false,
          reason: MonitorDownReason.InvalidResponse,
          message: `Could not find an expiration date in response`,
        };
      const expirationDays = dateDiff(expirationDate) / DAY_MILLIS;
      if (expirationDays <= 0)
        return {
          kind: 'domain',
          ok: false,
          reason: MonitorDownReason.Expired,
          message: `Domain expired at ${toLocalIso(expirationDate, { endAt: 's' })}`,
        };
      if (typeof this.params.upWhen?.days === 'number' && expirationDays <= this.params.upWhen.days)
        return {
          kind: 'domain',
          ok: false,
          reason: MonitorDownReason.QueryNotSatisfied,
          message: `Domain will expire at ${toLocalIso(expirationDate, { endAt: 's' })}`,
        };
      return {
        kind: 'domain',
        ok: true,
        latency,
        message: `Domain will expire at ${toLocalIso(expirationDate, { endAt: 's' })}`,
      };
    } catch (err) {
      if (isErrorLike(err) && err.name === 'AbortError')
        return { kind: 'domain', ok: false, reason: MonitorDownReason.Timeout, message: err.message };
      return { kind: 'domain', ok: false, reason: MonitorDownReason.Error, message: String(err) };
    }
  }
}
