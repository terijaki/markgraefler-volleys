import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import HomeInstagram from "@webapp/components/homepage/HomeInstagram";
import HomeIntro from "@webapp/components/homepage/HomeIntro";
import HomeLiveTicker from "@webapp/components/homepage/HomeLiveTicker";
import HomeSponsors from "@webapp/components/homepage/HomeSponsors";
import { useHomeLiveTickerData } from "@webapp/hooks/useHomeLiveTicker";
import { getInstagramPostsFn } from "@webapp/server/functions/social";

export const Route = createFileRoute("/_layout/")({
  loader: async () => {
    const instagramPosts = await getInstagramPostsFn();

    return { instagramPosts };
  },
  component: HomePage,
});

function HomePage() {
  const { instagramPosts } = Route.useLoaderData();
  const { ourMatches, hasMatchesToday, hasOpenMatches } = useHomeLiveTickerData();

  const introContent = (
    <Stack gap="xl" style={{ position: "relative", zIndex: 2 }}>
      <Stack gap="md" maw={840}>
        {/* <Group gap="xs">
          <Badge
            bg="mvPurple.6"
            c="white"
            variant="filled"
            radius="xl"
            style={{ width: "fit-content", border: "2px solid var(--mantine-color-mvInk-9)" }}
          >
            VC Müllheim
          </Badge>
          <Badge
            bg="mvPurple.6"
            c="white"
            variant="filled"
            radius="xl"
            style={{ width: "fit-content", border: "2px solid var(--mantine-color-mvInk-9)" }}
          >
            TV Staufen
          </Badge>
        </Group> */}

        <Stack gap={0}>
          <Title order={1}>Markgräfler Volleys</Title>
          <Title order={2} c="mvInk">
            Volleyball mit Teamgeist im Markgräflerland
          </Title>
        </Stack>

        <Text size="lg" style={{ textWrap: "balance" }}>
          Wir verbinden Leistungssport und wertvolle freundschaftliche Zusammenarbeit. Werde Teil
          unserer Gemeinschaft!
        </Text>

        <Group gap="sm" wrap="wrap">
          <Button
            component={Link}
            to="/teams"
            variant="light"
            c="mvGreen.8"
            className="mv-focus mv-pressable"
            style={{ borderColor: "var(--mantine-color-mvInk-9)", background: "white" }}
          >
            Mannschaften
          </Button>
          <Button
            component={Link}
            to="/tabelle"
            variant="light"
            c="mvGreen.8"
            className="mv-focus mv-pressable"
            style={{ borderColor: "var(--mantine-color-mvInk-9)", background: "white" }}
          >
            Tabellen
          </Button>
          <Button
            component={Link}
            to="/matches"
            variant="light"
            c="mvGreen.8"
            className="mv-focus mv-pressable"
            style={{ borderColor: "var(--mantine-color-mvInk-9)", background: "white" }}
          >
            Spielpläne
          </Button>
        </Group>
      </Stack>

      {hasMatchesToday && (
        <Stack gap="sm">
          <Text fw={800} c="mvGreen.8" size="lg">
            {hasOpenMatches ? "Unsere Teams spielen gerade" : "Heute gespielt"}
          </Text>
          <HomeLiveTicker matches={ourMatches} />
        </Stack>
      )}

      {!hasMatchesToday && null}
    </Stack>
  );

  return (
    <Stack gap={0} align="stretch">
      <HomeIntro introContent={introContent} />
      <HomeSponsors />
      <HomeInstagram posts={instagramPosts} />
    </Stack>
  );
}
