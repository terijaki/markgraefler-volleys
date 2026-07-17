import { string } from "dynamodb-toolbox/schema/string";
import { SK_METADATA } from "../../key-constants";

/** Hidden pk/sk + GSI key attributes for content-table entities */
export function contentMetadataKeys() {
  return {
    sk: string()
      .key()
      .savedAs("sk")
      .link(() => SK_METADATA)
      .hidden(),
    gsi3sk: string()
      .link(() => SK_METADATA)
      .savedAs("gsi3sk")
      .hidden()
      .optional(),
    gsi4sk: string()
      .link(() => SK_METADATA)
      .savedAs("gsi4sk")
      .hidden()
      .optional(),
    gsi5sk: string()
      .link(() => SK_METADATA)
      .savedAs("gsi5sk")
      .hidden()
      .optional(),
  } as const;
}
