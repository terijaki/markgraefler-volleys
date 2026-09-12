import { Anchor, Card, Stack, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import CardTitle from "@webapp/components/CardTitle";
import PageWithHeading from "@webapp/components/layout/PageWithHeading";
import Matches from "@webapp/components/Matches";
import { loadMatchesIndexRouteDataFn } from "@webapp/server/functions/sams";
import { getWebcalLinkFn } from "@webapp/server/functions/webcal";
import dayjs from "dayjs";
import { CalendarDays, Megaphone as IconSubscribe } from "lucide-react";
import { Fragment } from "react";
import type { LeagueMatchesResponse } from "@/lambda/sams/types";

export const Route = createFileRoute("/_layout/matches/")({
  /**
   * LOADING STRATEGY — public route uses loader data only (no client refetch).
   * `loadMatchesIndexRouteDataFn` reads match projections from DynamoDB during SSR.
   */
  loader: async () => {
    const [pageData, webcalLink] = await Promise.all([
      loadMatchesIndexRouteDataFn(),
      getWebcalLinkFn({ data: { path: "/ics/all.ics" } }),
    ]);
    return {
      matches: pageData.matches,
      webcalLink,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { matches: loaderMatches, webcalLink } = Route.useLoaderData();

  return (
    <PageWithHeading
      title="Spielplan"
      subtitle="Alle Ligaspiele der Markgräfler Volleys im Überblick"
      icon={CalendarDays}
    >
      <Stack>
        <Card>
          <Stack>
            <CardTitle>Kalender für Ligaspiele</CardTitle>
            <Text>
              <Anchor href={webcalLink} style={{ display: "inline-flex", gap: 4 }}>
                <IconSubscribe /> Abonniere unseren Vereinskalender
              </Anchor>
              , um neue Ligaspiele saisonübergreifend automatisch in deiner{" "}
              <Text fw="bold" span>
                Kalender-App
              </Text>{" "}
              zu empfangen.
            </Text>
          </Stack>
        </Card>
        <MatchesContent matches={loaderMatches} />
      </Stack>
    </PageWithHeading>
  );
}

function MatchesContent({ matches }: { matches: LeagueMatchesResponse | undefined }) {
  const currentMonth = dayjs().month() + 1;
  const isOffSeason = currentMonth >= 5 && currentMonth <= 9;

  if (matches?.matches && matches.matches.length > 0) {
    const timestampDate = matches.timestamp ? new Date(matches.timestamp) : undefined;
    return (
      <Card>
        <Title order={2}>Ligaspiele</Title>
        <Matches matches={matches.matches} timestamp={timestampDate} type="future" />
      </Card>
    );
  }

  return (
    <Fragment>
      <Card>
        <CardTitle>Keine Ligaspiele</CardTitle>
        <Text>Derzeit stehen keine weiteren Ligaspiele an.</Text>
      </Card>
      {isOffSeason && (
        <Card>
          <CardTitle>Außerhalb der Saison?</CardTitle>
          <Text>
            Die Saison im Hallenvolleyball findet in der Regel in den Monaten von September bis
            April statt. Dazwischen wird die nächste Saison vorbereitet und die neusten
            Informationen vom Südbadischen Volleyballverband wurden ggf. noch nicht veröffentlicht.
          </Text>
        </Card>
      )}
    </Fragment>
  );
}
