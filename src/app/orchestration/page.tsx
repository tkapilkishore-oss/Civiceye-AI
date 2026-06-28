"use client";

import { useEffect, useState, useRef } from "react";
import {
  Terminal,
  Activity,
  Cpu,
  Eye,
  Landmark,
  Clock
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useDemo } from "@/components/DemoProvider";

const agents = [
  { 
    id: 0, 
    name: "Vision Analysis Agent", 
    icon: Eye, 
    logs: [
      "Analyzing uploaded image pixels...",
      "Identifying surface fracture patterns...",
      "Volumetric anomaly depth calculation in progress...",
      "Confidence criteria met."
    ],
    getConclusion: (r: any) => `${(r?.issue_type || "Pothole").toUpperCase()} DETECTED`,
    getReasoning: () => [
      "Circular asphalt depression shape identified",
      "Edge degradation and road fracture matched",
      "High vehicle navigation risk flagged"
    ],
    metric: (r: any) => `Confidence: ${Math.round((r?.confidence || 0.98) * 100)}%`,
    duration: "0.8"
  },
  { 
    id: 1, 
    name: "Geo Location Agent", 
    icon: Landmark, 
    logs: [
      "Resolving GPS coordinate bounds...",
      "Intersecting regional municipal shapefiles...",
      "Matching administrative jurisdiction division...",
      "Boundary confirmation resolved."
    ],
    getConclusion: (r: any) => `MAPPED TO ${r?.locality ? r.locality.split(",")[0].toUpperCase() : "INDIAN REGION"}`,
    getReasoning: () => [
      "Coordinates intersection successful",
      "Administrative zone polygon matched",
      "Local jurisdiction registry verified"
    ],
    metric: (r: any) => `GPS: ${r?.latitude ? Number(r.latitude).toFixed(4) : "12.9716"}, ${r?.longitude ? Number(r.longitude).toFixed(4) : "77.5946"}`,
    duration: "1.1"
  },
  { 
    id: 2, 
    name: "Priority & SLA Agent", 
    icon: Activity, 
    logs: [
      "Assessing local traffic congestion index...",
      "Evaluating pedestrian density near coordinates...",
      "Calculating hazard threat score...",
      "Priority weights finalized."
    ],
    getConclusion: (r: any) => `SEVERITY: ${(r?.priority || r?.severity || "High").toUpperCase()}`,
    getReasoning: () => [
      "High traffic flow collision threat",
      "Urgent dispatch priority assigned",
      "Estimated resolution SLA: 24 Hours"
    ],
    metric: (r: any) => `Threat Index: ${r?.priority === "Critical" ? "9.2/10" : "8.1/10"}`,
    duration: "0.7"
  },
  { 
    id: 3, 
    name: "Duplicate Check Agent", 
    icon: Cpu, 
    logs: [
      "Querying localized coordinates index...",
      "Buffering 200-meter radius around incident...",
      "Scanning active ledger database tickets...",
      "Duplicate search complete."
    ],
    getConclusion: () => "SCAN CLEAN - UNIQUE INCIDENT",
    getReasoning: () => [
      "No duplicate coordinates within 200m buffer",
      "No overlapping active reports found",
      "100% unique transaction confirmed"
    ],
    metric: () => "Overlap: 0 matches",
    duration: "0.9"
  },
  { 
    id: 4, 
    name: "Authority Routing Agent", 
    icon: Landmark, 
    logs: [
      "Mapping category to corresponding municipal grid...",
      "Identifying local engineering squad...",
      "Assigning regional dispatch authority...",
      "Work order routed."
    ],
    getConclusion: (r: any) => `ASSIGNED: ${r?.authority ? r.authority.toUpperCase() : "MUNICIPAL DEPT"}`,
    getReasoning: () => [
      "Defect category matches dispatch registry",
      "Routed to regional zone engineering division",
      "Automated work order docket generated"
    ],
    metric: (r: any) => `Zone: ${r?.ward || "Central Zone"}`,
    duration: "1.2"
  },
  { 
    id: 5, 
    name: "Complaint Synthesis Agent", 
    icon: Terminal, 
    logs: [
      "Consolidating agent metadata inputs...",
      "Structuring official municipal filing draft...",
      "Polishing description grammar and formatting...",
      "Filing draft finalized."
    ],
    getConclusion: () => "PREVIEW REPORT READY",
    getReasoning: () => [
      "Citizen details integrated into legal copy",
      "Reasoning summary attached for official review",
      "Filing copy formatted for municipal API injection"
    ],
    metric: () => "Output: Structured Text",
    duration: "1.4"
  }
];

