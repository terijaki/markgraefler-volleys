import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cr from "aws-cdk-lib/custom-resources";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import type { Construct } from "constructs";

export interface DnsStackProps extends cdk.StackProps {
  // Manually created resources in AWS Console
  hostedZoneId: string;
  hostedZoneName: string;
  regionalCertificateArn: string; // Certificate in eu-central-1 for API Gateway
  cloudFrontCertificateArn?: string; // Certificate in us-east-1 for CloudFront
  /** Prod-only: delegate the dev subdomain to the dev account nameservers. */
  devSubdomainDelegation?: {
    recordName: string;
    nameservers: readonly string[];
  };
}

/**
 * DNS Stack - References manually created Route53 and ACM resources
 *
 * These resources are shared across all environments (prod, dev, dev-feature)
 * and should be created manually in the AWS Console:
 *
 * 1. Route53 Hosted Zone: new.markgraefler-volleys.de
 * 2. ACM Certificate: *.new.markgraefler-volleys.de (with SAN: new.markgraefler-volleys.de)
 *
 * This prevents accidental deletion and ensures stable nameservers.
 */
export class DnsStack extends cdk.Stack {
  public readonly hostedZone: route53.IHostedZone;
  public readonly regionalCertificate: acm.ICertificate;
  public readonly cloudFrontCertificate: acm.ICertificate | undefined;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    // Import existing hosted zone created manually
    this.hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.hostedZoneName,
    });

    // Import existing ACM certificate for API Gateway (eu-central-1)
    this.regionalCertificate = acm.Certificate.fromCertificateArn(
      this,
      "RegionalCertificate",
      props.regionalCertificateArn,
    );

    // Import CloudFront certificate if provided (must be in us-east-1)
    this.cloudFrontCertificate = props.cloudFrontCertificateArn
      ? acm.Certificate.fromCertificateArn(
          this,
          "CloudFrontCertificate",
          props.cloudFrontCertificateArn,
        )
      : undefined;

    if (props.devSubdomainDelegation) {
      const delegation = props.devSubdomainDelegation;
      const recordFqdn = `${delegation.recordName}.${props.hostedZoneName}.`;
      const ttlSeconds = cdk.Duration.hours(1).toSeconds();
      const resourceRecords = delegation.nameservers.map((nameserver) => ({
        Value: nameserver.endsWith(".") ? nameserver : `${nameserver}.`,
      }));
      const changeBatch = {
        Changes: [
          {
            Action: "UPSERT",
            ResourceRecordSet: {
              Name: recordFqdn,
              Type: "NS",
              TTL: ttlSeconds,
              ResourceRecords: resourceRecords,
            },
          },
        ],
      };

      // UPSERT so prod cutover succeeds when the NS delegation was created manually first.
      new cr.AwsCustomResource(this, "DevSubdomainDelegation", {
        onCreate: {
          service: "Route53",
          action: "changeResourceRecordSets",
          parameters: {
            HostedZoneId: props.hostedZoneId,
            ChangeBatch: changeBatch,
          },
          physicalResourceId: cr.PhysicalResourceId.of(
            `dev-subdomain-delegation-${props.hostedZoneId}`,
          ),
        },
        onUpdate: {
          service: "Route53",
          action: "changeResourceRecordSets",
          parameters: {
            HostedZoneId: props.hostedZoneId,
            ChangeBatch: changeBatch,
          },
        },
        policy: cr.AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            actions: ["route53:ChangeResourceRecordSets", "route53:GetChange"],
            resources: [`arn:aws:route53:::hostedzone/${props.hostedZoneId}`],
          }),
        ]),
      });
    }
  }
}
