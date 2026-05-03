/**
 * 🛡️ Guardian3D Component
 * ------------------------------------------------------------------------------
 * A premium Three.js visualization for the "Guardian Technology" feature.
 * Uses a floating icosahedron wireframe with a glassmorphic core to represent 
 * the 'Cerebellum' of the AI system.
 * 
 * @module Guardian3D
 */
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Activity, Stethoscope, ShieldCheck, HeartPulse } from 'lucide-react';

function FloatingIcon({ Icon, position, delay }: { Icon: any, position: [number, number, number], delay: number }) {
  // Add a slight delay offset to the float so they don't all move in perfect sync
  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1.5} floatingRange={[-0.3, 0.3]}>
      <mesh position={position}>
        <Html center zIndexRange={[0, 0]}>
          <div className="text-orange-400/70 drop-shadow-sm transition-transform duration-500 hover:scale-110">
            <Icon size={32} strokeWidth={1.5} />
          </div>
        </Html>
      </mesh>
    </Float>
  );
}

function GlowingCore() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
      {/* Outer Wireframe */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[2.2, 1]} />
        <meshStandardMaterial 
          color="#f97316" // orange-500
          wireframe
          emissive="#fb923c" // orange-400
          emissiveIntensity={2}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Inner glassmorphism circle via HTML/CSS instead of 3D mesh */}
      <mesh>
        <Html center zIndexRange={[100, 0]}>
          <div className="w-52 h-52 rounded-full backdrop-blur-md bg-white/40 border border-white/50 shadow-[0_8px_32px_rgba(249,115,22,0.15)] flex flex-col items-center justify-center select-none pointer-events-none">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-2 rounded-xl shadow-md">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl tracking-tight text-slate-900 drop-shadow-sm">Famplus</span>
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
          count={300} 
          scale={8} 
          size={5} 
          speed={0.3} 
          opacity={0.8} 
          color="#f97316"
        />
      </Canvas>
    </div>
  );
}
