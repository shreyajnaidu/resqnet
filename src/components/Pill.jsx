import React from 'react';

export default function Pill({ children, color = 'border-white/15 text-white/70', icon: Icon, dot = true, onClick, className = '' }) {
  const Cmp = onClick ? 'button' : 'div';
  return (
    <Cmp
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] uppercase tracking-[0.18em] font-semibold ${color} ${onClick ? 'tac-btn cursor-pointer' : ''} ${className}`}
    >
      {Icon && <Icon size={12} />}
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {children}
    </Cmp>
  );
}
