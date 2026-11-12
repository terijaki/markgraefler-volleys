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

  it("prefers LAMBDA_TASK_ROOT when clubs exist there", () => {
    const previous = process.env.LAMBDA_TASK_ROOT;
    const resolved = resolveSeedImagesRoot();
    process.env.LAMBDA_TASK_ROOT = resolved.replace(/\/fixtures\/seed-images$/, "");
    try {
      expect(resolveSeedImagesRoot()).toBe(resolved);
    } finally {
      if (previous === undefined) {
        delete process.env.LAMBDA_TASK_ROOT;
      } else {
        process.env.LAMBDA_TASK_ROOT = previous;
      }
    }
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
