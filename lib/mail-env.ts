import { Club, Mail } from "@/project.config";

/** Regional SES inbound MX endpoint for eu-central-1. */
export const MAIL_INBOUND_MX_HOST = "inbound-smtp.eu-central-1.amazonaws.com";

/** DMARC policy — identical in dev and prod for auth-stack parity. */
export const MAIL_DMARC_POLICY = "v=DMARC1; p=reject; pct=100";

export function getMailEnvironmentConfig(environment: string) {
  return environment === "prod" ? Mail.prod : Mail.dev;
}

/**
 * Canonical inbound S3 bucket name for an environment (no branch suffix).
 * Shared by MailInfraStack and branch-scoped MailStack.
 */
export function computeMailInboundBucketName(environment: string): string {
  return `${Club.slug}-mail-inbound-${environment}`;
}

/** SES receipt rule set name — one active set per AWS account/region. */
export function computeMailReceiptRuleSetName(environment: string): string {
  return `mv-inbound-${environment}`;
}

/** SES receipt rule name within the environment's rule set. */
export function computeMailReceiptRuleName(environment: string): string {
  return `store-inbound-${environment}`;
}

/** Custom MAIL FROM subdomain for SPF alignment (`send.*`). */
export function computeMailFromDomain(environment: string): string {
  const { recipientDomain } = getMailEnvironmentConfig(environment);
  return `send.${recipientDomain}`;
}

/** Inbound object retention — 3 days dev, 14 days prod. */
export function getMailInboundLifecycleDays(environment: string): number {
  return environment === "prod" ? 14 : 3;
}
