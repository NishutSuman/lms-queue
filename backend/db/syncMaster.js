// CLI: pull the master sheet into SQLite.
//   node db/syncMaster.js --tab="Master Sheet"
//   node db/syncMaster.js --tab="Master Sheet" --sheetId="<spreadsheetId>"
import { initSchema } from "./index.js";
import { syncMasterFromSheet } from "./masterSync.js";

function arg(name) {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

const sheetName = arg("tab");
const spreadsheetId = arg("sheetId");

if (!sheetName) {
  console.error('Usage: node db/syncMaster.js --tab="<master tab name>" [--sheetId="<id>"]');
  process.exit(1);
}

initSchema();
try {
  const result = await syncMasterFromSheet({ sheetName, spreadsheetId });
  console.log("✅ Master sync complete:");
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error("❌ Sync failed:", err.message);
  process.exit(1);
}
