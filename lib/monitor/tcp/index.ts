import { Socket } from 'node:net';
import { MessageClient } from '@/lib/messaging';
import { MonitorDownReason, type MonitorResponse } from '@/lib/monitor';
import { Monitor } from '@/lib/monitor/abc';
import type { TcpMonitorParams } from '@/lib/monitor/tcp/schema';
import { roundTo } from '@/lib/utils';

const messageClient = new MessageClient(import.meta.url);

export class TcpMonitor extends Monitor<TcpMonitorParams> {
  constructor(params: TcpMonitorParams) {
    super(params, messageClient);
  }
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
            message: `Could not connect in ${this.messageClient.settings.monitor.defaultTimeout}ms`,
          });
          socket.destroy();
        }, this.messageClient.settings.monitor.defaultTimeout);
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
