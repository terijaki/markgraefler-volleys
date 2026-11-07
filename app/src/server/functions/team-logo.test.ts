import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mockTeamLogoGet = vi.fn();
const mockRankingGet = vi.fn();
const mockGetSamsTeamByUuid = vi.fn();
const mockGetAllSamsTeams = vi.fn();
const mockGetSamsClubBySportsclubUuid = vi.fn();
const mockGetSamsClubByNameSlug = vi.fn();

vi.mock("@/lib/db/repositories", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/repositories")>();
  return {
    ...actual,
    samsTeamLogoRepository: {
      get: (...args: unknown[]) => mockTeamLogoGet(...args),
      upsert: vi.fn(),
    },
    samsRankingProjectionRepository: {
      get: (...args: unknown[]) => mockRankingGet(...args),
      replace: vi.fn(),
    },
  };
});

vi.mock("../queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../queries")>();
  return {
    ...actual,
    getSamsTeamByUuid: (...args: unknown[]) => mockGetSamsTeamByUuid(...args),
    getAllSamsTeams: (...args: unknown[]) => mockGetAllSamsTeams(...args),
    getSamsClubBySportsclubUuid: (...args: unknown[]) => mockGetSamsClubBySportsclubUuid(...args),
    getSamsClubByNameSlug: (...args: unknown[]) => mockGetSamsClubByNameSlug(...args),
  };
});

import { findTeamLogoUrlInRankingTeams, handleGetTeamLogoUrl } from "./sams.server";

describe("findTeamLogoUrlInRankingTeams", () => {
  it("returns logoUrl from an existing ranking projection team entry", () => {
    expect(
      findTeamLogoUrlInRankingTeams("team-opp", [
        [{ uuid: "team-ours", logoUrl: "https://cdn.example.com/ours.png" }],
        [{ uuid: "team-other" }, { uuid: "team-opp", logoUrl: "https://cdn.example.com/opp.png" }],
      ]),
    ).toBe("https://cdn.example.com/opp.png");
  });

  it("returns null when the team is absent or has no logoUrl", () => {
    expect(
      findTeamLogoUrlInRankingTeams("team-missing", [
        [{ uuid: "team-ours", logoUrl: "https://cdn.example.com/ours.png" }],
        [{ uuid: "team-opp" }],
      ]),
    ).toBeNull();
  });
});

describe("handleGetTeamLogoUrl", () => {
  beforeEach(() => {
    mockTeamLogoGet.mockReset();
    mockRankingGet.mockReset();
    mockGetSamsTeamByUuid.mockReset();
    mockGetAllSamsTeams.mockReset();
    mockGetSamsClubBySportsclubUuid.mockReset();
    mockGetSamsClubByNameSlug.mockReset();
    mockGetSamsClubByNameSlug.mockResolvedValue(null);
    process.env.MEDIA_CLOUDFRONT_URL = "https://cdn.example.com";
  });

  it("returns the stored logo URL for an opponent team UUID from the index", async () => {
    mockTeamLogoGet.mockResolvedValue({
      type: "teamlogo",
      teamUuid: "team-opponent",
      logoUrl: "https://cdn.example.com/sams-logos/opponent.png",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ttl: 1,
    });

    await expect(handleGetTeamLogoUrl("team-opponent")).resolves.toBe(
      "https://cdn.example.com/sams-logos/opponent.png",
    );
    expect(mockTeamLogoGet).toHaveBeenCalledWith("team-opponent");
    expect(mockGetSamsTeamByUuid).not.toHaveBeenCalled();
  });

  it("falls back to owned club CDN when the team logo index is empty", async () => {
    mockTeamLogoGet.mockResolvedValue(null);
    mockGetSamsTeamByUuid.mockResolvedValue({
      uuid: "team-ours",
      sportsclubUuid: "club-ours",
      name: "Markgräfler Volleys",
      nameSlug: "markgraefler-volleys",
      associationUuid: "assoc",
      leagueUuid: "league-1",
      leagueName: "Bezirksliga",
      seasonUuid: "season-1",
      seasonName: "2026/27",
    });
    mockGetSamsClubBySportsclubUuid.mockResolvedValue({
      sportsclubUuid: "club-ours",
      name: "Markgräfler Volleys",
      nameSlug: "markgraefler-volleys",
      logoS3Key: "sams-logos/club-ours.png",
    });

    await expect(handleGetTeamLogoUrl("team-ours")).resolves.toBe(
      "https://cdn.example.com/sams-logos/club-ours.png",
    );
    expect(mockRankingGet).not.toHaveBeenCalled();
  });

  it("falls back to an existing ranking projection logoUrl when the index is empty", async () => {
    mockTeamLogoGet.mockResolvedValue(null);
    mockGetSamsTeamByUuid.mockResolvedValue(null);
    mockGetAllSamsTeams.mockResolvedValue({
      items: [
        {
          uuid: "team-ours",
          sportsclubUuid: "club-ours",
          leagueUuid: "league-1",
          seasonUuid: "season-1",
          name: "MV",
          nameSlug: "mv",
          associationUuid: "assoc",
          leagueName: "Bezirksliga",
          seasonName: "2026/27",
        },
      ],
      lastEvaluatedKey: undefined,
    });
    mockRankingGet.mockResolvedValue({
      leagueUuid: "league-1",
      seasonUuid: "season-1",
      teams: [
        { uuid: "team-ours", teamName: "MV", logoUrl: "https://cdn.example.com/ours.png" },
        {
          uuid: "team-opponent",
          teamName: "Opponent",
          logoUrl: "https://cdn.example.com/sams-logos/opponent.png",
        },
      ],
      snapshotVersion: "v1",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ttl: 1,
      type: "ranking",
    });

    await expect(handleGetTeamLogoUrl("team-opponent")).resolves.toBe(
      "https://cdn.example.com/sams-logos/opponent.png",
    );
    expect(mockRankingGet).toHaveBeenCalledWith("league-1", "season-1");
  });

  it("returns null when index, owned club, and ranking projections all lack a logo", async () => {
    mockTeamLogoGet.mockResolvedValue(null);
    mockGetSamsTeamByUuid.mockResolvedValue(null);
    mockGetAllSamsTeams.mockResolvedValue({
      items: [
        {
          uuid: "team-ours",
          sportsclubUuid: "club-ours",
          leagueUuid: "league-1",
          seasonUuid: "season-1",
          name: "MV",
          nameSlug: "mv",
          associationUuid: "assoc",
          leagueName: "Bezirksliga",
          seasonName: "2026/27",
        },
      ],
      lastEvaluatedKey: undefined,
    });
    mockRankingGet.mockResolvedValue({
      leagueUuid: "league-1",
      seasonUuid: "season-1",
      teams: [{ uuid: "team-opponent", teamName: "Opponent" }],
      snapshotVersion: "v1",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ttl: 1,
      type: "ranking",
    });

    await expect(handleGetTeamLogoUrl("team-opponent")).resolves.toBeNull();
  });
});
