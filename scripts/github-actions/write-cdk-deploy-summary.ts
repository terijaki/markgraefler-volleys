import { appendFileSync, readFileSync } from "node:fs";

type CdkOutputs = Record<string, Record<string, string>>;

function writeSummary(markdown: string) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    console.log(markdown);
    return;
  }
  appendFileSync(summaryPath, markdown);
}

function readCdkOutputs(path: string): CdkOutputs | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CdkOutputs;
  } catch {
    return null;
  }
}

function isInterestingOutputKey(key: string): boolean {
  return /Url$|Arn$|Domain$|Name$|Endpoint$/i.test(key);
}

const outputsPath = process.argv[2] ?? "cdk-outputs.json";
const environment = process.env.DEPLOY_ENVIRONMENT ?? "Development";
const branch = process.env.DEPLOY_BRANCH ?? "";
const commit = process.env.DEPLOY_COMMIT ?? "";
const webappUrl = process.env.WEBAPP_URL ?? "";
const icon = environment === "Production" ? "🚀" : "🔧";

let markdown = `## ${icon} CDK Deployment Summary\n\n`;
markdown += "| Property | Value |\n";
markdown += "| --- | --- |\n";
markdown += `| **Environment** | ${environment} |\n`;
if (branch) markdown += `| **Branch** | \`${branch}\` |\n`;
if (commit) markdown += `| **Commit** | \`${commit}\` |\n`;
if (webappUrl) markdown += `| **WebApp URL** | [${webappUrl}](${webappUrl}) |\n`;

const outputs = readCdkOutputs(outputsPath);
if (outputs) {
  markdown += "\n### CDK stack outputs\n\n";
  markdown += "| Stack | Output | Value |\n";
  markdown += "| --- | --- | --- |\n";

  for (const [stackName, stackOutputs] of Object.entries(outputs)) {
    for (const [key, value] of Object.entries(stackOutputs)) {
      if (!isInterestingOutputKey(key)) continue;
      const displayValue = value.startsWith("http") ? `[${value}](${value})` : value;
      markdown += `| ${stackName} | ${key} | ${displayValue} |\n`;
    }
  }
} else {
  markdown += "\n_No `cdk-outputs.json` found — stack outputs were not recorded._\n";
}

if (environment !== "Production") {
  markdown += "\n### Cleanup\n\n";
  markdown +=
    "Feature-branch stacks are destroyed when the branch is deleted or the PR is closed.\n\n";
  markdown += "```bash\nvp exec cdk destroy --all\n```\n";
}

writeSummary(`${markdown}\n`);
