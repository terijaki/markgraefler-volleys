import { Entity } from "dynamodb-toolbox/entity";
import { item } from "dynamodb-toolbox/schema/item";
import { number } from "dynamodb-toolbox/schema/number";
import { string } from "dynamodb-toolbox/schema/string";
import { sponsorPk } from "../../key-constants";
import { ContentTable } from "../../tables/content-table";
import { contentMetadataKeys } from "../keys/content-keys";

export const SponsorEntity = new Entity({
  name: "Sponsor",
  table: ContentTable,
  timestamps: false,
  schema: item({
    id: string().key(),
    type: string().const("sponsor"),
    name: string(),
    description: string().optional(),
    websiteUrl: string().optional(),
    logoS3Key: string().optional(),
    ttl: number().optional(),
    createdAt: string(),
    updatedAt: string(),
  }).and((prevSchema) => ({
    pk: string()
      .key()
      .savedAs("pk")
      .link<typeof prevSchema>(({ id }) => sponsorPk(id))
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
