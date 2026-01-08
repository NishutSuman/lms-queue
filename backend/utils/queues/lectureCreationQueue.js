import { Worker } from "bullmq";
import { chromium } from "playwright";
import dotenv from "dotenv";
import { connection } from "../../configs/redis_bullmq.config.js";
import { createLecture } from "../createLecture.js";
import { updateSheetCell } from "../updateSheet.js";
import { getConfig } from "../getConfig.js";
const { MASAI_ADMIN_LMS_USER_EMAIL, MASAI_ADMIN_LMS_USER_PASSWORD, GOOGLE_SHEET_ID } = getConfig()
dotenv.config();
console.log("This Queue is Running for Lecture Creation ✅");
const lectureWorker = new Worker(
  "lectureCreationQueue",
  async (job) => {
    const { lectures } = job.data;

    if (!lectures || lectures.length === 0) {
      console.log("⚠️ No lectures to process.");
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
    ///
    try {
      console.log("🔐 Logging into Masai Admin LMS Platform...");
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

      //////// creation logic
      for(const lec of lectures){
        const redisKey = `lectures:${lec.redisId}`;
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

      }

      console.log("🎯 All queued lectures processed successfully!");
    } catch (err) {
      console.error("❌ Worker runtime error:", err.message);
    } finally {
      await browser.close();
      console.log("🪟 Browser closed.");
    }
  },
  { connection }
);