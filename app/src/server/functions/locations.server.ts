/**
 * Locations server-only helpers — DynamoDB access via repository.
 */

import { locationsRepository } from "@/lib/db/repositories";
import type { LocationCreateInput, LocationUpdateInput } from "@/lib/db/repositories";

export async function handleListLocations() {
  return locationsRepository.listAll();
}

export async function handleCreateLocation(data: LocationCreateInput) {
  return locationsRepository.create(data);
}

export async function handleUpdateLocation(id: string, updates: LocationUpdateInput) {
  return locationsRepository.update(id, updates);
}

export async function handleDeleteLocation(id: string) {
  return locationsRepository.delete(id);
}

export type { LocationCreateInput, LocationUpdateInput };
