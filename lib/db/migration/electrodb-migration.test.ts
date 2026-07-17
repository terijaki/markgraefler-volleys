import { describe, expect, it } from "vite-plus/test";
import {
  buildMigratedPutParams,
  extractDomainFields,
  isAlreadyMigratedItem,
  isAuthStorageItem,
  isElectroDbItem,
  shouldSkipMigrationItem,
} from "./electrodb-migration";

const ISO = "2024-06-15T10:30:00.000Z";

describe("electrodb-migration helpers", () => {
  it("skips auth-storage items", () => {
    expect(isAuthStorageItem({ pk: "auth-storage#otp-key", sk: "auth-storage" })).toBe(true);
    expect(shouldSkipMigrationItem({ pk: "auth-storage#otp-key", sk: "auth-storage" })).toBe(true);
  });

  it("skips already migrated Toolbox items", () => {
    const item = {
      pk: "team#abc",
      sk: "METADATA",
      _et: "Team",
      id: "abc",
      type: "team",
    };
    expect(isAlreadyMigratedItem(item)).toBe(true);
    expect(shouldSkipMigrationItem(item)).toBe(true);
  });

  it("detects ElectroDB items via __edb_e__", () => {
    const item = {
      pk: "team#abc",
      sk: "team#",
      __edb_e__: "team",
      __edb_v__: "1",
      id: "550e8400-e29b-41d4-a716-446655440000",
      type: "team",
      name: "Herren 1",
      slug: "herren1",
      gender: "male",
      createdAt: ISO,
      updatedAt: ISO,
    };
    expect(isElectroDbItem(item)).toBe(true);
    expect(shouldSkipMigrationItem(item)).toBe(false);
  });

  it("extractDomainFields strips DynamoDB and ElectroDB metadata keys", () => {
    const domain = extractDomainFields({
      pk: "team#abc",
      sk: "team#",
      gsi1pk: "team",
      gsi1sk: "herren1",
      __edb_e__: "team",
      __edb_v__: "1",
      id: "550e8400-e29b-41d4-a716-446655440000",
      type: "team",
      name: "Herren 1",
      slug: "herren1",
      gender: "male",
      createdAt: ISO,
      updatedAt: ISO,
    });

    expect(domain).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      type: "team",
      name: "Herren 1",
      slug: "herren1",
      gender: "male",
      createdAt: ISO,
      updatedAt: ISO,
    });
  });

  it("buildMigratedPutParams encodes Toolbox keys for a team item", () => {
    const { item } = buildMigratedPutParams({
      pk: "team#550e8400-e29b-41d4-a716-446655440000",
      sk: "team#",
      __edb_e__: "team",
      __edb_v__: "1",
      id: "550e8400-e29b-41d4-a716-446655440000",
      type: "team",
      name: "Herren 1",
      slug: "herren1",
      gender: "male",
      createdAt: ISO,
      updatedAt: ISO,
    });

    expect(item).toBeDefined();
    expect(item).toMatchObject({
      pk: "team#550e8400-e29b-41d4-a716-446655440000",
      sk: "METADATA",
      _et: "Team",
      gsi1pk: "team",
      gsi1sk: "herren1",
      gsi3pk: "herren1",
    });
    expect(item!.__edb_e__).toBeUndefined();
  });

  it("buildMigratedPutParams applies member email GSI keys", () => {
    const { item } = buildMigratedPutParams({
      pk: "member#660e8400-e29b-41d4-a716-446655440001",
      sk: "member#",
      __edb_e__: "member",
      __edb_v__: "1",
      id: "660e8400-e29b-41d4-a716-446655440001",
      type: "member",
      name: "Admin User",
      privateEmail: "admin@example.com",
      proxyEmail: "public@proxy.example.com",
      createdAt: ISO,
      updatedAt: ISO,
    });

    expect(item).toBeDefined();
    expect(item!.gsi4pk).toBe("public@proxy.example.com");
    expect(item!.gsi5pk).toBe("admin@example.com");
  });
});
