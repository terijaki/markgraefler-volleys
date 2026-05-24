import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import type { Construct } from "constructs";
import type { BeholdSyncLambdaEnvironment } from "@/lambda/social/types";
import { computeCacheTableName } from "./db/env";
import { MvNodejsFunction } from "./construct/mv-nodejs-function";

interface SocialMediaStackProps extends cdk.StackProps {
  stackProps?: {
    environment: string;
    branch: string;
  };
}

export class SocialMediaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SocialMediaStackProps) {
    super(scope, id, props);

    const environment = props?.stackProps?.environment || "dev";
    const branch = props?.stackProps?.branch || "";
    const branchSuffix = branch ? `-${branch}` : "";
    const commonEnvironment = {
      CDK_ENVIRONMENT: environment,
    };

    // Create scheduled Lambda to proactively sync Behold Instagram posts to DynamoDB.
    // Runs hourly during German daytime — ~465 calls/month (~39% of Behold's 1200/month free-tier limit).
    const cacheTableName = computeCacheTableName(environment, branch);
    const cacheTableArn = cdk.Stack.of(this).formatArn({
      service: "dynamodb",
      resource: "table",
      resourceName: cacheTableName,
    });
    const cacheTableRef = dynamodb.Table.fromTableArn(this, "CacheTableRef", cacheTableArn);

    const beholdSync = new MvNodejsFunction(this, "BeholdSync", {
      namespace: "social",
      name: "behold-sync",
      entry: path.join(__dirname, "../lambda/social/behold-sync.ts"),
      memorySize: 128,
      environment: {
        ...commonEnvironment,
        CACHE_TABLE_NAME: cacheTableName,
        BEHOLD_FEED_URL: process.env.BEHOLD_FEED_URL,
      } satisfies BeholdSyncLambdaEnvironment,
    }).lambdaFunction;

    cacheTableRef.grantReadWriteData(beholdSync);

    // Trigger hourly during German daytime (7:00–21:00 UTC = 8–22h CET / 9–23h CEST)
    // ~15 runs/day, ~465 calls/month (~39% of Behold's 1200/month free-tier limit)
    const beholdSyncRule = new events.Rule(this, "BeholdSyncRule", {
      ruleName: `behold-sync-schedule-${environment}${branchSuffix}`,
      description: `Trigger Behold Instagram feed sync hourly during German daytime (${environment}${branchSuffix})`,
      schedule: events.Schedule.cron({ minute: "0", hour: "7-21" }),
    });
    beholdSyncRule.addTarget(new targets.LambdaFunction(beholdSync));
  }
}
