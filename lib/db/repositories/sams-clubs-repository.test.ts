import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { samsClubPk, SK_METADATA } from "../key-constants";
import { SamsTableIndexes } from "../table-indexes";
import { SamsClubsRepository } from "./sams-clubs-repository";

const TABLE = "mv-sams-test";
const CLUB_UUID = "aa0e8400-e29b-41d4-a716-446655440005";
const ISO = "2024-06-15T10:30:00.000Z";

const storedClubItem = {
  pk: samsClubPk(CLUB_UUID),
  sk: SK_METADATA,
  _et: "SamsClub",
  gsi1pk: "club",
  gsi1sk: "markgraefler-volleys",
  sportsclubUuid: CLUB_UUID,
  type: "club",
  name: "Markgräfler Volleys",
  nameSlug: "markgraefler-volleys",
  updatedAt: ISO,
  ttl: 1_700_000_000,
};

describe("SamsClubsRepository", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  beforeEach(() => {
    process.env.SAMS_TABLE_NAME = TABLE;
    ddbMock.reset();
  });

  afterEach(() => {
    ddbMock.reset();
  });

  it("listAll queries GSI1 by club type", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [storedClubItem] });

    const repo = new SamsClubsRepository(documentClient, TABLE);
    const result = await repo.listAll();

    expect(result).toHaveLength(1);
    expect(result[0]?.nameSlug).toBe("markgraefler-volleys");

    const [query] = ddbMock.commandCalls(QueryCommand);
    expect(query.args[0].input).toMatchObject({
      TableName: TABLE,
      IndexName: SamsTableIndexes.gsi1,
    });
  });

  it("getById fetches by sportsclubUuid primary key", async () => {
    ddbMock.on(GetCommand).resolves({ Item: storedClubItem });

    const repo = new SamsClubsRepository(documentClient, TABLE);
    const club = await repo.getById(CLUB_UUID);

    expect(club?.name).toBe("Markgräfler Volleys");

    const [get] = ddbMock.commandCalls(GetCommand);
    expect(get.args[0].input).toMatchObject({
      TableName: TABLE,
      Key: { pk: samsClubPk(CLUB_UUID), sk: SK_METADATA },
    });
  });

  it("queryByNameSlugPrefix uses beginsWith on gsi1sk", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [storedClubItem] });

    const repo = new SamsClubsRepository(documentClient, TABLE);
    const clubs = await repo.queryByNameSlugPrefix("markgraefler");

    expect(clubs).toHaveLength(1);

    const [query] = ddbMock.commandCalls(QueryCommand);
    expect(query.args[0].input).toMatchObject({
      TableName: TABLE,
      IndexName: SamsTableIndexes.gsi1,
      KeyConditionExpression: expect.stringContaining("begins_with"),
    });
  });

  it("getByNameSlug returns exact match from prefix query", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        storedClubItem,
        {
          ...storedClubItem,
          sportsclubUuid: "other-uuid",
          nameSlug: "markgraefler-volleys-ii",
        },
      ],
    });

    const repo = new SamsClubsRepository(documentClient, TABLE);
    const club = await repo.getByNameSlug("markgraefler-volleys");

    expect(club?.sportsclubUuid).toBe(CLUB_UUID);
  });

  it("upsert puts a club with encoded keys", async () => {
    ddbMock.on(PutCommand).resolves({});

    const repo = new SamsClubsRepository(documentClient, TABLE);
    const upserted = await repo.upsert({
      sportsclubUuid: CLUB_UUID,
      name: "Markgräfler Volleys",
      nameSlug: "markgraefler-volleys",
      ttl: 1_700_000_000,
    });

    expect(upserted.type).toBe("club");
    expect(upserted.updatedAt).toBeDefined();

    const [put] = ddbMock.commandCalls(PutCommand);
    expect(put.args[0].input).toMatchObject({
      TableName: TABLE,
      Item: expect.objectContaining({
        pk: samsClubPk(CLUB_UUID),
        sk: SK_METADATA,
        _et: "SamsClub",
        gsi1pk: "club",
        gsi1sk: "markgraefler-volleys",
      }),
    });
  });

  it("upsertMany writes items in parallel", async () => {
    ddbMock.on(PutCommand).resolves({});

    const repo = new SamsClubsRepository(documentClient, TABLE);
    await repo.upsertMany([
      {
        sportsclubUuid: CLUB_UUID,
        name: "Club A",
        nameSlug: "club-a",
        ttl: 1_700_000_000,
      },
      {
        sportsclubUuid: "bb0e8400-e29b-41d4-a716-446655440006",
        name: "Club B",
        nameSlug: "club-b",
        ttl: 1_700_000_000,
      },
    ]);

    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(2);
  });

  it("delete removes club by sportsclubUuid", async () => {
    ddbMock.on(DeleteCommand).resolves({});

    const repo = new SamsClubsRepository(documentClient, TABLE);
    await repo.delete(CLUB_UUID);

    const [del] = ddbMock.commandCalls(DeleteCommand);
    expect(del.args[0].input).toMatchObject({
      TableName: TABLE,
      Key: { pk: samsClubPk(CLUB_UUID), sk: SK_METADATA },
    });
  });
});
