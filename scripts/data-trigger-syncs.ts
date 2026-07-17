// Script to trigger SAMS sync Lambda functions (associations, clubs, teams)
// See docs/SAMS_API_TESTING.md for details

import "varlock/auto-load";
import { execSync } from "node:child_process";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

// Check for active AWS session
function checkAwsSession() {
  try {
    execSync("aws sts get-caller-identity", { stdio: "ignore" });
  } catch {
    console.error(
      "❌ No active AWS session found. Please authenticate via AWS SSO before running this script. See docs/SETUP.md for setup instructions.",
    );
    process.exit(1);
  }
}
checkAwsSession();

import { getSanitizedBranch } from "@/utils/deploy-branch";

// Read environment and branch from env vars or use defaults
const ENVIRONMENT = process.env.CDK_ENVIRONMENT || "dev";
const BRANCH = ENVIRONMENT === "prod" ? "" : getSanitizedBranch();
const REGION = process.env.CDK_REGION || "eu-central-1";

/** List of SAMS sync Lambda functions to invoke */
const lambdaNames = [`mv-sams-clubs-sync`, `mv-sams-teams-sync`].map((name) =>
  BRANCH ? `${name}-${ENVIRONMENT}-${BRANCH}` : `${name}-${ENVIRONMENT}`,
);

const client = new LambdaClient({ region: REGION });

async function invokeSync(name: string) {
  try {
    const cmd = new InvokeCommand({
      FunctionName: name,
      InvocationType: "RequestResponse",
      Payload: Buffer.from("{}"),
    });
    const result = await client.send(cmd);
    const payload = result.Payload ? Buffer.from(result.Payload).toString() : "";

    if (result.FunctionError) {
      console.error(`❌ ${name} failed (${result.FunctionError})`);
      if (payload) {
        console.error(payload);
      }
      return false;
    }

    console.log(`✅ Invoked ${name} (StatusCode=${result.StatusCode})`);
    if (payload) {
      console.log(payload);
    }
    return true;
  } catch (err) {
    console.error(`❌ Failed to invoke ${name}`);
    console.error(err);
    return false;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("=== Triggering SAMS sync Lambdas ===");
  console.log(`Environment: ${ENVIRONMENT}`);
  console.log(`Branch: ${BRANCH || "(main)"}`);
  for (const name of lambdaNames) {
    console.log(`  → ${name}`);
  }
  console.log("");

  let failed = false;
  for (const [i, name] of lambdaNames.entries()) {
    const ok = await invokeSync(name);
    if (!ok) {
      failed = true;
    }
    if (i < lambdaNames.length - 1) {
      console.log("Waiting 5 seconds before next sync...");
      await sleep(5000);
    }
  }

  if (failed) {
    console.error("\n=== One or more syncs failed — check CloudWatch logs ===");
    process.exit(1);
  }

  console.log("\n=== All syncs completed ===");
}

main();
