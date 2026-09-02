import { Card, CardSection, SimpleGrid, Stack, Text } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { List } from "lucide-react";
import CardTitle from "@webapp/components/CardTitle";
import PageWithHeading from "@webapp/components/layout/PageWithHeading";
import Matches from "@webapp/components/Matches";
import RankingTable from "@webapp/components/RankingTable";
import { loadTabelleRouteDataFn } from "@webapp/server/functions/sams";
import { numToWord } from "num-words-de";

export const Route = createFileRoute("/_layout/tabelle")({
  /**
   * LOADING STRATEGY — public route uses loader data only (no client refetch for SAMS tables/matches).
   * `loadTabelleRouteDataFn` reads ranking and match projections from DynamoDB during SSR.
   */
  loader: async () => loadTabelleRouteDataFn(),
  component: RouteComponent,
});

function RouteComponent() {
  const { leagueUuids, teams, rankingsByLeagueUuid, matches: loaderMatches } =
    Route.useLoaderData();

  const recentMatches = loaderMatches?.matches ?? [];
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
                loaderOnly
              />
            ))}
          </SimpleGrid>
        )}
        {recentMatches.length > 0 && (
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
