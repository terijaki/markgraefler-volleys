import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../client";
import { getSamsTableName } from "../env";
import {
  samsClubScheduleProjectionSchema,
  samsTeamScheduleProjectionSchema,
  type SamsClubScheduleProjectionInput,
  type SamsProjectionMatchInput,
  type SamsTeamScheduleProjectionInput,
} from "../schemas";
import { samsSchedulePk, samsSeasonSk, samsTeamSchedulePk } from "../key-constants";
import {
  isoTimestampNow,
  parseWithSchema,
  SAMS_PROJECTION_TTL_DAYS,
  unixTtlSecondsFromNow,
} from "../repository-utils";

import { groupProjectionMatchesByTeamUuid } from "@/utils/sams-schedule-projections";

function parseSchedule(value: unknown, message: string): SamsClubScheduleProjectionInput {
  return parseWithSchema(samsClubScheduleProjectionSchema, value, message);
}

function parseTeamSchedule(value: unknown, message: string): SamsTeamScheduleProjectionInput {
  return parseWithSchema(samsTeamScheduleProjectionSchema, value, message);
}

export type SamsScheduleProjectionMeta = {
  snapshotVersion: string;
  projectedAt?: string;
  cachedAt?: string;
  isStale?: boolean;
};

export type SamsClubScheduleUpsertInput = Omit<
  SamsClubScheduleProjectionInput,
  "type" | "updatedAt" | "ttl"
> & {
  updatedAt?: string;
  ttl?: number;
};

export type SamsTeamScheduleUpsertInput = Omit<
  SamsTeamScheduleProjectionInput,
  "type" | "updatedAt" | "ttl"
> & {
  updatedAt?: string;
  ttl?: number;
};

export class SamsScheduleProjectionRepository {
  constructor(
    private readonly documentClient: DynamoDBDocumentClient = docClient,
    private readonly tableName?: string,
  ) {}

  private resolveTableName(): string {
    return this.tableName ?? getSamsTableName();
  }

  private buildItem(input: SamsClubScheduleUpsertInput): SamsClubScheduleProjectionInput & {
    pk: string;
    sk: string;
  } {
    const item = parseSchedule(
      {
        ...input,
        type: "schedule",
        updatedAt: input.updatedAt ?? isoTimestampNow(),
        ttl: input.ttl ?? unixTtlSecondsFromNow(SAMS_PROJECTION_TTL_DAYS),
      },
      "Failed to parse SAMS schedule projection upsert input",
    );
    return {
      ...item,
      pk: samsSchedulePk(item.sportsclubUuid),
      sk: samsSeasonSk(item.seasonUuid),
    };
  }

  async get(
    sportsclubUuid: string,
    seasonUuid: string,
  ): Promise<SamsClubScheduleProjectionInput | null> {
    const result = await this.documentClient.send(
      new GetCommand({
        TableName: this.resolveTableName(),
        Key: { pk: samsSchedulePk(sportsclubUuid), sk: samsSeasonSk(seasonUuid) },
      }),
    );
    if (!result.Item) return null;

    const parsed = samsClubScheduleProjectionSchema.safeParse(result.Item);
    if (!parsed.success) {
      console.warn("Failed to parse SAMS schedule projection; treating as missing", {
        sportsclubUuid,
        seasonUuid,
        issues: parsed.error.issues.map((issue) => issue.message),
      });
      return null;
    }
    return parsed.data;
  }

  async getSnapshotVersion(
    sportsclubUuid: string,
    seasonUuid: string,
  ): Promise<string | undefined> {
    const result = await this.documentClient.send(
      new GetCommand({
        TableName: this.resolveTableName(),
        Key: { pk: samsSchedulePk(sportsclubUuid), sk: samsSeasonSk(seasonUuid) },
      }),
    );
    const snapshotVersion = result.Item?.snapshotVersion;
    return typeof snapshotVersion === "string" ? snapshotVersion : undefined;
  }

  async replace(input: SamsClubScheduleUpsertInput): Promise<SamsClubScheduleProjectionInput> {
    const item = this.buildItem(input);
    await this.documentClient.send(
      new PutCommand({
        TableName: this.resolveTableName(),
        Item: item,
      }),
    );
    const { pk: _, sk: __, ...stored } = item;
    return stored;
  }

  async replaceClubSchedule(
    input: SamsClubScheduleUpsertInput,
    meta: SamsScheduleProjectionMeta,
  ): Promise<SamsClubScheduleProjectionInput> {
    const clubSchedule = await this.replace(input);
    await this.syncTeamSchedulesFromClubSchedule(clubSchedule, meta);
    return clubSchedule;
  }

