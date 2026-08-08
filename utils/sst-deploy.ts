/**
 * Whether account-baseline resources (Budget, Monitoring) should be deployed.
 *
 * Mirrors `shouldDeployAccountOpsStacks` from `utils/cdk-deploy.ts`.
 */
export function shouldDeployAccountOpsStacks(args: { isProd: boolean; branch: string }): boolean {
  return args.isProd || !args.branch;
}
