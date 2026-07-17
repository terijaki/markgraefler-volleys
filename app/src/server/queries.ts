import {
  type ClubResponse,
  ClubResponseSchema,
  type TeamResponse,
  TeamResponseSchema,
} from "@/lambda/sams/types";
import { membersRepository } from "@/lib/db/repositories";
import { samsDb } from "@/lib/db/electrodb-client";
import type { Member, PaginationCursor } from "@/lib/db/types";

type PaginatedResult<T> = {
  items: T[];
  lastEvaluatedKey?: PaginationCursor;
};

/**
 * Find an admin-eligible member by their private email (canonical auth identity).
 * Only returns members with Admin or Moderator role.
 */
export async function getAdminMemberByPrivateEmail(privateEmail: string): Promise<Member | null> {
  const member = await membersRepository.getByPrivateEmail(privateEmail);
  if (!member || (member.authRole !== "Admin" && member.authRole !== "Moderator")) {
    return null;
  }
  return member;
}

/**
 * Find a member by their proxy email alias.
 * Returns any member (not gated by role) — used to resolve proxy → privateEmail for OTP delivery.
 */
export async function getMemberByProxyEmail(proxyEmail: string): Promise<Member | null> {
  return membersRepository.getByProxyEmail(proxyEmail);
}

// ── SAMS entity queries (ElectroDB — single SAMS data table) ─────────────────

export async function getAllSamsClubs(): Promise<PaginatedResult<ClubResponse>> {
  const result = await samsDb().club.query.byType({ type: "club" }).go({ pages: "all" });
  return { items: result.data.map((item) => ClubResponseSchema.parse(item)) };
}

export async function getSamsClubBySportsclubUuid(
  sportsclubUuid: string,
): Promise<ClubResponse | null> {
  const result = await samsDb().club.get({ sportsclubUuid }).go();
  return result.data ? ClubResponseSchema.parse(result.data) : null;
}

export async function getSamsClubByNameSlug(nameSlug: string): Promise<ClubResponse | null> {
  const result = await samsDb()
    .club.query.byType({ type: "club" })
    .begins({ nameSlug })
    .go({ limit: 1 });
  const item = result.data.find((c) => c.nameSlug === nameSlug);
  return item ? ClubResponseSchema.parse(item) : null;
}

export async function getSamsClubByNameSlugPrefix(prefix: string): Promise<ClubResponse | null> {
  const result = await samsDb()
    .club.query.byType({ type: "club" })
    .begins({ nameSlug: prefix })
    .go({ limit: 1 });
  return result.data[0] ? ClubResponseSchema.parse(result.data[0]) : null;
}

export async function getAllSamsTeams(): Promise<PaginatedResult<TeamResponse>> {
  const result = await samsDb().team.query.byType({ type: "team" }).go({ pages: "all" });
  return { items: result.data.map((item) => TeamResponseSchema.parse(item)) };
}

export async function getSamsTeamByUuid(uuid: string): Promise<TeamResponse | null> {
  const result = await samsDb().team.get({ uuid }).go();
  return result.data ? TeamResponseSchema.parse(result.data) : null;
}
