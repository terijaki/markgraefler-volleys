import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import HomeLiveTicker from "@webapp/components/homepage/HomeLiveTicker";
import { useHomeLiveTickerData } from "@webapp/hooks/useHomeLiveTicker";

export default function HomeHero() {
  const { ourMatches, hasMatchesToday, hasOpenMatches } = useHomeLiveTickerData();

  return (
    <Stack
      className="mv-section"
      gap="xl"
      align="stretch"
      pt="xl"
      pb="6rem"
      px={{ base: "sm", md: "xl" }}
      c="mvInk.9"
    >
      <Container size="xl" w="100%">
        <Stack gap="xl" style={{ position: "relative", zIndex: 2 }}>
          <Stack gap="md" maw={840}>
            <Stack gap="xs">
              <Title order={1}>Markgräfler Volleys</Title>
              <Title
                order={2}
                fz={{ base: 20, sm: 24 }}
                c="white"
                bg="mvPurple"
                p="xs"
                textWrap="balance"
                w="fit-content"
                maw={{ base: "20ch", xs: "100%" }}
                bd="var(--mv-border)"
                bdrs="md"
                style={{
                  transform: "rotate(-1.2deg)",
                  boxShadow: "5px 5px 0 rgba(28, 27, 31, 0.36)",
                }}
              >
                Volleyball mit Teamgeist im Markgräflerland
              </Title>
            </Stack>

            <Text size="lg" style={{ textWrap: "balance" }}>
              Wir verbinden Leistungssport und wertvolle freundschaftliche Zusammenarbeit. Werde
              Teil unserer Gemeinschaft!
            </Text>

            <Group gap="sm" wrap="wrap" hiddenFrom="md">
              <Button
                component={Link}
                to="/teams"
                variant="light"
                c="mvGreen.8"
                className="mv-focus mv-pressable"
                style={{ borderColor: "var(--mantine-color-mvInk-9)", background: "white" }}
              >
                Teams
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
                Spielplan
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
        </Stack>
      </Container>
    </Stack>
  );
}
