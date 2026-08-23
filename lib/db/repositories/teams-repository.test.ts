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
import { SK_METADATA, teamPk } from "../key-constants";
import { TeamsRepository } from "./teams-repository";

const TABLE = "mv-content-test";
const TEAM_ID = "550e8400-e29b-41d4-a716-446655440000";
const ISO = "2024-06-15T10:30:00.000Z";

const storedTeamItem = {
  pk: teamPk(TEAM_ID),
  sk: SK_METADATA,
  _et: "Team",
  gsi1pk: "team",
  gsi1sk: "herren1",
  gsi3pk: "herren1",
  gsi3sk: SK_METADATA,
  id: TEAM_ID,
  type: "team",
  name: "Herren 1",
  slug: "herren1",
  gender: "male",
  createdAt: ISO,
  updatedAt: ISO,
};

describe("TeamsRepository", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  beforeEach(() => {
    process.env.CONTENT_TABLE_NAME = TABLE;
    ddbMock.reset();
  });

  afterEach(() => {
    ddbMock.reset();
  });

  it("listAll queries GSI1 by team type", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [storedTeamItem] });

    const repo = new TeamsRepository(documentClient);
    const result = await repo.listAll();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.slug).toBe("herren1");
    expect(result.items[0]?.id).toBe(TEAM_ID);

    const [query] = ddbMock.commandCalls(QueryCommand);
    expect(query.args[0].input).toMatchObject({
      TableName: TABLE,
      IndexName: ContentTableIndexes.gsi1,
    });
  });

  it("getById fetches by primary key", async () => {
    ddbMock.on(GetCommand).resolves({ Item: storedTeamItem });

    const repo = new TeamsRepository(documentClient);
    const team = await repo.getById(TEAM_ID);

    expect(team?.name).toBe("Herren 1");

    const [get] = ddbMock.commandCalls(GetCommand);
    expect(get.args[0].input).toMatchObject({
      TableName: TABLE,
      Key: { pk: teamPk(TEAM_ID), sk: SK_METADATA },
    });
  });

  it("getBySlug queries GSI3 with slug partition", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [storedTeamItem] });

    const repo = new TeamsRepository(documentClient);
    const team = await repo.getBySlug("herren1");

    expect(team?.id).toBe(TEAM_ID);

    const [query] = ddbMock.commandCalls(QueryCommand);
    expect(query.args[0].input).toMatchObject({
      TableName: TABLE,
      IndexName: ContentTableIndexes.gsi3,
    });
  });

  it("create puts a team with encoded keys", async () => {
    ddbMock.on(PutCommand).resolves({});

    const repo = new TeamsRepository(documentClient);
    const created = await repo.create({
      type: "team",
      name: "Herren 1",
      gender: "male",
    });

    expect(created.slug).toBe("herren1");
    expect(created.type).toBe("team");
    expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    const [put] = ddbMock.commandCalls(PutCommand);
    expect(put.args[0].input).toMatchObject({
      TableName: TABLE,
      Item: expect.objectContaining({
        pk: expect.stringMatching(/^team#/),
        sk: SK_METADATA,
        _et: "Team",
        gsi1pk: "team",
        gsi3pk: "herren1",
      }),
    });
  });

  it("update puts pictureS3Keys when the list attribute was not set on create", async () => {
    ddbMock
      .on(GetCommand)
      .resolvesOnce({ Item: storedTeamItem })
      .resolvesOnce({
        Item: {
          ...storedTeamItem,
          pictureS3Keys: ["teams/pic.jpg"],
        },
      });
    ddbMock.on(PutCommand).resolves({});

    const repo = new TeamsRepository(documentClient);
    const updated = await repo.update(TEAM_ID, {
      pictureS3Keys: ["teams/pic.jpg"],
    });

    expect(updated.pictureS3Keys).toEqual(["teams/pic.jpg"]);

    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);

    const [put] = ddbMock.commandCalls(PutCommand);
    expect(put.args[0].input).toMatchObject({
      TableName: TABLE,
      Item: expect.objectContaining({
        pictureS3Keys: ["teams/pic.jpg"],
      }),
    });
  });

  it("update removes nullable fields and regenerates slug on name change", async () => {
    ddbMock
      .on(GetCommand)
      .resolvesOnce({ Item: storedTeamItem })
      .resolvesOnce({
        Item: {
          ...storedTeamItem,
          name: "Herren 2",
          slug: "herren2",
          description: undefined,
          gsi1sk: "herren2",
          gsi3pk: "herren2",
        },
      });
    ddbMock.on(UpdateCommand).resolves({});

    const repo = new TeamsRepository(documentClient);
    const updated = await repo.update(TEAM_ID, {
      name: "Herren 2",
      description: null,
    });

    expect(updated.name).toBe("Herren 2");
    expect(updated.slug).toBe("herren2");

    const [update] = ddbMock.commandCalls(UpdateCommand);
    const input = update.args[0].input;
    expect(input.UpdateExpression).toContain("REMOVE");
    expect(Object.values(input.ExpressionAttributeNames ?? {})).toContain("description");
  });

  it("update throws when team does not exist", async () => {
    ddbMock.on(GetCommand).resolves({});

    const repo = new TeamsRepository(documentClient);
    await expect(repo.update(TEAM_ID, { name: "Missing" })).rejects.toThrow("Team not found");
  });

  it("delete removes the team item", async () => {
    ddbMock.on(DeleteCommand).resolves({});

    const repo = new TeamsRepository(documentClient);
    const result = await repo.delete(TEAM_ID);

    expect(result).toEqual({ success: true });

    const [del] = ddbMock.commandCalls(DeleteCommand);
    expect(del.args[0].input).toMatchObject({
      TableName: TABLE,
      Key: { pk: teamPk(TEAM_ID), sk: SK_METADATA },
    });
  });
});
