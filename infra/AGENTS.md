# SST Infrastructure

SST replaces CDK for feature-branch deployments (phases 1–4). Production (`main`) still uses CDK until the prod cutover (phase 5).

## Entry point

- `sst.config.ts` — stage wiring (dynamic imports only at top level)
- `infra/` — resource modules grouped by concern

## Stage naming

| Branch         | SST stage                    | Environment |
| -------------- | ---------------------------- | ----------- |
| `main`         | `production`                 | `prod`      |
| feature branch | `feature-<sanitized-branch>` | `dev`       |

SST stage names must be alphanumeric + hyphens (no slashes). See `utils/sst-stage.ts`.

## Commands

Use the pinned `sst` devDependency via repo scripts:

```bash
vp run sst:install   # once per machine / CI run
SST_STAGE=feature-my-branch vp run sst:deploy -- --stage feature-my-branch
SST_STAGE=feature-my-branch vp run sst:diff -- --stage feature-my-branch
SST_STAGE=feature-my-branch vp run sst:remove -- --stage feature-my-branch
```

CI uses `.github/workflows/sst-deploy.yml` (feature branches) and `sst-destroy.yml`.

## Linking

- Shared tables, buckets, routers, and sync Lambdas are **linked** into consumers instead of hand-wiring env vars and IAM.
- `infra/deployment.ts` exposes `DeploymentEnv` (`CDK_ENVIRONMENT`, `BRANCH_NAME`) as a linkable resource.
- Runtime code resolves linked values via `lib/runtime/aws-resource.ts` (reads `SST_RESOURCE_*` env vars injected by SST), falling back to legacy `process.env` names for CDK and `vp dev`.

## Mail infra

`MailInfraStack` (SES identity, inbound bucket, MX/DKIM) remains on CDK. SST deploys branch-scoped mail-forward only.
