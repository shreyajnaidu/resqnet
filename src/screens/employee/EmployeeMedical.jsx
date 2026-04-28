import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Heart, Watch, Clock, AlertTriangle, Phone, RefreshCw, Send, Activity, Download } from 'lucide-react';
import { useStore } from '../../lib/store.js';
import { findPath, zoneCenter, fmtTime, TYPE_COLORS } from '../../lib/helpers.js';
import { emitResponderUpdate } from '../../lib/socket.js';
import { api } from '../../lib/api.js';
import { generateIncidentReport } from '../../lib/reportPdf.js';
import TopBar from '../../components/TopBar.jsx';
import FloorMap from '../../components/FloorMap.jsx';
import VoiceBanner from '../../components/VoiceBanner.jsx';
import SOSBanner from '../../components/SOSBanner.jsx';

const VOICE_LINES = ['Medic en route — ETA 30 seconds', 'Maintain patient airway', 'Vitals stable, response inbound', 'Stand clear of patient'];
const REASSURE = ['Help is on the way', 'Stay calm — assistance arriving', 'Vitals being monitored', 'Medic is 30 seconds out'];

export default function EmployeeMedical() {
  const navigate = useNavigate();
  const zones = useStore(s => s.zones);
  const exits = useStore(s => s.exits);
  const responders = useStore(s => s.responders);
  const incidents = useStore(s => s.incidents);
  const escalations = useStore(s => s.escalations);
  const families = useStore(s => s.families);
  const session = useStore(s => s.session);
  const active = incidents.filter(i => i.type === 'medical' && !i.endedAt).slice(-1)[0];

  const [vitals, setVitals] = useState({ fall: true, immobility: 24, hr: 112, br: 18, drown: false });
  const [reasIdx, setReasIdx] = useState(0);
  const [feedTimer, setFeedTimer] = useState(0);
  const [autoEscalate, setAutoEscalate] = useState(false);

  const patientZone = active?.zone || 'pool';
  const medics = responders.filter(r => r.role === 'Medical');
  const primaryMedic = medics[0];
  const medicPath = useMemo(() => primaryMedic && zones.length ? findPath(zones, primaryMedic.zone, patientZone).map(z => zoneCenter(zones, z)) : [], [zones, primaryMedic, patientZone]);

  useEffect(() => {
    const t1 = setInterval(() => setReasIdx(i => (i + 1) % REASSURE.length), 3000);
    const t2 = setInterval(() => {
      setFeedTimer(t => t + 1);
      setVitals(v => ({ ...v, immobility: v.immobility + 1, hr: 100 + Math.floor(Math.random() * 14) }));
    }, 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  useEffect(() => { if (feedTimer > 180) setAutoEscalate(true); }, [feedTimer]);

  const dispatchMedic = () => {
    medics.forEach(m => emitResponderUpdate({ id: m.id, status: 'EN_ROUTE', movement: 'moving', zone: patientZone }));
  };
  const setStatus = (id, status) => emitResponderUpdate({ id, status });

  const endIncident = async () => {
    if (active) await api.endIncident(active.id);
    navigate('/employee');
  };

  const C = TYPE_COLORS.medical;

  return (
    <div className="relative min-h-screen lg:h-screen flex flex-col">
      <TopBar zone={patientZone.toUpperCase().replace('_', ' ')} subtitle="Tactical · Medical Response" showBack backTo="/employee" />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 lg:overflow-hidden">
        {/* MAP */}
        <div className="lg:col-span-7 relative card rounded-2xl border border-cyan-500/20 overflow-hidden severity-medical">
          <div className="absolute top-3 left-3 right-3 z-20">
            <SOSBanner type="MEDICAL · FALL DETECTED" severity={active?.severity || 4} location={patientZone.replace('_', ' ')} t={active?.startedAt || Date.now()} color="bg-black/70 border-cyan-500/40" />
          </div>

          <div className="absolute top-24 left-4 z-10 card border border-cyan-400/30 rounded-lg px-4 py-2.5 bg-cyan-500/5 backdrop-blur-md">
            <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 mb-1">Reassurance Feed → Patient</div>
            <motion.div key={reasIdx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-white">{REASSURE[reasIdx]}</motion.div>
          </div>

          <div className="absolute top-24 right-4 z-10">
            <VoiceBanner lines={VOICE_LINES} color="text-cyan-400" />
          </div>

          <FloorMap
            zones={zones}
            exits={exits}
            route={medicPath}
            userPos={zoneCenter(zones, patientZone)}
            theme="cyan"
            dots={primaryMedic ? [{ ...zoneCenter(zones, primaryMedic.zone), color: '#06b6d4', label: 'MEDIC', r: 6, pulse: true }] : []}
          />

          <div className="absolute bottom-3 left-3 right-3 card border border-white/10 rounded-lg px-4 py-2 backdrop-blur-md">
            <div className="text-[10px] uppercase tracking-wider text-white/50">Patient Status</div>
            <div className="text-sm text-cyan-300">Stationary · Monitored · Last move {feedTimer}s ago</div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto">
          {/* Guardian Band Vitals */}
          <div className="card border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Watch className="text-cyan-400" size={16} />
                <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">Guardian Band · Live</div>
              </div>
              <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> PAIRED
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Vital label="Fall Detected" value={vitals.fall ? 'YES' : 'NO'} alarm={vitals.fall} />
              <Vital label="Immobility" value={`${vitals.immobility}s`} alarm={vitals.immobility > 15} suffix="" />
              <Vital label="Heart Rate" value={`${vitals.hr}`} suffix="bpm" />
              <Vital label="Pool Risk" value="DROWN" alarm color="text-red-400" />
            </div>
          </div>

          {/* Responder Live Feed */}
          <div className="card border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">Responder Live Feed</div>
              <div className="text-[10px] text-cyan-400 font-mono">UPDATE: {15 - (feedTimer % 15)}s</div>
            </div>
            {medics.map(m => (
              <div key={m.id} className="flex items-center gap-3 mb-3 last:mb-0 p-2 rounded-lg bg-white/[0.02]">
                <div className="w-9 h-9 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center"><Heart className="text-cyan-400" size={14} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white">{m.name}</div>
                  <div className="text-[10px] text-white/40 capitalize">{(m.zone || '').replace('_', ' ')} · {m.status}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setStatus(m.id, 'EN_ROUTE')} title="Controlled" className={`px-1.5 py-1 text-[9px] uppercase tracking-wider rounded ${m.status === 'EN_ROUTE' ? 'bg-emerald-500/20 text-emerald-300' : 'tac-btn text-white/60'}`}>OK</button>
                  <button onClick={() => setStatus(m.id, 'BACKUP')} title="Backup" className={`px-1.5 py-1 text-[9px] uppercase tracking-wider rounded ${m.status === 'BACKUP' ? 'bg-amber-500/20 text-amber-300' : 'tac-btn text-white/60'}`}>BK</button>
                  <button onClick={() => setStatus(m.id, 'CRITICAL')} title="Medical+" className={`px-1.5 py-1 text-[9px] uppercase tracking-wider rounded ${m.status === 'CRITICAL' ? 'bg-red-500/20 text-red-300' : 'tac-btn text-white/60'}`}>M+</button>
                </div>
              </div>
            ))}
            <button onClick={dispatchMedic} className="w-full mt-2 py-2 text-[10px] uppercase tracking-wider bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 rounded hover:bg-cyan-500/25 flex items-center justify-center gap-1">
              <Send size={11} /> Dispatch All Medics
            </button>
          </div>

          {/* Auto-escalation timer */}
          <div className={`rounded-xl p-4 border ${autoEscalate ? 'bg-red-500/10 border-red-500/40' : 'card border-white/10'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">Auto-Escalation Timer</div>
              <Clock size={14} className={autoEscalate ? 'text-red-400' : 'text-white/30'} />
            </div>
            <div className="flex items-baseline gap-2">
              <div className={`text-2xl font-display tabular ${autoEscalate ? 'text-red-400' : 'text-white'}`}>{fmtTime(feedTimer)}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">/ 3:00 trigger</div>
            </div>
            <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500" style={{ width: `${Math.min(100, (feedTimer / 180) * 100)}%` }} />
            </div>
            {autoEscalate && (
              <div className="mt-2 text-[10px] text-red-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={11} /> Backup auto-dispatched
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="card border border-amber-500/30 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400 mb-2 font-semibold">Tactical Actions</div>
            <div className="grid grid-cols-2 gap-2">
              <button className="tac-btn rounded py-2 text-[10px] uppercase tracking-wider text-white/80 flex items-center justify-center gap-1"><Phone size={11} /> Call Ambulance</button>
              <button className="tac-btn rounded py-2 text-[10px] uppercase tracking-wider text-white/80 flex items-center justify-center gap-1"><RefreshCw size={11} /> Notify Family</button>
              <button onClick={() => api.escalate(active?.id)} className="col-span-2 tac-btn rounded py-2 text-[10px] uppercase tracking-wider text-white/80 flex items-center justify-center gap-1"><AlertTriangle size={11} /> Manual Escalate</button>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2">
            <button
              onClick={() => generateIncidentReport({
                incident: active,
                responders: responders.filter(r => r.role === 'Medical'),
                families,
                reportedBy: session?.user?.name || 'Tactical Command',
              })}
              disabled={!active}
              className="py-4 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 text-white font-display tracking-[0.2em] text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={16} /> EXPORT PDF
            </button>
            <button onClick={endIncident} className="py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-display tracking-[0.25em] text-sm">
              MARK PATIENT STABLE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Vital({ label, value, alarm, suffix, color = 'text-white' }) {
  return (
    <div className={`rounded-lg p-3 border ${alarm ? 'bg-red-500/10 border-red-500/40' : 'bg-white/5 border-white/10'}`}>
      <div className="text-[9px] uppercase tracking-wider text-white/50">{label}</div>
      <div className={`text-xl font-display tabular ${alarm ? 'text-red-400' : color}`}>
        {value}{suffix && <span className="text-[10px] text-white/40 ml-1">{suffix}</span>}
      </div>
    </div>
  );
}
