import React from 'react';

// Reusable, theme-aware floor plan map.
// props: zones, exits, hazards, route (array of {x,y}), userPos, dots, theme, blocked, showDensity, densities
export default function FloorMap({
  zones = [],
  exits = [],
  hazards = [],
  route = [],
  userPos = null,
  dots = [],
  theme = 'red',
  blocked = [],
  showLabels = true,
  showDensity = false,
  densities = {},
  highlightedZone = null,
  onZoneClick,
  children,
}) {
  const themeColor = {
    red: '#ef4444',
    cyan: '#06b6d4',
    amber: '#f59e0b',
    yellow: '#eab308',
  }[theme] || '#ef4444';

  return (
    <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="floorgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </pattern>
        <radialGradient id="hazfire" cx="50%" cy="50%">
          <stop offset="0%" stopColor={themeColor} stopOpacity="0.85" />
          <stop offset="50%" stopColor={themeColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="exitGrad" x1="0%" x2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.3" />
        </linearGradient>
        <filter id="softglow"><feGaussianBlur stdDeviation="3" /></filter>
        <filter id="strongglow"><feGaussianBlur stdDeviation="6" /></filter>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#10b981" />
        </marker>
      </defs>

      <rect width="800" height="600" fill="url(#floorgrid)" />

      {/* Compass / scale */}
      <g transform="translate(740, 30)" opacity="0.4">
        <circle cx="0" cy="0" r="14" fill="none" stroke="white" strokeWidth="0.8" />
        <path d="M 0 -10 L 3 0 L 0 10 L -3 0 z" fill="white" />
        <text y="22" textAnchor="middle" fill="white" fontSize="8" fontFamily="JetBrains Mono">N</text>
      </g>
      <g transform="translate(30, 570)" opacity="0.4">
        <line x1="0" y1="0" x2="40" y2="0" stroke="white" strokeWidth="0.8" />
        <line x1="0" y1="-3" x2="0" y2="3" stroke="white" strokeWidth="0.8" />
        <line x1="40" y1="-3" x2="40" y2="3" stroke="white" strokeWidth="0.8" />
        <text x="20" y="-6" textAnchor="middle" fill="white" fontSize="7" fontFamily="JetBrains Mono">10m</text>
      </g>

      {/* Zones */}
      {zones.map(z => {
        const isBlocked = blocked.includes(z.id);
        const isHighlight = highlightedZone === z.id;
        const density = densities[z.id] || 0;
        const ratio = Math.min(1, density / Math.max(1, z.capacity));
        const densFill = showDensity
          ? ratio < 0.5 ? 'rgba(16, 185, 129, 0.10)'
          : ratio < 0.85 ? 'rgba(245, 158, 11, 0.15)'
          : 'rgba(239, 68, 68, 0.20)'
          : 'rgba(255,255,255,0.02)';

        return (
          <g
            key={z.id}
            onClick={() => onZoneClick?.(z)}
            style={{ cursor: onZoneClick ? 'pointer' : 'default' }}
          >
            <rect
              x={z.x} y={z.y} width={z.w} height={z.h}
              fill={isBlocked ? 'rgba(239,68,68,0.15)' : densFill}
              stroke={isHighlight ? themeColor : isBlocked ? '#ef4444' : 'rgba(255,255,255,0.18)'}
              strokeWidth={isHighlight || isBlocked ? 2 : 1.2}
              strokeDasharray={isBlocked ? '4 3' : '0'}
              rx="3"
            />
            {showLabels && (
              <text
                x={z.x + z.w / 2}
                y={z.y + z.h / 2 + 3}
                textAnchor="middle"
                fill={isBlocked ? '#ef4444' : 'rgba(255,255,255,0.45)'}
                fontSize="10"
                fontFamily="JetBrains Mono"
                letterSpacing="0.5"
                style={{ textTransform: 'uppercase' }}
              >
                {z.name}
              </text>
            )}
            {showDensity && (
              <text
                x={z.x + z.w - 8}
                y={z.y + 14}
                textAnchor="end"
                fill="rgba(255,255,255,0.6)"
                fontSize="9"
                fontFamily="JetBrains Mono"
              >
                {Math.round(density)}/{z.capacity}
              </text>
            )}
          </g>
        );
      })}

      {/* Hazard zones */}
      {hazards.map((h, i) => (
        <g key={i}>
          <circle cx={h.x} cy={h.y} r={h.radius} fill="url(#hazfire)" className="animate-pulse" />
          <circle cx={h.x} cy={h.y} r={h.radius * 0.35} fill={themeColor} opacity="0.7" filter="url(#strongglow)" />
          <circle cx={h.x} cy={h.y} r={h.radius * 0.15} fill={themeColor} opacity="1" />
        </g>
      ))}

      {/* Exits */}
      {exits.map(e => (
        <g key={e.id}>
          <rect x={e.x - 22} y={e.y - 12} width="44" height="24" fill="url(#exitGrad)" rx="3" stroke="#10b981" strokeWidth="1.2" />
          <text x={e.x} y={e.y + 3} textAnchor="middle" fill="#34d399" fontSize="9" fontFamily="Bebas Neue" letterSpacing="0.6">{e.name.replace('(Main)', '').replace('(Side)', '').replace('(Rear)', '').trim()}</text>
          <text x={e.x} y={e.y + 22} textAnchor="middle" fill="#10b981" fontSize="7" fontFamily="JetBrains Mono" opacity="0.6">EXIT</text>
        </g>
      ))}

      {/* Safe route */}
      {route.length > 1 && (
        <g>
          <polyline
            points={route.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#10b981"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.12"
          />
          <polyline
            points={route.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeDasharray="10 6"
            strokeLinecap="round"
            className="dash-flow"
          />
          <polyline
            points={route.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#34d399"
            strokeWidth="1.5"
            strokeOpacity="0.9"
            markerEnd="url(#arrow)"
          />
        </g>
      )}

      {/* User position */}
      {userPos && (
        <g>
          <circle cx={userPos.x} cy={userPos.y} r="22" fill="#3b82f6" opacity="0.18" className="animate-ping" />
          <circle cx={userPos.x} cy={userPos.y} r="14" fill="#3b82f6" opacity="0.3" />
          <circle cx={userPos.x} cy={userPos.y} r="7" fill="#60a5fa" stroke="white" strokeWidth="1.5" />
          <text x={userPos.x} y={userPos.y - 18} textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">YOU</text>
        </g>
      )}

      {/* Generic dots — bands rendered as circle with ring, phones as rounded square */}
      {dots.map((d, i) => {
        const isPhone = d.marker === 'phone';
        return (
          <g key={i}>
            {d.pulse && <circle cx={d.x} cy={d.y} r="14" fill={d.color} opacity="0.25" className="animate-ping" />}
            {isPhone ? (
              // Phone marker: rounded square
              <rect
                x={d.x - (d.r || 5)}
                y={d.y - (d.r || 5)}
                width={(d.r || 5) * 2}
                height={(d.r || 5) * 2}
                rx="1.5"
                fill={d.color}
                stroke={d.evacuated ? '#10b981' : 'rgba(255,255,255,0.4)'}
                strokeWidth="1.2"
                opacity={d.evacuated ? 0.3 : 1}
              />
            ) : (
              // Band marker: circle with optional outer ring
              <>
                {d.marker === 'band' && (
                  <circle cx={d.x} cy={d.y} r={(d.r || 5) + 2.5} fill="none" stroke={d.color} strokeWidth="0.8" opacity="0.5" />
                )}
                <circle
                  cx={d.x}
                  cy={d.y}
                  r={d.r || 5}
                  fill={d.color}
                  stroke={d.evacuated ? '#10b981' : 'transparent'}
                  strokeWidth="2"
                  opacity={d.evacuated ? 0.3 : 1}
                />
              </>
            )}
            {d.label && (
              <text x={d.x} y={d.y - 8} textAnchor="middle" fill={d.color} fontSize="8" fontFamily="JetBrains Mono">{d.label}</text>
            )}
          </g>
        );
      })}

      {children}
    </svg>
  );
}
