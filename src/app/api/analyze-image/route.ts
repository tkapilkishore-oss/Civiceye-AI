import { NextResponse } from "next/server";
import { AnalyzeImageResponse } from "@/types";

// Helper to simulate network latency in mock mode
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Centralized helper to build mock responses based on description keywords
function getMockResponse(description: string): AnalyzeImageResponse {
  let issue_type = "Pothole";
  let severity: "Low" | "Medium" | "High" | "Critical" = "High";
  let confidence = 0.94;
  let follow_up_questions = [
    "Is the pothole located on a main arterial road or a secondary residential street?",
    "Does it pose an immediate risk to cyclists or pedestrians due to depth or lighting conditions?"
  ];
  let issue_summary = "A deep hole or depression in the road surface which can cause damage to vehicle suspensions and tyres.";
  let estimated_public_impact = "Causes moderate traffic delays as vehicles slow down to avoid it; poses high hazard to two-wheelers.";
  let recommended_authority = "Municipal Corporation Roads Department";

  const lowerDesc = (description || "").toLowerCase();
  
  if (lowerDesc.includes("pothole")) {
    issue_type = "Pothole";
    severity = "High";
    confidence = 0.94;
    follow_up_questions = [
      "Is the pothole located on a main arterial road or a secondary residential street?",
      "Does it pose an immediate risk to cyclists or pedestrians due to depth or lighting conditions?"
    ];
    issue_summary = "A deep hole or depression in the road surface which can cause damage to vehicle suspensions and tyres.";
    estimated_public_impact = "Causes moderate traffic delays as vehicles slow down to avoid it; poses high hazard to two-wheelers.";
    recommended_authority = "Municipal Corporation Roads Department";
  } else if (lowerDesc.includes("water leakage") || lowerDesc.includes("leak") || lowerDesc.includes("pipe")) {
    issue_type = "Water Leakage";
    severity = "Critical";
    confidence = 0.89;
    follow_up_questions = [
      "Is the leaking water causing flooding or soil erosion nearby?",
      "Is it drinking water/potable water or sewerage line water?"
    ];
    issue_summary = "A continuous flow of clean or waste water due to a ruptured underground main line.";
    estimated_public_impact = "Wastes potable water resources and risks undermining road foundations if soil erosion occurs.";
    recommended_authority = "Water Supply & Sewerage Board";
  } else if (lowerDesc.includes("broken lights") || lowerDesc.includes("streetlight") || lowerDesc.includes("light") || lowerDesc.includes("bulb")) {
    issue_type = "Broken Streetlight";
    severity = "Medium";
    confidence = 0.97;
    follow_up_questions = [
      "Has the entire stretch of streetlights gone dark, or is it just this single pole?",
      "Is the area known to have high foot traffic or security concerns during nighttime?"
    ];
    issue_summary = "An inoperable streetlight bulb or damaged structural light pole leaving a public path unlit.";
    estimated_public_impact = "Reduces security and increases risk of pedestrian falls or night collisions.";
    recommended_authority = "Municipal Electrical Services Division";
  } else if (lowerDesc.includes("garbage") || lowerDesc.includes("trash") || lowerDesc.includes("dump")) {
    issue_type = "Garbage Accumulation";
    severity = "Medium";
    confidence = 0.91;
    follow_up_questions = [
      "Is the waste overflow near a residential compound, food stall, or public park?",
      "Are there signs of medical waste or hazardous materials mixed with regular garbage?"
    ];
    issue_summary = "A pile of uncollected solid municipal waste overflowing onto public pavement.";
    estimated_public_impact = "Aesthetic issue, foul odor, and public health hazard attracting rodents and stray animals.";
    recommended_authority = "Solid Waste Management Authority";
  } else {
    issue_type = "Other";
    severity = "Low";
    confidence = 0.45;
    follow_up_questions = [
      "The uploaded image appears blurry or unclear. Please upload a clearer image of the defect.",
      "What is the exact landmark or street name near the issue?"
    ];
    issue_summary = "Unclear visual evidence. The submitted photograph is out of focus or suffers from poor lighting.";
    estimated_public_impact = "Unable to assess public impact due to low visual quality.";
    recommended_authority = "General Ward Inspectors";
  }

  return {
    issue_type,
    severity,
    confidence,
    follow_up_questions,
    issue_summary,
    estimated_public_impact,
    recommended_authority,
    explainability: {
      visual_evidence: `Visual logs indicate active structural anomaly fitting ${issue_type.toLowerCase()} patterns.`,
      severity_reasoning: `Risk index determined as ${severity} based on public density indicators and visual surface degradation.`,
      authority_reasoning: `Department assignment optimized for ${recommended_authority} to maximize response latency scores.`,
      recommended_action_reasoning: `Recommend local ward inspection squad deployment for cold-mix patch and grid safety scan.`
    }
  };
}

