import dayjs from "dayjs";
import { SamsEventType } from "sams-provider-events";
import {
  matchUuid,
  opponentTeamDisplayName,
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

function leagueOpponentOffset(leagueUuid: string, variationSeed: string): number {
  return hashVariationSeed(`${variationSeed}:${leagueUuid}`) % SEED_OPPONENT_CLUBS.length;
}

function mvTeamDisplayName(mvTeam: (typeof SEED_MV_TEAMS)[number], variationSeed: string): string {
  const style = hashVariationSeed(`${variationSeed}:mv-name:${mvTeam.uuid}`) % 4;
  switch (style) {
    case 0:
      return mvTeam.name;
    case 1:
      return `MV ${mvTeam.leagueName}`;
    case 2:
      return `${mvTeam.leagueName} — Markgräfler Volleys`;
    default:
      return `Markgräfler ${mvTeam.slug.replace(/-/g, " ")}`;
  }
}

function pickOpponentClub(leagueUuid: string, opponentIndex: number, variationSeed: string) {
  const offset = leagueOpponentOffset(leagueUuid, variationSeed);
  return SEED_OPPONENT_CLUBS[(offset + opponentIndex) % SEED_OPPONENT_CLUBS.length];
}

function rankingStatsForRank(
  rank: number,
  leagueIndex: number,
  leagueUuid: string,
  variationSeed: string,
) {
  const hash = hashVariationSeed(`${variationSeed}:stats:${leagueUuid}:${rank}`);
  const spread = hash % 5;
  const base = 22 - rank * 2 + leagueIndex * 3 + spread;
  const wins = Math.max(0, 9 - rank + leagueIndex + (hash % 3));
  const setWins = base + 2 + (hash % 4);
  const setLosses = rank * 2 + leagueIndex + spread;
  return {
    points: Math.max(0, base),
    wins,
    setWins,
    setLosses,
    matchesPlayed: 5 + (rank % 3) + leagueIndex,
  };
}

function buildOpponentRankingEntries(
  mvTeam: (typeof SEED_MV_TEAMS)[number],
  mvRank: number,
  opponentsPerLeague: number,
  leagueIndex: number,
  variationSeed: string,
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
      const stats = rankingStatsForRank(rank, leagueIndex, mvTeam.leagueUuid, variationSeed);
      entries.push({
        rank,
        teamUuid: mvTeam.uuid,
        teamName: mvTeamDisplayName(mvTeam, variationSeed),
        sportsclubUuid: SEED_MV_CLUB.uuid,
        logoUrl: picsumImageUrl(SEED_MV_CLUB.picsumSeed, 128, 128),
        ...stats,
      });
      continue;
    }

    const opponentClub = pickOpponentClub(mvTeam.leagueUuid, opponentIndex, variationSeed);
    const teamUuid = opponentTeamUuid(mvTeam.leagueUuid, opponentIndex);
    const stats = rankingStatsForRank(
      rank,
      leagueIndex + 1,
      mvTeam.leagueUuid,
      `${variationSeed}:opp:${opponentIndex}`,
    );
    entries.push({
      rank,
      teamUuid,
      teamName: opponentTeamDisplayName(opponentClub, opponentIndex + leagueIndex * 2),
      sportsclubUuid: opponentClub.uuid,
      logoUrl: picsumImageUrl(opponentClub.picsumSeed, 128, 128),
      ...stats,
    });
    opponentIndex++;
  }

  return entries;
}

