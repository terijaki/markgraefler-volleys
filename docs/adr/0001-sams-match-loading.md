# ADR 0001: SAMS match loading (superseded)

**Status:** Superseded by the SAMS provider consumer ([`docs/SAMS_PROVIDER_CONSUMER.md`](SAMS_PROVIDER_CONSUMER.md)).

Matches, rankings, clubs, and teams are no longer loaded from the external SAMS REST API (`volleyball-baden.de/api/v2`). The provider publishes projections to SQS; the consumer stores them in DynamoDB; the webapp reads projections via server functions in `app/src/server/functions/sams.server.ts`.

**Exception:** The live match ticker uses `backend.sams-ticker.de` (separate service, not the SAMS REST API).

---

## Historical context (pre-provider consumer)

The website previously loaded league matches from the external SAMS API via `getSamsMatchesFn`, with in-memory filtering for league, team, date range, and limit.
