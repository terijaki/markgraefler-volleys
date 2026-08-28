import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createSamsClubsRepository } from "./sams-clubs-repository";
import { createSamsOpsMetadataRepository } from "./sams-ops-metadata-repository";
import { createSamsRankingProjectionRepository } from "./sams-ranking-projection-repository";
import { createSamsRostersRepository } from "./sams-rosters-repository";
import { createSamsScheduleProjectionRepository } from "./sams-schedule-projection-repository";
import { createSamsTeamsRepository } from "./sams-teams-repository";

export function createSamsRepositories(client: DynamoDBDocumentClient, tableName: string) {
  return {
    clubs: createSamsClubsRepository(client, tableName),
    teams: createSamsTeamsRepository(client, tableName),
    rosters: createSamsRostersRepository(client, tableName),
    schedules: createSamsScheduleProjectionRepository(client, tableName),
    rankings: createSamsRankingProjectionRepository(client, tableName),
    ops: createSamsOpsMetadataRepository(client, tableName),
  };
}

export type SamsRepositories = ReturnType<typeof createSamsRepositories>;
