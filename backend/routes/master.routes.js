import express from "express";
import { syncMasterFromSheet } from "../db/masterSync.js";
import { listMasterContent } from "../db/masterContent.js";
import { generateWeek } from "../db/generator.js";
import { getRun, getRunItems, listRuns, deleteRun } from "../db/runs.js";
import { dbRunQueue } from "../configs/redis_bullmq.config.js";

// Routes for the new DB / "Auto mode". Kept separate from the sheet-based
// AutomationRouter (/api) so the two modes never overlap.
export const DbRouter = express.Router();

// Generate a week: dry preview (commit=false) or create a run (commit=true).
// Body: { from?: "DD-MM-YYYY", to?: "DD-MM-YYYY", commit?: boolean }
DbRouter.post("/generate", async (req, res) => {
  try {
    const { from, to, commit } = req.body || {};
    const result = await generateWeek({ from, to, commit: !!commit });
    return res.json({ ...result, itemCount: result.items.length }); // full items so the UI can show the prepared rows
  } catch (err) {
    return res.status(500).json({ message: "Generate failed", error: err.message });
  }
});

// List runs with per-status counts.
DbRouter.get("/runs", (_req, res) => res.json({ runs: listRuns() }));

// Delete a run from history (and its items).
DbRouter.delete("/runs/:id", (req, res) => {
  const runId = Number(req.params.id);
  if (!getRun(runId)) return res.status(404).json({ message: "Run not found" });
  deleteRun(runId);
  return res.json({ message: `Run #${runId} deleted` });
});

// A run's items (poll this for live status).
DbRouter.get("/runs/:id/items", (req, res) => {
  const run = getRun(Number(req.params.id));
  if (!run) return res.status(404).json({ message: "Run not found" });
  return res.json({ run, items: getRunItems(Number(req.params.id)) });
});

// Queue a run for execution (async, via the dbRunQueue worker).
DbRouter.post("/runs/:id/execute", async (req, res) => {
  try {
    const runId = Number(req.params.id);
    const { resourceType } = req.body || {};
    const run = getRun(runId);
    if (!run) return res.status(404).json({ message: "Run not found" });
    const sessionId = `dbrun-${runId}-${Date.now()}`;
    const job = await dbRunQueue.add("executeDbRun", { runId, sessionId, resourceType: resourceType || null });
    return res.json({ message: "Execution queued", runId, resourceType: resourceType || "all", jobId: job.id, sessionId });
  } catch (err) {
    return res.status(500).json({ message: "Execute failed", error: err.message });
  }
});

// Pull the master sheet into the SQLite master_content table (idempotent).
// Body: { sheetName: "<tab name>", spreadsheetId?: "<defaults to GOOGLE_SHEET_ID>" }
DbRouter.post("/master/sync", async (req, res) => {
  try {
    const { sheetName, spreadsheetId } = req.body || {};
    if (!sheetName) {
      return res.status(400).json({
        message: 'Provide "sheetName" (the master tab name) in the request body.',
      });
    }
    const result = await syncMasterFromSheet({ sheetName, spreadsheetId });
    return res.json({ message: "✅ Master sync complete", ...result });
  } catch (err) {
    console.error("❌ Master sync failed:", err.message);
    return res.status(500).json({ message: "Master sync failed", error: err.message });
  }
});

// Inspect what's currently stored (for verification from the UI).
DbRouter.get("/master", (_req, res) => {
  const data = listMasterContent();
  return res.json({ total: data.length, data });
});

export default DbRouter;
