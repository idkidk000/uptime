import process from 'node:process';
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

async function main() {
  Messaging.start();
  Notifier.start();
  await Monitor.start();

  process.addListener('SIGINT', stop);
  process.addListener('SIGTERM', stop);
}

main().catch((err) => {
  logger.error(err);
  stop();
  throw err;
});