  async mergeMatchesForClub(
    sportsclubUuid: string,
    seasonUuid: string,
    seasonName: string | undefined,
    matches: SamsProjectionMatchInput[],
    meta: SamsScheduleProjectionMeta,
  ): Promise<SamsClubScheduleProjectionInput> {
    const existing = await this.get(sportsclubUuid, seasonUuid);
    const mergedByUuid = new Map<string, SamsProjectionMatchInput>();
    for (const match of existing?.matches ?? []) {
      mergedByUuid.set(match.uuid, match);
    }
    for (const match of matches) {
      mergedByUuid.set(match.uuid, match);
    }
    const clubSchedule = await this.replace({
      sportsclubUuid,
      seasonUuid,
      seasonName: seasonName ?? existing?.seasonName,
      matches: [...mergedByUuid.values()],
      snapshotVersion: meta.snapshotVersion,
      projectedAt: meta.projectedAt ?? existing?.projectedAt,
      cachedAt: meta.cachedAt ?? existing?.cachedAt,
      isStale: meta.isStale ?? existing?.isStale,
    });
    await this.syncTeamSchedulesFromClubSchedule(clubSchedule, meta);
    return clubSchedule;
  }

  async getForTeam(
    teamUuid: string,
    seasonUuid: string,
  ): Promise<SamsTeamScheduleProjectionInput | null> {
    const result = await this.documentClient.send(
      new GetCommand({
        TableName: this.resolveTableName(),
        Key: { pk: samsTeamSchedulePk(teamUuid), sk: samsSeasonSk(seasonUuid) },
      }),
    );
    if (!result.Item) return null;

    const parsed = samsTeamScheduleProjectionSchema.safeParse(result.Item);
    if (!parsed.success) {
      console.warn("Failed to parse SAMS team schedule projection; treating as missing", {
        teamUuid,
        seasonUuid,
        issues: parsed.error.issues.map((issue) => issue.message),
      });
      return null;
    }
    return parsed.data;
  }

  private buildTeamScheduleItem(
    input: SamsTeamScheduleUpsertInput,
  ): SamsTeamScheduleProjectionInput & {
    pk: string;
    sk: string;
  } {
    const item = parseTeamSchedule(
      {
        ...input,
        type: "teamSchedule",
        updatedAt: input.updatedAt ?? isoTimestampNow(),
        ttl: input.ttl ?? unixTtlSecondsFromNow(SAMS_PROJECTION_TTL_DAYS),
      },
      "Failed to parse SAMS team schedule projection upsert input",
    );
    return {
      ...item,
      pk: samsTeamSchedulePk(item.teamUuid),
      sk: samsSeasonSk(item.seasonUuid),
    };
  }

  async replaceForTeam(
    input: SamsTeamScheduleUpsertInput,
  ): Promise<SamsTeamScheduleProjectionInput> {
    const item = this.buildTeamScheduleItem(input);
    await this.documentClient.send(
      new PutCommand({
        TableName: this.resolveTableName(),
        Item: item,
      }),
    );
    const { pk: _, sk: __, ...stored } = item;
    return stored;
  }

  /** Materialize per-team schedule projections from a club schedule blob. */
  async syncTeamSchedulesFromClubSchedule(
    clubSchedule: SamsClubScheduleProjectionInput,
    meta: SamsScheduleProjectionMeta,
  ): Promise<void> {
    const matchesByTeamUuid = groupProjectionMatchesByTeamUuid(clubSchedule.matches);
    const ttl = unixTtlSecondsFromNow(SAMS_PROJECTION_TTL_DAYS);

    await Promise.all(
      [...matchesByTeamUuid.entries()].map(([teamUuid, teamMatches]) =>
        this.replaceForTeam({
          teamUuid,
          seasonUuid: clubSchedule.seasonUuid,
          seasonName: clubSchedule.seasonName,
          sportsclubUuid: clubSchedule.sportsclubUuid,
          matches: teamMatches,
          snapshotVersion: meta.snapshotVersion,
          projectedAt: meta.projectedAt ?? clubSchedule.projectedAt,
          cachedAt: meta.cachedAt ?? clubSchedule.cachedAt,
          isStale: meta.isStale ?? clubSchedule.isStale,
          ttl,
        }),
      ),
    );
  }

  async listMatchesForTeam(
    teamUuid: string,
    seasonUuid: string,
  ): Promise<SamsProjectionMatchInput[]> {
    const schedule = await this.getForTeam(teamUuid, seasonUuid);
    return schedule?.matches ?? [];
  }

  async listMatchesForSportsclubs(
    sportsclubUuids: readonly string[],
    seasonUuid?: string,
  ): Promise<SamsProjectionMatchInput[]> {
    const schedules = await Promise.all(
      sportsclubUuids.map(async (sportsclubUuid) => {
        if (seasonUuid) {
          const schedule = await this.get(sportsclubUuid, seasonUuid);
          return schedule?.matches ?? [];
        }
        // Without season filter, caller should pass season — return empty for safety
        return [];
      }),
    );
    const byUuid = new Map<string, SamsProjectionMatchInput>();
    for (const matches of schedules) {
      for (const match of matches) {
        byUuid.set(match.uuid, match);
      }
    }
    return [...byUuid.values()];
  }
}

export function createSamsScheduleProjectionRepository(
  client: DynamoDBDocumentClient,
  tableName: string,
): SamsScheduleProjectionRepository {
  return new SamsScheduleProjectionRepository(client, tableName);
}

export const samsScheduleProjectionRepository = new SamsScheduleProjectionRepository();
