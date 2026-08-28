import { getSanitizedBranch } from "@/utils/deploy-branch";
import { buildWebappUrl } from "@/utils/webapp-url";

const environment = process.env.CDK_ENVIRONMENT || "dev";
const branch = getSanitizedBranch();
process.stdout.write(buildWebappUrl(environment, branch));
