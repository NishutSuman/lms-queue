import { toDateTimeLocal } from "./dateTimeLocal.js";

export async function cloneLecture(page, lecture) {
  try {
    console.log(`🚀 Cloning lecture ID ${lecture.source_lecture_id} → ${lecture.target_batch} / ${lecture.target_section}`);

    await page.goto(
      `https://experience-admin.masaischool.com/lectures/copy/?id=${lecture.source_lecture_id}`,
      { waitUntil: "domcontentloaded", timeout: 60000 }
    );
    console.log(`✅ Navigated to copy page for lecture ID: ${lecture.source_lecture_id}`);

    // Wait for the form to be ready (Batch field must be visible)
    await page.waitForSelector(".react-select__control", { timeout: 20000 });
    await page.waitForTimeout(1000);

    // Update Title if target_title is provided
    if (lecture.target_title && lecture.target_title.trim() !== "") {
      const titleInput = page.locator('input[placeholder="Enter Title"]');
      await titleInput.waitFor({ state: "visible", timeout: 10000 });
      await titleInput.fill(lecture.target_title.trim());
      console.log(`✅ Title updated to: ${lecture.target_title.trim()}`);
    }

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Clear existing React Select value and select a new one, scoped to the label
    async function clearAndSelect(labelText, value) {
      const label = page.locator("label").filter({ hasText: new RegExp(`^${labelText}`) }).first();
      await label.waitFor({ state: "visible", timeout: 15000 });

      // Clear any pre-filled value
      const clearBtn = label.locator(".react-select__clear-indicator");
      if (await clearBtn.count() > 0) {
        await clearBtn.click();
        await page.waitForTimeout(400);
      }

      // Open dropdown and type to filter
      const control = label.locator(".react-select__control").first();
      await control.click();
      await page.waitForTimeout(400);
      await page.keyboard.type(value, { delay: 30 });
      await page.waitForTimeout(800);

      // Select by normalized text instead of an anchored regex. The LMS appends
      // an " (ID)" suffix to some options (notably lectures); we strip any
      // trailing "(...)" before comparing so the ID is ignored. Prefer an exact
      // match, fall back to startsWith. This is robust against stray whitespace
      // and Playwright-version differences in hasText/regex normalization that
      // caused the previous "(\d+)?$" match to miss valid options.
      const wanted = value.replace(/\s+/g, " ").trim().toLowerCase();

      const options = page.locator(".react-select__option");
      await options.first().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});

      const total = await options.count();
      let exactIdx = -1;
      let startsWithIdx = -1;
      for (let i = 0; i < total; i++) {
        const raw = (await options.nth(i).innerText()) || "";
        const stripped = raw
          .replace(/\s*\([^)]*\)\s*$/, "") // drop trailing " (ID)" the LMS may append
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
        if (stripped === wanted) { exactIdx = i; break; }
        if (startsWithIdx === -1 && stripped.startsWith(wanted)) startsWithIdx = i;
      }

      const chosenIdx = exactIdx !== -1 ? exactIdx : startsWithIdx;
      if (chosenIdx === -1) {
        throw new Error(`"${value}" not found in ${labelText} dropdown. Please verify the name matches exactly.`);
      }

      await options.nth(chosenIdx).click();
      await page.waitForTimeout(300);
      console.log(`✅ Selected ${labelText}: ${value}`);
    }

    // Update Batch
    await clearAndSelect("Batch", lecture.target_batch);

    // Update Section
    await clearAndSelect("Section", lecture.target_section);

    // Associated Lecture — only if provided
    if (lecture.associated_lecture && lecture.associated_lecture.trim() !== "") {
      await clearAndSelect("Associated Lecture", lecture.associated_lecture);
    }

    // Schedule start date/time.
    // This is a native <input type="datetime-local">. Its underlying value is
    // always "YYYY-MM-DDTHH:mm" (24-hour) no matter how the browser locale
    // *displays* it. Typing the raw string broke on locales that show 12-hour
    // AM/PM (e.g. en-IN on Mac), so we set the canonical value via fill().
    const scheduleInput = page.locator(
      "xpath=/html/body/div/div/div/main/form/div[1]/div[4]/div/label[1]/div/div/input"
    );
    await scheduleInput.waitFor({ state: "visible", timeout: 15000 });
    await scheduleInput.scrollIntoViewIfNeeded();
    const scheduleValue = toDateTimeLocal(lecture.startDate, lecture.startTime);
    await scheduleInput.fill(scheduleValue);
    await page.waitForTimeout(300);
    console.log(`✅ Schedule set: ${scheduleValue}`);

    // Schedule end date/time
    const endInput = page.locator(
      "xpath=/html/body/div/div/div/main/form/div[1]/div[4]/div/label[2]/div/div/input"
    );
    await endInput.waitFor({ state: "visible", timeout: 15000 });
    await endInput.scrollIntoViewIfNeeded();
    const endValue = toDateTimeLocal(lecture.endDate, lecture.endTime);
    await endInput.fill(endValue);
    await page.waitForTimeout(500);
    console.log(`✅ Concludes set: ${endValue}`);

    // Click submit
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.waitFor({ state: "visible", timeout: 10000 });
    await submitButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await submitButton.click();
    console.log("📤 Submit button clicked");

    // Verify — navigating away from /copy/ means success
    await page.waitForTimeout(3000);
    if (page.url().includes("/lectures/copy/")) {
      return { status: "Error", error: "Clone failed — stayed on copy form after submission. Possible validation error on the LMS." };
    }

    console.log(`✅ Cloned successfully: ${lecture.source_lecture_title || lecture.source_lecture_id} → ${lecture.target_batch} / ${lecture.target_section}`);
    return { status: "Done", error: "" };

  } catch (err) {
    console.error(`❌ Error cloning lecture:`, err.message);
    return { status: "Error", error: `Clone failed: ${err.message}` };
  }
}
