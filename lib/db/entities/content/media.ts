import { Entity } from "dynamodb-toolbox/entity";
import { item } from "dynamodb-toolbox/schema/item";
import { number } from "dynamodb-toolbox/schema/number";
import { string } from "dynamodb-toolbox/schema/string";
import { mediaPk } from "../../key-constants";
import { ContentTable } from "../../tables/content-table";
import { contentMetadataKeys } from "../keys/content-keys";

export const MediaEntity = new Entity({
  name: "Media",
  table: ContentTable,
  timestamps: false,
  schema: item({
    id: string().key(),
    filename: string(),
    mimeType: string(),
    url: string(),
    s3Key: string(),
    s3Bucket: string(),
    alt: string().optional(),
    caption: string().optional(),
    width: number().optional(),
    height: number().optional(),
    fileSize: number(),
    uploadedBy: string(),
    createdAt: string(),
    updatedAt: string(),
  }).and((prevSchema) => ({
    pk: string()
      .key()
      .savedAs("pk")
      .link<typeof prevSchema>(({ id }) => mediaPk(id))
      .hidden(),
    ...contentMetadataKeys(),
  })),
});
