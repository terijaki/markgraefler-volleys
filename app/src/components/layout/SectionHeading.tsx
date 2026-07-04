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
      <Stack gap="xs">
        <Title order={2} fw={800} ta="center">
          {text}
        </Title>
        <Divider size="md" color={color} opacity={0.5} />
      </Stack>
    </Center>
  );
}
