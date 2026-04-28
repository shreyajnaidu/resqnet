import { io } from 'socket.io-client';
import { useStore } from './store.js';

let socket = null;

export const connectSocket = () => {
  if (socket) return socket;
  socket = io({ transports: ['websocket', 'polling'] });

  socket.on('state:snapshot', (snap) => {
    if (snap.incidents) useStore.getState().setIncidents(snap.incidents);
    if (snap.responders) useStore.getState().setResponders(snap.responders);
    if (snap.families) useStore.getState().setFamilies(snap.families);
    if (snap.densities) useStore.getState().setDensities(snap.densities);
    if (snap.activeIncidentId) useStore.getState().setActiveIncidentId(snap.activeIncidentId);
  });

  socket.on('incident:new', (incident) => {
    useStore.getState().upsertIncident(incident);
    useStore.getState().setActiveIncidentId(incident.id);
    useStore.getState().toast({ kind: 'incident', title: `${incident.type.toUpperCase()} ALERT`, body: `Zone: ${incident.zone}` });
  });

  socket.on('incident:update', ({ incidentId, changes }) => {
    useStore.getState().upsertIncident({ id: incidentId, ...changes });
  });

  socket.on('responder:feed', (responders) => {
    useStore.getState().setResponders(responders);
  });

  socket.on('family:update', (families) => {
    useStore.getState().setFamilies(families);
  });

  socket.on('pps:update', (pps) => {
    useStore.getState().setPps(pps);
    if (pps.densities) useStore.getState().setDensities(pps.densities);
  });

  socket.on('density:update', ({ densities }) => {
    useStore.getState().setDensities(densities);
  });

  socket.on('hazard:spread', (s) => {
    useStore.getState().setHazardSpread(s);
  });

  socket.on('sos:new', (sos) => {
    useStore.getState().pushSos(sos);
  });

  socket.on('guest:alert', (a) => {
    useStore.getState().pushGuestAlert(a);
  });

  socket.on('auto_escalate:alert', (e) => {
    useStore.getState().pushEscalation(e);
    useStore.getState().toast({ kind: 'warn', title: 'AUTO-ESCALATION', body: `${e.name}: ${e.reason}`, duration: 6000 });
  });

  socket.on('theme:severity', (t) => {
    useStore.getState().setThemeSeverity(t);
  });

  return socket;
};

export const getSocket = () => socket;

export const emitSos = (data) => socket?.emit('sos:trigger', data);
export const emitResponderUpdate = (data) => socket?.emit('responder:update', data);
export const emitVoiceHelp = (zone) => socket?.emit('voice:help_detected', { zone });
export const emitEvacStart = (incidentId, strategy) => socket?.emit('evacuation:start', { incidentId, strategy });
export const emitFamilyEvac = (memberId) => socket?.emit('family:evacuate_member', { memberId });
