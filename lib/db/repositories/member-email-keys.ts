import { SK_METADATA } from "../key-constants";

export type MemberEmailFields = {
  privateEmail?: string;
  proxyEmail?: string;
};

/** Apply GSI4/GSI5 keys on write; omit when the corresponding email is absent. */
export function applyMemberEmailIndexKeys(
  item: Record<string, unknown>,
  emails: MemberEmailFields,
): void {
  if (emails.proxyEmail) {
    item.gsi4pk = emails.proxyEmail;
    item.gsi4sk = SK_METADATA;
  } else {
    delete item.gsi4pk;
    delete item.gsi4sk;
  }

  if (emails.privateEmail) {
    item.gsi5pk = emails.privateEmail;
    item.gsi5sk = SK_METADATA;
  } else {
    delete item.gsi5pk;
    delete item.gsi5sk;
  }
}

export function trimMemberEmails<T extends MemberEmailFields>(member: T): T {
  return {
    ...member,
    ...(typeof member.privateEmail === "string"
      ? { privateEmail: member.privateEmail.trim() }
      : {}),
    ...(typeof member.proxyEmail === "string" ? { proxyEmail: member.proxyEmail.trim() } : {}),
  };
}
