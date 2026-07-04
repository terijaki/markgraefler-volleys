/**
 * DynamoDB-backed cache helpers for server functions.
 *
 * Survives Lambda cold starts — unlike in-memory caches, these persist across all
 * Lambda instances and visitor sessions.
 *
 * Key scheme (single content table, single-table design):
 *   PK: `cache#<cacheKey>`
 *   SK: `cache` (data) or `lock` (refresh lock, see `getOrRefreshCacheEntry`)
 *
 * Entry shape: `{ data: JSON-serialized payload, cachedAt: ISO timestamp string }`
 *
 * TTL is enforced at read time in application code, not via a DynamoDB TTL attribute.
 */

import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@/lib/db/client";
import { getCacheTableName } from "@/lib/db/env";

const CACHE_SK = "cache";
const LOCK_SK = "lock";
/** Lock is considered stale (and stealable) after this long, in case the holder crashed
 * mid-refresh without releasing it. Comfortably above the SAMS API request timeout. */
const REFRESH_LOCK_TTL_MS = 20_000;

/** 3 months — DynamoDB hygiene TTL to reclaim storage for orphaned cache keys */
const DDB_TTL_SECONDS = 90 * 24 * 60 * 60;

function buildPk(cacheKey: string): string {
  return `cache#${cacheKey}`;
}

type CacheEntry = {
  pk: string;
  sk: string;
  data: string;
  cachedAt: string;
  /** Unix epoch seconds — used by DynamoDB TTL to eventually delete the item */
  ttl: number;
};

type CacheEntryMeta<T> = {
  value: T;
  cachedAtMs: number;
};

/**
 * Read a cache entry from DynamoDB regardless of age, alongside its `cachedAt` timestamp.
 *
 * Returns `null` on a cache miss or an unparseable/corrupt entry.
 */
async function readCacheEntryWithMeta<T>(cacheKey: string): Promise<CacheEntryMeta<T> | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: getCacheTableName(),
      Key: { pk: buildPk(cacheKey), sk: CACHE_SK },
    }),
  );

  if (!result.Item) return null;

  const entry = result.Item as CacheEntry;
  const cachedAtMs = new Date(entry.cachedAt).getTime();

  if (Number.isNaN(cachedAtMs)) return null;

  try {
    return { value: JSON.parse(entry.data) as T, cachedAtMs };
  } catch {
    return null;
  }
}

/**
 * Read a cache entry from DynamoDB.
 *
 * Returns the deserialized value if a fresh entry exists (within TTL), otherwise `null`.
 */
export async function readCacheEntry<T>(
  cacheKey: string,
  ttlMs: number,
  now: () => number = Date.now,
): Promise<T | null> {
  const cached = await readCacheEntryWithMeta<T>(cacheKey);
  if (!cached || now() - cached.cachedAtMs > ttlMs) return null;
  return cached.value;
}

/**
 * Write a cache entry to DynamoDB.
 *
 * Serializes the value to JSON and records the current time as `cachedAt`.
 */
export async function writeCacheEntry<T>(
  cacheKey: string,
  value: T,
  now: () => number = Date.now,
): Promise<void> {
  const nowMs = now();
  const entry: CacheEntry = {
    pk: buildPk(cacheKey),
    sk: CACHE_SK,
    data: JSON.stringify(value),
    cachedAt: new Date(nowMs).toISOString(),
    ttl: Math.floor(nowMs / 1000) + DDB_TTL_SECONDS,
  };

  await docClient.send(
    new PutCommand({
      TableName: getCacheTableName(),
      Item: entry,
    }),
  );
}

/**
 * Attempt to acquire the refresh lock for a cache key. Uses a conditional write so only
 * one concurrent caller can succeed; the condition also allows "stealing" a lock that's
 * older than `REFRESH_LOCK_TTL_MS`, in case the previous holder crashed mid-refresh.
 *
 * Returns `true` if the lock was acquired, `false` if another caller currently holds it.
 */
async function tryAcquireRefreshLock(
  cacheKey: string,
  now: () => number = Date.now,
): Promise<boolean> {
  const nowMs = now();
  try {
    await docClient.send(
      new PutCommand({
        TableName: getCacheTableName(),
        Item: {
          pk: buildPk(cacheKey),
          sk: LOCK_SK,
          acquiredAt: new Date(nowMs).toISOString(),
          // DynamoDB TTL is only for storage hygiene here — lock staleness is enforced
          // in application code via the condition expression below.
          ttl: Math.floor(nowMs / 1000) + DDB_TTL_SECONDS,
        },
        ConditionExpression: "attribute_not_exists(pk) OR acquiredAt < :staleBefore",
        ExpressionAttributeValues: {
          ":staleBefore": new Date(nowMs - REFRESH_LOCK_TTL_MS).toISOString(),
        },
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) return false;
    throw error;
  }
}

async function releaseRefreshLock(cacheKey: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: getCacheTableName(),
      Key: { pk: buildPk(cacheKey), sk: LOCK_SK },
    }),
  );
}

/**
 * Stale-while-revalidate cache read with single-flight refresh protection.
 *
 * - Fresh cache hit (within `softTtlMs`) → return immediately, no external call.
 * - No cache entry at all (first-ever request) → block and `refresh()`, since there's
 *   nothing else to serve.
 * - Stale cache entry → try to acquire a short-lived DynamoDB lock:
 *   - Lock acquired → this caller `refresh()`es and writes the new value; everyone else
 *     during that window gets the stale value immediately below.
 *   - Lock held by someone else → return the stale value immediately instead of also
 *     calling the (slow) external API. This is what prevents a cache-expiry moment from
 *     turning into many concurrent Lambda invocations all blocked on the same external
 *     call at once (the thundering-herd pattern that causes Lambda throttling).
 *
 * If `refresh()` throws while holding the lock, the stale value is returned instead of
 * propagating the error (a slightly-stale page beats an error page).
 */
export async function getOrRefreshCacheEntry<T>({
  cacheKey,
  softTtlMs,
  refresh,
  now = Date.now,
}: {
  cacheKey: string;
  softTtlMs: number;
  refresh: () => Promise<T>;
  now?: () => number;
}): Promise<T> {
  const cached = await readCacheEntryWithMeta<T>(cacheKey);

  if (cached && now() - cached.cachedAtMs <= softTtlMs) {
    return cached.value;
  }

  if (!cached) {
    const value = await refresh();
    await writeCacheEntry(cacheKey, value, now);
    return value;
  }

  const acquiredLock = await tryAcquireRefreshLock(cacheKey, now);
  if (!acquiredLock) {
    return cached.value;
  }

  try {
    const value = await refresh();
    await writeCacheEntry(cacheKey, value, now);
    return value;
  } catch (error) {
    console.error(`Background cache refresh failed for "${cacheKey}"`, error);
    return cached.value;
  } finally {
    await releaseRefreshLock(cacheKey);
  }
}
