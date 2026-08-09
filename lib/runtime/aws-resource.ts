/**
 * Resolve SST-linked AWS resources with CDK / local env fallbacks.
 *
 * SST injects linked resources at deploy time (`Resource.*`). CDK and `vp dev`
 * continue to provide the legacy `process.env` names.
 */

type LinkedResource = {
  name?: string;
  url?: string;
  CDK_ENVIRONMENT?: string;
  BRANCH_NAME?: string;
};

function getLinkedValue(component: string, field: "name" | "url"): string | undefined {
  try {
    const { Resource } = require("sst") as { Resource: Record<string, LinkedResource> };
    return Resource?.[component]?.[field];
  } catch {
    return undefined;
  }
}

function getLinkedDeploymentEnv(): LinkedResource | undefined {
  try {
    const { Resource } = require("sst") as {
      Resource: { DeploymentEnv?: LinkedResource };
    };
    return Resource?.DeploymentEnv;
  } catch {
    return undefined;
  }
}

function required(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`Missing ${label}`);
  }
  return value;
}

export function resolveLinkedName(
  component: string,
  envVar: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const fromEnv = env[envVar];
  if (fromEnv) {
    return fromEnv;
  }
  const linked = getLinkedValue(component, "name");
  return required(linked, `linked ${component} or ${envVar}`);
}

export function resolveLinkedUrl(
  component: string,
  envVar: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const fromEnv = env[envVar];
  if (fromEnv) {
    return fromEnv;
  }
  const linked = getLinkedValue(component, "url");
  return required(linked, `linked ${component} url or ${envVar}`);
}

export function resolveDeploymentEnv(env: Record<string, string | undefined> = process.env): {
  cdkEnvironment: string;
  branchName: string;
} {
  const deployment = getLinkedDeploymentEnv();
  return {
    cdkEnvironment: required(
      deployment?.CDK_ENVIRONMENT ?? env.CDK_ENVIRONMENT,
      "linked DeploymentEnv or CDK_ENVIRONMENT",
    ),
    branchName: deployment?.BRANCH_NAME ?? env.BRANCH_NAME ?? "",
  };
}

/** Build a Lambda env object with SST-linked values merged over process.env. */
export function enrichLambdaEnv(
  env: Record<string, string | undefined> = process.env,
): Record<string, string | undefined> {
  const deployment = getLinkedDeploymentEnv();

  return {
    ...env,
    CDK_ENVIRONMENT: deployment?.CDK_ENVIRONMENT ?? env.CDK_ENVIRONMENT,
    BRANCH_NAME: deployment?.BRANCH_NAME ?? env.BRANCH_NAME,
    CONTENT_TABLE_NAME: getLinkedValue("ContentTable", "name") ?? env.CONTENT_TABLE_NAME,
    CACHE_TABLE_NAME: getLinkedValue("CacheTable", "name") ?? env.CACHE_TABLE_NAME,
    SAMS_TABLE_NAME: getLinkedValue("SamsTable", "name") ?? env.SAMS_TABLE_NAME,
    MEDIA_BUCKET_NAME: getLinkedValue("MediaBucket", "name") ?? env.MEDIA_BUCKET_NAME,
    MEDIA_CLOUDFRONT_URL: getLinkedValue("MediaRouter", "url") ?? env.MEDIA_CLOUDFRONT_URL,
    SAMS_CLUBS_SYNC_FUNCTION_NAME:
      getLinkedValue("SamsClubsSync", "name") ?? env.SAMS_CLUBS_SYNC_FUNCTION_NAME,
    SAMS_TEAMS_SYNC_FUNCTION_NAME:
      getLinkedValue("SamsTeamsSync", "name") ?? env.SAMS_TEAMS_SYNC_FUNCTION_NAME,
    APP_BASE_URL: getLinkedValue("Webapp", "url") ?? env.APP_BASE_URL,
  };
}
