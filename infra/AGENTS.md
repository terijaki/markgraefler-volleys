# SST Infrastructure

SST replaces CDK for feature-branch deployments (phases 1–4). Production (`main`) still uses CDK until the prod cutover (phase 5).

## Entry point

- `sst.config.ts` — stage wiring (dynamic imports only at top level)
- `infra/` — resource modules grouped by concern

## Stage naming

| Branch | SST stage | Environment |
| --- | --- | --- |
| `main` | `production` | `prod` |
| feature branch | `feature-<sanitized-branch>` | `dev` |

SST stage names must be alphanumeric + hyphens (no slashes). See `utils/sst-stage.ts`.

## Commands

```bash
SST_STAGE=feature-my-branch npx sst deploy
SST_STAGE=feature-my-branch npx sst diff
SST_STAGE=feature-my-branch npx sst remove
```

CI uses `.github/workflows/sst-deploy.yml` (feature branches) and `sst-destroy.yml`.

## Mail infra

`MailInfraStack` (SES identity, inbound bucket, MX/DKIM) remains on CDK. SST deploys branch-scoped mail-forward only.
