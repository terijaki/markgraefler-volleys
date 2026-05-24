import { Anchor, Card, Stack, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import CardTitle from "@webapp/components/CardTitle";
import PageWithHeading from "@webapp/components/layout/PageWithHeading";
import Matches from "@webapp/components/Matches";
import { getSamsMatchesFn } from "@webapp/server/functions/sams";
import { createWebcalLink } from "@webapp/utils/webcal";
import dayjs from "dayjs";
import { CalendarDays, Megaphone as IconSubscribe } from "lucide-react";
import { Fragment } from "react";

export const Route = createFileRoute("/_layout/matches/")({
  loader: async () => {
    const [matchesResult] = await Promise.allSettled([
      getSamsMatchesFn({ data: { range: "future" } }),
    ]);
    const matches = matchesResult.status === "fulfilled" ? matchesResult.value : null;

    return { matches, matchesError: matchesResult.status === "rejected" };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { matches, matchesError } = Route.useLoaderData();
  const webcalLink = createWebcalLink("/ics/all.ics");

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
        <MatchesContent matches={matches} error={matchesError} />
      </Stack>
    </PageWithHeading>
  );
}

function MatchesContent({
  matches,
  error,
}: {
  matches: Awaited<ReturnType<typeof getSamsMatchesFn>> | null;
  error: boolean;
}) {
  const currentMonth = dayjs().month() + 1;
  const isOffSeason = currentMonth >= 5 && currentMonth <= 9;

  if (error) {
    return (
      <Card>
        <CardTitle>Fehler beim Laden der SBVV Ligaspiele</CardTitle>
        <Text>Die Ligaspiele konnten nicht geladen werden. Bitte versuche es später erneut.</Text>
      </Card>
    );
  }

  if (matches?.matches && matches.matches.length > 0) {
    const timestampDate = matches.timestamp ? new Date(matches.timestamp) : undefined;
    return (
      <Card>
        <Title order={2}>Ligaspiele</Title>
        <Matches matches={matches.matches} timestamp={timestampDate} type="future" />
      </Card>
    );
  }

  // Fallback when no matches
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
