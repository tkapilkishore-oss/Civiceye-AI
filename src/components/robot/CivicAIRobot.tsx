"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type RobotState = "idle" | "greeting" | "thinking" | "writing" | "completed" | "streaming";

interface CivicAIRobotProps {
  state: RobotState;
  isWritingActive?: boolean;
}

export default function CivicAIRobot({ state, isWritingActive = false }: CivicAIRobotProps) {
  const [blinkTrigger, setBlinkTrigger] = useState(false);

  // Periodic random blinking
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const triggerBlink = () => {
      setBlinkTrigger(true);
      setTimeout(() => setBlinkTrigger(false), 120);
      const nextDelay = 2800 + Math.random() * 4200;
      timeoutId = setTimeout(triggerBlink, nextDelay);
    };
    timeoutId = setTimeout(triggerBlink, 2500);
    return () => clearTimeout(timeoutId);
  }, []);

  // Eye gaze offsets driven by state — reference the character sheet poses
  let eyeX = 0;
  let eyeY = 0;
  const isCompleted = state === "completed";

  if (state === "thinking") {
    eyeX = -1.2;
    eyeY = -1.8; // look slightly up-left (thinking pose)
  } else if (state === "writing") {
    eyeX = -1.5;
    eyeY = 2.5;  // look down at notebook
  } else if (state === "streaming") {
    eyeX = 2.2;
    eyeY = 0;    // look right at the text
  } else if (isWritingActive && state !== "completed") {
    eyeX = -1.2;
    eyeY = 2.0;
  }

  // Eye shape: squinting smile arcs on completion, blinking scaleY=0 on blink trigger
  const eyeScaleY = blinkTrigger ? 0.05 : 1;

  // Arm keyframes
  const leftArmWave = state === "greeting" ? [-8, -45, -20, -45, -8] : 0;
  const rightArmRotate = state === "completed" ? -42 : 0;

  // Show notebook when in complaint writing/streaming mode
  const showNotebook = state === "writing" || (state === "streaming" && isWritingActive);

  return (
    <div className="relative w-[90px] h-[125px] select-none flex items-center justify-center">
      <svg
        viewBox="0 0 100 140"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* White/light-grey armor plates with subtle gradient — matches character sheet */}
          <linearGradient id="armorPlate" x1="0%" y1="0%" x2="60%" y2="100%">
            <stop offset="0%" stopColor="#F0F4F8" />
            <stop offset="55%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>

          {/* Slightly darker shade for side/bottom panels */}
          <linearGradient id="armorShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#B8C4D4" />
          </linearGradient>

          {/* Dark slate joint segments */}
          <linearGradient id="jointDark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2D3748" />
            <stop offset="100%" stopColor="#1A202C" />
          </linearGradient>

          {/* Cyan glow for eyes and accents */}
          <radialGradient id="cyanGlow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#7FFCFF" />
            <stop offset="50%" stopColor="#00D4FF" />
            <stop offset="100%" stopColor="#0096C7" stopOpacity="0.7" />
          </radialGradient>

          {/* Ear-cup ring glow */}
          <radialGradient id="earGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0096C7" stopOpacity="0" />
          </radialGradient>

          {/* Soft drop shadow filter */}
          <filter id="softShadow" x="-15%" y="-10%" width="130%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0D1B2A" floodOpacity="0.3" />
          </filter>

          {/* Glow filter for eyes and accents */}
          <filter id="eyeGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Chest badge gradient */}
          <radialGradient id="badgeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0369A1" />
          </radialGradient>
        </defs>

        {/* ─── Ambient ground ring shadow ─── */}
        <motion.ellipse
          cx="50" cy="134" rx="20" ry="3"
          fill="rgba(0, 212, 255, 0.15)"
          animate={{
            rx: [20, 18, 20],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* ─── Floating body wrapper — gentle hover/sway ─── */}
        <motion.g
          animate={{
            y: state === "thinking" ? [0, -5, 0] : [0, -3.5, 0],
            rotate: state === "thinking"
              ? [-2, 2, -2]
              : state === "writing"
                ? [-0.8, 0.8, -0.8]
                : [-1, 1, -1]
          }}
          transition={{
            y: { duration: state === "thinking" ? 2.2 : 3.2, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          {/* ══════════════════════════════════════
              TORSO — Chunky rounded body
          ══════════════════════════════════════ */}
          <g id="torso" filter="url(#softShadow)">
            {/* Neck joint — short dark cylinder */}
            <rect x="44" y="65" width="12" height="7" rx="3" fill="url(#jointDark)" />

            {/* Main torso plate — rounded rectangle, wider than tall */}
            <rect x="31" y="71" width="38" height="36" rx="10" fill="url(#armorPlate)" />

            {/* Torso side shading panels */}
            <rect x="31" y="71" width="6" height="36" rx="3" fill="url(#armorShade)" opacity="0.6" />
            <rect x="63" y="71" width="6" height="36" rx="3" fill="url(#armorShade)" opacity="0.6" />

            {/* CivicEye chest badge — matching the "C" logo on character sheet */}
            <motion.circle
              cx="50" cy="89" r="7"
              fill="url(#badgeGlow)"
              stroke="#00D4FF"
              strokeWidth="1.5"
              filter="url(#eyeGlow)"
              animate={{
                scale: isWritingActive ? [1, 1.2, 1] : [1, 1.08, 1],
                opacity: isWritingActive ? [0.85, 1, 0.85] : [0.7, 0.9, 0.7]
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* "C" letter on badge */}
            <path d="M 53 86 A 4 4 0 1 0 53 92" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>

          {/* ══════════════════════════════════════
              LEFT ARM — wave on greeting, hold notebook
          ══════════════════════════════════════ */}
          <g id="leftArm">
            {state === "writing" || showNotebook ? (
              // Notebook-holding pose: arm angled in, hand forward
              <g>
                <path d="M 33 74 Q 24 80 28 94" stroke="url(#jointDark)" strokeWidth="5" strokeLinecap="round" fill="none" />
                <circle cx="28" cy="94" r="4" fill="url(#armorShade)" />
              </g>
            ) : (
              // Default hang / greeting wave
              <motion.g
                style={{ transformOrigin: "33px 74px" }}
                animate={{ rotate: leftArmWave }}
                transition={{ duration: 1.6, ease: "easeInOut", repeat: state === "greeting" ? Infinity : 0, repeatType: "mirror" }}
              >
                <path d="M 33 74 Q 22 82 22 97" stroke="url(#jointDark)" strokeWidth="5" strokeLinecap="round" fill="none" />
                <circle cx="22" cy="97" r="4" fill="url(#armorShade)" />
              </motion.g>
            )}
          </g>

          {/* ══════════════════════════════════════
              RIGHT ARM — scribble on writing, thumbs-up on completion
          ══════════════════════════════════════ */}
          <g id="rightArm">
            {state === "writing" ? (
              // Writing/scribbling arm
              <motion.g
                animate={isWritingActive ? {
                  x: [0, 2, -1, 1.5, 0],
                  y: [0, -1.5, 1, -0.5, 0]
                } : {}}
                transition={{ duration: 0.55, repeat: Infinity, ease: "linear" }}
              >
                <path d="M 67 74 Q 76 82 68 91" stroke="url(#jointDark)" strokeWidth="5" strokeLinecap="round" fill="none" />
                {/* Digital stylus */}
                <path d="M 67 90 L 61 95" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round" />
                <circle cx="68" cy="91" r="4" fill="url(#armorShade)" />
              </motion.g>
            ) : (
              <motion.g
                style={{ transformOrigin: "67px 74px" }}
                animate={{ rotate: rightArmRotate, y: state === "completed" ? -3 : 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 12 }}
              >
                <path d="M 67 74 Q 78 82 78 97" stroke="url(#jointDark)" strokeWidth="5" strokeLinecap="round" fill="none" />
                {state === "completed" ? (
                  // Thumbs-up hand
                  <g transform="translate(78, 97)">
                    <circle cx="0" cy="0" r="5" fill="url(#armorPlate)" />
                    <path d="M 0 -4 Q 3 -9 6 -6" stroke="url(#armorShade)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  </g>
                ) : (
                  <circle cx="78" cy="97" r="4" fill="url(#armorShade)" />
                )}
              </motion.g>
            )}
          </g>

          {/* ══════════════════════════════════════
              LEGS — short stumpy rounded legs
          ══════════════════════════════════════ */}
          <g id="legs">
            <rect x="38" y="105" width="9" height="14" rx="4.5" fill="url(#armorShade)" />
            <rect x="53" y="105" width="9" height="14" rx="4.5" fill="url(#armorShade)" />
            {/* Feet */}
            <rect x="36" y="116" width="13" height="7" rx="3.5" fill="url(#jointDark)" />
            <rect x="51" y="116" width="13" height="7" rx="3.5" fill="url(#jointDark)" />
          </g>

          {/* ══════════════════════════════════════
              HEAD — large dome with visor, eyes, ear-cups
          ══════════════════════════════════════ */}
          <motion.g
            id="head"
            style={{ transformOrigin: "50px 42px" }}
            animate={{
              rotate: state === "thinking" ? -7 : state === "writing" ? 5 : 0,
              y: state === "writing" ? 1.5 : 0
            }}
            transition={{ type: "spring", stiffness: 80, damping: 12 }}
          >
            {/* ── Helmet / Dome ── */}
            {/* Main helmet sphere */}
            <circle cx="50" cy="40" r="27" fill="url(#armorPlate)" filter="url(#softShadow)" />

            {/* Glossy highlight arc on top */}
            <path d="M 32 28 Q 50 18 68 28" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" fill="none" strokeLinecap="round" />

            {/* Bottom helmet plate / chin guard */}
            <path d="M 27 48 Q 27 58 50 60 Q 73 58 73 48" fill="url(#armorShade)" />

            {/* ── Ear-cup antennas — circular side rings ── */}
            {/* Left ear cup */}
            <circle cx="23" cy="40" r="7" fill="url(#armorShade)" />
            <circle cx="23" cy="40" r="4.5" fill="#0D1B2A" />
            <circle cx="23" cy="40" r="3" fill="url(#earGlow)" filter="url(#eyeGlow)" />

            {/* Right ear cup */}
            <circle cx="77" cy="40" r="7" fill="url(#armorShade)" />
            <circle cx="77" cy="40" r="4.5" fill="#0D1B2A" />
            <circle cx="77" cy="40" r="3" fill="url(#earGlow)" filter="url(#eyeGlow)" />

            {/* ── Visor — wide dark rounded rect on face ── */}
            {/* Outer visor frame */}
            <rect x="31" y="30" width="38" height="22" rx="10" fill="#0A1628" />
            {/* Inner visor glass — subtle blue reflection */}
            <rect x="32" y="31" width="36" height="20" rx="9" fill="#0D1F38" />
            {/* Visor glass highlight */}
            <path d="M 35 33 Q 50 30 65 33" stroke="rgba(100,180,255,0.18)" strokeWidth="1.5" fill="none" strokeLinecap="round" />

            {/* ── Eyes — two large expressive cyan ovals inside visor ── */}
            <motion.g
              animate={{
                x: eyeX,
                y: eyeY,
                scaleY: eyeScaleY
              }}
              transition={{
                x: { type: "spring", stiffness: 90, damping: 14 },
                y: { type: "spring", stiffness: 90, damping: 14 },
                scaleY: { duration: 0.1 }
              }}
              style={{ transformOrigin: "50px 41px" }}
            >
              {isCompleted ? (
                // Happy squinting arcs — "^‿^" style
                <g>
                  <path d="M 37 40 Q 41 36 45 40" stroke="#00D4FF" strokeWidth="3" strokeLinecap="round" fill="none" filter="url(#eyeGlow)" />
                  <path d="M 55 40 Q 59 36 63 40" stroke="#00D4FF" strokeWidth="3" strokeLinecap="round" fill="none" filter="url(#eyeGlow)" />
                </g>
              ) : (
                // Standard large oval LED eyes — the defining feature of the character
                <g>
                  {/* Left eye */}
                  <ellipse cx="41" cy="41" rx="5.5" ry="6" fill="url(#cyanGlow)" filter="url(#eyeGlow)" />
                  <ellipse cx="41" cy="40" rx="2" ry="2.2" fill="white" opacity="0.85" />

                  {/* Right eye */}
                  <ellipse cx="59" cy="41" rx="5.5" ry="6" fill="url(#cyanGlow)" filter="url(#eyeGlow)" />
                  <ellipse cx="59" cy="40" rx="2" ry="2.2" fill="white" opacity="0.85" />
                </g>
              )}
            </motion.g>

            {/* Thinking bubble — only in thinking state */}
            {state === "thinking" && (
              <motion.g
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.3 }}
                transition={{ duration: 0.25 }}
              >
                <circle cx="72" cy="20" r="2" fill="#00D4FF" opacity="0.6" />
                <circle cx="77" cy="14" r="3" fill="#00D4FF" opacity="0.7" />
                <circle cx="83" cy="8" r="4.5" fill="#0D1F38" stroke="#00D4FF" strokeWidth="1.5" />
                <text x="83" y="11" textAnchor="middle" fontSize="5" fill="#00D4FF" fontWeight="bold">?</text>
              </motion.g>
            )}
          </motion.g>

          {/* ══════════════════════════════════════
              NOTEBOOK — appears in writing/complaint mode
          ══════════════════════════════════════ */}
          <AnimatePresence>
            {showNotebook && (
              <motion.g
                key="notebook"
                initial={{ opacity: 0, scale: 0.65, y: 12, rotate: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0, rotate: -5 }}
                exit={{ opacity: 0, scale: 0.6, y: 20, rotate: -12 }}
                transition={{ type: "spring", stiffness: 130, damping: 14 }}
                style={{ transformOrigin: "44px 98px" }}
                className="pointer-events-none"
              >
                {/* Notebook backing — dark holographic cover */}
                <rect x="20" y="82" width="34" height="28" rx="3.5" fill="#0D2137" stroke="#0891B2" strokeWidth="1.5" />
                {/* Coil binding strip */}
                <rect x="20" y="80" width="34" height="3.5" rx="1.5" fill="#0891B2" />
                {/* Coil dots */}
                {[24, 30, 36, 42, 48].map((cx) => (
                  <circle key={cx} cx={cx} cy="81.5" r="1.5" fill="#22D3EE" />
                ))}
                {/* Ruled ledger lines */}
                <line x1="24" y1="91" x2="50" y2="91" stroke="rgba(6,182,212,0.4)" strokeWidth="1.2" />
                <line x1="24" y1="97" x2="50" y2="97" stroke="rgba(6,182,212,0.4)" strokeWidth="1.2" />
                <line x1="24" y1="103" x2="50" y2="103" stroke="rgba(6,182,212,0.4)" strokeWidth="1.2" />
              </motion.g>
            )}
          </AnimatePresence>
        </motion.g>
      </svg>
    </div>
  );
}
