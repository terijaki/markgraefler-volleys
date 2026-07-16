import { describe, expect, it } from "vite-plus/test";
import {
  computeMailFromDomain,
  computeMailInboundBucketName,
  computeMailReceiptRuleName,
  computeMailReceiptRuleSetName,
  getMailInboundLifecycleDays,
} from "./mail-env";

describe("mail-env naming helpers", () => {
  it("computes stable inbound bucket names without branch suffix", () => {
    expect(computeMailInboundBucketName("dev")).toBe("markgraefler-volleys-mail-inbound-dev");
    expect(computeMailInboundBucketName("prod")).toBe("markgraefler-volleys-mail-inbound-prod");
  });

  it("computes receipt rule set and rule names per environment", () => {
    expect(computeMailReceiptRuleSetName("dev")).toBe("mv-inbound-dev");
    expect(computeMailReceiptRuleSetName("prod")).toBe("mv-inbound-prod");
    expect(computeMailReceiptRuleName("dev")).toBe("store-inbound-dev");
    expect(computeMailReceiptRuleName("prod")).toBe("store-inbound-prod");
  });

  it("computes custom MAIL FROM domains", () => {
    expect(computeMailFromDomain("prod")).toBe("send.markgraefler-volleys.de");
    expect(computeMailFromDomain("dev")).toBe("send.new.markgraefler-volleys.de");
  });

  it("uses 3-day dev and 14-day prod inbound lifecycle", () => {
    expect(getMailInboundLifecycleDays("dev")).toBe(3);
    expect(getMailInboundLifecycleDays("prod")).toBe(14);
  });
});
