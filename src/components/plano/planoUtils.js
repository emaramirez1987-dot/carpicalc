// ── Cálculo de layout SVG ─────────────────────────────────────────────────
// gapPx: separación visual fija en píxeles entre bloques (no representa mm reales)
export function calcularLayout(bloques, plotW, plotH, altoCielorraso = 2400, gapPx = 0) {
  if (!bloques.length) return { scale: 1, posiciones: [], floorY: plotH };

  const totalAnchoMM  = bloques.reduce((s, b) => s + b.ancho, 0);
  const totalGapPx    = gapPx * Math.max(0, bloques.length - 1);
  const scaleH        = plotH / altoCielorraso;
  const scaleW        = (plotW - totalGapPx) / totalAnchoMM;
  const scale         = Math.min(scaleH, scaleW);

  let xCursor = 0;
  const posiciones = bloques.map((b, idx) => {
    const x = xCursor;
    xCursor += b.ancho * scale + (idx < bloques.length - 1 ? gapPx : 0);
    return { x, widthPx: b.ancho * scale, heightPx: b.alto * scale };
  });

  return { scale, posiciones, floorY: altoCielorraso * scale };
}

// ── Exportar SVG ──────────────────────────────────────────────────────────
export function exportarSVG(svgEl, nombre) {
  if (!svgEl) return;
  const src  = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([src], { type: "image/svg+xml;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${nombre || "plano-2d"}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Exportar PNG (retina 2×) ──────────────────────────────────────────────
export function exportarPNG(svgEl, nombre) {
  if (!svgEl) return;
  const w    = parseFloat(svgEl.getAttribute("width") || "820");
  const h    = parseFloat(svgEl.getAttribute("height") || "360");
  const src  = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([src], { type: "image/svg+xml;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const img  = new Image();
  img.onload = () => {
    const canvas    = document.createElement("canvas");
    canvas.width    = w * 2;
    canvas.height   = h * 2;
    const ctx       = canvas.getContext("2d");
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const a    = document.createElement("a");
    a.href     = canvas.toDataURL("image/png");
    a.download = `${nombre || "plano-2d"}.png`;
    a.click();
  };
  img.src = url;
}
