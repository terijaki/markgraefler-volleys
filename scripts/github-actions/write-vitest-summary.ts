import { appendFileSync, readFileSync } from "node:fs";

type VitestJsonReport = {
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  success?: boolean;
  testResults?: Array<{
    name?: string;
    status?: string;
    assertionResults?: Array<{
      fullName?: string;
      status?: string;
      duration?: number;
    }>;
  }>;
};

function writeSummary(markdown: string) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    console.log(markdown);
    return;
  }
  appendFileSync(summaryPath, markdown);
}

function formatDurationMs(durationMs: number | undefined): string {
  if (durationMs == null) return "—";
  if (durationMs < 1000) return `${durationMs.toFixed(0)} ms`;
  return `${(durationMs / 1000).toFixed(2)} s`;
}

function collectFailedTests(report: VitestJsonReport): string[] {
  const failed: string[] = [];
  for (const suite of report.testResults ?? []) {
    for (const assertion of suite.assertionResults ?? []) {
      if (assertion.status === "failed") {
        failed.push(assertion.fullName ?? suite.name ?? "unknown test");
      }
    }
  }
  return failed;
}

function collectSlowTests(
  report: VitestJsonReport,
  limit = 8,
): Array<{ name: string; duration: number }> {
  const slow: Array<{ name: string; duration: number }> = [];
  for (const suite of report.testResults ?? []) {
    for (const assertion of suite.assertionResults ?? []) {
      if (assertion.duration != null) {
        slow.push({
          name: assertion.fullName ?? suite.name ?? "unknown test",
          duration: assertion.duration,
        });
      }
    }
  }
  return slow.sort((left, right) => right.duration - left.duration).slice(0, limit);
}

const reportPath = process.argv[2] ?? "vitest-results.json";

let report: VitestJsonReport;
try {
  report = JSON.parse(readFileSync(reportPath, "utf8")) as VitestJsonReport;
} catch (error) {
  writeSummary(
    `\n## ⚠️ Unit test summary\n\nCould not read Vitest JSON report at \`${reportPath}\`: ${String(error)}\n`,
  );
  process.exit(0);
}

const total = report.numTotalTests ?? 0;
const passed = report.numPassedTests ?? 0;
const failed = report.numFailedTests ?? 0;
const pending = report.numPendingTests ?? 0;
const icon = report.success ? "✅" : "❌";
const resultLabel = report.success ? "Passed" : "Failed";

let markdown = `\n## ${icon} Unit tests (Vitest)\n\n`;
markdown += "| Metric | Value |\n";
markdown += "| --- | --- |\n";
markdown += `| **Result** | ${resultLabel} |\n`;
markdown += `| **Total** | ${total} |\n`;
markdown += `| **Passed** | ${passed} |\n`;
markdown += `| **Failed** | ${failed} |\n`;
markdown += `| **Pending** | ${pending} |\n`;

const failedTests = collectFailedTests(report);
if (failedTests.length > 0) {
  markdown += "\n### Failed tests\n\n";
  for (const name of failedTests.slice(0, 20)) {
    markdown += `- ${name}\n`;
  }
  if (failedTests.length > 20) {
    markdown += `- … and ${failedTests.length - 20} more\n`;
  }
}

const slowTests = collectSlowTests(report);
if (slowTests.length > 0) {
  markdown += "\n### Slowest tests\n\n";
  markdown += "| Test | Duration |\n";
  markdown += "| --- | --- |\n";
  for (const entry of slowTests) {
    markdown += `| ${entry.name} | ${formatDurationMs(entry.duration)} |\n`;
  }
}

writeSummary(`${markdown}\n`);
