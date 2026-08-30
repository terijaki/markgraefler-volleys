import { describe, expect, it } from "vite-plus/test";
import { SamsEventType } from "sams-provider-events";
import {
  buildSamsProviderSeedFixtures,
  resolveMvTeamCount,
  TEST_VARIATION_SEED,
} from "./build-seed-fixtures";
import { SEED_MV_TEAMS } from "./ids";

describe("buildSamsProviderSeedFixtures", () => {
  it("uses stable entity ids across variation seeds", () => {
    const first = buildSamsProviderSeedFixtures({
      variationSeed: "branch-a:1",
      now: new Date("2026-08-27T12:00:00.000Z"),
    });
    const second = buildSamsProviderSeedFixtures({
      variationSeed: "branch-b:99",
      now: new Date("2026-09-01T12:00:00.000Z"),
    });

    const firstSchedule = first.find(
      (fixture) => fixture.type === SamsEventType.clubMatchScheduleUpdated,
    );
    const secondSchedule = second.find(
      (fixture) => fixture.type === SamsEventType.clubMatchScheduleUpdated,
    );
    expect(firstSchedule).toBeDefined();
    expect(secondSchedule).toBeDefined();

    const firstUuids = (firstSchedule!.payload.matches as Array<{ uuid: string }>).map(
      (match) => match.uuid,
    );
    const secondUuids = (secondSchedule!.payload.matches as Array<{ uuid: string }>).map(
      (match) => match.uuid,
    );
    expect(firstUuids).toEqual(secondUuids);
  });

  it("varies active team count between 1 and 3 while keeping minimum of one", () => {
    const counts = new Set<number>();
    for (let index = 0; index < 24; index++) {
      counts.add(resolveMvTeamCount(`variation-${index}`));
    }
    expect(Math.min(...counts)).toBe(1);
    expect(Math.max(...counts)).toBe(3);
  });

  it("includes past and future matches relative to seed time", () => {
    const fixtures = buildSamsProviderSeedFixtures({
      variationSeed: TEST_VARIATION_SEED,
      now: new Date("2026-08-27T12:00:00.000Z"),
      opponentsPerLeague: 6,
    });
    const schedule = fixtures.find(
      (fixture) => fixture.type === SamsEventType.clubMatchScheduleUpdated,
    );
    expect(schedule).toBeDefined();

    const matches = schedule!.payload.matches as Array<{
      date?: string;
      hasResult?: boolean;
    }>;
    const pastWithResults = matches.filter((match) => match.hasResult);
    const futureWithoutResults = matches.filter((match) => !match.hasResult);

    expect(pastWithResults.length).toBeGreaterThanOrEqual(4);
    expect(futureWithoutResults.length).toBeGreaterThanOrEqual(3);
    expect(pastWithResults.every((match) => match.date && match.date < "2026-08-27")).toBe(true);
    expect(futureWithoutResults.every((match) => match.date && match.date > "2026-08-27")).toBe(
      true,
    );
  });

  it("seeds league rankings with picsum logo urls", () => {
    const fixtures = buildSamsProviderSeedFixtures({
      variationSeed: TEST_VARIATION_SEED,
      now: new Date("2026-08-27T12:00:00.000Z"),
      opponentsPerLeague: 7,
    });
    const rankings = fixtures.filter(
      (fixture) => fixture.type === SamsEventType.leagueRankingUpdated,
    );
    expect(rankings.length).toBe(resolveMvTeamCount(TEST_VARIATION_SEED));

    const firstRanking = rankings[0];
    const entries = firstRanking.payload.entries as Array<{ logoUrl: string }>;
    expect(entries.length).toBe(8);
    expect(entries.every((entry) => entry.logoUrl.startsWith("https://picsum.photos/seed/"))).toBe(
      true,
    );
  });

  it("varies opponent teams and stats between leagues", () => {
    const fixtures = buildSamsProviderSeedFixtures({
      variationSeed: TEST_VARIATION_SEED,
      now: new Date("2026-08-27T12:00:00.000Z"),
      opponentsPerLeague: 7,
    });
    const rankings = fixtures.filter(
      (fixture) => fixture.type === SamsEventType.leagueRankingUpdated,
    );
    expect(rankings.length).toBeGreaterThanOrEqual(2);

    const firstEntries = rankings[0].payload.entries as Array<{
      teamName: string;
      points: number;
    }>;
    const secondEntries = rankings[1].payload.entries as Array<{
      teamName: string;
      points: number;
    }>;

    const firstOpponents = firstEntries
      .slice(1, 4)
      .map((entry) => entry.teamName)
      .join(",");
    const secondOpponents = secondEntries
      .slice(1, 4)
      .map((entry) => entry.teamName)
      .join(",");
    expect(firstOpponents).not.toBe(secondOpponents);
    expect(firstEntries[0]?.points).not.toBe(secondEntries[0]?.points);
  });

  it("changes snapshot versions on reseed while keeping team ids stable", () => {
    const first = buildSamsProviderSeedFixtures({
      variationSeed: "branch:1",
      now: new Date("2026-08-27T12:00:00.000Z"),
    });
    const second = buildSamsProviderSeedFixtures({
      variationSeed: "branch:2",
      now: new Date("2026-08-27T12:00:00.000Z"),
    });

    const firstTeams = first.find(
      (fixture) => fixture.type === SamsEventType.clubSeasonTeamsUpdated,
    );
    const secondTeams = second.find(
      (fixture) => fixture.type === SamsEventType.clubSeasonTeamsUpdated,
    );
    expect(firstTeams!.snapshotVersion).not.toBe(secondTeams!.snapshotVersion);

    const firstTeamUuids = (firstTeams!.payload.teams as Array<{ uuid: string }>).map(
      (team) => team.uuid,
    );
    const secondTeamUuids = (secondTeams!.payload.teams as Array<{ uuid: string }>).map(
      (team) => team.uuid,
    );
    expect(firstTeamUuids.slice(0, 1)).toEqual([SEED_MV_TEAMS[0].uuid]);
    expect(secondTeamUuids[0]).toBe(SEED_MV_TEAMS[0].uuid);
  });
});
