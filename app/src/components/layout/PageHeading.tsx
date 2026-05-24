import { Box, Divider, Group, Stack, Text, Title } from "@mantine/core";
import { CircleDot } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default function PageHeading(props: {
  title: string;
  subtitle?: string;
  date?: Date;
  icon?: LucideIcon;
}) {
  const isLongTitle = props.title.length > 40;
  const HeadingIcon = props.icon ?? CircleDot;

  return (
    <Stack justify="center" align="flex-start" gap={0} c="mvInk.9" py={4}>
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Box
          style={{
            width: 30,
            height: 30,
            display: "grid",
            placeItems: "center",
            border: "2px solid var(--mantine-color-mvInk-9)",
            borderRadius: "11px",
            background: "white",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <HeadingIcon size={16} />
        </Box>

        <Stack gap={0} align="flex-start" style={{ minWidth: 0 }}>
          <Title
            c="mvInk.8"
            ta="left"
            textWrap="balance"
            order={isLongTitle ? 2 : 1}
            fw={800}
            m={0}
            style={{
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              fontSize: isLongTitle
                ? "clamp(1.45rem, 2.2vw, 2.05rem)"
                : "clamp(1.68rem, 3vw, 2.4rem)",
            }}
          >
            {props.title}
          </Title>

          <Divider mt={4} w={104} size="sm" color="mvPurple.8" opacity={0.38} />
        </Stack>
      </Group>

      {props.subtitle && (
        <Text ta="left" mt={4}>
          {props.subtitle}
        </Text>
      )}
      {!props.subtitle && props.date && (
        <time dateTime={props.date.toISOString()}>
          <Text ta="left" c="mvGreen.8" fw={600} mt={4}>
            {props.date.toLocaleString("de-DE", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </time>
      )}
    </Stack>
  );
}
