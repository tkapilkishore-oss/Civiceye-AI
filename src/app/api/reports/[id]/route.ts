import { NextResponse } from "next/server";
import { getReportById } from "@/lib/dbFallback";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const report = await getReportById(id);
    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    return NextResponse.json(report);
  } catch (error: any) {
    console.error("GET /api/reports/[id] failed:", error);
    return NextResponse.json({ error: "Failed to retrieve report details." }, { status: 500 });
  }
}
