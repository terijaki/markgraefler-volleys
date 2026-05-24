import { expect, test } from "@playwright/test";

test.describe("public smoke", () => {
  test("homepage renders", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });

    expect(response?.ok()).toBeTruthy();
    await expect(
      page.getByRole("heading", { name: "Volleyball mit Teamgeist im Markgräflerland" }),
    ).toBeVisible();
  });

  const legalPages = [
    { path: "/impressum", heading: /Impressum/i },
    { path: "/datenschutz", heading: /Datenschutzerklärung/i },
  ] as const;

  for (const { path, heading } of legalPages) {
    test(`${path} renders`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });

      expect(response?.ok()).toBeTruthy();
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    });
  }

  test("impressum contains organization name", async ({ page }) => {
    const response = await page.goto("/impressum", { waitUntil: "domcontentloaded" });

    expect(response?.ok()).toBeTruthy();
    await expect(page.getByText("Haftung für Inhalte")).toBeVisible();
  });
});
