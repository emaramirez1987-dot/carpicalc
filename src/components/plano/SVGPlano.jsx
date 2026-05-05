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

const TIPO_COLORS_LIGHT = {
  bajo:  { fill: "rgba(100,132,200,0.28)", stroke: "rgba(80,112,180,0.75)" },
  aereo: { fill: "rgba(160,100,200,0.22)", stroke: "rgba(140,80,180,0.70)" },
  torre: { fill: "rgba( 70,180,100,0.22)", stroke: "rgba(60,160,90,0.65)"  },
};
const COLOR_NULL_LIGHT = { fill: "rgba(120,130,150,0.20)", stroke: "rgba(90,100,120,0.55)" };

const SVG_W = 820;
const SVG_H = 360;
const PAD   = { top: 36, right: 24, bottom: 68, left: 34 };

export default function SVGPlano({ bloques, altoCielorraso = 2400, svgRef, onSelect, selectedIdx, modulos, temaClaro = false, offsetBajos = 0, offsetAltos = 0, colgadoAereos = 200 }) {
  const plotW = SVG_W - PAD.left - PAD.right;
  const plotH = SVG_H - PAD.top  - PAD.bottom;

  const TC        = temaClaro ? TIPO_COLORS_LIGHT : TIPO_COLORS;
  const CNul      = temaClaro ? COLOR_NULL_LIGHT  : COLOR_NULL;
  const bgFill    = temaClaro ? "#FAFAF7"  : "#0d1117";
  const ceilStr   = temaClaro ? "#C8BFA8"  : "#1e2533";
  const wallStr   = temaClaro ? "#B8AF98"  : "#1a2230";
  const ceilTxt   = temaClaro ? "#A09070"  : "#2a3550";
  const floorStr  = temaClaro ? "#9A7620"  : "#D4AF37";
  const floorTxt  = temaClaro ? "rgba(154,118,32,0.70)" : "rgba(212,175,55,0.40)";
  const jointStr  = temaClaro ? "rgba(0,0,0,0.07)"      : "rgba(255,255,255,0.07)";
  const selColor  = temaClaro ? "#8B6914"  : "#D4AF37";
  const emptyTxt  = temaClaro ? "#BDB5A2"  : "#1e2533";
  const numUnsel  = temaClaro ? "rgba(139,105,20,0.45)" : "rgba(212,175,55,0.35)";

  const { posiciones, scale } = calcularLayout(bloques, plotW, plotH, altoCielorraso);

  const absFloor   = PAD.top + plotH;
  const absCeiling = PAD.top;
  const offBPx     = offsetBajos * scale;
  const offAPx     = offsetAltos * scale;
  const colgadoPx  = colgadoAereos * scale;

  const vistaDataUrls = useMemo(() => {
    if (!modulos) return {};
    const result = {};
    bloques.forEach((b) => {
      const mod = modulos[b.codigo];
      if (!mod?.vistaConfig) return;
      try {
        const h   = Math.max(40, Math.round(200 * b.alto / Math.max(1, b.ancho)));
        const str = generarVistaSVG(mod, { width: 200, height: h, theme: temaClaro ? "light" : "dark", plano: true });
        result[b.id] = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(str)}`;
      } catch {}
    });
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloques, modulos, temaClaro]);

  return (
    <svg
      ref={svgRef}
      width={SVG_W}
      height={SVG_H}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={SVG_W} height={SVG_H} fill={bgFill} rx="10" />

      {/* Línea de techo */}
      <line x1={PAD.left} y1={absCeiling} x2={PAD.left + plotW} y2={absCeiling} stroke={ceilStr} strokeWidth="1" strokeDasharray="5 4" />
      <text x={PAD.left + plotW + 6} y={absCeiling + 4} fill={ceilTxt} fontSize="7" fontFamily="'DM Mono',monospace">
        {altoCielorraso}mm
      </text>

      {/* Pared izquierda */}
      <line x1={PAD.left - 5} y1={absCeiling} x2={PAD.left - 5} y2={absFloor} stroke={wallStr} strokeWidth="1.5" />

      {/* Módulos */}
      {bloques.map((b, idx) => {
        const pos    = posiciones[idx];
        if (!pos) return null;
        const colors = TC[b.tipoVisual] || CNul;
        const sel    = selectedIdx === idx;

        const isAereo = b.tipoVisual === "aereo";
        const rectX  = PAD.left + pos.x + (isAereo ? offAPx : offBPx);
        const rectY  = isAereo
          ? absCeiling + colgadoPx
          : absFloor - pos.heightPx;

        const midX   = rectX + pos.widthPx / 2;
        const midY   = rectY + pos.heightPx / 2;
        const maxCh  = Math.max(2, Math.floor(pos.widthPx / 7));
        const label  = b.nombre.length > maxCh ? b.nombre.slice(0, maxCh - 1) + "…" : b.nombre;
        const fSize  = Math.min(8.5, Math.max(5, pos.widthPx / 10));

        const dataUrl = vistaDataUrls[b.id];

        return (
          <g key={b.id} onClick={() => onSelect?.(idx)} style={{ cursor: "pointer" }}>
            {dataUrl ? (
              <image href={dataUrl} x={rectX} y={rectY} width={pos.widthPx} height={pos.heightPx} preserveAspectRatio="none" />
            ) : (
              <>
                <rect x={rectX} y={rectY} width={pos.widthPx} height={pos.heightPx} fill={colors.fill} />
                {pos.widthPx > 28 && pos.heightPx > 20 && (
                  <text x={midX} y={midY} textAnchor="middle" dominantBaseline="middle"
                    fill={sel ? selColor : (b.tipoVisual ? "#788090" : "#4a5060")}
                    fontSize={fSize} fontFamily="'DM Mono',monospace">
                    {label}
                  </text>
                )}
                {!b.tipoVisual && pos.widthPx > 24 && pos.heightPx > 18 && (
                  <text x={midX} y={rectY + pos.heightPx - 5} textAnchor="middle"
                    fill="#c05050" fontSize="6" fontFamily="'DM Mono',monospace" opacity="0.7">
                    sin tipo
                  </text>
                )}
              </>
            )}

            {sel && (
              <rect x={rectX} y={rectY} width={pos.widthPx} height={pos.heightPx} fill="none" stroke={selColor} strokeWidth="1.5" />
            )}

            <text x={rectX + 4} y={rectY + 10} fill={sel ? selColor : numUnsel}
              fontSize="7" fontFamily="'DM Mono',monospace" fontWeight="700">
              {idx + 1}
            </text>
          </g>
        );
      })}

      {/* Juntas */}
      {bloques.map((b, idx) => {
        if (idx === 0) return null;
        const juntaX = PAD.left + posiciones[idx].x;
        return (
          <line key={`junta-${b.id}`} x1={juntaX} y1={absCeiling} x2={juntaX} y2={absFloor}
            stroke={jointStr} strokeWidth="0.5" />
        );
      })}

      {/* Línea de piso */}
      <line x1={PAD.left - 14} y1={absFloor} x2={PAD.left + plotW + 8} y2={absFloor}
        stroke={floorStr} strokeWidth="1.5" opacity="0.5" />
      <text x={PAD.left - 14} y={absFloor + 10} fill={floorTxt} fontSize="7" fontFamily="'DM Mono',monospace">
        ±0
      </text>

      {/* Estado vacío */}
      {bloques.length === 0 && (
        <text x={SVG_W / 2} y={SVG_H / 2} textAnchor="middle" dominantBaseline="middle"
          fill={emptyTxt} fontSize="13" fontFamily="'DM Mono',monospace">
          Importá módulos desde el presupuesto activo
        </text>
      )}

      <Cotas bloques={bloques} posiciones={posiciones} padLeft={PAD.left} floorY={absFloor} />
    </svg>
  );
}
