import {
  AspectRatio,
  Box,
  Button,
  Card,
  Divider,
  Image,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { Palette } from "lucide-react";
import CardTitle from "@webapp/components/CardTitle";
import PageWithHeading from "@webapp/components/layout/PageWithHeading";

export const Route = createFileRoute("/_layout/brand")({
  component: RouteComponent,
});

const colors = {
  primary: {
    name: "Violett",
    hex: "#7A58A4",
    rgb: "rgb(122,88,164)",
  },
  complementary1: {
    name: "Olive",
    hex: "#2F5D1E",
    rgb: "rgb(47,93,30)",
  },
  complementary2: {
    name: "Beige",
    hex: "#BCAF9D",
    rgb: "rgb(188,175,157)",
  },
};

function RouteComponent() {
  return (
    <PageWithHeading
      title="Brand Guide"
      subtitle="Unsere Farben und Logos zum Downloaden und Nachbestellen von Trikots"
      icon={Palette}
    >
      <Stack>
        {/* colors */}
        <Card>
          <Stack>
            <Text>
              Unsere Farben werden hier auf der Webseite verwendet und sollten wenn möglich auch in
              anderem Kontext verwendet werden.
            </Text>
            <Stack hiddenFrom="sm" gap="xs">
              <Stack bg="mvPurple" p="xs" gap={0} bdrs="xs" c="white">
                <Text fw="bold">{colors.primary.name}</Text>
                <Text>{colors.primary.hex}</Text>
                <Text>{colors.primary.rgb}</Text>
              </Stack>
              <Stack bg="mvGreen" p="xs" gap={0} bdrs="xs" c="white">
                <Text fw="bold">{colors.complementary1.name}</Text>
                <Text>{colors.complementary1.hex}</Text>
                <Text>{colors.complementary1.rgb}</Text>
              </Stack>
              <Stack bg="mvSand" p="xs" gap={0} bdrs="xs">
                <Text fw="bold">{colors.complementary2.name}</Text>
                <Text>{colors.complementary2.hex}</Text>
                <Text>{colors.complementary2.rgb}</Text>
              </Stack>
            </Stack>
            <SimpleGrid cols={3} c="white" spacing={{ base: 4, xs: "xs" }} visibleFrom="sm">
              <Text p="xs" bg="mvPurple" fw="bold">
                {colors.primary.name}
              </Text>
              <Text p="xs" bg="mvPurple">
                {colors.primary.hex}
              </Text>
              <Text p="xs" bg="mvPurple">
                {colors.primary.rgb}
              </Text>
              <Text p="xs" bg="mvGreen" fw="bold">
                {colors.complementary1.name}
              </Text>
              <Text p="xs" bg="mvGreen">
                {colors.complementary1.hex}
              </Text>
              <Text p="xs" bg="mvGreen">
                {colors.complementary1.rgb}
              </Text>
              <Text p="xs" bg="mvSand" fw="bold" c="black">
                {colors.complementary2.name}
              </Text>
              <Text p="xs" bg="mvSand" c="black">
                {colors.complementary2.hex}
              </Text>
              <Text p="xs" bg="mvSand" c="black">
                {colors.complementary2.rgb}
              </Text>
            </SimpleGrid>
          </Stack>
        </Card>
        {/* logos */}
        <Card>
          <Stack gap="xl">
            <Stack>
              <CardTitle>Vektorgrafik</CardTitle>
              <Text>
                Vektorgrafiken skalieren dynamisch und eigenen sich daher perfekt für den Druck oder
                die Beflockung von Trikots.
              </Text>
              <Stack align="center">
                <Box pos="relative" w="100%" maw={505}>
                  <Image src="/assets/logos/logo.svg" alt="Logo" />
                </Box>
                <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
                  <DownloadButton href="/assets/logos/logo.svg">Farbig</DownloadButton>
                  <DownloadButton href="/assets/logos/logo-black.svg">Schwarz</DownloadButton>
                  <DownloadButton href="/assets/logos/logo-white.svg">Weiß</DownloadButton>
                </SimpleGrid>
              </Stack>
            </Stack>
            <Divider m="lg" />
            <Stack>
              <CardTitle>Rastergrafik</CardTitle>
              <Text>
                Rastergrafiken haben eine feste Auflösung und das Dateiformat PNG hat eine hohe
                Kompatibilität. Diese Dateien eignen sich daher für die meisten digitalen Zwecke.
              </Text>

              <Stack align="center">
                <Box pos="relative" w="100%" maw={505}>
                  <Image src="/assets/logos/logo.png" alt="Logo" />
                </Box>
                <DownloadButton href="/assets/logos/logo.png">Download PNG</DownloadButton>
              </Stack>
            </Stack>
            <Stack>
              <CardTitle>Rastergrafik mit Hintergrund</CardTitle>
              <Text>Fertige Bilddateien mit Logo auf farbigem Hintergrund.</Text>
              <Stack align="center">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <Stack maw={505}>
                    <Box pos="relative" w="100%">
                      <Image src="/assets/logos/white-on-purple.png" alt="Logo Flieder" />
                    </Box>
                    <DownloadButton href="/assets/logos/white-on-purple.png">
                      Download (Violett)
                    </DownloadButton>
                  </Stack>
                  <Stack maw={505}>
                    <Box pos="relative" w="100%">
                      <Image src="/assets/logos/white-on-olive.png" alt="Logo Olive" />
                    </Box>
                    <DownloadButton href="/assets/logos/white-on-olive.png">
                      Download (Olivgrün)
                    </DownloadButton>
                  </Stack>
                  {/* <Stack maw={505}>
                    <Box pos="relative" w="100%" >
                      <Image src="/assets/logos/black-on-beige.png" alt="Logo Farbig" />
                    </Box>
                    <DownloadButton href="/assets/logos/black-on-beige.png">
                      Download (Beige)
                    </DownloadButton>
                  </Stack> */}
                </SimpleGrid>
              </Stack>
            </Stack>
          </Stack>
        </Card>
        {/* jerseys */}
        <Card>
          <Stack>
            <CardTitle>Trikots</CardTitle>
            <Text>
              <Text span fw="bold">
                Farbe:{" "}
              </Text>
              Damit wir Mannschafts- und Jahrgangsübergreifend geschlossen als Verein auftreten
              können, sollten Trikots in einer Farbe bestellt werden, die der Vereinsfarbe{" "}
              <Text span bg="mvPurple" c="white">
                #7A58A4
              </Text>{" "}
              ähnelt. Violett- oder Lila-Töne sind beispielsweise Farben, die von
              Sportartikelherstellern oft angeboten werden.
            </Text>
            <Stack gap="xs">
              <Text span fw="bold">
                Beispiele:
              </Text>

              <AspectRatio ratio={6 / 4}>
                <Image src="/assets/brand/jersey1.jpg" alt="Logo" style={{ objectFit: "cover" }} />
              </AspectRatio>
              {/* <SimpleGrid spacing="xs" cols={{ base: 1, sm: 2 }}>
                <AspectRatio ratio={6 / 4}>
                  <Image
                    width={600}
                    height={400}
                    src="/assets/brand/jersey1.jpg"
                    alt="Logo"
                    style={{ objectFit: "cover" }}
                  />
                </AspectRatio>
                <AspectRatio ratio={6 / 4}>
                  <Image
                    width={600}
                    height={400}
                    src="/assets/brand/jersey2.jpg"
                    alt="Logo"
                    style={{ objectFit: "cover" }}
                  />
                </AspectRatio>
              </SimpleGrid> */}
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </PageWithHeading>
  );
}

function DownloadButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button component="a" href={href} download variant="light">
      {children}
    </Button>
  );
}
