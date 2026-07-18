/**
 * Members server-only helpers — DynamoDB access via repository.
 */

import { membersRepository } from "@/lib/db/repositories";
import type { MemberUpdateInput } from "@/lib/db/repositories";
import { memberSchema } from "@/lib/db/schemas";
import {
  canonicalizeProxyAlias,
  getProxyAliasBranchName,
  getProxyAliasDomain,
  suggestProxyAlias,
} from "./member-alias";

const publicMemberSchema = memberSchema.omit({ privateEmail: true, authRole: true });

export async function handleListPublicMembers() {
  const result = await membersRepository.listAll();
  return {
    items: result.items.map((member) => publicMemberSchema.parse(member)),
    lastEvaluatedKey: result.lastEvaluatedKey,
  };
}

export async function handleGetTrainers() {
  const result = await membersRepository.listTrainers();
  return {
    items: result.items.map((member) => publicMemberSchema.parse(member)),
    lastEvaluatedKey: result.lastEvaluatedKey,
  };
}

export async function handleCreateMember(data: Parameters<typeof membersRepository.create>[0]) {
  const canonicalProxyEmail = data.proxyEmail ? canonicalizeProxyAlias(data.proxyEmail) : undefined;
  return membersRepository.create({
    ...data,
    proxyEmail: canonicalProxyEmail,
  });
}

export async function handleUpdateMember(id: string, updates: MemberUpdateInput, userId: string) {
  if (id === userId && updates.authRole !== "Admin") {
    throw new Error("You cannot remove your own admin role");
  }

  const { proxyEmail, ...restUpdates } = updates;
  const canonicalProxyEmail =
    proxyEmail && typeof proxyEmail === "string" ? canonicalizeProxyAlias(proxyEmail) : proxyEmail;

  return membersRepository.update(id, {
    ...restUpdates,
    proxyEmail: canonicalProxyEmail,
  });
}

export async function handleDeleteMember(id: string) {
  return membersRepository.delete(id);
}

export async function handleListAdminMembers() {
  return membersRepository.listAll();
}

export async function handleSuggestProxyAlias(name: string, excludeMemberId?: string) {
  const aliasDomain = getProxyAliasDomain();
  const aliasBranchName = getProxyAliasBranchName();
  let alias = suggestProxyAlias(name, aliasDomain, aliasBranchName);
  for (let counter = 2; counter <= 99; counter++) {
    const existing = await membersRepository.getByProxyEmail(alias);
    if (!existing || existing.id === excludeMemberId) break;
    alias = suggestProxyAlias(name, aliasDomain, aliasBranchName, counter);
  }
  return { alias };
}

export async function handleCheckProxyEmail(proxyEmail: string, excludeMemberId?: string) {
  const canonicalProxyEmail = canonicalizeProxyAlias(proxyEmail);
  const existing = await membersRepository.getByProxyEmail(canonicalProxyEmail);
  return { available: !existing || existing.id === excludeMemberId };
}

export type { MemberUpdateInput };
