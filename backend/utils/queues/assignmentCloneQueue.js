import { Worker } from "bullmq";
import { chromium } from "playwright";
import dotenv from "dotenv";
import { connection } from "../../configs/redis_bullmq.config.js";
import { cloneAssignment } from "../cloneAssignment.js";
import { updateSheetCell } from "../updateSheet.js";
import { getConfig } from "../getConfig.js";
import { emitProgress, LogType } from "../progressEmitter.js";

dotenv.config();

const {
  MASAI_ADMIN_LMS_USER_EMAIL,
  MASAI_ADMIN_LMS_USER_PASSWORD,
  GOOGLE_SHEET_ID
} = getConfig();

const isHeadless = process.env.HEADLESS !== 'false';

console.log(`Assignment Clone Queue Running ✅ (headless: ${isHeadless})`);

const assignmentCloneWorker = new Worker(
  "assignmentCloneQueue",
  async (job) => {
    const { assignments, sessionId } = job.data;
    const currentSessionId = sessionId || `assignment-clone-${Date.now()}`;

    emitProgress(currentSessionId, {
      type: 'log',
      logType: LogType.INFO,
      message: `🚀 Starting assignment clone worker with ${assignments?.length || 0} assignments`,
    });

    emitProgress(currentSessionId, {
      type: 'tasks_init',
      tasks: assignments?.map((a, index) => ({
        id: a.redisId || `task-${index}`,
        title: `${a.source_assignment_id} → ${a.target_batch} / ${a.target_section}`,
        status: 'pending',
      })) || [],
    });

    if (!assignments || assignments.length === 0) {
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.WARNING,
        message: "⚠️ No assignments found to process.",
      });
      return;
    }

    const browser = await chromium.launch({
      headless: isHeadless,
      slowMo: 100,
      args: isHeadless
        ? ["--no-sandbox", "--disable-setuid-sandbox"]
        : ["--start-maximized"],
    });

    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    await page.waitForTimeout(2000);
    emitProgress(currentSessionId, {
      type: 'log',
      logType: LogType.INFO,
      message: "🌐 Browser initialized",
    });

    try {
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.INFO,
        message: "🔐 Logging into Masai Admin LMS Platform...",
      });

      await page.goto(process.env.MASAI_ADMIN_LMS_URL, { waitUntil: "networkidle" });
      await page.fill('input[type="email"]', MASAI_ADMIN_LMS_USER_EMAIL);
      await page.fill('input[type="password"]', MASAI_ADMIN_LMS_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: "networkidle" });

      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.SUCCESS,
        message: "✅ Login successful",
      });

      await page.waitForTimeout(2000);
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.INFO,
        message: "⏳ Browser ready, starting assignment cloning...",
      });

      for (const asn of assignments) {
        const redisKey = `assignmentClone:${asn.redisId}`;
        const taskTitle = `${asn.source_assignment_id} → ${asn.target_batch} / ${asn.target_section}`;

        emitProgress(currentSessionId, {
          type: 'task_update',
          task: {
            id: asn.redisId,
            title: taskTitle,
            status: 'in_progress',
          },
        });

        emitProgress(currentSessionId, {
          type: 'log',
          logType: LogType.TASK_START,
          message: `📝 Processing: ${taskTitle}`,
        });

        const result = await cloneAssignment(page, asn);
        const isClonedValue = result.status === "Done" ? "yes" : "no";

        await connection.hset(redisKey, {
          isCloned: isClonedValue,
          error: result.error || "",
          updatedAt: new Date().toISOString(),
        });

        await updateSheetCell(
          GOOGLE_SHEET_ID,
          "Assignment Clone",
          asn.redisId,
          "isCloned",
          isClonedValue
        );

        if (result.status === "Done") {
          emitProgress(currentSessionId, {
            type: 'log',
            logType: LogType.SUCCESS,
            message: `✅ ${taskTitle} → Cloned successfully`,
          });

          emitProgress(currentSessionId, {
            type: 'task_update',
            task: {
              id: asn.redisId,
              title: taskTitle,
              status: 'completed',
              error: null,
            },
          });
        } else {
          emitProgress(currentSessionId, {
            type: 'log',
            logType: LogType.ERROR,
            message: `❌ ${taskTitle} → ${result.error}`,
          });

          emitProgress(currentSessionId, {
            type: 'task_update',
            task: {
              id: asn.redisId,
              title: taskTitle,
              status: 'error',
              error: result.error,
            },
          });
        }

        console.log(`📋 ${asn.source_assignment_id} → ${isClonedValue}`);
      }

      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.SUCCESS,
        message: "🎯 All queued assignments processed successfully!",
      });

    } catch (err) {
      console.error("❌ Worker error:", err.message);
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.ERROR,
        message: `❌ Worker runtime error: ${err.message}`,
      });
    } finally {
      await browser.close();
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.INFO,
        message: "🪟 Browser closed.",
      });
    }
  },
  { connection, concurrency: 1 }
);
