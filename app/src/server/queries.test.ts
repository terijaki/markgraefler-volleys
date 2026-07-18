import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { beforeAll, beforeEach, describe, expect, it } from "vite-plus/test";

const ddbMock = mockClient(DynamoDBDocumentClient);

let getAllSamsClubs: typeof import("./queries").getAllSamsClubs;
let getSamsClubBySportsclubUuid: typeof import("./queries").getSamsClubBySportsclubUuid;
let getSamsClubByNameSlug: typeof import("./queries").getSamsClubByNameSlug;
let getAllSamsTeams: typeof import("./queries").getAllSamsTeams;
let getSamsTeamByUuid: typeof import("./queries").getSamsTeamByUuid;
let getSamsRosterByTeamUuid: typeof import("./queries").getSamsRosterByTeamUuid;

describe("server/queries", () => {
  beforeAll(async () => {
    process.env.CONTENT_TABLE_NAME = "test-content-table";
    process.env.SAMS_TABLE_NAME = "test-sams-table";

    const q = await import("./queries");
    getAllSamsClubs = q.getAllSamsClubs;
    getSamsClubBySportsclubUuid = q.getSamsClubBySportsclubUuid;
    getSamsClubByNameSlug = q.getSamsClubByNameSlug;
    getAllSamsTeams = q.getAllSamsTeams;
    getSamsTeamByUuid = q.getSamsTeamByUuid;
    getSamsRosterByTeamUuid = q.getSamsRosterByTeamUuid;
  });

  beforeEach(() => {
    ddbMock.reset();
  });

  describe("getAllSamsClubs", () => {
    it("queries the SAMS table by type via repository", async () => {
      const mockClubs = [
        {
          pk: "club#c1",
          sk: "METADATA",
          _et: "SamsClub",
          gsi1pk: "club",
          gsi1sk: "markgraefler-volleys",
          sportsclubUuid: "c1",
          type: "club",
          name: "Markgräfler Volleys",
          nameSlug: "markgraefler-volleys",
          updatedAt: "2024-01-01T00:00:00.000Z",
          ttl: 123,
        },
      ];
      ddbMock.on(QueryCommand).resolves({ Items: mockClubs });

      const result = await getAllSamsClubs();

      expect(result.items).toHaveLength(1);
      const calls = ddbMock.commandCalls(QueryCommand);
      expect(calls[0].args[0].input.TableName).toBe("test-sams-table");
    });
  });

  describe("getSamsClubBySportsclubUuid", () => {
    it("gets club by primary key sportsclubUuid via repository", async () => {
      const mockClub = {
        pk: "club#c1",
        sk: "METADATA",
        _et: "SamsClub",
        gsi1pk: "club",
        gsi1sk: "markgraefler-volleys",
        sportsclubUuid: "c1",
        type: "club",
        name: "Markgräfler Volleys",
        nameSlug: "markgraefler-volleys",
        updatedAt: "2024-01-01T00:00:00.000Z",
        ttl: 123,
      };
      ddbMock.on(GetCommand).resolves({ Item: mockClub });

      const result = await getSamsClubBySportsclubUuid("c1");

      expect(result).not.toBeNull();
      expect(result?.sportsclubUuid).toBe("c1");
      expect(result?.name).toBe("Markgräfler Volleys");
      const calls = ddbMock.commandCalls(GetCommand);
      expect(calls[0].args[0].input.TableName).toBe("test-sams-table");
    });

    it("returns null when not found", async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });
      const result = await getSamsClubBySportsclubUuid("missing");
      expect(result).toBeNull();
    });
  });

  describe("getSamsClubByNameSlug", () => {
    it("queries GSI1-BySamsType with begins_with slug match via repository", async () => {
      const mockClub = {
        pk: "club#c1",
        sk: "METADATA",
        _et: "SamsClub",
        gsi1pk: "club",
        gsi1sk: "markgraefler-volleys",
        sportsclubUuid: "c1",
        type: "club",
        name: "Markgräfler Volleys",
        nameSlug: "markgraefler-volleys",
        updatedAt: "2024-01-01T00:00:00.000Z",
        ttl: 123,
      };
      ddbMock.on(QueryCommand).resolves({ Items: [mockClub] });

      const result = await getSamsClubByNameSlug("markgraefler-volleys");

      expect(result).not.toBeNull();
      expect(result?.sportsclubUuid).toBe("c1");
      const calls = ddbMock.commandCalls(QueryCommand);
      expect(calls[0].args[0].input.TableName).toBe("test-sams-table");
    });

    it("returns null when no match", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      const result = await getSamsClubByNameSlug("unknown");
      expect(result).toBeNull();
    });
  });

  describe("getAllSamsTeams", () => {
    it("queries the SAMS table by type via repository", async () => {
      const mockTeams = [
        {
          pk: "team#t1",
          sk: "METADATA",
          _et: "SamsTeam",
          gsi1pk: "team",
          gsi1sk: "damen-1",
          uuid: "t1",
          type: "team",
          name: "Damen 1",
          nameSlug: "damen-1",
          sportsclubUuid: "c1",
          associationUuid: "a1",
          leagueUuid: "l1",
          leagueName: "Liga A",
          seasonUuid: "s1",
          seasonName: "2024",
          updatedAt: "2024-01-01T00:00:00.000Z",
          ttl: 123,
        },
      ];
      ddbMock.on(QueryCommand).resolves({ Items: mockTeams });

      const result = await getAllSamsTeams();

      expect(result.items).toHaveLength(1);
      const calls = ddbMock.commandCalls(QueryCommand);
      expect(calls[0].args[0].input.TableName).toBe("test-sams-table");
    });
  });

  describe("getSamsTeamByUuid", () => {
    it("gets team by uuid primary key via repository", async () => {
      const mockTeam = {
        pk: "team#t1",
        sk: "METADATA",
        _et: "SamsTeam",
        gsi1pk: "team",
        gsi1sk: "damen-1",
        uuid: "t1",
        type: "team",
        name: "Damen 1",
        nameSlug: "damen-1",
        sportsclubUuid: "c1",
        associationUuid: "a1",
        leagueUuid: "l1",
        leagueName: "Liga A",
        seasonUuid: "s1",
        seasonName: "2024",
        updatedAt: "2024-01-01T00:00:00.000Z",
        ttl: 123,
      };
      ddbMock.on(GetCommand).resolves({ Item: mockTeam });

      const result = await getSamsTeamByUuid("t1");

      expect(result).not.toBeNull();
      expect(result?.uuid).toBe("t1");
      expect(result?.name).toBe("Damen 1");
      const calls = ddbMock.commandCalls(GetCommand);
      expect(calls[0].args[0].input.TableName).toBe("test-sams-table");
    });

    it("returns null when not found", async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });
      const result = await getSamsTeamByUuid("missing");
      expect(result).toBeNull();
    });
  });

  describe("getSamsRosterByTeamUuid", () => {
    it("gets roster by teamUuid primary key via repository", async () => {
      const mockRoster = {
        pk: "roster#t1",
        sk: "METADATA",
        _et: "SamsRoster",
        gsi1pk: "roster",
        gsi1sk: "t1",
        teamUuid: "t1",
        type: "roster",
        players: [{ uuid: "p1", name: "Jane Doe", jerseyNumber: 7, position: "Zuspiel" }],
        officials: [{ uuid: "o1", name: "Coach Smith", role: "Trainer" }],
        updatedAt: "2024-01-01T00:00:00.000Z",
        ttl: 123,
      };
      ddbMock.on(GetCommand).resolves({ Item: mockRoster });

      const result = await getSamsRosterByTeamUuid("t1");

      expect(result).not.toBeNull();
      expect(result?.teamUuid).toBe("t1");
      expect(result?.players).toHaveLength(1);
      expect(result?.officials).toHaveLength(1);
      const calls = ddbMock.commandCalls(GetCommand);
      expect(calls[0].args[0].input.TableName).toBe("test-sams-table");
    });

    it("returns null when not found", async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });
      const result = await getSamsRosterByTeamUuid("missing");
      expect(result).toBeNull();
    });
  });
});
