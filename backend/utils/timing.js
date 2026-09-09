// Central timing rules for the weekly content-release generator.
//
// One schedule is computed per run from a single "now" (captured when the
// dataset is prepared) and applied to every generated item — we do NOT
// recompute per lecture/assignment.
//
// Rules (confirmed):
//   • Lecture (Lecture Notes + Pre-Reads):
//       start = round UP (ceil) (now + 3h) to the next :00 or :30
//               (round-up guarantees the schedule is always >= 3h ahead)
//       end   = start + 15 min (minimum window)
//       date  = the resulting run day
//   • Assignment (schedule == actual start):
//       schedule/actual start = the lecture's end time
//       conclude              = +15 days at 23:59
//   • Assignment Solution Video (a lecture clone):
//       start = assignment schedule + 3h (same day), end = start + 15 min

export const TIMING = {
  LECTURE_LEAD_HOURS: 3, // lectures scheduled 3h ahead of prep time
  LECTURE_WINDOW_MIN: 15, // 15-min window for notes/pre-reads/solutions
  ASSIGNMENT_CONCLUDE_DAYS: 15, // assignment closes 15 days after it opens
  ASSIGNMENT_CONCLUDE_TIME: "23:59",
  SOLUTION_AFTER_ASSIGNMENT_HOURS: 3, // solution video releases 3h after assignment schedule
};

const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (d) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`; // DD-MM-YYYY
const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`; // HH:mm (24h)

// Round a Date UP to the next :00 or :30 (already-on-boundary stays), zeroing seconds.
export function ceilToHalfHour(date) {
  const d = new Date(date.getTime());
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  const add = m === 0 ? 0 : m <= 30 ? 30 - m : 60 - m; // up to :30 or next :00
  return new Date(d.getTime() + add * 60000);
}

// Build the shared schedule for one run given the prep-time "now".
export function computeSchedule(now = new Date()) {
  const lectureStart = ceilToHalfHour(
    new Date(now.getTime() + TIMING.LECTURE_LEAD_HOURS * 3600000)
  );
  const lectureEnd = new Date(
    lectureStart.getTime() + TIMING.LECTURE_WINDOW_MIN * 60000
  );

  // Assignment opens exactly when the lecture ends; concludes N days later at 23:59.
  const conclude = new Date(lectureEnd.getTime());
  conclude.setDate(conclude.getDate() + TIMING.ASSIGNMENT_CONCLUDE_DAYS);
  const [ch, cm] = TIMING.ASSIGNMENT_CONCLUDE_TIME.split(":").map(Number);
  conclude.setHours(ch, cm, 0, 0);

  // Solution video: 3h after the assignment schedule (= lecture end), 15-min window.
  const solutionStart = new Date(
    lectureEnd.getTime() + TIMING.SOLUTION_AFTER_ASSIGNMENT_HOURS * 3600000
  );
  const solutionEnd = new Date(solutionStart.getTime() + TIMING.LECTURE_WINDOW_MIN * 60000);

  return {
    prepNow: now.toISOString(),
    lecture: {
      startDate: fmtDate(lectureStart),
      startTime: fmtTime(lectureStart),
      endDate: fmtDate(lectureEnd),
      endTime: fmtTime(lectureEnd),
    },
    assignment: {
      // schedule == actual start == lecture end
      startDate: fmtDate(lectureEnd),
      startTime: fmtTime(lectureEnd),
      actualStartDate: fmtDate(lectureEnd),
      actualStartTime: fmtTime(lectureEnd),
      endDate: fmtDate(conclude),
      endTime: fmtTime(conclude),
    },
    solution: {
      startDate: fmtDate(solutionStart),
      startTime: fmtTime(solutionStart),
      endDate: fmtDate(solutionEnd),
      endTime: fmtTime(solutionEnd),
    },
  };
}
