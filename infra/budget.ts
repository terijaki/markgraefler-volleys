import type { DeploymentContext } from "@utils/sst-stage";

export function createBudgetResources(ctx: DeploymentContext, alertEmail: string) {
  const alertThreshold = 5;
  const capThreshold = 10;

  new aws.budgets.Budget("MonthlyBudget", {
    name: `mv-monthly-budget-${ctx.environment}${ctx.branchSuffix}`,
    budgetType: "COST",
    timeUnit: "MONTHLY",
    limitAmount: String(capThreshold),
    limitUnit: "USD",
    costFilters: {
      tagKeyValue: [`user:Environment$${ctx.environment}`],
    },
    notifications: [
      {
        comparisonOperator: "GREATER_THAN",
        threshold: (alertThreshold / capThreshold) * 100,
        thresholdType: "PERCENTAGE",
        notificationType: "ACTUAL",
        subscriberEmailAddresses: [alertEmail],
      },
      {
        comparisonOperator: "GREATER_THAN",
        threshold: 90,
        thresholdType: "PERCENTAGE",
        notificationType: "ACTUAL",
        subscriberEmailAddresses: [alertEmail],
      },
      {
        comparisonOperator: "GREATER_THAN",
        threshold: 100,
        thresholdType: "PERCENTAGE",
        notificationType: "FORECASTED",
        subscriberEmailAddresses: [alertEmail],
      },
    ],
  });
}
