import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { EntityRepository } from "dynamodb-toolbox/entity/actions/repository";
import { docClient } from "../client";
import { SamsTeamEntity } from "../entities/sams/team";
import { isoTimestampNow, parseWithSchema } from "../repository-utils";
import { samsTeamSchema, type SamsTeamInput } from "../schemas";
import { SamsTableIndexes } from "../table-indexes";
import { getSamsTable } from "../toolbox-client";

export type SamsTeamUpsertInput = Omit<SamsTeamInput, "type" | "updatedAt"> & {
  updatedAt?: string;
};

function parseTeam(value: unknown, message: string): SamsTeamInput {
  return parseWithSchema(samsTeamSchema, value, message);
}

export class SamsTeamsRepository {
  constructor(
    private readonly documentClient: DynamoDBDocumentClient = docClient,
    private readonly tableName?: string,
  ) {}

  private entityRepository() {
    getSamsTable(this.documentClient, this.tableName);
    return SamsTeamEntity.build(EntityRepository);
  }

  async listAll(): Promise<SamsTeamInput[]> {
    const { Items } = await this.entityRepository().query(
      {
        index: SamsTableIndexes.gsi1,
        partition: "team",
      },
      { maxPages: Infinity },
    );
    return (Items ?? []).map((item) => parseTeam(item, "Failed to parse SAMS team list item"));
  }

  async getById(uuid: string): Promise<SamsTeamInput | null> {
    const { Item } = await this.entityRepository().get({ uuid });
    return Item ? parseTeam(Item, "Failed to parse SAMS team data") : null;
  }

  async getByNameSlug(nameSlug: string): Promise<SamsTeamInput | null> {
    const matches = await this.queryByNameSlugPrefix(nameSlug);
    return matches.find((team) => team.nameSlug === nameSlug) ?? null;
  }

  async queryByNameSlugPrefix(nameSlugPrefix: string): Promise<SamsTeamInput[]> {
    const { Items } = await this.entityRepository().query(
      {
        index: SamsTableIndexes.gsi1,
        partition: "team",
        range: { beginsWith: nameSlugPrefix },
      },
      { maxPages: Infinity },
    );
    return (Items ?? []).map((item) => parseTeam(item, "Failed to parse SAMS team query item"));
  }

  async upsert(input: SamsTeamUpsertInput): Promise<SamsTeamInput> {
    const item = parseTeam(
      {
        ...input,
        type: "team",
        updatedAt: input.updatedAt ?? isoTimestampNow(),
      },
      "Failed to parse SAMS team upsert input",
    );
    await this.entityRepository().put(item);
    return item;
  }

  async upsertMany(inputs: SamsTeamUpsertInput[]): Promise<void> {
    await Promise.all(inputs.map((input) => this.upsert(input)));
  }

  async delete(uuid: string): Promise<void> {
    await this.entityRepository().delete({ uuid });
  }
}

export const samsTeamsRepository = new SamsTeamsRepository();

export function createSamsTeamsRepository(
  client: DynamoDBDocumentClient,
  tableName: string,
): SamsTeamsRepository {
  return new SamsTeamsRepository(client, tableName);
}
