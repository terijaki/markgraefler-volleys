import { Entity } from "dynamodb-toolbox/entity";
import { item } from "dynamodb-toolbox/schema/item";
import { number } from "dynamodb-toolbox/schema/number";
import { string } from "dynamodb-toolbox/schema/string";
import { samsTeamLogoPk } from "../../key-constants";
import { SamsTable } from "../../tables/sams-table";
import { samsMetadataKeys } from "../keys/sams-keys";

export const SamsTeamLogoEntity = new Entity({
  name: "SamsTeamLogo",
  table: SamsTable,
  timestamps: false,
  schema: item({
    teamUuid: string().key(),
    type: string().const("teamlogo"),
    logoUrl: string(),
    updatedAt: string(),
    ttl: number(),
  }).and((prevSchema) => ({
    pk: string()
      .key()
      .savedAs("pk")
      .link<typeof prevSchema>(({ teamUuid }) => samsTeamLogoPk(teamUuid))
      .hidden(),
    ...samsMetadataKeys(),
  })),
});
