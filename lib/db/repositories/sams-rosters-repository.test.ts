import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { samsRosterPk, SK_METADATA } from "../key-constants";
import { SamsRostersRepository } from "./sams-rosters-repository";

const TABLE = "mv-sams-test";
const TEAM_UUID = "bb0e8400-e29b-41d4-a716-446655440006";
const ISO = "2024-06-15T10:30:00.000Z";

const storedRosterItem = {
  pk: samsRosterPk(TEAM_UUID),
  sk: SK_METADATA,
  _et: "SamsRoster",
  gsi1pk: "roster",
  gsi1sk: TEAM_UUID,
  teamUuid: TEAM_UUID,
  type: "roster",
  players: [{ uuid: "p1", name: "Jane Doe", jerseyNumber: 7, position: "Zuspiel" }],
  officials: [{ uuid: "o1", name: "Coach Smith", role: "Trainer" }],
  updatedAt: ISO,
  ttl: 1_700_000_000,
};

describe("SamsRostersRepository", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  beforeEach(() => {
    process.env.SAMS_TABLE_NAME = TABLE;
    ddbMock.reset();
  });

  afterEach(() => {
    ddbMock.reset();
  });

  it("getByTeamUuid fetches by teamUuid primary key", async () => {
    ddbMock.on(GetCommand).resolves({ Item: storedRosterItem });

    const repo = new SamsRostersRepository(documentClient, TABLE);
    const roster = await repo.getByTeamUuid(TEAM_UUID);

    expect(roster?.teamUuid).toBe(TEAM_UUID);
    expect(roster?.players).toHaveLength(1);
    expect(roster?.officials).toHaveLength(1);

    const [get] = ddbMock.commandCalls(GetCommand);
    expect(get.args[0].input).toMatchObject({
      TableName: TABLE,
      Key: { pk: samsRosterPk(TEAM_UUID), sk: SK_METADATA },
    });
  });

  it("upsert puts a roster with encoded keys", async () => {
    ddbMock.on(PutCommand).resolves({});

    const repo = new SamsRostersRepository(documentClient, TABLE);
    const upserted = await repo.upsert({
      teamUuid: TEAM_UUID,
      players: [{ uuid: "p1", name: "Jane Doe", jerseyNumber: 7 }],
      officials: [{ uuid: "o1", name: "Coach Smith", role: "Trainer" }],
      ttl: 1_700_000_000,
    });

    expect(upserted.type).toBe("roster");
    expect(upserted.updatedAt).toBeDefined();

    const [put] = ddbMock.commandCalls(PutCommand);
    expect(put.args[0].input).toMatchObject({
      TableName: TABLE,
      Item: expect.objectContaining({
        pk: samsRosterPk(TEAM_UUID),
        sk: SK_METADATA,
        _et: "SamsRoster",
        gsi1pk: "roster",
        gsi1sk: TEAM_UUID,
      }),
    });
  });

  it("delete removes roster by teamUuid", async () => {
    ddbMock.on(DeleteCommand).resolves({});

    const repo = new SamsRostersRepository(documentClient, TABLE);
    await repo.delete(TEAM_UUID);

    const [del] = ddbMock.commandCalls(DeleteCommand);
    expect(del.args[0].input).toMatchObject({
      TableName: TABLE,
      Key: { pk: samsRosterPk(TEAM_UUID), sk: SK_METADATA },
    });
  });
});
