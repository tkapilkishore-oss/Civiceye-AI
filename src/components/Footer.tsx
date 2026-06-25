"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full py-12 border-t border-white/5 bg-background relative z-10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="font-display text-primary text-xl font-bold tracking-tighter">
            CivicEye <span className="text-electric-blue">AI</span>
          </span>
          <p className="text-on-surface-variant text-[11px] font-medium tracking-wide uppercase opacity-50">
            © 2026 CivicEye AI • Powered by Google AI
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <Link
            href="/privacy"
            className="font-display text-[10px] uppercase tracking-[0.2em] text-on-surface-variant hover:text-primary transition-all font-bold"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="font-display text-[10px] uppercase tracking-[0.2em] text-on-surface-variant hover:text-primary transition-all font-bold"
          >
            Terms of Service
          </Link>
          <Link
            href="/support"
            className="font-display text-[10px] uppercase tracking-[0.2em] text-on-surface-variant hover:text-primary transition-all font-bold"
          >
            Support
          </Link>
          <Link
            href="/contact"
            className="font-display text-[10px] uppercase tracking-[0.2em] text-on-surface-variant hover:text-primary transition-all font-bold"
          >
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
