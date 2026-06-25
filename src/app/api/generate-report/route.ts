import { NextResponse } from "next/server";
import { GenerateReportResponse } from "@/types";
import { saveReport } from "@/lib/dbFallback";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getMockReportResponse(
  issue_type: string,
  locality: string,
  ward: string,
  severity: "Low" | "Medium" | "High" | "Critical",
  follow_up_answers?: any[]
): GenerateReportResponse {
  let authority = "Municipal Corporation Roads Department";
  let priority = severity || "High";
  let action_plan = `1. Dispatch field inspector to ${locality} within 24 hours.\n2. Deploy contractor for excavation and base fill.\n3. Conduct post-repair quality verification.`;
  let cost = 5500;
  let materials = ["Asphalt Cold-Mix", "Sub-base Crushed Stone", "Sealant Coat"];
  let workers = 4;
  let duration = "6 hours";
  let complexity: "Low" | "Medium" | "High" = "Medium";

  if (issue_type === "Water Leakage") {
    authority = "Water Supply & Sewerage Board";
    action_plan = `1. Isolate the main feed valve near ${locality}.\n2. Excavate and replace ruptured pipe section.\n3. Flush and restore pressure lines.`;
    cost = 28000;
    materials = ["Ductile Iron Pipe Section", "Repair Clamps", "Sand Bedding"];
    workers = 5;
    duration = "12 hours";
    complexity = "High";
  } else if (issue_type === "Broken Streetlight") {
    authority = "Municipal Electrical Services Division";
    action_plan = `1. Perform voltage checks on the local grid pillar.\n2. Replace burned bulb or damaged light arm.\n3. Update automated timer relays.`;
    cost = 2500;
    materials = ["LED Lamp Module (150W)", "Wiring Loom", "Photocell Switch"];
    workers = 2;
    duration = "2 hours";
    complexity = "Low";
  } else if (issue_type === "Garbage Accumulation") {
    authority = "Solid Waste Management Authority";
    action_plan = `1. Dispatch compacting waste truck.\n2. Apply sanitizing spray to clean the overflow site.\n3. Coordinate weekly collection schedule review.`;
    cost = 3200;
    materials = ["Sanitization Disinfectant", "Bio-bags"];
    workers = 3;
    duration = "3 hours";
    complexity = "Low";
  }

  const complaint_draft = `To,\nThe Ward Officer / Executive Engineer,\n${authority},\nWard ${ward || "5"}, Civic Administration.\n\nSubject: Formal Complaint regarding ${issue_type} in ${locality}\n\nDear Sir/Madam,\n\nI am writing to draw your urgent attention to a major ${issue_type.toLowerCase()} issue noticed at ${locality}. The issue has been evaluated as ${priority.toLowerCase()} severity.\n\nAction required: Please refer to the system-generated diagnostic reports. The community requested immediate mitigation to prevent further accidents or public health hazards.\n\nSincerely,\nConcerned Citizen / CivicEye AI Guard`;

  return {
    id: "",
    priority,
    authority,
    action_plan,
    complaint_draft,
    estimation: {
      repair_cost: cost,
      required_materials: materials,
      required_workers: workers,
      estimated_duration: duration,
      complexity
    }
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
        console.warn(`Gemini API returned 503 in generate-report. Retrying ${i + 1}/${retries} after ${delays[i]}ms...`);
        await delay(delays[i]);
        continue;
      }
      return res;
    } catch (err: any) {
      lastError = err;
      if (i < retries) {
        console.warn(`Network error in Gemini generate-report call: ${err.message || err}. Retrying ${i + 1}/${retries} after ${delays[i]}ms...`);
        await delay(delays[i]);
        continue;
      }
    }
  }
  throw lastError || new Error("Gemini max retries reached in generate-report.");
}

