import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { EntityRepository } from "dynamodb-toolbox/entity/actions/repository";
import { docClient } from "../client";
import { SamsTeamLogoEntity } from "../entities/sams/team-logo";
import {
  isoTimestampNow,
  parseWithSchema,
  SAMS_PROJECTION_TTL_DAYS,
  unixTtlSecondsFromNow,
} from "../repository-utils";
import { samsTeamLogoSchema, type SamsTeamLogoInput } from "../schemas";
import { getSamsTable } from "../toolbox-client";

export type SamsTeamLogoUpsertInput = Omit<SamsTeamLogoInput, "type" | "updatedAt" | "ttl"> & {
  updatedAt?: string;
  ttl?: number;
};

function parseTeamLogo(value: unknown, message: string): SamsTeamLogoInput {
  return parseWithSchema(samsTeamLogoSchema, value, message);
}

export class SamsTeamLogoRepository {
  constructor(
    private readonly documentClient: DynamoDBDocumentClient = docClient,
    private readonly tableName?: string,
  ) {}

  private entityRepository() {
    getSamsTable(this.documentClient, this.tableName);
    return SamsTeamLogoEntity.build(EntityRepository);
  }

  async get(teamUuid: string): Promise<SamsTeamLogoInput | null> {
    const { Item } = await this.entityRepository().get({ teamUuid });
    return Item ? parseTeamLogo(Item, "Failed to parse SAMS team logo") : null;
  }

  async upsert(input: SamsTeamLogoUpsertInput): Promise<SamsTeamLogoInput> {
    const item = parseTeamLogo(
      {
        ...input,
        type: "teamlogo",
        updatedAt: input.updatedAt ?? isoTimestampNow(),
        ttl: input.ttl ?? unixTtlSecondsFromNow(SAMS_PROJECTION_TTL_DAYS),
      },
      "Failed to parse SAMS team logo upsert input",
    );
    await this.entityRepository().put(item);
    return item;
  }
}

export const samsTeamLogoRepository = new SamsTeamLogoRepository();

export function createSamsTeamLogoRepository(
  client: DynamoDBDocumentClient,
  tableName: string,
): SamsTeamLogoRepository {
  return new SamsTeamLogoRepository(client, tableName);
}
