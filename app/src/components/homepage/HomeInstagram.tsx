import { Group, Stack } from "@mantine/core";
import type { BeholdPost } from "@/lambda/social/types";
import InstagramCard from "../InstagramCard";
import SectionHeading from "../layout/SectionHeading";

interface HomeInstagramProps {
  posts: BeholdPost[];
}

function isPortraitPost(post: BeholdPost): boolean {
  return post.sizes.small.width / post.sizes.small.height < 1;
}

export default function HomeInstagram({ posts }: HomeInstagramProps) {
  if (posts.length === 0) return null;

  // Render every card in the group with the same layout so a mix of
  // portrait and landscape posts doesn't produce inconsistently shaped
  // cards: the majority orientation wins for the whole group.
  const portraitCount = posts.filter(isPortraitPost).length;
  const isPortrait = portraitCount * 2 >= posts.length;

  return (
    <Stack gap="lg" mb="md">
      <SectionHeading
        color="mvGreen"
        text="Instagram"
        subtext="Einblicke aus unserem Vereinsleben: Training, Spieltage und weitere Team-Momente."
      />

      {/* Group wraps cards at their own width instead of stretching them to
          fill equal grid columns, which is what caused portrait cards to end
          up with a landscape-shaped media box. */}
      <Group gap="lg" justify="center" align="flex-start">
        {posts.map((post, index) => (
          <InstagramCard key={post.id} post={post} postIndex={index} isPortrait={isPortrait} />
        ))}
      </Group>
    </Stack>
  );
}
