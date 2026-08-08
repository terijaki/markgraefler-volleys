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
  tables: DatabaseResources,
  media: MediaResources,
): SamsResources {
  if (!process.env.SAMS_API_KEY) {
    throw new Error("SAMS_API_KEY environment variable is required");
  }

  const commonEnvironment = {
    SAMS_API_KEY: process.env.SAMS_API_KEY,
    CDK_ENVIRONMENT: ctx.environment,
    SAMS_TABLE_NAME: tables.samsTable.name,
  };

  const clubsSync = createMvFunction(ctx, "SamsClubsSync", {
    namespace: "sams",
    name: "sams-clubs-sync",
    handler: "lambda/sams/sams-clubs-sync.handler",
    timeout: "3 minutes",
    environment: {
      ...commonEnvironment,
      MEDIA_BUCKET_NAME: media.bucket.name,
      MEDIA_CLOUDFRONT_URL: media.url,
    },
    link: [tables.samsTable, media.bucket],
  });

  const teamsSync = createMvFunction(ctx, "SamsTeamsSync", {
    namespace: "sams",
    name: "sams-teams-sync",
    handler: "lambda/sams/sams-teams-sync.handler",
    timeout: "3 minutes",
    environment: commonEnvironment,
    link: [tables.samsTable],
  });

  new sst.aws.Cron("SamsClubsSyncCron", {
    schedule: `cron(0 2 ? ${SAMS_SYNC_ACTIVE_MONTHS} THU *)`,
    function: clubsSync,
    transform: {
      rule: (args) => {
        args.name = `sams-clubs-weekly-sync-${ctx.environment}${ctx.branchSuffix}`;
        args.description = `Trigger SAMS clubs sync every Thursday at 2 AM UTC, except June/July (${ctx.environment}${ctx.branchSuffix})`;
      },
    },
  });

  new sst.aws.Cron("SamsTeamsSyncCron", {
    schedule: `cron(0 7 ? ${SAMS_SYNC_ACTIVE_MONTHS} * *)`,
    function: teamsSync,
    transform: {
      rule: (args) => {
        args.name = `sams-teams-nightly-sync-${ctx.environment}${ctx.branchSuffix}`;
        args.description = `Trigger SAMS teams sync every night at 7 AM UTC, except June/July (${ctx.environment}${ctx.branchSuffix})`;
      },
    },
  });

  return { clubsSync, teamsSync };
}
