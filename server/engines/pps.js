const floorPlan = require('../data/floorPlan.json');

function shortestPath(fromId, toId) {
  if (fromId === toId) return 0;
  const visited = new Set([fromId]);
  let frontier = [fromId];
  let depth = 0;
  while (frontier.length && depth < 10) {
    depth++;
    const next = [];
    for (const id of frontier) {
      const zone = floorPlan.zones.find(z => z.id === id);
      if (!zone) continue;
      for (const adj of zone.adjacentTo) {
        if (adj === toId) return depth;
        if (!visited.has(adj)) { visited.add(adj); next.push(adj); }
      }
    }
    frontier = next;
  }
  return 99;
}

function estimateInflow(targetZone, incidentZone) {
  const hops = shortestPath(targetZone, incidentZone);
  return Math.max(0.1, 2.0 / Math.max(1, hops));
}

function decideAction(zone, incidentZone, predictedDensity) {
  if (zone.id === incidentZone) return 'EVACUATE_NOW';
  const criticalThreshold = zone.capacity * 0.85;
  if (predictedDensity >= criticalThreshold * 1.3) return 'EVACUATE_NOW';
  if (predictedDensity >= criticalThreshold) return 'HOLD_30S';
  const hops = shortestPath(zone.id, incidentZone);
  if (hops === 1) return 'DIVERT_WEST';
  return 'DIVERT_EAST';
}

function calculatePPS(incidentZone, currentDensities) {
  const predictions = [];
  const actions = [];

  const affected = floorPlan.zones.filter(z =>
    z.adjacentTo.includes(incidentZone) || z.id === incidentZone
  );

  affected.forEach(zone => {
    const currentDensity = currentDensities[zone.id] || 0;
    const inflowRate = estimateInflow(zone.id, incidentZone);
    const predictedDensity = currentDensity + (inflowRate * 60);
    const criticalThreshold = zone.capacity * 0.85;

    const etaToCritical = inflowRate > 0
      ? Math.max(0, Math.floor((criticalThreshold - currentDensity) / inflowRate))
      : 999;

    predictions.push({
      zoneId: zone.id,
      zoneName: zone.name,
      currentDensity: Math.round(currentDensity),
      predictedDensity: Math.round(predictedDensity),
      capacity: zone.capacity,
      etaToCritical,
      critical: predictedDensity >= criticalThreshold
    });

    actions.push({
      zoneId: zone.id,
      zoneName: zone.name,
      action: decideAction(zone, incidentZone, predictedDensity)
    });
  });

  return { predictions, actions };
}

module.exports = { calculatePPS, shortestPath };
