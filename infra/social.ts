/// <reference path="./sst-reference.d.ts" />

import type { DeploymentContext } from "@utils/sst-stage";
import type { DatabaseResources } from "./database";
import { createMvFunction } from "./function";

export function createSocialResources(ctx: DeploymentContext, tables: DatabaseResources) {
  if (!process.env.BEHOLD_FEED_URL) {
    throw new Error("BEHOLD_FEED_URL environment variable is required");
  }

  const beholdSync = createMvFunction(ctx, "BeholdSync", {
    namespace: "social",
    name: "behold-sync",
    handler: "lambda/social/behold-sync.handler",
    memory: "128 MB",
    environment: {
      CDK_ENVIRONMENT: ctx.environment,
      CACHE_TABLE_NAME: tables.cacheTable.name,
      BEHOLD_FEED_URL: process.env.BEHOLD_FEED_URL,
    },
    link: [tables.cacheTable],
  });

  new sst.aws.Cron("BeholdSyncCron", {
    schedule: "cron(0 7-21 * * ? *)",
    function: beholdSync,
    transform: {
      rule: (args: aws.cloudwatch.EventRuleArgs) => {
        args.name = `behold-sync-schedule-${ctx.environment}${ctx.branchSuffix}`;
        args.description = `Trigger Behold Instagram feed sync hourly during German daytime (${ctx.environment}${ctx.branchSuffix})`;
      },
    },
  });

  return { beholdSync };
}
