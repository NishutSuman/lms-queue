import { Worker } from "bullmq";
import { chromium } from "playwright";
import dotenv from "dotenv";
import { connection } from "../../configs/redis_bullmq.config.js";
import { cloneAndEditAssessment } from "../cloneAndEditAssessment.js";
import { updateSheetCell } from "../updateSheet.js";
import { getConfig } from "../getConfig.js";
const { MASAI_ASSESS_PLATFORM_USER_EMAIL, MASAI_ASSESS_PLATFORM_USER_PASSWORD, GOOGLE_SHEET_ID } = getConfig()


dotenv.config();

// Use HEADLESS=false for local debugging, defaults to true for Docker
const isHeadless = process.env.HEADLESS !== 'false';
console.log(`This Queue is Running for Assessment Clone/Rename ✅ (headless: ${isHeadless})`);

// 🧭 Create Worker
const automationWorker = new Worker(
  "assessmentCloneRenameQueue",
  async (job) => {
    const { assignments } = job.data;
    if (!assignments || assignments.length === 0) {
      console.log("⚠️ No assignments to process. Skipping job.");
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
      console.log("🔐 Logging into Assessment Platform...");
      await page.goto(process.env.MASAI_ASSESS_PLATFORM_URL, { waitUntil: "networkidle" });
      await page.fill('input[type="text"]', MASAI_ASSESS_PLATFORM_USER_EMAIL);
      await page.fill('input[type="password"]', MASAI_ASSESS_PLATFORM_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: "networkidle" });
      console.log("✅ Login successful");

      // Select client once
      const modal = page.locator('h2:has-text("Please select a client")').locator("..");
      const dropdown = modal.locator("select.chakra-select");
      await dropdown.first().waitFor({ state: "visible", timeout: 10000 });
      await dropdown.first().selectOption({ label: "Masai LMS" });
      //await dropdown.first().dispatchEvent("change");
      await page.waitForSelector("text=Please select a client", { state: "detached" });
      console.log("✅ Client selected: Masai LMS");

      // Process all assignments sequentially
      for(const a of assignments) {
        if ((a.isCloned || "").toLowerCase() === "yes") {
          console.log(`⏩ Skipping already cloned: ${a.assessment_template_name}`);
          continue;
        }
        
        console.log(`🚀 Starting clone for: ${a.assessment_template_name}`);

        const result = await cloneAndEditAssessment(
          page,
          a.previous_assessment_templateName,
          a.assessment_template_name
        );

        // Optionally update Redis to track progress
        const redisKey = `assignments:${a.redisId}`;
        const isClonedValue = result.status === "Done" ? "yes" : "no";
        await connection.hset(redisKey, {
          isCloned: isClonedValue,
          assessmentCloneError: result.error || "",
          lastUpdated: new Date().toISOString(),
        });
        // Update Sheet
        await updateSheetCell(
          GOOGLE_SHEET_ID,
          "assignment",
          a.redisId,
          "isCloned",
          isClonedValue
        );

        console.log(`✅ ${a.assessment_template_name} → ${result.status}${result.error ? ` (Error: ${result.error})` : ""}`);
      }

      console.log("🎯 All queued assessments processed successfully!");
    } catch (err) {
      console.error("❌ Worker runtime error:", err.message);
    } finally {
      await browser.close();
      console.log("🪟 Browser closed.");
    }
  },
  { connection }
);

// 🧠 Event logs
automationWorker.on("completed", (job) =>
  console.log(`✅ Job ${job.id} completed.`)
);

automationWorker.on("failed", (job, err) =>
  console.error(`❌ Job ${job.id} failed: ${err.message}`)
);

console.log("🚀 Automation worker started and waiting for jobs...");