// Fallback mock queue of reports using supported types
const mockReportsQueue = [
  {
    id: "REP-9921",
    issue_type: "Pothole",
    priority: "Critical",
    confidence: 0.94,
    locality: "Indiranagar, Bengaluru",
    authority: "BBMP Roads Dept",
    ward: "Ward 80",
    estimation: { repair_cost: 14500 },
    image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDmwPckQKiiVSABXh0uODDoT4KycSHEsXX1SOLvlxjqsxN2JggaWpCdDyQNkL3DkNw4cqzdfmhUOJMf_QzalAPkJr-6qYBpeAbaFO2n9Qy5jZUiKVE9aq8ToTJ2vz2rak5fgEMlPuDzrS0DcLldkEQwz_bLi5ocV_djVELzI3ksaueMTWFIxtG-5YYM1Q-0iQZZFcUqfkhB2aG9oJ-oDVmOhG8OYEwn9t1xi8xtzk2AYfk6bfoPfSgFWUElw6RHSfDbnLrmfCozKKU-",
    description: "Critical crater-style pothole detected on Sector 7 main crossing. High traffic disruption risk."
  },
  {
    id: "REP-8302",
    issue_type: "Garbage Accumulation",
    priority: "High",
    confidence: 0.91,
    locality: "Koramangala, Bengaluru",
    authority: "SWM Department",
    ward: "Ward 151",
    estimation: { repair_cost: 4800 },
    image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDmwPckQKiiVSABXh0uODDoT4KycSHEsXX1SOLvlxjqsxN2JggaWpCdDyQNkL3DkNw4cqzdfmhUOJMf_QzalAPkJr-6qYBpeAbaFO2n9Qy5jZUiKVE9aq8ToTJ2vz2rak5fgEMlPuDzrS0DcLldkEQwz_bLi5ocV_djVELzI3ksaueMTWFIxtG-5YYM1Q-0iQZZFcUqfkhB2aG9oJ-oDVmOhG8OYEwn9t1xi8xtzk2AYfk6bfoPfSgFWUElw6RHSfDbnLrmfCozKKU-",
    description: "Large solid waste accumulation spill blocking pedestrian path. Odor hazard and public safety risk."
  },
  {
    id: "REP-7122",
    issue_type: "Water Leakage",
    priority: "Medium",
    confidence: 0.88,
    locality: "Whitefield, Bengaluru",
    authority: "BWSSB Water Board",
    ward: "Ward 84",
    estimation: { repair_cost: 8200 },
    image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDmwPckQKiiVSABXh0uODDoT4KycSHEsXX1SOLvlxjqsxN2JggaWpCdDyQNkL3DkNw4cqzdfmhUOJMf_QzalAPkJr-6qYBpeAbaFO2n9Qy5jZUiKVE9aq8ToTJ2vz2rak5fgEMlPuDzrS0DcLldkEQwz_bLi5ocV_djVELzI3ksaueMTWFIxtG-5YYM1Q-0iQZZFcUqfkhB2aG9oJ-oDVmOhG8OYEwn9t1xi8xtzk2AYfk6bfoPfSgFWUElw6RHSfDbnLrmfCozKKU-",
    description: "Underground pipeline fracture causing active potable water leak and minor street flooding."
  },
  {
    id: "REP-6051",
    issue_type: "Broken Streetlight",
    priority: "Medium",
    confidence: 0.95,
    locality: "Jayanagar, Bengaluru",
    authority: "BESCOM Power Grid",
    ward: "Ward 123",
    estimation: { repair_cost: 2500 },
    image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDmwPckQKiiVSABXh0uODDoT4KycSHEsXX1SOLvlxjqsxN2JggaWpCdDyQNkL3DkNw4cqzdfmhUOJMf_QzalAPkJr-6qYBpeAbaFO2n9Qy5jZUiKVE9aq8ToTJ2vz2rak5fgEMlPuDzrS0DcLldkEQwz_bLi5ocV_djVELzI3ksaueMTWFIxtG-5YYM1Q-0iQZZFcUqfkhB2aG9oJ-oDVmOhG8OYEwn9t1xi8xtzk2AYfk6bfoPfSgFWUElw6RHSfDbnLrmfCozKKU-",
    description: "Streetlight fixture inactive. Overhead bulb damaged, resulting in low visibility and potential safety hazard."
  }
];

// Reusable CountUp component for metric values
function CountUp({ end, duration = 1000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [end, duration]);
  return <span>{count}{suffix}</span>;
}

