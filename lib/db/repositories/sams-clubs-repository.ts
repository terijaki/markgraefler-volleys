import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { EntityRepository } from "dynamodb-toolbox/entity/actions/repository";
import { docClient } from "../client";
import { SamsClubEntity } from "../entities/sams/club";
import { isoTimestampNow, parseWithSchema } from "../repository-utils";
import { samsClubSchema, type SamsClubInput } from "../schemas";
import { SamsTableIndexes } from "../table-indexes";
import { getSamsTable } from "../toolbox-client";

export type SamsClubUpsertInput = Omit<SamsClubInput, "type" | "updatedAt"> & {
  updatedAt?: string;
};

function parseClub(value: unknown, message: string): SamsClubInput {
  return parseWithSchema(samsClubSchema, value, message);
}

export class SamsClubsRepository {
  constructor(
    private readonly documentClient: DynamoDBDocumentClient = docClient,
    private readonly tableName?: string,
  ) {}

  private entityRepository() {
    getSamsTable(this.documentClient, this.tableName);
    return SamsClubEntity.build(EntityRepository);
  }

  async listAll(): Promise<SamsClubInput[]> {
    const { Items } = await this.entityRepository().query(
      {
        index: SamsTableIndexes.gsi1,
        partition: "club",
      },
      { maxPages: Infinity },
    );
    return (Items ?? []).map((item) => parseClub(item, "Failed to parse SAMS club list item"));
  }

  async getById(sportsclubUuid: string): Promise<SamsClubInput | null> {
    const { Item } = await this.entityRepository().get({ sportsclubUuid });
    return Item ? parseClub(Item, "Failed to parse SAMS club data") : null;
  }

  async getByNameSlug(nameSlug: string): Promise<SamsClubInput | null> {
    const matches = await this.queryByNameSlugPrefix(nameSlug);
    const exactMatches = matches.filter((club) => club.nameSlug === nameSlug);
    if (exactMatches.length === 0) return null;
    return exactMatches.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  }

  async queryByNameSlugPrefix(nameSlugPrefix: string): Promise<SamsClubInput[]> {
    const { Items } = await this.entityRepository().query(
      {
        index: SamsTableIndexes.gsi1,
        partition: "club",
        range: { beginsWith: nameSlugPrefix },
      },
      { maxPages: Infinity },
    );
    return (Items ?? []).map((item) => parseClub(item, "Failed to parse SAMS club query item"));
  }

  async upsert(input: SamsClubUpsertInput): Promise<SamsClubInput> {
    const item = parseClub(
      {
        ...input,
        type: "club",
        updatedAt: input.updatedAt ?? isoTimestampNow(),
      },
      "Failed to parse SAMS club upsert input",
    );
    await this.entityRepository().put(item);
    return item;
  }

  async upsertMany(inputs: SamsClubUpsertInput[]): Promise<void> {
    await Promise.all(inputs.map((input) => this.upsert(input)));
  }

  async delete(sportsclubUuid: string): Promise<void> {
    await this.entityRepository().delete({ sportsclubUuid });
  }
}

export const samsClubsRepository = new SamsClubsRepository();

export function createSamsClubsRepository(
  client: DynamoDBDocumentClient,
  tableName: string,
): SamsClubsRepository {
  return new SamsClubsRepository(client, tableName);
}
