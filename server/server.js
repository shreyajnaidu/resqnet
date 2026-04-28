require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const floorPlan = require('./data/floorPlan.json');
const mockResponders = require('./data/mockResponders.json');
const mockGuests = require('./data/mockGuests.json');
const users = require('./data/users.json');
const { calculatePPS } = require('./engines/pps');
const { simulateSpread } = require('./engines/hazardSpread');
const { findSafeRoute } = require('./engines/evacuationRouter');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ===== In-memory state =====
const state = {
  incidents: [],             // { id, type, zone, severity, startedAt, endedAt, events: [] }
  activeIncidentId: null,
  responders: JSON.parse(JSON.stringify(mockResponders)),
  families: JSON.parse(JSON.stringify(mockGuests)),
  zoneDensities: {},         // zoneId -> person count
  sosQueue: [],
  hazardState: null,         // { sourceZone, startedAt }
  evidence: [],              // { id, incidentId, dataUrl, gps, t, note }
  guestAlerts: []             // { id, guestId, message, t }
};

// Seed initial densities
floorPlan.zones.forEach(z => {
  state.zoneDensities[z.id] = Math.floor(z.capacity * (0.2 + Math.random() * 0.4));
});

function log(incidentId, event) {
  const inc = state.incidents.find(i => i.id === incidentId);
  if (inc) inc.events.push({ ...event, t: Date.now() });
}

// ===== REST endpoints =====

app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ===== Gemini helper =====
async function callGemini(prompt, { json = false, temperature = 0.4, maxTokens = 500 } = {}) {
  if (!process.env.GEMINI_API_KEY) {
    return { ok: false, error: 'GEMINI_API_KEY not set' };
  }
  try {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    };
    if (json) body.generationConfig.responseMimeType = 'application/json';

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    if (!r.ok) {
      const t = await r.text();
      console.error('[Gemini] HTTP', r.status, t);
      return { ok: false, error: `HTTP ${r.status}` };
    }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { ok: true, text };
  } catch (e) {
    console.error('[Gemini] fetch error', e);
    return { ok: false, error: String(e) };
  }
}

// ===== AI Classify by description (Guest side) =====
app.post('/api/ai/classify-text', async (req, res) => {
  const { description, guest } = req.body || {};
  if (!description || description.trim().length < 3) {
    return res.status(400).json({ error: 'description too short' });
  }

  const prompt = `You are a hotel emergency response AI. A guest has typed what they're seeing. Classify the emergency.

Guest reported: "${description}"
${guest ? `Guest profile: ${guest.name}, age ${guest.age}, currently in ${guest.zone}.` : ''}

Respond with ONLY a JSON object (no markdown, no fences) in this exact format:
{
  "type": "fire" | "medical" | "security" | "hazard",
  "severity": 1-5,
  "confidence": 0.0-1.0,
  "summary": "1 short sentence describing what is happening",
  "recommendation": "1 short sentence on what staff should do"
}

Categorization rules:
- fire = flames, smoke, burning smell, fire alarm
- medical = injury, fall, unconscious, chest pain, drowning, breathing issue
- security = unauthorized person, fight, weapon, theft, suspicious behavior
- hazard = gas smell, chemical spill, water leak, broken glass, electrical issue, structural

Severity scale: 1=minor, 2=small, 3=moderate, 4=serious, 5=critical/mass-casualty.

If unclear, default to type="hazard", severity=2, confidence=0.3.`;

  const result = await callGemini(prompt, { json: true, temperature: 0.2, maxTokens: 300 });

  if (!result.ok) {
    return res.json({
      type: 'hazard', severity: 3, confidence: 0.3,
      summary: 'AI service unavailable.',
      recommendation: 'Pick emergency type manually.',
      fallback: true,
    });
  }

  let parsed;
  try {
    const cleaned = result.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return res.json({
      type: 'hazard', severity: 3, confidence: 0.3,
      summary: 'Could not parse AI response.',
      recommendation: 'Pick emergency type manually.',
      fallback: true,
    });
  }

  const validTypes = ['fire', 'medical', 'security', 'hazard'];
  if (!validTypes.includes(parsed.type)) parsed.type = 'hazard';
  parsed.severity = Math.max(1, Math.min(5, parseInt(parsed.severity) || 3));
  parsed.confidence = Math.max(0, Math.min(1, parseFloat(parsed.confidence) || 0.5));
  parsed.fallback = false;

  console.log('[Gemini classify-text]', parsed.type, 'sev', parsed.severity);
  res.json(parsed);
});

