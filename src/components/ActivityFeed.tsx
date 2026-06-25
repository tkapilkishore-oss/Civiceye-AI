"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, MapPin, Sparkles, ArrowRight } from "lucide-react";

interface AgentLog {
  agentName: string;
  action: string;
  status: "success" | "pending" | "info";
  timestamp: string;
}

interface SimulatedReport {
  id: string;
  locality: string;
  ward: string;
  issue_type: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Completed" | "Investigating" | "Drafted";
  timestamp: string;
  imageUrl: string;
  description: string;
  logs: AgentLog[];
}

const MOCK_REPORTS: SimulatedReport[] = [
  {
    id: "rep-001",
    locality: "High Street Market",
    ward: "Ward 3 - Indiranagar & Domlur",
    issue_type: "Garbage Accumulation",
    severity: "High",
    status: "Completed",
    timestamp: "2 mins ago",
    description: "Huge pile of trash blocked the pedestrian crossing.",
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=400",
    logs: [
      { agentName: "Vision Agent", action: "Detected Garbage Accumulation at 91% confidence.", status: "success", timestamp: "2m ago" },
      { agentName: "Geo Agent", action: "Matched location coordinates to Ward 3 - Indiranagar & Domlur.", status: "success", timestamp: "2m ago" },
      { agentName: "Duplicate Agent", action: "No active report matches found in 200m buffer.", status: "success", timestamp: "1m ago" },
      { agentName: "Priority Agent", action: "Determined Priority as HIGH based on volume & crossing blockage.", status: "success", timestamp: "1m ago" },
      { agentName: "Authority Agent", action: "Assigned report to Solid Waste Management Authority.", status: "success", timestamp: "1m ago" },
      { agentName: "Complaint Agent", action: "Drafted formal complaint & synced report ID to Firestore.", status: "success", timestamp: "30s ago" }
    ]
  },
  {
    id: "rep-002",
    locality: "Vasanth Lane near Park",
    ward: "Ward 1 - Hebbal & Vidyaranyapura",
    issue_type: "Water Leakage",
    severity: "Critical",
    status: "Completed",
    timestamp: "15 mins ago",
    description: "Main line rupture. Water shooting 3 feet high in the air.",
    imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=400",
    logs: [
      { agentName: "Vision Agent", action: "Detected Water Leakage at 89% confidence.", status: "success", timestamp: "15m ago" },
      { agentName: "Geo Agent", action: "Located at Vasanth Lane, mapped to Ward 1 - Hebbal & Vidyaranyapura.", status: "success", timestamp: "15m ago" },
      { agentName: "Duplicate Agent", action: "Identified previous report w1-004 nearby (resolved). Creating new entry.", status: "success", timestamp: "14m ago" },
      { agentName: "Priority Agent", action: "Flagged CRITICAL priority due to potential road erosion risk.", status: "success", timestamp: "14m ago" },
      { agentName: "Authority Agent", action: "Dispatched to Water Supply & Sewerage Board.", status: "success", timestamp: "13m ago" },
      { agentName: "Complaint Agent", action: "Complaint compiled and saved in Firestore. Notification queue updated.", status: "success", timestamp: "12m ago" }
    ]
  },
  {
    id: "rep-003",
    locality: "Industrial Circle",
    ward: "Ward 5 - Peenya Industrial Zone",
    issue_type: "Broken Streetlight",
    severity: "Medium",
    status: "Investigating",
    timestamp: "Just now",
    description: "Streetlight flickering and sparked once.",
    imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=400",
    logs: [
      { agentName: "Vision Agent", action: "Detected Broken Streetlight (flickering pattern) at 97% confidence.", status: "success", timestamp: "Just now" },
      { agentName: "Geo Agent", action: "Located coordinates, mapped to Ward 5 - Peenya Industrial Zone.", status: "success", timestamp: "Just now" },
      { agentName: "Duplicate Agent", action: "Scanning repository for similar reports in coordinates...", status: "pending", timestamp: "Just now" },
      { agentName: "Priority Agent", action: "Awaiting duplicate scanning for priority setting...", status: "info", timestamp: "Just now" }
    ]
  }
];

interface ActivityFeedProps {
  reports?: any[];
}

