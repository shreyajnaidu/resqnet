import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Phone, Heart, Volume2, Watch, Activity, Shield, AlertTriangle, Clock } from 'lucide-react';
import TopBar from '../../components/TopBar.jsx';
import FloorMap from '../../components/FloorMap.jsx';
import VoiceBanner from '../../components/VoiceBanner.jsx';
import SOSBanner from '../../components/SOSBanner.jsx';
import { useStore } from '../../lib/store.js';
import { findNearestSafeExit, zoneCenter, TYPE_COLORS } from '../../lib/helpers.js';
import { emitFamilyEvac } from '../../lib/socket.js';
import { api } from '../../lib/api.js';

const ZONE_FROM = {
  'Pool Area': 'pool',
  'Restaurant': 'restaurant',
  'Main Lobby': 'lobby',
  'Reception': 'reception',
  'Kitchen': 'kitchen',
};

const VOICE_LINES = {
  fire: ['Stay calm. Walk — do not run.', 'Turn right — head for the highlighted route.', 'Avoid smoke — stay low.', 'Use Exit B. Help is coming.'],
  medical: ['Help is on the way.', 'Stay still. A medic is en route.', 'Your vitals are being monitored.', "You're not alone — we see you."],
  security: ['Move calmly to a safe area.', 'Security has been dispatched.', 'Avoid crowded zones.', 'Follow staff instructions.'],
  hazard: ['Cover your nose and mouth.', 'Move toward the safe corridor.', 'Avoid the contaminated area.', 'Help is moving fast.'],
};

const EMOTIONAL = [
  "You're going to be okay.",
  "Help is on the way — we have you.",
  "Stay calm. Breathe.",
  "We're tracking you in real time.",
  "Just a few more steps.",
];

