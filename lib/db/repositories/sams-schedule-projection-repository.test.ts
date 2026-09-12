import { describe, expect, it, beforeEach } from "vite-plus/test";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SamsScheduleProjectionRepository } from "./sams-schedule-projection-repository";

const ddbMock = mockClient(DynamoDBDocumentClient);

const TABLE = "sams-test-table";

describe("SamsScheduleProjectionRepository team schedules", () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it("reads matches by team UUID from team schedule projection", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        pk: "schedule#team#team-a",
        sk: "season#season-1",
        teamUuid: "team-a",
        seasonUuid: "season-1",
        type: "teamSchedule",
        matches: [
          {
            uuid: "match-1",
            host: "team-a",
            _embedded: {
              team1: { uuid: "team-a", name: "A", sportsclubUuid: "club-a" },
              team2: { uuid: "team-b", name: "B", sportsclubUuid: "club-b" },
            },
          },
        ],
        snapshotVersion: "snap-1",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ttl: 1_700_000_000,
      },
    });

    const repo = new SamsScheduleProjectionRepository(
      ddbMock as unknown as DynamoDBDocumentClient,
      TABLE,
    );
    const matches = await repo.listMatchesForTeam("team-a", "season-1");

    expect(matches).toHaveLength(1);
    expect(matches[0]?.uuid).toBe("match-1");
  });

  it("materializes team schedule projections from a club schedule", async () => {
    ddbMock.on(PutCommand).resolves({});

    const repo = new SamsScheduleProjectionRepository(
      ddbMock as unknown as DynamoDBDocumentClient,
      TABLE,
    );

    await repo.syncTeamSchedulesFromClubSchedule(
      {
        sportsclubUuid: "club-a",
        seasonUuid: "season-1",
        seasonName: "2025/26",
        type: "schedule",
        matches: [
          {
            uuid: "match-1",
            host: "team-a",
            _embedded: {
              team1: { uuid: "team-a", name: "A", sportsclubUuid: "club-a" },
              team2: { uuid: "team-b", name: "B", sportsclubUuid: "club-b" },
            },
          },
        ],
        snapshotVersion: "snap-1",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ttl: 1_700_000_000,
      },
      { snapshotVersion: "snap-1" },
    );

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(2);
    expect(putCalls.map((call) => call.args[0].input.Item?.teamUuid)).toEqual(
      expect.arrayContaining(["team-a", "team-b"]),
    );
  });
});
