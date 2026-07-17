/**
 * Teams server-only helpers — DynamoDB access via repository.
 */

import { teamsRepository } from "@/lib/db/repositories";
import type { TeamCreateInput, TeamUpdateInput } from "@/lib/db/repositories";

export async function handleListTeams() {
  return teamsRepository.listAll();
}

export async function handleGetTeamBySlug(slug: string) {
  return teamsRepository.getBySlug(slug);
}

export async function handleCreateTeam(data: TeamCreateInput) {
  return teamsRepository.create(data);
}

export async function handleUpdateTeam(id: string, updates: TeamUpdateInput) {
  return teamsRepository.update(id, updates);
}

export async function handleDeleteTeam(id: string) {
  return teamsRepository.delete(id);
}

export type { TeamCreateInput, TeamUpdateInput };
