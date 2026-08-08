import { sanitizeBranchName } from "./branch";

/** SST stage used for production deployments (`main` branch). */
export const SST_PRODUCTION_STAGE = "production" as const;

/**
 * Resolve the active SST stage name.
 *
 * Resolution order:
 * 1. `SST_STAGE` — explicit override (CI, local scripts)
 * 2. `CDK_BRANCH_OVERWRITE` / `GITHUB_REF_NAME` / `BRANCH_NAME` — branch-derived stage
 */
export function resolveSstStage(): string {
  if (process.env.SST_STAGE) {
    return process.env.SST_STAGE;
  }

  const rawBranch =
    process.env.CDK_BRANCH_OVERWRITE || process.env.GITHUB_REF_NAME || process.env.BRANCH_NAME;

  if (!rawBranch || rawBranch === "main") {
    return SST_PRODUCTION_STAGE;
  }

  return `feature-${sanitizeBranchName(rawBranch)}`;
}

export interface DeploymentContext {
  stage: string;
  environment: "prod" | "dev";
  branch: string;
  branchSuffix: string;
  isProd: boolean;
}

/**
 * Map an SST stage back to the CDK-compatible environment + sanitized branch suffix.
 */
export function parseDeploymentFromStage(stage: string): DeploymentContext {
  if (stage === SST_PRODUCTION_STAGE) {
    return {
      stage,
      environment: "prod",
      branch: "",
      branchSuffix: "",
      isProd: true,
    };
  }

  if (stage.startsWith("feature-")) {
    const branch = stage.slice("feature-".length);
    return {
      stage,
      environment: "dev",
      branch,
      branchSuffix: branch ? `-${branch}` : "",
      isProd: false,
    };
  }

  return {
    stage,
    environment: "dev",
    branch: "",
    branchSuffix: "",
    isProd: false,
  };
}

export function getDeploymentContext(stage = resolveSstStage()): DeploymentContext {
  return parseDeploymentFromStage(stage);
}
