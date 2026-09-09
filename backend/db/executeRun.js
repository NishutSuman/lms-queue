// CLI: execute a generated run against the LMS (reuses the Playwright scripts).
//   node db/executeRun.js --run=1          (real execution)
//   node db/executeRun.js --run=1 --dry    (map & list items, no browser)
import { initSchema } from "./index.js";
import { executeRun } from "./executor.js";

const argv = process.argv.slice(2);
const arg = (n) => {
  const hit = argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : undefined;
};
const runId = arg("run");
const dry = argv.includes("--dry");

if (!runId) {
  console.error("Usage: node db/executeRun.js --run=<id> [--dry]");
  process.exit(1);
}

initSchema();
const r = await executeRun(Number(runId), { dry, onLog: (m) => console.log(m) });
console.log("\nresult:", JSON.stringify(r));
