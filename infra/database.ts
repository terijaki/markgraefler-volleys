/// <reference path="./sst-reference.d.ts" />

import { ContentTableIndexes, SamsTableIndexes } from "@/lib/db/table-indexes";
import type { DeploymentContext } from "@utils/sst-stage";

export interface DatabaseResources {
  contentTable: sst.aws.Dynamo;
  cacheTable: sst.aws.Dynamo;
  samsTable: sst.aws.Dynamo;
}

export function createDatabaseResources(ctx: DeploymentContext): DatabaseResources {
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
      table: (args: aws.dynamodb.TableArgs) => {
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
  });

  return { contentTable, cacheTable, samsTable };
}
