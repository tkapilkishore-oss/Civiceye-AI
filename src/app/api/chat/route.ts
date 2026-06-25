import { NextResponse } from "next/server";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getMockChatResponse(messages: Array<{role: string, content: string}>): string {
  const userMessages = messages.filter(m => m.role === "user");
  const userText = userMessages.map(m => m.content).join(" ");
  const userTextLower = userText.toLowerCase();

  const latestUserMsg = userMessages[userMessages.length - 1]?.content || "";
  const latestUserMsgLower = latestUserMsg.toLowerCase().trim();

  const assistantMessages = messages.filter(m => m.role === "assistant" || m.role === "model");

  // 1. Identify Intent (Intent-First Classification)
  const isQuestion = 
    latestUserMsgLower.includes("?") ||
    /^(who|what|how|why|where|which|when|can|is|does|explain|show|tell|check|track|verify|reject|work|flow|duplicate|severity|priorit)/i.test(latestUserMsgLower) ||
    latestUserMsgLower.includes("how does") ||
    latestUserMsgLower.includes("how is") ||
    latestUserMsgLower.includes("who is") ||
    latestUserMsgLower.includes("who repairs") ||
    latestUserMsgLower.includes("who handles") ||
    latestUserMsgLower.includes("what is") ||
    latestUserMsgLower.includes("what happens") ||
    latestUserMsgLower.includes("can i");

  // Determine if we are already in the registration flow based on previous assistant messages.
  const alreadyInRegistration = assistantMessages.some(m => {
    const contentLower = m.content.toLowerCase();
    return (
      contentLower.includes("gather the details step-by-step") ||
      contentLower.includes("full name") ||
      contentLower.includes("contact number") ||
      contentLower.includes("exact locality, landmark") ||
      contentLower.includes("description of the issue") ||
      contentLower.includes("file official complaint") ||
      contentLower.includes("complaint summary")
    );
  });

  const explicitReportRequest = 
    latestUserMsgLower.includes("i want to report") ||
    latestUserMsgLower.includes("register a complaint") ||
    latestUserMsgLower.includes("file a complaint") ||
    latestUserMsgLower.includes("please register") ||
    latestUserMsgLower.includes("please report") ||
    latestUserMsgLower.includes("create a complaint") ||
    latestUserMsgLower.includes("new complaint") ||
    latestUserMsgLower.includes("report this issue") ||
    latestUserMsgLower.includes("submit an issue") ||
    latestUserMsgLower.includes("civiceye to report") ||
    latestUserMsgLower.includes("file a report") ||
    latestUserMsgLower.includes("report a pothole") ||
    latestUserMsgLower.includes("report a leak") ||
    latestUserMsgLower.includes("report garbage") ||
    latestUserMsgLower.includes("report a streetlight");

  const statementReportRequest = 
    !isQuestion && (
      (latestUserMsgLower.includes("there is") || latestUserMsgLower.includes("i found") || latestUserMsgLower.includes("i see")) && 
      (latestUserMsgLower.includes("pothole") || latestUserMsgLower.includes("leak") || latestUserMsgLower.includes("streetlight") || latestUserMsgLower.includes("garbage") || latestUserMsgLower.includes("trash"))
    );

  const wantsToReport = explicitReportRequest || statementReportRequest;
  const inRegistrationMode = alreadyInRegistration || wantsToReport;

  if (!inRegistrationMode) {
    // 2. Classify informational/FAQ intents
    
    // Complaint Status Inquiry
    if (latestUserMsgLower.includes("status") || 
        latestUserMsgLower.includes("check") || 
        latestUserMsgLower.includes("track") ||
        latestUserMsgLower.includes("can i track")) {
      return "To track a report, copy its unique Report ID (e.g., `rep-001`) and search for it in the Operations Console on the Dashboard tab, or go to `/report/<ID>`. The status updates live from 'Investigating' to 'Repair Started' and 'Resolved'.";
    }

    // Complaint Workflow & Lifecycle
    if (latestUserMsgLower.includes("workflow") || 
        latestUserMsgLower.includes("reject") || 
        latestUserMsgLower.includes("what happens after") ||
        latestUserMsgLower.includes("submit a complaint")) {
      if (latestUserMsgLower.includes("reject")) {
        return "If the municipal department rejects a complaint (e.g., due to jurisdictional overlap or incorrect categorizations), the CivicEye routing engine flags the ticket and returns it to the dispatch queue for manual override or automatically redirects it to the correct agency.";
      }
      return "After submission, a unique Report ID is generated and the ticket enters the database. The system automatically creates a PDF Resolution Blueprint and routes the work order queue to the assigned municipal department. The live workflow transitions from 'Investigating' to 'Repair Started' and finally 'Resolved'.";
    }

    // AI Explainability (Duplicate Detection & Severity)
    if (latestUserMsgLower.includes("duplicate") || 
        latestUserMsgLower.includes("severity") || 
        latestUserMsgLower.includes("explain why") || 
        latestUserMsgLower.includes("prioritize") ||
        latestUserMsgLower.includes("analyze")) {
      if (latestUserMsgLower.includes("duplicate")) {
        return "CivicEye AI checks for duplicates by running a geospatial vector scan within a 200-meter radius of the submitted coordinates. If another active report of the same category is found, the system registers the user as a supporter of the existing report rather than creating a duplicate ticket.";
      }
      return "CivicEye AI uses computer vision models to identify the type of infrastructure defect and assess its severity (Low, Medium, High, Critical). It checks localized parameters like traffic density, proximity to hospitals/schools, and safety hazards to prioritize dispatches dynamically.";
    }

    // Routing Guidance
    if (latestUserMsgLower.includes("route") || latestUserMsgLower.includes("routed")) {
      return "Once coordinates are geocoded, CivicEye AI resolves the nearest BBMP Ward. Using this ward allocation and the defect category, the platform routes it directly: road issues go to the BBMP Road Infrastructure division, water leaks to BWSSB, streetlights to Municipal Electrical Services, and garbage to the SWM division.";
    }

    // Authority Guidance
    if (latestUserMsgLower.includes("who repairs") || 
        latestUserMsgLower.includes("who handles") || 
        latestUserMsgLower.includes("what department") || 
        latestUserMsgLower.includes("which department") || 
        latestUserMsgLower.includes("which authority") || 
        latestUserMsgLower.includes("responsible for")) {
      
      if (latestUserMsgLower.includes("pothole") || latestUserMsgLower.includes("road")) {
        return "In Bengaluru, pothole repairs and road infrastructure issues are handled by the BBMP (Bruhat Bengaluru Mahanagara Palike) Road Infrastructure division. CivicEye AI automatically dispatches road-related reports directly to their regional executive engineers.";
      }
      if (latestUserMsgLower.includes("water") || latestUserMsgLower.includes("leak") || latestUserMsgLower.includes("sewage") || latestUserMsgLower.includes("drain")) {
        return "Water supply leakages, pipeline bursts, and sewage drainage overflows are managed by the BWSSB (Bangalore Water Supply and Sewerage Board). Our platform routes water leakage alerts straight to the regional BWSSB maintenance office.";
      }
      if (latestUserMsgLower.includes("light") || latestUserMsgLower.includes("street-light") || latestUserMsgLower.includes("electricity") || latestUserMsgLower.includes("power")) {
        return "Streetlights and local electrical grid concerns are managed by the BBMP Electrical Division, in collaboration with BESCOM. When you submit a broken streetlight report, it is forwarded directly to their electrical contractor queue.";
      }
      if (latestUserMsgLower.includes("garbage") || latestUserMsgLower.includes("waste") || latestUserMsgLower.includes("trash") || latestUserMsgLower.includes("dump")) {
        return "Illegal dumping and garbage accumulation are managed by the Solid Waste Management (SWM) cell under the BBMP. They dispatch localized sanitation supervisors to clear waste reported on our system.";
      }
      return "Bengaluru's municipal duties are divided: BBMP is responsible for roads, streetlights, and sanitation; BWSSB manages water lines and sewers; BESCOM covers electrical grids. CivicEye AI automatically identifies the correct agency and dispatches the alert.";
    }

    // Repair Information: timeline/duration
    if (latestUserMsgLower.includes("how long") || 
        latestUserMsgLower.includes("time") || 
        latestUserMsgLower.includes("duration") || 
        latestUserMsgLower.includes("when will") ||
        latestUserMsgLower.includes("sla")) {
      return "BBMP SLA targets vary by severity: Critical issues (like major water bursts or arterial road hazards) are resolved within 24 to 48 hours. Standard issues (like broken streetlights or minor potholes) typically take 3 to 7 business days once verified. You can monitor the real-time progress on our Dashboard.";
    }

    // Emergency Safety Guidance / Dangerous issues
    if (latestUserMsgLower.includes("safety") || 
        latestUserMsgLower.includes("danger") || 
        latestUserMsgLower.includes("emergency") || 
        latestUserMsgLower.includes("sparking") || 
        latestUserMsgLower.includes("accident") ||
        latestUserMsgLower.includes("dangerous")) {
      return "For immediate public dangers (like live sparking wires or open manholes), contact local helplines: BESCOM at 1912 or BBMP Control Room at 080-22221188. If reporting on CivicEye, flag it as 'Critical' severity for high priority dispatch.";
    }

    // General Civic Questions / FAQ about the app
    if (latestUserMsgLower.includes("what is civiceye") || 
        latestUserMsgLower.includes("how does this platform") || 
        latestUserMsgLower.includes("how does it work") || 
        latestUserMsgLower.includes("what does this app")) {
      return "CivicEye AI is a modern civic engagement platform for Bengaluru. Citizens upload photos of infrastructure issues (potholes, garbage, water leaks, broken lights). Our AI analyzes the visual evidence, maps the location to the correct BBMP ward, checks for duplicates, and auto-dispatches reports to the responsible authority.";
    }

    // Default conversational reply
    return "Greetings! I am Officer Gemini, your AI Civic Assistant at the CivicEye BBMP Desk. I can answer general questions about Bangalore municipal departments, repair timelines, safety advice, or guide you through registering a new complaint. How can I assist you today?";
  }

  // --- Complaint Registration Mode ---
  let category = "Pothole";
  if (userTextLower.includes("garbage") || userTextLower.includes("trash") || userTextLower.includes("waste") || userTextLower.includes("dump")) category = "Garbage Accumulation";
  else if (userTextLower.includes("water") || userTextLower.includes("leak") || userTextLower.includes("pipe") || userTextLower.includes("sewage")) category = "Water Leakage";
  else if (userTextLower.includes("light") || userTextLower.includes("lamp") || userTextLower.includes("dark") || userTextLower.includes("streetlight")) category = "Broken Streetlight";

  let citizenName = "";
  let contactInfo = "";
  let locality = "";
  let description = "";
  let severity = "High";

  // Reconstruct states based on the conversation history turns
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "model" || msg.role === "assistant") {
      const msgLower = msg.content.toLowerCase();
      const nextUserMsg = messages[i + 1];
      if (nextUserMsg && nextUserMsg.role === "user") {
        const userVal = nextUserMsg.content.trim();
        const userValLower = userVal.toLowerCase();

        if (msgLower.includes("full name") || msgLower.includes("reporter details") || msgLower.includes("full name and a contact number")) {
          const phoneMatch = userVal.match(/(?:\+91|0)?[6-9]\d{9}/);
          const emailMatch = userVal.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (phoneMatch) contactInfo = phoneMatch[0];
          else if (emailMatch) contactInfo = emailMatch[0];

          const nameMatch = userVal.match(/(?:my name is|i am|this is|call me)\s+([a-zA-Z\s]+?)(?:\.|\b|and|for)/i);
          if (nameMatch && nameMatch[1]) {
            citizenName = nameMatch[1].trim();
          } else {
            const cleanedText = userVal.replace(phoneMatch ? phoneMatch[0] : "", "").replace(emailMatch ? emailMatch[0] : "", "").replace(/,/g, "").trim();
            if (cleanedText && cleanedText.length < 35 && !cleanedText.toLowerCase().includes("koramangala") && !cleanedText.toLowerCase().includes("indiranagar") && !cleanedText.toLowerCase().includes("hebbal") && !cleanedText.toLowerCase().includes("jayanagar") && !cleanedText.toLowerCase().includes("peenya") && !cleanedText.toLowerCase().includes("malleshwaram") && !cleanedText.toLowerCase().includes("marathahalli") && !cleanedText.toLowerCase().includes("road") && !cleanedText.toLowerCase().includes("street") && !cleanedText.toLowerCase().includes("near")) {
              citizenName = cleanedText;
            }
          }
        }

        if (msgLower.includes("exact locality, landmark, or street name") || msgLower.includes("locality, landmark, or street name")) {
          if (!userValLower.includes("my name is") && !userValLower.includes("i am") && userValLower.length > 3) {
            locality = userVal;
          }
        }

        if (msgLower.includes("description of the issue")) {
          description = userVal;
          if (userValLower.includes("critical") || userValLower.includes("flooding") || userValLower.includes("danger") || userValLower.includes("accident") || userValLower.includes("risk")) {
            severity = "Critical";
          } else if (userValLower.includes("medium")) {
            severity = "Medium";
          } else if (userValLower.includes("low") || userValLower.includes("minor")) {
            severity = "Low";
          }
        }
      }
    }
  }

  // Backup regex parsers
  if (!citizenName) {
    const nameMatch = userText.match(/(?:my name is|i am|this is|call me)\s+([a-zA-Z\s]+?)(?:\.|\b|and|for)/i);
    if (nameMatch && nameMatch[1]) {
      citizenName = nameMatch[1].trim();
    }
  }
  if (!contactInfo) {
    const phoneMatch = userText.match(/(?:\+91|0)?[6-9]\d{9}/);
    const emailMatch = userText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (phoneMatch) contactInfo = phoneMatch[0];
    else if (emailMatch) contactInfo = emailMatch[0];
  }
  if (!locality) {
    if (userTextLower.includes("indiranagar") || userTextLower.includes("domlur")) {
      locality = "Indiranagar 100 Feet Road";
    } else if (userTextLower.includes("koramangala") || userTextLower.includes("hsr")) {
      locality = "Koramangala 4th Block";
    } else if (userTextLower.includes("hebbal") || userTextLower.includes("vidyaranyapura")) {
      locality = "Hebbal Bellary Road";
    } else if (userTextLower.includes("jayanagar") || userTextLower.includes("jp nagar")) {
      locality = "Jayanagar 4th T Block";
    } else if (userTextLower.includes("peenya")) {
      locality = "Peenya Industrial Area";
    } else if (userTextLower.includes("malleshwaram")) {
      locality = "Malleshwaram 15th Cross";
    } else if (userTextLower.includes("marathahalli") || userTextLower.includes("mahadevapura")) {
      locality = "Marathahalli Outer Ring Road";
    }
  }
  if (!description) {
    for (let i = 0; i < userMessages.length; i++) {
      const msg = userMessages[i].content;
      if (msg.length > 20 && !msg.toLowerCase().includes("my name") && !msg.toLowerCase().includes("i am") && !msg.toLowerCase().includes("phone") && !msg.toLowerCase().includes("email") && !msg.toLowerCase().includes("report") && !msg.toLowerCase().includes("register")) {
        description = msg;
        break;
      }
    }
  }

  // 1. Collect Name & Contact Info
  if (!citizenName || !contactInfo) {
    if (!citizenName && !contactInfo) {
      return `Sure, I can help you register a complaint for this **${category.toLowerCase()}**. Let's gather the details step-by-step.
      
To start, may I please have your **full name** and a **contact number or email address** to associate with this report?`;
    } else if (!citizenName) {
      return `Thank you for the contact info (${contactInfo}). Could you please tell me your **full name** so I can associate it with the reporter details?`;
    } else if (!contactInfo) {
      return `Thank you, **${citizenName}**. Could you please provide a **contact number or email address** so that the BBMP engineers can reach you for verification if needed?`;
    }
  }

  // 2. Collect Locality/Address
  if (!locality) {
    return `Got it, **${citizenName}**! I have noted your contact info as **${contactInfo}**. 

Now, please tell me the **exact locality, landmark, or street name** in Bengaluru where this issue is located?`;
  }

  // 3. Collect Description/Details
  if (!description) {
    return `Location recorded as **${locality}**. 

Could you please provide a short **description of the issue**? (e.g. how large it is, is it causing any traffic gridlock, and what is its severity level: Low, Medium, High, or Critical?)`;
  }

  let authority = "Municipal Corporation Roads Department";
  let ward = "Ward 3 - Indiranagar & Domlur";
  
  if (category === "Garbage Accumulation") {
    authority = "Solid Waste Management Authority";
    ward = "Ward 2 - Koramangala & HSR";
  } else if (category === "Water Leakage") {
    authority = "Water Supply & Sewerage Board";
    ward = "Ward 2 - Koramangala & HSR";
  } else if (category === "Broken Streetlight") {
    authority = "Municipal Electrical Services Division";
    ward = "Ward 1 - Hebbal & Vidyaranyapura";
  }

  const locLower = locality.toLowerCase();
  if (locLower.includes("hebbal") || locLower.includes("vidya")) ward = "Ward 1 - Hebbal & Vidyaranyapura";
  else if (locLower.includes("kora") || locLower.includes("hsr")) ward = "Ward 2 - Koramangala & HSR";
  else if (locLower.includes("indira") || locLower.includes("doml")) ward = "Ward 3 - Indiranagar & Domlur";
  else if (locLower.includes("jayan") || locLower.includes("jp na")) ward = "Ward 4 - Jayanagar & JP Nagar";
  else if (locLower.includes("peenya")) ward = "Ward 5 - Peenya Industrial Zone";
  else if (locLower.includes("malli") || locLower.includes("old")) ward = "Ward 6 - Malleshwaram & Old Town";
  else if (locLower.includes("marath") || locLower.includes("mahadev")) ward = "Ward 7 - Mahadevapura Zone & Marathahalli";

  // Safeguard: If user name replaces locality, reset locality to a fallback
  if (locality === citizenName) {
    locality = "Bengaluru City Centre";
  }

  return `Excellent! I have compiled the official BBMP intake details for your review:

- **Citizen Name**: ${citizenName}
- **Contact Info**: ${contactInfo}
- **Defect Category**: ${category}
- **Assigned Authority**: ${authority}
- **Severity Level**: ${severity}
- **Locality Zone**: ${locality}
- **Assigned Ward**: ${ward}
- **Description**: ${description}

Please confirm if these details are correct by clicking the **"File Official Complaint"** button below.

[COMPLAINT_DATA_JSON_START]
{
  "citizen_name": "${citizenName}",
  "contact_info": "${contactInfo}",
  "issue_type": "${category}",
  "locality": "${locality}",
  "ward": "${ward}",
  "severity": "${severity}",
  "description": "${description.replace(/"/g, '\\"')}",
  "authority": "${authority}"
}
[COMPLAINT_DATA_JSON_END]`;
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
        console.warn(`Gemini API returned 503 in chat. Retrying ${i + 1}/${retries} after ${delays[i]}ms...`);
        await delay(delays[i]);
        continue;
      }
      return res;
    } catch (err: any) {
      lastError = err;
      if (i < retries) {
        console.warn(`Network error in Gemini chat call: ${err.message || err}. Retrying ${i + 1}/${retries} after ${delays[i]}ms...`);
        await delay(delays[i]);
        continue;
      }
    }
  }
  throw lastError || new Error("Gemini max retries reached in chat.");
}

