# markgraefler-volleys.de

Source code for the [Markgräfler Volleys](https://markgraefler-volleys.de) website and infrastructure.

## Prerequisites

- [Vite+](https://viteplus.dev/) — installs Bun automatically if absent
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) — for AWS access
- [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting-started.html) — for infrastructure deployments

## Getting started

```sh
vp install
```

Create a `.env.local` file at the repo root with the following environment variables (ask a maintainer for the values):

```sh
# CDK
CDK_ENVIRONMENT="dev"
CDK_BUDGET_ALERT_EMAIL="you@example.com"
CDK_MONITORING_ALERT_EMAIL="you@example.com"

# Auth
BETTER_AUTH_SECRET=""

# SAMS
SAMS_API_KEY=""

# Sentry
SENTRY_AUTH_TOKEN=""
SENTRY_ENVIRONMENT="development"
```

## AWS Authentication

This project uses **AWS SSO** with two accounts:

| Profile         | Account        | Purpose     |
| --------------- | -------------- | ----------- |
| `mvolleys-dev`  | `926634327887` | Development |
| `mvolleys-prod` | `883425316554` | Production  |

### Initial setup

Configure your AWS SSO session once in `~/.aws/config`:

```ini
[sso-session <your-session-name>]
sso_start_url = https://<your-sso-start-url>
sso_region = eu-central-1
sso_registration_scopes = sso:account:access

[profile mvolleys-dev]
sso_session = <your-session-name>
sso_account_id = 926634327887
sso_role_name = DeveloperAdministratorAccess
region = eu-central-1

[profile mvolleys-prod]
sso_session = <your-session-name>
sso_account_id = 883425316554
sso_role_name = DeveloperAdministratorAccess
region = eu-central-1
```

### Authenticating before development

Once per day (when credentials expire), log in and export credentials into your shell:

```sh
# 1. Refresh the SSO session (opens browser)
aws sso login --sso-session <your-session-name>

# 2. Export credentials for the dev account into your shell
eval "$(aws configure export-credentials --profile mv-dev --format env)"
export AWS_PROFILE=mv-dev
export AWS_REGION=eu-central-1
```

After this, all `vpr cdk:*` and `vpr db:*` commands will use your dev account automatically.

For prod operations, replace `mv-dev` with `mv-prod` in step 2.

## Common commands

```sh
vp dev              # Start local dev server
vp check            # Lint + typecheck
vp test             # Run tests
vpr verify      # Lint + typecheck + tests (full quality gate)

vpr db:seed         # Seed dev DynamoDB with fake data
vpr db:seed:sams    # Trigger SAMS sync Lambdas

vpr cdk:synth       # Synthesize CDK stacks (dev)
vpr cdk:diff        # Show changes vs deployed (dev)
vpr cdk:deploy:all  # Deploy all stacks (dev)
vpr cdk:deploy:prod # Deploy all stacks (prod, requires mv-prod credentials)
```

## GitHub Actions / CI

### How deployments work

| Branch    | AWS account | Role ARN                                              |
| --------- | ----------- | ----------------------------------------------------- |
| `main`    | prod        | `arn:aws:iam::041632640830:role/GitHubActionsCDKRole` |
| any other | dev         | `arn:aws:iam::926634327887:role/GitHubActionsCDKRole` |

Deployments use OIDC — no long-lived access keys. Each AWS account needs an IAM role named `GitHubActionsCDKRole` that GitHub Actions can assume.

Required IAM setup in each account:

- Create the GitHub OIDC provider for `token.actions.githubusercontent.com` if it does not already exist.
- Create the IAM role `GitHubActionsCDKRole` in that account.
- Attach a trust policy that allows `sts:AssumeRoleWithWebIdentity` from the GitHub OIDC provider.
- Restrict the trust policy to this repository with `token.actions.githubusercontent.com:sub = repo:terijaki/markgraefler-volleys:*`.
- Allow `token.actions.githubusercontent.com:aud = sts.amazonaws.com`.
- Grant the role the AWS permissions needed for CDK deploys, destroys, and any supporting reads or writes.

The trust policy shape is documented in:

- `github-actions-trust-policy.json` — prod account
- `github-actions-trust-policy-dev.json` — dev account

### Workflow configuration

The workflow files reference the IAM role ARNs directly. The role ARN is configuration, not a secret; the trust policy and IAM permissions are what secure the OIDC flow.

The role name is intentionally stable across accounts: `GitHubActionsCDKRole`. Only the account ID changes between prod and dev.

Application and deployment environment values such as `SAMS_API_KEY`, `BETTER_AUTH_SECRET`, and `CDK_BUDGET_ALERT_EMAIL` are **not** stored as GitHub repository secrets. GitHub Actions assumes the appropriate AWS role via OIDC, then Varlock loads those values from AWS SSM Parameter Store / AWS Secrets Manager as defined by the environment schema.
