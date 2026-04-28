import React, { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';

export default function VoiceBanner({ lines, color = 'text-red-400', interval = 3500, speak = false }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % lines.length), interval);
    return () => clearInterval(t);
  }, [lines, interval]);

  // Optional speech synthesis
  useEffect(() => {
    if (!speak || typeof window === 'undefined' || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(lines[idx]);
    u.rate = 1.05;
    u.pitch = 1.0;
    u.volume = 0.7;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return () => window.speechSynthesis.cancel();
  }, [idx, lines, speak]);

  return (
    <div className="card rounded-lg px-4 py-2.5 flex items-center gap-3 backdrop-blur-md max-w-md">
      <div className="relative flex-shrink-0">
        <Volume2 className={`${color} animate-pulse`} size={16} />
        <div className="absolute -inset-1 rounded-full bg-current opacity-20 animate-ping" />
      </div>
      <div className="text-sm text-white/90 font-medium" key={idx}>{lines[idx]}</div>
    </div>
  );
}
