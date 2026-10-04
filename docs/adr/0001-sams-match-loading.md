# ADR 0001: SAMS match loading (superseded)

**Status:** Superseded by the SAMS provider consumer ([`docs/SAMS_PROVIDER_CONSUMER.md`](SAMS_PROVIDER_CONSUMER.md)).

Matches, rankings, clubs, and teams are no longer loaded from the external SAMS REST API (`volleyball-baden.de/api/v2`). The provider publishes projections to SQS; the consumer stores them in DynamoDB; the webapp reads projections via server functions in `app/src/server/functions/sams.server.ts`.

**Exception:** The live match ticker uses `backend.sams-ticker.de` (separate service, not the SAMS REST API).

---

## Historical context (pre-provider consumer)

The website previously loaded league matches from the external SAMS API via `getSamsMatchesFn`, with in-memory filtering for league, team, date range, and limit.

## Homepage document loading (current)

The public homepage avoids blocking the first HTML byte on secondary section reads:

- Root `beforeLoad` skips `getSessionFn` when no better-auth session cookie is present.
- The homepage loader returns Instagram as an unresolved promise rendered with `<Await>` and a section fallback.
- Nitro uses the AWS Lambda streaming handler; the Function URL uses `RESPONSE_STREAM` (not buffered), matching the vcmuellheim setup.
- Anonymous `GET /` sets `Cache-Control` with `s-maxage=600` and `stale-while-revalidate=86400` so CloudFront can serve HTML between sparse visits. Signed-in homepage requests are `private, no-store`.

True Lambda cold starts still take several seconds until boot finishes; the longer homepage edge TTL is what usually avoids invoking a cold origin for idle club traffic.
