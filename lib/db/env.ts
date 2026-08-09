/**
 * Shared type-safe configuration for DynamoDB tables.
 *
 * All content entities share a single DynamoDB table (`CONTENT_TABLE_NAME`).
 * SAMS and social-media entities remain in their own tables.
 */

import { z } from "zod";
import { resolveLinkedName } from "../runtime/aws-resource";

/** Environment variable name for the dedicated cache table */
export const CACHE_TABLE_ENV_VAR = "CACHE_TABLE_NAME" as const;

/** Get the cache table name from the environment, throwing if not configured */
export function getCacheTableName(): string {
  return resolveLinkedName("CacheTable", CACHE_TABLE_ENV_VAR);
}

/** Environment variable name for the single content table */
export const CONTENT_TABLE_ENV_VAR = "CONTENT_TABLE_NAME" as const;

export const tableEnvironmentSchema = z.object({
  CONTENT_TABLE_NAME: z.string().trim().min(1),
});
export type TableEnvironment = z.infer<typeof tableEnvironmentSchema>;

/** Get the single content table name from the environment, throwing if not configured */
export function getContentTableName(): string {
  return resolveLinkedName("ContentTable", CONTENT_TABLE_ENV_VAR);
}

/** Environment variable name for the single SAMS data table */
export const SAMS_TABLE_ENV_VAR = "SAMS_TABLE_NAME" as const;

/** Get the SAMS data table name from the environment, throwing if not configured */
export function getSamsTableName(): string {
  return resolveLinkedName("SamsTable", SAMS_TABLE_ENV_VAR);
}
