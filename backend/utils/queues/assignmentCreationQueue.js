import { Worker } from "bullmq";
import { chromium } from "playwright";
import dotenv from "dotenv";
import { connection } from "../../configs/redis_bullmq.config.js";
import { createAssignment } from "../createAssignment.js";
import { updateSheetCell } from "../updateSheet.js";
import { getConfig } from "../getConfig.js";
import { emitProgress, LogType } from "../progressEmitter.js";
const { MASAI_ADMIN_LMS_USER_EMAIL, MASAI_ADMIN_LMS_USER_PASSWORD, GOOGLE_SHEET_ID} = getConfig()

dotenv.config();

// Helper function to parse schedule date/time
function parseScheduleDateTime(dateString, timeString) {
  const parts = dateString.includes('-')
    ? dateString.split('-')
    : dateString.split('/');

  let year, month, day;
  if (parts[0].length === 4) {
    // YYYY-MM-DD format
    [year, month, day] = parts;
  } else {
    // DD/MM/YYYY or DD-MM-YYYY format
    [day, month, year] = parts;
  }

  const [hour, minute] = timeString.split(/[:-]/).map(Number);
  return new Date(year, month - 1, day, hour, minute, 0);
}

// Helper function to format date/time for display
function formatDateTime(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

// Use HEADLESS=false for local debugging, defaults to true for Docker
const isHeadless = process.env.HEADLESS !== 'false';
console.log(`This Queue is Running for Assignment Creation ✅ (headless: ${isHeadless})`);

const assignmentWorker = new Worker(
  "assignmentCreationQueue",
  async (job) => {
    const { assignments, sessionId } = job.data;
    console.log("🚀 ~ assignments from queue:", assignments)

    // Generate sessionId if not provided
    const currentSessionId = sessionId || `assignment-${Date.now()}`;

    // Emit initial connection and task list
    emitProgress(currentSessionId, {
      type: 'log',
      logType: LogType.INFO,
      message: `🚀 Starting assignment creation worker with ${assignments?.length || 0} assignments`,
    });

    emitProgress(currentSessionId, {
      type: 'tasks_init',
      tasks: assignments?.map((a, index) => ({
        id: a.redisId || `task-${index}`,
        title: a.title || `Assignment ${index + 1}`,
        status: 'pending',
      })) || [],
    });

    if (!assignments || assignments.length === 0) {
      console.log("⚠️ No assignments to process.");
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.WARNING,
        message: "⚠️ No assignments to process.",
      });
      return;
    }

    // 🧭 Launch browser once
    const browser = await chromium.launch({
      headless: isHeadless,
      slowMo: 100,
      args: isHeadless
        ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        : ["--start-maximized"],
    });

    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    // Wait for browser to fully initialize (especially important on first run)
    await page.waitForTimeout(2000);
    console.log("🌐 Browser initialized");
    emitProgress(currentSessionId, {
      type: 'log',
      logType: LogType.INFO,
      message: "🌐 Browser initialized",
    });

    ///
    try {
      console.log("🔐 Logging into Assessment Platform...");
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.INFO,
        message: "🔐 Logging into Assessment Platform...",
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
      console.log(" ✅ Login successful");
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.SUCCESS,
        message: "✅ Login successful",
      });

      // 🔧 FIX: Wait for browser to fully settle after login before starting first assignment
      await page.waitForTimeout(2000);
      console.log("⏳ Browser ready, starting assignment creation...");
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.INFO,
        message: "⏳ Browser ready, starting assignment creation...",
      });

      //////// creation logic
      for(const a of assignments){
        const redisKey = `assignments:${a.redisId}`;

        // Update task status to in_progress
        emitProgress(currentSessionId, {
          type: 'task_update',
          task: {
            id: a.redisId,
            title: a.title,
            status: 'in_progress',
          },
        });

        emitProgress(currentSessionId, {
          type: 'log',
          logType: LogType.TASK_START,
          message: `📝 Processing: ${a.title}`,
        });

        // ⏰ PRE-EXECUTION TIME VALIDATION
        // Check if schedule time has already passed
        try {
          const scheduleDateTime = parseScheduleDateTime(a.startDate, a.startTime);
          const now = new Date();

          if (scheduleDateTime < now) {
            const minutesAgo = Math.floor((now - scheduleDateTime) / 60000);
            const timePassedError = `Schedule time has passed by ${minutesAgo} minute(s). Assignment was scheduled for ${a.startDate} ${a.startTime} but current time is ${formatDateTime(now)}. Please update the schedule time to a future time.`;

            await connection.hset(redisKey, {
              isAssignmentCreated: "no",
              assignmentCreationError: timePassedError,
              lastUpdated: new Date().toISOString(),
            });

            await updateSheetCell(
              GOOGLE_SHEET_ID,
              "assignment",
              a.redisId,
              "isAssignmentCreated",
              "no"
            );

            console.log(`⏰ ${a.title} → Skipped (schedule time passed)`);

            // Emit error
            emitProgress(currentSessionId, {
              type: 'log',
              logType: LogType.ERROR,
              message: `⏰ ${a.title} → Skipped (schedule time passed by ${minutesAgo} minutes)`,
            });

            emitProgress(currentSessionId, {
              type: 'task_update',
              task: {
                id: a.redisId,
                title: a.title,
                status: 'error',
                error: timePassedError,
              },
            });

            continue; // Skip this assignment
          }
        } catch (timeCheckErr) {
          console.log(`⚠️ Time validation error for ${a.title}:`, timeCheckErr.message);
          // Continue with creation if time check fails
        }

        // Proceed with creation
        emitProgress(currentSessionId, {
          type: 'log',
          logType: LogType.STEP,
          message: `  → Creating assignment: ${a.title}`,
        });

        const result = await createAssignment(page, a, currentSessionId);
        const isAssignmentCreatedValue = result.status === "Done" ? "yes" : "no";
        await connection.hset(redisKey, {
          isAssignmentCreated: isAssignmentCreatedValue,
          assignmentCreationError: result.error || "",
          lastUpdated: new Date().toISOString(),
        });
        // Update Sheet
        await updateSheetCell(
          GOOGLE_SHEET_ID,
          "assignment",
          a.redisId,
          "isAssignmentCreated",
          isAssignmentCreatedValue
        );

        console.log(`✅ ${a.title} → ${result.status}${result.error ? ` (Error: ${result.error})` : ""}`);

        // Emit result
        if (result.status === "Done") {
          emitProgress(currentSessionId, {
            type: 'log',
            logType: LogType.SUCCESS,
            message: `✅ ${a.title} → Created successfully`,
          });

          emitProgress(currentSessionId, {
            type: 'task_update',
            task: {
              id: a.redisId,
              title: a.title,
              status: 'completed',
              error: null, // Clear any previous errors
            },
          });
        } else {
          emitProgress(currentSessionId, {
            type: 'log',
            logType: LogType.ERROR,
            message: `❌ ${a.title} → ${result.error}`,
          });

          emitProgress(currentSessionId, {
            type: 'task_update',
            task: {
              id: a.redisId,
              title: a.title,
              status: 'error',
              error: result.error,
            },
          });
        }
      }


      console.log("🎯 All queued assignments processed successfully!");
      emitProgress(currentSessionId, {
        type: 'log',
        logType: LogType.SUCCESS,
        message: "🎯 All queued assignments processed successfully!",
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
