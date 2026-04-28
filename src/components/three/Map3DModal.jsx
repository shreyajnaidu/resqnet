import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, ContactShadows } from '@react-three/drei';
import { X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zone3D, Exit3D, Person3D, HazardMarker3D, Route3D, to3D } from './SceneBits.jsx';
import { useStore } from '../../lib/store.js';
import { findNearestSafeExit, zoneCenter } from '../../lib/helpers.js';

export default function Map3DModal({ open, onClose }) {
  const zones = useStore(s => s.zones);
  const exits = useStore(s => s.exits);
  const families = useStore(s => s.families);
  const responders = useStore(s => s.responders);
  const incidents = useStore(s => s.incidents);
  const densities = useStore(s => s.densities);
  const activeId = useStore(s => s.activeIncidentId);
  const active = incidents.find(i => i.id === activeId && !i.endedAt);

  const blocked = active ? [active.zone] : [];
  const incidentZone = active?.zone;

  // Hazard marker position
  const hazardPos = useMemo(() => {
    if (!incidentZone || !zones.length) return null;
    const c = zoneCenter(zones, incidentZone);
    return [...Object.values(to3D(c.x, c.y)).slice(0, 1), 0.6, ...Object.values(to3D(c.x, c.y)).slice(1)];
  }, [incidentZone, zones]);

  // Better: compute hazard 3D pos cleanly
  const hazard3D = useMemo(() => {
    if (!incidentZone || !zones.length) return null;
    const c = zoneCenter(zones, incidentZone);
    const t = to3D(c.x, c.y);
    return { type: active?.type || 'fire', position: [t.x, 0.6, t.z] };
  }, [incidentZone, zones, active]);

  // Route: from lobby to nearest safe exit
  const route = useMemo(() => {
    if (!zones.length || !exits.length) return null;
    const r = findNearestSafeExit(zones, exits, 'lobby', blocked);
    if (!r) return null;
    const points = r.path.map(zid => zoneCenter(zones, zid));
    points.push({ x: r.exit.x, y: r.exit.y });
    return points;
  }, [zones, exits, blocked]);

  // People
  const people = useMemo(() => {
    if (!zones.length) return [];
    const arr = [];

    // Guests — band or phone
    families.flatMap(f => f.members || []).forEach(g => {
      const z = zones.find(zz => zz.id === g.zone);
      if (!z) return;
      const px = z.x + 15 + Math.random() * (z.w - 30);
      const py = z.y + 15 + Math.random() * (z.h - 30);
      const t = to3D(px, py);
      arr.push({
        kind: g.hasBand ? 'band' : 'phone',
        position: [t.x, 0.4, t.z],
        label: g.id.toUpperCase(),
        evacuated: g.evacuated,
        id: g.id,
      });
    });

    // Ambient guests for density
    zones.forEach(z => {
      const n = Math.floor(z.capacity / 10);
      for (let i = 0; i < n; i++) {
        const px = z.x + 10 + Math.random() * (z.w - 20);
        const py = z.y + 10 + Math.random() * (z.h - 20);
        const t = to3D(px, py);
        // Mostly phone users (adults), a few bands
        const isBand = Math.random() < 0.15;
        arr.push({
          kind: isBand ? 'band' : 'phone',
          position: [t.x, 0.4, t.z],
          id: `amb-${z.id}-${i}`,
        });
      }
    });

    // Responders
    responders.forEach(r => {
      const z = zones.find(zz => zz.id === r.zone);
      if (!z) return;
      const c = zoneCenter(zones, r.zone);
      const t = to3D(c.x, c.y);
      arr.push({
        kind: r.role === 'Fire' || r.role === 'Hazard' ? 'responder' : r.role === 'Medical' ? 'staff' : 'staff',
        position: [t.x, 0.4, t.z],
        label: r.id,
        id: r.id,
      });
    });

    return arr;
  }, [zones, families, responders]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black"
        >
          <Canvas shadows gl={{ antialias: true }} dpr={[1, 2]}>
            <PerspectiveCamera makeDefault position={[12, 14, 16]} fov={45} />
            <OrbitControls
              enableDamping
              dampingFactor={0.08}
              maxPolarAngle={Math.PI / 2.05}
              minDistance={5}
              maxDistance={50}
            />

            {/* Lights */}
            <ambientLight intensity={0.35} />
            <directionalLight
              position={[15, 25, 15]}
              intensity={1.0}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-left={-20}
              shadow-camera-right={20}
              shadow-camera-top={20}
              shadow-camera-bottom={-20}
            />
            <hemisphereLight intensity={0.2} groundColor="#000" />

            <Suspense fallback={null}>
              {/* Ground plane */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[60, 60]} />
                <meshStandardMaterial color="#06070a" roughness={0.95} />
              </mesh>

              {/* Tactical grid */}
              <Grid
                args={[60, 60]}
                cellSize={0.5}
                cellThickness={0.5}
                cellColor="#1a2030"
                sectionSize={2}
                sectionThickness={1}
                sectionColor="#3a4258"
                fadeDistance={30}
                fadeStrength={1}
                position={[0, 0.005, 0]}
              />

              {/* Zones */}
              {zones.map(z => (
                <Zone3D
                  key={z.id}
                  zone={z}
                  isBlocked={blocked.includes(z.id)}
                  isHighlight={false}
                  density={densities[z.id]}
                />
              ))}

              {/* Exits */}
              {exits.map(e => <Exit3D key={e.id} exit={e} />)}

              {/* People */}
              {people.map(p => (
                <Person3D key={p.id} {...p} />
              ))}

              {/* Hazard marker */}
              {hazard3D && <HazardMarker3D position={hazard3D.position} type={hazard3D.type} />}

              {/* Safe route */}
              {route && active && <Route3D points={route} />}

              <ContactShadows opacity={0.4} scale={50} blur={2.5} far={10} resolution={1024} color="#000" />
            </Suspense>
          </Canvas>

          {/* UI overlay */}
          <div className="absolute top-5 left-5 right-5 flex items-start justify-between pointer-events-none">
            <div className="pointer-events-auto">
              <div className="font-display tracking-[0.2em] text-3xl text-white">3D TACTICAL VIEW</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 mt-1">
                Drag to rotate · Scroll to zoom · Right-click to pan
              </div>
            </div>
            <button
              onClick={onClose}
              className="pointer-events-auto tac-btn rounded-lg px-4 py-2 text-white/80 hover:text-white flex items-center gap-2 backdrop-blur-md bg-black/50 border border-white/10"
            >
              <X size={16} /> Close 3D
            </button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-5 left-5 card border border-white/10 rounded-xl p-4 backdrop-blur-md bg-black/50">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold mb-2">Legend</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-1 ring-emerald-400/50" /><span className="text-emerald-300">Band wearer</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400" /><span className="text-blue-300">App user</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /><span className="text-cyan-300">Staff</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-red-300">Responder</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emerald-500" /><span className="text-emerald-300">Exit</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-red-500" /><span className="text-red-300">Hazard zone</span></div>
            </div>
          </div>

          {active && (
            <div className="absolute bottom-5 right-5 card border border-red-500/50 rounded-xl p-4 backdrop-blur-md bg-black/60">
              <div className="text-[10px] uppercase tracking-[0.2em] text-red-400 font-semibold mb-1">Live Incident</div>
              <div className="text-sm text-white capitalize font-bold">{active.type} · {active.zone.replace('_', ' ')}</div>
              <div className="text-[10px] text-white/50 font-mono mt-0.5">SEV {active.severity} · {Math.floor((Date.now() - active.startedAt) / 1000)}s elapsed</div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
