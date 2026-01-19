import * as Messaging from '@/workers/messaging';
import * as Monitors from '@/workers/monitor';

function stop() {
  Messaging.stop();
  Monitors.stop();
}

function main() {
  Messaging.start();
  Monitors.start();

  process.addListener('SIGINT', stop);
  process.addListener('SIGTERM', stop);
}

main();
