import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createSamsClubsRepository } from "./sams-clubs-repository";
import { createSamsTeamsRepository } from "./sams-teams-repository";

export function createSamsRepositories(client: DynamoDBDocumentClient, tableName: string) {
  return {
    clubs: createSamsClubsRepository(client, tableName),
    teams: createSamsTeamsRepository(client, tableName),
  };
}

export type SamsRepositories = ReturnType<typeof createSamsRepositories>;
