import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, RefreshCw, Loader2, AlertTriangle, CheckCircle2, Flame, Plus, Shield, MessageSquare } from 'lucide-react';
import { api } from '../lib/api.js';
import { TYPE_COLORS } from '../lib/helpers.js';

const TYPE_ICONS = { fire: Flame, medical: Plus, security: Shield, hazard: AlertTriangle };

const SUGGESTIONS = [
  'I see smoke coming from the kitchen',
  'Someone fell and isn\'t moving',
  'I smell gas in my room',
  'There\'s a stranger trying to enter rooms',
];

export default function AIDescribeModal({ open, onClose, onConfirm, guest }) {
  const [text, setText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const reset = () => {
    setText('');
    setAnalyzing(false);
    setResult(null);
    setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const analyze = async (descOverride) => {
    const desc = (descOverride || text).trim();
    if (desc.length < 3) {
      setError('Please describe what you see in a few words.');
      return;
    }
    setText(desc);
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.classifyText(desc, guest);
      setResult(res);
    } catch (err) {
      setError('AI service unreachable. Pick manually below.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDispatch = () => {
    if (!result) return;
    onConfirm({
      type: result.type,
      severity: result.severity,
      aiClassified: true,
      description: result.summary,
    });
    reset();
  };

  const C = result ? (TYPE_COLORS[result.type] || TYPE_COLORS.fire) : null;
  const Icon = result ? (TYPE_ICONS[result.type] || AlertTriangle) : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            className="card border border-purple-500/30 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                  <Sparkles className="text-purple-400" size={18} />
                </div>
                <div>
                  <div className="text-lg font-display tracking-wider text-white">AI ASSISTANT</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-purple-400 mt-0.5">
                    Powered by Google Gemini
                  </div>
                </div>
              </div>
              <button onClick={handleClose} className="tac-btn rounded-lg p-2 text-white/40 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {/* Input area */}
            {!result && (
              <div className="space-y-3">
                <p className="text-sm text-white/70 leading-relaxed">
                  Don't know what type of emergency this is? Just describe what you're seeing — we'll classify it and dispatch the right help.
                </p>

                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 text-white/30" size={14} />
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="e.g. I see flames in the kitchen, smoke spreading..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 resize-none"
                    rows={3}
                    disabled={analyzing}
                    autoFocus
                  />
                </div>

                {/* Suggestions */}
                {!text && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">Try one of these:</div>
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => analyze(s)}
                        disabled={analyzing}
                        className="w-full tac-btn rounded-lg px-3 py-2 text-left text-xs text-white/70 hover:text-white hover:border-purple-500/40"
                      >
                        "{s}"
                      </button>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <AlertTriangle className="text-red-400 flex-shrink-0" size={14} />
                    <div className="text-xs text-red-300">{error}</div>
                  </div>
                )}

                <button
                  onClick={() => analyze()}
                  disabled={analyzing || text.trim().length < 3}
                  className="w-full py-3 rounded-lg bg-purple-500 hover:bg-purple-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-display tracking-[0.15em] text-sm flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      ANALYZING WITH GEMINI...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      ASK AI
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Result */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {/* User said */}
                <div className="card rounded-lg p-3 border border-white/10">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1 font-semibold">You said</div>
                  <div className="text-sm text-white/80 italic">"{text}"</div>
                </div>

                {/* AI verdict */}
                <div className={`card rounded-xl p-4 border ${result.fallback ? 'border-amber-500/40' : 'border-purple-500/40'}`}>
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: C.soft, border: `1px solid ${C.border}`, color: C.primary }}
                    >
                      {Icon && <Icon size={24} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="text-emerald-400" size={12} />
                        <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-semibold">
                          AI Classified
                        </div>
                      </div>
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <div className={`text-2xl font-display tracking-wide ${C.text}`}>
                          {result.type.toUpperCase()}
                        </div>
                        <div className="text-xs text-white/60 font-mono">
                          SEVERITY {result.severity}
                        </div>
                        <div className="text-xs text-white/40 font-mono">
                          {Math.round(result.confidence * 100)}% confident
                        </div>
                      </div>
                      <div className="text-sm text-white/80 mt-2">{result.summary}</div>
                      {result.recommendation && (
                        <div className="text-xs text-white/60 mt-2 pt-2 border-t border-white/10">
                          <span className="text-purple-400 uppercase tracking-wider text-[10px] font-semibold">Action: </span>
                          {result.recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={reset}
                    className="tac-btn rounded-lg py-3 text-xs uppercase tracking-wider text-white/70 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={12} /> Re-describe
                  </button>
                  <button
                    onClick={handleDispatch}
                    className="rounded-lg py-3 text-xs font-bold uppercase tracking-[0.15em] text-black flex items-center justify-center gap-2"
                    style={{ background: C.primary }}
                  >
                    <Send size={12} /> DISPATCH NOW
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
