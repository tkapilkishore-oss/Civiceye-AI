"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, ShieldAlert, Cpu, Landmark, Users, Award, CheckCircle2, Navigation, X } from "lucide-react";
import * as THREE from "three";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useDemo } from "@/components/DemoProvider";
import { demoScenarios } from "@/constants/demoScenarios";

export default function Home() {
  const router = useRouter();
  const { startDemo } = useDemo();
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState("pothole");

  const threeContainerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Framer Motion variants for Hero entrance
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: shouldReduceMotion ? 0 : 15 
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: { 
        duration: 0.8, 
        ease: [0.16, 1, 0.3, 1] as const
      },
    },
  };

  // Load Three.js 3D Constellation effect client-side
  useEffect(() => {
    if (!threeContainerRef.current) return;

    const container = threeContainerRef.current;
    let width = container.clientWidth;
    let height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Create particles
    const particleCount = 204;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities: { x: number; y: number; z: number }[] = [];
    const baseVelocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      // Position particles in a spherical range
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const distance = 8 + Math.random() * 16;

      positions[i * 3] = distance * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = distance * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = distance * Math.cos(phi);

      const vx = (Math.random() - 0.5) * 0.03;
      const vy = (Math.random() - 0.5) * 0.03;
      const vz = (Math.random() - 0.5) * 0.03;

      velocities.push({ x: vx, y: vy, z: vz });
      baseVelocities.push({ x: vx, y: vy, z: vz });

      // Predominantly electric blue/cyan variations
      colors[i * 3] = 0.0;
      colors[i * 3 + 1] = 0.8 + Math.random() * 0.2; // 0.8 to 1.0 green channel
      colors[i * 3 + 2] = 1.0; // 1.0 blue channel
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.65,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Create line connections between close particles
    const lineMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.5, // overall max opacity multiplier
    });

    let lineSegments = new THREE.LineSegments();
    scene.add(lineSegments);

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;

    // Mouse Tracking for Particle Interactions
    const mouse = { x: 0, y: 0, active: false };
    const smoothMouse = { x: 0, y: 0 };
    const ripple = { x: 0, y: 0, z: 0, radius: 0, active: false };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width && rect.height) {
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        mouse.active = true;
      }
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width && rect.height) {
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        const fovRad = (camera.fov * Math.PI) / 360;
        const halfHeight = 30 * Math.tan(fovRad);
        const halfWidth = halfHeight * (rect.width / rect.height);
        
        const clickWorld = new THREE.Vector3(x * halfWidth, y * halfHeight, 0);
        const euler = new THREE.Euler(-particles.rotation.x, -particles.rotation.y, 0, 'YXZ');
        clickWorld.applyEuler(euler);
        
        ripple.x = clickWorld.x;
        ripple.y = clickWorld.y;
        ripple.z = clickWorld.z;
        ripple.radius = 0;
        ripple.active = true;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("mousedown", handleMouseDown);

    // Animation Loop
    let animationFrameId: number;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Continuous camera drift for parallax background fill
      const driftTime = Date.now() * 0.0005;
      camera.position.x = Math.sin(driftTime) * 4;
      camera.position.y = Math.cos(driftTime * 0.8) * 4;
      camera.lookAt(scene.position);

      // Interpolate mouse coordinates (lerp) for smooth easing
      if (mouse.active) {
        smoothMouse.x += (mouse.x - smoothMouse.x) * 0.08;
        smoothMouse.y += (mouse.y - smoothMouse.y) * 0.08;
      } else {
        smoothMouse.x += (0 - smoothMouse.x) * 0.04;
        smoothMouse.y += (0 - smoothMouse.y) * 0.04;
      }

      // Rotate entire constellation system based on smooth cursor coordinates
      targetRotationY = smoothMouse.x * 0.25;
      targetRotationX = -smoothMouse.y * 0.25;

      particles.rotation.y += (targetRotationY - particles.rotation.y) * 0.04 + 0.0008;
      particles.rotation.x += (targetRotationX - particles.rotation.x) * 0.04 + 0.0004;
      lineSegments.rotation.y = particles.rotation.y;
      lineSegments.rotation.x = particles.rotation.x;

      const posArr = posAttr.array as Float32Array;

      // Map smooth mouse NDC coordinates to 3D space
      const fovRad = (camera.fov * Math.PI) / 360;
      const halfHeight = 30 * Math.tan(fovRad);
      const halfWidth = halfHeight * (width / height);
      const mouseX3D = smoothMouse.x * halfWidth;
      const mouseY3D = smoothMouse.y * halfHeight;

      // Transform mouse position to local space of particles group
      const mouseVec = new THREE.Vector3(mouseX3D, mouseY3D, 0);
      const euler = new THREE.Euler(-particles.rotation.x, -particles.rotation.y, 0, 'YXZ');
      mouseVec.applyEuler(euler);

      // Expand ripple wavefront in local space
      if (ripple.active) {
        ripple.radius += 0.8;
        if (ripple.radius > 35) {
          ripple.active = false;
        }
      }

      // Update particle positions with repulsion and ripple forces
      for (let i = 0; i < particleCount; i++) {
        // Localized repulsion
        if (mouse.active) {
          const dx = posArr[i * 3] - mouseVec.x;
          const dy = posArr[i * 3 + 1] - mouseVec.y;
          const dz = posArr[i * 3 + 2] - mouseVec.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 10) { // Hover repulsion within 10 units
            const force = (10 - dist) * 0.022; // Repulsion factor
            velocities[i].x += (dx / dist) * force;
            velocities[i].y += (dy / dist) * force;
            velocities[i].z += (dz / dist) * force;
          }
        }

        // Concentric shockwave ripple from clicks
        if (ripple.active) {
          const dx = posArr[i * 3] - ripple.x;
          const dy = posArr[i * 3 + 1] - ripple.y;
          const dz = posArr[i * 3 + 2] - ripple.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (Math.abs(dist - ripple.radius) < 4) {
            const force = (4 - Math.abs(dist - ripple.radius)) * 0.35;
            velocities[i].x += (dx / dist) * force;
            velocities[i].y += (dy / dist) * force;
            velocities[i].z += (dz / dist) * force;
          }
        }

        // Apply Damping (slow recovery to original speed)
        velocities[i].x += (baseVelocities[i].x - velocities[i].x) * 0.035;
        velocities[i].y += (baseVelocities[i].y - velocities[i].y) * 0.035;
        velocities[i].z += (baseVelocities[i].z - velocities[i].z) * 0.035;

        posArr[i * 3] += velocities[i].x;
        posArr[i * 3 + 1] += velocities[i].y;
        posArr[i * 3 + 2] += velocities[i].z;

        // Bounce boundaries
        const dist = Math.sqrt(
          posArr[i * 3] ** 2 + posArr[i * 3 + 1] ** 2 + posArr[i * 3 + 2] ** 2
        );
        if (dist > 30 || dist < 4) {
          velocities[i].x *= -1;
          velocities[i].y *= -1;
          velocities[i].z *= -1;
          baseVelocities[i].x *= -1;
          baseVelocities[i].y *= -1;
          baseVelocities[i].z *= -1;
        }
      }
      posAttr.needsUpdate = true;

      // Build connection lines dynamically with distance-based fading (vertex colors)
      const linePositions: number[] = [];
      const lineColors: number[] = [];
      for (let i = 0; i < particleCount; i++) {
        // Connect particles to each other
        for (let j = i + 1; j < particleCount; j++) {
          const dx = posArr[i * 3] - posArr[j * 3];
          const dy = posArr[i * 3 + 1] - posArr[j * 3 + 1];
          const dz = posArr[i * 3 + 2] - posArr[j * 3 + 2];
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < 64) { // Connect if distance < 8 units
            const dist = Math.sqrt(distSq);
            const opacity = Math.max(0, 1 - dist / 8);
            
            linePositions.push(posArr[i * 3], posArr[i * 3 + 1], posArr[i * 3 + 2]);
            linePositions.push(posArr[j * 3], posArr[j * 3 + 1], posArr[j * 3 + 2]);

            // Translucent electric-blue connecting colors fading to black/transparent
            const r = 0.0 * opacity;
            const g = 0.52 * opacity;
            const b = 1.0 * opacity;

            lineColors.push(r, g, b);
            lineColors.push(r, g, b);
          }
        }

        // Connect close particles to the mouse cursor directly
        if (mouse.active) {
          const dx = posArr[i * 3] - mouseVec.x;
          const dy = posArr[i * 3 + 1] - mouseVec.y;
          const dz = posArr[i * 3 + 2] - mouseVec.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < 10) {
            const opacity = Math.max(0, 1 - dist / 10);
            
            linePositions.push(posArr[i * 3], posArr[i * 3 + 1], posArr[i * 3 + 2]);
            linePositions.push(mouseVec.x, mouseVec.y, mouseVec.z);

            const r = 0.0 * opacity;
            const g = 0.82 * opacity; // slightly brighter cyan for active pointer lines
            const b = 1.0 * opacity;

            lineColors.push(r, g, b);
            lineColors.push(r, g, b);
          }
        }
      }

      scene.remove(lineSegments);
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(linePositions, 3)
      );
      lineGeometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(lineColors, 3)
      );
      lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(lineSegments);

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight || 500;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      lineMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-transparent text-on-surface overflow-x-hidden pt-20 relative">
      {/* Dynamic CSS Gradient Background Layer */}
      <div className="fixed inset-0 z-[-2] pointer-events-none opacity-60 bg-slate-950 w-full h-full">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,209,255,0.08)_0%,transparent_70%)] opacity-70" />
        <div className="absolute top-[20%] left-[10%] w-[50vw] h-[50vh] rounded-full bg-electric-blue/5 blur-[120px]" />
      </div>

      {/* Radial-Masked Structured Grid Layer */}
      <div className="fixed inset-0 z-[-2] pointer-events-none opacity-30 bg-grid-glow w-full h-full" />

      {/* Three.js Neural Network Layer */}
      <div
        ref={threeContainerRef}
        className="fixed inset-0 z-[-1] pointer-events-none opacity-40 w-full h-full"
      />

      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex flex-col items-center justify-center text-center px-6 md:px-12 overflow-hidden py-20">

        {/* Ambient spotlight behind content */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[900px] h-[350px] sm:h-[900px] bg-gradient-to-tr from-electric-blue/15 to-transparent rounded-full blur-[150px] -z-10 pointer-events-none animate-pulse"
          style={{ animationDuration: "10s" }}
        />

        <motion.div 
          className="relative z-10 max-w-5xl mx-auto space-y-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-white/5 backdrop-blur-md text-[11px] font-mono tracking-widest text-electric-blue uppercase" variants={itemVariants}>
            <span className="w-1.5 h-1.5 rounded-full bg-electric-blue animate-pulse"></span>
            Civic Intelligence Platform
          </motion.div>

          {/* Heading */}
          <motion.h1 
            className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-[5.75rem] font-bold tracking-tighter text-white leading-[0.95] max-w-4xl mx-auto"
            variants={itemVariants}
          >
            <span className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
              The future of
            </span>
            <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-electric-blue via-[#00F0FF] to-cyan-300 bg-clip-text text-transparent filter drop-shadow-[0_0_30px_rgba(0,209,255,0.2)]">
              civic intelligence.
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p 
            className="font-display text-lg sm:text-2xl text-on-surface-variant max-w-3xl mx-auto font-medium opacity-90 leading-relaxed"
            variants={itemVariants}
          >
            AI-powered civic reporting for a smarter, more resilient city. Log defects, track departmental dispatches, and audit ward scores.
          </motion.p>

          {/* CTAs */}
          <motion.div 
            className="flex flex-col items-center justify-center gap-6 pt-4"
            variants={itemVariants}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full">
              <motion.div
                whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                className="w-full sm:w-auto"
              >
                <Link
                  href="/report"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-10 py-5 btn-premium-glow rounded-xl font-bold text-base transition-all"
                >
                  <ShieldAlert className="h-5 w-5" />
                  Report an Issue
                </Link>
              </motion.div>
              
              <motion.div
                whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                className="w-full sm:w-auto"
              >
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-10 py-5 glass-md text-on-surface hover:text-white hover:border-electric-blue/40 rounded-xl font-bold text-base transition-all shadow-lg"
                >
                  View Dashboard
                  <ArrowRight className="h-4 w-4 text-electric-blue animate-pulse" />
                </Link>
              </motion.div>
            </div>

            <motion.div
              whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
              className="w-full sm:w-auto"
            >
              <button
                type="button"
                onClick={() => setIsWelcomeModalOpen(true)}
                className="w-full sm:w-[380px] inline-flex flex-col items-center justify-center px-10 py-4 glass-md border border-electric-blue/30 text-white rounded-xl hover:border-electric-blue hover:text-white transition-all shadow-lg hover:shadow-electric-blue/10 bg-slate-900/40"
              >
                <span className="font-bold text-base flex items-center gap-2">
                  🎬 Judge Demo Mode
                </span>
                <span className="text-[10px] text-slate-400 mt-1 font-normal font-sans">
                  A guided walkthrough of CivicEye AI's complete workflow.
                </span>
              </button>
            </motion.div>
          </motion.div>

          {/* Horizontal Visual Workflow Storytelling */}
          <motion.div 
            className="relative max-w-5xl mx-auto pt-16 border-t border-white/5"
            variants={itemVariants}
          >
            {/* Animated SVG/CSS flowing pipeline background line */}
            <div className="absolute top-[80px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-electric-blue/5 via-electric-blue/30 to-electric-blue/5 hidden md:block flow-pulse-line z-0 pointer-events-none" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3 p-6 rounded-2xl glass-md hover:border-electric-blue/20 transition-all duration-300 group shadow-lg shadow-black/10">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-electric-blue shrink-0 group-hover:scale-105 group-hover:border-electric-blue/40 transition-all duration-300 z-10 relative">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-white group-hover:text-electric-blue transition-colors mb-1">1. Snap & File</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed opacity-85">
                    Submit a photo or describe the defect. Officer Gemini analyzes the incident details in seconds.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3 p-6 rounded-2xl glass-md hover:border-electric-blue/20 transition-all duration-300 group shadow-lg shadow-black/10">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-electric-blue shrink-0 group-hover:scale-105 group-hover:border-electric-blue/40 transition-all duration-300 z-10 relative">
                  <Cpu className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-white group-hover:text-electric-blue transition-colors mb-1">2. Verify & Route</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed opacity-85">
                    Our multi-agent routing instantly maps coordinates and dispatches directly to the responsible division.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3 p-6 rounded-2xl glass-md hover:border-electric-blue/20 transition-all duration-300 group shadow-lg shadow-black/10">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-electric-blue shrink-0 group-hover:scale-105 group-hover:border-electric-blue/40 transition-all duration-300 z-10 relative">
                  <Navigation className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-white group-hover:text-electric-blue transition-colors mb-1">3. Resolve & Track</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed opacity-85">
                    Monitor live updates, assigned engineers, and official resolution logs in your Operations Console.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Live Product Preview */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full">
        <div className="glass-lg rounded-[2rem] p-8 md:p-12 relative overflow-hidden group border border-white/10 shadow-2xl">
          <div className="absolute top-0 right-0 w-1/2 h-full pointer-events-none bg-gradient-to-l from-electric-blue/5 to-transparent"></div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Context */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2.5 glass-md px-4 py-2 rounded-full border-electric-blue/20">
                <span className="flex h-2 w-2 rounded-full bg-electric-blue animate-ping"></span>
                <span className="font-display text-[10px] text-electric-blue uppercase tracking-widest font-bold">
                  Live Network Status
                </span>
              </div>
              <h2 className="font-display text-2xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                Real-time awareness of your urban ecosystem.
              </h2>
              <p className="text-on-surface-variant leading-relaxed text-sm md:text-base">
                Our multi-agent system verifies image uploads, indexes local damage weights, maps jurisdictions, and logs resolution dispatches automatically.
              </p>
              
              {/* Quick Stat Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="flex items-center gap-4 p-4 glass-md rounded-2xl border-white/5 hover:border-electric-blue/30 transition-all duration-300">
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-electric-blue/10 shrink-0 text-electric-blue">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-display uppercase tracking-wider text-on-surface-variant font-bold">Civic Health Index</p>
                    <p className="font-display text-2xl font-bold text-electric-blue">82<span className="text-sm font-medium text-on-surface-variant/50">/100</span></p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 glass-md rounded-2xl border-white/5">
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 shrink-0 text-on-surface-variant">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-display uppercase tracking-wider text-on-surface-variant font-bold">Active Wards</p>
                    <p className="font-display text-2xl font-bold text-white">7 Wards</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Live Interface HUD Mockup */}
            <div className="shimmer-border rounded-2xl shadow-2xl">
              <div className="glass-lg p-6 space-y-6 rounded-2xl border border-white/10 relative overflow-hidden">
                {/* Laser scan lines */}
                <div className="scanning-line" />

                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h3 className="font-display text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Recent Incidents Feed
                  </h3>
                  <span className="text-[10px] font-mono text-electric-blue animate-pulse">
                    RECEIVING DATAFEED...
                  </span>
                </div>
                
                {/* List items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <div>
                        <p className="text-xs font-bold text-white">Structural Rift (Bridge)</p>
                        <p className="text-[9px] text-on-surface-variant font-mono">Westside Main Road • Critical</p>
                      </div>
                    </div>
                    <span className="text-[9px] text-on-surface-variant">2m ago</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <div>
                        <p className="text-xs font-bold text-white">Main Line Pipe Leakage</p>
                        <p className="text-[9px] text-on-surface-variant font-mono">Sector 4 Crossing • High</p>
                      </div>
                    </div>
                    <span className="text-[9px] text-on-surface-variant">12m ago</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <div>
                        <p className="text-xs font-bold text-white">Flickering Streetlight</p>
                        <p className="text-[9px] text-on-surface-variant font-mono">Sunset Avenue • Medium</p>
                      </div>
                    </div>
                    <span className="text-[9px] text-on-surface-variant">45m ago</span>
                  </div>
                </div>

                {/* Map snippet representation */}
                <div className="pt-2 border-t border-white/5">
                  <div className="h-28 w-full rounded-lg overflow-hidden relative border border-white/5">
                    <img
                      className="w-full h-full object-cover opacity-60 mix-blend-luminosity hover:opacity-85 transition-opacity"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmwPckQKiiVSABXh0uODDoT4KycSHEsXX1SOLvlxjqsxN2JggaWpCdDyQNkL3DkNw4cqzdfmhUOJMf_QzalAPkJr-6qYBpeAbaFO2n9Qy5jZUiKVE9aq8ToTJ2vz2rak5fgEMlPuDzrS0DcLldkEQwz_bLi5ocV_djVELzI3ksaueMTWFIxtG-5YYM1Q-0iQZZFcUqfkhB2aG9oJ-oDVmOhG8OYEwn9t1xi8xtzk2AYfk6bfoPfSgFWUElw6RHSfDbnLrmfCozKKU-"
                      alt="Mini Map Preview"
                    />
                    <div className="absolute inset-0 bg-electric-blue/10 mix-blend-overlay"></div>
                    <div className="absolute top-1/2 left-1/3 w-3 h-3 rounded-full bg-electric-blue glow-dot animate-ping" />
                    <div className="absolute bottom-1/3 right-1/4 w-3 h-3 rounded-full bg-rose-500 glow-dot animate-ping" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-16 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Precision Governance.
          </h2>
          <p className="text-on-surface-variant text-base">
            Our specialized multi-agent neural network coordinates municipal responses from snap to patch.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <motion.div 
            className="glass-md p-8 rounded-[2rem] group hover:border-electric-blue/20 hover:scale-[1.02] transition-all duration-500 relative overflow-hidden flex flex-col justify-between min-h-[260px] glass-hover-glow shadow-xl shadow-black/10"
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-electric-blue/5 rounded-full blur-2xl group-hover:bg-electric-blue/15 transition-colors"></div>
            <div className="mb-6 w-12 h-12 rounded-2xl bg-electric-blue/10 flex items-center justify-center text-electric-blue shrink-0">
              <Eye className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2 group-hover:text-electric-blue transition-colors">
                AI Vision Analysis
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Visual models analyze photos instantly, verifying structure damage and flagging category types with detailed severity matrices.
              </p>
            </div>
          </motion.div>

          {/* Feature 2 */}
          <motion.div 
            className="glass-md p-8 rounded-[2rem] group hover:border-electric-blue/20 hover:scale-[1.02] transition-all duration-500 relative overflow-hidden flex flex-col justify-between min-h-[260px] glass-hover-glow shadow-xl shadow-black/10"
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: shouldReduceMotion ? 0 : 0.1, ease: "easeOut" }}
          >
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-[#00F0FF]/5 rounded-full blur-2xl group-hover:bg-[#00F0FF]/15 transition-colors"></div>
            <div className="mb-6 w-12 h-12 rounded-2xl bg-[#00F0FF]/10 flex items-center justify-center text-[#00F0FF] shrink-0">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2 group-hover:text-[#00F0FF] transition-colors">
                Intelligent Synthesis
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Converts citizen inputs and visual clues into structured legal drafts ready for municipal administration portals in real-time.
              </p>
            </div>
          </motion.div>

          {/* Feature 3 */}
          <motion.div 
            className="glass-md p-8 rounded-[2rem] group hover:border-electric-blue/20 hover:scale-[1.02] transition-all duration-500 relative overflow-hidden flex flex-col justify-between min-h-[260px] glass-hover-glow shadow-xl shadow-black/10"
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
          >
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-electric-blue/5 rounded-full blur-2xl group-hover:bg-electric-blue/15 transition-colors"></div>
            <div className="mb-6 w-12 h-12 rounded-2xl bg-electric-blue/10 flex items-center justify-center text-electric-blue shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2 group-hover:text-electric-blue transition-colors">
                Authority Routing
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Smart dispatch algorithms assign tickets straight to the responsible ward division and logistics squad, reducing idle response times.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full">
        <div className="glass-lg rounded-[2.5rem] p-12 md:p-24 text-center space-y-8 relative overflow-hidden border border-white/5 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,209,255,0.06)_0%,transparent_70%)] pointer-events-none" />
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-white leading-tight">
            Ready to <span className="bg-gradient-to-r from-electric-blue to-[#00F0FF] bg-clip-text text-transparent">transform</span> your city?
          </h2>
          <p className="text-on-surface-variant text-sm sm:text-base max-w-xl mx-auto">
            Join other local watchdogs reporting defects, coordinating with departments, and auditing public resources.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div
              whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
              className="w-full sm:w-auto"
            >
              <Link
                href="/report"
                className="w-full sm:w-auto px-9 py-3.5 bg-white text-slate-950 rounded-full font-bold text-sm shadow-xl hover:bg-slate-100 transition-all block text-center"
              >
                Get Started
              </Link>
            </motion.div>
            
            <motion.div
              whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
              className="w-full sm:w-auto"
            >
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-9 py-3.5 border border-white/10 rounded-full font-bold text-sm glass-md hover:border-electric-blue/40 hover:text-white transition-all block text-center"
              >
                Explore Dashboard
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Welcome Overlay Modal */}
      <AnimatePresence>
        {isWelcomeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative max-w-2xl w-full glass-lg border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col gap-6 text-left max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsWelcomeModalOpen(false)}
                className="absolute top-6 right-6 p-2 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-full transition-all"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-blue/10 border border-electric-blue/20 text-[10px] font-mono tracking-widest text-electric-blue uppercase">
                  🎬 Guided Walkthrough
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Welcome to Judge Demo Mode
                </h3>
                <p className="text-sm text-slate-400 font-medium">
                  Experience the complete AI-powered civic reporting workflow of CivicEye AI (Citizen Report → AI Analysis → AI Orchestration → Generated Report → Dashboard) in just 30–45 seconds.
                </p>
              </div>

              {/* Scenario Selector */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Choose a Demo Scenario
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {demoScenarios.map((scen) => {
                    const isSelected = selectedScenario === scen.type;
                    return (
                      <button
                        key={scen.type}
                        type="button"
                        onClick={() => setSelectedScenario(scen.type)}
                        className={`text-left p-4 rounded-2xl glass-md border transition-all duration-300 flex flex-col justify-between h-[120px] ${
                          isSelected
                            ? "border-electric-blue bg-electric-blue/5 shadow-[0_0_15px_rgba(0,209,255,0.15)]"
                            : "border-white/5 hover:border-white/20 bg-slate-900/40"
                        }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className={`text-xs font-bold ${isSelected ? "text-electric-blue" : "text-white"}`}>
                            {scen.label}
                          </span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSelected ? "border-electric-blue bg-electric-blue" : "border-slate-600"
                          }`}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-mono line-clamp-1">{scen.location}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 italic font-sans">
                            "{scen.description}"
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3.5 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setIsWelcomeModalOpen(false);
                    router.push("/report");
                  }}
                  className="w-full sm:w-auto px-6 py-3 border border-white/10 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all text-center"
                >
                  Explore Manually
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsWelcomeModalOpen(false);
                    startDemo(selectedScenario);
                  }}
                  className="w-full sm:w-auto px-7 py-3 bg-electric-blue text-slate-950 hover:brightness-110 font-bold rounded-xl text-sm transition-all shadow-lg shadow-electric-blue/20 text-center"
                >
                  ▶ Start Guided Demo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
