"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Eye, Camera, Cpu, Database, Trash2 } from "lucide-react";

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-on-surface-variant/75 text-xs mt-2 font-mono">
          Last Updated: June 25, 2026
        </p>
      </div>

      {/* Intro */}
      <div className="glass-md p-6 md:p-8 rounded-3xl border border-white/10 mb-8 relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-32 h-32 bg-electric-blue/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex gap-4 items-start">
          <Shield className="h-8 w-8 text-electric-blue shrink-0 mt-1" />
          <div>
            <h2 className="text-white font-display font-bold text-lg mb-2">Our Commitment to Your Privacy</h2>
            <p className="text-on-surface-variant/80 text-sm leading-relaxed">
              CivicEye AI is designed as a modern citizen-municipality intelligence bridge. We prioritize the security of the data you report, ensuring that public hazard submissions serve solely to improve civic infrastructure and safety. Below we outline how we handle images, locations, and personal information.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Sections */}
      <div className="space-y-8">
        {/* Section 1 */}
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Eye className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-white font-display font-bold text-base mb-1">1. Data Collection</h3>
            <p className="text-on-surface-variant/80 text-xs leading-relaxed">
              We collect information provided voluntarily by you when creating a civic complaint. This includes your name, contact information (phone number/email), the landmark description of the issue, and the geographical location.
            </p>
          </div>
        </div>

        {/* Section 2 */}
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Camera className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-white font-display font-bold text-base mb-1">2. Image Processing</h3>
            <p className="text-on-surface-variant/80 text-xs leading-relaxed">
              To verify and prioritize civic reports, the application prompts you to take or upload a photograph of the physical defect (e.g. potholes, broken streetlights). Images are processed on-device and uploaded to our secure systems. We request that you avoid uploading images containing faces, license plates, or other personally identifying details.
            </p>
          </div>
        </div>

        {/* Section 3 */}
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Cpu className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-white font-display font-bold text-base mb-1">3. Gemini Usage</h3>
            <p className="text-on-surface-variant/80 text-xs leading-relaxed">
              CivicEye AI utilizes the Google Gemini API to analyze the uploaded image, classify the type of infrastructure defect, evaluate the severity of the damage, and draft structured complaint drafts. This processing does not associate your personal identification with the Gemini query model.
            </p>
          </div>
        </div>

        {/* Section 4 */}
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Database className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-display font-bold text-base mb-1">4. Firestore Storage</h3>
            <p className="text-on-surface-variant/80 text-xs leading-relaxed">
              All finalized tickets are saved securely in Cloud Firestore (or local workspace simulation depending on environment setup). Stored fields include: reporter name, category, geocoded address, coordinate latitude and longitude, status, severity, AI-generated action plan, and repair costs.
            </p>
          </div>
        </div>

        {/* Section 5 */}
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-white font-display font-bold text-base mb-1">5. User Privacy & Data Retention</h3>
            <p className="text-on-surface-variant/80 text-xs leading-relaxed">
              Reports remain public on the municipality dashboard to enable community duplication checking, voting, and status tracking. However, citizen contact details are kept secure and visible only to assigned municipal engineering departments. We retain this data as long as necessary to coordinate resolution and archive civic metrics.
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
          I Understand
        </Link>
      </div>
    </div>
  );
}
