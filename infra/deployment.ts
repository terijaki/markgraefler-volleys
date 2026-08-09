/// <reference path="./sst-reference.d.ts" />

import type { DeploymentContext } from "@utils/sst-stage";

/** Shared deployment metadata linked into runtime code via SST Resource. */
export function createDeploymentLinkable(ctx: DeploymentContext) {
  return new sst.Linkable("DeploymentEnv", {
    properties: {
      CDK_ENVIRONMENT: ctx.environment,
      BRANCH_NAME: ctx.branch,
    },
  });
}
