import { describe, expect, it } from "vite-plus/test";
import { resolveDlqAlertEmail, shouldDeployAccountOpsStacks } from "./cdk-deploy";

describe("shouldDeployAccountOpsStacks", () => {
  it("deploys for production regardless of branch", () => {
    expect(shouldDeployAccountOpsStacks({ isProd: true, branch: "" })).toBe(true);
    expect(shouldDeployAccountOpsStacks({ isProd: true, branch: "feat-foo" })).toBe(true);
  });

  it("deploys for shared dev when branch is empty (main)", () => {
    expect(shouldDeployAccountOpsStacks({ isProd: false, branch: "" })).toBe(true);
  });

  it("skips for feature branches in dev", () => {
    expect(shouldDeployAccountOpsStacks({ isProd: false, branch: "feat-foo" })).toBe(false);
  });
});

describe("resolveDlqAlertEmail", () => {
  it("passes through the email for prod and shared-dev", () => {
    expect(
      resolveDlqAlertEmail({
        deployAccountOpsStacks: true,
        alertEmail: "alerts@example.com",
      }),
    ).toBe("alerts@example.com");
  });

  it("omits the email on feature branches", () => {
    expect(
      resolveDlqAlertEmail({
        deployAccountOpsStacks: false,
        alertEmail: "alerts@example.com",
      }),
    ).toBeUndefined();
  });

  it("stays undefined when no email is configured", () => {
    expect(
      resolveDlqAlertEmail({
        deployAccountOpsStacks: true,
        alertEmail: undefined,
      }),
    ).toBeUndefined();
  });
});
