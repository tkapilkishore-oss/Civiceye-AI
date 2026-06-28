"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  User,
  Sparkles,
  ArrowLeft,
  Trash2,
  Image as ImageIcon,
  CheckCircle2
} from "lucide-react";
import { MAP_CONFIG } from "@/constants/config";
import { sanitizeReportForLocalStorage, sanitizeReportsListForLocalStorage, safeSetLocalStorageItem } from "@/lib/storageHelper";
import RobotAnimator from "@/components/robot/RobotAnimator";
import { RobotState } from "@/components/robot/CivicAIRobot";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  isStreaming?: boolean;
  isPlaceholder?: boolean;
}

/**
 * Complaint Session State Machine
 *
 * IDLE        → Normal chatbot. Every message hits the API for a Q&A response.
 * DISCOVERING → User made a generic request ("I want to register a complaint")
 *               and has NOT yet specified the issue type. The next user reply is
 *               treated directly as the issue type — no API call.
 * COLLECTING  → Issue type is known. Fields are collected one-by-one purely
 *               client-side. Zero API calls until all fields are done.
 * FILING      → All fields collected. The report generation API is being called.
 *
 * STATE TRANSITION RULES:
 *   • Complaint intent detected (issue known)   → IDLE → COLLECTING
 *   • Complaint intent detected (issue unknown) → IDLE → DISCOVERING
 *   • User answers issue question               → DISCOVERING → COLLECTING
 *   • All fields collected                      → COLLECTING → FILING
 *   • Report filed                              → FILING → (redirect)
 *   • User cancels                              → any → IDLE
 *
 * The application owns the state. The API only generates conversational text.
 * The state machine NEVER resets due to an API response once the session is active.
 */
interface ComplaintSession {
  active: boolean;
  issueType: string;
  currentStep: "issue_type" | "name" | "contact" | "location" | "description" | "image" | "completed";
  collectedData: {
    name: string;
    contact: string;
    location: string;
    description: string;
  };
}

const STEP_ORDER: ("name" | "contact" | "location" | "description" | "image")[] = ["name", "contact", "location", "description", "image"];

const STEP_QUESTIONS: Record<string, string> = {
  issue_type: "Certainly. Could you tell me what the complaint is regarding?\n\nFor example:\n• Pothole\n• Water Leakage\n• Garbage Accumulation\n• Broken Streetlight",
  name: "May I know your full name?",
  contact: "Please provide your contact number or email address.",
  location: "Please share the exact location of the issue — street name, locality, or a nearby landmark.",
  description: "Could you briefly describe the problem? For example, how long it has been present, its size, or any safety concerns.",
  image: "Finally — do you have a photo of the issue? Click the upload button below, or press Skip Media to continue without one.",
};

// ─────────────────────────────────────────────────────────────────────────────
// Pure detection helpers — no state access, no side effects
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects the civic issue type from free text.
 * Returns one of the four canonical types, or "" if unrecognised.
 */
function detectIssueType(text: string): string {
  const lower = text.toLowerCase();
  if (
    lower.includes("garbage") || lower.includes("trash") ||
    lower.includes("waste") || lower.includes("dump") ||
    lower.includes("litter") || lower.includes("rubbish")
  ) return "Garbage Accumulation";

  if (
    lower.includes("water") || lower.includes("leak") ||
    lower.includes("pipe") || lower.includes("sewage") ||
    lower.includes("flood") || lower.includes("drain") ||
    lower.includes("overflow") || lower.includes("drainage")
  ) return "Water Leakage";

  if (
    lower.includes("light") || lower.includes("lamp") ||
    lower.includes("streetlight") || lower.includes("street-light") ||
    lower.includes("street light") || lower.includes("lamp post") ||
    lower.includes("lantern")
  ) return "Broken Streetlight";

  if (
    lower.includes("pothole") || lower.includes("crater") ||
    lower.includes("pit") || lower.includes("bump") ||
    lower.includes("road damage") || lower.includes("road not") ||
    lower.includes("road has") || lower.includes("road is") ||
    lower.includes("broken road") || lower.includes("damaged road") ||
    lower.includes("not repaired") || lower.includes("needs repair") ||
    lower.includes("asphalt") || lower.includes("pavement")
  ) return "Pothole";

  return "";
}

/**
 * Determines whether the message expresses a COMPLAINT INTENT.
 *
 * Returns:
 *   "known"    — complaint intent AND the issue type is identifiable
 *   "unknown"  — complaint intent but the issue type is NOT clear
 *   "none"     — no complaint intent detected
 *
 * This runs ENTIRELY on the client. The API is NOT consulted for routing.
 */
