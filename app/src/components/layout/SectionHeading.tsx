import { Center, Divider, type MantineColor, Stack, Title, Text } from "@mantine/core";

export default function SectionHeading({
  text,
  subtext,
  color = "mvPurple",
}: {
  text: string;
  subtext?: string;
  color?: MantineColor;
}) {
  return (
    <Stack gap="xs" mb="sm">
      <Center>
        <Stack gap="xs">
          <Title order={2} fw={800} ta="center">
            {text}
          </Title>
          <Divider size="md" color={color} opacity={0.5} />
        </Stack>
      </Center>
      {subtext && <Text ta="center">{subtext}</Text>}
    </Stack>
  );
}
