import { beforeAll, beforeEach, describe, expect, it } from "vite-plus/test";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import {
  BEHOLD_FEED_PK,
  BEHOLD_FEED_SK,
  readBeholdFeed,
  writeBeholdFeed,
} from "./social-feed-store";

const ddbMock = mockClient(DynamoDBDocumentClient);
const TABLE_NAME = "test-social-table";

type TestPost = { id: string; caption: string };

const SAMPLE_POSTS: TestPost[] = [
  { id: "post-1", caption: "Hello" },
  { id: "post-2", caption: "World" },
];

beforeAll(() => {
  ddbMock.onAnyCommand().resolves({});
});

beforeEach(() => {
  ddbMock.reset();
});

describe("readBeholdFeed", () => {
  it("returns null on a cache miss", async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await readBeholdFeed<TestPost>(
      ddbMock as unknown as DynamoDBDocumentClient,
      TABLE_NAME,
    );

    expect(result).toBeNull();
    expect(ddbMock.commandCalls(GetCommand)[0]?.args[0].input).toEqual({
      TableName: TABLE_NAME,
      Key: { pk: BEHOLD_FEED_PK, sk: BEHOLD_FEED_SK },
    });
  });

  it("returns deserialized posts when entry exists", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        pk: BEHOLD_FEED_PK,
        sk: BEHOLD_FEED_SK,
        data: JSON.stringify(SAMPLE_POSTS),
        cachedAt: new Date().toISOString(),
      },
    });

    const result = await readBeholdFeed<TestPost>(
      ddbMock as unknown as DynamoDBDocumentClient,
      TABLE_NAME,
    );

    expect(result).toEqual(SAMPLE_POSTS);
  });

  it("returns null when data is corrupt JSON", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        pk: BEHOLD_FEED_PK,
        sk: BEHOLD_FEED_SK,
        data: "not-json",
        cachedAt: new Date().toISOString(),
      },
    });

    const result = await readBeholdFeed<TestPost>(
      ddbMock as unknown as DynamoDBDocumentClient,
      TABLE_NAME,
    );

    expect(result).toBeNull();
  });
});

describe("writeBeholdFeed", () => {
  it("writes posts with the social key scheme and a 3-month TTL", async () => {
    ddbMock.on(PutCommand).resolves({});

    const fixedNow = new Date("2026-01-01T12:00:00.000Z").getTime();
    await writeBeholdFeed(
      ddbMock as unknown as DynamoDBDocumentClient,
      TABLE_NAME,
      SAMPLE_POSTS,
      () => fixedNow,
    );

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);

    const item = putCalls[0]?.args[0].input.Item as Record<string, unknown>;
    expect(item.pk).toBe(BEHOLD_FEED_PK);
    expect(item.sk).toBe(BEHOLD_FEED_SK);
    expect(item.cachedAt).toBe("2026-01-01T12:00:00.000Z");
    expect(JSON.parse(item.data as string)).toEqual(SAMPLE_POSTS);

    const expectedTtl = Math.floor(fixedNow / 1000) + 90 * 24 * 60 * 60;
    expect(item.ttl).toBe(expectedTtl);
  });
});
