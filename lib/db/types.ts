/**
 * DynamoDB entity types inferred from Zod schemas
 *
 * Import types from this file, not from schemas.ts
 * This provides a clean separation between runtime validation and type definitions
 */

import type { z } from "zod";
import type {
    locationSchema,
    mediaSchema,
    memberSchema,
    sponsorSchema,
    teamSchema,
} from "./schemas";

/** Inferred types from Zod schemas */
export type Team = z.infer<typeof teamSchema>;
export type Member = z.infer<typeof memberSchema>;
export type Media = z.infer<typeof mediaSchema>;
export type Sponsor = z.infer<typeof sponsorSchema>;
export type Location = z.infer<typeof locationSchema>;
/** Base entity type (all entities extend this) */
export type BaseEntity = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

/** Pagination cursor for paginated repository results */
export type PaginationCursor = string;

/** Standard list result shape (cursor omitted when all pages are fetched). */
export type PaginatedListResult<T> = {
  items: T[];
  lastEvaluatedKey?: PaginationCursor;
};
