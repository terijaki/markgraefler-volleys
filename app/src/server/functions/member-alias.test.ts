import { describe, expect, test } from "vite-plus/test";
import {
  canonicalizeProxyAlias,
  getProxyAliasBranchName,
  getProxyAliasDomain,
  isProdProxyAliasDomain,
  normalizeAliasLocalPart,
  parseProxyAlias,
  suggestProxyAlias,
} from "./member-alias";

describe("normalizeAliasLocalPart", () => {
  test("lowercases plain ASCII names", () => {
    expect(normalizeAliasLocalPart("Max Muster")).toBe("max.muster");
  });

  test("replaces spaces with dots", () => {
    expect(normalizeAliasLocalPart("Hans Georg Mustermann")).toBe("hans.georg.mustermann");
  });

  test("converts German umlauts to ASCII equivalents", () => {
    expect(normalizeAliasLocalPart("Max Müller")).toBe("max.mueller");
    expect(normalizeAliasLocalPart("Björn Köhnen")).toBe("bjoern.koehnen");
    expect(normalizeAliasLocalPart("Jürgen Ößwald")).toBe("juergen.oesswald");
  });

  test("converts all upper-case umlaut variants", () => {
    expect(normalizeAliasLocalPart("Ä Ö Ü ß")).toBe("ae.oe.ue.ss");
  });

  test("collapses consecutive non-alphanumeric characters into a single dot", () => {
    expect(normalizeAliasLocalPart("Anna--Lisa")).toBe("anna.lisa");
    expect(normalizeAliasLocalPart("von  der  Heide")).toBe("von.der.heide");
  });

  test("strips leading and trailing dots", () => {
    expect(normalizeAliasLocalPart(" Max ")).toBe("max");
    expect(normalizeAliasLocalPart(".Max.")).toBe("max");
  });

  test("keeps numbers in the output", () => {
    expect(normalizeAliasLocalPart("Max2 Mustermann")).toBe("max2.mustermann");
  });
});

describe("suggestProxyAlias", () => {
  test("builds full email address from name and domain", () => {
    expect(suggestProxyAlias("Max Müller", "markgraefler-volleys.de")).toBe(
      "max.mueller@markgraefler-volleys.de",
    );
  });

  test("appends plus-address branch suffix when branchName is provided", () => {
    expect(suggestProxyAlias("Max Müller", "markgraefler-volleys.de", "feat-x")).toBe(
      "max.mueller+feat-x@markgraefler-volleys.de",
    );
  });

  test("omits branch suffix when branchName is undefined", () => {
    expect(suggestProxyAlias("Anna Trainer", "markgraefler-volleys.de", undefined)).toBe(
      "anna.trainer@markgraefler-volleys.de",
    );
  });

  test("omits branch suffix when branchName is empty string", () => {
    // Empty string is falsy — no suffix should be added
    expect(suggestProxyAlias("Anna Trainer", "markgraefler-volleys.de", "")).toBe(
      "anna.trainer@markgraefler-volleys.de",
    );
  });

  test("uses the dev branch suffix on the new domain", () => {
    expect(suggestProxyAlias("Max Müller", "new.markgraefler-volleys.de", "email-proxy")).toBe(
      "max.mueller+email-proxy@new.markgraefler-volleys.de",
    );
  });

  test("sanitizes slashes in branch names for valid plus-address suffixes", () => {
    expect(
      suggestProxyAlias("Julia Fischer", "new.markgraefler-volleys.de", "terijaki/f3ed6e0f"),
    ).toBe("julia.fischer+terijaki-f3ed6e0f@new.markgraefler-volleys.de");
  });

  test("applies duplicate numbering before the branch suffix", () => {
    expect(suggestProxyAlias("Max Müller", "new.markgraefler-volleys.de", "email-proxy", 2)).toBe(
      "max.mueller2+email-proxy@new.markgraefler-volleys.de",
    );
  });
});

