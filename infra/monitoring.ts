/// <reference path="./sst-reference.d.ts" />

import type { DeploymentContext } from "@utils/sst-stage";
import type { DatabaseResources } from "./database";
import type { WebappResources } from "./webapp";

export function createMonitoringResources(
  ctx: DeploymentContext,
  tables: DatabaseResources,
  webapp: WebappResources,
  alertEmail: string,
) {
  const alertTopic = new aws.sns.Topic("AlertsTopic");
  const warningTopic = new aws.sns.Topic("WarningsTopic");

  for (const [label, topic] of [
    ["Alerts", alertTopic],
    ["Warnings", warningTopic],
  ] as const) {
    new aws.sns.TopicSubscription(`${label}EmailSubscription`, {
      topic: topic.arn,
      protocol: "email",
      endpoint: alertEmail,
    });
  }

  webapp.web.nodes.server.apply((server: sst.aws.Function) => {
    const functionName = server.nodes.function.name;

    new aws.cloudwatch.MetricAlarm("WebappErrorRateAlarm", {
      alarmDescription: "Alert when WebApp Lambda error rate exceeds threshold",
      comparisonOperator: "GreaterThanThreshold",
      evaluationPeriods: 2,
      threshold: 10,
      treatMissingData: "notBreaching",
      metricName: "Errors",
      namespace: "AWS/Lambda",
      period: 300,
      statistic: "Sum",
      dimensions: {
        FunctionName: functionName,
      },
      alarmActions: [alertTopic.arn],
    });

    new aws.cloudwatch.MetricAlarm("WebappThrottlesAlarm", {
      alarmDescription: "Alert when WebApp Lambda is throttled",
      comparisonOperator: "GreaterThanOrEqualToThreshold",
      evaluationPeriods: 1,
      threshold: 1,
      treatMissingData: "notBreaching",
      metricName: "Throttles",
      namespace: "AWS/Lambda",
      period: 300,
      statistic: "Sum",
      dimensions: {
        FunctionName: functionName,
      },
      alarmActions: [alertTopic.arn],
    });

    new aws.cloudwatch.MetricAlarm("WebappDurationAlarm", {
      alarmDescription: "Alert when WebApp Lambda average duration is high",
      comparisonOperator: "GreaterThanThreshold",
      evaluationPeriods: 2,
      threshold: ctx.isProd ? 3000 : 5000,
      treatMissingData: "notBreaching",
      metricName: "Duration",
      namespace: "AWS/Lambda",
      period: 300,
      statistic: "Average",
      dimensions: {
        FunctionName: functionName,
      },
      alarmActions: [warningTopic.arn],
    });
  });

  new aws.cloudwatch.MetricAlarm("ContentTableSystemErrorsAlarm", {
    alarmDescription: "Alert when content DynamoDB system errors occur",
    comparisonOperator: "GreaterThanOrEqualToThreshold",
    evaluationPeriods: 1,
    threshold: 1,
    treatMissingData: "notBreaching",
    metricName: "SystemErrors",
    namespace: "AWS/DynamoDB",
    period: 300,
    statistic: "Sum",
    dimensions: {
      TableName: tables.contentTable.name,
    },
    alarmActions: [alertTopic.arn],
  });

  return { alertTopic, warningTopic };
}
