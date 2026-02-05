// TODO: may want to forward these to an api endpoint

import type { RefObject } from 'react';
import { useAppQueries } from '@/hooks/app-queries';
import { BaseLogger, type LogLevelName, logLevels } from '@/lib/logger';
import type { Settings } from '@/lib/settings/schema';
import { typedEntries } from '@/lib/utils';

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
  suppress(levelValue: number): boolean {
    const overrides = this.#settingsRef?.current?.logging.overrides;
    let levelName: LogLevelName | undefined = this.#settingsRef?.current?.logging.rootLevel;
    if (overrides) {
      const override = typedEntries(overrides)
        .toSorted(([a], [b]) => b.length - a.length)
        .find(([key]) => key.startsWith(this.name));
      if (override) levelName = override[1];
    }
    if (!levelName) return false;
    if (levelValue >= logLevels[levelName].value) return false;
    return true;
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
