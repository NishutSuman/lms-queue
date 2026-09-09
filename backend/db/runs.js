import { db } from "./index.js";

export function createRun({ weekLabel, prepNow, scheduleJson, note }, nowIso) {
  const info = db
    .prepare(
      `INSERT INTO runs (week_label, status, prep_now, schedule_json, note, created_at, updated_at)
       VALUES (@week_label, 'draft', @prep_now, @schedule_json, @note, @created_at, @updated_at)`
    )
    .run({
      week_label: weekLabel ?? null,
      prep_now: prepNow ?? null,
      schedule_json: scheduleJson ?? null,
      note: note ?? null,
      created_at: nowIso,
      updated_at: nowIso,
    });
  return info.lastInsertRowid;
}

// Insert generated items. INSERT OR IGNORE lets the UNIQUE constraint dedupe
// (same target resource never queued twice in a run). Returns rows inserted.
export function insertItems(runId, items, nowIso) {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO items
       (run_id, runner_type, resource_type, session_title, source_id, source_title,
        target_batch, target_section, target_title, associated_lecture,
        start_date, start_time, end_date, end_time, actual_start_date, actual_start_time,
        status, attempts, error, lms_verified, created_at, updated_at)
     VALUES
       (@run_id, @runner_type, @resource_type, @session_title, @source_id, @source_title,
        @target_batch, @target_section, @target_title, @associated_lecture,
        @start_date, @start_time, @end_date, @end_time, @actual_start_date, @actual_start_time,
        'pending', 0, NULL, 0, @created_at, @updated_at)`
  );
  const tx = db.transaction((rows) => {
    let inserted = 0;
    for (const it of rows) {
      const info = stmt.run({ run_id: runId, created_at: nowIso, updated_at: nowIso, ...it });
      inserted += info.changes;
    }
    return inserted;
  });
  return tx(items);
}

export function getRun(runId) {
  return db.prepare("SELECT * FROM runs WHERE id = ?").get(runId);
}

// Delete a run and its items (items cascade via the FK).
export function deleteRun(runId) {
  return db.prepare("DELETE FROM runs WHERE id = ?").run(runId).changes;
}

export function getRunItems(runId) {
  return db.prepare("SELECT * FROM items WHERE run_id = ? ORDER BY resource_type, id").all(runId);
}

// Runs list with per-status item counts (for the dashboard).
export function listRuns() {
  return db
    .prepare(
      `SELECT r.*,
         (SELECT COUNT(*) FROM items i WHERE i.run_id = r.id) AS total,
         (SELECT COUNT(*) FROM items i WHERE i.run_id = r.id AND i.status='done') AS done,
         (SELECT COUNT(*) FROM items i WHERE i.run_id = r.id AND i.status='failed') AS failed,
         (SELECT COUNT(*) FROM items i WHERE i.run_id = r.id AND i.status='in_progress') AS in_progress,
         (SELECT COUNT(*) FROM items i WHERE i.run_id = r.id AND i.status='pending') AS pending
       FROM runs r ORDER BY r.id DESC`
    )
    .all();
}
