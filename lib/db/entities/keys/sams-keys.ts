import { string } from "dynamodb-toolbox/schema/string";
import { SK_METADATA } from "../../key-constants";

/** Hidden pk/sk + GSI key attributes for SAMS-table entities */
export function samsMetadataKeys() {
  return {
    sk: string()
      .key()
      .savedAs("sk")
      .link(() => SK_METADATA)
      .hidden(),
  } as const;
}
