import { createSamsClient, type SamsClient } from "sams-rest-v2";
import { SAMS } from "@project.config";

export type { SamsClient };

export function createProjectSamsClient(apiKey: string): SamsClient {
  return createSamsClient({
    baseUrl: `${SAMS.server}/api/v2`,
    apiKey,
  });
}

const clientCache = new Map<string, SamsClient>();

export function getProjectSamsClient(apiKey: string): SamsClient {
  let client = clientCache.get(apiKey);
  if (!client) {
    client = createProjectSamsClient(apiKey);
    clientCache.set(apiKey, client);
  }
  return client;
}

export function getEnvSamsClient(): SamsClient {
  const apiKey = process.env.SAMS_API_KEY;
  if (!apiKey) {
    throw new Error("SAMS_API_KEY is not configured");
  }
  return getProjectSamsClient(apiKey);
}
