import { fmtPeso, fmtFecha, fmtFechaLarga, resolverDim, calcularModulo, calcularTotalVisual, generarVistaSVG } from '../../utils.js';
import { leerPerfil } from '../../storage.js';
import { TIPO_MAT } from '../../constants.js';

// ════════════════════════════════════════════════════════════════════════════
// imprimirPresupuesto — genera HTML de presupuesto y lo abre en nueva ventana
// generarFichaObra    — genera HTML de ficha técnica de obra
// Funciones puras (no JSX, no React). Se pueden llamar desde cualquier componente.
// ════════════════════════════════════════════════════════════════════════════

function imprimirPresupuesto(
  items,
  modulos,
  costos,
  getModUsado,
  totalGeneral,
  nombre,
  mostrarPrecioUnitario,
  cliente,
  textoApertura = "",
  condiciones = "",
  descuento = 0,
  gananciaExtra = 0,
  tema = "dorado",
  adicionales = [],
  costosDirectos = [],
  renderUrl = null
) {
  const perfil = leerPerfil();
  const fecha = fmtFechaLarga(Date.now());
  const tv = calcularTotalVisual(totalGeneral, descuento, gananciaExtra);

  // ── Paletas de color premium ───────────────────────────────────
  const TEMAS = {
    dorado: {
      acento:       "#a07030",   // líneas y bordes principales
      acentoSuave:  "#c8a060",   // borde inferior encabezado tabla
      fondoHeader:  "#f5ede0",   // fondo encabezado tabla + pie
      fondoFila:    "#fdfaf6",   // filas alternas
      fondoCliente: "#fff8ee",   // tarjeta del cliente
      bordeCliente: "#e8d0a0",
      textoAcento:  "#9a7040",   // textos en dorado (labels, muted)
      textoPrincipal:"#1a0e04",  // texto oscuro principal
      textoSec:     "#7a6040",   // texto secundario
      totalColor:   "#1a6a30",   // total final (verde)
      descuentoColor:"#e07070",
      separador:    "#ede0cc"
    },
    gris: {
      acento:        "#5a5a5a",
      acentoSuave:   "#9a9a9a",
      fondoHeader:   "#f0f0f0",
      fondoFila:     "#fafafa",
      fondoCliente:  "#f5f5f5",
      bordeCliente:  "#d8d8d8",
      textoAcento:   "#777777",
      textoPrincipal:"#1a1a1a",
      textoSec:      "#555555",
      totalColor:    "#222222",
      descuentoColor:"#888888",
      separador:     "#e0e0e0"
    },
    carbon: {
      acento:        "#2c2c2c",
      acentoSuave:   "#555555",
      fondoHeader:   "#222222",
      fondoFila:     "#f8f8f8",
      fondoCliente:  "#1a1a1a",
      bordeCliente:  "#333333",
      textoAcento:   "#aaaaaa",
      textoPrincipal:"#111111",
      textoSec:      "#444444",
      totalColor:    "#111111",
      descuentoColor:"#666666",
      separador:     "#dddddd",
      // overrides especiales para encabezado oscuro
      headerTexto:   "#ffffff",
      headerTextoSec:"#cccccc"
    },
    bosque: {
      acento:        "#2d5a27",
      acentoSuave:   "#5a8a54",
      fondoHeader:   "#edf5ec",
      fondoFila:     "#f7fbf7",
      fondoCliente:  "#f0f7ef",
      bordeCliente:  "#b8d8b4",
      textoAcento:   "#4a7a44",
      textoPrincipal:"#0f1e0d",
      textoSec:      "#3a5a36",
      totalColor:    "#1a4016",
      descuentoColor:"#c0392b",
      separador:     "#c8e0c4"
    },
    marino: {
      acento:        "#1a3a5c",
      acentoSuave:   "#3a6a9c",
      fondoHeader:   "#edf2f8",
      fondoFila:     "#f7f9fc",
      fondoCliente:  "#eef3f9",
      bordeCliente:  "#b0c8e0",
      textoAcento:   "#3a5a7a",
      textoPrincipal:"#0a1520",
      textoSec:      "#2a4a6a",
      totalColor:    "#0a2040",
      descuentoColor:"#c0392b",
      separador:     "#c0d4e8"
    },
    bordo: {
      acento:        "#6b1a2a",
      acentoSuave:   "#9a3a4a",
      fondoHeader:   "#f8eeef",
      fondoFila:     "#fdf7f7",
      fondoCliente:  "#f8eced",
      bordeCliente:  "#e0b0b8",
      textoAcento:   "#7a3040",
      textoPrincipal:"#1a0508",
      textoSec:      "#5a2030",
      totalColor:    "#3a0a14",
      descuentoColor:"#8a1a2a",
      separador:     "#e8c8cc"
    }
  };

  const p = TEMAS[tema] || TEMAS.dorado;
  const encabezadoTaller = perfil?.nombre
    ? `<div style="display:flex;align-items:center;gap:14px">
        ${perfil.logo ? `<img src="${perfil.logo}" style="height:44px;object-fit:contain" />` : ""}
        <div>
          <div style="font-family:'Georgia',serif;font-size:20px;font-weight:900;color:${p.acento}">${perfil.nombre}</div>
          ${perfil.slogan ? `<div style="font-size:11px;color:${p.textoAcento};font-style:italic">${perfil.slogan}</div>` : ""}
          <div style="font-size:10px;color:${p.textoAcento};margin-top:2px;opacity:0.7">${[perfil.tel, perfil.email, perfil.direccion].filter(Boolean).join(" · ")}</div>
        </div>
      </div>`
    : `<div><div style="font-size:22px;font-weight:900;color:${p.acento}">CarpiCálc</div><div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;color:${p.textoAcento}">Presupuesto de carpintería</div></div>`;
  // Mapear tema PDF a tema SVG
  const temaSVGMap = {
    dorado: "dark", gris: "light", carbon: "dark",
    bosque: "dark", marino: "dark", bordo: "dark"
  };
  const temaSVG = temaSVGMap[tema] || "dark";

  const filas = items
    .map((item) => {
      const modBase = modulos[item.codigo];
      if (!modBase) return "";
      const modUsado = getModUsado(item);
      const calc = calcularModulo(modUsado, costos);
      if (!calc) return "";
      const over = modUsado.dimensiones;
      const dimDif =
        over.ancho !== modBase.dimensiones.ancho ||
        over.profundidad !== modBase.dimensiones.profundidad ||
        over.alto !== modBase.dimensiones.alto;

      // Generar SVG 150×150 inline
      const svgStr = generarVistaSVG({ ...modUsado, vistaConfig: modUsado.vistaConfig }, { width: 150, height: 150, theme: temaSVG });

      // Descripción compacta horizontal
      const desc = [];
      desc.push(modBase.nombre);
      if (modBase.descripcion) desc.push(modBase.descripcion);
      desc.push(`${over.ancho}×${over.profundidad}×${over.alto} mm${dimDif ? " ★" : ""}`);
      desc.push(TIPO_MAT[modUsado.material]);
      const descCompacta = desc.join(" · ");

      return `<tr>
        <td style="padding:12px 8px;width:150px;height:150px;text-align:center;vertical-align:middle;border-bottom:1px solid ${p.separador}">${svgStr}</td>
        <td style="padding:12px 14px;vertical-align:middle;border-bottom:1px solid ${p.separador}">
          <div style="font-size:13px;font-weight:700;color:${p.textoPrincipal};margin-bottom:3px">${modBase.nombre}</div>
          <div style="font-size:11px;color:${p.textoSec};line-height:1.5">${descCompacta}</div>
          ${item.nota?.trim() ? `<div style="font-size:10px;color:${p.acento};margin-top:4px;font-style:italic">📝 ${item.nota}</div>` : ""}
        </td>
        <td class="num" style="padding:12px 14px;font-weight:700;color:${p.acento};border-bottom:1px solid ${p.separador};vertical-align:middle">${item.cantidad}</td>
        ${mostrarPrecioUnitario ? `<td class="num precio-u" style="padding:12px 14px;color:${p.textoSec};border-bottom:1px solid ${p.separador};vertical-align:middle">${fmtPeso(calc.total)}</td>` : ""}
        <td class="num subtotal" style="padding:12px 14px;color:${p.totalColor};border-bottom:1px solid ${p.separador};vertical-align:middle">${fmtPeso(calc.total * item.cantidad)}</td>
      </tr>`;
    })
    .join("");

  // Filas de costos directos — sección separada con divisor visual
  const LABEL_CD_PDF = { mo: "Mano de obra", material: "Material", herraje: "Herraje", tapacanto: "Tapacanto" };
  const filasCostosDirectos = costosDirectos.length > 0
    ? `<tr><td colspan="${mostrarPrecioUnitario ? 5 : 4}" style="padding:10px 14px 4px;border-top:1px dashed ${p.acentoSuave}">
        <span style="font-size:9px;text-transform:uppercase;letter-spacing:0.14em;font-weight:700;color:${p.textoAcento}">Costos directos</span>
      </td></tr>` +
      costosDirectos.map(x => `<tr>
        <td style="padding:9px 14px;border-bottom:1px solid ${p.separador};font-size:10px;font-family:monospace;font-weight:700;color:${p.textoAcento}">${LABEL_CD_PDF[x.tipo] || x.tipo}</td>
        <td style="padding:9px 14px;border-bottom:1px solid ${p.separador};color:${p.textoPrincipal}">
          <div style="font-weight:600">${x.nombre}</div>
          <div style="font-size:10px;color:${p.textoSec};font-family:monospace;margin-top:3px">${x.cantidad} ${x.unidad} × ${fmtPeso(x.precioUnit)}</div>
        </td>
        <td class="num" style="border-bottom:1px solid ${p.separador};color:${p.textoAcento}">${x.cantidad}</td>
        ${mostrarPrecioUnitario ? `<td class="num" style="border-bottom:1px solid ${p.separador};color:${p.textoSec}">${fmtPeso(x.precioUnit)}</td>` : ""}
        <td class="num subtotal" style="border-bottom:1px solid ${p.separador};color:${p.totalColor}">${fmtPeso(x.subtotal)}</td>
      </tr>`).join("")
    : "";

  // Filas de adicionales — sección separada con divisor visual
  const filasAdicionales = adicionales.length > 0
    ? `<tr><td colspan="${mostrarPrecioUnitario ? 5 : 4}" style="padding:10px 14px 4px;border-top:1px dashed ${p.acentoSuave}">
        <span style="font-size:9px;text-transform:uppercase;letter-spacing:0.14em;font-weight:700;color:${p.textoAcento}">Servicios y adicionales</span>
      </td></tr>` +
      adicionales.map(x => `<tr>
        <td style="padding:9px 14px;border-bottom:1px solid ${p.separador};font-size:11px;color:${p.textoAcento}">+</td>
        <td style="padding:9px 14px;border-bottom:1px solid ${p.separador};color:${p.textoPrincipal};font-style:italic">${x.nombre}</td>
        <td class="num" style="border-bottom:1px solid ${p.separador};color:${p.textoAcento}">—</td>
        ${mostrarPrecioUnitario ? `<td class="num" style="border-bottom:1px solid ${p.separador};color:${p.textoSec}">${fmtPeso(x.monto)}</td>` : ""}
        <td class="num subtotal" style="border-bottom:1px solid ${p.separador};color:${p.totalColor}">${fmtPeso(x.monto)}</td>
      </tr>`).join("")
    : "";

  const totalUnid = items.reduce((a, i) => a + i.cantidad, 0);
  // ── HTML del PDF ──────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${perfil?.nombre || "CarpiCálc"} — ${nombre || "Presupuesto"}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #fff;
      color: ${p.textoPrincipal};
      padding: 36px 44px;
      max-width: 920px;
      margin: 0 auto;
      font-size: 13px;
      line-height: 1.5;
    }
    @media print {
      body { padding: 16px 20px; font-size: 12px; }
      @page { margin: 1.2cm 1.4cm; }
    }
    .tabla-items { width: 100%; border-collapse: collapse; }
    .tabla-items thead tr { background: ${p.fondoHeader}; }
    .tabla-items th {
      font-size: 9px; text-transform: uppercase; letter-spacing: 0.16em;
      font-weight: 700; color: ${tema === "carbon" ? p.headerTextoSec : p.textoAcento};
      padding: 10px 14px; border-bottom: 2px solid ${p.acentoSuave};
    }
    .tabla-items th.num { text-align: right; }
    .tabla-items th.txt { text-align: left; }
    .tabla-items td { padding: 11px 14px; border-bottom: 1px solid ${p.separador}; vertical-align: top; }
    .tabla-items tbody tr:nth-child(even) td { background: ${p.fondoFila}; }
    .num  { text-align: right; font-family: monospace; }
    .subtotal { font-size: 14px; font-weight: 700; }
    .precio-u  { font-size: 12px; }
  </style>
