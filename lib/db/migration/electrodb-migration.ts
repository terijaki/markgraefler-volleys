import { PutItemCommand } from "dynamodb-toolbox/entity/actions/put";
import { MediaEntity } from "../entities/content/media";
import { MemberEntity } from "../entities/content/member";
import { LocationEntity } from "../entities/content/location";
import { SponsorEntity } from "../entities/content/sponsor";
import { TeamEntity } from "../entities/content/team";
import { SamsClubEntity } from "../entities/sams/club";
import { SamsTeamEntity } from "../entities/sams/team";
import {
  locationSchema,
  mediaSchema,
  memberSchema,
  samsClubSchema,
  samsTeamSchema,
  sponsorSchema,
  teamSchema,
} from "../schemas";
import { applyMemberEmailIndexKeys, trimMemberEmails } from "../repositories/member-email-keys";

export const ELECTRODB_METADATA_KEYS = ["__edb_e__", "__edb_v__"] as const;

export const DYNAMODB_INDEX_KEYS = [
  "pk",
  "sk",
  "gsi1pk",
  "gsi1sk",
  "gsi3pk",
  "gsi3sk",
  "gsi4pk",
  "gsi4sk",
  "gsi5pk",
  "gsi5sk",
  "_et",
] as const;

export function isAuthStorageItem(item: Record<string, unknown>): boolean {
  return typeof item.pk === "string" && item.pk.startsWith("auth-storage#");
}

export function isAlreadyMigratedItem(item: Record<string, unknown>): boolean {
  return item.__edb_e__ === undefined && typeof item._et === "string";
}

export function isElectroDbItem(item: Record<string, unknown>): boolean {
  return typeof item.__edb_e__ === "string";
}

export function shouldSkipMigrationItem(item: Record<string, unknown>): boolean {
  if (isAuthStorageItem(item)) {
    return true;
  }
  if (isAlreadyMigratedItem(item)) {
    return true;
  }
  return !isElectroDbItem(item);
}

export function extractDomainFields(item: Record<string, unknown>): Record<string, unknown> {
  const domain: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (DYNAMODB_INDEX_KEYS.includes(key as (typeof DYNAMODB_INDEX_KEYS)[number])) {
      continue;
    }
    if (ELECTRODB_METADATA_KEYS.includes(key as (typeof ELECTRODB_METADATA_KEYS)[number])) {
      continue;
    }
    domain[key] = value;
  }
  return domain;
}

export function buildMigratedPutParams(item: Record<string, unknown>) {
  const entityType = item.__edb_e__;
  if (typeof entityType !== "string") {
    throw new Error("Item is missing __edb_e__ entity type");
  }

  const domain = extractDomainFields(item);

  switch (entityType) {
    case "team": {
      const parsed = teamSchema.parse(domain);
      return { item: TeamEntity.build(PutItemCommand).item(parsed).params().Item, entityType };
    }
    case "member": {
      const parsed = memberSchema.parse(domain);
      const putParams = MemberEntity.build(PutItemCommand).item(parsed).params();
      const dynamoItem = { ...putParams.Item };
      applyMemberEmailIndexKeys(dynamoItem, trimMemberEmails(parsed));
      return { item: dynamoItem, entityType };
    }
    case "sponsor": {
      const parsed = sponsorSchema.parse(domain);
      return { item: SponsorEntity.build(PutItemCommand).item(parsed).params().Item, entityType };
    }
    case "location": {
      const parsed = locationSchema.parse(domain);
      return { item: LocationEntity.build(PutItemCommand).item(parsed).params().Item, entityType };
    }
    case "media": {
      const parsed = mediaSchema.parse(domain);
      return { item: MediaEntity.build(PutItemCommand).item(parsed).params().Item, entityType };
    }
    case "samsclub": {
      const parsed = samsClubSchema.parse(domain);
      return { item: SamsClubEntity.build(PutItemCommand).item(parsed).params().Item, entityType };
    }
    case "samsteam": {
      const parsed = samsTeamSchema.parse(domain);
      return { item: SamsTeamEntity.build(PutItemCommand).item(parsed).params().Item, entityType };
    }
    default:
      throw new Error(`Unsupported ElectroDB entity type: ${entityType}`);
  }
}
