import { slugify } from "@utils/slugify";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { EntityRepository } from "dynamodb-toolbox/entity/actions/repository";
import type { UpdateItemInput } from "dynamodb-toolbox/entity/actions/update";
import { $remove } from "dynamodb-toolbox/entity/actions/update";
import { z } from "zod";
import { docClient } from "../client";
import { TeamEntity } from "../entities/content/team";
import { resolveNullableUpdates } from "../nullable-updates";
import { teamSchema } from "../schemas";
import { ContentTableIndexes } from "../table-indexes";
import { getContentTable } from "../toolbox-client";
import type { Team } from "../types";

const teamInputSchema = teamSchema.omit({ id: true, createdAt: true, updatedAt: true, slug: true });

export const teamUpdateInputSchema = teamSchema
  .omit({ id: true, createdAt: true, updatedAt: true, slug: true })
  .partial()
  .extend({
    description: z.string().nullable().optional(),
    sbvvTeamId: z.string().nullable().optional(),
    ageGroup: z.string().nullable().optional(),
    league: z.string().nullable().optional(),
  });

export type TeamCreateInput = z.infer<typeof teamInputSchema>;
export type TeamUpdateInput = z.infer<typeof teamUpdateInputSchema>;

function withTimestamps<T extends Record<string, unknown>>(
  item: T,
): T & { createdAt: string; updatedAt: string } {
  const now = new Date().toISOString();
  return {
    ...item,
    createdAt: now,
    updatedAt: now,
  };
}

function parseTeam(value: unknown, message: string): Team {
  try {
    return teamSchema.parse(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(message, { cause: error });
    }
    throw error;
  }
}

export class TeamsRepository {
  constructor(
    private readonly documentClient: DynamoDBDocumentClient = docClient,
    private readonly tableName?: string,
  ) {}

  private entityRepository() {
    getContentTable(this.documentClient, this.tableName);
    return TeamEntity.build(EntityRepository);
  }

  async listAll(): Promise<{ items: Team[] }> {
    const { Items } = await this.entityRepository().query(
      {
        index: ContentTableIndexes.gsi1,
        partition: "team",
      },
      { maxPages: Infinity },
    );

    const items = (Items ?? []).map((item) => parseTeam(item, "Failed to parse team list item"));
    return { items };
  }

  async getById(id: string): Promise<Team | null> {
    const { Item } = await this.entityRepository().get({ id });
    return Item ? parseTeam(Item, "Failed to parse team data") : null;
  }

  async getBySlug(slug: string): Promise<Team | null> {
    const { Items } = await this.entityRepository().query(
      {
        index: ContentTableIndexes.gsi3,
        partition: slug,
      },
      { limit: 1 },
    );

    const item = Items?.[0];
    return item ? parseTeam(item, "Failed to parse team data") : null;
  }

  async create(data: TeamCreateInput): Promise<Team> {
    const id = crypto.randomUUID();
    const slug = slugify(data.name, true);
    const team = withTimestamps({
      ...data,
      id,
      slug,
    });

    await this.entityRepository().put(team);
    return parseTeam(team, "Failed to parse created team");
  }

  async update(id: string, updates: TeamUpdateInput): Promise<Team> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error("Team not found");
    }

    const { description, sbvvTeamId, ageGroup, league, name, ...restUpdates } = updates;
    const { setFields: nullableFields, removeKeys } = resolveNullableUpdates({
      description,
      sbvvTeamId,
      ageGroup,
      league,
    });

    const updateItem: UpdateItemInput<typeof TeamEntity> = {
      id,
      updatedAt: new Date().toISOString(),
      ...restUpdates,
      ...nullableFields,
      ...(name !== undefined ? { name, slug: slugify(name, true) } : {}),
      ...(removeKeys.includes("description") ? { description: $remove() } : {}),
      ...(removeKeys.includes("sbvvTeamId") ? { sbvvTeamId: $remove() } : {}),
      ...(removeKeys.includes("ageGroup") ? { ageGroup: $remove() } : {}),
      ...(removeKeys.includes("league") ? { league: $remove() } : {}),
    };

    await this.entityRepository().update(updateItem);

    const refreshed = await this.getById(id);
    if (!refreshed) {
      throw new Error("Team not found");
    }
    return refreshed;
  }

  async delete(id: string): Promise<{ success: true }> {
    await this.entityRepository().delete({ id });
    return { success: true };
  }
}

export const teamsRepository = new TeamsRepository();
