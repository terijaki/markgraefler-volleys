import {
  CACHE_TABLE_ENV_VAR,
  CONTENT_TABLE_ENV_VAR,
  computeCacheTableName,
  computeContentTableName,
  computeSamsDataTableName,
} from "@/lib/db/env";
import { ContentTableIndexes, SamsTableIndexes } from "@/lib/db/table-indexes";
import type { DeploymentContext } from "@utils/sst-stage";

export interface DatabaseResources {
  contentTable: sst.aws.Dynamo;
  cacheTable: sst.aws.Dynamo;
  samsTable: sst.aws.Dynamo;
}

export function createDatabaseResources(ctx: DeploymentContext): DatabaseResources {
  const contentTableName = computeContentTableName(ctx.environment, ctx.branch);
  const cacheTableName = computeCacheTableName(ctx.environment, ctx.branch);
  const samsTableName = computeSamsDataTableName(ctx.environment, ctx.branch);

  const contentTable = new sst.aws.Dynamo("ContentTable", {
    fields: {
      pk: "string",
      sk: "string",
      gsi1pk: "string",
      gsi1sk: "string",
      gsi3pk: "string",
      gsi3sk: "string",
      gsi4pk: "string",
      gsi4sk: "string",
      gsi5pk: "string",
      gsi5sk: "string",
    },
    primaryIndex: { hashKey: "pk", rangeKey: "sk" },
    globalIndexes: {
      [ContentTableIndexes.gsi1]: { hashKey: "gsi1pk", rangeKey: "gsi1sk" },
      [ContentTableIndexes.gsi3]: { hashKey: "gsi3pk", rangeKey: "gsi3sk" },
      [ContentTableIndexes.gsi4]: { hashKey: "gsi4pk", rangeKey: "gsi4sk" },
      [ContentTableIndexes.gsi5]: { hashKey: "gsi5pk", rangeKey: "gsi5sk" },
    },
    stream: "new-and-old-images",
    ttl: "ttl",
    deletionProtection: ctx.isProd,
    transform: {
      table: (args) => {
        args.name = contentTableName;
        args.pointInTimeRecovery = { enabled: true };
      },
    },
  });

  const cacheTable = new sst.aws.Dynamo("CacheTable", {
    fields: {
      pk: "string",
      sk: "string",
    },
    primaryIndex: { hashKey: "pk", rangeKey: "sk" },
    ttl: "ttl",
    transform: {
      table: (args) => {
        args.name = cacheTableName;
      },
    },
  });

  const samsTable = new sst.aws.Dynamo("SamsTable", {
    fields: {
      pk: "string",
      sk: "string",
      gsi1pk: "string",
      gsi1sk: "string",
    },
    primaryIndex: { hashKey: "pk", rangeKey: "sk" },
    globalIndexes: {
      [SamsTableIndexes.gsi1]: { hashKey: "gsi1pk", rangeKey: "gsi1sk" },
    },
    ttl: "ttl",
    transform: {
      table: (args) => {
        args.name = samsTableName;
      },
    },
  });

  return { contentTable, cacheTable, samsTable };
}

export function getDatabaseEnv(
  ctx: DeploymentContext,
  tables: DatabaseResources,
): Record<string, string> {
  return {
    [CONTENT_TABLE_ENV_VAR]: tables.contentTable.name,
    [CACHE_TABLE_ENV_VAR]: tables.cacheTable.name,
    SAMS_TABLE_NAME: tables.samsTable.name,
    CDK_ENVIRONMENT: ctx.environment,
    ...(ctx.branch ? { BRANCH_NAME: ctx.branch } : {}),
  };
}
