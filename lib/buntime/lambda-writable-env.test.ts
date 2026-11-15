import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { BUN_LAMBDA_TASK_BUNFIG, BUN_LAMBDA_WRITABLE_ENV } from "./lambda-writable-env";

const bootstrapPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "bootstrap");

describe("BUN_LAMBDA_WRITABLE_ENV", () => {
  it("matches hard exports in bootstrap (no defaulting syntax)", () => {
    const bootstrap = readFileSync(bootstrapPath, "utf8");
    for (const [key, value] of Object.entries(BUN_LAMBDA_WRITABLE_ENV)) {
      expect(bootstrap).toContain(`export ${key}=${value}`);
    }
    expect(bootstrap).not.toMatch(/\$\{[A-Z_]+:-/);
  });

  it("creates cache directories before exec", () => {
    const bootstrap = readFileSync(bootstrapPath, "utf8");
    expect(bootstrap).toContain(
      "mkdir -p /tmp/.cache /tmp/.bun-install-cache /tmp/.bun-transpiler-cache",
    );
  });
});

describe("BUN_LAMBDA_TASK_BUNFIG", () => {
  it("disables install auto behavior in the task bundle", () => {
    expect(BUN_LAMBDA_TASK_BUNFIG).toContain("[install]");
    expect(BUN_LAMBDA_TASK_BUNFIG).toContain('auto = "disable"');
  });
});
