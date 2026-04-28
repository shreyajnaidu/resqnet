import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Plus, Shield, AlertTriangle, Watch, Bluetooth, Bell, MapPin, Heart, ChevronRight, Volume2, CheckCircle2, Sparkles } from 'lucide-react';
import { useStore } from '../../lib/store.js';
import { emitSos } from '../../lib/socket.js';
import { api } from '../../lib/api.js';
import TopBar from '../../components/TopBar.jsx';
import Pill from '../../components/Pill.jsx';
import GuardianBandModal from '../../components/GuardianBandModal.jsx';
import AIDescribeModal from '../../components/AIDescribeModal.jsx';

const ZONE_LABEL = {
  'Pool Area': 'pool',
  'Restaurant': 'restaurant',
  'Main Lobby': 'lobby',
  'Reception': 'reception',
  'Kitchen': 'kitchen',
};

export default function GuestHome() {
  const navigate = useNavigate();
  const guest = useStore(s => s.guestProfile);
  const guestAlerts = useStore(s => s.guestAlerts);
  const incidents = useStore(s => s.incidents);
  const activeIncident = incidents.find(i => i.id === useStore.getState().activeIncidentId);
  const [showBand, setShowBand] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [pulseHb, setPulseHb] = useState(72);

  useEffect(() => {
    const t = setInterval(() => setPulseHb(72 + Math.floor(Math.random() * 10) - 4), 1200);
    return () => clearInterval(t);
  }, []);

  // Filter alerts for this guest
  const myAlerts = guestAlerts.filter(a => !a.guestId || a.guestId === guest?.id || a.guestId === 'all');

  const trigger = (type) => {
    const zone = ZONE_LABEL[guest?.zone] || 'lobby';
    emitSos({ type, zone, source: 'guest', guestId: guest?.id, severity: type === 'medical' ? 4 : 3 });
    api.createIncident(type, zone, type === 'fire' ? 4 : 3);
    navigate(`/guest/${type}`);
  };

  const handleAIConfirm = ({ type, severity, description }) => {
    const zone = ZONE_LABEL[guest?.zone] || 'lobby';
    emitSos({ type, zone, source: 'guest-ai', guestId: guest?.id, severity, description });
    api.createIncident(type, zone, severity);
    setShowAI(false);
    navigate(`/guest/${type}`);
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <TopBar zone={guest?.zone?.toUpperCase() || 'UNASSIGNED'} subtitle="Guest Mode" />

      <div className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.3em] text-white/40 mb-1">Welcome back</div>
          <h1 className="text-4xl font-display tracking-wide text-white">{guest?.name?.split(' ')[0]?.toUpperCase()}</h1>
          <div className="text-sm text-white/50 mt-1">You're safe. We're watching.</div>
        </motion.div>

        {/* Active emergency banner */}
        {activeIncident && !activeIncident.endedAt && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 card border border-red-500/40 rounded-xl p-4 bg-red-500/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                <Volume2 className="text-red-400 animate-pulse" size={18} />
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">Active Emergency</div>
                <div className="text-sm text-white">A {activeIncident.type} incident has been reported. Follow guidance below.</div>
              </div>
              <button onClick={() => navigate(`/guest/${activeIncident.type}`)} className="bg-red-500 hover:bg-red-400 text-black font-semibold text-xs uppercase tracking-wider px-4 py-2 rounded-lg flex items-center gap-2">
                Open <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Big call section */}
        <div className="card border border-white/10 rounded-2xl p-6 mb-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">Need Help?</div>
          <div className="text-2xl font-display tracking-wide text-white mb-4">Tap your emergency type</div>

          {/* AI Describe banner */}
          <button
            onClick={() => setShowAI(true)}
            className="w-full mb-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/15 to-fuchsia-500/10 border border-purple-500/30 hover:border-purple-500/60 transition-colors text-left flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="text-purple-300" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                Not sure what's happening?
                <span className="text-[9px] font-mono uppercase tracking-wider text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded">AI</span>
              </div>
              <div className="text-[11px] text-white/60 mt-0.5">Describe it — Gemini will classify and dispatch</div>
            </div>
            <ChevronRight className="text-purple-300 flex-shrink-0" size={16} />
          </button>

          <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 text-center mb-3">— OR —</div>

          <div className="grid grid-cols-2 gap-3">
            <BigBtn label="FIRE" icon={Flame} color="red" onClick={() => trigger('fire')} />
            <BigBtn label="MEDICAL" icon={Plus} color="cyan" onClick={() => trigger('medical')} />
            <BigBtn label="SECURITY" icon={Shield} color="amber" onClick={() => trigger('security')} />
            <BigBtn label="HAZARD" icon={AlertTriangle} color="yellow" onClick={() => trigger('hazard')} />
          </div>

          <div className="mt-4 text-center text-[10px] uppercase tracking-wider text-white/30">
            {guest?.hasBand
              ? 'Triple-tap your wristband for silent SOS · Mesh-relayed instantly'
              : 'Hold any button for 2s to send silent SOS · Mesh-relayed instantly'}
          </div>
        </div>

        {/* Device status card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {guest?.hasBand ? (
            <button onClick={() => setShowBand(true)} className="card card-hover border border-emerald-500/30 rounded-xl p-4 text-left hover:border-emerald-500/60 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <Watch className="text-emerald-400" size={16} />
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-mono">PAIRED</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Guardian Band</div>
              <div className="text-sm text-white font-semibold">87% · {pulseHb} bpm</div>
            </button>
          ) : (
            <div className="card border border-cyan-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                <span className="text-[9px] uppercase tracking-wider text-cyan-400 font-mono">APP</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">ResQnet App</div>
              <div className="text-sm text-white font-semibold">Phone-based · GPS on</div>
            </div>
          )}
          <div className="card border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <MapPin className="text-cyan-400" size={16} />
              <span className="text-[9px] uppercase tracking-wider text-cyan-400 font-mono">LIVE</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Your Zone</div>
            <div className="text-sm text-white font-semibold">{guest?.zone}</div>
          </div>
          <div className="card border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Bluetooth className="text-blue-400" size={16} />
              <span className="text-[9px] uppercase tracking-wider text-blue-400 font-mono">3 HOPS</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Mesh Status</div>
            <div className="text-sm text-white font-semibold">Connected</div>
          </div>
        </div>

        {/* Notifications from staff */}
        <div className="card border border-white/10 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-white/60" />
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-semibold">Notifications</div>
            </div>
            <div className="text-[10px] text-white/40 font-mono">{myAlerts.length}</div>
          </div>
          {myAlerts.length === 0 ? (
            <div className="text-sm text-white/40 py-2">No notifications. Everything is calm.</div>
          ) : (
            <div className="space-y-2">
              {myAlerts.slice(0, 4).map(a => (
                <div key={a.id} className="flex items-start gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
                  <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white">{a.message}</div>
                    <div className="text-[9px] text-white/40 mt-0.5 font-mono">{new Date(a.t).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Pill color="border-emerald-400/40 text-emerald-300" icon={Heart}>You're Safe</Pill>
          <Pill color="border-white/15 text-white/60" icon={Bluetooth}>BLE Mesh</Pill>
          <Pill color="border-white/15 text-white/60">Offline Tolerant</Pill>
        </div>
      </div>

      <GuardianBandModal open={showBand} onClose={() => setShowBand(false)} defaultBand={guest ? {
        id: `GB-${guest.id?.toUpperCase()}`,
        battery: 87,
        firmware: 'v2.4.1',
        rssi: -54,
        lastSync: '1s ago',
        wearer: `${guest.name} (${guest.id})`,
        zone: guest.zone,
      } : null} />

      <AIDescribeModal
        open={showAI}
        onClose={() => setShowAI(false)}
        onConfirm={handleAIConfirm}
        guest={guest}
      />
    </div>
  );
}

function BigBtn({ label, icon: Icon, color, onClick }) {
  const colors = {
    red: 'border-red-500/30 hover:border-red-500/60 hover:bg-red-500/10 text-red-400',
    cyan: 'border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/10 text-cyan-400',
    amber: 'border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/10 text-amber-400',
    yellow: 'border-yellow-500/30 hover:border-yellow-500/60 hover:bg-yellow-500/10 text-yellow-400',
  }[color];
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`card border ${colors} rounded-xl p-5 transition-all flex flex-col items-center gap-2`}
    >
      <Icon size={28} />
      <div className="font-display tracking-wider text-base">{label}</div>
    </motion.button>
  );
}
