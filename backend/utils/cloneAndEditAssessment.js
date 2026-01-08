import { chromium } from "playwright";

export async function cloneAndEditAssessment(page, previousTitle, currentTitle) {
  try {
    // Navigate to assessment list
    await page.goto(
      "https://assess-admin.masaischool.com/assessment-templates/list?size=10&page=1",
      { waitUntil: "networkidle", timeout: 30000 }
    );

    // Search by previous title
    const searchInput = page.locator('input[placeholder="Search by title"]');
    await searchInput.waitFor({ state: "visible", timeout: 10000 });
    await searchInput.fill(previousTitle);
    await page.waitForTimeout(1500);
    console.log(`🔍 Searching for ${previousTitle} and this is ${currentTitle}`);

    // Clone
    const cloneButton = page.locator('button[aria-label="clone"]').first();
    await cloneButton.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(1000); 
    await cloneButton.click({ force: true });
    console.log("🧬 Clone initiated");

    await page.waitForSelector('div[role="dialog"]', { timeout: 12000 });
    await page.locator('label:has-text("Clone Sections as well")').click({ force: true });
    await page.waitForTimeout(2500);

    await page.locator('button:has-text("CONFIRM AND CLONE")').click({ force: true });

    // 🔧 FIX: Wait for dialog to close (indicates clone operation complete)
    // Increased timeout to 30s to handle slow server responses during peak hours
    await page.waitForSelector('div[role="dialog"]', { state: "detached", timeout: 30000 });

    // Small buffer after dialog closes to ensure server has fully processed
    await page.waitForTimeout(2000);
    console.log(`✅ Clone completed for "${previousTitle}"`);

    // Edit cloned assessment
    await page.goto(
      "https://assess-admin.masaischool.com/assessment-templates/list?size=10&page=1",
      { waitUntil: "networkidle", timeout: 30000 }
    );
    const searchInput2 = page.locator('input[placeholder="Search by title"]');
    await searchInput2.waitFor({ state: "visible", timeout: 10000 });
    await searchInput2.fill(`Copy of ${previousTitle}`);
    await page.waitForTimeout(1000);

    const clickButton = page.locator(`a:has-text("Copy of ${previousTitle}")`).first();
    await clickButton.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(1000); 
    await clickButton.click({ force: true });

    const editButton = page.locator('button:has-text("EDIT")');
    await editButton.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(1000); 
    await editButton.click({ force: true });

    const titleInput = page.locator('input[placeholder="Assessment Title"]');
    await titleInput.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(1000); 
    await titleInput.fill(currentTitle);

    const updateButton = page.locator('button:has-text("UPDATE")');
    await updateButton.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(1000); 
    await updateButton.click({ force: true });

    await page.waitForTimeout(2000);
    console.log(`✏️ Renamed clone → "${currentTitle}"`);
    return { status: "Done", error: "" };
  } catch (err) {
    console.error(`❌ Error cloning "${currentTitle}": ${err.message}`);
    return { status: "Error", error: `Clone failed: ${err.message}` };
  }
}
