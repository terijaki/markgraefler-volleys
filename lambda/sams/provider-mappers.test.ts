import { describe, expect, it } from "vite-plus/test";
import { LeagueMatchesResponseSchema } from "./types";
import {
  buildMockSamsProviderSqsBody,
  buildTestSamsProviderFixtures,
} from "@/fixtures/sams-provider-events";
import { parseSamsEventFromSqsBody, SamsEventType } from "sams-provider-events";
import { mapProviderMatchToProjection, mapProviderRankingEntry } from "./provider-mappers";
import {
  samsClubScheduleProjectionSchema,
  samsProjectionMatchSchema,
  samsProjectionRankingEntrySchema,
} from "@/lib/db/schemas";

describe("mapProviderMatchToProjection", () => {
  it("stores host as home team uuid for API-shaped responses", () => {
    const fixtures = buildTestSamsProviderFixtures();
    const schedule = fixtures.find(
      (fixture) => fixture.type === SamsEventType.clubMatchScheduleUpdated,
    );
    expect(schedule).toBeDefined();

    const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(schedule!));
    expect(event.type).toBe(SamsEventType.clubMatchScheduleUpdated);
    if (event.type !== SamsEventType.clubMatchScheduleUpdated) return;

    const mapped = event.payload.matches.map(mapProviderMatchToProjection);

    expect(mapped.every((match) => typeof match.host === "string")).toBe(true);

    const parsed = LeagueMatchesResponseSchema.parse({
      matches: mapped,
      timestamp: new Date().toISOString(),
    });
    expect(parsed.matches.length).toBeGreaterThan(0);
  });

  it("maps fixtures into a valid schedule projection for DynamoDB", () => {
    const fixtures = buildTestSamsProviderFixtures();
    const schedule = fixtures.find(
      (fixture) => fixture.type === SamsEventType.clubMatchScheduleUpdated,
    );
    expect(schedule).toBeDefined();

    const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(schedule!));
    expect(event.type).toBe(SamsEventType.clubMatchScheduleUpdated);
    if (event.type !== SamsEventType.clubMatchScheduleUpdated) return;

    const mapped = event.payload.matches.map(mapProviderMatchToProjection);

    const parsed = samsClubScheduleProjectionSchema.parse({
      sportsclubUuid: event.payload.club.uuid,
      seasonUuid: event.payload.season.uuid,
      seasonName: event.payload.season.name,
      matches: mapped,
      snapshotVersion: event.snapshotVersion,
      projectedAt: event.payload.projectedAt,
      cachedAt: event.payload.cachedAt,
      updatedAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + 86400,
    });
    expect(parsed.matches.length).toBeGreaterThan(0);
  });

  it("parses boolean host true/false into the home team uuid", () => {
    const team1 = { uuid: "team-home", name: "Home", sportsclubUuid: "club-a" };
    const team2 = { uuid: "team-guest", name: "Guest", sportsclubUuid: "club-b" };

    const homeHost = samsProjectionMatchSchema.parse({
      uuid: "match-home",
      host: true,
      _embedded: { team1, team2 },
    });
    expect(homeHost.host).toBe("team-home");

    const guestHost = samsProjectionMatchSchema.parse({
      uuid: "match-guest",
      host: false,
      _embedded: { team1, team2 },
    });
    expect(guestHost.host).toBe("team-guest");
  });
});

describe("mapProviderRankingEntry", () => {
  it("preserves sportsclubUuid and logoUrl from provider ranking entries", () => {
    const fixtures = buildTestSamsProviderFixtures();
    const ranking = fixtures.find((fixture) => fixture.type === SamsEventType.leagueRankingUpdated);
    expect(ranking).toBeDefined();

    const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(ranking!));
    expect(event.type).toBe(SamsEventType.leagueRankingUpdated);
    if (event.type !== SamsEventType.leagueRankingUpdated) return;

    const entry = event.payload.entries[0];
    expect(entry).toBeDefined();
    const mapped = mapProviderRankingEntry(entry!);

    const parsed = samsProjectionRankingEntrySchema.parse(mapped);
    expect(parsed.sportsclubUuid).toBe(entry!.sportsclubUuid);
    expect(parsed.logoUrl).toBe(entry!.logoUrl ?? undefined);
  });
});
