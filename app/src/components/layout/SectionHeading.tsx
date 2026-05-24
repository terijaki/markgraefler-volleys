import { Center, Divider, type MantineColor, Stack, Title } from "@mantine/core";

export default function SectionHeading({
  text,
  color = "mvPurple",
}: {
  text: string;
  color?: MantineColor;
}) {
  return (
    <Center c={color} pb="sm">
      <Stack gap={8} w="100%" align="center">
        <Title
          order={2}
          fw={800}
          ta="center"
          style={{
            fontSize: "clamp(1.4rem, 2.5vw, 2.1rem)",
            lineHeight: 1.08,
            letterSpacing: "-0.018em",
          }}
        >
          {text}
        </Title>
        <Divider w={132} size="md" color={color} opacity={0.34} />
      </Stack>
    </Center>
  );
}
