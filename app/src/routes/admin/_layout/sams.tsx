import { Card, Group, Stack, Table, Text, Title, Tooltip } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import ClubLogo from "@webapp/components/ClubLogo";
import { listSamsClubsFn, listSamsTeamsFn } from "@webapp/server/functions/sams";
import dayjs from "dayjs";
import { Info } from "lucide-react";

function SamsDashboardPage() {
  const { data: samsTeamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ["sams", "teams"],
    queryFn: () => listSamsTeamsFn(),
  });
  const { data: samsClubsData, isLoading: clubsLoading } = useQuery({
    queryKey: ["sams", "clubs"],
    queryFn: () => listSamsClubsFn(),
  });
  const teams = samsTeamsData?.items || [];
  const clubs = samsClubsData?.items || [];

  const teamsLastUpdated =
    teams.length > 0
      ? teams.reduce(
          (max, team) => (team.updatedAt > max ? team.updatedAt : max),
          teams[0].updatedAt,
        )
      : null;
  const clubsLastUpdated =
    clubs.length > 0
      ? clubs.reduce(
          (max, club) => (club.updatedAt > max ? club.updatedAt : max),
          clubs[0].updatedAt,
        )
      : null;

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        SAMS-Daten werden über den externen Provider synchronisiert. Manuelle Sync-Aktionen sind
        nicht verfügbar.
      </Text>

      <Group align="flex-end" justify="space-between" gap="md" wrap="wrap">
        <Title order={2}>SAMS Teams</Title>
        {teamsLastUpdated && (
          <Text size="xs">
            Zuletzt aktualisiert: {dayjs(teamsLastUpdated).format("DD.MM.YY HH:mm")}
          </Text>
        )}
      </Group>
      {teamsLoading ? (
        <Text>Laden...</Text>
      ) : teams && teams.length > 0 ? (
        <Card withBorder bg="white" p={0} radius="md">
          <Table striped highlightOnHover horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40}>Logo</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>ID</Table.Th>
                <Table.Th visibleFrom="md">League</Table.Th>
                <Table.Th visibleFrom="md">Sportsclub ID</Table.Th>
                <Table.Th hiddenFrom="md">Club</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {teams.map((team) => (
                <Table.Tr key={team.uuid}>
                  <Table.Td>
                    <ClubLogo clubUuid={team.sportsclubUuid} label={team.name} />
                  </Table.Td>
                  <Table.Td style={{ whiteSpace: "nowrap" }}>
                    {team.name}
                    <Text size="xs" hiddenFrom="md">
                      {team.leagueName || "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td visibleFrom="md">
                    <Text size="xs" c="dimmed">
                      {team.uuid || "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td hiddenFrom="md">
                    <Tooltip label={team.uuid}>
                      <Info size={16} />
                    </Tooltip>
                  </Table.Td>
                  <Table.Td visibleFrom="md">{team.leagueName || "-"}</Table.Td>
                  <Table.Td visibleFrom="md">
                    <Text size="xs" c="dimmed">
                      {team.sportsclubUuid || "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td hiddenFrom="md">
                    <Tooltip label={team.sportsclubUuid}>
                      <Info size={16} />
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      ) : (
        <Text>Keine SAMS Teams gefunden</Text>
      )}

      <Group align="flex-end" justify="space-between" gap="md" mt="lg" wrap="wrap">
        <Title order={2}>SAMS Vereine</Title>
        {clubsLastUpdated && (
          <Text size="xs">
            Zuletzt aktualisiert: {dayjs(clubsLastUpdated).format("DD.MM.YY HH:mm")}
          </Text>
        )}
      </Group>
      {clubsLoading ? (
        <Text>Laden...</Text>
      ) : clubs && clubs.length > 0 ? (
        <Card withBorder bg="white" p={0} radius="md">
          <Table striped highlightOnHover horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40}>Logo</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>ID</Table.Th>
                <Table.Th visibleFrom="md">Verband</Table.Th>
                <Table.Th>Verbands-ID</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {clubs.map((club) => (
                <Table.Tr key={club.sportsclubUuid}>
                  <Table.Td>
                    <ClubLogo clubUuid={club.sportsclubUuid} label={club.name} />
                  </Table.Td>
                  <Table.Td>
                    {club.name}
                    <Text size="xs" c="dimmed" hiddenFrom="md">
                      {club.associationName || "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td visibleFrom="md">
                    <Text size="xs" c="dimmed">
                      {club.sportsclubUuid}
                    </Text>
                  </Table.Td>
                  <Table.Td hiddenFrom="md">
                    <Tooltip label={club.sportsclubUuid}>
                      <Info size={16} />
                    </Tooltip>
                  </Table.Td>
                  <Table.Td visibleFrom="md">
                    <Text size="xs">{club.associationName || "-"}</Text>
                  </Table.Td>
                  <Table.Td visibleFrom="md">
                    <Text size={"xs"} c="dimmed">
                      {club.associationUuid || "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td hiddenFrom="md">
                    <Tooltip label={club.associationUuid}>
                      <Info size={16} />
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      ) : (
        <Text>Keine SAMS Vereine gefunden</Text>
      )}
    </Stack>
  );
}

export const Route = createFileRoute("/admin/_layout/sams")({
  component: SamsDashboardPage,
});
