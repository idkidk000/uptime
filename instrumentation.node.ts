import process from 'node:process';
import { ServerLogger } from '@/lib/logger/server';
import { SettingsClient } from '@/lib/settings';
import * as Messaging from '@/workers/messaging';
import * as Monitor from '@/workers/monitor';
import * as Notifier from '@/workers/notifier';

const logger = new ServerLogger(import.meta.url);
const settingsClient = new SettingsClient(import.meta.url, await SettingsClient.getSettings());

function stop() {
  Monitor.stop();
  Messaging.stop();
  Notifier.stop();

  // have to exit manually since we trapped the signal
  process.exit(0);
}

async function main() {
  Messaging.start();
  await Notifier.start();
  if (!settingsClient.current.disableMonitors) Monitor.start();

  process.addListener('SIGINT', stop);
  process.addListener('SIGTERM', stop);
}

main().catch((err) => {
  logger.error(err);
  stop();
  throw err;
});
