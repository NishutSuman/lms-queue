-- Local operational store for the content-release automation.
-- Replaces the Google-Sheet runner tabs as the single source of truth.

-- ── master_content ─────────────────────────────────────────────
-- The durable Title -> content mapping, synced from the user's master sheet.
-- Column set is provisional and will be finalized once the real sheet is shared.
CREATE TABLE IF NOT EXISTS master_content (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  session_title             TEXT NOT NULL UNIQUE,      -- join key (bare title)
  session_type              TEXT,                      -- e.g. "Masterclass Tech" (grouped in sheet)
  course                    TEXT,
  source_lecture_note_id    TEXT,                      -- clone source: "Lecture Note: <title>"
  source_pre_read_id        TEXT,                      -- clone source: "Pre-Reads: <title>"
  source_assignment_id      TEXT,                      -- clone source: "Practice Assignment: <title>"
  solution_video_ids        TEXT,                      -- raw multi-lingual "English - 123\nKannada - 456..."
  assignment_template_name  TEXT,                      -- create path (assess template)
  assess_client             TEXT,
  pre_read_notes            TEXT,                      -- content (create path)
  lecture_notes             TEXT,                      -- content (create path)
  updated_at                TEXT NOT NULL
);

-- ── runs ───────────────────────────────────────────────────────
-- One row per weekly execution (a batch of generated items).
CREATE TABLE IF NOT EXISTS runs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  week_label    TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',  -- draft | running | done | cancelled
  prep_now      TEXT,                           -- the "now" used for timing
  schedule_json TEXT,                           -- snapshot of computeSchedule()
  note          TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- ── items ──────────────────────────────────────────────────────
-- One row per unit of work (session x batch x section x resource).
CREATE TABLE IF NOT EXISTS items (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id             INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  runner_type        TEXT NOT NULL,   -- lecture_clone | assignment_clone | lecture_create | assignment_create | notes_update | pre_read_clone
  resource_type      TEXT NOT NULL,   -- lecture_note | pre_read | assignment
  session_title      TEXT NOT NULL,
  source_id          TEXT,            -- source_lecture_id / source_assignment_id
  source_title       TEXT,
  target_batch       TEXT NOT NULL,
  target_section     TEXT NOT NULL,
  target_title       TEXT,
  associated_lecture TEXT,
  start_date         TEXT,
  start_time         TEXT,
  end_date           TEXT,
  end_time           TEXT,
  actual_start_date  TEXT,
  actual_start_time  TEXT,
  status             TEXT NOT NULL DEFAULT 'pending', -- pending | in_progress | done | failed | skipped
  attempts           INTEGER NOT NULL DEFAULT 0,
  error              TEXT,
  lms_verified       INTEGER NOT NULL DEFAULT 0,
  started_at         TEXT,
  finished_at        TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  -- idempotency: the same target resource is never queued twice within a run
  UNIQUE (run_id, runner_type, resource_type, target_batch, target_section, session_title)
);

CREATE INDEX IF NOT EXISTS idx_items_run_status ON items(run_id, status);
CREATE INDEX IF NOT EXISTS idx_items_status     ON items(status);
