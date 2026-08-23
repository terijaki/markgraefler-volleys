import type { PluginOption } from "vite-plus";
import {
  CACHE_TABLE_ENV_VAR,
  CONTENT_TABLE_ENV_VAR,
  computeCacheTableName,
  computeSamsDataTableName,
} from "../../lib/db/env.ts";
import { getSanitizedBranch } from "../../utils/deploy-branch.ts";

function buildBranchLambdaName(
  baseName: string,
  environment: string,
  branchSuffix: string,
): string {
  return `mv-${baseName}-${environment}${branchSuffix}`;
}

function setDefaultEnv(name: string, value: string) {
  if (!process.env[name]) {
    process.env[name] = value;
  }
}

/**
 * Computes AWS resource names using the sanitized branch suffix.
 * Varlock runs before this plugin (see vite.config.ts) and sets BRANCH_NAME from $VARLOCK_BRANCH.
 */
export function localAwsResourceEnvPlugin(): PluginOption {
  return {
    name: "local-aws-resource-env",
    apply: "serve",
    config() {
      const environment = process.env.CDK_ENVIRONMENT || "dev";

      // Skip resource name computation in production
      if (environment === "prod") return;

      // Compute sanitized branch for resource names (e.g., DynamoDB tables, S3 buckets)
      const sanitizedBranch = getSanitizedBranch();
      const branchSuffix = sanitizedBranch ? `-${sanitizedBranch}` : "";

      // Set resource names that require the sanitized branch
      setDefaultEnv(CONTENT_TABLE_ENV_VAR, `mv-content-${environment}${branchSuffix}`);
      setDefaultEnv(CACHE_TABLE_ENV_VAR, computeCacheTableName(environment, sanitizedBranch));
      setDefaultEnv("SAMS_TABLE_NAME", computeSamsDataTableName(environment, sanitizedBranch));
      setDefaultEnv(
        "SAMS_CLUBS_SYNC_FUNCTION_NAME",
        buildBranchLambdaName("sams-clubs-sync", environment, branchSuffix),
      );
      setDefaultEnv(
        "SAMS_TEAMS_SYNC_FUNCTION_NAME",
        buildBranchLambdaName("sams-teams-sync", environment, branchSuffix),
      );
      setDefaultEnv(
        "IMAGE_PROCESSOR_FUNCTION_NAME",
        buildBranchLambdaName("bun-image-processor", environment, branchSuffix),
      );
      setDefaultEnv(
        "MEDIA_BUCKET_NAME",
        `markgraefler-volleys-media-${environment}${branchSuffix}`,
      );

      const envPrefix = `${environment}${branchSuffix}-`;
      setDefaultEnv(
        "MEDIA_CLOUDFRONT_URL",
        `https://${envPrefix}media.new.markgraefler-volleys.de`,
      );
    },
  };
}
