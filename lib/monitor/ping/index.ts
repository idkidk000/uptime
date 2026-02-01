import { spawn } from 'node:child_process';
import { text } from 'node:stream/consumers';
import { ServerLogger } from '@/lib/logger/server';
import { Monitor, MonitorDownReason, type MonitorResponse } from '@/lib/monitor';
import type { PingMonitorParams } from '@/lib/monitor/ping/schema';

const RE_SAFE = /^[a-zA-Z0-9._-]+$/;
const RE_RECV = /\s(?<recv>[\d.]+) received,/;
const RE_RTT = /= (?<min>[\d.]+)\/(?<avg>[\d.]+)\/(?<max>[\d.]+)\/(?<mdev>[\d.]+) ms,/;

const COUNT = 5;

const logger = new ServerLogger(import.meta.url);

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
      // -w is a max timeout. received packets may be lower than COUNT, but packet loss could still be 0%. read count received instead
      const process = spawn(
        'ping',
        [
          '-c',
          COUNT,
          '-A',
          '-w',
          Math.ceil(this.settingsClient.current.monitor.defaultTimeout / 1000),
          this.params.address,
        ].map(String)
      );
      // legacy apis are very cool and good and normal
      process.addListener('error', (err) => {
        throw err;
      });
      const [stdout, stderr, code] = await Promise.all([
        text(process.stdout),
        text(process.stderr),
        new Promise((resolve) => process.once('close', (code, signal) => resolve(code ?? signal))),
      ]);
      // 0 is success, 1 and 2 are failures with parsable output
      if (code !== 0 && code !== 1 && code !== 2)
        return {
          kind: 'ping',
          ok: false,
          reason: MonitorDownReason.InvalidStatus,
          message: `Ping exited with ${typeof code === 'number' ? `code ${code}` : `${code}`}`,
        };
      const recvMatch = RE_RECV.exec(stdout);
      if (!recvMatch?.groups) {
        logger.warn('could not parse output\n', stdout, '\n', { recvMatch });
        return {
          kind: 'ping',
          ok: false,
          reason: MonitorDownReason.InvalidResponse,
          message: `Could not parse output\n${stdout || stderr}`,
        };
      }
      const packetsReceived = Number(recvMatch.groups.recv);
      if (packetsReceived === 0)
        return {
          kind: 'ping',
          ok: false,
          reason: MonitorDownReason.Down,
          message: 'Received no replies',
        };
      const packetLoss = (1 - packetsReceived / COUNT) * 100;
      const rttMatch = RE_RTT.exec(stdout);
      if (!rttMatch?.groups) {
        logger.warn('could not parse output\n', stdout, '\n', { rttMatch });
        return {
          kind: 'ping',
          ok: false,
          reason: MonitorDownReason.InvalidResponse,
          message: `Could not parse output\n${stdout || stderr}`,
        };
      }
      const latency = Number(rttMatch.groups.avg);
      logger.debugLow(this.params.address, { packetsReceived, packetLoss, latency });
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
