/**
 * Validation utility for LMS Automation data
 *
 * Validates assignment and lecture data before processing
 * Returns detailed validation errors for each row
 */

/**
 * Validates date format (DD/MM/YYYY or MM/DD/YYYY or YYYY-MM-DD)
 */
function isValidDate(dateString) {
  if (!dateString || dateString === "N/A" || dateString.trim() === "") {
    return false;
  }

  // Try parsing different date formats
  const formats = [
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,  // DD/MM/YYYY or MM/DD/YYYY with slashes
    /^\d{1,2}-\d{1,2}-\d{4}$/,    // DD-MM-YYYY or MM-DD-YYYY with hyphens
    /^\d{4}-\d{2}-\d{2}$/,         // YYYY-MM-DD
  ];

  const matchesFormat = formats.some(format => format.test(dateString.trim()));
  if (!matchesFormat) return false;

  // Try to create a date object to verify it's a real date
  const parts = dateString.includes('-')
    ? dateString.split('-')
    : dateString.split('/');

  let year, month, day;
  if (parts[0].length === 4) {
    // YYYY-MM-DD format
    [year, month, day] = parts;
  } else {
    // DD/MM/YYYY or DD-MM-YYYY format
    [day, month, year] = parts;
  }

  const date = new Date(year, month - 1, day);
  return date.getFullYear() == year &&
         date.getMonth() == month - 1 &&
         date.getDate() == day;
}

/**
 * Validates time format (HH:MM in 24-hour format)
 */
function isValidTime(timeString) {
  if (!timeString || timeString === "N/A" || timeString.trim() === "") {
    return false;
  }

  // Accept both : and - as separators (18:55 or 18-55)
  const timeRegex = /^([01]?[0-9]|2[0-3])[:|-][0-5][0-9]$/;
  const isValid = timeRegex.test(timeString.trim());

  return isValid;
}

/**
 * Parses date and time strings into a Date object
 */
function parseDateTime(dateString, timeString) {
  const parts = dateString.includes('-')
    ? dateString.split('-')
    : dateString.split('/');

  let year, month, day;
  if (parts[0].length === 4) {
    // YYYY-MM-DD format
    [year, month, day] = parts;
  } else {
    // DD/MM/YYYY or DD-MM-YYYY format
    [day, month, year] = parts;
  }

  const [hour, minute] = timeString.split(/[:-]/).map(Number);

  return new Date(year, month - 1, day, hour, minute, 0);
}

/**
 * Validates that end date/time is after start date/time
 */
function isEndAfterStart(startDate, startTime, endDate, endTime) {
  try {
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return false;
    }
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return false;
    }

    // Parse dates
    const parseDate = (dateStr) => {
      const parts = dateStr.includes('-')
        ? dateStr.split('-')
        : dateStr.split('/');

      let year, month, day;
      if (parts[0].length === 4) {
        // YYYY-MM-DD format
        [year, month, day] = parts;
      } else {
        // DD/MM/YYYY or DD-MM-YYYY format
        [day, month, year] = parts;
      }

      return new Date(year, month - 1, day);
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // Parse times (handle both : and - separators)
    const [startHour, startMin] = startTime.split(/[:-]/).map(Number);
    const [endHour, endMin] = endTime.split(/[:-]/).map(Number);

    start.setHours(startHour, startMin);
    end.setHours(endHour, endMin);

    return end > start;
  } catch {
    return false;
  }
}

/**
 * Validates assignment data
 * Returns { valid: boolean, errors: string[] }
 */
