import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mockTeamLogoGet = vi.fn();

vi.mock("@/lib/db/repositories", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/repositories")>();
  return {
    ...actual,
    samsTeamLogoRepository: {
      get: (...args: unknown[]) => mockTeamLogoGet(...args),
      upsert: vi.fn(),
    },
  };
});

import { handleGetTeamLogoUrl } from "./sams.server";

describe("handleGetTeamLogoUrl", () => {
  beforeEach(() => {
    mockTeamLogoGet.mockReset();
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
  });

  it("returns null when the team logo index has no entry (absent projection data)", async () => {
    mockTeamLogoGet.mockResolvedValue(null);
    await expect(handleGetTeamLogoUrl("team-missing")).resolves.toBeNull();
  });
});
