// Pure client-side helpers (BFS routing, theme mappings)

export const findPath = (zones, startZone, endZone, blocked = []) => {
  if (startZone === endZone) return [startZone];
  const blockedSet = new Set(blocked);
  const queue = [[startZone]];
  const visited = new Set([startZone]);
  while (queue.length) {
    const path = queue.shift();
    const node = path[path.length - 1];
    const zone = zones.find(z => z.id === node);
    if (!zone) continue;
    for (const adj of zone.adjacentTo) {
      if (visited.has(adj) || blockedSet.has(adj)) continue;
      visited.add(adj);
      const newPath = [...path, adj];
      if (adj === endZone) return newPath;
      queue.push(newPath);
    }
  }
  return [startZone];
};

export const findNearestSafeExit = (zones, exits, fromZone, blocked = []) => {
  const blockedSet = new Set(blocked);
  let best = null;
  let bestLen = Infinity;
  for (const exit of exits) {
    if (blockedSet.has(exit.zone)) continue;
    const path = findPath(zones, fromZone, exit.zone, blocked);
    if (path && path.length > 0 && path[path.length - 1] === exit.zone && path.length < bestLen) {
      bestLen = path.length;
      best = { exit, path };
    }
  }
  return best;
};

export const zoneCenter = (zones, zoneId) => {
  const z = zones.find(z => z.id === zoneId);
  return z ? { x: z.x + z.w / 2, y: z.y + z.h / 2 } : { x: 0, y: 0 };
};

export const TYPE_COLORS = {
  fire: { name: 'FIRE', primary: '#ef4444', soft: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.35)', text: 'text-red-400', glow: 'rgba(239,68,68,0.3)' },
  medical: { name: 'MEDICAL', primary: '#06b6d4', soft: 'rgba(6,182,212,0.10)', border: 'rgba(6,182,212,0.35)', text: 'text-cyan-400', glow: 'rgba(6,182,212,0.3)' },
  security: { name: 'SECURITY', primary: '#f59e0b', soft: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.35)', text: 'text-amber-400', glow: 'rgba(245,158,11,0.3)' },
  hazard: { name: 'HAZARD', primary: '#eab308', soft: 'rgba(234,179,8,0.10)', border: 'rgba(234,179,8,0.35)', text: 'text-yellow-400', glow: 'rgba(234,179,8,0.3)' },
};

export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;

export const fmtClock = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour12: false });

export const ppsLabel = (score) => {
  if (score < 35) return { label: 'LOW', color: 'text-emerald-400' };
  if (score < 65) return { label: 'MODERATE', color: 'text-amber-400' };
  if (score < 85) return { label: 'HIGH', color: 'text-orange-400' };
  return { label: 'CRITICAL', color: 'text-red-500' };
};

// Compute composite PPS score from server predictions array
export const computePPSScore = (predictions) => {
  if (!predictions || !predictions.length) return 0;
  const sumRatio = predictions.reduce((acc, p) => acc + (p.predictedDensity / Math.max(1, p.capacity)), 0);
  const avg = sumRatio / predictions.length;
  return Math.min(100, Math.round(avg * 100));
};