export function validateAssignment(assignment, rowIndex) {
  const errors = [];

  // Required fields
  if (!assignment.title || assignment.title.trim() === "") {
    errors.push("Title is required");
  }

  if (!assignment.type || assignment.type.trim() === "") {
    errors.push("Type is required (Assignment/Practice/Evaluation)");
  }

  if (!assignment.category || assignment.category.trim() === "") {
    errors.push("Category is required (DSA/Coding/etc.)");
  }

  if (!assignment.tags || assignment.tags.trim() === "") {
    errors.push("Tags are required");
  }

  if (!assignment.platforms || assignment.platforms.trim() === "") {
    errors.push("Platform is required (LMS/Assess/etc.)");
  }

  if (!assignment.assess_client || assignment.assess_client.trim() === "") {
    errors.push("Client is required (Masai LMS/Masai One/etc.)");
  }

  if (!assignment.assessment_template_name || assignment.assessment_template_name.trim() === "") {
    errors.push("Assessment Template Name is required");
  }

  if (!assignment.batch || assignment.batch.trim() === "") {
    errors.push("Batch is required");
  }

  if (!assignment.section || assignment.section.trim() === "") {
    errors.push("Section is required");
  }

  // Skip date/time validations if assignment is already created
  const isAlreadyCreated = assignment.isAssignmentCreated &&
                           assignment.isAssignmentCreated.toLowerCase() === "yes";

  if (!isAlreadyCreated) {
    // Date and time validation
    if (!isValidDate(assignment.startDate)) {
      errors.push("Start Date is invalid or missing (use DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD)");
    }

    if (!isValidTime(assignment.startTime)) {
      errors.push("Start Time is invalid or missing (use HH:MM in 24-hour format)");
    }

    if (!isValidDate(assignment.endDate)) {
      errors.push("End Date is invalid or missing (use DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD)");
    }

    if (!isValidTime(assignment.endTime)) {
      errors.push("End Time is invalid or missing (use HH:MM in 24-hour format)");
    }

    // Validate end is after start
    if (isValidDate(assignment.startDate) && isValidTime(assignment.startTime) &&
        isValidDate(assignment.endDate) && isValidTime(assignment.endTime)) {
      if (!isEndAfterStart(assignment.startDate, assignment.startTime, assignment.endDate, assignment.endTime)) {
        errors.push("End Date/Time must be after Start Date/Time");
      }
    }

    // Validate schedule date/time is not in the past
    if (isValidDate(assignment.startDate) && isValidTime(assignment.startTime)) {
      const scheduleDateTime = parseDateTime(assignment.startDate, assignment.startTime);
      const now = new Date();

      if (scheduleDateTime < now) {
        const diff = Math.floor((now - scheduleDateTime) / 60000); // difference in minutes
        errors.push(`Schedule Date/Time is ${diff} minute(s) in the past. Must be current time or future.`);
      }
    }

    // Validate conclude date/time constraints
    if (isValidDate(assignment.startDate) && isValidTime(assignment.startTime) &&
        isValidDate(assignment.endDate) && isValidTime(assignment.endTime)) {

      const scheduleDate = assignment.startDate.split(/[-/]/);
      const endDate = assignment.endDate.split(/[-/]/);

      // Normalize dates for comparison
      const schedDay = scheduleDate[0].length === 4 ? scheduleDate[2] : scheduleDate[0];
      const schedMonth = scheduleDate[0].length === 4 ? scheduleDate[1] : scheduleDate[1];
      const schedYear = scheduleDate[0].length === 4 ? scheduleDate[0] : scheduleDate[2];

      const endDay = endDate[0].length === 4 ? endDate[2] : endDate[0];
      const endMonth = endDate[0].length === 4 ? endDate[1] : endDate[1];
      const endYear = endDate[0].length === 4 ? endDate[0] : endDate[2];

      // If both dates are same, conclude time must be after schedule time
      if (schedDay === endDay && schedMonth === endMonth && schedYear === endYear) {
        const [schedHour, schedMin] = assignment.startTime.split(/[:-]/).map(Number);
        const [endHour, endMin] = assignment.endTime.split(/[:-]/).map(Number);

        const schedMinutes = schedHour * 60 + schedMin;
        const endMinutes = endHour * 60 + endMin;

        if (endMinutes <= schedMinutes) {
          errors.push("When Schedule and Conclude dates are same, Conclude time must be after Schedule time");
        }
      }
    }
  }

  // Show Score validation (optional but if provided should be yes/no)
  if (assignment.showScore &&
      assignment.showScore.trim() !== "" &&
      !["yes", "no"].includes(assignment.showScore.toLowerCase())) {
    errors.push("Show Score must be 'yes' or 'no'");
  }

  return {
    valid: errors.length === 0,
    errors,
    rowIndex
  };
}

