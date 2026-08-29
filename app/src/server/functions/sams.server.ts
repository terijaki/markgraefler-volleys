/**
 * SAMS server-only implementation — DB projections and live ticker.
 *
 * Import protection (`.server.ts` suffix) keeps this module out of client bundles.
 * Server function wrappers live in `sams.ts`; tests import helpers from here.
 */

import type { LeagueMatchDto } from "sams-rest-v2";
import { createCacheKey, createExpiringCache, getOrSetExpiringCacheValue } from "@utils/cache";
import dayjs from "dayjs";
import { z } from "zod";
import {
  type LeagueMatchesResponse,
  LeagueMatchesResponseSchema,
  type LiveMatch,
  type LiveTickerResponse,
  LiveTickerResponseSchema,
  type RankingResponse,
  RankingResponseSchema,
} from "@/lambda/sams/types";
import {
  samsRankingProjectionRepository,
  samsScheduleProjectionRepository,
} from "@/lib/db/repositories";
import {
  getAllSamsClubs,
  getAllSamsTeams,
  getSamsClubByNameSlug,
  getSamsClubBySportsclubUuid,
  getSamsRosterByTeamUuid,
} from "../queries";
import { parseServerData } from "../schema-parse";
import {
  dedupeSamsMatchesByUuid,
  pickSyncedSeasonUuid,
  SAMS_TARGET_CLUB_SLUGS,
  shouldResolveDefaultSamsSportsclubs,
} from "@/utils/sams";
import {
  buildLeagueOrderingContext,
  calculateLastResultCap,
  sortLeagueUuidsByLevels,
} from "@webapp/utils/ranking";

const MEDIA_CLOUDFRONT_URL = () => process.env.MEDIA_CLOUDFRONT_URL || "";

const SAMS_API_TIMEOUT_MS = 10_000;

export type SamsMatchesInput = {
  league?: string;
  season?: string;
  sportsclub?: string;
  team?: string;
  limit?: number;
  range?: "past" | "future";
};

async function resolveConfiguredSamsSportsclubUuidsFromStorage(): Promise<string[]> {
  const configuredClubs = await Promise.all(
    SAMS_TARGET_CLUB_SLUGS.map(async (clubSlug) => ({
      clubSlug,
      club: await getSamsClubByNameSlug(clubSlug),
    })),
  );

  const missingClubSlugs = configuredClubs
    .filter(({ club }) => !club?.sportsclubUuid)
    .map(({ clubSlug }) => clubSlug);

  if (missingClubSlugs.length > 0) {
    console.warn("Failed to resolve configured SAMS clubs", { missingClubSlugs });
  }

  return configuredClubs.flatMap(({ club }) => (club?.sportsclubUuid ? [club.sportsclubUuid] : []));
}

export function resolveEffectiveSamsSportsclubUuids(
  input: Pick<SamsMatchesInput, "league" | "sportsclub" | "team">,
  defaultSportsclubUuids: readonly string[],
): string[] {
  if (input.sportsclub) return [input.sportsclub];
  if (!shouldResolveDefaultSamsSportsclubs(input)) return [];
  return [...defaultSportsclubUuids];
}

export function createSamsMatchesCacheKey(
  input: SamsMatchesInput,
  sportsclubUuids: readonly string[],
): string {
  return createCacheKey({
    type: "sams_matches",
    league: input.league,
    season: input.season,
    sportsclubUuids,
    team: input.team,
    limit: input.limit,
    range: input.range,
  });
}

type ResolvedSamsMatchesQuery = {
  league?: string;
  season?: string;
  sportsclub?: string;
  team?: string;
  limit?: number;
  range?: "past" | "future";
  effectiveSportsclubUuids: string[];
  cacheKey: string;
};

