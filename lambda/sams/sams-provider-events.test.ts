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

import { uploadClubLogoToS3 } from "./club-logo-upload";
import { processSamsProviderEvent, processSamsProviderSqsBody } from "./sams-provider-events";

function createMockRepos(): SamsRepositories {
  return {
    clubs: {
      getById: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(undefined),
      queryByNameSlugPrefix: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
      listAll: vi.fn().mockResolvedValue([]),
      getByNameSlug: vi.fn().mockResolvedValue(null),
      upsertMany: vi.fn().mockResolvedValue(undefined),
    },
    teams: {
      listAll: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      getByNameSlug: vi.fn().mockResolvedValue(null),
      queryByNameSlugPrefix: vi.fn().mockResolvedValue([]),
      upsertMany: vi.fn().mockResolvedValue(undefined),
    },
    rosters: {
      upsert: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      getByTeamUuid: vi.fn().mockResolvedValue(null),
    },
    schedules: {
      get: vi.fn().mockResolvedValue(null),
      getSnapshotVersion: vi.fn().mockResolvedValue(undefined),
      replace: vi.fn().mockResolvedValue(undefined),
      replaceClubSchedule: vi.fn().mockResolvedValue(undefined),
      mergeMatchesForClub: vi.fn().mockResolvedValue(undefined),
      listMatchesForSportsclubs: vi.fn().mockResolvedValue([]),
      getForTeam: vi.fn().mockResolvedValue(null),
      listMatchesForTeam: vi.fn().mockResolvedValue([]),
      replaceForTeam: vi.fn().mockResolvedValue(undefined),
      syncTeamSchedulesFromClubSchedule: vi.fn().mockResolvedValue(undefined),
    },
    rankings: {
      get: vi.fn().mockResolvedValue(null),
      replace: vi.fn().mockResolvedValue(undefined),
    },
    ops: {
      upsert: vi.fn().mockResolvedValue(undefined),
    },
  } satisfies SamsRepositories;
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

    vi.mocked(uploadClubLogoToS3).mockImplementation(async (_bucket, sportsclubUuid) => {
      return `sams-logos/${sportsclubUuid}.png`;
    });

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

  it("uploads opponent logos when no club row exists", async () => {
    const fixture = samsProviderEventFixtures.find(
      (entry) => entry.type === SamsEventType.leagueRankingUpdated,
    );
    expect(fixture).toBeDefined();

    vi.mocked(uploadClubLogoToS3).mockResolvedValue("sams-logos/opponent.png");

    const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(fixture!));
    await processSamsProviderEvent(event, repos);

    expect(uploadClubLogoToS3).toHaveBeenCalled();
    const replaceInput = vi.mocked(repos.rankings.replace).mock.calls.at(-1)?.[0];
    expect(
      replaceInput?.teams.some((team) => team.logoUrl?.includes("provider") || team.logoUrl),
    ).toBe(true);
  });

  it("replaces club match schedule projections", async () => {
    const fixture = samsProviderEventFixtures.find(
      (entry) => entry.type === SamsEventType.clubMatchScheduleUpdated,
    );
    expect(fixture).toBeDefined();

    const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(fixture!));
    await processSamsProviderEvent(event, repos);

    expect(repos.schedules.replaceClubSchedule).toHaveBeenCalledOnce();
    const scheduleInput = vi.mocked(repos.schedules.replaceClubSchedule).mock.calls[0]?.[0];
    expect(scheduleInput?.matches.length).toBeGreaterThan(0);
  });

  it("processes full seed fixture stream including schedule", async () => {
    for (const fixture of samsProviderEventFixtures) {
      const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(fixture));
      await processSamsProviderEvent(event, repos);
    }

    expect(repos.schedules.replaceClubSchedule).toHaveBeenCalledOnce();
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

  it("skips club upsert when snapshotVersion is unchanged", async () => {
    const fixture = samsProviderEventFixtures.find(
      (entry) => entry.type === SamsEventType.clubUpdated,
    );
    expect(fixture).toBeDefined();
    const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(fixture!));
    repos.clubs.getById = vi.fn().mockResolvedValue({ snapshotVersion: event.snapshotVersion });

    await processSamsProviderEvent(event, repos);

    expect(repos.clubs.upsert).not.toHaveBeenCalled();
  });

  it("skips club-season teams replace when snapshotVersion is unchanged", async () => {
    const fixture = samsProviderEventFixtures.find(
      (entry) => entry.type === SamsEventType.clubSeasonTeamsUpdated,
    );
    expect(fixture).toBeDefined();
    const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(fixture!));
    expect(event.type).toBe(SamsEventType.clubSeasonTeamsUpdated);
    if (event.type !== SamsEventType.clubSeasonTeamsUpdated) return;

    repos.teams.listAll = vi.fn().mockResolvedValue([
      {
        uuid: "existing-team",
        sportsclubUuid: event.payload.club.uuid,
        seasonUuid: event.payload.season.uuid,
        snapshotVersion: event.snapshotVersion,
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
    ]);

    await processSamsProviderEvent(event, repos);

    expect(repos.teams.upsert).not.toHaveBeenCalled();
    expect(repos.teams.delete).not.toHaveBeenCalled();
  });

  it("skips club schedule replace when snapshotVersion is unchanged", async () => {
    const fixture = samsProviderEventFixtures.find(
      (entry) => entry.type === SamsEventType.clubMatchScheduleUpdated,
    );
    expect(fixture).toBeDefined();
    const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(fixture!));
    repos.schedules.getSnapshotVersion = vi.fn().mockResolvedValue(event.snapshotVersion);

    await processSamsProviderEvent(event, repos);

    expect(repos.schedules.replaceClubSchedule).not.toHaveBeenCalled();
  });

  it("skips ranking replace when snapshotVersion is unchanged", async () => {
    const fixture = samsProviderEventFixtures.find(
      (entry) => entry.type === SamsEventType.leagueRankingUpdated,
    );
    expect(fixture).toBeDefined();
    const event = parseSamsEventFromSqsBody(buildMockSamsProviderSqsBody(fixture!));
    expect(event.type).toBe(SamsEventType.leagueRankingUpdated);
    if (event.type !== SamsEventType.leagueRankingUpdated) return;

    repos.rankings.get = vi.fn().mockResolvedValue({
      snapshotVersion: event.snapshotVersion,
    });

    await processSamsProviderEvent(event, repos);

    expect(repos.rankings.replace).not.toHaveBeenCalled();
  });
});
