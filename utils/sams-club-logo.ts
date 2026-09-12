/** Resolves a club's effective logo URL from DynamoDB club fields and the media CDN base URL. */
export function resolveClubLogoUrl(
  club: { logoS3Key?: string | null; logoImageLink?: string | null } | null,
  cloudfrontUrl: string,
): string | null {
  if (!club) return null;
  if (club.logoS3Key && cloudfrontUrl) return `${cloudfrontUrl}/${club.logoS3Key}`;
  return club.logoImageLink ?? null;
}

export function cloudfrontLogoUrlFromS3Key(cloudfrontUrl: string, s3Key: string): string | null {
  if (!cloudfrontUrl || !s3Key) return null;
  return `${cloudfrontUrl}/${s3Key}`;
}
