import { spawn } from 'node:child_process';
import { text } from 'node:stream/consumers';
import { Monitor, MonitorDownReason, type MonitorResponse } from '@/lib/monitor';
import type { PingMonitorParams } from '@/lib/monitor/ping/schema';

const RE_SAFE = /^[a-zA-Z0-9._-]+$/;
const RE_LOSS = /\b(?<loss>[\d.]+)% packet loss\b/;
const RE_RTT = /= (?<min>[\d.]+)\/(?<avg>[\d.]+)\/(?<max>[\d.]+)\/(?<mdev>[\d.]+) ms,/;

export class PingMonitor extends Monitor<PingMonitorParams> {
  async check(): Promise<MonitorResponse<'ping'>> {
    try {
      const safeMatch = RE_SAFE.exec(this.params.address);
      if (!safeMatch)
        return {
          kind: 'ping',
          ok: false,
          reason: MonitorDownReason.InvalidParams,
          message: `Address ${this.params.address} contains unsafe characters`,
        };
      const process = spawn('ping', ['-c', 5, '-A', this.params.address].map(String), {
        timeout: this.settingsClient.current.monitor.defaultTimeout,
      });
      // legacy apis are very cool and good and normal
      process.addListener('error', (err) => {
        throw err;
      });
      const [stdout, stderr, code] = await Promise.all([
        text(process.stdout),
        text(process.stderr),
        new Promise<number | null>((resolve) => process.once('close', resolve)),
      ]);
      if (code !== 0)
        return {
          kind: 'ping',
          ok: false,
          reason: MonitorDownReason.InvalidStatus,
          message: `Ping exited with code ${code}`,
        };
      const lossMatch = RE_LOSS.exec(stdout);
      const rttMatch = RE_RTT.exec(stdout);
      if (!lossMatch?.groups || !rttMatch?.groups)
        return {
          kind: 'ping',
          ok: false,
          reason: MonitorDownReason.InvalidResponse,
          message: `Could not parse output\n${stdout || stderr}`,
        };
      const packetLoss = Number(lossMatch.groups.loss);
      const latency = Number(rttMatch.groups.avg);
      if (typeof this.params.upWhen?.latency === 'number' && latency > this.params.upWhen.latency)
        return {
          kind: 'ping',
          ok: false,
          reason: MonitorDownReason.Timeout,
          message: `Avg response is ${latency} ms`,
        };
      if (
        typeof this.params.upWhen?.successPercent === 'number' &&
        packetLoss > 100 - this.params.upWhen.successPercent
      )
        return {
          kind: 'ping',
          ok: false,
          reason: MonitorDownReason.PacketLoss,
          message: `Packet loss is ${packetLoss}%`,
        };
      const message =
        [typeof this.params.upWhen?.latency === 'number' && 'Latency below threshold', `Packet loss is ${packetLoss}%`]
          .filter((item) => item !== false)
          .join('. ') || 'Host pinged successfully';
      return {
        kind: 'ping',
        ok: true,
        latency,
        message,
      };
    } catch (err) {
      return { kind: 'ping', ok: false, reason: MonitorDownReason.Error, message: String(err) };
    }
  }
}
