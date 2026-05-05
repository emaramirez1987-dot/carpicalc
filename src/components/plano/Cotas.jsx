import React from "react";

// Renderiza cotas horizontales dentro del SVG: ancho por módulo + total.
// Todos los elementos son SVG — debe usarse dentro de un <svg>.
export default function Cotas({ bloques, posiciones, padLeft, floorY }) {
  if (!bloques.length || !posiciones.length) return null;

  const first    = posiciones[0];
  const last     = posiciones[posiciones.length - 1];
  const totalMM  = bloques.reduce((s, b) => s + b.ancho, 0);
  const totalPx  = last.x + last.widthPx - first.x;

  return (
    <g>
      {/* Cota individual por módulo */}
      {bloques.map((b, idx) => {
        const pos = posiciones[idx];
        if (!pos) return null;
        const lx  = padLeft + pos.x;
        const rx  = lx + pos.widthPx;
        const cx  = lx + pos.widthPx / 2;
        return (
          <g key={b.id}>
            <line x1={lx} y1={floorY + 3}  x2={lx} y2={floorY + 11} stroke="#D4AF37" strokeWidth="0.7" opacity="0.4" />
            <line x1={rx} y1={floorY + 3}  x2={rx} y2={floorY + 11} stroke="#D4AF37" strokeWidth="0.7" opacity="0.4" />
            <line x1={lx} y1={floorY + 7}  x2={rx} y2={floorY + 7}  stroke="#D4AF37" strokeWidth="0.5" opacity="0.25" />
            <text x={cx} y={floorY + 19}
              textAnchor="middle"
              fill="#D4AF37"
              fontSize="7"
              fontFamily="'DM Mono', monospace"
              opacity="0.6">
              {b.ancho}
            </text>
          </g>
        );
      })}

      {/* Cota total */}
      {bloques.length > 1 && (
        <>
          <line x1={padLeft + first.x} y1={floorY + 30}
                x2={padLeft + last.x + last.widthPx} y2={floorY + 30}
                stroke="#4a5268" strokeWidth="0.8" />
          <line x1={padLeft + first.x} y1={floorY + 26}
                x2={padLeft + first.x} y2={floorY + 34}
                stroke="#4a5268" strokeWidth="0.8" />
          <line x1={padLeft + last.x + last.widthPx} y1={floorY + 26}
                x2={padLeft + last.x + last.widthPx} y2={floorY + 34}
                stroke="#4a5268" strokeWidth="0.8" />
          <text x={padLeft + first.x + totalPx / 2} y={floorY + 43}
            textAnchor="middle"
            fill="#4a5268"
            fontSize="8"
            fontFamily="'DM Mono', monospace"
            fontWeight="700">
            {totalMM} mm
          </text>
        </>
      )}
    </g>
  );
}
