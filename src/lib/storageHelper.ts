/**
 * Strips massive fields (Base64 images, PDFs, etc.) from a single report
 * but preserves complaint draft, action plan, and explainability for details page view.
 */
export function sanitizeReportForLocalStorage(report: any): any {
  if (!report) return report;

  const lightweightReport = { ...report };
  delete lightweightReport.capturedImage;
  delete lightweightReport.image;
  delete lightweightReport.repair_image;
  delete lightweightReport.repaired_image_url;
  delete lightweightReport.pdf;
  delete lightweightReport.pdf_content;

  return lightweightReport;
}

/**
 * Returns a minimal summary of the report to keep the reports_list small.
 * This strips complaint drafts, action plans, explainability, and base64 images.
 */
export function sanitizeReportForList(report: any): any {
  if (!report) return report;
  
  return {
    id: report.id,
    issue_type: report.issue_type || report.category || "Pothole",
    category: report.category || report.issue_type || "Pothole",
    severity: report.severity || report.priority || "High",
    priority: report.priority || report.severity || "High",
    locality: report.locality || "",
    ward: report.ward || "",
    created_at: report.created_at,
    status: report.status || "Investigating",
    latitude: report.latitude,
    longitude: report.longitude,
    supporter_count: report.supporter_count || 1,
    citizen_name: report.citizen_name || "Concerned Citizen",
    contact_info: report.contact_info || "Not provided",
    image_url: (report.image_url && report.image_url.startsWith("data:")) ? null : report.image_url
  };
}

/**
 * Sanitizes the reports list array: removes duplicates, limits length to 50,
 * and strips heavy details from each item. Also asynchronously triggers garbage collection.
 */
export function sanitizeReportsListForLocalStorage(reportsList: any[]): any[] {
  if (!Array.isArray(reportsList)) return [];

  // Deduplicate by id, keeping the first occurrence (usually the newest)
  const uniqueMap = new Map<string, any>();
  reportsList.forEach((item) => {
    if (item && item.id && !uniqueMap.has(item.id)) {
      uniqueMap.set(item.id, sanitizeReportForList(item));
    }
  });

  let sanitized = Array.from(uniqueMap.values());

  // Sort by created_at descending
  sanitized.sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });

  // Keep only the 50 most recent reports
  if (sanitized.length > 50) {
    sanitized = sanitized.slice(0, 50);
  }

  // Asynchronously prune orphaned individual report keys to free up space
  if (typeof window !== "undefined" && window.localStorage) {
    setTimeout(() => {
      try {
        const activeKeys = new Set(sanitized.map((r) => `report_${r.id}`));
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("report_") && key !== "reports_list") {
            if (!activeKeys.has(key)) {
              keysToRemove.push(key);
            }
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      } catch (gcErr) {
        console.error("Orphaned report garbage collection error:", gcErr);
      }
    }, 100);
  }

  return sanitized;
}

/**
 * Safely writes to localStorage. If a QuotaExceededError is thrown,
 * aggressively prunes older reports to recover space and retries.
 */
export function safeSetLocalStorageItem(key: string, value: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (e instanceof DOMException && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
      console.warn("LocalStorage Quota Exceeded! Running aggressive pruning...");
      pruneStorageAggressively();
      try {
        localStorage.setItem(key, value);
      } catch (retryErr) {
        console.error("Critical: LocalStorage full even after aggressive pruning. Clearing all reports...", retryErr);
        clearAllReportsFallback();
      }
    } else {
      console.error("Error setting localStorage item:", e);
    }
  }
}

/**
 * Halves the reports list to the 15 most recent items and removes their orphaned individual keys.
 */
function pruneStorageAggressively(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const reportsListRaw = localStorage.getItem("reports_list");
    if (reportsListRaw) {
      const list = JSON.parse(reportsListRaw);
      if (Array.isArray(list) && list.length > 0) {
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const prunedList = list.slice(0, 15);
        localStorage.setItem("reports_list", JSON.stringify(prunedList));

        const activeKeys = new Set(prunedList.map((r) => `report_${r.id}`));
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("report_") && key !== "reports_list") {
            if (!activeKeys.has(key)) {
              localStorage.removeItem(key);
            }
          }
        }
        console.log("Successfully pruned reports_list to 15 items.");
        return;
      }
    }
    clearAllReportsFallback();
  } catch (err) {
    console.error("Error during aggressive storage pruning:", err);
  }
}

/**
 * Fallback to purge all local reports to prevent crashes.
 */
function clearAllReportsFallback(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("report_") || key === "reports_list")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  console.log("Purged all report keys from localStorage.");
}

/**
 * Scans and sanitizes all report-related keys in localStorage.
 */
export function cleanAllLocalStorageReports(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const reportsListRaw = localStorage.getItem("reports_list");
    if (reportsListRaw) {
      const reportsList = JSON.parse(reportsListRaw);
      const sanitized = sanitizeReportsListForLocalStorage(reportsList);
      safeSetLocalStorageItem("reports_list", JSON.stringify(sanitized));
    }
  } catch (e) {
    console.warn("Storage cleanup failed, purging reports cache:", e);
    clearAllReportsFallback();
  }
}
