import { getSheetsClient } from "../configs/googleSheetClient.js";
import { getConfig } from "../utils/getConfig.js";
import { db } from "./index.js";
import { computeSchedule } from "../utils/timing.js";
import { createRun, insertItems } from "./runs.js";

const CAL_SPREADSHEET = "18-XYVIc5LGInr4GmLxdSfeNyTWpSLmgogA38XPxVXJ0";
const CAL_TABS = ["SAL Unified Calendar", "Pre-Req Unified Calendar"];

// The 3 independent session types that never get resources.
// (matches "Introduction to Foundation" and "…Foundations"; "Platform Overview"; "Tutorial")
const EXCLUDE = /tutorial|platform\s*overview|introduction to foundation/i;

const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const stripRepeated = (t) => String(t ?? "").replace(/\s*\(repeated\)\s*$/i, "").trim();
const parseDMY = (s) => {
  const m = String(s ?? "").match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
};
const fmtDMY = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
};
const findCol = (headers, name) => headers.findIndex((h) => norm(h) === norm(name));

// Default week window: the coming Saturday through the Friday 6 days later (Sat→Fri).
export function defaultWeekWindow(today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysUntilSat = (6 - d.getDay() + 7) % 7; // Sun=0..Sat=6; 0 if already Saturday
  const sat = new Date(d);
  sat.setDate(d.getDate() + daysUntilSat);
  const fri = new Date(sat);
  fri.setDate(sat.getDate() + 6);
  return { from: fmtDMY(sat), to: fmtDMY(fri) };
}

// Language of a section from its code's 2nd token, e.g. "T-ENG-AIML-..." -> english.
const LANG = { ENG: "english", EN: "english", KAN: "kannada", TEL: "telugu", TAM: "tamil", HIN: "hindi", MAR: "marathi" };
const sectionLanguage = (section) => LANG[String(section ?? "").split("-")[1]?.toUpperCase()] || null;

// Parse the master's solution-video cell: either "Lang - id" lines (multi) or a bare id (single).
function parseSolutionVideos(raw) {
  if (!raw) return null;
  const map = {};
  let labeled = false;
  for (const line of String(raw).split(/[\n,]+/)) {
    const m = line.match(/([a-z]+)\s*[-:]\s*(\d+)/i);
    if (m) { labeled = true; map[m[1].toLowerCase()] = m[2]; }
  }
  if (labeled) return { multi: true, map };
  const num = String(raw).match(/\d+/);
  return num ? { multi: false, id: num[0] } : null;
}

// Resolve the right solution-video id for a section (by its language).
function resolveSolutionVideoId(master, section) {
  const sv = parseSolutionVideos(master.solution_video_ids);
  if (!sv) return { id: null, reason: "no solution video id" };
  if (!sv.multi) return { id: sv.id }; // single id applies to all sections
  const lang = sectionLanguage(section);
  if (!lang) return { id: null, reason: "unknown language from section code" };
  if (sv.map[lang]) return { id: sv.map[lang], lang };
  return { id: null, reason: `no ${lang} solution video` };
}

// Read both calendar tabs and return the qualifying (session x batch x section)
// rows within [from, to], with the 3 excluded types dropped and (Repeated) stripped.
async function readCalendarRows(from, to) {
  const sheets = getSheetsClient();
  const out = [];
  for (const tab of CAL_TABS) {
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: CAL_SPREADSHEET,
      range: tab,
      valueRenderOption: "FORMATTED_VALUE",
    });
    const rows = resp.data.values || [];
    if (rows.length < 2) continue;
    const H = rows[0];
    const iTitle = findCol(H, "Title");
    const iBatch = findCol(H, "Batch");
    const iSection = findCol(H, "Section Name");
    const iDate = findCol(H, "Session Date");
    const iType = findCol(H, "Lecture Type");
    if (iTitle < 0 || iBatch < 0 || iSection < 0 || iDate < 0) continue;

    for (const r of rows.slice(1)) {
      const rawTitle = r[iTitle];
      const type = iType >= 0 ? r[iType] : "";
      if (!rawTitle) continue;
      if (EXCLUDE.test(rawTitle) || EXCLUDE.test(type)) continue;
      const d = parseDMY(r[iDate]);
      if (!d || d < from || d > to) continue;
      const batch = String(r[iBatch] ?? "").trim();
      const section = String(r[iSection] ?? "").trim();
      if (!batch || !section) continue;
      out.push({
        title: stripRepeated(rawTitle),
        batch,
        section,
        sessionDate: r[iDate],
        tab,
      });
    }
  }
  return out;
}

function loadMasterMap() {
  const rows = db.prepare("SELECT * FROM master_content").all();
  const map = new Map();
  for (const r of rows) map.set(norm(r.session_title), r);
  return map;
}

