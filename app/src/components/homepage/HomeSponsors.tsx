import type { Sponsor } from "@lib/db/types";
import {
  Anchor,
  Box,
  Button,
  Card,
  Flex,
  Group,
  Image,
  Loader,
  Marquee,
  Stack,
  Text,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Club } from "@project.config";
import { useFileUrl, useSponsors } from "../../hooks/dataQueries";
import SectionHeading from "../layout/SectionHeading";

export default function HomeSponsors({ showFallback }: { showFallback?: boolean }) {
  const { data } = useSponsors();
  const sponsors = data?.items || [];
  if (sponsors.length === 0 && !showFallback) return null;

  return (
    <Stack mb="md" gap={0}>
      <SectionHeading text={sponsors.length === 1 ? "Sponsor" : "Sponsoren"} color="mvGreen" />
      <Sponsors sponsors={sponsors} showFallback={showFallback} />
    </Stack>
  );
}

function Sponsors({ sponsors, showFallback }: { sponsors: Sponsor[]; showFallback?: boolean }) {
  const isMobile = useMediaQuery("(max-width: 64em)");
  const isTablet = useMediaQuery("(max-width: 74em)");
  const shouldUseMarquee =
    (isMobile && sponsors.length > 1) || (isTablet && sponsors.length > 3) || sponsors.length > 4;

  if (showFallback && (!sponsors || sponsors.length === 0))
    return (
      <Stack justify="center" align="center">
        <Text style={{ textWrap: "balance" }} ta="center">
          Um möglichst viele gemeinnützige Aktivitäten für alle Altersbereiche anbieten zu können,
          suchen wir Sponsoring-Partnerschaften.
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
    );

  return (
    <Stack align="stretch">
      <Text ta="center">
        Wir bedanken uns herzlich bei{" "}
        {sponsors.length === 1 ? "unserem Sponsor" : "unseren Sponsoren"}!
      </Text>
      {shouldUseMarquee ? (
        <Marquee gap="xl" fadeEdges={true} fadeEdgeColor="var(--mantine-color-mvBg-6)">
          {sponsors.map((sponsor) => (
            <SponsorCard sponsor={sponsor} key={sponsor.id} />
          ))}
        </Marquee>
      ) : (
        <Group gap="xl" w="100%" justify="space-between" align="center">
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
    <Card.Section withBorder mb="xs">
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
    </Card.Section>
  );

  const content = (
    <Card className="mv-pressable">
      {visual}
      {description ? (
        <Text
          size="sm"
          c="mvInk.9"
          ta="center"
          style={{ textWrap: "balance", minHeight: "3.3em" }}
          lineClamp={2}
          w={220}
          fw={500}
        >
          {description}
        </Text>
      ) : null}
    </Card>
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
