import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Table } from "dynamodb-toolbox/table";
import { getContentTableName } from "../env";
import { ContentTableIndexes } from "../table-indexes";

export function createContentTable(
  documentClient?: DynamoDBDocumentClient,
  tableName: string | (() => string) = () => getContentTableName(),
) {
  return new Table({
    documentClient,
    name: tableName,
    partitionKey: { name: "pk", type: "string" },
    sortKey: { name: "sk", type: "string" },
    entityAttributeSavedAs: "_et",
    indexes: {
      [ContentTableIndexes.gsi1]: {
        type: "global",
        partitionKey: { name: "gsi1pk", type: "string" },
        sortKey: { name: "gsi1sk", type: "string" },
      },
      [ContentTableIndexes.gsi3]: {
        type: "global",
        partitionKey: { name: "gsi3pk", type: "string" },
        sortKey: { name: "gsi3sk", type: "string" },
      },
      [ContentTableIndexes.gsi4]: {
        type: "global",
        partitionKey: { name: "gsi4pk", type: "string" },
        sortKey: { name: "gsi4sk", type: "string" },
      },
      [ContentTableIndexes.gsi5]: {
        type: "global",
        partitionKey: { name: "gsi5pk", type: "string" },
        sortKey: { name: "gsi5sk", type: "string" },
      },
    },
  });
}

/** Placeholder table for entity definitions — wired with docClient at runtime via toolbox-client */
export const ContentTable = createContentTable();
