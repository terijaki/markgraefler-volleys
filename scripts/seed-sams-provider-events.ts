// Dev-only seed: publish mock sams-provider events to the branch-scoped SQS queue.

import "varlock/auto-load";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { SendMessageBatchCommand, SQSClient } from "@aws-sdk/client-sqs";
import { z } from "zod";
import { getSanitizedBranch } from "@/utils/deploy-branch";
import { dynamoDocumentClientOptions } from "@/lib/db/client";
import { computeSamsDataTableName } from "@/lib/db/env";
import { samsProjectionMatchSchema } from "@/lib/db/schemas";
import { computeSamsProviderEventsQueueName } from "@/lib/sams-provider-env";
import { SamsEventType } from "sams-provider-events";
import {
  buildMockSamsProviderSqsBody,
  buildSamsProviderSeedFixtures,
  resolveMvTeamCount,
} from "@/fixtures/sams-provider-events";
import { SEED_MV_CLUB, SEED_SEASON } from "@/fixtures/sams-provider-events/ids";

const SQS_BATCH_SIZE = 10;
const MIN_PROJECTION_ITEMS = 12;

function checkAwsSession() {
  try {
    execSync("aws sts get-caller-identity", { stdio: "ignore" });
  } catch {
    console.error(
      "❌ No active AWS session found. Authenticate via AWS SSO before running this script. See docs/SETUP.md.",
    );
    process.exit(1);
  }
}

checkAwsSession();

const ENVIRONMENT = process.env.CDK_ENVIRONMENT || "dev";
if (ENVIRONMENT === "prod") {
  console.error("❌ db:seed:sams is dev-only — production receives real provider events.");
  process.exit(1);
}

const BRANCH = getSanitizedBranch();
const REGION = process.env.CDK_REGION || "eu-central-1";
const POLL_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 3_000;
/** First poll window before re-sending the schedule event with a fresh snapshot. */
const INITIAL_POLL_MS = 24_000;
const scheduleMatchesFieldSchema = z.object({
  matches: z.array(samsProjectionMatchSchema).default([]),
});

function createSeedDocClient(): DynamoDBDocumentClient {
  return DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: REGION }),
    dynamoDocumentClientOptions,
  );
}

function scheduleMatchCount(item: unknown): number {
  const parsed = scheduleMatchesFieldSchema.safeParse(item);
  return parsed.success ? parsed.data.matches.length : 0;
}

function buildVariationSeed(branch: string): string {
  const runNumber = process.env.GITHUB_RUN_NUMBER?.trim();
  return runNumber ? `${branch}:${runNumber}` : branch || "local";
}

function readQueueUrlFromCdkOutputs(): string | null {
  const outputsPath = resolve(process.cwd(), "cdk-outputs.json");
  try {
    const outputs = JSON.parse(readFileSync(outputsPath, "utf8")) as Record<
      string,
      Record<string, string>
    >;
    for (const stackOutputs of Object.values(outputs)) {
      const url = stackOutputs.SamsProviderEventsQueueUrl;
      if (url && isAwsSqsQueueUrl(url)) return url;
    }
  } catch {
    // Fall through to AWS lookup
  }
  return null;
}

/** Validate SQS queue URLs without substring checks on the full URL string. */
function isAwsSqsQueueUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (!parsed.hostname.endsWith(".amazonaws.com")) return false;
    const pathSegments = parsed.pathname.split("/").filter((segment) => segment.length > 0);
    return pathSegments.length >= 2;
  } catch {
    return false;
  }
}

async function resolveQueueUrlFromAws(queueName: string): Promise<string> {
  const account = execSync("aws sts get-caller-identity --query Account --output text", {
    encoding: "utf8",
  }).trim();
  return `https://sqs.${REGION}.amazonaws.com/${account}/${queueName}`;
}

