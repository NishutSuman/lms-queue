export async function createAssignment(page, assignment) {
	try {
		console.log(`🚀 Creating assignment: ${assignment.title}`);

		// 1️⃣ Go to assignments page
		await page.goto("https://experience-admin.masaischool.com/assignment/", {
			waitUntil: "domcontentloaded",
			timeout: 60000,
		});
		console.log("📄 Navigated to Assignment Page");

		// 🔧 FIX: Set page zoom to 80% to ensure datetime-local inputs work correctly
		await page.evaluate(() => {
			document.body.style.zoom = '0.8';
		});
		console.log("🔍 Page zoom set to 80%");

		// 2️⃣ Click the "CREATE ASSIGNMENT" button
		const createBtn = page.locator('button:has-text("CREATE ASSIGNMENT")');
		await createBtn.waitFor({ state: "visible", timeout: 10000 });
		await page.waitForTimeout(1000);
		await createBtn.click({ force: true });
		console.log("🖱️ Clicked on 'CREATE ASSIGNMENT' button");

		// 3️⃣ Wait for title input and fill it
		const titleInput = page.locator('input[placeholder="Enter Title"]');
		await titleInput.waitFor({ state: "visible", timeout: 10000 });
		await titleInput.fill(assignment.title);
		console.log(`✏️ Filled title: ${assignment.title}`);

		// 4️⃣ Fill Type (custom select using XPath) - Assignment/Practice/Evaluation
		const typeInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[1]/div/label[1]/div/div/div[1]/div[2]/input"
		);
		await typeInput.waitFor({ state: "visible", timeout: 10000 });
		await typeInput.click({ force: true }); // focus field
		await typeInput.fill(assignment.type, { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		console.log(`✅ Selected Type: ${assignment.type}`);

		////  category - dsa/coding
		const categoryInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[1]/div/label[2]/div/div/div[1]/div[2]/input"
		);
		await categoryInput.waitFor({ state: "visible", timeout: 10000 });
		await categoryInput.click({ force: true }); // focus field
		await categoryInput.fill(assignment.category, { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		console.log(`✅ Selected category: ${assignment.tags}`);

		////  tags
		const tagsInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[1]/div/label[3]/div/div/div[1]/div/input"
		);
		await tagsInput.waitFor({ state: "visible", timeout: 10000 });
		await tagsInput.click({ force: true }); // focus field
		await tagsInput.fill(assignment.tags, { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		console.log(`✅ Selected tags: ${assignment.tags}`);

		//platforms - LMS/Assess etc
		const platformsInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[1]/div/label[4]/div/div/div[1]/div[2]/input"
		);
		await platformsInput.waitFor({ state: "visible", timeout: 10000 });
		await platformsInput.click({ force: true }); // focus field
		await platformsInput.fill(assignment.platforms, { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		await page.waitForTimeout(800);
		console.log(`✅ Selected platforms: ${assignment.platforms}`);

		//platforms clients - Masai LMS, Masai One, Interview Production etc
		const clientsInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[1]/div/label[5]/div/div/div[1]/div[2]/input"
		);
		await clientsInput.waitFor({ state: "visible", timeout: 10000 });
		await clientsInput.click({ force: true }); // focus field
		await clientsInput.fill(assignment.assess_client, { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		console.log(`✅ Selected client: ${assignment.assess_client}`);

		//  🧩 Select Assessment Template (Modal Flow)
		const templateInput = page.locator(
			'input[placeholder="Enter Assessment Template"]'
		);
		await templateInput.waitFor({ state: "visible", timeout: 10000 });
		await templateInput.click({ force: true });
		console.log(
			"🖱️ Clicked 'Enter Assessment Template' input — modal should open"
		);
		await page.waitForTimeout(2000);

		// Find and type into the search input inside the modal
		const modalSearchInput = page.locator(
			'input[placeholder="Search by title"]'
		);
		await modalSearchInput.waitFor({ state: "visible", timeout: 10000 });
		await modalSearchInput.fill(assignment.assessment_template_name);
		console.log(
			`🔍 Searching for template: ${assignment.assessment_template_name}`
		);

		// Wait a moment for table results to load
		await page.waitForTimeout(2000);

		// Click the first checkbox (first row in the table)
		const firstCheckbox = page
			.locator('table tbody tr:first-child td input[type="checkbox"]')
			.first();
		await firstCheckbox.waitFor({ state: "visible", timeout: 10000 });
		await page.waitForTimeout(1000);
		await firstCheckbox.click({ force: true });
		console.log(`✅ Selected first assessment result for: ${assignment.title}`);

		// Wait for modal to close
		await page.waitForSelector('div[role="dialog"]', {
			state: "detached",
			timeout: 10000,
		});
		console.log("🪄 Modal closed successfully");
		//// modal end

		/// enter batch
		const batchInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[2]/div/label[1]/div/div/div[1]/div[2]/input"
		);
		await batchInput.waitFor({ state: "visible", timeout: 10000 });
		await batchInput.click({ force: true }); // focus field
		await batchInput.fill(assignment.batch, { delay: 30 });
		await page.waitForTimeout(1000);
		// 🔧 FIX: Click exact match from dropdown instead of pressing Enter
		const batchOption = page.locator(`div[class*="option"]`).filter({ hasText: new RegExp(`^${assignment.batch}$`) });
		const batchOptionExists = await batchOption.count();
		if (batchOptionExists > 0) {
			await batchOption.first().click();
		} else {
			// Fallback: try clicking option with exact text
			await page.locator(`text="${assignment.batch}"`).first().click();
		}
		console.log(`✅ Selected batch: ${assignment.batch}`);

		// section -
		const sectionInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[2]/div/label[2]/div/div/div[1]/div[2]/input"
		);
		await sectionInput.waitFor({ state: "visible", timeout: 10000 });
		await sectionInput.click({ force: true }); // focus field
		await sectionInput.fill(assignment.section, { delay: 30 });
		await page.waitForTimeout(1000);
		// 🔧 FIX: Click exact match from dropdown instead of pressing Enter
		const sectionOption = page.locator(`div[class*="option"]`).filter({ hasText: new RegExp(`^${assignment.section}$`) });
		const sectionOptionExists = await sectionOption.count();
		if (sectionOptionExists > 0) {
			await sectionOption.first().click();
		} else {
			// Fallback: try clicking option with exact text
			await page.locator(`text="${assignment.section}"`).first().click();
		}
		console.log(`✅ Selected section: ${assignment.section}`);

		// associated lectures -
		const associatedLecturesInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[2]/div/label[3]/div/div/div[1]/div[2]/input"
		);
		await associatedLecturesInput.waitFor({ state: "visible", timeout: 10000 });
		await associatedLecturesInput.click({ force: true }); // focus field
		await page.keyboard.type(assignment.associated_lecture, { delay: 30 });
		await page.waitForTimeout(1000);
		// 🔧 FIX: Click exact match from dropdown instead of pressing Enter
		const lectureOption = page.locator(`div[class*="option"]`).filter({ hasText: new RegExp(`^${assignment.associated_lecture}$`) });
		const lectureOptionExists = await lectureOption.count();
		if (lectureOptionExists > 0) {
			await lectureOption.first().click();
		} else {
			// Fallback: try clicking option with exact text
			await page.locator(`text="${assignment.associated_lecture}"`).first().click();
		}
		console.log(
			`✅ Selected associated lectures: ${assignment.associated_lecture}`
		);

		//// Group Type
		const groupTypeInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[3]/div/div/label[1]/div/div/div[1]/div[2]/input"
		);
		await groupTypeInput.waitFor({ state: "visible", timeout: 10000 });
		await groupTypeInput.click({ force: true }); // focus field
		await page.keyboard.type("Test Group", { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		console.log(`✅ Typed Group Type`);

		/// Topic
		const topicInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[3]/div/div/label[2]/div/div/div[1]/div[2]/input"
		);
		await topicInput.waitFor({ state: "visible", timeout: 10000 });
		await topicInput.click({ force: true }); // focus field
		await page.keyboard.type("topic_title_002", { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		console.log(`✅ Typed Group Type`);

		/// learning_Objectives_Input
		const learning_Objectives_Input = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[3]/div/div/label[3]/div/div/div[1]/div[2]/input"
		);
		await learning_Objectives_Input.waitFor({
			state: "visible",
			timeout: 10000,
		});
		await learning_Objectives_Input.click({ force: true }); // focus field
		await page.keyboard.type("test_LO_003", { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		console.log(`✅ Typed Group Type`);

		/// schedule
		const schedule_Date_Time_Input = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[4]/div/label[1]/div/div/input"
		);
		console.log("Date and Time", schedule_Date_Time_Input);
		const isVisible = await schedule_Date_Time_Input.isVisible();
		console.log("Is visible:", isVisible);

		const isEnabled = await schedule_Date_Time_Input.isEnabled();
		console.log("Is enabled:", isEnabled);

		await schedule_Date_Time_Input.waitFor({
			state: "visible",
			timeout: 10000,
		});
		await schedule_Date_Time_Input.scrollIntoViewIfNeeded(); // 🔧 FIX: Scroll date field into view
		await schedule_Date_Time_Input.click({ force: true }); // focus field
		// Step 1️⃣ Type the date (e.g. "06-11-2025")
		await page.keyboard.type(`${assignment.startDate}`, { delay: 30 });

		// // Step 2️⃣ Add a space
		await page.keyboard.press("Tab");

		// Step 3️⃣ Type the time (e.g. "08:00 PM")
		await page.keyboard.type(assignment.startTime, { delay: 30 });
		const actualValue = await schedule_Date_Time_Input.inputValue();
		console.log("Actual input value (browser):", actualValue);

		// Step 4️⃣ Confirm
		await page.keyboard.press("Enter");

		console.log(
			`✅ Schedule entered: ${assignment.startDate} ${assignment.startTime}`
		);
		/// end date time

		const end_Date_Time_Input = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[4]/div/label[2]/div/div/input"
		);
		await end_Date_Time_Input.waitFor({
			state: "visible",
			timeout: 10000,
		});
		await end_Date_Time_Input.scrollIntoViewIfNeeded(); // 🔧 FIX: Scroll date field into view
		await end_Date_Time_Input.click({ force: true }); // focus field
		// Step 1️⃣ Type the date (e.g. "06-11-2025")
		await page.keyboard.type(`${assignment.endDate}`, { delay: 30 });

		// // Step 2️⃣ Add a space
		await page.keyboard.press("Tab");

		// Step 3️⃣ Type the time (e.g. "08:00 PM")
		await page.keyboard.type(assignment.endTime, { delay: 30 });

		// 🔧 Handle Show Score checkbox based on showScore column value
		if (assignment.showScore && assignment.showScore.toLowerCase() === "yes") {
			try {
				const showScoreCheckbox = page.locator('label:has-text("Show Score")');
				await showScoreCheckbox.waitFor({ state: "visible", timeout: 5000 });
				await showScoreCheckbox.click();
				console.log("✅ Show Score checkbox checked");
			} catch (err) {
				console.log("⚠️ Show Score checkbox not found or already checked, continuing...");
			}
		} else {
			console.log("ℹ️ Show Score checkbox: skipped (value not 'yes')");
		}

		console.log("📚 now it will hit the create button");
		const createButton = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[1]/div/button"
		);
		await createButton.scrollIntoViewIfNeeded();
		await createButton.waitFor({ state: "visible", timeout: 3000 });
		await page.waitForTimeout(500);
		console.log({ createButton }, "this is the create button");
		await createButton.click();
		console.log("button hitttttt!!!!!!!!!!!!!!!!!!!");

		console.log(
			`✅ Schedule will end at: ${assignment.endDate} ${assignment.endTime}`
		);
		return "Done";
	} catch (err) {
		console.error(
			`❌ Error while creating assignment '${assignment.title}':`,
			err.message
		);
		return "Error";
	}
}