</head>
<body>

  <!-- ZONA 1: HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2px solid ${p.acento};margin-bottom:4px;gap:24px">
    <div style="flex:1">${encabezadoTaller}</div>
    <div style="text-align:right;min-width:200px">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.2em;color:${p.textoAcento};margin-bottom:4px">Presupuesto</div>
      <div style="font-size:11px;color:${p.textoAcento};margin-bottom:12px;opacity:0.7">${fecha}</div>
      ${cliente && (cliente.nombre || cliente.tel || cliente.dir) ? `
      <div style="background:${p.fondoCliente};border:1px solid ${p.bordeCliente};border-radius:8px;padding:10px 14px;font-size:12px;color:${p.textoSec};text-align:left;display:inline-block;min-width:180px">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.14em;color:${p.textoAcento};font-weight:700;margin-bottom:6px">Cliente</div>
        ${cliente.nombre ? `<div style="font-weight:700;font-size:13px;margin-bottom:3px;color:${p.textoPrincipal}">${cliente.nombre}</div>` : ""}
        ${cliente.tel ? `<div style="font-size:11px;margin-top:2px">📞 ${cliente.tel}</div>` : ""}
        ${cliente.dir ? `<div style="font-size:11px;margin-top:2px">📍 ${cliente.dir}</div>` : ""}
      </div>` : ""}
    </div>
  </div>

  ${nombre ? `<div style="font-size:16px;font-weight:700;color:${p.textoPrincipal};padding:12px 0 24px 0;letter-spacing:0.01em">${nombre}</div>` : ""}

  ${textoApertura ? `<div style="margin-bottom:20px;padding:12px 16px;background:${p.fondoCliente};border-left:3px solid ${p.acentoSuave};border-radius:0 6px 6px 0;font-size:13px;color:${p.textoSec};line-height:1.7">${textoApertura.replace(/\n/g, "<br>")}</div>` : ""}

  ${renderUrl ? `<div style="margin-bottom:24px;border-radius:10px;overflow:hidden;border:1px solid ${p.separador}"><img src="${renderUrl}" alt="Render del trabajo" style="width:100%;height:auto;display:block;max-height:480px;object-fit:cover" /></div>` : ""}

  <!-- ZONA 2: TABLA -->
  <table class="tabla-items">
    <thead>
      <tr>
        <th class="txt" style="width:150px;text-align:center">Visualización</th>
        <th class="txt">Módulo / Descripción</th>
        <th class="num" style="width:52px">Cant.</th>
        ${mostrarPrecioUnitario ? `<th class="num" style="width:110px">P. unit.</th>` : ""}
        <th class="num" style="width:120px">Subtotal</th>
      </tr>
    </thead>
    <tbody>${filas}${filasCostosDirectos}${filasAdicionales}</tbody>
  </table>

  <!-- ZONA 3: PIE -->
  <div style="display:grid;grid-template-columns:1fr auto;gap:40px;margin-top:0;padding:28px 0 0 0;border-top:2px solid ${p.acento}">

    <div>
      ${condiciones ? `
      <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.2em;font-weight:700;color:${p.textoAcento};margin-bottom:8px;opacity:0.8">Condiciones y observaciones</div>
      <div style="font-size:11px;color:${p.textoSec};line-height:1.6;background:${p.fondoFila};border:1px solid ${p.separador};border-radius:6px;padding:10px 12px">${condiciones.replace(/\n/g, "<br>")}</div>
      ` : `<div style="font-size:11px;color:${p.textoAcento};font-style:italic;opacity:0.5">Sin condiciones especificadas.</div>`}
      <div style="margin-top:10px;font-size:9px;color:${p.textoAcento};opacity:0.6;letter-spacing:0.05em">
        ${totalUnid} unidad${totalUnid !== 1 ? "es" : ""} · ${items.length} módulo${items.length !== 1 ? "s" : ""}
      </div>
    </div>

    <div style="min-width:260px;background:${p.fondoCliente};border:1px solid ${p.bordeCliente};border-radius:8px;padding:18px 20px;text-align:right">
      <div style="margin-bottom:14px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.16em;color:${p.textoAcento};opacity:0.8;margin-bottom:4px">Subtotal</div>
        <div style="font-size:14px;font-weight:700;color:${tv.hayDescuento ? p.textoAcento : p.textoPrincipal};${tv.hayDescuento ? "text-decoration:line-through;opacity:0.6" : ""}">
          ${fmtPeso(tv.totalOriginal)}
        </div>
      </div>
      ${tv.hayDescuento ? `
      <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid ${p.acentoSuave}">
        <div style="font-size:10px;color:${p.descuentoColor};margin-bottom:3px">🏷 Descuento</div>
        <div style="font-size:13px;font-weight:700;color:${p.descuentoColor}">− ${fmtPeso(tv.descuentoVal)}</div>
      </div>` : ""}
      ${tv.hayGanancia ? `
      <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid ${p.acentoSuave}">
        <div style="font-size:10px;color:${p.textoAcento};opacity:0.8;margin-bottom:3px">Recargo</div>
        <div style="font-size:13px;font-weight:700;color:${p.textoSec}">+ ${fmtPeso(tv.gananciaVal)}</div>
      </div>` : ""}
      <div style="padding-top:6px">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.18em;color:${p.textoAcento};opacity:0.8;margin-bottom:6px">Total del trabajo</div>
        <div style="font-family:'Georgia',serif;font-size:32px;font-weight:900;color:${p.totalColor};letter-spacing:-0.8px;line-height:1">${fmtPeso(tv.totalFinal)}</div>
        <div style="font-size:9px;color:${p.textoAcento};opacity:0.6;margin-top:6px">IVA no incluido</div>
      </div>
    </div>
  </div>

