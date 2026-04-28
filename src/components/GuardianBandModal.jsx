import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Watch, X, Bluetooth, CheckCircle2, Heart, Battery, Signal } from 'lucide-react';

export default function GuardianBandModal({ open, onClose, defaultBand = null }) {
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState(null);
  const [pulse, setPulse] = useState(72);

  useEffect(() => {
    if (!open) return;
    setScanning(true);
    setResult(null);
    const t = setTimeout(() => {
      setScanning(false);
      setResult(defaultBand || {
        id: 'GB-7A39F2',
        battery: 87,
        firmware: 'v2.4.1',
        rssi: -52,
        lastSync: '2s ago',
        wearer: 'Aryan Kumar (g-01)',
        zone: 'Pool Area',
      });
    }, 2200);
    return () => clearTimeout(t);
  }, [open, defaultBand]);

  useEffect(() => {
    if (!result) return;
    const t = setInterval(() => setPulse(72 + Math.floor(Math.random() * 12) - 4), 800);
    return () => clearInterval(t);
  }, [result]);

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
            className="card rounded-2xl border border-emerald-500/30 p-6 max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <Watch className="text-emerald-400" size={18} />
                </div>
                <div>
                  <div className="text-lg font-display tracking-wider text-white">GUARDIAN BAND</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] mt-0.5">{scanning ? 'Pairing diagnostic' : 'Live monitoring'}</div>
                </div>
              </div>
              <button onClick={onClose} className="tac-btn rounded-lg p-2 text-white/40 hover:text-white"><X size={16} /></button>
            </div>

            {scanning ? (
              <div className="py-12 flex flex-col items-center">
                <div className="relative w-32 h-32 mb-5">
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-400 animate-spin" />
                  <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-emerald-400/50" style={{ animation: 'spin 2s linear infinite reverse' }} />
                  <div className="absolute inset-6 rounded-full border-2 border-transparent border-t-emerald-400/30" style={{ animation: 'spin 3s linear infinite' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Bluetooth className="text-emerald-400" size={28} />
                  </div>
                </div>
                <div className="text-sm text-white/80 mb-1">Scanning BLE devices...</div>
                <div className="text-[10px] text-white/40 font-mono">RSSI sweep · ch 37 / 38 / 39</div>
                <div className="mt-4 flex gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: `pulse 1s infinite ${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <CheckCircle2 className="text-emerald-400 flex-shrink-0" size={24} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">Band Detected & Paired</div>
                    <div className="text-[10px] text-white/50 font-mono">ID: {result.id}</div>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">SECURE</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Stat icon={Battery} label="Battery" value={`${result.battery}%`} accent="text-emerald-400" />
                  <Stat icon={Signal} label="RSSI" value={`${result.rssi} dBm`} accent="text-cyan-400" />
                  <Stat icon={Heart} label="Heart Rate" value={`${pulse} bpm`} accent="text-red-400" pulse />
                  <Stat icon={Watch} label="Firmware" value={result.firmware} accent="text-white" />
                </div>

                <div className="card rounded-lg p-3 border border-white/10">
                  <div className="text-[10px] uppercase text-white/40 tracking-[0.15em] mb-2">Wearer Profile</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-display">
                      {result.wearer?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{result.wearer}</div>
                      <div className="text-[10px] text-white/50 truncate">{result.zone} · last sync {result.lastSync}</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setScanning(true); setResult(null); setTimeout(() => { setScanning(false); setResult(result); }, 1500); }}
                    className="flex-1 tac-btn py-2.5 rounded-lg text-xs uppercase tracking-wider text-white/70"
                  >Re-scan</button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 bg-emerald-500 text-black rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-400"
                  >Confirm Pair</button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ icon: Icon, label, value, accent, pulse }) {
  return (
    <div className="card rounded-lg p-3 border border-white/10">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} className={`${accent} ${pulse ? 'animate-pulse' : ''}`} />
        <div className="text-[9px] uppercase text-white/40 tracking-[0.15em]">{label}</div>
      </div>
      <div className={`text-lg font-display ${accent} tabular`}>{value}</div>
    </div>
  );
}
