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

      // Match option text exactly, allowing an optional " (ID)" suffix the LMS may append
      const option = page.locator(".react-select__option")
        .filter({ hasText: new RegExp(`^${escapeRegex(value)}(\\s*\\(\\d+\\))?$`) })
        .first();

      const optionCount = await option.count();
      if (optionCount === 0) {
        throw new Error(`"${value}" not found in ${labelText} dropdown. Please verify the name matches exactly.`);
      }

      await option.waitFor({ state: "visible", timeout: 5000 });
      await option.click();
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

    // Schedule start date/time
    // The copy form pre-fills these from the source — triple-click selects all so typing replaces cleanly
    const scheduleInput = page.locator(
      "xpath=/html/body/div/div/div/main/form/div[1]/div[4]/div/label[1]/div/div/input"
    );
    await scheduleInput.waitFor({ state: "visible", timeout: 15000 });
    await scheduleInput.scrollIntoViewIfNeeded();
    await scheduleInput.click({ clickCount: 3, force: true });
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);
    await page.keyboard.type(lecture.startDate, { delay: 30 });
    await page.keyboard.press("Tab");
    await page.keyboard.type(lecture.startTime, { delay: 30 });
    // Tab away instead of Enter — Enter would submit the form before end date is filled
    await page.keyboard.press("Tab");
    await page.waitForTimeout(500);
    console.log(`✅ Schedule: ${lecture.startDate} ${lecture.startTime}`);

    // Schedule end date/time
    const endInput = page.locator(
      "xpath=/html/body/div/div/div/main/form/div[1]/div[4]/div/label[2]/div/div/input"
    );
    await endInput.waitFor({ state: "visible", timeout: 15000 });
    await endInput.click({ clickCount: 3, force: true });
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);
    await page.keyboard.type(lecture.endDate, { delay: 30 });
    await page.keyboard.press("Tab");
    await page.keyboard.type(lecture.endTime, { delay: 30 });
    await page.waitForTimeout(1500);
    console.log(`✅ Concludes: ${lecture.endDate} ${lecture.endTime}`);

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
