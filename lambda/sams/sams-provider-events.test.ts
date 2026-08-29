import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { parseSamsEventFromSqsBody, SamsEventType } from "sams-provider-events";
import type { SamsRepositories } from "@/lib/db/repositories/create-sams-repositories";
import {
  buildMockSamsProviderSqsBody,
  SEED_MV_CLUB,
  SEED_MV_TEAMS,
  SEED_SEASON,
  samsProviderEventFixtures,
} from "@/fixtures/sams-provider-events";

vi.mock("./club-logo-upload", () => ({
  uploadClubLogoToS3: vi.fn().mockResolvedValue(undefined),
}));

import { processSamsProviderEvent, processSamsProviderSqsBody } from "./sams-provider-events";

function createMockRepos(): SamsRepositories {
  return {
    clubs: {
      getById: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(undefined),
      queryByNameSlugPrefix: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    teams: {
      listAll: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    rosters: {
      upsert: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    schedules: {
      get: vi.fn().mockResolvedValue(null),
      getSnapshotVersion: vi.fn().mockResolvedValue(undefined),
      replace: vi.fn().mockResolvedValue(undefined),
      mergeMatchesForClub: vi.fn().mockResolvedValue(undefined),
      listMatchesForSportsclubs: vi.fn().mockResolvedValue([]),
    },
    rankings: {
      get: vi.fn().mockResolvedValue(null),
      replace: vi.fn().mockResolvedValue(undefined),
    },
    ops: {
      upsert: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as SamsRepositories;
}

describe("processSamsProviderSqsBody", () => {
  it("parses EventBridge-wrapped SQS bodies", async () => {
    const repos = createMockRepos();
    const fixture = samsProviderEventFixtures.find(
      (entry) => entry.type === SamsEventType.clubUpdated,
    );
    expect(fixture).toBeDefined();

    await processSamsProviderSqsBody(buildMockSamsProviderSqsBody(fixture!), repos);
    expect(repos.clubs.upsert).toHaveBeenCalledOnce();
  });
});

describe("processSamsProviderEvent", () => {
  let repos: SamsRepositories;

  beforeEach(() => {
    repos = createMockRepos();
  });

  it("upserts club-season teams and removes stale teams", async () => {
    repos.teams.listAll = vi.fn().mockResolvedValue([
      {
        uuid: "stale-team-mv",
        sportsclubUuid: SEED_MV_CLUB.uuid,
        seasonUuid: "season-mv-2026-27",
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
    ]);

    const fixture = samsProviderEventFixtures.find(
      (entry) => entry.type === SamsEventType.clubSeasonTeamsUpdated,
    );
    expect(fixture).toBeDefined();

    const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(fixture!));
    await processSamsProviderEvent(event, repos);

    expect(repos.teams.delete).toHaveBeenCalledWith("stale-team-mv");
    expect(repos.teams.upsert).toHaveBeenCalled();
    const upsertedUuids = vi.mocked(repos.teams.upsert).mock.calls.map((call) => call[0].uuid);
    expect(upsertedUuids).toContain(SEED_MV_TEAMS[0].uuid);
  });

  it("removes stale teams from prior seasons for the same club", async () => {
    repos.teams.listAll = vi.fn().mockResolvedValue([
      {
        uuid: "legacy-team-season-old",
        sportsclubUuid: SEED_MV_CLUB.uuid,
        seasonUuid: "season-legacy",
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
    ]);

    const fixture = samsProviderEventFixtures.find(
      (entry) => entry.type === SamsEventType.clubSeasonTeamsUpdated,
    );
    expect(fixture).toBeDefined();

    const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(fixture!));
    await processSamsProviderEvent(event, repos);

    expect(repos.teams.delete).toHaveBeenCalledWith("legacy-team-season-old");
  });

  it("removes duplicate clubs that share the same slug", async () => {
    repos.clubs.queryByNameSlugPrefix = vi.fn().mockResolvedValue([
      {
        sportsclubUuid: "club-legacy",
        nameSlug: "markgraefler-volleys",
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
    ]);

    const fixture = samsProviderEventFixtures.find(
      (entry) => entry.type === SamsEventType.clubUpdated,
    );
    expect(fixture).toBeDefined();

    const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(fixture!));
    await processSamsProviderEvent(event, repos);

    expect(repos.clubs.delete).toHaveBeenCalledWith("club-legacy");
    expect(repos.clubs.upsert).toHaveBeenCalledOnce();
  });

  it("replaces league ranking projections", async () => {
    const fixture = samsProviderEventFixtures.find(
      (entry) => entry.type === SamsEventType.leagueRankingUpdated,
    );
    expect(fixture).toBeDefined();

    const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(fixture!));
    await processSamsProviderEvent(event, repos);

    expect(repos.rankings.replace).toHaveBeenCalledOnce();
  });

  it("stores league and season labels from the provider ranking event", async () => {
    const fixture = samsProviderEventFixtures.find(
      (entry) => entry.type === SamsEventType.leagueRankingUpdated,
    );
    expect(fixture).toBeDefined();

    const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(fixture!));
    await processSamsProviderEvent(event, repos);

    expect(repos.rankings.replace).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueName: SEED_MV_TEAMS[0].leagueName,
        seasonName: SEED_SEASON.name,
        teams: expect.arrayContaining([
          expect.objectContaining({
            uuid: SEED_MV_TEAMS[0].uuid,
            sportsclubUuid: SEED_MV_CLUB.uuid,
            logoUrl: expect.stringMatching(/^https:\/\//),
          }),
        ]),
      }),
    );
  });

  it("replaces club match schedule projections", async () => {
    const fixture = samsProviderEventFixtures.find(
      (entry) => entry.type === SamsEventType.clubMatchScheduleUpdated,
    );
    expect(fixture).toBeDefined();

    const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(fixture!));
    await processSamsProviderEvent(event, repos);

    expect(repos.schedules.replace).toHaveBeenCalledOnce();
    const scheduleInput = vi.mocked(repos.schedules.replace).mock.calls[0]?.[0];
    expect(scheduleInput?.matches.length).toBeGreaterThan(0);
  });

  it("processes full seed fixture stream including schedule", async () => {
    for (const fixture of samsProviderEventFixtures) {
      const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(fixture));
      await processSamsProviderEvent(event, repos);
    }

    expect(repos.schedules.replace).toHaveBeenCalledOnce();
  });

  it("ignores reserved event types gracefully", async () => {
    await processSamsProviderEvent(
      parseSamsEventFromSqsBody(
        JSON.stringify({
          detail: {
            schemaVersion: "1.0.0",
            eventId: "evt-3",
            occurredAt: "2026-08-27T12:00:00.000Z",
            source: "sams-provider",
            type: SamsEventType.syncFailed,
            sourceSyncId: "sync-3",
            snapshotVersion: "deadbeefdeadbeef",
            payload: { job: "teams-sync", message: "failed" },
          },
        }),
      ),
      repos,
    );

    expect(repos.clubs.upsert).not.toHaveBeenCalled();
    expect(repos.rankings.replace).not.toHaveBeenCalled();
  });
});
