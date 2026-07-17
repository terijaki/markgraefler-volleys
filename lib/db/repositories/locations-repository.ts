import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { EntityRepository } from "dynamodb-toolbox/entity/actions/repository";
import type { UpdateItemInput } from "dynamodb-toolbox/entity/actions/update";
import { $remove } from "dynamodb-toolbox/entity/actions/update";
import { z } from "zod";
import { docClient } from "../client";
import { LocationEntity } from "../entities/content/location";
import { resolveNullableUpdates } from "../nullable-updates";
import { isoTimestampNow, parseWithSchema, withTimestamps } from "../repository-utils";
import { locationSchema } from "../schemas";
import { ContentTableIndexes } from "../table-indexes";
import { getContentTable } from "../toolbox-client";
import type { Location, PaginatedListResult } from "../types";

const locationInputSchema = locationSchema.omit({ id: true, createdAt: true, updatedAt: true });

export const locationUpdateInputSchema = locationSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial()
  .extend({
    description: z.string().nullable().optional(),
  });

export type LocationCreateInput = z.infer<typeof locationInputSchema>;
export type LocationUpdateInput = z.infer<typeof locationUpdateInputSchema>;

function parseLocation(value: unknown, message: string): Location {
  return parseWithSchema(locationSchema, value, message);
}

export class LocationsRepository {
  constructor(private readonly documentClient: DynamoDBDocumentClient = docClient) {}

  private entityRepository() {
    getContentTable(this.documentClient);
    return LocationEntity.build(EntityRepository);
  }

  async listAll(): Promise<PaginatedListResult<Location>> {
    const { Items } = await this.entityRepository().query(
      {
        index: ContentTableIndexes.gsi1,
        partition: "location",
      },
      { maxPages: Infinity },
    );

    const items = (Items ?? []).map((item) =>
      parseLocation(item, "Failed to parse location list item"),
    );
    return { items };
  }

  async getById(id: string): Promise<Location | null> {
    const { Item } = await this.entityRepository().get({ id });
    return Item ? parseLocation(Item, "Failed to parse location data") : null;
  }

  async create(data: LocationCreateInput): Promise<Location> {
    const location = withTimestamps({
      ...data,
      id: crypto.randomUUID(),
    });

    await this.entityRepository().put(location);
    return parseLocation(location, "Failed to parse created location");
  }

  async update(id: string, updates: LocationUpdateInput): Promise<Location> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error("Location not found");
    }

    const { description, ...restUpdates } = updates;
    const { setFields: nullableFields, removeKeys } = resolveNullableUpdates({
      description,
    });

    const updateItem: UpdateItemInput<typeof LocationEntity> = {
      id,
      updatedAt: isoTimestampNow(),
      ...restUpdates,
      ...nullableFields,
      ...(removeKeys.includes("description") ? { description: $remove() } : {}),
    };

    await this.entityRepository().update(updateItem);

    const refreshed = await this.getById(id);
    if (!refreshed) {
      throw new Error("Location not found");
    }
    return refreshed;
  }

  async delete(id: string): Promise<{ success: true }> {
    await this.entityRepository().delete({ id });
    return { success: true };
  }
}

export const locationsRepository = new LocationsRepository();
