"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Play, Pause, FastForward, LogOut, ChevronRight, CheckCircle2, Check } from "lucide-react";
import { demoScenarios, DemoScenario } from "@/constants/demoScenarios";
import { safeSetLocalStorageItem } from "@/lib/storageHelper";

interface DemoContextType {
  isDemoActive: boolean;
  isPaused: boolean;
  currentStep: number; // 0: Report Form, 1: AI Analysis, 2: Orchestration, 3: Details, 4: Dashboard, 5: Completed
  scenario: DemoScenario;
  reportId: string | null;
  transitionAlert: string | null;
  cursorTarget: { x: number; y: number };
  isClicking: boolean;
  startDemo: (selectedScenarioType: string) => void;
  pauseDemo: () => void;
  resumeDemo: () => void;
  skipStep: () => void;
  exitDemo: () => void;
  restartDemo: () => void;
  setStep: (step: number) => void;
  setReportId: (id: string | null) => void;
  showTransitionAlert: (message: string, duration?: number) => Promise<void>;
  moveCursorTo: (selector: string, duration?: number) => Promise<void>;
  moveCursorToCoords: (x: number, y: number, duration?: number) => Promise<void>;
  clickElement: (selector: string) => Promise<void>;
  smoothScrollTo: (element: HTMLElement, duration?: number) => Promise<void>;
  scrollIntoViewIfNeeded: (element: HTMLElement, duration?: number) => Promise<void>;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Load state from sessionStorage
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [scenario, setScenario] = useState<DemoScenario>(demoScenarios[0]);
  const [reportId, setReportIdState] = useState<string | null>(null);
  const [transitionAlert, setTransitionAlert] = useState<string | null>(null);
  const [cursorTarget, setCursorTarget] = useState({ x: 300, y: 300 });
  const [isClicking, setIsClicking] = useState(false);
  const [handbackCountdown, setHandbackCountdown] = useState(5);

