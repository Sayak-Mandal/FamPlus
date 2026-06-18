/**
 * 🛡️ Guardian3D Component
 * ------------------------------------------------------------------------------
 * A premium, futuristic Three.js visualization for the "Guardian Technology" feature.
 * Uses nested rotating wireframe geometries, floating telemetry rings, dual-color 
 * data sparkles, and a high-tech glassmorphic core HUD indicating real-time system checks.
 * 
 * @module Guardian3D
 */
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Activity, Stethoscope, ShieldCheck, HeartPulse } from 'lucide-react';

function FloatingIcon({ Icon, position, delay }: { Icon: any, position: [number, number, number], delay: number }) {
  return (
    <Float speed={1.8} rotationIntensity={0.6} floatIntensity={1.4} floatingRange={[-0.25, 0.25]}>
      <mesh position={position}>
        <Html center zIndexRange={[0, 0]}>
          <div className="flex items-center justify-center p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-white/80 dark:border-slate-800/40 shadow-md backdrop-blur-md text-primary/80 transition-all duration-500 hover:scale-110 hover:text-primary hover:border-primary/40 dark:hover:border-primary/40 group cursor-pointer select-none">
            <Icon size={24} strokeWidth={1.8} className="transition-transform duration-500 group-hover:rotate-[360deg]" />
          </div>
        </Html>
      </mesh>
    </Float>
  );
}

function GlowingCore() {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (outerRef.current) {
      outerRef.current.rotation.x = t * 0.12;
      outerRef.current.rotation.y = t * 0.18;
    }
    if (innerRef.current) {
      innerRef.current.rotation.x = -t * 0.18;
      innerRef.current.rotation.y = -t * 0.24;
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = t * 0.25;
      ring1Ref.current.rotation.y = t * 0.15;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = -t * 0.15;
      ring2Ref.current.rotation.y = t * 0.3;
      ring2Ref.current.rotation.z = t * 0.08;
    }
  });

  return (
    <Float speed={2.5} rotationIntensity={1.2} floatIntensity={1.8}>
      {/* Outer Icosahedron Wireframe - Brand Orange */}
      <mesh ref={outerRef}>
        <icosahedronGeometry args={[2.5, 1]} />
        <meshBasicMaterial 
          color="#f97316"
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Inner Dodecahedron Wireframe - Futuristic Medical Teal/Cyan */}
      <mesh ref={innerRef}>
        <dodecahedronGeometry args={[1.8, 1]} />
        <meshBasicMaterial 
          color="#06b6d4"
          wireframe
          transparent
          opacity={0.45}
        />
      </mesh>

      {/* Telemetry Ring 1 - Vertical Purple Orbit */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[2.8, 0.015, 8, 64]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.35} />
      </mesh>

      {/* Telemetry Ring 2 - Tilted Cyan Orbit */}
      <mesh ref={ring2Ref} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <torusGeometry args={[3.1, 0.01, 8, 64]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.35} />
      </mesh>
      
      {/* Inner glassmorphism HUD console */}
      <mesh>
        <Html center zIndexRange={[100, 0]}>
          <div className="relative flex items-center justify-center">
            {/* Pulsing Outer HUD Rings */}
            <div className="absolute w-56 h-56 rounded-full border border-dashed border-primary/20 animate-[spin_40s_linear_infinite]" />
            <div className="absolute w-60 h-60 rounded-full border border-cyan-500/15 animate-[spin_60s_linear_infinite_reverse]" />
            
            {/* Main Premium Glass Panel */}
            <div className="w-48 h-48 rounded-full backdrop-blur-xl bg-white/60 dark:bg-slate-950/60 border border-white/60 dark:border-slate-800/60 shadow-[0_12px_40px_rgba(249,115,22,0.2),inset_0_0_20px_rgba(255,255,255,0.4)] flex flex-col items-center justify-center select-none pointer-events-none relative">
              {/* Monospace tech subtext at top */}
              <span className="absolute top-8 text-[8px] font-mono tracking-[0.25em] text-cyan-600 dark:text-cyan-400 font-bold uppercase">
                AI CORE // ONLINE
              </span>
              
              <div className="flex items-center gap-2.5">
                <div className="bg-primary/95 dark:bg-primary/90 p-2.5 rounded-xl shadow-lg shadow-primary/20">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="font-black text-2xl tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
                  Famplus
                </span>
              </div>

              {/* Status indicator dot at bottom */}
              <div className="absolute bottom-8 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute" />
                <span className="text-[7px] font-mono tracking-widest text-slate-400 dark:text-slate-500 font-bold uppercase">
                  SECURE SYS
                </span>
              </div>
            </div>
          </div>
        </Html>
      </mesh>
    </Float>
  );
}

export function Guardian3D() {
  return (
    <div className="w-full h-[400px] lg:h-[500px] relative flex items-center justify-center">
      {/* Ambient glow behind the canvas */}
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-400/20 via-transparent to-indigo-500/10 rounded-[3rem] blur-3xl -z-10" />
      
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }} className="w-full h-full pointer-events-auto">
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#f97316" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4f46e5" />
        
        {/* Corner Icons */}
        <FloatingIcon Icon={HeartPulse} position={[-2.8, 1.8, 0]} delay={0} />
        <FloatingIcon Icon={Stethoscope} position={[2.8, 1.8, 0]} delay={1} />
        <FloatingIcon Icon={ShieldCheck} position={[-2.8, -1.8, 0]} delay={2} />
        <FloatingIcon Icon={Activity} position={[2.8, -1.8, 0]} delay={3} />
        
        <GlowingCore />
        <Sparkles 
          count={150} 
          scale={7} 
          size={4} 
          speed={0.4} 
          opacity={0.7} 
          color="#f97316"
        />
        <Sparkles 
          count={150} 
          scale={7} 
          size={4} 
          speed={0.3} 
          opacity={0.7} 
          color="#06b6d4"
        />
      </Canvas>
    </div>
  );
}
