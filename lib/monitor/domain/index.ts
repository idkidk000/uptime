import z from 'zod';
import { DAY_MILLIS, dateDiff, toLocalIso } from '@/lib/date';
import { Monitor, MonitorDownReason, type MonitorResponse } from '@/lib/monitor';
import type { DomainMonitorParams } from '@/lib/monitor/domain/schema';
import { roundTo } from '@/lib/utils';
import { name, version } from '@/package.json';

const RE_BARE_HOST = /^(?:.*:\/\/)?(?<host>[a-z\d.]+)(:(?<port>\d+))?/;

const schema = z.object({ events: z.array(z.object({ eventAction: z.string(), eventDate: z.coerce.date() })) });

//FIXME: this could almost be a HttpMonitor jsonata query if i'd designed things a bit better
export class DomainMonitor extends Monitor<DomainMonitorParams> {
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
      const timeout = setTimeout(
        () => {
          controller.abort();
          reject('timeout');
        },
        (this.params.upWhen?.latency ?? this.settingsClient.current.monitor.defaultTimeout) + 100
      );
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
      if (Error.isError(err) && err.name === 'AbortError')
        return { kind: 'domain', ok: false, reason: MonitorDownReason.Timeout, message: err.message };
      return { kind: 'domain', ok: false, reason: MonitorDownReason.Error, message: String(err) };
    }
  }
}
