# fromZodSchema compatibility (spike result)

**Status:** Not used — manual Toolbox `item()` schemas instead.

## Findings (Zod v4 + dynamodb-toolbox@2.10.0)

1. **Broken package export:** `dynamodb-toolbox/schema/actions/fromZodSchema` resolves to a missing `index.js` (only `fromZodSchema.js` exists).
2. **Zod v4 incompatibility:** `fromZodSchema.js` imports `ZodEffects` from `zod`, which Zod v4 no longer exports.

## Fallback

Business attributes are defined manually in `lib/db/entities/content/*.ts` and `lib/db/entities/sams/*.ts`, mirroring `lib/db/schemas.ts`.

**Drift guard:** `lib/db/entities/zod-toolbox-contract.test.ts` runs field parity, write round-trip, and key isolation for all seven entities.

## Revisit when

- DynamoDB-Toolbox ships Zod v4-compatible `fromZodSchema` with a working export path, or
- The project downgrades to Zod v3 (not planned).
