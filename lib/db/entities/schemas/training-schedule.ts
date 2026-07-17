import { list } from "dynamodb-toolbox/schema/list";
import { map } from "dynamodb-toolbox/schema/map";
import { number } from "dynamodb-toolbox/schema/number";
import { string } from "dynamodb-toolbox/schema/string";

/** Toolbox schema matching trainingScheduleSchema in lib/db/schemas.ts */
export const trainingScheduleToolboxSchema = map({
  days: list(number()),
  startTime: string(),
  endTime: string(),
  locationId: string(),
});