// ===== ResQ Brain — Commander Copilot (Employee side) =====
app.post('/api/ai/commander', async (req, res) => {
  const { question } = req.body || {};
  if (!question || question.trim().length < 2) {
    return res.status(400).json({ error: 'question required' });
  }

  // Build live tactical context
  const activeIncidents = state.incidents.filter(i => !i.endedAt);
  const allGuests = state.families.flatMap(f => f.members || []);
  const evacuated = allGuests.filter(g => g.evacuated);
  const stillInside = allGuests.filter(g => !g.evacuated);

  const ctx = `
LIVE FLOOR STATE (as of ${new Date().toLocaleTimeString()}):

ACTIVE INCIDENTS: ${activeIncidents.length === 0 ? 'None — all clear.' : activeIncidents.map(i =>
    `- ${i.type.toUpperCase()} in ${i.zone}, severity ${i.severity}, started ${Math.floor((Date.now() - i.startedAt) / 1000)}s ago`
  ).join('\n')}

ZONES (${floorPlan.zones.length} total): ${floorPlan.zones.map(z => `${z.name} (cap ${z.capacity}, current ~${Math.round(state.zoneDensities[z.id] || 0)})`).join('; ')}

EXITS: ${floorPlan.exits.map(e => `${e.name} via ${e.zone}`).join('; ')}

GUESTS (${allGuests.length} total, ${evacuated.length} evacuated, ${stillInside.length} still inside):
${stillInside.slice(0, 10).map(g => `- ${g.name} (${g.id}, age ${g.age}, ${g.hasBand ? 'BAND' : 'APP'}, ${g.accessibility || 'no special needs'}) in ${g.zone}`).join('\n')}

RESPONDERS:
${state.responders.map(r => `- ${r.name} (${r.role}) in ${r.zone}, status ${r.status}`).join('\n')}

${state.hazardState ? `HAZARD SPREAD: source ${state.hazardState.sourceZone}, started ${Math.floor((Date.now() - state.hazardState.startedAt) / 1000)}s ago` : ''}
`;

  const prompt = `You are ResQ Brain, a tactical AI assistant for hotel emergency response staff. You see the LIVE state of the floor and answer the commander's questions with concrete, actionable advice.

${ctx}

COMMANDER ASKS: "${question}"

RESPONSE RULES:
- Be DIRECT and TACTICAL. No hedging, no "I think", no "consider".
- Give SPECIFIC names, zones, and actions. Not "someone should" — say WHO and WHAT.
- Maximum 4 sentences. Hotels don't have time to read essays in a fire.
- If you don't have enough data, say what info you need.
- Use simple line breaks for clarity. No markdown bullets or headers.
- Prioritize children, elderly, and people with accessibility needs.
- If asked something off-topic, redirect: "I can only help with emergency response."

Answer:`;

  const result = await callGemini(prompt, { temperature: 0.3, maxTokens: 400 });

  if (!result.ok) {
    return res.json({
      answer: 'AI service unavailable right now. Use the dashboard widgets directly.',
      fallback: true,
    });
  }

  console.log('[Gemini commander] q:', question.slice(0, 60));
  res.json({ answer: result.text.trim(), fallback: false });
});

// ===== Auth =====
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = Buffer.from(`${user.username}:${Date.now()}`).toString('base64');
  res.json({ token, user: { username: user.username, role: user.role, name: user.name } });
});

