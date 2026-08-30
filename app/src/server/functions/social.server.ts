/**
 * Social media server-only helpers — cached Behold Instagram posts from DynamoDB.
 */

import type { BeholdPost } from "@/lambda/social/types";
import { docClient } from "@/lib/db/client";
import { getSocialTableName } from "@/lib/db/env";
import { readBeholdFeed } from "@/lib/db/social-feed-store";

export async function handleGetInstagramPosts(): Promise<BeholdPost[]> {
  try {
    const cached = await readBeholdFeed<BeholdPost>(docClient, getSocialTableName());
    return cached ?? [];
  } catch {
    return [];
  }
}
