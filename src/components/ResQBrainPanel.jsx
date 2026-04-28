import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2, Brain, User, ChevronRight } from 'lucide-react';
import { api } from '../lib/api.js';

const QUICK_QUESTIONS = [
  "Status report",
  "Who hasn't evacuated?",
  "Which exit should I lock?",
  "Where are the kids and elderly?",
  "Recommend next action",
];

export default function ResQBrainPanel({ open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const ask = async (questionOverride) => {
    const q = (questionOverride || input).trim();
    if (!q || loading) return;

    setMessages(m => [...m, { role: 'user', text: q, t: Date.now() }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.commanderAsk(q);
      setMessages(m => [...m, {
        role: 'ai',
        text: res.answer || 'No response.',
        fallback: res.fallback,
        t: Date.now(),
      }]);
    } catch (err) {
      setMessages(m => [...m, {
        role: 'ai',
        text: 'AI unreachable. Check connection.',
        fallback: true,
        t: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  const reset = () => setMessages([]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Slide-out panel */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-ink-950 border-l border-purple-500/30 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-fuchsia-500/5">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                  <Brain className="text-purple-300" size={18} />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div>
                  <div className="text-base font-display tracking-wider text-white">RESQ BRAIN</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-purple-300 mt-0.5 flex items-center gap-1.5">
                    <Sparkles size={10} /> Tactical AI Co-pilot
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="tac-btn rounded-lg p-2 text-white/40 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="card rounded-xl p-4 border border-purple-500/30 bg-purple-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="text-purple-300" size={14} />
                      <div className="text-[10px] uppercase tracking-[0.2em] text-purple-300 font-semibold">
                        Welcome, Commander
                      </div>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">
                      I see the live floor — incidents, responders, guests, hazards. Ask me anything tactical.
                    </p>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 font-semibold">Quick questions</div>
                    <div className="space-y-1.5">
                      {QUICK_QUESTIONS.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => ask(q)}
                          disabled={loading}
                          className="w-full tac-btn rounded-lg px-3 py-2.5 text-left text-xs text-white/70 hover:text-white hover:border-purple-500/40 flex items-center justify-between group"
                        >
                          <span>{q}</span>
                          <ChevronRight size={12} className="text-white/30 group-hover:text-purple-300" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : ''}`}
                >
                  {m.role === 'ai' && (
                    <div className="w-7 h-7 rounded-md bg-purple-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0">
                      <Brain className="text-purple-300" size={12} />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    m.role === 'user'
                      ? 'bg-white/10 text-white'
                      : m.fallback
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-100'
                        : 'card border border-purple-500/30 text-white/90'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.text}</div>
                    <div className="text-[9px] text-white/30 mt-1 font-mono">
                      {new Date(m.t).toLocaleTimeString()}
                    </div>
                  </div>
                  {m.role === 'user' && (
                    <div className="w-7 h-7 rounded-md bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                      <User className="text-white/70" size={12} />
                    </div>
                  )}
                </motion.div>
              ))}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-purple-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0">
                    <Brain className="text-purple-300 animate-pulse" size={12} />
                  </div>
                  <div className="card border border-purple-500/30 rounded-lg px-3 py-2.5 flex items-center gap-2">
                    <Loader2 className="text-purple-300 animate-spin" size={12} />
                    <span className="text-xs text-white/60">Thinking...</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="px-5 py-3 border-t border-white/10 bg-ink-900/50">
              {messages.length > 0 && (
                <button onClick={reset} className="text-[10px] uppercase tracking-wider text-white/40 hover:text-white mb-2">
                  ↻ Clear chat
                </button>
              )}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask ResQ Brain..."
                  disabled={loading}
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                />
                <button
                  onClick={() => ask()}
                  disabled={loading || !input.trim()}
                  className="px-4 rounded-lg bg-purple-500 hover:bg-purple-400 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center"
                >
                  <Send size={14} />
                </button>
              </div>
              <div className="text-[9px] text-white/30 mt-1.5 font-mono uppercase tracking-wider text-center">
                Powered by Google Gemini · Live floor data
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
