/// <reference path="./sst-reference.d.ts" />

import { LambdaLayers } from "@/project.config";
import type { DeploymentContext } from "@utils/sst-stage";
import { buildMediaDomainConfig } from "./dns";
import { createMvFunction } from "./function";

export interface MediaResources {
  bucket: sst.aws.Bucket;
  router: sst.aws.Router;
  url: $util.Output<string>;
}

export function createMediaResources(
  ctx: DeploymentContext,
  deployment: sst.Linkable,
): MediaResources {
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
  });

  const imageProcessor = createMvFunction(
    "ImageProcessor",
    {
      handler: "lambda/content/image-processor.handler",
      timeout: "5 minutes",
      layers: [imageLayer],
      link: [bucket],
    },
    deployment,
  );

  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"] as const;
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
  });

  return {
    bucket,
    router,
    url: router.url,
  };
}
