/**
 * Zod validation schemas for DynamoDB entities
 * Using Zod v4 top-level string formats for optimal performance
 */

import { z } from "zod";

/** Base fields for all entities */
export const baseEntityFields = {
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
} as const;

/** Training schedule schema */
export const trainingScheduleSchema = z.object({
  days: z
    .array(z.number().int().min(0).max(6))
    .describe("0 = Sunday, 1 = Monday, ..., 6 = Saturday (matches dayjs)"),
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .describe("HH:MM format"),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .describe("HH:MM format"),
  locationId: z.uuid(),
});

/** Team schema */
export const teamSchema = z.object({
  ...baseEntityFields,
  type: z.literal("team").describe("Entity type, primary key for GSI queries"),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().optional(),
  sbvvTeamId: z.string().optional(),
  ageGroup: z.string().optional(),
  gender: z.enum(["male", "female", "mixed"]),
  league: z.string().optional(),
  trainerIds: z.array(z.string()).optional(),
  pointOfContactIds: z.array(z.string()).optional(),
  pictureS3Keys: z.array(z.string()).optional(),
  trainingSchedules: z.array(trainingScheduleSchema).optional(),
});

/** Member schema */
export const memberSchema = z.object({
  ...baseEntityFields,
  type: z.literal("member").default("member").describe("Entity type, primary key for GSI queries"),
  name: z.string().min(1).max(200),
  privateEmail: z
    .email()
    .trim()
    .optional()
    .describe("Admin-only private destination email — never exposed in public responses"),
  proxyEmail: z
    .email()
    .trim()
    .optional()
    .describe("Public proxy alias — used in all public mailto flows"),
  phone: z.string().optional(),
  isTrainer: z.boolean().optional(),
  roleTitle: z.string().max(100).optional(),
  avatarS3Key: z.string().optional(),
  authRole: z
    .enum(["Admin", "Moderator"])
    .optional()
    .describe("CMS admin role — when set, this member may log in to the admin panel"),
});

/** Media schema */
export const mediaSchema = z.object({
  ...baseEntityFields,
  filename: z.string().min(1),
  mimeType: z.string().regex(/^[a-z]+\/[a-z0-9\-+.]+$/),
  url: z.url(),
  s3Key: z.string().min(1),
  s3Bucket: z.string().min(1),
  alt: z.string().optional(),
  caption: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  fileSize: z.number().int().positive(),
  uploadedBy: z.string(),
});

/** Sponsor schema */
export const sponsorSchema = z.object({
  ...baseEntityFields,
  type: z
    .literal("sponsor")
    .default("sponsor")
    .describe("Entity type, primary key for GSI queries"),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  websiteUrl: z.url().optional(),
  logoS3Key: z.string().optional(),
  ttl: z.number().int().positive().optional().describe("Unix timestamp for DynamoDB TTL"),
});

/** Location schema */
export const locationSchema = z.object({
  ...baseEntityFields,
  type: z
    .literal("location")
    .default("location")
    .describe("Entity type, primary key for GSI queries"),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  street: z.string().min(1).max(200),
  postal: z.string().min(1).max(20),
  city: z.string().min(1).max(100),
});

/** Export types inferred from schemas */
export type TeamInput = z.infer<typeof teamSchema>;
export type MemberInput = z.infer<typeof memberSchema>;
export type MediaInput = z.infer<typeof mediaSchema>;
export type SponsorInput = z.infer<typeof sponsorSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type TrainingScheduleInput = z.infer<typeof trainingScheduleSchema>;

// ---------------------------------------------------------------------------
// SAMS entity schemas
// ---------------------------------------------------------------------------

/** SAMS club record (synced from external SAMS API) */
export const samsClubSchema = z.object({
  sportsclubUuid: z.string().min(1),
  type: z.literal("club").default("club").describe("Entity type discriminator for GSI queries"),
  name: z.string().min(1),
  nameSlug: z.string().min(1).describe("URL-safe slug for case-insensitive queries"),
  associationUuid: z.string().optional(),
  associationName: z.string().optional(),
  logoImageLink: z.string().optional(),
  logoS3Key: z.string().optional(),
  updatedAt: z.iso.datetime(),
  ttl: z.number().int().positive().describe("Unix timestamp for DynamoDB TTL (30-day expiry)"),
});

/** SAMS team record (synced from external SAMS API — only Markgräfler Volleys teams) */
export const samsTeamSchema = z.object({
  uuid: z.string().min(1),
  type: z.literal("team").default("team").describe("Entity type discriminator for GSI queries"),
  name: z.string().min(1),
  nameSlug: z.string().min(1).describe("URL-safe slug for case-insensitive queries"),
  sportsclubUuid: z.string().min(1),
  associationUuid: z.string().min(1),
  leagueUuid: z.string().min(1),
  leagueName: z.string().min(1),
  leagueHierarchyLevel: z.number().nonnegative().optional(),
  seasonUuid: z.string().min(1),
  seasonName: z.string().min(1),
  updatedAt: z.iso.datetime(),
  ttl: z.number().int().positive().describe("Unix timestamp for DynamoDB TTL (1-year expiry)"),
});

export type SamsClubInput = z.infer<typeof samsClubSchema>;
export type SamsTeamInput = z.infer<typeof samsTeamSchema>;

