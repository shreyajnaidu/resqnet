const BASE = '/api';

const headers = () => {
  const h = { 'Content-Type': 'application/json' };
  try {
    const s = JSON.parse(localStorage.getItem('resqnet_session') || 'null');
    if (s?.token) h.Authorization = `Bearer ${s.token}`;
  } catch {}
  return h;
};

export const api = {
  async login(username, password) {
    const r = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!r.ok) throw new Error('Invalid credentials');
    return r.json();
  },
  async me() {
    const r = await fetch(`${BASE}/auth/me`, { headers: headers() });
    if (!r.ok) throw new Error('Unauthenticated');
    return r.json();
  },
  async zones() {
    const r = await fetch(`${BASE}/zones`);
    return r.json();
  },
  async responders() {
    const r = await fetch(`${BASE}/responders`);
    return r.json();
  },
  async families() {
    const r = await fetch(`${BASE}/families`);
    return r.json();
  },
  async incidents() {
    const r = await fetch(`${BASE}/incidents`);
    return r.json();
  },
  async createIncident(type, zone, severity = 3) {
    const r = await fetch(`${BASE}/incidents`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ type, zone, severity }),
    });
    return r.json();
  },
  async endIncident(id) {
    const r = await fetch(`${BASE}/incidents/${id}/end`, {
      method: 'POST',
      headers: headers(),
    });
    return r.json();
  },
  async escalate(id) {
    const r = await fetch(`${BASE}/incidents/${id}/escalate`, {
      method: 'POST',
      headers: headers(),
    });
    return r.json();
  },
  async setResponder(id, body) {
    const r = await fetch(`${BASE}/responders/${id}/status`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
    return r.json();
  },
  async sendGuestAlert(guestId, message) {
    const r = await fetch(`${BASE}/guest-alerts`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ guestId, message }),
    });
    return r.json();
  },
  async uploadEvidence(payload) {
    const r = await fetch(`${BASE}/evidence`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return r.json();
  },
  async listEvidence() {
    const r = await fetch(`${BASE}/evidence`, { headers: headers() });
    return r.json();
  },
  async getEvidenceFile(id) {
    const r = await fetch(`${BASE}/evidence/file/${id}`, { headers: headers() });
    return r.json();
  },
  async analyticsSummary() {
    const r = await fetch(`${BASE}/analytics/summary`);
    return r.json();
  },
  async analyticsBottlenecks() {
    const r = await fetch(`${BASE}/analytics/bottlenecks`);
    return r.json();
  },
  async classifyText(description, guest = null) {
    const r = await fetch(`${BASE}/ai/classify-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, guest }),
    });
    return r.json();
  },
  async commanderAsk(question) {
    const r = await fetch(`${BASE}/ai/commander`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    return r.json();
  },
};
