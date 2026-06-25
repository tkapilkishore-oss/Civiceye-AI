"use client";

import { useState } from "react";
import { WardStats } from "@/types";
import { Award, ChevronDown, ChevronUp, Droplets, Lightbulb, Trash2, Milestone } from "lucide-react";

import { WARDS_LIST } from "@/constants/config";

const INITIAL_WARD_STATS: WardStats[] = [
  {
    ward_id: "w1",
    ward_name: WARDS_LIST[0],
    road_score: 95,
    water_score: 96,
    lighting_score: 94,
    waste_score: 95,
    overall_score: 95,
    report_count: 3,
  },
  {
    ward_id: "w2",
    ward_name: WARDS_LIST[1],
    road_score: 87,
    water_score: 89,
    lighting_score: 90,
    waste_score: 86,
    overall_score: 88,
    report_count: 5,
  },
  {
    ward_id: "w3",
    ward_name: WARDS_LIST[2],
    road_score: 80,
    water_score: 82,
    lighting_score: 83,
    waste_score: 79,
    overall_score: 81,
    report_count: 8,
  },
  {
    ward_id: "w4",
    ward_name: WARDS_LIST[3],
    road_score: 75,
    water_score: 77,
    lighting_score: 78,
    waste_score: 74,
    overall_score: 76,
    report_count: 4,
  },
  {
    ward_id: "w5",
    ward_name: WARDS_LIST[4],
    road_score: 70,
    water_score: 72,
    lighting_score: 73,
    waste_score: 69,
    overall_score: 71,
    report_count: 12,
  },
  {
    ward_id: "w6",
    ward_name: WARDS_LIST[5],
    road_score: 91,
    water_score: 93,
    lighting_score: 94,
    waste_score: 90,
    overall_score: 92,
    report_count: 7,
  },
  {
    ward_id: "w7",
    ward_name: WARDS_LIST[6],
    road_score: 83,
    water_score: 85,
    lighting_score: 86,
    waste_score: 82,
    overall_score: 84,
    report_count: 5,
  },
  {
    ward_id: "w8",
    ward_name: WARDS_LIST[7],
    road_score: 70,
    water_score: 70,
    lighting_score: 70,
    waste_score: 70,
    overall_score: 70,
    report_count: 0,
  },
];

interface WardScoresProps {
  reports?: any[];
}

export default function WardScores({ reports = [] }: WardScoresProps) {
  const getDeduction = (severity: string) => {
    const s = (severity || "").toLowerCase();
    if (s === "critical") return 15;
    if (s === "high") return 10;
    if (s === "medium") return 5;
    if (s === "low") return 2;
    return 5;
  };

  const wards = INITIAL_WARD_STATS.map((w) => {
    const wardReports = reports.filter((r) => r.ward === w.ward_name);
    
    let roadDeduction = 0;
    let waterDeduction = 0;
    let lightingDeduction = 0;
    let wasteDeduction = 0;

    wardReports.forEach((r) => {
      const ded = getDeduction(r.severity || r.priority);
      const cat = (r.issue_type || "").toLowerCase();
      if (cat.includes("pothole") || cat.includes("road")) {
        roadDeduction += ded;
      } else if (cat.includes("water") || cat.includes("leak") || cat.includes("drain")) {
        waterDeduction += ded;
      } else if (cat.includes("light") || cat.includes("bulb")) {
        lightingDeduction += ded;
      } else if (cat.includes("garbage") || cat.includes("waste") || cat.includes("trash")) {
        wasteDeduction += ded;
      } else {
        roadDeduction += ded / 2;
      }
    });

    const road_score = Math.max(10, w.road_score - roadDeduction);
    const water_score = Math.max(10, w.water_score - waterDeduction);
    const lighting_score = Math.max(10, w.lighting_score - lightingDeduction);
    const waste_score = Math.max(10, w.waste_score - wasteDeduction);
    const overall_score = Math.round((road_score + water_score + lighting_score + waste_score) / 4);

    return {
      ...w,
      road_score,
      water_score,
      lighting_score,
      waste_score,
      overall_score,
      report_count: w.report_count + wardReports.length,
    };
  });

  const [expandedWard, setExpandedWard] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedWard(expandedWard === id ? null : id);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 60) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500 shadow-emerald-500/30";
    if (score >= 60) return "bg-amber-500 shadow-amber-500/30";
    return "bg-rose-500 shadow-rose-500/30";
  };

  const sortedWards = [...wards]
    .filter(w => !w.ward_name.toLowerCase().includes("unknown"))
    .sort((a, b) => b.overall_score - a.overall_score);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-violet-400" />
          <h2 className="text-xl font-bold tracking-tight text-white">Civic Health Leaderboard</h2>
        </div>
        <span className="text-xs font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
          {WARDS_LIST.length} Wards Monitored
        </span>
      </div>

      <p className="text-sm text-slate-400 mb-6">
        Dynamic health index dynamically updated via incoming reports. Wards are ranked by overall civic service performance.
      </p>

      <div className="space-y-3">
        {sortedWards.map((ward, index) => {
          const isExpanded = expandedWard === ward.ward_id;
          const scoreBadgeClass = getScoreColor(ward.overall_score);
          const rankNum = index + 1;

          return (
            <div
              key={ward.ward_id}
              className={`rounded-xl border transition-all duration-300 ${
                isExpanded
                  ? "border-violet-500/50 bg-slate-900/80 shadow-md shadow-violet-500/5"
                  : "border-slate-800/60 bg-slate-950/20 hover:border-slate-700 hover:bg-slate-900/20"
              }`}
            >
              <button
                onClick={() => toggleExpand(ward.ward_id)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-300">
                    #{rankNum}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-200 text-sm md:text-base">
                      {ward.ward_name}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {ward.report_count} active issue reports
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-12 items-center justify-center rounded-lg border font-mono font-bold text-base ${scoreBadgeClass}`}>
                    {ward.overall_score}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-5 pt-2 border-t border-slate-800/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Road Score */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Milestone className="h-3.5 w-3.5 text-blue-400" />
                        Road Quality
                      </span>
                      <span className="text-slate-300">{ward.road_score}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                          ward.road_score
                        )}`}
                        style={{ width: `${ward.road_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Water Score */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                        Water Supply
                      </span>
                      <span className="text-slate-300">{ward.water_score}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                          ward.water_score
                        )}`}
                        style={{ width: `${ward.water_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Lighting Score */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                        Street Lighting
                      </span>
                      <span className="text-slate-300">{ward.lighting_score}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                          ward.lighting_score
                        )}`}
                        style={{ width: `${ward.lighting_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Waste Score */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                        Sanitation & Waste
                      </span>
                      <span className="text-slate-300">{ward.waste_score}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                          ward.waste_score
                        )}`}
                        style={{ width: `${ward.waste_score}%` }}
                      />
                    </div>
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
