import process, { env } from 'node:process';
import { ServerLogger } from '@/lib/logger/server';
import * as Messaging from '@/workers/messaging';
import * as Monitor from '@/workers/monitor';
import * as Notifier from '@/workers/notifier';

const logger = new ServerLogger(import.meta.url);

function stop() {
  Monitor.stop();
  Messaging.stop();
  Notifier.stop();

  // have to exit manually since we trapped the signal
  process.exit(0);
}

function main() {
  // don't validate certificates (this could have just been a fetch param)
  env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  try {
    Messaging.start();
    Notifier.start();
    Monitor.start();

    process.addListener('SIGINT', stop);
    process.addListener('SIGTERM', stop);
  } catch (err) {
    logger.error('fatal error during startup', err);
    stop();
  }
}

main();
