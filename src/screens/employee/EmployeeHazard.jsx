import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Wind, Skull, Volume2, Send, Lock, Zap, Download } from 'lucide-react';
import { useStore } from '../../lib/store.js';
import { findNearestSafeExit, zoneCenter, TYPE_COLORS, fmtTime } from '../../lib/helpers.js';
import { emitResponderUpdate } from '../../lib/socket.js';
import { api } from '../../lib/api.js';
import { generateIncidentReport } from '../../lib/reportPdf.js';
import TopBar from '../../components/TopBar.jsx';
import FloorMap from '../../components/FloorMap.jsx';
import VoiceBanner from '../../components/VoiceBanner.jsx';
import SOSBanner from '../../components/SOSBanner.jsx';
import StatCard from '../../components/StatCard.jsx';

const VOICE_LINES = ['Avoid Kitchen — gas leak detected', 'Move toward the safe corridor', 'Predicted spread: Restaurant in 90s', 'Use Exit B — clear path'];

export default function EmployeeHazard() {
  const navigate = useNavigate();
  const zones = useStore(s => s.zones);
  const exits = useStore(s => s.exits);
  const responders = useStore(s => s.responders);
  const incidents = useStore(s => s.incidents);
  const hazardSpread = useStore(s => s.hazardSpread);
  const families = useStore(s => s.families);
  const session = useStore(s => s.session);
  const active = incidents.filter(i => i.type === 'hazard' && !i.endedAt).slice(-1)[0];

  const [spread, setSpread] = useState(40);
  const [tick, setTick] = useState(0);
  const [containedZones, setContainedZones] = useState(new Set());

  useEffect(() => {
    const t1 = setInterval(() => setSpread(s => Math.min(140, s + 1.5)), 600);
    const t2 = setInterval(() => setTick(t => t + 1), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  const incidentZone = active?.zone || 'kitchen';

  // Source position
  const sourcePos = useMemo(() => {
    const z = zones.find(zz => zz.id === incidentZone);
    return z ? { x: z.x + z.w / 2, y: z.y + z.h / 2 } : { x: 140, y: 225 };
  }, [zones, incidentZone]);

  const blocked = useMemo(() => {
    const set = new Set([incidentZone]);
    if (hazardSpread?.contaminated) hazardSpread.contaminated.forEach(z => set.add(z));
    return Array.from(set);
  }, [incidentZone, hazardSpread]);

  const route = useMemo(() => {
    if (zones.length === 0 || exits.length === 0) return [];
    const r = findNearestSafeExit(zones, exits, 'restaurant', blocked);
    if (!r) return [];
    const pts = r.path.map(zid => zoneCenter(zones, zid));
    pts.push({ x: r.exit.x, y: r.exit.y });
    return pts;
  }, [zones, exits, blocked]);

  const hazmatResponder = responders.find(r => r.role === 'Hazard');

  const dispatchHazmat = () => {
    if (hazmatResponder) emitResponderUpdate({ id: hazmatResponder.id, status: 'EN_ROUTE', movement: 'moving', zone: incidentZone });
  };

  const sealZone = (zoneId) => {
    setContainedZones(prev => new Set([...prev, zoneId]));
  };

  const cutGas = () => {
    setSpread(s => Math.max(20, s - 30));
  };

  const endIncident = async () => {
    if (active) await api.endIncident(active.id);
    navigate('/employee');
  };

  const C = TYPE_COLORS.hazard;

  return (
    <div className="relative min-h-screen lg:h-screen flex flex-col">
      <TopBar zone={incidentZone.toUpperCase().replace('_', ' ')} subtitle="Tactical · Hazard Response" showBack backTo="/employee" />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 lg:overflow-hidden">
        {/* MAP */}
        <div className="lg:col-span-8 relative card rounded-2xl border border-yellow-500/20 overflow-hidden severity-hazard">
          <div className="absolute top-3 left-3 right-3 z-20">
            <SOSBanner type="HAZARD · GAS LEAK" severity={active?.severity || 4} location={incidentZone.replace('_', ' ')} t={active?.startedAt || Date.now()} color="bg-black/70 border-yellow-500/40" />
          </div>

          <div className="absolute top-24 right-4 z-10">
            <VoiceBanner lines={VOICE_LINES} color="text-yellow-400" />
          </div>

          <div className="absolute top-24 left-4 z-10 card rounded-md px-3 py-1.5 backdrop-blur-md">
            <div className="text-[9px] uppercase tracking-wider text-white/40">SPREAD RADIUS</div>
            <div className="text-xl font-display tabular text-yellow-400">{Math.round(spread)}<span className="text-[10px] text-white/40 ml-1">m · growing</span></div>
          </div>

          <FloorMap
            zones={zones}
            exits={exits}
            hazards={[
              { x: sourcePos.x, y: sourcePos.y, radius: spread },
              { x: sourcePos.x - 30, y: sourcePos.y + 20, radius: spread * 0.6 },
            ]}
            route={route}
            theme="yellow"
            blocked={blocked}
          >
            {/* Wind direction indicators */}
            <g opacity="0.7">
              {[0, 1, 2, 3].map(i => (
                <g key={i} transform={`translate(${sourcePos.x + 60 + i * 30}, ${sourcePos.y + 20 + i * 6})`}>
                  <path d="M 0 0 L 18 0 L 14 -4 M 18 0 L 14 4" stroke="#eab308" strokeWidth="1.6" fill="none" />
                </g>
              ))}
              <text x={sourcePos.x + 100} y={sourcePos.y - 5} fill="#eab308" fontSize="9" fontFamily="JetBrains Mono">WIND →</text>
            </g>
          </FloorMap>

          <div className="absolute bottom-3 left-3 right-3 card border border-white/10 rounded-lg px-4 py-2 backdrop-blur-md flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider flex-wrap">
              <div className="flex items-center gap-1.5 text-yellow-400"><span className="w-2 h-2 rounded-sm bg-yellow-500" /> Contaminated</div>
              <div className="flex items-center gap-1.5 text-yellow-300"><Wind size={10} /> Spread NE</div>
              <div className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Safe Route</div>
            </div>
            <div className="text-[10px] text-white/40 font-mono">ELAPSED: {fmtTime(tick)}</div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-4 flex flex-col gap-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Spread" value={`${Math.round(spread)}m`} sub="Growing 1.5m/s" accent="text-yellow-400" icon={Wind} />
            <StatCard label="Toxicity" value="HIGH" sub="LPG / Methane" accent="text-red-400" icon={Skull} />
          </div>

          {/* Predictive spread */}
          <div className="card border border-yellow-500/30 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-yellow-400 mb-3 font-semibold">Predictive Risk Spread</div>
            <div className="space-y-2">
              {[
                { t: '+30s', zone: 'Restaurant edge', color: 'text-yellow-300' },
                { t: '+60s', zone: 'Lobby entrance', color: 'text-amber-400' },
                { t: '+90s', zone: 'Corridor A', color: 'text-orange-400' },
                { t: '+120s', zone: 'Full ground floor', color: 'text-red-500' },
              ].map((p, i) => {
                const reached = tick > parseInt(p.t.replace(/[^0-9]/g, ''));
                return (
                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${reached ? 'bg-red-500 animate-pulse' : 'bg-white/30'}`} />
                      <span className="text-white/60 font-mono tabular">{p.t}</span>
                    </div>
                    <span className={`${p.color} ${reached ? 'font-semibold' : ''}`}>{p.zone}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hazmat */}
          <div className="card border border-white/10 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 font-semibold">Hazmat Response</div>
            {hazmatResponder ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
                  <Skull className="text-yellow-400" size={16} />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">{hazmatResponder.name}</div>
                  <div className="text-[10px] text-white/40">{hazmatResponder.status === 'IDLE' ? 'Suiting up · ETA 4:20' : `Status: ${hazmatResponder.status}`}</div>
                </div>
                <button onClick={dispatchHazmat} className="text-[10px] uppercase tracking-wider bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 px-2 py-1 rounded hover:bg-yellow-500/25 flex items-center gap-1">
                  <Send size={11} /> GO
                </button>
              </div>
            ) : <div className="text-xs text-white/30">No hazmat unit available.</div>}
          </div>

          {/* Controls */}
          <div className="card border border-amber-500/30 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400 mb-2 font-semibold">Tactical Controls</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={cutGas} className="tac-btn rounded py-2 text-[10px] uppercase tracking-wider text-white/80 flex items-center justify-center gap-1.5"><Zap size={11} /> Cut Gas Main</button>
              <button className="tac-btn rounded py-2 text-[10px] uppercase tracking-wider text-white/80 flex items-center justify-center gap-1.5"><Wind size={11} /> Activate Fans</button>
              <button onClick={() => sealZone(incidentZone)} className="tac-btn rounded py-2 text-[10px] uppercase tracking-wider text-white/80 flex items-center justify-center gap-1.5"><Lock size={11} /> Seal Zone</button>
              <button className="tac-btn rounded py-2 text-[10px] uppercase tracking-wider text-white/80 flex items-center justify-center gap-1.5"><AlertTriangle size={11} /> Call Hazmat</button>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2">
            <button
              onClick={() => generateIncidentReport({
                incident: active,
                responders: responders.filter(r => r.role === 'Hazard'),
                families,
                reportedBy: session?.user?.name || 'Tactical Command',
              })}
              disabled={!active}
              className="py-4 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 text-white font-display tracking-[0.2em] text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={16} /> EXPORT PDF
            </button>
            <button onClick={endIncident} className="py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-display tracking-[0.25em] text-sm">
              ZONE CLEARED
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
