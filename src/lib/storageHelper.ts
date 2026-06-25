/**
 * Strips large fields (Base64 images, Gemini responses, PDF content, etc.)
 * from a report object before writing to localStorage to prevent QuotaExceededError.
 */
export function sanitizeReportForLocalStorage(report: any): any {
  if (!report) return report;

  // Destructure to separate large properties from the lightweight metadata
  const {
    image_url,
    capturedImage,
    image,
    repair_image,
    repaired_image_url,
    complaint_draft,
    action_plan,
    explainability,
    pdf,
    pdf_content,
    ...lightweightReport
  } = report;

  return lightweightReport;
}

/**
 * Strips large fields from an array of reports.
 */
export function sanitizeReportsListForLocalStorage(reportsList: any[]): any[] {
  if (!Array.isArray(reportsList)) return [];
  return reportsList.map((report) => sanitizeReportForLocalStorage(report));
}

/**
 * Aggressively scans and sanitizes all report-related keys in localStorage.
 * If QuotaExceededError is encountered, clears the cache to restore functionality.
 */
export function cleanAllLocalStorageReports(): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    // 1. Sanitize reports_list
    const reportsListRaw = localStorage.getItem("reports_list");
    if (reportsListRaw) {
      const reportsList = JSON.parse(reportsListRaw);
      const sanitized = sanitizeReportsListForLocalStorage(reportsList);
      localStorage.setItem("reports_list", JSON.stringify(sanitized));
    }

    // 2. Sanitize individual report_keys
    const keysToSanitize: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("report_") && key !== "reports_list") {
        keysToSanitize.push(key);
      }
    }

    keysToSanitize.forEach((key) => {
      const rawReport = localStorage.getItem(key);
      if (rawReport) {
        const report = JSON.parse(rawReport);
        const sanitizedReport = sanitizeReportForLocalStorage(report);
        localStorage.setItem(key, JSON.stringify(sanitizedReport));
      }
    });
  } catch (e) {
    console.warn("Storage cleanup failed due to full quota, aggressively purging reports cache:", e);
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("report_") || key === "reports_list")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      console.log("Successfully cleared all localStorage reports to resolve QuotaExceededError.");
    } catch (clearErr) {
      console.error("Critical failure clearing localStorage:", clearErr);
    }
  }
}
