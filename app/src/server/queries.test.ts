import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { beforeAll, beforeEach, describe, expect, it } from "vite-plus/test";

const ddbMock = mockClient(DynamoDBDocumentClient);

let getAllSamsClubs: typeof import("./queries").getAllSamsClubs;
let getSamsClubBySportsclubUuid: typeof import("./queries").getSamsClubBySportsclubUuid;
let getSamsClubByNameSlug: typeof import("./queries").getSamsClubByNameSlug;
let getAllSamsTeams: typeof import("./queries").getAllSamsTeams;
let getSamsTeamByUuid: typeof import("./queries").getSamsTeamByUuid;

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
  });

  beforeEach(() => {
    ddbMock.reset();
  });

  describe("getAllSamsClubs", () => {
    it("queries the SAMS table by type via ElectroDB", async () => {
      const mockClubs = [
        {
          sportsclubUuid: "c1",
          type: "club",
          name: "Markgräfler Volleys",
          nameSlug: "markgraefler-volleys",
          updatedAt: "2024-01-01T00:00:00Z",
          ttl: 123,
          __edb_e__: "samsclub",
          __edb_v__: "1",
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
    it("gets club by primary key sportsclubUuid via ElectroDB", async () => {
      const mockClub = {
        sportsclubUuid: "c1",
        type: "club",
        name: "Markgräfler Volleys",
        nameSlug: "markgraefler-volleys",
        updatedAt: "2024-01-01T00:00:00Z",
        ttl: 123,
        __edb_e__: "samsclub",
        __edb_v__: "1",
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
    it("queries GSI1-BySamsType with begins_with slug match via ElectroDB", async () => {
      const mockClub = {
        sportsclubUuid: "c1",
        type: "club",
        name: "Markgräfler Volleys",
        nameSlug: "markgraefler-volleys",
        updatedAt: "2024-01-01T00:00:00Z",
        ttl: 123,
        __edb_e__: "samsclub",
        __edb_v__: "1",
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
    it("queries the SAMS table by type via ElectroDB", async () => {
      const mockTeams = [
        {
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
          updatedAt: "2024-01-01T00:00:00Z",
          ttl: 123,
          __edb_e__: "samsteam",
          __edb_v__: "1",
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
    it("gets team by uuid primary key via ElectroDB", async () => {
      const mockTeam = {
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
        updatedAt: "2024-01-01T00:00:00Z",
        ttl: 123,
        __edb_e__: "samsteam",
        __edb_v__: "1",
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
});
