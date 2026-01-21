import process from 'node:process';
import * as Messaging from '@/workers/messaging';
import * as Monitor from '@/workers/monitor';

function stop() {
  Messaging.stop();
  Monitor.stop();

  // have to exit manually since we trapped the signal
  process.exit(0);
}

function main() {
  Messaging.start();
  Monitor.start();

  process.addListener('SIGINT', stop);
  process.addListener('SIGTERM', stop);
}

main();
