# Project Guidelines

This file provides instructions for AI coding agents working in this repository.
Subfolder-level `AGENTS.md` files contain additional context for specific areas of the codebase.

## Quick Overview

- **Unified monorepo** with bun workspaces: `app` (single TanStack Start app + Nitro backend).
- **Frontend & SSR:** TanStack Start with file-based routes, Mantine UI components — see [`app/AGENTS.md`](app/AGENTS.md).
- **Server functions:** Nitro-backed server functions under `app/src/server/functions/` — use the `*.ts` / `*.server.ts` split documented in [`app/AGENTS.md`](app/AGENTS.md).
- **Backend/Infra:** SST (`sst.config.ts`, `infra/`) — see [`infra/AGENTS.md`](infra/AGENTS.md).
- **Background Lambdas:** Sync tasks, ICS/Sitemap/Social handlers under `lambda/` — see [`lambda/AGENTS.md`](lambda/AGENTS.md).
- **Shared runtime code:** `lib/db/` (repository layer), `lib/db/schemas.ts` (DB schemas).

## Commands you will use often

- **Install deps:** `vp install` at repo root.
- **Run webapp locally:**
  - `vp dev` — start unified webapp dev server (deploy an SST stage first so `.sst/outputs.json` exists).
- **Build:** `vp build`.
- **Lint / format / typecheck:**
  - `vp check` / `vp check --fix` (lint + format + typecheck)
  - `vpr verify` (combined check + tests)
- **Tests:** `vp test` (or `vp test <path/to/test>` for a single file).
- **DB / scripts:** `vpr db:seed`, `vpr db:seed:sams`
- **SST:** `vp run sst:install`, `vp run sst:deploy -- --stage <stage>` (dev uses AWS profile `mv-dev`; prod uses `mv-prod`). See [`infra/AGENTS.md`](infra/AGENTS.md) and `docs/SETUP.md`.
- **WebApp build prep:** `vp build` (outputs `.output/` with Nitro server + static assets).

## Global codebase conventions

- **Formatting & linting:** Use Vite+ (Oxlint + Oxfmt). Run `vp check` to validate, `vp check --fix` to auto-fix.
- **Strings & style:** double quotes, semicolons, 2-space indentation.
- **Auth docs:** better-auth LLM documentation is available at https://better-auth.com/llms.txt.
- **Types:** prefer `import type` where applicable; keep `tsconfig.json` settings in mind when adding exports.
  - **CRITICAL:** Never cast as `unknown` or `any` — instead, find proper type-safe patterns using TypeScript's type system. For Zod schemas, use `z.infer<>` to derive proper types, use object spreading with conditional properties, or build updates incrementally with proper intermediate types.
- **Dates:** use `dayjs` (project-wide convention — do not introduce other date libraries).
- **Iteration patterns:** prefer `for...of` over `.forEach` in shared code.
- **Avoid adding new dependencies** without strong justification — prefer reusing packages listed in `package.json` catalog.
- **Environment variables:** use Varlock (https://varlock.dev/llms.txt.) for secure management of secrets and environment variables. Avoid hardcoding sensitive values or using `.env` files.

## What NOT to change / be cautious about

- Don't change project-wide Vite+, bun workspace, or SST bootstrapping without coordinating — these affect CI and deployments.
- Avoid introducing new runtime dependencies lightly; prefer reusing packages listed in `package.json` catalog.

## When creating code suggestions

- Keep edits minimal and focused: follow existing file patterns (imports, export shapes, naming).
- Prefer small, reviewable PRs that change one area (frontend, lambda, or infra) at a time.
- When updating infra (`infra/*.ts`), note required context (stage name, environment variables, AWS profile).

## Agent skills

Agent workflows live in `.agents/skills/`. Invoke them when the user names a skill or the task matches a skill description.

### Issue tracker

Issues are tracked in GitHub Issues, and external pull requests are also treated as a triage request surface. See [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).

### Domain docs

Domain docs are configured as single-context (root `CONTEXT.md` plus root `docs/adr/`). See [`docs/agents/domain.md`](docs/agents/domain.md).
