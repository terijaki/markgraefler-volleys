import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { EntityRepository } from "dynamodb-toolbox/entity/actions/repository";
import { PutItemCommand } from "dynamodb-toolbox/entity/actions/put";
import type { PutItemInput } from "dynamodb-toolbox/entity/actions/put";
import type { UpdateItemInput } from "dynamodb-toolbox/entity/actions/update";
import { $remove } from "dynamodb-toolbox/entity/actions/update";
import { z } from "zod";
import { docClient } from "../client";
import { MemberEntity } from "../entities/content/member";
import { SK_METADATA } from "../key-constants";
import { resolveNullableUpdates } from "../nullable-updates";
import { memberSchema } from "../schemas";
import { ContentTableIndexes } from "../table-indexes";
import { getContentTable } from "../toolbox-client";
import type { Member } from "../types";
import { applyMemberEmailIndexKeys, trimMemberEmails } from "./member-email-keys";
import type { MemberEmailFields } from "./member-email-keys";
import { teamsRepository } from "./teams-repository";

const memberInputSchema = memberSchema.omit({ id: true, createdAt: true, updatedAt: true });

export const memberUpdateInputSchema = memberSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial()
  .extend({
    privateEmail: z.email().trim().nullable().optional(),
    proxyEmail: z.email().trim().nullable().optional(),
    phone: z.string().nullable().optional(),
    roleTitle: z.string().max(100).nullable().optional(),
    avatarS3Key: z.string().nullable().optional(),
    authRole: z.enum(["Admin", "Moderator"]).nullable().optional(),
  });

export type MemberCreateInput = z.infer<typeof memberInputSchema>;
export type MemberUpdateInput = z.infer<typeof memberUpdateInputSchema>;

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

function parseMember(value: unknown, message: string): Member {
  try {
    const trimmed = trimMemberEmails(value as MemberEmailFields & Record<string, unknown>);
    return memberSchema.parse(trimmed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(message, { cause: error });
    }
    throw error;
  }
}

function normalizeMemberWriteInput<T extends MemberEmailFields>(input: T): T {
  return trimMemberEmails(input);
}

export class MembersRepository {
  constructor(private readonly documentClient: DynamoDBDocumentClient = docClient) {}

  private entityRepository() {
    getContentTable(this.documentClient);
    return MemberEntity.build(EntityRepository);
  }

  private async putMember(item: PutItemInput<typeof MemberEntity>): Promise<void> {
    const normalized = normalizeMemberWriteInput(item);
    const putParams = MemberEntity.build(PutItemCommand).item(normalized).params();
    const dynamoItem = { ...putParams.Item };
    applyMemberEmailIndexKeys(dynamoItem, normalized);

    await this.documentClient.send(
      new PutCommand({
        TableName: putParams.TableName,
        Item: dynamoItem,
        ...(putParams.ConditionExpression
          ? {
              ConditionExpression: putParams.ConditionExpression,
              ExpressionAttributeNames: putParams.ExpressionAttributeNames,
              ExpressionAttributeValues: putParams.ExpressionAttributeValues,
            }
          : {}),
      }),
    );
  }

  async listAll(): Promise<{ items: Member[] }> {
    const { Items } = await this.entityRepository().query(
      {
        index: ContentTableIndexes.gsi1,
        partition: "member",
      },
      { maxPages: Infinity },
    );

    const items = (Items ?? []).map((item) =>
      parseMember(item, "Failed to parse member list item"),
    );
    return { items };
  }

  async listTrainers(): Promise<{ items: Member[] }> {
    const { items } = await this.listAll();
    return { items: items.filter((member) => member.isTrainer === true) };
  }

  async getById(id: string): Promise<Member | null> {
    const { Item } = await this.entityRepository().get({ id });
    return Item ? parseMember(Item, "Failed to parse member data") : null;
  }