<script>window.onload=()=>window.print();</script>
</body>
</html>`;
  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  } else alert("El navegador bloqueó la ventana emergente.");
}

// ── Ficha de Obra ─────────────────────────────────────────────────
function generarFichaObra(id, p, modulos, costos, perfil = {}) {
  const fecha = fmtFechaLarga(Date.now());
  const creacion = fmtFechaLarga(parseInt(id));
  const cobros = p.cobros || [];
  const totalCobrado = cobros.reduce((a, c) => a + c.monto, 0);
  const saldo = p.total - totalCobrado;

  const encabezadoTaller = perfil?.nombre ? `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px">
      ${perfil.logo ? `<img src="${perfil.logo}" style="height:40px;object-fit:contain" />` : ""}
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:18px;font-weight:900;color:#7a4a10">${perfil.nombre}</div>
        ${perfil.slogan ? `<div style="font-size:11px;color:#9a7040;font-style:italic">${perfil.slogan}</div>` : ""}
        <div style="font-size:10px;color:#aaa">${[perfil.tel, perfil.email, perfil.direccion].filter(Boolean).join(" · ")}</div>
      </div>
    </div>` : `<div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:900;color:#7a4a10">CarpiCálc</div>`;

  // Calcular piezas de corte agrupadas
  const piezasCorte = [];
  (p.items || []).forEach(item => {
    const modBase = modulos[item.codigo];
    if (!modBase) return;
    const dims = (p.dimOverride && p.dimOverride[item.id || item.codigo]) || modBase.dimensiones;
    const modUsado = { ...modBase, dimensiones: dims };
    const matDef = costos.materiales.find(m => m.tipo === modUsado.material) || costos.materiales[0];
    const esp = matDef?.espesor || 18;
    const dimMap = { ancho: dims.ancho, profundidad: dims.profundidad, alto: dims.alto };
    modUsado.piezas.forEach(pz => {
      const d1 = pz.especial ? (parseInt(pz.dimLibre1) || 0)
        : Math.round(resolverDim(dimMap[pz.usaDim], pz.offsetEsp, pz.offsetMm, pz.divisor || 1, esp));
      const d2 = pz.especial ? (parseInt(pz.dimLibre2) || 0)
        : Math.round(resolverDim(dimMap[pz.usaDim2], pz.offsetEsp2, pz.offsetMm2, pz.divisor2 || 1, esp));
      const cant = (pz.cantidad || 1) * (item.cantidad || 1);
      piezasCorte.push({ nombre: pz.nombre, modulo: `${item.codigo} ${modBase.nombre}`, d1, d2, cant, especial: !!pz.especial });
    });
  });

  // Calcular materiales necesarios
  const calcMat = (() => {
    const matMap = {};
    (p.items || []).forEach(item => {
      const modBase = modulos[item.codigo];
      if (!modBase) return;
      const dims = (p.dimOverride && p.dimOverride[item.id || item.codigo]) || modBase.dimensiones;
      const modUsado = { ...modBase, dimensiones: dims };
      const calc = calcularModulo(modUsado, costos);
      if (!calc) return;
      const key = modUsado.material;
      if (!matMap[key]) matMap[key] = { nombre: costos.materiales.find(m => m.tipo === key)?.nombre || key, m2: 0, espesor: costos.materiales.find(m => m.tipo === key)?.espesor || 18, placaL: costos.materiales.find(m => m.tipo === key)?.placaLargo || 2750, placaA: costos.materiales.find(m => m.tipo === key)?.placaAncho || 1830 };
      matMap[key].m2 += calc.m2Total * item.cantidad;
    });
    return Object.values(matMap).map(m => ({
      ...m,
      placas: Math.ceil(m.m2 / ((m.placaL * m.placaA) / 1_000_000))
    }));
  })();

  const calcTc = (() => {
    const tcMap = {};
    (p.items || []).forEach(item => {
      const modBase = modulos[item.codigo];
      if (!modBase) return;
      const dims = (p.dimOverride && p.dimOverride[item.id || item.codigo]) || modBase.dimensiones;
      const modUsado = { ...modBase, dimensiones: dims };
      const calc = calcularModulo(modUsado, costos);
      if (!calc) return;
      modUsado.piezas.forEach(pz => {
        if (!pz.tc?.id) return;
        const tcDef = costos.tapacanto?.find(t => t.id === pz.tc.id);
        if (!tcDef) return;
        const esp = costos.materiales.find(m => m.tipo === modUsado.material)?.espesor || 18;
        const dimMap = { ancho: dims.ancho, profundidad: dims.profundidad, alto: dims.alto };
        const d1 = pz.especial ? (parseInt(pz.dimLibre1) || 0) : resolverDim(dimMap[pz.usaDim], pz.offsetEsp, pz.offsetMm, pz.divisor || 1, esp);
        const d2 = pz.especial ? (parseInt(pz.dimLibre2) || 0) : resolverDim(dimMap[pz.usaDim2], pz.offsetEsp2, pz.offsetMm2, pz.divisor2 || 1, esp);
        const metros = (pz.cantidad * item.cantidad * ((pz.tc.lados1 || 0) * d1 + (pz.tc.lados2 || 0) * d2)) / 1000;
        if (!tcMap[tcDef.id]) tcMap[tcDef.id] = { nombre: tcDef.nombre, metros: 0 };
        tcMap[tcDef.id].metros += metros;
      });
    });
    return Object.values(tcMap);
  })();

  const calcHerrajes = (() => {
    const hMap = {};
    (p.items || []).forEach(item => {
      const modBase = modulos[item.codigo];
      if (!modBase) return;
      (modBase.herrajes || []).forEach(h => {
        const hDef = costos.herrajes?.find(hd => hd.id === h.id);
        if (!hDef) return;
        if (!hMap[h.id]) hMap[h.id] = { nombre: hDef.nombre, unidad: hDef.unidad || "u", cant: 0 };
        hMap[h.id].cant += (h.cantidad || 1) * item.cantidad;
      });
    });
    return Object.values(hMap);
  })();

  const filasCorte = piezasCorte.map((pz, i) =>
    `<tr style="background:${i % 2 === 0 ? '#f9f6f0' : '#fff'}">
      <td style="padding:7px 12px;font-size:12px;color:#5a3a10;font-family:monospace">${pz.modulo}</td>
      <td style="padding:7px 12px;font-size:13px;font-weight:600;color:#1a0e04">${pz.nombre}${pz.especial ? ' <span style="font-size:9px;background:#fff3cd;color:#8a6010;border:1px solid #e0c060;border-radius:3px;padding:1px 4px">ESP</span>' : ''}</td>
      <td style="padding:7px 12px;font-family:monospace;font-size:13px;font-weight:700;color:#1a6a30;text-align:right">${pz.d1}</td>
      <td style="padding:7px 12px;font-family:monospace;font-size:13px;font-weight:700;color:#1a6a30;text-align:right">${pz.d2}</td>
      <td style="padding:7px 12px;font-family:monospace;font-size:14px;font-weight:900;color:#7a4a10;text-align:center">×${pz.cant}</td>
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Ficha de Obra — ${p.nombre}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a0e04;padding:28px 36px;max-width:960px;margin:0 auto;font-size:13px}
  h2{font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#7a4a10;margin-bottom:14px;padding-bottom:6px;border-bottom:2px solid #e8d0a0}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  th{font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:7px 12px;border-bottom:2px solid #c8a060;text-align:left;background:#fdf6ec}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700}
  .section{margin-bottom:24px;padding:16px 18px;border:1px solid #e8d0a0;border-radius:8px;background:#fdf9f3}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
  .label{font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#9a7040;font-weight:700;margin-bottom:3px}
  .val{font-size:14px;font-weight:700;color:#1a0e04;font-family:monospace}
  .chip{display:inline-block;background:#f0e8d8;border:1px solid #c8a060;border-radius:4px;padding:2px 8px;font-size:11px;color:#7a4a10;margin:2px}
  @media print{body{padding:12px 16px} .no-print{display:none}}
</style></head><body>

<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:14px;border-bottom:3px solid #a07030">
  <div>${encabezadoTaller}
    <div style="font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#aaa;margin-top:6px">FICHA DE OBRA</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:18px;font-weight:800;color:#1a0e04">${p.nombre}</div>
    <div style="font-size:11px;color:#888;margin-top:3px">Creado: ${creacion} · Impreso: ${fecha}</div>
    <span class="badge" style="background:#c85030;color:#fff;margin-top:6px">🪚 En producción</span>
  </div>
</div>

${p.cliente && (p.cliente.nombre || p.cliente.tel || p.cliente.dir) ? `
<div class="section" style="margin-bottom:20px">
  <div class="grid3">
    ${p.cliente.nombre ? `<div><div class="label">Cliente</div><div class="val">${p.cliente.nombre}</div></div>` : ''}
    ${p.cliente.tel ? `<div><div class="label">Teléfono</div><div class="val">${p.cliente.tel}</div></div>` : ''}
    ${p.cliente.dir ? `<div><div class="label">Dirección entrega</div><div class="val">${p.cliente.dir}</div></div>` : ''}
  </div>
</div>` : ''}

<div class="grid2" style="margin-bottom:20px">
  <div class="section">
    <h2>📦 Módulos del trabajo</h2>
    ${(p.items || []).map(item => {
      const modBase = modulos[item.codigo];
      if (!modBase) return '';
      const dims = (p.dimOverride && p.dimOverride[item.id || item.codigo]) || modBase.dimensiones;
      const modUsado = { ...modBase, dimensiones: dims };
      const svgStr = generarVistaSVG({ ...modUsado, vistaConfig: modUsado.vistaConfig }, { width: 80, height: 80, theme: 'dark' });
      return `<div style="padding:8px 0;border-bottom:1px solid #e8d8c0;display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div style="width:80px;height:80px;flex-shrink:0;border:1px solid #e8d8c0;border-radius:4px;padding:4px;background:#f9f6f0;display:flex;align-items:center;justify-content:center">${svgStr}</div>
        <div style="flex:1">
          <span style="font-family:monospace;font-size:10px;color:#9a7040;font-weight:700">${item.codigo}</span>
          <span style="font-size:13px;font-weight:700;color:#1a0e04;margin-left:8px">${modBase.nombre}</span>
          <div style="font-size:11px;color:#7a6040;font-family:monospace;margin-top:2px">${dims.ancho}×${dims.profundidad}×${dims.alto} mm</div>
        </div>
        <span style="font-family:monospace;font-size:16px;font-weight:900;color:#7a4a10;flex-shrink:0">×${item.cantidad}</span>
      </div>`;
    }).join('')}
  </div>

  <div>
    <div class="section" style="margin-bottom:12px">
      <h2>🪵 Material necesario</h2>
      ${calcMat.map(m => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #e8d8c0">
          <div>
            <div style="font-weight:700;color:#1a0e04">${m.nombre} ${m.espesor}mm</div>
            <div style="font-size:11px;color:#888;font-family:monospace">${m.m2.toFixed(2)} m² (c/desp.)</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:18px;font-weight:900;color:#7a4a10;font-family:monospace">${m.placas}</div>
            <div style="font-size:10px;color:#888">placas</div>
          </div>
        </div>`).join('')}
      ${calcTc.length > 0 ? `<div style="margin-top:10px"><div class="label">Tapacanto</div>${calcTc.map(t => `<span class="chip">🎗 ${t.nombre}: ${t.metros.toFixed(1)} m</span>`).join('')}</div>` : ''}
      ${calcHerrajes.length > 0 ? `<div style="margin-top:10px"><div class="label">Herrajes</div>${calcHerrajes.map(h => `<span class="chip">⚙ ${h.nombre}: ${h.cant} ${h.unidad}</span>`).join('')}</div>` : ''}
    </div>

    <div class="section">
      <h2>💵 Estado de cobros</h2>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="color:#888">Total acordado</span>
        <span style="font-family:monospace;font-weight:700;color:#1a6a30">${fmtPeso(p.total)}</span>
      </div>
      ${cobros.map(c => `
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0">
          <span style="color:#888">${c.concepto} — ${fmtFecha(c.fecha)}</span>
          <span style="font-family:monospace;color:#5a8a5a">${fmtPeso(c.monto)}</span>
        </div>`).join('')}
      <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:2px solid #e8d0a0">
        <span style="font-weight:700">Saldo pendiente</span>
        <span style="font-family:monospace;font-weight:900;font-size:16px;color:${saldo > 0 ? '#c84040' : '#1a6a30'}">${fmtPeso(Math.max(0, saldo))}</span>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <h2>✂ Lista de corte completa (${piezasCorte.length} piezas · ${piezasCorte.reduce((a, p) => a + p.cant, 0)} unidades)</h2>
  <table>
    <thead><tr>
      <th>Módulo</th><th>Pieza</th>
      <th style="text-align:right">Alto (mm)</th>
      <th style="text-align:right">Ancho (mm)</th>
      <th style="text-align:center">Cant.</th>
    </tr></thead>
    <tbody>${filasCorte}</tbody>
  </table>
</div>

${p.nota ? `<div class="section"><h2>📋 Observaciones</h2><p style="font-size:13px;color:#3a2810;line-height:1.6;margin-top:6px">${p.nota}</p></div>` : ''}

<div style="margin-top:16px;padding:12px 16px;background:#f0f0f0;border-radius:6px;display:flex;justify-content:space-between;font-size:11px;color:#888">
  <span>CarpiCálc · Ficha de Obra generada el ${fecha}</span>
  <span>${p.nombre} · ${(p.items||[]).length} módulo${(p.items||[]).length !== 1 ? 's' : ''}</span>
</div>

<script>window.onload=()=>window.print();</script>
</body></html>`;

  const win = window.open("", "_blank", "width=1000,height=750");
  if (win) { win.document.write(html); win.document.close(); }
  else alert("El navegador bloqueó la ventana. Permití popups para este sitio.");
}

export { imprimirPresupuesto, generarFichaObra };