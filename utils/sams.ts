import { SAMS } from "@project.config";
import { slugify } from "./slugify";

type NullableString = string | null | undefined;

type ClubLike = {
  nameSlug?: NullableString;
  sportsclubUuid?: NullableString;
};

type TeamLike = {
  uuid?: NullableString;
  sportsclubUuid?: NullableString;
};

type SyncedSeasonTeamLike = {
  seasonUuid?: NullableString;
  sportsclubUuid?: NullableString;
};

export function pickSyncedSeasonUuid(
  teams: readonly SyncedSeasonTeamLike[],
  preferredSportsclubUuids: readonly string[] = [],
): string | undefined {
  const pool =
    preferredSportsclubUuids.length > 0
      ? teams.filter(
          (team) => team.sportsclubUuid && preferredSportsclubUuids.includes(team.sportsclubUuid),
        )
      : teams;

  const seasonCounts = new Map<string, number>();
  for (const team of pool) {
    if (!team.seasonUuid) continue;
    seasonCounts.set(team.seasonUuid, (seasonCounts.get(team.seasonUuid) ?? 0) + 1);
  }

  let bestSeason: string | undefined;
  let bestCount = 0;
  for (const [seasonUuid, count] of seasonCounts) {
    if (count > bestCount) {
      bestCount = count;
      bestSeason = seasonUuid;
    }
  }

  return bestSeason;
}

type MatchLike = {
  uuid?: NullableString;
};

export const SAMS_TARGET_CLUB_NAMES = SAMS.targetClubs.map(({ name }) => name);

export const SAMS_TARGET_CLUB_SLUGS = SAMS_TARGET_CLUB_NAMES.map((name) => slugify(name));

const samsTargetClubSlugSet = new Set<string>(SAMS_TARGET_CLUB_SLUGS);

export function isConfiguredSamsClubSlug(nameSlug: NullableString): boolean {
  return !!nameSlug && samsTargetClubSlugSet.has(nameSlug);
}

export function resolveConfiguredSamsSportsclubUuids<T extends ClubLike>(
  clubs: readonly T[],
): string[] {
  const sportsclubUuids = new Set<string>();

  for (const club of clubs) {
    if (!club.sportsclubUuid || !isConfiguredSamsClubSlug(club.nameSlug)) continue;
    sportsclubUuids.add(club.sportsclubUuid);
  }

  return [...sportsclubUuids].sort((left, right) => left.localeCompare(right));
}

export function shouldResolveDefaultSamsSportsclubs(filters: {
  league?: NullableString;
  sportsclub?: NullableString;
  team?: NullableString;
}): boolean {
  return !filters.league && !filters.sportsclub && !filters.team;
}

export function getOwnedSamsTeamUuids<T extends TeamLike>(teams: readonly T[]): Set<string> {
  const teamUuids = new Set<string>();

  for (const team of teams) {
    if (team.uuid) teamUuids.add(team.uuid);
  }

  return teamUuids;
}

export function getOwnedSamsSportsclubUuids<T extends TeamLike>(teams: readonly T[]): Set<string> {
  const sportsclubUuids = new Set<string>();

  for (const team of teams) {
    if (team.sportsclubUuid) sportsclubUuids.add(team.sportsclubUuid);
  }

  return sportsclubUuids;
}

export function dedupeSamsMatchesByUuid<T extends MatchLike>(matches: readonly T[]): T[] {
  const seenUuids = new Set<string>();
  const dedupedMatches: T[] = [];

  for (const match of matches) {
    if (!match.uuid) {
      dedupedMatches.push(match);
      continue;
    }

    if (seenUuids.has(match.uuid)) continue;

    seenUuids.add(match.uuid);
    dedupedMatches.push(match);
  }

  return dedupedMatches;
}
