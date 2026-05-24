import type { Sponsor } from "@lib/db/types";
import {
  Anchor,
  Box,
  Button,
  Container,
  Flex,
  Group,
  Image,
  Loader,
  Marquee,
  Stack,
  Text,
} from "@mantine/core";
import { Club } from "@project.config";
import { useFileUrl, useSponsors } from "../../hooks/dataQueries";
import SectionHeading from "../layout/SectionHeading";
import ScrollAnchor from "./ScrollAnchor";

export default function HomeSponsors({ showFallback }: { showFallback?: boolean }) {
  const { data } = useSponsors();
  const sponsors = data?.items || [];
  if (sponsors.length === 0 && !showFallback) return null;

  return (
    <Box className="mv-section">
      <ScrollAnchor name="sponsors" />
      <Container size="xl" py="xl" px={{ base: "lg", md: "xl" }}>
        <Stack gap="xs" className="mv-card" p="lg" bg="white">
          <SectionHeading text={sponsors.length === 1 ? "Sponsor" : "Sponsoren"} color="mvGreen" />
          <Sponsors sponsors={sponsors} showFallback={showFallback} />
        </Stack>
      </Container>
    </Box>
  );
}

function Sponsors({ sponsors, showFallback }: { sponsors: Sponsor[]; showFallback?: boolean }) {
  if (showFallback && (!sponsors || sponsors.length === 0))
    return (
      <Container size="sm">
        <Stack justify="center" align="center">
          <Text style={{ textWrap: "balance" }} ta="center">
            Um moeglichst viele gemeinnuetzige Aktivitaeten fuer alle Altersbereiche anbieten zu
            koennen, suchen wir Sponsoring-Partnerschaften.
          </Text>
          <Box>
            <Button
              component="a"
              href={`mailto:philipp@markgraefler-volleys.de?subject=Sponsoring ${Club.shortName}`}
              variant="white"
              className="mv-focus mv-pressable"
            >
              Förderverein kontaktieren
            </Button>
          </Box>
        </Stack>
      </Container>
    );

  return (
    <Stack align="center">
      <Text>
        Wir bedanken uns herzlich bei{" "}
        {sponsors.length === 1 ? "unserem Sponsor" : "unseren Sponsoren"}!
      </Text>
      {sponsors.length > 2 ? (
        <Marquee
          gap="xl"
          fadeEdges={false}
          styles={{
            root: {
              marginInline: "calc(var(--mantine-spacing-lg) * -1)",
              width: "calc(100% + var(--mantine-spacing-lg) * 2)",
            },
            content: {
              paddingBlock: "10px",
            },
            group: {
              paddingBlock: "10px",
            },
          }}
        >
          {sponsors.map((sponsor) => (
            <SponsorCard sponsor={sponsor} key={sponsor.id} />
          ))}
        </Marquee>
      ) : (
        <Group gap="xl" align="flex-start" justify="center">
          {sponsors.map((sponsor) => (
            <SponsorCard sponsor={sponsor} key={sponsor.id} />
          ))}
        </Group>
      )}
    </Stack>
  );
}

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const { name, description, logoS3Key, websiteUrl } = sponsor;
  const { data: logoUrl, isLoading } = useFileUrl(logoS3Key);

  if (!name) return null;

  if (isLoading) {
    return (
      <Stack w={220} maw={"50vw"} gap={6} align="center">
        <Flex w="100%" mih={104} px="md" py="sm" align="center" justify="center">
          <Loader color="mvPurple.6" />
        </Flex>
      </Stack>
    );
  }

  const visual = (
    <Flex
      w="100%"
      mih={104}
      px="md"
      py="sm"
      maw="100%"
      align="center"
      justify="center"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, white 70%, transparent) 0%, color-mix(in srgb, var(--mantine-color-mvSand-5) 10%, transparent) 100%)",
      }}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={`${name}`}
          style={{ width: "100%", height: "100%", maxHeight: "88px", objectFit: "contain" }}
        />
      ) : (
        <Text size="xl" c="mvInk.9" fw="bolder" ta="center">
          {name}
        </Text>
      )}
    </Flex>
  );

  const content = (
    <Stack
      w={220}
      maw={"50vw"}
      gap="sm"
      align="center"
      justify="flex-start"
      className="mv-card mv-pressable"
      p="md"
      bg="white"
    >
      {visual}
      {description ? (
        <Text
          size="sm"
          c="mvInk.9"
          maw="100%"
          ta="center"
          style={{ textWrap: "balance", minHeight: "3.3em" }}
          lineClamp={2}
        >
          {description}
        </Text>
      ) : null}
    </Stack>
  );

  if (websiteUrl) {
    return (
      <Anchor
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        c="inherit"
        underline="never"
        display="block"
        className="mv-focus"
      >
        {content}
      </Anchor>
    );
  }

  return content;
}
