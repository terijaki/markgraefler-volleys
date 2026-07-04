import { Anchor, Card, Flex, Group, Stack, Text, Title } from "@mantine/core";
import { Club } from "@project.config";
import { Link } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import type { ReactNode } from "react";
import Socials from "./Socials";

type FooterLinkBase = {
  name: string;
  icon?: ReactNode;
};

type FooterHrefLink = FooterLinkBase & {
  kind: "href";
  href: string;
  target?: string;
  rel?: string;
};

type FooterRouteLink = FooterLinkBase & {
  kind: "route";
  to: LinkProps["to"];
};

type FooterLink = FooterHrefLink | FooterRouteLink;

const socialLinks: FooterHrefLink[] = Socials().map(
  (social): FooterHrefLink => ({
    kind: "href",
    name: social.name,
    href: social.href,
    icon: social.icon,
    target: social.target,
    rel: social.rel,
  }),
);

const contactLinks = [
  {
    kind: "href",
    name: Club.email,
    href: `mailto:${Club.email}`,
    icon: <Mail />,
  },
  ...socialLinks,
] satisfies FooterLink[];

const infoLinks = [
  {
    kind: "route",
    name: "Funktionäre",
    to: "/member",
  },
  {
    kind: "route",
    name: "Brand & Logos",
    to: "/brand",
  },
] satisfies FooterRouteLink[];

const legalLinks = [
  {
    kind: "route",
    name: "Datenschutz",
    to: "/datenschutz",
  },
  {
    kind: "route",
    name: "Impressum",
    to: "/impressum",
  },
] satisfies FooterRouteLink[];

type FooterSectionProps = {
  title: string;
  links: FooterLink[];
};

function FooterSection({ title, links }: FooterSectionProps) {
  return (
    <Stack gap={4}>
      <Text fw={800} c="mvGreen.8">
        {title}
      </Text>
      <Flex columnGap="sm" rowGap={4} wrap="wrap" direction={{ base: "row", sm: "column" }}>
        {links.map((link) => {
          const label = link.icon ? (
            <Group gap={6} wrap="nowrap">
              {link.icon}
              <Text style={{ textWrap: "nowrap" }}>{link.name}</Text>
            </Group>
          ) : (
            link.name
          );

          if (link.kind === "href") {
            return (
              <Anchor
                key={link.name}
                href={link.href}
                target={link.target}
                rel={link.rel}
                size="sm"
                c="mvInk.9"
                underline="never"
              >
                {label}
              </Anchor>
            );
          }

          return (
            <Anchor
              key={link.name}
              component={Link}
              to={link.to}
              size="sm"
              c="mvInk.9"
              underline="never"
            >
              {label}
            </Anchor>
          );
        })}
      </Flex>
    </Stack>
  );
}

export default function Footer() {
  return (
    <Card>
      <Stack gap="md">
        <Stack gap={4}>
          <Title order={4} c="mvPurple.8">
            {Club.shortName}
          </Title>
          <Text size="sm">Eine Spielgemeinschaft des VC Müllheim und TV Staufen.</Text>
        </Stack>

        <Flex justify="flex-start" columnGap="xl" rowGap="md" direction="row" wrap="wrap">
          <FooterSection title="Kontakt" links={contactLinks} />
          <FooterSection title="Info" links={infoLinks} />
          <FooterSection title="Rechtliches" links={legalLinks} />
        </Flex>
      </Stack>
    </Card>
  );
}