export default function GuestModule() {
  const { type } = useParams();
  const navigate = useNavigate();
  const guest = useStore(s => s.guestProfile);
  const zones = useStore(s => s.zones);
  const exits = useStore(s => s.exits);
  const families = useStore(s => s.families);
  const incidents = useStore(s => s.incidents);
  const activeId = useStore(s => s.activeIncidentId);
  const active = incidents.find(i => i.id === activeId);

  const [eta, setEta] = useState(154);
  const [hb, setHb] = useState(82);
  const [reasIdx, setReasIdx] = useState(0);
  const [safe, setSafe] = useState(false);

  const C = TYPE_COLORS[type] || TYPE_COLORS.fire;
  const userZone = ZONE_FROM[guest?.zone] || 'lobby';

  const blocked = useMemo(() => {
    if (type === 'fire') return ['kitchen'];
    if (type === 'hazard') return ['kitchen'];
    return [];
  }, [type]);

  const route = useMemo(() => {
    if (zones.length === 0 || exits.length === 0) return [];
    const r = findNearestSafeExit(zones, exits, userZone, blocked);
    if (!r) return [];
    const pts = r.path.map(zid => zoneCenter(zones, zid));
    pts.push({ x: r.exit.x, y: r.exit.y });
    return pts;
  }, [zones, exits, userZone, blocked]);

  const hazards = useMemo(() => {
    if (type === 'fire') return [{ x: 140, y: 225, radius: 70 }];
    if (type === 'hazard') return [{ x: 140, y: 225, radius: 90 }];
    return [];
  }, [type]);

  useEffect(() => {
    const i = setInterval(() => setEta(e => Math.max(0, e - 1)), 1000);
    const j = setInterval(() => setHb(h => 80 + Math.floor(Math.random() * 16) - 8), 1100);
    const k = setInterval(() => setReasIdx(idx => (idx + 1) % EMOTIONAL.length), 3500);
    return () => { clearInterval(i); clearInterval(j); clearInterval(k); };
  }, []);

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;

  const markSafe = async () => {
    setSafe(true);
    if (guest?.id) emitFamilyEvac(guest.id);
    if (active && !active.endedAt) {
      // Don't auto-end — staff does that
    }
    setTimeout(() => navigate('/guest'), 2500);
  };

  // Find family members
  const myFamily = useMemo(() => {
    for (const fam of families) {
      const found = fam.members?.find(m => m.id === guest?.id);
      if (found) return fam;
    }
    return null;
  }, [families, guest]);

  return (
    <div className="relative min-h-screen lg:h-screen flex flex-col" style={{ '--accent': C.primary }}>
      <TopBar zone={guest?.zone?.toUpperCase() || ''} subtitle="Guest Mode" showBack backTo="/guest" />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 lg:overflow-hidden">
        {/* MAP */}
        <div className="lg:col-span-7 relative card rounded-2xl border overflow-hidden" style={{ borderColor: C.border }}>
          <div className="absolute top-4 left-4 right-4 z-20">
            <SOSBanner type={C.name} severity={active?.severity || 4} location={guest?.zone || 'Unknown'} t={active?.startedAt || Date.now()} color={`bg-black/70 border`} />
          </div>

          <div className="absolute top-28 right-4 z-10">
            <VoiceBanner lines={VOICE_LINES[type] || VOICE_LINES.fire} color={C.text} speak />
          </div>

          <FloorMap
            zones={zones}
            exits={exits}
            hazards={hazards}
            route={route}
            userPos={zoneCenter(zones, userZone)}
            theme={type === 'fire' ? 'red' : type === 'medical' ? 'cyan' : type === 'security' ? 'amber' : 'yellow'}
            blocked={blocked}
          />

          <div className="absolute bottom-4 left-4 right-4 card border border-white/10 rounded-lg px-4 py-2.5 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: C.primary }} /> Avoid</div>
              <div className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Your Route</div>
              <div className="flex items-center gap-1.5 text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-500" /> You</div>
            </div>
            <div className="text-[10px] text-white/40 font-mono">FLOOR 1 · LIVE</div>
          </div>
        </div>

        {/* RIGHT COLUMN — guest is given calm, simple info */}
        <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto">
          {/* Reassurance */}
          <motion.div
            key={reasIdx}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="card border rounded-xl p-5"
            style={{ borderColor: C.border }}
          >
            <div className="text-[10px] uppercase tracking-[0.2em] mb-1 font-semibold" style={{ color: C.primary }}>EMOTIONAL SUPPORT</div>
            <div className="text-2xl font-display tracking-wide text-white">{EMOTIONAL[reasIdx]}</div>
          </motion.div>

          {/* Big metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Clock className="text-white/40" size={14} /><div className="text-[10px] uppercase tracking-wider text-white/50">Help Arrives</div></div>
              <div className="text-3xl font-display tabular text-white">{fmtTime(eta)}</div>
              <div className="text-[10px] text-white/40 mt-1">2 responders en route</div>
            </div>
            <div className="card border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Heart className="text-red-400 animate-pulse" size={14} /><div className="text-[10px] uppercase tracking-wider text-white/50">Heart Rate</div></div>
              <div className="text-3xl font-display tabular text-red-400">{hb}<span className="text-sm text-white/40 ml-1">bpm</span></div>
              <div className="text-[10px] text-white/40 mt-1">Guardian Band</div>
            </div>
          </div>

          {/* Family */}
          {myFamily && (
            <div className="card border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Your Family — {myFamily.name}</div>
                <div className="text-[10px] text-emerald-400 font-mono">LIVE</div>
              </div>
              <div className="space-y-1.5">
                {myFamily.members?.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-display ${m.evacuated ? 'bg-emerald-500/20 text-emerald-400' : m.hasBand ? 'bg-emerald-500/10 text-emerald-300' : 'bg-blue-500/10 text-blue-300'}`}>
                        {m.name[0]}
                      </div>
                      <div>
                        <div className="text-white text-xs flex items-center gap-1.5">
                          {m.name}
                          <span className={`text-[8px] px-1 rounded font-mono ${m.hasBand ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {m.hasBand ? 'BAND' : 'APP'}
                          </span>
                        </div>
                        <div className="text-[9px] text-white/40 capitalize">{(m.zone || '').replace('_', ' ')}</div>
                      </div>
                    </div>
                    <div className={`text-[10px] font-mono uppercase ${m.evacuated ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {m.evacuated ? '✓ SAFE' : 'IN ZONE'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2">
            <button className="tac-btn rounded-lg py-3 text-xs uppercase tracking-wider text-white/80 flex items-center justify-center gap-2">
              <Phone size={14} /> Call Front Desk
            </button>
            <button className="tac-btn rounded-lg py-3 text-xs uppercase tracking-wider text-white/80 flex items-center justify-center gap-2">
              <Activity size={14} /> Share Vitals
            </button>
          </div>

          {/* I'M SAFE */}
          <button
            onClick={markSafe}
            className={`mt-auto py-5 rounded-xl font-display tracking-[0.3em] text-xl transition-all ${safe ? 'bg-emerald-500 text-black' : 'sos-pulse text-white'}`}
            style={{ background: safe ? undefined : C.primary }}
          >
            {safe ? '✓ MARKED SAFE' : "I'M SAFE NOW"}
          </button>
        </div>
      </div>
    </div>
  );
}
