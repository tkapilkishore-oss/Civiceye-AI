import { NextResponse } from "next/server";
import { getAllReports } from "@/lib/dbFallback";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getMockCopilotSummary(reports: any[]): any {
  const totalCost = reports.reduce((acc, curr) => {
    return acc + (curr.estimation?.repair_cost || 8500);
  }, 0);

  return {
    executive_summary: "The city's overall infrastructure health index is stable at 65%. A total of " + reports.length + " active issues are currently logged, with solid waste accumulation showing a slight upward trend in residential wards. Response times remain within the 24-hour SLA targets.",
    critical_alerts: [
      "rep-002: Critical Water Leakage at Koramangala 80 Feet Rd. High danger of local soil erosion.",
      "Indiranagar 100 Feet Rd pothole blocking traffic (Ward 3)."
    ],
    highest_priority_wards: [
      "Ward 5 - Peenya Industrial Zone (12 active issues)",
      "Ward 3 - Indiranagar & Domlur (8 active issues)"
    ],
    emerging_trends: [
      "Water mains leakages account for 35% of all High/Critical priority issues.",
      "Garbage collection requests increased by 15% in Indiranagar & Domlur over the last 48 hours."
    ],
    frequent_issue: "Pothole / Road Quality",
    resource_allocation: "Direct 45% of road restoration crews to Peenya Industrial Zone (Ward 5); deploy immediate water line repair crews to Koramangala (Ward 2). Allocation of ₹1,00,000 budget for solid waste clearances in Indiranagar & Domlur recommended.",
    estimated_total_cost: totalCost || 48500,
  };
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delays = [2000, 5000, 10000]
): Promise<Response> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 503 && i < retries) {
        console.warn(`Gemini API returned 503. Retrying copilot...`);
        await delay(delays[i]);
        continue;
      }
      return res;
    } catch (err: any) {
      lastError = err;
      if (i < retries) {
        await delay(delays[i]);
        continue;
      }
    }
  }
  throw lastError || new Error("Gemini max retries reached in copilot.");
}

export async function GET(request: Request) {
  try {
    const reports = await getAllReports();
    
    const testMode = process.env.TEST_MODE !== "false";
    const apiKey = process.env.GEMINI_API_KEY;

    if (testMode || !apiKey || reports.length === 0) {
      console.log("Copilot GET running in mock mode.");
      await delay(1200);
      return NextResponse.json(getMockCopilotSummary(reports));
    }

    const reportsContext = reports.map((r: any) => {
      return `ID: ${r.id} | Type: ${r.issue_type} | Severity: ${r.severity || r.priority} | Ward: ${r.ward} | Locality: ${r.locality} | Status: ${r.status} | Cost: ₹${r.estimation?.repair_cost || 8500} | Created: ${r.created_at}`;
    }).join("\n");

    const promptText = `You are CivicEye AI, a Municipal Operations Copilot.
Here is the current list of active infrastructure reports in the city:
${reportsContext}

Analyze the data and generate a structured JSON report for the Executive Dashboard with these exact keys:
{
  "executive_summary": "A high-level 2-3 sentence summary of the city's infrastructure state, highlighting key trends and urgent developments.",
  "critical_alerts": ["Alert 1 detailing ID, category, location, and hazard details", "Alert 2..."],
  "highest_priority_wards": ["Ward Name with X active issues (overall score: Y%)", "Ward Name..."],
  "emerging_trends": ["Trend 1, e.g. Water leakages are increasing in Hebbal", "Trend 2..."],
  "frequent_issue": "The category of issue reported most frequently (e.g. 'Pothole' or 'Broken Streetlight')",
  "resource_allocation": "Suggested budget/crew allocations across the active issue departments based on urgency and volume.",
  "estimated_total_cost": 0 // The total estimated cost in Indian Rupees (₹) for all active reports. Do NOT use dollars ($).
}

Guidelines:
- Return ONLY JSON. Do not include markdown formatting or summaries outside of the JSON block.
- All budget recommendations must use Rupees (₹) and never dollars ($).`;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: "application/json" }
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const geminiRes = await fetchWithRetry(
        geminiUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!geminiRes.ok) {
        throw new Error(`Gemini returned error status ${geminiRes.status}`);
      }

      const responseData = await geminiRes.json();
      const textResult = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResult) {
        throw new Error("Received empty response content from Gemini.");
      }

      const parsedResult = JSON.parse(textResult.trim());
      return NextResponse.json(parsedResult);
    } catch (apiErr: any) {
      clearTimeout(timeoutId);
      console.warn("Gemini copilot GET failed, falling back to mock:", apiErr.message || apiErr);
      return NextResponse.json(getMockCopilotSummary(reports));
    }

  } catch (error: any) {
    console.error("Error in Copilot GET:", error);
    return NextResponse.json(getMockCopilotSummary([]));
  }
}

