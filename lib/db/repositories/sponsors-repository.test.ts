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
import { SK_METADATA, sponsorPk } from "../key-constants";
import { SponsorsRepository } from "./sponsors-repository";

const TABLE = "mv-content-test";
const SPONSOR_ID = "770e8400-e29b-41d4-a716-446655440002";
const ISO = "2024-06-15T10:30:00.000Z";

const storedSponsorItem = {
  pk: sponsorPk(SPONSOR_ID),
  sk: SK_METADATA,
  _et: "Sponsor",
  gsi1pk: "sponsor",
  gsi1sk: ISO,
  id: SPONSOR_ID,
  type: "sponsor",
  name: "Acme GmbH",
  createdAt: ISO,
  updatedAt: ISO,
};

describe("SponsorsRepository", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  beforeEach(() => {
    process.env.CONTENT_TABLE_NAME = TABLE;
    ddbMock.reset();
  });

  afterEach(() => {
    ddbMock.reset();
  });

  it("listAll queries GSI1 by sponsor type", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [storedSponsorItem] });

    const repo = new SponsorsRepository(documentClient);
    const { items } = await repo.listAll();

    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe("Acme GmbH");

    const [query] = ddbMock.commandCalls(QueryCommand);
    expect(query.args[0].input).toMatchObject({
      TableName: TABLE,
      IndexName: ContentTableIndexes.gsi1,
    });
  });

  it("create puts sponsor with encoded keys", async () => {
    ddbMock.on(PutCommand).resolves({});

    const repo = new SponsorsRepository(documentClient);
    const created = await repo.create({
      type: "sponsor",
      name: "Acme GmbH",
    });

    expect(created.type).toBe("sponsor");

    const [put] = ddbMock.commandCalls(PutCommand);
    expect(put.args[0].input).toMatchObject({
      TableName: TABLE,
      Item: expect.objectContaining({
        pk: sponsorPk(created.id),
        sk: SK_METADATA,
        _et: "Sponsor",
        gsi1pk: "sponsor",
      }),
    });
  });

  it("update removes nullable fields", async () => {
    ddbMock
      .on(GetCommand)
      .resolvesOnce({ Item: { ...storedSponsorItem, description: "Old" } })
      .resolvesOnce({ Item: storedSponsorItem });
    ddbMock.on(UpdateCommand).resolves({});

    const repo = new SponsorsRepository(documentClient);
    await repo.update(SPONSOR_ID, { description: null });

    const [update] = ddbMock.commandCalls(UpdateCommand);
    const input = update.args[0].input;
    expect(input.UpdateExpression).toContain("REMOVE");
    expect(Object.values(input.ExpressionAttributeNames ?? {})).toContain("description");
  });

  it("delete removes sponsor by primary key", async () => {
    ddbMock.on(DeleteCommand).resolves({});

    const repo = new SponsorsRepository(documentClient);
    const result = await repo.delete(SPONSOR_ID);

    expect(result).toEqual({ success: true });

    const [del] = ddbMock.commandCalls(DeleteCommand);
    expect(del.args[0].input).toMatchObject({
      TableName: TABLE,
      Key: { pk: sponsorPk(SPONSOR_ID), sk: SK_METADATA },
    });
  });
});