function buildMatchesForTeam(
  mvTeam: (typeof SEED_MV_TEAMS)[number],
  anchor: dayjs.Dayjs,
  opponentsPerLeague: number,
  variationSeed: string,
) {
  const matches: Array<Record<string, unknown>> = [];
  const pastCount = 4;
  const futureCount = 3;
  const mvDisplayName = mvTeamDisplayName(mvTeam, variationSeed);

  for (let index = 1; index <= pastCount; index++) {
    const opponentClub = pickOpponentClub(mvTeam.leagueUuid, index - 1, variationSeed);
    const opponentTeamUuidValue = opponentTeamUuid(
      mvTeam.leagueUuid,
      (index - 1) % opponentsPerLeague,
    );
    const opponentName = opponentTeamDisplayName(opponentClub, index - 1);
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
            name: mvDisplayName,
            sportsclubUuid: SEED_MV_CLUB.uuid,
          }
        : {
            uuid: opponentTeamUuidValue,
            name: opponentName,
            sportsclubUuid: opponentClub.uuid,
          },
      team2: isHome
        ? {
            uuid: opponentTeamUuidValue,
            name: opponentName,
            sportsclubUuid: opponentClub.uuid,
          }
        : {
            uuid: mvTeam.uuid,
            name: mvDisplayName,
            sportsclubUuid: SEED_MV_CLUB.uuid,
          },
      location: {
        uuid: `location-${mvTeam.leagueUuid}-${index % 3}`,
        name: `${opponentClub.name.split(" ")[0]} Halle ${(index % 3) + 1}`,
      },
      hasResult: true,
      result: {
        winner: mvWon ? mvTeam.uuid : opponentTeamUuidValue,
        winnerName: mvWon ? mvDisplayName : opponentName,
        setPoints: mvWon ? "3:1" : "1:3",
        ballPoints: mvWon ? `${75 + index}:${60 + index}` : `${60 + index}:${75 + index}`,
        sets: [
          {
            number: 1,
            ballPoints: mvWon ? "25:20" : "20:25",
            winner: mvWon ? mvTeam.uuid : opponentTeamUuidValue,
            winnerName: mvWon ? mvDisplayName : opponentName,
          },
          {
            number: 2,
            ballPoints: mvWon ? "25:22" : "22:25",
            winner: mvWon ? mvTeam.uuid : opponentTeamUuidValue,
            winnerName: mvWon ? mvDisplayName : opponentName,
          },
          {
            number: 3,
            ballPoints: mvWon ? "25:20" : "20:25",
            winner: mvWon ? mvTeam.uuid : opponentTeamUuidValue,
            winnerName: mvWon ? mvDisplayName : opponentName,
          },
        ],
      },
    });
  }

  for (let index = 1; index <= futureCount; index++) {
    const opponentClub = pickOpponentClub(mvTeam.leagueUuid, index + 2, variationSeed);
    const opponentTeamUuidValue = opponentTeamUuid(
      mvTeam.leagueUuid,
      (index + 2) % opponentsPerLeague,
    );
    const opponentName = opponentTeamDisplayName(opponentClub, index + 2);
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
            name: mvDisplayName,
            sportsclubUuid: SEED_MV_CLUB.uuid,
          }
        : {
            uuid: opponentTeamUuidValue,
            name: opponentName,
            sportsclubUuid: opponentClub.uuid,
          },
      team2: isHome
        ? {
            uuid: opponentTeamUuidValue,
            name: opponentName,
            sportsclubUuid: opponentClub.uuid,
          }
        : {
            uuid: mvTeam.uuid,
            name: mvDisplayName,
            sportsclubUuid: SEED_MV_CLUB.uuid,
          },
      location: {
        uuid: `location-future-${mvTeam.leagueUuid}-${index % 3}`,
        name: `Arena ${opponentClub.slug} ${(index % 3) + 1}`,
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

  fixtures.push({
    type: SamsEventType.clubSeasonTeamsUpdated,
    payload: {
      club: clubProjection(SEED_MV_CLUB),
      season: { ...SEED_SEASON, current: true },
      teams: activeTeams.map((team) => ({
        uuid: team.uuid,
        name: mvTeamDisplayName(team, options.variationSeed),
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
    buildMatchesForTeam(team, anchor, opponentsPerLeague, options.variationSeed),
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

  for (const opponentClub of SEED_OPPONENT_CLUBS) {
    fixtures.push({
      type: SamsEventType.clubUpdated,
      payload: clubProjection(opponentClub),
      snapshotVersion: snapshotVersion(options.variationSeed, snapshotIndex++),
    });
  }

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
        entries: buildOpponentRankingEntries(
          mvTeam,
          teamIndex + 2,
          opponentsPerLeague,
          teamIndex,
          options.variationSeed,
        ),
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
