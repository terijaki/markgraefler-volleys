/**
 * Scheduled Lambda that proactively syncs Behold Instagram posts to DynamoDB.
 *
 * Runs hourly during German daytime hours (7:00–21:00 UTC = 8–22h CET / 9–23h CEST) to keep
 * the cache fresh without consuming Behold's 1200 views/month free-tier limit
 * (~15 runs/day, ~465 calls/month ≈ 39% of the free-tier limit).
 *
 * The webapp route reads exclusively from DynamoDB — no live Behold API calls
 * happen on the main request path.
 *
 * DDB key scheme (social table, see lib/db/social-feed-store.ts):
 *   PK: `social#behold`
 *   SK: `feed`
 */

import { injectLambdaContext } from "@aws-lambda-powertools/logger/middleware";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer/middleware";
import middy from "@middy/core";
import type { EventBridgeEvent } from "aws-lambda";
import dayjs from "dayjs";
import { writeBeholdFeed } from "@/lib/db/social-feed-store";
import { parseLambdaEnv } from "../utils/env";
import { createDynamoDocClient, createLambdaResources } from "../utils/resources";
import { Sentry } from "../utils/sentry";
import { BeholdFeedSchema, BeholdSyncLambdaEnvironmentSchema, type BeholdPost } from "./types";

const { logger, tracer } = createLambdaResources("behold-sync");
const docClient = createDynamoDocClient(tracer);

const env = parseLambdaEnv(BeholdSyncLambdaEnvironmentSchema);

const MAX_POSTS = 6;
const MAX_AGE_DAYS = 30;
const BEHOLD_TIMEOUT_MS = 10_000;

const lambdaHandler = async (event: EventBridgeEvent<string, unknown>) => {
  logger.info("Starting Behold Instagram feed sync", { event });
  Sentry.addBreadcrumb({ category: "sync", message: "Starting Behold feed sync", level: "info" });

  const response = await fetch(env.BEHOLD_FEED_URL, {
    signal: AbortSignal.timeout(BEHOLD_TIMEOUT_MS),
  });

  if (!response.ok) {
    const msg = `Behold feed returned ${response.status}`;
    logger.warn(msg);
    Sentry.captureMessage(msg, "warning");
    return { statusCode: response.status, body: msg };
  }

  const raw: unknown = await response.json();
  const parsed = BeholdFeedSchema.safeParse(raw);

  if (!parsed.success) {
    const msg = "Failed to parse Behold feed response";
    logger.error(msg, { error: parsed.error });
    Sentry.captureException(new Error(msg), { extra: { zodError: parsed.error } });
    return { statusCode: 500, body: msg };
  }

  const cutoff = dayjs().subtract(MAX_AGE_DAYS, "day");
  const posts: BeholdPost[] = parsed.data.posts
    .filter((post) => dayjs(post.timestamp).isAfter(cutoff))
    .slice(0, MAX_POSTS);

  await writeBeholdFeed(docClient, env.SOCIAL_TABLE_NAME, posts);

  logger.info("Behold feed synced successfully", { postCount: posts.length });
  Sentry.setMeasurement("behold_sync.posts_written", posts.length, "none");

  return {
    statusCode: 200,
    body: JSON.stringify({ postCount: posts.length }),
  };
};

export const handler = Sentry.wrapHandler(
  middy(lambdaHandler).use(injectLambdaContext(logger)).use(captureLambdaHandler(tracer)),
);
