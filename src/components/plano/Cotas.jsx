import React from "react";

// Cota total horizontal de la composición.
// Todos los elementos son SVG — debe usarse dentro de un <svg>.
export default function Cotas({ bloques, posiciones, padLeft, floorY }) {
  if (!bloques.length || !posiciones.length) return null;

  const first   = posiciones[0];
  const last    = posiciones[posiciones.length - 1];
  const totalMM = bloques.reduce((s, b) => s + b.ancho, 0);
  const leftX   = padLeft + first.x;
  const rightX  = padLeft + last.x + last.widthPx;
  const midX    = (leftX + rightX) / 2;

  return (
    <g>
      <line x1={leftX}  y1={floorY + 14} x2={rightX} y2={floorY + 14} stroke="#4a5268" strokeWidth="0.8" />
      <line x1={leftX}  y1={floorY + 10} x2={leftX}  y2={floorY + 18} stroke="#4a5268" strokeWidth="0.8" />
      <line x1={rightX} y1={floorY + 10} x2={rightX} y2={floorY + 18} stroke="#4a5268" strokeWidth="0.8" />
      <text
        x={midX} y={floorY + 27}
        textAnchor="middle"
        fill="#4a5268" fontSize="8"
        fontFamily="'DM Mono', monospace" fontWeight="700">
        {totalMM} mm
      </text>
    </g>
  );
}
