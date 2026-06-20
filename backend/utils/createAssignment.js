import { emitProgress, LogType } from "./progressEmitter.js";

export async function createAssignment(page, assignment, sessionId) {
	// Helper function to log and emit progress
	const logStep = (message, type = LogType.STEP) => {
		console.log(message);
		if (sessionId) {
			emitProgress(sessionId, {
				type: "log",
				logType: type,
				message: message,
			});
		}
	};

	// Helper function to create detailed error messages
	const createErrorMessage = (fieldName, fieldValue, errorDetails) => {
		return `Failed at field: "${fieldName}"\nValue: "${fieldValue}"\nReason: ${errorDetails}`;
	};

	const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	try {
		logStep(`🚀 Creating assignment: ${assignment.title}`);

		// 1️⃣ Go to assignments page
		try {
			await page.goto("https://experience-admin.masaischool.com/assignment/", {
				waitUntil: "domcontentloaded",
				timeout: 60000,
			});
			logStep("📄 Navigated to Assignment Page");
		} catch (err) {
			return {
				status: "Error",
				error:
					"Failed to navigate to Assignment page. Please check your internet connection.",
			};
		}

		// 🔧 FIX: Set page zoom to 80% to ensure datetime-local inputs work correctly
		await page.evaluate(() => {
			document.body.style.zoom = "0.8";
		});
		logStep("🔍 Page zoom set to 80%");

		// 2️⃣ Click the "CREATE ASSIGNMENT" button
		const createBtn = page.locator('button:has-text("CREATE ASSIGNMENT")');
		await createBtn.waitFor({ state: "visible", timeout: 10000 });
		await page.waitForTimeout(1000);
		await createBtn.click({ force: true });
		logStep("🖱️ Clicked on 'CREATE ASSIGNMENT' button");

		// 3️⃣ Wait for title input and fill it
		const titleInput = page.locator('input[placeholder="Enter Title"]');
		await titleInput.waitFor({ state: "visible", timeout: 10000 });
		await titleInput.fill(assignment.title);
		logStep(`✏️ Filled title: ${assignment.title}`);

		// 4️⃣ Fill Type (custom select using XPath) - Assignment/Practice/Evaluation
		const typeInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[1]/div/label[1]/div/div/div[1]/div[2]/input",
		);
		await typeInput.waitFor({ state: "visible", timeout: 10000 });
		await typeInput.click({ force: true }); // focus field
		await typeInput.fill(assignment.type, { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		logStep(`✅ Selected Type: ${assignment.type}`);

		////  category - dsa/coding
		const categoryInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[1]/div/label[2]/div/div/div[1]/div[2]/input",
		);
		await categoryInput.waitFor({ state: "visible", timeout: 10000 });
		await categoryInput.click({ force: true }); // focus field
		await categoryInput.fill(assignment.category, { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		logStep(`✅ Selected category: ${assignment.category}`);

		//// module
		const moduleInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[1]/div/label[3]/div/div/div[1]/div[2]/input",
		);
		await moduleInput.waitFor({ state: "visible", timeout: 10000 });
		await moduleInput.click({ force: true }); // focus field
		await moduleInput.fill(assignment.module, { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		logStep(`✅ Selected module: ${assignment.module}`);

		////  tags
		const tagsInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[1]/div/label[4]/div/div/div[1]/div/input",
		);
		await tagsInput.waitFor({ state: "visible", timeout: 10000 });
		await tagsInput.click({ force: true }); // focus field
		await tagsInput.fill(assignment.tags, { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		// TEMP FIX: Tags input traps Tab/keyboard navigation.
		// Workaround: Shift+Tab back to module, then Tab twice to skip past tags to platforms.
		await page.waitForTimeout(500);
		await page.keyboard.press("Shift+Tab");
		await page.waitForTimeout(300);
		await page.keyboard.press("Tab");
		await page.waitForTimeout(300);
		await page.keyboard.press("Tab");
		await page.waitForTimeout(500);
		logStep(`✅ Selected tags: ${assignment.tags}`);

		// platforms - LMS/Assess etc
		const platformsInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[1]/div/label[5]/div/div/div[1]/div[2]/input",
		);
		await platformsInput.waitFor({ state: "visible", timeout: 10000 });
		await platformsInput.click({ force: true });
		await platformsInput.fill(assignment.platforms, { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		await page.waitForTimeout(800);
		logStep(`✅ Selected platforms: ${assignment.platforms}`);

		//platforms clients - Masai LMS, Masai One, Interview Production etc
		const clientsInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[1]/div/label[6]/div/div/div[1]/div[2]/input",
		);
		await clientsInput.waitFor({ state: "visible", timeout: 10000 });
		await clientsInput.click({ force: true }); // focus field
		await clientsInput.fill(assignment.assess_client, { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		logStep(`✅ Selected client: ${assignment.assess_client}`);

		//  🧩 Select Assessment Template (Modal Flow)
		try {
			const templateInput = page.locator(
				'input[placeholder="Enter Assessment Template"]',
			);
			await templateInput.waitFor({ state: "visible", timeout: 10000 });
			await templateInput.click({ force: true });
			logStep(
				"🖱️ Clicked 'Enter Assessment Template' input — modal should open",
			);
			await page.waitForTimeout(2000);

			// Find and type into the search input inside the modal
			const modalSearchInput = page.locator(
				'input[placeholder="Search by title"]',
			);
			await modalSearchInput.waitFor({ state: "visible", timeout: 10000 });
			await modalSearchInput.fill(assignment.assessment_template_name);
			logStep(
				`🔍 Searching for template: ${assignment.assessment_template_name}`,
			);

			// Wait a moment for table results to load
			await page.waitForTimeout(2000);

			// Check if any results exist
			const firstCheckbox = page
				.locator('table tbody tr:first-child td input[type="checkbox"]')
				.first();

			const checkboxExists = await firstCheckbox.count();
			if (checkboxExists === 0) {
				throw new Error(
					`No assessment template found with this name in the search results.`,
				);
			}

			await firstCheckbox.waitFor({ state: "visible", timeout: 10000 });
			await page.waitForTimeout(1000);
			await firstCheckbox.click({ force: true });
			logStep(`✅ Selected first assessment result for: ${assignment.title}`);

			// Wait for modal to close
			await page.waitForSelector('div[role="dialog"]', {
				state: "detached",
				timeout: 10000,
			});
			logStep("🪄 Modal closed successfully");
		} catch (err) {
			return {
				status: "Error",
				error: createErrorMessage(
					"Assessment Template",
					assignment.assessment_template_name,
					"Assessment template not found in the system. Please verify the template exists and the name matches exactly.",
				),
			};
		}
		//// modal end

		/// enter batch
		try {
			const batchInput = page.locator(
				"xpath=/html/body/div/div/div/main/form/div[2]/div[2]/div/label[1]/div/div/div[1]/div[2]/input",
			);
			await batchInput.waitFor({ state: "visible", timeout: 10000 });
			await batchInput.click({ force: true }); // focus field
			await batchInput.fill(assignment.batch, { delay: 30 });
			await page.waitForTimeout(1000);

			// 🔧 FIX: Click exact match from dropdown instead of pressing Enter
			const batchOption = page
				.locator(`div[class*="option"]`)
				.filter({ hasText: new RegExp(`^${escapeRegex(assignment.batch)}$`) });
			const batchOptionExists = await batchOption.count();

			if (batchOptionExists === 0) {
				throw new Error(
					`No matching option found in dropdown for the batch name provided.`,
				);
			}

			await batchOption.first().click({ timeout: 5000 });
			logStep(`✅ Selected batch: ${assignment.batch}`);
		} catch (err) {
			return {
				status: "Error",
				error: createErrorMessage(
					"Batch",
					assignment.batch,
					"Batch name not found in the system. Please verify the batch exists and the name matches exactly.",
				),
			};
		}

		// section -
		try {
			const sectionInput = page.locator(
				"xpath=/html/body/div/div/div/main/form/div[2]/div[2]/div/label[2]/div/div/div[1]/div[2]/input",
			);
			await sectionInput.waitFor({ state: "visible", timeout: 10000 });
			await sectionInput.click({ force: true }); // focus field
			await sectionInput.fill(assignment.section, { delay: 30 });
			await page.waitForTimeout(1000);

			// 🔧 FIX: Click exact match from dropdown instead of pressing Enter
			const sectionOption = page
				.locator(`div[class*="option"]`)
				.filter({ hasText: new RegExp(`^${escapeRegex(assignment.section)}$`) });
			const sectionOptionExists = await sectionOption.count();

			if (sectionOptionExists === 0) {
				throw new Error(
					`No matching option found in dropdown for the section name provided.`,
				);
			}

			await sectionOption.first().click({ timeout: 5000 });
			logStep(`✅ Selected section: ${assignment.section}`);
		} catch (err) {
			return {
				status: "Error",
				error: createErrorMessage(
					"Section",
					assignment.section,
					"Section name not found in the system. Please verify the section exists and the name matches exactly.",
				),
			};
		}

		// associated lectures - OPTIONAL FIELD
		if (
			assignment.associated_lecture &&
			assignment.associated_lecture.trim() !== "" &&
			assignment.associated_lecture !== "N/A"
		) {
			try {
				const associatedLecturesInput = page.locator(
					"xpath=/html/body/div/div/div/main/form/div[2]/div[2]/div/label[3]/div/div/div[1]/div[2]/input",
				);
				await associatedLecturesInput.waitFor({
					state: "visible",
					timeout: 10000,
				});
				await associatedLecturesInput.click({ force: true }); // focus field
				await page.keyboard.type(assignment.associated_lecture, { delay: 30 });
				// 🔧 FIX: Increased wait time for dropdown to fully load
				await page.waitForTimeout(3000);

				// 🔧 FIX: Use contains text match instead of exact regex (more reliable)
				const lectureOption = page
					.locator(`div[class*="option"]`)
					.filter({ hasText: assignment.associated_lecture });
				const lectureOptionExists = await lectureOption.count();

				if (lectureOptionExists === 0) {
					throw new Error(
						`No matching option found in dropdown for the lecture name provided.`,
					);
				}

				// 🔧 FIX: Wait for option to be stable and use keyboard selection as fallback
				await page.waitForTimeout(500);

				try {
					// Try clicking directly first
					await lectureOption.first().click({ timeout: 3000 });
				} catch (clickErr) {
					// Fallback: Use keyboard to select
					logStep("⚠️ Click failed, using keyboard selection...");
					await page.keyboard.press("ArrowDown");
					await page.waitForTimeout(300);
					await page.keyboard.press("Enter");
				}
				logStep(
					`✅ Selected associated lectures: ${assignment.associated_lecture}`,
				);
			} catch (err) {
				return {
					status: "Error",
					error: createErrorMessage(
						"Associated Lecture",
						assignment.associated_lecture,
						"Lecture name not found in the system. Please verify the lecture exists and the name matches exactly.",
					),
				};
			}
		} else {
			logStep("ℹ️ Associated Lecture field is empty, skipping...");
		}

		//// Group Type
		const groupTypeInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[3]/div/div/label[1]/div/div/div[1]/div[2]/input",
		);
		await groupTypeInput.waitFor({ state: "visible", timeout: 10000 });
		await groupTypeInput.click({ force: true }); // focus field
		await page.keyboard.type("Test Group", { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		logStep(`✅ Typed Group Type`);

		/// Topic
		const topicInput = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[3]/div/div/label[2]/div/div/div[1]/div[2]/input",
		);
		await topicInput.waitFor({ state: "visible", timeout: 10000 });
		await topicInput.click({ force: true }); // focus field
		await page.keyboard.type("topic_title_002", { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		logStep(`✅ Typed Group Type`);

		/// learning_Objectives_Input
		const learning_Objectives_Input = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[3]/div/div/label[3]/div/div/div[1]/div[2]/input",
		);
		await learning_Objectives_Input.waitFor({
			state: "visible",
			timeout: 10000,
		});
		await learning_Objectives_Input.click({ force: true }); // focus field
		await page.keyboard.type("test_LO_003", { delay: 30 });
		await page.waitForTimeout(1000);
		await page.keyboard.press("Enter");
		logStep(`✅ Typed Group Type`);

		/// schedule
		const schedule_Date_Time_Input = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[4]/div/label[1]/div/div/input",
		);
		// Debug logs (console only, not sent to frontend)
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

		logStep(
			`✅ Schedule entered: ${assignment.startDate} ${assignment.startTime}`,
		);
		/// end date time

		const end_Date_Time_Input = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[2]/div[4]/div/label[2]/div/div/input",
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
				logStep("✅ Show Score checkbox checked");
			} catch (err) {
				logStep(
					"⚠️ Show Score checkbox not found or already checked, continuing...",
				);
			}
		} else {
			logStep("ℹ️ Show Score checkbox: skipped (value not 'yes')");
		}

		// 🔧 Handle Mandatory checkbox — checked by default, uncheck only when isMandatory === "no"
		if (assignment.isMandatory && assignment.isMandatory.toLowerCase() === "no") {
			try {
				const mandatoryCheckbox = page.locator('label:has-text("Mandatory")');
				await mandatoryCheckbox.waitFor({ state: "visible", timeout: 5000 });
				await mandatoryCheckbox.click();
				logStep("✅ Mandatory checkbox unchecked (isMandatory = no)");
			} catch (err) {
				logStep("⚠️ Mandatory checkbox not found or could not be unchecked, continuing...");
			}
		} else {
			logStep("ℹ️ Mandatory checkbox: left checked (default behaviour)");
		}

		// 🔧 Handle Instruction/Notes field - OPTIONAL
		if (assignment.instruction && assignment.instruction.trim() !== "") {
			try {
				// Try multiple selectors for the instruction field (rich text editor)
				let instructionFilled = false;

				// Approach 1: Try the specific xpath for textarea
				try {
					const instructionTextarea = page.locator(
						"xpath=/html/body/div/div/div/main/form/div[4]/div/div[2]/div[1]/div/textarea",
					);
					const exists = await instructionTextarea.count();
					if (exists > 0) {
						await instructionTextarea.scrollIntoViewIfNeeded();
						await instructionTextarea.click({ force: true });
						await instructionTextarea.fill(assignment.instruction);
						instructionFilled = true;
						logStep(`✅ Filled instruction (textarea): ${assignment.instruction.substring(0, 50)}...`);
					}
				} catch (e) {
					console.log("Textarea approach failed, trying alternatives...");
				}

				// Approach 2: Try contenteditable div (rich text editor)
				if (!instructionFilled) {
					try {
						const editorDiv = page.locator('div[contenteditable="true"]').first();
						const exists = await editorDiv.count();
						if (exists > 0) {
							await editorDiv.scrollIntoViewIfNeeded();
							await editorDiv.click({ force: true });
							await page.keyboard.type(assignment.instruction, { delay: 10 });
							instructionFilled = true;
							logStep(`✅ Filled instruction (editor): ${assignment.instruction.substring(0, 50)}...`);
						}
					} catch (e) {
						console.log("Contenteditable approach failed, trying alternatives...");
					}
				}

				// Approach 3: Try any textarea in the form's instruction area
				if (!instructionFilled) {
					try {
						const anyTextarea = page.locator('form textarea').first();
						const exists = await anyTextarea.count();
						if (exists > 0) {
							await anyTextarea.scrollIntoViewIfNeeded();
							await anyTextarea.click({ force: true });
							await anyTextarea.fill(assignment.instruction);
							instructionFilled = true;
							logStep(`✅ Filled instruction (fallback): ${assignment.instruction.substring(0, 50)}...`);
						}
					} catch (e) {
						console.log("Fallback textarea approach failed");
					}
				}

				if (!instructionFilled) {
					logStep("⚠️ Instruction field not found on page, continuing...");
				}
			} catch (err) {
				logStep("⚠️ Instruction field error, continuing...");
			}
		} else {
			logStep("ℹ️ Instruction field is empty, skipping...");
		}

		logStep("📚 now it will hit the create button");
		const createButton = page.locator(
			"xpath=/html/body/div/div/div/main/form/div[1]/div/button",
		);
		await createButton.scrollIntoViewIfNeeded();
		await createButton.waitFor({ state: "visible", timeout: 3000 });
		await page.waitForTimeout(500);
		console.log({ createButton }, "this is the create button");
		await createButton.click();
		logStep("📤 CREATE button clicked, waiting for response...");

		// 🔧 FIX: Wait to verify assignment was actually created
		try {
			// Wait for navigation or success indicator (adjust timeout as needed)
			await page.waitForTimeout(3000);

			// Check if still on the create form (indicates failure)
			const stillOnForm = await page
				.locator('input[placeholder="Enter Title"]')
				.isVisible()
				.catch(() => false);

			if (stillOnForm) {
				console.error("❌ Assignment creation failed - still on form page");
				return {
					status: "Error",
					error:
						"Assignment creation failed - remained on form after submission. Possible validation error or network issue.",
				};
			}

			logStep(`✅ Assignment created successfully: ${assignment.title}`);
			return { status: "Done", error: "" };
		} catch (err) {
			console.error(`❌ Error verifying assignment creation: ${err.message}`);
			return { status: "Error", error: `Verification failed: ${err.message}` };
		}
	} catch (err) {
		console.error(
			`❌ Error while creating assignment '${assignment.title}':`,
			err.message,
		);
		return {
			status: "Error",
			error: `Assignment creation failed: ${err.message}`,
		};
	}
}