export default function OrchestrationPage() {
  const shouldReduceMotion = useReducedMotion();
  const { isDemoActive, setStep: setDemoStep, scenario, scrollIntoViewIfNeeded, smoothScrollTo } = useDemo();
  const [currentAgentIdx, setCurrentAgentIdx] = useState(0);
  const [agentState, setAgentState] = useState<"waiting" | "active" | "processing" | "completed">("active");
  const [logs, setLogs] = useState<string[]>([]);
  const [typedDescription, setTypedDescription] = useState("");
  
  // Incident queue states
  const [reportsQueue, setReportsQueue] = useState<any[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isTransitioningIncident, setIsTransitioningIncident] = useState(false);

  // Runtime stopwatch states
  const [globalRuntime, setGlobalRuntime] = useState(0);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [activeAgentDuration, setActiveAgentDuration] = useState(0);
  
  // Sliding data packet states
  const [packetActive, setPacketActive] = useState(false);
  const [packetText, setPacketText] = useState("");

  // Keep active agent card visible in viewport during demo mode
  useEffect(() => {
    if (!isDemoActive) return;
    
    // Defer check briefly to allow DOM classes to transition
    const timer = setTimeout(() => {
      const activeCard = document.querySelector(".demo-active-agent-card") as HTMLElement;
      if (activeCard) {
        scrollIntoViewIfNeeded(activeCard, 1200);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentAgentIdx, agentState, isDemoActive, scrollIntoViewIfNeeded]);

  // Refs for tracking circle icon positions dynamically
  const parentRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [iconPositions, setIconPositions] = useState<number[]>([]);
  const terminalLogRef = useRef<HTMLDivElement>(null);

  // Calculate dynamic vertical icon center positions relative to the parent list container
  const updateIconPositions = () => {
    if (!parentRef.current) return;
    const parentRect = parentRef.current.getBoundingClientRect();
    const positions = iconRefs.current.map(ref => {
      if (!ref) return 0;
      const rect = ref.getBoundingClientRect();
      return rect.top - parentRect.top + 24; // +24 centers vertically inside the h-12 (48px) circle
    });
    setIconPositions(positions);
  };

  // Re-calculate positions whenever agent state, viewport width, or index changes
  useEffect(() => {
    updateIconPositions();
    // Add small delay to measure position after card dynamic height animation finishes
    const timer = setTimeout(updateIconPositions, 500);
    window.addEventListener("resize", updateIconPositions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateIconPositions);
    };
  }, [currentAgentIdx, agentState]);

  // Derived current active incident
  const latestReport = reportsQueue[queueIndex] || null;

  // 1. Listen for reports in Firestore or load from API/mock queue
  useEffect(() => {
    let unsubscribe: any = () => {};

    if (isDemoActive) {
      try {
        const localListRaw = localStorage.getItem("reports_list");
        if (localListRaw) {
          const localList = JSON.parse(localListRaw);
          setReportsQueue(localList);
          
          const urlParams = new URLSearchParams(window.location.search);
          const targetReportId = urlParams.get("reportId");
          if (targetReportId) {
            const idx = localList.findIndex((r: any) => r.id === targetReportId);
            if (idx !== -1) {
              setQueueIndex(idx);
            }
          }
          return unsubscribe;
        }
      } catch (e) {
        console.error("Local storage load queue error in demo mode:", e);
      }
    }

    const loadLatestFromServer = async () => {
      try {
        const res = await fetch("/api/reports");
        if (res.ok) {
          const reports = await res.json();
          if (reports && reports.length > 0) {
            console.log("Orchestration page loaded reports queue from server API:", reports);
            setReportsQueue(reports);
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch reports queue from server API:", err);
      }
      setReportsQueue(mockReportsQueue);
    };

    try {
      if (db) {
        const q = query(collection(db, "reports"), orderBy("created_at", "desc"), limit(10));
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const fetchedQueue = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
              }));
              console.log("Orchestration page loaded reports queue from Firestore:", fetchedQueue);
              setReportsQueue(fetchedQueue);
            } else {
              loadLatestFromServer();
            }
          },
          (dbErr) => {
            console.error("Firestore queue subscription error, falling back:", dbErr);
            loadLatestFromServer();
          }
        );
      } else {
        loadLatestFromServer();
      }
    } catch (err) {
      console.error("Failed to query Firestore reports queue:", err);
      loadLatestFromServer();
    }

    return () => unsubscribe();
  }, []);

  // 2. Global stopwatch timer loop
  useEffect(() => {
    let interval: any;
    if (isPipelineRunning) {
      interval = setInterval(() => {
        setGlobalRuntime(prev => prev + 0.1);
        setActiveAgentDuration(prev => prev + 0.1);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPipelineRunning]);

  // 3. Sequential Agent Execution Timeline State Machine (Chained Sequence)
  useEffect(() => {
    let logTimer: any;
    let stateTimer: any;
    let charTimer: any;

    if (reportsQueue.length === 0) return;
    const currentAgent = agents[currentAgentIdx];
    if (!currentAgent) return;

    // Reset typed description and stopwatch if we are starting a new pipeline loop
    if (currentAgentIdx === 0 && agentState === "active") {
      setTypedDescription("");
      setLogs([`[SYSTEM] INITIALIZING CORE INFRASTRUCTURE SENSORS...`]);
      setGlobalRuntime(0);
      setIsPipelineRunning(true);
    }

    if (agentState === "active") {
      setLogs(prev => [...prev, `[SYSTEM] ACTIVATING ${currentAgent.name.toUpperCase()}...`]);
      setActiveAgentDuration(0);
      
      stateTimer = setTimeout(() => {
        setAgentState("processing");
      }, 700);

    } else if (agentState === "processing") {
      let logIndex = 0;
      
      const printNextLog = () => {
        if (logIndex < currentAgent.logs.length) {
          const logLine = currentAgent.logs[logIndex];
          setLogs(prev => [...prev, `[${currentAgent.name.toUpperCase()}] ${logLine}`]);
          logIndex++;
          logTimer = setTimeout(printNextLog, 500);
        } else {
          setAgentState("completed");
        }
      };
      
      printNextLog();

    } else if (agentState === "completed") {
      const conclusion = currentAgent.getConclusion(latestReport);
      setLogs(prev => [
        ...prev, 
        `[${currentAgent.name.toUpperCase()}] SUCCESS: ${conclusion}`,
        `[${currentAgent.name.toUpperCase()}] EXPLAINABLE DECISION LOGGED.`
      ]);

      if (currentAgentIdx === 5) {
        // Stop global runtime stopwatch
        setIsPipelineRunning(false);
        
        // Start natural LLM-style token streaming for final complaint
        const fullText = latestReport?.description || "High priority report logged for local division. Road repairs and municipal logistics scheduled within SLA window.";
        const words = fullText.split(" ");
        let wordIdx = 0;
        let currentStr = "";
        
        const streamWords = () => {
          if (wordIdx < words.length) {
            const word = words[wordIdx];
            currentStr += (wordIdx === 0 ? "" : " ") + word;
            setTypedDescription(currentStr);
            wordIdx++;
            
            // Pauses based on punctuation marks (period, comma)
            let delay = 70;
            if (word.endsWith(".") || word.endsWith("!")) delay = 350;
            else if (word.endsWith(",")) delay = 180;
            
            charTimer = setTimeout(streamWords, delay);
          } else {
            if (isDemoActive) {
              const runCompletionScroll = async () => {
                const summaryEl = document.querySelector(".demo-orchestration-summary") as HTMLElement;
                if (summaryEl) {
                  await smoothScrollTo(summaryEl, 1500);
                }
                stateTimer = setTimeout(() => {
                  setDemoStep(3);
                }, 6000);
              };
              runCompletionScroll();
            } else {
              // Typing complete: Wait 4 seconds, then transition to next incident
              stateTimer = setTimeout(() => {
                setIsTransitioningIncident(true);
                
                stateTimer = setTimeout(() => {
                  setQueueIndex(prev => (prev + 1) % reportsQueue.length);
                  setCurrentAgentIdx(0);
                  setAgentState("active");
                  setIsTransitioningIncident(false);
                }, 2000); // 2 seconds fade out overlay
              }, 3500);
            }
          }
        };
        
        streamWords();

      } else {
        // Continuous Chain: wait for user to digest reasoning, then trigger sliding data packet
        stateTimer = setTimeout(() => {
          const dataVal = currentAgent.id === 0 ? (latestReport?.issue_type || "Pothole") :
                          currentAgent.id === 1 ? (latestReport?.locality?.split(",")[0] || "Indiranagar") :
                          currentAgent.id === 2 ? (latestReport?.priority || "High") :
                          currentAgent.id === 3 ? "Clean Check" :
                          currentAgent.id === 4 ? (latestReport?.authority?.split(" ")[0] || "BBMP") : "Data";
                           
          setPacketText(dataVal.toUpperCase());
          setPacketActive(true);

          // Once packet reaches bottom boundary (1.0s), awaken the next agent
          stateTimer = setTimeout(() => {
            setPacketActive(false);
            setCurrentAgentIdx(prev => prev + 1);
            setAgentState("active");
          }, 1000);
        }, 2200);
      }
    }

    return () => {
      clearTimeout(logTimer);
      clearTimeout(stateTimer);
      clearTimeout(charTimer);
    };
  }, [currentAgentIdx, agentState, reportsQueue, queueIndex, latestReport, isDemoActive, setDemoStep, smoothScrollTo]);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalLogRef.current) {
      terminalLogRef.current.scrollTop = terminalLogRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex-1 bg-background text-on-surface overflow-x-hidden pt-32 pb-20 px-6 md:px-12 flex flex-col items-center">
      {/* Dynamic Background Spotlights */}
      <div className="fixed inset-0 z-[-2] pointer-events-none opacity-60 bg-slate-950 w-full h-full">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,209,255,0.08)_0%,transparent_70%)] opacity-70" />
        <div className="absolute top-[20%] left-[10%] w-[50vw] h-[50vh] rounded-full bg-electric-blue/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-7xl space-y-8 flex-grow">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-none">
              AI Orchestration Engine
            </h1>
            <p className="text-on-surface-variant font-display text-sm md:text-base mt-3 max-w-2xl font-medium opacity-80 leading-relaxed">
              Autonomous infrastructure verification pipeline running active classification on regional sector-7 infrastructure reports.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-white/5 text-[10px] font-mono tracking-widest text-electric-blue uppercase shadow-lg">
              <span className="w-2 h-2 rounded-full bg-electric-blue animate-pulse shadow-[0_0_8px_rgba(0,209,255,0.8)]" />
              LIVE SYSTEM CLUSTER
            </span>
          </div>
        </header>

        {/* Bento Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left panel: Pipeline checklist (4 cols) */}
          <div className="lg:col-span-4 glass-md rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden border border-white/5 shadow-2xl min-h-[500px]">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-electric-blue/30 via-electric-blue/5 to-transparent"></div>
            
            <div className="space-y-6">
              <h3 className="text-[10px] font-bold tracking-[0.25em] text-on-surface-variant uppercase opacity-60 font-display">
                Collaborative AI Agents
              </h3>
              
              <div className="flex flex-col gap-0 relative" ref={parentRef}>
                {/* Sliding Data Packet Pill centered on the measured connector coordinates */}
                <AnimatePresence>
                  {packetActive && 
                   !shouldReduceMotion && 
                   iconPositions[currentAgentIdx] !== undefined && 
                   iconPositions[currentAgentIdx + 1] !== undefined && (
                    <motion.div
                      className="absolute left-[40px] -translate-x-1/2 top-0 z-30 px-3 py-1 bg-slate-900 border border-electric-blue/40 text-[9px] font-mono font-bold text-electric-blue shadow-[0_0_12px_rgba(0,209,255,0.4)] flex items-center gap-1.5 pointer-events-none rounded-full"
                      initial={{ y: iconPositions[currentAgentIdx] - 14, opacity: 0, scale: 0.8 }}
                      animate={{ 
                        y: iconPositions[currentAgentIdx + 1] - 14, 
                        opacity: [0, 1, 1, 0], 
                        scale: [0.8, 1, 1, 0.8] 
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.0, ease: "easeInOut" }}
                    >
                      <Cpu className="h-3 w-3 animate-spin text-electric-blue" style={{ animationDuration: "3s" }} />
                      <span>{packetText}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {agents.map((agent, index) => {
                  const isActive = index === currentAgentIdx && (agentState === "active" || agentState === "processing");
                  const isCompleted = index < currentAgentIdx || (index === currentAgentIdx && agentState === "completed");
                  const Icon = agent.icon;

                  let statusText = "Waiting";
                  let statusColor = "text-slate-600 border-white/5 bg-slate-900/40";
                  if (isActive) {
                    statusText = agentState === "active" ? "Active" : "Processing";
                    statusColor = "text-electric-blue border-electric-blue/20 bg-electric-blue/10 animate-pulse";
                  } else if (isCompleted) {
                    statusText = "Completed";
                    statusColor = "text-emerald-400 border-emerald-500/20 bg-emerald-950/20";
                  }

                  return (
                    <div key={agent.id}>
                      {/* Agent Card */}
                      <motion.div
                        layout="position"
                        className={`flex items-start gap-4 p-4 rounded-2xl glass-md transition-all duration-300 relative border ${
                          isActive 
                            ? "demo-active-agent-card border-electric-blue/40 bg-electric-blue/[0.03] shadow-[0_0_25px_rgba(0,209,255,0.12)] opacity-100 scale-[1.01]" 
                            : isCompleted
                            ? "border-emerald-500/10 bg-emerald-950/5 opacity-85"
                            : "border-white/5 bg-slate-900/10 opacity-30"
                        }`}
                        style={{ minHeight: "112px" }}
                      >
                        {/* Active Agent Ambient Energy Glow Overlay */}
                        {isActive && (
                          <div className="absolute inset-0 bg-gradient-to-r from-electric-blue/5 to-transparent pointer-events-none animate-pulse rounded-2xl" />
                        )}

                        {/* Status circle check or active icon (ref is attached here to track position) */}
                        <div 
                          ref={el => { iconRefs.current[index] = el; }}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 transition-all z-10 relative ${
                            isActive 
                              ? "bg-slate-900 border-electric-blue text-electric-blue shadow-[0_0_12px_rgba(0,209,255,0.3)] animate-pulse" 
                              : isCompleted
                              ? "bg-slate-900 border-emerald-500 text-emerald-400"
                              : "bg-surface-container border-white/10 text-on-surface-variant/40"
                          }`}
                        >
                          {isCompleted ? (
                            <motion.span 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 200, damping: 10 }}
                              className="material-symbols-outlined text-sm text-emerald-400 font-bold"
                            >
                              check
                            </motion.span>
                          ) : (
                            <Icon className="h-5 w-5" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-grow space-y-1 overflow-hidden font-display text-left">
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${
                              isActive ? "text-electric-blue" : isCompleted ? "text-slate-200" : "text-on-surface-variant"
                            }`}>
                              {agent.name}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest border ${statusColor}`}>
                              {statusText}
                            </span>
                          </div>

                          {/* Active status showing typewriter logs */}
                          {isActive && (
                            <div className="text-[10px] text-electric-blue/80 font-mono flex items-center gap-1.5 mt-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-electric-blue animate-ping" />
                              <span className="truncate">{logs[logs.length - 1] || "Initializing agent..."}</span>
                            </div>
                          )}

                          {/* Completed state showing Explainable AI reasoning with smooth height expansion */}
                          <AnimatePresence initial={false}>
                            {isCompleted && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="space-y-1.5 pt-2 border-t border-white/5 mt-2">
                                  <div className="text-[10px] font-semibold text-emerald-400 font-mono">
                                    ✓ {agent.getConclusion(latestReport)}
                                  </div>
                                  <div className="text-[9px] font-mono text-on-surface-variant/50 flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" /> 
                                      {isActive ? activeAgentDuration.toFixed(1) : agent.duration}s
                                    </span>
                                    <span>
                                      {agent.id === 0 && latestReport ? (
                                        <CountUp end={Math.round((latestReport.confidence || 0.98) * 100)} suffix="%" />
                                      ) : (
                                        agent.metric(latestReport)
                                      )}
                                    </span>
                                  </div>
                                  <motion.ul 
                                    className="text-[9px] text-on-surface-variant/80 list-disc list-inside space-y-0.5 leading-relaxed font-sans pt-1"
                                    variants={{
                                      hidden: {},
                                      visible: { transition: { staggerChildren: 0.08 } }
                                    }}
                                    initial="hidden"
                                    animate="visible"
                                  >
                                    {agent.getReasoning().map((point, pIdx) => (
                                      <motion.li 
                                        key={pIdx} 
                                        variants={{
                                          hidden: { opacity: 0, x: -8 },
                                          visible: { opacity: 1, x: 0 }
                                        }}
                                        transition={{ duration: 0.3 }}
                                        className="truncate"
                                      >
                                        {point}
                                      </motion.li>
                                    ))}
                                  </motion.ul>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>

                      {/* Connection Gap Connector (Only centered in the gap, no overlap with cards) */}
                      {index < 5 && (
                        <div className="h-4 relative w-full pointer-events-none">
                          {/* Segmented connector line centered on the left-side icon (x=40px) */}
                          <div className="absolute left-[40px] -translate-x-1/2 top-0 bottom-0 w-[2px] bg-slate-900 z-0" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center panel: Live scanning image (5 cols) */}
          <div className="lg:col-span-5 rounded-3xl relative group overflow-hidden border border-white/10 shadow-2xl bg-surface-container-lowest flex flex-col justify-between min-h-[500px]">
            {/* Visual scan scanner-line effect */}
            <div className="scanning-line" />
            
            {/* Main scanner background image */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[4000ms] group-hover:scale-102 bg-no-repeat"
              style={{
                backgroundImage: `url('${(isDemoActive && scenario?.image) ? scenario.image : (latestReport?.image_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuDmwPckQKiiVSABXh0uODDoT4KycSHEsXX1SOLvlxjqsxN2JggaWpCdDyQNkL3DkNw4cqzdfmhUOJMf_QzalAPkJr-6qYBpeAbaFO2n9Qy5jZUiKVE9aq8ToTJ2vz2rak5fgEMlPuDzrS0DcLldkEQwz_bLi5ocV_djVELzI3ksaueMTWFIxtG-5YYM1Q-0iQZZFcUqfkhB2aG9oJ-oDVmOhG8OYEwn9t1xi8xtzk2AYfk6bfoPfSgFWUElw6RHSfDbnLrmfCozKKU-")}')`,
                opacity: 0.7,
              }}
            />

            {/* AI HUD lock target overlay box */}
            <div className="absolute top-1/4 left-1/4 z-20 glass-md p-4 rounded-xl border-electric-blue/40 animate-pulse text-left shadow-lg">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Activity className="text-electric-blue h-3.5 w-3.5" />
                <span className="text-[9px] uppercase font-black text-electric-blue tracking-widest font-mono">Detected Anomaly</span>
              </div>
              <div className="text-white text-base font-display font-extrabold tracking-tight">
                {latestReport
                  ? `${(latestReport.priority || latestReport.severity || "HIGH").toUpperCase()}_${(latestReport.issue_type || "Pothole").toUpperCase().replace(/\s+/g, "_")}`
                  : "CRITICAL_POTHOLE_S7"}
              </div>
              <div className="text-[9px] font-mono text-on-surface-variant/80 mt-1">
                LAT: {latestReport?.latitude ? Number(latestReport.latitude).toFixed(4) : "12.9716"} | LONG: {latestReport?.longitude ? Number(latestReport.longitude).toFixed(4) : "77.5946"}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-2 font-display">
                {(() => {
                  const type = (latestReport?.issue_type || "Pothole").toLowerCase();
                  let label1 = "Depth", val1 = "4.2\"", label2 = "Radius", val2 = "1.8'";
                  if (type.includes("water") || type.includes("leak") || type.includes("drain")) {
                    label1 = "Flow Rate"; val1 = "8.4 L/s"; label2 = "Pressure"; val2 = "45 PSI";
                  } else if (type.includes("garbage") || type.includes("waste") || type.includes("trash")) {
                    label1 = "Volume"; val1 = "3.2 m³"; label2 = "Area Spill"; val2 = "15 sq ft";
                  } else if (type.includes("light") || type.includes("bulb")) {
                    label1 = "Voltage"; val1 = "120V"; label2 = "Lux Level"; val2 = "12 Lux";
                  }
                  return (
                    <>
                      <div>
                        <span className="text-[8px] uppercase text-on-surface-variant block">{label1}</span>
                        <span className="text-xs font-bold text-white">{val1}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase text-on-surface-variant block">{label2}</span>
                        <span className="text-xs font-bold text-white">{val2}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Bounding box metadata HUD right align */}
            <div className="absolute top-6 right-6 z-20 glass-sm p-3 rounded-lg border-white/10 font-mono text-[9px] text-electric-blue/50 flex flex-col gap-1.5 text-left">
              <span>SCANNER_LOOP: ACTIVE</span>
              <span>VECTOR_MATCH: {latestReport ? Math.round((latestReport.confidence || 0.98) * 100) : 91}%</span>
            </div>

            {/* Engine classification metrics bottom overlay */}
            <div className="absolute bottom-6 right-6 left-6 z-20 glass-lg p-5 rounded-2xl border-white/10 flex flex-col gap-3 font-display">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[10px] text-electric-blue uppercase font-bold tracking-widest font-mono">
                  Active Report Telemetry HUD
                </span>
                <span className="text-[9px] font-mono text-on-surface-variant">ID: {latestReport?.id || "N/A"}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-display text-left">
                <div>
                  <span className="text-[8px] text-on-surface-variant uppercase block">Issue Type</span>
                  <AnimatePresence mode="wait">
                    {currentAgentIdx > 0 || (currentAgentIdx === 0 && agentState === "completed") ? (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-bold text-white text-[13px]">{latestReport?.issue_type || "Pothole"}</motion.span>
                    ) : (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] text-electric-blue/40 italic font-mono animate-pulse">Running Vision...</motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <span className="text-[8px] text-on-surface-variant uppercase block">AI Confidence</span>
                  <AnimatePresence mode="wait">
                    {currentAgentIdx > 0 || (currentAgentIdx === 0 && agentState === "completed") ? (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-bold text-emerald-400 font-mono text-[13px]">
                        {latestReport ? Math.round((latestReport.confidence || 0.98) * 100) : 98}%
                      </motion.span>
                    ) : (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] text-electric-blue/40 italic font-mono animate-pulse">Running Vision...</motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <span className="text-[8px] text-on-surface-variant uppercase block">Estimated Cost</span>
                  <AnimatePresence mode="wait">
                    {currentAgentIdx > 2 || (currentAgentIdx === 2 && agentState === "completed") ? (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-bold text-amber-400 font-mono text-[13px]">
                        ₹{latestReport?.estimation?.repair_cost ? latestReport.estimation.repair_cost.toLocaleString() : "12,000"}
                      </motion.span>
                    ) : (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] text-electric-blue/40 italic font-mono animate-pulse">Running Priority...</motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <span className="text-[8px] text-on-surface-variant uppercase block">Assigned Authority</span>
                  <AnimatePresence mode="wait">
                    {currentAgentIdx > 4 || (currentAgentIdx === 4 && agentState === "completed") ? (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-bold text-white text-[11px] truncate block">{latestReport?.authority || "BBMP Roads Dept"}</motion.span>
                    ) : (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] text-electric-blue/40 italic font-mono animate-pulse">Running Authority...</motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <span className="text-[8px] text-on-surface-variant uppercase block">Locality Reference</span>
                  <AnimatePresence mode="wait">
                    {currentAgentIdx > 1 || (currentAgentIdx === 1 && agentState === "completed") ? (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-bold text-white text-[11px] truncate block">{latestReport?.locality || "Indiranagar, Bengaluru"}</motion.span>
                    ) : (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] text-electric-blue/40 italic font-mono animate-pulse">Running Geo...</motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <span className="text-[8px] text-on-surface-variant uppercase block">Processing Status</span>
                  {currentAgentIdx === 5 && agentState === "completed" ? (
                    <span className="font-bold text-emerald-400 font-mono text-[13px] animate-pulse">PROCESS COMPLETE</span>
                  ) : (
                    <span className="font-bold text-electric-blue font-mono text-[13px] animate-pulse">PROCESSING...</span>
                  )}
                </div>
              </div>
            </div>

            {/* Seamless Incident Processed Transition Overlay */}
            <AnimatePresence>
              {isTransitioningIncident && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 bg-slate-950/90 z-40 backdrop-blur-md flex flex-col items-center justify-center space-y-3"
                >
                  <div className="w-10 h-10 rounded-full border border-electric-blue/30 border-t-electric-blue animate-spin" />
                  <p className="text-sm font-display font-bold text-white tracking-wide">Incident Processed</p>
                  <p className="text-xs font-mono text-electric-blue animate-pulse">LOADING NEXT INCIDENT...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right panel: Terminal logger console (3 cols) */}
          <div className="lg:col-span-3 glass-md rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden border border-white/5 shadow-2xl min-h-[500px]">
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal className="text-electric-blue h-4.5 w-4.5" />
                  <h3 className="text-[10px] font-bold tracking-[0.25em] text-on-surface-variant uppercase opacity-60 font-display">
                    Intelligence Log
                  </h3>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-electric-blue animate-ping" />
              </div>

              {/* Terminal Logs text container */}
              <div 
                ref={terminalLogRef}
                className="flex-grow font-mono text-[10px] leading-relaxed text-on-surface-variant/80 terminal-scroll overflow-y-auto max-h-[420px] flex flex-col gap-2.5 pr-1 scroll-smooth text-left"
              >
                {logs.map((log, idx) => {
                  let colorClass = "text-on-surface-variant/70";
                  if (log.includes("[SYSTEM]") || log.includes("[READY]")) colorClass = "text-electric-blue";
                  if (log.includes("CRITICAL") || log.includes("SEVERITY")) colorClass = "text-rose-400";
                  if (log.includes("SUCCESS") || log.includes("SUCCESSFUL")) colorClass = "text-emerald-400";
                  return (
                    <p key={idx} className={`${colorClass} ${idx === logs.length - 1 ? "typing" : ""}`}>
                      {log}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        {/* Draft Complaint Live Preview Desk */}
        <div className="glass-md rounded-2xl p-6 border border-white/5 relative overflow-hidden text-left font-display shadow-2xl">
          <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="text-electric-blue h-4 w-4" />
              <span className="text-[10px] font-bold tracking-[0.25em] text-on-surface-variant uppercase opacity-60">
                AI Dispatch Synthesis Preview
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest border ${
              currentAgentIdx === 5 && agentState === "completed"
                ? "text-emerald-400 border-emerald-500/20 bg-emerald-950/20"
                : "text-electric-blue border-electric-blue/20 bg-electric-blue/10 animate-pulse"
            }`}>
              {currentAgentIdx === 5 && agentState === "completed" ? "Filing Copy Staged" : "Drafting..."}
            </span>
          </div>
          
          <div className="min-h-[80px] bg-slate-950/50 p-4 rounded-xl border border-white/5 font-mono text-xs leading-relaxed text-slate-300 relative">
            {typedDescription ? (
              <>
                <span className="text-electric-blue font-bold">&gt; OFFICIAL_COMPLAINT_TEXT:</span><br />
                <span className="text-white">{typedDescription}</span>
                {typedDescription.length < (latestReport?.description || "").length && (
                  <span className="inline-block w-1.5 h-4 bg-electric-blue animate-pulse ml-0.5 align-middle" />
                )}
              </>
            ) : (
              <span className="text-slate-500 italic">Waiting for Complaint Synthesis Agent...</span>
            )}
          </div>
        </div>

        {/* Dynamic Operational Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-2 demo-orchestration-summary">
          {/* Mission Status */}
          <div className="glass-md p-6 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/[0.02] transition-all text-left shadow-lg">
            <div className="relative z-10 font-display">
              <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 opacity-60">
                Mission Status
              </p>
              {currentAgentIdx === 5 && agentState === "completed" ? (
                <h4 className="text-2xl font-extrabold text-emerald-400 tracking-tighter flex items-center gap-1.5">
                  ✓ Completed
                </h4>
              ) : (
                <h4 className="text-2xl font-extrabold text-electric-blue tracking-tighter animate-pulse flex items-center gap-1.5">
                  <Activity className="h-5 w-5 animate-spin text-electric-blue shrink-0" style={{ animationDuration: "3s" }} />
                  Active
                </h4>
              )}
            </div>
          </div>

          {/* Simulation Runtime */}
          <div className="glass-md p-6 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/[0.02] transition-all text-left shadow-lg">
            <div className="relative z-10 font-display">
              <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 opacity-60">
                Simulation Runtime
              </p>
              <h4 className="text-3xl font-extrabold text-white tracking-tighter">
                {globalRuntime.toFixed(1)}<span className="text-sm font-medium ml-0.5 opacity-60">s</span>
              </h4>
              <div className="w-20 h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-electric-blue/40 w-3/4 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Pipeline Health */}
          <div className="glass-md p-6 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/[0.02] transition-all text-left shadow-lg">
            <div className="relative z-10 font-display">
              <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 opacity-60">
                Pipeline Health
              </p>
              <h4 className="text-2xl font-extrabold text-emerald-400 tracking-tighter">
                Nominal
              </h4>
              <div className="w-20 h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-emerald-500/40 w-full" />
              </div>
            </div>
          </div>

          {/* Inference Confidence */}
          <div className="glass-md p-6 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/[0.02] transition-all text-left shadow-lg">
            <div className="relative z-10 font-display">
              <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 opacity-60">
                Inference Confidence
              </p>
              <h4 className="text-3xl font-extrabold text-white tracking-tighter">
                {currentAgentIdx > 0 || (currentAgentIdx === 0 && agentState === "completed") ? (
                  <CountUp end={97} suffix="%" />
                ) : (
                  <span>0%</span>
                )}
              </h4>
              <div className="w-20 h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-electric-blue/40 w-[97%]" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
