import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, type NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import type { Construct } from "constructs";
import { computeResourceBranchSuffix } from "@utils/cdk-naming";
import { getSanitizedBranch } from "@utils/deploy-branch";

export interface MvNodejsFunctionProps extends Omit<
  NodejsFunctionProps,
  "runtime" | "handler" | "logGroup"
> {
  namespace: string;
  name: string;
}

export function buildLambdaFunctionName(baseName: string): string {
  const environment = process.env.CDK_ENVIRONMENT || "dev";
  const branch = getSanitizedBranch();
  const branchSuffix = computeResourceBranchSuffix(environment, branch);

  return `mv-${baseName}-${environment}${branchSuffix}`;
}

function buildLogGroupName(namespace: string, baseName: string): string {
  const environment = process.env.CDK_ENVIRONMENT || "dev";
  const branch = getSanitizedBranch();
  const branchSuffix = computeResourceBranchSuffix(environment, branch);

  return `/mv/${environment}${branchSuffix}/${namespace}/${baseName}`;
}

/** Shared NodejsFunction defaults with managed CloudWatch log group. */
export class MvNodejsFunction extends cdk.Resource {
  public readonly lambdaFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: MvNodejsFunctionProps) {
    super(scope, id);

    const { bundling, namespace, name, ...restProps } = props;

    const logGroup = new logs.LogGroup(this, "LogGroup", {
      logGroupName: buildLogGroupName(namespace, name ?? id),
      retention: logs.RetentionDays.TWO_MONTHS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.lambdaFunction = new NodejsFunction(this, "Function", {
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      functionName: buildLambdaFunctionName(name),
      handler: "handler",
      ...restProps,
      runtime: lambda.Runtime.NODEJS_24_X,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ["sst", ...(bundling?.externalModules ?? [])],
        ...bundling,
      },
      logGroup,
    });
  }
}
