import { Worker } from "bullmq";
import { chromium } from "playwright";
import dotenv from "dotenv";
import { connection } from "../../configs/redis_bullmq.config.js";
import { createLecture } from "../createLecture.js";
import { updateSheetCell } from "../updateSheet.js";
import { getConfig } from "../getConfig.js";
import { emitProgress, LogType } from "../progressEmitter.js";
const { MASAI_ADMIN_LMS_USER_EMAIL, MASAI_ADMIN_LMS_USER_PASSWORD, GOOGLE_SHEET_ID } = getConfig()
dotenv.config();
console.log("This Queue is Running for Lecture Creation ✅");
const lectureWorker = new Worker(
  "lectureCreationQueue",
  async (job) => {
    const { lectures, sessionId } = job.data;

    // Generate sessionId if not provided
    const currentSessionId = sessionId || `lecture-${Date.now()}`;

    // Emit initial connection and task list
    emitProgress(currentSessionId, {
      type: 'log',
      logType: LogType.INFO,
      message: `🚀 Starting lecture creation worker with ${lectures?.length || 0} lectures`,
    });

    emitProgress(currentSessionId, {
      type: 'tasks_init',
      tasks: lectures?.map((l, index) => ({
        id: l.redisId || `task-${index}`,
        title: l.title || `Lecture ${index + 1}`,
        status: 'pending',
      })) || [],
    });

    if (!lectures || lectures.length === 0) {
      console.log("⚠️ No lectures to process.");
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.WARNING,
        message: "⚠️ No lectures to process.",
      });
      return;
    }

    // 🧭 Launch browser once
    const browser = await chromium.launch({
      headless: false,
      slowMo: 100,
      args: ["--start-maximized"],
    });

    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    // Wait for browser to fully initialize
    await page.waitForTimeout(2000);
    console.log("🌐 Browser initialized");
    emitProgress(currentSessionId, {
      type: 'log',
      logType: LogType.INFO,
      message: "🌐 Browser initialized",
    });

    try {
      console.log("🔐 Logging into Masai Admin LMS Platform...");
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.INFO,
        message: "🔐 Logging into Masai Admin LMS Platform...",
      });

      await page.goto(process.env.MASAI_ADMIN_LMS_URL, {
        waitUntil: "networkidle",
      });
      await page.fill(
        'input[type="email"]',
        MASAI_ADMIN_LMS_USER_EMAIL
      );
      await page.fill(
        'input[type="password"]',
        MASAI_ADMIN_LMS_USER_PASSWORD
      );
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: "networkidle" });
      console.log(" ✅ Login successful for the lectures creations");
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.SUCCESS,
        message: "✅ Login successful",
      });

      // Wait for browser to stabilize
      await page.waitForTimeout(2000);
      console.log("⏳ Browser ready, starting lecture creation...");
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.INFO,
        message: "⏳ Browser ready, starting lecture creation...",
      });

      //////// creation logic
      for(const lec of lectures){
        const redisKey = `lectures:${lec.redisId}`;

        // Update task status to in_progress
        emitProgress(currentSessionId, {
          type: 'task_update',
          task: {
            id: lec.redisId,
            title: lec.title,
            status: 'in_progress',
          },
        });

        emitProgress(currentSessionId, {
          type: 'log',
          logType: LogType.TASK_START,
          message: `📝 Processing: ${lec.title}`,
        });

        emitProgress(currentSessionId, {
          type: 'log',
          logType: LogType.STEP,
          message: `  → Creating lecture: ${lec.title}`,
        });

        const result = await createLecture(page,lec);
        console.log("🚀 ~ from the lecture creation queue result:", result)
        const isLectureCreatedValue = result.status === "Done" ? "yes" : "no";
        console.log("🚀 ~ isLectureCreatedValue:", isLectureCreatedValue)
        await connection.hset(redisKey, {
          isNotesUpdated: isLectureCreatedValue,
          isLectureCreated: isLectureCreatedValue,
          lectureCreationError: result.error || "",
          lastUpdated: new Date().toISOString(),
        });
        // Update Sheet
        await updateSheetCell(
          GOOGLE_SHEET_ID,
          "lecture",
          lec.redisId,
          "isLectureCreated",
          isLectureCreatedValue
        );

        console.log(`✅ ${lec.title} → ${result.status}${result.error ? ` (Error: ${result.error})` : ""}`);

        // Emit result
        if (result.status === "Done") {
          emitProgress(currentSessionId, {
            type: 'log',
            logType: LogType.SUCCESS,
            message: `✅ ${lec.title} → Created successfully`,
          });

          emitProgress(currentSessionId, {
            type: 'task_update',
            task: {
              id: lec.redisId,
              title: lec.title,
              status: 'completed',
              error: null,
            },
          });
        } else {
          emitProgress(currentSessionId, {
            type: 'log',
            logType: LogType.ERROR,
            message: `❌ ${lec.title} → ${result.error}`,
          });

          emitProgress(currentSessionId, {
            type: 'task_update',
            task: {
              id: lec.redisId,
              title: lec.title,
              status: 'error',
              error: result.error,
            },
          });
        }
      }

      console.log("🎯 All queued lectures processed successfully!");
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.SUCCESS,
        message: "🎯 All queued lectures processed successfully!",
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
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.INFO,
        message: "🪟 Browser closed.",
      });
    }
  },
  { connection }
);