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
import { samsTeamPk, SK_METADATA } from "../key-constants";
import { SamsTableIndexes } from "../table-indexes";
import { SamsTeamsRepository } from "./sams-teams-repository";

const TABLE = "mv-sams-test";
const TEAM_UUID = "bb0e8400-e29b-41d4-a716-446655440006";
const CLUB_UUID = "aa0e8400-e29b-41d4-a716-446655440005";
const ISO = "2024-06-15T10:30:00.000Z";

const storedTeamItem = {
  pk: samsTeamPk(TEAM_UUID),
  sk: SK_METADATA,
  _et: "SamsTeam",
  gsi1pk: "team",
  gsi1sk: "mv-herren",
  uuid: TEAM_UUID,
  type: "team",
  name: "MV Herren",
  nameSlug: "mv-herren",
  sportsclubUuid: CLUB_UUID,
  associationUuid: "assoc-1",
  leagueUuid: "league-1",
  leagueName: "Bezirksliga",
  seasonUuid: "season-1",
  seasonName: "2024/25",
  updatedAt: ISO,
  ttl: 1_700_000_000,
};

describe("SamsTeamsRepository", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  beforeEach(() => {
    process.env.SAMS_TABLE_NAME = TABLE;
    ddbMock.reset();
  });

  afterEach(() => {
    ddbMock.reset();
  });

  it("listAll queries GSI1 by team type", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [storedTeamItem] });

    const repo = new SamsTeamsRepository(documentClient, TABLE);
    const result = await repo.listAll();

    expect(result).toHaveLength(1);
    expect(result[0]?.nameSlug).toBe("mv-herren");

    const [query] = ddbMock.commandCalls(QueryCommand);
    expect(query.args[0].input).toMatchObject({
      TableName: TABLE,
      IndexName: SamsTableIndexes.gsi1,
    });
  });

  it("getById fetches by uuid primary key", async () => {
    ddbMock.on(GetCommand).resolves({ Item: storedTeamItem });

    const repo = new SamsTeamsRepository(documentClient, TABLE);
    const team = await repo.getById(TEAM_UUID);

    expect(team?.name).toBe("MV Herren");

    const [get] = ddbMock.commandCalls(GetCommand);
    expect(get.args[0].input).toMatchObject({
      TableName: TABLE,
      Key: { pk: samsTeamPk(TEAM_UUID), sk: SK_METADATA },
    });
  });

  it("queryByNameSlugPrefix uses beginsWith on gsi1sk", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [storedTeamItem] });

    const repo = new SamsTeamsRepository(documentClient, TABLE);
    const teams = await repo.queryByNameSlugPrefix("mv");

    expect(teams).toHaveLength(1);

    const [query] = ddbMock.commandCalls(QueryCommand);
    expect(query.args[0].input).toMatchObject({
      TableName: TABLE,
      IndexName: SamsTableIndexes.gsi1,
      KeyConditionExpression: expect.stringContaining("begins_with"),
    });
  });

  it("upsert puts a team with encoded keys", async () => {
    ddbMock.on(PutCommand).resolves({});

    const repo = new SamsTeamsRepository(documentClient, TABLE);
    const upserted = await repo.upsert({
      uuid: TEAM_UUID,
      name: "MV Herren",
      nameSlug: "mv-herren",
      sportsclubUuid: CLUB_UUID,
      associationUuid: "assoc-1",
      leagueUuid: "league-1",
      leagueName: "Bezirksliga",
      seasonUuid: "season-1",
      seasonName: "2024/25",
      ttl: 1_700_000_000,
    });

    expect(upserted.type).toBe("team");
    expect(upserted.updatedAt).toBeDefined();

    const [put] = ddbMock.commandCalls(PutCommand);
    expect(put.args[0].input).toMatchObject({
      TableName: TABLE,
      Item: expect.objectContaining({
        pk: samsTeamPk(TEAM_UUID),
        sk: SK_METADATA,
        _et: "SamsTeam",
        gsi1pk: "team",
        gsi1sk: "mv-herren",
      }),
    });
  });

  it("delete removes team by uuid", async () => {
    ddbMock.on(DeleteCommand).resolves({});

    const repo = new SamsTeamsRepository(documentClient, TABLE);
    await repo.delete(TEAM_UUID);

    const [del] = ddbMock.commandCalls(DeleteCommand);
    expect(del.args[0].input).toMatchObject({
      TableName: TABLE,
      Key: { pk: samsTeamPk(TEAM_UUID), sk: SK_METADATA },
    });
  });
});
