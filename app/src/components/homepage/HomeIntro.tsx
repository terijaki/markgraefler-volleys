import { Container, Stack } from "@mantine/core";
import type { ReactNode } from "react";

interface HomeIntroProps {
  introContent: ReactNode;
}

export default function HomeIntro({ introContent }: HomeIntroProps) {
  return (
    <Stack
      className="mv-section"
      gap="xl"
      align="stretch"
      pt="xl"
      pb="6rem"
      px={{ base: "sm", md: "xl" }}
      c="mvInk.9"
    >
      <Container size="xl" w="100%">
        {introContent}
      </Container>
    </Stack>
  );
}
