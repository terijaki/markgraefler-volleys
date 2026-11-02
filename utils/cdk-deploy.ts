/**
 * Whether account-baseline stacks (Budget, Monitoring) should be deployed.
 *
 * These stacks are not branch-scoped: prod always gets them; dev only on shared-dev
 * (sanitized branch empty / main). Feature branches skip them.
 */
export function shouldDeployAccountOpsStacks(args: { isProd: boolean; branch: string }): boolean {
  return args.isProd || !args.branch;
}

/**
 * Email for branch-scoped DLQ SNS subscriptions (MailStack, SamsStack).
 *
 * Feature-branch deploys omit the email so CloudWatch alarms stay without creating
 * a new SNS topic + confirmation email per branch. Shared-dev and prod keep email.
 */
export function resolveDlqAlertEmail(args: {
  deployAccountOpsStacks: boolean;
  alertEmail: string | undefined;
}): string | undefined {
  return args.deployAccountOpsStacks ? args.alertEmail : undefined;
}
