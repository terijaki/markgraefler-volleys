import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../client";
import { getSamsTableName } from "../env";
import {
  samsLeagueRankingProjectionSchema,
  type SamsLeagueRankingProjectionInput,
} from "../schemas";
import { samsRankingPk, samsSeasonSk } from "../key-constants";
import {
  isoTimestampNow,
  parseWithSchema,
  SAMS_PROJECTION_TTL_DAYS,
  unixTtlSecondsFromNow,
} from "../repository-utils";

function parseRanking(value: unknown, message: string): SamsLeagueRankingProjectionInput {
  return parseWithSchema(samsLeagueRankingProjectionSchema, value, message);
}

export type SamsLeagueRankingUpsertInput = Omit<
  SamsLeagueRankingProjectionInput,
  "type" | "updatedAt" | "ttl"
> & {
  updatedAt?: string;
  ttl?: number;
};

export class SamsRankingProjectionRepository {
  constructor(
    private readonly documentClient: DynamoDBDocumentClient = docClient,
    private readonly tableName?: string,
  ) {}

  private resolveTableName(): string {
    return this.tableName ?? getSamsTableName();
  }

  private buildItem(input: SamsLeagueRankingUpsertInput): SamsLeagueRankingProjectionInput & {
    pk: string;
    sk: string;
  } {
    const item = parseRanking(
      {
        ...input,
        type: "ranking",
        updatedAt: input.updatedAt ?? isoTimestampNow(),
        ttl: input.ttl ?? unixTtlSecondsFromNow(SAMS_PROJECTION_TTL_DAYS),
      },
      "Failed to parse SAMS ranking projection upsert input",
    );
    return {
      ...item,
      pk: samsRankingPk(item.leagueUuid),
      sk: samsSeasonSk(item.seasonUuid),
    };
  }

  async get(
    leagueUuid: string,
    seasonUuid: string,
  ): Promise<SamsLeagueRankingProjectionInput | null> {
    const result = await this.documentClient.send(
      new GetCommand({
        TableName: this.resolveTableName(),
        Key: { pk: samsRankingPk(leagueUuid), sk: samsSeasonSk(seasonUuid) },
      }),
    );
    if (!result.Item) return null;
    return parseRanking(result.Item, "Failed to parse SAMS ranking projection");
  }

  async replace(input: SamsLeagueRankingUpsertInput): Promise<SamsLeagueRankingProjectionInput> {
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
}

export function createSamsRankingProjectionRepository(
  client: DynamoDBDocumentClient,
  tableName: string,
): SamsRankingProjectionRepository {
  return new SamsRankingProjectionRepository(client, tableName);
}

export const samsRankingProjectionRepository = new SamsRankingProjectionRepository();
