/**
 * DynamoDB-backed SecondaryStorage for better-auth.
 *
 * better-auth routes OTP verification codes and rate-limit counters through
 * SecondaryStorage when one is provided, keeping those short-lived records out
 * of the primary adapter entirely.
 *
 * Key scheme (single content table, single-table design):
 *   PK: `auth-storage#<key>`
 *   SK: `auth-storage`
 *
 * The `ttl` attribute is a Unix epoch seconds value used by DynamoDB TTL to
 * automatically delete expired entries.
 */

import { DeleteCommand, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { SecondaryStorage } from "better-auth";
import { docClient } from "@/lib/db/client";
import { getContentTableName } from "@/lib/db/env";

const SK = "auth-storage";

function buildPk(key: string): string {
  return `auth-storage#${key}`;
}

export const dynamoDBSecondaryStorage: SecondaryStorage = {
  async get(key) {
    const result = await docClient.send(
      new GetCommand({
        TableName: getContentTableName(),
        Key: { pk: buildPk(key), sk: SK },
      }),
    );

    if (!result.Item) return null;
    return result.Item.value as string;
  },

  async getAndDelete(key) {
    const result = await docClient.send(
      new DeleteCommand({
        TableName: getContentTableName(),
        Key: { pk: buildPk(key), sk: SK },
        ReturnValues: "ALL_OLD",
      }),
    );

    if (!result.Attributes) return null;
    return result.Attributes.value as string;
  },

  async increment(key, ttl) {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: getContentTableName(),
        Key: { pk: buildPk(key), sk: SK },
        // TTL is set only when the counter is created; later increments must not
        // extend the window (better-auth SecondaryStorage.increment contract).
        UpdateExpression: "ADD #value :one SET #ttl = if_not_exists(#ttl, :ttl)",
        ExpressionAttributeNames: {
          "#value": "value",
          "#ttl": "ttl",
        },
        ExpressionAttributeValues: {
          ":one": 1,
          ":ttl": Math.floor(Date.now() / 1000) + ttl,
        },
        ReturnValues: "UPDATED_NEW",
      }),
    );

    return Number(result.Attributes?.value ?? 1);
  },

  async set(key, value, ttl) {
    const item: Record<string, unknown> = {
      pk: buildPk(key),
      sk: SK,
      value,
    };

    if (ttl !== undefined) {
      item.ttl = Math.floor(Date.now() / 1000) + ttl;
    }

    await docClient.send(
      new PutCommand({
        TableName: getContentTableName(),
        Item: item,
      }),
    );
  },

  async delete(key) {
    await docClient.send(
      new DeleteCommand({
        TableName: getContentTableName(),
        Key: { pk: buildPk(key), sk: SK },
      }),
    );
  },
};