  useEffect(() => {
    if (isDemoActive && currentStep === 3) {
      setHandbackCountdown(5);
      const interval = setInterval(() => {
        setHandbackCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isDemoActive, currentStep]);

  // Remaining time estimate map
  const stepTimes = [24, 12, 6, 0];
  const [timeRemaining, setTimeRemaining] = useState(24);

  useEffect(() => {
    const active = sessionStorage.getItem("demo_active") === "true";
    const paused = sessionStorage.getItem("demo_paused") === "true";
    const step = parseInt(sessionStorage.getItem("demo_step") || "0", 10);
    const scenType = sessionStorage.getItem("demo_scenario_type") || "pothole";
    const repId = sessionStorage.getItem("demo_report_id");

    const matchedScenario = demoScenarios.find(s => s.type === scenType) || demoScenarios[0];

    setIsDemoActive(active);
    setIsPaused(paused);
    setCurrentStep(step);
    setScenario(matchedScenario);
    setReportIdState(repId);
  }, []);

  useEffect(() => {
    if (isDemoActive) {
      setTimeRemaining(stepTimes[currentStep] || 0);
    }
  }, [currentStep, isDemoActive]);

  const updateSessionStorage = (key: string, val: string) => {
    sessionStorage.setItem(key, val);
  };

  const startDemo = (selectedScenarioType: string) => {
    const matched = demoScenarios.find(s => s.type === selectedScenarioType) || demoScenarios[0];
    setIsDemoActive(true);
    setIsPaused(false);
    setCurrentStep(0);
    setScenario(matched);
    setReportIdState(null);

    updateSessionStorage("demo_active", "true");
    updateSessionStorage("demo_paused", "false");
    updateSessionStorage("demo_step", "0");
    updateSessionStorage("demo_scenario_type", matched.type);
    sessionStorage.removeItem("demo_report_id");

    // Route to report page immediately
    router.push("/report");
  };

  const pauseDemo = () => {
    setIsPaused(true);
    updateSessionStorage("demo_paused", "true");
  };

  const resumeDemo = () => {
    setIsPaused(false);
    updateSessionStorage("demo_paused", "false");
  };

  const showTransitionAlert = (message: string, duration = 800) => {
    return new Promise<void>((resolve) => {
      setTransitionAlert(message);
      setTimeout(() => {
        setTransitionAlert(null);
        resolve();
      }, duration);
    });
  };

  const moveCursorTo = (selector: string, duration = 1200): Promise<void> => {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (!el) {
        resolve();
        return;
      }
      const rect = el.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;
      
      setCursorTarget({ x: targetX, y: targetY });
      
      setTimeout(() => {
        resolve();
      }, duration);
    });
  };

  const moveCursorToCoords = (x: number, y: number, duration = 1200): Promise<void> => {
    return new Promise((resolve) => {
      setCursorTarget({ x, y });
      setTimeout(() => {
        resolve();
      }, duration);
    });
  };

  const clickElement = async (selector: string) => {
    const el = document.querySelector(selector) as HTMLElement;
    if (el) {
      el.classList.add("demo-hover-glow");
      await new Promise(r => setTimeout(r, 200));
      
      setIsClicking(true);
      el.classList.add("scale-[0.97]", "transition-transform", "duration-100");
      
      setTimeout(() => {
        setIsClicking(false);
        el.classList.remove("scale-[0.97]");
      }, 250);

      await new Promise(r => setTimeout(r, 250));
    }
  };

  const smoothScrollTo = async (element: HTMLElement, duration = 1500): Promise<void> => {
    return new Promise<void>((resolve) => {
      const start = window.scrollY;
      const rect = element.getBoundingClientRect();
      const target = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2;
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        window.scrollTo(0, start + (target - start) * ease);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(step);
    });
  };

  const scrollIntoViewIfNeeded = async (element: HTMLElement, duration = 1200): Promise<void> => {
    return new Promise<void>((resolve) => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      
      const buffer = 40; // 40px comfortable buffer
      const isVisible = rect.top >= buffer && rect.bottom <= viewportHeight - buffer;
      
      if (isVisible) {
        resolve();
        return;
      }
      
      const start = window.scrollY;
      const targetY = rect.top + window.scrollY - (viewportHeight - rect.height) / 2;
      
      const startTime = performance.now();
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        window.scrollTo(0, start + (targetY - start) * ease);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setTimeout(() => {
            resolve();
          }, 500);
        }
      };

      requestAnimationFrame(step);
    });
  };

  const skipStep = async () => {
    if (currentStep === 0) {
      const targetId = reportId || "rep_demo_skip";
      await showTransitionAlert("Skipping to Generated Report...");
      setStep(1);
      router.push(`/report/${targetId}`);
    } else if (currentStep === 1) {
      const targetId = reportId || "rep_demo_skip";
      await showTransitionAlert("Skipping to AI Orchestration...");
      setStep(2);
      router.push(`/orchestration?reportId=${targetId}`);
    } else if (currentStep === 2) {
      setStep(3);
    }
  };

  const cleanupDemoData = () => {
    try {
      // Scrub local storage of any demo reports
      const reportsListRaw = localStorage.getItem("reports_list");
      if (reportsListRaw) {
        const reportsList = JSON.parse(reportsListRaw);
        const filteredList = reportsList.filter((r: any) => !r.is_demo);
        safeSetLocalStorageItem("reports_list", JSON.stringify(filteredList));
      }
      
      // Clean individual report cache keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("report_")) {
          const reportRaw = localStorage.getItem(key);
          if (reportRaw) {
            const report = JSON.parse(reportRaw);
            if (report.is_demo) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to clean up demo local storage data:", e);
    }
  };

  const exitDemo = () => {
    setIsDemoActive(false);
    updateSessionStorage("demo_active", "false");
    cleanupDemoData();
    router.push("/");
  };

  const restartDemo = () => {
    startDemo(scenario.type);
  };

  const setStep = (step: number) => {
    setCurrentStep(step);
    updateSessionStorage("demo_step", step.toString());
  };

  const setReportId = (id: string | null) => {
    setReportIdState(id);
    if (id) {
      updateSessionStorage("demo_report_id", id);
    } else {
      sessionStorage.removeItem("demo_report_id");
    }
  };

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDemoActive) {
        exitDemo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDemoActive, scenario]);

  // Dynamic estimate countdown during paused states or active steps
  useEffect(() => {
    let interval: any;
    if (isDemoActive && !isPaused && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isDemoActive, isPaused, timeRemaining]);

  const stepsList = [
    { label: "Citizen Report", stepNum: 0 },
    { label: "AI Analysis", stepNum: 1 },
    { label: "AI Orchestration", stepNum: 2 }
  ];

  return (
    <DemoContext.Provider
      value={{
        isDemoActive,
        isPaused,
        currentStep,
        scenario,
        reportId,
        transitionAlert,
        cursorTarget,
        isClicking,
        startDemo,
        pauseDemo,
        resumeDemo,
        skipStep,
        exitDemo,
        restartDemo,
        setStep,
        setReportId,
        showTransitionAlert,
        moveCursorTo,
        moveCursorToCoords,
        clickElement,
        smoothScrollTo,
        scrollIntoViewIfNeeded
      }}
    >
      {children}

      {/* Virtual Cursor */}
      {isDemoActive && (
        <div
          className="fixed pointer-events-none z-[9999] flex items-center justify-center"
          style={{
            left: 0,
            top: 0,
            transform: `translate3d(${cursorTarget.x}px, ${cursorTarget.y}px, 0)`,
            transition: "transform 1200ms cubic-bezier(0.25, 0.8, 0.25, 1)"
          }}
        >
          {/* Custom style block for hover glow */}
          <style>{`
            .demo-hover-glow {
              box-shadow: 0 0 15px rgba(6, 182, 212, 0.6) !important;
              border-color: rgba(6, 182, 212, 0.7) !important;
              transition: all 0.25s ease-out !important;
            }
          `}</style>

          {/* Virtual Pointer dot */}
          <div className="w-5 h-5 rounded-full bg-cyan-400/30 border border-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-400/40">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </div>
          
          {/* Cyan Ripple */}
          {isClicking && (
            <span className="absolute w-8 h-8 border-2 border-cyan-400 rounded-full animate-ping" />
          )}
        </div>
      )}

      {/* Floating Time Badge in Top Right */}
      <AnimatePresence>
        {isDemoActive && currentStep < 3 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 right-6 z-50 glass-lg px-5 py-3 rounded-2xl border border-electric-blue/40 shadow-2xl flex flex-col gap-1.5 backdrop-blur-md min-w-[190px]"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-electric-blue animate-pulse" />
              <p className="text-[10px] font-bold text-white uppercase tracking-wider leading-none font-display">🎬 Judge Demo Mode</p>
            </div>
            
            <div className="h-px bg-white/5 my-0.5" />
            
            <div className="space-y-1 font-mono text-[9px] text-slate-400">
              <p>
                Stage: <span className="text-white font-bold">{
                  currentStep === 0 ? "Citizen Report" :
                  currentStep === 1 ? "AI Analysis" :
                  "AI Orchestration"
                }</span>
              </p>
              <p>
                Est. Remaining: <span className="text-electric-blue font-extrabold">{timeRemaining}s</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Success / Transition Alert Banner */}
      <AnimatePresence>
        {transitionAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[99] bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center gap-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex flex-col items-center gap-4 text-center p-8 max-w-md"
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute w-12 h-12 rounded-full border border-electric-blue/30 animate-ping" />
                <div className="w-12 h-12 rounded-full bg-electric-blue/10 border border-electric-blue/35 flex items-center justify-center text-electric-blue">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-electric-blue uppercase tracking-widest font-mono">CivicEye AI Platform</p>
                <h4 className="text-sm font-display font-bold text-white tracking-wide whitespace-pre-line leading-relaxed">
                  {transitionAlert}
                </h4>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workflow Completion Panel Overlay */}
      <AnimatePresence>
        {isDemoActive && currentStep === 3 && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="max-w-md w-full glass-lg border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 text-center"
            >
              <div className="space-y-2">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="font-display text-2xl font-extrabold text-white tracking-tight mt-4">
                  Mission Complete
                </h3>
                <p className="text-xs text-slate-400 font-medium font-sans">
                  Demo finished. CivicEye AI has successfully resolved all stages of intake, vision diagnostics, and dispatch orchestration.
                </p>
              </div>

              {/* Checklist */}
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 text-left space-y-3 font-mono text-[11px] text-slate-300">
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Citizen Complaint Registered</span>
                </div>
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>AI Vision Analysis Completed</span>
                </div>
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Municipal Report Generated</span>
                </div>
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>AI Orchestration Completed</span>
                </div>
                <div className="flex items-center gap-2.5 text-emerald-400 font-bold">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Ready for Department Dispatch</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={handbackCountdown > 0}
                  onClick={() => {
                    exitDemo();
                  }}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30 text-slate-950 disabled:text-slate-400 font-bold rounded-xl text-sm transition-all disabled:cursor-not-allowed"
                >
                  {handbackCountdown > 0 ? `Unlocking control in ${handbackCountdown}s...` : "Explore Application"}
                </button>
                <button
                  type="button"
                  disabled={handbackCountdown > 0}
                  onClick={() => {
                    exitDemo();
                    router.push("/report");
                  }}
                  className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white disabled:text-white/40 disabled:border-white/5 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed"
                >
                  Submit Your Own Complaint
                </button>
                <button
                  type="button"
                  disabled={handbackCountdown > 0}
                  onClick={() => {
                    exitDemo();
                    router.push("/");
                  }}
                  className="w-full py-3 text-slate-400 hover:text-white disabled:text-slate-600 text-xs font-semibold hover:underline transition-all disabled:cursor-not-allowed"
                >
                  Return Home
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Global Workflow Control Banner */}
      <AnimatePresence>
        {isDemoActive && currentStep < 3 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-6 right-6 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 max-w-4xl w-full md:w-[760px] glass-lg rounded-2xl border border-white/10 p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md"
          >
            {/* AI Workflow Tracker */}
            <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold uppercase tracking-wider font-mono select-none">
              <span className="text-slate-400 mr-2 border-r border-white/10 pr-2">AI WORKFLOW:</span>
              {stepsList.map((s, idx) => {
                const isCompleted = currentStep > s.stepNum;
                const isActive = currentStep === s.stepNum;

                return (
                  <div key={idx} className="flex items-center gap-1">
                    {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-600" />}
                    <span
                      className={`transition-all duration-300 ${
                        isActive
                          ? "text-electric-blue border-b border-electric-blue/50 pb-0.5"
                          : isCompleted
                          ? "text-emerald-400"
                          : "text-slate-500"
                      }`}
                    >
                      {isCompleted ? "✓" : isActive ? "●" : "○"} {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {isPaused ? (
                <button
                  onClick={resumeConcept}
                  className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold font-display"
                >
                  <Play className="h-3.5 w-3.5" /> Resume
                </button>
              ) : (
                <button
                  onClick={pauseDemo}
                  className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold font-display"
                >
                  <Pause className="h-3.5 w-3.5" /> Pause
                </button>
              )}

              <button
                onClick={skipStep}
                className="p-2 bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium font-display"
              >
                <FastForward className="h-3.5 w-3.5 text-electric-blue" /> Skip Step
              </button>

              <button
                onClick={exitDemo}
                className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold font-display"
              >
                <LogOut className="h-3.5 w-3.5" /> Exit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DemoContext.Provider>
  );

  function resumeConcept() {
    resumeDemo();
  }
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return context;
}
