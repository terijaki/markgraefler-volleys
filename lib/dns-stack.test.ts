import { describe, it } from "vite-plus/test";
import { Template } from "aws-cdk-lib/assertions";
import { DnsStack } from "./dns-stack";
import { createTestApp } from "./test-helpers";

describe("DnsStack", () => {
  const testProps = {
    hostedZoneId: "Z1234567890ABC",
    hostedZoneName: "new.markgraefler-volleys.de",
    regionalCertificateArn: "arn:aws:acm:eu-central-1:123456789012:certificate/test-cert-id",
  };

  it("should create stack without any new resources", () => {
    const app = createTestApp();
    const stack = new DnsStack(app, "TestStack", testProps);

    const template = Template.fromStack(stack);

    // DNS stack only imports existing resources, creates no new ones
    // It should have no Route53 HostedZone resources (only imports)
    template.resourceCountIs("AWS::Route53::HostedZone", 0);

    // It should have no ACM Certificate resources (only imports)
    template.resourceCountIs("AWS::CertificateManager::Certificate", 0);
  });

  it("should import hosted zone correctly", () => {
    const app = createTestApp();
    const stack = new DnsStack(app, "TestStack", testProps);

    // Access the imported hosted zone
    const hostedZone = stack.hostedZone;

    // Verify hosted zone attributes
    if (hostedZone.hostedZoneId !== "Z1234567890ABC") {
      throw new Error(`Expected hosted zone ID Z1234567890ABC, got ${hostedZone.hostedZoneId}`);
    }

    if (hostedZone.zoneName !== "new.markgraefler-volleys.de") {
      throw new Error(`Expected zone name new.markgraefler-volleys.de, got ${hostedZone.zoneName}`);
    }
  });

  it("should import certificate correctly", () => {
    const app = createTestApp();
    const stack = new DnsStack(app, "TestStack", testProps);

    // Access the imported certificate
    const certificate = stack.regionalCertificate;

    // Verify certificate ARN
    if (certificate.certificateArn !== testProps.regionalCertificateArn) {
      throw new Error(
        `Expected certificate ARN ${testProps.regionalCertificateArn}, got ${certificate.certificateArn}`,
      );
    }
  });

  it("should import CloudFront certificate when provided", () => {
    const app = createTestApp();
    const cloudFrontCertArn = "arn:aws:acm:us-east-1:123456789012:certificate/cloudfront-cert-id";
    const stack = new DnsStack(app, "TestStack", {
      ...testProps,
      cloudFrontCertificateArn: cloudFrontCertArn,
    });

    // Access the imported CloudFront certificate
    const cloudFrontCertificate = stack.cloudFrontCertificate;

    if (!cloudFrontCertificate) {
      throw new Error("Expected CloudFront certificate to be imported");
    }

    if (cloudFrontCertificate.certificateArn !== cloudFrontCertArn) {
      throw new Error(
        `Expected CloudFront certificate ARN ${cloudFrontCertArn}, got ${cloudFrontCertificate.certificateArn}`,
      );
    }
  });

  it("should not import CloudFront certificate when not provided", () => {
    const app = createTestApp();
    const stack = new DnsStack(app, "TestStack", testProps);

    // CloudFront certificate should be undefined
    if (stack.cloudFrontCertificate !== undefined) {
      throw new Error("Expected CloudFront certificate to be undefined");
    }
  });

  it("should create no stack outputs", () => {
    const app = createTestApp();
    const stack = new DnsStack(app, "TestStack", {
      ...testProps,
      cloudFrontCertificateArn: "arn:aws:acm:us-east-1:123456789012:certificate/cloudfront-cert-id",
    });

    const template = Template.fromStack(stack);

    // DNS stack only imports resources, it creates no CloudFormation outputs
    const outputs = template.findOutputs("*");
    const outputKeys = Object.keys(outputs);

    if (outputKeys.length !== 0) {
      throw new Error(`Expected no outputs, got: ${outputKeys.join(", ")}`);
    }
  });

  it("should upsert dev subdomain NS delegation when configured", () => {
    const app = createTestApp();
    const stack = new DnsStack(app, "TestStackDelegation", {
      ...testProps,
      hostedZoneName: "markgraefler-volleys.de",
      devSubdomainDelegation: {
        recordName: "new",
        nameservers: ["ns-1513.awsdns-61.org", "ns-1995.awsdns-57.co.uk"],
      },
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs("Custom::AWS", 1);

    const resources = template.findResources("Custom::AWS");
    const createPayload = Object.values(resources)[0]?.Properties?.Create;
    if (typeof createPayload !== "string") {
      throw new Error("Expected dev subdomain delegation custom resource Create payload");
    }

    const create = JSON.parse(createPayload) as {
      service: string;
      action: string;
      parameters: {
        ChangeBatch: {
          Changes: Array<{
            Action: string;
            ResourceRecordSet: {
              Name: string;
              Type: string;
              TTL: number;
              ResourceRecords: Array<{ Value: string }>;
            };
          }>;
        };
      };
    };

    if (create.service !== "Route53" || create.action !== "changeResourceRecordSets") {
      throw new Error("Expected Route53 changeResourceRecordSets upsert custom resource");
    }

    const recordSet = create.parameters.ChangeBatch.Changes[0]?.ResourceRecordSet;
    if (create.parameters.ChangeBatch.Changes[0]?.Action !== "UPSERT") {
      throw new Error("Expected UPSERT action for dev subdomain delegation");
    }
    if (recordSet?.Name !== "new.markgraefler-volleys.de.") {
      throw new Error(
        `Expected delegation record name new.markgraefler-volleys.de., got ${recordSet?.Name}`,
      );
    }
    if (recordSet?.Type !== "NS") {
      throw new Error(`Expected NS record type, got ${recordSet?.Type}`);
    }

    if (!stack.hostedZone) {
      throw new Error("Expected hosted zone to be available");
    }
  });

  it("should not create NS delegation without devSubdomainDelegation prop", () => {
    const app = createTestApp();
    const stack = new DnsStack(app, "TestStackNoDelegation", testProps);

    const template = Template.fromStack(stack);
    template.resourceCountIs("Custom::AWS", 0);
  });
});