function detectComplaintIntent(text: string): "known" | "unknown" | "none" {
  const lower = text.toLowerCase().trim();

  // Explicit registration phrases always signal intent
  const explicitPhrases = [
    "i want to report", "i want to register", "i want to file",
    "i need to report", "i need to register", "i need to file",
    "please register", "please report", "please file",
    "register a complaint", "file a complaint", "report a complaint",
    "register an issue", "file an issue", "report an issue",
    "create a complaint", "new complaint", "submit a complaint",
    "report this", "register this", "file this",
    "i would like to report", "i would like to register", "i would like to file",
    "i need to report a civic",
    "i want to report a civic",
    "how to report", "how do i report", "how to file a complaint"
  ];

  const isExplicit = explicitPhrases.some((phrase) => lower.includes(phrase));

  // Civic problem keywords that indicate a reportable issue
  const civicProblemKeywords = [
    "pothole", "garbage", "trash", "waste", "dump", "litter",
    "water leak", "water leakage", "pipe burst", "pipe leak",
    "sewage", "drainage", "drain overflow", "flooding", "flood",
    "streetlight", "street light", "lamp post", "street-light",
    "broken light", "light not working", "light is not working",
    "road damage", "road not repaired", "road has", "broken road",
    "damaged road", "road is broken", "drainage leakage", "sewage overflow"
  ];

  const hasCivicKeyword =
    civicProblemKeywords.some((kw) => lower.includes(kw)) ||
    /pothole|leak|streetlight|garbage|trash|waste|sewage|drain|flood|road/i.test(lower);

  // Problem statement patterns indicating a civic defect being reported
  // These are deliberately broad to catch natural language variations
  const problemPatterns = [
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
  ];

  const matchesProblemPattern = problemPatterns.some((pattern) => pattern.test(lower));

  // Questions should never trigger complaint mode
  const isQuestion = /^(what|why|how|who|which|where|when|can\s+you|tell\s+me|is\s+there|are\s+there)\b/i.test(lower) ||
    lower.endsWith("?");

  if (isQuestion) return "none";

  // Determine complaint intent
  const hasComplaintIntent = isExplicit || (hasCivicKeyword && matchesProblemPattern);

  if (!hasComplaintIntent) return "none";

  // If intent is confirmed, check whether we know the issue type
  const issueType = detectIssueType(lower);
  return issueType ? "known" : "unknown";
}

/**
 * Derives severity from the description text.
 */
function deriveSeverity(description: string): string {
  const lower = description.toLowerCase();
  if (
    lower.includes("critical") || lower.includes("flood") ||
    lower.includes("danger") || lower.includes("accident") ||
    lower.includes("risk") || lower.includes("emergency") ||
    lower.includes("unsafe") || lower.includes("hazard")
  ) return "Critical";
  if (lower.includes("medium") || lower.includes("moderate")) return "Medium";
  if (lower.includes("minor") || lower.includes("small") || lower.includes("low")) return "Low";
  return "High";
}

/**
 * Derives ward and authority from locality and issue type.
 */
