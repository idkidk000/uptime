import { Socket } from 'node:net';
import { type BaseMonitorParams, type BaseMonitorResponse, Monitor, MonitorDownReason } from '@/lib/monitor';
import { settings } from '@/lib/settings';
import { roundTo } from '@/lib/utils';

export interface TcpMonitorParams extends BaseMonitorParams {
  kind: 'tcp';
  port: number;
  upWhen: {
    latency?: number;
  };
}

export type TcpMonitorResponse = BaseMonitorResponse & {
  kind: 'tcp';
};

export class TcpMonitor extends Monitor<TcpMonitorParams, TcpMonitorResponse> {
  async check(): Promise<TcpMonitorResponse> {
    try {
      const socket = new Socket();
      const response = await new Promise<TcpMonitorResponse>((resolve) => {
        const started = performance.now();
        const timeout = setTimeout(() => {
          resolve({
            kind: 'tcp',
            ok: false,
            reason: MonitorDownReason.Timeout,
            message: `Could not connect in ${settings.defaultMonitorTimeout}ms`,
          });
          socket.destroy();
        }, settings.defaultMonitorTimeout);
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
          if (typeof this.params.upWhen.latency === 'number' && latency > this.params.upWhen.latency)
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
              message: 'All checks were successful',
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
