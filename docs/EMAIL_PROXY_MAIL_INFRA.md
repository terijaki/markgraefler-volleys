# Email Proxy Mail Infrastructure (CDK)

This document is the supported path for provisioning shared mail infrastructure. Branch-scoped forwarding (EventBridge, Lambda, DLQ) remains in `MailStack`.

## Architecture

| Stack              | Scope                                   | Resources                                                                                                   |
| ------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **MailInfraStack** | One per environment                     | SES domain identity, DKIM, MAIL FROM DNS, inbound MX, DMARC, inbound S3 bucket, active SES receipt rule set |
| **MailStack**      | One per branch (dev) / singleton (prod) | EventBridge rule, mail-forward Lambda, DLQ, CloudWatch alarm                                                |

Stable resource names are computed in `lib/mail-env.ts` (no CloudFormation cross-stack exports).

## Environment values

| Setting          | Prod                                     | Dev                                      |
| ---------------- | ---------------------------------------- | ---------------------------------------- |
| Recipient domain | `markgraefler-volleys.de`                | `new.markgraefler-volleys.de`            |
| Custom MAIL FROM | `send.markgraefler-volleys.de`           | `send.new.markgraefler-volleys.de`       |
| System From      | `postmaster@markgraefler-volleys.de`     | `postmaster@new.markgraefler-volleys.de` |
| Inbound bucket   | `markgraefler-volleys-mail-inbound-prod` | `markgraefler-volleys-mail-inbound-dev`  |
| Receipt rule set | `mv-inbound-prod`                        | `mv-inbound-dev`                         |
| S3 lifecycle     | 14 days                                  | 3 days                                   |
| DMARC            | `p=reject; pct=100`                      | `p=reject; pct=100`                      |

## Deploy guard

`MailInfraStack` is synthesized **only** when `CDK_DEPLOY_MAIL_INFRA=true`, and that mode synthesizes **only** `MailInfraStack` (no webapp build or other branch stacks). Routine `cdk deploy --all` from feature branches never includes it.

### Maintainer commands

Authenticate via AWS SSO first (see `docs/SETUP.md`).

**Dev (bootstrap):**

```bash
# 1. Deploy shared mail infrastructure
vpr cdk:deploy:mail-infra

# 2. Deploy branch mail processing (if not already deployed)
vpr cdk:deploy:all

# 3. Verify end-to-end (inbound alias forward, OTP send in dev)
```

If deploy fails on `ResourceExistenceCheck`, remove the conflicting manual SES/DNS/inbound resources in the AWS Console, then retry deploy.

**Prod (cutover):**

Schedule a low-traffic window. MX TTL is 300s — allow ~5 minutes after DNS changes.

### Pre-cutover checklist

1. Snapshot current DKIM tokens, MAIL FROM DNS, and DMARC values from Route53.
2. Disable prod `MailStack` EventBridge rule temporarily (AWS Console or CLI).
3. Remove old manual resources that CDK will recreate (SES identity, receipt rule set, inbound bucket, mail DNS records — MX, DMARC, DKIM, MAIL FROM).

4. **Preserve:** apex web A records (CloudFront), www, media, NS, SOA, and dev zone delegation.

### Cutover sequence

```bash
# Deploy mail infrastructure
vpr cdk:deploy:mail-infra:prod

# Verify MailStack (re-deploy if needed)
vpr cdk:deploy:prod

# Verify:
# - OTP send from admin login
# - Inbound proxy alias forward (e.g. trainer@, individual alias)
# - DKIM/DMARC/MX DNS records

# Re-enable MailStack EventBridge rule
```

### Post-cutover validation

```bash
vpr cdk:diff:mail-infra:prod   # expect zero drift
```

### Rollback

If CDK deployment fails:

1. Restore manual SES identity, receipt rule set, inbound bucket, and DNS records from the pre-cutover snapshot.
2. Re-enable the previous EventBridge rule and mail-forward pipeline.
3. Document the failure before retrying cutover.

## Dev subdomain delegation (prod DNS)

The prod `DnsStack` manages the NS delegation for `new.markgraefler-volleys.de` → dev account nameservers (configured in `project.config.ts` → `DNS.dev.delegationNameservers`).

## AWS profiles

- Dev: `mvolleys-dev` (or `mv-dev` per local setup)
- Prod: `mvolleys-PRODUCTION` (or `mv-prod` per local setup)
