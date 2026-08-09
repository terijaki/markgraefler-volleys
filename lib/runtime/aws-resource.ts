/**
 * Resolve SST-linked AWS resources.
 *
 * SST injects linked resources as `SST_RESOURCE_<Component>` JSON env vars at
 * deploy time. Local dev and tests set the legacy `process.env` names directly.
 */

type LinkedResource = {
  name?: string;
  url?: string;
  CDK_ENVIRONMENT?: string;
  BRANCH_NAME?: string;
};

function getLinkedResource(
  component: string,
  env: Record<string, string | undefined> = process.env,
): LinkedResource | undefined {
  if (env.SST_RESOURCES_JSON) {
    try {
      const all = JSON.parse(env.SST_RESOURCES_JSON) as Record<string, LinkedResource>;
      const fromJson = all[component];
      if (fromJson) {
        return fromJson;
      }
    } catch {
      // Fall through to per-resource env vars.
    }
  }

  const value = env[`SST_RESOURCE_${component}`];
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as LinkedResource;
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
  const linked = getLinkedResource(component, env)?.name;
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
  const linked = getLinkedResource(component, env)?.url;
  return required(linked, `linked ${component} url or ${envVar}`);
}

export function resolveDeploymentEnv(env: Record<string, string | undefined> = process.env): {
  cdkEnvironment: string;
  branchName: string;
} {
  const deployment = getLinkedResource("DeploymentEnv", env);
  return {
    cdkEnvironment: required(
      deployment?.CDK_ENVIRONMENT ?? env.CDK_ENVIRONMENT,
      "linked DeploymentEnv or CDK_ENVIRONMENT",
    ),
    branchName: deployment?.BRANCH_NAME ?? env.BRANCH_NAME ?? "",
  };
}

/** Map SST-linked resources onto the env var names runtime code expects. */
export function mergeLinkedEnv(
  env: Record<string, string | undefined> = process.env,
): Record<string, string | undefined> {
  const deployment = getLinkedResource("DeploymentEnv", env);

  return {
    ...env,
    CDK_ENVIRONMENT: deployment?.CDK_ENVIRONMENT ?? env.CDK_ENVIRONMENT,
    BRANCH_NAME: deployment?.BRANCH_NAME ?? env.BRANCH_NAME,
    CONTENT_TABLE_NAME: getLinkedResource("ContentTable", env)?.name ?? env.CONTENT_TABLE_NAME,
    CACHE_TABLE_NAME: getLinkedResource("CacheTable", env)?.name ?? env.CACHE_TABLE_NAME,
    SAMS_TABLE_NAME: getLinkedResource("SamsTable", env)?.name ?? env.SAMS_TABLE_NAME,
    MEDIA_BUCKET_NAME: getLinkedResource("MediaBucket", env)?.name ?? env.MEDIA_BUCKET_NAME,
    MEDIA_CLOUDFRONT_URL: getLinkedResource("MediaRouter", env)?.url ?? env.MEDIA_CLOUDFRONT_URL,
    SAMS_CLUBS_SYNC_FUNCTION_NAME:
      getLinkedResource("SamsClubsSync", env)?.name ?? env.SAMS_CLUBS_SYNC_FUNCTION_NAME,
    SAMS_TEAMS_SYNC_FUNCTION_NAME:
      getLinkedResource("SamsTeamsSync", env)?.name ?? env.SAMS_TEAMS_SYNC_FUNCTION_NAME,
    APP_BASE_URL: getLinkedResource("Webapp", env)?.url ?? env.APP_BASE_URL,
  };
}
