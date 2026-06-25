"use client";

import Link from "next/link";
import { ArrowLeft, Target, AlertCircle, Sparkles, Layers, Cpu, Globe } from "lucide-react";

export default function AboutPage() {
  const techStack = [
    { category: "Frontend Framework", name: "Next.js 15 (App Router)", desc: "Providing fast server-rendered views, static optimization, and modular component composition." },
    { category: "AI Core", name: "Google Gemini 2.5 Flash API", desc: "Powers computer-vision anomaly extraction, conversational follow-up questions, and priority analysis." },
    { category: "Interactive Maps", name: "Leaflet & OpenStreetMap", desc: "Open-source geospatial visualization of tickets, coordinates, and ward boundary scores without API keys." },
    { category: "Database & Storage", name: "Cloud Firestore / local DB Fallback", desc: "NoSQL document database storing ticket data, metrics history, activity feeds, and coordinates." },
    { category: "Styling & Animations", name: "Vanilla CSS & Framer Motion", desc: "Premium theme with micro-animations, glassmorphism, responsive grid alignments, and HSL custom colors." }
  ];

  return (
    <div className="flex-1 bg-background text-on-surface pt-32 pb-20 px-6 md:px-12 max-w-4xl mx-auto w-full flex flex-col">
      {/* Header section */}
      <div className="border-b border-white/5 pb-6 mb-8 shrink-0">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[10px] font-bold text-on-surface-variant hover:text-white transition-colors uppercase tracking-widest font-display mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-electric-blue" />
          Back to Home
        </Link>
        <h1 className="font-display text-4xl font-extrabold text-white tracking-tight leading-none">
          About CivicEye <span className="text-electric-blue">AI</span>
        </h1>
        <p className="text-on-surface-variant/75 text-xs mt-2 font-mono">
          A Decentralized Municipal Intelligence Platform for Smart Cities
        </p>
      </div>

      <div className="space-y-12">
        {/* Mission & Problem Statement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-md p-6 rounded-3xl border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
            <h2 className="text-white font-display font-bold text-base flex items-center gap-2 mb-3">
              <Target className="h-5 w-5 text-violet-400" />
              Our Mission
            </h2>
            <p className="text-on-surface-variant/85 text-xs leading-relaxed">
              CivicEye AI is built to democratize civic management. By providing citizens with a streamlined, AI-assisted reporting workflow and municipalities with an automated diagnostic dashboard, we decrease issue-to-resolution latency, improve municipal accountability, and empower communities to maintain public safety.
            </p>
          </div>

          <div className="glass-md p-6 rounded-3xl border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
            <h2 className="text-white font-display font-bold text-base flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-rose-400" />
              The Problem Statement
            </h2>
            <p className="text-on-surface-variant/85 text-xs leading-relaxed">
              Traditional municipal reporting tools suffer from high friction. Citizens struggle with manual forms, lack of transparency, and delayed responses. At the same time, municipal departments receive vague, unstructured descriptions without visual classification, causing incorrect routing, waste of crew hours, and inaccurate priority triage.
            </p>
          </div>
        </div>

        {/* How Gemini is Used */}
        <div className="glass-md p-6 md:p-8 rounded-3xl border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(0,209,255,0.03),transparent_50%)] pointer-events-none" />
          <h2 className="text-white font-display font-bold text-lg flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-electric-blue" />
            How Gemini AI Powers CivicEye
          </h2>
          <div className="space-y-4 text-xs text-on-surface-variant/85 leading-relaxed">
            <p>
              CivicEye AI leverages <strong className="text-white">Google Gemini 2.5 Flash</strong> to automate three critical nodes of the civic workflow:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong className="text-white">Computer Vision Classification:</strong> Analyzes raw photographs uploaded by citizens to classify defects (e.g. distinguishing a water main leak from a pothole) and rate issue severity dynamically.
              </li>
              <li>
                <strong className="text-white">AI Follow-up Interview:</strong> Formulates context-aware questions to probe the user for crucial details (e.g. water source, depth of pothole, stretch of streetlight failure) that normal forms omit.
              </li>
              <li>
                <strong className="text-white">Structured Complaint Writing:</strong> Synthesizes citizen input into professional complaint documents containing geocoded addresses, department routing suggestions, repair cost ranges in INR (₹), and action plans.
              </li>
            </ul>
          </div>
        </div>

        {/* Municipal Workflow */}
        <div className="space-y-4">
          <h2 className="text-white font-display font-bold text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            The CivicEye Municipal Workflow
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-sm p-4 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] text-electric-blue font-mono font-bold">STEP 01</span>
              <h4 className="text-white font-display font-bold text-xs">Citizen Reports</h4>
              <p className="text-[10px] text-on-surface-variant/80 leading-snug">Photo upload and map pin select on-site.</p>
            </div>
            <div className="glass-sm p-4 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] text-violet-400 font-mono font-bold">STEP 02</span>
              <h4 className="text-white font-display font-bold text-xs">AI Evaluation</h4>
              <p className="text-[10px] text-on-surface-variant/80 leading-snug">Gemini classifies severity, cost, and routing.</p>
            </div>
            <div className="glass-sm p-4 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] text-cyan-400 font-mono font-bold">STEP 03</span>
              <h4 className="text-white font-display font-bold text-xs">Priority Dispatch</h4>
              <p className="text-[10px] text-on-surface-variant/80 leading-snug">Municipality dashboard routes details to engineers.</p>
            </div>
            <div className="glass-sm p-4 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] text-emerald-400 font-mono font-bold">STEP 04</span>
              <h4 className="text-white font-display font-bold text-xs">Verification</h4>
              <p className="text-[10px] text-on-surface-variant/80 leading-snug">Citizen verifies repaired photo logs to close ticket.</p>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="space-y-4">
          <h2 className="text-white font-display font-bold text-lg flex items-center gap-2">
            <Cpu className="h-5 w-5 text-amber-400" />
            Our Technology Stack
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {techStack.map((tech, idx) => (
              <div key={idx} className="glass-sm p-5 rounded-2xl border border-white/5 space-y-2">
                <span className="text-[8px] font-bold text-amber-400 uppercase tracking-widest block font-mono">{tech.category}</span>
                <h3 className="text-white font-display font-bold text-sm leading-none">{tech.name}</h3>
                <p className="text-[10px] text-on-surface-variant/75 leading-relaxed">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vision for Smart Cities */}
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Globe className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-white font-display font-bold text-base mb-1">A Vision for Future Smart Cities</h3>
            <p className="text-on-surface-variant/80 text-xs leading-relaxed">
              CivicEye AI is more than a reporting tool; it is a foundational layer for digital municipal operations. Integrating machine learning diagnostics directly with citizen feedback creates a transparent, self-improving loop. In the future, this data will feed predictive maintenance models, helping cities anticipate pipeline failures, allocate budgets automatically based on historical ward scores, and schedule street lamp repairs before dark zones form.
            </p>
          </div>
        </div>
      </div>

      {/* Footer link back */}
      <div className="mt-12 border-t border-white/5 pt-6 flex justify-end">
        <Link
          href="/"
          className="bg-electric-blue text-background px-6 py-2.5 rounded-full font-display text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-electric-blue/20"
        >
          Explore Dashboard
        </Link>
      </div>
    </div>
  );
}
