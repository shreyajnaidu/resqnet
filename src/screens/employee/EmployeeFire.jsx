import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Flame, Volume2, Users, Clock, Activity, UserCheck, ChevronRight, Lock,
  Zap, RefreshCw, Compass, Target, X, Megaphone, Send, AlertCircle, Box, Download,
} from 'lucide-react';
import { useStore } from '../../lib/store.js';
import { findNearestSafeExit, zoneCenter, computePPSScore, ppsLabel, fmtTime, TYPE_COLORS } from '../../lib/helpers.js';
import { emitEvacStart, emitResponderUpdate } from '../../lib/socket.js';
import { api } from '../../lib/api.js';
import TopBar from '../../components/TopBar.jsx';
import FloorMap from '../../components/FloorMap.jsx';
import VoiceBanner from '../../components/VoiceBanner.jsx';
import SOSBanner from '../../components/SOSBanner.jsx';
import StatCard from '../../components/StatCard.jsx';
import Map3DModal from '../../components/three/Map3DModal.jsx';
import { generateIncidentReport } from '../../lib/reportPdf.js';

const VOICE_LINES = [
  'Turn right and proceed to Exit B.',
  'Avoid corridor ahead — fire detected.',
  'Stay low — smoke spreading from kitchen.',
  'Do not use elevators.',
  'Please exit through Exit B.',
];

