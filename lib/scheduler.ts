import { dateSet, toLocalIso } from '@/lib/date';
import { ServerLogger } from '@/lib/logger/server';
import type { MessageClient } from '@/lib/messaging';

/** aligned interval - e.g. 3600_000 will run on the hour */
export class Scheduler {
  #millis: number;
  #timeout: NodeJS.Timeout | null = null;
  #interval: NodeJS.Timeout | null = null;
  #logger: ServerLogger;
  #schedule(): void {
    this.stop();
    const now = Date.now();
    const dayStart = dateSet({ hours: 0, minutes: 0, seconds: 0, millis: 0 }, now).getTime();
    const nextScheduledAt = dayStart + Math.ceil((now - dayStart) / this.#millis) * this.#millis;
    this.#timeout = setTimeout(
      () => {
        this.#interval = setInterval(this.callback, this.#millis);
        this.#timeout = null;
        this.callback();
      },
      Math.max(0, nextScheduledAt - Date.now())
    );
    this.#logger.info('scheduled at', toLocalIso(nextScheduledAt, { endAt: 's' }), 'repeat every', this.#millis);
  }
  constructor(
    public readonly callback: () => unknown,
    millis: number,
    messageClient: MessageClient,
    name?: string
  ) {
    this.#millis = millis;
    this.#logger = new ServerLogger(messageClient, `Scheduler${name ? `:${name}` : ''}`);
    this.#logger.debugLow('constructor', { millis, name });
    this.#schedule();
  }
  get millis(): number {
    return this.#millis;
  }
  set millis(value: number) {
    if (value === this.#millis) return;
    this.#millis = value;
    this.#schedule();
  }
  get active(): boolean {
    return this.#timeout !== null || this.#interval !== null;
  }
  start() {
    this.#schedule();
  }
  stop() {
    if (this.#timeout) clearTimeout(this.#timeout);
    if (this.#interval) clearInterval(this.#interval);
    this.#timeout = null;
    this.#interval = null;
    this.#logger.debugLow('stopped');
  }
}
