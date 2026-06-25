import { NextResponse } from "next/server";
import { getAllReports, updateReport } from "@/lib/dbFallback";

export async function GET() {
  try {
    const reports = await getAllReports();
    return NextResponse.json(reports);
  } catch (error: any) {
    console.error("GET /api/reports failed:", error);
    return NextResponse.json({ error: "Failed to retrieve reports." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing report ID." }, { status: 400 });
    }
    await updateReport(id, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/reports failed:", error);
    return NextResponse.json({ error: "Failed to update report." }, { status: 500 });
  }
}
