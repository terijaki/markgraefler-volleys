import { defineConfig, lazyPlugins } from "vite-plus";
import { localAwsResourceEnvPlugin } from "./app/vite/localAwsResourceEnv.ts";

const isProd = process.env.CDK_ENVIRONMENT === "prod";
const isTest = process.env.VITEST === "true";
const isDevServer = process.argv.some((arg) => arg === "dev" || arg === "serve");

// Public pages are not personalized (see app/src/routes/_layout.tsx) and only need to be
// as fresh as their underlying SAMS/content data, which itself refreshes on the order of
// minutes. A short CDN-only cache (`s-maxage`) lets CloudFront absorb most traffic without
// invoking the Lambda on every request — this is what keeps traffic spikes from throttling
// the WebApp Lambda. `max-age=0` still forces browsers to revalidate on every navigation.
const PUBLIC_PAGE_CACHE_CONTROL = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["app/src/routeTree.gen.ts", "codegen/sams/generated/**", "env.d.ts"],
  },
  lint: {
    ignorePatterns: ["codegen/sams/generated/**", "app/src/routeTree.gen.ts"],
    plugins: ["react"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  plugins: lazyPlugins(async () => {
    const [{ tanstackStart }, reactModule] = await Promise.all([
      import("@tanstack/react-start/plugin/vite"),
      import("@vitejs/plugin-react"),
    ]);
    const react = reactModule.default;

    if (isTest) {
      return [localAwsResourceEnvPlugin(), tanstackStart({ srcDirectory: "app/src" }), react()];
    }

    const [{ nitro }, { varlockVitePlugin }, babelModule, { sentryTanstackStart }] =
      await Promise.all([
        import("nitro/vite"),
        import("@varlock/vite-integration"),
        import("@rolldown/plugin-babel"),
        import("@sentry/tanstackstart-react/vite"),
      ]);

    return [
      localAwsResourceEnvPlugin(),
      ...(isDevServer ? [varlockVitePlugin()] : []),
      nitro({
        preset: "aws-lambda",
        output: {
          publicDir: "app/.output/public",
          serverDir: "app/.output/server",
        },
        // Keep AWS SDK v3 packages external to avoid broken transformed chunks in Lambda runtime.
        rollupConfig: {
          external: [/^@aws-sdk\//],
        },
        rolldownConfig: {
          external: [/^@aws-sdk\//],
        },
        publicAssets: [{ dir: "app/public", maxAge: 0 }],
        // Public, non-personalized pages get a short CloudFront edge cache (see
        // `ssrCachePolicy` in lib/webapp-stack.ts) so most traffic is served from the CDN
        // instead of invoking the Lambda on every request. `s-maxage` controls the shared
        // (CDN) cache; `max-age=0` keeps browsers always revalidating. Admin/auth routes are
        // explicitly marked `no-store` as a safety net even though they're excluded above.
        routeRules: {
          "/": { headers: { "cache-control": PUBLIC_PAGE_CACHE_CONTROL } },
          "/tabelle": { headers: { "cache-control": PUBLIC_PAGE_CACHE_CONTROL } },
          "/matches": { headers: { "cache-control": PUBLIC_PAGE_CACHE_CONTROL } },
          "/matches/**": { headers: { "cache-control": PUBLIC_PAGE_CACHE_CONTROL } },
          "/teams": { headers: { "cache-control": PUBLIC_PAGE_CACHE_CONTROL } },
          "/teams/**": { headers: { "cache-control": PUBLIC_PAGE_CACHE_CONTROL } },
          "/brand": { headers: { "cache-control": PUBLIC_PAGE_CACHE_CONTROL } },
          "/impressum": { headers: { "cache-control": PUBLIC_PAGE_CACHE_CONTROL } },
          "/datenschutz": { headers: { "cache-control": PUBLIC_PAGE_CACHE_CONTROL } },
          "/member": { headers: { "cache-control": PUBLIC_PAGE_CACHE_CONTROL } },
          "/admin/**": { headers: { "cache-control": "private, no-store" } },
          "/api/**": { headers: { "cache-control": "private, no-store" } },
        },
      }),
      tanstackStart({ srcDirectory: "app/src" }),
      react(),
      babelModule.default({ presets: [reactModule.reactCompilerPreset()] }),
      sentryTanstackStart({
        org: "volleyballclub-mullheim-ev",
        project: "volleyball-webapp",
        authToken: process.env.SENTRY_AUTH_TOKEN,
        silent: !isProd,
      }),
    ];
  }),
  build: {
    sourcemap: true,
  },
  server: {
    port: 3080,
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ["warn", "error"],
    },
  },
  publicDir: "app/public",
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    root: ".",
    silent: true,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    reporters: process.env.GITHUB_ACTIONS === "true" ? ["agent", "github-actions"] : ["agent"],
    env: {
      // Suppress Powertools structured log output during tests
      POWERTOOLS_LOG_LEVEL: "SILENT",
      // Suppress jsii deprecation warnings from aws-cdk-lib
      JSII_DEPRECATED: "quiet",
      CONTENT_TABLE_NAME: "test-content-table",
      SAMS_TABLE_NAME: "test-sams-table",
      APP_BASE_URL: "https://test.markgraefler-volleys.de",
    },
  },
  run: {
    tasks: {
      // CDK deploy guarded by full check + tests
      deploy: {
        command: "bun run cdk:deploy:all",
        dependsOn: ["lint", "test"],
        cache: false,
      },
      // Database seeding script
      seed: {
        command: "bun run db:seed",
        dependsOn: ["lint", "test"],
        cache: false,
      },
      "seed-sams": {
        command: "bun run db:seed:sams",
        cache: false,
      },
      // Deploy + seed in one command for new branches
      "deploy-seeded": {
        command: "vpr seed",
        dependsOn: ["deploy"],
        cache: false,
      },
    },
  },
});
