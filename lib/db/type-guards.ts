/**
 * TypeScript type guards for content entities.
 *
 * These provide early compile-time and runtime detection of drift between
 * ElectroDB entity attribute definitions and Zod schemas.
 *
 * Usage:
 *   - Import type-level assertions to catch drift at compile time (IDE errors).
 *   - Use isTeam(), isMember(), etc. at runtime to safely narrow incoming data.
 */

import type { EntityItem } from "electrodb";
import type {
  LocationEntity,
  MediaEntity,
  MemberEntity,
  SponsorEntity,
  TeamEntity,
} from "./electrodb-entities";
import type { Location, Media, Member, Sponsor, Team } from "./types";

// ---------------------------------------------------------------------------
// Compile-time drift detection via type compatibility assertions.
//
// Strategy: we assert that `EntityItem<ElectroEntity>` is assignable to a
// Required<Pick<ZodType, requiredFields>> type.  If an attribute listed in the
// Pick does not exist on the ElectroDB entity (or has an incompatible type),
// TypeScript raises a compile error — surfacing drift immediately in the IDE.
//
// Note: discriminant `type` fields (e.g. "article", "team") are
// excluded from Pick assertions because ElectroDB models them as `type:
// "string"` (widened to `string` in EntityItem), while Zod schemas use
// literal union types.  The runtime drift tests in
// `lib/db/electrodb-entities.test.ts` cover these fields exhaustively.
//
// Exported as `export type` so that `noUnusedLocals` does not flag them —
// they are intentionally "unused" by application code but are evaluated by
// the TypeScript compiler as part of the build.
// ---------------------------------------------------------------------------

type AssertAssignable<TZod, TElectro extends TZod> = TElectro;

// Team
export type _TeamCheck = AssertAssignable<
  Required<Pick<Team, "id" | "name" | "slug" | "gender" | "createdAt" | "updatedAt">>,
  EntityItem<typeof TeamEntity>
>;

// Member
export type _MemberCheck = AssertAssignable<
  Required<Pick<Member, "id" | "name" | "createdAt" | "updatedAt">>,
  EntityItem<typeof MemberEntity>
>;

// Media
export type _MediaCheck = AssertAssignable<
  Required<
    Pick<
      Media,
      | "id"
      | "filename"
      | "mimeType"
      | "url"
      | "s3Key"
      | "s3Bucket"
      | "fileSize"
      | "uploadedBy"
      | "createdAt"
      | "updatedAt"
    >
  >,
  EntityItem<typeof MediaEntity>
>;

// Sponsor
export type _SponsorCheck = AssertAssignable<
  Required<Pick<Sponsor, "id" | "name" | "createdAt" | "updatedAt">>,
  EntityItem<typeof SponsorEntity>
>;

// Location
export type _LocationCheck = AssertAssignable<
  Required<
    Pick<Location, "id" | "name" | "street" | "postal" | "city" | "createdAt" | "updatedAt">
  >,
  EntityItem<typeof LocationEntity>
>;

// ---------------------------------------------------------------------------
// Runtime type guards — use these to safely narrow unknown DynamoDB items
// ---------------------------------------------------------------------------

/** Type guard: checks that `item` has the minimum shape of a Team */
export function isTeam(item: unknown): item is Team {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    obj.type === "team" &&
    typeof obj.name === "string" &&
    typeof obj.slug === "string" &&
    (obj.gender === "male" || obj.gender === "female" || obj.gender === "mixed") &&
    typeof obj.createdAt === "string" &&
    typeof obj.updatedAt === "string"
  );
}

/** Type guard: checks that `item` has the minimum shape of a Member */
export function isMember(item: unknown): item is Member {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.createdAt === "string" &&
    typeof obj.updatedAt === "string"
  );
}

/** Type guard: checks that `item` has the minimum shape of a Media record */
export function isMedia(item: unknown): item is Media {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.filename === "string" &&
    typeof obj.mimeType === "string" &&
    typeof obj.url === "string" &&
    typeof obj.s3Key === "string" &&
    typeof obj.s3Bucket === "string" &&
    typeof obj.fileSize === "number" &&
    typeof obj.uploadedBy === "string" &&
    typeof obj.createdAt === "string" &&
    typeof obj.updatedAt === "string"
  );
}

/** Type guard: checks that `item` has the minimum shape of a Sponsor */
export function isSponsor(item: unknown): item is Sponsor {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.createdAt === "string" &&
    typeof obj.updatedAt === "string"
  );
}

/** Type guard: checks that `item` has the minimum shape of a Location */
export function isLocation(item: unknown): item is Location {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.street === "string" &&
    typeof obj.postal === "string" &&
    typeof obj.city === "string" &&
    typeof obj.createdAt === "string" &&
    typeof obj.updatedAt === "string"
  );
}
