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
import { memberPk, SK_METADATA, teamPk } from "../key-constants";
import { MembersRepository } from "./members-repository";

const TABLE = "mv-content-test";
const CUSTOM_TABLE = "mv-content-branch";
const MEMBER_ID = "660e8400-e29b-41d4-a716-446655440001";
const TEAM_ID = "550e8400-e29b-41d4-a716-446655440000";
const ISO = "2024-06-15T10:30:00.000Z";

const storedMemberItem = {
  pk: memberPk(MEMBER_ID),
  sk: SK_METADATA,
  _et: "Member",
  gsi1pk: "member",
  gsi1sk: ISO,
  id: MEMBER_ID,
  type: "member",
  name: "Alex Example",
  isTrainer: true,
  privateEmail: "private@example.com",
  proxyEmail: "alias@example.com",
  gsi4pk: "alias@example.com",
  gsi4sk: SK_METADATA,
  gsi5pk: "private@example.com",
  gsi5sk: SK_METADATA,
  createdAt: ISO,
  updatedAt: ISO,
};

describe("MembersRepository", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  beforeEach(() => {
    process.env.CONTENT_TABLE_NAME = TABLE;
    ddbMock.reset();
  });

  afterEach(() => {
    ddbMock.reset();
  });

  it("listTrainers returns only members with isTrainer true", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        storedMemberItem,
        {
          ...storedMemberItem,
          id: "770e8400-e29b-41d4-a716-446655440002",
          name: "Not Trainer",
          isTrainer: false,
          pk: memberPk("770e8400-e29b-41d4-a716-446655440002"),
        },
      ],
    });

    const repo = new MembersRepository(documentClient);
    const { items } = await repo.listTrainers();

    expect(items).toHaveLength(1);
    expect(items[0]?.isTrainer).toBe(true);
  });

  it("getByProxyEmail queries GSI4", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [storedMemberItem] });

    const repo = new MembersRepository(documentClient);
    const member = await repo.getByProxyEmail("alias@example.com");

    expect(member?.id).toBe(MEMBER_ID);

    const [query] = ddbMock.commandCalls(QueryCommand);
    expect(query.args[0].input).toMatchObject({
      TableName: TABLE,
      IndexName: ContentTableIndexes.gsi4,
    });
  });

  it("getByPrivateEmail queries GSI5", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [storedMemberItem] });

    const repo = new MembersRepository(documentClient);
    const member = await repo.getByPrivateEmail("private@example.com");

    expect(member?.id).toBe(MEMBER_ID);

    const [query] = ddbMock.commandCalls(QueryCommand);
    expect(query.args[0].input).toMatchObject({
      TableName: TABLE,
      IndexName: ContentTableIndexes.gsi5,
    });
  });

  it("create omits gsi4/gsi5 keys when emails are absent", async () => {
    ddbMock.on(PutCommand).resolves({});

    const repo = new MembersRepository(documentClient);
    await repo.create({
      type: "member",
      name: "No Email Member",
    });

    const [put] = ddbMock.commandCalls(PutCommand);
    const item = put.args[0].input.Item ?? {};
    expect(item).not.toHaveProperty("gsi4pk");
    expect(item).not.toHaveProperty("gsi5pk");
  });

  it("create trims email fields and sets gsi keys", async () => {
    ddbMock.on(PutCommand).resolves({});

    const repo = new MembersRepository(documentClient);
    await repo.create({
      type: "member",
      name: "Email Member",
      privateEmail: "  private@example.com  ",
      proxyEmail: "  alias@example.com  ",
    });

    const [put] = ddbMock.commandCalls(PutCommand);
    const item = put.args[0].input.Item ?? {};
    expect(item.gsi4pk).toBe("alias@example.com");
    expect(item.gsi5pk).toBe("private@example.com");
    expect(item.privateEmail).toBe("private@example.com");
    expect(item.proxyEmail).toBe("alias@example.com");
  });

  it("update removes nullable fields and email index keys", async () => {
    ddbMock
      .on(GetCommand)
      .resolvesOnce({ Item: storedMemberItem })
      .resolvesOnce({
        Item: {
          ...storedMemberItem,
          proxyEmail: undefined,
          gsi4pk: undefined,
          gsi4sk: undefined,
        },
      });
    ddbMock.on(UpdateCommand).resolves({});

    const repo = new MembersRepository(documentClient);
    await repo.update(MEMBER_ID, { proxyEmail: null });

    const [update] = ddbMock.commandCalls(UpdateCommand);
    const input = update.args[0].input;
    expect(input.UpdateExpression).toContain("REMOVE");
    expect(Object.values(input.ExpressionAttributeNames ?? {})).toContain("proxyEmail");
    expect(Object.values(input.ExpressionAttributeNames ?? {})).toContain("gsi4pk");
  });

  it("delete removes member by primary key", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    ddbMock.on(DeleteCommand).resolves({});

    const repo = new MembersRepository(documentClient);
    const result = await repo.delete(MEMBER_ID);

    expect(result).toEqual({ success: true });

    const [del] = ddbMock.commandCalls(DeleteCommand);
    expect(del.args[0].input).toMatchObject({
      TableName: TABLE,
      Key: { pk: memberPk(MEMBER_ID), sk: SK_METADATA },
    });
  });

  it("delete cleans trainer references using the injected table name", async () => {
    process.env.CONTENT_TABLE_NAME = "mv-content-default";

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
      trainerIds: [MEMBER_ID],
      createdAt: ISO,
      updatedAt: ISO,
    };

    ddbMock.on(QueryCommand).resolves({ Items: [storedTeamItem] });
    ddbMock
      .on(GetCommand)
      .resolvesOnce({ Item: storedTeamItem })
      .resolvesOnce({
        Item: {
          ...storedTeamItem,
          trainerIds: [],
        },
      });
    ddbMock.on(UpdateCommand).resolves({});
    ddbMock.on(DeleteCommand).resolves({});

    const repo = new MembersRepository(documentClient, CUSTOM_TABLE);
    const result = await repo.delete(MEMBER_ID);

    expect(result).toEqual({ success: true });

    const teamListQuery = ddbMock.commandCalls(QueryCommand)[0];
    expect(teamListQuery?.args[0].input.TableName).toBe(CUSTOM_TABLE);

    const teamUpdate = ddbMock.commandCalls(UpdateCommand)[0];
    expect(teamUpdate?.args[0].input.TableName).toBe(CUSTOM_TABLE);

    const memberDelete = ddbMock.commandCalls(DeleteCommand)[0];
    expect(memberDelete?.args[0].input).toMatchObject({
      TableName: CUSTOM_TABLE,
      Key: { pk: memberPk(MEMBER_ID), sk: SK_METADATA },
    });
  });
});