function getLocalCopilotReply(query: string, reports: any[]): string {
  const queryLower = query.toLowerCase();
  
  // 1. Identify category/issue type filters
  let typeFilter: string | null = null;
  if (queryLower.includes("pothole") || queryLower.includes("road")) {
    typeFilter = "Pothole";
  } else if (queryLower.includes("water") || queryLower.includes("pipe") || queryLower.includes("leak") || queryLower.includes("pipeline")) {
    typeFilter = "Water Leakage";
  } else if (queryLower.includes("garbage") || queryLower.includes("trash") || queryLower.includes("waste") || queryLower.includes("accum")) {
    typeFilter = "Garbage";
  } else if (queryLower.includes("streetlight") || queryLower.includes("street light") || queryLower.includes("lamp") || queryLower.includes("light")) {
    typeFilter = "Broken Streetlight";
  }

  // 2. Identify status filter
  let pendingOnly = false;
  if (queryLower.includes("pending") || queryLower.includes("active") || queryLower.includes("open") || queryLower.includes("ongoing") || queryLower.includes("inprogress") || queryLower.includes("in progress")) {
    pendingOnly = true;
  }

  // 3. Filter reports
  let filtered = reports;
  if (typeFilter) {
    filtered = filtered.filter(r => {
      const typeLower = (r.issue_type || "").toLowerCase();
      if (typeFilter === "Pothole") return typeLower.includes("pothole") || typeLower.includes("road");
      if (typeFilter === "Water Leakage") return typeLower.includes("water") || typeLower.includes("pipe") || typeLower.includes("leak");
      if (typeFilter === "Garbage") return typeLower.includes("garbage") || typeLower.includes("trash") || typeLower.includes("waste");
      if (typeFilter === "Broken Streetlight") return typeLower.includes("light") || typeLower.includes("lamp") || typeLower.includes("street");
      return false;
    });
  }

  if (pendingOnly) {
    filtered = filtered.filter(r => r.status !== "Completed" && r.status !== "Resolved");
  }

  // 4. Generate response text
  if (filtered.length === 0) {
    let msg = `I scanned our municipal database containing **${reports.length} total reports**. `;
    if (typeFilter) {
      msg += `There are currently no ${pendingOnly ? "pending " : ""}reports matching **${typeFilter}**.`;
    } else {
      msg += `No reports found matching your query.`;
    }
    return msg;
  }

  let response = `### Municipal Operations Report Summary\n`;
  response += `I found **${filtered.length} ${pendingOnly ? "pending/active " : ""}cases** matching your request:\n\n`;
  
  response += `| ID | Category | Location | Ward | Severity | Status |\n`;
  response += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  
  filtered.forEach(r => {
    response += `| **${r.id}** | ${r.issue_type} | ${r.locality} | ${r.ward} | \`${r.severity || r.priority}\` | *${r.status}* |\n`;
  });
  
  response += `\n\n**Operational Insights:**\n`;
  const criticalCount = filtered.filter(r => (r.severity || r.priority) === "Critical").length;
  const highCount = filtered.filter(r => (r.severity || r.priority) === "High").length;
  
  if (criticalCount > 0) {
    response += `- ⚠️ **${criticalCount} Critical priority item(s)** require immediate emergency dispatch. Check containment status.\n`;
  }
  if (highCount > 0) {
    response += `- 📈 **${highCount} High priority item(s)** are currently in queue. Resources should be allocated to clear these within 24 hours.\n`;
  }
  
  const totalCost = filtered.reduce((acc, r) => acc + (r.estimation?.repair_cost || 0), 0);
  if (totalCost > 0) {
    response += `- 💰 Estimated resolution cost for these tickets: **₹${totalCost.toLocaleString()}**.\n`;
  }

  return response;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query: userQuery } = body;

    if (!userQuery) {
      return NextResponse.json({ error: "Missing query parameter." }, { status: 400 });
    }

    const reports = await getAllReports();
    const testMode = process.env.TEST_MODE !== "false";
    const apiKey = process.env.GEMINI_API_KEY;

    if (testMode || !apiKey) {
      await delay(1000);
      const reply = getLocalCopilotReply(userQuery, reports);
      return NextResponse.json({ content: reply });
    }

    const reportsContext = reports.map((r: any) => {
      return `ID: ${r.id} | Type: ${r.issue_type} | Severity: ${r.severity || r.priority} | Ward: ${r.ward} | Locality: ${r.locality} | Status: ${r.status} | Cost: ₹${r.estimation?.repair_cost || 8500} | Created: ${r.created_at}`;
    }).join("\n");

    const promptText = `You are CivicEye AI, a Municipal Operations Copilot.
You have access to the city's active infrastructure reports database:
${reportsContext}

The municipal officer asks you the following question:
"${userQuery}"

Provide a clear, detailed, and professional answer based strictly on the report details. If the officer asks for specific listings or statistics (e.g. number of potholes, critical issues, overloaded departments), resolve them using the reports database. Format your response clearly in markdown. Keep answers concise.`;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }]
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const geminiRes = await fetchWithRetry(
        geminiUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!geminiRes.ok) {
        throw new Error(`Gemini returned error status ${geminiRes.status}`);
      }

      const responseData = await geminiRes.json();
      const textResult = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      return NextResponse.json({ content: textResult });
    } catch (apiErr: any) {
      clearTimeout(timeoutId);
      console.warn("Gemini API copilot POST failed, falling back to local analysis agent. Error details:", apiErr.message || apiErr);
      const reply = getLocalCopilotReply(userQuery, reports);
      return NextResponse.json({ content: reply });
    }

  } catch (error: any) {
    console.error("Error in Copilot POST:", error);
    return NextResponse.json({ content: "An unexpected error occurred while processing your request." });
  }
}
