"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  ArrowLeft, 
  Trash2,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { MAP_CONFIG } from "@/constants/config";
import { sanitizeReportForLocalStorage, sanitizeReportsListForLocalStorage } from "@/lib/storageHelper";

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  isStreaming?: boolean;
}

export default function AssistantPage() {
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      content: "Hello! I am the CivicEye AI Assistant. I can help answer questions about local civic issues, reporting procedures, safety advice, or explain how our AI classification works. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [complaintData, setComplaintData] = useState<any>(null);
  const [filing, setFiling] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    "Which government department is responsible for repairing potholes in Bangalore?",
    "How long does BBMP usually take to repair a reported pothole?",
    "I want to report a water leakage near my house. How do I begin?",
    "How does CivicEye AI analyze and prioritize civic complaints?",
    "How is my complaint routed to the correct municipal authority?",
    "What happens after I submit a complaint through CivicEye AI?"
  ];

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Simulate text streaming word-by-word
  const simulateStreaming = (messageId: string, fullText: string) => {
    setStreamingId(messageId);
    const words = fullText.split(" ");
    let currentText = "";
    let idx = 0;

    const timer = setInterval(() => {
      if (idx < words.length) {
        currentText += (idx === 0 ? "" : " ") + words[idx];
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, content: currentText } : msg
          )
        );
        idx++;
      } else {
        clearInterval(timer);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isStreaming: false } : msg
          )
        );
        setStreamingId(null);
      }
    }, 25); // 25ms per word
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading || streamingId) return;

    const userMessageId = `user_${Date.now()}`;
    const userMsg: Message = {
      id: userMessageId,
      role: "user",
      content: text.trim()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const modelMessageId = `model_${Date.now()}`;
    const currentHistory = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: currentHistory })
      });

      setLoading(false);

      if (res.ok) {
        const data = await res.json();
        const responseText = data.content || "I couldn't process that query. Please try again.";

        // Check if there is complaint JSON in responseText
        const jsonStartTag = "[COMPLAINT_DATA_JSON_START]";
        const jsonEndTag = "[COMPLAINT_DATA_JSON_END]";
        let cleanText = responseText;
        let parsedData = null;

        if (responseText.includes(jsonStartTag) && responseText.includes(jsonEndTag)) {
          const startIdx = responseText.indexOf(jsonStartTag);
          const endIdx = responseText.indexOf(jsonEndTag);
          const jsonString = responseText.substring(startIdx + jsonStartTag.length, endIdx).trim();
          try {
            parsedData = JSON.parse(jsonString);
            console.log("Parsed complaint data from chat response:", parsedData);
          } catch (e) {
            console.error("Failed to parse complaint JSON", e);
          }
          cleanText = responseText.substring(0, startIdx).trim() + "\n\n" + responseText.substring(endIdx + jsonEndTag.length).trim();
          cleanText = cleanText.trim();
        }

        // Prepend empty assistant message to be populated by stream
        setMessages((prev) => [
          ...prev,
          { id: modelMessageId, role: "model", content: "", isStreaming: true }
        ]);

        simulateStreaming(modelMessageId, cleanText);

        // Store parsedData in state if found
        if (parsedData) {
          setComplaintData(parsedData);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: modelMessageId,
            role: "model",
            content: "Sorry, I had trouble contacting my core engine. Please check your network connection and try again."
          }
        ]);
      }
    } catch {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: modelMessageId,
          role: "model",
          content: "An unexpected error occurred. Please try again."
        }
      ]);
    }
  };

  const handleFileComplaint = async () => {
    if (!complaintData || filing) return;
    setFiling(true);

    // Coordinate resolution based on ward
    let lat = MAP_CONFIG.defaultCenter[0];
    let lng = MAP_CONFIG.defaultCenter[1];
    
    const wardLower = (complaintData.ward || "").toLowerCase();
    if (wardLower.includes("ward 1")) {
      lat = 13.0358;
      lng = 77.5978;
    } else if (wardLower.includes("ward 2")) {
      lat = 12.9352;
      lng = 77.6244;
    } else if (wardLower.includes("ward 3")) {
      lat = 12.9719;
      lng = 77.6412;
    } else if (wardLower.includes("ward 4")) {
      lat = 12.9250;
      lng = 77.5938;
    } else if (wardLower.includes("ward 5")) {
      lat = 13.0285;
      lng = 77.5197;
    } else if (wardLower.includes("ward 6")) {
      lat = 13.0031;
      lng = 77.5643;
    }

    // Default high-quality placeholder image for reports filed through assistant
    let imageUrl = "/test_images/pothole.jpg"; // Pothole
    const typeLower = (complaintData.issue_type || "").toLowerCase();
    if (typeLower.includes("garbage") || typeLower.includes("waste") || typeLower.includes("trash")) {
      imageUrl = "/test_images/garbage.jpg";
    } else if (typeLower.includes("water") || typeLower.includes("leak") || typeLower.includes("pipe")) {
      imageUrl = "/test_images/water_pipe_burst.jpg";
    } else if (typeLower.includes("light") || typeLower.includes("lamp") || typeLower.includes("street")) {
      imageUrl = "/test_images/streetlight.jpg";
    } else if (typeLower.includes("tree")) {
      imageUrl = "/test_images/pothole.jpg";
    }

    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          ward: complaintData.ward,
          locality: complaintData.locality,
          issue_type: complaintData.issue_type,
          severity: complaintData.severity,
          confidence: 0.95,
          follow_up_answers: [
            { question: "Assessed Locality", answer: complaintData.locality },
            { question: "Assessed Issue", answer: complaintData.description }
          ],
          latitude: lat,
          longitude: lng,
          formatted_address: `${complaintData.locality}, Bengaluru, Karnataka, India`,
          city: "Bengaluru",
          state: "Karnataka",
          postal_code: "",
          explainability: "Report generated via AI Civic Intake Assistant Desk.",
          citizen_name: complaintData.citizen_name || "Concerned Citizen",
          contact_info: complaintData.contact_info || "Not provided",
          description: complaintData.description || ""
        }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Save to local storage for dashboard
        const fullReport = {
          id: data.id,
          image_url: imageUrl,
          ward: complaintData.ward,
          locality: complaintData.locality,
          issue_type: complaintData.issue_type,
          severity: complaintData.severity,
          confidence: 0.95,
          priority: data.priority,
          authority: data.authority,
          complaint_draft: data.complaint_draft,
          action_plan: data.action_plan,
          created_at: new Date().toISOString(),
          status: "Investigating",
          latitude: lat,
          longitude: lng,
          formatted_address: `${complaintData.locality}, Bengaluru, Karnataka, India`,
          city: "Bengaluru",
          state: "Karnataka",
          postal_code: "",
          follow_up_answers: [
            { question: "Assessed Locality", answer: complaintData.locality },
            { question: "Assessed Issue", answer: complaintData.description }
          ],
          explainability: "Report generated via AI Civic Intake Assistant Desk.",
          estimation: data.estimation || null,
          supporter_count: 1,
          citizen_name: complaintData.citizen_name || "Concerned Citizen",
          contact_info: complaintData.contact_info || "Not provided",
          description: complaintData.description || ""
        };

        try {
          const sanitizedReport = sanitizeReportForLocalStorage(fullReport);
          localStorage.setItem(`report_${data.id}`, JSON.stringify(sanitizedReport));
          const reportsListRaw = localStorage.getItem("reports_list");
          let reportsList = [];
          if (reportsListRaw) {
            reportsList = JSON.parse(reportsListRaw);
          }
          reportsList.unshift(sanitizedReport);
          localStorage.setItem("reports_list", JSON.stringify(sanitizeReportsListForLocalStorage(reportsList)));
        } catch (e) {
          console.error("Local storage report sync failed:", e);
        }

        // Redirect to details page
        router.push(`/report/${data.id}`);
      } else {
        alert("Failed to file complaint. Please try again.");
      }
    } catch (err) {
      console.error("Error filing complaint:", err);
      alert("Error communicating with server.");
    } finally {
      setFiling(false);
    }
  };

  const clearChat = () => {
    if (streamingId) return;
    setComplaintData(null);
    setMessages([
      {
        id: "welcome",
        role: "model",
        content: "Hello! I am the CivicEye AI Assistant. I can help answer questions about local civic issues, reporting procedures, safety advice, or explain how our AI classification works. How can I help you today?"
      }
    ]);
  };

  return (
    <div className="flex-1 bg-background text-on-surface pt-32 pb-20 px-6 md:px-12 max-w-5xl mx-auto w-full flex flex-col min-h-[85vh]">
      
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-6 shrink-0">
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
          disabled={!!streamingId}
          className="glass-sm px-4 py-2.5 rounded-xl font-display text-xs font-bold text-rose-400 border-rose-500/10 hover:bg-rose-500/10 hover:border-rose-500/25 transition-all flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Trash2 className="h-4 w-4" /> Clear Chat
        </button>
      </div>

      {/* Main chat window container */}
      <div className="flex-grow glass-md rounded-[2rem] border border-white/5 flex flex-col overflow-hidden min-h-[500px] shadow-2xl relative">
        
        {/* Background shader grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(0,209,255,0.04),transparent_50%)] pointer-events-none" />

        {/* Scrollable messages thread */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 terminal-scroll relative z-10">
          
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isModel = msg.role === "model";
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-4 items-start ${isModel ? "" : "flex-row-reverse"}`}
                >
                  {/* Avatar bubble */}
                  <div className={`h-8 w-8 rounded-full border flex items-center justify-center shrink-0 ${
                    isModel 
                      ? "bg-electric-blue/10 border-electric-blue/20 text-electric-blue shadow-[0_0_10px_rgba(0,209,255,0.15)]" 
                      : "bg-surface-container border-white/10 text-white"
                  }`}>
                    {isModel ? <Bot className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
                  </div>

                  {/* Message body */}
                  <div className={`max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed border ${
                    isModel
                      ? "bg-slate-900/40 border-white/5 text-slate-200"
                      : "bg-electric-blue text-background border-electric-blue/20 font-medium"
                  }`}>
                    {/* Render message formatting slightly if model */}
                    {isModel ? (
                      <div className="space-y-2 whitespace-pre-wrap">
                        {msg.content}
                        {msg.isStreaming && (
                          <span className="inline-block w-1.5 h-4 bg-electric-blue animate-pulse ml-0.5 align-middle" />
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Waiting for response typing indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex gap-4 items-start"
              >
                <div className="h-8 w-8 rounded-full border bg-electric-blue/10 border-electric-blue/20 text-electric-blue flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(0,209,255,0.15)]">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-electric-blue/60 animate-bounce" style={{ animationDelay: "0s" }} />
                  <span className="h-2 w-2 rounded-full bg-electric-blue/60 animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <span className="h-2 w-2 rounded-full bg-electric-blue/60 animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {complaintData && !streamingId && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 border border-electric-blue/30 bg-electric-blue/5 rounded-2xl p-6 relative overflow-hidden shadow-[0_0_25px_rgba(0,209,255,0.05)]"
            >
              <div className="absolute -right-20 -top-20 h-40 w-40 bg-electric-blue/15 blur-3xl rounded-full" />
              
              <div className="flex items-start gap-4">
                <div className="p-3 bg-electric-blue/10 border border-electric-blue/20 rounded-xl text-electric-blue">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-grow space-y-3">
                  <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    Official BBMP Complaint Summary
                    <span className="text-[10px] bg-electric-blue/20 text-electric-blue px-2 py-0.5 rounded font-mono uppercase tracking-widest font-bold">
                      Ready to File
                    </span>
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Officer Gemini has compiled the administrative diagnostics for your report. Please review the official file information below:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/40 border border-white/5 rounded-xl p-4 mt-2">
                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Citizen Name</span>
                      <span className="text-sm font-semibold text-white mt-1 block">{complaintData.citizen_name || "Concerned Citizen"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Contact Details</span>
                      <span className="text-sm font-semibold text-white mt-1 block">{complaintData.contact_info || "Not provided"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Defect Category</span>
                      <span className="text-sm font-semibold text-white mt-1 block">{complaintData.issue_type}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Assigned Ward</span>
                      <span className="text-sm font-semibold text-white mt-1 block">{complaintData.ward}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Locality / Landmark</span>
                      <span className="text-sm font-semibold text-white mt-1 block">{complaintData.locality}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Severity Assessment</span>
                      <span className="text-sm font-semibold mt-1 block flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${
                          complaintData.severity === "Critical" ? "bg-rose-500" :
                          complaintData.severity === "High" ? "bg-amber-500" :
                          complaintData.severity === "Medium" ? "bg-blue-500" : "bg-emerald-500"
                        }`} />
                        <span className={
                          complaintData.severity === "Critical" ? "text-rose-400 font-bold" :
                          complaintData.severity === "High" ? "text-amber-400 font-bold" :
                          complaintData.severity === "Medium" ? "text-blue-400 font-bold" : "text-emerald-400 font-bold"
                        }>
                          {complaintData.severity}
                        </span>
                      </span>
                    </div>
                    <div className="md:col-span-2 border-t border-white/5 pt-3 mt-1">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Assigned Authority</span>
                      <span className="text-xs font-semibold text-slate-300 mt-1 block">{complaintData.authority}</span>
                    </div>
                    <div className="md:col-span-2 border-t border-white/5 pt-3 mt-1">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Complaint Description</span>
                      <span className="text-xs text-slate-300 mt-1 block italic">"{complaintData.description}"</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3">
                    <button
                      onClick={handleFileComplaint}
                      disabled={filing}
                      className="flex-grow bg-electric-blue hover:brightness-110 active:scale-98 text-background font-display text-sm font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-electric-blue/20"
                    >
                      {filing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Filing Incident Log...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" />
                          Confirm & File Official Report
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setComplaintData(null)}
                      disabled={filing}
                      className="px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl font-display text-xs text-slate-400 hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Prompts Section (pinned at bottom above input if conversation is short) */}
        {messages.length === 1 && !loading && (
          <div className="px-6 md:px-8 pb-4 shrink-0 relative z-10">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-3 font-display">
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

        {/* Footer Text entry area */}
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
              disabled={loading || !!streamingId}
              placeholder={streamingId ? "Streaming assistant response..." : "Ask about authorities, pothole repairs, security risks..."}
              className="flex-1 glass-md pl-5 pr-14 py-4 rounded-2xl border border-white/5 outline-none focus:ring-1 focus:ring-electric-blue/30 text-sm text-white placeholder:text-on-surface-variant/50 disabled:opacity-50"
            />
            
            <button
              type="submit"
              disabled={!input.trim() || loading || !!streamingId}
              className="absolute right-3 bg-electric-blue text-background h-10 w-10 rounded-xl flex items-center justify-center hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md shadow-electric-blue/20"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
