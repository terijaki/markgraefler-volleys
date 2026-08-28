import dayjs from "dayjs";
import { SamsEventType } from "sams-provider-events";
import {
  matchUuid,
  opponentTeamUuid,
  playerUuid,
  SEED_MV_CLUB,
  SEED_MV_TEAMS,
  SEED_OPPONENT_CLUBS,
  SEED_SEASON,
} from "./ids";
import { picsumImageUrl } from "./picsum";

export type SamsProviderFixture = {
  type: string;
  payload: Record<string, unknown>;
  snapshotVersion: string;
};

export type BuildSamsProviderSeedFixturesOptions = {
  /** Drives team-count variation and snapshot versions (e.g. branch + CI run). */
  variationSeed: string;
  /** Anchor for past/future match dates. Defaults to now. */
  now?: Date;
  /** Opponent teams per league ranking table (6–9). */
  opponentsPerLeague?: number;
};

const SNAPSHOT_PREFIX = "seedmv";

/** FNV-1a 32-bit — stable across Node/Bun for fixture variation. */
export function hashVariationSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 1–3 Markgräfler teams depending on variation seed (minimum always 1). */
export function resolveMvTeamCount(variationSeed: string): number {
  return 1 + (hashVariationSeed(variationSeed) % 3);
}

function snapshotVersion(variationSeed: string, index: number): string {
  const hash = hashVariationSeed(`${variationSeed}:${index}`);
  return `${SNAPSHOT_PREFIX}${hash.toString(16).padStart(8, "0")}`;
}

function clampOpponentsPerLeague(value: number | undefined): number {
  if (value == null) return 8;
  return Math.min(9, Math.max(6, value));
}

function clubProjection(club: typeof SEED_MV_CLUB | (typeof SEED_OPPONENT_CLUBS)[number]) {
  return {
    uuid: club.uuid,
    name: club.name,
    slug: club.slug,
    associationUuid: SEED_MV_CLUB.associationUuid,
    associationName: SEED_MV_CLUB.associationName,
    logoUrl: picsumImageUrl(club.picsumSeed, 128, 128),
  };
}

function buildOpponentRankingEntries(
  mvTeam: (typeof SEED_MV_TEAMS)[number],
  mvRank: number,
  opponentsPerLeague: number,
) {
  const totalEntries = opponentsPerLeague + 1;
  const entries: Array<{
    rank: number;
    teamUuid: string;
    teamName: string;
    sportsclubUuid: string;
    logoUrl: string;
    points: number;
    wins: number;
    setWins: number;
    setLosses: number;
    matchesPlayed: number;
  }> = [];

  let opponentIndex = 0;
  for (let rank = 1; rank <= totalEntries; rank++) {
    if (rank === mvRank) {
      entries.push({
        rank,
        teamUuid: mvTeam.uuid,
        teamName: mvTeam.name,
        sportsclubUuid: SEED_MV_CLUB.uuid,
        logoUrl: picsumImageUrl(SEED_MV_CLUB.picsumSeed, 128, 128),
        points: 18 - rank,
        wins: 6 - rank,
        setWins: 18,
        setLosses: 6 + rank,
        matchesPlayed: 6,
      });
      continue;
    }

    const opponentClub = SEED_OPPONENT_CLUBS[opponentIndex % SEED_OPPONENT_CLUBS.length];
    const teamUuid = opponentTeamUuid(mvTeam.leagueUuid, opponentIndex);
    entries.push({
      rank,
      teamUuid,
      teamName: `${opponentClub.name} 1`,
      sportsclubUuid: opponentClub.uuid,
      logoUrl: picsumImageUrl(opponentClub.picsumSeed, 128, 128),
      points: Math.max(0, 20 - rank * 2),
      wins: Math.max(0, 7 - rank),
      setWins: Math.max(0, 21 - rank * 2),
      setLosses: rank * 2,
      matchesPlayed: 6,
    });
    opponentIndex++;
  }

  return entries;
}

