import {
  Anchor,
  Badge,
  Box,
  Card,
  Center,
  Container,
  Flex,
  Group,
  List,
  ListItem,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import dayjs from "dayjs";
import "dayjs/locale/de";
import { useMemo } from "react";
import type { LeagueMatchesResponse } from "@/lambda/sams/types";
import { getOwnedSamsTeamUuids } from "@/utils/sams";
import { useLiveTicker, useSamsMatches, useSamsTeams } from "../../hooks/dataQueries";
import MapsLink from "../MapsLink";
import ScrollAnchor from "./ScrollAnchor";

dayjs.locale("de");

const TIME_RANGE = 14; // controls the display matches taking place # days in the future
const TIME_RANGE_MAX_MULTIPLIER = 3;
const MAX_GAMES = 4;

export default function HomeHeimspiele() {
  const { data: samsTeamsData, isPending: isSamsTeamsPending } = useSamsTeams();
  const ourTeamUuids = useMemo(
    () => getOwnedSamsTeamUuids(samsTeamsData?.teams ?? []),
    [samsTeamsData?.teams],
  );

  const { data: matchesData } = useSamsMatches({
    range: "future",
    limit: 50,
  });

  // Process matches to show only home games
  const homeMatchesToDisplay = useMemo(() => {
    if (!matchesData?.matches) return [];

    const matchesAll = matchesData.matches;

    // Filter to only matches we are hosting
    const matchesHomeGames = matchesAll.filter((match) => {
      const hostUuid = match.host;
      return !!hostUuid && ourTeamUuids.has(hostUuid);
    });

    // Sort by date
    const matchesHomeGamesSorted = matchesHomeGames.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
    });

    // Count unique combination of date, location
    const uniqueHostsStrings = new Set<string>();
    const result: typeof matchesHomeGames = [];

    for (const m of matchesHomeGamesSorted) {
      const dateLocationCombi = `${m.date}${m.location?.uuid}`;
      if (
        dayjs(m.date).isBefore(dayjs().add(TIME_RANGE, "days")) &&
        (uniqueHostsStrings.size < MAX_GAMES || uniqueHostsStrings.has(dateLocationCombi))
      ) {
        uniqueHostsStrings.add(dateLocationCombi);
        result.push(m);
      }
    }

    return result;
  }, [matchesData, ourTeamUuids]);

  return (
    <Box className="mv-curve-divider mv-section">
      <ScrollAnchor name="heimspiele" />
      <Container size="xl" px={{ base: "lg", md: "xl" }} py="xl">
        <Stack gap="xl">
          <HomeMatchesList homeMatches={homeMatchesToDisplay} />

          <NoMatchesNoEvents
            matchCount={isSamsTeamsPending ? undefined : homeMatchesToDisplay.length}
          />
        </Stack>
      </Container>
    </Box>
  );
}

