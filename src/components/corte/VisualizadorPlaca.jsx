import React from 'react';

const COLOR_MODULOS = [
  '#A07030', '#7090B0', '#2A5A20', '#8A5A1A',
  '#6A7030', '#4a5a7a', '#c8a060', '#9a7a5a',
  '#7a4a7a', '#3a7a6a', '#a04040', '#5a7a3a',
];

// Asigna color por índice del modId para máxima variedad visual
const colorCache = {};
let colorIdx = 0;
function getColorModulo(modId) {
  if (!modId) return '#b0b0b0';
  if (!colorCache[modId]) {
    colorCache[modId] = COLOR_MODULOS[colorIdx % COLOR_MODULOS.length];
    colorIdx++;
  }
  return colorCache[modId];
}

export function VisualizadorPlaca({ layout, plateDims, scale = 0.12 }) {
  const { piezas, desperdicio, espacioLibre } = layout;
  const { largo, ancho } = plateDims;

  const W = largo * scale;
  const H = ancho * scale;
  const s = scale;

  return (
    <div style={{ marginBottom: 16, padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'auto' }}>
      <svg
        width={W}
        height={H}
        style={{ border: '2px solid #555', background: '#f5f0e8', display: 'block', margin: 'auto', maxWidth: '100%' }}
      >
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6">
            <line x1="0" y1="0" x2="6" y2="6" stroke="#c8a060" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Borde placa */}
        <rect x={0} y={0} width={W} height={H} fill="none" stroke="#555" strokeWidth="2" />

        {/* Sobrantes (debajo de piezas) */}
        {espacioLibre && espacioLibre.map((esp, idx) => (
          <rect
            key={`sobr-${idx}`}
            x={esp.x * s} y={esp.y * s}
            width={esp.w * s} height={esp.h * s}
            fill="url(#hatch)" stroke="#c8a060"
            strokeWidth="1" strokeDasharray="4,3" opacity="0.55"
          />
        ))}

        {/* Piezas colocadas */}
        {piezas.map((pieza, idx) => {
          const px = pieza.x * s;
          const py = pieza.y * s;
          const pw = pieza.w * s;
          const ph = pieza.h * s;
          const fill = getColorModulo(pieza.modId);
          // Tamaño de fuente adaptado al tamaño real de la pieza en píxeles
          const fsNombre = Math.max(7, Math.min(pw / 7, ph / 3, 11));
          const fsDims = Math.max(6, fsNombre - 2);
          return (
            <g key={idx}>
              <rect x={px} y={py} width={pw} height={ph} fill={fill} stroke="#333" strokeWidth="0.8" opacity="0.88" />
              {/* Nombre: solo si hay espacio */}
              {pw > 20 && ph > 14 && (
                <text
                  x={px + pw / 2} y={py + ph / 2 + (ph > 22 ? -5 : 3)}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={fsNombre} fontWeight="700" fill="#fff"
                  fontFamily="monospace"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                >
                  {pieza.nombre.length > 12 ? pieza.nombre.slice(0, 11) + '…' : pieza.nombre}
                </text>
              )}
              {/* Dimensiones: solo si hay espacio suficiente */}
              {pw > 28 && ph > 22 && (
                <text
                  x={px + pw / 2} y={py + ph / 2 + fsNombre + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={fsDims} fill="rgba(255,255,255,0.8)"
                  fontFamily="monospace"
                >
                  {pieza.w}×{pieza.h}
                </text>
              )}
              {/* Indicador rotación */}
              {pieza.rotada && pw > 14 && ph > 12 && (
                <text x={px + 3} y={py + fsDims + 3} fontSize={fsDims} fill="#ffe08a" fontWeight="700">↻</text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Leyenda */}
      <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: 4, fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
            {piezas.length} pieza{piezas.length !== 1 ? 's' : ''}
          </span>
          {' · Desperdicio real: '}
          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: desperdicio > 20 ? '#e07070' : '#2a5a20' }}>
            {desperdicio.toFixed(1)}%
          </span>
        </div>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: 'url(#hatch)', border: '1px dashed #c8a060' }} />
          Sobrante reutilizable
        </span>
      </div>
    </div>
  );
}

export default VisualizadorPlaca;
