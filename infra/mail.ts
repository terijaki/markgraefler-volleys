import { Club } from "@/project.config";
import { computeMailInboundBucketName, getMailEnvironmentConfig } from "@/lib/mail-env";
import type { DeploymentContext } from "@utils/sst-stage";
import type { DatabaseResources } from "./database";
import { createMvFunction } from "./function";

export function createMailResources(
  ctx: DeploymentContext,
  tables: DatabaseResources,
  alertEmail?: string,
) {
  const mailConfig = getMailEnvironmentConfig(ctx.environment);
  const inboundBucketName = computeMailInboundBucketName(ctx.environment);
  const sesIdentity = ctx.isProd ? Club.domain : `new.${Club.domain}`;

  const dlq = new sst.aws.Queue("MailForwardDlq", {
    transform: {
      queue: (args) => {
        args.name = `mail-forward-dlq-${ctx.environment}${ctx.branchSuffix}`;
      },
    },
  });

  const mailForward = createMvFunction(ctx, "MailForward", {
    namespace: "mail",
    name: "mail-forward",
    handler: "lambda/mail/mail-forward.handler",
    memory: "128 MB",
    environment: {
      CDK_ENVIRONMENT: ctx.environment,
      BRANCH_NAME: ctx.isProd ? "" : ctx.branch,
      CONTENT_TABLE_NAME: tables.contentTable.name,
      FORWARD_FROM_EMAIL: mailConfig.systemFromEmail,
      RECIPIENT_DOMAIN: mailConfig.recipientDomain,
    },
    link: [tables.contentTable],
    permissions: [
      {
        actions: ["s3:GetObject"],
        resources: [$interpolate`arn:aws:s3:::${inboundBucketName}/*`],
      },
      {
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: [
          $interpolate`arn:aws:ses:${aws.getRegionOutput().name}:${aws.getCallerIdentityOutput().accountId}:identity/${sesIdentity}`,
        ],
      },
      {
        actions: ["dynamodb:Query"],
        resources: [$interpolate`${tables.contentTable.arn}/index/*`],
      },
    ],
  });

  const rule = new aws.cloudwatch.EventRule("MailInboundRule", {
    name: `mail-inbound-${ctx.environment}${ctx.branchSuffix}`,
    description: `Route inbound SES emails from S3 to mail-forward Lambda (${ctx.environment}${ctx.branchSuffix})`,
    eventPattern: JSON.stringify({
      source: ["aws.s3"],
      "detail-type": ["Object Created"],
      detail: {
        bucket: {
          name: [inboundBucketName],
        },
      },
    }),
  });

  new aws.lambda.Permission("MailInboundPermission", {
    action: "lambda:InvokeFunction",
    function: mailForward.arn,
    principal: "events.amazonaws.com",
    sourceArn: rule.arn,
  });

  new aws.cloudwatch.EventTarget("MailInboundTarget", {
    rule: rule.name,
    arn: mailForward.arn,
    deadLetterConfig: {
      arn: dlq.arn,
    },
    retryPolicy: {
      maximumRetryAttempts: 2,
    },
  });

  if (alertEmail) {
    const alarmTopic = new aws.sns.Topic("MailForwardAlarmTopic", {
      name: `mail-forward-alarm-${ctx.environment}${ctx.branchSuffix}`,
    });

    new aws.sns.TopicSubscription("MailForwardAlarmSubscription", {
      topic: alarmTopic.arn,
      protocol: "email",
      endpoint: alertEmail,
    });

    new aws.cloudwatch.MetricAlarm("MailForwardDlqAlarm", {
      name: `mail-forward-dlq-${ctx.environment}${ctx.branchSuffix}`,
      alarmDescription: "Mail forwarding Lambda has failed processing — check DLQ",
      comparisonOperator: "GreaterThanOrEqualToThreshold",
      evaluationPeriods: 1,
      threshold: 1,
      treatMissingData: "notBreaching",
      metricName: "ApproximateNumberOfMessagesVisible",
      namespace: "AWS/SQS",
      period: 300,
      statistic: "Maximum",
      dimensions: {
        QueueName: `mail-forward-dlq-${ctx.environment}${ctx.branchSuffix}`,
      },
      alarmActions: [alarmTopic.arn],
    });
  }

  return { mailForward, dlq };
}
