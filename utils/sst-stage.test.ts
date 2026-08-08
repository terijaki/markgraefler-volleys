import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getDeploymentContext,
  parseDeploymentFromStage,
  resolveSstStage,
  SST_PRODUCTION_STAGE,
} from "./sst-stage";

const STAGE_ENV_KEYS = [
  "SST_STAGE",
  "CDK_BRANCH_OVERWRITE",
  "GITHUB_REF_NAME",
  "BRANCH_NAME",
] as const;

function clearStageEnv(): void {
  for (const key of STAGE_ENV_KEYS) {
    Reflect.deleteProperty(process.env, key);
  }
}

describe("resolveSstStage", () => {
  beforeEach(() => {
    clearStageEnv();
  });

  afterEach(() => {
    clearStageEnv();
  });

  it("returns production for main branch", () => {
    process.env.CDK_BRANCH_OVERWRITE = "main";
    expect(resolveSstStage()).toBe(SST_PRODUCTION_STAGE);
  });

  it("returns production when no branch context is set", () => {
    expect(resolveSstStage()).toBe(SST_PRODUCTION_STAGE);
  });

  it("returns feature stage for feature branches", () => {
    process.env.CDK_BRANCH_OVERWRITE = "email-proxy";
    expect(resolveSstStage()).toBe("feature-email-proxy");
  });

  it("respects explicit SST_STAGE override", () => {
    process.env.SST_STAGE = "feature-custom";
    expect(resolveSstStage()).toBe("feature-custom");
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
  beforeEach(() => {
    clearStageEnv();
  });

  afterEach(() => {
    clearStageEnv();
  });

  it("uses SST_STAGE when provided", () => {
    process.env.SST_STAGE = "feature-foo";
    expect(getDeploymentContext().branch).toBe("foo");
  });
});
