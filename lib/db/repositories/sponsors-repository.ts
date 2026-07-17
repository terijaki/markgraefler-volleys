import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { EntityRepository } from "dynamodb-toolbox/entity/actions/repository";
import type { UpdateItemInput } from "dynamodb-toolbox/entity/actions/update";
import { $remove } from "dynamodb-toolbox/entity/actions/update";
import { z } from "zod";
import { docClient } from "../client";
import { SponsorEntity } from "../entities/content/sponsor";
import { resolveNullableUpdates } from "../nullable-updates";
import { isoTimestampNow, parseWithSchema, withTimestamps } from "../repository-utils";
import { sponsorSchema } from "../schemas";
import { ContentTableIndexes } from "../table-indexes";
import { getContentTable } from "../toolbox-client";
import type { PaginatedListResult, Sponsor } from "../types";

const sponsorInputSchema = sponsorSchema.omit({ id: true, createdAt: true, updatedAt: true });

export const sponsorUpdateInputSchema = sponsorSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial()
  .extend({
    description: z.string().nullable().optional(),
    websiteUrl: z.url().nullable().optional(),
    logoS3Key: z.string().nullable().optional(),
    ttl: z.number().int().positive().nullable().optional(),
  });

export type SponsorCreateInput = z.infer<typeof sponsorInputSchema>;
export type SponsorUpdateInput = z.infer<typeof sponsorUpdateInputSchema>;

function parseSponsor(value: unknown, message: string): Sponsor {
  return parseWithSchema(sponsorSchema, value, message);
}

export class SponsorsRepository {
  constructor(private readonly documentClient: DynamoDBDocumentClient = docClient) {}

  private entityRepository() {
    getContentTable(this.documentClient);
    return SponsorEntity.build(EntityRepository);
  }

  async listAll(): Promise<PaginatedListResult<Sponsor>> {
    const { Items } = await this.entityRepository().query(
      {
        index: ContentTableIndexes.gsi1,
        partition: "sponsor",
      },
      { maxPages: Infinity },
    );

    const items = (Items ?? []).map((item) =>
      parseSponsor(item, "Failed to parse sponsor list item"),
    );
    return { items };
  }

  async getById(id: string): Promise<Sponsor | null> {
    const { Item } = await this.entityRepository().get({ id });
    return Item ? parseSponsor(Item, "Failed to parse sponsor data") : null;
  }

  async create(data: SponsorCreateInput): Promise<Sponsor> {
    const sponsor = withTimestamps({
      ...data,
      id: crypto.randomUUID(),
    });

    await this.entityRepository().put(sponsor);
    return parseSponsor(sponsor, "Failed to parse created sponsor");
  }

  async update(id: string, updates: SponsorUpdateInput): Promise<Sponsor> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error("Sponsor not found");
    }

    const { description, websiteUrl, logoS3Key, ttl, ...restUpdates } = updates;
    const { setFields: nullableFields, removeKeys } = resolveNullableUpdates({
      description,
      websiteUrl,
      logoS3Key,
      ttl,
    });

    const updateItem: UpdateItemInput<typeof SponsorEntity> = {
      id,
      updatedAt: isoTimestampNow(),
      ...restUpdates,
      ...nullableFields,
      ...(removeKeys.includes("description") ? { description: $remove() } : {}),
      ...(removeKeys.includes("websiteUrl") ? { websiteUrl: $remove() } : {}),
      ...(removeKeys.includes("logoS3Key") ? { logoS3Key: $remove() } : {}),
      ...(removeKeys.includes("ttl") ? { ttl: $remove() } : {}),
    };

    await this.entityRepository().update(updateItem);

    const refreshed = await this.getById(id);
    if (!refreshed) {
      throw new Error("Sponsor not found");
    }
    return refreshed;
  }

  async delete(id: string): Promise<{ success: true }> {
    await this.entityRepository().delete({ id });
    return { success: true };
  }
}

export const sponsorsRepository = new SponsorsRepository();
