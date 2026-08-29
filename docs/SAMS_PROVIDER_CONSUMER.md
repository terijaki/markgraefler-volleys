# SAMS provider consumer

Markgräfler Volleys consumes SAMS projection events from [`sams-provider`](https://github.com/terijaki/sams-provider) instead of running local sync Lambdas or calling the SAMS REST API from the webapp.

## Architecture

| Resource                     | Stack                                  | Scope                                                       |
| ---------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| SQS queue + DLQ              | `SamsStack`                            | Branch-scoped (dev) / singleton (prod)                      |
| Processor Lambda             | `SamsStack`                            | Same as queue (SQS event source, `reportBatchItemFailures`) |
| Queue policy (cross-account) | `SamsStack`                            | **Prod only** — provider EventBridge bus `sqs:SendMessage`  |
| Mock event seed              | `scripts/seed-sams-provider-events.ts` | Dev only                                                    |

**Prod** receives real events from provider account `550271577754` (bus `sams-provider`, `eu-central-1`).

**Dev** uses branch-scoped queues fed by `vp run db:seed:sams` after CDK deploy (CI on non-`main` branches).

## Event contract

Types, Zod schemas, and `parseSamsEventFromSqsBody()` come from npm package [`sams-provider-events`](https://www.npmjs.com/package/sams-provider-events) (`^0.3.0`). Do not duplicate schemas locally.

Processor entry point: `lambda/sams/sams-provider-events.ts`.

Handled published events:

| Event type                                                | Local action                                         |
| --------------------------------------------------------- | ---------------------------------------------------- |
| `sams.club.updated`                                       | Upsert club metadata (+ logo upload to media bucket) |
| `sams.club-season-teams.updated`                          | Replace club/season team list                        |
| `sams.club-season-rosters.updated`                        | Replace club/season roster snapshot                  |
| `sams.team-roster.updated`                                | Upsert single team roster                            |
| `sams.club-match-schedule.updated`                        | Replace club schedule projection                     |
| `sams.match-block.updated`                                | Merge matches into club schedule projections         |
| `sams.league-ranking.updated`                             | Replace league ranking projection                    |
| `sams.clubs.sync.completed` / `sams.teams.sync.completed` | Ops metadata (optional)                              |

Reserved types are ignored gracefully.

## Read path

The webapp reads clubs, teams, rosters, matches, and rankings from the branch-scoped SAMS DynamoDB table (`SAMS_TABLE_NAME`).

**Live ticker** uses the separate SBVV ticker service at `backend.sams-ticker.de` via `fetch()` in `app/src/server/functions/sams.server.ts` (not the SAMS REST API and no API key).

**ICS calendars** (`/ics/*`) read schedule projections from DynamoDB, not the SAMS REST API.

## Dev seeding

```bash
CDK_ENVIRONMENT=dev CDK_BRANCH_OVERWRITE=<branch> vp run db:seed:sams
```

The script:

1. Resolves the branch-scoped queue URL from `cdk-outputs.json` or naming convention
2. Sends mock EventBridge-wrapped events from `fixtures/sams-provider-events/` (built per deploy with stable ids)
3. Polls DynamoDB until projections exist (~60s timeout)

## Prod registration

After prod deploy, register the prod queue ARN on `terijaki/sams-provider` for club **Markgräfler Volleys** and AWS account `883425316554`.

Queue ARN is exported as `SamsProviderEventsQueueArn` from `SamsStack-Prod`.

## Related docs

- Provider event reference: https://github.com/terijaki/sams-provider/blob/main/docs/consumers/events.md
- AWS setup: [`docs/SETUP.md`](SETUP.md)
