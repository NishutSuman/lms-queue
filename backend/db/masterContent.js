import { db } from "./index.js";

// Columns that may be populated from the master sheet.
export const MASTER_COLUMNS = [
  "session_title",
  "session_type",
  "course",
  "source_lecture_note_id",
  "source_pre_read_id",
  "source_assignment_id",
  "solution_video_ids",
  "assignment_template_name",
  "assess_client",
  "pre_read_notes",
  "lecture_notes",
];

// Insert or update one row by session_title.
// Only the columns present in `row` are written — a partial sheet never wipes
// columns it doesn't include (on update) and leaves them NULL (on insert).
export function upsertMasterContent(row, nowIso) {
  const title = String(row.session_title ?? "").trim();
  if (!title) throw new Error("session_title is required");

  const cols = MASTER_COLUMNS.filter((c) => c in row && row[c] !== undefined);
  const allCols = [...cols, "updated_at"];

  const bind = {};
  for (const c of allCols) bind[c] = c === "updated_at" ? nowIso : (row[c] ?? null);
  bind.session_title = title;

  const updateCols = cols.filter((c) => c !== "session_title").concat("updated_at");
  const updateSet = updateCols.map((c) => `${c}=excluded.${c}`).join(", ");

  const sql = `
    INSERT INTO master_content (${allCols.join(", ")})
    VALUES (${allCols.map((c) => `@${c}`).join(", ")})
    ON CONFLICT(session_title) DO UPDATE SET ${updateSet}
  `;
  db.prepare(sql).run(bind);
}

export function masterContentExists(title) {
  return !!db
    .prepare("SELECT 1 FROM master_content WHERE session_title = ?")
    .get(String(title).trim());
}

export function listMasterContent() {
  return db
    .prepare(
      `SELECT session_title, course, source_lecture_note_id, source_pre_read_id,
              source_assignment_id, assignment_template_name, assess_client, updated_at
         FROM master_content ORDER BY session_title`
    )
    .all();
}
