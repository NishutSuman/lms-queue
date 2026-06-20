import { Worker } from "bullmq";
import { chromium } from "playwright";
import dotenv from "dotenv";
import { connection } from "../../configs/redis_bullmq.config.js";
import { cloneLecture } from "../cloneLecture.js";
import { updateSheetCell } from "../updateSheet.js";
import { getConfig } from "../getConfig.js";
import { emitProgress, LogType } from "../progressEmitter.js";
const { MASAI_ADMIN_LMS_USER_EMAIL, MASAI_ADMIN_LMS_USER_PASSWORD, GOOGLE_SHEET_ID } = getConfig();
dotenv.config();

const isHeadless = process.env.HEADLESS !== 'false';
console.log(`Lecture Clone Queue is Running ✅ (headless: ${isHeadless})`);

const lectureCloneWorker = new Worker(
  "lectureCloneQueue",
  async (job) => {
    const { lectures, sessionId } = job.data;
    const currentSessionId = sessionId || `lecture-clone-${Date.now()}`;

    emitProgress(currentSessionId, {
      type: 'log',
      logType: LogType.INFO,
      message: `🚀 Starting lecture clone worker with ${lectures?.length || 0} lectures`,
    });

    emitProgress(currentSessionId, {
      type: 'tasks_init',
      tasks: lectures?.map((l, index) => ({
        id: l.redisId || `task-${index}`,
        title: l.source_lecture_title || l.source_lecture_id || `Lecture ${index + 1}`,
        status: 'pending',
      })) || [],
    });

    if (!lectures || lectures.length === 0) {
      emitProgress(currentSessionId, { type: 'log', logType: LogType.WARNING, message: "⚠️ No lectures to process." });
      return;
    }

    const browser = await chromium.launch({
      headless: isHeadless,
      slowMo: 100,
      args: isHeadless
        ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        : ["--start-maximized"],
    });

    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();
    await page.waitForTimeout(2000);

    emitProgress(currentSessionId, { type: 'log', logType: LogType.INFO, message: "🌐 Browser initialized" });

    try {
      emitProgress(currentSessionId, { type: 'log', logType: LogType.INFO, message: "🔐 Logging into LMS..." });

      await page.goto(process.env.MASAI_ADMIN_LMS_URL, { waitUntil: "networkidle" });
      await page.fill('input[type="email"]', MASAI_ADMIN_LMS_USER_EMAIL);
      await page.fill('input[type="password"]', MASAI_ADMIN_LMS_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: "networkidle" });

      emitProgress(currentSessionId, { type: 'log', logType: LogType.SUCCESS, message: "✅ Login successful" });
      await page.waitForTimeout(2000);

      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.INFO,
        message: "⏳ Browser ready, starting lecture cloning...",
      });

      for (const lec of lectures) {
        const redisKey = `clone:${lec.redisId}`;
        const displayTitle = lec.source_lecture_title || lec.source_lecture_id || "Unknown";

        emitProgress(currentSessionId, {
          type: 'task_update',
          task: { id: lec.redisId, title: displayTitle, status: 'in_progress' },
        });

        emitProgress(currentSessionId, {
          type: 'log',
          logType: LogType.TASK_START,
          message: `🔁 Cloning: ${displayTitle} → ${lec.target_batch} / ${lec.target_section}`,
        });

        const result = await cloneLecture(page, lec);
        const isClonedValue = result.status === "Done" ? "yes" : "no";

        await connection.hset(redisKey, {
          isCloned: isClonedValue,
          lectureCloneError: result.error || "",
          lastUpdated: new Date().toISOString(),
        });

        await updateSheetCell(
          GOOGLE_SHEET_ID,
          "Lecture Clone",
          lec.redisId,
          "isCloned",
          isClonedValue
        );

        console.log(`📋 ${displayTitle} → ${isClonedValue}`);

        if (result.status === "Done") {
          emitProgress(currentSessionId, {
            type: 'log',
            logType: LogType.SUCCESS,
            message: `✅ Cloned: ${displayTitle} → ${lec.target_batch} / ${lec.target_section}`,
          });
          emitProgress(currentSessionId, {
            type: 'task_update',
            task: { id: lec.redisId, title: displayTitle, status: 'completed', error: null },
          });
        } else {
          emitProgress(currentSessionId, {
            type: 'log',
            logType: LogType.ERROR,
            message: `❌ ${displayTitle} → ${result.error}`,
          });
          emitProgress(currentSessionId, {
            type: 'task_update',
            task: { id: lec.redisId, title: displayTitle, status: 'error', error: result.error },
          });
        }
      }

      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.SUCCESS,
        message: "🎯 All lecture clone operations processed!",
      });

    } catch (err) {
      console.error("❌ Worker runtime error:", err.message);
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.ERROR,
        message: `❌ Worker runtime error: ${err.message}`,
      });
    } finally {
      await browser.close();
      console.log("🪟 Browser closed.");
      emitProgress(currentSessionId, { type: 'log', logType: LogType.INFO, message: "🪟 Browser closed." });
    }
  },
  { connection, concurrency: 1 }
);
