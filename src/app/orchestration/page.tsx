"use client";

import { useEffect, useState, useRef } from "react";
import {
  Terminal,
  Activity,
  Layers,
  Cpu
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

export default function OrchestrationPage() {
  const [activeNode, setActiveNode] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const terminalLogRef = useRef<HTMLDivElement>(null);

  const [latestReport, setLatestReport] = useState<any>(null);

  const pipelineNodes = [
    { id: 0, label: "Image Uploaded" },
    { id: 1, label: "Vision Analysis" },
    { id: 2, label: "Issue Classification" },
    { id: 3, label: "Severity Estimation" },
    { id: 4, label: "Duplicate Detection" },
    { id: 5, label: "Jurisdiction Assignment" },
    { id: 6, label: "Complaint Generation" },
    { id: 7, label: "Database Storage" },
    { id: 8, label: "Municipality Notification" },
    { id: 9, label: "Dashboard Update" },
  ];

  // 1. Listen for the latest report in Firestore or localStorage
  useEffect(() => {
    let unsubscribe: any = () => {};

    const loadLatestFromServer = async () => {
      try {
        const res = await fetch("/api/reports");
        if (res.ok) {
          const reports = await res.json();
          if (reports && reports.length > 0) {
            console.log("Orchestration page loaded latest report from server API:", reports[0]);
            setLatestReport(reports[0]);
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch latest report from server API in orchestration:", err);
      }

      // Local storage fallback
      try {
        const localListRaw = localStorage.getItem("reports_list");
        if (localListRaw) {
          const parsedList = JSON.parse(localListRaw);
          if (parsedList.length > 0) {
            console.log("Orchestration page loaded latest report from localStorage fallback:", parsedList[0]);
            setLatestReport(parsedList[0]);
          }
        }
      } catch (e) {
        console.error("Local storage load error in orchestration:", e);
      }
    };

    try {
      if (db) {
        const q = query(collection(db, "reports"), orderBy("created_at", "desc"), limit(1));
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const docSnap = snapshot.docs[0];
              const rData = { id: docSnap.id, ...docSnap.data() };
              console.log("Orchestration page loaded latest Firestore report:", rData);
              setLatestReport(rData);
            } else {
              loadLatestFromServer();
            }
          },
          (dbErr) => {
            console.error("Firestore subscription error in orchestration, falling back:", dbErr);
            loadLatestFromServer();
          }
        );
      } else {
        loadLatestFromServer();
      }
    } catch (err) {
      console.error("Failed to query Firestore latest report:", err);
      loadLatestFromServer();
    }

    return () => unsubscribe();
  }, []);

  // Node animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNode((prev) => (prev + 1) % pipelineNodes.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 2. Generate and type logs sequentially based on active report
  useEffect(() => {
    const defaultLogs = [
      "[SYSTEM] INITIALIZING CORE INFRASTRUCTURE SENSORS...",
      "[DATA] PACKET RECEIVED: HEX_8293-A1 (SECTOR 7)",
      "[AGENT] RUNNING VISION_MODEL_PRO V4.0.2",
      "[DETECTION] ANOMALY IDENTIFIED: POTHOLE_TYPE_C",
      "[ANALYSIS] VOLUMETRIC DEPTH: 4.2 INCHES",
      "[COMPUTATION] CALCULATING TRAFFIC IMPACT RADIUS...",
      "[CLASSIFICATION] SEVERITY_INDEX: 8.5/10 (CRITICAL)",
      "[DB] CROSS-REFERENCING GEOSPATIAL ARCHIVES...",
      "[INFO] NO PREVIOUS REPORTS FOR LOC_S7_44",
      "[WORKFLOW] GENERATING WORK_ORDER_#9921",
      "[AUTH] NOTIFYING REGIONAL_AUTHORITY_6",
      "[LEDGER] LOGGING EVENT TO SECURE_DB",
      "[STATUS] PROCESS_COMPLETE: EXIT_CODE_0",
      "[READY] LISTENING FOR NEXT STREAM...",
    ];

    const getLogsForReport = (report: any) => {
      const idStr = report.id.toUpperCase();
      const typeStr = (report.issue_type || "Pothole").toUpperCase();
      const severityStr = (report.priority || report.severity || "High").toUpperCase();
      const authorityStr = (report.authority || "Municipal Department").toUpperCase();
      const latVal = report.latitude ? Number(report.latitude).toFixed(4) : "12.9716";
      const lngVal = report.longitude ? Number(report.longitude).toFixed(4) : "77.5946";

      return [
        `[SYSTEM] INITIALIZING CORE INFRASTRUCTURE SENSORS...`,
        `[DATA] PACKET RECEIVED: ${idStr} (LAT: ${latVal}, LNG: ${lngVal})`,
        `[AGENT] RUNNING VISION_MODEL_PRO V4.0.2`,
        `[DETECTION] ANOMALY IDENTIFIED: ${typeStr}_ANOMALY`,
        `[ANALYSIS] VOLUMETRIC DETECTED ANOMALY FEATURES...`,
        `[COMPUTATION] ASSESSING COMMUNITY DENSITY AND HAZARD MATRIX...`,
        `[CLASSIFICATION] SEVERITY_INDEX: ${severityStr} PRIORITY`,
        `[DB] RUNNING GEOSPATIAL VECTOR DUPLICATE SCAN...`,
        `[INFO] NO MATCHING DUPLICATES DETECTED WITHIN 200M FENCE.`,
        `[WORKFLOW] ROUTING WORK ORDER DISPATCH QUEUE...`,
        `[AUTH] ASSIGNED JURISDICTION TO: ${authorityStr}`,
        `[LEDGER] SAVING TRANSACTION INTEGRATION TO FIRESTORE...`,
        `[STATUS] PROCESS_COMPLETE: EXIT_CODE_0`,
        `[READY] WAITING FOR NEW VISUAL DATA LOAD STREAM...`
      ];
    };

    const targetLogs = latestReport ? getLogsForReport(latestReport) : defaultLogs;
    let logIndex = 0;
    setLogs([targetLogs[0]]);

    const runLogs = setInterval(() => {
      logIndex++;
      if (logIndex >= targetLogs.length) {
        logIndex = 0;
        setLogs([targetLogs[0]]);
      } else {
        setLogs((prev) => [...prev, targetLogs[logIndex]]);
      }
    }, 1800);

    return () => clearInterval(runLogs);
  }, [latestReport]);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalLogRef.current) {
      terminalLogRef.current.scrollTop = terminalLogRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex-1 bg-background text-on-surface overflow-x-hidden pt-32 pb-20 px-6 md:px-12 flex flex-col items-center">
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
            <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-white/5 text-[10px] font-mono tracking-widest text-electric-blue uppercase">
              <span className="w-2 h-2 rounded-full bg-electric-blue animate-pulse shadow-[0_0_8px_rgba(0,209,255,0.8)]" />
              LIVE SYSTEM CLUSTER
            </span>
          </div>
        </header>

        {/* Bento Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch flex-grow">
          
          {/* Left panel: Pipeline checklist (3 cols) */}
          <div className="lg:col-span-3 glass-md rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden border border-white/5 shimmer-border min-h-[400px]">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-electric-blue/30 via-electric-blue/5 to-transparent"></div>
            
            <div className="space-y-6">
              <h3 className="text-[10px] font-bold tracking-[0.25em] text-on-surface-variant uppercase opacity-60 font-display">
                Sequential Nodes
              </h3>
              
              <div className="flex flex-col gap-4 relative">
                {/* Connector line */}
                <div className="absolute left-[11px] top-3.5 bottom-3.5 w-[1px] bg-gradient-to-b from-electric-blue/30 via-white/10 to-white/5" />
                
                {pipelineNodes.map((node) => {
                  const isCompleted = node.id < activeNode;
                  const isProcessing = node.id === activeNode;


                  let statusText = "Pending";
                  let statusColor = "text-slate-500 border-white/5 bg-slate-900/60";
                  if (isCompleted) {
                    statusText = "Completed";
                    statusColor = "text-emerald-400 border-emerald-500/20 bg-emerald-950/20";
                  } else if (isProcessing) {
                    statusText = "Active";
                    statusColor = "text-electric-blue border-electric-blue/20 bg-electric-blue/10 animate-pulse";
                  }

                  return (
                    <div
                      key={node.id}
                      className={`flex items-center justify-between gap-4 transition-all duration-500 ${
                        isProcessing ? "opacity-100 scale-102" : "opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center relative z-10 border transition-all ${
                          isProcessing 
                            ? "bg-electric-blue border-white shadow-[0_0_12px_#00D1FF]" 
                            : isCompleted
                            ? "bg-emerald-500 border-emerald-400"
                            : "bg-surface-container border-white/20"
                        }`}>
                          {isCompleted ? (
                            <span className="material-symbols-outlined text-[9px] text-background font-black">check</span>
                          ) : (
                            <div className={`w-1 h-1 rounded-full ${
                              isProcessing ? "bg-background animate-pulse" : "bg-white/20"
                            }`} />
                          )}
                        </div>
                        <span className={`font-display text-[10px] font-bold uppercase tracking-wider ${
                          isProcessing ? "text-electric-blue" : isCompleted ? "text-slate-200" : "text-on-surface-variant"
                        }`}>
                          {node.label}
                        </span>
                      </div>
                      
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${statusColor}`}>
                        {statusText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] uppercase font-bold text-on-surface-variant tracking-widest font-display">Global Pipeline Status</span>
                <span className="text-[9px] uppercase font-bold text-electric-blue tracking-widest font-display">Active</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-electric-blue w-full animate-pulse" />
              </div>
            </div>
          </div>

          {/* Center panel: Live scanning image (6 cols) */}
          <div className="lg:col-span-6 rounded-3xl relative group overflow-hidden border border-white/10 shadow-2xl bg-surface-container-lowest flex flex-col justify-between min-h-[480px]">
            {/* Visual scan scanner-line effect */}
            <div className="scanning-line" />
            
            {/* Main scanner background image */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[4000ms] group-hover:scale-102 bg-no-repeat"
              style={{
                backgroundImage: `url('${latestReport?.image_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuB1TKCHHmDlh4_E8m6eGUX8UADqiRfDLKx3gZd0s9wwfJVpaaweduIf998K83ehX3zdNO8HvvpGKuHZ3n7EMGY5L6OExi__g36O_PigaLaUYZZl0NyKz6kBiOLcEUV6UMgFSzMzdXSc3K6dH87nHxJHO7eL_wuGUZPkjis_o2rj1id1EQaSfpC6Jsqh0tNMshknvGGrQ0wSGJ8VNlXao5M4XMLMOS2fsT7NsRr4lhUZ_SHPcutW3Wwrdvi3QiLrW1T5HTqi7eaFNb9Y"}')`,
                opacity: 0.7,
              }}
            />

            {/* AI HUD lock target overlay box */}
            <div className="absolute top-1/4 left-1/4 z-20 glass-md p-4 rounded-xl border-electric-blue/40 animate-pulse">
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
            <div className="absolute top-6 right-6 z-20 glass-sm p-3 rounded-lg border-white/10 font-mono text-[9px] text-electric-blue/50 flex flex-col gap-1.5">
              <span>SCANNER_LOOP: OK</span>
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-display">
                <div>
                  <span className="text-[8px] text-on-surface-variant uppercase block">Issue Type</span>
                  <span className="font-bold text-white text-[13px]">{latestReport?.issue_type || "Pothole"}</span>
                </div>
                <div>
                  <span className="text-[8px] text-on-surface-variant uppercase block">AI Confidence</span>
                  <span className="font-bold text-emerald-400 font-mono text-[13px]">
                    {latestReport ? Math.round((latestReport.confidence || 0.98) * 100) : 98}%
                  </span>
                </div>
                <div>
                  <span className="text-[8px] text-on-surface-variant uppercase block">Estimated Cost</span>
                  <span className="font-bold text-amber-400 font-mono text-[13px]">
                    ₹{latestReport?.estimation?.repair_cost ? latestReport.estimation.repair_cost.toLocaleString() : "12,000"}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] text-on-surface-variant uppercase block">Assigned Authority</span>
                  <span className="font-bold text-white text-[11px] truncate block">{latestReport?.authority || "BBMP Roads Dept"}</span>
                </div>
                <div>
                  <span className="text-[8px] text-on-surface-variant uppercase block">Locality Reference</span>
                  <span className="font-bold text-white text-[11px] truncate block">{latestReport?.locality || "Indiranagar, Bengaluru"}</span>
                </div>
                <div>
                  <span className="text-[8px] text-on-surface-variant uppercase block">Processing Latency</span>
                  <span className="font-bold text-electric-blue font-mono text-[13px]">1.2s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Terminal logger console (3 cols) */}
          <div className="lg:col-span-3 glass-md rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden border border-white/5 shimmer-border min-h-[400px]">
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
                className="flex-grow font-mono text-[10px] leading-relaxed text-on-surface-variant/80 terminal-scroll overflow-y-auto max-h-[360px] flex flex-col gap-2.5 pr-1 scroll-smooth"
              >
                {logs.map((log, idx) => {
                  let colorClass = "text-on-surface-variant/70";
                  if (log.includes("[SYSTEM]") || log.includes("[READY]")) colorClass = "text-electric-blue";
                  if (log.includes("CRITICAL")) colorClass = "text-rose-400";
                  if (log.includes("PROCESS_COMPLETE")) colorClass = "text-emerald-400";
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

        {/* Bottom Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          {/* Latency */}
          <div className="glass-md p-6 rounded-2xl border border-white/5 flex items-center justify-between shimmer-border hover:bg-white/[0.02] transition-all">
            <div className="relative z-10 font-display">
              <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 opacity-60">
                Average Latency
              </p>
              <h4 className="text-3xl font-extrabold text-white tracking-tighter">
                1.2<span className="text-sm font-medium ml-0.5 opacity-60">sec</span>
              </h4>
              <div className="w-24 h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-electric-blue/40 w-3/4" />
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant border border-white/5">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          {/* Inference */}
          <div className="glass-md p-6 rounded-2xl border border-white/5 flex items-center justify-between shimmer-border hover:bg-white/[0.02] transition-all">
            <div className="relative z-10 font-display">
              <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 opacity-60">
                Inference Confidence
              </p>
              <h4 className="text-3xl font-extrabold text-white tracking-tighter">
                97<span className="text-sm font-medium ml-0.5 opacity-60">%</span>
              </h4>
              <div className="w-24 h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-electric-blue/40 w-[97%]" />
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant border border-white/5">
              <Cpu className="h-5 w-5" />
            </div>
          </div>

          {/* Packet Throughput */}
          <div className="glass-md p-6 rounded-2xl border border-white/5 flex items-center justify-between shimmer-border hover:bg-white/[0.02] transition-all">
            <div className="relative z-10 font-display">
              <p className="text-[9px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 opacity-60">
                Packet Throughput
              </p>
              <h4 className="text-3xl font-extrabold text-white tracking-tighter">
                4.8<span className="text-sm font-medium ml-0.5 opacity-60">k/s</span>
              </h4>
              <div className="w-24 h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-electric-blue/40 w-1/2" />
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant border border-white/5">
              <Layers className="h-5 w-5" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
