import { describe, expect, it } from "vite-plus/test";
import { createWebcalLink, getWebcalOrigin } from "./webcal";

describe("createWebcalLink", () => {
  it("produces a webcal link with a leading slash path", () => {
    expect(createWebcalLink("/ics/calendar.ics")).toBe(
      "webcal://markgraefler-volleys.de/ics/calendar.ics",
    );
  });

  it("adds a leading slash when path has none", () => {
    expect(createWebcalLink("ics/calendar.ics")).toBe(
      "webcal://markgraefler-volleys.de/ics/calendar.ics",
    );
  });

  it("handles root path", () => {
    expect(createWebcalLink("/")).toBe("webcal://markgraefler-volleys.de/");
  });

  it("uses a custom origin when provided", () => {
    expect(createWebcalLink("/ics/calendar.ics", "http://localhost:3080")).toBe(
      "webcal://localhost:3080/ics/calendar.ics",
    );
  });
});

describe("getWebcalOrigin", () => {
  it("reads the origin from a request URL", () => {
    expect(getWebcalOrigin({ url: "http://localhost:3080/matches" })).toBe("http://localhost:3080");
  });

  it("falls back to the club URL when no request is provided", () => {
    expect(getWebcalOrigin()).toBe("https://markgraefler-volleys.de");
  });
});