async function resolveSyncedSeasonUuid(): Promise<string | undefined> {
  try {
    const syncedTeams = await getAllSamsTeams();
    const preferredSportsclubUuids = await resolveConfiguredSamsSportsclubUuidsFromStorage();
    return pickSyncedSeasonUuid(syncedTeams.items, preferredSportsclubUuids);
  } catch (error) {
    console.warn("Failed to resolve synced SAMS season UUID; continuing without season filter", {
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

/** Resolves effective SAMS match query params and cache key (without auto season lookup). */
export async function resolveSamsMatchesQuery(
  data?: SamsMatchesInput,
  options?: {
    defaultSportsclubUuids?: readonly string[];
  },
): Promise<ResolvedSamsMatchesQuery | null> {
  const { league, season, sportsclub, team } = data || {};

  const shouldUseDefaultSportsclubs = shouldResolveDefaultSamsSportsclubs({
    league,
    sportsclub,
    team,
  });
  const defaultSportsclubUuids =
    options?.defaultSportsclubUuids ??
    (shouldUseDefaultSportsclubs ? await resolveConfiguredSamsSportsclubUuidsFromStorage() : []);
  if (shouldUseDefaultSportsclubs && defaultSportsclubUuids.length === 0) {
    return null;
  }

  const effectiveSportsclubUuids = resolveEffectiveSamsSportsclubUuids(
    { league, sportsclub, team },
    defaultSportsclubUuids,
  );

  const cacheKey = createSamsMatchesCacheKey(
    {
      league,
      season,
      sportsclub,
      team,
      limit: data?.limit,
      range: data?.range,
    },
    effectiveSportsclubUuids,
  );

  return {
    league,
    season,
    sportsclub,
    team,
    limit: data?.limit,
    range: data?.range,
    effectiveSportsclubUuids,
    cacheKey,
  };
}

async function resolveSeasonScopedSamsMatchesQuery(
  data: SamsMatchesInput | undefined,
  baseQuery: ResolvedSamsMatchesQuery,
  seasonUuid?: string,
): Promise<ResolvedSamsMatchesQuery | null> {
  if (baseQuery.season) return baseQuery;

  const syncedSeason = seasonUuid ?? (await resolveSyncedSeasonUuid());
  if (!syncedSeason) return null;

  return {
    ...baseQuery,
    season: syncedSeason,
    cacheKey: createSamsMatchesCacheKey(
      {
        league: data?.league,
        season: syncedSeason,
        sportsclub: data?.sportsclub,
        team: data?.team,
        limit: data?.limit,
        range: data?.range,
      },
      baseQuery.effectiveSportsclubUuids,
    ),
  };
}

type SamsPeekContext = {
  seasonUuid?: string;
  sportsclubUuids?: readonly string[];
};

async function loadMatchesFromProjections({
  league,
  season,
  team,
  sportsclubUuids,
}: Pick<SamsMatchesInput, "league" | "season" | "team"> & {
  sportsclubUuids: readonly string[];
}): Promise<Omit<LeagueMatchDto, "_links">[]> {
  if (!season || sportsclubUuids.length === 0) return [];

  const projectionMatches = await samsScheduleProjectionRepository.listMatchesForSportsclubs(
    sportsclubUuids,
    season,
  );

  let matches = projectionMatches as Omit<LeagueMatchDto, "_links">[];

  if (league) {
    matches = matches.filter((match) => match.leagueUuid === league);
  }
  if (team) {
    matches = matches.filter(
      (match) => match._embedded?.team1?.uuid === team || match._embedded?.team2?.uuid === team,
    );
  }

  return dedupeSamsMatchesByUuid(matches);
}

function normalizeProjectionMatchHost(
  match: Omit<LeagueMatchDto, "_links">,
): Omit<LeagueMatchDto, "_links"> {
  if (typeof match.host === "string" || match.host == null) {
    return match;
  }
  const team1Uuid = match._embedded?.team1?.uuid;
  const team2Uuid = match._embedded?.team2?.uuid;
  if (match.host === true && team1Uuid) {
    return { ...match, host: team1Uuid };
  }
  if (match.host === false && team2Uuid) {
    return { ...match, host: team2Uuid };
  }
  if (team1Uuid) {
    return { ...match, host: team1Uuid };
  }
  return match;
}

function isPastProjectionMatch(
  match: { results?: { winner?: string | null } | null; date?: string | null },
  anchor = dayjs(),
): boolean {
  if (match.results?.winner) return true;
  if (match.date && anchor.isAfter(dayjs(match.date), "day")) return true;
  return false;
}

async function buildMatchesResponse(
  data: SamsMatchesInput | undefined,
  query: ResolvedSamsMatchesQuery,
): Promise<LeagueMatchesResponse> {
  const { league, season, team, effectiveSportsclubUuids } = query;
  const allMatches = await loadMatchesFromProjections({
    league,
    season,
    team,
    sportsclubUuids: effectiveSportsclubUuids,
  }).then((matches) => matches.map((match) => normalizeProjectionMatchHost(match)));

  let filteredMatches = allMatches;
  if (data?.range === "future") {
    filteredMatches = allMatches.filter((match) => !isPastProjectionMatch(match));
    filteredMatches.sort((a, b) =>
      !a.date ? 1 : !b.date ? -1 : dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1,
    );
  } else if (data?.range === "past") {
    filteredMatches = allMatches.filter((match) => isPastProjectionMatch(match));
    filteredMatches.sort((a, b) =>
      !a.date ? 1 : !b.date ? -1 : dayjs(a.date).isAfter(dayjs(b.date)) ? -1 : 1,
    );
  }

  if (data?.limit) filteredMatches = filteredMatches.slice(0, data.limit);

  return parseServerData(
    LeagueMatchesResponseSchema,
    { matches: filteredMatches, timestamp: new Date().toISOString() },
    "Failed to parse SAMS matches response",
  );
}

async function fetchSamsRankingsByLeagueUuid(leagueUuid: string): Promise<RankingResponse> {
  const seasonUuid = await resolveSyncedSeasonUuid();
  if (!seasonUuid) throw new Error("No synced SAMS season available for rankings");

  const projection = await samsRankingProjectionRepository.get(leagueUuid, seasonUuid);
  if (!projection || projection.teams.length === 0) {
    throw new Error("No rankings found for this league");
  }

  return parseServerData(
    RankingResponseSchema,
    {
      teams: projection.teams,
      timestamp: projection.updatedAt,
      leagueUuid,
      leagueName: projection.leagueName,
      seasonName: projection.seasonName,
    },
    "Failed to parse SAMS rankings response",
  );
}

async function peekRankingProjectionForSeason(
  leagueUuid: string,
  seasonUuid: string,
): Promise<RankingResponse | null> {
  const projection = await samsRankingProjectionRepository.get(leagueUuid, seasonUuid);
  if (!projection) return null;

  return parseServerData(
    RankingResponseSchema,
    {
      teams: projection.teams,
      timestamp: projection.updatedAt,
      leagueUuid,
      leagueName: projection.leagueName,
      seasonName: projection.seasonName,
    },
    "Failed to parse SAMS rankings projection",
  );
}

// ── SAMS projections — Matches ───────────────────────────────────────────────

export async function handleGetSamsMatches(data?: SamsMatchesInput) {
  const resolvedQuery = await resolveSamsMatchesQuery(data);
  if (!resolvedQuery) {
    console.warn("No configured SAMS sportsclub UUIDs resolved; returning empty matches", {
      league: data?.league,
      season: data?.season,
    });
    return parseServerData(
      LeagueMatchesResponseSchema,
      { matches: [], timestamp: new Date().toISOString() },
      "Failed to parse empty SAMS matches response",
    );
  }

  let activeQuery = resolvedQuery;
  if (!activeQuery.season) {
    const seasonScopedQuery = await resolveSeasonScopedSamsMatchesQuery(data, resolvedQuery);
    if (!seasonScopedQuery) {
      return parseServerData(
        LeagueMatchesResponseSchema,
        { matches: [], timestamp: new Date().toISOString() },
        "Failed to parse empty SAMS matches response",
      );
    }
    activeQuery = seasonScopedQuery;
  }

  return buildMatchesResponse(data, activeQuery);
}

// ── SAMS projections — Rankings ──────────────────────────────────────────────

export async function handleGetSamsRankingsByLeagueUuids(leagueUuids: string[]) {
  return Promise.all(leagueUuids.map((leagueUuid) => fetchSamsRankingsByLeagueUuid(leagueUuid)));
}

export async function handleGetSamsRankingByLeagueUuid(leagueUuid: string) {
  return fetchSamsRankingsByLeagueUuid(leagueUuid);
}

/** Projection peek for rankings — returns stored data regardless of age. */
export async function handlePeekSamsRankingsCache(
  leagueUuids: string[],
  context?: Pick<SamsPeekContext, "seasonUuid">,
) {
  const seasonUuid = context?.seasonUuid ?? (await resolveSyncedSeasonUuid());
  if (!seasonUuid) return [];

  const results = await Promise.all(
    leagueUuids.map((leagueUuid) => peekRankingProjectionForSeason(leagueUuid, seasonUuid)),
  );
  return results.filter((result): result is RankingResponse => result !== null);
}

/** Projection peek for matches — fast route loaders without assembling filters at read time. */
export async function handlePeekSamsMatchesCache(
  data?: SamsMatchesInput,
  context?: SamsPeekContext,
) {
  const resolvedQuery = await resolveSamsMatchesQuery(data, {
    defaultSportsclubUuids: context?.sportsclubUuids,
  });
  if (!resolvedQuery) return null;

  let activeQuery = resolvedQuery;
  if (!activeQuery.season) {
    const seasonScopedQuery = await resolveSeasonScopedSamsMatchesQuery(
      data,
      resolvedQuery,
      data?.season ?? context?.seasonUuid,
    );
    if (!seasonScopedQuery) return null;
    activeQuery = seasonScopedQuery;
  }

  const response = await buildMatchesResponse(data, activeQuery);
  return response.matches.length > 0 ? response : null;
}

const TABELLE_GAMES_PER_TEAM = 2.3;

export async function handleLoadTabelleRouteData() {
  const { handleListTeams } = await import("./teams.server");

  const [samsTeamsResult, teamsResult, sportsclubUuids] = await Promise.all([
    getAllSamsTeams(),
    handleListTeams(),
    resolveConfiguredSamsSportsclubUuidsFromStorage(),
  ]);

  const syncedSeasonUuid = pickSyncedSeasonUuid(samsTeamsResult.items, sportsclubUuids);
  const teamsForSeason = syncedSeasonUuid
    ? samsTeamsResult.items.filter((team) => team.seasonUuid === syncedSeasonUuid)
    : samsTeamsResult.items;
  const orderingContext = buildLeagueOrderingContext(teamsForSeason);

  if (samsTeamsResult.items.length === 0) {
    return {
      leagueUuids: [],
      teams: teamsResult.items,
      lastResultCap: 6,
      rankingsByLeagueUuid: {} as Record<string, RankingResponse>,
      matches: undefined,
    };
  }

  const leagueLevels = Object.fromEntries(orderingContext.leagueLevelByUuid);
  const sortedLeagueUuids = sortLeagueUuidsByLevels({
    leagueUuids: orderingContext.leagueUuids,
    leagueLevels,
    leagueNameByUuid: orderingContext.leagueNameByUuid,
    leagueOrderByUuid: orderingContext.leagueOrderByUuid,
  });
  const lastResultCap = calculateLastResultCap(
    samsTeamsResult.items.length,
    TABELLE_GAMES_PER_TEAM,
  );

  let rankingsByLeagueUuid: Record<string, RankingResponse> = {};
  let matches: LeagueMatchesResponse | undefined;
  const peekContext: SamsPeekContext = {
    seasonUuid: syncedSeasonUuid,
    sportsclubUuids,
  };

  if (sortedLeagueUuids.length > 0) {
    const [rankingsResult, matchesResult] = await Promise.all([
      handlePeekSamsRankingsCache(sortedLeagueUuids, peekContext),
      handlePeekSamsMatchesCache(
        { range: "past", limit: lastResultCap, season: syncedSeasonUuid },
        peekContext,
      ),
    ]);
    rankingsByLeagueUuid = Object.fromEntries(
      rankingsResult.map((ranking) => [ranking.leagueUuid, ranking]),
    );
    matches = matchesResult ?? undefined;
  }

  return {
    leagueUuids: sortedLeagueUuids,
    teams: teamsResult.items,
    lastResultCap,
    rankingsByLeagueUuid,
    matches,
  };
}

export async function handleLoadMatchesIndexRouteData() {
  const [samsTeamsResult, sportsclubUuids] = await Promise.all([
    getAllSamsTeams(),
    resolveConfiguredSamsSportsclubUuidsFromStorage(),
  ]);

  const seasonUuid = pickSyncedSeasonUuid(samsTeamsResult.items, sportsclubUuids);
  const peekContext: SamsPeekContext = { seasonUuid, sportsclubUuids };

  const matches = await handlePeekSamsMatchesCache(
    { range: "future", season: seasonUuid },
    peekContext,
  );
  return { matches: matches ?? undefined };
}

export async function handleListSamsClubs() {
  const result = await getAllSamsClubs();
  return {
    items: result.items,
    clubs: result.items,
    lastEvaluatedKey: result.lastEvaluatedKey,
  };
}

export async function handleListSamsTeams() {
  const result = await getAllSamsTeams();
  return {
    items: result.items,
    teams: result.items,
    lastEvaluatedKey: result.lastEvaluatedKey,
  };
}

export async function handleGetSamsRosterByTeamUuid(teamUuid: string) {
  return getSamsRosterByTeamUuid(teamUuid);
}

type ClubLogoInput =
  | { clubUuid: string; clubSlug?: undefined }
  | { clubSlug: string; clubUuid?: undefined };

export async function handleGetClubLogoUrl(data: ClubLogoInput) {
  const club = data.clubUuid
    ? await getSamsClubBySportsclubUuid(data.clubUuid)
    : data.clubSlug
      ? await getSamsClubByNameSlug(data.clubSlug)
      : null;
  return resolveClubLogoUrl(club, MEDIA_CLOUDFRONT_URL());
}

export async function handleGetClubLogoUrlsBySportsclubUuids(sportsclubUuids: string[]) {
  const uniqueUuids = [...new Set(sportsclubUuids.filter((uuid) => uuid.length > 0))];
  const cfUrl = MEDIA_CLOUDFRONT_URL();
  const entries = await Promise.all(
    uniqueUuids.map(async (sportsclubUuid) => {
      const club = await getSamsClubBySportsclubUuid(sportsclubUuid);
      return [sportsclubUuid, resolveClubLogoUrl(club, cfUrl)] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<string, string | null>;
}

/** Pure helper — resolves a club's effective logo URL from a club record.
 * Exported for unit testing. */
export function resolveClubLogoUrl(
  club: { logoS3Key?: string | null; logoImageLink?: string | null } | null,
  cloudfrontUrl: string,
): string | null {
  if (!club) return null;
  if (club.logoS3Key && cloudfrontUrl) return `${cloudfrontUrl}/${club.logoS3Key}`;
  return club.logoImageLink ?? null;
}

// ── SAMS Live Ticker proxy ────────────────────────────────────────────────────

const TICKER_URL = "https://backend.sams-ticker.de/live/indoor/tickers/baden";
const TICKER_CACHE_TTL_MS = 10_000;

type TickerCacheValue = {
  data: LiveTickerResponse;
};

const tickerCache = createExpiringCache<TickerCacheValue>();

const RawTickerMatchSchema = z
  .object({
    id: z.string(),
    date: z.union([z.string(), z.number()]).optional(),
    teamDescription1: z.string().optional(),
    team1: z.string(),
    teamDescription2: z.string().optional(),
    team2: z.string(),
  })
  .loose();

const RawTickerMatchDaySchema = z
  .object({
    date: z.string().optional(),
    matches: z.array(RawTickerMatchSchema).optional().default([]),
  })
  .loose();

const RawTickerMatchStateSchema = z
  .object({
    started: z.boolean().optional().default(false),
    finished: z.boolean().optional().default(false),
    setPoints: z.object({ team1: z.number(), team2: z.number() }).optional(),
    matchSets: z
      .array(
        z.object({
          setNumber: z.number(),
          setScore: z.object({ team1: z.number(), team2: z.number() }),
        }),
      )
      .optional()
      .default([]),
  })
  .loose();

const RawTickerResponseSchema = z
  .object({
    matchDays: z.array(RawTickerMatchDaySchema).optional().default([]),
    matchStates: z.record(z.string(), RawTickerMatchStateSchema).optional().default({}),
  })
  .loose();

export function buildLiveMatchesFromRaw(raw: z.infer<typeof RawTickerResponseSchema>): LiveMatch[] {
  // Build matchUuid → team metadata map from matchDays
  const matchTeamMap = new Map<
    string,
    {
      team1Uuid: string;
      team2Uuid: string;
      team1Name: string;
      team2Name: string;
      matchDate?: string | number;
    }
  >();
  for (const day of raw.matchDays) {
    for (const match of day.matches) {
      matchTeamMap.set(match.id, {
        team1Uuid: match.team1,
        team2Uuid: match.team2,
        team1Name: match.teamDescription1 ?? match.team1,
        team2Name: match.teamDescription2 ?? match.team2,
        matchDate: match.date ?? day.date,
      });
    }
  }

  const today = dayjs();

  // Only include started matches from today that have team metadata
  const liveMatches: LiveMatch[] = [];
  for (const [matchUuid, state] of Object.entries(raw.matchStates)) {
    if (!state.started) continue;
    const teams = matchTeamMap.get(matchUuid);
    if (!teams) continue;
    if (
      !teams.matchDate ||
      !dayjs(teams.matchDate).isValid() ||
      !dayjs(teams.matchDate).isSame(today, "day")
    )
      continue;
    liveMatches.push({
      matchUuid,
      team1Uuid: teams.team1Uuid,
      team2Uuid: teams.team2Uuid,
      team1Name: teams.team1Name,
      team2Name: teams.team2Name,
      state: {
        started: state.started,
        finished: state.finished,
        setPoints: state.setPoints ?? { team1: 0, team2: 0 },
        matchSets: state.matchSets,
      },
    });
  }
  return liveMatches;
}

export async function handleGetSamsTicker() {
  const result = await getOrSetExpiringCacheValue({
    cache: tickerCache,
    keyParts: { resource: "sams-live-ticker" },
    ttlMs: TICKER_CACHE_TTL_MS,
    load: async () => {
      const response = await fetch(TICKER_URL, {
        signal: AbortSignal.timeout(SAMS_API_TIMEOUT_MS),
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error(`SAMS ticker returned ${response.status}`);

      const raw = parseServerData(
        RawTickerResponseSchema,
        await response.json(),
        "Failed to parse SAMS ticker response",
      );
      const liveMatches = buildLiveMatchesFromRaw(raw);

      return {
        data: parseServerData(
          LiveTickerResponseSchema,
          {
            liveMatches,
            timestamp: new Date().toISOString(),
          },
          "Failed to parse SAMS live ticker response",
        ),
      };
    },
  });

  return result.data;
}
