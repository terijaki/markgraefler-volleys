import { list } from "dynamodb-toolbox/schema/list";
import { map } from "dynamodb-toolbox/schema/map";
import { number } from "dynamodb-toolbox/schema/number";
import { string } from "dynamodb-toolbox/schema/string";

/** Toolbox schema matching samsRosterPlayerSchema in lib/db/schemas.ts */
export const samsRosterPlayerToolboxSchema = map({
  uuid: string(),
  name: string(),
  jerseyNumber: number().optional(),
  position: string().optional(),
  portraitImageLink: string().optional(),
});

/** Toolbox schema matching samsRosterOfficialSchema in lib/db/schemas.ts */
export const samsRosterOfficialToolboxSchema = map({
  uuid: string(),
  name: string(),
  role: string().optional(),
});

export const samsRosterPlayersToolboxSchema = list(samsRosterPlayerToolboxSchema);
export const samsRosterOfficialsToolboxSchema = list(samsRosterOfficialToolboxSchema);
