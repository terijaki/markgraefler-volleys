import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Scheme for seed images shipped in-repo (no external HTTP). */
export const FIXTURE_IMAGE_SCHEME = "mv-fixture:";

/** Resolves the directory that contains `clubs/`, `portraits/`, etc. */
export function resolveSeedImagesRoot(): string {
  const candidates: string[] = [];
  const lambdaTaskRoot = process.env.LAMBDA_TASK_ROOT;
  if (lambdaTaskRoot) {
    candidates.push(resolve(lambdaTaskRoot, "fixtures/seed-images"));
  }

  const moduleDir = dirname(fileURLToPath(import.meta.url));
  candidates.push(moduleDir, resolve(moduleDir, "fixtures/seed-images"));

  for (const root of candidates) {
    if (existsSync(resolve(root, "clubs"))) {
      return root;
    }
  }

  return candidates[0] ?? resolve(moduleDir, "fixtures/seed-images");
}

let cachedSeedImagesRoot: string | undefined;

function seedImagesRoot(): string {
  cachedSeedImagesRoot ??= resolveSeedImagesRoot();
  return cachedSeedImagesRoot;
}

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

  const root = seedImagesRoot();
  const absolutePath = resolve(root, relativePath);
  if (!absolutePath.startsWith(root)) {
    return null;
  }

  try {
    const body = Buffer.from(await readFile(absolutePath));
    return { body, contentType: contentTypeForPath(relativePath) };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}
