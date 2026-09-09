import { getSheetsClient } from "../configs/googleSheetClient.js";
import { getConfig } from "../utils/getConfig.js";
import { db } from "./index.js";
import { upsertMasterContent, masterContentExists } from "./masterContent.js";

// Map sheet headers -> master_content columns. Matching is done on a normalised
// form (lowercase, non-alphanumerics collapsed), so header spelling/spacing/case
// don't matter. Add aliases here if a real header doesn't map.
const HEADER_ALIASES = {
  session_title: ["session title", "lecture name", "title", "session", "session name"],
  session_type: ["session type", "type"],
  course: ["course", "course name"],
  source_lecture_note_id: [
    "lecture note id", "session notes id", "session note id", "notes id", "note id",
    "lecture note", "source lecture note id", "lecture note lms id",
  ],
  source_pre_read_id: ["pre read id", "preread id", "pre reads id", "source pre read id"],
  source_assignment_id: [
    "assignment id", "practice assignment id", "source assignment id", "assignment lms id",
  ],
  solution_video_ids: [
    "assignment solution video (video lecture id)", "assignment solution video video lecture id",
    "assignment solution video", "solution video id", "solution video ids", "video lecture id",
  ],
  assignment_template_name: [
    "assignment name", "assignment template", "assignment template name", "template name",
  ],
  assess_client: ["assess client", "client"],
  pre_read_notes: ["pre read notes", "pre reads notes"],
  lecture_notes: ["lecture notes"],
};

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Cells meaning "no value" — stored as NULL so the generator never treats "NA"
// as a real ID. (session_title is exempt; blank titles are skipped separately.)
const isBlankish = (v) =>
  v === undefined || v === null || /^(na|n\/?a|n\.a\.?|-{1,}|tbd|null)$/i.test(String(v).trim()) || String(v).trim() === "";

// Build a normalised alias -> column lookup once.
const ALIAS_LOOKUP = {};
for (const [col, aliases] of Object.entries(HEADER_ALIASES)) {
  for (const a of aliases) ALIAS_LOOKUP[norm(a)] = col;
}

// Returns { map: {colIndex: masterColumn}, unmapped: [rawHeader,...] }
export function buildHeaderMap(headers) {
  const map = {};
  const unmapped = [];
  headers.forEach((h, i) => {
    const n = norm(h);
    if (!n) return;
    if (ALIAS_LOOKUP[n]) map[i] = ALIAS_LOOKUP[n];
    else unmapped.push(h);
  });
  return { map, unmapped };
}

// Read a master tab and upsert it into master_content. Idempotent.
export async function syncMasterFromSheet({ spreadsheetId, sheetName } = {}) {
  if (!sheetName) throw new Error("sheetName (the master tab name) is required");
  const cfg = getConfig();
  spreadsheetId = spreadsheetId || cfg.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("No spreadsheetId (and no GOOGLE_SHEET_ID in config)");

  const sheets = getSheetsClient();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const rows = resp.data.values || [];
  if (rows.length < 2) throw new Error(`Sheet "${sheetName}" has no data rows`);

  const headers = rows[0];
  const { map, unmapped } = buildHeaderMap(headers);
  const mappedColumns = Object.values(map);
  if (!mappedColumns.includes("session_title")) {
    throw new Error(
      `Could not find a "session title" column. Headers seen: [${headers.join(", ")}]`
    );
  }

  const nowIso = new Date().toISOString();
  let inserted = 0, updated = 0, skipped = 0;
  // "Session Type" is merged/grouped in the sheet (only the first row of a group
  // is filled), so carry it down to the rows beneath it.
  const hasSessionType = mappedColumns.includes("session_type");
  let carrySessionType = null;

  const tx = db.transaction(() => {
    for (const r of rows.slice(1)) {
      const row = {};
      for (const [i, col] of Object.entries(map)) {
        const v = r[i];
        row[col] = col !== "session_title" && isBlankish(v) ? null : (v ?? null);
      }
      if (hasSessionType) {
        if (row.session_type) carrySessionType = row.session_type;
        else row.session_type = carrySessionType;
      }
      const title = String(row.session_title ?? "").trim();
      if (!title) { skipped++; continue; }
      const isUpdate = masterContentExists(title);
      upsertMasterContent(row, nowIso);
      isUpdate ? updated++ : inserted++;
    }
  });
  tx();

  const totalInDb = db.prepare("SELECT COUNT(*) c FROM master_content").get().c;
  return {
    sheetName, spreadsheetId,
    rowsRead: rows.length - 1,
    inserted, updated, skipped, totalInDb,
    mappedColumns,
    unmappedHeaders: unmapped, // review these — add aliases if any matter
  };
}
