"use client";

import Link from "next/link";
import { ArrowLeft, Mail, MapPin, Clock, Calendar, HelpCircle, Send } from "lucide-react";

export default function ContactPage() {
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
          Contact Us
        </h1>
        <p className="text-on-surface-variant/75 text-xs mt-2 font-mono">
          Connect with the Municipal AI Innovation Team
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Side: Contact Cards (5 cols) */}
        <div className="md:col-span-5 space-y-4">
          {/* Team Name */}
          <div className="glass-md p-6 rounded-2xl border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-electric-blue/5 rounded-full blur-xl pointer-events-none" />
            <h2 className="text-white font-display font-bold text-sm uppercase tracking-wider text-electric-blue mb-1">Owner</h2>
            <p className="text-white font-display font-extrabold text-lg">Municipal AI Innovation Team</p>
            <p className="text-on-surface-variant/70 text-xs mt-2 leading-relaxed">
              Leading the deployment of smart-city infrastructure reporting and automated AI dispatch coordination.
            </p>
          </div>

          {/* Email Info */}
          <div className="glass-sm p-5 rounded-2xl border border-white/5 flex gap-4 items-center">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-mono">Official Email</p>
              <a
                href="mailto:support@civiceye.ai"
                className="text-sm font-bold text-white hover:text-electric-blue transition-colors font-display"
              >
                support@civiceye.ai
              </a>
            </div>
          </div>

          {/* Location Info */}
          <div className="glass-sm p-5 rounded-2xl border border-white/5 flex gap-4 items-center">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-mono">Headquarters Location</p>
              <p className="text-sm font-bold text-white font-display">Bengaluru, Karnataka, India</p>
            </div>
          </div>

          {/* Business Hours */}
          <div className="glass-sm p-5 rounded-2xl border border-white/5 flex gap-4 items-start">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-mono">Business Hours</p>
              <p className="text-xs font-bold text-white mt-1 leading-normal">
                Monday to Friday: 09:00 AM - 06:00 PM (IST)
              </p>
              <p className="text-[10px] text-on-surface-variant/80 mt-1 leading-snug">
                Saturday: 09:00 AM - 01:00 PM • Sunday: Closed
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Response Expectations & Contact Form Mock (7 cols) */}
        <div className="md:col-span-7 space-y-6">
          {/* Response Expectations */}
          <div className="glass-md p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-white font-display font-bold text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-electric-blue" />
              Response Expectations
            </h3>
            
            <div className="space-y-3 text-xs text-on-surface-variant/85 leading-relaxed">
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="font-bold text-white uppercase tracking-wider text-[9px] block text-cyan-400">Critical / Emergency Issues</span>
                <p className="mt-1">
                  Water leaks flooding main avenues, collapsed roads, and active electric fires are auto-escalated within 30 minutes, with engineers dispatched in under 4 hours.
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="font-bold text-white uppercase tracking-wider text-[9px] block text-violet-400">Regular Civic Complaints</span>
                <p className="mt-1">
                  Potholes, broken street lamps, and garbage clearing are assigned to regional contractors within 1 business day, with an expected resolution window of 3-5 days.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="font-bold text-white uppercase tracking-wider text-[9px] block text-amber-400">Software & API Inquiries</span>
                <p className="mt-1">
                  Support emails relating to API keys, platform integrations, or dashboard telemetry sync are replied to within 24-48 hours.
                </p>
              </div>
            </div>
          </div>

          {/* Form placeholder */}
          <div className="glass-sm p-6 rounded-2xl border border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">Send a Quick Message</h4>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Name"
                className="rounded-xl border border-white/10 bg-surface-container-lowest/40 p-2.5 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-electric-blue transition-all"
              />
              <input
                type="email"
                placeholder="Email"
                className="rounded-xl border border-white/10 bg-surface-container-lowest/40 p-2.5 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-electric-blue transition-all"
              />
            </div>
            <textarea
              placeholder="Your Message..."
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-surface-container-lowest/40 p-2.5 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-electric-blue transition-all resize-none"
            />
            <button
              onClick={() => alert("Message sent successfully! The Municipal AI Innovation Team will get back to you shortly.")}
              className="bg-white/5 hover:bg-electric-blue/15 border border-white/10 hover:border-electric-blue/30 text-white font-display text-[11px] font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Send className="h-3 w-3 text-electric-blue" />
              Send Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
