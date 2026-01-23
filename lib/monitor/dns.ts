import { Resolver } from 'node:dns/promises';
import { type BaseMonitorParams, type BaseMonitorResponse, Monitor, MonitorDownReason } from '@/lib/monitor';
import { settings } from '@/lib/settings';
import { roundTo } from '@/lib/utils';

export interface DnsMonitorParams extends BaseMonitorParams {
  kind: 'dns';
  // there are so many more but some (e.g. MX) return an object array and would need special handling. this is fine for now
  recordType: 'A' | 'AAAA' | 'CNAME';
  resolver?: string;
  upWhen: {
    latency?: number;
    includes?: string[];
    length?: number;
  };
}

export type DnsMonitorResponse = BaseMonitorResponse & {
  kind: 'dns';
};

export class DnsMonitor extends Monitor<DnsMonitorParams, DnsMonitorResponse> {
  async check(): Promise<DnsMonitorResponse> {
    try {
      const resolver = new Resolver({ timeout: settings.defaultMonitorTimeout });
      if (this.params.resolver) resolver.setServers([this.params.resolver]);
      const started = performance.now();
      const results = await resolver.resolve(this.params.address, this.params.recordType);
      const latency = roundTo(performance.now() - started, 3);
      if (typeof this.params.upWhen.latency === 'number' && latency > this.params.upWhen.latency)
        return {
          kind: 'dns',
          ok: false,
          reason: MonitorDownReason.Timeout,
          message: `Query took ${latency} ms`,
        };
      if (typeof this.params.upWhen.length === 'number' && results.length !== this.params.upWhen.length)
        return {
          kind: 'dns',
          ok: false,
          reason: MonitorDownReason.QueryNotSatisfied,
          message: `Expected ${this.params.upWhen.length} records but found ${results.length}`,
        };
      for (const required of this.params.upWhen.includes ?? []) {
        if (!results.includes(required))
          return {
            kind: 'dns',
            ok: false,
            reason: MonitorDownReason.QueryNotSatisfied,
            message: `Required record ${required} not in result ${results}`,
          };
      }
      return {
        kind: 'dns',
        ok: true,
        latency,
        message: `${results}`,
      };
    } catch (err) {
      //TODO: need to see what a timeout error looks like
      return { kind: 'dns', ok: false, reason: MonitorDownReason.Error, message: String(err) };
    }
  }
}
