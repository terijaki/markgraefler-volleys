import { describe, expect, it } from "vite-plus/test";
import { cloudfrontLogoUrlFromS3Key, resolveClubLogoUrl } from "./sams-club-logo";

const CF = "https://media.example.com";

describe("resolveClubLogoUrl", () => {
  it("prefers logoS3Key over logoImageLink", () => {
    const result = resolveClubLogoUrl({ logoS3Key: "sams-logos/abc.png" }, CF);
    expect(result).toBe("https://media.example.com/sams-logos/abc.png");
  });

  it("falls back to logoImageLink when logoS3Key is missing", () => {
    const result = resolveClubLogoUrl({ logoImageLink: "https://sams.cdn/logo.png" }, CF);
    expect(result).toBe("https://sams.cdn/logo.png");
  });

  it("returns null when club is null", () => {
    expect(resolveClubLogoUrl(null, CF)).toBeNull();
  });
});

describe("cloudfrontLogoUrlFromS3Key", () => {
  it("builds a CDN URL from base and key", () => {
    expect(cloudfrontLogoUrlFromS3Key(CF, "sams-logos/uuid.png")).toBe(
      "https://media.example.com/sams-logos/uuid.png",
    );
  });

  it("returns null when base or key is empty", () => {
    expect(cloudfrontLogoUrlFromS3Key("", "sams-logos/uuid.png")).toBeNull();
    expect(cloudfrontLogoUrlFromS3Key(CF, "")).toBeNull();
  });
});
