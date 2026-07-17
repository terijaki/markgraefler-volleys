import { Entity } from "dynamodb-toolbox/entity";
import { item } from "dynamodb-toolbox/schema/item";
import { string } from "dynamodb-toolbox/schema/string";
import { locationPk } from "../../key-constants";
import { ContentTable } from "../../tables/content-table";
import { contentMetadataKeys } from "../keys/content-keys";

export const LocationEntity = new Entity({
  name: "Location",
  table: ContentTable,
  timestamps: false,
  schema: item({
    id: string().key(),
    type: string().const("location"),
    name: string(),
    description: string().optional(),
    street: string(),
    postal: string(),
    city: string(),
    createdAt: string(),
    updatedAt: string(),
  }).and((prevSchema) => ({
    pk: string()
      .key()
      .savedAs("pk")
      .link<typeof prevSchema>(({ id }) => locationPk(id))
      .hidden(),
    ...contentMetadataKeys(),
    gsi1pk: string()
      .link<typeof prevSchema>(({ type }) => type)
      .savedAs("gsi1pk")
      .hidden(),
    gsi1sk: string()
      .link<typeof prevSchema>(({ updatedAt }) => updatedAt)
      .savedAs("gsi1sk")
      .hidden(),
  })),
});
