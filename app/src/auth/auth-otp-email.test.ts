import { describe, expect, it } from "vite-plus/test";
import { buildOtpEmailHtml, buildOtpEmailSubject, buildOtpEmailText } from "./auth-otp-email";

const BASE_OPTIONS = {
  otp: "123456",
  otpLoginLink:
    "https://markgraefler-volleys.de/admin/otp-login?email=test%40example.com&otp=123456",
  clubShortName: "MV",
  domain: "markgraefler-volleys.de",
  expirationMinutes: 10,
};

describe("buildOtpEmailSubject", () => {
  it("includes the club short name", () => {
    expect(buildOtpEmailSubject("MV")).toContain("MV");
  });

  it("returns a non-empty string", () => {
    expect(buildOtpEmailSubject("MV").length).toBeGreaterThan(0);
  });
});

describe("buildOtpEmailHtml", () => {
  it("includes the OTP code", () => {
    const html = buildOtpEmailHtml(BASE_OPTIONS);
    expect(html).toContain("123456");
  });

  it("includes the login link", () => {
    const html = buildOtpEmailHtml(BASE_OPTIONS);
    expect(html).toContain(BASE_OPTIONS.otpLoginLink);
  });

  it("includes the club short name", () => {
    const html = buildOtpEmailHtml(BASE_OPTIONS);
    expect(html).toContain("MV");
  });

  it("includes the expiration time", () => {
    const html = buildOtpEmailHtml(BASE_OPTIONS);
    expect(html).toContain("10 Minuten");
  });

  it("includes the WICG autofill origin-binding comment for Safari/iOS autofill", () => {
    const html = buildOtpEmailHtml(BASE_OPTIONS);
    expect(html).toContain("<!-- @markgraefler-volleys.de #123456 -->");
  });

  it("sets link target to _blank with noopener noreferrer", () => {
    const html = buildOtpEmailHtml(BASE_OPTIONS);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("does NOT expose the login link in the OTP code element", () => {
    // The <h2> containing the OTP should only contain the bare code, not a URL
    const html = buildOtpEmailHtml(BASE_OPTIONS);
    const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    expect(h2Match).not.toBeNull();
    expect(h2Match![1]).not.toContain("http");
  });
});

describe("buildOtpEmailText", () => {
  it("includes the OTP code", () => {
    const text = buildOtpEmailText(BASE_OPTIONS);
    expect(text).toContain("123456");
  });

  it("includes the login link", () => {
    const text = buildOtpEmailText(BASE_OPTIONS);
    expect(text).toContain(BASE_OPTIONS.otpLoginLink);
  });

  it("includes the club short name", () => {
    const text = buildOtpEmailText(BASE_OPTIONS);
    expect(text).toContain("MV");
  });

  it("includes the expiration time", () => {
    const text = buildOtpEmailText(BASE_OPTIONS);
    expect(text).toContain("10 Minuten");
  });

  it("ends with the WICG autofill origin-binding line for Safari/iOS autofill", () => {
    const text = buildOtpEmailText(BASE_OPTIONS);
    expect(text.trimEnd()).toMatch(/@markgraefler-volleys\.de #123456$/);
  });
});
