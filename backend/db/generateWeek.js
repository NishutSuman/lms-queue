// CLI: generate a week's content-release items from the calendar.
//   node db/generateWeek.js --from=04-07-2026 --to=10-07-2026          (dry run)
//   node db/generateWeek.js --from=04-07-2026 --to=10-07-2026 --commit (write to DB)
import { initSchema } from "./index.js";
import { generateWeek } from "./generator.js";

const argv = process.argv.slice(2);
const arg = (n) => {
  const hit = argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : undefined;
};
const from = arg("from"); // optional — defaults to the coming Sat→Fri window
const to = arg("to");
const commit = argv.includes("--commit");

initSchema();
const r = await generateWeek({ from, to, commit });

console.log(`\n=== Week ${r.range.from} → ${r.range.to} ${commit ? "(COMMIT)" : "(DRY RUN)"} ===`);
console.log(`prep now: ${r.prepNow}`);
console.log(`Lecture Note slot : ${r.schedule.lecture.startDate} ${r.schedule.lecture.startTime}–${r.schedule.lecture.endTime}`);
console.log(`Assignment window : ${r.schedule.assignment.startDate} ${r.schedule.assignment.startTime} → ${r.schedule.assignment.endDate} ${r.schedule.assignment.endTime}`);
console.log("\nstats:", JSON.stringify(r.stats, null, 2));

// per-session breakdown (matched)
const bySession = {};
for (const it of r.items) {
  const k = it.session_title;
  (bySession[k] ||= { lecture_note: 0, assignment: 0 });
  bySession[k][it.resource_type]++;
}
console.log("\nmatched sessions → items:");
for (const [title, c] of Object.entries(bySession)) {
  console.log(`  • ${title}: ${c.lecture_note} note + ${c.assignment} assignment (× sections)`);
}

if (r.unmatchedSessions.length) {
  console.log(`\n⚠️  ${r.unmatchedSessions.length} calendar sessions with NO master mapping (skipped):`);
  r.unmatchedSessions.forEach((t) => console.log(`     - ${t}`));
}
if (r.missingIds.length) {
  console.log(`\n⚠️  matched but missing IDs (resource skipped):`);
  r.missingIds.forEach((t) => console.log(`     - ${t}`));
}

if (r.committed) console.log(`\n✅ Committed run #${r.runId}: ${r.inserted} items inserted.`);
else console.log(`\n(dry run — nothing written. Re-run with --commit to create the run.)`);
