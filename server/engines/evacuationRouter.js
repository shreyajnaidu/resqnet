const floorPlan = require('../data/floorPlan.json');

function findSafeRoute(fromZone, blockedZones = []) {
  const exits = floorPlan.exits;
  const blocked = new Set(blockedZones);
  let bestExit = null;
  let bestPath = null;
  let bestDist = Infinity;

  for (const exit of exits) {
    if (blocked.has(exit.zone)) continue;
    const path = bfs(fromZone, exit.zone, blocked);
    if (path && path.length < bestDist) {
      bestDist = path.length;
      bestExit = exit;
      bestPath = path;
    }
  }

  return { exit: bestExit, path: bestPath, distance: bestDist };
}

function bfs(start, end, blocked) {
  if (start === end) return [start];
  const queue = [[start]];
  const visited = new Set([start]);
  while (queue.length) {
    const path = queue.shift();
    const node = path[path.length - 1];
    const zone = floorPlan.zones.find(z => z.id === node);
    if (!zone) continue;
    for (const adj of zone.adjacentTo) {
      if (visited.has(adj) || blocked.has(adj)) continue;
      const newPath = [...path, adj];
      if (adj === end) return newPath;
      visited.add(adj);
      queue.push(newPath);
    }
  }
  return null;
}

module.exports = { findSafeRoute };
