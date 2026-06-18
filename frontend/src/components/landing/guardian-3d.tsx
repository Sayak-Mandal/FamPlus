/**
 * 🛡️ Guardian3D Component
 * ------------------------------------------------------------------------------
 * A solar-system style 3D visualization for the "Guardian Technology" feature.
 *
 * Architecture (avoids ALL Drei Html issues in production):
 * - Orbit lines + Sparkles live inside <Canvas> as normal Three.js geometry.
 * - Sun logo and planet icons are PLAIN DOM DIVS inside the container div.
 * - A child scene component (SceneController) uses useFrame + camera.project()
 *   to compute each icon's 2D screen position from its 3D world position, then
 *   IMPERATIVELY sets style.left / style.top / style.zIndex on the refs.
 * - z-index hierarchy: Sun = 10, planet in front = 15, planet behind = 5.
 * - Container uses overflow:hidden + isolation:isolate (belt-and-suspenders).
 *
 * @module Guardian3D
 */
import React, { useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import {
  Sparkles as SparklesIcon,
  FileText,
  Users,
  ShieldCheck,
  Activity,
  HeartPulse,
  Stethoscope,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────

const TILT_ANGLE = Math.PI / 2.8;

interface PlanetConfig {
  Icon: React.ElementType<any>;
  radius: number;
  speed: number;
  offset: number;
  orbit: number; // orbit ring radius (un-scaled)
}

const PLANET_CONFIGS: PlanetConfig[] = [
  { Icon: HeartPulse,  radius: 1.8, speed: 0.50, offset: 0,              orbit: 1.8 },
  { Icon: Stethoscope, radius: 2.5, speed: 0.35, offset: Math.PI / 2,    orbit: 2.5 },
  { Icon: SparklesIcon,radius: 2.5, speed: 0.35, offset: Math.PI * 1.5,  orbit: 2.5 },
  { Icon: ShieldCheck, radius: 3.2, speed: 0.24, offset: Math.PI,        orbit: 3.2 },
  { Icon: FileText,    radius: 3.2, speed: 0.24, offset: 0,              orbit: 3.2 },
  { Icon: Activity,    radius: 3.9, speed: 0.16, offset: Math.PI * 1.5,  orbit: 3.9 },
  { Icon: Users,       radius: 3.9, speed: 0.16, offset: Math.PI / 2,    orbit: 3.9 },
];

const ORBIT_RADII = [1.8, 2.5, 3.2, 3.9];

// ─────────────────────────────────────────────
// 3D: Orbit Torus Lines
// ─────────────────────────────────────────────

function OrbitLine({ radius }: { radius: number }) {
  return (
    <mesh rotation={[-TILT_ANGLE, 0, 0]}>
      <torusGeometry args={[radius, 0.008, 8, 128]} />
      <meshBasicMaterial color="#cbd5e1" transparent opacity={0.3} />
    </mesh>
  );
}

// ─────────────────────────────────────────────
// 3D: Scene Controller — projects 3D → 2D and updates DOM refs imperatively
// ─────────────────────────────────────────────

interface SceneControllerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  planetDivRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

function SceneController({ containerRef, planetDivRefs }: SceneControllerProps) {
  const { camera, viewport } = useThree();
  const _v = useRef(new THREE.Vector3());

  // Responsive scale: fit outermost orbit into viewport width
  const maxRadius = 3.9;
  const padding   = 0.6;
  const scale     = Math.min(1, viewport.width / ((maxRadius + padding) * 2));

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    PLANET_CONFIGS.forEach((cfg, i) => {
      const theta = t * cfg.speed + cfg.offset;
      const r = cfg.radius * scale;

      // 3D world-space position on a circle tilted around X by -TILT_ANGLE
      const wx = r * Math.cos(theta);
      const wy = r * Math.sin(theta) * Math.cos(TILT_ANGLE);
      const wz = -r * Math.sin(theta) * Math.sin(TILT_ANGLE); // negative = behind Sun

      // Project to Normalised Device Coordinates [-1, 1]
      _v.current.set(wx, wy, wz);
      _v.current.project(camera);

      // Convert NDC → pixel
      const px = (_v.current.x + 1) / 2 * w;
      const py = (-_v.current.y + 1) / 2 * h;

      const div = planetDivRefs.current[i];
      if (!div) return;

      // Use transform only — mixing left/top + transform causes conflicts.
      // translate(px,py) moves to the screen position; translate(-50%,-50%) centres the icon.
      div.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`;
      // wz < 0 → behind Sun (lower z-index), wz ≥ 0 → in front (higher z-index)
      div.style.zIndex = wz < 0 ? '5' : '15';
    });
  });

  return (
    <group scale={[scale, scale, scale]}>
      {ORBIT_RADII.map((r) => (
        <OrbitLine key={r} radius={r} />
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────

export function Guardian3D() {
  const containerRef  = useRef<HTMLDivElement>(null);
  const planetDivRefs = useRef<(HTMLDivElement | null)[]>(PLANET_CONFIGS.map(() => null));

  const setPlanetRef = useCallback(
    (i: number) => (el: HTMLDivElement | null) => {
      planetDivRefs.current[i] = el;
    },
    []
  );

  return (
    /**
     * isolation: isolate — creates a new stacking context for the whole block.
     * overflow: hidden   — clips any icon that strays outside the card.
     * These together mean planet icons can NEVER bleed into the navbar above.
     */
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      {/* ── Ambient background glow ─────────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-400/10 via-transparent to-indigo-500/5 rounded-[3rem] blur-3xl pointer-events-none" />

      {/* ── Sun / FamPlus logo ──────────────────────────────────────────── */}
      {/* Absolutely centred; z-index 10 = between planets behind (5) and planets in front (15) */}
      <div
        className="absolute"
        style={{
          top:       '50%',
          left:      '50%',
          transform: 'translate(-50%, -50%)',
          zIndex:    10,
        }}
      >
        <div className="relative flex items-center justify-center select-none pointer-events-none">
          {/* Corona glow */}
          <div className="absolute w-56 h-56 rounded-full bg-gradient-to-r from-orange-400/25 to-amber-500/25 blur-3xl animate-pulse" />
          {/* Logo card */}
          <div className="w-44 h-44 rounded-full backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border border-white/90 dark:border-slate-800/90 shadow-[0_8px_32px_rgba(249,115,22,0.18),inset_0_0_20px_rgba(255,255,255,0.4)] flex flex-col items-center justify-center">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary p-2.5 rounded-xl shadow-md">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-2xl tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
                FamPlus
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Planet icon overlays ────────────────────────────────────────── */}
      {/* Start off-screen; SceneController moves them to their correct position each frame */}
      {PLANET_CONFIGS.map((cfg, i) => {
        const { Icon } = cfg;
        return (
          // top:0 left:0 are the anchor — transform moves it to screen position each frame.
          // Initially translated far off-screen; first useFrame tick will correct it.
          <div
            key={i}
            ref={setPlanetRef(i)}
            className="absolute"
            style={{
              top:       0,
              left:      0,
              zIndex:    5,
              transform: 'translate(-9999px, -9999px)',
            }}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/90 dark:bg-slate-900/90 border border-white/80 dark:border-slate-800/60 shadow-lg backdrop-blur-md text-primary cursor-pointer select-none transition-shadow duration-300 hover:shadow-primary/20">
              <Icon size={20} strokeWidth={2} />
            </div>
          </div>
        );
      })}

      {/* ── Three.js Canvas ─────────────────────────────────────────────── */}
      {/* Only contains geometry (orbit tori + sparkles) and the controller.
          No <Html> components here — icons live in the DOM overlay above. */}
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        className="w-full h-full pointer-events-none absolute inset-0"
        style={{ zIndex: 1 }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.2} color="#f97316" />
        <pointLight position={[-10, -10, -10]} intensity={0.6} color="#06b6d4" />

        <SceneController
          containerRef={containerRef}
          planetDivRefs={planetDivRefs}
        />

        {/* Stars */}
        <Sparkles count={250} scale={[12, 8, 12]} size={3.2} speed={0.12} opacity={0.8} color="#f97316" />
        <Sparkles count={200} scale={[14, 9, 14]} size={2.6} speed={0.10} opacity={0.7} color="#38bdf8" />
        <Sparkles count={150} scale={[15, 10, 15]} size={2.0} speed={0.06} opacity={0.6} color="#ffffff" />
      </Canvas>
    </div>
  );
}
