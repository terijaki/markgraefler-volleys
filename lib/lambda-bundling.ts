import type * as lambda from "aws-cdk-lib/aws-lambda-nodejs";

/** Copies committed seed JPEGs into a NodejsFunction bundle (Lambda runs as CJS). */
export const copySeedImagesBundlingHooks: lambda.BundlingOptions["commandHooks"] = {
  beforeBundling(): string[] {
    return [];
  },
  beforeInstall(): string[] {
    return [];
  },
  afterBundling(inputDir: string, outputDir: string): string[] {
    return [
      `mkdir -p "${outputDir}/fixtures/seed-images"`,
      `cp -r "${inputDir}/fixtures/seed-images/." "${outputDir}/fixtures/seed-images/"`,
    ];
  },
};
