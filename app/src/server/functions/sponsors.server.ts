/**
 * Sponsors server-only helpers — DynamoDB access via repository.
 */

import { sponsorsRepository } from "@/lib/db/repositories";
import type { SponsorCreateInput, SponsorUpdateInput } from "@/lib/db/repositories";

export async function handleListSponsors() {
  return sponsorsRepository.listAll();
}

export async function handleCreateSponsor(data: SponsorCreateInput) {
  return sponsorsRepository.create(data);
}

export async function handleUpdateSponsor(id: string, updates: SponsorUpdateInput) {
  return sponsorsRepository.update(id, updates);
}

export async function handleDeleteSponsor(id: string) {
  return sponsorsRepository.delete(id);
}

export type { SponsorCreateInput, SponsorUpdateInput };
