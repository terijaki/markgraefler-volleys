import { Anchor, Box, Container, Flex, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { Club } from "@project.config";
import Socials from "./Socials";
import { FaRegEnvelope } from "react-icons/fa6";

const legals = [
  { name: "Datenschutz", url: "/datenschutz" },
  { name: "Impressum", url: "/impressum" },
];
const infos = [
  { name: "Funktionäre", url: "/member" },
  { name: "Brand & Logos", url: "/brand" },
];

export default function Footer() {
  return (
    <Container fluid m={0} py="xl" px={0} className="mv-curve-divider" id="kontakt">
      <Container size="xl" px={{ base: "lg", md: "xl" }}>
        <Box className="mv-card" p="lg" bg="white">
          <Stack gap="xl">
            <Stack gap={4}>
              <Title order={4} c="mvPurple.8">
                {Club.shortName}
              </Title>
              <Text size="sm">Eine Spielgemeinschaft des VC Müllheim und TV Staufen.</Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="xl">
              <Stack gap="xs">
                <Text fw={800} c="mvGreen.8">
                  Kontakt
                </Text>
                <Anchor size="sm" c="mvInk.9" underline="never">
                  <Group gap={6}>
                    <FaRegEnvelope />
                    <Text>{Club.email}</Text>
                  </Group>
                </Anchor>
                {Socials().map((social) => (
                  <Anchor key={social.name} {...social} size="sm" c="mvInk.9" underline="never">
                    <Group gap={6}>
                      {social.icon}
                      <Text>{social.name}</Text>
                    </Group>
                  </Anchor>
                ))}
              </Stack>

              <Stack gap="xs">
                <Text fw={800} c="mvGreen.8">
                  Info
                </Text>
                <Flex
                  columnGap="sm"
                  rowGap="xs"
                  wrap="wrap"
                  direction={{ base: "row", sm: "column" }}
                >
                  {infos.map((legal) => (
                    <Anchor
                      key={legal.name}
                      href={legal.url}
                      size="sm"
                      c="mvInk.9"
                      underline="never"
                    >
                      {legal.name}
                    </Anchor>
                  ))}
                </Flex>
              </Stack>

              <Stack gap="xs">
                <Text fw={800} c="mvGreen.8">
                  Rechtliches
                </Text>
                <Flex
                  columnGap="sm"
                  rowGap="xs"
                  wrap="wrap"
                  direction={{ base: "row", sm: "column" }}
                >
                  {legals.map((legal) => (
                    <Anchor
                      key={legal.name}
                      href={legal.url}
                      size="sm"
                      c="mvInk.9"
                      underline="never"
                    >
                      {legal.name}
                    </Anchor>
                  ))}
                </Flex>
              </Stack>
            </SimpleGrid>
          </Stack>
        </Box>
      </Container>
    </Container>
  );
}
