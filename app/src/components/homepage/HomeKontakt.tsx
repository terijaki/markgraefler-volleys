import {
  Anchor,
  Box,
  Card,
  Center,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import type { HTMLAttributeAnchorTarget } from "react";
import SectionHeading from "../layout/SectionHeading";
import ScrollAnchor from "./ScrollAnchor";

export default function HomeKontakt() {
  return (
    <Center className="mv-section">
      <ScrollAnchor name="kontakt" />
      <Container size="xl" px={{ base: "lg", md: "xl" }} py="xl">
        <Stack gap="xl" className="mv-card" p="lg" bg="white">
          <Stack gap={0}>
            <SectionHeading text="Kontakt" color="mvGreen" />
            <Center>
              <Text component="div" size="sm" c="mvInk.9">
                Zögere bitte nicht. Solltest du Fragen an uns haben, oder Interesse mit uns zu
                trainieren, dann melde dich bei uns!
              </Text>
            </Center>
          </Stack>
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="lg" verticalSpacing="lg">
            <ContactItem title="Probetraining">
              <Text component="div" size="sm">
                Melde dich bitte beim jeweiligen Trainer oder bei der Ansprechperson deines Teams.
              </Text>
            </ContactItem>
            <ContactItem title="Branding">
              <Text component="div" size="sm">
                Farben und Logo Dateien findest du im{" "}
                <ContactRouteLink to="/brand" label="Brand Guide" />
              </Text>
            </ContactItem>

            <ContactItem title="Allgemeine Anfragen">
              <Text component="div" size="sm">
                Für alle sonstigen Anfragen nutze gerne unseren Mailverteiler{" "}
                <ContactLink
                  href={"mailto:info@markgraefler-volleys.de"}
                  target={"_blank"}
                  label="info@markgraefler-volleys.de"
                  icon={<Mail />}
                />
              </Text>
            </ContactItem>
          </SimpleGrid>
        </Stack>
      </Container>
    </Center>
  );
}

function ContactItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mv-card mv-pressable" bg="white">
      <Stack gap={0}>
        <Title order={5}>{title}</Title>
        <Box>{children}</Box>
      </Stack>
    </Card>
  );
}

function ContactRouteLink({ to, label }: { to: "/brand"; label: string }) {
  return (
    <Anchor
      component={Link}
      to={to}
      display="inline-block"
      underline="never"
      c="mvGreen.8"
      fw={700}
    >
      <Group gap={4} align="baseline">
        <Text>{label}</Text>
      </Group>
    </Anchor>
  );
}

function ContactLink({
  href,
  target,
  label,
  icon,
}: {
  href: string;
  target?: HTMLAttributeAnchorTarget;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <Anchor
      href={href}
      target={target}
      display="inline-block"
      underline="never"
      rel={target ? "noopener noreferrer" : undefined}
      c="mvGreen.8"
      fw={700}
    >
      <Group gap={4} align="baseline">
        {icon}
        <Text>{label}</Text>
      </Group>
    </Anchor>
  );
}
