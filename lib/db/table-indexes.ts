/** Shared GSI names for the single-table content database */
export const ContentTableIndexes = {
  /** Main table index */
  table: "table",
  /** Type + date/slug sorted queries */
  gsi1: "GSI1-ByTypeAndDate",
  /** Slug lookups (teams) */
  gsi3: "GSI3-BySlug",
  /** Proxy email / identifier lookups (members) */
  gsi4: "GSI4-ByIdentifier",
  /** Private email lookups (members) */
  gsi5: "GSI5-ByPrivateEmail",
} as const;

/** Shared GSI names for the single SAMS data table */
export const SamsTableIndexes = {
  /** Main table index */
  table: "table",
  /** Type + nameSlug sorted queries */
  gsi1: "GSI1-BySamsType",
} as const;