export default function ActivityFeed({ reports: dbReports = [] }: ActivityFeedProps) {
  const router = useRouter();
  const mapDbReportToSimulated = (dbReport: any): SimulatedReport => {
    const logs: AgentLog[] = [
      {
        agentName: "Vision Agent",
        action: `Detected ${dbReport.issue_type} at ${(dbReport.confidence * 100).toFixed(0)}% confidence.`,
        status: "success",
        timestamp: "Just now",
      },
      {
        agentName: "Geo Agent",
        action: `Mapped coordinates to ${dbReport.ward}.`,
        status: "success",
        timestamp: "Just now",
      },
      {
        agentName: "Duplicate Agent",
        action: "No active duplicates found in 200m buffer.",
        status: "success",
        timestamp: "Just now",
      },
      {
        agentName: "Priority Agent",
        action: `Set priority to ${(dbReport.priority || dbReport.severity).toUpperCase()} based on risk criteria.`,
        status: "success",
        timestamp: "Just now",
      },
      {
        agentName: "Authority Agent",
        action: `Assigned to ${dbReport.authority || "Municipal Division"}.`,
        status: "success",
        timestamp: "Just now",
      },
      {
        agentName: "Complaint Agent",
        action: "Generated complaint draft and synced records.",
        status: "success",
        timestamp: "Just now",
      },
    ];

    let friendlyTime = "Just now";
    if (dbReport.created_at) {
      try {
        const diffMs = new Date().getTime() - new Date(dbReport.created_at).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) {
          friendlyTime = "Just now";
        } else if (diffMins === 1) {
          friendlyTime = "1 min ago";
        } else if (diffMins < 60) {
          friendlyTime = `${diffMins} mins ago`;
        } else {
          const diffHrs = Math.floor(diffMins / 60);
          friendlyTime = `${diffHrs} ${diffHrs === 1 ? "hour" : "hours"} ago`;
        }
      } catch {
        // Ignore
      }
    }

    let desc = "Infrastructure defect reported.";
    if (dbReport.follow_up_answers && dbReport.follow_up_answers.length > 0) {
      desc = dbReport.follow_up_answers.map((ans: any) => `${ans.question}: ${ans.answer}`).join(" | ");
    }

    return {
      id: dbReport.id,
      locality: dbReport.locality || "Unknown Locality",
      ward: dbReport.ward || "Unknown Ward",
      issue_type: dbReport.issue_type || "Pothole",
      severity: dbReport.severity || "Medium",
      status: dbReport.status || "Investigating",
      timestamp: friendlyTime,
      imageUrl: dbReport.image_url || "",
      description: desc,
      logs,
    };
  };

  const dynamicReports = dbReports.map(mapDbReportToSimulated);
  const reports = [
    ...dynamicReports,
    ...MOCK_REPORTS.filter((mock) => !dynamicReports.some((dyn) => dyn.id === mock.id))
  ];

  const [expandedId, setExpandedId] = useState<string | null>(
    reports.length > 0 ? reports[0].id : null
  );
  const [newLogTicker, setNewLogTicker] = useState<string>("");

  useEffect(() => {
    // Simulating a live ticker of logs to make it feel responsive and alive
    const tickerMessages = [
      "Duplicate Agent scanned active area in Ward 2 - 0 duplicates.",
      "Geo Agent geolocated report coordinates to Greenwood.",
      "Priority Agent adjusted priority of Greenwood pothole to Critical.",
      "Complaint Agent generated PDF notice for Ward 3.",
    ];

    let count = 0;
    const interval = setInterval(() => {
      setNewLogTicker(tickerMessages[count % tickerMessages.length]);
      count++;
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "Critical":
        return "bg-rose-950 text-rose-400 border-rose-500/30";
      case "High":
        return "bg-amber-950 text-amber-400 border-amber-500/30";
      case "Medium":
        return "bg-blue-950 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-900 text-slate-400 border-slate-700/50";
    }
  };

  const getAgentColor = (name: string) => {
    switch (name) {
      case "Vision Agent": return "text-purple-400 border-purple-500/20 bg-purple-500/5";
      case "Geo Agent": return "text-cyan-400 border-cyan-500/20 bg-cyan-500/5";
      case "Duplicate Agent": return "text-amber-400 border-amber-500/20 bg-amber-500/5";
      case "Priority Agent": return "text-rose-400 border-rose-500/20 bg-rose-500/5";
      case "Authority Agent": return "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
      case "Complaint Agent": return "text-blue-400 border-blue-500/20 bg-blue-500/5";
      default: return "text-slate-400 border-slate-500/20 bg-slate-500/5";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md" id="feed">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-cyan-400 animate-pulse" />
          <h2 className="text-xl font-bold tracking-tight text-white">Agent Activity Feed</h2>
        </div>
        {newLogTicker && (
          <div className="flex items-center gap-1.5 text-xs text-cyan-400/90 bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-500/20 max-w-sm overflow-hidden animate-pulse">
            <Sparkles className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">Active: {newLogTicker}</span>
          </div>
        )}
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.map((report) => {
          const isExpanded = expandedId === report.id;

          return (
            <div
              key={report.id}
              className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                isExpanded
                  ? "border-cyan-500/40 bg-slate-950/60 shadow-lg shadow-cyan-500/5"
                  : "border-slate-800/80 bg-slate-950/20 hover:border-slate-700/80 hover:bg-slate-900/10"
              }`}
            >
              {/* Summary Card clickable */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : report.id)}
                className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="relative h-12 w-12 rounded-lg bg-slate-800 border border-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {/* Simulated image placeholder */}
                    <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-xs font-semibold text-slate-500">
                      {report.issue_type[0]}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-200 text-sm">{report.issue_type}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getSeverityBadge(report.severity)}`}>
                        {report.severity}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span>{report.locality}</span>
                      <span className="mx-1">•</span>
                      <span>{report.ward}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:self-center self-end">
                  <span className="text-xs text-slate-500">{report.timestamp}</span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                      report.status === "Completed"
                        ? "text-emerald-400 bg-emerald-950/20 border-emerald-500/20"
                        : report.status === "Drafted"
                        ? "text-blue-400 bg-blue-950/20 border-blue-500/20"
                        : "text-amber-400 bg-amber-950/20 border-amber-500/20"
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
              </div>

              {/* Expansion Details */}
              {isExpanded && (
                <div className="px-4 pb-5 pt-3 border-t border-slate-800 bg-slate-950/30">
                  <div className="mb-4">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Citizen Description
                    </span>
                    <p className="text-sm text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      &quot;{report.description}&quot;
                    </p>
                  </div>

                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Multi-Agent Synthesis Logs
                  </span>

                  <div className="relative border-l border-slate-800 pl-4 ml-2.5 space-y-4">
                    {report.logs.map((log, lIdx) => (
                      <div key={lIdx} className="relative">
                        {/* Dot marker */}
                        <div
                          className={`absolute -left-[21.5px] top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-slate-950 flex items-center justify-center ${
                            log.status === "success"
                              ? "border-emerald-500"
                              : log.status === "pending"
                              ? "border-cyan-500 animate-pulse"
                              : "border-slate-600"
                          }`}
                        >
                          {log.status === "success" && (
                            <div className="h-1 w-1 rounded-full bg-emerald-500" />
                          )}
                        </div>

                        {/* Log Item */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold tracking-wide uppercase font-mono ${getAgentColor(log.agentName)}`}>
                              {log.agentName}
                            </span>
                            <span className="text-xs text-slate-300 font-medium">
                              {log.action}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 self-end sm:self-center font-mono">
                            {log.timestamp}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-800/60">
                    <div>
                      {report.status === "Completed" ? (
                        <div className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5 w-fit font-semibold">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Blueprint compiled. Verified & ready.
                        </div>
                      ) : report.status === "Drafted" ? (
                        <div className="text-xs text-blue-400 bg-blue-950/20 border border-blue-500/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5 w-fit font-semibold">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Draft prepared. Routing to board.
                        </div>
                      ) : (
                        <div className="text-xs text-cyan-400 bg-cyan-950/20 border border-cyan-500/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5 w-fit font-semibold">
                          <Clock className="h-3.5 w-3.5 animate-pulse" />
                          Processing incident diagnostics...
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/report/${report.id}`);
                      }}
                      className="text-xs bg-electric-blue hover:brightness-110 active:scale-95 text-background px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-electric-blue/20 self-end sm:self-center"
                    >
                      View Report Blueprint
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
