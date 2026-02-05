import process, { env } from 'node:process';
import { ServerLogger } from '@/lib/logger/server';
import * as Messaging from '@/workers/messaging';

const logger = new ServerLogger(import.meta.url);

// structured this way because MessageServer must be running before top-level await MessageClient.newAsync() in workers can resolve. top-level awaits in imports are resolved before any of the module code runs, which would cause a deadlock
async function main() {
  // don't validate certificates (this could have just been a fetch param)
  env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  let Monitor: typeof import('@/workers/monitor') | null = null;
  let Notifier: typeof import('@/workers/notifier') | null = null;

  function stop() {
    Monitor?.stop();
    Notifier?.stop();
    Messaging.stop();
    // have to exit manually since we trapped the signal
    process.exit(0);
  }

  try {
    await Messaging.start();

    Monitor = await import('@/workers/monitor');
    Notifier = await import('@/workers/notifier');

    Monitor.start();
    Notifier.start();

    process.addListener('SIGINT', stop);
    process.addListener('SIGTERM', stop);
  } catch (err) {
    logger.error('fatal error during startup', err);
    stop();
  }
}

await main();
