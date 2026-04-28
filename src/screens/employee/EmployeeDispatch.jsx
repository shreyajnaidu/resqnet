import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Users, Activity, AlertCircle, Clock, TrendingUp, MapPin } from 'lucide-react';
import { useStore } from '../../lib/store.js';
import { api } from '../../lib/api.js';
import { TYPE_COLORS } from '../../lib/helpers.js';
import TopBar from '../../components/TopBar.jsx';

export default function EmployeeDispatch() {
  const navigate = useNavigate();
  const responders = useStore(s => s.responders);
  const incidents = useStore(s => s.incidents);
  const families = useStore(s => s.families);

  const [summary, setSummary] = useState({ total: 0, resolved: 0, avgDuration: 0, byType: {} });
  const [bottlenecks, setBottlenecks] = useState([]);

  useEffect(() => {
    api.analyticsSummary().then(setSummary).catch(() => {});
    api.analyticsBottlenecks().then(setBottlenecks).catch(() => {});
  }, [incidents.length]);

  const allGuests = families.flatMap(f => f.members || []);

  return (
    <div className="relative min-h-screen flex flex-col">
      <TopBar zone="DISPATCH" subtitle="Console · Analytics" showBack backTo="/employee" />

      <div className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="mb-6">
          <div className="text-[11px] uppercase tracking-[0.4em] text-white/40 mb-2">Operations Center</div>
          <h1 className="text-4xl font-display tracking-wide text-white">DISPATCH CONSOLE</h1>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Stat label="Total Incidents" value={summary.total} icon={AlertCircle} />
          <Stat label="Resolved" value={summary.resolved} icon={Activity} accent="text-emerald-400" />
          <Stat label="Avg Duration" value={summary.avgDuration > 0 ? `${Math.round(summary.avgDuration / 1000)}s` : '0s'} icon={Clock} accent="text-cyan-400" />
          <Stat label="Bands Tracked" value={allGuests.length} icon={Users} accent="text-amber-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Responders roster */}
          <div className="lg:col-span-7 card border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="text-white/60" size={16} />
                <div className="font-display tracking-wider text-sm">RESPONDER ROSTER</div>
              </div>
              <div className="text-[10px] text-white/40 font-mono">{responders.length} units</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {responders.map(r => {
                const C = {
                  Fire: TYPE_COLORS.fire, Medical: TYPE_COLORS.medical,
                  Security: TYPE_COLORS.security, Hazard: TYPE_COLORS.hazard,
                }[r.role] || TYPE_COLORS.fire;
                return (
                  <div key={r.id} className="card border border-white/10 rounded-lg p-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0`}
                      style={{ background: C.soft, border: `1px solid ${C.border}`, color: C.primary }}>
                      <span className="text-[10px] font-mono">{r.id}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{r.name}</div>
                      <div className="text-[10px] text-white/40 capitalize truncate">{r.role} · {(r.zone || '').replace('_', ' ')}</div>
                    </div>
                    <div className={`text-[10px] font-mono uppercase ${r.status === 'IDLE' ? 'text-white/40' : r.status === 'EN_ROUTE' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {r.status}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Incidents by type */}
          <div className="lg:col-span-5 space-y-4">
            <div className="card border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-white/60" size={16} />
                  <div className="font-display tracking-wider text-sm">INCIDENTS BY TYPE</div>
                </div>
              </div>
              <div className="space-y-3">
                {Object.entries(summary.byType || {}).length === 0 && (
                  <div className="text-xs text-white/30 py-4 text-center">No incidents recorded yet.</div>
                )}
                {Object.entries(summary.byType || {}).map(([type, count]) => {
                  const C = TYPE_COLORS[type] || TYPE_COLORS.fire;
                  const total = Object.values(summary.byType).reduce((a, b) => a + b, 0);
                  const pct = (count / Math.max(1, total)) * 100;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className={`uppercase font-semibold ${C.text}`}>{type}</div>
                        <div className="text-white/60 font-mono">{count}</div>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: C.primary }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="text-white/60" size={16} />
                  <div className="font-display tracking-wider text-sm">BOTTLENECK ZONES</div>
                </div>
              </div>
              <div className="space-y-2">
                {bottlenecks.length === 0 ? (
                  <div className="text-xs text-white/30 py-4 text-center">No bottleneck data.</div>
                ) : bottlenecks.slice(0, 5).map((b, i) => (
                  <div key={b.zone} className="flex items-center gap-3 text-xs">
                    <div className="w-5 text-right text-white/40 font-mono tabular">{i + 1}</div>
                    <div className="flex-1 capitalize text-white">{(b.zone || '').replace('_', ' ')}</div>
                    <div className="font-mono text-amber-400">{b.count}x</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Incident log */}
        <div className="mt-6 card border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-white/60" size={16} />
            <div className="font-display tracking-wider text-sm">INCIDENT LOG</div>
          </div>
          {incidents.length === 0 ? (
            <div className="text-xs text-white/30 py-6 text-center">No incidents.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
                    <th className="text-left py-2 font-semibold">Type</th>
                    <th className="text-left py-2 font-semibold">Zone</th>
                    <th className="text-left py-2 font-semibold">Severity</th>
                    <th className="text-left py-2 font-semibold">Started</th>
                    <th className="text-left py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.slice().reverse().slice(0, 10).map(inc => {
                    const C = TYPE_COLORS[inc.type] || TYPE_COLORS.fire;
                    return (
                      <tr key={inc.id} className="border-b border-white/[0.04]">
                        <td className={`py-2 ${C.text} uppercase font-semibold`}>{inc.type}</td>
                        <td className="py-2 text-white/70 capitalize">{(inc.zone || '').replace('_', ' ')}</td>
                        <td className="py-2 text-white/60 font-mono">SEV {inc.severity}</td>
                        <td className="py-2 text-white/50 font-mono">{new Date(inc.startedAt).toLocaleTimeString()}</td>
                        <td className="py-2"><span className={`text-[10px] font-mono uppercase ${inc.endedAt ? 'text-emerald-400' : 'text-red-400'}`}>{inc.endedAt ? 'RESOLVED' : 'ACTIVE'}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon, accent = 'text-white' }) {
  return (
    <div className="card border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={12} className="text-white/40" />
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">{label}</div>
      </div>
      <div className={`text-3xl font-display tabular ${accent}`}>{value}</div>
      {sub && <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">{sub}</div>}
    </div>
  );
}