function buildMatchesForTeam(
  mvTeam: (typeof SEED_MV_TEAMS)[number],
  anchor: dayjs.Dayjs,
  opponentsPerLeague: number,
) {
  const matches: Array<Record<string, unknown>> = [];
  const pastCount = 4;
  const futureCount = 3;

  for (let index = 1; index <= pastCount; index++) {
    const opponentClub = SEED_OPPONENT_CLUBS[(index - 1) % SEED_OPPONENT_CLUBS.length];
    const opponentTeamUuidValue = opponentTeamUuid(
      mvTeam.leagueUuid,
      (index - 1) % opponentsPerLeague,
    );
    const isHome = index % 2 === 1;
    const mvWon = index % 2 === 1;
    const matchDate = anchor.subtract(index * 7, "day");

    matches.push({
      uuid: matchUuid(mvTeam.uuid, "past", index),
      date: matchDate.format("YYYY-MM-DD"),
      time: "19:00",
      leagueUuid: mvTeam.leagueUuid,
      seasonUuid: SEED_SEASON.uuid,
      team1: isHome
        ? {
            uuid: mvTeam.uuid,
            name: mvTeam.name,
            sportsclubUuid: SEED_MV_CLUB.uuid,
          }
        : {
            uuid: opponentTeamUuidValue,
            name: `${opponentClub.name} 1`,
            sportsclubUuid: opponentClub.uuid,
          },
      team2: isHome
        ? {
            uuid: opponentTeamUuidValue,
            name: `${opponentClub.name} 1`,
            sportsclubUuid: opponentClub.uuid,
          }
        : {
            uuid: mvTeam.uuid,
            name: mvTeam.name,
            sportsclubUuid: SEED_MV_CLUB.uuid,
          },
      location: {
        uuid: `location-seed-${index % 3}`,
        name: `Sporthalle Seed ${(index % 3) + 1}`,
      },
      hasResult: true,
      result: {
        winner: mvWon ? mvTeam.uuid : opponentTeamUuidValue,
        winnerName: mvWon ? mvTeam.name : `${opponentClub.name} 1`,
        setPoints: mvWon ? "3:1" : "1:3",
        ballPoints: mvWon ? "75:62" : "62:75",
        sets: [
          {
            number: 1,
            ballPoints: mvWon ? "25:20" : "20:25",
            winner: mvWon ? mvTeam.uuid : opponentTeamUuidValue,
            winnerName: mvWon ? mvTeam.name : `${opponentClub.name} 1`,
          },
          {
            number: 2,
            ballPoints: mvWon ? "25:22" : "22:25",
            winner: mvWon ? mvTeam.uuid : opponentTeamUuidValue,
            winnerName: mvWon ? mvTeam.name : `${opponentClub.name} 1`,
          },
          {
            number: 3,
            ballPoints: mvWon ? "25:20" : "20:25",
            winner: mvWon ? mvTeam.uuid : opponentTeamUuidValue,
            winnerName: mvWon ? mvTeam.name : `${opponentClub.name} 1`,
          },
        ],
      },
    });
  }

  for (let index = 1; index <= futureCount; index++) {
    const opponentClub = SEED_OPPONENT_CLUBS[(index + 2) % SEED_OPPONENT_CLUBS.length];
    const opponentTeamUuidValue = opponentTeamUuid(
      mvTeam.leagueUuid,
      (index + 2) % opponentsPerLeague,
    );
    const isHome = index % 2 === 0;
    const matchDate = anchor.add(index * 7, "day");

    matches.push({
      uuid: matchUuid(mvTeam.uuid, "future", index),
      date: matchDate.format("YYYY-MM-DD"),
      time: "18:30",
      leagueUuid: mvTeam.leagueUuid,
      seasonUuid: SEED_SEASON.uuid,
      team1: isHome
        ? {
            uuid: mvTeam.uuid,
            name: mvTeam.name,
            sportsclubUuid: SEED_MV_CLUB.uuid,
          }
        : {
            uuid: opponentTeamUuidValue,
            name: `${opponentClub.name} 1`,
            sportsclubUuid: opponentClub.uuid,
          },
      team2: isHome
        ? {
            uuid: opponentTeamUuidValue,
            name: `${opponentClub.name} 1`,
            sportsclubUuid: opponentClub.uuid,
          }
        : {
            uuid: mvTeam.uuid,
            name: mvTeam.name,
            sportsclubUuid: SEED_MV_CLUB.uuid,
          },
      location: {
        uuid: `location-seed-future-${index % 3}`,
        name: `Arena Seed ${(index % 3) + 1}`,
      },
      hasResult: false,
    });
  }

  return matches;
}

function buildRosterForTeam(mvTeam: (typeof SEED_MV_TEAMS)[number]) {
  const players = Array.from({ length: 8 }, (_, index) => {
    const jersey = index + 1;
    return {
      uuid: playerUuid(mvTeam.uuid, jersey),
      name: `Player ${jersey} (${mvTeam.slug})`,
      jerseyNumber: jersey,
      position: index % 2 === 0 ? "OH" : "MB",
      portraitUrl: picsumImageUrl(`player-${mvTeam.uuid}-${jersey}`, 200, 200),
    };
  });

  return {
    team: {
      uuid: mvTeam.uuid,
      name: mvTeam.name,
      slug: mvTeam.slug,
      leagueUuid: mvTeam.leagueUuid,
      leagueName: mvTeam.leagueName,
      leagueHierarchyLevel: mvTeam.leagueHierarchyLevel,
      sportsclubUuid: SEED_MV_CLUB.uuid,
    },
    players,
    officials: [
      {
        uuid: `official-${mvTeam.uuid}-coach`,
        name: `Coach ${mvTeam.slug}`,
        role: "Coach",
      },
    ],
  };
}