// Core: build the week's items (pure — no DB writes unless commit).
export async function generateWeek({ from, to, now = new Date(), commit = false } = {}) {
  if (!from || !to) {
    const w = defaultWeekWindow(now); // Sat→Fri auto-window
    from = from || w.from;
    to = to || w.to;
  }
  const fromD = parseDMY(from);
  const toD = parseDMY(to);
  if (!fromD || !toD) throw new Error("from/to must be DD-MM-YYYY");
  toD.setHours(23, 59, 59, 999);

  const schedule = computeSchedule(now);
  const calRows = await readCalendarRows(fromD, toD);
  const master = loadMasterMap();

  const items = [];
  const unmatched = new Set();
  const missingIds = new Set();
  const matchedSessions = new Set();

  const mkLecture = (title, m, batch, section) => ({
    runner_type: "lecture_clone",
    resource_type: "lecture_note",
    session_title: title,
    source_id: m.source_lecture_note_id,
    source_title: `Lecture Note: ${title}`,
    target_batch: batch,
    target_section: section,
    target_title: null,
    associated_lecture: title,
    start_date: schedule.lecture.startDate,
    start_time: schedule.lecture.startTime,
    end_date: schedule.lecture.endDate,
    end_time: schedule.lecture.endTime,
    actual_start_date: null,
    actual_start_time: null,
  });

  const mkAssignment = (title, m, batch, section) => ({
    runner_type: "assignment_clone",
    resource_type: "assignment",
    session_title: title,
    source_id: m.source_assignment_id,
    source_title: `Practice Assignment: ${title}`,
    target_batch: batch,
    target_section: section,
    target_title: null,
    associated_lecture: title,
    start_date: schedule.assignment.startDate,
    start_time: schedule.assignment.startTime,
    end_date: schedule.assignment.endDate,
    end_time: schedule.assignment.endTime,
    actual_start_date: schedule.assignment.actualStartDate,
    actual_start_time: schedule.assignment.actualStartTime,
  });

  // Solution video: releases 3h after the assignment schedule (schedule.solution).
  const mkSolutionVideo = (title, videoId, batch, section) => ({
    runner_type: "lecture_clone",
    resource_type: "solution_video",
    session_title: title,
    source_id: videoId,
    source_title: `Assignment Solution: ${title}`,
    target_batch: batch,
    target_section: section,
    target_title: null,
    associated_lecture: title,
    start_date: schedule.solution.startDate,
    start_time: schedule.solution.startTime,
    end_date: schedule.solution.endDate,
    end_time: schedule.solution.endTime,
    actual_start_date: null,
    actual_start_time: null,
  });

  for (const row of calRows) {
    const m = master.get(norm(row.title));
    if (!m) { unmatched.add(row.title); continue; }
    matchedSessions.add(row.title);

    if (m.source_lecture_note_id) items.push(mkLecture(row.title, m, row.batch, row.section));
    else missingIds.add(`${row.title} — lecture note ID`);

    if (m.source_assignment_id) items.push(mkAssignment(row.title, m, row.batch, row.section));
    else missingIds.add(`${row.title} — assignment ID`);

    // Assignment Solution Video — language resolved from the section code.
    // Only when the master has a solution video for this session (else silently skipped).
    if (m.solution_video_ids) {
      const sv = resolveSolutionVideoId(m, row.section);
      if (sv.id) items.push(mkSolutionVideo(row.title, sv.id, row.batch, row.section));
      else missingIds.add(`${row.title} — solution video (${sv.reason})`);
    }

    // Pre-Read only if an ID exists (master sheet has none today → silently skipped).
  }

  const byType = items.reduce((a, it) => ((a[it.resource_type] = (a[it.resource_type] || 0) + 1), a), {});

  const result = {
    range: { from, to },
    prepNow: schedule.prepNow,
    schedule,
    stats: {
      calendarRows: calRows.length,
      matchedSessions: matchedSessions.size,
      itemsGenerated: items.length,
      byType,
      unmatchedSessions: unmatched.size,
      missingIds: missingIds.size,
    },
    unmatchedSessions: [...unmatched].sort(),
    missingIds: [...missingIds].sort(),
    items,
    committed: false,
    runId: null,
  };

  if (commit && items.length) {
    const nowIso = new Date().toISOString();
    const runId = createRun(
      { weekLabel: `${from} → ${to}`, prepNow: schedule.prepNow, scheduleJson: JSON.stringify(schedule), note: null },
      nowIso
    );
    const inserted = insertItems(runId, items, nowIso);
    result.committed = true;
    result.runId = runId;
    result.inserted = inserted;
  }

  return result;
}
