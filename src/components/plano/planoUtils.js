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
