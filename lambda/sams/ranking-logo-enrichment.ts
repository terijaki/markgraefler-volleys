import type { LeagueRankingEntry } from "sams-provider-events";
import type { SamsProjectionRankingEntryInput } from "@/lib/db/schemas";
import { cloudfrontLogoUrlFromS3Key, resolveClubLogoUrl } from "@/utils/sams-club-logo";
import { uploadClubLogoToS3 } from "./club-logo-upload";
import { mapProviderRankingEntry } from "./provider-mappers";

type ClubLogoFields = { logoS3Key?: string | null; logoImageLink?: string | null };

function isCloudfrontLogoUrl(url: string, cloudfrontUrl: string): boolean {
  return cloudfrontUrl.length > 0 && url.startsWith(cloudfrontUrl);
}

/**
 * Write-time enrichment: resolve our clubs from DynamoDB (CDN via logoS3Key), cache opponent
 * provider logos to S3, and store the CloudFront URL on the ranking projection row.
 */
export async function enrichRankingEntryLogoUrl(
  entry: LeagueRankingEntry,
  club: ClubLogoFields | null,
  mediaBucketName: string,
  cloudfrontUrl: string,
): Promise<SamsProjectionRankingEntryInput> {
  const mapped = mapProviderRankingEntry(entry);
  const sportsclubUuid = entry.sportsclubUuid;

  const resolvedFromClub = resolveClubLogoUrl(club, cloudfrontUrl);
  if (resolvedFromClub && isCloudfrontLogoUrl(resolvedFromClub, cloudfrontUrl)) {
    return { ...mapped, logoUrl: resolvedFromClub };
  }

  const sourceUrl = entry.logoUrl ?? resolvedFromClub ?? club?.logoImageLink ?? undefined;
  if (!sourceUrl) {
    return mapped;
  }

  if (isCloudfrontLogoUrl(sourceUrl, cloudfrontUrl)) {
    return { ...mapped, logoUrl: sourceUrl };
  }

  if (!sportsclubUuid || !mediaBucketName) {
    return { ...mapped, logoUrl: sourceUrl };
  }

  const uploadedKey = await uploadClubLogoToS3(mediaBucketName, sportsclubUuid, sourceUrl);
  const cdnUrl = uploadedKey ? cloudfrontLogoUrlFromS3Key(cloudfrontUrl, uploadedKey) : null;
  if (cdnUrl) {
    return { ...mapped, logoUrl: cdnUrl };
  }

  return { ...mapped, logoUrl: sourceUrl };
}

export async function enrichRankingEntriesLogoUrls(
  entries: readonly LeagueRankingEntry[],
  clubsBySportsclubUuid: ReadonlyMap<string, ClubLogoFields>,
  mediaBucketName: string,
  cloudfrontUrl: string,
): Promise<SamsProjectionRankingEntryInput[]> {
  return Promise.all(
    entries.map((entry) =>
      enrichRankingEntryLogoUrl(
        entry,
        entry.sportsclubUuid ? (clubsBySportsclubUuid.get(entry.sportsclubUuid) ?? null) : null,
        mediaBucketName,
        cloudfrontUrl,
      ),
    ),
  );
}
