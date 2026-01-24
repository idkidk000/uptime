import { connect } from 'node:tls';
import { dateDiff, toLocalIso } from '@/lib/date';
import { type BaseMonitorParams, type BaseMonitorResponse, Monitor, MonitorDownReason } from '@/lib/monitor';
import { roundTo } from '@/lib/utils';

// don't enable global on a top-level regex - it persists some state between execs and behaves strangely
const RE_BARE_HOST = /^(?:.*:\/\/)?(?<host>[a-z\d.]+)(:(?<port>\d+))?/;

export interface SslMonitorParams extends BaseMonitorParams {
  kind: 'ssl';
  port?: number;
  upWhen?: {
    latency?: number;
    days?: number;
    trusted?: boolean;
  };
}

export type SslMonitorResponse = BaseMonitorResponse & {
  kind: 'ssl';
};

export class SslMonitor extends Monitor<SslMonitorParams, SslMonitorResponse> {
  async check(): Promise<SslMonitorResponse> {
    const match = RE_BARE_HOST.exec(this.params.address);
    if (!match?.groups)
      return {
        kind: 'ssl',
        ok: false,
        reason: MonitorDownReason.InvalidParams,
        message: `Could not parse address ${this.params.address}`,
      };
    const host = match.groups.host;
    const port = Number(this.params.port ?? match.groups.port ?? 443);
    const started = performance.now();
    try {
      const socket = connect({
        host,
        port,
        rejectUnauthorized: false,
        timeout: this.settingsClient.current.defaultMonitorTimeout,
      });
      try {
        const { promise, resolve, reject } = Promise.withResolvers();
        socket.addListener('error', reject);
        // this is the correct event to wait on. disregard code samples which wait on 'connect'. the cert is not available at that time
        socket.addListener('secureConnect', resolve);
        await promise;
        const cert = socket.getPeerCertificate();
        const latency = roundTo(performance.now() - started, 3);
        if (typeof this.params.upWhen?.latency === 'number' && latency > this.params.upWhen.latency)
          return {
            kind: 'ssl',
            ok: false,
            reason: MonitorDownReason.Timeout,
            message: `Connected in ${latency}ms`,
          };
        if (!cert.fingerprint)
          return {
            kind: 'ssl',
            ok: false,
            reason: MonitorDownReason.InvalidResponse,
            message: 'Server did not send a certificate',
          };
        const trusted = socket.authorized;
        if (typeof this.params.upWhen?.trusted !== 'undefined' && trusted !== this.params.upWhen.trusted)
          return {
            kind: 'ssl',
            ok: false,
            reason: MonitorDownReason.QueryNotSatisfied,
            message: `Expected ${this.params.upWhen.trusted ? '' : 'un'}trusted but found ${trusted ? '' : 'un'}trusted`,
          };
        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        const now = new Date();
        if (validFrom > now)
          return {
            kind: 'ssl',
            ok: false,
            reason: MonitorDownReason.InvalidResponse,
            message: `Not valid until ${toLocalIso(validFrom, { endAt: 's' })}`,
          };
        if (validTo < now)
          return {
            kind: 'ssl',
            ok: false,
            reason: MonitorDownReason.Expired,
            message: `Expired at ${toLocalIso(validTo, { endAt: 's' })}`,
          };
        const daysUntilExpiry = Math.floor(dateDiff(validTo, now) / 86_400_000);
        if (typeof this.params.upWhen?.days === 'number' && daysUntilExpiry < this.params.upWhen.days)
          return {
            kind: 'ssl',
            ok: false,
            reason: MonitorDownReason.QueryNotSatisfied,
            message: `Will expire at ${toLocalIso(validTo, { endAt: 's' })}`,
          };
        const message = [
          typeof this.params.upWhen?.latency === 'number' && 'Latency below threshold',
          `Valid until ${toLocalIso(validTo, { endAt: 's' })}`,
          `Certificate is ${trusted ? '' : 'un'}trusted`,
        ]
          .filter((item) => item !== false)
          .join('. ');
        return {
          kind: 'ssl',
          ok: true,
          latency,
          message,
        };
        // no catch - the outer will get the thrown promise rejection
      } finally {
        socket.destroy();
      }
    } catch (err) {
      return { kind: 'ssl', ok: false, reason: MonitorDownReason.Error, message: String(err) };
    }
  }
}
