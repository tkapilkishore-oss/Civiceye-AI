"use client";

import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle, AlertTriangle, AlertCircle, Scale, ShieldAlert } from "lucide-react";

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-on-surface-variant/75 text-xs mt-2 font-mono">
          Last Updated: June 25, 2026
        </p>
      </div>

      {/* Intro */}
      <div className="glass-md p-6 md:p-8 rounded-3xl border border-white/10 mb-8 relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-32 h-32 bg-electric-blue/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex gap-4 items-start">
          <FileText className="h-8 w-8 text-electric-blue shrink-0 mt-1" />
          <div>
            <h2 className="text-white font-display font-bold text-lg mb-2">Terms and Conditions of Usage</h2>
            <p className="text-on-surface-variant/80 text-sm leading-relaxed">
              Welcome to CivicEye AI. By accessing or using our municipal reporting platform, you agree to comply with the terms and conditions outlined below. Our systems are designed to assist citizens and local authorities in identifying, verifying, and patching infrastructure deficiencies.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Sections */}
      <div className="space-y-8">
        {/* Section 1 */}
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <CheckCircle className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-white font-display font-bold text-base mb-1">1. Acceptable Use</h3>
            <p className="text-on-surface-variant/80 text-xs leading-relaxed">
              CivicEye AI is provided for public good. You agree to submit only accurate, real-world reports of local infrastructure failures. You agree to utilize the location pinpoint features to mark the exact geographical location of the issue and provide a factual description.
            </p>
          </div>
        </div>

        {/* Section 2 */}
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-white font-display font-bold text-base mb-1">2. Prohibited Reports</h3>
            <p className="text-on-surface-variant/80 text-xs leading-relaxed">
              You are strictly prohibited from submitting: spam, offensive, or harassing material; false reports intended to test or overload systems; or advertisements. Photos containing faces, identifiable personal characteristics, or private properties that do not involve public infrastructure are prohibited and will be flagged for removal.
            </p>
          </div>
        </div>

        {/* Section 3 */}
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-white font-display font-bold text-base mb-1">3. AI Disclaimer (Gemini & Operations Agents)</h3>
            <p className="text-on-surface-variant/80 text-xs leading-relaxed">
              CivicEye AI leverages advanced Large Language Models (LLMs) including Google Gemini to perform automated category classification, cost evaluations, and action plan generation. While highly optimized, AI-generated content (including cost estimates and technical advice) should be treated as draft recommendations. Final technical assessments remain under human supervision.
            </p>
          </div>
        </div>

        {/* Section 4 */}
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-display font-bold text-base mb-1">4. Municipal Disclaimer</h3>
            <p className="text-on-surface-variant/80 text-xs leading-relaxed">
              Although CivicEye AI channels structured reports into local authority workflows, this platform does not officially replace standard legal reporting portals unless explicitly integrated by your local municipality. Repair timelines, final costs, and actual dispatch priorities are fully controlled by the corresponding administrative department.
            </p>
          </div>
        </div>

        {/* Section 5 */}
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Scale className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-white font-display font-bold text-base mb-1">5. Platform Responsibilities</h3>
            <p className="text-on-surface-variant/80 text-xs leading-relaxed">
              We provide the CivicEye AI service on an "as is" basis without warranty of any kind. We strive to maintain continuous uptime and dashboard synchronization, but do not guarantee immediate repair of reported issues or database persistency in simulated sandboxes.
            </p>
          </div>
        </div>
      </div>

      {/* Back button bottom */}
      <div className="mt-12 border-t border-white/5 pt-6 flex justify-end">
        <Link
          href="/"
          className="bg-electric-blue text-background px-6 py-2.5 rounded-full font-display text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-electric-blue/20"
        >
          Accept Terms
        </Link>
      </div>
    </div>
  );
}
