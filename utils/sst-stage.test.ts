import { describe, expect, it } from "vitest";
import {
  getDeploymentContext,
  parseDeploymentFromStage,
  resolveSstStage,
  SST_PRODUCTION_STAGE,
} from "./sst-stage";

describe("resolveSstStage", () => {
  it("returns production for main branch", () => {
    expect(resolveSstStage()).toBe(SST_PRODUCTION_STAGE);
  });

  it("returns feature stage for feature branches", () => {
    process.env.CDK_BRANCH_OVERWRITE = "email-proxy";
    expect(resolveSstStage()).toBe("feature-email-proxy");
    delete process.env.CDK_BRANCH_OVERWRITE;
  });

  it("respects explicit SST_STAGE override", () => {
    process.env.SST_STAGE = "feature-custom";
    expect(resolveSstStage()).toBe("feature-custom");
    delete process.env.SST_STAGE;
  });
});

describe("parseDeploymentFromStage", () => {
  it("maps production stage to prod environment", () => {
    expect(parseDeploymentFromStage("production")).toEqual({
      stage: "production",
      environment: "prod",
      branch: "",
      branchSuffix: "",
      isProd: true,
    });
  });

  it("maps feature stage to dev environment with branch suffix", () => {
    expect(parseDeploymentFromStage("feature-email-proxy")).toEqual({
      stage: "feature-email-proxy",
      environment: "dev",
      branch: "email-proxy",
      branchSuffix: "-email-proxy",
      isProd: false,
    });
  });
});

describe("getDeploymentContext", () => {
  it("uses SST_STAGE when provided", () => {
    process.env.SST_STAGE = "feature-foo";
    expect(getDeploymentContext().branch).toBe("foo");
    delete process.env.SST_STAGE;
  });
});
