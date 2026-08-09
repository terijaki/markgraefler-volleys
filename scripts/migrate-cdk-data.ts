#!/usr/bin/env bun
/**
 * Migrate DynamoDB tables and S3 media from CDK-named resources to SST resources.
 *
 * Usage:
 *   varlock run -- bun ./scripts/migrate-cdk-data.ts \
 *     --source-env dev \
 *     --source-branch main \
 *     --dest-stage production
 *
 * Requires AWS credentials for the target account. Source table/bucket names are
 * derived from the legacy CDK naming scheme; destination names are read from
 * `.sst/outputs.json` after deploying the SST stage.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { CopyObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

interface CliArgs {
  sourceEnv: string;
  sourceBranch: string;
  destStage: string;
  dryRun: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };

  const sourceEnv = get("--source-env") ?? "dev";
  const sourceBranch = get("--source-branch") ?? "";
  const destStage = get("--dest-stage") ?? "production";
  const dryRun = args.includes("--dry-run");

  return { sourceEnv, sourceBranch, destStage, dryRun };
}

function branchSuffix(environment: string, branch: string): string {
  if (environment === "prod" || !branch) {
    return "";
  }
  return `-${branch}`;
}

function cdkTableNames(environment: string, branch: string) {
  const suffix = branchSuffix(environment, branch);
  return {
    content: `mv-content-${environment}${suffix}`,
    cache: `mv-cache-${environment}${suffix}`,
    sams: `sams-data-${environment}${suffix}`,
  };
}

function cdkMediaBucketName(environment: string, branch: string): string {
  return `markgraefler-volleys-media-${environment}${branchSuffix(environment, branch)}`;
}

interface SstOutputs {
  contentTable?: string;
  cacheTable?: string;
  samsTable?: string;
  mediaBucket?: string;
}

function readSstOutputs(): SstOutputs {
  const path = resolve(process.cwd(), ".sst/outputs.json");
  return JSON.parse(readFileSync(path, "utf8")) as SstOutputs;
}

async function migrateTable(
  client: DynamoDBDocumentClient,
  sourceName: string,
  destName: string,
  dryRun: boolean,
) {
  console.log(`Migrating DynamoDB ${sourceName} → ${destName}`);
  let lastKey: Record<string, unknown> | undefined;
  let copied = 0;

  do {
    const page = await client.send(
      new ScanCommand({
        TableName: sourceName,
        ExclusiveStartKey: lastKey,
      }),
    );

    const items = page.Items ?? [];
    if (items.length === 0) {
      lastKey = page.LastEvaluatedKey;
      continue;
    }

    if (!dryRun) {
      for (let i = 0; i < items.length; i += 25) {
        const chunk = items.slice(i, i + 25);
        await client.send(
          new BatchWriteCommand({
            RequestItems: {
              [destName]: chunk.map((Item) => ({ PutRequest: { Item } })),
            },
          }),
        );
      }
    }

    copied += items.length;
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  console.log(`  ${dryRun ? "Would copy" : "Copied"} ${copied} items`);
}

async function migrateBucket(
  s3: S3Client,
  sourceBucket: string,
  destBucket: string,
  dryRun: boolean,
) {
  console.log(`Migrating S3 s3://${sourceBucket} → s3://${destBucket}`);
  let token: string | undefined;
  let copied = 0;

  do {
    const listing = await s3.send(
      new ListObjectsV2Command({
        Bucket: sourceBucket,
        ContinuationToken: token,
      }),
    );

    for (const object of listing.Contents ?? []) {
      if (!object.Key) {
        continue;
      }

      if (!dryRun) {
        await s3.send(
          new CopyObjectCommand({
            Bucket: destBucket,
            Key: object.Key,
            CopySource: `${sourceBucket}/${object.Key}`,
          }),
        );
      }
      copied += 1;
    }

    token = listing.NextContinuationToken;
  } while (token);

  console.log(`  ${dryRun ? "Would copy" : "Copied"} ${copied} objects`);
}

async function main() {
  const { sourceEnv, sourceBranch, destStage, dryRun } = parseArgs();
  const sourceTables = cdkTableNames(sourceEnv, sourceBranch);
  const sourceBucket = cdkMediaBucketName(sourceEnv, sourceBranch);
  const outputs = readSstOutputs();

  if (!outputs.contentTable || !outputs.cacheTable || !outputs.samsTable || !outputs.mediaBucket) {
    throw new Error("Missing destination names in .sst/outputs.json — deploy the SST stage first.");
  }

  console.log(`Source: CDK ${sourceEnv}${sourceBranch ? ` (${sourceBranch})` : ""}`);
  console.log(`Destination: SST stage ${destStage}`);
  if (dryRun) {
    console.log("DRY RUN — no writes");
  }

  const region = process.env.AWS_REGION || "eu-central-1";
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  const s3 = new S3Client({ region });

  await migrateTable(ddb, sourceTables.content, outputs.contentTable, dryRun);
  await migrateTable(ddb, sourceTables.cache, outputs.cacheTable, dryRun);
  await migrateTable(ddb, sourceTables.sams, outputs.samsTable, dryRun);
  await migrateBucket(s3, sourceBucket, outputs.mediaBucket, dryRun);

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
