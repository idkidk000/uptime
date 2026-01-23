import process from 'node:process';
import { Logger } from '@/lib/logger';
import { settings } from '@/lib/settings';
import * as Messaging from '@/workers/messaging';
import * as Monitor from '@/workers/monitor';
import * as Notifier from '@/workers/notifier';

const logger = new Logger(import.meta.url);

function stop() {
  if (!settings.disableMonitors) Monitor.stop();
  Messaging.stop();
  Notifier.stop();

  // have to exit manually since we trapped the signal
  process.exit(0);
}

async function main() {
  Messaging.start();
  await Notifier.start();
  if (!settings.disableMonitors) Monitor.start();

  process.addListener('SIGINT', stop);
  process.addListener('SIGTERM', stop);
}

main().catch((err) => {
  logger.error(err);
  stop();
  throw err;
});
