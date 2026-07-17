import { createAdapterFactory } from "better-auth/adapters";
import { membersRepository } from "@/lib/db/repositories";
import type { Member } from "@/lib/db/types";

type AuthMemberView = Record<string, unknown>;

/**
 * Converts a member DynamoDB item to the "auth view" better-auth expects:
 * exposes `privateEmail` as `email` (canonical auth identity).
 *
 * `emailVerified` is always set to `true` because members with Admin/Moderator
 * authRole are pre-configured by admins, and OTP delivery proves email ownership.
 * Without this, better-auth's signInEmailOTP calls updateUser() to flip the flag,
 * but our update() no-op returns null which crashes refreshUserSessions().
 */
function toAuthView(member: Member): AuthMemberView {
  const { privateEmail, ...rest } = member;
  return { ...rest, email: privateEmail ?? "", emailVerified: true };
}

function isAdminEligible(member: Member): boolean {
  return member.authRole === "Admin" || member.authRole === "Moderator";
}

export const memberAuthAdapter = createAdapterFactory({
  config: {
    adapterId: "member-auth",
    adapterName: "MemberAuth",
    supportsNumericIds: false,
    supportsUUIDs: true,
    supportsDates: false,
    usePlural: false,
    transaction: false,
  },
  adapter: ({ getModelName }) => ({
    async findOne({ model, where, select }) {
      const resolvedModel = getModelName(model);
      if (resolvedModel !== "user") return null;

      const idWhere = where.find((w) => w.field === "id");
      if (idWhere) {
        const member = await membersRepository.getById(idWhere.value as string);
        if (!member || !isAdminEligible(member)) return null;
        return applySelect(toAuthView(member), select) as ReturnType<typeof Object.assign>;
      }

      const emailWhere = where.find((w) => w.field === "email");
      if (emailWhere) {
        const inputEmail = emailWhere.value as string;

        const privateMatch = await membersRepository.getByPrivateEmail(inputEmail);
        if (privateMatch && isAdminEligible(privateMatch)) {
          return applySelect(toAuthView(privateMatch), select) as ReturnType<typeof Object.assign>;
        }

        const proxyMatch = await membersRepository.getByProxyEmail(inputEmail);
        if (proxyMatch && isAdminEligible(proxyMatch)) {
          return applySelect(toAuthView(proxyMatch), select) as ReturnType<typeof Object.assign>;
        }

        return null;
      }

      return null;
    },

    // No-ops: sign-up is disabled; sessions/accounts are not stored in the DB
    async create() {
      return null as never;
    },
    async findMany() {
      return [];
    },
    async update() {
      return null;
    },
    async updateMany() {
      return 0;
    },
    async delete() {
      return;
    },
    async deleteMany() {
      return 0;
    },
    async count() {
      return 0;
    },
  }),
});

function applySelect(item: AuthMemberView, select?: string[]): AuthMemberView {
  if (!select || select.length === 0) return item;
  const result: AuthMemberView = {};
  for (const key of select) {
    if (key in item) result[key] = item[key];
  }
  return result;
}
