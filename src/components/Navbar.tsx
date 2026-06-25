"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/" && pathname !== "/") return false;
    return pathname?.startsWith(path);
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-background/60 backdrop-blur-xl border-b border-white/5 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center px-6 md:px-12 py-4 w-full max-w-7xl mx-auto h-20">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-display text-2xl md:text-3xl font-extrabold text-on-surface tracking-tighter transition-all group-hover:opacity-90">
            CivicEye <span className="text-electric-blue">AI</span>
          </span>
        </Link>

        {/* Navigation links */}
        <nav className="hidden md:flex gap-8 items-center">
          <Link
            href="/dashboard"
            className={`font-display text-xs font-semibold uppercase tracking-widest transition-all ${
              isActive("/dashboard")
                ? "text-electric-blue border-b-2 border-electric-blue pb-1"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/report"
            className={`font-display text-xs font-semibold uppercase tracking-widest transition-all ${
              isActive("/report")
                ? "text-electric-blue border-b-2 border-electric-blue pb-1"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Reports
          </Link>
          <Link
            href="/orchestration"
            className={`font-display text-xs font-semibold uppercase tracking-widest transition-all ${
              isActive("/orchestration")
                ? "text-electric-blue border-b-2 border-electric-blue pb-1"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Orchestration
          </Link>
          <Link
            href="/assistant"
            className={`font-display text-xs font-semibold uppercase tracking-widest transition-all ${
              isActive("/assistant")
                ? "text-electric-blue border-b-2 border-electric-blue pb-1"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Ask Civic AI
          </Link>
          <Link
            href="/about"
            className={`font-display text-xs font-semibold uppercase tracking-widest transition-all ${
              isActive("/about")
                ? "text-electric-blue border-b-2 border-electric-blue pb-1"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            About
          </Link>
        </nav>

        {/* Action controls & Avatar */}
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            href="/report"
            className="bg-electric-blue text-background px-5 py-2.5 rounded-full font-display text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-electric-blue/20"
          >
            Report Issue
          </Link>

          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 ring-2 ring-electric-blue/20 shrink-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCn76CRMhVxb0lsFk5CyHV_jdWWTReaEdMLm5ZfOEMd6iALUmm3f2o5iATXfw-4NzDxP6nV8ySd08g77LZTXRyN9C3juCfgFXL734jbpNOIrEY7iKcgGU001M_6B2CvZuEY_p5-xy7kmRCXD2_ANjRqHHlCP625P0HqU1vd8LFK6eE6WjHehkYo-ayTmxMUG63FsphqVtUO-6Hn4LlhWLFgIH0xhPyi14MzyZ1iMS4ogI1rVaBNf-DFjYTztMgs9lU0JsDgVDO3Em7E"
              alt="User Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