export function buildSamsProviderSeedFixtures(
  options: BuildSamsProviderSeedFixturesOptions,
): SamsProviderFixture[] {
  const anchor = dayjs(options.now ?? new Date());
  const opponentsPerLeague = clampOpponentsPerLeague(options.opponentsPerLeague);
  const teamCount = resolveMvTeamCount(options.variationSeed);
  const activeTeams = SEED_MV_TEAMS.slice(0, teamCount);
  const projectedAt = anchor.toISOString();
  const fixtures: SamsProviderFixture[] = [];
  let snapshotIndex = 0;

  fixtures.push({
    type: SamsEventType.clubUpdated,
    payload: clubProjection(SEED_MV_CLUB),
    snapshotVersion: snapshotVersion(options.variationSeed, snapshotIndex++),
  });

  for (const opponentClub of SEED_OPPONENT_CLUBS) {
    fixtures.push({
      type: SamsEventType.clubUpdated,
      payload: clubProjection(opponentClub),
      snapshotVersion: snapshotVersion(options.variationSeed, snapshotIndex++),
    });
  }

  fixtures.push({
    type: SamsEventType.clubSeasonTeamsUpdated,
    payload: {
      club: clubProjection(SEED_MV_CLUB),
      season: { ...SEED_SEASON, current: true },
      teams: activeTeams.map((team) => ({
        uuid: team.uuid,
        name: team.name,
        slug: team.slug,
        leagueUuid: team.leagueUuid,
        leagueName: team.leagueName,
        leagueHierarchyLevel: team.leagueHierarchyLevel,
      })),
      projectedAt,
    },
    snapshotVersion: snapshotVersion(options.variationSeed, snapshotIndex++),
  });

  fixtures.push({
    type: SamsEventType.clubSeasonRostersUpdated,
    payload: {
      club: clubProjection(SEED_MV_CLUB),
      season: { ...SEED_SEASON, current: true },
      rosters: activeTeams.map((team) => buildRosterForTeam(team)),
      projectedAt,
      cachedAt: projectedAt,
      isStale: false,
    },
    snapshotVersion: snapshotVersion(options.variationSeed, snapshotIndex++),
  });

  const allMatches = activeTeams.flatMap((team) =>
    buildMatchesForTeam(team, anchor, opponentsPerLeague),
  );

  fixtures.push({
    type: SamsEventType.clubMatchScheduleUpdated,
    payload: {
      club: clubProjection(SEED_MV_CLUB),
      season: { ...SEED_SEASON, current: true },
      matches: allMatches,
      projectedAt,
      cachedAt: projectedAt,
      isStale: false,
    },
    snapshotVersion: snapshotVersion(options.variationSeed, snapshotIndex++),
  });

  for (const [teamIndex, mvTeam] of activeTeams.entries()) {
    fixtures.push({
      type: SamsEventType.leagueRankingUpdated,
      payload: {
        leagueUuid: mvTeam.leagueUuid,
        seasonUuid: SEED_SEASON.uuid,
        cachedAt: projectedAt,
        refreshState: "active",
        nextRefreshAfter: null,
        isStale: false,
        sourceMatchBlockId: `block-${mvTeam.leagueUuid}`,
        entries: buildOpponentRankingEntries(mvTeam, teamIndex + 2, opponentsPerLeague),
      },
      snapshotVersion: snapshotVersion(options.variationSeed, snapshotIndex++),
    });
  }

  const countsBySportsclubUuid: Record<string, number> = {
    [SEED_MV_CLUB.uuid]: activeTeams.length,
  };

  fixtures.push({
    type: SamsEventType.teamsSyncCompleted,
    payload: {
      seasonUuid: SEED_SEASON.uuid,
      seasonName: SEED_SEASON.name,
      teamsCount: activeTeams.length,
      countsBySportsclubUuid,
      changedTeamUuids: activeTeams.map((team) => team.uuid),
    },
    snapshotVersion: snapshotVersion(options.variationSeed, snapshotIndex++),
  });

  return fixtures;
}

/** Fixed seed for unit tests — team count and snapshots stay stable. */
export const TEST_VARIATION_SEED = "test-fixture-seed";

export function buildTestSamsProviderFixtures(): SamsProviderFixture[] {
  return buildSamsProviderSeedFixtures({
    variationSeed: TEST_VARIATION_SEED,
    now: new Date("2026-08-27T12:00:00.000Z"),
    opponentsPerLeague: 6,
  });
}
