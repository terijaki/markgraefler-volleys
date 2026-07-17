import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vite-plus/test";
import {
  MAIL_DMARC_POLICY,
  MAIL_INBOUND_MX_HOST,
  computeMailInboundBucketName,
  computeMailReceiptRuleName,
  computeMailReceiptRuleSetName,
  getMailEnvironmentConfig,
} from "./mail-env";
import { MailInfraStack } from "./mail-infra-stack";
import { createTestApp } from "./test-helpers";

const testEnv = {
  account: "123456789012",
  region: "eu-central-1",
};

const testHostedZone = {
  hostedZoneId: "Z1234567890ABC",
  hostedZoneName: "new.markgraefler-volleys.de",
};

function synthesizeMailInfraStack(environment: "dev" | "prod") {
  const app = createTestApp();
  const hostedZoneName =
    environment === "prod" ? "markgraefler-volleys.de" : testHostedZone.hostedZoneName;
  const stack = new MailInfraStack(app, `MailInfra-${environment}`, {
    env: testEnv,
    stackProps: { environment },
    hostedZoneId: testHostedZone.hostedZoneId,
    hostedZoneName,
  });

  return Template.fromStack(stack);
}

describe("MailInfraStack", () => {
  it("does not include branch suffix in inbound bucket name", () => {
    const template = synthesizeMailInfraStack("dev");

    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketName: computeMailInboundBucketName("dev"),
    });

    const serialized = JSON.stringify(template.toJSON());
    expect(serialized).not.toMatch(/feature-/);
  });

  it("configures dev inbound bucket with 3-day lifecycle, SSE, and EventBridge", () => {
    const template = synthesizeMailInfraStack("dev");
    const serialized = JSON.stringify(template.toJSON());

    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketName: computeMailInboundBucketName("dev"),
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: "AES256",
            },
          },
        ],
      },
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            Status: "Enabled",
            ExpirationInDays: 3,
          }),
        ]),
      },
    });

    expect(serialized).toMatch(/EventBridge/i);
  });

  it("configures prod inbound bucket with 14-day lifecycle and RETAIN policy", () => {
    const template = synthesizeMailInfraStack("prod");
    const serialized = JSON.stringify(template.toJSON());

    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketName: computeMailInboundBucketName("prod"),
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            Status: "Enabled",
            ExpirationInDays: 14,
          }),
        ]),
      },
    });

    expect(serialized).toContain('"DeletionPolicy":"Retain"');
  });

  it("creates SES receipt rule with explicit domain recipient, scanning, and S3 action", () => {
    const template = synthesizeMailInfraStack("dev");
    const recipientDomain = getMailEnvironmentConfig("dev").recipientDomain;

    template.hasResourceProperties("AWS::SES::ReceiptRule", {
      Rule: Match.objectLike({
        Enabled: true,
        ScanEnabled: true,
        TlsPolicy: "Optional",
        Recipients: [recipientDomain],
        Actions: Match.arrayWith([
          Match.objectLike({
            S3Action: Match.objectLike({
              BucketName: Match.anyValue(),
            }),
          }),
        ]),
      }),
    });

    template.hasResourceProperties("AWS::SES::ReceiptRuleSet", {
      RuleSetName: computeMailReceiptRuleSetName("dev"),
    });

    template.hasResourceProperties("AWS::SES::ReceiptRule", {
      Rule: Match.objectLike({
        Name: computeMailReceiptRuleName("dev"),
      }),
    });
  });

  it("creates inbound MX record for the regional SES endpoint", () => {
    const template = synthesizeMailInfraStack("prod");

    template.hasResourceProperties("AWS::Route53::RecordSet", {
      Type: "MX",
      Name: "markgraefler-volleys.de.",
      ResourceRecords: Match.arrayWith([Match.stringLikeRegexp(`10 ${MAIL_INBOUND_MX_HOST}`)]),
    });
  });

  it("creates DMARC TXT record with strict reject policy in both environments", () => {
    for (const environment of ["dev", "prod"] as const) {
      const template = synthesizeMailInfraStack(environment);

      template.hasResourceProperties("AWS::Route53::RecordSet", {
        Type: "TXT",
        Name: Match.stringLikeRegexp("_dmarc"),
        ResourceRecords: Match.arrayWith([`"${MAIL_DMARC_POLICY}"`]),
      });
    }
  });

  it("creates SES email identity with custom MAIL FROM domain", () => {
    const template = synthesizeMailInfraStack("prod");

    template.hasResourceProperties("AWS::SES::EmailIdentity", {
      MailFromAttributes: Match.objectLike({
        MailFromDomain: "send.markgraefler-volleys.de",
      }),
    });
  });

  it("activates the receipt rule set via custom resource", () => {
    const template = synthesizeMailInfraStack("dev");
    const serialized = JSON.stringify(template.toJSON());

    expect(serialized).toContain("setActiveReceiptRuleSet");
    expect(serialized).toContain(computeMailReceiptRuleSetName("dev"));
  });
});
