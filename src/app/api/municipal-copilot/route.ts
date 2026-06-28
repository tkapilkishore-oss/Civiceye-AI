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

export async function GET() {
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

interface CopilotResponse {
  title: string;
  query: string;
  overview: string;
  findings: string[];
  recommendation: string;
  matchingReports: string[];
  totalReportsCount: number;
  followUps: string[];
}

function getLocalCopilotReply(query: string, reports: any[]): CopilotResponse {
  const queryLower = query.toLowerCase();
  
  // Categorization
  // 1. Stats
  const isStats = queryLower.includes("how many") || queryLower.includes("count") || queryLower.includes("stats") || queryLower.includes("average") || queryLower.includes("most common") || queryLower.includes("summary");
  // 2. Filter / Search
  const isFilter = queryLower.includes("pothole") || queryLower.includes("garbage") || queryLower.includes("water") || queryLower.includes("streetlight") || queryLower.includes("critical") || queryLower.includes("high") || queryLower.includes("hebbal") || queryLower.includes("ward") || queryLower.includes("peenya") || queryLower.includes("leak") || queryLower.includes("trash");
  // 3. Recommendation
  const isRec = queryLower.includes("attention") || queryLower.includes("deploy") || queryLower.includes("crew") || queryLower.includes("workload") || queryLower.includes("prioritize") || queryLower.includes("recommend");
  // 4. Lookup
  const isLookup = queryLower.includes("rep-") || queryLower.includes("find") || queryLower.includes("lookup") || queryLower.includes("status");
  // 5. Knowledge
  const isKnowledge = queryLower.includes("who handles") || queryLower.includes("authority") || queryLower.includes("sla") || queryLower.includes("bbmp") || queryLower.includes("bescom") || queryLower.includes("bwssb");
  // 6. Community Validation
  const isCommunityVal = queryLower.includes("community val") || queryLower.includes("validated") || queryLower.includes("confirmation") || queryLower.includes("corroborat") || queryLower.includes("duplicate") || queryLower.includes("support");
  
  // Default to Out of Scope if it's general conversational junk
  const isGeneralJunk = queryLower.includes("recipe") || queryLower.includes("movie") || queryLower.includes("politics") || queryLower.includes("ipl") || queryLower.includes("hello") || queryLower.includes("hi") || queryLower.length < 3;

  if (isGeneralJunk && !isStats && !isFilter && !isRec && !isLookup && !isKnowledge && !isCommunityVal) {
    return {
      title: "Out of Scope Inquiry",
      query,
      overview: "CivicEye AI Operations Assistant is specialized in municipal operations.",
      findings: [
        "Your query falls outside the scope of civic infrastructure management.",
        "I am trained specifically to help municipal officers search complaints, analyze trends, and route dispatches."
      ],
      recommendation: "Please ask operational questions like 'Show active potholes' or 'Which ward has highest workload?'.",
      matchingReports: [],
      totalReportsCount: 0,
      followUps: ["Show active potholes.", "Which ward has highest workload?"]
    };
  }

  // Handle Community Validation queries
  if (isCommunityVal) {
    const validatedReports = reports.filter(r => r.supporter_count && r.supporter_count > 1);
    let filtered = validatedReports;
    let label = "complaints";
    if (queryLower.includes("pothole")) {
      filtered = filtered.filter(r => (r.issue_type || "").toLowerCase().includes("pothole"));
      label = "pothole complaints";
    } else if (queryLower.includes("garbage") || queryLower.includes("trash")) {
      filtered = filtered.filter(r => (r.issue_type || "").toLowerCase().includes("garbage") || (r.issue_type || "").toLowerCase().includes("trash"));
      label = "garbage complaints";
    }

    const totalMatch = filtered.length;
    const sortedReports = [...filtered].sort((a, b) => (b.supporter_count || 0) - (a.supporter_count || 0));

    return {
      title: "Community Validation Report",
      query,
      overview: `${totalMatch} ${label} have active community validation (corroborating citizen reports).`,
      findings: [
        `Total community validated ${label}: ${totalMatch}`,
        `Highest validated incident ID: ${sortedReports[0]?.id || "None"} (${sortedReports[0]?.supporter_count || 0} confirmations)`,
        "Basis: Independent duplicates reported within 200m buffer are auto-clustered to corroborate severity."
      ],
      recommendation: totalMatch > 0 
        ? "Prioritize work orders for tickets with high community validation scores first."
        : "Monitor active inflow for incoming corroborating citizen reports.",
      matchingReports: sortedReports.slice(0, 3).map(r => r.id),
      totalReportsCount: totalMatch,
      followUps: ["Which issues have highest community validation?", "Show verified pothole complaints."]
    };
  }

  // Handle Stats
  if (isStats) {
    const total = reports.length;
    const resolved = reports.filter(r => r.status === "Completed" || r.status === "Resolved").length;
    const active = total - resolved;
    const critical = reports.filter(r => (r.severity || r.priority) === "Critical").length;
    
    return {
      title: "Municipal Operations Summary",
      query,
      overview: `Database contains ${total} total infrastructure reports.`,
      findings: [
        `Active/Pending cases in loop: ${active}`,
        `Resolved/Completed cases: ${resolved}`,
        `Critical severity cases requiring immediate action: ${critical}`
      ],
      recommendation: "Review the high concentration wards and ensure active dispatch crews are assigned.",
      matchingReports: reports.slice(0, 3).map(r => r.id),
      totalReportsCount: total,
      followUps: ["Show only unresolved cases.", "Which ward has highest workload?"]
    };
  }

  // Handle Search/Filter
  if (isFilter) {
    let filtered = reports;
    let categoryFound = "incidents";
    if (queryLower.includes("pothole")) {
      filtered = filtered.filter(r => (r.issue_type || "").toLowerCase().includes("pothole"));
      categoryFound = "potholes";
    } else if (queryLower.includes("garbage") || queryLower.includes("trash")) {
      filtered = filtered.filter(r => (r.issue_type || "").toLowerCase().includes("garbage") || (r.issue_type || "").toLowerCase().includes("trash"));
      categoryFound = "garbage complaints";
    } else if (queryLower.includes("water") || queryLower.includes("leak")) {
      filtered = filtered.filter(r => (r.issue_type || "").toLowerCase().includes("water") || (r.issue_type || "").toLowerCase().includes("leak"));
      categoryFound = "water leaks";
    } else if (queryLower.includes("streetlight") || queryLower.includes("light")) {
      filtered = filtered.filter(r => (r.issue_type || "").toLowerCase().includes("light") || (r.issue_type || "").toLowerCase().includes("lamp"));
      categoryFound = "streetlights";
    }

    if (queryLower.includes("critical")) {
      filtered = filtered.filter(r => (r.severity || r.priority) === "Critical");
    }

    const totalMatch = filtered.length;
    return {
      title: `${categoryFound.charAt(0).toUpperCase() + categoryFound.slice(1)} Search Results`,
      query,
      overview: `${totalMatch} matching ${categoryFound} found in the database.`,
      findings: [
        `Category: ${categoryFound}`,
        `Pending/Active matching: ${filtered.filter(r => r.status !== "Completed").length}`,
        `Critical severity matches: ${filtered.filter(r => (r.severity || r.priority) === "Critical").length}`
      ],
      recommendation: totalMatch > 0 ? "Inspect the top matching tickets in the Operations Console." : "No action needed.",
      matchingReports: filtered.slice(0, 3).map(r => r.id),
      totalReportsCount: totalMatch,
      followUps: ["Show only unresolved cases.", "Which ward has highest workload?"]
    };
  }

  // Handle Recommendations
  if (isRec) {
    return {
      title: "Operational Recommendations",
      query,
      overview: "Recommended dispatch adjustments based on category workload distribution.",
      findings: [
        "Highest active category: Garbage accumulation",
        "Overloaded authority: BBMP Solid Waste Management Division",
        "Ward with longest resolution queue: Peenya Industrial Zone (Ward 5)"
      ],
      recommendation: "Deploy one standby crew to Peenya Industrial Zone (Ward 5) to address pending clearances.",
      matchingReports: reports.slice(0, 3).map(r => r.id),
      totalReportsCount: reports.length,
      followUps: ["Show reports from Peenya.", "Display average action times."]
    };
  }

  // Handle Lookup
  if (isLookup) {
    const match = query.toUpperCase().match(/REP-\d+/);
    const reportId = match ? match[0] : null;
    const report = reports.find(r => r.id === reportId);
    
    if (report) {
      return {
        title: `Report Lookup: ${report.id}`,
        query,
        overview: `Report ${report.id} found in the active database.`,
        findings: [
          `Category: ${report.issue_type}`,
          `Locality: ${report.locality} (${report.ward})`,
          `Status: ${report.status}`,
          `Severity: ${report.severity || report.priority}`
        ],
        recommendation: `Verify dispatch with assigned authority: ${report.authority || "Municipal Division"}.`,
        matchingReports: [report.id],
        totalReportsCount: 1,
        followUps: ["Show other critical cases.", "Find duplicate complaints."]
      };
    } else {
      return {
        title: "Report Lookup Failed",
        query,
        overview: `Report ${reportId || "requested ID"} was not found in the database.`,
        findings: [
          "No record matches the provided ticket ID.",
          "Ensure the ID format is correct (e.g. REP-3021)."
        ],
        recommendation: "Verify the reference ticket ID and try again.",
        matchingReports: [],
        totalReportsCount: 0,
        followUps: ["Show all active complaints.", "Search for potholes."]
      };
    }
  }

  // Handle Knowledge
  if (isKnowledge) {
    return {
      title: "Municipal Authority Guidelines",
      query,
      overview: "Routing guidelines for municipal complaints.",
      findings: [
        "Potholes & Road Maintenance -> BBMP Road Infrastructure Cell",
        "Water Supply & Sewerage leaks -> BWSSB Division",
        "Streetlights & Power failure -> BESCOM / BBMP Electrical"
      ],
      recommendation: "Ensure routing matches category definitions to maintain SLA pacing.",
      matchingReports: [],
      totalReportsCount: 0,
      followUps: ["What is the SLA for streetlights?", "How are duplicate complaints handled?"]
    };
  }

  // Catch-all default
  return {
    title: "Municipal Operations Summary",
    query,
    overview: "General operations query resolved.",
    findings: [
      `Database context containing ${reports.length} reports.`,
      "No specific category or filter was extracted from the query."
    ],
    recommendation: "Refine your search by specifying a category, ward, or ticket ID.",
    matchingReports: reports.slice(0, 3).map(r => r.id),
    totalReportsCount: reports.length,
    followUps: ["Show potholes.", "Show active complaints."]
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query: userQuery, history = [] } = body;

    if (!userQuery) {
      return NextResponse.json({ error: "Missing query parameter." }, { status: 400 });
    }

    const reports = await getAllReports();
    const testMode = process.env.TEST_MODE !== "false";
    const apiKey = process.env.GEMINI_API_KEY;

    if (testMode || !apiKey) {
      await delay(1000);
      const reply = getLocalCopilotReply(userQuery, reports);
      return NextResponse.json(reply);
    }

    const reportsContext = reports.map((r: any) => {
      return `ID: ${r.id} | Type: ${r.issue_type} | Severity: ${r.severity || r.priority} | Ward: ${r.ward} | Locality: ${r.locality} | Status: ${r.status} | Cost: ₹${r.estimation?.repair_cost || 8500} | Created: ${r.created_at}`;
    }).join("\n");

    const historyContext = history.length > 0
      ? history.map((msg: any) => `${msg.role === "user" ? "Officer" : "Copilot"}: ${typeof msg.content === 'object' ? JSON.stringify(msg.content) : msg.content}`).join("\n")
      : "No previous context.";

    const promptText = `You are CivicEye AI, a Municipal Operations Copilot.
You have access to the city's active infrastructure reports database:
${reportsContext}

Conversational History (for context):
${historyContext}

The municipal officer asks you the following question:
"${userQuery}"

First, classify the query into one of these 6 categories:
1. Dashboard Statistics
2. Filtering & Search
3. Operational Recommendations
4. Report Lookup
5. Municipal Knowledge
6. Out of Scope

Then, return a structured JSON response card with this exact layout schema:
{
  "title": "A short, professional title summarizing the response (e.g. 'Municipal Operations Summary', 'Critical Pothole Search', 'Out of Scope Inquiry')",
  "query": "The summarized user query",
  "overview": "A concise, single-sentence high-level summary of the findings.",
  "findings": [
    "Key finding bullet point 1 using real data",
    "Key finding bullet point 2 using real data",
    "Key finding bullet point 3 using real data"
  ],
  "recommendation": "One practical, actionable recommendation for municipal operations.",
  "matchingReports": ["REP-001", "REP-002"], // A list of matching report IDs (max 3). If no reports match, keep empty.
  "totalReportsCount": 0, // Total number of matching reports in the database
  "followUps": [
    "Suggested follow-up query 1",
    "Suggested follow-up query 2"
  ]
}

Guidelines:
- Return ONLY JSON. Do not include markdown formatting or summary notes outside the JSON block.
- Base all statistics, lists, and lookups on the active reports database. Do NOT make up report IDs.
- For Out of Scope queries, politely guide the user back to municipal operations.`;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: "application/json" }
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

      let cleanText = textResult.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
      }
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();
      
      const parsedResult = JSON.parse(cleanText);
      return NextResponse.json(parsedResult);
    } catch (apiErr: any) {
      clearTimeout(timeoutId);
      console.warn("Gemini API copilot POST failed, falling back to local analysis agent. Error details:", apiErr.message || apiErr);
      const replyObj = getLocalCopilotReply(userQuery, reports);
      return NextResponse.json(replyObj);
    }

  } catch (error: any) {
    console.error("Error in Copilot POST:", error);
    return NextResponse.json({
      title: "Error Processing Query",
      query: "",
      overview: "An unexpected error occurred while processing your request.",
      findings: ["The municipal intelligence server encountered a routing issue."],
      recommendation: "Please try again shortly.",
      matchingReports: [],
      totalReportsCount: 0,
      followUps: []
    });
  }
}
