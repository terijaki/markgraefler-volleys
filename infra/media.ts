/// <reference path="./sst-reference.d.ts" />

import { LambdaLayers } from "@/project.config";
import type { DeploymentContext } from "@utils/sst-stage";
import { buildMediaDomainConfig, getMediaBucketName } from "./dns";
import { createMvFunction } from "./function";

export interface MediaResources {
  bucket: sst.aws.Bucket;
  router: sst.aws.Router;
  url: $util.Output<string>;
}

export function createMediaResources(ctx: DeploymentContext): MediaResources {
  const bucketName = getMediaBucketName(ctx);
  const imageLayer =
    ctx.environment === "prod" ? LambdaLayers.prod.imageMagick : LambdaLayers.dev.imageMagick;

  const bucket = new sst.aws.Bucket("MediaBucket", {
    access: "cloudfront",
    cors: {
      allowHeaders: ["*"],
      allowMethods: ["GET", "PUT", "POST"],
      allowOrigins: ["*"],
      maxAge: "3000 seconds",
    },
    transform: {
      bucket: (args: aws.s3.BucketV2Args) => {
        args.bucket = bucketName;
      },
    },
  });

  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"] as const;
  const imageProcessor = createMvFunction(ctx, "ImageProcessor", {
    namespace: "media",
    name: "image-processor",
    handler: "lambda/content/image-processor.handler",
    timeout: "5 minutes",
    layers: [imageLayer],
    environment: {
      CDK_ENVIRONMENT: ctx.environment,
    },
    link: [bucket],
  });

  bucket.notify({
    notifications: imageExtensions.map((suffix) => ({
      name: `ImageProcessor${suffix.replace(".", "")}`,
      function: imageProcessor.arn,
      events: ["s3:ObjectCreated:*"],
      filterPrefix: "uploads/",
      filterSuffix: suffix,
    })),
  });

  const router = new sst.aws.Router("MediaRouter", {
    domain: buildMediaDomainConfig(ctx),
    routes: {
      "/*": {
        bucket,
      },
    },
    transform: {
      cdn: (args: aws.cloudfront.DistributionArgs) => {
        args.comment = ctx.isProd
          ? "MV Media Distribution (Prod)"
          : `MV Media Distribution (${ctx.environment}${ctx.branchSuffix})`;
      },
    },
  });

  return {
    bucket,
    router,
    url: router.url,
  };
}
