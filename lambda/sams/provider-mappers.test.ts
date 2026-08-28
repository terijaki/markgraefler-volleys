import { describe, expect, it } from "vite-plus/test";
import { LeagueMatchesResponseSchema } from "./types";
import { buildTestSamsProviderFixtures } from "@/fixtures/sams-provider-events";
import { SamsEventType } from "sams-provider-events";
import { mapProviderMatchToProjection } from "./provider-mappers";
import { samsClubScheduleProjectionSchema } from "@/lib/db/schemas";

describe("mapProviderMatchToProjection", () => {
  it("stores host as home team uuid for API-shaped responses", () => {
    const fixtures = buildTestSamsProviderFixtures();
    const schedule = fixtures.find(
      (fixture) => fixture.type === SamsEventType.clubMatchScheduleUpdated,
    );
    expect(schedule).toBeDefined();

    const mapped = (schedule!.payload.matches as Array<Record<string, unknown>>).map((match) =>
      mapProviderMatchToProjection(match as Parameters<typeof mapProviderMatchToProjection>[0]),
    );

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

    const mapped = (schedule!.payload.matches as Array<Record<string, unknown>>).map((match) =>
      mapProviderMatchToProjection(match as Parameters<typeof mapProviderMatchToProjection>[0]),
    );

    const parsed = samsClubScheduleProjectionSchema.parse({
      sportsclubUuid: (schedule!.payload.club as { uuid: string }).uuid,
      seasonUuid: (schedule!.payload.season as { uuid: string }).uuid,
      seasonName: (schedule!.payload.season as { name: string }).name,
      matches: mapped,
      snapshotVersion: schedule!.snapshotVersion,
      projectedAt: schedule!.payload.projectedAt,
      cachedAt: schedule!.payload.cachedAt,
      updatedAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + 86400,
    });
    expect(parsed.matches.length).toBeGreaterThan(0);
  });
});
