"use client";

import Link from "next/link";
import { ArrowLeft, HelpCircle, BookOpen, Layers, GitMerge, Mail, ChevronRight } from "lucide-react";

export default function SupportPage() {
  const faqs = [
    {
      q: "How does the AI analyze my uploaded photo?",
      a: "CivicEye AI leverages the Google Gemini Vision API to analyze pixel grids in your photo. It scans for features indicative of structural defects—such as asphalt cracking (potholes), pooling water (leaks), or light anomalies—and categorizes them instantly."
    },
    {
      q: "Is there a real-time map showing where my issue is?",
      a: "Yes! CivicEye features a Leaflet interactive map showing the exact geocoded coordinates of reported issues. Municipalities and other users can view these pins in real-time."
    },
    {
      q: "What is the AI Interview step?",
      a: "After initial photo analysis, the AI Copilot formulates a few follow-up questions tailored to your specific issue. Answering these provides critical contextual details that help engineers select materials and calculate costs before dispatching teams."
    },
    {
      q: "Why are repair costs displayed in Rupees?",
      a: "CivicEye targets Indian municipal corporations. Repair estimates are tailored in Indian Rupees (₹) based on standard local municipal schedule-of-rate estimates."
    }
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
          Support Center
        </h1>
        <p className="text-on-surface-variant/75 text-xs mt-2 font-mono">
          How can we help you coordinate civic improvement?
        </p>
      </div>

      {/* Grid of Content sections */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left side: Guide & FAQ (8 cols) */}
        <div className="md:col-span-8 space-y-8">
          {/* FAQ section */}
          <div>
            <h2 className="text-white font-display font-bold text-lg mb-4 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-electric-blue" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="glass-sm p-5 rounded-2xl border border-white/5 space-y-2">
                  <h3 className="text-white font-display font-bold text-sm">{faq.q}</h3>
                  <p className="text-on-surface-variant/80 text-xs leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reporting Guide */}
          <div>
            <h2 className="text-white font-display font-bold text-lg mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-violet-400" />
              Citizen Reporting Guide
            </h2>
            <div className="glass-sm p-6 rounded-3xl border border-white/5 space-y-4">
              <ol className="space-y-3 list-decimal list-inside text-xs text-on-surface-variant/85 leading-relaxed">
                <li>
                  <strong className="text-white">Capture Photo:</strong> Use your phone or upload a clear photo of the civic defect. Avoid blurry or night-time shots.
                </li>
                <li>
                  <strong className="text-white">Pin Location:</strong> Let our system locate you or drag the interactive marker on the map to show the exact spot.
                </li>
                <li>
                  <strong className="text-white">Vision Analysis:</strong> Click analyze. The Vision agent will classify the category and assess safety severity.
                </li>
                <li>
                  <strong className="text-white">Answer AI Questions:</strong> Clarify details in the short conversational interview.
                </li>
                <li>
                  <strong className="text-white">Submit Ticket:</strong> Review the complaint draft and submit to push it to the municipal dashboard.
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Right side: Categories & Workflow (4 cols) */}
        <div className="md:col-span-4 space-y-6">
          {/* Categories card */}
          <div className="glass-md p-5 rounded-2xl border border-white/10 space-y-3">
            <h3 className="text-white font-display font-bold text-sm flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-cyan-400" />
              Supported Categories
            </h3>
            <ul className="text-xs text-on-surface-variant/80 space-y-2 divide-y divide-white/5">
              <li className="pt-2 flex items-center justify-between">
                <span>🛣️ Road Defects & Potholes</span>
                <span className="text-[10px] text-electric-blue font-mono font-bold">BBMP Roads</span>
              </li>
              <li className="pt-2 flex items-center justify-between">
                <span>🚰 Water Leakage & Mains</span>
                <span className="text-[10px] text-electric-blue font-mono font-bold">BWSSB Water</span>
              </li>
              <li className="pt-2 flex items-center justify-between">
                <span>🗑️ Overflowing Waste Bins</span>
                <span className="text-[10px] text-electric-blue font-mono font-bold">SWM Authority</span>
              </li>
              <li className="pt-2 flex items-center justify-between">
                <span>💡 Broken Streetlights</span>
                <span className="text-[10px] text-electric-blue font-mono font-bold">BESCOM Grid</span>
              </li>
            </ul>
          </div>

          {/* Workflow card */}
          <div className="glass-md p-5 rounded-2xl border border-white/10 space-y-3">
            <h3 className="text-white font-display font-bold text-sm flex items-center gap-2">
              <GitMerge className="h-4.5 w-4.5 text-emerald-400" />
              Expected Workflow
            </h3>
            <div className="space-y-3 text-[11px] text-on-surface-variant/80 leading-snug">
              <div className="flex gap-2">
                <span className="text-emerald-400 font-bold">1</span>
                <span>Ticket filed and geocoded immediately.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-emerald-400 font-bold">2</span>
                <span>Assigned to regional Ward Engineer in 4 hours.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-emerald-400 font-bold">3</span>
                <span>Materials and crew dispatched to coordinates.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-emerald-400 font-bold">4</span>
                <span>Citizen inspects photo verification to close ticket.</span>
              </div>
            </div>
          </div>

          {/* Email Support Card */}
          <div className="bg-gradient-to-br from-violet-500/10 to-electric-blue/10 border border-electric-blue/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4.5 w-4.5 text-electric-blue" />
              <h3 className="text-white font-display font-bold text-xs uppercase tracking-wider">Email Support</h3>
            </div>
            <p className="text-[10px] text-on-surface-variant/80 leading-relaxed">
              Have technical questions or need help with a submitted ticket? Get in touch with our team.
            </p>
            <a
              href="mailto:support@civiceye.ai"
              className="inline-flex items-center gap-1.5 text-xs text-white hover:text-electric-blue font-bold font-display transition-colors"
            >
              support@civiceye.ai
              <ChevronRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