function deriveWardAndAuthority(issueType: string, locality: string): { ward: string; authority: string } {
  const locLower = locality.toLowerCase();
  const isOtherCity =
    locLower.includes("chennai") || locLower.includes("salem") || locLower.includes("pune") ||
    locLower.includes("kochi") || locLower.includes("delhi") || locLower.includes("hyderabad") ||
    locLower.includes("mumbai") || locLower.includes("jaipur");

  if (isOtherCity) {
    let cityPrefix = "Local Corporation";
    if (locLower.includes("chennai")) cityPrefix = "Greater Chennai Corporation";
    else if (locLower.includes("salem")) cityPrefix = "Salem Municipal Corporation";
    else if (locLower.includes("pune")) cityPrefix = "Pune Municipal Corporation";
    else if (locLower.includes("kochi")) cityPrefix = "Kochi Municipal Corporation";
    else if (locLower.includes("delhi")) cityPrefix = "Municipal Corporation of Delhi";
    else if (locLower.includes("hyderabad")) cityPrefix = "Greater Hyderabad Municipal Corporation";
    else if (locLower.includes("mumbai")) cityPrefix = "Brihanmumbai Municipal Corporation";
    else if (locLower.includes("jaipur")) cityPrefix = "Jaipur Municipal Corporation";

    const authMap: Record<string, string> = {
      "Garbage Accumulation": `${cityPrefix} - Solid Waste Management Cell`,
      "Water Leakage": `${cityPrefix} - Water Supply & Sewerage Department`,
      "Broken Streetlight": `${cityPrefix} - Electrical Engineering Division`,
    };
    return {
      ward: `${cityPrefix} - Resolved Zone`,
      authority: authMap[issueType] || `${cityPrefix} - Road Infrastructure Division`,
    };
  }

  // Bengaluru wards
  let ward = "Ward 3 - Indiranagar & Domlur";
  let authority = "Municipal Corporation Roads Department";

  if (locLower.includes("hebbal") || locLower.includes("vidya")) ward = "Ward 1 - Hebbal & Vidyaranyapura";
  else if (locLower.includes("kora") || locLower.includes("hsr")) ward = "Ward 2 - Koramangala & HSR";
  else if (locLower.includes("indira") || locLower.includes("doml")) ward = "Ward 3 - Indiranagar & Domlur";
  else if (locLower.includes("jayan") || locLower.includes("jp na")) ward = "Ward 4 - Jayanagar & JP Nagar";
  else if (locLower.includes("peenya")) ward = "Ward 5 - Peenya Industrial Zone";
  else if (locLower.includes("malli") || locLower.includes("old")) ward = "Ward 6 - Malleshwaram & Old Town";
  else if (locLower.includes("marath") || locLower.includes("mahadev")) ward = "Ward 7 - Mahadevapura Zone & Marathahalli";

  if (issueType === "Garbage Accumulation") { authority = "Solid Waste Management Authority"; }
  else if (issueType === "Water Leakage") { authority = "Water Supply & Sewerage Board"; }
  else if (issueType === "Broken Streetlight") { authority = "Municipal Electrical Services Division"; }

  return { ward, authority };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const router = useRouter();

  // ── Display state ──
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      content: "Hello! I am Officer Gemini, your AI Civic Companion. I can help answer questions about local civic issues, reporting procedures, safety advice, or explain how our AI classification works. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [robotState, setRobotState] = useState<RobotState>("idle");

  // ── Complaint Session State Machine ──
  // This object is the single source of truth for the complaint interview.
  // Once active, it is NEVER overridden by API responses.
  const [complaintSession, setComplaintSession] = useState<ComplaintSession>({
    active: false,
    issueType: "",
    currentStep: "name",
    collectedData: {
      name: "",
      contact: "",
      location: "",
      description: ""
    }
  });

  // ── Image & filing state ──
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [filing, setFiling] = useState(false);
  const [filingSuccess, setFilingSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const suggestedPrompts = [
    "Which government department is responsible for repairing potholes in Bangalore?",
    "How long does BBMP usually take to repair a reported pothole?",
    "I want to report a water leakage near my house.",
    "How does CivicEye AI analyze and prioritize civic complaints?",
    "How is my complaint routed to the correct municipal authority?",
    "What happens after I submit a complaint through CivicEye AI?"
  ];

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Greeting animation on first mount
  useEffect(() => {
    setRobotState("greeting");
    const t = setTimeout(() => setRobotState("idle"), 1800);
    return () => clearTimeout(t);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // simulateStreaming — word-by-word text reveal with punctuation pauses
  // ─────────────────────────────────────────────────────────────────────────

  const simulateStreaming = (messageId: string, fullText: string, onComplete?: () => void) => {
    setStreamingId(messageId);
    const words = fullText.split(" ");
    let currentText = "";
    let idx = 0;

    const streamNextWord = () => {
      if (idx < words.length) {
        const word = words[idx];
        currentText += (idx === 0 ? "" : " ") + word;
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? { ...msg, content: currentText } : msg))
        );
        idx++;

        let delay = 22;
        if (word.endsWith(".") || word.endsWith("!")) delay = 160;
        else if (word.endsWith(",") || word.endsWith(":")) delay = 75;
        setTimeout(streamNextWord, delay);
      } else {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? { ...msg, isStreaming: false } : msg))
        );
        setStreamingId(null);
        if (onComplete) onComplete();
      }
    };

    streamNextWord();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // pushAssistantMessage — appends a new model bubble and streams into it
  // ─────────────────────────────────────────────────────────────────────────

  const pushAssistantMessage = (text: string, onComplete?: () => void): string => {
    const msgId = `msg_${Date.now()}`;
    setMessages((prev) => [...prev, { id: msgId, role: "model", content: "", isStreaming: true }]);
    simulateStreaming(msgId, text, onComplete);
    return msgId;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // triggerAutoFiling — calls /api/generate-report and redirects on success
  // ─────────────────────────────────────────────────────────────────────────

  const triggerAutoFiling = async (stateData: {
    citizen_name: string;
    contact_info: string;
    locality: string;
    description: string;
    issue_type: string;
    severity: string;
    ward: string;
    authority: string;
  }) => {
    setFiling(true);
    setComplaintSession((prev) => ({ ...prev, currentStep: "completed" }));
    setRobotState("completed");

    let lat = MAP_CONFIG.defaultCenter[0];
    let lng = MAP_CONFIG.defaultCenter[1];
    let resolvedAddress = stateData.locality || "";
    let resolvedCity = "Bengaluru";
    let resolvedState = "Karnataka";

    const wardLower = (stateData.ward || "").toLowerCase();
    if (wardLower.includes("ward 1")) { lat = 13.0358; lng = 77.5978; }
    else if (wardLower.includes("ward 2")) { lat = 12.9352; lng = 77.6244; }
    else if (wardLower.includes("ward 3")) { lat = 12.9719; lng = 77.6412; }
    else if (wardLower.includes("ward 4")) { lat = 12.9250; lng = 77.5938; }

    try {
      const q = stateData.locality || "";
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=in&addressdetails=1`;
      const geoRes = await fetch(geoUrl);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
          resolvedAddress = geoData[0].display_name || resolvedAddress;
          const addr = geoData[0].address || {};
          resolvedCity = addr.city || addr.town || addr.village || resolvedCity;
          resolvedState = addr.state || resolvedState;
        }
      }
    } catch (e) {
      console.warn("Geocoding failed during auto filing:", e);
    }

    let imageUrl = "/test_images/pothole.jpg";
    if (uploadedImagePreview) {
      imageUrl = uploadedImagePreview;
    } else {
      const typeLower = (stateData.issue_type || "").toLowerCase();
      if (typeLower.includes("garbage") || typeLower.includes("waste") || typeLower.includes("trash")) {
        imageUrl = "/test_images/garbage.jpg";
      } else if (typeLower.includes("water") || typeLower.includes("leak") || typeLower.includes("pipe")) {
        imageUrl = "/test_images/water_pipe_burst.jpg";
      } else if (typeLower.includes("light") || typeLower.includes("lamp") || typeLower.includes("street")) {
        imageUrl = "/test_images/streetlight.jpg";
      }
    }

    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          ward: stateData.ward,
          locality: stateData.locality,
          issue_type: stateData.issue_type,
          severity: stateData.severity,
          confidence: 0.95,
          follow_up_answers: [
            { question: "Assessed Locality", answer: stateData.locality },
            { question: "Assessed Issue", answer: stateData.description }
          ],
          latitude: lat,
          longitude: lng,
          formatted_address: resolvedAddress,
          city: resolvedCity,
          state: resolvedState,
          postal_code: "",
          explainability: "Report generated via AI Civic Companion Assistant Desk.",
          citizen_name: stateData.citizen_name || "Concerned Citizen",
          contact_info: stateData.contact_info || "Not provided",
          description: stateData.description || ""
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const fullReport = {
          id: data.id,
          image_url: imageUrl,
          ward: stateData.ward,
          locality: stateData.locality,
          issue_type: stateData.issue_type,
          severity: stateData.severity,
          confidence: 0.95,
          priority: data.priority,
          authority: data.authority,
          complaint_draft: data.complaint_draft,
          action_plan: data.action_plan,
          created_at: new Date().toISOString(),
          status: "Investigating",
          latitude: lat,
          longitude: lng,
          formatted_address: resolvedAddress,
          city: resolvedCity,
          state: resolvedState,
          postal_code: "",
          follow_up_answers: [
            { question: "Assessed Locality", answer: stateData.locality },
            { question: "Assessed Issue", answer: stateData.description }
          ],
          explainability: "Report generated via AI Civic Companion Assistant Desk.",
          estimation: data.estimation || null,
          supporter_count: 1,
          citizen_name: stateData.citizen_name || "Concerned Citizen",
          contact_info: stateData.contact_info || "Not provided",
          description: stateData.description || ""
        };

        try {
          const sanitizedReport = sanitizeReportForLocalStorage(fullReport);
          safeSetLocalStorageItem(`report_${data.id}`, JSON.stringify(sanitizedReport));
          const reportsListRaw = localStorage.getItem("reports_list");
          let reportsList: typeof sanitizedReport[] = [];
          if (reportsListRaw) reportsList = JSON.parse(reportsListRaw);
          reportsList.unshift(sanitizedReport);
          safeSetLocalStorageItem("reports_list", JSON.stringify(sanitizeReportsListForLocalStorage(reportsList)));
        } catch (e) {
          console.error("Local storage report sync failed:", e);
        }

        setFilingSuccess(true);
        setTimeout(() => router.push(`/report/${data.id}`), 2500);
      } else {
        alert("Failed to file complaint automatically. Please check your connection.");
        setFiling(false);
        setComplaintSession((prev) => ({ ...prev, active: true, currentStep: "image" }));
        setRobotState("writing");
      }
    } catch (err) {
      console.error("Error auto-filing complaint:", err);
      alert("Error communicating with server.");
      setFiling(false);
      setComplaintSession((prev) => ({ ...prev, active: true, currentStep: "image" }));
      setRobotState("writing");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // handleSendMessage — the session state machine dispatcher
  //
  // The three branches are mutually exclusive and ordered by priority:
  //   1. DISCOVERING — collect the issue type the user just named
  //   2. COLLECTING  — store the current field answer, advance to the next
  //   3. IDLE        — classify intent and optionally enter complaint mode
  // ─────────────────────────────────────────────────────────────────────────

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading || streamingId) return;

    const trimmedText = text.trim();
    const userMsg: Message = { id: `user_${Date.now()}`, role: "user", content: trimmedText };

    // ── Cancel escape hatch — works from any active session state ──
    const cancelKeywords = ["cancel", "stop", "exit", "abort", "quit", "restart"];
    if (
      complaintSession.active &&
      cancelKeywords.some((k) => trimmedText.toLowerCase() === k ||
        trimmedText.toLowerCase().startsWith(k + " "))
    ) {
      setComplaintSession({
        active: false,
        issueType: "",
        currentStep: "name",
        collectedData: { name: "", contact: "", location: "", description: "" }
      });
      setUploadedImagePreview(null);
      setRobotState("idle");
      setInput("");
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: `msg_${Date.now()}`,
          role: "model",
          content: "Complaint session cancelled. How else can I help you today?"
        }
      ]);
      return;
    }

    // ══════════════════════════════════════════════════════════════════════
    // MODE 2 — COMPLAINT SESSION ACTIVE
    // ══════════════════════════════════════════════════════════════════════
    if (complaintSession.active) {
      setInput("");
      setMessages((prev) => [...prev, userMsg]);

      // ── Step: Image ──
      // If we are at the image step, the user is submitting their choice.
      // We immediately finalize and file, no API call needed.
      if (complaintSession.currentStep === "image") {
        const { ward, authority } = deriveWardAndAuthority(
          complaintSession.issueType,
          complaintSession.collectedData.location
        );
        const severity = deriveSeverity(complaintSession.collectedData.description);

        setComplaintSession((prev) => ({ ...prev, currentStep: "completed" }));
        pushAssistantMessage(
          "Thank you. I now have all the required information. Generating your complaint report now — please hold on.",
          () => {
            triggerAutoFiling({
              citizen_name: complaintSession.collectedData.name,
              contact_info: complaintSession.collectedData.contact,
              locality: complaintSession.collectedData.location,
              description: complaintSession.collectedData.description,
              issue_type: complaintSession.issueType,
              severity,
              ward,
              authority,
            });
          }
        );
        setRobotState("writing");
        return;
      }

      // ── Process fields & advance FSM client-side ──
      let nextStep: "name" | "contact" | "location" | "description" | "image" | "completed" = "name";
      const updatedSession = {
        ...complaintSession,
        collectedData: { ...complaintSession.collectedData }
      };

      if (complaintSession.currentStep === "issue_type") {
        const detected = detectIssueType(trimmedText) || trimmedText || "Pothole";
        updatedSession.issueType = detected;
        updatedSession.currentStep = "name";
        nextStep = "name";
      } else if (complaintSession.currentStep === "name") {
        let cleanName = trimmedText;
        const nameMatch = trimmedText.match(/(?:my name is|i am|this is)\s+([a-zA-Z\s\.]+)/i);
        if (nameMatch) cleanName = nameMatch[1].trim();
        updatedSession.collectedData.name = cleanName;
        updatedSession.currentStep = "contact";
        nextStep = "contact";
      } else if (complaintSession.currentStep === "contact") {
        let cleanContact = trimmedText;
        const phoneMatch = trimmedText.match(/(?:\+91|0)?[6-9]\d{9}/);
        if (phoneMatch) cleanContact = phoneMatch[0];
        updatedSession.collectedData.contact = cleanContact;
        updatedSession.currentStep = "location";
        nextStep = "location";
      } else if (complaintSession.currentStep === "location") {
        updatedSession.collectedData.location = trimmedText;
        updatedSession.currentStep = "description";
        nextStep = "description";
      } else if (complaintSession.currentStep === "description") {
        updatedSession.collectedData.description = trimmedText;
        updatedSession.currentStep = "image";
        nextStep = "image";
      }

      // Update state immediately
      setComplaintSession(updatedSession);

      // Call API to get a naturally phrased question from Gemini
      const placeholderId = `placeholder_${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: placeholderId, role: "model", content: "", isPlaceholder: true }
      ]);
      setLoading(true);
      setRobotState("thinking");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
            complaintSession: updatedSession
          })
        });

        if (res.ok) {
          const data = await res.json();
          let cleanText = data.content || "";

          // Clean JSON blocks if Gemini accidentally included them
          const JSON_START = "[COMPLAINT_FLOW_JSON_START]";
          if (cleanText.includes(JSON_START)) {
            cleanText = cleanText.substring(0, cleanText.indexOf(JSON_START)).trim();
          }

          if (!cleanText.trim()) {
            cleanText = STEP_QUESTIONS[nextStep] || "";
            if (nextStep === "contact" && updatedSession.collectedData.name) {
              cleanText = `Thank you, ${updatedSession.collectedData.name}. ${STEP_QUESTIONS["contact"]}`;
            }
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === placeholderId
                ? { id: placeholderId, role: "model", content: "", isStreaming: true }
                : msg
            )
          );
          setLoading(false);
          setRobotState("writing");

          simulateStreaming(placeholderId, cleanText, () => {
            setRobotState("idle"); // Done writing, now listening
          });
        } else {
          // Fallback to local hardcoded questions on API failure
          setLoading(false);
          setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
          setRobotState("writing");
          let cleanText = STEP_QUESTIONS[nextStep] || "";
          if (nextStep === "contact" && updatedSession.collectedData.name) {
            cleanText = `Thank you, ${updatedSession.collectedData.name}. ${STEP_QUESTIONS["contact"]}`;
          }
          pushAssistantMessage(cleanText, () => setRobotState("idle"));
        }
      } catch {
        setLoading(false);
        setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
        setRobotState("writing");
        let cleanText = STEP_QUESTIONS[nextStep] || "";
        if (nextStep === "contact" && updatedSession.collectedData.name) {
          cleanText = `Thank you, ${updatedSession.collectedData.name}. ${STEP_QUESTIONS["contact"]}`;
        }
        pushAssistantMessage(cleanText, () => setRobotState("idle"));
      }
      return;
    }

    // ══════════════════════════════════════════════════════════════════════
    // MODE 1 — NORMAL CHAT MODE
    // ══════════════════════════════════════════════════════════════════════
    const intent = detectComplaintIntent(trimmedText);

    // If intent is found, immediately transition FSM on client side
    let initialSession: ComplaintSession | null = null;
    if (intent === "known") {
      initialSession = {
        active: true,
        issueType: detectIssueType(trimmedText) || "Pothole",
        currentStep: "name",
        collectedData: { name: "", contact: "", location: "", description: "" }
      };
      setComplaintSession(initialSession);
    } else if (intent === "unknown") {
      initialSession = {
        active: true,
        issueType: "UNKNOWN",
        currentStep: "issue_type",
        collectedData: { name: "", contact: "", location: "", description: "" }
      };
      setComplaintSession(initialSession);
    }

    const placeholderId = `placeholder_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: placeholderId, role: "model", content: "", isPlaceholder: true }
    ]);
    setInput("");
    setLoading(true);
    setRobotState("thinking");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          complaintSession: initialSession
        })
      });

      if (res.ok) {
        const data = await res.json();
        const responseText = data.content || "I couldn't process that query. Please try again.";

        const JSON_START = "[COMPLAINT_FLOW_JSON_START]";
        const JSON_END = "[COMPLAINT_FLOW_JSON_END]";
        let cleanText = responseText;

        if (responseText.includes(JSON_START) && responseText.includes(JSON_END)) {
          const startIdx = responseText.indexOf(JSON_START);
          cleanText = responseText.substring(0, startIdx).trim();
        }

        if (!cleanText.trim()) {
          if (intent === "known" && initialSession) {
            cleanText = `I can help you register that ${initialSession.issueType} complaint. ${STEP_QUESTIONS["name"]}`;
          } else if (intent === "unknown") {
            cleanText = STEP_QUESTIONS["issue_type"];
          }
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === placeholderId
              ? { id: placeholderId, role: "model", content: "", isStreaming: true }
              : msg
          )
        );
        setLoading(false);
        setRobotState(intent !== "none" ? "writing" : "streaming");

        simulateStreaming(placeholderId, cleanText, () => {
          if (intent !== "none") {
            setRobotState("idle"); // Now listening
          } else {
            // Pure Q&A response
            const textLower = cleanText.toLowerCase();
            const isGreeting =
              textLower.startsWith("hello") || textLower.startsWith("hi") ||
              textLower.startsWith("good morning") || textLower.startsWith("good afternoon") ||
              textLower.startsWith("good evening") || textLower.startsWith("greetings");

            if (isGreeting) {
              setRobotState("greeting");
              setTimeout(() => setRobotState("idle"), 1800);
            } else {
              setRobotState("idle");
            }
          }
        });

      } else {
        setLoading(false);
        setMessages((prev) => prev.filter((m) => m.id !== placeholderId));

        if (intent === "known" && initialSession) {
          setRobotState("writing");
          pushAssistantMessage(
            `I can help you register that ${initialSession.issueType} complaint. ${STEP_QUESTIONS["name"]}`,
            () => setRobotState("idle")
          );
        } else if (intent === "unknown") {
          setRobotState("writing");
          pushAssistantMessage(
            STEP_QUESTIONS["issue_type"],
            () => setRobotState("idle")
          );
        } else {
          setRobotState("idle");
          pushAssistantMessage("Sorry, I had trouble contacting my core engine. Please try again.");
        }
      }
    } catch {
      setLoading(false);
      setMessages((prev) => prev.filter((m) => m.id !== placeholderId));

      if (intent === "known" && initialSession) {
        setRobotState("writing");
        pushAssistantMessage(
          `I can help you register that ${initialSession.issueType} complaint. ${STEP_QUESTIONS["name"]}`,
          () => setRobotState("idle")
        );
      } else if (intent === "unknown") {
        setRobotState("writing");
        pushAssistantMessage(
          STEP_QUESTIONS["issue_type"],
          () => setRobotState("idle")
        );
      } else {
        setRobotState("idle");
        pushAssistantMessage("An unexpected error occurred. Please try again.");
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Image upload handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setUploadedImagePreview(preview);
      handleSendMessage("I have uploaded the photo of the defect.");
    }
  };

  const handleSkipImage = () => {
    handleSendMessage("Skipping image — please proceed without one.");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Reset / clear chat
  // ─────────────────────────────────────────────────────────────────────────

  const clearChat = () => {
    if (streamingId) return;
    setComplaintSession({
      active: false,
      issueType: "",
      currentStep: "name",
      collectedData: { name: "", contact: "", location: "", description: "" }
    });
    setUploadedImagePreview(null);
    setFiling(false);
    setFilingSuccess(false);
    setRobotState("idle");
    setMessages([
      {
        id: "welcome",
        role: "model",
        content: "Hello! I am Officer Gemini, your AI Civic Companion. I can help answer questions about local civic issues, reporting procedures, safety advice, or explain how our AI classification works. How can I help you today?"
      }
    ]);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Derived values
  // ─────────────────────────────────────────────────────────────────────────

  const isInComplaintSession = complaintSession.active;
  const isImageStep = complaintSession.active && complaintSession.currentStep === "image";
  const isInputDisabled = loading || !!streamingId || filing || isImageStep;

  // The robot companion is anchored to the latest model message
  const latestModelIdx = messages.reduce<number>((acc, msg, idx) =>
    msg.role === "model" ? idx : acc, -1
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-grow bg-background text-on-surface pt-32 pb-20 px-6 md:px-12 max-w-5xl mx-auto w-full flex flex-col min-h-[85vh] relative">

      {/* Filing success overlay */}
      <AnimatePresence>
        {filingSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center space-y-4"
          >
            <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
            <h2 className="text-2xl font-display font-extrabold text-white tracking-tight">
              Complaint Successfully Registered
            </h2>
            <p className="text-xs font-mono text-electric-blue animate-pulse">
              ROUTING TO MUNICIPAL INCIDENT CONSOLE...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-6 shrink-0 z-10">
        <div>
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 text-[10px] font-bold text-on-surface-variant hover:text-white transition-colors uppercase tracking-widest font-display mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-electric-blue" />
            Back to Dashboard
          </button>
          <h1 className="font-display text-3xl font-extrabold text-white tracking-tight leading-none flex items-center gap-2">
            AI Civic Assistant
            <span className="text-[10px] bg-electric-blue/10 text-electric-blue border border-electric-blue/20 rounded px-2 py-0.5 font-mono uppercase tracking-widest animate-pulse">
              Beta
            </span>
          </h1>
        </div>

        <button
          onClick={clearChat}
          disabled={!!streamingId || filing}
          className="glass-sm px-4 py-2.5 rounded-xl font-display text-xs font-bold text-rose-400 border-rose-500/10 hover:bg-rose-500/10 hover:border-rose-500/25 transition-all flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Trash2 className="h-4 w-4" /> Reset Assistant
        </button>
      </div>

      {/* Chat container */}
      <div className="flex-grow glass-md rounded-[2rem] border border-white/5 flex flex-col overflow-hidden min-h-[520px] shadow-2xl relative">
        <div className="flex-grow flex flex-col relative overflow-hidden h-[480px] md:h-[550px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(0,209,255,0.04),transparent_50%)] pointer-events-none" />

          {/* Message thread */}
          <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-8 terminal-scroll relative z-10">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => {
                const isModel = msg.role === "model";
                const isLatestModel = isModel && idx === latestModelIdx;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-4 items-start ${isModel ? "" : "flex-row-reverse"}`}
                  >
                    {/* Avatar slot */}
                    <div className={
                      isModel
                        ? "w-[75px] md:w-[90px] flex justify-center shrink-0 overflow-visible relative h-[100px] md:h-[120px]"
                        : "w-8 shrink-0"
                    }>
                      {isLatestModel ? (
                        <motion.div
                          layoutId="assistant-companion"
                          transition={{ type: "spring", stiffness: 110, damping: 14, mass: 1.1 }}
                          className="absolute -top-4 left-0 md:left-2 z-20 overflow-visible"
                        >
                          <RobotAnimator
                            state={robotState}
                            loading={loading || !!msg.isStreaming}
                            isInComplaintMode={isInComplaintSession}
                          />
                        </motion.div>
                      ) : isModel ? (
                        null
                      ) : (
                        <div className="h-8 w-8 rounded-full border border-white/10 bg-surface-container text-white flex items-center justify-center shrink-0">
                          <User className="h-4.5 w-4.5" />
                        </div>
                      )}
                    </div>

                    {/* Message body */}
                    <div className={`flex-1 ${isModel ? "text-left" : "text-right"}`}>
                      {msg.isPlaceholder ? (
                        <div className="inline-block bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex items-center gap-1 min-w-[60px] text-left">
                          <span className="h-2.5 w-2.5 rounded-full bg-electric-blue/60 animate-bounce" style={{ animationDelay: "0s" }} />
                          <span className="h-2.5 w-2.5 rounded-full bg-electric-blue/60 animate-bounce" style={{ animationDelay: "0.2s" }} />
                          <span className="h-2.5 w-2.5 rounded-full bg-electric-blue/60 animate-bounce" style={{ animationDelay: "0.4s" }} />
                        </div>
                      ) : (
                        <div className={`inline-block max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed border text-left ${
                          isModel
                            ? "bg-slate-900/40 border-white/5 text-slate-200"
                            : "bg-electric-blue text-background border-electric-blue/20 font-medium"
                        }`}>
                          <div className="space-y-2 whitespace-pre-wrap">
                            {msg.content}
                            {msg.isStreaming && (
                              <span className="inline-block w-1.5 h-4 bg-electric-blue animate-pulse ml-0.5 align-middle" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Image upload panel — shown only during the image collection step */}
          {isImageStep && !streamingId && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-6 md:px-8 pb-4 shrink-0 relative z-10"
            >
              <div className="glass-sm p-4 rounded-2xl border border-electric-blue/20 bg-electric-blue/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-electric-blue/10 border border-electric-blue/20 rounded-xl text-electric-blue">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Intake Diagnostic: Upload Media</h4>
                    <p className="text-[10px] text-on-surface-variant">Provide a photo of the defect or choose to file without one.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-electric-blue text-background text-xs font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ImageIcon className="h-3.5 w-3.5" /> Upload File
                  </button>
                  <button
                    onClick={handleSkipImage}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-white/5 border border-white/10 text-xs font-medium text-slate-400 rounded-xl hover:bg-white/10 hover:text-white transition-all"
                  >
                    Skip Media
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Suggested prompts — shown only on a fresh conversation */}
          {messages.length === 1 && !loading && (
            <div className="px-6 md:px-8 pb-4 shrink-0 relative z-10">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-3 font-display text-left">
                Suggested Topics
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-3xl">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="glass-sm hover:bg-white/[0.04] text-left p-3 rounded-xl border border-white/5 hover:border-electric-blue/30 text-xs font-semibold text-slate-300 hover:text-white transition-all duration-300 flex justify-between items-center group"
                  >
                    <span className="pr-4">{prompt}</span>
                    <Sparkles className="h-3.5 w-3.5 text-electric-blue opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Text input area */}
          <div className="p-4 md:p-6 bg-surface-container-lowest/30 border-t border-white/5 relative z-10 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(input);
              }}
              className="flex items-center gap-3 relative"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isInputDisabled}
                placeholder={
                  filing ? "Filing municipal incident log..." :
                  streamingId ? "Streaming assistant response..." :
                  isImageStep ? "Please upload a file or press Skip Media above..." :
                  complaintSession.active && complaintSession.currentStep === "issue_type" ? "Type the issue — e.g. Pothole, Water Leakage..." :
                  complaintSession.active ? "Please answer to continue..." :
                  "Ask about municipal services, or report a civic issue..."
                }
                className="flex-1 glass-md pl-5 pr-14 py-4 rounded-2xl border border-white/5 outline-none focus:ring-1 focus:ring-electric-blue/30 text-sm text-white placeholder:text-on-surface-variant/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isInputDisabled}
                className="absolute right-3 bg-electric-blue text-background h-10 w-10 rounded-xl flex items-center justify-center hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md shadow-electric-blue/20"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
