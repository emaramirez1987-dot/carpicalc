import React, { useMemo } from "react";
import { calcularLayout } from "./planoUtils.js";
import Cotas from "./Cotas.jsx";
import { generarVistaSVG } from "../../utils.js";

const TIPO_COLORS = {
  bajo:  { fill: "rgba(100,132,200,0.18)",  stroke: "rgba(112,148,210,0.60)" },
  aereo: { fill: "rgba(160,100,200,0.14)",  stroke: "rgba(175,120,220,0.55)" },
  torre: { fill: "rgba( 90,190,120,0.14)",  stroke: "rgba(110,210,140,0.50)" },
};
const COLOR_NULL = { fill: "rgba(80,90,110,0.10)", stroke: "rgba(90,100,120,0.35)" };

const SVG_W = 820;
const SVG_H = 360;
const PAD   = { top: 36, right: 24, bottom: 68, left: 34 };

export default function SVGPlano({ bloques, altoCielorraso = 2400, svgRef, onSelect, selectedIdx, modulos }) {
  const plotW = SVG_W - PAD.left - PAD.right;
  const plotH = SVG_H - PAD.top  - PAD.bottom;

  const { scale, posiciones } = calcularLayout(bloques, plotW, plotH, altoCielorraso);

  const absFloor   = PAD.top + plotH;
  const absCeiling = PAD.top;

  // Pre-computar data URLs de vistaConfig por bloque (solo si el módulo la tiene configurada)
  const vistaDataUrls = useMemo(() => {
    if (!modulos) return {};
    const result = {};
    bloques.forEach((b) => {
      const mod = modulos[b.codigo];
      if (!mod?.vistaConfig) return;
      try {
        const h   = Math.max(40, Math.round(200 * b.alto / Math.max(1, b.ancho)));
        const str = generarVistaSVG(mod, { width: 200, height: h, theme: "dark" });
        result[b.id] = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(str)}`;
      } catch {}
    });
    return result;
  }, [bloques, modulos]);

  return (
    <svg
      ref={svgRef}
      width={SVG_W}
      height={SVG_H}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Fondo oscuro */}
      <rect width={SVG_W} height={SVG_H} fill="#0d1117" rx="10" />

      {/* Línea de techo (punteada) */}
      <line
        x1={PAD.left} y1={absCeiling}
        x2={PAD.left + plotW} y2={absCeiling}
        stroke="#1e2533" strokeWidth="1" strokeDasharray="5 4"
      />
      <text x={PAD.left + plotW + 6} y={absCeiling + 4}
        fill="#2a3550" fontSize="7" fontFamily="'DM Mono',monospace">
        {altoCielorraso}mm
      </text>

      {/* Pared izquierda */}
      <line
        x1={PAD.left - 5} y1={absCeiling}
        x2={PAD.left - 5} y2={absFloor}
        stroke="#1a2230" strokeWidth="1.5"
      />

      {/* Módulos */}
      {bloques.map((b, idx) => {
        const pos    = posiciones[idx];
        if (!pos) return null;
        const colors = TIPO_COLORS[b.tipoVisual] || COLOR_NULL;
        const sel    = selectedIdx === idx;

        const rectX  = PAD.left + pos.x;
        const rectY  = b.tipoVisual === "aereo"
          ? absCeiling + 4
          : absFloor - pos.heightPx;

        const midX   = rectX + pos.widthPx / 2;
        const midY   = rectY + pos.heightPx / 2;
        const maxCh  = Math.max(2, Math.floor(pos.widthPx / 7));
        const label  = b.nombre.length > maxCh ? b.nombre.slice(0, maxCh - 1) + "…" : b.nombre;
        const fSize  = Math.min(8.5, Math.max(5, pos.widthPx / 10));

        const dataUrl = vistaDataUrls[b.id];

        return (
          <g key={b.id} onClick={() => onSelect?.(idx)} style={{ cursor: "pointer" }}>
            {/* Glow de selección */}
            {sel && (
              <rect
                x={rectX - 2} y={rectY - 2}
                width={pos.widthPx + 4} height={pos.heightPx + 4}
                fill="none"
                stroke="rgba(212,175,55,0.22)"
                strokeWidth="5"
                rx="4"
              />
            )}

            {dataUrl ? (
              /* Vista técnica configurada en catálogo */
              <image
                href={dataUrl}
                x={rectX} y={rectY}
                width={pos.widthPx} height={pos.heightPx}
                preserveAspectRatio="none"
              />
            ) : (
              /* Fallback: rectángulo coloreado por tipo */
              <>
                <rect
                  x={rectX} y={rectY}
                  width={pos.widthPx} height={pos.heightPx}
                  fill={colors.fill}
                  rx="2"
                />
                {pos.widthPx > 28 && pos.heightPx > 20 && (
                  <text
                    x={midX} y={midY}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={sel ? "#D4AF37" : (b.tipoVisual ? "#788090" : "#4a5060")}
                    fontSize={fSize}
                    fontFamily="'DM Mono',monospace">
                    {label}
                  </text>
                )}
                {!b.tipoVisual && pos.widthPx > 24 && pos.heightPx > 18 && (
                  <text
                    x={midX} y={rectY + pos.heightPx - 5}
                    textAnchor="middle"
                    fill="#c05050" fontSize="6"
                    fontFamily="'DM Mono',monospace" opacity="0.7">
                    sin tipo
                  </text>
                )}
              </>
            )}

            {/* Borde siempre visible (encima de la imagen o del fallback) */}
            <rect
              x={rectX} y={rectY}
              width={pos.widthPx} height={pos.heightPx}
              fill="none"
              stroke={sel ? "#D4AF37" : colors.stroke}
              strokeWidth={sel ? 1.5 : 0.8}
              rx="2"
            />

            {/* Número de orden */}
            <text
              x={rectX + 4} y={rectY + 10}
              fill={sel ? "#D4AF37" : "rgba(212,175,55,0.35)"}
              fontSize="7" fontFamily="'DM Mono',monospace" fontWeight="700">
              {idx + 1}
            </text>
          </g>
        );
      })}

      {/* Línea de piso */}
      <line
        x1={PAD.left - 14} y1={absFloor}
        x2={PAD.left + plotW + 8} y2={absFloor}
        stroke="#D4AF37" strokeWidth="1.5" opacity="0.5"
      />
      <text x={PAD.left - 14} y={absFloor + 10}
        fill="rgba(212,175,55,0.40)" fontSize="7" fontFamily="'DM Mono',monospace">
        ±0
      </text>

      {/* Estado vacío */}
      {bloques.length === 0 && (
        <text
          x={SVG_W / 2} y={SVG_H / 2}
          textAnchor="middle" dominantBaseline="middle"
          fill="#1e2533" fontSize="13" fontFamily="'DM Mono',monospace">
          Importá módulos desde el presupuesto activo
        </text>
      )}

      {/* Cotas */}
      <Cotas
        bloques={bloques}
        posiciones={posiciones}
        scale={scale}
        padLeft={PAD.left}
        floorY={absFloor}
      />
    </svg>
  );
}
