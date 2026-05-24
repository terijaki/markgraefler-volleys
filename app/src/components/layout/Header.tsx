import {
  AppShell,
  Button,
  Box,
  Burger,
  Collapse,
  Container,
  Group,
  Image,
  Stack,
  Title,
  UnstyledButton,
  Card,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, useRouterState } from "@tanstack/react-router";
import { Mail as IconContact } from "lucide-react";
import type { ReactNode } from "react";
import { Club } from "@project.config";
import classes from "./Header.module.css";
import { navbarLinks } from "../../utils/navbarLinks";
import Socials from "../layout/Socials";

export const HEADER_HEIGHT = 76;

type NavbarLinkItem = (typeof navbarLinks)[number];

const pillButtonClassName = "mv-focus mv-pressable";
const pillButtonStyle = { boxShadow: "0 5px 0 rgba(28, 27, 31, 0.2)" } as const;

function HeaderPillAction({
  icon,
  label,
  href,
  onClick,
  bg,
  c,
  target,
  rel,
}: {
  icon: ReactNode;
  label: string;
  href: string;
  onClick?: () => void;
  bg?: string;
  c?: string;
  target?: string;
  rel?: string;
}) {
  return (
    <Button
      component="a"
      href={href}
      onClick={onClick}
      target={target}
      rel={rel}
      w="100%"
      h={46}
      px="sm"
      radius="xl"
      fw={700}
      justify="flex-start"
      className={pillButtonClassName}
      leftSection={icon}
      variant="default"
      bg={bg}
      c={c}
      bd="2px solid var(--mantine-color-mvInk-9)"
      style={pillButtonStyle}
    >
      {label}
    </Button>
  );
}

function HeaderNavLink({
  item,
  onClick,
  mobile = false,
}: {
  item: NavbarLinkItem;
  onClick?: () => void;
  mobile?: boolean;
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Button
      component={Link}
      to={item.href}
      onClick={onClick}
      px={mobile ? "md" : "sm"}
      py={mobile ? "xs" : 6}
      radius="xl"
      fw={700}
      justify={mobile ? "flex-start" : "center"}
      leftSection={mobile ? <item.icon /> : undefined}
      variant="default"
      bg={mobile ? "white" : isActive ? "mvPurple.6" : undefined}
      bd="2px solid var(--mantine-color-mvInk-9)"
      c={mobile ? "mvInk.9" : isActive ? "white" : "mvInk.9"}
      w={mobile ? "100%" : undefined}
      className={pillButtonClassName}
      style={pillButtonStyle}
    >
      {item.name}
    </Button>
  );
}

export default function Header() {
  const [opened, { toggle, close }] = useDisclosure();

  return (
    <AppShell.Header bg="transparent" withBorder={false}>
      <Box h={32} bg="mvBg" mb={-16} />
      <Container size="xl" px="sm" pb="sm">
        <Card
          p={0}
          bg="mvSand.0"
          style={{
            borderRadius: "20px",
            overflow: "hidden",
          }}
        >
          <Group justify="space-between" h={58} px="md" wrap="nowrap" className={classes.headerRow}>
            <UnstyledButton component={Link} to="/" onClick={close} className={classes.brandButton}>
              <Group gap="xs" wrap="nowrap" className={classes.brandGroup}>
                <Card
                  className={classes.logoBadge}
                  p={0}
                  bdrs={12}
                  w={36}
                  h={36}
                  bg="white"
                  style={{
                    placeItems: "center",
                    boxShadow: "0 4px 0 rgba(28, 27, 31, 0.28)",
                  }}
                >
                  <Image
                    src="/assets/logos/logo.png"
                    alt="Markgräfler Volleys Logo"
                    w={24}
                    h={24}
                    fit="contain"
                  />
                </Card>
                <Title
                  order={1}
                  size="h3"
                  fw={800}
                  tt="uppercase"
                  className={classes.brandTitle}
                  style={{
                    color: "var(--mantine-color-mvInk-9)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {Club.shortName}
                </Title>
              </Group>
            </UnstyledButton>
            <Group gap="sm" visibleFrom="sm" wrap="nowrap">
              {navbarLinks.map((item) => (
                <HeaderNavLink key={item.name} item={item} />
              ))}
            </Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              color="mvInk.9"
              size="sm"
              className={classes.burger}
            />
          </Group>
          <Collapse
            expanded={opened}
            hiddenFrom="sm"
            p="md"
            bg="mvSand.1"
            style={{
              borderTop: "2px solid var(--mantine-color-mvInk-9)",
            }}
          >
            <Group justify="space-between" align="flex-start" gap="xl">
              <Stack gap="xs" style={{ flex: 1 }}>
                {navbarLinks.map((item) => (
                  <HeaderNavLink key={item.name} item={item} onClick={close} mobile />
                ))}
              </Stack>
              <Stack gap="xs" w={230}>
                <HeaderPillAction
                  href={`mailto:${Club.email}`}
                  onClick={close}
                  label="Kontaktieren"
                  icon={<IconContact />}
                  bg="mvPurple.6"
                  c="white"
                />
                {Socials().map((socialItem) => (
                  <HeaderPillAction
                    key={socialItem.name}
                    href={socialItem.href}
                    onClick={close}
                    label={socialItem.name}
                    icon={socialItem.icon}
                    bg="white"
                    target={socialItem.target}
                    rel={socialItem.rel}
                  />
                ))}
              </Stack>
            </Group>
          </Collapse>
        </Card>
      </Container>
    </AppShell.Header>
  );
}
