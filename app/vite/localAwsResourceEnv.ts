import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PluginOption } from "vite-plus";
import {
  CACHE_TABLE_ENV_VAR,
  CONTENT_TABLE_ENV_VAR,
  SAMS_TABLE_ENV_VAR,
} from "../../lib/db/env.ts";

interface SstOutputs {
  contentTable?: string;
  cacheTable?: string;
  samsTable?: string;
  mediaBucket?: string;
  mediaUrl?: string;
  webappUrl?: string;
}

function setDefaultEnv(name: string, value: string) {
  if (!process.env[name]) {
    process.env[name] = value;
  }
}

function readSstOutputs(): SstOutputs | undefined {
  const outputsPath = resolve(process.cwd(), ".sst/outputs.json");
  try {
    return JSON.parse(readFileSync(outputsPath, "utf8")) as SstOutputs;
  } catch {
    return undefined;
  }
}

/**
 * Load AWS resource names from a deployed SST stage (`.sst/outputs.json`).
 *
 * Run `vp run sst:deploy -- --stage <stage>` once, then `vp dev` picks up linked
 * resource names from the outputs file.
 */
export function localAwsResourceEnvPlugin(): PluginOption {
  return {
    name: "local-aws-resource-env",
    apply: "serve",
    config() {
      const outputs = readSstOutputs();
      if (!outputs) {
        console.warn(
          "[local-aws-resource-env] No .sst/outputs.json found — deploy an SST stage first or set resource env vars manually.",
        );
        return;
      }

      if (outputs.contentTable) {
        setDefaultEnv(CONTENT_TABLE_ENV_VAR, outputs.contentTable);
      }
      if (outputs.cacheTable) {
        setDefaultEnv(CACHE_TABLE_ENV_VAR, outputs.cacheTable);
      }
      if (outputs.samsTable) {
        setDefaultEnv(SAMS_TABLE_ENV_VAR, outputs.samsTable);
      }
      if (outputs.mediaBucket) {
        setDefaultEnv("MEDIA_BUCKET_NAME", outputs.mediaBucket);
      }
      if (outputs.mediaUrl) {
        setDefaultEnv("MEDIA_CLOUDFRONT_URL", outputs.mediaUrl);
      }
      if (outputs.webappUrl) {
        setDefaultEnv("APP_BASE_URL", outputs.webappUrl);
      }
    },
  };
}
