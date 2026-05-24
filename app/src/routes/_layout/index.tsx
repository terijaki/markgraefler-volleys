import { Stack } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import HomeHero from "@webapp/components/homepage/HomeHero";
import HomeInstagram from "@webapp/components/homepage/HomeInstagram";
import HomeSponsors from "@webapp/components/homepage/HomeSponsors";
import { getInstagramPostsFn } from "@webapp/server/functions/social";
import HomeUnion from "../../components/homepage/HomeUnion";

export const Route = createFileRoute("/_layout/")({
  loader: async () => {
    const instagramPosts = await getInstagramPostsFn();

    return { instagramPosts };
  },
  component: HomePage,
});

function HomePage() {
  const { instagramPosts } = Route.useLoaderData();

  return (
    <Stack gap={0} align="stretch">
      <HomeHero />
      <HomeUnion />
      <HomeSponsors />
      <HomeInstagram posts={instagramPosts} />
    </Stack>
  );
}
