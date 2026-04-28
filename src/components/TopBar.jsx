import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, ArrowLeft, LogOut } from 'lucide-react';
import { useStore } from '../lib/store.js';

export default function TopBar({ zone = 'MAIN HALL', showBack, backTo = -1, subtitle, right }) {
  const navigate = useNavigate();
  const session = useStore(s => s.session);
  const setSession = useStore(s => s.setSession);

  const logout = () => {
    setSession(null);
    navigate('/');
  };

  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] bg-ink-900/70 backdrop-blur-md flex-shrink-0">
      <div className="flex items-center gap-4">
        {showBack && (
          <button
            onClick={() => navigate(backTo)}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="text-red-500 relative">
            <Flame size={20} fill="currentColor" />
            <div className="absolute inset-0 bg-red-500/40 blur-lg -z-10" />
          </div>
          <div>
            <div className="font-display tracking-[0.25em] text-white text-base leading-none">RESQNET</div>
            {subtitle && <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 mt-1">{subtitle}</div>}
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white/70">Mesh Network Active</span>
        <span className="mx-2 text-white/20">·</span>
        <span className="text-white/40 font-mono tabular">ZONE: {zone}</span>
      </div>

      <div className="flex items-center gap-3">
        {right}
        {session && (
          <>
            <div className="text-right hidden sm:block">
              <div className="text-xs text-white font-medium">{session.user?.name || session.user?.username}</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-white/40">
                {session.kind === 'guest' ? 'Guest Wristband' : session.user?.role || 'Staff'}
              </div>
            </div>
            <button
              onClick={logout}
              className="tac-btn rounded-lg px-2.5 py-2 text-white/60 hover:text-white"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
