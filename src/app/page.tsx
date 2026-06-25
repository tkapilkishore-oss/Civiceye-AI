"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Eye, ShieldAlert, Cpu, Landmark, Users, Award } from "lucide-react";
import * as THREE from "three";

export default function Home() {
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const shaderContainerRef = useRef<HTMLDivElement>(null);


  // Load WebGL background shader client-side
  useEffect(() => {
    if (!shaderContainerRef.current) return;

    const container = shaderContainerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(width / 2, height / 2) },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: `
        varying vec2 v_texCoord;
        void main() {
          v_texCoord = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        varying vec2 v_texCoord;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }

        void main() {
          vec2 uv = v_texCoord;
          vec2 centered_uv = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
          
          // Deep Midnight Base
          vec3 color = vec3(0.02, 0.03, 0.05);
          
          // Grid
          vec2 grid_uv = uv * 40.0;
          float grid = smoothstep(0.45, 0.5, abs(sin(grid_uv.x) * sin(grid_uv.y)));
          color += vec3(0.0, 0.4, 1.0) * grid * 0.02;
          
          // Noise cloud movement
          float n = noise(centered_uv * 3.0 - u_time * 0.2);
          color += vec3(0.0, 0.2, 0.4) * n * 0.15;
          
          // Mouse interaction glow
          vec2 mouse_uv = (u_mouse / u_resolution - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
          float dist = length(centered_uv - mouse_uv);
          float mouse_glow = 0.015 / (dist + 0.1);
          color += vec3(0.0, 0.6, 1.0) * mouse_glow;
          
          // Subtle Scanlines
          color *= 0.98 + 0.02 * sin(uv.y * u_resolution.y * 0.5);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let animationFrameId: number;
    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);
      uniforms.u_time.value = time * 0.001;
      renderer.render(scene, camera);
    };
    animate(0);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = rect.height - (e.clientY - rect.top);
      uniforms.u_mouse.value.set(x, y);
    };

    window.addEventListener("mousemove", handleMouseMove);

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

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
    const particleCount = 340;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
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
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x00d1ff,
      size: 0.6,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Create line connections between close particles
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x4285f4,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
    });

    let lineSegments = new THREE.LineSegments();
    scene.add(lineSegments);

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;

    // Mouse Tracking for Particle Interactions
    const mouse = { x: 0, y: 0, active: false };
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

      // Rotate entire constellation system based on cursor drift
      if (mouse.active) {
        targetRotationY = mouse.x * 0.25;
        targetRotationX = -mouse.y * 0.25;
      } else {
        targetRotationY = 0;
        targetRotationX = 0;
      }

      particles.rotation.y += (targetRotationY - particles.rotation.y) * 0.04 + 0.0008;
      particles.rotation.x += (targetRotationX - particles.rotation.x) * 0.04 + 0.0004;
      lineSegments.rotation.y = particles.rotation.y;
      lineSegments.rotation.x = particles.rotation.x;

      const posArr = posAttr.array as Float32Array;

      // Map mouse NDC coordinates to 3D space near coordinates
      const fovRad = (camera.fov * Math.PI) / 360;
      const halfHeight = 30 * Math.tan(fovRad);
      const halfWidth = halfHeight * (width / height);
      const mouseX3D = mouse.x * halfWidth;
      const mouseY3D = mouse.y * halfHeight;

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

      // Build connection lines dynamically
      const linePositions: number[] = [];
      for (let i = 0; i < particleCount; i++) {
        // Connect particles to each other
        for (let j = i + 1; j < particleCount; j++) {
          const dx = posArr[i * 3] - posArr[j * 3];
          const dy = posArr[i * 3 + 1] - posArr[j * 3 + 1];
          const dz = posArr[i * 3 + 2] - posArr[j * 3 + 2];
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < 64) { // Connect if distance < 8 units
            linePositions.push(posArr[i * 3], posArr[i * 3 + 1], posArr[i * 3 + 2]);
            linePositions.push(posArr[j * 3], posArr[j * 3 + 1], posArr[j * 3 + 2]);
          }
        }

        // Connect close particles to the mouse cursor directly (creates spiderweb/pull animation)
        if (mouse.active) {
          const dx = posArr[i * 3] - mouseVec.x;
          const dy = posArr[i * 3 + 1] - mouseVec.y;
          const dz = posArr[i * 3 + 2] - mouseVec.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < 10) {
            linePositions.push(posArr[i * 3], posArr[i * 3 + 1], posArr[i * 3 + 2]);
            linePositions.push(mouseVec.x, mouseVec.y, mouseVec.z);
          }
        }
      }

      scene.remove(lineSegments);
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(linePositions, 3)
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
    <div className="flex-1 flex flex-col bg-background text-on-surface overflow-x-hidden pt-20">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-6 md:px-12 overflow-hidden py-16">
        {/* WebGL Shader Background Layer */}
        <div
          ref={shaderContainerRef}
          className="absolute inset-0 z-[-1] pointer-events-none opacity-50 h-full w-full"
        />

        {/* Three.js Neural Network Layer */}
        <div
          ref={threeContainerRef}
          className="absolute inset-0 z-0 pointer-events-none opacity-40 h-full w-full"
        />

        {/* Ambient spotlight behind content */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-gradient-to-tr from-electric-blue/10 to-violet-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-entrance" style={{ animationDelay: "0.1s" }}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-white/5 backdrop-blur-md text-[11px] font-mono tracking-widest text-electric-blue uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-electric-blue animate-pulse"></span>
            Civic Intelligence Platform
          </div>

          {/* Heading */}
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-none">
            The future of <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-electric-blue via-[#00F0FF] to-violet-400 bg-clip-text text-transparent">
              civic intelligence.
            </span>
          </h1>

          {/* Subheading */}
          <p className="font-display text-base sm:text-xl text-on-surface-variant max-w-2xl mx-auto font-medium opacity-80 leading-relaxed">
            AI-powered civic reporting for a smarter, more resilient city. Log defects, track departmental dispatches, and audit ward scores.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link
              href="/report"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-electric-blue hover:brightness-110 active:scale-95 text-background rounded-xl font-bold text-base transition-all shadow-xl shadow-electric-blue/20"
            >
              <ShieldAlert className="h-5 w-5" />
              Report an Issue
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 glass-md text-on-surface hover:text-white hover:border-electric-blue/40 rounded-xl font-bold text-base transition-all"
            >
              View Dashboard
              <ArrowRight className="h-4 w-4 text-electric-blue" />
            </Link>
          </div>
        </div>
      </section>

      {/* Tech Stack Banner */}
      <section className="py-12 px-6 max-w-7xl mx-auto text-center border-t border-white/5 w-full">
        <p className="font-display text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-6 opacity-60">
          Powering Infrastructure with Next-Gen Tech
        </p>
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 md:gap-12 opacity-60 hover:opacity-90 transition-opacity">
          <div className="flex items-center gap-2 glass-md px-4 py-2 rounded-full border-white/5">
            <Cpu className="h-4 w-4 text-electric-blue" />
            <span className="font-display text-xs font-bold">Gemini AI</span>
          </div>
          <div className="flex items-center gap-2 glass-md px-4 py-2 rounded-full border-white/5">
            <span className="h-4 w-4 rounded-full bg-amber-500 block shrink-0" />
            <span className="font-display text-xs font-bold">Firebase</span>
          </div>
          <div className="flex items-center gap-2 glass-md px-4 py-2 rounded-full border-white/5">
            <span className="h-4 w-4 rounded-full bg-emerald-500 block shrink-0" />
            <span className="font-display text-xs font-bold">Google Maps</span>
          </div>
          <div className="flex items-center gap-2 glass-md px-4 py-2 rounded-full border-white/5">
            <Cpu className="h-4 w-4 text-violet-400" />
            <span className="font-display text-xs font-bold">AI Studio</span>
          </div>
          <div className="flex items-center gap-2 glass-md px-4 py-2 rounded-full border-white/5">
            <span className="h-4 w-4 rounded-full bg-electric-blue block shrink-0 animate-pulse" />
            <span className="font-display text-xs font-bold">Google Stitch</span>
          </div>
        </div>
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
                    <p className="font-display text-2xl font-bold text-white">6 Zones</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Live Interface HUD Mockup */}
            <div className="shimmer-border">
              <div className="glass-lg p-6 space-y-6 rounded-xl border border-white/10">
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
          <div className="glass-md p-8 rounded-[2rem] group hover:border-electric-blue/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[250px]">
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
          </div>

          {/* Feature 2 */}
          <div className="glass-md p-8 rounded-[2rem] group hover:border-electric-blue/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[250px]">
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
          </div>

          {/* Feature 3 */}
          <div className="glass-md p-8 rounded-[2rem] group hover:border-electric-blue/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[250px]">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-violet-600/5 rounded-full blur-2xl group-hover:bg-violet-600/15 transition-colors"></div>
            <div className="mb-6 w-12 h-12 rounded-2xl bg-violet-600/10 flex items-center justify-center text-violet-400 shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2 group-hover:text-violet-400 transition-colors">
                Authority Routing
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Smart dispatch algorithms assign tickets straight to the responsible ward division and logistics squad, reducing idle response times.
              </p>
            </div>
          </div>
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
            <Link
              href="/report"
              className="w-full sm:w-auto px-8 py-3 bg-white text-background rounded-full font-bold text-sm shadow-xl hover:bg-slate-100 transition-all active:scale-95"
            >
              Get Started
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3 border border-white/10 rounded-full font-bold text-sm glass-md hover:border-electric-blue/40 transition-all"
            >
              Explore Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