async function sendMockEvents(
  queueUrl: string,
  fixtures: ReturnType<typeof buildSamsProviderSeedFixtures>,
) {
  const sqs = new SQSClient({ region: REGION });
  const entries = fixtures.map((fixture, index) => ({
    Id: String(index),
    MessageBody: buildMockSamsProviderSqsBody(fixture, `seed-event-${index}`),
  }));

  for (let offset = 0; offset < entries.length; offset += SQS_BATCH_SIZE) {
    const batch = entries.slice(offset, offset + SQS_BATCH_SIZE);
    const result = await sqs.send(
      new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: batch,
      }),
    );

    if (result.Failed?.length) {
      console.error("❌ Failed to send some mock events", result.Failed);
      process.exit(1);
    }
  }

  console.log(`✅ Sent ${entries.length} mock SAMS provider events to ${queueUrl}`);
}

async function waitUntilSeedReady(tableName: string, deadline: number): Promise<boolean> {
  const doc = createSeedDocClient();
  const pk = `schedule#${SEED_MV_CLUB.uuid}`;
  const sk = `season#${SEED_SEASON.uuid}`;

  while (Date.now() < deadline) {
    const scan = await doc.send(
      new ScanCommand({
        TableName: tableName,
        Limit: 50,
      }),
    );
    const count = scan.Count ?? 0;
    const result = await doc.send(
      new GetCommand({
        TableName: tableName,
        Key: { pk, sk },
      }),
    );
    const matchesCount = scheduleMatchCount(result.Item);
    if (count >= MIN_PROJECTION_ITEMS && matchesCount > 0) {
      console.log(
        `✅ SAMS projections ready in ${tableName} (${count} items, ${matchesCount} schedule matches)`,
      );
      return true;
    }

    console.log(
      `Waiting for SAMS processor (${count}/${MIN_PROJECTION_ITEMS} items, ${matchesCount} schedule matches)...`,
    );
    await new Promise((resolveSleep) => setTimeout(resolveSleep, POLL_INTERVAL_MS));
  }

  console.error("❌ Timed out waiting for SAMS projections after seed");
  return false;
}

async function sendScheduleRetry(
  queueUrl: string,
  variationSeed: string,
  fixtures: ReturnType<typeof buildSamsProviderSeedFixtures>,
) {
  const scheduleFixture = fixtures.find(
    (fixture) => fixture.type === SamsEventType.clubMatchScheduleUpdated,
  );
  if (!scheduleFixture) return;

  const retryFixture = {
    ...scheduleFixture,
    snapshotVersion: `retry-${variationSeed}`,
  };
  console.log("Re-sending club schedule event with fresh snapshot to force projection write...");
  await sendMockEvents(queueUrl, [retryFixture]);
}

async function main() {
  const variationSeed = buildVariationSeed(BRANCH);
  const teamCount = resolveMvTeamCount(variationSeed);
  const fixtures = buildSamsProviderSeedFixtures({ variationSeed });

  const queueName = computeSamsProviderEventsQueueName(ENVIRONMENT, BRANCH);
  const queueUrl = readQueueUrlFromCdkOutputs() ?? (await resolveQueueUrlFromAws(queueName));

  const tableName = computeSamsDataTableName(ENVIRONMENT, BRANCH);
  console.log("=== Seeding SAMS provider mock events ===");
  console.log(`Environment: ${ENVIRONMENT}`);
  console.log(`Branch: ${BRANCH || "(main)"}`);
  console.log(`Variation seed: ${variationSeed}`);
  console.log(`Active MV teams: ${teamCount}`);
  console.log(`Fixture events: ${fixtures.length}`);
  console.log(`Queue: ${queueName}`);
  console.log(`Table: ${tableName}`);

  await sendMockEvents(queueUrl, fixtures);
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let ready = await waitUntilSeedReady(tableName, Math.min(Date.now() + INITIAL_POLL_MS, deadline));
  if (!ready && Date.now() < deadline) {
    await sendScheduleRetry(queueUrl, variationSeed, fixtures);
    ready = await waitUntilSeedReady(tableName, deadline);
  }

  if (!ready) {
    process.exit(1);
  }

  console.log("=== SAMS provider seed completed ===");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
