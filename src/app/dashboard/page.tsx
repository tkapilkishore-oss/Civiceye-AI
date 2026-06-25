"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle,
  Timer,
  Users,
  MapPin,
  Sliders,
  ShieldAlert,
  Search,
  Wrench,
  ChevronRight,
  AlertTriangle,
  Bot,
  Sparkles,
  Send,
  X,
  LineChart,
  IndianRupee
} from "lucide-react";
import WardScores from "@/components/WardScores";
import { sanitizeReportsListForLocalStorage, cleanAllLocalStorageReports } from "@/lib/storageHelper";
import ActivityFeed from "@/components/ActivityFeed";
import { MAP_CONFIG, WARDS_LIST } from "@/constants/config";
import dynamicImport from "next/dynamic";

const InteractiveMap = dynamicImport(() => import("@/components/InteractiveMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-900/60 animate-pulse flex items-center justify-center text-xs text-on-surface-variant font-mono">
      LOADING MAP MODULE...
    </div>
  ),
});

export default function DashboardPage() {
  const router = useRouter();

  // Navigation state
  const [activeTab, setActiveTab] = useState<"overview" | "operations" | "copilot">("overview");

  // Animating values state
  const [healthScore, setHealthScore] = useState(82);
  const [totalReports, setTotalReports] = useState(14);
  const [resolvedCases, setResolvedCases] = useState(2);
  const [avgResponseM, setAvgResponseM] = useState(14);
  const [avgResponseS, setAvgResponseS] = useState(20);
  const [activeAgents, setActiveAgents] = useState(170);
  const [mapZoom, setMapZoom] = useState(MAP_CONFIG.defaultZoom);
  const [mapCenter, setMapCenter] = useState<[number, number]>(MAP_CONFIG.defaultCenter);

  // Core Data
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // Filters & Search for Operations Console
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWard, setSelectedWard] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedSeverity, setSelectedSeverity] = useState("All");

  // Selected Report for Drawer
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Drawer Form State
  const [assignedEngineer, setAssignedEngineer] = useState("");
  const [assignedDepartment, setAssignedDepartment] = useState("");
  const [reportPriority, setReportPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [reportDeadline, setReportDeadline] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [reportStatus, setReportStatus] = useState<string>("Investigating");
  const [savingDrawer, setSavingDrawer] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Copilot Tab state
  const [copilotBrief, setCopilotBrief] = useState<any>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);

  // Copilot Chat state
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotMessages, setCopilotMessages] = useState<any[]>([
    {
      role: "model",
      content: "Welcome, Operations Director. I am your Municipal Intelligence Copilot. Ask me questions about today's dispatches, overloaded departments, cost estimates, or active safety risks."
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Toast notifier helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch reports from API endpoint
  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setReportsList(data);
        // Sync to client local storage for redundancy
        localStorage.setItem("reports_list", JSON.stringify(sanitizeReportsListForLocalStorage(data)));
      } else {
        loadFromLocalStorage();
      }
    } catch (err) {
      console.error("Failed to fetch reports from server:", err);
      loadFromLocalStorage();
    } finally {
      setLoadingReports(false);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const localListRaw = localStorage.getItem("reports_list");
      if (localListRaw) {
        setReportsList(JSON.parse(localListRaw));
      } else {
        setReportsList([]);
      }
    } catch (e) {
      console.error("Local storage load error:", e);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    cleanAllLocalStorageReports();
    fetchReports();
  }, []);

  // Fetch Copilot Brief when switching to Copilot tab
  useEffect(() => {
    if (activeTab === "copilot" && !copilotBrief) {
      setLoadingBrief(true);
      fetch("/api/municipal-copilot")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Copilot response issue");
        })
        .then((data) => {
          setCopilotBrief(data);
          setLoadingBrief(false);
        })
        .catch((err) => {
          console.error("Failed to fetch copilot summary:", err);
          setLoadingBrief(false);
        });
    }
  }, [activeTab, reportsList]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [copilotMessages, chatLoading]);

  // Recalculate metrics on reports list updates
  useEffect(() => {
    if (reportsList.length === 0) return;

    const INITIAL_WARD_STATS = [
      { overall_score: 95 },
      { overall_score: 88 },
      { overall_score: 81 },
      { overall_score: 76 },
      { overall_score: 71 },
      { overall_score: 92 },
      { overall_score: 84 },
      { overall_score: 70 },
    ];

    const getDeduction = (severity: string) => {
      const s = (severity || "").toLowerCase();
      if (s === "critical") return 15;
      if (s === "high") return 10;
      if (s === "medium") return 5;
      if (s === "low") return 2;
      return 5;
    };

    // Calculate dynamic overall score
    const computedWardScores = INITIAL_WARD_STATS.map((w, idx) => {
      const name = WARDS_LIST[idx];
      const wardReports = reportsList.filter((r) => r.ward === name);
      
      let roadD = 0, waterD = 0, lightD = 0, wasteD = 0;
      wardReports.forEach((r) => {
        const ded = getDeduction(r.severity || r.priority);
        const cat = (r.issue_type || "").toLowerCase();
        if (cat.includes("pothole") || cat.includes("road")) roadD += ded;
        else if (cat.includes("water") || cat.includes("leak") || cat.includes("drain")) waterD += ded;
        else if (cat.includes("light") || cat.includes("bulb")) lightD += ded;
        else if (cat.includes("garbage") || cat.includes("waste") || cat.includes("trash")) wasteD += ded;
        else roadD += ded / 2;
      });

      const base = w.overall_score;
      const road = Math.max(10, base - roadD);
      const water = Math.max(10, base - waterD);
      const light = Math.max(10, base - lightD);
      const waste = Math.max(10, base - wasteD);
      return Math.round((road + water + light + waste) / 4);
    });

    const activeWards = computedWardScores.filter((_, idx) => !WARDS_LIST[idx].toLowerCase().includes("unknown"));
    const avgHealth = Math.round(activeWards.reduce((a, b) => a + b, 0) / activeWards.length);

    
    // Trigger animation
    const targetTotal = reportsList.length;
    const targetResolved = reportsList.filter(r => r.status === "Completed" || r.status === "Resolved" || r.status === "Repair Started").length;
    const targetAvgM = 14;
    const targetAvgS = 20;
    const targetAgents = 156 + reportsList.length;

    const duration = 800;
    const steps = 30;
    const stepTime = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setHealthScore(Math.floor(progress * avgHealth));
      setTotalReports(Math.floor(progress * targetTotal));
      setResolvedCases(Math.floor(progress * targetResolved));
      setAvgResponseM(Math.floor(progress * targetAvgM));
      setAvgResponseS(Math.floor(progress * targetAvgS));
      setActiveAgents(Math.floor(progress * targetAgents));

      if (currentStep >= steps) {
        clearInterval(interval);
        setHealthScore(avgHealth);
        setTotalReports(targetTotal);
        setResolvedCases(targetResolved);
        setAvgResponseM(targetAvgM);
        setAvgResponseS(targetAvgS);
        setActiveAgents(targetAgents);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [reportsList]);

  // Circular gauge offset (circumference = 283)
  const strokeOffset = 283 - (healthScore / 100) * 283;



  // Operations Console Filter & Search logic
  const filteredReports = reportsList.filter((r) => {
    const matchesSearch =
      (r.locality || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.issue_type || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.id || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesWard = selectedWard === "All" || r.ward === selectedWard;
    const matchesCategory = selectedCategory === "All" || r.issue_type === selectedCategory;
    const matchesStatus = selectedStatus === "All" || r.status === selectedStatus;
    const matchesSeverity = selectedSeverity === "All" || (r.severity || r.priority) === selectedSeverity;

    return matchesSearch && matchesWard && matchesCategory && matchesStatus && matchesSeverity;
  });

  // Open Drawer for a specific report
  const openDrawer = (report: any) => {
    setSelectedReport(report);
    setAssignedEngineer(report.assigned_engineer || "");
    setAssignedDepartment(report.assigned_department || "");
    setReportPriority(report.priority || report.severity || "Medium");
    setReportDeadline(report.deadline || "");
    setInternalNotes(report.internal_notes || "");
    setReportStatus(report.status || "Investigating");
    setIsDrawerOpen(true);
  };

  // Submit Work Order Drawer Updates
  const handleSaveWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    setSavingDrawer(true);

    const updates = {
      assigned_engineer: assignedEngineer,
      assigned_department: assignedDepartment,
      priority: reportPriority,
      severity: reportPriority,
      deadline: reportDeadline,
      internal_notes: internalNotes,
      status: reportStatus,
    };

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedReport.id, ...updates }),
      });

      if (res.ok) {
        triggerToast("Work order updated successfully.");
        setIsDrawerOpen(false);
        // Refresh full list from DB
        await fetchReports();
      } else {
        triggerToast("Failed to save updates to the server database.");
      }
    } catch (err) {
      console.error("Save work order error:", err);
      triggerToast("Network error occurred during save.");
    } finally {
      setSavingDrawer(false);
    }
  };

  // Quick Action Buttons in Drawer
  const handleQuickStatusChange = async (newStatus: string) => {
    if (!selectedReport) return;
    setSavingDrawer(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedReport.id, status: newStatus }),
      });

      if (res.ok) {
        setReportStatus(newStatus);
        triggerToast(`Ticket status set to ${newStatus.toUpperCase()}`);
        await fetchReports();
      } else {
        triggerToast("Failed to update status.");
      }
    } catch {
      triggerToast("Network error.");
    } finally {
      setSavingDrawer(false);
    }
  };

  // Copilot Chat Submit
  const handleSendCopilotQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotInput.trim() || chatLoading) return;

    const userQuery = copilotInput.trim();
    setCopilotMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setCopilotInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/municipal-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery }),
      });

      if (res.ok) {
        const data = await res.json();
        setCopilotMessages((prev) => [...prev, { role: "model", content: data.content }]);
      } else {
        setCopilotMessages((prev) => [
          ...prev,
          { role: "model", content: "Error contacting municipal copilot core engine. Please check connections." }
        ]);
      }
    } catch {
      setCopilotMessages((prev) => [
        ...prev,
        { role: "model", content: "Failed to connect to the intelligence system." }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev) {
      case "Critical":
        return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      case "High":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "Medium":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Resolved":
      case "Completed":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "Repair Started":
        return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20 animate-pulse";
      case "Archived":
        return "text-slate-500 bg-slate-500/5 border-slate-500/10";
      default:
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    }
  };

  const STATUS_STAGES = [
    { status: "Submitted", label: "Incident Submitted" },
    { status: "Investigating", label: "AI Verification Completed" },
    { status: "Officer Assigned", label: "Officer Dispatch" },
    { status: "Engineer Assigned", label: "Engineer Allocated" },
    { status: "Inspection Scheduled", label: "Inspection Scheduled" },
    { status: "Repair Started", label: "Repair Operations Active" },
    { status: "Repair Completed", label: "Repair Logged Complete" },
    { status: "Resolved", label: "Resolution Confirmed" }
  ];

  const currentStageIndex = STATUS_STAGES.findIndex(stage => stage.status === reportStatus);

  return (
    <div className="flex-1 bg-background text-on-surface pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full space-y-8 relative">
      
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-10 right-10 z-50 glass-lg px-6 py-3.5 rounded-2xl border border-electric-blue/30 text-xs font-bold text-white shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="h-4.5 w-4.5 text-electric-blue animate-pulse" />
          {toastMessage}
        </div>
      )}

      {/* Header section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-6">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-none">
            Municipal Operations Hub
          </h1>
          <p className="text-on-surface-variant font-display text-sm md:text-base mt-3 max-w-2xl font-medium opacity-80 leading-relaxed">
            Real-time urban infrastructure operating system linking citizen vision alerts with municipal dispatch operations.
          </p>
        </div>
        
        {/* Tab switch navigation */}
        <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-white/5 shrink-0">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-5 py-2.5 rounded-xl font-display text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === "overview"
                ? "bg-electric-blue text-background shadow-lg shadow-electric-blue/20"
                : "text-on-surface-variant hover:text-white"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("operations")}
            className={`px-5 py-2.5 rounded-xl font-display text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === "operations"
                ? "bg-electric-blue text-background shadow-lg shadow-electric-blue/20"
                : "text-on-surface-variant hover:text-white"
            }`}
          >
            Operations Console
          </button>
          <button
            onClick={() => setActiveTab("copilot")}
            className={`px-5 py-2.5 rounded-xl font-display text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === "copilot"
                ? "bg-electric-blue text-background shadow-lg shadow-electric-blue/20"
                : "text-on-surface-variant hover:text-white"
            }`}
          >
            AI Copilot
          </button>
        </div>
      </header>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-12 animate-entrance">
          {/* Hero Metrics section */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Radial Gauge Card */}
            <div className="lg:col-span-4 glass-lg p-8 rounded-3xl shimmer-border flex flex-col items-center justify-center space-y-6 text-center shadow-2xl relative">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    className="text-white/5"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="8"
                  />
                  <circle
                    className="text-electric-blue transition-all duration-300 ease-out"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray="283"
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-5xl font-bold text-white tracking-tighter">
                    {healthScore}
                  </span>
                  <span className="font-display text-[10px] text-electric-blue uppercase tracking-widest font-bold mt-1">
                    Health Index
                  </span>
                </div>
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-white mb-2">Stable Pulse</h2>
                <p className="text-on-surface-variant text-xs max-w-xs leading-relaxed font-medium">
                  Regional infrastructure sensor nodes report a stable index loop for 14 continuous days.
                </p>
              </div>
            </div>

            {/* Bento Metrics Grid */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Total Reports */}
              <div className="glass-md p-6 rounded-2xl border border-white/5 hover:border-electric-blue/20 transition-all flex flex-col justify-between group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-electric-blue/10 flex items-center justify-center text-electric-blue shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="text-electric-blue text-[10px] font-mono font-bold flex items-center gap-1 bg-electric-blue/10 px-2 py-1 rounded">
                    +12% <TrendingUp className="h-3 w-3" />
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider block">Total Reports Mapped</span>
                  <h3 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2 tracking-tight">
                    {totalReports.toLocaleString()}
                  </h3>
                </div>
                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-electric-blue w-[75%] transition-all duration-[2000ms]" />
                </div>
              </div>

              {/* Card 2: Resolved */}
              <div className="glass-md p-6 rounded-2xl border border-white/5 hover:border-electric-blue/20 transition-all flex flex-col justify-between group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-electric-blue/10 flex items-center justify-center text-electric-blue shrink-0">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <span className="text-electric-blue text-[10px] font-mono font-bold flex items-center gap-1 bg-electric-blue/10 px-2 py-1 rounded">
                    +8% <TrendingUp className="h-3 w-3" />
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider block">Resolved Cases</span>
                  <h3 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2 tracking-tight">
                    {resolvedCases.toLocaleString()}
                  </h3>
                </div>
                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-electric-blue w-[66%] transition-all duration-[2000ms]" />
                </div>
              </div>

              {/* Card 3: Response Time */}
              <div className="glass-md p-6 rounded-2xl border border-white/5 hover:border-electric-blue/20 transition-all flex flex-col justify-between group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-electric-blue/10 flex items-center justify-center text-electric-blue shrink-0">
                    <Timer className="h-5 w-5" />
                  </div>
                  <span className="text-rose-400 text-[10px] font-mono font-bold flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded">
                    -2m <TrendingDown className="h-3 w-3" />
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider block">Average Action Time</span>
                  <h3 className="font-display text-3xl font-extrabold text-white mt-2 tracking-tight flex items-baseline">
                    {avgResponseM}<span className="text-lg font-medium ml-0.5 mr-2">m</span>
                    {avgResponseS}<span className="text-lg font-medium ml-0.5">s</span>
                  </h3>
                </div>
                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-electric-blue w-[50%] transition-all duration-[2000ms]" />
                </div>
              </div>

              {/* Card 4: Active Agents */}
              <div className="glass-md p-6 rounded-2xl border border-white/5 hover:border-electric-blue/20 transition-all flex flex-col justify-between group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-electric-blue/10 flex items-center justify-center text-electric-blue shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="text-on-surface-variant text-[10px] font-mono">Sensors Live</span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider block">Active Watchdogs</span>
                  <h3 className="font-display text-3xl md:text-4xl font-extrabold text-white mt-2 tracking-tight">
                    {activeAgents}
                  </h3>
                </div>
                <div className="mt-4 flex items-center -space-x-2 shrink-0">
                  <div className="w-7 h-7 rounded-full border border-background bg-slate-800 flex items-center justify-center text-[9px] font-bold">JD</div>
                  <div className="w-7 h-7 rounded-full border border-background bg-slate-700 flex items-center justify-center text-[9px] font-bold">AS</div>
                  <div className="w-7 h-7 rounded-full border border-background bg-slate-650 flex items-center justify-center text-[9px] font-bold">ML</div>
                  <div className="w-7 h-7 rounded-full border border-background bg-[#1F2937] flex items-center justify-center text-[8px] font-bold text-electric-blue">+153</div>
                </div>
              </div>
            </div>
          </section>

          {/* Map + Activity Feed Grid */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Map Container */}
            <div className="lg:col-span-8 glass-md rounded-3xl overflow-hidden border border-white/5 h-[560px] relative z-0">
              <InteractiveMap
                center={mapCenter}
                zoom={mapZoom}
                markers={reportsList}
              />
              
              {/* Map Header Overlay */}
              <div className="absolute top-6 left-6 z-10 pointer-events-none">
                <div className="glass-lg px-4 py-2 rounded-full flex items-center gap-2 border border-white/10 shadow-lg bg-slate-950/80 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-electric-blue animate-ping" />
                  <span className="text-white font-mono text-[10px] font-bold uppercase tracking-wider">
                    Geofence: {reportsList.filter(r => r.latitude !== undefined && r.latitude !== null).length} Active Incidents
                  </span>
                </div>
              </div>
            </div>

            {/* Live Feed Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-electric-blue uppercase tracking-wider font-display">
                  Real-Time dispatches
                </span>
                <h2 className="text-2xl font-extrabold text-white tracking-tight leading-none">
                  Live Issue Feed
                </h2>
              </div>
              <div className="max-h-[500px] overflow-y-auto pr-1 terminal-scroll">
                <ActivityFeed reports={reportsList} />
              </div>
            </div>
          </section>

          {/* Ward Scores Rank */}
          <section className="grid grid-cols-1 gap-6 pt-6 border-t border-white/5">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-electric-blue uppercase tracking-wider font-display">
                Ward Statistics
              </span>
              <h2 className="text-2xl font-extrabold text-white tracking-tight leading-none">
                Civic Health Rankings
              </h2>
            </div>
            <WardScores reports={reportsList} />
          </section>
        </div>
      )}

      {/* TAB 2: OPERATIONS CONSOLE */}
      {activeTab === "operations" && (
        <div className="space-y-6 animate-entrance">
          {/* Filters and Search Bar */}
          <div className="glass-md p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-4 items-stretch justify-between">
            {/* Search */}
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-on-surface-variant/50" />
              <input
                type="text"
                placeholder="Search by ID, locality, type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-on-surface-variant/40 outline-none focus:ring-1 focus:ring-electric-blue/30"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap gap-2.5">
              {/* Ward */}
              <div className="flex items-center bg-slate-950/40 border border-white/5 rounded-xl px-3 py-1.5">
                <MapPin className="h-3.5 w-3.5 text-electric-blue mr-1.5" />
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="bg-transparent border-none text-xs text-white outline-none cursor-pointer pr-4"
                >
                  <option value="All" className="bg-slate-900">All Wards</option>
                  {WARDS_LIST.map((w, idx) => (
                    <option key={idx} value={w} className="bg-slate-900">
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="flex items-center bg-slate-950/40 border border-white/5 rounded-xl px-3 py-1.5">
                <Sliders className="h-3.5 w-3.5 text-electric-blue mr-1.5" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent border-none text-xs text-white outline-none cursor-pointer pr-4"
                >
                  <option value="All" className="bg-slate-900">All Categories</option>
                  <option value="Pothole" className="bg-slate-900">Pothole</option>
                  <option value="Water Leakage" className="bg-slate-900">Water Leakage</option>
                  <option value="Broken Streetlight" className="bg-slate-900">Broken Streetlight</option>
                  <option value="Garbage Accumulation" className="bg-slate-900">Garbage Accumulation</option>
                </select>
              </div>

              {/* Severity */}
              <div className="flex items-center bg-slate-950/40 border border-white/5 rounded-xl px-3 py-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-electric-blue mr-1.5" />
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="bg-transparent border-none text-xs text-white outline-none cursor-pointer pr-4"
                >
                  <option value="All" className="bg-slate-900">All Severities</option>
                  <option value="Low" className="bg-slate-900">Low</option>
                  <option value="Medium" className="bg-slate-900">Medium</option>
                  <option value="High" className="bg-slate-900">High</option>
                  <option value="Critical" className="bg-slate-900">Critical</option>
                </select>
              </div>

              {/* Status */}
              <div className="flex items-center bg-slate-950/40 border border-white/5 rounded-xl px-3 py-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-electric-blue mr-1.5" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-transparent border-none text-xs text-white outline-none cursor-pointer pr-4"
                >
                  <option value="All" className="bg-slate-900">All Statuses</option>
                  <option value="Investigating" className="bg-slate-900">Investigating</option>
                  <option value="Officer Assigned" className="bg-slate-900">Officer Assigned</option>
                  <option value="Engineer Assigned" className="bg-slate-900">Engineer Assigned</option>
                  <option value="Inspection Scheduled" className="bg-slate-900">Inspection Scheduled</option>
                  <option value="Repair Started" className="bg-slate-900">Repair Started</option>
                  <option value="Repair Completed" className="bg-slate-900">Repair Completed</option>
                  <option value="Resolved" className="bg-slate-900">Resolved</option>
                  <option value="Archived" className="bg-slate-900">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="glass-md rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-900/50 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono">
                    <th className="p-4 pl-6">ID / Created</th>
                    <th className="p-4">Issue Details</th>
                    <th className="p-4">Locality & Ward</th>
                    <th className="p-4">Severity</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Assignee</th>
                    <th className="p-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {loadingReports ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-on-surface-variant font-mono">
                        <div className="h-6 w-6 rounded-full border-2 border-electric-blue/20 border-t-electric-blue animate-spin mx-auto mb-2" />
                        Awaiting server connection...
                      </td>
                    </tr>
                  ) : filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-on-surface-variant font-mono">
                        No active work tickets found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((report) => (
                      <tr
                        key={report.id}
                        className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                        onClick={() => {
                          openDrawer(report);
                          if (report.latitude && report.longitude) {
                            setMapCenter([report.latitude, report.longitude]);
                            setMapZoom(16);
                            setActiveTab("overview");
                          }
                        }}
                      >
                        <td className="p-4 pl-6 space-y-1.5 font-mono">
                          <span className="font-bold text-white block group-hover:text-electric-blue transition-colors">
                            {report.id}
                          </span>
                          <span className="text-[10px] text-on-surface-variant/80 block">
                            {report.created_at ? new Date(report.created_at).toLocaleDateString() : "Just Now"}
                          </span>
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">{report.issue_type}</span>
                            {report.supporter_count && report.supporter_count > 0 ? (
                              <span className="bg-electric-blue/10 text-electric-blue border border-electric-blue/25 text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">
                                +{report.supporter_count} Supports
                              </span>
                            ) : null}
                          </div>
                          <span className="text-on-surface-variant text-[11px] block mt-1 truncate">
                            {report.complaint_draft ? report.complaint_draft.slice(0, 75) + "..." : "No additional description."}
                          </span>
                        </td>
                        <td className="p-4 space-y-1">
                          <span className="text-slate-200 block truncate font-medium">{report.locality}</span>
                          <span className="text-[10px] text-on-surface-variant/80 block font-mono">{report.ward}</span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${getSeverityBadgeClass(report.severity || report.priority)}`}>
                            {report.severity || report.priority}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${getStatusBadgeClass(report.status)}`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="p-4 space-y-1">
                          <span className="text-slate-200 block font-semibold">
                            {report.assigned_engineer || "Unassigned"}
                          </span>
                          <span className="text-[10px] text-on-surface-variant/80 block">
                            {report.assigned_department || "No Dept"}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => openDrawer(report)}
                              className="glass-sm px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-electric-blue/10 hover:border-electric-blue/30 text-white font-bold text-[10px] uppercase tracking-wider transition-all"
                            >
                              Manage
                            </button>
                            <button
                              onClick={() => router.push(`/report/${report.id}`)}
                              className="glass-sm px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-on-surface-variant hover:text-white transition-all"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AI COPILOT & PREDICTIVE */}
      {activeTab === "copilot" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-entrance">
          
          {/* Left Column (8 cols): Executive Summary & Analytics */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Daily Summary Card */}
            <div className="glass-md p-6 rounded-3xl border border-white/5 shimmer-border space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-5.5 w-5.5 text-electric-blue animate-pulse" />
                  <h2 className="text-xl font-extrabold text-white tracking-tight">AI Operations Brief</h2>
                </div>
                <span className="text-[9px] bg-electric-blue/10 text-electric-blue border border-electric-blue/20 font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Updated: Today
                </span>
              </div>

              {loadingBrief ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 rounded-full border-2 border-electric-blue/20 border-t-electric-blue animate-spin" />
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">
                    Compiling infrastructure telemetry...
                  </span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Text */}
                  <p className="text-sm text-slate-300 leading-relaxed font-medium bg-slate-950/30 p-4 rounded-xl border border-white/5">
                    {copilotBrief?.executive_summary || "Operations telemetry compiled. Ready for municipal task assignments."}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Alerts */}
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 space-y-3">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest font-mono block">
                        Critical Incident Alerts
                      </span>
                      <ul className="space-y-2 text-xs text-slate-300">
                        {copilotBrief?.critical_alerts?.map((alert: string, idx: number) => (
                          <li key={idx} className="flex gap-2 items-start">
                            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                            <span>{alert}</span>
                          </li>
                        )) || (
                          <li className="text-on-surface-variant">No immediate warnings detected today.</li>
                        )}
                      </ul>
                    </div>

                    {/* Resources */}
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 space-y-3">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono block">
                        Resource Recommendations
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {copilotBrief?.resource_allocation || "Deploy local crews to Greenwood and Industrial Wards based on incident density limits."}
                      </p>
                    </div>
                  </div>

                  {/* Hotspot wards and Cost summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="glass-sm p-4 rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block font-mono">
                          Most Frequent Incident Category
                        </span>
                        <span className="text-sm font-bold text-white mt-1 block">
                          {copilotBrief?.frequent_issue || "Pothole / Road Quality"}
                        </span>
                      </div>
                      <Wrench className="h-6 w-6 text-electric-blue opacity-50" />
                    </div>

                    <div className="glass-sm p-4 rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block font-mono">
                          Est. Total Repair Budget
                        </span>
                        <span className="text-sm font-bold text-white mt-1 block font-mono text-emerald-400">
                          ₹{(copilotBrief?.estimated_total_cost || 48500).toLocaleString()}
                        </span>
                      </div>
                      <IndianRupee className="h-6 w-6 text-emerald-400 opacity-50" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Predictive Civic Intelligence Graphs */}
            <div className="glass-md p-6 rounded-3xl border border-white/5 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-electric-blue" />
                  Predictive Civic Intelligence
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  AI-driven deterioration projection graphs modeling expected public complaints and infrastructure depreciation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Graph 1: Deterioration Trend */}
                <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-4">
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest font-mono block">
                    Infrastructure Deterioration Rate (Without Intervention)
                  </span>
                  
                  {/* SVG line chart */}
                  <div className="h-44 w-full relative">
                    <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="gradient-line" x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%" stopColor="#00d1ff" stopOpacity="0.05" />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.3" />
                        </linearGradient>
                      </defs>
                      
                      {/* Grid Lines */}
                      <line x1="0" y1="25" x2="200" y2="25" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      <line x1="0" y1="50" x2="200" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      <line x1="0" y1="75" x2="200" y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      
                      {/* Area beneath curve */}
                      <path
                        d="M 0,85 Q 50,75 100,50 T 200,10 L 200,100 L 0,100 Z"
                        fill="url(#gradient-line)"
                      />
                      
                      {/* Glow Curve */}
                      <path
                        d="M 0,85 Q 50,75 100,50 T 200,10"
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    
                    <div className="absolute top-2 right-2 text-[9px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded font-bold font-mono">
                      High Deterioration Warning
                    </div>
                  </div>

                  <div className="flex justify-between text-[9px] font-mono text-on-surface-variant/80">
                    <span>Jun 2026</span>
                    <span>Sep 2026</span>
                    <span>Dec 2026</span>
                  </div>
                </div>

                {/* Graph 2: Ticket Growth projections */}
                <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-4">
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest font-mono block">
                    Projected Ticket Inflow vs Repair Capacity
                  </span>

                  {/* SVG Bar Chart */}
                  <div className="h-44 w-full relative">
                    <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="0" y1="25" x2="200" y2="25" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      <line x1="0" y1="50" x2="200" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      <line x1="0" y1="75" x2="200" y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

                      {/* Ticket Inflow Bars (rose) */}
                      <rect x="20" y="55" width="10" height="35" fill="#f43f5e" rx="1" opacity="0.8" />
                      <rect x="60" y="45" width="10" height="45" fill="#f43f5e" rx="1" opacity="0.8" />
                      <rect x="100" y="30" width="10" height="60" fill="#f43f5e" rx="1" opacity="0.8" />
                      <rect x="140" y="15" width="10" height="75" fill="#f43f5e" rx="1" opacity="0.8" />

                      {/* Crew Capacity Bars (cyan) */}
                      <rect x="35" y="60" width="10" height="30" fill="#00d1ff" rx="1" opacity="0.8" />
                      <rect x="75" y="55" width="10" height="35" fill="#00d1ff" rx="1" opacity="0.8" />
                      <rect x="115" y="50" width="10" height="40" fill="#00d1ff" rx="1" opacity="0.8" />
                      <rect x="155" y="45" width="10" height="45" fill="#00d1ff" rx="1" opacity="0.8" />
                    </svg>

                    <div className="absolute top-2 right-2 flex gap-3 text-[8px] font-bold font-mono">
                      <span className="flex items-center gap-1 text-rose-400">
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-sm" /> Inflow (est.)
                      </span>
                      <span className="flex items-center gap-1 text-electric-blue">
                        <span className="w-1.5 h-1.5 bg-electric-blue rounded-sm" /> Resolution
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between text-[9px] font-mono text-on-surface-variant/80 px-2">
                    <span>Q1</span>
                    <span>Q2</span>
                    <span>Q3</span>
                    <span>Q4 (Projected)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (4 cols): AI Copilot Chat UI */}
          <div className="lg:col-span-4 glass-md rounded-3xl border border-white/5 overflow-hidden flex flex-col h-[650px] shadow-2xl relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(0,209,255,0.03),transparent_50%)] pointer-events-none" />
            
            {/* Header info */}
            <div className="p-4 bg-slate-900/70 border-b border-white/5 flex items-center gap-2">
              <Bot className="h-5 w-5 text-electric-blue" />
              <div>
                <span className="text-xs font-bold text-white block">Municipal Copilot Chat</span>
                <span className="text-[10px] text-on-surface-variant font-mono">Active Database Schema Context</span>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="flex-grow p-4 space-y-4 overflow-y-auto terminal-scroll relative z-10">
              {copilotMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 items-start ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`h-7 w-7 rounded-full border flex items-center justify-center shrink-0 ${
                    msg.role === "user"
                      ? "bg-slate-800 border-white/10 text-white"
                      : "bg-electric-blue/10 border-electric-blue/20 text-electric-blue"
                  }`}>
                    {msg.role === "user" ? <Users className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`p-3 rounded-xl text-[11px] leading-relaxed max-w-[80%] border ${
                    msg.role === "user"
                      ? "bg-electric-blue text-background border-electric-blue/15 font-semibold"
                      : "bg-slate-900/60 border-white/5 text-slate-200"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {chatLoading && (
                <div className="flex gap-3 items-start">
                  <div className="h-7 w-7 rounded-full border bg-electric-blue/10 border-electric-blue/20 text-electric-blue flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-slate-900/60 border border-white/5 p-3 rounded-xl flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-electric-blue/70 animate-bounce" style={{ animationDelay: "0s" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-electric-blue/70 animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-electric-blue/70 animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendCopilotQuery} className="p-3 bg-slate-900/30 border-t border-white/5 relative z-10">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Query active reports list..."
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  disabled={chatLoading}
                  className="w-full glass-md pl-4 pr-12 py-3 rounded-xl border border-white/5 outline-none focus:ring-1 focus:ring-electric-blue/30 text-xs text-white placeholder:text-on-surface-variant/50"
                />
                <button
                  type="submit"
                  disabled={!copilotInput.trim() || chatLoading}
                  className="absolute right-2 top-2 bg-electric-blue text-background h-8 w-8 rounded-lg flex items-center justify-center hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* WORKFLOW MANAGEMENT DRAWER OVERLAY */}
      {isDrawerOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-lg bg-slate-950/95 border-l border-white/10 h-full overflow-y-auto p-6 md:p-8 flex flex-col justify-between shadow-2xl z-10 animate-slide-in">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-white/5 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-electric-blue font-mono font-bold tracking-widest">WORK ORDER WORKFLOW</span>
                    <span className="text-[9px] font-mono text-on-surface-variant/80">ID: {selectedReport.id}</span>
                  </div>
                  <h3 className="font-display text-xl font-extrabold text-white tracking-tight">{selectedReport.issue_type}</h3>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-on-surface-variant hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Quick Details */}
              <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-900/60 p-4 rounded-xl border border-white/5">
                <div>
                  <span className="text-on-surface-variant/80 uppercase block font-mono">Location</span>
                  <span className="font-semibold text-white block mt-0.5 truncate">{selectedReport.locality}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant/80 uppercase block font-mono">Ward Zone</span>
                  <span className="font-semibold text-white block mt-0.5">{selectedReport.ward}</span>
                </div>
                <div className="mt-2.5">
                  <span className="text-on-surface-variant/80 uppercase block font-mono">Initial Classification</span>
                  <span className="font-semibold text-white block mt-0.5">AI Confidence: {(selectedReport.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="mt-2.5">
                  <span className="text-on-surface-variant/80 uppercase block font-mono">Authority Jurisdiction</span>
                  <span className="font-semibold text-white block mt-0.5 truncate">{selectedReport.authority}</span>
                </div>
              </div>

              {/* Status Stages Timeline */}
              <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-white/5">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest font-mono block">
                  Workflow Lifecycle Pipeline
                </span>
                
                {/* Inline timeline */}
                <div className="relative flex justify-between items-center px-2 py-3">
                  <div className="absolute left-6 right-6 top-[21px] h-0.5 bg-white/10 z-0" />
                  
                  {STATUS_STAGES.map((stage, idx) => {
                    const isActive = idx <= currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    
                    return (
                      <div
                        key={idx}
                        className="relative z-10 flex flex-col items-center cursor-pointer group/timeline"
                        onClick={() => handleQuickStatusChange(stage.status)}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isCurrent
                            ? "bg-electric-blue border-white shadow-[0_0_8px_rgba(0,209,255,0.6)] scale-110"
                            : isActive
                            ? "bg-emerald-500 border-background"
                            : "bg-slate-800 border-slate-700 hover:border-white"
                        }`}
                        />
                        {/* Hover Tooltip label */}
                        <div className="absolute top-full mt-2 opacity-0 pointer-events-none group-hover/timeline:opacity-100 bg-slate-900 text-[8px] font-semibold text-white px-2 py-0.5 rounded border border-white/10 whitespace-nowrap shadow-lg transition-opacity z-20">
                          {stage.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Input fields */}
              <form onSubmit={handleSaveWorkOrder} className="space-y-4">
                {/* Department assignment */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block font-mono">
                    Dispatch Department
                  </label>
                  <select
                    value={assignedDepartment}
                    onChange={(e) => setAssignedDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:ring-1 focus:ring-electric-blue/30 cursor-pointer"
                  >
                    <option value="" className="bg-slate-950">Select Division Dept...</option>
                    <option value="Roads & Highways Department" className="bg-slate-950">Roads & Highways Department</option>
                    <option value="Water Supply & Sewerage Board" className="bg-slate-950">Water Supply & Sewerage Board</option>
                    <option value="Electricity Board (Street Lighting)" className="bg-slate-950">Electricity Board (Street Lighting)</option>
                    <option value="Solid Waste Management Division" className="bg-slate-950">Solid Waste Management Division</option>
                    <option value="Park Maintenance Authority" className="bg-slate-950">Park Maintenance Authority</option>
                  </select>
                </div>

                {/* Engineer Assignment */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block font-mono">
                    Assigned Technical Engineer
                  </label>
                  <select
                    value={assignedEngineer}
                    onChange={(e) => setAssignedEngineer(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:ring-1 focus:ring-electric-blue/30 cursor-pointer"
                  >
                    <option value="" className="bg-slate-950">Select Engineer Lead...</option>
                    <option value="Engineer Sarah Connor" className="bg-slate-950">Engineer Sarah Connor</option>
                    <option value="Engineer John Doe" className="bg-slate-950">Engineer John Doe</option>
                    <option value="Engineer Tony Stark" className="bg-slate-950">Engineer Tony Stark</option>
                    <option value="Engineer Bruce Wayne" className="bg-slate-950">Engineer Bruce Wayne</option>
                    <option value="Engineer Diana Prince" className="bg-slate-950">Engineer Diana Prince</option>
                    <option value="Engineer Peter Parker" className="bg-slate-950">Engineer Peter Parker</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Priority */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block font-mono">
                      Priority Level
                    </label>
                    <select
                      value={reportPriority}
                      onChange={(e) => setReportPriority(e.target.value as any)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:ring-1 focus:ring-electric-blue/30 cursor-pointer"
                    >
                      <option value="Low" className="bg-slate-950 text-slate-400 font-semibold">Low</option>
                      <option value="Medium" className="bg-slate-950 text-blue-400 font-semibold">Medium</option>
                      <option value="High" className="bg-slate-950 text-amber-400 font-semibold">High</option>
                      <option value="Critical" className="bg-slate-950 text-rose-400 font-semibold">Critical</option>
                    </select>
                  </div>

                  {/* Deadline */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block font-mono">
                      Completion Deadline
                    </label>
                    <input
                      type="date"
                      value={reportDeadline}
                      onChange={(e) => setReportDeadline(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:ring-1 focus:ring-electric-blue/30 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Status selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block font-mono">
                    Current Status Stage
                  </label>
                  <select
                    value={reportStatus}
                    onChange={(e) => setReportStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:ring-1 focus:ring-electric-blue/30 cursor-pointer font-bold"
                  >
                    <option value="Investigating" className="bg-slate-950 font-bold">Investigating</option>
                    <option value="Officer Assigned" className="bg-slate-950 font-bold">Officer Assigned</option>
                    <option value="Engineer Assigned" className="bg-slate-950 font-bold">Engineer Assigned</option>
                    <option value="Inspection Scheduled" className="bg-slate-950 font-bold">Inspection Scheduled</option>
                    <option value="Repair Started" className="bg-slate-950 font-bold">Repair Started</option>
                    <option value="Repair Completed" className="bg-slate-950 font-bold">Repair Completed</option>
                    <option value="Resolved" className="bg-slate-950 font-bold">Resolved</option>
                    <option value="Archived" className="bg-slate-950 font-bold">Archived</option>
                  </select>
                </div>

                {/* Internal Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block font-mono">
                    Internal Operations Notes
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter dispatch notes, crew instructions, site assessment notes..."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-on-surface-variant/40 outline-none focus:ring-1 focus:ring-electric-blue/30 resize-none"
                  />
                </div>

                {/* Action CTAs */}
                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={savingDrawer}
                    className="flex-1 bg-electric-blue text-background py-3.5 rounded-xl font-display text-xs font-bold hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5"
                  >
                    {savingDrawer ? "Saving Updates..." : "Save Work Order"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStatusChange("Resolved")}
                    disabled={savingDrawer || reportStatus === "Resolved"}
                    className="glass-sm px-4 py-3.5 rounded-xl border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 font-display text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <CheckCircle className="h-4 w-4" /> Mark Resolved
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
