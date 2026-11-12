import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/** Scheme for seed images shipped in-repo (no external HTTP). */
export const FIXTURE_IMAGE_SCHEME = "mv-fixture:";

const SEED_IMAGES_ROOT = resolve(import.meta.dirname);

export function fixtureImageUrl(relativePath: string): string {
  const normalized = relativePath.replace(/^\/+/, "");
  return `${FIXTURE_IMAGE_SCHEME}//${normalized}`;
}

export function parseFixtureImagePath(url: string): string | null {
  const prefix = `${FIXTURE_IMAGE_SCHEME}//`;
  if (!url.startsWith(prefix)) {
    return null;
  }
  return url.slice(prefix.length);
}

export function isFixtureImageUrl(url: string): boolean {
  return parseFixtureImagePath(url) !== null;
}

function contentTypeForPath(relativePath: string): string {
  const ext = relativePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "svg":
      return "image/svg+xml";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/png";
  }
}

/** Loads bytes for mv-fixture:// URLs; returns null for other schemes. */
export async function loadFixtureImage(
  url: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  const relativePath = parseFixtureImagePath(url);
  if (!relativePath) {
    return null;
  }

  const absolutePath = resolve(SEED_IMAGES_ROOT, relativePath);
  if (!absolutePath.startsWith(SEED_IMAGES_ROOT)) {
    return null;
  }

  const body = Buffer.from(await readFile(absolutePath));
  return { body, contentType: contentTypeForPath(relativePath) };
}