export async function POST(request: Request) {
  let requestLocality = "";
  let requestWard = "";
  let requestIssueType = "Pothole";
  let requestSeverity: "Low" | "Medium" | "High" | "Critical" = "High";

  try {
    const body = await request.json();
    const {
      image_url,
      ward,
      locality,
      issue_type,
      severity,
      confidence,
      follow_up_answers,
      latitude,
      longitude,
      formatted_address,
      city,
      state,
      postal_code,
      citizen_name,
      contact_info,
      description,
      explainability
    } = body;

    requestLocality = locality || "";
    requestWard = ward || "";
    requestIssueType = issue_type || "Pothole";
    requestSeverity = severity || "High";

    const reportId = `rep_${Math.random().toString(36).substring(2, 11)}`;

    const testMode = process.env.TEST_MODE !== "false";
    const apiKey = process.env.GEMINI_API_KEY;

    let response: GenerateReportResponse;

    if (testMode || !apiKey) {
      console.log(`Running in testMode (${testMode}) or missing apiKey. Using mock generator.`);
      const mockObj = getMockReportResponse(requestIssueType, requestLocality, requestWard, requestSeverity, follow_up_answers);
      response = { ...mockObj, id: reportId };
    } else {
      // Real Gemini API Call
      const answersText = follow_up_answers
        ? follow_up_answers.map((a: any) => `Question: ${a.question}\nAnswer: ${a.answer}`).join("\n\n")
        : "No follow-up interview answers provided.";

      const promptText = `You are CivicEye AI, an administrative audit assistant for municipal authorities.
Generate a structured resolution blueprint and complaint draft for the following reported civic issue:

Report details:
- Issue Type: ${requestIssueType}
- Initial Detected Severity: ${requestSeverity}
- AI Vision Confidence: ${confidence || 1.0}
- Location Locality: ${requestLocality}
- Ward: ${requestWard}

Citizen Interview Answers:
${answersText}

Return ONLY valid JSON matching this exact structure:
{
  "priority": "Low | Medium | High | Critical",
  "authority": "Name of the municipal department or division responsible for fixing this",
  "action_plan": "A step-by-step municipal resolution checklist plan. Each step should be numbered (e.g. '1. ...\\n2. ...') and contain actionable steps suitable for this issue category. Make it detailed, specific to the category, and incorporate details from the citizen interview answers where appropriate.",
  "complaint_draft": "A formal administrative complaint notice draft addressed to the Ward Officer/Executive Engineer. Use proper margins, structure, formal salutation, a clear Subject line referencing the issue and locality, a narrative body, and signature. Make it feel highly professional, detailed, and polished.",
  "estimation": {
    "repair_cost": 0, // Calculate estimated repair cost in Indian Rupees (₹). Use realistic municipal ranges: Small pothole (₹3,000 to ₹8,000), Garbage cleaning (₹1,500 to ₹5,000), Water leakage (₹10,000 to ₹35,000), Broken streetlight (₹1,200 to ₹3,500). Do NOT use dollars ($).
    "required_materials": ["Material 1", "Material 2"],
    "required_workers": 0,
    "estimated_duration": "Duration in hours/days (e.g. '4 hours' or '2 days')",
    "complexity": "Low | Medium | High"
  }
}

Guidelines:
- Evaluate the risk priority (priority): Low, Medium, High, or Critical, taking into account the citizen's interview answers and context.
- Assign the correct authority (e.g., 'Municipal Corporation Roads Department' for potholes/roads, 'Water Supply & Sewerage Board' for leaks, 'Solid Waste Management Authority' for garbage, 'Municipal Electrical Services Division' for streetlights).
- The action_plan should consist of 3-5 specific, technical steps.
- Do not wrap the JSON in markdown code blocks. Return only the clean JSON string.`;

      let parts: any[] = [{ text: promptText }];
      
      if (image_url) {
        const match = image_url.match(/^data:(image\/[a-zA-Z0-9.-]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
          if (supportedTypes.includes(mimeType)) {
            parts.push({
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            });
          }
        }
      }

      const payload = {
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      };

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

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
          console.error("Gemini API Error Response after retries in generate-report:", errorText);
          throw new Error(`Gemini API returned status ${geminiRes.status}: ${errorText}`);
        }

        const responseData = await geminiRes.json();
        const textResult = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResult) {
          throw new Error("Received empty content from Gemini in generate-report.");
        }

        let parsedResult;
        try {
          parsedResult = JSON.parse(textResult.trim());
        } catch (jsonErr) {
          console.error("Failed to parse JSON response from Gemini in generate-report:", textResult, jsonErr);
          throw new Error("Gemini did not return valid JSON content structure.");
        }

        const allowedSeverities = ["Low", "Medium", "High", "Critical"];
        let priority = parsedResult.priority || requestSeverity;
        if (!allowedSeverities.includes(priority)) {
          priority = "Medium";
        }

        response = {
          id: reportId,
          priority: priority as "Low" | "Medium" | "High" | "Critical",
          authority: parsedResult.authority || "Municipal Department",
          action_plan: parsedResult.action_plan || "1. Dispatch inspector to verify coordinates.",
          complaint_draft: parsedResult.complaint_draft || "Administrative complaint details.",
          estimation: parsedResult.estimation || {
            repair_cost: 12000,
            required_materials: ["General fill-mix", "Safety barricades"],
            required_workers: 3,
            estimated_duration: "4 hours",
            complexity: "Medium"
          }
        };
      } catch (apiErr: any) {
        clearTimeout(timeoutId);
        console.warn(
          "Gemini API generate-report failed. Gracefully falling back to mock response data. Error details:",
          apiErr.message || apiErr
        );
        const mockObj = getMockReportResponse(requestIssueType, requestLocality, requestWard, requestSeverity, follow_up_answers);
        response = { ...mockObj, id: reportId };
      }
    }

    try {
      const reportDoc = {
        id: reportId,
        image_url: image_url || "",
        ward: requestWard,
        locality: requestLocality,
        issue_type: requestIssueType,
        severity: requestSeverity,
        confidence: confidence || 1.0,
        priority: response.priority,
        authority: response.authority,
        complaint_draft: response.complaint_draft,
        action_plan: response.action_plan,
        created_at: new Date().toISOString(),
        status: "Investigating",
        latitude: latitude || null,
        longitude: longitude || null,
        formatted_address: formatted_address || "",
        city: city || "",
        state: state || "",
        postal_code: postal_code || "",
        citizen_name: citizen_name || "Concerned Citizen",
        contact_info: contact_info || "Not provided",
        description: description || "",
        follow_up_answers: follow_up_answers || [],
        explainability: body.explainability || {
          visual_evidence: "Visual defect features detected.",
          severity_reasoning: `Categorized as ${requestSeverity} based on vision inputs.`,
          authority_reasoning: `Routed to ${response.authority}.`,
          recommended_action_reasoning: `Mitigation steps outline generated.`
        },
        estimation: response.estimation || null,
        supporter_count: 1,
      };
      await saveReport(reportDoc);
      console.log(`Saved report ${reportId} to server database.`);
    } catch (saveErr) {
      console.error("Failed to save report to server database:", saveErr);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in generate-report API:", error);
    // Even on total parse/catch error, return a mock response to ensure app never crashes
    const reportId = `rep_${Math.random().toString(36).substring(2, 11)}`;
    const mockObj = getMockReportResponse(requestIssueType, requestLocality, requestWard, requestSeverity);
    return NextResponse.json({ ...mockObj, id: reportId });
  }
}
