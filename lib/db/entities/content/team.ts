import { Entity } from "dynamodb-toolbox/entity";
import { item } from "dynamodb-toolbox/schema/item";
import { list } from "dynamodb-toolbox/schema/list";
import { string } from "dynamodb-toolbox/schema/string";
import { teamPk } from "../../key-constants";
import { ContentTable } from "../../tables/content-table";
import { contentMetadataKeys } from "../keys/content-keys";
import { trainingScheduleToolboxSchema } from "../schemas/training-schedule";

export const TeamEntity = new Entity({
  name: "Team",
  table: ContentTable,
  timestamps: false,
  schema: item({
    id: string().key(),
    type: string().const("team"),
    name: string(),
    slug: string(),
    description: string().optional(),
    sbvvTeamId: string().optional(),
    ageGroup: string().optional(),
    gender: string().enum("male", "female", "mixed"),
    league: string().optional(),
    trainerIds: list(string()).optional(),
    pointOfContactIds: list(string()).optional(),
    pictureS3Keys: list(string()).optional(),
    trainingSchedules: list(trainingScheduleToolboxSchema).optional(),
    createdAt: string(),
    updatedAt: string(),
  }).and((prevSchema) => ({
    pk: string()
      .key()
      .savedAs("pk")
      .link<typeof prevSchema>(({ id }) => teamPk(id))
      .hidden(),
    ...contentMetadataKeys(),
    gsi1pk: string()
      .link<typeof prevSchema>(({ type }) => type)
      .savedAs("gsi1pk")
      .hidden(),
    gsi1sk: string()
      .link<typeof prevSchema>(({ slug }) => slug)
      .savedAs("gsi1sk")
      .hidden(),
    gsi3pk: string()
      .link<typeof prevSchema>(({ slug }) => slug)
      .savedAs("gsi3pk")
      .hidden(),
  })),
});
