import { afterEach, beforeEach, describe, it } from "vite-plus/test";
import { Match, Template } from "aws-cdk-lib/assertions";
import { SamsStack } from "./sams-stack";
import { SamsTableIndexes } from "./db/table-indexes";
import { createTestApp } from "./test-helpers";

beforeEach(() => {
  process.env.CDK_ENVIRONMENT = "dev";
  process.env.CDK_BRANCH_OVERWRITE = "main";
});

afterEach(() => {
  Reflect.deleteProperty(process.env, "CDK_ENVIRONMENT");
  process.env.CDK_BRANCH_OVERWRITE = "main";
});

describe("SamsStack", () => {
  describe("Development environment", () => {
    it("should create provider consumer resources", () => {
      const app = createTestApp();
      const stack = new SamsStack(app, "TestStack", {
        env: {
          account: "123456789012",
          region: "eu-central-1",
        },
        stackProps: {
          environment: "dev",
          branch: "test-branch",
        },
      });

      const template = Template.fromStack(stack);

      template.resourceCountIs("AWS::Lambda::Function", 1);
      template.resourceCountIs("AWS::DynamoDB::Table", 1);
      template.resourceCountIs("AWS::SQS::Queue", 2);
      template.resourceCountIs("AWS::Events::Rule", 0);
    });

    it("should include branch suffix in resource names", () => {
      process.env.CDK_BRANCH_OVERWRITE = "feature-xyz";
      const app = createTestApp();
      const stack = new SamsStack(app, "TestStack", {
        stackProps: {
          environment: "dev",
          branch: "feature-xyz",
        },
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: "mv-sams-provider-processor-dev-feature-xyz",
      });

      template.hasResourceProperties("AWS::DynamoDB::Table", {
        TableName: "sams-data-dev-feature-xyz",
      });
    });

    it("should allow GitHub Actions to seed mock events on dev queues", () => {
      const app = createTestApp();
      const stack = new SamsStack(app, "TestStack", {
        env: {
          account: "123456789012",
          region: "eu-central-1",
        },
        stackProps: {
          environment: "dev",
          branch: "feature-xyz",
        },
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties("AWS::SQS::QueuePolicy", {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: "AllowGitHubActionsCdkRoleSeed",
              Action: Match.arrayWith(["sqs:SendMessage"]),
              Principal: Match.objectLike({
                AWS: Match.stringLikeRegexp("role/GitHubActionsCDKRole$"),
              }),
            }),
          ]),
        }),
      });
    });
  });

  describe("Production environment", () => {
    beforeEach(() => {
      process.env.CDK_ENVIRONMENT = "prod";
    });

    it("should set RETAIN removal policy for prod tables and queues", () => {
      const app = createTestApp();
      const stack = new SamsStack(app, "TestStack", {
        stackProps: {
          environment: "prod",
          branch: "",
        },
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties("AWS::DynamoDB::Table", {
        TableName: "sams-data-prod",
      });

      template.hasResourceProperties("AWS::SQS::Queue", {
        QueueName: "sams-provider-events-prod",
      });
    });

    it("should allow provider EventBridge to send messages on prod queue", () => {
      const app = createTestApp();
      const stack = new SamsStack(app, "TestStack", {
        stackProps: {
          environment: "prod",
          branch: "",
        },
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties("AWS::SQS::QueuePolicy", {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: "AllowSamsProviderEventBridgeSendMessage",
              Action: "sqs:SendMessage",
              Principal: Match.objectLike({
                AWS: Match.anyValue(),
              }),
            }),
          ]),
        }),
      });
    });
  });

  describe("DynamoDB tables", () => {
    it("should create sams data table with the active GSI", () => {
      const app = createTestApp();
      const stack = new SamsStack(app, "TestStack", {
        stackProps: {
          environment: "dev",
          branch: "",
        },
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties("AWS::DynamoDB::Table", {
        TableName: "sams-data-dev",
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({ IndexName: SamsTableIndexes.gsi1 }),
        ]),
      });
    });
  });
});
