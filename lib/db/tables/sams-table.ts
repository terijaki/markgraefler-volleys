import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Table } from "dynamodb-toolbox/table";
import { getSamsTableName } from "../env";
import { SamsTableIndexes } from "../table-indexes";

export function createSamsTable(
  documentClient?: DynamoDBDocumentClient,
  tableName: string | (() => string) = () => getSamsTableName(),
) {
  return new Table({
    documentClient,
    name: tableName,
    partitionKey: { name: "pk", type: "string" },
    sortKey: { name: "sk", type: "string" },
    entityAttributeSavedAs: "_et",
    indexes: {
      [SamsTableIndexes.gsi1]: {
        type: "global",
        partitionKey: { name: "gsi1pk", type: "string" },
        sortKey: { name: "gsi1sk", type: "string" },
      },
    },
  });
}

/** Placeholder table for entity definitions — wired with docClient at runtime via toolbox-client */
export const SamsTable = createSamsTable();
