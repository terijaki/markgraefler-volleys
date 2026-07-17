# fromZodSchema compatibility (spike result)

**Status:** Not used — manual Toolbox `item()` schemas instead.

## Upstream status

`fromZodSchema` shipped in [dynamodb-toolbox v2.10.0](https://github.com/dynamodb-toolbox/dynamodb-toolbox/releases/tag/v2.10.0) ([PR #1257](https://github.com/dynamodb-toolbox/dynamodb-toolbox/pull/1257)), documented under [ZodSchemer / fromZodSchema](https://www.dynamodbtoolbox.com/docs/schemas/actions/zod-schemer).

Maintainer statement on [Discussion #467](https://github.com/dynamodb-toolbox/dynamodb-toolbox/discussions/467) (Jul 2026):

> It supports Zod v3. **Zod v4 will be supported in next major.**

The toolbox itself lists `zod: ^3.24.4` as a devDependency and implements v3-style `instanceof` dispatch (`ZodEffects`, `ZodObject`, etc.).

## Why it does not work in this repo (Zod v4 + dynamodb-toolbox@^2.10.0)

### 1. Broken package export

`package.json` maps `./schema/actions/fromZodSchema` → `dist/esm/schema/actions/fromZodSchema/index.js`, but **no `index.js` exists** in the published package (only `fromZodSchema.js`). The sibling export `./schema/actions/zodSchemer` does ship an `index.js`.

```ts
import { fromZodSchema } from "dynamodb-toolbox/schema/actions/fromZodSchema";
// ❌ Cannot find module …
```

Gate test: `lib/db/entities/from-zod-schema.spike.test.ts`.

### 2. Runtime targets Zod v3 internals

`fromZodSchema.js` imports and instanceof-checks v3 classes including `ZodEffects`. Zod v4 no longer exports `ZodEffects` (refinements/transforms use a different internal model: pipes, codecs, `.check()`, etc.).

Even if the export path were fixed, loading the module against our Zod v4 install would fail at import time.

### 3. Our Zod schemas are v4-native

`lib/db/schemas.ts` uses Zod v4 top-level formats (`z.uuid()`, `z.iso.datetime()`, `z.email()`, …), not the v3-style chains (`z.string().uuid()`) that `fromZodSchema` was built and tested against.

## Alternative: ZodSchemer (Toolbox → Zod)

Since v2.9+, [ZodSchemer](https://www.dynamodbtoolbox.com/docs/schemas/actions/zod-schemer) derives Zod parsers/formatters **from** Toolbox schemas. That is the inverse of what we want: Zod remains the validation source of truth at app boundaries, and Toolbox handles DynamoDB encoding at the persistence boundary.

We intentionally did not flip to Toolbox-first + ZodSchemer.

## Current fallback

Business attributes are defined manually in `lib/db/entities/content/*.ts` and `lib/db/entities/sams/*.ts`, mirroring `lib/db/schemas.ts`. DynamoDB-specific concerns (keys, links, hidden GSI attrs) are appended via `.and()` / `.key()` on the Toolbox side only.

**Drift guard:** `lib/db/entities/zod-toolbox-contract.test.ts` runs field parity, write round-trip, key isolation, and key encoding for all seven entities.

## Revisit when

- DynamoDB-Toolbox **next major** ships Zod v4-compatible `fromZodSchema` with a working export path (per maintainer on Discussion #467), **or**
- The project downgrades to Zod v3 (not planned).

When revisiting, re-run `lib/db/entities/from-zod-schema.spike.test.ts` and confirm our v4 schema APIs transpile correctly before replacing manual entity schemas.
