/**
 * Formats technical error messages into user-friendly messages
 *
 * @param {string} errorMessage - The raw error message from the automation process
 * @returns {string} - User-friendly error message
 */
export function formatErrorMessage(errorMessage) {
  if (!errorMessage || errorMessage.trim() === "") {
    return "";
  }

  // Check if message already has the structured format (Field, Value, Reason)
  if (errorMessage.includes('Failed at field:') || errorMessage.includes('Field:')) {
    return errorMessage; // Already formatted, return as-is
  }

  // Check if it's a timing error (already user-friendly)
  if (errorMessage.includes('Schedule time has passed') ||
      errorMessage.includes('scheduled for') ||
      errorMessage.includes('current time is')) {
    return errorMessage; // Already user-friendly, return as-is
  }

  const error = errorMessage.toLowerCase();

  // Timeout errors
  if (error.includes("timeout") && error.includes("locator")) {
    if (error.includes("associated") || error.includes("lecture")) {
      return "Associated lecture not found. Please verify the lecture name exists in the system.";
    }
    if (error.includes("batch")) {
      return "Batch not found. Please verify the batch name exists in the system.";
    }
    if (error.includes("section")) {
      return "Section not found. Please verify the section name exists in the system.";
    }
    if (error.includes("assessment") || error.includes("template")) {
      return "Assessment template not found. Please verify the template name exists.";
    }
    return "Element not found on the page. Please check if the required data exists in the system.";
  }

  // Navigation errors
  if (error.includes("navigation")) {
    return "Page navigation failed. Please check your internet connection and try again.";
  }

  // Network errors
  if (error.includes("net::") || error.includes("network")) {
    return "Network error occurred. Please check your internet connection.";
  }

  // Login errors
  if (error.includes("login") || error.includes("authentication")) {
    return "Login failed. Please verify the credentials in the configuration.";
  }

  // Validation errors
  if (error.includes("validation")) {
    return "Form validation failed. Please check if all required fields have valid data.";
  }

  // Still on form errors
  if (error.includes("remained on form") || error.includes("still on form")) {
    return "Submission failed. The form was not accepted. Please verify all data is correct.";
  }

  // Clone errors
  if (error.includes("clone") && error.includes("failed")) {
    return "Assessment cloning failed. Please try again or check if the template exists.";
  }

  // Assignment creation errors
  if (error.includes("assignment creation failed")) {
    return "Assignment creation failed. Please verify all required fields have valid data.";
  }

  // Lecture creation errors
  if (error.includes("lecture creation failed")) {
    return "Lecture creation failed. Please verify all required fields have valid data.";
  }

  // Notes update errors
  if (error.includes("notes") && error.includes("update")) {
    return "Notes update failed. Please verify the lecture exists and try again.";
  }

  // Generic Playwright errors
  if (error.includes("playwright")) {
    return "Browser automation error. Please try again or contact support if the issue persists.";
  }

  // If no specific match, return a cleaned version of the original message
  // Remove technical paths and locator details
  let cleanedMessage = errorMessage
    .replace(/locator\.click:.*/gi, "")
    .replace(/xpath=.*/gi, "")
    .replace(/Timeout \d+ms exceeded\./gi, "Operation timed out.")
    .replace(/waiting for locator\(.+?\)/gi, "waiting for element")
    .trim();

  // If message is too long or still too technical, provide generic message
  if (cleanedMessage.length > 200 || cleanedMessage.includes("locator(")) {
    return "An error occurred during automation. Please verify your data and try again.";
  }

  return cleanedMessage || "An unexpected error occurred. Please try again.";
}
