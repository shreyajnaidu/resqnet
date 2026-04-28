import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// Convert 2D floor coords (800x600 viewBox) to 3D space (centered, normalized)
const SCALE = 0.04; // 40px = 1.6 units
export const to3D = (x, y) => ({ x: (x - 400) * SCALE, z: (y - 300) * SCALE });

// === Single Zone (a 3D room with floor, walls, label) ===
export function Zone3D({ zone, isBlocked, isHighlight, density }) {
  const meshRef = useRef();
  const { x, z } = to3D(zone.x + zone.w / 2, zone.y + zone.h / 2);
  const w = zone.w * SCALE;
  const h = zone.h * SCALE;
  const wallHeight = 1.6;

  // Wall color
  const ratio = density != null ? Math.min(1, density / Math.max(1, zone.capacity)) : 0;
  let wallColor = '#2a313d';
  if (isBlocked) wallColor = '#ef4444';
  else if (isHighlight) wallColor = '#f59e0b';
  else if (ratio > 0.85) wallColor = '#dc2626';
  else if (ratio > 0.6) wallColor = '#f59e0b';

  return (
    <group position={[x, 0, z]}>
      {/* Floor */}
      <mesh receiveShadow position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color={isBlocked ? '#3a0a0a' : isHighlight ? '#3a2a0a' : '#0a0c10'}
          roughness={0.85}
          emissive={isBlocked ? '#ef4444' : '#000000'}
          emissiveIntensity={isBlocked ? 0.18 : 0}
        />
      </mesh>

      {/* Walls — translucent boxes outlining the room */}
      {[
        { p: [0, wallHeight / 2, -h / 2], s: [w, wallHeight, 0.06] },
        { p: [0, wallHeight / 2, h / 2], s: [w, wallHeight, 0.06] },
        { p: [-w / 2, wallHeight / 2, 0], s: [0.06, wallHeight, h] },
        { p: [w / 2, wallHeight / 2, 0], s: [0.06, wallHeight, h] },
      ].map((wall, i) => (
        <mesh key={i} position={wall.p} castShadow>
          <boxGeometry args={wall.s} />
          <meshStandardMaterial
            color={wallColor}
            transparent
            opacity={isBlocked ? 0.7 : isHighlight ? 0.5 : 0.25}
            roughness={0.7}
            emissive={isBlocked ? '#ef4444' : isHighlight ? '#f59e0b' : '#000000'}
            emissiveIntensity={isBlocked ? 0.4 : isHighlight ? 0.2 : 0}
          />
        </mesh>
      ))}

      {/* Label */}
      <Html position={[0, wallHeight + 0.1, 0]} center distanceFactor={12} occlude={false}>
        <div style={{
          background: 'rgba(0,0,0,0.85)',
          color: isBlocked ? '#ef4444' : 'white',
          padding: '2px 8px',
          borderRadius: '3px',
          fontSize: '9px',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          border: `1px solid ${isBlocked ? '#ef4444' : 'rgba(255,255,255,0.2)'}`,
        }}>
          {zone.name}{density != null && ` · ${Math.round(density)}/${zone.capacity}`}
        </div>
      </Html>
    </group>
  );
}

// === Exit (green glowing box with label) ===
export function Exit3D({ exit }) {
  const { x, z } = to3D(exit.x, exit.y);
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.material.emissiveIntensity = 0.6 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  return (
    <group position={[x, 0.5, z]}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[1.2, 1, 0.6]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.6}
          roughness={0.4}
        />
      </mesh>
      <Html position={[0, 0.9, 0]} center distanceFactor={10}>
        <div style={{
          background: 'rgba(16, 185, 129, 0.9)',
          color: 'black',
          padding: '2px 8px',
          borderRadius: '3px',
          fontSize: '9px',
          fontFamily: 'Bebas Neue, monospace',
          letterSpacing: '0.15em',
          fontWeight: 'bold',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {exit.name}
        </div>
      </Html>
    </group>
  );
}

// === Person (band/phone/staff/responder) ===
export function Person3D({ position, kind = 'band', label, evacuated }) {
  const ref = useRef();
  const initialY = position[1] || 0.4;

  // kind colors
  const colors = {
    band: '#10b981',     // green - guardian band wearer (kid/elderly)
    phone: '#3b82f6',    // blue - phone app user (regular adult)
    staff: '#06b6d4',    // cyan - hotel staff
    responder: '#ef4444',// red - emergency responder
  };
  const color = colors[kind] || '#3b82f6';

  useFrame((state) => {
    if (!ref.current) return;
    // Bobbing motion
    ref.current.position.y = initialY + Math.sin(state.clock.elapsedTime * 2 + position[0] * 5) * 0.05;
  });

  return (
    <group position={position}>
      {/* Body — distinct shape per kind */}
      {kind === 'phone' ? (
        // Phone users: rectangular cuboid
        <mesh ref={ref} castShadow>
          <boxGeometry args={[0.18, 0.5, 0.18]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
        </mesh>
      ) : kind === 'responder' ? (
        // Responders: tall + emissive
        <mesh ref={ref} castShadow>
          <cylinderGeometry args={[0.12, 0.16, 0.6, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
      ) : (
        // Bands & staff: sphere
        <mesh ref={ref} castShadow>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Ground ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.22, 0.32, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>

      {/* Band wearers get an extra outer pulse ring */}
      {kind === 'band' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <ringGeometry args={[0.36, 0.42, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.25} />
        </mesh>
      )}

      {label && (
        <Html position={[0, 0.7, 0]} center distanceFactor={12}>
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            color,
            padding: '1px 5px',
            borderRadius: '2px',
            fontSize: '8px',
            fontFamily: 'JetBrains Mono, monospace',
            border: `1px solid ${color}`,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>{label}</div>
        </Html>
      )}
    </group>
  );
}

// === Hazard / fire marker ===
export function HazardMarker3D({ position, type = 'fire' }) {
  const ref = useRef();
  const ringRef = useRef();
  const color = type === 'fire' ? '#ef4444' : type === 'hazard' ? '#eab308' : '#f59e0b';

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(t * 4) * 0.15);
    if (ringRef.current) {
      const v = (t % 2) / 2;
      ringRef.current.scale.setScalar(0.5 + v * 4);
      ringRef.current.material.opacity = 0.8 - v * 0.8;
    }
  });

  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.4, 24, 24]} />
        <meshStandardMaterial emissive={color} emissiveIntensity={2} color={color} toneMapped={false} />
      </mesh>
      <pointLight color={color} intensity={3} distance={6} />
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.5, 0.55, 32]} />
        <meshBasicMaterial color={color} transparent />
      </mesh>
    </group>
  );
}

// === Safe route (animated dashed tube) ===
export function Route3D({ points }) {
  const ref = useRef();
  const curve = useMemo(() => {
    if (!points || points.length < 2) return null;
    const v3 = points.map(p => {
      const c = to3D(p.x, p.y);
      return new THREE.Vector3(c.x, 0.12, c.z);
    });
    return new THREE.CatmullRomCurve3(v3);
  }, [points]);

  useFrame((state) => {
    if (ref.current && ref.current.material.map) {
      ref.current.material.map.offset.x -= 0.01;
    }
  });

  if (!curve) return null;
  return (
    <mesh ref={ref}>
      <tubeGeometry args={[curve, 64, 0.08, 8, false]} />
      <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.6} transparent opacity={0.85} />
    </mesh>
  );
}
