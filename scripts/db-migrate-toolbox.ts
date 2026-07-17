#!/usr/bin/env bun

/**
 * One-time migration: rewrite ElectroDB items to DynamoDB-Toolbox key format.
 *
 * Usage:
 *   bun run db:migrate -- --table all
 *   bun run db:migrate -- --table content --dry-run
 *   bun run db:migrate -- --table sams --force
 */

import "varlock/auto-load";
import { execSync } from "node:child_process";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  buildMigratedPutParams,
  shouldSkipMigrationItem,
} from "@/lib/db/migration/electrodb-migration";
import { getContentTable, getSamsTable } from "@/lib/db/toolbox-client";
import { computeContentTableName, computeSamsDataTableName } from "@/lib/db/env";
import { getSanitizedBranch } from "@/utils/git.server";

type TableTarget = "content" | "sams" | "all";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const tableArgIndex = args.indexOf("--table");
const tableTarget: TableTarget =
  tableArgIndex !== -1 && args[tableArgIndex + 1]
    ? (args[tableArgIndex + 1] as TableTarget)
    : "all";

if (!["content", "sams", "all"].includes(tableTarget)) {
  console.error(`Invalid --table value: ${tableTarget}. Use content, sams, or all.`);
  process.exit(1);
}

const CDK_ENVIRONMENT = process.env.CDK_ENVIRONMENT || "dev";
if (CDK_ENVIRONMENT === "prod" && !force) {
  console.error("❌ Refusing to migrate production without --force");
  process.exit(1);
}

function checkAwsSession() {
  try {
    execSync("aws sts get-caller-identity", { stdio: "ignore" });
  } catch {
    console.error(
      "❌ No active AWS session found. Authenticate via AWS SSO before running migration.",
    );
    process.exit(1);
  }
}
checkAwsSession();

const sanitizedBranch = getSanitizedBranch();
const contentTableName = computeContentTableName(CDK_ENVIRONMENT, sanitizedBranch);
const samsTableName = computeSamsDataTableName(CDK_ENVIRONMENT, sanitizedBranch);

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const docClient = DynamoDBDocumentClient.from(client);

type MigrationStats = {
  scanned: number;
  migrated: number;
  skipped: number;
  failed: number;
};

async function migrateTable(tableName: string, bindTable: () => void): Promise<MigrationStats> {
  bindTable();

  const stats: MigrationStats = { scanned: 0, migrated: 0, skipped: 0, failed: 0 };
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  console.log(`\n🔄 Scanning ${tableName}${dryRun ? " (dry-run)" : ""}...`);

  while (true) {
    const result = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    for (const rawItem of result.Items ?? []) {
      stats.scanned++;
      const item = rawItem as Record<string, unknown>;

      if (shouldSkipMigrationItem(item)) {
        stats.skipped++;
        continue;
      }

      const oldKey = { pk: item.pk, sk: item.sk };

      try {
        const { item: migratedItem } = buildMigratedPutParams(item);

        if (dryRun) {
          console.log(`  [dry-run] would migrate ${String(item.__edb_e__)} ${String(item.pk)}`);
          stats.migrated++;
          continue;
        }

        await docClient.send(
          new PutCommand({
            TableName: tableName,
            Item: migratedItem,
          }),
        );

        await docClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: oldKey,
          }),
        );

        stats.migrated++;
      } catch (error) {
        stats.failed++;
        console.error(`  ⚠️ Failed to migrate ${String(item.pk)}:`, error);
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
    if (!lastEvaluatedKey) {
      break;
    }
  }

  return stats;
}

async function main() {
  console.log(
    `🚀 ElectroDB → Toolbox migration (${CDK_ENVIRONMENT}${sanitizedBranch ? `/${sanitizedBranch}` : ""})`,
  );
  console.log(`   Content table: ${contentTableName}`);
  console.log(`   SAMS table:    ${samsTableName}`);

  const tables: Array<{ name: string; bind: () => void }> = [];
  if (tableTarget === "content" || tableTarget === "all") {
    tables.push({
      name: contentTableName,
      bind: () => {
        getContentTable(docClient, contentTableName);
      },
    });
  }
  if (tableTarget === "sams" || tableTarget === "all") {
    tables.push({
      name: samsTableName,
      bind: () => {
        getSamsTable(docClient, samsTableName);
      },
    });
  }

  const totals: MigrationStats = { scanned: 0, migrated: 0, skipped: 0, failed: 0 };

  for (const table of tables) {
    const stats = await migrateTable(table.name, table.bind);
    console.log(
      `✅ ${table.name}: scanned=${stats.scanned} migrated=${stats.migrated} skipped=${stats.skipped} failed=${stats.failed}`,
    );
    totals.scanned += stats.scanned;
    totals.migrated += stats.migrated;
    totals.skipped += stats.skipped;
    totals.failed += stats.failed;
  }

  console.log(
    `\n📊 Total: scanned=${totals.scanned} migrated=${totals.migrated} skipped=${totals.skipped} failed=${totals.failed}`,
  );

  if (totals.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
