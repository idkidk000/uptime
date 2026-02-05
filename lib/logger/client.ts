// TODO: may want to forward these to an api endpoint

import type { RefObject } from 'react';
import { useAppQueries } from '@/hooks/app-queries';
import { BaseLogger } from '@/lib/logger';
import type { Settings } from '@/lib/settings/schema';

const MAX_PATH_DEPTH = 5;

export class ClientLogger extends BaseLogger {
  #settingsRef: RefObject<Settings>;
  constructor(settingsRef: RefObject<Settings>, importMetaUrl: string, name?: string) {
    super(
      `${importMetaUrl
        .replace(/^file:\/+(ROOT\/)?/, '')
        .split('/')
        .slice(-MAX_PATH_DEPTH)
        .join('/')}${name ? `:${name}` : ''}`,
      globalThis.console,
      false
    );
    this.#settingsRef = settingsRef;
  }
  get logSettings() {
    return this.#settingsRef.current.logging;
  }
}

const cache = new Map<string, ClientLogger>();

export function useLogger(importMetaUrl: string, name?: string) {
  const { settingsRef } = useAppQueries();
  const key = `${importMetaUrl}.${name}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const logger = new ClientLogger(settingsRef, importMetaUrl, name);
  cache.set(key, logger);
  return logger;
}

export function useLoggerWithSettingsRef(settingsRef: RefObject<Settings>, importMetaUrl: string, name?: string) {
  const key = `${importMetaUrl}.${name}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const logger = new ClientLogger(settingsRef, importMetaUrl, name);
  cache.set(key, logger);
  return logger;
}
