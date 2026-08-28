// Dev-only seed: publish mock sams-provider events to the branch-scoped SQS queue.
// Replaces the legacy sync-lambda trigger script.

import "varlock/auto-load";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { SendMessageBatchCommand, SQSClient } from "@aws-sdk/client-sqs";
import { getSanitizedBranch } from "@/utils/deploy-branch";
import { computeSamsDataTableName } from "@/lib/db/env";
import { computeSamsProviderEventsQueueName } from "@/lib/sams-provider-env";
import {
  buildMockSamsProviderSqsBody,
  samsProviderEventFixtures,
} from "./fixtures/sams-provider-events";

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

function resolveQueueUrl(): string {
  const outputsPath = resolve(process.cwd(), "cdk-outputs.json");
  try {
    const outputs = JSON.parse(readFileSync(outputsPath, "utf8")) as Record<
      string,
      Record<string, string>
    >;
    for (const stackOutputs of Object.values(outputs)) {
      const url = stackOutputs.SamsProviderEventsQueueUrl;
      if (url) return url;
    }
  } catch {
    // Fall through to naming convention
  }

  const queueName = computeSamsProviderEventsQueueName(ENVIRONMENT, BRANCH);
  return `https://sqs.${REGION}.amazonaws.com/${process.env.AWS_ACCOUNT_ID ?? ""}/${queueName}`;
}

async function resolveQueueUrlFromAws(queueName: string): Promise<string> {
  const account = execSync("aws sts get-caller-identity --query Account --output text", {
    encoding: "utf8",
  }).trim();
  return `https://sqs.${REGION}.amazonaws.com/${account}/${queueName}`;
}

async function sendMockEvents(queueUrl: string) {
  const sqs = new SQSClient({ region: REGION });
  const entries = samsProviderEventFixtures.map((fixture, index) => ({
    Id: String(index),
    MessageBody: buildMockSamsProviderSqsBody(fixture, `seed-event-${index}`),
  }));

  const result = await sqs.send(
    new SendMessageBatchCommand({
      QueueUrl: queueUrl,
      Entries: entries,
    }),
  );

  if (result.Failed?.length) {
    console.error("❌ Failed to send some mock events", result.Failed);
    process.exit(1);
  }

  console.log(`✅ Sent ${entries.length} mock SAMS provider events to ${queueUrl}`);
}

async function waitForProjections(tableName: string) {
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const scan = await doc.send(
      new ScanCommand({
        TableName: tableName,
        Limit: 25,
      }),
    );
    const count = scan.Count ?? 0;
    if (count >= 3) {
      console.log(`✅ SAMS projections detected in ${tableName} (${count} items scanned)`);
      return;
    }
    console.log(`Waiting for SAMS processor (${count} items so far)...`);
    await new Promise((resolveSleep) => setTimeout(resolveSleep, POLL_INTERVAL_MS));
  }

  console.error("❌ Timed out waiting for SAMS projections after seed");
  process.exit(1);
}

async function main() {
  const queueName = computeSamsProviderEventsQueueName(ENVIRONMENT, BRANCH);
  let queueUrl = resolveQueueUrl();
  if (!queueUrl.includes("amazonaws.com/") || queueUrl.endsWith("/")) {
    queueUrl = await resolveQueueUrlFromAws(queueName);
  }

  const tableName = computeSamsDataTableName(ENVIRONMENT, BRANCH);
  console.log("=== Seeding SAMS provider mock events ===");
  console.log(`Environment: ${ENVIRONMENT}`);
  console.log(`Branch: ${BRANCH || "(main)"}`);
  console.log(`Queue: ${queueName}`);
  console.log(`Table: ${tableName}`);

  await sendMockEvents(queueUrl);
  await waitForProjections(tableName);
  console.log("=== SAMS provider seed completed ===");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
