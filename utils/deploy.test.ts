import { describe, expect, it } from "vite-plus/test";
import { shouldDeployAccountOpsStacks } from "./deploy";

describe("shouldDeployAccountOpsStacks", () => {
  it("deploys account ops for production", () => {
    expect(shouldDeployAccountOpsStacks({ isProd: true, branch: "" })).toBe(true);
    expect(shouldDeployAccountOpsStacks({ isProd: true, branch: "feature-foo" })).toBe(true);
  });

  it("deploys account ops for shared dev main branch", () => {
    expect(shouldDeployAccountOpsStacks({ isProd: false, branch: "" })).toBe(true);
  });

  it("skips account ops for feature branches", () => {
    expect(shouldDeployAccountOpsStacks({ isProd: false, branch: "feature-foo" })).toBe(false);
  });
});
