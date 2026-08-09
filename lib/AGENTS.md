# Shared Libraries (`lib/`)

Runtime and domain code shared across the webapp, Lambdas, and SST infra.

## Infrastructure

AWS resources are defined in `infra/` and deployed via SST — see [`infra/AGENTS.md`](../infra/AGENTS.md).

## Key modules

| Path                          | Purpose                                                         |
| ----------------------------- | --------------------------------------------------------------- |
| `lib/db/`                     | DynamoDB schemas, repositories, table env helpers               |
| `lib/mail-env.ts`             | Mail bucket/rule naming (shared by SST mail infra + forwarding) |
| `lib/runtime/aws-resource.ts` | Resolve SST-linked resources from `SST_RESOURCE_*` env vars     |
