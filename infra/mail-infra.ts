/// <reference path="./sst-reference.d.ts" />

import { DNS } from "@/project.config";
import {
  MAIL_DMARC_POLICY,
  MAIL_INBOUND_MX_HOST,
  computeMailFromDomain,
  computeMailInboundBucketName,
  computeMailReceiptRuleName,
  computeMailReceiptRuleSetName,
  getMailEnvironmentConfig,
  getMailInboundLifecycleDays,
} from "@/lib/mail-env";
import type { DeploymentContext } from "@utils/sst-stage";

function getHostedZone(ctx: DeploymentContext) {
  return ctx.isProd ? DNS.prod : DNS.dev;
}

/**
 * Environment-scoped mail infrastructure (singleton per AWS account).
 *
 * SES identity, mail-auth DNS, inbound S3 bucket, and active receipt rule set.
 * Branch-scoped forwarding lives in `infra/mail.ts`.
 */
export function createMailInfraResources(ctx: DeploymentContext) {
  const zone = getHostedZone(ctx);
  const mailConfig = getMailEnvironmentConfig(ctx.environment);
  const lifecycleDays = getMailInboundLifecycleDays(ctx.environment);
  const inboundBucketName = computeMailInboundBucketName(ctx.environment);
  const mailFromDomain = computeMailFromDomain(ctx.environment);
  const ruleSetName = computeMailReceiptRuleSetName(ctx.environment);
  const ruleName = computeMailReceiptRuleName(ctx.environment);

  const inboundBucket = new aws.s3.BucketV2("MailInboundBucket", {
    bucket: inboundBucketName,
    forceDestroy: false,
  });

  new aws.s3.BucketLifecycleConfigurationV2("MailInboundBucketLifecycle", {
    bucket: inboundBucket.id,
    rules: [
      {
        id: "expire-inbound-mail",
        status: "Enabled",
        expiration: { days: lifecycleDays },
      },
    ],
  });

  new aws.s3.BucketServerSideEncryptionConfigurationV2("MailInboundBucketEncryption", {
    bucket: inboundBucket.id,
    rules: [{ applyServerSideEncryptionByDefault: { sseAlgorithm: "AES256" } }],
  });

  new aws.s3.BucketPublicAccessBlock("MailInboundBucketPublicAccessBlock", {
    bucket: inboundBucket.id,
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
  });

  new aws.s3.BucketPolicy("MailInboundBucketPolicy", {
    bucket: inboundBucket.id,
    policy: inboundBucket.arn.apply((arn) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "DenyInsecureTransport",
            Effect: "Deny",
            Principal: "*",
            Action: "s3:*",
            Resource: [arn, `${arn}/*`],
            Condition: { Bool: { "aws:SecureTransport": "false" } },
          },
        ],
      }),
    ),
  });

  new aws.s3.BucketNotification("MailInboundBucketNotification", {
    bucket: inboundBucket.id,
    eventbridge: true,
  });

  const domainIdentity = new aws.ses.DomainIdentity("MailDomainIdentity", {
    domain: mailConfig.recipientDomain,
  });

  new aws.ses.DomainDkim("MailDomainDkim", {
    domain: domainIdentity.domain,
  });

  new aws.ses.DomainMailFrom("MailDomainMailFrom", {
    domain: domainIdentity.domain,
    mailFromDomain,
  });

  new aws.route53.Record("MailInboundMx", {
    zoneId: zone.hostedZoneId,
    name: mailConfig.recipientDomain,
    type: "MX",
    ttl: 300,
    records: [`10 ${MAIL_INBOUND_MX_HOST}`],
  });

  new aws.route53.Record("MailDmarc", {
    zoneId: zone.hostedZoneId,
    name: `_dmarc.${mailConfig.recipientDomain}`,
    type: "TXT",
    ttl: 300,
    records: [MAIL_DMARC_POLICY],
  });

  const receiptRuleSet = new aws.ses.ReceiptRuleSet("MailInboundRuleSet", {
    ruleSetName,
  });

  new aws.ses.ReceiptRule("MailStoreInboundRule", {
    name: ruleName,
    ruleSetName: receiptRuleSet.ruleSetName,
    recipients: [mailConfig.recipientDomain],
    scanEnabled: true,
    tlsPolicy: "Optional",
    s3Actions: [
      {
        bucketName: inboundBucket.bucket,
        position: 1,
      },
    ],
  });

  new aws.ses.ActiveReceiptRuleSet("MailActiveReceiptRuleSet", {
    ruleSetName: receiptRuleSet.ruleSetName,
  });

  return { inboundBucketName: inboundBucket.bucket };
}