function HomeMatchesList({ homeMatches }: { homeMatches: LeagueMatchesResponse["matches"] }) {
  const { data: samsTeamsData } = useSamsTeams();
  const { data: tickerData } = useLiveTicker();

  if (!homeMatches || homeMatches.length === 0) return null;

  // league data so that we can get the league name from the league id
  const leagues = new Map<string, string>();
  for (const team of samsTeamsData?.teams || []) {
    if (team.leagueUuid && team.leagueName) {
      const cleanLeagueName = team.leagueName;
      leagues.set(team.leagueUuid, cleanLeagueName);
    }
  }

  // Group by date and locationUuid, then by leagueUuid
  type MatchesArray = typeof homeMatches;
  type GroupedMatches = Record<string, Record<string, MatchesArray>>;

  const groupedMatches = homeMatches.reduce<GroupedMatches>((acc, match) => {
    const dateFormatted = dayjs(match.date).format("YYYY-MM-DD");
    const locationUuid = match.location?.uuid || "unknown_location";
    const primaryKey = `${dateFormatted}_${locationUuid}`;
    const secondaryKey = match.leagueUuid || "unknown_league";
    if (!acc[primaryKey]) acc[primaryKey] = {}; // create primary key
    if (!acc[primaryKey][secondaryKey]) acc[primaryKey][secondaryKey] = []; // create secondary key
    acc[primaryKey][secondaryKey].push(match);
    return acc;
  }, {});

  return (
    <Stack>
      <Stack gap={4} align="center">
        <Title order={2}>
          {homeMatches.length > 0 ? "Nächste Heimspieltage" : "Bevorstehende Veranstaltungen"}
        </Title>
        <Text c="mvInk.9" ta="center" maw={760}>
          In den kommenden Tagen spielen wir in Müllheim/Staufen und freuen uns auf lautstarke
          Unterstützung.
        </Text>
      </Stack>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        {Object.entries(groupedMatches).map(([dateLocationKey, leagueGroups]) => {
          const [date, _locationUuid] = dateLocationKey.split("_");
          const firstLeagueMatches = Object.values(leagueGroups)[0];
          const location = firstLeagueMatches?.[0]?.location;

          // Check if any match in this card group is currently live
          const allMatchesInCard = Object.values(leagueGroups).flat() as MatchesArray;
          const isCardLive = allMatchesInCard.some((match) => {
            const t1 = match._embedded?.team1?.uuid;
            const t2 = match._embedded?.team2?.uuid;
            return tickerData?.liveMatches.some(
              (lm) =>
                lm.state.started &&
                !lm.state.finished &&
                ((lm.team1Uuid === t1 && lm.team2Uuid === t2) ||
                  (lm.team1Uuid === t2 && lm.team2Uuid === t1)),
            );
          });

          // NEW CARD PER DATE AND LOCATION COMBO
          return (
            <Card key={dateLocationKey} className="mv-pressable" bg="white" c="mvInk.9">
              <Stack>
                <Flex
                  direction={{ base: "column", sm: "row" }}
                  justify="space-between"
                  align={{ base: "flex-start", sm: "center" }}
                  columnGap="sm"
                >
                  <Group gap="xs">
                    <time dateTime={date}>
                      <Text c="mvPurple.8" fw="bold">
                        {dayjs(date).format("dddd, D MMMM YY")}
                      </Text>
                    </time>
                    {isCardLive && (
                      <Badge
                        color="red"
                        variant="filled"
                        size="sm"
                        style={{ border: "2px solid var(--mantine-color-mvInk-9)" }}
                      >
                        LIVE
                      </Badge>
                    )}
                  </Group>
                  <MapsLink
                    name={location?.name}
                    street={location?.address?.street}
                    postal={location?.address?.postcode}
                    city={location?.address?.city}
                  />
                </Flex>
                {Object.entries(leagueGroups).map(([leagueUuid, matches]) => {
                  const leagueName = leagues.get(leagueUuid);
                  const matchesArray = matches as MatchesArray;
                  const earliestStartTime = matchesArray.reduce((earliest, match) => {
                    const currentTime = dayjs(match.time, "HH:mm");
                    return currentTime.isBefore(dayjs(earliest, "HH:mm")) ? match.time : earliest;
                  }, matchesArray[0]?.time);

                  // NEW STACK PER LEAGUE (INSIDE THE DATE AND LOCATION CARD)
                  return (
                    <Stack key={leagueUuid} gap={0}>
                      {/* LEAGUE NAME AND TIME */}
                      <Group gap="xs">
                        {leagueName && (
                          <Text fw="bold" c="mvGreen.8">
                            {leagueName}
                          </Text>
                        )}
                        {earliestStartTime && earliestStartTime === "00:00" ? (
                          <Text>(Uhrzeit folgt)</Text>
                        ) : (
                          <Text>ab {earliestStartTime} Uhr</Text>
                        )}
                      </Group>
                      {/* GUESTS LIST */}
                      <List spacing={0} withPadding listStyleType="none">
                        {matchesArray.map((match) => {
                          const matchTeams = [match._embedded?.team1, match._embedded?.team2];
                          const guests = matchTeams.filter((t) => t?.uuid !== match.host);
                          // display the guest team
                          return (
                            <ListItem key={guests[0]?.uuid} opacity={0.8}>
                              {guests[0]?.name}
                            </ListItem>
                          );
                        })}
                      </List>
                    </Stack>
                  );
                })}
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>
      <Center my="md">
        <Text c="mvInk.9">
          Auswärtsspiele findest du im Spielplan der jeweiligen Mannschaft. <LinkToEventsPage />
        </Text>
      </Center>
    </Stack>
  );
}

function NoMatchesNoEvents({ matchCount = 0 }: { matchCount?: number }) {
  if (matchCount === undefined) return null;
  if (matchCount > 0) return null;

  const weeksCount = Math.round((TIME_RANGE * TIME_RANGE_MAX_MULTIPLIER) / 7);

  return (
    <Container py="md" size="lg">
      <Stack c="mvInk.9" gap="xs" p="lg" bg="white">
        <Title
          order={3}
          c="mvGreen.8"
          style={{ fontSize: "clamp(1.2rem, 2vw, 1.55rem)", lineHeight: 1.12 }}
        >
          Zunächst keine Heimspiele
        </Title>
        <Text size="lg">
          In den kommenden {weeksCount} Wochen stehen keine Spiele in Müllheim an.
          {matchCount >= 1 && (
            <Text span>
              {" "}
              {matchCount === 1
                ? "Ein weiteres Spiel zu einem späteren Zeitpunkt findest du"
                : `${matchCount} weitere Spiele zu einem späteren Zeitpunkt findest du`}
              <LinkToEventsPage />
            </Text>
          )}
        </Text>

        {matchCount >= 1 && (
          <Text>
            Auswärtsspiele findest du im Spielplan der jeweiligen Mannschaft.
            <Text span>
              {" "}
              {matchCount === 1
                ? "Ein weiteres Spiel findest du"
                : `${matchCount} weitere Spiele unserer Mannschaften findest du`}
            </Text>
            <LinkToEventsPage />
          </Text>
        )}
      </Stack>
    </Container>
  );
}

function LinkToEventsPage() {
  return (
    <Text span>
      <Text span>» </Text>
      <Anchor href="/matches" fw="bold" c="mvGreen.8">
        hier
      </Anchor>
      <Text span> «</Text>
    </Text>
  );
}
