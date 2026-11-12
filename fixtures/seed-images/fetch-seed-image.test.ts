import { describe, expect, it, vi } from "vite-plus/test";
import { fixtureImageUrl } from "./fixture-image";
import { fetchSeedImageBytes } from "./fetch-seed-image";

describe("fetchSeedImageBytes", () => {
  it("does not call fetch for mv-fixture URLs", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await fetchSeedImageBytes(fixtureImageUrl("clubs/club-markgraefler-volleys.jpg"));
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("throws when a fixture file is missing", async () => {
    await expect(fetchSeedImageBytes(fixtureImageUrl("clubs/does-not-exist.jpg"))).rejects.toThrow(
      /Seed fixture image missing/,
    );
  });
});
