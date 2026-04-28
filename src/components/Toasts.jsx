import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useStore } from '../lib/store.js';

const ICONS = {
  incident: AlertCircle,
  warn: AlertTriangle,
  ok: CheckCircle2,
  info: Info,
};
const COLORS = {
  incident: 'border-red-500/50 bg-red-500/10 text-red-200',
  warn: 'border-amber-500/50 bg-amber-500/10 text-amber-200',
  ok: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200',
  info: 'border-white/20 bg-white/5 text-white',
};

export default function Toasts() {
  const toasts = useStore(s => s.toasts);
  return (
    <div className="fixed top-5 right-5 z-[1000] flex flex-col gap-2 w-80">
      <AnimatePresence>
        {toasts.map(t => {
          const Icon = ICONS[t.kind] || Info;
          return (
            <motion.div
              key={t.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className={`card border rounded-lg p-3 flex items-start gap-3 ${COLORS[t.kind] || COLORS.info}`}
            >
              <Icon size={18} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.15em]">{t.title}</div>
                {t.body && <div className="text-xs text-white/70 mt-0.5">{t.body}</div>}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
