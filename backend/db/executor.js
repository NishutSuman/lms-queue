import { chromium } from "playwright";
import dotenv from "dotenv";
import { db } from "./index.js";
import { cloneLecture } from "../utils/cloneLecture.js";
import { cloneAssignment } from "../utils/cloneAssignment.js";
import { getConfig } from "../utils/getConfig.js";

dotenv.config();
const { MASAI_ADMIN_LMS_USER_EMAIL, MASAI_ADMIN_LMS_USER_PASSWORD } = getConfig();
const isHeadless = process.env.HEADLESS !== "false";

// Map a DB item to the shape the existing Playwright clone scripts expect.
function toScriptInput(it) {
  const common = {
    target_batch: it.target_batch,
    target_section: it.target_section,
    target_title: it.target_title || "",
    associated_lecture: it.associated_lecture || "",
    startDate: it.start_date,
    startTime: it.start_time,
    endDate: it.end_date,
    endTime: it.end_time,
  };
  if (it.runner_type === "assignment_clone") {
    return { ...common, source_assignment_id: it.source_id };
  }
  // lecture_clone covers lecture_note and solution_video
  return { ...common, source_lecture_id: it.source_id, source_lecture_title: it.source_title || "" };
}

// Execute all pending/failed items of a run. Reuses the existing (unchanged)
// Playwright scripts; writes status to the DB live. Idempotent & resumable:
// done items are skipped, so re-running only processes what's left.
export async function executeRun(runId, { dry = false, onLog = () => {}, resourceType = null } = {}) {
  let sql = "SELECT * FROM items WHERE run_id = ? AND status IN ('pending','failed')";
  const params = [runId];
  if (resourceType) { sql += " AND resource_type = ?"; params.push(resourceType); }
  sql += " ORDER BY resource_type, id";
  const items = db.prepare(sql).all(...params);

  const scope = resourceType ? ` (${resourceType})` : "";
  if (!items.length) { onLog(`Run #${runId}: nothing pending${scope}.`); return { processed: 0, done: 0, failed: 0 }; }
  onLog(`Run #${runId}: ${items.length} item(s)${scope} to process${dry ? " (DRY)" : ""}.`);

  if (dry) {
    for (const it of items) {
      onLog(`[DRY] ${it.runner_type}/${it.resource_type} src=${it.source_id} → ${it.target_batch}/${it.target_section} @ ${it.start_date} ${it.start_time}-${it.end_time}`);
    }
    return { processed: items.length, done: 0, failed: 0, dry: true };
  }

  const nowIso = () => new Date().toISOString();
  const markStart = db.prepare(
    "UPDATE items SET status='in_progress', started_at=?, updated_at=? WHERE id=?"
  );
  const markEnd = db.prepare(
    "UPDATE items SET status=?, error=?, attempts=attempts+1, finished_at=?, updated_at=? WHERE id=?"
  );

  const browser = await chromium.launch({
    headless: isHeadless,
    slowMo: 100,
    args: isHeadless
      ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
      : ["--start-maximized"],
  });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  let done = 0, failed = 0;
  try {
    onLog("🔐 Logging into LMS...");
    await page.goto(process.env.MASAI_ADMIN_LMS_URL, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', MASAI_ADMIN_LMS_USER_EMAIL);
    await page.fill('input[type="password"]', MASAI_ADMIN_LMS_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    onLog("✅ Login successful");

    db.prepare("UPDATE runs SET status='running', updated_at=? WHERE id=?").run(nowIso(), runId);

    for (const it of items) {
      const t0 = nowIso();
      markStart.run(t0, t0, it.id);
      onLog(`▶ ${it.resource_type}: "${it.session_title}" → ${it.target_batch} / ${it.target_section}`);

      let result;
      try {
        const input = toScriptInput(it);
        result = it.runner_type === "assignment_clone"
          ? await cloneAssignment(page, input)
          : await cloneLecture(page, input);
      } catch (e) {
        result = { status: "Error", error: e.message };
      }

      const t1 = nowIso();
      if (result.status === "Done") {
        markEnd.run("done", "", t1, t1, it.id);
        done++; onLog("   ✅ done");
      } else {
        markEnd.run("failed", result.error || "unknown error", t1, t1, it.id);
        failed++; onLog(`   ❌ ${result.error}`);
      }
    }

    // Mark the run done only when NOTHING is left across all categories; else 'partial'.
    const remaining = db
      .prepare("SELECT COUNT(*) c FROM items WHERE run_id = ? AND status IN ('pending','failed')")
      .get(runId).c;
    db.prepare("UPDATE runs SET status=?, updated_at=? WHERE id=?")
      .run(remaining === 0 ? "done" : "partial", nowIso(), runId);
    onLog(`🎯 Run #${runId}: ${done} done, ${failed} failed${remaining ? `, ${remaining} still pending` : ""}.`);
  } finally {
    await browser.close();
  }
  return { processed: items.length, done, failed };
}
