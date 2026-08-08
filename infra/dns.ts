import { Club, DNS } from "@/project.config";
import { computeResourceBranchSuffix } from "@utils/cdk-naming";
import { buildWebappDomain } from "@utils/webapp-url";
import type { DeploymentContext } from "@utils/sst-stage";

function getZoneConfig(environment: "prod" | "dev") {
  return environment === "prod" ? DNS.prod : DNS.dev;
}

export function buildWebappDomainConfig(ctx: DeploymentContext) {
  const zone = getZoneConfig(ctx.environment);
  const domainName = buildWebappDomain(ctx.environment, ctx.branch);

  if (ctx.isProd) {
    return {
      name: domainName,
      redirects: [`www.${domainName}`],
      cert: zone.cloudFrontCertificateArn,
      dns: sst.aws.dns({
        zone: zone.hostedZoneId,
      }),
    };
  }

  return {
    name: domainName,
    cert: zone.cloudFrontCertificateArn,
    dns: sst.aws.dns({
      zone: zone.hostedZoneId,
    }),
  };
}

export function buildMediaDomain(ctx: DeploymentContext): string {
  const envPrefix = ctx.isProd ? "" : `${ctx.environment}${ctx.branchSuffix}-`;
  const baseDomain = ctx.isProd ? "markgraefler-volleys.de" : `new.markgraefler-volleys.de`;
  return `${envPrefix}media.${baseDomain}`;
}

export function buildMediaDomainConfig(ctx: DeploymentContext) {
  const zone = getZoneConfig(ctx.environment);

  return {
    name: buildMediaDomain(ctx),
    cert: zone.cloudFrontCertificateArn,
    dns: sst.aws.dns({
      zone: zone.hostedZoneId,
    }),
  };
}

export function getMediaBucketName(ctx: DeploymentContext): string {
  return `${Club.slug}-media-${ctx.environment}${computeResourceBranchSuffix(ctx.environment, ctx.branch)}`;
}
