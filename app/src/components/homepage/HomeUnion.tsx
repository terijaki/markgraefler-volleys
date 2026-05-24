import { Anchor, Box, Card, Container, Group, Stack, Text, Title } from "@mantine/core";
import { ExternalLink } from "lucide-react";

export default function HomeUnion() {
  return (
    <Box className="mv-section">
      <Container size="xl" py="xl" px={{ base: "lg", md: "xl" }}>
        <Card>
          <Stack gap="xs">
            <Title order={3}>Eine starke Gemeinschaft</Title>
            <Text>
              Die Markgräfler Volleys sind eine 2026 gegründete Spielgemeinschaft aus den Vereinen
              VC Müllheim und TV Staufen und beinhaltet aktuell die Herrenmannschaften beider
              Vereine. Auf dieser Webseite erhaltet ihr alle Informationen zu unseren Mannschaften,
              Spielplänen, Ergebnissen und mehr. Wir freuen uns über euer Interesse und hoffen, euch
              bald bei einem unserer Heimspiele begrüßen zu dürfen!
            </Text>
            <Text>
              Auf den Webseiten der Vereine erfährst du mehr über die Geschichte, Satzungen und
              Organe der Vereine:
            </Text>
            <Group>
              <Anchor href="https://www.vcmuellheim.de" target="_blank" rel="noopener">
                VC Müllheim <ExternalLink size={14} />
              </Anchor>
              <Anchor href="https://volleyball.tvstaufen.de" target="_blank" rel="noopener">
                TV Staufen <ExternalLink size={14} />
              </Anchor>
            </Group>
          </Stack>
        </Card>
      </Container>
    </Box>
  );
}
