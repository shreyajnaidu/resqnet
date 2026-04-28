import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Lock, AlertCircle, UserCheck, Phone, Camera, Radio, Download } from 'lucide-react';
import { useStore } from '../../lib/store.js';
import { zoneCenter, TYPE_COLORS } from '../../lib/helpers.js';
import { emitResponderUpdate } from '../../lib/socket.js';
import { api } from '../../lib/api.js';
import { generateIncidentReport } from '../../lib/reportPdf.js';
import TopBar from '../../components/TopBar.jsx';
import FloorMap from '../../components/FloorMap.jsx';
import SOSBanner from '../../components/SOSBanner.jsx';

export default function EmployeeSecurity() {
  const navigate = useNavigate();
  const zones = useStore(s => s.zones);
  const exits = useStore(s => s.exits);
  const families = useStore(s => s.families);
  const responders = useStore(s => s.responders);
  const incidents = useStore(s => s.incidents);
  const session = useStore(s => s.session);
  const active = incidents.filter(i => i.type === 'security' && !i.endedAt).slice(-1)[0];

  const [silentMode, setSilentMode] = useState(false);
  const [tick, setTick] = useState(0);
  const [lockdown, setLockdown] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1500);
    return () => clearInterval(t);
  }, []);

  // Generate guest dots scattered through zones — band wearers and phone users shown differently
  const guestDots = useMemo(() => {
    if (!zones.length) return [];
    const arr = [];
    const allGuests = families.flatMap(f => f.members || []);
    allGuests.forEach(g => {
      const z = zones.find(zz => zz.id === g.zone);
      if (!z) return;
      const isBand = g.hasBand;
      arr.push({
        x: z.x + 15 + Math.random() * (z.w - 30),
        y: z.y + 15 + Math.random() * (z.h - 30),
        color: isBand ? '#10b981' : '#3b82f6', // green = band, blue = phone
        label: g.id.toUpperCase(),
        r: isBand ? 6 : 5,
        evacuated: g.evacuated,
        marker: isBand ? 'band' : 'phone',
      });
    });
    return arr;
  }, [zones, families, tick]);

  // Add ambient guests for density
  const ambientGuests = useMemo(() => {
    if (!zones.length) return [];
    const arr = [];
    zones.forEach(z => {
      const n = Math.floor(z.capacity / 10);
      for (let i = 0; i < n; i++) {
        arr.push({
          x: z.x + 10 + Math.random() * (z.w - 20),
          y: z.y + 10 + Math.random() * (z.h - 20),
          color: '#fbbf2480',
          r: 3,
        });
      }
    });
    return arr;
  }, [zones]);

  // Staff dots
  const staffDots = useMemo(() =>
    responders.filter(r => zones.length && r.zone).map(r => {
      const c = zoneCenter(zones, r.zone);
      return { ...c, color: '#06b6d4', label: r.id, r: 6, pulse: r.status === 'EN_ROUTE' };
    }),
  [responders, zones]);

  const restrictedZone = active?.zone || 'room_3';

  const dispatchSecurity = () => {
    responders.filter(r => r.role === 'Security').forEach(r => emitResponderUpdate({ id: r.id, status: 'EN_ROUTE', movement: 'moving', zone: restrictedZone }));
  };

  const triggerLockdown = () => {
    setLockdown(true);
    dispatchSecurity();
  };

  const endIncident = async () => {
    if (active) await api.endIncident(active.id);
    navigate('/employee');
  };

  const C = TYPE_COLORS.security;

  return (
    <div className="relative min-h-screen lg:h-screen flex flex-col">
      <TopBar zone="ALL ZONES" subtitle="Tactical · Security Response" showBack backTo="/employee" />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 lg:overflow-hidden">
        {/* MAP */}
        <div className="lg:col-span-8 relative card rounded-2xl border border-amber-500/20 overflow-hidden severity-security">
          {!silentMode && (
            <div className="absolute top-3 left-3 right-3 z-20">
              <SOSBanner type="SECURITY · UNAUTHORIZED ENTRY" severity={active?.severity || 3} location={restrictedZone.replace('_', ' ')} t={active?.startedAt || Date.now()} color="bg-black/70 border-amber-500/40" />
            </div>
          )}

          {silentMode && (
            <div className="absolute top-3 left-3 right-3 z-20 card border border-white/20 rounded-xl p-3 backdrop-blur-md flex items-center gap-3">
              <EyeOff className="text-white/60" size={16} />
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Silent Alert Mode</div>
                <div className="text-xs text-white/50">Guests unaware · Security dispatched discreetly · No PA / no banner</div>
              </div>
              <div className="text-[10px] text-white/40 font-mono">COVERT</div>
            </div>
          )}

          <FloorMap
            zones={zones}
            exits={exits}
            theme="amber"
            highlightedZone={restrictedZone}
            blocked={lockdown ? zones.map(z => z.id).filter(z => z !== restrictedZone) : []}
            dots={[...ambientGuests, ...guestDots, ...staffDots]}
          >
            {/* Restricted overlay */}
            {(() => {
              const z = zones.find(zz => zz.id === restrictedZone);
              if (!z) return null;
              return (
                <g key="restricted">
                  <rect x={z.x - 4} y={z.y - 4} width={z.w + 8} height={z.h + 8}
                    fill="rgba(245, 158, 11, 0.15)"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    rx="4"
                    className="animate-pulse" />
                  <text x={z.x + z.w / 2} y={z.y - 8} textAnchor="middle" fill="#f59e0b" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">RESTRICTED</text>
                </g>
              );
            })()}
          </FloorMap>

          <div className="absolute bottom-3 left-3 right-3 card border border-white/10 rounded-lg px-4 py-2 backdrop-blur-md flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider flex-wrap">
              <div className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Bands ({guestDots.filter(d => d.marker === 'band').length})</div>
              <div className="flex items-center gap-1.5 text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-400" /> Phone Users ({guestDots.filter(d => d.marker === 'phone').length})</div>
              <div className="flex items-center gap-1.5 text-cyan-400"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Staff ({staffDots.length})</div>
              <div className="flex items-center gap-1.5 text-amber-400"><span className="w-2 h-2 rounded-sm border border-amber-400" /> Restricted</div>
            </div>
            <div className="text-[10px] text-white/40 font-mono">REFRESH: {tick}s</div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-4 flex flex-col gap-3 overflow-y-auto">
          {/* Silent Alert toggle */}
          <div className="card border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {silentMode ? <EyeOff className="text-amber-400" size={14} /> : <Eye className="text-amber-400" size={14} />}
                  <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-semibold">Silent Alert Mode</div>
                </div>
                <div className="text-[11px] text-white/50">Discreet response — no panic triggers</div>
              </div>
              <button
                onClick={() => setSilentMode(!silentMode)}
                className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 ${silentMode ? 'bg-amber-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${silentMode ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Active alerts */}
          <div className="card border border-white/10 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 font-semibold">Active Alerts</div>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={14} />
                <div className="text-xs flex-1">
                  <div className="text-white font-semibold">Restricted entry — Room 103</div>
                  <div className="text-white/50 text-[10px] mt-0.5 font-mono">Band G-04 · 12s ago</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/5 border border-white/10">
                <UserCheck className="text-cyan-400 flex-shrink-0 mt-0.5" size={14} />
                <div className="text-xs flex-1">
                  <div className="text-white font-semibold">Child near pool unattended</div>
                  <div className="text-white/50 text-[10px] mt-0.5 font-mono">Guardian alert · G-01 · 47s ago</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/5 border border-white/10">
                <Camera className="text-white/60 flex-shrink-0 mt-0.5" size={14} />
                <div className="text-xs flex-1">
                  <div className="text-white font-semibold">Staff override — Reception</div>
                  <div className="text-white/50 text-[10px] mt-0.5 font-mono">Sgt. Mehta · acknowledged</div>
                </div>
              </div>
            </div>
          </div>

          {/* Security staff */}
          <div className="card border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">Security Staff</div>
              <button onClick={dispatchSecurity} className="text-[10px] uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2 py-1 rounded hover:bg-amber-500/25">Dispatch All</button>
            </div>
            <div className="space-y-2">
              {responders.filter(r => r.role === 'Security' || r.role === 'Fire').slice(0, 4).map(r => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-[10px] font-mono">{r.id}</div>
                    <div>
                      <div className="text-white">{r.name}</div>
                      <div className="text-[10px] text-white/40 capitalize">{(r.zone || '').replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className={`text-[10px] font-mono uppercase ${r.status === 'EN_ROUTE' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {r.status === 'EN_ROUTE' ? 'EN ROUTE' : 'PATROL'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="card border border-amber-500/30 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400 mb-2 font-semibold">Tactical Controls</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={triggerLockdown} className={`tac-btn rounded py-2 text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 ${lockdown ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'text-white/80'}`}>
                <Lock size={11} /> {lockdown ? 'Lockdown ON' : 'Lockdown'}
              </button>
              <button className="tac-btn rounded py-2 text-[10px] uppercase tracking-wider text-white/80 flex items-center justify-center gap-1.5"><Radio size={11} /> Track Band</button>
              <button className="tac-btn rounded py-2 text-[10px] uppercase tracking-wider text-white/80 flex items-center justify-center gap-1.5"><Phone size={11} /> Notify Police</button>
              <button className="tac-btn rounded py-2 text-[10px] uppercase tracking-wider text-white/80 flex items-center justify-center gap-1.5"><Camera size={11} /> Review Feed</button>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2">
            <button
              onClick={() => generateIncidentReport({
                incident: active,
                responders: responders.filter(r => r.role === 'Security'),
                families,
                reportedBy: session?.user?.name || 'Tactical Command',
              })}
              disabled={!active}
              className="py-4 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 text-white font-display tracking-[0.2em] text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={16} /> EXPORT PDF
            </button>
            <button onClick={endIncident} className="py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-display tracking-[0.25em] text-sm">
              ALL CLEAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
