import { describe, expect, it } from "vite-plus/test";
import { LeagueMatchesResponseSchema } from "./types";
import { buildTestSamsProviderFixtures } from "@/fixtures/sams-provider-events";
import { SamsEventType } from "sams-provider-events";
import { mapProviderMatchToProjection } from "./provider-mappers";

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
});
