/**
 * 🛡️ Guardian3D Component
 * ------------------------------------------------------------------------------
 * A solar-system style 3D visualization for the "Guardian Technology" feature.
 * The central "Sun" is the glassmorphic Famplus logo, and the "Planets" are 
 * health/security icons revolving in concentric, tilted circular orbits.
 * 
 * Depth sorting approach:
 * - The Sun's Html wrapper gets a fixed z-index of 10 (mid-range).
 * - Each Planet's Html wrapper imperatively sets z-index = 15 (front) or 5 (behind)
 *   directly via a ref inside useFrame — bypassing React state batching entirely.
 *   This is the only reliable method that works in both dev and production builds.
 * - The canvas wrapper uses `isolation: isolate` so the stacking context is fully
 *   contained and can never bleed into the fixed navbar above.
 * 
 * @module Guardian3D
 */
import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Sparkles as SparklesIcon, FileText, Users, ShieldCheck, Activity, HeartPulse, Stethoscope } from 'lucide-react';

const TILT_ANGLE = Math.PI / 2.8;

interface PlanetProps {
  Icon: any;
  radius: number;
  speed: number;
  offset: number;
  scale: number;
}

function Planet({ Icon, radius, speed, offset, scale }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  // Ref to the outermost wrapper div Drei injects for this <Html>
  const divRef = useRef<HTMLDivElement>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const theta = t * speed + offset;
    if (meshRef.current) {
      const x = radius * Math.cos(theta);
      const y = radius * Math.sin(theta) * Math.cos(TILT_ANGLE);
      // Negative z = behind the Sun (further from camera), positive z = in front
      const z = -radius * Math.sin(theta) * Math.sin(TILT_ANGLE);
      meshRef.current.position.set(x, y, z);

      // Imperatively update DOM z-index — no React state, no batching lag.
      // Sun is locked at z-index 10. Planets toggle between 5 (behind) and 15 (front).
      if (divRef.current) {
        // Drei wraps our content in a parent div we can reach via parentElement
        const wrapper = divRef.current.parentElement;
        if (wrapper) {
          wrapper.style.zIndex = z < 0 ? '5' : '15';
        }
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* zIndexRange is intentionally low [20,0] so icons never escape the canvas stacking context */}
      <Html center zIndexRange={[20, 0]}>
        <div
          ref={divRef}
          style={{ transform: `scale(${scale})` }}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-white/90 dark:bg-slate-900/90 border border-white/80 dark:border-slate-800/60 shadow-lg backdrop-blur-md text-primary hover:scale-110 hover:text-primary-dark transition-all duration-300 cursor-pointer select-none hover:shadow-primary/20"
        >
          <Icon size={20} strokeWidth={2} />
        </div>
      </Html>
    </mesh>
  );
}

function OrbitLine({ radius }: { radius: number }) {
  return (
    <mesh rotation={[-TILT_ANGLE, 0, 0]}>
      <torusGeometry args={[radius, 0.008, 8, 128]} />
      <meshBasicMaterial color="#cbd5e1" transparent opacity={0.3} />
    </mesh>
  );
}

function Sun({ scale }: { scale: number }) {
  return (
    <mesh>
      {/* Sun locked at z-index 10, so planets at 5 are behind and at 15 are in front */}
      <Html center zIndexRange={[20, 0]} style={{ zIndex: 10 }}>
        <div
          style={{ transform: `scale(${scale})` }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute w-56 h-56 rounded-full bg-gradient-to-r from-orange-400/25 to-amber-500/25 blur-3xl animate-pulse" />
          <div className="w-44 h-44 rounded-full backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border border-white/90 dark:border-slate-800/90 shadow-[0_8px_32px_rgba(249,115,22,0.18),inset_0_0_20px_rgba(255,255,255,0.4)] flex flex-col items-center justify-center select-none pointer-events-none">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary p-2.5 rounded-xl shadow-md">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-2xl tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
                Famplus
              </span>
            </div>
          </div>
        </div>
      </Html>
    </mesh>
  );
}

function Scene() {
  const { viewport } = useThree();
  const maxRadius = 3.9;
  const padding = 0.6;
  const desiredWidth = (maxRadius + padding) * 2;
  const scale = Math.min(1, viewport.width / desiredWidth);

  return (
    <group scale={[scale, scale, scale]}>
      <OrbitLine radius={1.8} />
      <OrbitLine radius={2.5} />
      <OrbitLine radius={3.2} />
      <OrbitLine radius={3.9} />

      <Sun scale={scale} />

      <Planet Icon={HeartPulse} radius={1.8} speed={0.5} offset={0} scale={scale} />

      <Planet Icon={Stethoscope} radius={2.5} speed={0.35} offset={Math.PI / 2} scale={scale} />
      <Planet Icon={SparklesIcon} radius={2.5} speed={0.35} offset={Math.PI * 1.5} scale={scale} />

      <Planet Icon={ShieldCheck} radius={3.2} speed={0.24} offset={Math.PI} scale={scale} />
      <Planet Icon={FileText} radius={3.2} speed={0.24} offset={0} scale={scale} />

      <Planet Icon={Activity} radius={3.9} speed={0.16} offset={Math.PI * 1.5} scale={scale} />
      <Planet Icon={Users} radius={3.9} speed={0.16} offset={Math.PI / 2} scale={scale} />
    </group>
  );
}

export function Guardian3D() {
  return (
    /*
     * isolation: isolate creates a new stacking context for this entire container.
     * This means z-index values inside can never compete with elements outside
     * (like the fixed navbar), no matter how high they go.
     */
    <div
      className="w-full h-[400px] lg:h-[500px] relative flex items-center justify-center overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-400/10 via-transparent to-indigo-500/5 rounded-[3rem] blur-3xl -z-10" />

      <Canvas camera={{ position: [0, 0, 7], fov: 45 }} className="w-full h-full pointer-events-auto">
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.2} color="#f97316" />
        <pointLight position={[-10, -10, -10]} intensity={0.6} color="#06b6d4" />

        <Scene />

        <Sparkles count={250} scale={[12, 8, 12]} size={3.2} speed={0.12} opacity={0.8} color="#f97316" />
        <Sparkles count={200} scale={[14, 9, 14]} size={2.6} speed={0.1} opacity={0.7} color="#38bdf8" />
        <Sparkles count={150} scale={[15, 10, 15]} size={2.0} speed={0.06} opacity={0.6} color="#ffffff" />
      </Canvas>
    </div>
  );
}
