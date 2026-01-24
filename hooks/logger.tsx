import { ClientLogger } from '@/lib/logger/client';

const cache = new Map<string, ClientLogger>();

// TODO: needs a settingsRef so i can do level/source filtering. which is fine further down, but prevents me from using useLogger inside hooks/app-queries i think since hooks can't be run conditionally. maybe a secret no-throw version of useAppQueries coalesced with an passed settingsRef would work
export function useLogger(importMetaUrl: string, name?: string) {
  const key = `${importMetaUrl}.${name}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const logger = new ClientLogger(importMetaUrl, name);
  cache.set(key, logger);
  return logger;
}
