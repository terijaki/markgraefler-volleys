import { describe, expect, it } from "vite-plus/test";
import {
  dedupeSamsMatchesByUuid,
  getOwnedSamsSportsclubUuids,
  getOwnedSamsTeamUuids,
  pickSyncedSeasonUuid,
  resolveConfiguredSamsSportsclubUuids,
  shouldResolveDefaultSamsSportsclubs,
} from "./sams";

describe("resolveConfiguredSamsSportsclubUuids", () => {
  it("returns the configured club UUIDs in a stable order", () => {
    const result = resolveConfiguredSamsSportsclubUuids([
      { nameSlug: "markgraefler-volleys", sportsclubUuid: "club-b" },
      { nameSlug: "markgraefler-volleys", sportsclubUuid: "club-a" },
      { nameSlug: "other-club", sportsclubUuid: "club-c" },
      { nameSlug: "markgraefler-volleys", sportsclubUuid: "club-a" },
    ]);

    expect(result).toEqual(["club-a", "club-b"]);
  });
});

describe("shouldResolveDefaultSamsSportsclubs", () => {
  it("uses configured defaults unless an explicit sportsclub filter is set", () => {
    expect(shouldResolveDefaultSamsSportsclubs({})).toBe(true);
    expect(shouldResolveDefaultSamsSportsclubs({ team: "team-a" })).toBe(true);
    expect(shouldResolveDefaultSamsSportsclubs({ league: "league-a" })).toBe(true);
    expect(shouldResolveDefaultSamsSportsclubs({ sportsclub: "club-a" })).toBe(false);
  });
});

describe("owned SAMS UUID helpers", () => {
  it("derives team and sportsclub ownership sets from UUIDs", () => {
    const teams = [
      { uuid: "team-1", sportsclubUuid: "club-a" },
      { uuid: "team-2", sportsclubUuid: "club-b" },
      { uuid: "team-3", sportsclubUuid: "club-a" },
    ];

    expect([...getOwnedSamsTeamUuids(teams)]).toEqual(["team-1", "team-2", "team-3"]);
    expect([...getOwnedSamsSportsclubUuids(teams)]).toEqual(["club-a", "club-b"]);
  });
});

describe("dedupeSamsMatchesByUuid", () => {
  it("keeps the first occurrence of each UUID and preserves UUID-less entries", () => {
    const result = dedupeSamsMatchesByUuid([
      { uuid: "match-1", label: "first" },
      { uuid: "match-1", label: "duplicate" },
      { uuid: undefined, label: "no-uuid-a" },
      { uuid: undefined, label: "no-uuid-b" },
      { uuid: "match-2", label: "second" },
    ]);

    expect(result).toEqual([
      { uuid: "match-1", label: "first" },
      { uuid: undefined, label: "no-uuid-a" },
      { uuid: undefined, label: "no-uuid-b" },
      { uuid: "match-2", label: "second" },
    ]);
  });
});

describe("pickSyncedSeasonUuid", () => {
  it("prefers the season with the most teams for configured clubs", () => {
    const seasonUuid = pickSyncedSeasonUuid(
      [
        { sportsclubUuid: "club-mv", seasonUuid: "season-legacy" },
        { sportsclubUuid: "club-mv", seasonUuid: "season-current" },
        { sportsclubUuid: "club-mv", seasonUuid: "season-current" },
        { sportsclubUuid: "club-mv", seasonUuid: "season-current" },
      ],
      ["club-mv"],
    );

    expect(seasonUuid).toBe("season-current");
  });
});
