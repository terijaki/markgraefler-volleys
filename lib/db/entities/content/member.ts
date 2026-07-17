import { boolean } from "dynamodb-toolbox/schema/boolean";
import { Entity } from "dynamodb-toolbox/entity";
import { item } from "dynamodb-toolbox/schema/item";
import { string } from "dynamodb-toolbox/schema/string";
import { memberPk } from "../../key-constants";
import { ContentTable } from "../../tables/content-table";
import { contentMetadataKeys } from "../keys/content-keys";

export const MemberEntity = new Entity({
  name: "Member",
  table: ContentTable,
  timestamps: false,
  schema: item({
    id: string().key(),
    type: string().const("member"),
    name: string(),
    privateEmail: string().optional(),
    proxyEmail: string().optional(),
    phone: string().optional(),
    isTrainer: boolean().optional(),
    roleTitle: string().optional(),
    avatarS3Key: string().optional(),
    authRole: string().enum("Admin", "Moderator").optional(),
    createdAt: string(),
    updatedAt: string(),
  }).and((prevSchema) => ({
    pk: string()
      .key()
      .savedAs("pk")
      .link<typeof prevSchema>(({ id }) => memberPk(id))
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
    gsi4pk: string().savedAs("gsi4pk").hidden().optional(),
    gsi4sk: string().savedAs("gsi4sk").hidden().optional(),
    gsi5pk: string().savedAs("gsi5pk").hidden().optional(),
    gsi5sk: string().savedAs("gsi5sk").hidden().optional(),
  })),
});
