import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { ContentTableIndexes } from "../table-indexes";
import { locationPk, SK_METADATA } from "../key-constants";
import { LocationsRepository } from "./locations-repository";

const TABLE = "mv-content-test";
const LOCATION_ID = "880e8400-e29b-41d4-a716-446655440003";
const ISO = "2024-06-15T10:30:00.000Z";

const storedLocationItem = {
  pk: locationPk(LOCATION_ID),
  sk: SK_METADATA,
  _et: "Location",
  gsi1pk: "location",
  gsi1sk: ISO,
  id: LOCATION_ID,
  type: "location",
  name: "Halle 1",
  street: "Sportstr. 1",
  postal: "79423",
  city: "Heitersheim",
  createdAt: ISO,
  updatedAt: ISO,
};

describe("LocationsRepository", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  beforeEach(() => {
    process.env.CONTENT_TABLE_NAME = TABLE;
    ddbMock.reset();
  });

  afterEach(() => {
    ddbMock.reset();
  });

  it("listAll queries GSI1 by location type", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [storedLocationItem] });

    const repo = new LocationsRepository(documentClient);
    const { items } = await repo.listAll();

    expect(items).toHaveLength(1);
    expect(items[0]?.city).toBe("Heitersheim");

    const [query] = ddbMock.commandCalls(QueryCommand);
    expect(query.args[0].input).toMatchObject({
      TableName: TABLE,
      IndexName: ContentTableIndexes.gsi1,
    });
  });

  it("create puts location with encoded keys", async () => {
    ddbMock.on(PutCommand).resolves({});

    const repo = new LocationsRepository(documentClient);
    const created = await repo.create({
      type: "location",
      name: "Halle 1",
      street: "Sportstr. 1",
      postal: "79423",
      city: "Heitersheim",
    });

    expect(created.type).toBe("location");

    const [put] = ddbMock.commandCalls(PutCommand);
    expect(put.args[0].input).toMatchObject({
      TableName: TABLE,
      Item: expect.objectContaining({
        pk: locationPk(created.id),
        sk: SK_METADATA,
        _et: "Location",
        gsi1pk: "location",
      }),
    });
  });

  it("update removes nullable description", async () => {
    ddbMock
      .on(GetCommand)
      .resolvesOnce({ Item: { ...storedLocationItem, description: "Main hall" } })
      .resolvesOnce({ Item: storedLocationItem });
    ddbMock.on(UpdateCommand).resolves({});

    const repo = new LocationsRepository(documentClient);
    await repo.update(LOCATION_ID, { description: null });

    const [update] = ddbMock.commandCalls(UpdateCommand);
    const input = update.args[0].input;
    expect(input.UpdateExpression).toContain("REMOVE");
    expect(Object.values(input.ExpressionAttributeNames ?? {})).toContain("description");
  });

  it("delete removes location by primary key", async () => {
    ddbMock.on(DeleteCommand).resolves({});

    const repo = new LocationsRepository(documentClient);
    const result = await repo.delete(LOCATION_ID);

    expect(result).toEqual({ success: true });

    const [del] = ddbMock.commandCalls(DeleteCommand);
    expect(del.args[0].input).toMatchObject({
      TableName: TABLE,
      Key: { pk: locationPk(LOCATION_ID), sk: SK_METADATA },
    });
  });
});
