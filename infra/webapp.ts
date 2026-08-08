/// <reference path="./sst-reference.d.ts" />

import { Club } from "@/project.config";
import { buildWebappUrl } from "@utils/webapp-url";
import type { DeploymentContext } from "@utils/sst-stage";
import type { DatabaseResources } from "./database";
import { buildWebappDomainConfig } from "./dns";
import type { MediaResources } from "./media";

export interface WebappResources {
  web: sst.aws.TanStackStart;
  url: $util.Output<string>;
}

export function createWebappResources(
  ctx: DeploymentContext,
  tables: DatabaseResources,
  media: MediaResources,
  sams: {
    clubsSync: sst.aws.Function;
    teamsSync: sst.aws.Function;
  },
): WebappResources {
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET environment variable is required");
  }

  const webappUrl = buildWebappUrl(ctx.environment, ctx.branch);
  const sesIdentity = ctx.isProd ? Club.domain : `new.${Club.domain}`;

  const web = new sst.aws.TanStackStart("Webapp", {
    buildCommand: "npm run build",
    domain: buildWebappDomainConfig(ctx),
    link: [tables.contentTable, tables.cacheTable, tables.samsTable, media.bucket],
    environment: {
      CONTENT_TABLE_NAME: tables.contentTable.name,
      CACHE_TABLE_NAME: tables.cacheTable.name,
      SAMS_TABLE_NAME: tables.samsTable.name,
      CDK_ENVIRONMENT: ctx.environment,
      APP_BASE_URL: webappUrl,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
      MEDIA_BUCKET_NAME: media.bucket.name,
      MEDIA_CLOUDFRONT_URL: media.url,
      SAMS_CLUBS_SYNC_FUNCTION_NAME: sams.clubsSync.name,
      SAMS_TEAMS_SYNC_FUNCTION_NAME: sams.teamsSync.name,
      ...(ctx.branch ? { BRANCH_NAME: ctx.branch } : {}),
      ...(process.env.SAMS_API_KEY ? { SAMS_API_KEY: process.env.SAMS_API_KEY } : {}),
      NODE_ENV: "production",
    },
    permissions: [
      {
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: [
          $interpolate`arn:aws:ses:${aws.getRegionOutput().name}:${aws.getCallerIdentityOutput().accountId}:identity/${sesIdentity}`,
        ],
      },
      {
        actions: ["lambda:InvokeFunction"],
        resources: [sams.clubsSync.arn, sams.teamsSync.arn],
      },
      {
        actions: ["dynamodb:Query"],
        resources: [
          $interpolate`${tables.contentTable.arn}/index/*`,
          $interpolate`${tables.samsTable.arn}/index/*`,
        ],
      },
    ],
    transform: {
      server: (args: aws.lambda.FunctionArgs) => {
        args.functionName = `mv-webapp-${ctx.environment}${ctx.branchSuffix}`;
      },
    },
  });

  return {
    web,
    url: web.url,
  };
}