/**
 * Validates lecture data
 * Returns { valid: boolean, errors: string[] }
 */
export function validateLecture(lecture, rowIndex) {
  const errors = [];

  // Required fields
  if (!lecture.title || lecture.title.trim() === "") {
    errors.push("Title is required");
  }

  if (!lecture.type || lecture.type.trim() === "") {
    errors.push("Type is required (Lecture/Tutorial/etc.)");
  }

  if (!lecture.category || lecture.category.trim() === "") {
    errors.push("Category is required (DSA/Coding/etc.)");
  }

  if (!lecture.tags || lecture.tags.trim() === "") {
    errors.push("Tags are required");
  }

  if (!lecture.host_name || lecture.host_name.trim() === "") {
    errors.push("Host Name is required");
  }

  if (!lecture.batch || lecture.batch.trim() === "") {
    errors.push("Batch is required");
  }

  if (!lecture.section || lecture.section.trim() === "") {
    errors.push("Section is required");
  }

  // Skip date/time validations if lecture is already created
  const isAlreadyCreated = lecture.isLectureCreated &&
                           lecture.isLectureCreated.toLowerCase() === "yes";

  if (!isAlreadyCreated) {
    // Date and time validation
    if (!isValidDate(lecture.startDate)) {
      errors.push("Start Date is invalid or missing (use DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD)");
    }

    if (!isValidTime(lecture.startTime)) {
      errors.push("Start Time is invalid or missing (use HH:MM in 24-hour format)");
    }

    // Validate schedule date/time is not in the past
    if (isValidDate(lecture.startDate) && isValidTime(lecture.startTime)) {
      const scheduleDateTime = parseDateTime(lecture.startDate, lecture.startTime);
      const now = new Date();

      if (scheduleDateTime < now) {
        const diff = Math.floor((now - scheduleDateTime) / 60000); // difference in minutes
        errors.push(`Schedule Date/Time is ${diff} minute(s) in the past. Must be current time or future.`);
      }
    }
  }

  // Zoom link validation - REMOVED (not mandatory, can be any value)

  return {
    valid: errors.length === 0,
    errors,
    rowIndex
  };
}

/**
 * Validates all assignments in a batch
 * Returns { valid: boolean, totalRows: number, validRows: number, invalidRows: ValidationError[] }
 */
export function validateAssignmentsBatch(assignments) {
  const results = assignments.map((assignment, index) => {
    const rowIndex = assignment.rowIndex || index + 2; // +2 for header and 1-indexing
    const validation = validateAssignment(assignment, rowIndex);
    return {
      ...validation,
      rowIndex,
      title: assignment.title || "Untitled"
    };
  });

  const invalidRows = results.filter(r => !r.valid);
  const validRows = results.filter(r => r.valid);

  return {
    valid: invalidRows.length === 0,
    totalRows: assignments.length,
    validRows: validRows.length,
    invalidRows: invalidRows.map(r => ({
      rowIndex: r.rowIndex,
      title: r.title,
      errors: r.errors
    }))
  };
}

/**
 * Validates a single notes row
 * Returns { valid: boolean, errors: string[] }
 */
export function validateNote(note, rowIndex) {
  const errors = [];

  if (!note.title || note.title.trim() === "") {
    errors.push("Title is required");
  }

  if (!note.batch || note.batch.trim() === "") {
    errors.push("Batch is required");
  }

  if (!note.section || note.section.trim() === "") {
    errors.push("Section is required");
  }

  if (!note.notes || note.notes.trim() === "") {
    errors.push("Notes content is required");
  }

  // lecture_id is optional — no validation needed

  return {
    valid: errors.length === 0,
    errors,
    rowIndex
  };
}

