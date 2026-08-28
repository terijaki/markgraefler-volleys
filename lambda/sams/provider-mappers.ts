import type { SamsProjectionMatchInput, SamsProjectionRankingEntryInput } from "@/lib/db/schemas";

type ProviderMatchTeam = {
  uuid: string;
  name: string;
  sportsclubUuid?: string;
  logoUrl?: string | null;
};

type ProviderMatchLocation = {
  uuid: string;
  name?: string;
};

type ProviderMatchSet = {
  number: number;
  ballPoints?: string;
  winner?: string;
  winnerName?: string;
  duration?: number;
};

type ProviderMatchResult = {
  winner?: string | null;
  winnerName?: string | null;
  setPoints?: string | null;
  ballPoints?: string | null;
  sets?: ProviderMatchSet[];
};

export type ProviderMatchProjection = {
  uuid: string;
  date?: string | null;
  time?: string | null;
  leagueUuid?: string;
  seasonUuid?: string;
  team1: ProviderMatchTeam;
  team2: ProviderMatchTeam;
  location?: ProviderMatchLocation;
  result?: ProviderMatchResult;
  hasResult?: boolean;
};

type ProviderRankingEntry = {
  rank: number;
  teamUuid: string;
  teamName: string;
  sportsclubUuid?: string;
  logoUrl?: string | null;
  matchesPlayed?: number | null;
  points?: number | null;
  wins?: number | null;
  setWins?: number | null;
  setLosses?: number | null;
};

function mapProviderResult(
  result: ProviderMatchResult | undefined,
  hasResult: boolean | undefined,
) {
  if (!result && !hasResult) return undefined;

  const sets = result?.sets?.map((set) => ({
    number: set.number,
    ballPoints: set.ballPoints,
    winner: set.winner,
    winnerName: set.winnerName,
    duration: set.duration,
  }));

  return {
    winner: result?.winner ?? undefined,
    winnerName: result?.winnerName ?? undefined,
    setPoints: result?.setPoints ?? undefined,
    ballPoints: result?.ballPoints ?? undefined,
    ...(sets && sets.length > 0 ? { sets } : {}),
  };
}

export function mapProviderMatchToProjection(
  match: ProviderMatchProjection,
): SamsProjectionMatchInput {
  const team1Sportsclub = match.team1.sportsclubUuid ?? "";
  const team2Sportsclub = match.team2.sportsclubUuid ?? "";

  return {
    uuid: match.uuid,
    date: match.date ?? undefined,
    time: match.time ?? undefined,
    leagueUuid: match.leagueUuid ?? undefined,
    host: match.team1.uuid,
    results: mapProviderResult(match.result, match.hasResult),
    location: match.location
      ? {
          uuid: match.location.uuid,
          name: match.location.name,
        }
      : undefined,
    _embedded: {
      team1: {
        uuid: match.team1.uuid,
        name: match.team1.name,
        sportsclubUuid: team1Sportsclub,
      },
      team2: {
        uuid: match.team2.uuid,
        name: match.team2.name,
        sportsclubUuid: team2Sportsclub,
      },
    },
  };
}

export function mapProviderRankingEntry(
  entry: ProviderRankingEntry,
): SamsProjectionRankingEntryInput {
  return {
    uuid: entry.teamUuid,
    teamName: entry.teamName,
    rank: entry.rank,
    matchesPlayed: entry.matchesPlayed ?? undefined,
    points: entry.points ?? undefined,
    wins: entry.wins ?? undefined,
    setWins: entry.setWins ?? undefined,
    setLosses: entry.setLosses ?? undefined,
  };
}

export function collectSportsclubUuidsFromMatches(
  matches: readonly ProviderMatchProjection[],
): string[] {
  const uuids = new Set<string>();
  for (const match of matches) {
    if (match.team1.sportsclubUuid) uuids.add(match.team1.sportsclubUuid);
    if (match.team2.sportsclubUuid) uuids.add(match.team2.sportsclubUuid);
  }
  return [...uuids];
}
