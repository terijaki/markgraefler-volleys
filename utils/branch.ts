/**
 * Client-safe branch name sanitization for AWS resource names and email plus-addresses.
 * Deploy/tooling branch resolution lives in deploy-branch.ts.
 */

/**
 * Sanitize a branch name for use in AWS resource names and email plus-address suffixes.
 * Lowercases, replaces non-alphanumeric characters with hyphens, and truncates to 20 chars.
 */
export function sanitizeBranchName(branch: string): string {
  return branch
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .substring(0, 20)
    .replace(/-+$/, "");
}
