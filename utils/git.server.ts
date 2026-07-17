import { execSync } from "node:child_process";
import { sanitizeBranchName } from "./git";

function resolveRawBranchName(): string | undefined {
  if (process.env.CDK_BRANCH_OVERWRITE) {
    return process.env.CDK_BRANCH_OVERWRITE;
  }

  if (process.env.BRANCH_NAME) {
    return process.env.BRANCH_NAME;
  }

  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return undefined;
  }
}

/**
 * Resolve the current deployment branch, sanitized for AWS resource naming.
 *
 * Resolution order:
 * 1. CDK_BRANCH_OVERWRITE — explicit override (CI, scripts)
 * 2. BRANCH_NAME — Varlock / deployed runtime env (same source as member proxy aliases)
 * 3. git rev-parse — local fallback when env is unset
 *
 * Returns empty string on main (unless includeMain) or when branch cannot be resolved.
 */
export function getSanitizedBranch(includeMain = false): string {
  const branch = resolveRawBranchName();
  if (!branch) {
    return "";
  }

  if (!includeMain && branch === "main") {
    return "";
  }

  return sanitizeBranchName(branch);
}
