import { DAY_MILLIS, dateDiff, toLocalIso } from '@/lib/date';
import { type BaseMonitorParams, type BaseMonitorResponse, Monitor, MonitorDownReason } from '@/lib/monitor';
import { roundTo } from '@/lib/utils';
import { name, version } from '@/package.json';

const RE_BARE_HOST = /^(?:.*:\/\/)?(?<host>[a-z\d.]+)(:(?<port>\d+))?/;

export interface DomainMonitorParams extends BaseMonitorParams {
  kind: 'domain';
  upWhen?: {
    latency?: number;
    days?: number;
  };
}

export type DomainMonitorResponse = BaseMonitorResponse & {
  kind: 'domain';
};

//FIXME: this could almost be a HttpMonitor jsonata query if i'd designed things a bit better
export class DomainMonitor extends Monitor<DomainMonitorParams, DomainMonitorResponse> {
  async check(): Promise<DomainMonitorResponse> {
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
        (this.params.upWhen?.latency ?? this.settingsClient.current.defaultMonitorTimeout) + 100
      );
      const started = performance.now();
      // fetch will throw on abort signal, though it may not be immediate (i.e. if the remote does not respond at all)
      // Promise.race works around this and leaves the fetch dangling until it hits some unknown timeout
      const response = await Promise.race([
        fetch(url, {
          headers: { 'User-Agent': `${name} ${version}` },
          signal: controller.signal,
          keepalive: false,
        }),
        promise,
      ]);
      const latency = roundTo(performance.now() - started, 3);
      clearTimeout(timeout);
      resolve(null as never);
      const json = await response.json();
      // TODO: probably could do with a zod/similar schema
      const expirationDateString: string | undefined =
        json &&
        typeof json === 'object' &&
        'events' in json &&
        Array.isArray(json.events) &&
        json.events.find(
          (event: unknown) =>
            event &&
            typeof event === 'object' &&
            'eventAction' in event &&
            'eventDate' in event &&
            typeof event.eventAction === 'string' &&
            typeof event.eventDate === 'string' &&
            event.eventAction === 'expiration'
        )?.eventDate;
      if (typeof expirationDateString === 'undefined')
        return {
          kind: 'domain',
          ok: false,
          reason: MonitorDownReason.InvalidResponse,
          // openrdap.org redirects to the authoritative endpoint
          message: `Could not parse response from ${response.url}`,
        };
      const expirationDate = new Date(expirationDateString);
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