// Request wrapper with 503 retry and backoff capabilities
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
        console.warn(`Gemini API returned 503. Retrying ${i + 1}/${retries} after ${delays[i]}ms...`);
        await delay(delays[i]);
        continue;
      }
      return res;
    } catch (err: any) {
      lastError = err;
      if (i < retries) {
        console.warn(`Network error in Gemini call: ${err.message || err}. Retrying ${i + 1}/${retries} after ${delays[i]}ms...`);
        await delay(delays[i]);
        continue;
      }
    }
  }
  throw lastError || new Error("Gemini max retries reached.");
}

export async function POST(request: Request) {
  let requestDescription = "";
  try {
    const body = await request.json();
    const { image, description } = body;
    requestDescription = description || "";

    // Read test mode status. Default to true if not explicitly set to 'false'.
    const testMode = process.env.TEST_MODE !== "false";

    if (testMode) {
      // Mock mode
      await delay(1500);
      return NextResponse.json(getMockResponse(requestDescription));
    }

    // Real Gemini mode configuration
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is missing. Configure it in .env.local or disable TEST_MODE." },
        { status: 400 }
      );
    }

    if (!image) {
      return NextResponse.json(
        { error: "Missing image parameters in upload request." },
        { status: 400 }
      );
    }

    // Parse base64 image data URL
    const match = image.match(/^data:(image\/[a-zA-Z0-9.-]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid image upload format. Expected a base64 encoded data URL." },
        { status: 400 }
      );
    }

    const mimeType = match[1];
    const base64Data = match[2];

    // Supported mime types check
    const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!supportedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported image format: ${mimeType}. Supported types are JPEG, PNG, WEBP, HEIC, HEIF.` },
        { status: 400 }
      );
    }

    // Gemini Vision structured prompt instruction
    const promptText = `Analyze this civic infrastructure image.
Possible issue categories:
- Pothole
- Water Leakage
- Garbage Accumulation
- Broken Streetlight
- Other

User description context: "${requestDescription || "None provided"}"

Return ONLY valid JSON matching this exact structure:
{
  "issue_type": "Pothole | Water Leakage | Garbage Accumulation | Broken Streetlight | Other",
  "severity": "Low | Medium | High | Critical",
  "confidence": 0.0,
  "issue_summary": "A brief summary of the issue seen in the image",
  "follow_up_questions": ["Question 1", "Question 2"],
  "estimated_public_impact": "Brief explanation of how this affects the public",
  "recommended_authority": "Name of the municipal department responsible for fixing this",
  "explainability": {
    "visual_evidence": "Specific visual features observed in the image that support this classification (e.g. cracked asphalt, active water spray, piling trash bags)",
    "severity_reasoning": "Reasoning for the assigned severity based on estimated size, safety risks, and user context",
    "authority_reasoning": "Why this specific department was selected based on local infrastructure division codes",
    "recommended_action_reasoning": "Technical justification for the immediate actions needed to mitigate risk"
  }
}

