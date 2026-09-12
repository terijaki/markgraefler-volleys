import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { LeagueRankingEntry } from "sams-provider-events";

vi.mock("./club-logo-upload", () => ({
  uploadClubLogoToS3: vi.fn(),
}));

import { uploadClubLogoToS3 } from "./club-logo-upload";
import { enrichRankingEntryLogoUrl, enrichRankingEntriesLogoUrls } from "./ranking-logo-enrichment";

const CF = "https://media.example.com";

function rankingEntry(
  overrides: Partial<LeagueRankingEntry> & Pick<LeagueRankingEntry, "teamUuid">,
): LeagueRankingEntry {
  return {
    teamUuid: overrides.teamUuid,
    teamName: overrides.teamName ?? "Team",
    rank: overrides.rank ?? 1,
    sportsclubUuid: overrides.sportsclubUuid,
    logoUrl: overrides.logoUrl,
    matchesPlayed: overrides.matchesPlayed,
    points: overrides.points,
    wins: overrides.wins,
    setWins: overrides.setWins,
    setLosses: overrides.setLosses,
  };
}

describe("enrichRankingEntryLogoUrl", () => {
  beforeEach(() => {
    vi.mocked(uploadClubLogoToS3).mockReset();
  });

  it("uses CloudFront URL when club has logoS3Key", async () => {
    const entry = rankingEntry({
      teamUuid: "team-1",
      sportsclubUuid: "club-1",
      logoUrl: "https://provider.example/logo.png",
    });

    const result = await enrichRankingEntryLogoUrl(
      entry,
      { logoS3Key: "sams-logos/club-1.png" },
      "media-bucket",
      CF,
    );

    expect(result.logoUrl).toBe(`${CF}/sams-logos/club-1.png`);
    expect(uploadClubLogoToS3).not.toHaveBeenCalled();
  });

  it("uploads provider logo for opponents without a club row", async () => {
    vi.mocked(uploadClubLogoToS3).mockResolvedValue("sams-logos/opponent.png");

    const entry = rankingEntry({
      teamUuid: "team-2",
      sportsclubUuid: "opponent-1",
      logoUrl: "https://provider.example/opponent.png",
    });

    const result = await enrichRankingEntryLogoUrl(entry, null, "media-bucket", CF);

    expect(uploadClubLogoToS3).toHaveBeenCalledWith(
      "media-bucket",
      "opponent-1",
      "https://provider.example/opponent.png",
    );
    expect(result.logoUrl).toBe(`${CF}/sams-logos/opponent.png`);
  });

  it("uploads when club only has external logoImageLink", async () => {
    vi.mocked(uploadClubLogoToS3).mockResolvedValue("sams-logos/club-ext.png");

    const entry = rankingEntry({
      teamUuid: "team-3",
      sportsclubUuid: "club-ext",
      logoUrl: "https://provider.example/new.png",
    });

    const result = await enrichRankingEntryLogoUrl(
      entry,
      { logoImageLink: "https://provider.example/old.png" },
      "media-bucket",
      CF,
    );

    expect(uploadClubLogoToS3).toHaveBeenCalledWith(
      "media-bucket",
      "club-ext",
      "https://provider.example/new.png",
    );
    expect(result.logoUrl).toBe(`${CF}/sams-logos/club-ext.png`);
  });

  it("falls back to source URL when upload fails", async () => {
    vi.mocked(uploadClubLogoToS3).mockResolvedValue(undefined);

    const entry = rankingEntry({
      teamUuid: "team-4",
      sportsclubUuid: "club-4",
      logoUrl: "https://provider.example/fallback.png",
    });

    const result = await enrichRankingEntryLogoUrl(entry, null, "media-bucket", CF);

    expect(result.logoUrl).toBe("https://provider.example/fallback.png");
  });
});

describe("enrichRankingEntriesLogoUrls", () => {
  it("enriches all entries", async () => {
    vi.mocked(uploadClubLogoToS3).mockResolvedValue("sams-logos/b.png");

    const entries = [
      rankingEntry({
        teamUuid: "a",
        sportsclubUuid: "club-a",
        logoUrl: "https://provider.example/a.png",
      }),
      rankingEntry({
        teamUuid: "b",
        sportsclubUuid: "club-b",
        logoUrl: "https://provider.example/b.png",
      }),
    ];

    const clubs = new Map([["club-a", { logoS3Key: "sams-logos/a.png" }]]);
    const results = await enrichRankingEntriesLogoUrls(entries, clubs, "media-bucket", CF);

    expect(results[0]?.logoUrl).toBe(`${CF}/sams-logos/a.png`);
    expect(results[1]?.logoUrl).toBe(`${CF}/sams-logos/b.png`);
  });
});
