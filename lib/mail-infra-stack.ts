import * as cdk from "aws-cdk-lib";
import * as cr from "aws-cdk-lib/custom-resources";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ses from "aws-cdk-lib/aws-ses";
import * as sesActions from "aws-cdk-lib/aws-ses-actions";
import type { Construct } from "constructs";
import {
  MAIL_DMARC_POLICY,
  MAIL_INBOUND_MX_HOST,
  computeMailFromDomain,
  computeMailInboundBucketName,
  computeMailReceiptRuleName,
  computeMailReceiptRuleSetName,
  getMailEnvironmentConfig,
  getMailInboundLifecycleDays,
} from "./mail-env";

export interface MailInfraStackProps extends cdk.StackProps {
  stackProps?: {
    environment: string;
  };
  hostedZoneId: string;
  hostedZoneName: string;
}

/**
 * Environment-scoped mail infrastructure (singleton per environment).
 *
 * Owns shared SES identity, mail-auth DNS, inbound S3 bucket, and the active
 * receipt rule set. Branch-scoped forwarding lives in {@link MailStack}.
 */
export class MailInfraStack extends cdk.Stack {
  public readonly inboundBucket: s3.Bucket;
  /** Stable plain-string bucket name for cross-stack references without CFN exports. */
  public readonly inboundBucketName: string;

  constructor(scope: Construct, id: string, props: MailInfraStackProps) {
    super(scope, id, props);

    const environment = props.stackProps?.environment || "dev";
    const mailConfig = getMailEnvironmentConfig(environment);
    const lifecycleDays = getMailInboundLifecycleDays(environment);

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.hostedZoneName,
    });

    this.inboundBucketName = computeMailInboundBucketName(environment);
    this.inboundBucket = new s3.Bucket(this, "InboundBucket", {
      bucketName: this.inboundBucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      eventBridgeEnabled: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(lifecycleDays),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new ses.EmailIdentity(this, "DomainIdentity", {
      identity: ses.Identity.publicHostedZone(hostedZone),
      mailFromDomain: computeMailFromDomain(environment),
      dkimSigning: true,
    });

    new route53.MxRecord(this, "InboundMx", {
      zone: hostedZone,
      values: [{ priority: 10, hostName: MAIL_INBOUND_MX_HOST }],
      ttl: cdk.Duration.seconds(300),
    });

    new route53.TxtRecord(this, "Dmarc", {
      zone: hostedZone,
      recordName: "_dmarc",
      values: [MAIL_DMARC_POLICY],
      ttl: cdk.Duration.seconds(300),
    });

    const receiptRuleSet = new ses.ReceiptRuleSet(this, "InboundRuleSet", {
      receiptRuleSetName: computeMailReceiptRuleSetName(environment),
    });

    receiptRuleSet.addRule("StoreInbound", {
      receiptRuleName: computeMailReceiptRuleName(environment),
      recipients: [mailConfig.recipientDomain],
      scanEnabled: true,
      tlsPolicy: ses.TlsPolicy.OPTIONAL,
      actions: [new sesActions.S3({ bucket: this.inboundBucket })],
    });

    new cr.AwsCustomResource(this, "ActivateReceiptRuleSet", {
      onCreate: {
        service: "SES",
        action: "setActiveReceiptRuleSet",
        parameters: {
          RuleSetName: receiptRuleSet.receiptRuleSetName,
        },
        physicalResourceId: cr.PhysicalResourceId.of(`${receiptRuleSet.receiptRuleSetName}-active`),
      },
      onUpdate: {
        service: "SES",
        action: "setActiveReceiptRuleSet",
        parameters: {
          RuleSetName: receiptRuleSet.receiptRuleSetName,
        },
      },
      onDelete: {
        service: "SES",
        action: "setActiveReceiptRuleSet",
        parameters: {},
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });
  }
}
