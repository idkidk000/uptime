import process from 'node:process';
import { Logger } from '@/lib/logger';

const logger = new Logger(import.meta.url);

function stop() {
  logger.info('stop called');
  process.exit();
}

async function main() {
  logger.info('in main, pid', process.pid);
  process.addListener('SIGINT', stop);
  process.addListener('SIGTERM', stop);
  logger.info('hooked');
  await new Promise((resolve) => setTimeout(resolve, 60_000));
}

await main();
