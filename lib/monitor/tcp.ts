import { Socket } from 'node:net';
import { type BaseMonitorParams, type BaseMonitorResponse, Monitor, MonitorDownReason } from '@/lib/monitor';
import { roundTo } from '@/lib/utils';

export interface TcpMonitorParams extends BaseMonitorParams {
  kind: 'tcp';
  port: number;
  upWhen?: {
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
            message: `Could not connect in ${this.settingsClient.current.defaultMonitorTimeout}ms`,
          });
          socket.destroy();
        }, this.settingsClient.current.defaultMonitorTimeout);
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
