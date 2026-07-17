import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { Member } from "@/lib/db/types";
import type { memberAuthAdapter as MemberAuthAdapter } from "./auth-member-adapter";

const ADMIN_MEMBER: Member = {
  id: "m-admin",
  name: "Admin User",
  type: "member",
  privateEmail: "admin@example.com",
  proxyEmail: "public-admin@proxy.example.com",
  authRole: "Admin",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const MODERATOR_MEMBER: Member = {
  id: "m-mod",
  name: "Mod User",
  type: "member",
  privateEmail: "mod@example.com",
  proxyEmail: "public-mod@proxy.example.com",
  authRole: "Moderator",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const MEMBER_NO_ROLE: Member = {
  id: "m-norole",
  name: "Regular Member",
  type: "member",
  privateEmail: "norole@example.com",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const { mockGetById, mockGetByPrivateEmail, mockGetByProxyEmail } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockGetByPrivateEmail: vi.fn(),
  mockGetByProxyEmail: vi.fn(),
}));

vi.mock("@/lib/db/repositories", () => ({
  membersRepository: {
    getById: mockGetById,
    getByPrivateEmail: mockGetByPrivateEmail,
    getByProxyEmail: mockGetByProxyEmail,
  },
}));

let adapter: typeof MemberAuthAdapter;

// biome-ignore lint/suspicious/noExplicitAny: better-auth adapter internal type
let adaptClient: (args: any) => Promise<unknown>;

async function findOne(args: {
  model: string;
  where: Array<{ field: string; value: unknown; operator?: string }>;
  select?: string[];
}) {
  // biome-ignore lint/suspicious/noExplicitAny: adapter internal
  return adaptClient(args);
}

beforeEach(async () => {
  adapter = (await import("./auth-member-adapter")).memberAuthAdapter;

  // biome-ignore lint/suspicious/noExplicitAny: factory introspection
  const built = (adapter as any)({ getModelName: (model: string) => model });
  adaptClient = built.findOne.bind(built);
});

describe("findOne — user model", () => {
  beforeEach(() => {
    mockGetById.mockImplementation(async (id: string) => {
      const members = [ADMIN_MEMBER, MODERATOR_MEMBER, MEMBER_NO_ROLE];
      return members.find((member) => member.id === id) ?? null;
    });
    mockGetByPrivateEmail.mockImplementation(async (email: string) => {
      const members = [ADMIN_MEMBER, MODERATOR_MEMBER, MEMBER_NO_ROLE];
      return members.find((member) => member.privateEmail === email) ?? null;
    });
    mockGetByProxyEmail.mockImplementation(async (email: string) => {
      const members = [ADMIN_MEMBER, MODERATOR_MEMBER];
      return members.find((member) => member.proxyEmail === email) ?? null;
    });
  });

  it("finds an Admin member by privateEmail and maps it to email in auth view", async () => {
    const result = (await findOne({
      model: "user",
      where: [{ field: "email", value: "admin@example.com" }],
    })) as Record<string, unknown>;

    expect(result).not.toBeNull();
    expect(result.id).toBe("m-admin");
    expect(result.email).toBe("admin@example.com");
    expect(result.privateEmail).toBeUndefined();
  });

  it("finds a Moderator member by privateEmail", async () => {
    const result = (await findOne({
      model: "user",
      where: [{ field: "email", value: "mod@example.com" }],
    })) as Record<string, unknown>;

    expect(result).not.toBeNull();
    expect(result.id).toBe("m-mod");
    expect(result.email).toBe("mod@example.com");
  });

  it("always returns emailVerified: true in auth view", async () => {
    const result = (await findOne({
      model: "user",
      where: [{ field: "email", value: "mod@example.com" }],
    })) as Record<string, unknown>;
    expect(result).not.toBeNull();
    expect(result.emailVerified).toBe(true);

    const admin = (await findOne({
      model: "user",
      where: [{ field: "email", value: "admin@example.com" }],
    })) as Record<string, unknown>;
    expect(admin.emailVerified).toBe(true);
  });

  it("finds a member by proxyEmail alias when privateEmail lookup fails, and still exposes privateEmail as email", async () => {
    mockGetByPrivateEmail.mockResolvedValueOnce(null);

    const result = (await findOne({
      model: "user",
      where: [{ field: "email", value: "public-admin@proxy.example.com" }],
    })) as Record<string, unknown>;

    expect(result).not.toBeNull();
    expect(result.id).toBe("m-admin");
    expect(result.email).toBe("admin@example.com");
  });

  it("returns null when no member has that email", async () => {
    mockGetByPrivateEmail.mockResolvedValue(null);
    mockGetByProxyEmail.mockResolvedValue(null);

    const result = await findOne({
      model: "user",
      where: [{ field: "email", value: "unknown@example.com" }],
    });

    expect(result).toBeNull();
  });

  it("returns null for a member without Admin or Moderator role even if email matches", async () => {
    const result = await findOne({
      model: "user",
      where: [{ field: "email", value: "norole@example.com" }],
    });

    expect(result).toBeNull();
  });

  it("finds a member by id and maps privateEmail to email", async () => {
    const result = (await findOne({
      model: "user",
      where: [{ field: "id", value: "m-mod" }],
    })) as Record<string, unknown>;

    expect(result).not.toBeNull();
    expect(result.id).toBe("m-mod");
    expect(result.email).toBe("mod@example.com");
  });

  it("returns null when looking up by id for a member without a role", async () => {
    const result = await findOne({ model: "user", where: [{ field: "id", value: "m-norole" }] });

    expect(result).toBeNull();
  });

  it("returns null when looking up by id for a non-existent member", async () => {
    mockGetById.mockResolvedValueOnce(null);

    const result = await findOne({
      model: "user",
      where: [{ field: "id", value: "does-not-exist" }],
    });

    expect(result).toBeNull();
  });

  it("applies field selection when select is provided", async () => {
    const result = (await findOne({
      model: "user",
      where: [{ field: "email", value: "admin@example.com" }],
      select: ["id", "email"],
    })) as Record<string, unknown>;

    expect(result).not.toBeNull();
    expect(result.id).toBe("m-admin");
    expect(result.email).toBe("admin@example.com");
    expect(result.role).toBeUndefined();
    expect(result.name).toBeUndefined();
  });
});

describe("findOne — non-user models return null", () => {
  beforeEach(() => {
    mockGetById.mockResolvedValue(ADMIN_MEMBER);
  });

  it("returns null for session model", async () => {
    const result = await findOne({ model: "session", where: [{ field: "token", value: "tok" }] });
    expect(result).toBeNull();
  });

  it("returns null for verification model", async () => {
    const result = await findOne({
      model: "verification",
      where: [{ field: "identifier", value: "admin@example.com" }],
    });
    expect(result).toBeNull();
  });

  it("returns null for account model", async () => {
    const result = await findOne({
      model: "account",
      where: [{ field: "userId", value: "m-admin" }],
    });
    expect(result).toBeNull();
  });
});
