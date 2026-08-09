/// <reference path="./sst-reference.d.ts" />

import type { DeploymentContext } from "@utils/sst-stage";
import type { DatabaseResources } from "./database";
import { createMvFunction } from "./function";

export function createSocialResources(
  ctx: DeploymentContext,
  deployment: sst.Linkable,
  tables: DatabaseResources,
) {
  if (!process.env.BEHOLD_FEED_URL) {
    throw new Error("BEHOLD_FEED_URL environment variable is required");
  }

  const beholdSync = createMvFunction(
    "BeholdSync",
    {
      handler: "lambda/social/behold-sync.handler",
      memory: "128 MB",
      environment: {
        BEHOLD_FEED_URL: process.env.BEHOLD_FEED_URL,
      },
      link: [tables.cacheTable],
    },
    deployment,
  );

  new sst.aws.Cron("BeholdSyncCron", {
    schedule: "cron(0 7-21 * * ? *)",
    function: beholdSync.arn,
    transform: {
      rule: (args: aws.cloudwatch.EventRuleArgs) => {
        args.description = "Trigger Behold Instagram feed sync hourly during German daytime";
      },
    },
  });

  return { beholdSync };
}
