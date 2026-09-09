import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The DB is a single local file. No server, no external service.
const DATA_DIR = path.join(__dirname, "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.SQLITE_PATH || path.join(DATA_DIR, "app.db");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL"); // concurrent reads (UI) alongside writes (worker)
db.pragma("foreign_keys = ON");

// Create tables if they don't exist (safe to call on every startup).
export function initSchema() {
  const ddl = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.exec(ddl);
  migrate();
  return db;
}

// Idempotent, non-destructive column migrations (preserves existing data).
function migrate() {
  const cols = db.prepare("PRAGMA table_info(items)").all().map((c) => c.name);
  if (!cols.includes("started_at")) db.exec("ALTER TABLE items ADD COLUMN started_at TEXT");
  if (!cols.includes("finished_at")) db.exec("ALTER TABLE items ADD COLUMN finished_at TEXT");
}

// Allow `node db/index.js` to initialise and print the schema.
if (import.meta.url === `file://${process.argv[1]}`) {
  initSchema();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all();
  console.log(`✅ DB ready at ${DB_PATH}`);
  for (const t of tables) {
    const cols = db.prepare(`PRAGMA table_info(${t.name})`).all().map((c) => c.name);
    console.log(`  • ${t.name} (${cols.length} cols): ${cols.join(", ")}`);
  }
}
