/** Deterministic placeholder images for dev seed data. */

export function picsumImageUrl(seed: string, width = 128, height = 128): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}
