import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Watch, Lock, User, ArrowRight, Shield, Bluetooth, AlertCircle, ChevronLeft } from 'lucide-react';
import { useStore } from '../lib/store.js';
import { api } from '../lib/api.js';
import Backdrop from '../components/Backdrop.jsx';

const GUEST_LIST = [
  { id: 'g-01', name: 'Aryan Kumar',  age: 8,  family: 'Aryan Family', zone: 'Pool Area',   hasBand: true,  reason: 'Child · auto-paired' },
  { id: 'g-02', name: 'Priya Kumar',  age: 35, family: 'Aryan Family', zone: 'Restaurant',  hasBand: false, reason: 'Phone app user' },
  { id: 'g-03', name: 'Kavita Kumar', age: 62, family: 'Aryan Family', zone: 'Main Lobby',  hasBand: true,  reason: 'Senior · auto-paired' },
  { id: 'g-04', name: 'Raj Kumar',    age: 40, family: 'Aryan Family', zone: 'Room 101',    hasBand: false, reason: 'Phone app user' },
  { id: 'g-05', name: 'Rohan Sharma', age: 28, family: 'Kumar Family', zone: 'Main Lobby',  hasBand: false, reason: 'Phone app user' },
  { id: 'g-06', name: 'Anjali Sharma',age: 26, family: 'Kumar Family', zone: 'Reception',   hasBand: false, reason: 'Phone app user · hearing aid' },
];

