#!/usr/bin/env bun

/**
 * Quick scan helper: count ElectroDB vs Toolbox items in branch tables.
 * Usage: bun ./scripts/verify-migration-sample.ts
 */

import "varlock/auto-load";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { computeContentTableName, computeSamsDataTableName } from "@/lib/db/env";
import { getSanitizedBranch } from "@/utils/deploy-branch";

const CDK_ENVIRONMENT = process.env.CDK_ENVIRONMENT || "dev";
const sanitizedBranch = getSanitizedBranch();
const tables = [
  computeContentTableName(CDK_ENVIRONMENT, sanitizedBranch),
  computeSamsDataTableName(CDK_ENVIRONMENT, sanitizedBranch),
];

const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" }),
);

type Counts = { electrodb: number; toolbox: number; auth: number; other: number; total: number };

async function countTable(tableName: string): Promise<Counts> {
  const counts: Counts = { electrodb: 0, toolbox: 0, auth: 0, other: 0, total: 0 };
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  while (true) {
    const result = await docClient.send(
      new ScanCommand({ TableName: tableName, ExclusiveStartKey: lastEvaluatedKey }),
    );

    for (const item of result.Items ?? []) {
      counts.total++;
      const pk = typeof item.pk === "string" ? item.pk : "";
      if (pk.startsWith("auth-storage#")) {
        counts.auth++;
      } else if (item.__edb_e__ !== undefined) {
        counts.electrodb++;
      } else if (typeof item._et === "string") {
        counts.toolbox++;
      } else {
        counts.other++;
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
    if (!lastEvaluatedKey) {
      break;
    }
  }

  return counts;
}

for (const tableName of tables) {
  const counts = await countTable(tableName);
  console.log(
    `${tableName}: total=${counts.total} electrodb=${counts.electrodb} toolbox=${counts.toolbox} auth=${counts.auth} other=${counts.other}`,
  );
}
