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
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,  // DD/MM/YYYY or MM/DD/YYYY
    /^\d{4}-\d{2}-\d{2}$/,         // YYYY-MM-DD
  ];

  const matchesFormat = formats.some(format => format.test(dateString.trim()));
  if (!matchesFormat) return false;

  // Try to create a date object to verify it's a real date
  const parts = dateString.includes('-')
    ? dateString.split('-')
    : dateString.split('/');

  let year, month, day;
  if (dateString.includes('-')) {
    [year, month, day] = parts;
  } else {
    // Assume DD/MM/YYYY format
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

  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString.trim());
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
      if (dateStr.includes('-')) {
        return new Date(dateStr);
      }
      const [day, month, year] = dateStr.split('/');
      return new Date(year, month - 1, day);
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // Parse times
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

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

  // Date and time validation
  if (!isValidDate(assignment.startDate)) {
    errors.push("Start Date is invalid or missing (use DD/MM/YYYY or YYYY-MM-DD)");
  }

  if (!isValidTime(assignment.startTime)) {
    errors.push("Start Time is invalid or missing (use HH:MM in 24-hour format)");
  }

  if (!isValidDate(assignment.endDate)) {
    errors.push("End Date is invalid or missing (use DD/MM/YYYY or YYYY-MM-DD)");
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

  // Date and time validation
  if (!isValidDate(lecture.startDate)) {
    errors.push("Start Date is invalid or missing (use DD/MM/YYYY or YYYY-MM-DD)");
  }

  if (!isValidTime(lecture.startTime)) {
    errors.push("Start Time is invalid or missing (use HH:MM in 24-hour format)");
  }

  // Zoom link validation (optional but if provided should be valid URL)
  if (lecture.zoom_link && lecture.zoom_link.trim() !== "" && lecture.zoom_link !== "N/A") {
    try {
      new URL(lecture.zoom_link);
    } catch {
      errors.push("Zoom Link must be a valid URL");
    }
  }

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