describe("proxy alias environment helpers", () => {
  test("uses the production recipient domain in prod", () => {
    expect(getProxyAliasDomain("prod")).toBe("markgraefler-volleys.de");
    expect(getProxyAliasBranchName("prod", "email-proxy")).toBeUndefined();
  });

  test("uses the development recipient domain and branch suffix outside prod", () => {
    expect(getProxyAliasDomain("dev")).toBe("new.markgraefler-volleys.de");
    expect(getProxyAliasBranchName("dev", "email-proxy")).toBe("email-proxy");
  });

  test("infers recipient domain from hostname when build-time env is missing", () => {
    const previousEnvironment = process.env.CDK_ENVIRONMENT;
    delete process.env.CDK_ENVIRONMENT;

    try {
      expect(getProxyAliasDomain(undefined, "markgraefler-volleys.de")).toBe(
        "markgraefler-volleys.de",
      );
      expect(getProxyAliasDomain(undefined, "www.markgraefler-volleys.de")).toBe(
        "markgraefler-volleys.de",
      );
      expect(getProxyAliasDomain(undefined, "dev.new.markgraefler-volleys.de")).toBe(
        "new.markgraefler-volleys.de",
      );
    } finally {
      if (previousEnvironment === undefined) {
        delete process.env.CDK_ENVIRONMENT;
      } else {
        process.env.CDK_ENVIRONMENT = previousEnvironment;
      }
    }
  });

  test("prefers dev hostname over build-time prod env", () => {
    expect(getProxyAliasDomain("prod", "dev.new.markgraefler-volleys.de")).toBe(
      "new.markgraefler-volleys.de",
    );
  });

  test("keeps branch suffix on dev domain when build-time env is prod", () => {
    expect(getProxyAliasBranchName("prod", "email-proxy", "new.markgraefler-volleys.de")).toBe(
      "email-proxy",
    );
  });

  test("sanitizes slashes in raw branch names for alias suffixes", () => {
    expect(getProxyAliasBranchName("dev", "terijaki/f3ed6e0f", "new.markgraefler-volleys.de")).toBe(
      "terijaki-f3ed6e0f",
    );
  });

  test("hides branch suffix on production recipient domains", () => {
    expect(isProdProxyAliasDomain("markgraefler-volleys.de")).toBe(true);
    expect(getProxyAliasBranchName("dev", "main", "markgraefler-volleys.de")).toBeUndefined();
    expect(getProxyAliasBranchName(undefined, "main", "markgraefler-volleys.de")).toBeUndefined();
  });

  test("hides the main branch suffix outside prod", () => {
    expect(getProxyAliasBranchName("dev", "main", "new.markgraefler-volleys.de")).toBeUndefined();
    expect(
      getProxyAliasBranchName(undefined, "main", "new.markgraefler-volleys.de"),
    ).toBeUndefined();
  });
});

describe("parseProxyAlias", () => {
  test("splits base local part, branch suffix and domain", () => {
    expect(
      parseProxyAlias("max.mueller+email-proxy@new.markgraefler-volleys.de", "fallback.de"),
    ).toEqual({
      baseLocalPart: "max.mueller",
      branchName: "email-proxy",
      domain: "new.markgraefler-volleys.de",
    });
  });

  test("uses fallback domain and no branch for plain local-part", () => {
    expect(parseProxyAlias("max.mueller", "new.markgraefler-volleys.de")).toEqual({
      baseLocalPart: "max.mueller",
      branchName: undefined,
      domain: "new.markgraefler-volleys.de",
    });
  });
});

describe("canonicalizeProxyAlias", () => {
  test("adds current branch suffix in dev", () => {
    expect(
      canonicalizeProxyAlias("max.mueller@new.markgraefler-volleys.de", "dev", "email-proxy"),
    ).toBe("max.mueller+email-proxy@new.markgraefler-volleys.de");
  });

  test("rewrites stale branch suffix to current branch in dev", () => {
    expect(
      canonicalizeProxyAlias(
        "max.mueller+old-branch@new.markgraefler-volleys.de",
        "dev",
        "email-proxy",
      ),
    ).toBe("max.mueller+email-proxy@new.markgraefler-volleys.de");
  });

  test("removes branch suffix in prod", () => {
    expect(
      canonicalizeProxyAlias(
        "max.mueller+email-proxy@markgraefler-volleys.de",
        "prod",
        "email-proxy",
      ),
    ).toBe("max.mueller@markgraefler-volleys.de");
  });

  test("rewrites unsanitized branch suffix to sanitized form in dev", () => {
    expect(
      canonicalizeProxyAlias(
        "julia.fischer+terijaki/f3ed6e0f@new.markgraefler-volleys.de",
        "dev",
        "terijaki/f3ed6e0f",
      ),
    ).toBe("julia.fischer+terijaki-f3ed6e0f@new.markgraefler-volleys.de");
  });
});
