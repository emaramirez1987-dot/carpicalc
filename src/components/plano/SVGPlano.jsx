import React, { useMemo } from "react";
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

function computePositions(bloques, scale) {
  let x = 0;
  return bloques.map(b => {
    const pos = { x, widthPx: b.ancho * scale, heightPx: b.alto * scale };
    x += b.ancho * scale;
    return pos;
  });
}

export default function SVGPlano({
  bloquesAltos = [],
  bloquesBajos = [],
  altoCielorraso = 2400,
  svgRef,
  onSelect,
  selectedId,
  modulos,
  temaClaro = false,
  offsetBajos = 0,
  offsetAltos = 0,
  colgadoAereos = 200,
}) {
  const plotW = SVG_W - PAD.left - PAD.right;
  const plotH = SVG_H - PAD.top  - PAD.bottom;

  const TC   = temaClaro ? TIPO_COLORS_LIGHT : TIPO_COLORS;
  const CNul = temaClaro ? COLOR_NULL_LIGHT  : COLOR_NULL;

  const bgFill   = temaClaro ? "#FAFAF7"  : "#0d1117";
  const ceilStr  = temaClaro ? "#C8BFA8"  : "#1e2533";
  const wallStr  = temaClaro ? "#B8AF98"  : "#1a2230";
  const ceilTxt  = temaClaro ? "#A09070"  : "#2a3550";
  const floorStr = temaClaro ? "#9A7620"  : "#D4AF37";
  const floorTxt = temaClaro ? "rgba(154,118,32,0.70)" : "rgba(212,175,55,0.40)";
  const selColor = temaClaro ? "#8B6914"  : "#D4AF37";
  const emptyTxt = temaClaro ? "#BDB5A2"  : "#1e2533";
  const numUnsel = temaClaro ? "rgba(139,105,20,0.45)" : "rgba(212,175,55,0.35)";

  // Escala unificada basada en la zona más ancha
  const totalAltos = bloquesAltos.reduce((s, b) => s + b.ancho, 0);
  const totalBajos = bloquesBajos.reduce((s, b) => s + b.ancho, 0);
  const maxTotalMM = Math.max(totalAltos, totalBajos, 1);

  const scaleH = plotH / altoCielorraso;
  const scaleW = plotW / maxTotalMM;
  const scale  = Math.min(scaleH, scaleW);

  const posAltos = computePositions(bloquesAltos, scale);
  const posBajos = computePositions(bloquesBajos, scale);

  const absFloor   = PAD.top + plotH;
  const absCeiling = PAD.top;
  const offBPx     = offsetBajos * scale;
  const offAPx     = offsetAltos * scale;
  const colgadoPx  = colgadoAereos * scale;

  // Pre-render SVG views for modules that have vistaConfig
  const vistaDataUrls = useMemo(() => {
    if (!modulos) return {};
    const allBloques = [...bloquesAltos, ...bloquesBajos];
    const result = {};
    allBloques.forEach(b => {
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
  }, [bloquesAltos, bloquesBajos, modulos, temaClaro]);

  const renderBloque = (b, pos, rectX, rectY, globalIdx) => {
    const colors  = TC[b.tipoVisual] || CNul;
    const sel     = selectedId === b.id;
    const midX    = rectX + pos.widthPx / 2;
    const midY    = rectY + pos.heightPx / 2;
    const maxCh   = Math.max(2, Math.floor(pos.widthPx / 7));
    const label   = b.nombre.length > maxCh ? b.nombre.slice(0, maxCh - 1) + "…" : b.nombre;
    const fSize   = Math.min(8.5, Math.max(5, pos.widthPx / 10));
    const dataUrl = vistaDataUrls[b.id];

    return (
      <g key={b.id} onClick={() => onSelect?.(b.id)} style={{ cursor: "pointer" }}>
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
          </>
        )}
        {sel && <rect x={rectX} y={rectY} width={pos.widthPx} height={pos.heightPx} fill="none" stroke={selColor} strokeWidth="1.5" />}
        <text x={rectX + 4} y={rectY + 10} fill={sel ? selColor : numUnsel}
          fontSize="7" fontFamily="'DM Mono',monospace" fontWeight="700">
          {globalIdx + 1}
        </text>
      </g>
    );
  };

  const hasBloques = bloquesAltos.length > 0 || bloquesBajos.length > 0;

  // Posiciones de juntas por zona
  const juntasBajos = posBajos.slice(1).map((pos, i) => PAD.left + pos.x + offBPx);
  const juntasAltos = posAltos.slice(1).map((pos, i) => PAD.left + pos.x + offAPx);

  return (
    <svg
      ref={svgRef}
      width={SVG_W} height={SVG_H}
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

      {/* ── Zona alta: aéreos ─────────────────────────────── */}
      {bloquesAltos.map((b, idx) => {
        const pos  = posAltos[idx];
        if (!pos) return null;
        const rectX = PAD.left + pos.x + offAPx;
        const rectY = absCeiling + colgadoPx;
        return renderBloque(b, pos, rectX, rectY, idx);
      })}

      {/* Juntas zona alta */}
      {juntasAltos.map((x, i) => (
        <line key={`ja-${i}`} x1={x} y1={absCeiling} x2={x} y2={absCeiling + colgadoPx + posAltos[i + 1]?.heightPx ?? 0}
          stroke={temaClaro ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.07)"} strokeWidth="0.5" />
      ))}

      {/* ── Zona baja: bajos + torres ─────────────────────── */}
      {bloquesBajos.map((b, idx) => {
        const pos  = posBajos[idx];
        if (!pos) return null;
        const heightPx = b.tipoVisual === "torre" ? plotH : pos.heightPx;
        const rectX    = PAD.left + pos.x + offBPx;
        const rectY    = absFloor - heightPx;
        return renderBloque(b, { ...pos, heightPx }, rectX, rectY, idx);
      })}

      {/* Juntas zona baja */}
      {juntasBajos.map((x, i) => (
        <line key={`jb-${i}`} x1={x} y1={absCeiling} x2={x} y2={absFloor}
          stroke={temaClaro ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.07)"} strokeWidth="0.5" />
      ))}

      {/* Línea de piso */}
      <line x1={PAD.left - 14} y1={absFloor} x2={PAD.left + plotW + 8} y2={absFloor}
        stroke={floorStr} strokeWidth="1.5" opacity="0.5" />
      <text x={PAD.left - 14} y={absFloor + 10} fill={floorTxt} fontSize="7" fontFamily="'DM Mono',monospace">±0</text>

      {/* Estado vacío */}
      {!hasBloques && (
        <text x={SVG_W / 2} y={SVG_H / 2} textAnchor="middle" dominantBaseline="middle"
          fill={emptyTxt} fontSize="13" fontFamily="'DM Mono',monospace">
          Importá módulos desde el presupuesto activo
        </text>
      )}

      {/* Cotas zona baja */}
      {bloquesBajos.length > 0 && (
        <Cotas bloques={bloquesBajos} posiciones={posBajos.map(p => ({ ...p, x: p.x + offBPx }))} padLeft={PAD.left} floorY={absFloor} />
      )}
    </svg>
  );
}
