/// <reference path="./sst-reference.d.ts" />

import type { DeploymentContext } from "@utils/sst-stage";
import type { DatabaseResources } from "./database";
import type { MediaResources } from "./media";
import { createMvFunction } from "./function";

export interface SamsResources {
  clubsSync: sst.aws.Function;
  teamsSync: sst.aws.Function;
}

const SAMS_SYNC_ACTIVE_MONTHS = "1,2,3,4,5,8,9,10,11,12";

export function createSamsResources(
  ctx: DeploymentContext,
  deployment: sst.Linkable,
  tables: DatabaseResources,
  media: MediaResources,
): SamsResources {
  if (!process.env.SAMS_API_KEY) {
    throw new Error("SAMS_API_KEY environment variable is required");
  }

  const clubsSync = createMvFunction(
    "SamsClubsSync",
    {
      handler: "lambda/sams/sams-clubs-sync.handler",
      timeout: "3 minutes",
      environment: {
        SAMS_API_KEY: process.env.SAMS_API_KEY,
      },
      link: [tables.samsTable, media.bucket, media.router],
    },
    deployment,
  );

  const teamsSync = createMvFunction(
    "SamsTeamsSync",
    {
      handler: "lambda/sams/sams-teams-sync.handler",
      timeout: "3 minutes",
      environment: {
        SAMS_API_KEY: process.env.SAMS_API_KEY,
      },
      link: [tables.samsTable],
    },
    deployment,
  );

  new sst.aws.Cron("SamsClubsSyncCron", {
    schedule: `cron(0 2 ? ${SAMS_SYNC_ACTIVE_MONTHS} THU *)`,
    function: clubsSync.arn,
    transform: {
      rule: (args: aws.cloudwatch.EventRuleArgs) => {
        args.description = "Trigger SAMS clubs sync every Thursday at 2 AM UTC, except June/July";
      },
    },
  });

  new sst.aws.Cron("SamsTeamsSyncCron", {
    schedule: `cron(0 7 ? ${SAMS_SYNC_ACTIVE_MONTHS} * *)`,
    function: teamsSync.arn,
    transform: {
      rule: (args: aws.cloudwatch.EventRuleArgs) => {
        args.description = "Trigger SAMS teams sync every night at 7 AM UTC, except June/July";
      },
    },
  });

  return { clubsSync, teamsSync };
}
