import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { EntityRepository } from "dynamodb-toolbox/entity/actions/repository";
import { docClient } from "../client";
import { SamsRosterEntity } from "../entities/sams/roster";
import { isoTimestampNow, parseWithSchema } from "../repository-utils";
import { samsRosterSchema, type SamsRosterInput } from "../schemas";
import { getSamsTable } from "../toolbox-client";

export type SamsRosterUpsertInput = Omit<SamsRosterInput, "type" | "updatedAt"> & {
  updatedAt?: string;
};

function parseRoster(value: unknown, message: string): SamsRosterInput {
  return parseWithSchema(samsRosterSchema, value, message);
}

export class SamsRostersRepository {
  constructor(
    private readonly documentClient: DynamoDBDocumentClient = docClient,
    private readonly tableName?: string,
  ) {}

  private entityRepository() {
    getSamsTable(this.documentClient, this.tableName);
    return SamsRosterEntity.build(EntityRepository);
  }

  async getByTeamUuid(teamUuid: string): Promise<SamsRosterInput | null> {
    const { Item } = await this.entityRepository().get({ teamUuid });
    return Item ? parseRoster(Item, "Failed to parse SAMS roster data") : null;
  }

  async upsert(input: SamsRosterUpsertInput): Promise<SamsRosterInput> {
    const item = parseRoster(
      {
        ...input,
        type: "roster",
        updatedAt: input.updatedAt ?? isoTimestampNow(),
      },
      "Failed to parse SAMS roster upsert input",
    );
    await this.entityRepository().put(item);
    return item;
  }

  async delete(teamUuid: string): Promise<void> {
    await this.entityRepository().delete({ teamUuid });
  }
}

export const samsRostersRepository = new SamsRostersRepository();

export function createSamsRostersRepository(
  client: DynamoDBDocumentClient,
  tableName: string,
): SamsRostersRepository {
  return new SamsRostersRepository(client, tableName);
}
