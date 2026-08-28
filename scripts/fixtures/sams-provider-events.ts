/**
 * Mock SAMS provider event fixtures for dev seeding and processor unit tests.
 * Shapes align with sams-provider-events contract fixtures.
 */

import { SamsEventType } from "sams-provider-events";

const occurredAt = "2026-08-27T12:00:00.000Z";
const snapshotBase = "a1b2c3d4e5f67890";

const sampleClub = {
  uuid: "club-1",
  name: "Markgräfler Volleys",
  slug: "markgraefler-volleys",
  associationUuid: "assoc-1",
  associationName: "Südbadischer Volleyball-Verband",
  logoUrl: "https://cdn.example/sams-logos/club-1.png",
};

const sampleSeason = { uuid: "season-1", name: "2026/27", current: true };

const sampleTeam = {
  uuid: "team-1",
  name: "Markgräfler Volleys 1",
  slug: "markgraefler-volleys-1",
  leagueUuid: "league-1",
  leagueName: "Landesliga",
  leagueHierarchyLevel: 3,
};

const sampleTeamWithClub = {
  ...sampleTeam,
  sportsclubUuid: sampleClub.uuid,
};

export const samsProviderEventFixtures = [
  {
    type: SamsEventType.clubUpdated,
    payload: sampleClub,
    snapshotVersion: `${snapshotBase}01`,
  },
  {
    type: SamsEventType.clubSeasonTeamsUpdated,
    payload: {
      club: sampleClub,
      season: sampleSeason,
      teams: [sampleTeam],
      projectedAt: occurredAt,
    },
    snapshotVersion: `${snapshotBase}02`,
  },
  {
    type: SamsEventType.clubSeasonRostersUpdated,
    payload: {
      club: sampleClub,
      season: sampleSeason,
      rosters: [
        {
          team: sampleTeamWithClub,
          players: [
            {
              uuid: "player-1",
              name: "Jane Player",
              jerseyNumber: 7,
              position: "OH",
              portraitUrl: "https://sams.example/portraits/player-1.jpg",
            },
          ],
          officials: [{ uuid: "official-1", name: "Coach Example", role: "Coach" }],
        },
      ],
      projectedAt: occurredAt,
      cachedAt: occurredAt,
      isStale: false,
    },
    snapshotVersion: `${snapshotBase}03`,
  },
  {
    type: SamsEventType.clubMatchScheduleUpdated,
    payload: {
      club: sampleClub,
      season: sampleSeason,
      matches: [
        {
          uuid: "match-1",
          date: "2026-09-10",
          time: "18:00",
          leagueUuid: "league-1",
          seasonUuid: "season-1",
          team1: {
            uuid: "team-1",
            name: "Markgräfler Volleys 1",
            sportsclubUuid: sampleClub.uuid,
          },
          team2: {
            uuid: "team-2",
            name: "Opponent Club 1",
            sportsclubUuid: "club-2",
          },
          hasResult: false,
        },
      ],
      projectedAt: occurredAt,
      cachedAt: occurredAt,
      isStale: false,
    },
    snapshotVersion: `${snapshotBase}04`,
  },
  {
    type: SamsEventType.leagueRankingUpdated,
    payload: {
      leagueUuid: "league-1",
      seasonUuid: "season-1",
      cachedAt: occurredAt,
      refreshState: "active",
      nextRefreshAfter: null,
      isStale: false,
      sourceMatchBlockId: "block-1",
      entries: [
        {
          rank: 1,
          teamUuid: "team-1",
          teamName: "Markgräfler Volleys 1",
          sportsclubUuid: sampleClub.uuid,
          logoUrl: sampleClub.logoUrl,
          points: 12,
          wins: 4,
          setWins: 12,
          setLosses: 4,
          matchesPlayed: 4,
        },
      ],
    },
    snapshotVersion: `${snapshotBase}05`,
  },
  {
    type: SamsEventType.teamsSyncCompleted,
    payload: {
      seasonUuid: "season-1",
      seasonName: "2026/27",
      teamsCount: 1,
      countsBySportsclubUuid: { [sampleClub.uuid]: 1 },
      changedTeamUuids: ["team-1"],
    },
    snapshotVersion: `${snapshotBase}06`,
  },
] as const;

export function buildMockSamsProviderSqsBody(
  fixture: (typeof samsProviderEventFixtures)[number],
  eventId = "550e8400-e29b-41d4-a716-446655440000",
): string {
  return JSON.stringify({
    detail: {
      schemaVersion: "1.0.0",
      eventId,
      occurredAt,
      source: "sams-provider",
      type: fixture.type,
      sourceSyncId: "seed-mock-events",
      snapshotVersion: fixture.snapshotVersion,
      payload: fixture.payload,
    },
  });
}
