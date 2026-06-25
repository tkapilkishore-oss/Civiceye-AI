import fs from "fs";
import path from "path";
import { dbAdmin } from "./firebaseAdmin";

// Local JSON DB file location
const DB_PATH = path.join(process.cwd(), "src/lib/local_db.json");

// Ensure local JSON DB file exists on startup
function ensureDbExists() {
  if (!fs.existsSync(DB_PATH)) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), "utf8");
    } catch (e) {
      console.error("Failed to initialize fallback database file:", e);
    }
  }
}

export async function getAllReports(): Promise<any[]> {
  // If Firestore Admin is active, query Firestore
  if (dbAdmin) {
    try {
      const snapshot = await dbAdmin.collection("reports").orderBy("created_at", "desc").get();
      const fetched: any[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      return fetched;
    } catch (err) {
      console.error("Firestore Admin query failed, using JSON DB fallback:", err);
    }
  }

  // Fallback: Read from local JSON file database
  try {
    ensureDbExists();
    const data = fs.readFileSync(DB_PATH, "utf8");
    const reports = JSON.parse(data);
    // Sort by created_at desc
    return reports.sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  } catch (e) {
    console.error("Failed to read local JSON database:", e);
    return [];
  }
}

export async function getReportById(id: string): Promise<any | null> {
  if (dbAdmin) {
    try {
      const docRef = dbAdmin.collection("reports").doc(id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() };
      }
    } catch (err) {
      console.error("Firestore Admin fetch failed:", err);
    }
  }

  try {
    ensureDbExists();
    const data = fs.readFileSync(DB_PATH, "utf8");
    const reports = JSON.parse(data);
    return reports.find((r: any) => r.id === id) || null;
  } catch (e) {
    console.error("Failed to get report by ID:", e);
    return null;
  }
}

export async function saveReport(report: any): Promise<void> {
  if (dbAdmin) {
    try {
      const docRef = dbAdmin.collection("reports").doc(report.id);
      await docRef.set(report);
      console.log(`Saved report ${report.id} to Firestore.`);
      // We also sync it locally for redundancy
    } catch (err) {
      console.error("Firestore save failed, syncing locally:", err);
    }
  }

  try {
    ensureDbExists();
    const data = fs.readFileSync(DB_PATH, "utf8");
    const reports = JSON.parse(data);
    const existingIndex = reports.findIndex((r: any) => r.id === report.id);
    if (existingIndex !== -1) {
      reports[existingIndex] = report;
    } else {
      reports.push(report);
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(reports, null, 2), "utf8");
    console.log(`Saved report ${report.id} to server JSON fallback DB.`);
  } catch (e) {
    console.error("Failed to save report to local JSON database:", e);
  }
}

export async function updateReport(id: string, updates: any): Promise<void> {
  if (dbAdmin) {
    try {
      const docRef = dbAdmin.collection("reports").doc(id);
      await docRef.update(updates);
      console.log(`Updated report ${id} in Firestore.`);
    } catch (err) {
      console.error("Firestore update failed:", err);
    }
  }

  try {
    ensureDbExists();
    const data = fs.readFileSync(DB_PATH, "utf8");
    const reports = JSON.parse(data);
    const existingIndex = reports.findIndex((r: any) => r.id === id);
    if (existingIndex !== -1) {
      reports[existingIndex] = { ...reports[existingIndex], ...updates };
      fs.writeFileSync(DB_PATH, JSON.stringify(reports, null, 2), "utf8");
      console.log(`Updated report ${id} in local JSON database.`);
    }
  } catch (e) {
    console.error("Failed to update report in local JSON database:", e);
  }
}
