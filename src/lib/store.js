import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // Auth
  session: null, // { kind: 'guest'|'employee', user, token }
  setSession: (session) => {
    if (session) localStorage.setItem('resqnet_session', JSON.stringify(session));
    else localStorage.removeItem('resqnet_session');
    set({ session });
  },
  hydrate: () => {
    try {
      const raw = localStorage.getItem('resqnet_session');
      if (raw) set({ session: JSON.parse(raw) });
    } catch {}
  },

  // Live data
  zones: [],
  exits: [],
  densities: {},
  setZones: (zones, exits) => set({ zones, exits }),
  setDensities: (densities) => set({ densities }),

  responders: [],
  setResponders: (responders) => set({ responders }),

  families: [],
  setFamilies: (families) => set({ families }),

  incidents: [],
  setIncidents: (incidents) => set({ incidents }),
  activeIncidentId: null,
  setActiveIncidentId: (id) => set({ activeIncidentId: id }),
  upsertIncident: (incident) => set(state => {
    const idx = state.incidents.findIndex(i => i.id === incident.id);
    if (idx >= 0) {
      const next = [...state.incidents];
      next[idx] = { ...next[idx], ...incident };
      return { incidents: next };
    }
    return { incidents: [...state.incidents, incident] };
  }),

  // PPS
  pps: { predictions: [], actions: [] },
  setPps: (pps) => set({ pps }),

  // Hazard spread
  hazardSpread: null,
  setHazardSpread: (s) => set({ hazardSpread: s }),

  // SOS feed
  sosFeed: [],
  pushSos: (sos) => set(state => ({ sosFeed: [sos, ...state.sosFeed].slice(0, 30) })),

  // Guest alerts
  guestAlerts: [],
  pushGuestAlert: (alert) => set(state => ({ guestAlerts: [alert, ...state.guestAlerts].slice(0, 20) })),

  // Auto-escalations
  escalations: [],
  pushEscalation: (e) => set(state => ({ escalations: [e, ...state.escalations].slice(0, 10) })),

  // Demo mode (auto-play)
  demoActive: false,
  demoStep: 0,
  setDemo: (active, step = 0) => set({ demoActive: active, demoStep: step }),

  // Theme severity (drives global ambient color)
  themeSeverity: { level: 0, type: null },
  setThemeSeverity: (t) => set({ themeSeverity: t }),

  // Toast
  toasts: [],
  toast: (t) => {
    const id = Math.random().toString(36).slice(2);
    set(state => ({ toasts: [...state.toasts, { id, ...t }] }));
    setTimeout(() => set(state => ({ toasts: state.toasts.filter(x => x.id !== id) })), t.duration || 3500);
  },

  // Selected guest (for guest mode)
  guestProfile: null,
  setGuestProfile: (g) => set({ guestProfile: g }),
}));
