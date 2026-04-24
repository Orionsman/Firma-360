import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'offline-cache-v1';

type CacheEnvelope<T> = {
  updatedAt: string;
  data: T;
};

const makeCacheKey = (scope: string, companyId?: string | null) =>
  `${CACHE_PREFIX}:${scope}:${companyId || 'global'}`;

export async function writeOfflineCache<T>(
  scope: string,
  companyId: string | null | undefined,
  data: T
) {
  const envelope: CacheEnvelope<T> = {
    updatedAt: new Date().toISOString(),
    data,
  };

  await AsyncStorage.setItem(makeCacheKey(scope, companyId), JSON.stringify(envelope));
}

export async function readOfflineCache<T>(
  scope: string,
  companyId: string | null | undefined
) {
  const raw = await AsyncStorage.getItem(makeCacheKey(scope, companyId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CacheEnvelope<T>;
  } catch {
    return null;
  }
}

export async function mutateOfflineCache<T>(
  scope: string,
  companyId: string | null | undefined,
  updater: (current: T | null) => T
) {
  const current = await readOfflineCache<T>(scope, companyId);
  const next = updater(current?.data ?? null);
  await writeOfflineCache(scope, companyId, next);
  return next;
}
