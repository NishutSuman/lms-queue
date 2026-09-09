import { Worker } from "bullmq";
import dotenv from "dotenv";
import { connection } from "../configs/redis_bullmq.config.js";
import { initSchema } from "./index.js";
import { executeRun } from "./executor.js";
import { emitProgress, LogType } from "../utils/progressEmitter.js";

dotenv.config();
initSchema();

const isHeadless = process.env.HEADLESS !== "false";
console.log(`DB Run Worker running ✅ (headless: ${isHeadless})`);

const worker = new Worker(
  "dbRunQueue",
  async (job) => {
    const { runId, sessionId, resourceType } = job.data;
    const onLog = (message) => {
      console.log(message);
      if (sessionId) {
        emitProgress(sessionId, { type: "log", logType: LogType.INFO, message });
      }
    };
    await executeRun(runId, { onLog, resourceType });
  },
  { connection, concurrency: 1 }
);

worker.on("failed", (job, err) => {
  console.error(`❌ dbRun job ${job?.id} failed:`, err.message);
});