/**
 * A player entry within a SAMS team roster
 * uuid and name are always present: sams-teams-sync.ts derives a deterministic pseudo uuid when the
 * external API omits one, and filters out players without a name.
 */
export const samsRosterPlayerSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  jerseyNumber: z.number().optional(),
  position: z.string().optional(),
  portraitImageLink: z.string().optional(),
});

/**
 * An official/coach entry within a SAMS team roster
 * uuid and name are always present: sams-teams-sync.ts derives a deterministic pseudo uuid when the
 * external API omits one, and filters out officials without a name.
 */
export const samsRosterOfficialSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  role: z.string().optional(),
});

/** SAMS team roster record — players + officials for the current season (synced from external SAMS API) */
export const samsRosterSchema = z.object({
  teamUuid: z.string().min(1),
  type: z.literal("roster").default("roster").describe("Entity type discriminator for GSI queries"),
  players: z.array(samsRosterPlayerSchema).default([]),
  officials: z.array(samsRosterOfficialSchema).default([]),
  updatedAt: z.iso.datetime(),
  ttl: z.number().int().positive().describe("Unix timestamp for DynamoDB TTL (1-year expiry)"),
});

export type SamsRosterInput = z.infer<typeof samsRosterSchema>;
export type SamsRosterPlayerInput = z.infer<typeof samsRosterPlayerSchema>;
export type SamsRosterOfficialInput = z.infer<typeof samsRosterOfficialSchema>;

/** Stored league match row inside a club schedule projection (LeagueMatchesResponse item shape). */
export const samsProjectionMatchSchema = z
  .object({
    uuid: z.string(),
    date: z.string().nullish(),
    time: z.string().nullish(),
    matchNumber: z.string().nullish(),
    host: z.preprocess(
      (value) => (typeof value === "boolean" ? null : value),
      z.string().nullish(),
    ),
    leagueUuid: z.string().nullish(),
    results: z.record(z.string(), z.unknown()).nullish(),
    location: z
      .object({
        uuid: z.string(),
        name: z.string().nullish(),
        longitude: z.number().nullish(),
        latitude: z.number().nullish(),
        address: z.string().nullish(),
      })
      .nullish(),
    _embedded: z
      .object({
        team1: z
          .object({
            uuid: z.string(),
            name: z.string(),
            sportsclubUuid: z.string(),
          })
          .optional(),
        team2: z
          .object({
            uuid: z.string(),
            name: z.string(),
            sportsclubUuid: z.string(),
          })
          .optional(),
      })
      .nullish(),
  })
  .loose();

export type SamsProjectionMatchInput = z.infer<typeof samsProjectionMatchSchema>;

/** Club schedule projection — rolling match window for one club/season. */
export const samsClubScheduleProjectionSchema = z.object({
  sportsclubUuid: z.string().min(1),
  seasonUuid: z.string().min(1),
  seasonName: z.string().optional(),
  type: z.literal("schedule").default("schedule"),
  matches: z.array(samsProjectionMatchSchema).default([]),
  snapshotVersion: z.string().min(1),
  projectedAt: z.iso.datetime().optional(),
  cachedAt: z.iso.datetime().optional(),
  isStale: z.boolean().optional(),
  updatedAt: z.iso.datetime(),
  ttl: z.number().int().positive(),
});

export type SamsClubScheduleProjectionInput = z.infer<typeof samsClubScheduleProjectionSchema>;

/** League ranking projection row (RankingResponse teams entry shape). */
export const samsProjectionRankingEntrySchema = z.object({
  uuid: z.string(),
  teamName: z.string(),
  rank: z.number().optional(),
  sportsclubUuid: z.string().min(1).optional(),
  logoUrl: z.string().optional(),
  matchesPlayed: z.number().nullish(),
  points: z.number().nullish(),
  wins: z.number().nullish(),
  setWins: z.number().nullish(),
  setLosses: z.number().nullish(),
});

export type SamsProjectionRankingEntryInput = z.infer<typeof samsProjectionRankingEntrySchema>;

/** League ranking projection for one league/season. */
export const samsLeagueRankingProjectionSchema = z.object({
  leagueUuid: z.string().min(1),
  seasonUuid: z.string().min(1),
  seasonName: z.string().optional(),
  leagueName: z.string().optional(),
  type: z.literal("ranking").default("ranking"),
  teams: z.array(samsProjectionRankingEntrySchema).default([]),
  snapshotVersion: z.string().min(1),
  cachedAt: z.iso.datetime().optional(),
  isStale: z.boolean().optional(),
  updatedAt: z.iso.datetime(),
  ttl: z.number().int().positive(),
});

export type SamsLeagueRankingProjectionInput = z.infer<typeof samsLeagueRankingProjectionSchema>;

/** Optional ops metadata from provider sync.completed events. */
export const samsOpsMetadataSchema = z.object({
  scope: z.string().min(1),
  type: z.literal("ops").default("ops"),
  occurredAt: z.iso.datetime(),
  payload: z.record(z.string(), z.unknown()).optional(),
  updatedAt: z.iso.datetime(),
  ttl: z.number().int().positive().optional(),
});

export type SamsOpsMetadataInput = z.infer<typeof samsOpsMetadataSchema>;
