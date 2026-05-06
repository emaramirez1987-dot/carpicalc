import { generarVistaSVG } from "../../utils.js";

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
// Usa generarVistaSVG para renderizar la composición visual de cada módulo.
// Si el módulo no tiene vistaConfig, dibuja un rectángulo con borde.
function cargarImagenSVG(svgStr, w, h) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.width = w; img.height = h;
    img.src = url;
  });
}

export async function generarImagenReferencia({ bloquesAltos = [], bloquesBajos = [], composicionOverride = {}, modulos = {} }) {
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

  // Construir lista de bloques con sus posiciones canvas
  const tareas = [];

  let x = bajosStartX;
  bloquesBajos.forEach(b => {
    const pw = b.ancho * scale, ph = b.alto * scale;
    tareas.push({ b, cx: x, cy: floorY - ph, pw, ph });
    x += pw;
  });

  x = altosStartX;
  bloquesAltos.forEach(b => {
    const pw = b.ancho * scale, ph = b.alto * scale;
    tareas.push({ b, cx: x, cy: floorY - totalAltoMM * scale, pw, ph });
    x += pw;
  });

  // Pre-renderizar vistaConfig de cada bloque como Image
  const imagenes = await Promise.all(tareas.map(async ({ b, pw, ph }) => {
    const mod = modulos[b.codigo];
    if (!mod) return null;
    const compOverride = b.itemId ? composicionOverride[b.itemId] : undefined;
    const vistaConfig  = compOverride?.vistaConfig ?? mod.vistaConfig;
    if (!vistaConfig) return null;
    const modConDims = { ...mod, dimensiones: { ...mod.dimensiones, ancho: b.ancho, alto: b.alto }, vistaConfig };
    const svgStr = generarVistaSVG(modConDims, { width: Math.ceil(pw), height: Math.ceil(ph), theme: "light", plano: true });
    return cargarImagenSVG(svgStr, Math.ceil(pw), Math.ceil(ph));
  }));

  // Dibujar todo en canvas
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  tareas.forEach(({ b, cx, cy, pw, ph }, idx) => {
    const img = imagenes[idx];
    if (img) {
      ctx.drawImage(img, cx, cy, pw, ph);
    } else {
      // Fallback: rectángulo con borde negro
      ctx.fillStyle   = b.tipoVisual === "aereo" ? "#F0E8FF" : "#EAF0FF";
      ctx.strokeStyle = "#333333";
      ctx.lineWidth   = 1.5;
      ctx.fillRect(cx, cy, pw, ph);
      ctx.strokeRect(cx, cy, pw, ph);
    }
  });

  // Línea de piso
  ctx.strokeStyle = "#888888";
  ctx.lineWidth   = 2;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(PAD_X, floorY);
  ctx.lineTo(W - PAD_X, floorY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  return canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
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
