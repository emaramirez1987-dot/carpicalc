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

// ── SVG → base64 PNG (para img2img en Render IA) ─────────────────────────
// Serializa el SVG reemplazando colores semitransparentes por opacos para que
// la IA de img2img pueda interpretar la estructura (los rgba muy transparentes
// se volvían casi invisibles sobre el canvas blanco y generaban imagen negra).
function svgConColoresOpacos(svgEl) {
  const clone = svgEl.cloneNode(true);
  const w = svgEl.getAttribute("width") || "820";
  const h = svgEl.getAttribute("height") || "360";
  // Quitar inline style (width:100% rompe el render standalone como imagen)
  clone.removeAttribute("style");
  clone.setAttribute("width", w);
  clone.setAttribute("height", h);

  // Blenda rgba sobre blanco para obtener el color real visible
  const opacar = (val) => {
    if (!val) return null;
    const m = val.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (!m) return null;
    const [r, g, b, a] = [+m[1], +m[2], +m[3], +m[4]];
    return `rgb(${Math.round(255*(1-a)+r*a)},${Math.round(255*(1-a)+g*a)},${Math.round(255*(1-a)+b*a)})`;
  };

  clone.querySelectorAll("*").forEach(el => {
    const bf = opacar(el.getAttribute("fill"));
    const bs = opacar(el.getAttribute("stroke"));
    if (bf) el.setAttribute("fill",   bf);
    if (bs) el.setAttribute("stroke", bs);
  });

  // Fondo blanco explícito
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", w); bg.setAttribute("height", h);
  bg.setAttribute("fill", "#ffffff");
  clone.insertBefore(bg, clone.firstChild);
  return clone;
}

export function svgABase64(svgEl) {
  return new Promise((resolve, reject) => {
    if (!svgEl) { reject(new Error("Sin elemento SVG")); return; }
    const w    = parseFloat(svgEl.getAttribute("width") || "820");
    const h    = parseFloat(svgEl.getAttribute("height") || "360");
    const prep = svgConColoresOpacos(svgEl);
    const src  = new XMLSerializer().serializeToString(prep);
    const blob = new Blob([src], { type: "image/svg+xml;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      const canvas  = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      const ctx     = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Error cargando SVG")); };
    img.src = url;
  });
}

// ── Imagen de referencia para img2img (solo módulos, ampliados) ──────────────
// Genera un JPEG base64 con los módulos centrados sobre fondo blanco.
// Sin decoraciones de sala — el AI solo ve la estructura del mueble.
export async function generarImagenReferencia({ bloquesAltos = [], bloquesBajos = [] }) {
  const W = 800, H = 600;
  const PAD_X = 50, PAD_Y = 40;
  const plotW = W - 2 * PAD_X;
  const plotH = H - 2 * PAD_Y;

  const sumBajosW = bloquesBajos.reduce((s, b) => s + b.ancho, 0);
  const sumAltosW = bloquesAltos.reduce((s, b) => s + b.ancho, 0);
  const totalAnchoMM = Math.max(sumBajosW, sumAltosW, 1);

  const maxAltoBajos = bloquesBajos.length ? Math.max(...bloquesBajos.map(b => b.alto)) : 0;
  const maxAltoAltos = bloquesAltos.length ? Math.max(...bloquesAltos.map(b => b.alto)) : 0;
  const GAP_MM = (bloquesBajos.length > 0 && bloquesAltos.length > 0) ? 200 : 0;
  const totalAltoMM = (maxAltoBajos + GAP_MM + maxAltoAltos) || 700;

  const scaleH = plotH / totalAltoMM;
  const scaleW = plotW / totalAnchoMM;
  const scale  = Math.min(scaleH, scaleW);

  const bajosW     = sumBajosW * scale;
  const altosW     = sumAltosW * scale;
  const bajosStartX = PAD_X + (plotW - bajosW) / 2;
  const altosStartX = PAD_X + (plotW - altosW) / 2;
  const floorY     = PAD_Y + plotH;

  const rects = [];

  let x = bajosStartX;
  bloquesBajos.forEach(b => {
    const w = b.ancho * scale, h = b.alto * scale;
    const y = floorY - h;
    rects.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#D4E0F5" stroke="#6884C8" stroke-width="1.5" rx="2"/>`);
    x += w;
  });

  x = altosStartX;
  bloquesAltos.forEach(b => {
    const w = b.ancho * scale, h = b.alto * scale;
    const y = floorY - totalAltoMM * scale;
    rects.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#E5D4F5" stroke="#A064C8" stroke-width="1.5" rx="2"/>`);
    x += w;
  });

  const svgStr = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<rect width="${W}" height="${H}" fill="#FAFAF7"/>`,
    ...rects,
    `<line x1="${PAD_X}" y1="${floorY.toFixed(1)}" x2="${W - PAD_X}" y2="${floorY.toFixed(1)}" stroke="#9A8060" stroke-width="2" opacity="0.6"/>`,
    `</svg>`,
  ].join("");

  return new Promise((resolve, reject) => {
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#FAFAF7";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.90).split(",")[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Error generando imagen referencia")); };
    img.src = url;
  });
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
