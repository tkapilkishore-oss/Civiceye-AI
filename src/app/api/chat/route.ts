import { NextResponse } from "next/server";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getMockChatResponse(messages: Array<{role: string, content: string}>, complaintSession?: any): string {
  if (complaintSession && complaintSession.active) {
    const step = complaintSession.currentStep;
    const data = complaintSession.collectedData;
    const issueType = complaintSession.issueType;

    if (step === "issue_type") {
      return "Certainly. Could you tell me what the complaint is regarding?\n\nFor example:\n• Pothole\n• Water Leakage\n• Garbage Accumulation\n• Broken Streetlight";
    }
    if (step === "name") {
      return `I can help you register that ${issueType || 'civic'} complaint. May I know your full name?`;
    }
    if (step === "contact") {
      return `Thank you, ${data.name || 'Citizen'}. Please provide your contact number or email address.`;
    }
    if (step === "location") {
      return `Got it. Please share the exact location of the issue (street, locality, or landmark).`;
    }
    if (step === "description") {
      return `Understood. Could you briefly describe the problem?`;
    }
    if (step === "image") {
      return `Do you have an image of the issue? You can upload one, or type 'no' to skip.`;
    }
    if (step === "completed") {
      return `Thank you! I have compiled all the details. I will now generate and file your official report.`;
    }
    return `Let's proceed with the complaint registration.`;
  }

  const userMessages = messages.filter(m => m.role === "user");
  const userText = userMessages.map(m => m.content).join(" ");
  const userTextLower = userText.toLowerCase();

  const latestUserMsg = userMessages[userMessages.length - 1]?.content || "";
  const latestUserMsgLower = latestUserMsg.toLowerCase().trim();

  const assistantMessages = messages.filter(m => m.role === "assistant" || m.role === "model");

  // Community validation check
  const isCommunityCheck = 
    latestUserMsgLower.includes("anyone else reported") || 
    latestUserMsgLower.includes("someone else reported") ||
    latestUserMsgLower.includes("any other report") ||
    latestUserMsgLower.includes("has anyone else") ||
    latestUserMsgLower.includes("similar complaints");

  if (isCommunityCheck) {
    const hasDuplicates = 
      latestUserMsgLower.includes("vidyaranyapura") ||
      latestUserMsgLower.includes("pothole") ||
      latestUserMsgLower.includes("garbage") ||
      latestUserMsgLower.includes("koramangala") ||
      latestUserMsgLower.includes("whitefield") ||
      latestUserMsgLower.includes("leak") ||
      (complaintSession && complaintSession.collectedData && 
       ((complaintSession.collectedData.locality || "").toLowerCase().includes("vidyaranyapura") ||
        (complaintSession.collectedData.locality || "").toLowerCase().includes("koramangala") ||
        (complaintSession.collectedData.locality || "").toLowerCase().includes("whitefield")));
       
    if (hasDuplicates) {
      return "Yes. Multiple similar complaints have already been detected in this locality. Your report has strengthened community validation and helps authorities prioritize the issue.";
    } else {
      return "No matching reports have been detected yet. Your complaint becomes the first recorded report for this issue.";
    }
  }

  // Category 5 — Out of Scope Classification
  const isOutOfScope = 
    /speed of light|quantum|stock market|programming|coding|python|javascript|c\+\+|java|html|css|react|nextjs|tutorial|movie review|politics|medical advice|physic|chemistry|astronomy|galaxy|recipe|sports|movies|travel/i.test(latestUserMsgLower);

  if (isOutOfScope) {
    return "I apologize, but CivicEye AI specializes in civic infrastructure, municipal services, complaint registration, public utilities, and related citizen assistance. I am unable to answer topics outside this scope. Please feel free to ask a civic-related question instead.";
  }

  // Category 1 — Greetings
  const isGreeting = /^(hello|hi|hey|greetings|good\s*morning|good\s*evening|good\s*afternoon|how\s*are\s*you)/i.test(latestUserMsgLower);
  const isThankYou = /thank\s*you|thanks/i.test(latestUserMsgLower);
  const isGoodbye = /^(bye|goodbye|see\s*you)/i.test(latestUserMsgLower);
  
  // Math matcher: e.g. "2 + 2", "10 * 12", "10 x 12", "what is 2 + 2"
  const mathMatch = latestUserMsgLower.match(/(?:what\s*is\s*)?(\d+)\s*([\+\-\*\/x])\s*(\d+)/i);
  const isMath = mathMatch !== null;

  const isAlphabetOrGeneral = 
    latestUserMsgLower.includes("second letter") ||
    latestUserMsgLower.includes("alphabet") ||
    latestUserMsgLower.includes("today's day") ||
    latestUserMsgLower.includes("what day is it");

  const isEveryday = isGreeting || isThankYou || isGoodbye || isMath || isAlphabetOrGeneral;

  if (isEveryday && !latestUserMsgLower.includes("report") && !latestUserMsgLower.includes("register") && !latestUserMsgLower.includes("pothole") && !latestUserMsgLower.includes("garbage") && !latestUserMsgLower.includes("leak") && !latestUserMsgLower.includes(" streetlight")) {
    if (isGreeting) {
      if (latestUserMsgLower.includes("morning")) {
        return "Good morning! I am Officer Gemini, your Civic AI Companion. Let me know if you need help with civic Q&A or filing a complaint.";
      }
      if (latestUserMsgLower.includes("afternoon")) {
        return "Good afternoon! I am Officer Gemini, your Civic AI Companion. Let me know if you need help with civic Q&A or filing a complaint.";
      }
      if (latestUserMsgLower.includes("evening")) {
        return "Good evening! I am Officer Gemini, your Civic AI Companion. Let me know if you need help with civic Q&A or filing a complaint.";
      }
      return "Hello! I am Officer Gemini, your Civic AI Companion. How can I assist you with municipal services, civic questions, or registering a complaint today?";
    }
    if (isThankYou) {
      return "You're very welcome! I'm here to help. Let me know if you have any other civic questions.";
    }
    if (isGoodbye) {
      return "Goodbye! Have a great day ahead. Let me know whenever you need assistance.";
    }
    if (isMath && mathMatch) {
      const num1 = parseInt(mathMatch[1]);
      const op = mathMatch[2].toLowerCase();
      const num2 = parseInt(mathMatch[3]);
      let result = 0;
      let opSymbol = op;
      if (op === "+") result = num1 + num2;
      else if (op === "-") result = num1 - num2;
      else if (op === "*" || op === "x") {
        result = num1 * num2;
        opSymbol = "×";
      }
      else if (op === "/") result = Math.round((num1 / num2) * 100) / 100;
      return `${num1} ${opSymbol} ${num2} is ${result}.`;
    }
    if (latestUserMsgLower.includes("second letter")) {
      return "The second letter of the alphabet is B.";
    }
    if (latestUserMsgLower.includes("today's day") || latestUserMsgLower.includes("what day is it")) {
      return "Today is a great day to improve our city's infrastructure!";
    }
    return "Greetings! Let me know how I can help you with civic issues or municipal queries.";
  }

  // Category 4 — Complaint Mode (Step-by-Step Collection)
  //
  // Detection is intentionally broad. The client-side state machine in
  // page.tsx is the authoritative router; this mock handler must agree.

  // Explicit registration phrases
  const explicitReportPhrases = [
    "i want to report", "i want to register", "i want to file",
    "i need to report", "i need to register", "i need to file",
    "please register", "please report", "please file",
    "register a complaint", "file a complaint", "report a complaint",
    "register an issue", "file an issue", "report an issue",
    "create a complaint", "new complaint", "submit a complaint",
    "report this", "register this", "i would like to report",
    "i would like to register", "i would like to file",
    "i need to report a civic", "i want to report a civic",
  ];
  const explicitReportRequest = explicitReportPhrases.some((p) => latestUserMsgLower.includes(p));

  // Civic problem keywords that indicate a reportable defect
  const civicProblemKeywords = [
    "pothole", "garbage", "trash", "waste", "dump", "litter",
    "water leak", "water leakage", "pipe burst", "pipe leak",
    "sewage", "drainage", "drain overflow", "flooding", "flood",
    "streetlight", "street light", "lamp post", "street-light",
    "broken light", "light not working", "light is not working",
    "road damage", "road not repaired", "road has", "broken road",
    "damaged road", "road is broken",
  ];
  // Also match singular civic keywords when accompanied by a problem pattern
  const hasCivicKeyword =
    civicProblemKeywords.some((kw) => latestUserMsgLower.includes(kw)) ||
    /pothole|leak|streetlight|garbage|trash|waste|sewage|drain|flood/i.test(latestUserMsgLower);

  // Problem statement patterns — deliberately broad to match natural language
  const problemStatementPatterns = [
    /there\s+is\s+(a|an)?\s*/i,
    /there'?s\s+(a|an)?\s*/i,
    /i\s+(have|found|noticed|see|saw|spotted)\s+(a|an)?\s*/i,
    /we\s+(have|found|noticed|see|saw)\s+(a|an)?\s*/i,
    /my\s+(area|road|street|locality|house|building|colony|lane)\s+(has|have)/i,
    /our\s+(area|road|street|locality|lane)\s+(has|have)/i,
    /found\s+(a|an)?\s*/i,
    /near\s+(my|the|our)\s+/i,
    /on\s+(my|the|our)\s+(road|street|lane|area)/i,
    /\b(broken|damaged|blocked|clogged|overflowing|leaking|flooded|dirty|unsafe|hazardous)\b/i,
    /not\s+working/i,
    /isn'?t\s+working/i,
    /has\s+been\s+(broken|damaged|blocked|leaking|overflowing|flooded|there|present)/i,
    /has\s+not\s+been\s+(repaired|fixed|cleaned)/i,
    /\bfor\s+(the\s+past|over|nearly|about)\s+\d+/i,
    /\bfor\s+(one|two|three|four|five|a few|several|many)\s+(day|week|month)/i,
    /\b(repair|fix|clean|clear|remove)\s+(the|this|a|an)?\s*(pothole|leak|garbage|streetlight|road|pipe|drain)/i,
  ];
  const matchesProblemPattern = problemStatementPatterns.some((re) => re.test(latestUserMsgLower));

  // Questions should never trigger complaint mode
  const isQuestion =
    /^(what|why|how|who|which|where|when|can\s+you|tell\s+me|is\s+there|are\s+there)\b/i.test(latestUserMsgLower) ||
    latestUserMsgLower.endsWith("?");

  const problemStatementRequest = hasCivicKeyword && matchesProblemPattern;
  const wantsToReport = (explicitReportRequest || problemStatementRequest) && !isQuestion;
  const inRegistrationMode = wantsToReport;

  if (inRegistrationMode) {
    // Detect the issue type from all user messages so far
    let category = "";
    if (userTextLower.includes("garbage") || userTextLower.includes("trash") || userTextLower.includes("waste") || userTextLower.includes("dump")) category = "Garbage Accumulation";
    else if (userTextLower.includes("water") || userTextLower.includes("leak") || userTextLower.includes("pipe") || userTextLower.includes("sewage") || userTextLower.includes("flood")) category = "Water Leakage";
    else if (userTextLower.includes("light") || userTextLower.includes("lamp") || userTextLower.includes("dark") || userTextLower.includes("streetlight")) category = "Broken Streetlight";
    else if (userTextLower.includes("pothole") || userTextLower.includes("road") || userTextLower.includes("crater")) category = "Pothole";

    let citizenName = "";
    let contactInfo = "";
    let locality = "";
    let description = "";

    // Extract fields sequentially based on past assistant questions
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === "model" || msg.role === "assistant") {
        const msgLower = msg.content.toLowerCase();
        const nextUserMsg = messages[i + 1];
        if (nextUserMsg && nextUserMsg.role === "user") {
          const userVal = nextUserMsg.content.trim();

          if (msgLower.includes("full name") || msgLower.includes("your name")) {
            citizenName = userVal;
          } else if (msgLower.includes("contact number") || msgLower.includes("email")) {
            contactInfo = userVal;
          } else if (msgLower.includes("exact location") || msgLower.includes("where is it located") || msgLower.includes("locality")) {
            locality = userVal;
          } else if (msgLower.includes("description of the issue") || msgLower.includes("describe the problem")) {
            description = userVal;
          } else if (msgLower.includes("complaint regarding") || msgLower.includes("what is the complaint") || msgLower.includes("what is the issue")) {
            // User answered the issue-discovery question — category is now in their reply
            const issueReply = userVal.toLowerCase();
            if (!category) {
              if (issueReply.includes("garbage") || issueReply.includes("trash") || issueReply.includes("waste")) category = "Garbage Accumulation";
              else if (issueReply.includes("water") || issueReply.includes("leak") || issueReply.includes("pipe") || issueReply.includes("sewage")) category = "Water Leakage";
              else if (issueReply.includes("light") || issueReply.includes("lamp") || issueReply.includes("streetlight")) category = "Broken Streetlight";
              else if (issueReply.includes("pothole") || issueReply.includes("road") || issueReply.includes("crater")) category = "Pothole";
              else category = "Pothole"; // default fallback
            }
          }
        }
      }
    }

    // Try extracting from the first user message if they provided it immediately
    const initialUserMsg = messages[0]?.content || "";
    if (!citizenName) {
      const nameMatch = initialUserMsg.match(/(?:my name is|i am|this is)\s+([a-zA-Z\s\.]+?)(?:\.|\b|and|for)/i);
      if (nameMatch) citizenName = nameMatch[1].trim();
    }
    if (!contactInfo) {
      const phoneMatch = initialUserMsg.match(/(?:\+91|0)?[6-9]\d{9}/);
      if (phoneMatch) contactInfo = phoneMatch[0];
    }

    // ── Step 0: Issue Discovery ──
    // If the user made a generic request (no issue type known yet) and the
    // conversation has NOT yet gone through the discovery question, ask first.
    const hasAnsweredDiscovery = assistantMessages.some(
      (m) => m.content.toLowerCase().includes("complaint regarding") || m.content.toLowerCase().includes("what is the issue")
    );
    if (!category && !hasAnsweredDiscovery) {
      const q = `I'll be happy to help you register a civic complaint.\n\nTo begin, what is the complaint regarding?\n\n• Pothole\n• Water Leakage\n• Garbage Accumulation\n• Broken Streetlight\n• Other Civic Issue`;
      return `${q}

[COMPLAINT_FLOW_JSON_START]
{
  "nextField": "issue_type",
  "nextQuestion": "${q.replace(/\n/g, " ")}",
  "complaintState": {
    "citizen_name": "",
    "contact_info": "",
    "locality": "",
    "description": ""
  }
}
[COMPLAINT_FLOW_JSON_END]`;
    }

    // Default category if still unknown after discovery answer
    if (!category) category = "Pothole";

    // ── Step 1: Collect Name ──
    if (!citizenName) {
      const q = `Great, I'll register your **${category}** complaint. Let's do it step by step.\n\nFirst, what is your **full name**?`;
      return `${q}

[COMPLAINT_FLOW_JSON_START]
{
  "nextField": "name",
  "nextQuestion": "${q.replace(/\n/g, " ")}",
  "complaintState": {
    "citizen_name": "",
    "contact_info": "",
    "locality": "",
    "description": ""
  }
}
[COMPLAINT_FLOW_JSON_END]`;
    }

    // Step 2: Collect Contact Info
    if (!contactInfo) {
      const q = `Thanks, **${citizenName}**. What is a **contact number or email** where the department can reach you?`;
      return `${q}
      
[COMPLAINT_FLOW_JSON_START]
{
  "nextField": "contact",
  "nextQuestion": "Thanks, ${citizenName}. What is a contact number or email where the department can reach you?",
  "complaintState": {
    "citizen_name": "${citizenName}",
    "contact_info": "",
    "locality": "",
    "description": ""
  }
}
[COMPLAINT_FLOW_JSON_END]`;
    }

    // Step 3: Collect Location
    if (!locality) {
      const q = "Got it. What is the **exact location** (street name, locality, landmark) of the issue?";
      return `${q}
      
[COMPLAINT_FLOW_JSON_START]
{
  "nextField": "location",
  "nextQuestion": "${q}",
  "complaintState": {
    "citizen_name": "${citizenName}",
    "contact_info": "${contactInfo}",
    "locality": "",
    "description": ""
  }
}
[COMPLAINT_FLOW_JSON_END]`;
    }

    // Step 4: Collect Description
    if (!description) {
      const q = "Understood. Please provide a brief **description of the issue** (e.g. details of the problem).";
      return `${q}
      
[COMPLAINT_FLOW_JSON_START]
{
  "nextField": "description",
  "nextQuestion": "${q}",
  "complaintState": {
    "citizen_name": "${citizenName}",
    "contact_info": "${contactInfo}",
    "locality": "${locality}",
    "description": ""
  }
}
[COMPLAINT_FLOW_JSON_END]`;
    }

    // Step 5: Ask for Optional Image
    const lastModelMsg = assistantMessages[assistantMessages.length - 1]?.content || "";
    const isAskingForImage = lastModelMsg.includes("image") || lastModelMsg.includes("photo");
    const userImageResponse = latestUserMsgLower;

    if (isAskingForImage && (userImageResponse.includes("no") || userImageResponse.includes("skip") || userImageResponse.includes("don't have"))) {
      // User skips image, finalize details and complete
      let severity = "High";
      const descLower = description.toLowerCase();
      if (descLower.includes("critical") || descLower.includes("flooding") || descLower.includes("danger") || descLower.includes("accident") || descLower.includes("risk")) {
        severity = "Critical";
      } else if (descLower.includes("medium")) {
        severity = "Medium";
      } else if (descLower.includes("low") || descLower.includes("minor")) {
        severity = "Low";
      }

      let authority = "Municipal Corporation Roads Department";
      let ward = "Ward 3 - Indiranagar & Domlur";
      const locLower = locality.toLowerCase();
      const isBengaluru = !locLower.includes("chennai") && !locLower.includes("salem") && !locLower.includes("pune") && !locLower.includes("kochi") && !locLower.includes("delhi") && !locLower.includes("hyderabad") && !locLower.includes("mumbai") && !locLower.includes("jaipur");

      if (!isBengaluru) {
        let cityPrefix = "Local Corporation";
        if (locLower.includes("chennai")) cityPrefix = "Greater Chennai Corporation";
        else if (locLower.includes("salem")) cityPrefix = "Salem Municipal Corporation";
        else if (locLower.includes("pune")) cityPrefix = "Pune Municipal Corporation";
        else if (locLower.includes("kochi")) cityPrefix = "Kochi Municipal Corporation";
        else if (locLower.includes("delhi")) cityPrefix = "Municipal Corporation of Delhi";
        else if (locLower.includes("hyderabad")) cityPrefix = "Greater Hyderabad Municipal Corporation";
        else if (locLower.includes("mumbai")) cityPrefix = "Brihanmumbai Municipal Corporation";
        else if (locLower.includes("jaipur")) cityPrefix = "Jaipur Municipal Corporation";

        if (category === "Garbage Accumulation") {
          authority = `${cityPrefix} - Solid Waste Management Cell`;
        } else if (category === "Water Leakage") {
          authority = `${cityPrefix} - Water Supply & Sewerage Department`;
        } else if (category === "Broken Streetlight") {
          authority = `${cityPrefix} - Electrical Engineering Division`;
        } else {
          authority = `${cityPrefix} - Road Infrastructure Division`;
        }
        ward = `${cityPrefix} - Resolved Zone`;
      } else {
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
        if (locLower.includes("hebbal") || locLower.includes("vidya")) ward = "Ward 1 - Hebbal & Vidyaranyapura";
        else if (locLower.includes("kora") || locLower.includes("hsr")) ward = "Ward 2 - Koramangala & HSR";
        else if (locLower.includes("indira") || locLower.includes("doml")) ward = "Ward 3 - Indiranagar & Domlur";
        else if (locLower.includes("jayan") || locLower.includes("jp na")) ward = "Ward 4 - Jayanagar & JP Nagar";
        else if (locLower.includes("peenya")) ward = "Ward 5 - Peenya Industrial Zone";
        else if (locLower.includes("malli") || locLower.includes("old")) ward = "Ward 6 - Malleshwaram & Old Town";
        else if (locLower.includes("marath") || locLower.includes("mahadev")) ward = "Ward 7 - Mahadevapura Zone & Marathahalli";
      }

      const endMsg = "Thank you! I have compiled all the details. I will now generate and file your official report.";
      return `${endMsg}

[COMPLAINT_FLOW_JSON_START]
{
  "nextField": "completed",
  "nextQuestion": "${endMsg}",
  "complaintState": {
    "citizen_name": "${citizenName}",
    "contact_info": "${contactInfo}",
    "locality": "${locality}",
    "description": "${description.replace(/"/g, '\\"')}",
    "issue_type": "${category}",
    "severity": "${severity}",
    "ward": "${ward}",
    "authority": "${authority}"
  }
}
[COMPLAINT_FLOW_JSON_END]`;
    }

    if (!isAskingForImage) {
      const q = "Do you have an **image** of the issue? You can upload one, or type 'no' to skip.";
      return `${q}
      
[COMPLAINT_FLOW_JSON_START]
{
  "nextField": "image",
  "nextQuestion": "${q}",
  "complaintState": {
    "citizen_name": "${citizenName}",
    "contact_info": "${contactInfo}",
    "locality": "${locality}",
    "description": "${description}"
  }
}
[COMPLAINT_FLOW_JSON_END]`;
    }

    // Otherwise complete flow
    const severity = "High";
    const authority = "Municipal Corporation Roads Department";
    const ward = "Ward 3 - Indiranagar & Domlur";
    const endMsg = "Thank you! I have compiled all the details. I will now generate and file your official report.";
    return `${endMsg}

[COMPLAINT_FLOW_JSON_START]
{
  "nextField": "completed",
  "nextQuestion": "${endMsg}",
  "complaintState": {
    "citizen_name": "${citizenName}",
    "contact_info": "${contactInfo}",
    "locality": "${locality}",
    "description": "${description.replace(/"/g, '\\"')}",
    "issue_type": "${category}",
    "severity": "${severity}",
    "ward": "${ward}",
    "authority": "${authority}"
  }
}
[COMPLAINT_FLOW_JSON_END]`;
  }

  // Category 3 — Civic & Municipal Knowledge
  // This branch must NOT intercept messages that are clearly problem statements
  // (those should have been caught by Category 4 above). Only serve knowledge
  // responses for genuine question-style messages.
  const isCivicKnowledge =
    /pothole|garbage|waste|trash|streetlight|street-light|water leak|water Board|sewage|utility|municipal|ward|authority|department|track|complain|reject/i.test(latestUserMsgLower);

  const looksLikeKnowledgeQuestion =
    !matchesProblemPattern &&        // not a problem statement
    !hasCivicKeyword ||              // OR it's a genuine question
    isQuestion;                      // treat question-form messages as Q&A

  if (isCivicKnowledge && looksLikeKnowledgeQuestion && !latestUserMsgLower.includes("report") && !latestUserMsgLower.includes("register") && !latestUserMsgLower.includes("file")) {
    if (latestUserMsgLower.includes("pothole")) {
      return "Potholes are bowl-shaped depressions in the road pavement caused by water infiltration, sub-base erosion, temperature changes, and heavy vehicular traffic loads. When water seeps into the road cracks and is pressurized by tires, the asphalt breaks down. Municipal road infrastructure departments or local corporations are responsible for repaving and patching them.";
    }
    if (latestUserMsgLower.includes("garbage") || latestUserMsgLower.includes("trash") || latestUserMsgLower.includes("waste")) {
      return "Garbage accumulation is caused by irregular solid waste collection, illegal dumping, public littering, and lack of municipal bins. Solid Waste Management divisions handle clearing trash dumps and daily street sweeps. Standard resolution timelines for public garbage dumping complaints typically range from 24 to 48 hours.";
    }
    if (latestUserMsgLower.includes("ward")) {
      return "A municipal ward is a decentralized administrative subdivision within a city. Each ward represents a local electoral constituency managed by regional engineers, sanitation inspectors, and corporators. Wards help administrative authorities monitor solid waste, road works, and utility services efficiently at a localized scale.";
    }
    if (latestUserMsgLower.includes("water") || latestUserMsgLower.includes("leak") || latestUserMsgLower.includes("sewage")) {
      return "Water main leaks and sewer bursts are repaired by exposing the damaged pipe section, isolating the flow, and patching or replacing the conduit. This is handled by local water supply and sewerage boards (such as BWSSB in Bengaluru, DJB in Delhi, or CMWSSB in Chennai). Resolution times vary between 12 to 36 hours depending on pipeline diameter.";
    }
    if (latestUserMsgLower.includes("streetlight") || latestUserMsgLower.includes("light")) {
      return "Broken, flickering, or non-functional streetlights are serviced by the municipal corporation's Electrical Engineering Division or regional electricity supply boards. Repair squads replace bulbs, repair wiring, or fix automated timers. Inoperative streetlights are usually repaired within 24 to 48 hours of reporting.";
    }
    if (latestUserMsgLower.includes("road") || latestUserMsgLower.includes("repair")) {
      return "Standard pothole filling and minor road patchwork typically take 3 to 7 days from verification. Major road repaving, resurfacing, or structural repairs can take anywhere from 2 to 4 weeks depending on the length of the road, weather conditions, and budget allocations.";
    }
    if (latestUserMsgLower.includes("track")) {
      return "You can track your reported issue by entering its unique Report ID in the Operations Console on the Dashboard tab, or by navigating directly to its details page at `/report/<Report ID>`. The status, assigned engineer, department, and repair logs are updated in real-time.";
    }
    if (latestUserMsgLower.includes("reject")) {
      return "If the municipal department rejects a complaint (e.g. due to incorrect mapping or department overlap), the CivicEye routing engine flags the ticket and alerts the dispatch console for manual correction.";
    }
    return "CivicEye AI automates dispatch to local municipal authorities: road/pothole maintenance to Road Infrastructure, water line bursts to the Water Board, and garbage accumulation to Solid Waste Management. You can file a complaint or ask questions about municipal utilities.";
  }

  // General fallback conversational reply
  return "Greetings! I am Officer Gemini, your AI Civic Assistant. I can answer questions about municipal services, utility repair SLAs, safety dispatches, or guide you through filing a new complaint for anywhere in India. How can I help you today?";
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
  let complaintSession: any = null;
  try {
    const body = await request.json();
    messages = body.messages;
    complaintSession = body.complaintSession;
 
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing conversation history." }, { status: 400 });
    }
 
    const testMode = process.env.TEST_MODE !== "false";
    const apiKey = process.env.GEMINI_API_KEY;
 
    if (testMode || !apiKey) {
      console.log("Chat running in testMode or missing apiKey. Loading mock reply.");
      await delay(800);
      const reply = getMockChatResponse(messages, complaintSession);
      return NextResponse.json({ role: "model", content: reply });
    }
 
    let systemInstructionText = "";
    if (complaintSession && complaintSession.active) {
      systemInstructionText = `You are Officer Gemini, the AI Civic Assistant at the CivicEye Desk.
A complaint registration session is currently active. The application itself manages the interview state, and you are only generating the naturally phrased question or response for the current step.

Complaint Information:
- Issue Type: ${complaintSession.issueType}
- Current Step: ${complaintSession.currentStep}
- Collected Data:
  - Name: ${complaintSession.collectedData.name || "(Not collected yet)"}
  - Contact: ${complaintSession.collectedData.contact || "(Not collected yet)"}
  - Location: ${complaintSession.collectedData.location || "(Not collected yet)"}
  - Description: ${complaintSession.collectedData.description || "(Not collected yet)"}

Your task:
- Look at the user's latest input and acknowledge it naturally (if appropriate).
- Ask ONLY the next required question for the current step:
  - If current step is "issue_type", ask the user what the complaint is regarding (Pothole, Water Leakage, Garbage Accumulation, Broken Streetlight).
  - If current step is "name", ask for their full name.
  - If current step is "contact", ask for their contact number or email.
  - If current step is "location", ask for the exact location (street name, locality, landmark).
  - If current step is "description", ask for a brief description of the problem.
  - If current step is "image", ask if they have a photo of the issue to upload or want to skip.
  - If current step is "completed", state that you have all information and are generating the report.

Crucial Rules:
- Ask ONLY one question.
- Do NOT greet the user again.
- Do NOT return to the welcome prompt.
- Do NOT ask for fields that have already been collected.
- Do NOT output any JSON block. Just natural conversational text.
- Keep your response brief, friendly, and professional.`;
    } else {
      systemInstructionText = `You are Officer Gemini, the AI Civic Assistant at the CivicEye Desk.
Your role is to assist citizens with municipal questions, utility tracking, and registering civic complaints across India.

You must follow this five-level intent hierarchy for every user input:

LEVEL 1 — Greeting:
- Trigger: Simple user greetings (e.g. "hi", "hello", "good morning").
- Workflow: Respond with a brief, friendly greeting welcoming them to the desk. Do NOT output any JSON block.

LEVEL 2 — General Questions:
- Trigger: Basic trivia, math formulas, or general knowledge (e.g. "what is 2+2", "what is an apple").
- Workflow: Answer naturally and directly. Do NOT output any JSON block.

LEVEL 3 — Civic & Municipal Knowledge:
- Trigger: User asks questions about civic issues, municipal boards, timelines, or procedures (e.g. "what is a pothole", "what is a ward", "who handles water leaks").
- Workflow: Provide detailed, educational answers. Do NOT output any JSON block.

LEVEL 4 — Complaint Registration (Complaint Mode):
- Trigger: The user expresses a civic problem or defect (e.g., "there is a pothole on my street", "water is leaking near my house", "garbage is not cleared") or asks to register/report an issue.
- Workflow:
  - STEP 0 — Issue Discovery (ONLY if the user has NOT specified what the issue is):
    If the user says something generic like "I want to register a complaint" or "I want to report an issue" WITHOUT mentioning a specific problem, ask:
    "I'll be happy to help you register a civic complaint. To begin, what is the complaint regarding? Examples: Pothole, Water Leakage, Garbage Accumulation, Broken Streetlight, Other."
    Emit JSON with nextField: "issue_type". Do NOT jump directly to asking for the name.
  - STEP 1–5 — Structured Interview (after issue type is known):
    Collect the following details exactly ONE field at a time:
    1. Full Name
    2. Contact Number or Email
    3. Exact Location (street, locality, landmark anywhere in India)
    4. Complaint Description (sizes, duration, details)
    5. Optional Image (ask if they have a photo or want to skip)

- Crucial Rules:
  - If the user already specified the issue type in their first message, skip Step 0 and proceed directly to Step 1 (Full Name).
  - Do NOT ask for the issue type again once it has been established from context.
  - Do NOT ask for severity. Infer it automatically based on description.
  - Do NOT ask multiple questions together. Only ask the next missing field in the sequence.
  - Inspect the conversation history. Do NOT ask for details already provided.
  - Once the image step is resolved (by upload or skipping), output the final structured JSON block inside [COMPLAINT_FLOW_JSON_START] and [COMPLAINT_FLOW_JSON_END] tags.
  - Format of the JSON block:
    [COMPLAINT_FLOW_JSON_START]
    {
      "nextField": "issue_type | name | contact | location | description | image | completed",
      "nextQuestion": "The natural conversational question to ask the user next",
      "complaintState": {
        "citizen_name": "Name provided or empty",
        "contact_info": "Phone/email provided or empty",
        "locality": "Location provided or empty",
        "description": "Description provided or empty",
        "issue_type": "Pothole | Water Leakage | Garbage Accumulation | Broken Streetlight",
        "severity": "Low | Medium | High | Critical",
        "ward": "BBMP Ward name for Bengaluru OR Municipal Corporation zone for other Indian cities",
        "authority": "Assigned municipal authority"
      }
    }
    [COMPLAINT_FLOW_JSON_END]

LEVEL 5 — Out-of-Scope Questions:
- Trigger: Unrelated queries (recipes, coding, politics, sports, entertainment).
- Workflow: Respond politely. Explain that CivicEye AI specializes in civic infrastructure assistance, complaint registration, and municipal guidance. Do not hallucinate or attempt to answer.

LEVEL 6 — Community Validation Check:
- Trigger: Citizen asks if anyone else has reported the issue (e.g. "Has anyone else reported this?", "Are there other similar complaints?").
- Workflow: If the current location (e.g. Vidyaranyapura, Koramangala, Whitefield) or issue indicates corroborating duplicate files, respond:
  "Yes. Multiple similar complaints have already been detected in this locality. Your report has strengthened community validation and helps authorities prioritize the issue."
  Otherwise, respond:
  "No matching reports have been detected yet. Your complaint becomes the first recorded report for this issue."`;
    }
 
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
      const reply = getMockChatResponse(messages, complaintSession);
      return NextResponse.json({ role: "model", content: reply });
    }
 
  } catch (error) {
    console.error("Error in chat API handler:", error);
    const reply = getMockChatResponse(messages, complaintSession);
    return NextResponse.json({ role: "model", content: reply });
  }
}
