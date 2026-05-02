import React, { useMemo } from 'react';

const COLOR_MODULOS = {
  cajonera: '#A07030',
  estanteria: '#7090B0',
  puerta: '#2A5A20',
  costado: '#8A5A1A',
  fondo: '#6A7030',
  frente: '#4a5a7a',
  moldura: '#c8a060',
  panel: '#9a7a5a',
};

function getColorModulo(modId) {
  if (!modId) return '#b0b0b0';
  const color = COLOR_MODULOS[modId.toLowerCase()];
  return color || '#8a8a8a';
}

export function VisualizadorPlaca({ layout, plateDims, scale = 0.12 }) {
  const { piezas, desperdicio, espacioLibre } = layout;
  const { largo, ancho } = plateDims;

  const svgWidth = useMemo(() => largo * scale, [largo, scale]);
  const svgHeight = useMemo(() => ancho * scale, [ancho, scale]);

  return (
    <div
      style={{
        marginBottom: 16,
        padding: '12px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'auto',
      }}
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${largo} ${ancho}`}
        style={{
          border: '2px solid #333',
          background: '#fafafa',
          display: 'block',
          margin: 'auto',
        }}
      >
        {/* Borde de la placa */}
        <rect
          x="0"
          y="0"
          width={largo}
          height={ancho}
          fill="none"
          stroke="#333"
          strokeWidth="2"
        />

        {/* Patrón para sobrantes */}
        <defs>
          <pattern
            id="hatch"
            patternUnits="userSpaceOnUse"
            width="4"
            height="4"
          >
            <line x1="0" y1="0" x2="4" y2="4" stroke="#c8a060" strokeWidth="0.8" />
          </pattern>
        </defs>

        {/* Piezas colocadas */}
        {piezas.map((pieza, idx) => (
          <g key={idx}>
            <rect
              x={pieza.x}
              y={pieza.y}
              width={pieza.w}
              height={pieza.h}
              fill={getColorModulo(pieza.modId)}
              stroke="#333"
              strokeWidth="1"
              opacity="0.85"
            />
            {/* Etiqueta de pieza */}
            <text
              x={pieza.x + pieza.w / 2}
              y={pieza.y + pieza.h / 2 - 6}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="#000"
              fontFamily="monospace"
            >
              {pieza.nombre}
            </text>
            {/* Dimensiones */}
            <text
              x={pieza.x + pieza.w / 2}
              y={pieza.y + pieza.h / 2 + 8}
              textAnchor="middle"
              fontSize="8"
              fill="#555"
              fontFamily="monospace"
            >
              {pieza.w}×{pieza.h}
            </text>
            {/* Indicador de rotación */}
            {pieza.rotada && (
              <text
                x={pieza.x + 4}
                y={pieza.y + 12}
                fontSize="8"
                fill="#c8a060"
                fontWeight="700"
              >
                ↻
              </text>
            )}
          </g>
        ))}

        {/* Sobrantes reutilizables (rayados) */}
        {espacioLibre &&
          espacioLibre.map((esp, idx) => (
            <rect
              key={`sobr-${idx}`}
              x={esp.x}
              y={esp.y}
              width={esp.w}
              height={esp.h}
              fill="url(#hatch)"
              stroke="#c8a060"
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.6"
            />
          ))}
      </svg>

      {/* Leyenda y desperdicio */}
      <div
        style={{
          marginTop: 10,
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.03)',
          borderRadius: 4,
          fontSize: 11,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
            {piezas.length} pieza{piezas.length !== 1 ? 's' : ''}
          </span>{' '}
          · Desperdicio real:{' '}
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              fontWeight: 700,
              color: desperdicio > 20 ? '#e07070' : '#2a5a20',
            }}
          >
            {desperdicio.toFixed(1)}%
          </span>
        </div>
        <div
          style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            display: 'flex',
            gap: 12,
          }}
        >
          <span>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                background: '#c8a060',
                border: '1px dashed #c8a060',
                marginRight: 4,
              }}
            />
            Sobrante reutilizable
          </span>
        </div>
      </div>
    </div>
  );
}

export default VisualizadorPlaca;
