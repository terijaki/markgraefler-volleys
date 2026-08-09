# SST Infrastructure

All AWS infrastructure is deployed via SST. There is no CDK.

## Entry point

- `sst.config.ts` — stage wiring (dynamic imports only at top level)
- `infra/` — resource modules grouped by concern

## Stage naming

| Branch                    | SST stage                    | Environment |
| ------------------------- | ---------------------------- | ----------- |
| `main`                    | `production`                 | `prod`      |
| feature branch            | `feature-<sanitized-branch>` | `dev`       |
| mail infra (dev account)  | `mail-infra`                 | `dev`       |
| mail infra (prod account) | `mail-infra-prod`            | `prod`      |

SST stage names must be alphanumeric + hyphens (no slashes). See `utils/sst-stage.ts`.

## Commands

```bash
vp run sst:install
SST_STAGE=production vp run sst:deploy -- --stage production
SST_STAGE=feature-my-branch vp run sst:deploy -- --stage feature-my-branch
vp run sst:deploy:mail-infra          # dev account mail infra
vp run sst:deploy:mail-infra:prod     # prod account mail infra
```

CI uses `.github/workflows/sst-deploy.yml` (all branches) and `sst-destroy.yml` (feature branch cleanup).

## Linking

Resources are **linked** into consumers instead of hand-wiring env vars and IAM. Runtime code reads `SST_RESOURCE_*` env vars via `lib/runtime/aws-resource.ts`. Local `vp dev` loads resource names from `.sst/outputs.json` after deploying a stage.

## Production cutover

1. Deploy SST `production` stage to prod account
2. Run `vp run migrate:cdk-data` to copy DynamoDB + media from CDK-named resources
3. Destroy legacy CDK CloudFormation stacks manually
4. DNS cutover happens automatically via SST domain config on deploy

## Mail infra

Shared SES identity, inbound bucket, MX/DKIM deploy via `sst:deploy:mail-infra` (separate stage, not per-branch). Branch-scoped mail-forward lives in `infra/mail.ts`.
