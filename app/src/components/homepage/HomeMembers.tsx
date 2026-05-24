import type { PublicMember } from "@webapp/server/functions/members";
import { Avatar, Box, Container, Group, Stack, Text } from "@mantine/core";
import { shuffleArray } from "@utils/shuffleArray";
import { FaUser as IconAvatar } from "react-icons/fa6";
import { useMembers } from "../../hooks/dataQueries";
import { useFileUrl } from "../../hooks/dataQueries";
import SectionHeading from "../layout/SectionHeading";
import ScrollAnchor from "./ScrollAnchor";

export default function HomeMembers() {
  const { data, isLoading } = useMembers();
  if (isLoading) return null;
  const members = data?.items || [];

  const relevantMembers = members.filter(
    (member) => member.isBoardMember || member.isTrainer || member.roleTitle,
  );
  const uniqueMembers = Array.from(
    new Map(relevantMembers.map((member) => [member.id, member])).values(),
  );
  const displayMembers = shuffleArray(uniqueMembers);

  return (
    <Box className="mv-section">
      <Container size="xl" py="xl" px={{ base: "lg", md: "xl" }}>
        <ScrollAnchor name="verein" />
        <Stack gap="md" className="mv-card" p="lg" bg="white">
          <SectionHeading text="Menschen hinter dem Verein" color="mvGreen" />
          {displayMembers.length > 0 && <MemberList members={displayMembers} />}
        </Stack>
      </Container>
    </Box>
  );
}

function MemberList({ members }: { members: PublicMember[] }) {
  return (
    <Group gap="sm" justify="center">
      {members?.map((member) => (
        <CompactMemberItem key={member.id} member={member} />
      ))}
    </Group>
  );
}

function CompactMemberItem({ member }: { member: PublicMember }) {
  const { name, avatarS3Key, proxyEmail } = member;
  const { data: avatarUrl } = useFileUrl(avatarS3Key);

  return (
    <Box
      component={proxyEmail ? "a" : "div"}
      href={proxyEmail ? `mailto:${proxyEmail}` : undefined}
      className="mv-focus"
      style={{ display: "inline-block", textDecoration: "none", color: "inherit" }}
    >
      <Group
        gap="xs"
        px="sm"
        py={7}
        className="mv-card mv-pressable"
        style={{
          borderRadius: 999,
          background: "white",
          boxShadow: "0 6px 0 rgba(28, 27, 31, 0.25)",
        }}
        wrap="nowrap"
      >
        <Avatar src={avatarUrl} alt={name} size="sm" radius="xl">
          <IconAvatar size={12} />
        </Avatar>
        <Text size="sm" fw={700} lineClamp={1} maw={220} c="mvInk.9">
          {name}
        </Text>
      </Group>
    </Box>
  );
}
