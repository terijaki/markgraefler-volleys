# Email Proxy Mail Infrastructure (SST)

Shared mail infrastructure is deployed via a dedicated SST stage. Branch-scoped forwarding (EventBridge, Lambda, DLQ) is in `infra/mail.ts`.

## Architecture

| Stage / module                                           | Scope               | Resources                                                                                                   |
| -------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `mail-infra` / `mail-infra-prod` (`infra/mail-infra.ts`) | One per environment | SES domain identity, DKIM, MAIL FROM DNS, inbound MX, DMARC, inbound S3 bucket, active SES receipt rule set |
| App stage (`infra/mail.ts`)                              | One per SST stage   | EventBridge rule, mail-forward Lambda, DLQ, CloudWatch alarm                                                |

Stable resource names are computed in `lib/mail-env.ts`.

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

## Deploy

Mail infra deploys separately from app stages (`SST_DEPLOY_MAIL_INFRA=true`).

### Dev (bootstrap)

```bash
vp run sst:deploy:mail-infra
SST_STAGE=production vp run sst:deploy -- --stage production   # or a feature stage
```

### Prod

```bash
vp run sst:deploy:mail-infra:prod
SST_STAGE=production vp run sst:deploy -- --stage production
```

MX TTL is 300s — allow ~5 minutes after DNS changes during cutover.

## Prod cutover checklist

1. Deploy SST mail infra + production app stage
2. Verify inbound alias forward and OTP send
3. Run `vp run migrate:cdk-data` if migrating from legacy CDK resources
4. Destroy old CDK CloudFormation stacks manually
5. Confirm DMARC/MX/DKIM in Route53 and SES console
