import { Button, Group, Space, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import HomeLiveTicker from "@webapp/components/homepage/HomeLiveTicker";
import { useHomeLiveTickerData } from "@webapp/hooks/useHomeLiveTicker";

type HeroLinkButtonProps = {
  to: ComponentProps<typeof Link>["to"];
  children: ReactNode;
};

function HeroLinkButton({ to, children }: HeroLinkButtonProps) {
  return (
    <Button component={Link} to={to} variant="subtle" className="mv-focus mv-pressable">
      {children}
    </Button>
  );
}

export default function HomeHero() {
  const { ourMatches, hasMatchesToday, hasOpenMatches } = useHomeLiveTickerData();
  const heroLinks = [
    { to: "/teams", label: "Teams" },
    { to: "/tabelle", label: "Tabellen" },
    { to: "/matches", label: "Spielplan" },
  ] as const;

  return (
    <Stack
      className="mv-section"
      gap="xl"
      align="stretch"
      px={{ base: "sm", md: "xl" }}
      mb="xl"
      c="mvInk.9"
    >
      <Space h="lg" visibleFrom="sm" />
      <Stack gap="md" maw={840}>
        <Stack gap="xs">
          <Space h="xl" hiddenFrom="sm" />
          <Title order={1} visibleFrom="sm">
            Markgräfler Volleys
          </Title>
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
          Wir verbinden Leistungssport und wertvolle freundschaftliche Zusammenarbeit. Werde Teil
          unserer Gemeinschaft!
        </Text>

        <Group gap="sm" wrap="wrap" hiddenFrom="md">
          {heroLinks.map((link) => (
            <HeroLinkButton key={link.to} to={link.to}>
              {link.label}
            </HeroLinkButton>
          ))}
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
  );
}
