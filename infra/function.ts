/// <reference path="./sst-reference.d.ts" />

interface MvFunctionArgs {
  handler: string;
  memory?: `${number} MB` | `${number} GB`;
  timeout?: `${number} minute` | `${number} minutes` | `${number} second` | `${number} seconds`;
  environment?: Record<string, string>;
  layers?: string[];
  link?: sst.aws.FunctionArgs["link"];
  permissions?: sst.aws.FunctionArgs["permissions"];
}

export function createMvFunction(
  componentName: string,
  args: MvFunctionArgs,
  deployment: sst.Linkable,
) {
  return new sst.aws.Function(componentName, {
    handler: args.handler,
    runtime: "nodejs22.x",
    memory: args.memory ?? "512 MB",
    timeout: args.timeout ?? "30 seconds",
    environment: args.environment,
    layers: args.layers,
    link: [deployment, ...(args.link ?? [])],
    permissions: args.permissions,
    nodejs: {
      install: ["@aws-lambda-powertools/logger", "@aws-lambda-powertools/tracer", "sst"],
    },
    transform: {
      logGroup: (logArgs: aws.cloudwatch.LogGroupArgs) => {
        logArgs.retentionInDays = 60;
      },
    },
  });
}
