import React, { useEffect, useRef } from 'react';
import { Activity, Stethoscope, ShieldCheck, HeartPulse, Plus } from 'lucide-react';

const ICONS = [Activity, Stethoscope, ShieldCheck, HeartPulse, Plus];
const NUM_ICONS = 90; // Optimized count for beautiful density with zero performance burden

export function AnimatedBackground() {
    const iconRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Physics state kept in a mutable ref to completely bypass React render cycles for performance
    const physics = useRef(
        Array.from({ length: NUM_ICONS }).map(() => ({
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000) + 500,
            vx: (Math.random() - 0.5) * 0.4, // Drift left/right
            vy: -(Math.random() * 0.8 + 0.4), // Float upwards
            radius: Math.random() * 16 + 14, // Icon size / 2
            iconIndex: Math.floor(Math.random() * ICONS.length),
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 1.5
        }))
    );

    useEffect(() => {
        let animationFrameId: number;
        const width = window.innerWidth;
        const height = window.innerHeight;

        const updatePhysics = () => {
            const state = physics.current;

            for (let i = 0; i < NUM_ICONS; i++) {
                const p = state[i];
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotSpeed;

                // Screen wrapping (if they float off the top, wrap to the bottom)
                if (p.y < -50) {
                    p.y = height + 50;
                    p.x = Math.random() * width;
                    p.vy = -(Math.random() * 0.8 + 0.4); // Reset upward velocity
                }
                
                // Wall bouncing (horizontal bounds)
                if (p.x < 0 || p.x > width) p.vx *= -1;

                // Collision detection (checks every pair to prevent overlapping)
                for (let j = i + 1; j < NUM_ICONS; j++) {
                    const p2 = state[j];
                    const dx = p2.x - p.x;
                    const dy = p2.y - p.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDist = p.radius + p2.radius + 10; // +10px padding so they don't clip

                    if (distance < minDist) {
                        // Simple elastic collision response
                        const angle = Math.atan2(dy, dx);
                        const sin = Math.sin(angle);
                        const cos = Math.cos(angle);

                        const v1 = p.vx * cos + p.vy * sin;
                        const v2 = p2.vx * cos + p2.vy * sin;

                        // Separate them immediately to prevent getting stuck
                        const overlap = minDist - distance;
                        p.x -= cos * (overlap / 2);
                        p.y -= sin * (overlap / 2);
                        p2.x += cos * (overlap / 2);
                        p2.y += sin * (overlap / 2);

                        // Exchange and dampen velocities (creates the "bounce")
                        const damping = 0.8;
                        p.vx -= cos * (v1 - v2) * damping;
                        p.vy -= sin * (v1 - v2) * damping;
                        p2.vx += cos * (v1 - v2) * damping;
                        p2.vy += sin * (v1 - v2) * damping;
                        
                        // Add a little spin on collision
                        p.rotSpeed = (Math.random() - 0.5) * 3;
                        p2.rotSpeed = (Math.random() - 0.5) * 3;
                    }
                }

                // Apply transforms directly to the DOM to avoid slow React state updates
                if (iconRefs.current[i]) {
                    iconRefs.current[i]!.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg)`;
                }
            }

            animationFrameId = requestAnimationFrame(updatePhysics);
        };

        animationFrameId = requestAnimationFrame(updatePhysics);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-orange-50 via-white to-orange-100 overflow-hidden pointer-events-none z-0">
            {/* Soft glowing orb behind */}
            <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-orange-300/30 rounded-full blur-[120px] mix-blend-overlay" />
            
            {physics.current.map((item, i) => {
                const IconComponent = ICONS[item.iconIndex];
                return (
                    <div 
                        key={i}
                        ref={(el) => (iconRefs.current[i] = el)}
                        className="absolute top-0 left-0 text-orange-500 drop-shadow-sm will-change-transform"
                        style={{ 
                            width: item.radius * 2, 
                            height: item.radius * 2,
                            opacity: 0.6
                        }}
                    >
                        <IconComponent size={item.radius * 2} strokeWidth={1.5} />
                    </div>
                );
            })}

            {/* Bright Glassmorphic Overlay for depth */}
            <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />
        </div>
    );
}
