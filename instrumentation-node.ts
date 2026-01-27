import process from 'node:process';
import * as Messaging from '@/workers/messaging';
import * as Monitor from '@/workers/monitor';
import * as Notifier from '@/workers/notifier';

function stop() {
  Monitor.stop();
  Messaging.stop();
  Notifier.stop();

  // have to exit manually since we trapped the signal
  process.exit(0);
}

function main() {
  Messaging.start();
  Notifier.start();
  Monitor.start();

  process.addListener('SIGINT', stop);
  process.addListener('SIGTERM', stop);
}

main();
