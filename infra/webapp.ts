/// <reference path="./sst-reference.d.ts" />

import { Club } from "@/project.config";
import type { DeploymentContext } from "@utils/sst-stage";
import type { DatabaseResources } from "./database";
import { buildWebappDomainConfig } from "./dns";
import type { MediaResources } from "./media";
import type { SamsResources } from "./sams";

export interface WebappResources {
  web: sst.aws.TanStackStart;
  url: $util.Output<string>;
}

export function createWebappResources(
  ctx: DeploymentContext,
  deployment: sst.Linkable,
  tables: DatabaseResources,
  media: MediaResources,
  sams: SamsResources,
): WebappResources {
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET environment variable is required");
  }

  const sesIdentity = ctx.isProd ? Club.domain : `new.${Club.domain}`;

  const web = new sst.aws.TanStackStart("Webapp", {
    path: "app",
    buildCommand: "cd .. && vp build && cp .output/nitro.json app/.output/nitro.json",
    domain: buildWebappDomainConfig(ctx),
    link: [
      deployment,
      tables.contentTable,
      tables.cacheTable,
      tables.samsTable,
      media.bucket,
      media.router,
      sams.clubsSync,
      sams.teamsSync,
    ],
    environment: {
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
      NODE_ENV: "production",
      ...(process.env.SAMS_API_KEY ? { SAMS_API_KEY: process.env.SAMS_API_KEY } : {}),
    },
    permissions: [
      {
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: [
          $interpolate`arn:aws:ses:${aws.getRegionOutput().name}:${aws.getCallerIdentityOutput().accountId}:identity/${sesIdentity}`,
        ],
      },
    ],
  });

  return {
    web,
    url: web.url,
  };
}
