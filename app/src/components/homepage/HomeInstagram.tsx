import { Box, Container, SimpleGrid, Stack, Text } from "@mantine/core";
import type { BeholdPost } from "@/lambda/social/types";
import InstagramCard from "../InstagramCard";
import SectionHeading from "../layout/SectionHeading";
import ScrollAnchor from "./ScrollAnchor";

interface HomeInstagramProps {
  posts: BeholdPost[];
}

export default function HomeInstagram({ posts }: HomeInstagramProps) {
  if (posts.length === 0) return null;

  return (
    <Box className="mv-section">
      <Container size="xl" py="xl" px={{ base: "lg", md: "xl" }}>
        <ScrollAnchor name="instagram" />
        <Stack gap="lg">
          <SectionHeading text="Instagram" color="mvGreen" />
          <Text ta="center" c="mvInk.9">
            Einblicke aus unserem Vereinsleben: Training, Spieltage und Team-Momente.
          </Text>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {posts.map((post) => (
              <InstagramCard key={post.id} {...post} />
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  );
}
