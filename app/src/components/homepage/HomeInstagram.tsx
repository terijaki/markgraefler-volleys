import { SimpleGrid, Stack, Text } from "@mantine/core";
import type { BeholdPost } from "@/lambda/social/types";
import InstagramCard from "../InstagramCard";
import SectionHeading from "../layout/SectionHeading";

interface HomeInstagramProps {
  posts: BeholdPost[];
}

export default function HomeInstagram({ posts }: HomeInstagramProps) {
  if (posts.length === 0) return null;

  return (
    <Stack gap="lg" mb="md">
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
  );
}