app.get('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  try {
    const [username] = Buffer.from(token, 'base64').toString().split(':');
    const u = users.find(x => x.username === username);
    if (!u) return res.status(401).json({ error: 'Invalid token' });
    res.json({ username: u.username, role: u.role, name: u.name });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

// ===== Evidence =====
app.post('/api/evidence', (req, res) => {
  const { incidentId, dataUrl, gps, note } = req.body || {};
  const e = { id: uuidv4(), incidentId: incidentId || null, dataUrl, gps: gps || null, note: note || '', t: Date.now() };
  state.evidence.unshift(e);
  if (state.evidence.length > 200) state.evidence.pop();
  io.emit('evidence:new', { id: e.id, incidentId: e.incidentId, gps: e.gps, note: e.note, t: e.t });
  res.json({ id: e.id });
});

app.get('/api/evidence/:incidentId', (req, res) => {
  res.json(state.evidence.filter(e => e.incidentId === req.params.incidentId));
});

app.get('/api/evidence', (_req, res) => res.json(state.evidence.map(e => ({ id: e.id, incidentId: e.incidentId, gps: e.gps, note: e.note, t: e.t }))));

app.get('/api/evidence/file/:id', (req, res) => {
  const e = state.evidence.find(x => x.id === req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  res.json({ dataUrl: e.dataUrl });
});

// ===== Guest alerts (staff -> individual guest) =====
app.post('/api/guest-alerts', (req, res) => {
  const { guestId, message } = req.body || {};
  const a = { id: uuidv4(), guestId, message, t: Date.now() };
  state.guestAlerts.unshift(a);
  if (state.guestAlerts.length > 100) state.guestAlerts.pop();
  io.emit('guest:alert', a);
  res.json(a);
});

app.get('/api/zones', (_req, res) => {
  res.json({
    zones: floorPlan.zones,
    exits: floorPlan.exits,
    densities: state.zoneDensities
  });
});

app.get('/api/responders', (_req, res) => res.json(state.responders));

app.post('/api/responders/:id/status', (req, res) => {
  const r = state.responders.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  Object.assign(r, req.body, { lastUpdate: Date.now() });
  io.emit('responder:feed', state.responders);
  res.json(r);
});

app.get('/api/families', (_req, res) => res.json(state.families));

app.get('/api/incidents', (_req, res) => res.json(state.incidents));

app.get('/api/incidents/:id', (req, res) => {
  const inc = state.incidents.find(i => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: 'Not found' });
  res.json(inc);
});

app.post('/api/incidents', (req, res) => {
  const { type, zone, severity = 3 } = req.body;
  const incident = {
    id: uuidv4(),
    type,
    zone,
    severity,
    startedAt: Date.now(),
    endedAt: null,
    events: [{ t: Date.now(), kind: 'CREATED', detail: `${type} incident in ${zone}` }],
    sosCount: 0
  };
  state.incidents.push(incident);
  state.activeIncidentId = incident.id;

  if (type === 'hazard') state.hazardState = { sourceZone: zone, startedAt: Date.now() };

  io.emit('incident:new', incident);
  io.emit('theme:severity', { level: severity, type });
  res.json(incident);
});

app.post('/api/incidents/:id/end', (req, res) => {
  const inc = state.incidents.find(i => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: 'Not found' });
  inc.endedAt = Date.now();
  log(inc.id, { kind: 'ENDED', detail: 'Incident closed' });
  if (state.activeIncidentId === inc.id) state.activeIncidentId = null;
  state.hazardState = null;
  io.emit('incident:update', { incidentId: inc.id, changes: { endedAt: inc.endedAt } });
  io.emit('theme:severity', { level: 0, type: null });
  res.json(inc);
});

app.post('/api/incidents/:id/escalate', (req, res) => {
  const inc = state.incidents.find(i => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: 'Not found' });
  inc.severity = Math.min(5, inc.severity + 1);
  log(inc.id, { kind: 'ESCALATED', detail: `Severity -> ${inc.severity}` });
  io.emit('incident:update', { incidentId: inc.id, changes: { severity: inc.severity } });
  io.emit('theme:severity', { level: inc.severity, type: inc.type });
  res.json(inc);
});

app.get('/api/analytics/summary', (_req, res) => {
  const total = state.incidents.length;
  const resolved = state.incidents.filter(i => i.endedAt).length;
  const avgDuration = resolved
    ? state.incidents.filter(i => i.endedAt).reduce((a, i) => a + (i.endedAt - i.startedAt), 0) / resolved
    : 0;
  const byType = {};
  state.incidents.forEach(i => { byType[i.type] = (byType[i.type] || 0) + 1; });
  res.json({ total, resolved, avgDuration, byType });
});

