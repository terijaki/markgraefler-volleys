import { describe, expect, it } from "vite-plus/test";
import {
  fixtureImageUrl,
  isFixtureImageUrl,
  loadFixtureImage,
  parseFixtureImagePath,
  resolveSeedImagesRoot,
} from "./fixture-image";

describe("fixture-image", () => {
  it("resolves seed images root next to club logos", () => {
    const root = resolveSeedImagesRoot();
    expect(root.endsWith("fixtures/seed-images") || root.includes("seed-images")).toBe(true);
  });

  it("builds and parses mv-fixture URLs", () => {
    const url = fixtureImageUrl("clubs/club-markgraefler-volleys.jpg");
    expect(isFixtureImageUrl(url)).toBe(true);
    expect(parseFixtureImagePath(url)).toBe("clubs/club-markgraefler-volleys.jpg");
  });

  it("loads an in-repo club logo", async () => {
    const url = fixtureImageUrl("clubs/club-markgraefler-volleys.jpg");
    const loaded = await loadFixtureImage(url);
    expect(loaded).not.toBeNull();
    expect(loaded?.contentType).toBe("image/jpeg");
    expect(loaded?.body.length).toBeGreaterThan(100);
  });
});
