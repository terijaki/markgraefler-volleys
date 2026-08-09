/**
 * Whether account-baseline resources (Budget, Monitoring) should be deployed.
 */
export function shouldDeployAccountOpsStacks(args: { isProd: boolean; branch: string }): boolean {
  return args.isProd || !args.branch;
}
