import { Card, Space, Stack, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import HomeTeamGrid from "@webapp/components/homepage/HomeTeamGrid";
import PageWithHeading from "@webapp/components/layout/PageWithHeading";
import { listTeamsFn } from "@webapp/server/functions/teams";

export const Route = createFileRoute("/_layout/teams/")({
  loader: async () => {
    const data = await listTeamsFn();
    return { teams: data.items };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { teams } = Route.useLoaderData();
  return (
    <PageWithHeading
      title="Mannschaften"
      subtitle={`Zurzeit umfasst unsere Spielgemeinschaft ${teams.length > 1 ? `${teams.length} Mannschaften` : "eine Mannschaft"}`}
      icon={Users}
    >
      <Stack gap="xl">
        <HomeTeamGrid teams={teams} />

        <Space h="md" />
        <Card withBorder radius="md" p="md">
          <Title order={3}>Interesse an einem Probetraining?</Title>
          <Text>Melde dich beim Trainer oder Ansprechpartner der jeweiligen Mannschaft.</Text>
        </Card>
      </Stack>
    </PageWithHeading>
  );
}