export default function EmployeeFire() {
  const navigate = useNavigate();
  const zones = useStore(s => s.zones);
  const exits = useStore(s => s.exits);
  const incidents = useStore(s => s.incidents);
  const responders = useStore(s => s.responders);
  const families = useStore(s => s.families);
  const session = useStore(s => s.session);
  const pps = useStore(s => s.pps);
  const densities = useStore(s => s.densities);
  const activeIncidentId = useStore(s => s.activeIncidentId);
  const active = incidents.find(i => i.id === activeIncidentId && i.type === 'fire' && !i.endedAt) || incidents.filter(i => i.type === 'fire' && !i.endedAt).slice(-1)[0];

  const [tab, setTab] = useState('dispatch');
  const [eta, setEta] = useState(154);
  const [showVerify, setShowVerify] = useState(false);
  const [staggered, setStaggered] = useState(false);
  const [show3D, setShow3D] = useState(false);

  const incidentZone = active?.zone || 'kitchen';
  const blocked = useMemo(() => [incidentZone], [incidentZone]);

  const ppsScore = computePPSScore(pps?.predictions || []);
  const ppsInfo = ppsLabel(ppsScore);

  // Compute hazards positions from incident zone center
  const hazards = useMemo(() => {
    const z = zones.find(zz => zz.id === incidentZone);
    if (!z) return [];
    return [{ x: z.x + z.w / 2, y: z.y + z.h / 2, radius: 70 }];
  }, [zones, incidentZone]);

  const route = useMemo(() => {
    if (zones.length === 0 || exits.length === 0) return [];
    const r = findNearestSafeExit(zones, exits, 'lobby', blocked);
    if (!r) return [];
    const pts = r.path.map(zid => zoneCenter(zones, zid));
    pts.push({ x: r.exit.x, y: r.exit.y });
    return pts;
  }, [zones, exits, blocked]);

  // Responder dots
  const responderDots = useMemo(() => responders.filter(r => r.role === 'Fire' || r.status === 'EN_ROUTE').map(r => {
    const c = zoneCenter(zones, r.zone);
    return { x: c.x, y: c.y, color: '#ef4444', label: r.id, r: 6, pulse: true };
  }), [responders, zones]);

  // Guest dots — bands vs phones differentiated
  const guestDots = useMemo(() => {
    if (!zones.length) return [];
    const arr = [];
    families.flatMap(f => f.members || []).forEach(g => {
      const z = zones.find(zz => zz.id === g.zone);
      if (!z) return;
      const isBand = g.hasBand;
      arr.push({
        x: z.x + 15 + Math.random() * (z.w - 30),
        y: z.y + 15 + Math.random() * (z.h - 30),
        color: isBand ? '#10b981' : '#3b82f6',
        r: 4,
        evacuated: g.evacuated,
        marker: isBand ? 'band' : 'phone',
      });
    });
    return arr;
  }, [zones, families]);

  useEffect(() => {
    const t = setInterval(() => setEta(e => Math.max(0, e - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const allGuests = families.flatMap(f => f.members || []);
  const evacuated = allGuests.filter(g => g.evacuated).length;
  const total = allGuests.length;

  const fireResponders = responders.filter(r => r.role === 'Fire');

  const dispatchAll = () => {
    fireResponders.forEach(r => emitResponderUpdate({ id: r.id, status: 'EN_ROUTE', movement: 'moving', zone: incidentZone }));
  };

  const startStaggered = () => {
    setStaggered(true);
    if (active) emitEvacStart(active.id, 'STAGGERED');
  };

  const endIncident = async () => {
    if (active) await api.endIncident(active.id);
    setShowVerify(true);
  };

  const C = TYPE_COLORS.fire;

  return (
    <div className="relative min-h-screen lg:h-screen flex flex-col">
      <TopBar zone={(active?.zone || 'KITCHEN').toUpperCase()} subtitle="Tactical · Fire Response" showBack backTo="/employee" />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 lg:overflow-hidden">
        {/* MAP */}
        <div className="lg:col-span-8 relative card rounded-2xl border border-red-500/20 overflow-hidden severity-fire">
          <div className="absolute top-3 left-3 right-3 z-20">
            <SOSBanner type="FIRE" severity={active?.severity || 4} location={active?.zone || 'Kitchen'} t={active?.startedAt || Date.now()} color="bg-black/70 border-red-500/40" />
          </div>

          <div className="absolute top-24 right-4 z-10">
            <VoiceBanner lines={VOICE_LINES} color="text-red-400" />
          </div>

          {/* Live readouts on map */}
          <div className="absolute top-24 left-4 z-10 flex flex-col gap-2">
            <div className="card rounded-md px-3 py-1.5 backdrop-blur-md">
              <div className="text-[9px] uppercase tracking-wider text-white/40">PPS</div>
              <div className={`text-xl font-display tabular ${ppsInfo.color}`}>{ppsScore} <span className="text-[10px]">{ppsInfo.label}</span></div>
            </div>
            <div className="card rounded-md px-3 py-1.5 backdrop-blur-md">
              <div className="text-[9px] uppercase tracking-wider text-white/40">EVACUATED</div>
              <div className="text-xl font-display tabular text-emerald-400">{evacuated}<span className="text-xs text-white/40">/{total}</span></div>
            </div>
            <button onClick={() => setShow3D(true)} className="card border border-purple-500/40 rounded-md px-3 py-2 backdrop-blur-md text-purple-300 hover:text-white hover:border-purple-500/70 flex items-center gap-2 text-[10px] uppercase tracking-wider">
              <Box size={12} /> 3D View
            </button>
          </div>

          <FloorMap
            zones={zones}
            exits={exits}
            hazards={hazards}
            route={route}
            userPos={zoneCenter(zones, 'lobby')}
            theme="red"
            blocked={blocked}
            showDensity
            densities={densities}
            dots={[...guestDots, ...responderDots]}
          />

          <div className="absolute bottom-3 left-3 right-3 card border border-white/10 rounded-lg px-4 py-2 backdrop-blur-md flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider flex-wrap">
              <div className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-sm bg-red-500" /> Fire / Blocked</div>
              <div className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Safe Route</div>
              <div className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-emerald-400" /> Band</div>
              <div className="flex items-center gap-1.5 text-blue-400"><span className="w-2 h-2 rounded-sm bg-blue-400" /> App</div>
              <div className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500" /> Responder</div>
              <div className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-sm border border-emerald-500" /> Exit</div>
            </div>
            <div className="text-[10px] text-white/40 font-mono">FLOOR 1 · 800×600 · DENSITY ON</div>
          </div>
        </div>

        {/* RIGHT TACTICAL PANEL */}
        <div className="lg:col-span-4 flex flex-col gap-3 overflow-y-auto">
          {/* Tab strip */}
          <div className="flex items-center gap-1 card rounded-lg p-1 border border-white/10">
            {['dispatch', 'pps', 'control'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-[10px] uppercase tracking-[0.18em] rounded transition-colors ${tab === t ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
              >
                {t === 'dispatch' ? 'Dispatch' : t === 'pps' ? 'PPS Engine' : 'Override'}
              </button>
            ))}
          </div>

          {tab === 'dispatch' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="ETA" value={fmtTime(eta)} sub={`${fireResponders.length} responders`} accent="text-red-400" icon={Clock} />
                <StatCard label="PPS" value={ppsScore} sub={ppsInfo.label} accent={ppsInfo.color} icon={Activity} />
              </div>

              <div className="card border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">Evacuation Progress</div>
                  <Users size={14} className="text-white/30" />
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-3xl font-display text-white tabular">{evacuated}</div>
                  <div className="text-sm text-white/40">/ {total} bands tracked</div>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(evacuated / Math.max(1, total)) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <div className="card border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">Fire Response Team</div>
                  <button onClick={dispatchAll} className="text-[10px] uppercase tracking-wider bg-red-500/15 border border-red-500/30 text-red-300 px-2 py-1 rounded hover:bg-red-500/25 flex items-center gap-1">
                    <Send size={10} /> Dispatch All
                  </button>
                </div>
                <div className="space-y-2">
                  {fireResponders.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 text-[10px] font-mono">{r.id}</div>
                        <div>
                          <div className="text-white">{r.name}</div>
                          <div className="text-[10px] text-white/40 capitalize">{(r.zone || '').replace('_', ' ')}</div>
                        </div>
                      </div>
                      <div className={`text-[10px] font-mono uppercase ${r.status === 'EN_ROUTE' ? 'text-amber-400' : r.status === 'IDLE' ? 'text-white/40' : 'text-emerald-400'}`}>
                        {r.status === 'EN_ROUTE' ? 'EN ROUTE' : r.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'pps' && (
            <div className="card border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="text-amber-400" size={14} />
                <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-semibold">Panic Propagation Score</div>
              </div>
              <div className="text-[11px] text-white/50 mb-3">Predicting crowd flow into adjacent zones to stage evacuation.</div>

              {pps?.predictions?.length ? pps.predictions.map(p => {
                const ratio = Math.min(1, p.predictedDensity / Math.max(1, p.capacity));
                const action = pps.actions?.find(a => a.zoneId === p.zoneId);
                return (
                  <div key={p.zoneId} className="mb-2 last:mb-0">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <div className="text-white capitalize">{p.zoneName}</div>
                      <div className={`font-mono uppercase ${action?.action === 'EVACUATE_NOW' ? 'text-red-400' : action?.action === 'HOLD_30S' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {action?.action?.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${ratio * 100}%`, background: ratio > 0.85 ? '#ef4444' : ratio > 0.6 ? '#f59e0b' : '#10b981' }} />
                    </div>
                    <div className="text-[9px] text-white/40 font-mono mt-0.5">{p.currentDensity} → {p.predictedDensity} / {p.capacity}</div>
                  </div>
                );
              }) : <div className="text-xs text-white/30 py-4 text-center">Awaiting density telemetry...</div>}

              <button onClick={startStaggered} className={`mt-3 w-full py-2 text-[10px] uppercase tracking-wider rounded ${staggered ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' : 'bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25'}`}>
                {staggered ? '✓ Staggered Evac Active' : 'Start Staggered Evacuation'}
              </button>
            </div>
          )}

          {tab === 'control' && (
            <div className="card border border-amber-500/30 rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400 mb-2 font-semibold">Tactical Override</div>
              <div className="grid grid-cols-2 gap-2">
                <Btn icon={RefreshCw} onClick={() => api.escalate(active?.id)}>Escalate</Btn>
                <Btn icon={Compass}>Reroute Zone</Btn>
                <Btn icon={Lock}>Lock Exits</Btn>
                <Btn icon={Zap}>Force PPS</Btn>
                <Btn icon={Megaphone} className="col-span-2">PA Announcement</Btn>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10">
                <button onClick={endIncident} className="w-full py-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 rounded text-xs font-bold uppercase tracking-wider">
                  Mark Incident Resolved
                </button>
              </div>
            </div>
          )}

          {/* Bottom: actions row */}
          {!showVerify && (
            <div className="mt-auto grid grid-cols-2 gap-2">
              <button
                onClick={() => generateIncidentReport({
                  incident: active,
                  responders: responders.filter(r => r.role === 'Fire'),
                  families,
                  ppsScore,
                  reportedBy: session?.user?.name || 'Tactical Command',
                })}
                disabled={!active}
                className="py-4 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 text-white font-display tracking-[0.2em] text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download size={16} /> EXPORT PDF
              </button>
              <button
                onClick={endIncident}
                className="py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-display tracking-[0.25em] text-sm"
              >
                CONFIRM EVAC COMPLETE
              </button>
            </div>
          )}
        </div>
      </div>

      {showVerify && <VerifyModal evacuated={evacuated} total={total} onClose={() => { setShowVerify(false); navigate('/employee'); }} />}
      <Map3DModal open={show3D} onClose={() => setShow3D(false)} />
    </div>
  );
}

function Btn({ icon: Icon, children, className = '', onClick }) {
  return (
    <button onClick={onClick} className={`tac-btn rounded py-2 text-[10px] uppercase tracking-wider text-white/80 flex items-center justify-center gap-1.5 ${className}`}>
      {Icon && <Icon size={11} />}
      {children}
    </button>
  );
}

function VerifyModal({ evacuated, total, onClose }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCount(c => Math.min(total, c + Math.max(1, Math.floor(total / 30)))), 50);
    return () => clearInterval(t);
  }, [total]);
  const pct = total > 0 ? (count / total) * 100 : 100;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
    >
      <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="card border border-emerald-500/30 rounded-2xl p-10 max-w-lg w-full text-center">
        <div className="relative w-56 h-56 mx-auto mb-6">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 283} 283`} className="transition-all duration-100" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-display tabular text-emerald-400">{count}</div>
            <div className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">/ {total} accounted</div>
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-emerald-400 mb-2">Evacuation Verified</div>
        <h2 className="text-3xl font-display text-white mb-2">All Guests Safe</h2>
        <p className="text-sm text-white/50 mb-6">BLE exit-tracking confirmed unique band IDs at exit checkpoints.</p>
        <button onClick={onClose} className="px-8 py-3 bg-white text-black rounded-lg font-bold text-sm tracking-wider hover:bg-emerald-400 transition-colors">
          SYSTEM READY → COMMAND
        </button>
      </motion.div>
    </motion.div>
  );
}