export async function POST(request: Request) {
  let messages: any[] = [];
  try {
    const body = await request.json();
    messages = body.messages;
 
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing conversation history." }, { status: 400 });
    }
 
    const testMode = process.env.TEST_MODE !== "false";
    const apiKey = process.env.GEMINI_API_KEY;
 
    if (testMode || !apiKey) {
      console.log("Chat running in testMode or missing apiKey. Loading mock reply.");
      await delay(800); // Simulate network latency
      const reply = getMockChatResponse(messages);
      return NextResponse.json({ role: "model", content: reply });
    }
 
    // Configure system instruction for BBMP desk intake officer
    const systemInstructionText = `You are Officer Gemini, the AI Municipal Intake Officer at the CivicEye BBMP Desk in Bengaluru.
Your goal is to answer citizen's municipal questions or conduct a step-by-step interview with citizens to report civic infrastructure issues (potholes, water leaks, broken streetlights, garbage heaps).

Guidelines:
1. Determine the user's intent. Supported intents include:
   - General Civic Questions: Answer normally with professional city guidance.
   - Complaint Status Inquiry: Explain how to check report status on Dashboard or \`/report/<ID>\` URL.
   - Repair Information: Provide average repair timelines (e.g., 24-48 hours for critical water leaks, 3-7 days for road repairs and streetlights).
   - Authority Guidance: Explain which agency handles which issues (e.g., BBMP handles roads, lights, waste; BWSSB handles sewers/water leaks; BESCOM handles electrical lines).
   - Emergency Safety Guidance: Guide them to BESCOM (1912) or BBMP Control Room (080-22221188) for live dangers.
   - AI Explainability: Explain how severity is calculated or how duplicate detection works (e.g., checks 200m radius buffer).
   - Complaint Registration: ONLY enter this mode when the citizen clearly indicates they want to report, register, or file a complaint (e.g., "I want to report...", "There is a water leakage near my house"). Merely mentioning "pothole" or "garbage" in a question does NOT trigger registration.
2. When in Complaint Registration mode, politely gather the following fields step-by-step (one or two at a time):
   - Citizen Name
   - Contact Information (phone or email)
   - Locality/Address in Bengaluru (must keep intact, do NOT overwrite with user's name)
   - Issue Description & Severity (Low, Medium, High, Critical)
3. Once all registration details are collected, present a summary and append the structured JSON block inside [COMPLAINT_DATA_JSON_START] and [COMPLAINT_DATA_JSON_END] tags. Do NOT output this JSON block for general questions (non-registration intents).
   Format of the JSON block:
   [COMPLAINT_DATA_JSON_START]
   {
     "citizen_name": "Citizen name provided by the user",
     "contact_info": "Phone or email provided, or 'Not provided'",
     "issue_type": "Pothole | Water Leakage | Garbage Accumulation | Broken Streetlight",
     "locality": "Geographic locality or landmark in Bengaluru",
     "ward": "Derive the closest ward name from config: 'Ward 1 - Hebbal & Vidyaranyapura' | 'Ward 2 - Koramangala & HSR' | 'Ward 3 - Indiranagar & Domlur' | 'Ward 4 - Jayanagar & JP Nagar' | 'Ward 5 - Peenya Industrial Zone' | 'Ward 6 - Malleshwaram & Old Town'",
     "severity": "Low | Medium | High | Critical",
     "description": "Short summary description",
     "authority": "Municipal Corporation Roads Department | Water Supply & Sewerage Board | Solid Waste Management Authority | Municipal Electrical Services Division"
   }
   [COMPLAINT_DATA_JSON_END]`;
 
    // Map history to Gemini format
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : m.role === "model" ? "model" : "user",
      parts: [{ text: String(m.content || "") }]
    }));
 
    const payload = {
      contents,
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      }
    };
 
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
 
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
        console.error("Gemini API Error in chat:", errorText);
        throw new Error(`Gemini API returned status ${geminiRes.status}: ${errorText}`);
      }
 
      const responseData = await geminiRes.json();
      const textResult = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
 
      if (!textResult) {
        throw new Error("Received empty response content from Gemini in chat.");
      }
 
      return NextResponse.json({ role: "model", content: textResult });
    } catch (apiErr: any) {
      clearTimeout(timeoutId);
      console.warn("Gemini API chat failed. Falling back to mock response. Error details:", apiErr.message || apiErr);
      const reply = getMockChatResponse(messages);
      return NextResponse.json({ role: "model", content: reply });
    }
 
  } catch (error) {
    console.error("Error in chat API handler:", error);
    const reply = getMockChatResponse(messages);
    return NextResponse.json({ role: "model", content: reply });
  }
}
