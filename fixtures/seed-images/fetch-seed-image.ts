import { isFixtureImageUrl, loadFixtureImage, parseFixtureImagePath } from "./fixture-image";

/** Fetches seed image bytes from in-repo fixtures or the public internet. */
export async function fetchSeedImageBytes(
  imageUrl: string,
  init?: RequestInit,
): Promise<{ body: Buffer; contentType: string }> {
  if (isFixtureImageUrl(imageUrl)) {
    const local = await loadFixtureImage(imageUrl);
    if (local) {
      return local;
    }
    const relative = parseFixtureImagePath(imageUrl);
    throw new Error(`Seed fixture image missing: ${relative ?? imageUrl}`);
  }

  const response = await fetch(imageUrl, init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "image/png";
  const body = Buffer.from(await response.arrayBuffer());
  return { body, contentType };
}
