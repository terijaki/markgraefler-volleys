import type { PublicMember } from "@webapp/server/functions/members";
import { Avatar, Badge, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { User as IconAvatar } from "lucide-react";
import { useFileUrls, useMembers } from "../../hooks/dataQueries";

const boardLabel = "Vorstand";
const trainerLabel = "Trainer:in";

function getMemberFunctions(member: PublicMember): string[] {
  const functions: string[] = [];

  if (member.roleTitle?.trim()) functions.push(member.roleTitle.trim());
  if (member.isBoardMember) functions.push(boardLabel);
  if (member.isTrainer) functions.push(trainerLabel);

  return Array.from(new Set(functions));
}

function sortMembers(a: PublicMember, b: PublicMember): number {
  const aBoard = a.isBoardMember ? 1 : 0;
  const bBoard = b.isBoardMember ? 1 : 0;
  if (aBoard !== bBoard) return bBoard - aBoard;

  const aTrainer = a.isTrainer ? 1 : 0;
  const bTrainer = b.isTrainer ? 1 : 0;
  if (aTrainer !== bTrainer) return bTrainer - aTrainer;

  return a.name.localeCompare(b.name, "de");
}

export default function MembersDirectory() {
  const { data, isLoading } = useMembers();
  const members = data?.items || [];

  const relevantMembers = members.filter(
    (member) => member.isBoardMember || member.isTrainer || member.roleTitle,
  );
  const uniqueMembers = Array.from(
    new Map(relevantMembers.map((member) => [member.id, member])).values(),
  );
  const displayMembers = [...uniqueMembers].sort(sortMembers);

  const avatarS3Keys = Array.from(
    new Set(
      displayMembers
        .map((member) => member.avatarS3Key)
        .filter((avatarS3Key): avatarS3Key is string => Boolean(avatarS3Key)),
    ),
  );
  const { data: avatarUrls } = useFileUrls(avatarS3Keys);

  const avatarUrlByS3Key = new Map(
    avatarS3Keys.map((avatarS3Key, index) => [avatarS3Key, avatarUrls?.[index]]),
  );

  if (isLoading) {
    return (
      <Card withBorder radius="md" p="md">
        <Text c="dimmed">Mitglieder werden geladen...</Text>
      </Card>
    );
  }

  if (displayMembers.length === 0) {
    return (
      <Card withBorder radius="md" p="md">
        <Text>Derzeit sind keine Funktionsmitglieder hinterlegt.</Text>
      </Card>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
      {displayMembers.map((member) => {
        const functions = getMemberFunctions(member);
        const avatarUrl = member.avatarS3Key ? avatarUrlByS3Key.get(member.avatarS3Key) : undefined;

        return (
          <Card
            key={member.id}
            component={member.proxyEmail ? "a" : "div"}
            href={member.proxyEmail ? `mailto:${member.proxyEmail}` : undefined}
            withBorder
            orientation="horizontal"
            className="mv-pressable"
          >
            <Card.Section
              withBorder
              style={{ width: 80, alignSelf: "stretch", display: "flex", flexShrink: 0 }}
            >
              <Avatar
                src={avatarUrl}
                alt={member.name}
                radius={0}
                style={{ width: "100%", height: "100%" }}
              >
                <IconAvatar size={20} />
              </Avatar>
            </Card.Section>
            <Stack gap="sm" px="sm">
              <Group align="flex-start" wrap="nowrap">
                <Stack gap={2}>
                  <Text fw={800} size="lg" c="mvPurple.8" lh={1.2}>
                    {member.name}
                  </Text>
                  {member.proxyEmail && (
                    <Text size="sm" c="dimmed" lineClamp={1}>
                      {member.proxyEmail}
                    </Text>
                  )}
                </Stack>
              </Group>

              <Group gap="xs">
                {functions.map((functionLabel) => (
                  <Badge key={functionLabel} variant="light" color="mvPurple" radius="sm">
                    {functionLabel}
                  </Badge>
                ))}
              </Group>
            </Stack>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
