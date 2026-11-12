import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { fetchSeedImageBytes } from "@/fixtures/seed-images/fetch-seed-image";

const s3Client = new S3Client({});

function extensionForContentType(contentType: string): string {
  if (contentType.includes("jpeg")) {
    return "jpg";
  }
  if (contentType.includes("gif")) {
    return "gif";
  }
  if (contentType.includes("webp")) {
    return "webp";
  }
  if (contentType.includes("svg")) {
    return "svg";
  }
  return "png";
}

/**
 * Downloads a logo from a URL and uploads it to S3.
 * Returns the S3 key on success, or undefined on failure (non-blocking).
 */
export async function uploadClubLogoToS3(
  bucketName: string,
  sportsclubUuid: string,
  logoUrl: string,
): Promise<string | undefined> {
  if (!bucketName) return undefined;

  try {
    const { body, contentType } = await fetchSeedImageBytes(logoUrl, {
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "MV ClubSync/1.0" },
    });
    const ext = extensionForContentType(contentType);
    const s3Key = `sams-logos/${sportsclubUuid}.${ext}`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=604800",
      }),
    );
    return s3Key;
  } catch (err) {
    console.warn(`Logo upload skipped for ${sportsclubUuid}:`, err);
    return undefined;
  }
}
