import React from 'react';
import { useStore } from '../lib/store.js';

export default function Backdrop() {
  const sev = useStore(s => s.themeSeverity);
  const tint = sev?.type ? {
    fire: 'from-red-950/30',
    medical: 'from-cyan-950/30',
    security: 'from-amber-950/30',
    hazard: 'from-yellow-950/30',
  }[sev.type] : 'from-transparent';

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-ink-950" />
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className={`absolute inset-0 bg-gradient-to-br ${tint} via-transparent to-transparent transition-colors duration-1000`} />
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-red-500/[0.04] blur-[140px]" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-cyan-500/[0.03] blur-[140px]" />
      <div className="absolute inset-0 grain" />
    </div>
  );
}
