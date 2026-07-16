//
// This file contains variables which are required for several features across the project. They are influenced from external factors and they are put here to easily change these from a central location. They are not sensitive in any way and we are not using environmental variables here for this reason.
//
/** General information about the club. */
export const Club = {
  domain: "markgraefler-volleys.de" as const,
  url: "https://markgraefler-volleys.de" as const,
  name: "Markgräfler Volleys" as const,
  shortName: "Markgräfler Volleys" as const,
  email: "info@markgraefler-volleys.de" as const,
  city: "Müllheim" as const,
  postalCode: 79379 as const,
  slug: "markgraefler-volleys" as const,
};
/** The clubs details on the SAMS platform. */
export const SAMS = {
  name: "Markgräfler Volleys" as const,
  targetClubs: [
    { name: "Markgräfler Volleys" },
    // { name: "VC Müllheim" },
    // { name: "TV Staufen" },
  ] as const,
  server: "https://www.volleyball-baden.de" as const,
  association: { name: "Südbadischer Volleyball-Verband" as const, shortName: "SBVV" as const },
};
/** The clubs Instagram settings. */
export const Instagram = {
  mainAccount: "markgraefler.volleys" as const,
};
/** Shared Sentry configuration for the webapp runtime. */
export const Sentry = {
  dsn: "https://e212a5e77cb27902422468f43c69dcd4@o4511435073257472.ingest.de.sentry.io/4511435323605072" as const,
};
/** AWS DNS resources (manually created in AWS Console, environment-specific). */
export const DNS = {
  // Production DNS (root domain markgraefler-volleys.de)
  prod: {
    hostedZoneId: "Z085046019DWAPA7XR3V9" as const,
    hostedZoneName: "markgraefler-volleys.de" as const,
    certificateArn:
      "arn:aws:acm:eu-central-1:883425316554:certificate/96ffc77f-4a18-42f5-8a6e-bb41e65d552e" as const,
    cloudFrontCertificateArn:
      "arn:aws:acm:us-east-1:883425316554:certificate/8ffc61d1-29e4-4372-9124-ce15e0d2c97a" as const,
  },
  // Development DNS (new.markgraefler-volleys.de subdomain)
  dev: {
    hostedZoneId: "Z09492545ZO3001R9861" as const,
    hostedZoneName: "new.markgraefler-volleys.de" as const,
    /** Route53 nameservers for prod-zone NS delegation of the dev subdomain. */
    delegationNameservers: [
      "ns-1513.awsdns-61.org",
      "ns-1995.awsdns-57.co.uk",
      "ns-718.awsdns-25.net",
      "ns-317.awsdns-39.com",
    ] as const,
    certificateArn:
      "arn:aws:acm:eu-central-1:926634327887:certificate/a50f8fdd-d27b-49ee-9c2d-0aa3a674cc62" as const,
    cloudFrontCertificateArn:
      "arn:aws:acm:us-east-1:926634327887:certificate/8b243612-b168-4e93-b989-746333145fd6" as const,
  },
} as const;
/** AWS Lambda layer ARNs (manually published, environment-specific). */
export const LambdaLayers = {
  prod: {
    imageMagick: "arn:aws:lambda:eu-central-1:883425316554:layer:image-magick:1" as const,
  },
  dev: {
    imageMagick: "arn:aws:lambda:eu-central-1:926634327887:layer:image-magick:1" as const,
  },
} as const;

/** AWS SES mail configuration (environment-specific domain and from addresses). */
export const Mail = {
  prod: {
    recipientDomain: "markgraefler-volleys.de" as const,
    systemFromEmail: "postmaster@markgraefler-volleys.de" as const,
  },
  dev: {
    recipientDomain: "new.markgraefler-volleys.de" as const,
    systemFromEmail: "postmaster@new.markgraefler-volleys.de" as const,
  },
} as const;
