import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./client";
import { getContentTableName, getSamsTableName } from "./env";
import { createContentTable } from "./tables/content-table";
import { createSamsTable } from "./tables/sams-table";

let _contentTable: ReturnType<typeof createContentTable> | null = null;
let _samsTable: ReturnType<typeof createSamsTable> | null = null;

export function getContentTable(client: DynamoDBDocumentClient = docClient) {
  if (!_contentTable) {
    _contentTable = createContentTable(client);
  }
  return _contentTable;
}

export function getSamsTable(client: DynamoDBDocumentClient = docClient) {
  if (!_samsTable) {
    _samsTable = createSamsTable(client);
  }
  return _samsTable;
}

/** Factory for lambdas that provide their own DocumentClient and table name env */
export function createContentTableForLambda(client: DynamoDBDocumentClient, tableName: string) {
  return createContentTable(client, tableName);
}

export function createSamsTableForLambda(client: DynamoDBDocumentClient, tableName: string) {
  return createSamsTable(client, tableName);
}

/** Reset singletons — for tests */
export function resetToolboxTables() {
  _contentTable = null;
  _samsTable = null;
}

export { getContentTableName, getSamsTableName };