app.get('/api/analytics/bottlenecks', (_req, res) => {
  const counts = {};
  state.incidents.forEach(i => {
    counts[i.zone] = (counts[i.zone] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([zone, count]) => ({ zone, count }));
  res.json(sorted);
});

// ===== Socket.IO =====
io.on('connection', (socket) => {
  socket.emit('state:snapshot', {
    incidents: state.incidents,
    responders: state.responders,
    families: state.families,
    densities: state.zoneDensities,
    activeIncidentId: state.activeIncidentId
  });

  socket.on('sos:trigger', (data) => {
    const sos = { id: uuidv4(), ...data, t: Date.now() };
    state.sosQueue.unshift(sos);
    if (state.sosQueue.length > 50) state.sosQueue.pop();
    const active = state.incidents.find(i => i.id === state.activeIncidentId);
    if (active) {
      active.sosCount = (active.sosCount || 0) + 1;
      log(active.id, { kind: 'SOS', detail: `${data.type || 'generic'} in ${data.zone}`, source: data.source });
    }
    io.emit('sos:new', sos);
  });

  socket.on('responder:update', (data) => {
    const r = state.responders.find(x => x.id === data.id);
    if (!r) return;
    Object.assign(r, data, { lastUpdate: Date.now() });
    const active = state.incidents.find(i => i.id === state.activeIncidentId);
    if (active) log(active.id, { kind: 'RESPONDER_UPDATE', detail: `${r.name} -> ${r.status} @ ${r.zone}` });
    io.emit('responder:feed', state.responders);
  });

  socket.on('voice:help_detected', (data) => {
    const sos = { id: uuidv4(), type: 'voice_help', zone: data.zone || 'lobby', source: 'voice', severity: 4, t: Date.now() };
    state.sosQueue.unshift(sos);
    io.emit('sos:new', sos);
  });

  socket.on('evacuation:start', (data) => {
    const active = state.incidents.find(i => i.id === data.incidentId);
    if (active) log(active.id, { kind: 'EVACUATION_START', detail: data.strategy || 'STAGGERED' });
    io.emit('evacuation:started', { incidentId: data.incidentId, strategy: data.strategy });
  });

  socket.on('family:evacuate_member', (data) => {
    for (const fam of state.families) {
      const m = fam.members.find(mm => mm.id === data.memberId);
      if (m) { m.evacuated = true; break; }
    }
    io.emit('family:update', state.families);
  });
});

// ===== Simulation loop =====
// Every 2s: if active incident, update densities, emit PPS, check auto-escalate
setInterval(() => {
  const active = state.incidents.find(i => i.id === state.activeIncidentId);

  // Drift densities slightly
  floorPlan.zones.forEach(z => {
    const d = state.zoneDensities[z.id];
    const noise = (Math.random() - 0.5) * 4;
    state.zoneDensities[z.id] = Math.max(0, Math.min(z.capacity * 1.2, d + noise));
  });

  if (active && !active.endedAt) {
    // Push density up in the incident zone
    const z = floorPlan.zones.find(zz => zz.id === active.zone);
    if (z) {
      state.zoneDensities[active.zone] = Math.min(z.capacity * 1.1, state.zoneDensities[active.zone] + 1.5);
    }

    const pps = calculatePPS(active.zone, state.zoneDensities);
    io.emit('pps:update', { ...pps, densities: state.zoneDensities });

    if (active.type === 'hazard' && state.hazardState) {
      const mins = (Date.now() - state.hazardState.startedAt) / 60000;
      io.emit('hazard:spread', simulateSpread(state.hazardState.sourceZone, mins));
    }

    // Auto-escalate check
    const now = Date.now();
    state.responders.forEach(r => {
      if (r.status !== 'IDLE' && r.movement === 'stationary' && r.lastUpdate) {
        const diff = (now - r.lastUpdate) / 1000;
        if (diff > 180 && !r._escalated) {
          r._escalated = true;
          io.emit('auto_escalate:alert', { responderId: r.id, name: r.name, reason: '3+ min stationary with no update' });
          log(active.id, { kind: 'AUTO_ESCALATE', detail: `${r.name} unresponsive` });
        }
      }
    });
  } else {
    io.emit('density:update', { densities: state.zoneDensities });
  }
}, 2000);

const path = require("path");

// Serve frontend build
app.use(express.static(path.join(process.cwd(), "dist")));

// For all other routes → send frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "dist", "index.html"));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚨 ResQnet backend running on http://localhost:${PORT}`);
  console.log(`   Socket.IO ready. Waiting for frontend connections...\n`);
});
