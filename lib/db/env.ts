/**
 * Shared type-safe configuration for DynamoDB tables.
 * Single source of truth used by both CDK and Lambda.
 *
 * Content entities live in `mv-content-*`; SAMS projections in `sams-data-*`;
 * social feed cache in `mv-social-*`.
 */

import { z } from "zod";

/** Environment variable name for the social media table (Behold Instagram feed) */
export const SOCIAL_TABLE_ENV_VAR = "SOCIAL_TABLE_NAME" as const;

/** Get the social table name from the environment, throwing if not configured */
export function getSocialTableName(): string {
  const tableName = process.env[SOCIAL_TABLE_ENV_VAR];
  if (!tableName) {
    throw new Error(
      `Social table not configured. Missing environment variable: ${SOCIAL_TABLE_ENV_VAR}`,
    );
  }
  return tableName;
}
/**
 * Compute the canonical social table name for a given environment and branch.
 * Single source of truth used by SocialMediaStack and WebAppStack.
 */
export function computeSocialTableName(environment: string, branch: string): string {
  return `mv-social-${environment}${computeResourceBranchSuffix(environment, branch)}`;
}

/** Environment variable name for the single content table */
export const CONTENT_TABLE_ENV_VAR = "CONTENT_TABLE_NAME" as const;

export const tableEnvironmentSchema = z.object({
  CONTENT_TABLE_NAME: z.string().trim().min(1),
});
export type TableEnvironment = z.infer<typeof tableEnvironmentSchema>;

/**
 * Branch suffix for shared AWS resource names (DynamoDB tables, Lambda names, S3 buckets).
 * Prod resources are environment-scoped only — branch suffix applies in dev.
 */
export function computeResourceBranchSuffix(environment: string, branch: string): string {
  if (environment === "prod") {
    return "";
  }
  return branch ? `-${branch}` : "";
}

/** Get the single content table name from the environment, throwing if not configured */
export function getContentTableName(): string {
  const tableName = process.env[CONTENT_TABLE_ENV_VAR];
  if (!tableName) {
    throw new Error(
      `Content table not configured. Missing environment variable: ${CONTENT_TABLE_ENV_VAR}`,
    );
  }
  return tableName;
}
/**
 * Compute the canonical content table name for a given environment and branch.
 * Single source of truth used by ContentDbStack, WebAppStack, MailStack, and SocialMediaStack
 * — keeping them in sync without a CloudFormation cross-stack reference.
 */
export function computeContentTableName(environment: string, branch: string): string {
  return `mv-content-${environment}${computeResourceBranchSuffix(environment, branch)}`;
}

/** Environment variable name for the single SAMS data table */
export const SAMS_TABLE_ENV_VAR = "SAMS_TABLE_NAME" as const;
/** Get the SAMS data table name from the environment, throwing if not configured */
export function getSamsTableName(): string {
  const tableName = process.env[SAMS_TABLE_ENV_VAR];
  if (!tableName) {
    throw new Error(
      `SAMS table not configured. Missing environment variable: ${SAMS_TABLE_ENV_VAR}`,
    );
  }
  return tableName;
}
/**
 * Compute the canonical SAMS data table name for a given environment and branch.
 * Single source of truth used by SamsStack, WebAppStack, and the local dev
 * vite plugin — keeping them in sync without a CloudFormation cross-stack reference.
 */
export function computeSamsDataTableName(environment: string, branch: string): string {
  return `sams-data-${environment}${computeResourceBranchSuffix(environment, branch)}`;
}
