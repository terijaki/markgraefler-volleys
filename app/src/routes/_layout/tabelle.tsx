import { Card, CardSection, Loader, SimpleGrid, Stack, Text } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { List } from "lucide-react";
import CardTitle from "@webapp/components/CardTitle";
import PageWithHeading from "@webapp/components/layout/PageWithHeading";
import Matches from "@webapp/components/Matches";
import RankingTable from "@webapp/components/RankingTable";
import { useSamsMatches } from "@webapp/hooks/dataQueries";
import { loadTabelleRouteDataFn } from "@webapp/server/functions/sams";
import { numToWord } from "num-words-de";

export const Route = createFileRoute("/_layout/tabelle")({
  /**
   * LOADING STRATEGY — do not change without understanding the full picture.
   *
   * Goal: instant navigation (no skeleton), with a small spinner showing when data
   * is being refreshed in the background.
   *
   * How it works:
   *  1. Loader runs server-side before navigation completes. It must be FAST — any
   *     async call that hits an external API blocks the browser from showing the page.
   *     → Use `loadTabelleRouteDataFn` (single server call that peeks projections in-process).
   *     → These read DynamoDB only, never call the SAMS API, and use Infinity TTL so they
   *       always return whatever is cached regardless of age.
   *
   *  2. The loader passes the cached data as `initialData` + `initialDataUpdatedAt` to
   *     React Query hooks. React Query compares `initialDataUpdatedAt` against its
   *     `staleTime` (10 min). If the data is stale, it starts a background refetch
   *     immediately after render → `isFetching: true` → small spinner in RankingTable.
   *
   *  3. The React Query `queryFn` (getSamsRankingsByLeagueUuidsFn) has its own 5-min
   *     DDB cache check and falls back to the SAMS API on miss — this is the only place
   *     the SAMS API is called.
   *
   * Result: users always see cached data instantly. The spinner appears when React Query
   * decides fresh data is needed. A loading skeleton only appears when the DDB cache is
   * completely empty (first-ever visit or after a full cache eviction).
   *
   * PITFALL: Do NOT replace peek functions with getSamsRankingsByLeagueUuidsFn in the
   * loader. That function calls the SAMS API on cache miss, blocking navigation for 2-3s.
   */
  loader: async () => loadTabelleRouteDataFn(),
  component: RouteComponent,
});

function RouteComponent() {
  const {
    leagueUuids,
    teams,
    lastResultCap,
    rankingsByLeagueUuid,
    matches: loaderMatches,
  } = Route.useLoaderData();

  const matchesInitialDataUpdatedAt = loaderMatches?.timestamp
    ? new Date(loaderMatches.timestamp).getTime()
    : undefined;

  const {
    data: matchesData,
    isLoading: isLoadingMatches,
    isError: isMatchesError,
  } = useSamsMatches({
    range: "past",
    limit: lastResultCap,
    initialData: loaderMatches,
    initialDataUpdatedAt: matchesInitialDataUpdatedAt,
  });
  const recentMatches = matchesData?.matches ?? [];
  const lastResultWord =
    recentMatches.length > 1 && numToWord(recentMatches.length, { uppercase: false });

  return (
    <PageWithHeading
      title="Tabellen"
      subtitle="Aktuelle Tabellen und letzte Spielergebnisse unserer Teams"
      icon={List}
    >
      <Stack>
        {leagueUuids.length === 0 && <NoRankingsData />}
        {leagueUuids.length > 0 && (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            {leagueUuids.map((leagueUuid) => (
              <RankingTable
                key={leagueUuid}
                leagueUuid={leagueUuid}
                initialData={rankingsByLeagueUuid[leagueUuid]}
                linkToTeamPage={true}
                clubsTeams={teams}
              />
            ))}
          </SimpleGrid>
        )}
        {isLoadingMatches && <MatchesLoadingState />}
        {!isLoadingMatches && isMatchesError && <MatchesErrorState />}
        {!isLoadingMatches && !isMatchesError && recentMatches.length > 0 && (
          <Card>
            <CardTitle>Unsere letzten {lastResultWord} Spiele</CardTitle>
            <CardSection p={{ base: undefined, sm: "sm" }}>
              <Matches matches={recentMatches} type="past" />
            </CardSection>
          </Card>
        )}
      </Stack>
    </PageWithHeading>
  );
}

function MatchesLoadingState() {
  return (
    <Card>
      <CardTitle>Letzte Spiele</CardTitle>
      <Stack align="center" py="md" gap="xs">
        <Loader size="sm" />
        <Text c="dimmed" size="sm">
          Lade letzte Spiele...
        </Text>
      </Stack>
    </Card>
  );
}

function MatchesErrorState() {
  return (
    <Card>
      <CardTitle>Fehler beim Laden der letzten Spiele</CardTitle>
      <Text>
        Die letzten Spielresultate konnten derzeit nicht geladen werden. Bitte versuche es später
        erneut.
      </Text>
    </Card>
  );
}

function NoRankingsData() {
  const currentMonth = new Date().getMonth() + 1;
  return (
    <>
      <Card>
        <CardTitle>Keine Daten gefunden</CardTitle>
        <Text>
          Tablleninformationen stehen aktuell nicht zur Verfügung. Eventuell liegt ein technisches
          Problem vor, oder es ist einfach der falsche Zeitpunkt.
        </Text>
      </Card>
      {currentMonth >= 4 && currentMonth <= 9 && (
        <Card>
          <CardTitle>Außerhalb der Saison?</CardTitle>
          <Text>
            Die Saison im Hallenvolleyball findet in der Regel in den Monaten von September bis
            April statt. Dazwischen und kurz vor Saisonbeginn, wurden die neusten Informationen vom
            Südbadischen Volleyballverband ggf. noch nicht veröffentlicht.
          </Text>
        </Card>
      )}
    </>
  );
}
