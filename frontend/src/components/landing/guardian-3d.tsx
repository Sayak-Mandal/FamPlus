/**
 * 🛡️ Guardian3D Component
 * ------------------------------------------------------------------------------
 * A solar-system style 3D visualization for the "Guardian Technology" feature.
 * The central "Sun" is the glassmorphic Famplus logo, and the "Planets" are 
 * health/security icons revolving in concentric, tilted circular orbits.
 * 
 * @module Guardian3D
 */
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Activity, Stethoscope, ShieldCheck, HeartPulse } from 'lucide-react';

const TILT_ANGLE = Math.PI / 2.8; // Beautiful 3D perspective tilt

interface PlanetProps {
  Icon: any;
  radius: number;
  speed: number;
  offset: number;
}

function Planet({ Icon, radius, speed, offset }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const theta = t * speed + offset;
    if (meshRef.current) {
      // Calculate coordinates on a circle tilted around the X-axis
      const x = radius * Math.cos(theta);
      const y = radius * Math.sin(theta) * Math.cos(TILT_ANGLE);
      const z = radius * Math.sin(theta) * Math.sin(TILT_ANGLE);
      meshRef.current.position.set(x, y, z);
    }
  });

  return (
    <mesh ref={meshRef}>
      <Html center>
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/90 dark:bg-slate-900/90 border border-white/80 dark:border-slate-800/60 shadow-lg backdrop-blur-md text-primary hover:scale-110 hover:text-primary-dark transition-all duration-300 cursor-pointer select-none hover:shadow-primary/20">
          <Icon size={20} strokeWidth={2} />
        </div>
      </Html>
    </mesh>
  );
}

function OrbitLine({ radius }: { radius: number }) {
  return (
    <mesh rotation={[TILT_ANGLE, 0, 0]}>
      <torusGeometry args={[radius, 0.008, 8, 128]} />
      <meshBasicMaterial color="#cbd5e1" transparent opacity={0.3} />
    </mesh>
  );
}

function Sun() {
  return (
    <mesh>
      <Html center zIndexRange={[100, 0]}>
        <div className="relative flex items-center justify-center">
          {/* Corona Glow */}
          <div className="absolute w-56 h-56 rounded-full bg-gradient-to-r from-orange-400/25 to-amber-500/25 blur-3xl animate-pulse" />
          
          {/* Sun Body - Glass Panel Logo */}
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

export function Guardian3D() {
  return (
    <div className="w-full h-[400px] lg:h-[500px] relative flex items-center justify-center">
      {/* Ambient glow behind the canvas */}
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-400/10 via-transparent to-indigo-500/5 rounded-[3rem] blur-3xl -z-10" />
      
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }} className="w-full h-full pointer-events-auto">
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.2} color="#f97316" />
        <pointLight position={[-10, -10, -10]} intensity={0.6} color="#06b6d4" />
        
        {/* Orbit Lines */}
        <OrbitLine radius={1.8} />
        <OrbitLine radius={2.5} />
        <OrbitLine radius={3.2} />
        <OrbitLine radius={3.9} />
        
        {/* Central Sun */}
        <Sun />
        
        {/* Revolving Planets (Icons) */}
        <Planet Icon={HeartPulse} radius={1.8} speed={0.5} offset={0} />
        <Planet Icon={Stethoscope} radius={2.5} speed={0.35} offset={Math.PI / 2} />
        <Planet Icon={ShieldCheck} radius={3.2} speed={0.24} offset={Math.PI} />
        <Planet Icon={Activity} radius={3.9} speed={0.16} offset={Math.PI * 1.5} />
        
        {/* Deep Space Star Background */}
        <Sparkles 
          count={120} 
          scale={9} 
          size={2.5} 
          speed={0.1} 
          opacity={0.4} 
          color="#f97316"
        />
        <Sparkles 
          count={80} 
          scale={9} 
          size={2.5} 
          speed={0.08} 
          opacity={0.3} 
          color="#cbd5e1"
        />
      </Canvas>
    </div>
  );
}