export default function LoginScreen() {
  const navigate = useNavigate();
  const setSession = useStore(s => s.setSession);
  const setGuestProfile = useStore(s => s.setGuestProfile);
  const [path, setPath] = useState(null); // 'guest' | 'employee'
  const [employeeForm, setEmployeeForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleEmployeeLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.login(employeeForm.username, employeeForm.password);
      setSession({ kind: 'employee', user: res.user, token: res.token });
      navigate('/employee');
    } catch (err) {
      setError('Invalid credentials. Try admin/admin123 or staff/staff123.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = (g) => {
    setScanning(true);
    setTimeout(() => {
      setGuestProfile(g);
      setSession({
        kind: 'guest',
        user: { username: g.id, name: g.name, role: 'guest' },
        token: `guest-${g.id}`,
        deviceType: g.hasBand ? 'band' : 'phone',
      });
      navigate('/guest');
    }, g.hasBand ? 1400 : 700); // band pairing takes longer
  };

  const quickFill = (u, p) => setEmployeeForm({ username: u, password: p });

  return (
    <div className="relative min-h-screen w-screen overflow-hidden">
      <Backdrop />

      {/* Big background flame */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500/[0.04] pointer-events-none">
        <Flame size={800} fill="currentColor" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="px-8 pt-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-red-500 relative">
              <Flame size={22} fill="currentColor" />
              <div className="absolute inset-0 bg-red-500/40 blur-xl -z-10" />
            </div>
            <div>
              <div className="font-display tracking-[0.3em] text-white">RESQNET</div>
              <div className="text-[9px] uppercase tracking-[0.3em] text-white/40 -mt-0.5">v2.4.1 · ble-mesh ready</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            All systems operational
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <AnimatePresence mode="wait">
            {!path && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-5xl w-full"
              >
                <div className="text-center mb-12">
                  <div className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-3">Emergency Response System</div>
                  <h1 className="text-6xl md:text-8xl font-display text-white" style={{ letterSpacing: '0.04em' }}>
                    TACTICAL OVERRIDE
                  </h1>
                  <div className="mt-4 text-sm text-white/50 max-w-2xl mx-auto">
                    Predict. Guide. Verify. — A protocol-driven crisis response platform built for hotels, venues and resorts.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <PortalCard
                    onClick={() => setPath('guest')}
                    icon={Watch}
                    title="GUEST"
                    subtitle="Band or Phone App"
                    description="Triple-tap SOS · Receive guidance · Stay informed."
                    accent="emerald"
                    badge="Auto-paired or app sign-in"
                  />
                  <PortalCard
                    onClick={() => setPath('employee')}
                    icon={Shield}
                    title="EMPLOYEE"
                    subtitle="Tactical Command"
                    description="Dispatch · Override · Coordinate the floor."
                    accent="red"
                    badge="Credentialed access only"
                  />
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] text-white/40">
                  <span className="flex items-center gap-2"><Bluetooth size={12} /> Mesh ready</span>
                  <span>·</span>
                  <span>Offline tolerant</span>
                  <span>·</span>
                  <span>Self-healing network</span>
                  <span>·</span>
                  <span>Encrypted dispatch</span>
                </div>
              </motion.div>
            )}

            {path === 'guest' && (
              <motion.div
                key="guest"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl w-full"
              >
                <button onClick={() => setPath(null)} className="text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-white mb-6 flex items-center gap-1">
                  <ChevronLeft size={14} /> back
                </button>

                <div className="card rounded-2xl border border-emerald-500/30 p-8">
                  <div className="flex items-center gap-3 mb-2">
                    <Watch className="text-emerald-400" size={20} />
                    <h2 className="font-display tracking-wider text-2xl text-white">SELECT YOUR PROFILE</h2>
                  </div>
                  <p className="text-sm text-white/60 mb-6">
                    Children (under 10) and seniors (over 60) wear a Guardian Band — paired automatically at check-in.
                    Adults use the ResQnet phone app.
                  </p>

                  {scanning && (
                    <div className="py-12 flex flex-col items-center">
                      <div className="relative w-24 h-24 mb-4">
                        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-400 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Bluetooth className="text-emerald-400" size={24} />
                        </div>
                      </div>
                      <div className="text-sm text-white/80">Authenticating...</div>
                      <div className="text-[10px] text-white/40 font-mono mt-1">handshake · key exchange · verify</div>
                    </div>
                  )}

                  {!scanning && (
                    <div className="space-y-5">
                      {/* Band wearers */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-semibold">Guardian Band Wearers</div>
                          <div className="flex-1 h-px bg-emerald-500/20" />
                          <div className="text-[9px] text-white/40 font-mono">{GUEST_LIST.filter(g => g.hasBand).length}</div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {GUEST_LIST.filter(g => g.hasBand).map(g => (
                            <button
                              key={g.id}
                              onClick={() => handleGuestLogin(g)}
                              className="tac-btn rounded-lg p-3 text-left hover:border-emerald-500/40 transition-colors group"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <Watch size={12} className="text-emerald-400" />
                                    <div className="text-sm font-semibold text-white">{g.name}</div>
                                  </div>
                                  <div className="text-[10px] text-white/50 mt-0.5">Age {g.age} · {g.family}</div>
                                  <div className="text-[10px] text-emerald-400 mt-1 font-mono">{g.reason} · Band {g.id.toUpperCase()}</div>
                                </div>
                                <ArrowRight size={14} className="text-white/30 group-hover:text-emerald-400 transition-colors" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Phone users */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">ResQnet App Users</div>
                          <div className="flex-1 h-px bg-cyan-500/20" />
                          <div className="text-[9px] text-white/40 font-mono">{GUEST_LIST.filter(g => !g.hasBand).length}</div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {GUEST_LIST.filter(g => !g.hasBand).map(g => (
                            <button
                              key={g.id}
                              onClick={() => handleGuestLogin(g)}
                              className="tac-btn rounded-lg p-3 text-left hover:border-cyan-500/40 transition-colors group"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <User size={12} className="text-cyan-400" />
                                    <div className="text-sm font-semibold text-white">{g.name}</div>
                                  </div>
                                  <div className="text-[10px] text-white/50 mt-0.5">Age {g.age} · {g.family}</div>
                                  <div className="text-[10px] text-cyan-400 mt-1 font-mono">{g.reason} · ID {g.id.toUpperCase()}</div>
                                </div>
                                <ArrowRight size={14} className="text-white/30 group-hover:text-cyan-400 transition-colors" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {path === 'employee' && (
              <motion.div
                key="employee"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-md w-full"
              >
                <button onClick={() => setPath(null)} className="text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-white mb-6 flex items-center gap-1">
                  <ChevronLeft size={14} /> back
                </button>

                <div className="card rounded-2xl border border-red-500/30 p-8">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="text-red-400" size={20} />
                    <h2 className="font-display tracking-wider text-2xl text-white">TACTICAL ACCESS</h2>
                  </div>
                  <p className="text-sm text-white/60 mb-6">Authorized personnel only. All actions are logged and auditable.</p>

                  <form onSubmit={handleEmployeeLogin} className="space-y-3">
                    <Field icon={User} placeholder="username" value={employeeForm.username} onChange={v => setEmployeeForm({ ...employeeForm, username: v })} autoFocus />
                    <Field icon={Lock} type="password" placeholder="password" value={employeeForm.password} onChange={v => setEmployeeForm({ ...employeeForm, password: v })} />

                    {error && (
                      <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                        <AlertCircle size={14} /> {error}
                      </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-display tracking-[0.2em] py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                      {loading ? 'AUTHENTICATING...' : 'ACCESS COMMAND'}
                      <ArrowRight size={16} />
                    </button>
                  </form>

                  <div className="mt-5 pt-5 border-t border-white/10">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Demo Credentials</div>
                    <div className="grid grid-cols-3 gap-2">
                      <DemoCred onClick={() => quickFill('admin', 'admin123')} label="Commander" sub="admin" />
                      <DemoCred onClick={() => quickFill('staff', 'staff123')} label="Officer" sub="staff" />
                      <DemoCred onClick={() => quickFill('medic', 'medic123')} label="Medic" sub="medic" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PortalCard({ icon: Icon, title, subtitle, description, accent, badge, onClick }) {
  const colors = {
    emerald: { border: 'border-emerald-500/30 hover:border-emerald-500/60', icon: 'text-emerald-400', bg: 'bg-emerald-500/5', accent: 'text-emerald-300', glow: 'group-hover:shadow-emerald-500/20' },
    red: { border: 'border-red-500/30 hover:border-red-500/60', icon: 'text-red-400', bg: 'bg-red-500/5', accent: 'text-red-300', glow: 'group-hover:shadow-red-500/20' },
  }[accent];

  return (
    <motion.button
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`group card rounded-2xl border ${colors.border} ${colors.bg} p-7 text-left transition-all hover:shadow-2xl ${colors.glow} relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 -mr-32 -mt-32 rounded-full opacity-30" style={{ background: `radial-gradient(circle, ${accent === 'emerald' ? '#10b98140' : '#ef444440'}, transparent 70%)` }} />

      <div className="flex items-start justify-between mb-6 relative">
        <div className={`w-14 h-14 rounded-xl ${colors.bg} border ${colors.border.split(' ')[0]} flex items-center justify-center ${colors.icon}`}>
          <Icon size={26} />
        </div>
        <div className="text-[9px] uppercase tracking-[0.2em] text-white/40">{badge}</div>
      </div>

      <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-1">{subtitle}</div>
      <div className={`text-4xl font-display tracking-wide ${colors.accent} mb-3`}>{title}</div>
      <div className="text-sm text-white/60 mb-6">{description}</div>

      <div className="flex items-center gap-2 text-xs text-white/70 group-hover:gap-3 transition-all">
        <span className="uppercase tracking-[0.2em] font-semibold">Continue</span>
        <ArrowRight size={14} className={colors.icon} />
      </div>
    </motion.button>
  );
}

function Field({ icon: Icon, type = 'text', placeholder, value, onChange, autoFocus }) {
  return (
    <div className="flex items-center gap-2 tac-btn rounded-lg px-3 py-2.5 focus-within:border-red-500/40">
      <Icon size={14} className="text-white/40" />
      <input
        type={type}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30"
      />
    </div>
  );
}

function DemoCred({ onClick, label, sub }) {
  return (
    <button type="button" onClick={onClick} className="tac-btn rounded-lg p-2 text-left hover:border-red-500/40">
      <div className="text-[10px] text-white font-semibold">{label}</div>
      <div className="text-[9px] text-white/40 font-mono">{sub}</div>
    </button>
  );
}
