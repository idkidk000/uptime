// TODO: may want to forward these to an api endpoint

import { BaseLogger } from '@/lib/logger';

const MAX_PATH_DEPTH = 3;

export class ClientLogger extends BaseLogger {
  constructor(importMetaUrl: string, name?: string) {
    super(
      `${importMetaUrl
        .replace(/^file:\/+(ROOT\/)?/, '')
        .split('/')
        .slice(-MAX_PATH_DEPTH)
        .join('/')}${name ? `:${name}` : ''}`,
      globalThis.console,
      false
    );
  }
}
