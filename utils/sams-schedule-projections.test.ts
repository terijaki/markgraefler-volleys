import { describe, expect, it } from "vite-plus/test";
import { groupProjectionMatchesByTeamUuid } from "./sams-schedule-projections";

describe("groupProjectionMatchesByTeamUuid", () => {
  it("groups matches by both participating team UUIDs", () => {
    const match = {
      uuid: "match-1",
      host: "team-a",
      _embedded: {
        team1: { uuid: "team-a", name: "A", sportsclubUuid: "club-a" },
        team2: { uuid: "team-b", name: "B", sportsclubUuid: "club-b" },
      },
    };

    const grouped = groupProjectionMatchesByTeamUuid([match]);

    expect(grouped.get("team-a")).toEqual([match]);
    expect(grouped.get("team-b")).toEqual([match]);
  });
});
