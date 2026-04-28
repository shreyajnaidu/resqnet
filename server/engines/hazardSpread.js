const floorPlan = require('../data/floorPlan.json');

function simulateSpread(sourceZone, minutesElapsed) {
  const contaminated = new Set([sourceZone]);
  const projections = { '2min': [], '5min': [], '10min': [] };

  const addByDepth = (depth, bucket) => {
    const visited = new Set([sourceZone]);
    let frontier = [sourceZone];
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (const id of frontier) {
        const z = floorPlan.zones.find(zz => zz.id === id);
        if (!z) continue;
        for (const adj of z.adjacentTo) {
          if (!visited.has(adj)) {
            visited.add(adj);
            bucket.push(adj);
            next.push(adj);
          }
        }
      }
      frontier = next;
    }
  };

  addByDepth(1, projections['2min']);
  addByDepth(2, projections['5min']);
  addByDepth(3, projections['10min']);

  const currentDepth = Math.min(3, Math.floor(minutesElapsed / 2));
  let frontier = [sourceZone];
  const visited = new Set([sourceZone]);
  for (let d = 0; d < currentDepth; d++) {
    const next = [];
    for (const id of frontier) {
      const z = floorPlan.zones.find(zz => zz.id === id);
      if (!z) continue;
      for (const adj of z.adjacentTo) {
        if (!visited.has(adj)) {
          visited.add(adj);
          contaminated.add(adj);
          next.push(adj);
        }
      }
    }
    frontier = next;
  }

  return {
    contaminated: Array.from(contaminated),
    projections
  };
}

module.exports = { simulateSpread };