/**
 * Validates all notes rows in a batch
 * Returns { valid: boolean, totalRows: number, validRows: number, invalidRows: ValidationError[] }
 */
export function validateNotesBatch(notes) {
  const results = notes.map((note, index) => {
    const rowIndex = note.rowIndex || index + 2;
    const validation = validateNote(note, rowIndex);
    return {
      ...validation,
      rowIndex,
      title: note.title || "Untitled"
    };
  });

  const invalidRows = results.filter(r => !r.valid);
  const validRows = results.filter(r => r.valid);

  return {
    valid: invalidRows.length === 0,
    totalRows: notes.length,
    validRows: validRows.length,
    invalidRows: invalidRows.map(r => ({
      rowIndex: r.rowIndex,
      title: r.title,
      errors: r.errors
    }))
  };
}

/**
 * Validates all lectures in a batch
 * Returns { valid: boolean, totalRows: number, validRows: number, invalidRows: ValidationError[] }
 */
export function validateLecturesBatch(lectures) {
  const results = lectures.map((lecture, index) => {
    const rowIndex = lecture.rowIndex || index + 2; // +2 for header and 1-indexing
    const validation = validateLecture(lecture, rowIndex);
    return {
      ...validation,
      rowIndex,
      title: lecture.title || "Untitled"
    };
  });

  const invalidRows = results.filter(r => !r.valid);
  const validRows = results.filter(r => r.valid);

  return {
    valid: invalidRows.length === 0,
    totalRows: lectures.length,
    validRows: validRows.length,
    invalidRows: invalidRows.map(r => ({
      rowIndex: r.rowIndex,
      title: r.title,
      errors: r.errors
    }))
  };
}

/**
 * Validates a single clone row
 * Returns { valid: boolean, errors: string[] }
 */
