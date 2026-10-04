import { Stack } from "@mantine/core";
import { Await, createFileRoute } from "@tanstack/react-router";
import HomeHero from "@webapp/components/homepage/HomeHero";
import HomeInstagram from "@webapp/components/homepage/HomeInstagram";
import HomeSectionFallback from "@webapp/components/homepage/HomeSectionFallback";
import HomeSponsors from "@webapp/components/homepage/HomeSponsors";
import { getInstagramPostsFn } from "@webapp/server/functions/social";
import HomeUnion from "../../components/homepage/HomeUnion";

export const Route = createFileRoute("/_layout/")({
  loader: async () => {
    // Return Instagram as an unresolved promise so <Await> can render a fallback
    // and stream the section when the read finishes.
    // https://tanstack.com/router/latest/docs/framework/react/guide/deferred-data-loading
    return {
      instagramPosts: getInstagramPostsFn(),
    };
  },
  component: HomePage,
});

function HomePage() {
  const data = Route.useLoaderData();

  return (
    <Stack gap="xl" align="stretch">
      <HomeHero />
      <HomeUnion />
      <Await promise={data.instagramPosts} fallback={<HomeSectionFallback title="Instagram" />}>
        {(posts) => <HomeInstagram posts={posts} />}
      </Await>
      <HomeSponsors />
    </Stack>
  );
}
