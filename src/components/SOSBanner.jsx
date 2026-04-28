import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { fmtClock } from '../lib/helpers.js';

export default function SOSBanner({ type, severity, location, t = Date.now(), color = 'bg-red-950/60 border-red-500/30' }) {
  return (
    <div className={`${color} rounded-xl p-4 border backdrop-blur-md flex items-center gap-4 shadow-2xl anim-slide-down`}>
      <div className="w-11 h-11 rounded-lg bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="text-emerald-400" size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-emerald-400 font-display tracking-[0.15em] text-sm">SOS DISPATCHED</div>
          <div className="text-[10px] text-white/40 font-mono tabular">{fmtClock(t)}</div>
        </div>
        <div className="text-xs text-white/70 mt-1 truncate">
          Type: <span className="text-white font-semibold">{type}</span>
          {' · '}Zone: <span className="text-white font-semibold">{location}</span>
          {' · '}Severity: <span className="text-white font-semibold">{severity}</span>
        </div>
      </div>
      <div className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider flex-shrink-0 hidden md:block">RELAYED VIA BLE MESH</div>
    </div>
  );
}
