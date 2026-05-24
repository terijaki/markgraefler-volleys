import { AspectRatio, Box, Button, Card, Image, SimpleGrid, Stack, Text } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { Palette } from "lucide-react";
import CardTitle from "@webapp/components/CardTitle";
import PageWithHeading from "@webapp/components/layout/PageWithHeading";

export const Route = createFileRoute("/_layout/brand")({
  component: RouteComponent,
});

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
            <SimpleGrid cols={3} c="white" spacing={{ base: 4, xs: "xs" }}>
              <Text p="xs" bg="mvPurple" fw="bold">
                Primarfarbe
              </Text>
              <Text p="xs" bg="mvPurple">
                #7A58A4
              </Text>
              <Text p="xs" bg="mvPurple">
                rgb(122,88,164)
              </Text>
              <Text p="xs" bg="mvGreen" fw="bold">
                Komplementarfarbe 1
              </Text>
              <Text p="xs" bg="mvGreen">
                #2F5D1E
              </Text>
              <Text p="xs" bg="mvGreen">
                rgb(47,93,30)
              </Text>
              <Text p="xs" bg="mvSand" fw="bold" c="black">
                Komplementarfarbe 2
              </Text>
              <Text p="xs" bg="mvSand" c="black">
                #BCAF9D
              </Text>
              <Text p="xs" bg="mvSand" c="black">
                rgb(188,175,157)
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
              <Text fw="bolder">- Folgt in Kürze! -</Text>
              {/* <Text>
                Vektorgrafiken skalieren dynamisch und eigenen sich daher perfekt für den Druck oder
                die Beflockung von Trikots.
              </Text>
              <Stack align="center">
                <Box pos="relative" w="100%" maw={505} style={{ aspectRatio: "505 / 288" }}>
                  <Image src="/assets/logos/logo.svg" alt="Logo" />
                </Box>
                <Group>
                  <DownloadButton href="/assets/logos/logo.svg">Download SVG</DownloadButton>
                  <DownloadButton href="/assets/logos/logo.pdf">Download PDF</DownloadButton>
                </Group>
              </Stack> */}
            </Stack>
            <Stack>
              <CardTitle>Rastergrafik</CardTitle>
              <Text>
                Rastergrafiken haben eine feste Auflösung und das Dateiformat PNG hat eine hohe
                Kompatibilität. Diese Dateien eignen sich daher für die meisten digitalen Zwecke.
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                <Stack>
                  <Box pos="relative" w="100%" style={{ aspectRatio: "505 / 288" }}>
                    <Image src="/assets/logos/logo.png" alt="Logo" />
                  </Box>
                  <DownloadButton href="/assets/logos/logo.png">Download (Farbig)</DownloadButton>
                </Stack>
                {/* <Stack>
                  <Box pos="relative" w="100%" bg="gray" style={{ aspectRatio: "505 / 288" }}>
                    <Image src="/assets/logos/logo-schwarz.png" alt="Logo Weiß" />
                  </Box>
                  <DownloadButton href="/assets/logos/logo-schwarz.png">
                    Download (Schwarz)
                  </DownloadButton>
                </Stack> */}
              </SimpleGrid>
            </Stack>
            {/* <Stack>
              <CardTitle>Rastergrafik mit Hintergrund</CardTitle>
              <Text>Fertige Bilddateien mit weißem Logo auf farbigem Hintergrund.</Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                <Stack>
                  <Box pos="relative" w="100%" style={{ aspectRatio: "1 / 1" }}>
                    <Image src="/assets/logos/logo-flieder.png" alt="Logo Flieder" />
                  </Box>
                  <DownloadButton href="/assets/logos/logo-flieder.png">
                    Download (Flieder)
                  </DownloadButton>
                </Stack>
                <Stack>
                  <Box pos="relative" w="100%" style={{ aspectRatio: "1 / 1" }}>
                    <Image src="/assets/logos/logo-gruen.png" alt="Logo Grün" />
                  </Box>
                  <DownloadButton href="/assets/logos/logo-gruen.png">
                    Download (Grün)
                  </DownloadButton>
                </Stack>
              </SimpleGrid>
            </Stack> */}
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
