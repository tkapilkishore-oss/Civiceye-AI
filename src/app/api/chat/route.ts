import { NextResponse } from "next/server";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getMockChatResponse(messages: Array<{role: string, content: string}>): string {
  const userMessages = messages.filter(m => m.role === "user");
  const userText = userMessages.map(m => m.content).join(" ");
  const userTextLower = userText.toLowerCase();

  // Parse values from history
  let category = "Pothole";
  if (userTextLower.includes("garbage") || userTextLower.includes("trash") || userTextLower.includes("waste") || userTextLower.includes("dump")) category = "Garbage Accumulation";
  else if (userTextLower.includes("water") || userTextLower.includes("leak") || userTextLower.includes("pipe") || userTextLower.includes("sewage")) category = "Water Leakage";
  else if (userTextLower.includes("light") || userTextLower.includes("lamp") || userTextLower.includes("dark") || userTextLower.includes("streetlight")) category = "Broken Streetlight";

  let citizenName = "Concerned Citizen";
  const nameMatch = userText.match(/(?:my name is|i am|this is|call me)\s+([a-zA-Z\s]+?)(?:\.|\b|and|for)/i);
  if (nameMatch && nameMatch[1]) {
    citizenName = nameMatch[1].trim();
  } else if (userMessages.length > 0) {
    const firstUserMsg = userMessages[0]?.content || "";
    const secondUserMsg = userMessages[1]?.content || "";
    if (secondUserMsg && secondUserMsg.length < 30 && !secondUserMsg.toLowerCase().includes("pothole") && !secondUserMsg.toLowerCase().includes("leak") && !secondUserMsg.toLowerCase().includes("light") && !secondUserMsg.toLowerCase().includes("garbage") && !secondUserMsg.toLowerCase().includes("road") && !secondUserMsg.toLowerCase().includes("street") && !secondUserMsg.toLowerCase().includes("nagar") && !secondUserMsg.toLowerCase().includes("hsr")) {
      citizenName = secondUserMsg.trim();
    } else if (firstUserMsg.length < 25 && !firstUserMsg.toLowerCase().includes("pothole") && !firstUserMsg.toLowerCase().includes("leak") && !firstUserMsg.toLowerCase().includes("light") && !firstUserMsg.toLowerCase().includes("garbage") && !firstUserMsg.toLowerCase().includes("road") && !firstUserMsg.toLowerCase().includes("street")) {
      citizenName = firstUserMsg.trim();
    }
  }

  let locality = "Bengaluru";
  if (userTextLower.includes("indiranagar") || userTextLower.includes("domlur")) {
    locality = "Indiranagar";
  } else if (userTextLower.includes("koramangala") || userTextLower.includes("hsr")) {
    locality = "Koramangala 4th Block";
  } else if (userTextLower.includes("hebbal") || userTextLower.includes("vidyaranyapura")) {
    locality = "Hebbal";
  } else if (userTextLower.includes("jayanagar") || userTextLower.includes("jp nagar")) {
    locality = "Jayanagar 4th T Block";
  } else if (userTextLower.includes("peenya")) {
    locality = "Peenya Industrial Area";
  } else if (userTextLower.includes("malleshwaram")) {
    locality = "Malleshwaram 15th Cross";
  } else {
    for (let i = userMessages.length - 1; i >= 0; i--) {
      const msg = userMessages[i].content;
      if (msg.toLowerCase().includes("road") || msg.toLowerCase().includes("street") || msg.toLowerCase().includes("cross") || msg.toLowerCase().includes("layout") || msg.toLowerCase().includes("nagar") || msg.toLowerCase().includes("ward")) {
        if (!msg.toLowerCase().includes("my name is") && !msg.toLowerCase().includes("i am") && msg.length < 50) {
          locality = msg.trim();
          break;
        }
      }
    }
  }

  let contactInfo = "Not provided";
  const emailMatch = userText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = userText.match(/(?:\+91|0)?[6-9]\d{9}/);
  if (phoneMatch) contactInfo = phoneMatch[0];
  else if (emailMatch) contactInfo = emailMatch[0];

  let severity = "High";
  if (userTextLower.includes("critical") || userTextLower.includes("flooding") || userTextLower.includes("danger") || userTextLower.includes("accident") || userTextLower.includes("risk")) {
    severity = "Critical";
  } else if (userTextLower.includes("medium")) {
    severity = "Medium";
  } else if (userTextLower.includes("low") || userTextLower.includes("minor")) {
    severity = "Low";
  }

  let description = "Reported defect via stateful AI Assistant desk.";
  if (userMessages.length > 0) {
    const firstMsg = userMessages[0].content;
    if (firstMsg.length > 10) {
      description = firstMsg;
    }
  }

  if (userMessages.length === 1) {
    return `Greetings from the CivicEye BBMP Intake Desk. I am Officer Gemini, your AI Intake Assistant.
    
I can file an official complaint on your behalf. May I please know your **full name** and any **contact info** (phone/email) you wish to attach to this report?`;
  }

  if (userMessages.length === 2) {
    return `Thank you, ${citizenName}. I have logged your name and contact details. Now, could you specify the **exact locality, landmark, or street name** in Bengaluru where this ${category.toLowerCase()} is located?`;
  }

  if (userMessages.length === 3) {
    return `Got it! We have registered the location as **${locality}**. Could you describe the issue in detail (e.g. is it causing traffic, is it dangerous, when did it start)? Also, please specify the severity level (Low, Medium, High, Critical) if possible.`;
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

  if (locality.toLowerCase().includes("hebbal") || locality.toLowerCase().includes("vidya")) ward = "Ward 1 - Hebbal & Vidyaranyapura";
  else if (locality.toLowerCase().includes("kora") || locality.toLowerCase().includes("hsr")) ward = "Ward 2 - Koramangala & HSR";
  else if (locality.toLowerCase().includes("indira") || locality.toLowerCase().includes("doml")) ward = "Ward 3 - Indiranagar & Domlur";
  else if (locality.toLowerCase().includes("jayan") || locality.toLowerCase().includes("jp na")) ward = "Ward 4 - Jayanagar & JP Nagar";
  else if (locality.toLowerCase().includes("peenya")) ward = "Ward 5 - Peenya Industrial Zone";
  else if (locality.toLowerCase().includes("malli") || locality.toLowerCase().includes("old")) ward = "Ward 6 - Malleshwaram & Old Town";

  return `Thank you, ${citizenName}. I have compiled the official BBMP intake diagnostics for your report:

- **Citizen Name**: ${citizenName}
- **Contact Info**: ${contactInfo}
- **Defect Category**: ${category}
- **Assigned Authority**: ${authority}
- **Severity Level**: ${severity}
- **Locality Zone**: ${locality}
- **Assigned Ward**: ${ward}

Please confirm if these details are correct by clicking the button below to file the official complaint.

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
Your goal is to conduct a step-by-step interview with citizens to report civic infrastructure issues (potholes, water leaks, broken streetlights, garbage heaps).

Guidelines:
1. Act as a professional municipal intake desk officer. Keep a helpful, formal, and structured tone.
2. Politely gather the following fields from the citizen:
   - Citizen Name (must ask for this first or early)
   - Issue Category (e.g. Pothole, Water Leakage, Garbage Accumulation, Broken Streetlight)
   - Locality/Address in Bengaluru (landmarks, street names, suburbs)
   - Description and specific details of the defect
   - Severity level (infer or ask: Low, Medium, High, Critical)
   - Contact Information (phone number or email, optional)
3. Do not ask for all details at once. Ask one or two friendly questions at a time.
4. Once you have gathered all details, present a summary to the user and ask for confirmation.
5. In addition to the text response, you MUST append a structured JSON block at the very end of your response inside [COMPLAINT_DATA_JSON_START] and [COMPLAINT_DATA_JSON_END] tags.
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