  async getByPrivateEmail(privateEmail: string): Promise<Member | null> {
    const trimmed = privateEmail.trim();
    const { Items } = await this.entityRepository().query(
      {
        index: ContentTableIndexes.gsi5,
        partition: trimmed,
      },
      { limit: 1 },
    );

    const item = Items?.[0];
    return item ? parseMember(item, "Failed to parse member data") : null;
  }

  async getByProxyEmail(proxyEmail: string): Promise<Member | null> {
    const trimmed = proxyEmail.trim();
    const { Items } = await this.entityRepository().query(
      {
        index: ContentTableIndexes.gsi4,
        partition: trimmed,
      },
      { limit: 1 },
    );

    const item = Items?.[0];
    return item ? parseMember(item, "Failed to parse member data") : null;
  }

  async create(data: MemberCreateInput): Promise<Member> {
    const normalized = normalizeMemberWriteInput(data);
    const member = withTimestamps({
      ...normalized,
      id: crypto.randomUUID(),
    });

    await this.putMember(member);
    return parseMember(member, "Failed to parse created member");
  }

  async update(id: string, updates: MemberUpdateInput): Promise<Member> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error("Member not found");
    }

    const { privateEmail, proxyEmail, phone, roleTitle, avatarS3Key, authRole, ...restUpdates } =
      updates;
    const normalizedProxy =
      proxyEmail && typeof proxyEmail === "string" ? proxyEmail.trim() : proxyEmail;
    const normalizedPrivate =
      privateEmail && typeof privateEmail === "string" ? privateEmail.trim() : privateEmail;

    const { setFields: nullableFields, removeKeys } = resolveNullableUpdates({
      privateEmail: normalizedPrivate,
      proxyEmail: normalizedProxy,
      phone,
      roleTitle,
      avatarS3Key,
      authRole,
    });

    const nextPrivateEmail = removeKeys.includes("privateEmail")
      ? undefined
      : ((nullableFields.privateEmail as string | undefined) ?? existing.privateEmail);
    const nextProxyEmail = removeKeys.includes("proxyEmail")
      ? undefined
      : ((nullableFields.proxyEmail as string | undefined) ?? existing.proxyEmail);

    const updateItem: UpdateItemInput<typeof MemberEntity> = {
      id,
      updatedAt: new Date().toISOString(),
      ...restUpdates,
      ...nullableFields,
      ...(removeKeys.includes("privateEmail") ? { privateEmail: $remove() } : {}),
      ...(removeKeys.includes("proxyEmail") ? { proxyEmail: $remove() } : {}),
      ...(removeKeys.includes("phone") ? { phone: $remove() } : {}),
      ...(removeKeys.includes("roleTitle") ? { roleTitle: $remove() } : {}),
      ...(removeKeys.includes("avatarS3Key") ? { avatarS3Key: $remove() } : {}),
      ...(removeKeys.includes("authRole") ? { authRole: $remove() } : {}),
      ...(nextProxyEmail
        ? { gsi4pk: nextProxyEmail, gsi4sk: SK_METADATA }
        : removeKeys.includes("proxyEmail") || normalizedProxy === null
          ? { gsi4pk: $remove(), gsi4sk: $remove() }
          : {}),
      ...(nextPrivateEmail
        ? { gsi5pk: nextPrivateEmail, gsi5sk: SK_METADATA }
        : removeKeys.includes("privateEmail") || normalizedPrivate === null
          ? { gsi5pk: $remove(), gsi5sk: $remove() }
          : {}),
    };

    await this.entityRepository().update(updateItem);

    const refreshed = await this.getById(id);
    if (!refreshed) {
      throw new Error("Member not found");
    }
    return refreshed;
  }

  async delete(id: string): Promise<{ success: true }> {
    const { items: teams } = await teamsRepository.listAll();
    for (const team of teams) {
      if (!team.trainerIds?.includes(id)) {
        continue;
      }
      const updatedTrainerIds = team.trainerIds.filter((trainerId) => trainerId !== id);
      await teamsRepository.update(team.id, { trainerIds: updatedTrainerIds });
    }

    await this.entityRepository().delete({ id });
    return { success: true };
  }
}

export const membersRepository = new MembersRepository();
