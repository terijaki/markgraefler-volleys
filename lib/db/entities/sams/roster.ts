import { Entity } from "dynamodb-toolbox/entity";
import { item } from "dynamodb-toolbox/schema/item";
import { number } from "dynamodb-toolbox/schema/number";
import { string } from "dynamodb-toolbox/schema/string";
import { samsRosterPk } from "../../key-constants";
import { SamsTable } from "../../tables/sams-table";
import { samsMetadataKeys } from "../keys/sams-keys";
import {
  samsRosterOfficialsToolboxSchema,
  samsRosterPlayersToolboxSchema,
} from "../schemas/sams-roster";

export const SamsRosterEntity = new Entity({
  name: "SamsRoster",
  table: SamsTable,
  timestamps: false,
  schema: item({
    teamUuid: string().key(),
    type: string().const("roster"),
    players: samsRosterPlayersToolboxSchema,
    officials: samsRosterOfficialsToolboxSchema,
    snapshotVersion: string().optional(),
    updatedAt: string(),
    ttl: number(),
  }).and((prevSchema) => ({
    pk: string()
      .key()
      .savedAs("pk")
      .link<typeof prevSchema>(({ teamUuid }) => samsRosterPk(teamUuid))
      .hidden(),
    ...samsMetadataKeys(),
    gsi1pk: string()
      .link<typeof prevSchema>(({ type }) => type)
      .savedAs("gsi1pk")
      .hidden(),
    gsi1sk: string()
      .link<typeof prevSchema>(({ teamUuid }) => teamUuid)
      .savedAs("gsi1sk")
      .hidden(),
  })),
});