Guidelines:
- Choose the closest matching category from the 5 options for issue_type.
- Assign severity:
  - Low: Minor inconvenience.
  - Medium: Needs attention.
  - High: Safety risk or service disruption.
  - Critical: Immediate danger or major public impact.
- Rate your classification confidence as a float value between 0.0 and 1.0.
- Formulate 2 intelligent follow-up questions to ask the reporter to help the repair team (e.g. asking about exact width/depth, time of activity, whether it is drinking or sewage water, etc.).

Return JSON only. Do not return markdown wraps. Do not return explanations.`;

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // Abort controller for a 20-second timeout (accommodating retries delay)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const geminiRes = await fetchWithRetry(
        geminiUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!geminiRes.ok) {
        const errorText = await geminiRes.text();
        console.error("Gemini API Error Response after retries:", errorText);
        throw new Error(`Gemini API returned status ${geminiRes.status}: ${errorText}`);
      }

      const responseData = await geminiRes.json();
      const textResult = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResult) {
        throw new Error("Received empty candidate response content from Gemini.");
      }

      // Parse JSON from text response
      let parsedResult;
      try {
        parsedResult = JSON.parse(textResult.trim());
      } catch (jsonErr) {
        console.error("Failed to parse JSON response from Gemini:", textResult, jsonErr);
        throw new Error("Gemini did not return valid JSON content structure.");
      }

      // Validate required fields and default if necessary
      const allowedIssues = ["Pothole", "Water Leakage", "Garbage Accumulation", "Broken Streetlight", "Other"];
      const allowedSeverities = ["Low", "Medium", "High", "Critical"];

      let issue_type = parsedResult.issue_type || "Other";
      if (!allowedIssues.includes(issue_type)) {
        issue_type = "Other";
      }

      let severity = parsedResult.severity || "Medium";
      if (!allowedSeverities.includes(severity)) {
        severity = "Medium";
      }

      let confidence = Number(parsedResult.confidence);
      if (isNaN(confidence)) {
        confidence = 0.0;
      }

      // Enforce confidence threshold rule: if confidence < 0.60, set issue_type = "Other"
      if (confidence < 0.60) {
        issue_type = "Other";
      }

      const follow_up_questions = Array.isArray(parsedResult.follow_up_questions)
        ? parsedResult.follow_up_questions.map(String)
        : [];
      
      // Ensure exactly 2 follow up questions exist
      while (follow_up_questions.length < 2) {
        follow_up_questions.push("Can you provide any additional landmark details to locate the issue?");
      }

      const finalResponse: AnalyzeImageResponse = {
        issue_type,
        severity: severity as "Low" | "Medium" | "High" | "Critical",
        confidence,
        issue_summary: String(parsedResult.issue_summary || ""),
        follow_up_questions: follow_up_questions.slice(0, 2),
        estimated_public_impact: String(parsedResult.estimated_public_impact || ""),
        recommended_authority: String(parsedResult.recommended_authority || ""),
        explainability: parsedResult.explainability || {
          visual_evidence: "Visual features identified in incident photo.",
          severity_reasoning: `Determined as ${severity} priority based on structural defect parameters.`,
          authority_reasoning: `Routed to recommended municipal department.`,
          recommended_action_reasoning: `Immediate field assessment recommended.`
        }
      };

      return NextResponse.json(finalResponse);
    } catch (apiErr: any) {
      clearTimeout(timeoutId);
      
      // GRACEFUL FALLBACK Triggered
      console.warn(
        "Gemini API request failed after retries or timed out. Gracefully falling back to mock response data. Error details:",
        apiErr.message || apiErr
      );
      
      return NextResponse.json(getMockResponse(requestDescription));
    }
  } catch (error: any) {
    console.error("Error in analyze-image API handler:", error);
    // If request parsing itself failed, fall back to mock data
    return NextResponse.json(getMockResponse(requestDescription));
  }
}
