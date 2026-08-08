import type { DeploymentContext } from "@utils/sst-stage";

interface MvFunctionArgs {
  namespace: string;
  name: string;
  handler: string;
  memory?: `${number} MB` | `${number} GB`;
  timeout?: `${number} minute` | `${number} minutes` | `${number} second` | `${number} seconds`;
  environment?: Record<string, string>;
  layers?: string[];
  link?: any[];
  permissions?: sst.aws.FunctionArgs["permissions"];
}

export function createMvFunction(
  ctx: DeploymentContext,
  componentName: string,
  args: MvFunctionArgs,
) {
  const functionName = `mv-${args.name}-${ctx.environment}${ctx.branchSuffix}`;
  const logGroupName = `/mv/${ctx.environment}${ctx.branchSuffix}/${args.namespace}/${args.name}`;

  return new sst.aws.Function(componentName, {
    handler: args.handler,
    runtime: "nodejs24.x",
    memory: args.memory ?? "512 MB",
    timeout: args.timeout ?? "30 seconds",
    environment: args.environment,
    layers: args.layers,
    link: args.link,
    permissions: args.permissions,
    nodejs: {
      install: ["@aws-lambda-powertools/logger", "@aws-lambda-powertools/tracer"],
    },
    transform: {
      function: (fnArgs) => {
        fnArgs.name = functionName;
      },
      logGroup: (logArgs) => {
        logArgs.name = logGroupName;
        logArgs.retentionInDays = 60;
      },
    },
  });
}
