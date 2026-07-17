import { describe, expect, it } from "vite-plus/test";

/**
 * Spike gate: fromZodSchema requires Zod v3 exports (ZodEffects) and a broken package
 * subpath (missing index.js). This project uses Zod v4 — manual Toolbox schemas are used
 * instead, with contract tests guarding Zod ↔ Toolbox parity.
 */
describe("fromZodSchema spike (Zod v4 compatibility)", () => {
  it("documents that fromZodSchema is incompatible with Zod v4 at runtime", async () => {
    const modulePath = "dynamodb-toolbox/schema/actions/fromZodSchema";
    await expect(async () => {
      await import(/* @vite-ignore */ modulePath);
    }).rejects.toThrow();
  });
});
