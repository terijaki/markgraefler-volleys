/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "markgraefler-volleys",
      removal: input.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          region: process.env.AWS_REGION || "eu-central-1",
        },
      },
    };
  },
  async run() {
    await import("varlock/auto-load");

    const { ENV } = await import("varlock/env");
    const { shouldDeployAccountOpsStacks } = await import("@utils/sst-deploy");
    const { getDeploymentContext } = await import("@utils/sst-stage");
    const { createBudgetResources } = await import("./infra/budget");
    const { createDatabaseResources } = await import("./infra/database");
    const { createDeploymentLinkable } = await import("./infra/deployment");
    const { createMailResources } = await import("./infra/mail");
    const { createMediaResources } = await import("./infra/media");
    const { createMonitoringResources } = await import("./infra/monitoring");
    const { createSamsResources } = await import("./infra/sams");
    const { createSocialResources } = await import("./infra/social");
    const { createWebappResources } = await import("./infra/webapp");

    const ctx = getDeploymentContext($app.stage);
    const deployment = createDeploymentLinkable(ctx);

    const tables = createDatabaseResources(ctx);
    const media = createMediaResources(ctx, deployment);
    const sams = createSamsResources(ctx, deployment, tables, media);
    createSocialResources(ctx, deployment, tables);
    const webapp = createWebappResources(ctx, deployment, tables, media, sams);

    const monitoringEmail = ENV.CDK_MONITORING_ALERT_EMAIL || ENV.CDK_BUDGET_ALERT_EMAIL;
    const budgetEmail = ENV.CDK_BUDGET_ALERT_EMAIL;
    const deployAccountOps = shouldDeployAccountOpsStacks({
      isProd: ctx.isProd,
      branch: ctx.branch,
    });

    createMailResources(ctx, deployment, tables, monitoringEmail || budgetEmail);

    if (deployAccountOps) {
      if (monitoringEmail) {
        createMonitoringResources(ctx, tables, webapp, monitoringEmail);
      } else if (ctx.isProd) {
        throw new Error(
          "CDK_MONITORING_ALERT_EMAIL not set — production requires monitoring alerts",
        );
      }

      if (budgetEmail) {
        createBudgetResources(ctx, budgetEmail);
      } else if (ctx.isProd) {
        throw new Error("CDK_BUDGET_ALERT_EMAIL not set — production requires budget alerts");
      }
    }

    return {
      webappUrl: webapp.url,
      mediaUrl: media.url,
      contentTable: tables.contentTable.name,
      stage: ctx.stage,
      environment: ctx.environment,
      branch: ctx.branch,
    };
  },
});
