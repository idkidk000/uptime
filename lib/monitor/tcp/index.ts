import { Socket } from 'node:net';
import { Monitor, MonitorDownReason, type MonitorResponse } from '@/lib/monitor';
import type { TcpMonitorParams } from '@/lib/monitor/tcp/schema';
import { roundTo } from '@/lib/utils';

export class TcpMonitor extends Monitor<TcpMonitorParams> {
  async check(): Promise<MonitorResponse<'tcp'>> {
    try {
      const socket = new Socket();
      const response = await new Promise<MonitorResponse<'tcp'>>((resolve) => {
        const started = performance.now();
        const timeout = setTimeout(() => {
          resolve({
            kind: 'tcp',
            ok: false,
            reason: MonitorDownReason.Timeout,
            message: `Could not connect in ${this.settingsClient.current.monitor.defaultTimeout}ms`,
          });
          socket.destroy();
        }, this.settingsClient.current.monitor.defaultTimeout);
        socket.addListener('error', (err) => {
          resolve({
            kind: 'tcp',
            ok: false,
            reason: MonitorDownReason.Error,
            message: String(err),
          });
          clearTimeout(timeout);
        });
        socket.addListener('connect', () => {
          const latency = roundTo(performance.now() - started, 3);
          if (typeof this.params.upWhen?.latency === 'number' && latency > this.params.upWhen.latency)
            resolve({
              kind: 'tcp',
              ok: false,
              reason: MonitorDownReason.Timeout,
              message: `Connected in ${latency}ms`,
            });
          else
            resolve({
              kind: 'tcp',
              ok: true,
              latency,
              message:
                typeof this.params.upWhen?.latency === 'number'
                  ? 'Latency below threshold'
                  : 'Connection opened successfully',
            });

          clearTimeout(timeout);
        });
        socket.connect(this.params.port, this.params.address);
      });
      socket.destroy();
      return response;
    } catch (err) {
      return { kind: 'tcp', ok: false, reason: MonitorDownReason.Error, message: String(err) };
    }
  }
}
