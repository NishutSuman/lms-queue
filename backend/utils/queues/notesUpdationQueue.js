import { Worker } from "bullmq";
import { chromium } from "playwright";
import dotenv from "dotenv";
import { connection } from "../../configs/redis_bullmq.config.js";
import { updateNotes } from "../notesUpdation.js";
import { updateSheetCell } from "../updateSheet.js";
import { getConfig } from "../getConfig.js";
const { MASAI_ADMIN_LMS_USER_EMAIL, MASAI_ADMIN_LMS_USER_PASSWORD, GOOGLE_SHEET_ID} = getConfig()
dotenv.config();

// Use HEADLESS=false for local debugging, defaults to true for Docker
const isHeadless = process.env.HEADLESS !== 'false';
console.log(`This Queue is Running for Notes Updation ✅ (headless: ${isHeadless})`);

const notesUpdationWorker = new Worker(
  "notesUpdationQueue",
  async (job) => {
    const { lectures } = job.data;

    if (!lectures || lectures.length === 0) {
      console.log("⚠️ No lectures to process.");
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


    try {
      console.log("🔐 Logging into LMS...");
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
      console.log("✅ LMS Login successful");

      //////// 🧠 Start updating notes
      for (const lec of lectures) {
        const redisKey = `assignments:${lec.redisId}`;
        console.log(
          `🧾 Processing Lecture: ${lec.title}`
        );

        const result = await updateNotes(page, lec);
        console.log(`📋 updateNotes returned: ${result.status}`);
        const isNotesUpdatedValue = result.status === "Done" ? "yes" : "no"
        await connection.hset(redisKey, {
          isNotesUpdated: isNotesUpdatedValue,
          notesUpdateError: result.error || "",
          lastUpdated: new Date().toISOString(),
        });

        // Update Sheet
        await updateSheetCell(
          GOOGLE_SHEET_ID,
          "assignment",
          lec.redisId,
          "isNotesUpdated",
          isNotesUpdatedValue
        );
      
        console.log(`✅ ${lec.title} → ${status}`);
       
      }

      console.log("🎯 All lectures processed successfully!");
    } catch (err) {
      console.error("❌ Worker runtime error:", err.message);
    } finally {
      await browser.close();
      console.log("🪟 Browser closed.");
    }
  },
  { connection, concurrency: 1 } // 👈 Sequential for stability
);


