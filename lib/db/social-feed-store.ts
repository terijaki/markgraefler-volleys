/**
 * DynamoDB storage for the Behold Instagram feed.
 *
 * Key scheme (mv-social-* table):
 *   PK: `social#behold`
 *   SK: `feed`
 *
 * Entry shape: `{ data: JSON-serialized posts, cachedAt: ISO timestamp, ttl: epoch seconds }`
 */

import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

export const BEHOLD_FEED_PK = "social#behold";
export const BEHOLD_FEED_SK = "feed";

/** 3 months — DynamoDB hygiene TTL to reclaim storage for orphaned rows */
const DDB_TTL_SECONDS = 90 * 24 * 60 * 60;

type BeholdFeedEntry = {
  pk: string;
  sk: string;
  data: string;
  cachedAt: string;
  ttl: number;
};

/** Read the cached Behold feed posts, or `null` on a miss or corrupt entry. */
export async function readBeholdFeed<T>(
  docClient: DynamoDBDocumentClient,
  tableName: string,
): Promise<T[] | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: BEHOLD_FEED_PK, sk: BEHOLD_FEED_SK },
    }),
  );

  if (!result.Item) return null;

  const entry = result.Item as BeholdFeedEntry;

  try {
    return JSON.parse(entry.data) as T[];
  } catch {
    return null;
  }
}

/** Write the Behold feed posts to DynamoDB. */
export async function writeBeholdFeed<T>(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  posts: T[],
  now: () => number = Date.now,
): Promise<void> {
  const nowMs = now();
  const entry: BeholdFeedEntry = {
    pk: BEHOLD_FEED_PK,
    sk: BEHOLD_FEED_SK,
    data: JSON.stringify(posts),
    cachedAt: new Date(nowMs).toISOString(),
    ttl: Math.floor(nowMs / 1000) + DDB_TTL_SECONDS,
  };

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: entry,
    }),
  );
}
