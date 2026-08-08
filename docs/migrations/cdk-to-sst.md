# CDK → SST migration plan

> Canonical migration plan for [issue #55](https://github.com/terijaki/markgraefler-volleys/issues/55).
> Updated to preserve the two-account model, the `new.` DNS delegation, and the separate media CDN.

## Objective

Replace the existing AWS CDK infrastructure with **SST** while preserving the application's current behavior and significantly reducing infrastructure/deployment complexity.

The final project should use:

**Bun + Vite+ + SST + AWS**

CDK should no longer be required for development or deployment.

## Goals

* Replace all CDK infrastructure with SST.
* Use SST's first-class `sst.aws.TanStackStart` component for the TanStack Start application.
* Preserve the existing AWS architecture and application behavior where practical.
* Simplify infrastructure code and deployment configuration.
* Preserve the existing feature-deployment workflow.
* Give every feature deployment a completely isolated AWS environment.
* Preserve production data through an explicit migration where necessary.
* Keep **Bun** and **Vite+** as the project's package/tooling workflow.
* Remove CDK and CDK-specific deployment infrastructure when the migration is complete.

## Non-goals

* Rewriting application/business logic.
* Moving away from AWS.
* Replacing TanStack Start, Nitro, Bun, or Vite+.
* Introducing npm, npx, pnpm, or Yarn.
* Keeping existing physical AWS resources at all costs.
* Zero-downtime migration.
* Changing the two-account AWS model or the `new.` subdomain delegation pattern.
* Moving feature environments to apex-domain subdomains (e.g. `foo.markgraefler-volleys.de`).

A short production maintenance window is acceptable.

---

## Target architecture

SST should manage the complete application infrastructure, including:

* TanStack Start web application
* Lambda functions
* DynamoDB
* S3/media storage (dedicated bucket + CDN — **not** covered by TanStackStart)
* image processing
* mail processing
* SQS/DLQs
* EventBridge
* SNS
* caching
* CloudFront
* DNS/domain configuration
* monitoring/alarms
* budget infrastructure
* SAMS integration
* social media integration

The current CDK stack boundaries do not need to be preserved.

The resulting infrastructure should be organized around the application's needs rather than reproducing the existing CDK stack structure.

---

## AWS accounts and SST stages

Preserve the existing **two-account** deployment model:

| Git branch | SST stage / environment | AWS account |
| --- | --- | --- |
| `main` | `production` (`prod`) | `883425316554` (prod) |
| any other | `feature/<sanitized-branch>` (`dev`) | `926634327887` (dev) |

GitHub Actions must continue to assume the correct account role per branch (today: `GitHubActionsCDKRole` in each account via OIDC).

Feature stages deploy only to the **dev account**. Production deploys only to the **prod account**.

Account-baseline resources (budget, monitoring) deploy for prod and shared dev (`main` in dev account) only — not per feature branch. Preserve the current `shouldDeployAccountOpsStacks` behavior.

Map `CDK_ENVIRONMENT` (`prod` / `dev`) to SST stage configuration so existing application and Lambda code continues to work (or rename consistently across the codebase).

---

## TanStack Start

Deploy the web application using SST's native:

```ts
sst.aws.TanStackStart
```

Do not manually recreate the existing Lambda + S3 + CloudFront deployment for the **webapp** unless a specific requirement cannot be handled by the SST component.

Continue using Nitro with the AWS Lambda preset and preserve streaming behavior where currently required.

SST should manage the normal:

* server Lambda
* static assets (app build output)
* S3 (app assets bucket)
* CloudFront (webapp distribution)
* deployment
* custom domain (webapp only)

configuration.

Configure SST's `buildCommand` (and any other deploy hooks) so the existing **Bun + Vite+** workflow remains intact. Do not copy SST's default npm-based examples blindly.

Use SST resource linking for application resources where appropriate instead of manually constructing ARNs and IAM policies.

### Media is separate from TanStackStart

`sst.aws.TanStackStart` does **not** automatically provision or serve the user-uploaded media bucket. Today the app uses:

* a **dedicated S3 media bucket** per stage
* a **separate CloudFront distribution** in front of that bucket
* an **image-processor Lambda** triggered on S3 object creation
* `MEDIA_CLOUDFRONT_URL` and `MEDIA_BUCKET_NAME` env vars — the DB stores S3 keys, URLs are built at runtime

**Keep the separate media CDN with a custom subdomain.** In SST this should be an explicit resource (e.g. `sst.aws.Bucket` with CDN, or equivalent lower-level construct), not folded into TanStackStart.

A custom media subdomain is not strictly required for basic functionality (the default CloudFront domain would work with the right env var), but the current architecture depends on stable branded media URLs, separate caching/CORS behavior, and isolation from app static assets. Preserve the existing hostname scheme unless there is a strong reason to change it.

---

## Bun and Vite+

**Bun and Vite+ must remain the project's tooling.**

Do not introduce npm/npx as a project requirement.

The migration must preserve the existing Vite+ workflow for:

* dependency management
* development
* checking
* testing
* building
* scripts

---

## Environments and feature deployments

The existing feature deployment model must be preserved.

Every feature deployment creates a **completely independent SST stage and AWS environment** in the **dev account**.

For example:

```text
production (prod account)
  ├── TanStack Start
  ├── Media CDN + S3
  ├── DynamoDB
  ├── Lambdas
  ├── queues
  ├── EventBridge
  ├── CloudFront (webapp + media)
  └── monitoring

feature/foo (dev account)
  ├── TanStack Start
  ├── Media CDN + S3
  ├── DynamoDB
  ├── S3
  ├── Lambdas
  ├── queues
  ├── EventBridge
  ├── CloudFront (webapp + media)
  └── monitoring

feature/bar (dev account)
  └── … (same isolation)
```

Feature stages must not share application resources with:

* production
* other feature stages

This includes, where applicable:

* DynamoDB
* S3 (content and media)
* Lambda functions
* queues/DLQs
* EventBridge rules
* cache resources
* CloudFront distributions (webapp and media)
* application configuration
* IAM permissions

Feature environments should be disposable.

Removing a feature stage should remove its ephemeral AWS resources (equivalent to today's `cdk-destroy.yml` on PR close).

---

## Domain configuration

Preserve the existing **two-zone DNS model**. This is the intentional exception to complete environment isolation: DNS zones are shared boundaries, but application resources behind them remain isolated.

### Hosted zones

| Zone | AWS account | Purpose |
| --- | --- | --- |
| `markgraefler-volleys.de` | prod | Production webapp, media, mail, and NS delegation for dev |
| `new.markgraefler-volleys.de` | dev | All dev/feature webapp, media, and mail hostnames |

Prod delegates `new.markgraefler-volleys.de` to dev-account nameservers (configured in `project.config.ts` → `DNS.dev.delegationNameservers`). **This NS delegation must be preserved** during and after migration.

### Hostname scheme

Single source of truth: `utils/webapp-url.ts` (update SST config to match, do not invent a new scheme).

| Environment | Branch | Webapp | Media |
| --- | --- | --- | --- |
| prod | `main` | `markgraefler-volleys.de` (+ `www` redirect) | `media.markgraefler-volleys.de` |
| dev | `main` (shared dev) | `dev.new.markgraefler-volleys.de` | `dev-media.new.markgraefler-volleys.de` |
| dev | feature | `dev-<branch>.new.markgraefler-volleys.de` | `dev-<branch>-media.new.markgraefler-volleys.de` |

Branch names are sanitized via `utils/branch.ts` (lowercase, hyphens, max 20 chars).

The production root domain (`markgraefler-volleys.de`) must never be assigned to a feature stage.

Feature environments must **not** use apex-domain subdomains. Keeping feature hosts under `*.new.markgraefler-volleys.de` preserves:

* dev-account DNS ownership (no cross-account Route53 writes to prod zone for features)
* dev-account ACM certificates (`*.new.markgraefler-volleys.de`)
* auth cookie isolation (`crossSubDomainCookies` scoped to `new.markgraefler-volleys.de`, not `.markgraefler-volleys.de`)

### Mail domains (environment-scoped, not per branch)

| | Prod | Dev |
| --- | --- | --- |
| Recipient domain | `markgraefler-volleys.de` | `new.markgraefler-volleys.de` |
| MAIL FROM | `send.markgraefler-volleys.de` | `send.new.markgraefler-volleys.de` |

Mail infra is a singleton per environment (today: `MailInfraStack`), not per feature branch. See [`docs/EMAIL_PROXY_MAIL_INFRA.md`](../EMAIL_PROXY_MAIL_INFRA.md).

### ACM certificates

Continue using environment-specific certificates (manually created, referenced in config):

* **Prod zone:** apex + `www` + `media` certs in prod account (regional + us-east-1 for CloudFront)
* **Dev zone:** `*.new.markgraefler-volleys.de` cert in dev account (regional + us-east-1 for CloudFront)

SST should import/reference existing certs where practical, or recreate with the same coverage — do not narrow cert SANs during migration.

---

## Production data migration

Production data does **not** need to remain in the existing CDK-created resources.

The migration may create new SST-managed production resources and migrate the existing data into them.

A short maintenance window is acceptable.

### DynamoDB

Create the new SST-managed production database and migrate the existing content data using a one-off migration script.

The migration must preserve all required:

* items
* indexes/data relationships
* TTL behavior
* application semantics

The final database configuration should retain the current production requirements such as:

* point-in-time recovery
* deletion protection
* appropriate retention behavior

### Media

Create the new SST-managed production media storage and migrate the existing media objects using a one-off migration script.

The migration must preserve:

* all required objects
* object keys (DB stores keys, not full URLs — hostname change does not require URL rewriting in DynamoDB)
* metadata required by the application
* publicly accessible media behavior via the media CDN
* image-processing behavior (S3 → image-processor Lambda pipeline)

### Migration procedure

**DNS is the traffic cutover lever.** Deploying SST with production custom domains will UPSERT Route53 records immediately — that is not a separate late step.

#### Pre-cutover (days before)

1. Lower TTLs on production DNS records that will change (apex, `www`, `media` — target 60s if possible).
2. Snapshot current Route53 record values (targets, not just names) for rollback.
3. Snapshot mail DNS (MX, DKIM, DMARC, MAIL FROM) per `docs/EMAIL_PROXY_MAIL_INFRA.md`.

#### Cutover sequence (maintenance window)

1. **Deploy SST production infrastructure without binding production custom domains** — use CloudFront default URLs or a staging hostname (e.g. `sst.markgraefler-volleys.de`) so live traffic is unaffected.
2. Put the **existing** application into maintenance/read-only mode.
3. Run the DynamoDB migration into new SST-managed tables.
4. Run the S3/media object migration into the new SST-managed bucket.
5. Validate on staging URLs (webapp + media CDN): auth, uploads, image processing, SAMS sync, mail OTP send.
6. **Flip production DNS** (coordinated, near-atomic):
   * `markgraefler-volleys.de` → new webapp CloudFront
   * `www.markgraefler-volleys.de` → new webapp CloudFront (redirect to apex)
   * `media.markgraefler-volleys.de` → new media CloudFront
   * **Do not modify** the `new` NS delegation record
   * **Do not modify** mail records unless running the dedicated mail cutover (see below)
7. Run production smoke tests on live domains.
8. Re-enable normal application operation.
9. Keep old CDK infrastructure temporarily for rollback (revert DNS to old CloudFront distribution IDs if needed).
10. Remove old infrastructure after the new deployment has been validated.

The migration must be idempotent or safely repeatable where practical.

#### Mail cutover (prod only, if SST manages mail infra)

Follow `docs/EMAIL_PROXY_MAIL_INFRA.md`. Mail has its own DNS records (MX, DKIM, DMARC, MAIL FROM) and SES receipt rules. Either:

* migrate mail infra in a separate scheduled window before or after the webapp cutover, with its own checklist, or
* keep existing mail infra on CDK temporarily and migrate it in a follow-up step

Do not let an SST deploy accidentally overwrite or delete mail DNS records during the webapp cutover.

#### Rollback

If validation fails after DNS flip:

1. Revert apex / `www` / `media` DNS to old CloudFront distribution targets (from pre-cutover snapshot).
2. Re-enable old application if it was disabled.
3. Document failure before retrying.

---

## Existing infrastructure

All existing CDK-managed infrastructure must be accounted for.

Review and migrate the current functionality covering:

* WebApp
* Content DB
* Media (separate S3 + CDN + image processor — not TanStackStart)
* Mail (MailInfra singleton + branch-scoped MailStack)
* DNS (two zones + NS delegation)
* Monitoring
* SAMS
* Social Media
* Cache (DynamoDB cache table)
* Budget
* Lambda functions
* Lambda layers (ImageMagick — today manually published ARNs in `project.config.ts`)
* IAM
* S3 events
* EventBridge
* SQS/DLQs
* SNS
* CloudWatch alarms
* CloudFront (webapp + media)
* Route 53
* ACM

For each existing resource, use the simplest appropriate SST implementation.

Prefer SST high-level components where available.

Use lower-level resources only where necessary.

---

## GitHub Actions

Keep the existing GitHub Actions-based deployment model.

Do not introduce a new deployment platform solely as part of this migration.

Replace CDK deployment steps with SST deployment steps while preserving the existing feature/branch behavior:

| Branch | Account | SST stage |
| --- | --- | --- |
| `main` | prod | `production` |
| other | dev | `feature/<sanitized-branch>` |

Feature deployments should continue to:

1. Build the application (Bun + Vite+).
2. Deploy an isolated SST stage to the dev account.
3. Provision all required feature resources (including media CDN).
4. Deploy the feature application.
5. Expose it through its feature-specific `dev-<branch>.new.markgraefler-volleys.de` hostname.

Production should deploy to the production SST stage and root domain.

Add or update a destroy workflow equivalent to `cdk-destroy.yml` for SST stage removal on PR close / branch delete.

Remove CDK bootstrap/deployment dependencies once they are no longer required.

---

## Developer experience

The final development workflow should be straightforward:

```text
Bun
  +
Vite+
  +
SST
```

SST local development should provide access to the appropriate development-stage AWS resources without requiring a full deployment for every application code change.

The existing application development workflow should remain familiar.

---

## Infrastructure simplification

This migration is not intended to be a one-to-one translation of CDK.

Actively remove unnecessary complexity, including where possible:

* CDK stack boundaries
* cross-stack references
* manually constructed ARNs
* duplicated environment variables
* manually managed IAM policies
* custom asset deployment code
* custom CloudFront/S3 deployment plumbing for the **webapp** (SST TanStackStart handles this)
* CDK-specific build workarounds
* branch-specific infrastructure logic that SST stages replace

The resulting infrastructure should be easier to understand and maintain than the current CDK implementation.

---

## Acceptance criteria

### SST migration

* [ ] SST manages all application infrastructure.
* [ ] CDK is no longer required for deployment.
* [ ] All existing CDK stacks have been replaced.
* [ ] CDK dependencies and configuration are removed.
* [ ] No unnecessary CDK-specific infrastructure code remains.

### Web application

* [ ] TanStack Start is deployed using `sst.aws.TanStackStart`.
* [ ] Nitro uses the AWS Lambda preset.
* [ ] Streaming behavior is preserved where required.
* [ ] Static assets work correctly.
* [ ] Server-side routes work correctly.
* [ ] CloudFront works correctly.
* [ ] Production root domain works (`markgraefler-volleys.de` + `www` redirect).
* [ ] Feature subdomains work (`dev-<branch>.new.markgraefler-volleys.de`).
* [ ] Required AWS resources are linked through SST where appropriate.

### Media

* [ ] Dedicated media S3 bucket per stage (not TanStackStart static assets).
* [ ] Separate media CloudFront distribution per stage with custom subdomain.
* [ ] Image-processor Lambda and S3 event triggers work.
* [ ] `MEDIA_CLOUDFRONT_URL` resolves correctly in webapp and SAMS Lambdas.
* [ ] Uploads, responsive image variants, and public media URLs work in prod and feature stages.

### Feature environments

* [ ] Each feature deployment creates its own SST stage in the dev account.
* [ ] Each feature stage has isolated application resources.
* [ ] Feature stages do not share DynamoDB with production or other features.
* [ ] Feature stages do not share media storage with production or other features.
* [ ] Feature stages do not share application Lambdas.
* [ ] Feature stages do not share queues/event infrastructure.
* [ ] Feature stages do not share application CloudFront infrastructure.
* [ ] Feature stages are disposable (destroy workflow on PR close).
* [ ] Feature deployments continue to work through GitHub Actions.
* [ ] Feature domains use `dev-<branch>.new.markgraefler-volleys.de` (not apex subdomains).
* [ ] Production root domain is never used by feature stages.

### DNS and accounts

* [ ] Two-account model preserved (prod account for `main`, dev account for feature branches).
* [ ] Prod `new` NS delegation to dev nameservers is preserved.
* [ ] Dev/feature DNS records are created only in the `new.markgraefler-volleys.de` zone.
* [ ] Auth cookie isolation under `new.markgraefler-volleys.de` is preserved for dev/feature stages.

### Production migration

* [ ] Existing DynamoDB data is migrated successfully.
* [ ] Existing media objects are migrated successfully.
* [ ] No required production data is lost.
* [ ] Production application behavior is preserved.
* [ ] Production DNS cutover is documented and tested (apex, www, media).
* [ ] Mail cutover is documented (or deferred with explicit plan).
* [ ] A short maintenance window is acceptable and documented.
* [ ] Migration scripts are checked into the repository or otherwise reproducibly documented.
* [ ] Old CDK infrastructure can be retained temporarily for rollback.
* [ ] Route53 snapshot and DNS rollback procedure is documented.

### Other infrastructure

* [ ] Mail processing works.
* [ ] Image processing works.
* [ ] SAMS integration works.
* [ ] Social media integration works.
* [ ] Cache works.
* [ ] EventBridge integrations work.
* [ ] SQS/DLQs work.
* [ ] SNS notifications work.
* [ ] CloudWatch monitoring/alarms work.
* [ ] Budget configuration is preserved.

### Tooling

* [ ] Bun remains the package manager/runtime workflow.
* [ ] Vite+ remains the project tooling workflow.
* [ ] No npm/npx dependency is introduced.
* [ ] Existing `vp` development/build/check/test workflows continue to work.
* [ ] CI uses Bun + Vite+.

### Cleanup

* [ ] GitHub Actions no longer deploy CDK.
* [ ] CDK bootstrap/deployment configuration is removed.
* [ ] CDK dependencies are removed.
* [ ] Obsolete infrastructure scripts are removed.
* [ ] Documentation is updated.
* [ ] The final infrastructure can be understood without knowledge of the previous CDK implementation.

---

## Definition of done

The migration is complete when:

1. SST is the sole infrastructure deployment mechanism.
2. The application deploys successfully through GitHub Actions.
3. Production runs entirely on SST-managed infrastructure.
4. Feature deployments continue to create fully isolated environments in the dev account.
5. Production uses the root domain; feature deployments use `*.new.` subdomains.
6. Production DynamoDB and media data have been migrated successfully.
7. Media CDN (`media.markgraefler-volleys.de`) works on SST-managed infrastructure.
8. The existing application functionality continues to work.
9. Bun and Vite+ remain unchanged as the project's primary tooling.
10. The resulting infrastructure is materially simpler than the current CDK implementation.
