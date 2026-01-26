import { Resolver } from 'node:dns/promises';
import { Monitor, MonitorDownReason, type MonitorResponse } from '@/lib/monitor';
import type { DnsMonitorParams } from '@/lib/monitor/dns/schema';
import { roundTo } from '@/lib/utils';

export class DnsMonitor extends Monitor<DnsMonitorParams> {
  async check(): Promise<MonitorResponse<'dns'>> {
    try {
      const resolver = new Resolver({ timeout: this.settingsClient.current.defaultMonitorTimeout });
      if (this.params.resolver) resolver.setServers([this.params.resolver]);
      const started = performance.now();
      const results = (await resolver.resolve(this.params.address, this.params.recordType)) as string[];
      const latency = roundTo(performance.now() - started, 3);
      if (typeof this.params.upWhen?.latency === 'number' && latency > this.params.upWhen.latency)
        return {
          kind: 'dns',
          ok: false,
          reason: MonitorDownReason.Timeout,
          message: `Query took ${latency} ms`,
        };
      if (typeof this.params.upWhen?.length === 'number' && results.length !== this.params.upWhen.length)
        return {
          kind: 'dns',
          ok: false,
          reason: MonitorDownReason.QueryNotSatisfied,
          message: `Expected ${this.params.upWhen.length} records but found ${results.length}`,
        };
      for (const required of this.params.upWhen?.includes ?? []) {
        if (!results.includes(required))
          return {
            kind: 'dns',
            ok: false,
            reason: MonitorDownReason.QueryNotSatisfied,
            message: `Required record ${required} not in result ${results}`,
          };
      }
      const message =
        [
          typeof this.params.upWhen?.latency === 'number' && 'Latency below threshold',
          results.length === 0 ? 'Record is empty' : `Record is ${results.join(', ')}`,
        ]
          .filter((item) => item !== false)
          .join('. ') || 'Record resolved successfully';
      return {
        kind: 'dns',
        ok: true,
        latency,
        message,
      };
    } catch (err) {
      //TODO: need to see what a timeout error looks like
      return { kind: 'dns', ok: false, reason: MonitorDownReason.Error, message: String(err) };
    }
  }
}
