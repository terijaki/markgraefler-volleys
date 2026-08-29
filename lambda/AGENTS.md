# Lambda Guidelines

This file provides instructions specific to the `lambda/` directory, which contains the AWS Lambda function implementations.

## Structure

- `lambda/sams/` — SAMS provider consumer processor (`sams-provider-events.ts`) and shared SAMS types
- `lambda/content/` — Lambdas for content management (ICS calendar, Bun image processing, S3 cleanup, sitemap)
- `lambda/social/` — Lambdas for social media integrations (Instagram)
- `lambda/utils/` — Shared Lambda utilities (e.g., Sentry error reporting)

## Key files to reference

- `lambda/sams/sams-provider-events.ts` — SQS processor for provider projections
- `lambda/content/image-processor.ts` — S3-triggered Bun.Image processor (`mv-bun-image-processor-*`)
- `lambda/social/behold-sync.ts` — social media Lambda example

## Lambda conventions

- Each Lambda file exports a single handler function.
- Unit tests live alongside the Lambda file (e.g., `sams-provider-events.test.ts` next to `sams-provider-events.ts`).
- Use `aws-sdk-client-mock` in tests wherever AWS SDK calls are present.
- Use the Sentry utility (`lambda/utils/sentry.ts`) for error reporting.

## Testing

- Run all Lambda tests: `vp test`
- Run a single test file: `vp test lambda/sams/sams-provider-events.test.ts`
- Mock AWS SDK calls with `aws-sdk-client-mock` (see existing tests for patterns).

## CDK wiring

Lambda functions are declared and wired up in the CDK stacks under `lib/` (e.g., `lib/sams-stack.ts`, `lib/social-media-stack.ts`). When adding a new Lambda, update the corresponding CDK stack as well.
