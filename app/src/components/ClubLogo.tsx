import { useState } from "react";
import { Flex, Image } from "@mantine/core";
import { Volleyball } from "lucide-react";
import { useClubLogoUrl, useTeamLogoUrl } from "../hooks/dataQueries";

type ClubLogoProps = (
  | { clubUuid: string; clubSlug?: never; teamUuid?: never; logoUrl?: never }
  | { clubSlug: string; clubUuid?: never; teamUuid?: never; logoUrl?: never }
  | { teamUuid: string; clubUuid?: never; clubSlug?: never; logoUrl?: never }
  | { logoUrl: string | null | undefined; clubUuid?: never; clubSlug?: never; teamUuid?: never }
) & {
  label?: string;
  size?: number;
};

export default function ClubLogo({
  clubUuid,
  clubSlug,
  teamUuid,
  logoUrl: proppedLogoUrl,
  label,
  size = 24,
}: ClubLogoProps) {
  const useClubHook = !!(clubUuid || clubSlug);
  const useTeamHook = !!teamUuid;
  const { data: fetchedClubLogoUrl } = useClubLogoUrl({ clubUuid, clubSlug });
  const { data: fetchedTeamLogoUrl } = useTeamLogoUrl(teamUuid);
  const resolvedLogoUrl = useClubHook
    ? fetchedClubLogoUrl
    : useTeamHook
      ? fetchedTeamLogoUrl
      : proppedLogoUrl;

  // Absent projection/index data → null URL → fallback.
  // Upstream image 403/404 → URL present but Image onError → fallback.
  // Track the failed URL so a new resolved URL automatically clears the error.
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const imageFailed = !!resolvedLogoUrl && failedLogoUrl === resolvedLogoUrl;

  if (!resolvedLogoUrl || imageFailed) {
    return <ClubLogoFallback size={size} />;
  }

  return (
    <Flex justify="center" align="center" w={size} h={size} style={{ flexShrink: 0 }}>
      <Image
        src={resolvedLogoUrl}
        alt={`Logo: ${label || "Vereinlogo"}`}
        onError={() => setFailedLogoUrl(resolvedLogoUrl)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          borderRadius: "50%",
        }}
      />
    </Flex>
  );
}

export function ClubLogoFallback({ size = 24 }: { size?: number }) {
  return (
    <Flex pos="relative" justify="center" align="center" w={size} h={size} c="mvSand">
      <Volleyball strokeWidth={1.2} />
    </Flex>
  );
}
