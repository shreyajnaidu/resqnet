import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Flame, Plus, Shield, AlertTriangle, Bluetooth, Watch, Users, WifiOff,
  Activity, BarChart3, Radio, Map, ChevronRight, Play, Zap, Eye,
  ArrowUpRight, Cpu, Layers, Box, Brain, Sparkles,
} from 'lucide-react';
import { useStore } from '../../lib/store.js';
import { api } from '../../lib/api.js';
import TopBar from '../../components/TopBar.jsx';
import Pill from '../../components/Pill.jsx';
import MeshModal from '../../components/MeshModal.jsx';
import GuardianBandModal from '../../components/GuardianBandModal.jsx';
import Map3DModal from '../../components/three/Map3DModal.jsx';
import ResQBrainPanel from '../../components/ResQBrainPanel.jsx';

export default function EmployeeHome() {
  const navigate = useNavigate();
  const session = useStore(s => s.session);
  const incidents = useStore(s => s.incidents);
  const responders = useStore(s => s.responders);
  const families = useStore(s => s.families);
  const sosFeed = useStore(s => s.sosFeed);
  const escalations = useStore(s => s.escalations);
  const setActiveIncidentId = useStore(s => s.setActiveIncidentId);

  const [showMesh, setShowMesh] = useState(false);
  const [showBand, setShowBand] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [showBrain, setShowBrain] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const activeIncidents = incidents.filter(i => !i.endedAt);
  const allGuests = families.flatMap(f => f.members || []);
  const evacuated = allGuests.filter(g => g.evacuated).length;

  const trigger = async (type) => {
    const zone = type === 'fire' ? 'kitchen' : type === 'medical' ? 'pool' : type === 'security' ? 'room_3' : 'kitchen';
    await api.createIncident(type, zone, 4);
    navigate(`/employee/${type}`);
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <TopBar
        zone="ALL ZONES"
        subtitle="Tactical Command"
        right={
          <Pill color="border-amber-400/40 text-amber-300" dot>
            {session?.user?.role?.toUpperCase() || 'STAFF'}
          </Pill>
        }
      />

      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {/* Hero section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
          {/* Left: Big title */}
          <div className="lg:col-span-7">
            <div className="text-[11px] uppercase tracking-[0.4em] text-white/40 mb-3">Emergency Response System</div>
            <h1 className="text-6xl md:text-7xl font-display text-white mb-3" style={{ letterSpacing: '0.02em' }}>
              TACTICAL OVERRIDE
            </h1>
            <p className="text-sm text-white/50 max-w-xl">
              Activate any module to dispatch responders, route guests, and override floor protocols in real time.
              All actions are logged via mesh and reconciled when uplink resumes.
            </p>
          </div>

          {/* Right: live system gauges */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <Gauge label="Responders" value={responders.filter(r => r.status !== 'OFFLINE').length} sub="online" icon={Users} />
            <Gauge label="Active Incidents" value={activeIncidents.length} sub={activeIncidents.length ? 'engaged' : 'all clear'} icon={AlertTriangle} accent={activeIncidents.length ? 'text-red-400' : 'text-emerald-400'} />
            <Gauge label="Bands · App" value={`${allGuests.filter(g => g.hasBand).length} · ${allGuests.filter(g => !g.hasBand).length}`} sub="tracked" icon={Watch} />
            <Gauge label="Mesh Health" value="100%" sub="0 hops failed" icon={Bluetooth} accent="text-blue-400" />
          </div>
        </div>

        {/* 4 Emergency Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <ModuleCard idx="01" label="FIRE" sub="Tap to Trigger" desc="Evacuation routing & PPS engine" icon={Flame} color="red" onClick={() => trigger('fire')} />
          <ModuleCard idx="02" label="MEDICAL" sub="Tap to Trigger" desc="Guardian Band vitals & patient track" icon={Plus} color="cyan" onClick={() => trigger('medical')} />
          <ModuleCard idx="03" label="SECURITY" sub="Tap to Trigger" desc="Threat dashboard & lockdown" icon={Shield} color="amber" onClick={() => trigger('security')} />
          <ModuleCard idx="04" label="HAZARD" sub="Tap to Trigger" desc="Spread sim & contamination" icon={AlertTriangle} color="yellow" onClick={() => trigger('hazard')} />
        </div>

        {/* Bottom rows */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* SOS Feed */}
          <div className="lg:col-span-5 card rounded-xl border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className="text-red-400" size={16} />
                <div className="font-display tracking-wider text-sm">SOS FEED · LIVE</div>
              </div>
              <div className="text-[10px] text-white/40 font-mono">{sosFeed.length}</div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sosFeed.length === 0 ? (
                <div className="text-sm text-white/30 py-6 text-center">No active SOS — all clear.</div>
              ) : sosFeed.slice(0, 8).map(s => (
                <div key={s.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div className="w-7 h-7 rounded-md bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-mono text-red-400">SOS</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white">{s.type?.toUpperCase()} · <span className="text-white/60 capitalize">{(s.zone || '').replace('_', ' ')}</span></div>
                    <div className="text-[10px] text-white/40 font-mono mt-0.5">{new Date(s.t).toLocaleTimeString()} · src: {s.source || 'manual'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active incidents */}
          <div className="lg:col-span-4 card rounded-xl border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-400" size={16} />
                <div className="font-display tracking-wider text-sm">ACTIVE INCIDENTS</div>
              </div>
              <div className="text-[10px] text-white/40 font-mono">{activeIncidents.length}</div>
            </div>
            <div className="space-y-2">
              {activeIncidents.length === 0 ? (
                <div className="text-sm text-white/30 py-6 text-center">All systems nominal.</div>
              ) : activeIncidents.map(inc => (
                <button
                  key={inc.id}
                  onClick={() => { setActiveIncidentId(inc.id); navigate(`/employee/${inc.type}`); }}
                  className="w-full tac-btn rounded-lg p-3 text-left flex items-center gap-3"
                >
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${inc.type === 'fire' ? 'bg-red-500/15 text-red-400' : inc.type === 'medical' ? 'bg-cyan-500/15 text-cyan-400' : inc.type === 'security' ? 'bg-amber-500/15 text-amber-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                    {inc.type === 'fire' ? <Flame size={14} /> : inc.type === 'medical' ? <Plus size={14} /> : inc.type === 'security' ? <Shield size={14} /> : <AlertTriangle size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white capitalize">{inc.type} · {inc.zone}</div>
                    <div className="text-[10px] text-white/40 font-mono">SEV {inc.severity} · {Math.floor((Date.now() - inc.startedAt) / 1000)}s elapsed</div>
                  </div>
                  <ChevronRight size={14} className="text-white/30" />
                </button>
              ))}
            </div>
          </div>

          {/* System status / quick access */}
          <div className="lg:col-span-3 space-y-3">
            <button onClick={() => setShow3D(true)} className="w-full card border border-purple-500/30 rounded-xl p-4 text-left hover:border-purple-500/60 transition-colors relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-purple-500/10 blur-xl" />
              <div className="flex items-center justify-between mb-2 relative">
                <Box className="text-purple-400" size={16} />
                <ArrowUpRight size={14} className="text-purple-400" />
              </div>
              <div className="text-[10px] uppercase tracking-wider text-purple-400 mb-1">3D Tactical View</div>
              <div className="text-sm text-white">Full floor in 3D</div>
            </button>
            <button onClick={() => setShowMesh(true)} className="w-full card border border-blue-500/30 rounded-xl p-4 text-left hover:border-blue-500/60 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <Bluetooth className="text-blue-400" size={16} />
                <ArrowUpRight size={14} className="text-blue-400" />
              </div>
              <div className="text-[10px] uppercase tracking-wider text-blue-400 mb-1">Mesh Topology</div>
              <div className="text-sm text-white">19 nodes · 47ms relay</div>
            </button>
            <button onClick={() => setShowBand(true)} className="w-full card border border-emerald-500/30 rounded-xl p-4 text-left hover:border-emerald-500/60 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <Watch className="text-emerald-400" size={16} />
                <ArrowUpRight size={14} className="text-emerald-400" />
              </div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">Band Diagnostic</div>
              <div className="text-sm text-white">Scan & verify</div>
            </button>
            <button onClick={() => navigate('/employee/dispatch')} className="w-full card border border-white/10 rounded-xl p-4 text-left hover:border-white/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="text-white/60" size={16} />
                <ArrowUpRight size={14} className="text-white/40" />
              </div>
              <div className="text-[10px] uppercase tracking-wider text-white/60 mb-1">Dispatch Console</div>
              <div className="text-sm text-white">Roster & analytics</div>
            </button>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-white/30">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" /> System Live</span>
            <span>Tactical Layer</span>
            <span>Dispatch Ready</span>
            <span className="font-mono">UP {Math.floor(tick / 60)}m {tick % 60}s</span>
          </div>
          <div className="flex items-center gap-4">
            <span>ResQnet v2.4.1</span>
            <span className="font-mono">{new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>

      <MeshModal open={showMesh} onClose={() => setShowMesh(false)} />
      <GuardianBandModal open={showBand} onClose={() => setShowBand(false)} />
      <Map3DModal open={show3D} onClose={() => setShow3D(false)} />
      <ResQBrainPanel open={showBrain} onClose={() => setShowBrain(false)} />

      {/* Floating ResQ Brain trigger */}
      {!showBrain && (
        <button
          onClick={() => setShowBrain(true)}
          className="fixed bottom-6 right-6 z-30 group"
        >
          <div className="absolute inset-0 rounded-full bg-purple-500/40 blur-xl group-hover:blur-2xl transition-all" />
          <div className="relative bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-full p-4 shadow-2xl border border-purple-400/50 hover:scale-105 transition-transform flex items-center gap-2 pl-5 pr-5">
            <Brain className="text-white" size={20} />
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-[0.2em] text-purple-100 font-semibold flex items-center gap-1">
                <Sparkles size={9} /> AI Co-Pilot
              </div>
              <div className="text-sm font-display tracking-wider text-white">RESQ BRAIN</div>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}

function Gauge({ label, value, sub, icon: Icon, accent = 'text-white' }) {
  return (
    <div className="card border border-white/10 rounded-xl p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-20 h-20 rounded-full bg-white/[0.02] blur-xl" />
      <div className="flex items-center gap-2 mb-2 relative">
        <Icon size={12} className="text-white/40" />
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">{label}</div>
      </div>
      <div className={`text-3xl font-display tabular ${accent} relative`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">{sub}</div>
    </div>
  );
}

function ModuleCard({ idx, label, sub, desc, icon: Icon, color, onClick }) {
  const colors = {
    red: { border: 'border-red-500/25', hborder: 'hover:border-red-500/60', bg: 'bg-red-500/5', icon: 'text-red-400', text: 'text-red-300', shadow: 'hover:shadow-red-500/20' },
    cyan: { border: 'border-cyan-500/25', hborder: 'hover:border-cyan-500/60', bg: 'bg-cyan-500/5', icon: 'text-cyan-400', text: 'text-cyan-300', shadow: 'hover:shadow-cyan-500/20' },
    amber: { border: 'border-amber-500/25', hborder: 'hover:border-amber-500/60', bg: 'bg-amber-500/5', icon: 'text-amber-400', text: 'text-amber-300', shadow: 'hover:shadow-amber-500/20' },
    yellow: { border: 'border-yellow-500/25', hborder: 'hover:border-yellow-500/60', bg: 'bg-yellow-500/5', icon: 'text-yellow-400', text: 'text-yellow-300', shadow: 'hover:shadow-yellow-500/20' },
  }[color];

  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group card border ${colors.border} ${colors.hborder} ${colors.bg} rounded-2xl p-5 text-left transition-all hover:shadow-2xl ${colors.shadow} relative overflow-hidden`}
    >
      <div className="absolute top-3 right-3 text-[9px] tracking-widest text-white/30 font-mono">{idx}</div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${colors.bg} group-hover:h-2 transition-all`} />

      <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center mb-4 ${colors.icon} group-hover:scale-110 transition-transform`}>
        <Icon size={22} />
      </div>
      <div className={`font-display tracking-[0.18em] text-2xl ${colors.text}`}>{label}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">{sub}</div>
      <div className="text-[10px] text-white/40 mt-2">{desc}</div>
    </motion.button>
  );
}