export function validateCloneRow(row, rowIndex) {
  const errors = [];

  if (!row.source_lecture_id || String(row.source_lecture_id).trim() === "") {
    errors.push("source_lecture_id is required");
  }

  if (!row.target_batch || row.target_batch.trim() === "") {
    errors.push("target_batch is required");
  }

  if (!row.target_section || row.target_section.trim() === "") {
    errors.push("target_section is required");
  }

  if (!isValidDate(row.startDate)) {
    errors.push("Start Date is invalid or missing (use DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD)");
  }

  if (!isValidTime(row.startTime)) {
    errors.push("Start Time is invalid or missing (use HH:MM in 24-hour format)");
  }

  if (!isValidDate(row.endDate)) {
    errors.push("End Date is invalid or missing (use DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD)");
  }

  if (!isValidTime(row.endTime)) {
    errors.push("End Time is invalid or missing (use HH:MM in 24-hour format)");
  }

  if (isValidDate(row.startDate) && isValidTime(row.startTime) &&
      isValidDate(row.endDate) && isValidTime(row.endTime)) {
    if (!isEndAfterStart(row.startDate, row.startTime, row.endDate, row.endTime)) {
      errors.push("End Date/Time must be after Start Date/Time");
    }
  }

  if (isValidDate(row.startDate) && isValidTime(row.startTime)) {
    const scheduleDateTime = parseDateTime(row.startDate, row.startTime);
    const now = new Date();
    if (scheduleDateTime < now) {
      const diff = Math.floor((now - scheduleDateTime) / 60000);
      errors.push(`Schedule Date/Time is ${diff} minute(s) in the past. Must be current time or future.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    rowIndex
  };
}

/**
 * Validates all clone rows in a batch
 * Returns { valid: boolean, totalRows: number, validRows: number, invalidRows: ValidationError[] }
 */
export function validateCloneBatch(rows) {
  const results = rows.map((row, index) => {
    const rowIndex = row.rowIndex || index + 2;
    const validation = validateCloneRow(row, rowIndex);
    return {
      ...validation,
      rowIndex,
      title: row.source_lecture_title || row.source_lecture_id || `Row ${rowIndex}`
    };
  });

  const invalidRows = results.filter(r => !r.valid);
  const validRows = results.filter(r => r.valid);

  return {
    valid: invalidRows.length === 0,
    totalRows: rows.length,
    validRows: validRows.length,
    invalidRows: invalidRows.map(r => ({
      rowIndex: r.rowIndex,
      title: r.title,
      errors: r.errors
    }))
  };
}

/**
 * Validates a single assignment clone row
 * Returns { valid: boolean, errors: string[] }
 */
export function validateAssignmentCloneRow(row, rowIndex) {
  const errors = [];

  if (!row.source_assignment_id || String(row.source_assignment_id).trim() === "") {
    errors.push("source_assignment_id is required");
  }

  if (!row.target_batch || row.target_batch.trim() === "") {
    errors.push("target_batch is required");
  }

  if (!row.target_section || row.target_section.trim() === "") {
    errors.push("target_section is required");
  }

  if (!isValidDate(row.startDate)) {
    errors.push("Start Date is invalid or missing (use DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD)");
  }

  if (!isValidTime(row.startTime)) {
    errors.push("Start Time is invalid or missing (use HH:MM in 24-hour format)");
  }

  if (!isValidDate(row.endDate)) {
    errors.push("End Date is invalid or missing (use DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD)");
  }

  if (!isValidTime(row.endTime)) {
    errors.push("End Time is invalid or missing (use HH:MM in 24-hour format)");
  }

  if (isValidDate(row.startDate) && isValidTime(row.startTime) &&
      isValidDate(row.endDate) && isValidTime(row.endTime)) {
    if (!isEndAfterStart(row.startDate, row.startTime, row.endDate, row.endTime)) {
      errors.push("End Date/Time must be after Start Date/Time");
    }
  }

  if (isValidDate(row.startDate) && isValidTime(row.startTime)) {
    const scheduleDateTime = parseDateTime(row.startDate, row.startTime);
    const now = new Date();
    if (scheduleDateTime < now) {
      const diff = Math.floor((now - scheduleDateTime) / 60000);
      errors.push(`Schedule Date/Time is ${diff} minute(s) in the past. Must be current time or future.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    rowIndex
  };
}

/**
 * Validates all assignment clone rows in a batch
 * Returns { valid: boolean, totalRows: number, validRows: number, invalidRows: ValidationError[] }
 */
export function validateAssignmentCloneBatch(rows) {
  const results = rows.map((row, index) => {
    const rowIndex = row.rowIndex || index + 2;
    const validation = validateAssignmentCloneRow(row, rowIndex);
    return {
      ...validation,
      rowIndex,
      title: row.source_assignment_title || row.source_assignment_id || `Row ${rowIndex}`
    };
  });

  const invalidRows = results.filter(r => !r.valid);
  const validRows = results.filter(r => r.valid);

  return {
    valid: invalidRows.length === 0,
    totalRows: rows.length,
    validRows: validRows.length,
    invalidRows: invalidRows.map(r => ({
      rowIndex: r.rowIndex,
      title: r.title,
      errors: r.errors
    }))
  };
}

/**
 * Checks for duplicate titles in the batch
 * Returns array of duplicate groups
 */
export function checkDuplicateTitles(records) {
  const titleMap = new Map();

  records.forEach((record, index) => {
    const title = record.title?.trim().toLowerCase();
    if (title && title !== "") {
      if (!titleMap.has(title)) {
        titleMap.set(title, []);
      }
      titleMap.get(title).push({
        rowIndex: record.rowIndex || index + 2,
        title: record.title
      });
    }
  });

  // Filter to only duplicates (more than 1 occurrence)
  const duplicates = [];
  titleMap.forEach((rows, title) => {
    if (rows.length > 1) {
      duplicates.push({
        title,
        rows: rows.map(r => r.rowIndex),
        count: rows.length
      });
    }
  });

  return duplicates;
}
