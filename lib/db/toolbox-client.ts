import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./client";
import { getContentTableName, getSamsTableName } from "./env";
import { ContentTable } from "./tables/content-table";
import { createContentTable } from "./tables/content-table";
import { createSamsTable } from "./tables/sams-table";
import { SamsTable } from "./tables/sams-table";

export function getContentTable(client: DynamoDBDocumentClient = docClient, tableName?: string) {
  ContentTable.documentClient = client;
  if (tableName !== undefined) {
    ContentTable.tableName = tableName;
  }
  return ContentTable;
}

export function getSamsTable(client: DynamoDBDocumentClient = docClient, tableName?: string) {
  SamsTable.documentClient = client;
  if (tableName !== undefined) {
    SamsTable.tableName = tableName;
  }
  return SamsTable;
}

/** Factory for lambdas that provide their own DocumentClient and table name env */
export function createContentTableForLambda(client: DynamoDBDocumentClient, tableName: string) {
  return createContentTable(client, tableName);
}

export function createSamsTableForLambda(client: DynamoDBDocumentClient, tableName: string) {
  return createSamsTable(client, tableName);
}

export { getContentTableName, getSamsTableName };
