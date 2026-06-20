import os from "os";

export async function updateNotes(page, lecture) {
  console.log("📚 ~ updateNotes ~ lecture:", lecture.lecture_id, typeof lecture.lecture_id);

  try {
    console.log(`🚀 Notes Updating Of: ${lecture.title}`);

    // Validate lecture_id
    const isValidLectureId =
      typeof lecture.lecture_id === "number" ||
      (typeof lecture.lecture_id === "string" && /^\d+$/.test(lecture.lecture_id.trim()));

    console.log("🚀 ~ updateNotes ~ isValidLectureId:", isValidLectureId);

    let editUrl;

    if (isValidLectureId) {
      console.log(`🆔 Using provided Lecture ID: ${lecture.lecture_id}`);
      editUrl = `https://experience-admin.masaischool.com/lectures/edit/?id=${Number(lecture.lecture_id)}`;
    } else {
      console.log("📄 Invalid or missing lecture_id, searching via filters...");

      await page.goto(
        `https://experience-admin.masaischool.com/lectures/`,
        { waitUntil: "domcontentloaded", timeout: 60000 }
      );
      console.log("✅ Navigated to lecture list page");

      // 1. Fill Title input first — it's visible before FILTERS is opened
      // Use placeholder* (contains) to handle any trailing spaces in the placeholder
      const titleInput = page.locator('input[placeholder*="Title to search"]');
      await titleInput.waitFor({ state: "visible", timeout: 15000 });
      await titleInput.fill(lecture.title);
      await page.waitForTimeout(500);
      console.log(`🔤 Filled title: ${lecture.title}`);

      // 2. Open filters panel — always click it, panel is hidden by default
      const filtersButton = page.locator('button:has-text("FILTERS")');
      await filtersButton.waitFor({ state: "visible", timeout: 10000 });
      await filtersButton.click();
      await page.waitForTimeout(1000);
      console.log("🔽 Opened filters panel");

      const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Helper: select an option from a React Select dropdown by its label text
      async function selectReactOption(labelText, value) {
        // Find label containing the text, then click its react-select control to open dropdown
        const label = page.locator("label").filter({ hasText: new RegExp(`^${labelText}`) }).first();
        await label.waitFor({ state: "visible", timeout: 10000 });
        const control = label.locator(".react-select__control").first();
        await control.click();
        await page.waitForTimeout(400);
        // Type to filter options
        await page.keyboard.type(value, { delay: 30 });
        await page.waitForTimeout(600);
        // Match case-insensitively — LMS may display names in different case than the sheet
        const option = page.locator(".react-select__option").filter({ hasText: new RegExp(`^${escapeRegex(value)}$`, "i") }).first();
        await option.waitFor({ state: "visible", timeout: 5000 });
        await option.click();
        await page.waitForTimeout(300);
        console.log(`✅ Selected ${labelText}: ${value}`);
      }

      // 3. Select Type = live (dropdown value is lowercase)
      await selectReactOption("Type", "live");

      // 4. Select Batch
      await selectReactOption("Batch", lecture.batch);

      // 5. Select Section
      await selectReactOption("Section", lecture.section);

      // 6. Wait for filtered results
      await page.waitForTimeout(1500);
      await page.waitForSelector("table tbody tr", { timeout: 15000 });

      const rows = page.locator("table tbody tr");
      const rowCount = await rows.count();
      console.log(`🔍 Filter returned ${rowCount} row(s)`);

      if (rowCount === 0) {
        throw new Error(
          `No lecture found with title="${lecture.title}", batch="${lecture.batch}", section="${lecture.section}", type="Live".`
        );
      }

      // 7. Get ID from first (should be only) result row
      const matchedId = (await rows.first().locator("td").first().innerText()).trim();
      if (!matchedId) {
        throw new Error("Lecture ID not found in the result row.");
      }
      console.log(`🆔 Found lecture ID: ${matchedId}`);

      editUrl = `https://experience-admin.masaischool.com/lectures/edit/?id=${matchedId}`;
    }

    // Navigate to edit page
    await page.goto(editUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log(`✏️ Navigated to lecture edit page: ${editUrl}`);

    // Helper: Fill dropdowns only if empty
    async function fillReactSelectIfEmpty(xpath, value, label) {
      try {
        const container = page.locator(`xpath=${xpath}`);
      
        await container.waitFor({ state: "attached", timeout: 20000 });
      
        // Check if value-container has the "has-value" class
        const hasValue = await container.locator(".react-select__value-container--has-value").count();
      
        if (hasValue > 0) {
          console.log(`⏭️ Skipped ${label} (already filled)`);
          return;
        }
      
        // Fill it now
        await container.scrollIntoViewIfNeeded();
        await container.click({ force: true });
      
        await page.keyboard.type(value, { delay: 30 });
        await page.waitForTimeout(1000);
        await page.keyboard.press("Enter");
      
        console.log(`✅ Filled ${label}: ${value}`);
      
      } catch (err) {
        console.log(`⚠️ Could not process ${label}: ${err.message}`);
      }
    }

    await fillReactSelectIfEmpty(
      "/html/body/div/div/div/main/form/div[1]/div[3]/div/div/label[1]/div/div",
      "Test Group",
      "Group Type"
    );

    await fillReactSelectIfEmpty(
      "/html/body/div/div/div/main/form/div[1]/div[3]/div/div/label[2]/div/div",
      "topic_title_002",
      "Topic"
    );

    await fillReactSelectIfEmpty(
      "/html/body/div/div/div/main/form/div[1]/div[3]/div/div/label[3]/div/div",
      "test_LO_003",
      "Learning Objective"
    );

    // for notes updating
    try {
      const selectAllKey = os.platform() === "darwin" ? "Meta+A" : "Control+A";

      const notesXpath = "/html/body/div/div/div/main/form/div[5]/div/div[2]/div[1]/div/textarea";
      const notesLocator = page.locator(`xpath=${notesXpath}`);
      await notesLocator.waitFor({ state: "attached", timeout: 20000 });

      await notesLocator.scrollIntoViewIfNeeded();
      await notesLocator.click({ force: true });
      await page.keyboard.press(selectAllKey);
      await page.keyboard.press("Backspace");
      await notesLocator.fill(lecture.notes || "No Notes Provided");
      await page.waitForTimeout(1000);
      await page.keyboard.press("Enter");

      console.log("🗒️ Notes updated successfully");
    } catch (err) {
      console.log(`⚠️ Could not update notes: ${err.message}`);
    }

    // Click EDIT LECTURE
    try {
      const editButton = page.locator('button:has-text("EDIT LECTURE")');
      await editButton.waitFor({ state: "attached", timeout: 20000 });
      await editButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await editButton.click({ force: true });
      console.log("💾 Clicked 'EDIT LECTURE' button, notes updated");
    } catch (err) {
      console.log(`⚠️ Could not click EDIT LECTURE button: ${err.message}`);
    }

    await page.waitForTimeout(2000);
    console.log("✅ Notes update process completed for:", lecture.title);
    return { status: "Done", error: "" };
  } catch (err) {
    console.error(
      `❌ Error while updating lecture '${lecture.title}':`,
      err.message
    );
    return { status: "Error", error: `Notes update failed: ${err.message}` };
  }
}