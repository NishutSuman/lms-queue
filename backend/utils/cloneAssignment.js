export async function cloneAssignment(page, assignment) {
	try {
		console.log(
			`🚀 Cloning assignment ID ${assignment.source_assignment_id} → ${assignment.target_batch} / ${assignment.target_section}`,
		);

		await page.goto(
			`https://experience-admin.masaischool.com/assignment/copy/?id=${assignment.source_assignment_id}`,
			{ waitUntil: "domcontentloaded", timeout: 60000 },
		);

		await page.waitForSelector(".react-select__control", { timeout: 20000 });
		await page.waitForTimeout(1000);

		// Title update
		if (assignment.target_title && assignment.target_title.trim() !== "") {
			try {
				const titleInput = page
					.locator('input[placeholder="Enter Title"]')
					.first();
				await titleInput.waitFor({ state: "visible", timeout: 5000 });
				await titleInput.fill(assignment.target_title.trim());
			} catch (err) {
				console.log(`⚠️ Title update failed: ${err.message}`);
			}
		}

		const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

		// Dropdown handler
		async function clearAndSelect(labelText, value) {
			const label = page
				.locator("label")
				.filter({ hasText: new RegExp(`^${labelText}`) })
				.first();
			await label.waitFor({ state: "visible", timeout: 15000 });

			const clearBtn = label.locator(".react-select__clear-indicator");
			if ((await clearBtn.count()) > 0) {
				await clearBtn.click();
				await page.waitForTimeout(400);
			}

			const control = label.locator(".react-select__control").first();
			await control.click();
			await page.waitForTimeout(400);

			await page.keyboard.type(value, { delay: 30 });
			await page.waitForTimeout(800);

			// Match option text exactly, allowing an optional " (ID)" suffix the LMS may append
			const option = page
				.locator(".react-select__option")
				.filter({ hasText: new RegExp(`^${escapeRegex(value)}(\\s*\\(\\d+\\))?$`) })
				.first();

			if ((await option.count()) === 0) {
				throw new Error(`"${value}" not found in ${labelText}`);
			}

			await option.click();
			await page.waitForTimeout(300);
		}

		await clearAndSelect("Batch", assignment.target_batch);
		await clearAndSelect("Section", assignment.target_section);

		if (
			assignment.associated_lecture &&
			assignment.associated_lecture.trim() !== ""
		) {
			await clearAndSelect(
				"Associated Lectures",
				assignment.associated_lecture,
			);
		}

		await page.waitForTimeout(500);

		async function clearInputCompletely(input) {
			await input.click({ force: true });

			await input.evaluate((el) => {
				el.value = "";
				el.dispatchEvent(new Event("input", { bubbles: true }));
				el.dispatchEvent(new Event("change", { bubbles: true }));
			});
		}

		async function fillDatePicker(labelPattern, dateVal, timeVal) {
			const label = page
				.locator("label")
				.filter({ hasText: labelPattern })
				.first();
			await label.waitFor({ state: "visible", timeout: 15000 });

			const input = label.locator("input").first();
			await input.waitFor({ state: "visible", timeout: 10000 });
			await input.scrollIntoViewIfNeeded();

			// Step 1: Clear completely
			await clearInputCompletely(input);

			await page.waitForTimeout(300);

			// Step 2: CLICK AGAIN to activate date segment
			await input.click({ force: true });

			// 🔥 CRITICAL: Press ArrowLeft multiple times to reach start (date section)
			for (let i = 0; i < 10; i++) {
				await page.keyboard.press("ArrowLeft");
			}

			// Step 3: Type DATE
			await page.keyboard.type(dateVal, { delay: 30 });

			// Step 4: Move to TIME
			await page.keyboard.press("Tab");

			// Step 5: Type TIME
			await page.keyboard.type(timeVal, { delay: 30 });

			// Step 6: Confirm
			await page.keyboard.press("Tab");
			await page.waitForTimeout(500);

			const finalValue = await input.inputValue();
			console.log(`📅 Final value: ${finalValue}`);
		}

		await fillDatePicker(
			/^Schedule/,
			assignment.startDate,
			assignment.startTime,
		);
		await fillDatePicker(/^Concludes/, assignment.endDate, assignment.endTime);

		await page.waitForTimeout(1000);

		// Submit
		const copyButton = page.locator('button[type="submit"]:has-text("COPY")');
		await copyButton.waitFor({ state: "visible", timeout: 10000 });
		await copyButton.scrollIntoViewIfNeeded();
		await page.waitForTimeout(500);
		await copyButton.click();

		await page.waitForTimeout(3000);

		if (page.url().includes("/assignment/copy/")) {
			return { status: "Error", error: "Validation failed on LMS form" };
		}

		return { status: "Done", error: "" };
	} catch (err) {
		console.error(`❌ Error cloning assignment:`, err.message);
		return { status: "Error", error: err.message };
	}
}
