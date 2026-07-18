import {
  type ClubResponse,
  ClubResponseSchema,
  type RosterResponse,
  RosterResponseSchema,
  type TeamResponse,
  TeamResponseSchema,
} from "@/lambda/sams/types";
import {
  membersRepository,
  samsClubsRepository,
  samsRostersRepository,
  samsTeamsRepository,
} from "@/lib/db/repositories";
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

// ── SAMS entity queries (DynamoDB-Toolbox — single SAMS data table) ──────────

export async function getAllSamsClubs(): Promise<PaginatedResult<ClubResponse>> {
  const items = await samsClubsRepository.listAll();
  return {
    items: items.map((item) => ClubResponseSchema.parse(item)),
    lastEvaluatedKey: undefined,
  };
}

export async function getSamsClubBySportsclubUuid(
  sportsclubUuid: string,
): Promise<ClubResponse | null> {
  const item = await samsClubsRepository.getById(sportsclubUuid);
  return item ? ClubResponseSchema.parse(item) : null;
}

export async function getSamsClubByNameSlug(nameSlug: string): Promise<ClubResponse | null> {
  const item = await samsClubsRepository.getByNameSlug(nameSlug);
  return item ? ClubResponseSchema.parse(item) : null;
}

export async function getSamsClubByNameSlugPrefix(prefix: string): Promise<ClubResponse | null> {
  const items = await samsClubsRepository.queryByNameSlugPrefix(prefix);
  return items[0] ? ClubResponseSchema.parse(items[0]) : null;
}

export async function getAllSamsTeams(): Promise<PaginatedResult<TeamResponse>> {
  const items = await samsTeamsRepository.listAll();
  return {
    items: items.map((item) => TeamResponseSchema.parse(item)),
    lastEvaluatedKey: undefined,
  };
}

export async function getSamsTeamByUuid(uuid: string): Promise<TeamResponse | null> {
  const item = await samsTeamsRepository.getById(uuid);
  return item ? TeamResponseSchema.parse(item) : null;
}

export async function getSamsRosterByTeamUuid(teamUuid: string): Promise<RosterResponse | null> {
  const item = await samsRostersRepository.getByTeamUuid(teamUuid);
  return item ? RosterResponseSchema.parse(item) : null;
}
