import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bluetooth, X, Wifi, WifiOff, Signal } from 'lucide-react';

export default function MeshModal({ open, onClose }) {
  const [tick, setTick] = useState(0);
  const [packetIdx, setPacketIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    const i = setInterval(() => setTick(t => t + 1), 600);
    const j = setInterval(() => setPacketIdx(p => (p + 1) % 8), 400);
    return () => { clearInterval(i); clearInterval(j); };
  }, [open]);

  const nodes = useMemo(() => {
    const arr = [];
    // Hub
    arr.push({ id: 'hub', x: 300, y: 160, type: 'gateway', label: 'GATEWAY' });
    // Inner ring
    for (let i = 0; i < 6; i++) {
      arr.push({
        id: `s${i}`,
        x: 300 + Math.cos((i / 6) * Math.PI * 2) * 90,
        y: 160 + Math.sin((i / 6) * Math.PI * 2) * 60,
        type: 'staff',
        label: `S-0${i + 1}`,
      });
    }
    // Outer ring (guests)
    for (let i = 0; i < 12; i++) {
      arr.push({
        id: `g${i}`,
        x: 300 + Math.cos((i / 12) * Math.PI * 2 + 0.2) * 180,
        y: 160 + Math.sin((i / 12) * Math.PI * 2 + 0.2) * 110,
        type: 'guest',
        label: `B-${(i + 1).toString().padStart(2, '0')}`,
      });
    }
    return arr;
  }, []);

  const edges = useMemo(() => {
    const e = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (dist < 110) e.push([i, j, dist]);
      }
    }
    return e;
  }, [nodes]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            className="card rounded-2xl border border-blue-500/30 p-6 max-w-3xl w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <Bluetooth className="text-blue-400" size={18} />
                </div>
                <div>
                  <div className="text-lg font-display tracking-wider text-white">BLE MESH TOPOLOGY</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] mt-0.5">19 nodes · No infrastructure · Self-healing</div>
                </div>
              </div>
              <button onClick={onClose} className="tac-btn rounded-lg p-2 text-white/40 hover:text-white"><X size={16} /></button>
            </div>

            <div className="bg-black/50 rounded-xl border border-white/[0.06] aspect-[16/9] relative overflow-hidden">
              <svg viewBox="0 0 600 320" className="w-full h-full">
                <defs>
                  <radialGradient id="hubGlow">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </radialGradient>
                  <filter id="meshglow"><feGaussianBlur stdDeviation="2" /></filter>
                </defs>

                {/* Edges */}
                {edges.map(([i, j, dist], k) => {
                  const isActive = (k + tick) % 7 === 0;
                  return (
                    <line
                      key={k}
                      x1={nodes[i].x} y1={nodes[i].y}
                      x2={nodes[j].x} y2={nodes[j].y}
                      stroke={isActive ? '#3b82f6' : 'rgba(59, 130, 246, 0.12)'}
                      strokeWidth={isActive ? 1.5 : 0.8}
                      strokeDasharray={isActive ? '4 3' : '0'}
                    />
                  );
                })}

                {/* Hub glow */}
                <circle cx={nodes[0].x} cy={nodes[0].y} r="40" fill="url(#hubGlow)" />

                {/* Nodes */}
                {nodes.map((n, i) => {
                  const color = n.type === 'gateway' ? '#3b82f6' : n.type === 'staff' ? '#06b6d4' : '#fbbf24';
                  const r = n.type === 'gateway' ? 10 : n.type === 'staff' ? 7 : 5;
                  const isPacket = i === (packetIdx + 1);
                  return (
                    <g key={n.id}>
                      {n.type === 'gateway' && (
                        <circle cx={n.x} cy={n.y} r="20" fill={color} opacity="0.2" className="animate-ping" />
                      )}
                      {isPacket && (
                        <circle cx={n.x} cy={n.y} r="12" fill={color} opacity="0.4" />
                      )}
                      <circle cx={n.x} cy={n.y} r={r} fill={color} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                      <text x={n.x} y={n.y + r + 11} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="7" fontFamily="JetBrains Mono">{n.label}</text>
                    </g>
                  );
                })}

                {/* Floating data packet */}
                <circle r="3" fill="#10b981" filter="url(#meshglow)">
                  <animateMotion dur="3s" repeatCount="indefinite" path="M 480 270 Q 380 180 300 160" />
                </circle>
                <circle r="3" fill="#ef4444" filter="url(#meshglow)">
                  <animateMotion dur="2.4s" repeatCount="indefinite" path="M 120 270 Q 220 180 300 160" />
                </circle>
              </svg>

              <div className="absolute top-3 left-3 flex items-center gap-2 text-[10px] font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400">MESH HEALTHY</span>
                <span className="text-white/40">·</span>
                <span className="text-white/60">47ms relay</span>
                <span className="text-white/40">·</span>
                <span className="text-white/60">3 hops avg</span>
              </div>
              <div className="absolute bottom-3 right-3 flex gap-3 text-[10px] font-mono">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-blue-400">Gateway</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" /><span className="text-cyan-400">Staff Phone</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-amber-400">Guest Band</span></div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="card rounded-lg p-3">
                <div className="text-[9px] uppercase text-white/40 tracking-[0.15em]">Latency</div>
                <div className="text-2xl font-display text-blue-400 tabular">47<span className="text-sm text-white/40 ml-1">ms</span></div>
              </div>
              <div className="card rounded-lg p-3">
                <div className="text-[9px] uppercase text-white/40 tracking-[0.15em]">Hops</div>
                <div className="text-2xl font-display text-emerald-400 tabular">3<span className="text-sm text-white/40 ml-1">avg</span></div>
              </div>
              <div className="card rounded-lg p-3">
                <div className="text-[9px] uppercase text-white/40 tracking-[0.15em]">Throughput</div>
                <div className="text-2xl font-display text-white tabular">1.2<span className="text-sm text-white/40 ml-1">kb/s</span></div>
              </div>
              <div className="card rounded-lg p-3">
                <div className="text-[9px] uppercase text-white/40 tracking-[0.15em]">Coverage</div>
                <div className="text-2xl font-display text-cyan-400 tabular">100<span className="text-sm text-white/40 ml-1">%</span></div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3 text-[11px] text-white/50 leading-relaxed">
              <WifiOff size={14} className="text-white/30 flex-shrink-0 mt-0.5" />
              <div>
                Each guest band, staff phone and anchor beacon relays SOS device-to-device over Bluetooth Low Energy.
                When WiFi and cellular fail, the mesh continues operating. The gateway syncs to dispatch when one node
                regains uplink — every node carries the SOS until then.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
