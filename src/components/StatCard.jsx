import React from 'react';

export default function StatCard({ label, value, sub, accent = 'text-white', icon: Icon, trend = null, className = '' }) {
  return (
    <div className={`card card-hover rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">{label}</div>
        {Icon && <Icon size={14} className="text-white/30" />}
      </div>
      <div className="flex items-baseline gap-2">
        <div className={`text-3xl font-display tabular ${accent}`}>{value}</div>
        {trend != null && (
          <div className={`text-xs font-mono ${trend > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}
          </div>
        )}
      </div>
      {sub && <div className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">{sub}</div>}
    </div>
  );
}
