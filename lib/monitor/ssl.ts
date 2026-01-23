import { connect } from 'node:tls';
import { dateDiff, toLocalIso } from '@/lib/date';
import { Logger } from '@/lib/logger';
import { type BaseMonitorParams, type BaseMonitorResponse, Monitor, MonitorDownReason } from '@/lib/monitor';
import { settings } from '@/lib/settings';
import { roundTo } from '@/lib/utils';

// don't enable global on a top-level regex - it persists some state between execs and behaves strangely
const RE_BARE_HOST = /^(?:.*:\/\/)?(?<host>[a-z\d.]+)(:(?<port>\d+))?/;

const logger = new Logger(import.meta.url);

export interface SslMonitorParams extends BaseMonitorParams {
  kind: 'ssl';
  port?: number;
  upWhen: {
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

    logger.info('parsing', this.params.address);
    logger.info('result', match);

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
        timeout: settings.defaultMonitorTimeout,
      });
      try {
        const { promise, resolve, reject } = Promise.withResolvers();
        socket.addListener('error', reject);
        // this is the correct event to wait on. disregard code samples which wait on 'connect'. the cert is not available at that time
        socket.addListener('secureConnect', resolve);
        await promise;
        const cert = socket.getPeerCertificate();
        const latency = roundTo(performance.now() - started, 3);
        if (typeof this.params.upWhen.latency === 'number' && latency > this.params.upWhen.latency)
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
        if (typeof this.params.upWhen.trusted !== 'undefined' && trusted !== this.params.upWhen.trusted)
          return {
            kind: 'ssl',
            ok: false,
            reason: MonitorDownReason.InvalidResponse,
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
            message: `Certificate is not valid until ${toLocalIso(validFrom)}`,
          };
        if (validTo < now)
          return {
            kind: 'ssl',
            ok: false,
            reason: MonitorDownReason.InvalidResponse,
            message: `Certificate expired at ${toLocalIso(validTo)}`,
          };
        const daysUntilExpiry = Math.floor(dateDiff(validTo, now) / 86_400_000);
        if (typeof this.params.upWhen.days === 'number' && daysUntilExpiry < this.params.upWhen.days)
          return {
            kind: 'ssl',
            ok: false,
            reason: MonitorDownReason.QueryNotSatisfied,
            message: `Certificate will expire at ${toLocalIso(validTo)}`,
          };
        return {
          kind: 'ssl',
          ok: true,
          latency,
          message: `Certificate is valid until ${toLocalIso(validTo)}`,
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
