import React, { useState, useEffect, useMemo } from 'react';
import { useUndo } from '../../hooks/useUndo.js';
import { PanelSelectorModulos } from '../catalogo/index.jsx';
import { Btn, Badge, TextInput } from '../ui/index.jsx';
import { fmtPeso, fmtNum, fmtFecha, fmtFechaLarga,
         resolverDim, calcularModulo,
         presupuestoNecesitaActualizacion, presupuestoTieneContenido,
         calcularTotalVisual,
         recalcularTotalPresupuesto,
         generarVistaSVG } from '../../utils.js';
import { leerPerfil } from '../../storage.js';
import { usePresupuesto } from '../../state/PresupuestoContext.jsx';
import VistaModuloSVG from '../vista-svg/index.js';
import { TIPO_MAT, ESTADOS_TRABAJO } from '../../constants.js';
import ComposicionEditor from './ComposicionEditor.jsx';
import PiezasEditor from './PiezasEditor.jsx';

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
  costosDirectos = []
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

      // Generar SVG 80×80 inline
      const svgStr = generarVistaSVG({ ...modUsado, vistaConfig: modUsado.vistaConfig }, { width: 80, height: 80, theme: temaSVG });

      return `<tr>
        <td style="padding:8px 6px;width:80px;height:80px;text-align:center;vertical-align:middle;border-bottom:1px solid ${p.separador}">${svgStr}</td>
        <td class="cod" style="color:${p.acento}">${item.codigo}</td>
        <td>
          <div class="mod-nombre" style="color:${p.textoPrincipal}">${modBase.nombre}</div>
          ${modBase.descripcion ? `<div class="mod-desc" style="color:${p.textoSec}">${modBase.descripcion}</div>` : ""}
          ${item.nota?.trim() ? `<div class="mod-nota" style="color:${p.acento}">📝 ${item.nota}</div>` : ""}
          <div class="mod-dim" style="color:${dimDif ? p.acento : p.textoAcento}">
            ${over.ancho}×${over.profundidad}×${over.alto} mm${dimDif ? " ★ personalizado" : ""} · ${TIPO_MAT[modUsado.material]}
          </div>
        </td>
        <td class="num" style="font-weight:700;color:${p.acento}">${item.cantidad}</td>
        ${mostrarPrecioUnitario ? `<td class="num precio-u" style="color:${p.textoSec}">${fmtPeso(calc.total)}</td>` : ""}
        <td class="num subtotal" style="color:${p.totalColor}">${fmtPeso(calc.total * item.cantidad)}</td>
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
    .cod  { font-family: monospace; font-size: 10px; font-weight: 700; white-space: nowrap; }
    .num  { text-align: right; font-family: monospace; }
    .subtotal { font-size: 14px; font-weight: 700; }
    .precio-u  { font-size: 12px; }
    .mod-nombre { font-size: 13px; font-weight: 700; }
    .mod-desc   { font-size: 11px; font-style: italic; margin-top: 3px; }
    .mod-dim    { font-size: 10px; font-family: monospace; margin-top: 4px; }
    .mod-nota   { font-size: 11px; font-style: italic; margin-top: 4px; }
  </style>
</head>
<body>

  <!-- ZONA 1: HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid ${p.acento};margin-bottom:16px;gap:24px">
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

  ${nombre ? `<div style="text-align:center;font-family:'Georgia',serif;font-size:18px;font-style:italic;font-weight:700;color:${p.acento};padding:10px 0 20px 0;letter-spacing:0.02em">${nombre}</div>` : ""}

  ${textoApertura ? `<div style="margin-bottom:20px;padding:12px 16px;background:${p.fondoCliente};border-left:3px solid ${p.acentoSuave};border-radius:0 6px 6px 0;font-size:13px;color:${p.textoSec};line-height:1.7">${textoApertura.replace(/\n/g, "<br>")}</div>` : ""}

  <!-- ZONA 2: TABLA -->
  <table class="tabla-items">
    <thead>
      <tr>
        <th class="txt" style="width:70px">Código</th>
        <th class="txt">Módulo / Descripción</th>
        <th class="num" style="width:52px">Cant.</th>
        ${mostrarPrecioUnitario ? `<th class="num" style="width:110px">P. unit.</th>` : ""}
        <th class="num" style="width:120px">Subtotal</th>
      </tr>
    </thead>
    <tbody>${filas}${filasCostosDirectos}${filasAdicionales}</tbody>
  </table>

  <!-- ZONA 3: PIE -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:32px;margin-top:0;padding:20px 0 0 0;border-top:2px solid ${p.acento}">

    <div style="flex:1;max-width:55%">
      ${condiciones ? `
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.16em;font-weight:700;color:${p.textoAcento};margin-bottom:8px">Condiciones y observaciones</div>
      <div style="font-size:11px;color:${p.textoSec};line-height:1.7;background:${p.fondoFila};border:1px solid ${p.separador};border-radius:6px;padding:10px 14px">${condiciones.replace(/\n/g, "<br>")}</div>
      ` : `<div style="font-size:11px;color:${p.textoAcento};font-style:italic;opacity:0.6">Sin condiciones especificadas.</div>`}
      <div style="margin-top:12px;font-size:10px;color:${p.textoAcento};opacity:0.7">
        ${totalUnid} unidad${totalUnid !== 1 ? "es" : ""} · ${items.length} módulo${items.length !== 1 ? "s" : ""}
      </div>
    </div>

    <div style="min-width:220px;text-align:right">
      <table style="width:100%;border-collapse:collapse;font-family:'Segoe UI',Arial,sans-serif">
        <tr>
          <td style="font-size:11px;color:${p.textoAcento};padding:4px 0;text-align:left">Subtotal</td>
          <td style="font-size:13px;font-weight:700;color:${tv.hayDescuento ? p.textoAcento : p.textoPrincipal};text-align:right;padding:4px 0;${tv.hayDescuento ? "text-decoration:line-through;opacity:0.55;letter-spacing:0.02em" : ""}">
            ${fmtPeso(tv.totalOriginal)}
          </td>
        </tr>
        ${tv.hayDescuento ? `
        <tr>
          <td style="font-size:11px;color:${p.descuentoColor};padding:4px 0;text-align:left">🏷 Descuento</td>
          <td style="font-size:13px;font-weight:700;color:${p.descuentoColor};text-align:right;padding:4px 0">− ${fmtPeso(tv.descuentoVal)}</td>
        </tr>` : ""}
        ${tv.hayGanancia ? `
        <tr>
          <td style="font-size:11px;color:${p.textoAcento};padding:4px 0;text-align:left">Recargo</td>
          <td style="font-size:13px;font-weight:700;color:${p.textoSec};text-align:right;padding:4px 0">+ ${fmtPeso(tv.gananciaVal)}</td>
        </tr>` : ""}
        ${tv.hayDescuento || tv.hayGanancia ? `
        <tr><td colspan="2" style="padding:6px 0 0 0;border-top:1px solid ${p.acentoSuave}"></td></tr>` : ""}
        <tr>
          <td style="font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:${p.textoAcento};padding-top:6px;text-align:left">Total del trabajo</td>
          <td style="padding-top:6px;text-align:right">
            <span style="font-family:'Georgia',serif;font-size:28px;font-weight:900;color:${p.totalColor};letter-spacing:-0.5px">${fmtPeso(tv.totalFinal)}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="font-size:9px;color:${p.textoAcento};padding-top:4px;text-align:right;opacity:0.7">IVA no incluido</td>
        </tr>
      </table>
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

// ── ResumenPresupuesto ────────────────────────────────────────────
function ResumenPresupuesto({
  items,
  modulos,
  costos,
  getModUsado,
  totalGeneral,
  mostrarPrecioUnitario,
  nombrePresupuesto,
  descuento = 0,
  gananciaExtra = 0,
  adicionales = [],
  costosDirectos = []
}) {
  const [mostrarIVA, setMostrarIVA] = useState(false);
  const totalConIVA = Math.round(totalGeneral * 1.21);
  // LÓGICA - Precios Tachados y PDF: usar función centralizada
  const tv = calcularTotalVisual(totalGeneral, descuento, gananciaExtra);
  const totalAjustadoConIVA = Math.round(tv.totalFinal * 1.21);
  if (items.length === 0) return null;
  const itemsValidos = items.filter(item => {
    const mod = getModUsado(item);
    return mod && mod.piezas;
  });
  if (itemsValidos.length === 0) return null;
  const cols = mostrarPrecioUnitario
    ? "80px 1fr 50px 120px 130px"
    : "80px 1fr 50px 130px";
  const fechaHoy = fmtFechaLarga(Date.now());
  return (
    <div>
      <div
        className="print-only"
        style={{
          marginBottom: 28,
          borderBottom: "2px solid #a07030",
          paddingBottom: 16
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start"
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 22,
                fontWeight: 900,
                color: "#7a4a10",
                lineHeight: 1
              }}
            >
              CarpiCálc
            </div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginTop: 4,
                color: "#888"
              }}
            >
              Presupuesto de carpintería
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {nombrePresupuesto && (
              <div style={{ fontSize: 16, fontWeight: 700, color: "#2c1a08" }}>
                {nombrePresupuesto}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
              {fechaHoy}
            </div>
          </div>
        </div>
      </div>
      {/* rsp-scroll-x: scroll horizontal táctil en móvil */}
      <div
        className="rsp-scroll-x"
        style={{
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--border)"
        }}
      >
        <div className="rsp-table-inner">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              gap: 0,
              padding: "10px 20px",
              background: "var(--accent-soft)",
              borderBottom: "1px solid var(--border)"
            }}
          >
            {[
              "Código",
              "Módulo",
              "Cant.",
              ...(mostrarPrecioUnitario ? ["P. unit."] : [""]),
              "Subtotal",
            ]
              .filter((h) => h)
              .map((h) => (
                <div
                  key={h}
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontWeight: 700,
                    fontFamily: "'DM Mono',monospace",
                    color: "var(--text-muted)",
                    textAlign:
                      h === "Cant." || h === "P. unit." || h === "Subtotal"
                        ? "right"
                        : "left"
                  }}
                >
                  {h}
                </div>
              ))}
          </div>
          {(itemsValidos).map((item, idx) => {
            const modBase = modulos[item.codigo];
            if (!modBase) return null;
            const modUsado = getModUsado(item);
            const calc = calcularModulo(modUsado, costos);
            if (!calc) return null;
            const over = modUsado.dimensiones;
            const dimDif =
              over.ancho !== modBase.dimensiones.ancho ||
              over.profundidad !== modBase.dimensiones.profundidad ||
              over.alto !== modBase.dimensiones.alto;
            return (
              <div
                key={item.id || item.codigo}
                className="print-table-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: cols,
                  gap: 0,
                  padding: "14px 20px",
                  borderBottom:
                    idx < items.length - 1 ? "1px solid var(--border)" : "none",
                  transition: "background 0.15s"
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--accent-soft)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "var(--accent)",
                    paddingTop: 3
                  }}
                >
                  {item.codigo}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-primary)"
                    }}
                  >
                    {modBase.nombre}
                  </div>
                  {modBase.descripcion && (
                    <div
                      style={{
                        fontSize: 12,
                        marginTop: 2,
                        fontStyle: "italic",
                        color: "var(--text-muted)"
                      }}
                    >
                      {modBase.descripcion}
                    </div>
                  )}
                  {item.nota && item.nota.trim() && (
                    <div
                      className="item-nota-print"
                      style={{
                        fontSize: 12,
                        marginTop: 4,
                        color: "var(--accent)",
                        fontStyle: "italic",
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <span style={{ opacity: 0.7 }}>📝</span> {item.nota}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 5,
                      flexWrap: "wrap"
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "'DM Mono',monospace",
                        color: dimDif ? "var(--accent)" : "var(--text-muted)"
                      }}
                    >
                      {over.ancho}×{over.profundidad}×{over.alto} mm
                    </span>
                    {dimDif && (
                      <Badge color="var(--accent)">★ personalizado</Badge>
                    )}
                    <Badge color="#7090b0">{TIPO_MAT[modUsado.material]}</Badge>
                  </div>
                </div>
                <div style={{ textAlign: "right", paddingTop: 3 }}>
                  <span
                    style={{
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--accent)"
                    }}
                  >
                    {item.cantidad}
                  </span>
                </div>
                {mostrarPrecioUnitario && (
                  <div
                    style={{
                      textAlign: "right",
                      paddingTop: 3,
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 12,
                      color: "var(--text-secondary)"
                    }}
                  >
                    {fmtPeso(calc.total)}
                  </div>
                )}
                <div
                  style={{
                    textAlign: "right",
                    paddingTop: 3,
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#7ecf8a"
                  }}
                >
                  {fmtPeso(calc.total * item.cantidad)}
                </div>
              </div>
            );
          })}
          <div
            className="print-total-block"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 20,
              padding: "16px 24px",
              alignItems: "center",
              background: "var(--bg-surface)",
              borderTop: "1px solid var(--accent-border)"
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {items.reduce((a, i) => a + i.cantidad, 0)} u · {items.length} mód.
                {(adicionales || []).length > 0 && ` · ${adicionales.length} extra${adicionales.length !== 1 ? "s" : ""}`}
                {(costosDirectos || []).length > 0 && ` · ${costosDirectos.length} costo${costosDirectos.length !== 1 ? "s" : ""}`}
              </div>
              <button onClick={() => setMostrarIVA(v => !v)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: mostrarIVA ? "rgba(126,207,138,0.12)" : "var(--accent-soft)",
                  border: `1px solid ${mostrarIVA ? "rgba(126,207,138,0.30)" : "var(--accent-border)"}`,
                  color: mostrarIVA ? "#7ecf8a" : "var(--accent)",
                  borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                  fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, width: "fit-content",
                  transition: "all 0.15s"
                }}>
                {mostrarIVA ? "✓ Con IVA 21%" : "+ Ver con IVA 21%"}
              </button>
            </div>
            <div style={{ textAlign: "right" }}>
              {/* Total original — tachado si hay descuento */}
              {tv.hayDescuento || tv.hayGanancia ? (
                <>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 2, color: "var(--text-muted)" }}>
                    {mostrarIVA ? "Total + IVA 21%" : "Total sin IVA"}
                  </div>
                  {tv.hayDescuento && (
                    <div style={{
                      fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700,
                      color: "var(--text-muted)", textDecoration: "line-through",
                      opacity: 0.55, letterSpacing: "0.02em", marginBottom: 4
                    }}>
                      {fmtPeso(mostrarIVA ? totalConIVA : totalGeneral)}
                    </div>
                  )}
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1, color: "#7ecf8a", transition: "all 0.2s" }}>
                    {fmtPeso(mostrarIVA ? totalAjustadoConIVA : tv.totalFinal)}
                  </div>
                  {tv.hayDescuento && (
                    <div style={{ fontSize: 10, color: "#e07070", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
                      🏷 Precio con descuento
                    </div>
                  )}
                  {mostrarIVA && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
                      base: {fmtPeso(tv.totalFinal)} · iva: {fmtPeso(totalAjustadoConIVA - tv.totalFinal)}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 4, color: "var(--text-muted)" }}>
                    {mostrarIVA ? "Total + IVA 21%" : "Total sin IVA"}
                  </div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1, color: "#7ecf8a", transition: "all 0.2s" }}>
                    {fmtPeso(mostrarIVA ? totalConIVA : totalGeneral)}
                  </div>
                  {mostrarIVA && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
                      base: {fmtPeso(totalGeneral)} · iva: {fmtPeso(totalConIVA - totalGeneral)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BarraTotal ────────────────────────────────────────────────────
function BarraTotal({ items, modulos, costos, getModUsado, totalGeneral, nombrePresupuesto, descuento = 0, gananciaExtra = 0, adicionales = [], costosDirectos = [], mostrarExtras = true, mostrarCostosDirectos = true }) {
  const [expandido, setExpandido] = useState(false);
  const [mostrarIVA, setMostrarIVA] = useState(false);
  const totalConIVA = Math.round(totalGeneral * 1.21);
  const totalUnid = items.reduce((a, i) => a + i.cantidad, 0);
  // LÓGICA - Precios Tachados: usar función centralizada para reactividiad instantánea
  const tv = calcularTotalVisual(totalGeneral, descuento, gananciaExtra);
  const totalFinalConIVA = Math.round(tv.totalFinal * 1.21);
  const hayAjuste = tv.hayDescuento || tv.hayGanancia;

  return (
    <div style={{ borderRadius: expandido ? "10px 10px 0 0" : 10, overflow: "hidden", border: "1px solid var(--accent-border)", background: "var(--bg-surface)" }}>
      {/* Barra principal — siempre visible */}
      <div style={{
        padding: "10px 16px", display: "flex", alignItems: "center",
        gap: 12, flexWrap: "wrap", cursor: "pointer",
        background: "var(--accent-soft)",
        borderBottom: expandido ? "1px solid var(--accent-border)" : "none"
      }}
        onClick={() => setExpandido(v => !v)}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
            {totalUnid} u · {items.length} mód.
          </span>
          <button
            onClick={e => { e.stopPropagation(); setMostrarIVA(v => !v); }}
            style={{
              padding: "3px 10px", borderRadius: 5, fontSize: 10,
              fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer",
              background: mostrarIVA ? "rgba(126,207,138,0.15)" : "transparent",
              border: `1px solid ${mostrarIVA ? "rgba(126,207,138,0.35)" : "var(--accent-border)"}`,
              color: mostrarIVA ? "#7ecf8a" : "var(--accent)",
              transition: "all 0.15s"
            }}>
            {mostrarIVA ? "✓ Con IVA" : "+ IVA 21%"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Total original — tachado elegante si hay descuento */}
          {tv.hayDescuento && (
            <span style={{
              fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700,
              color: "var(--text-muted)", textDecoration: "line-through",
              opacity: 0.5, letterSpacing: "0.02em"
            }}>
              {fmtPeso(mostrarIVA ? totalConIVA : totalGeneral)}
            </span>
          )}
          {/* Total final — verde destacado */}
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 900, color: "#7ecf8a", letterSpacing: -0.5 }}>
            {fmtPeso(mostrarIVA ? (hayAjuste ? totalFinalConIVA : totalConIVA) : (hayAjuste ? tv.totalFinal : totalGeneral))}
          </span>
          {mostrarIVA && !hayAjuste && (
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
              base {fmtPeso(totalGeneral)}
            </span>
          )}
          <span style={{ color: "var(--accent)", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
            {expandido ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Resumen expandido */}
      {expandido && (
        <ResumenPresupuesto
          items={items}
          modulos={modulos}
          costos={costos}
          getModUsado={getModUsado}
          totalGeneral={totalGeneral}
          nombrePresupuesto={nombrePresupuesto}
          descuento={descuento}
          gananciaExtra={gananciaExtra}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SeccionCostosDirectos
// ════════════════════════════════════════════════════════════════════════════
// Carga ítems de la tabla de Costos directamente en el presupuesto.
// Casos: horas de MO extra, m² de material, herrajes sueltos, tapacanto.
// Cada ítem guarda refId para poder actualizarse si el precio cambia en Costos.
// Los Cortes NO leen estos ítems — son montos directos al total.
function SeccionCostosDirectos({ costosDirectos, setCostosDirectos, costos, sinCard = false }) {
  const [tipoSel,    setTipoSel]    = useState("mo");
  const [refSel,     setRefSel]     = useState("");
  const [cant,       setCant]       = useState(1);
  const [precio,     setPrecio]     = useState("");
  const [editId,     setEditId]     = useState(null);
  const [editForm,   setEditForm]   = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const TIPOS = [
    { id: "mo",        label: "Mano de obra", unidad: "hs",  items: costos?.manoDeObra || [] },
    { id: "material",  label: "Materiales",   unidad: "m²",  items: costos?.materiales || [] },
    { id: "herraje",   label: "Herrajes",     unidad: "u",   items: costos?.herrajes   || [] },
    { id: "tapacanto", label: "Tapacanto",    unidad: "ml",  items: costos?.tapacanto  || [] },
  ];
  const tipoActual = TIPOS.find(t => t.id === tipoSel);

  const getItemCostos = (tipo, refId) =>
    (TIPOS.find(x => x.id === tipo)?.items || []).find(x => String(x.id) === String(refId)) || null;

  const getPrecioRef = (tipo, refId) => {
    const item = getItemCostos(tipo, refId);
    if (!item) return 0;
    return tipo === "material" ? (item.precioM2 || 0) : (item.precio || 0);
  };

  const handleSelItem = (refId) => {
    setRefSel(refId);
    const p = getPrecioRef(tipoSel, refId);
    setPrecio(p ? String(p) : "");
  };

  const agregar = () => {
    if (!refSel) return;
    const item     = getItemCostos(tipoSel, refSel);
    if (!item) return;
    const cantNum  = parseFloat(cant)   || 1;
    const precNum  = parseFloat(precio) || getPrecioRef(tipoSel, refSel);
    const precBase = getPrecioRef(tipoSel, refSel);
    setCostosDirectos(prev => [...prev, {
      id: Date.now(), tipo: tipoSel, refId: refSel,
      nombre: item.nombre, unidad: tipoActual?.unidad || "u",
      cantidad: cantNum, precioUnit: precNum,
      precioManual: precNum !== precBase,
      subtotal: Math.round(cantNum * precNum)
    }]);
    setRefSel(""); setCant(1); setPrecio("");
  };

  const actualizarPrecio = (id) => {
    setCostosDirectos(prev => prev.map(x => {
      if (x.id !== id) return x;
      const pAct = getPrecioRef(x.tipo, x.refId);
      return { ...x, precioUnit: pAct, precioManual: false, subtotal: Math.round(x.cantidad * pAct) };
    }));
  };

  const totalSeccion = costosDirectos.reduce((a, x) => a + (x.subtotal || 0), 0);
  const BADGE = { mo: "MO", material: "MAT", herraje: "HRJ", tapacanto: "TC" };
  const inpSt = { fontFamily: "'DM Mono',monospace", fontSize: 13, padding: "7px 10px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-primary)", outline: "none" };

  const inner = (
    <div style={{ padding: "12px 16px" }}>
        {/* Ítems cargados */}
        {costosDirectos.length > 0 && (
          <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {costosDirectos.map(x => {
              const precActual = getPrecioRef(x.tipo, x.refId);
              const hayCambio  = precActual > 0 && precActual !== x.precioUnit;
              const editando   = editId === x.id;
              return (
                <div key={x.id} style={{ borderRadius: 8, overflow: "hidden", border: editando ? "1.5px solid var(--accent)" : "1px solid var(--border)", background: "var(--bg-surface)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", background: "var(--bg-subtle)", padding: "2px 5px", borderRadius: 4, border: "1px solid var(--border)", flexShrink: 0 }}>
                      {BADGE[x.tipo]}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{x.nombre}</span>
                    <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>{x.cantidad} {x.unidad} × {fmtPeso(x.precioUnit)}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(x.subtotal)}</span>
                    {hayCambio && (
                      <button onClick={() => actualizarPrecio(x.id)} title={`Precio actual en Costos: ${fmtPeso(precActual)}`}
                        style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, cursor: "pointer", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.35)", color: "#c8a02a", fontFamily: "'DM Mono',monospace", fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" }}>
                        ↻ {fmtPeso(precActual)}
                      </button>
                    )}
                    <button onClick={() => { if (editando) { setEditId(null); setEditForm(null); } else { setEditId(x.id); setEditForm({ cantidad: String(x.cantidad), precioUnit: String(x.precioUnit) }); } }}
                      style={{ background: editando ? "var(--accent-soft)" : "transparent", border: `1px solid ${editando ? "var(--accent-border)" : "var(--border)"}`, color: editando ? "var(--accent)" : "var(--text-muted)", borderRadius: 5, cursor: "pointer", fontSize: 11, padding: "3px 8px", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                      {editando ? "▲" : "✎"}
                    </button>
                    {confirmDel === x.id ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => { setCostosDirectos(p => p.filter(a => a.id !== x.id)); setConfirmDel(null); if (editando) { setEditId(null); setEditForm(null); } }}
                          style={{ padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070", fontFamily: "'DM Mono',monospace" }}>✓</button>
                        <button onClick={() => setConfirmDel(null)} style={{ padding: "3px 7px", borderRadius: 5, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDel(x.id)} style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
                    )}
                  </div>
                  {editando && editForm && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "10px 12px", background: "var(--bg-subtle)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Cantidad ({x.unidad})</div>
                        <input type="number" min="0.1" step="0.1" value={editForm.cantidad}
                          onChange={e => setEditForm(f => ({ ...f, cantidad: e.target.value }))}
                          style={{ ...inpSt, width: 90, textAlign: "right" }}
                          onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                          onBlur={e => e.target.style.borderColor = "var(--border)"} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Precio unit.</div>
                        <input type="number" min="0" value={editForm.precioUnit}
                          onChange={e => setEditForm(f => ({ ...f, precioUnit: e.target.value }))}
                          style={{ ...inpSt, width: 110, textAlign: "right" }}
                          onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                          onBlur={e => e.target.style.borderColor = "var(--border)"} />
                      </div>
                      <button onClick={() => {
                        const c2 = parseFloat(editForm.cantidad)  || x.cantidad;
                        const p2 = parseFloat(editForm.precioUnit) || x.precioUnit;
                        const pb = getPrecioRef(x.tipo, x.refId);
                        setCostosDirectos(prev => prev.map(a => a.id === x.id ? { ...a, cantidad: c2, precioUnit: p2, precioManual: p2 !== pb, subtotal: Math.round(c2 * p2) } : a));
                        setEditId(null); setEditForm(null);
                      }} style={{ padding: "8px 14px", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)" }}>✓ Confirmar</button>
                      <button onClick={() => { setEditId(null); setEditForm(null); }}
                        style={{ padding: "8px 12px", borderRadius: 7, cursor: "pointer", fontSize: 11, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>Cancelar</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pestañas de tipo */}
        <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
          {TIPOS.map(t => (
            <button key={t.id} onClick={() => { setTipoSel(t.id); setRefSel(""); setPrecio(""); }}
              style={{ padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, transition: "all 0.15s",
                background: tipoSel === t.id ? "var(--accent-soft)" : "transparent",
                border: tipoSel === t.id ? "1px solid var(--accent-border)" : "1px solid var(--border)",
                color: tipoSel === t.id ? "var(--accent)" : "var(--text-muted)" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Selector + cantidad + precio */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <select value={refSel} onChange={e => handleSelItem(e.target.value)} style={{ ...inpSt, flex: 1, minWidth: 140 }}>
            <option value="">— Seleccioná un ítem —</option>
            {(tipoActual?.items || []).map(it => (
              <option key={it.id} value={String(it.id)}>
                {it.nombre} — {fmtPeso(tipoSel === "material" ? it.precioM2 : it.precio)}/{tipoActual?.unidad}
              </option>
            ))}
          </select>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Cant. ({tipoActual?.unidad})</div>
            <input type="number" min="0.1" step="0.1" placeholder="1" value={cant}
              onChange={e => setCant(e.target.value)} style={{ ...inpSt, width: 80, textAlign: "right" }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Precio unit.</div>
            <input type="number" min="0" placeholder="auto" value={precio}
              onChange={e => setPrecio(e.target.value)} style={{ ...inpSt, width: 110, textAlign: "right" }} />
          </div>
          <button onClick={agregar} disabled={!refSel}
            style={{ padding: "8px 16px", borderRadius: 7, cursor: refSel ? "pointer" : "not-allowed", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, opacity: refSel ? 1 : 0.45, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
            + Agregar
          </button>
        </div>
      </div>
  );

  if (sinCard) return inner;
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", overflow: "visible" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)" }}>
          🔩 Costos directos del taller
        </span>
        {costosDirectos.length > 0 && <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(totalSeccion)}</span>}
      </div>
      {inner}
    </div>
  );
}

// ── SeccionAdicionales ────────────────────────────────────────────
// Gastos extra: flete, instalación, diseño, etc.
// Independiente de los módulos — no afecta Cortes ni Materiales.
// Integrado con costos.extrasFrecuentes para autocompletado.
function SeccionAdicionales({ adicionales, setAdicionales, costos, onGuardarFrecuente, sinCard = false }) {
  const [inputNombre, setInputNombre] = useState("");
  const [inputMonto, setInputMonto] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [toastNuevo, setToastNuevo] = useState(null); // nombre del extra nuevo para sugerir guardar

  const frecuentes = costos?.extrasFrecuentes || [];

  const filtrarSugerencias = (texto) => {
    if (!texto.trim() || texto.length < 2) { setSugerencias([]); return; }
    const hits = frecuentes.filter(f =>
      f.nombre.toLowerCase().includes(texto.toLowerCase())
    );
    setSugerencias(hits);
  };

  const seleccionarSugerencia = (f) => {
    setInputNombre(f.nombre);
    setInputMonto(String(f.precio));
    setSugerencias([]);
  };

  const agregar = () => {
    const nombre = inputNombre.trim();
    const monto = parseFloat(inputMonto) || 0;
    if (!nombre || monto <= 0) return;

    const nuevoExtra = { id: Date.now(), nombre, monto };
    setAdicionales(prev => [...prev, nuevoExtra]);

    // ¿Es nuevo (no está en frecuentes)? Sugerir guardarlo si tiene monto real
    const yaExiste = frecuentes.some(f => f.nombre.toLowerCase() === nombre.toLowerCase());
    if (!yaExiste && monto > 0 && nombre.length >= 3) {
      setToastNuevo({ nombre, precio: monto });
    }

    setInputNombre(""); setInputMonto(""); setSugerencias([]);
  };

  const [confirmDelExtra, setConfirmDelExtra] = useState(null);

  const inputSm = {
    fontFamily: "'DM Mono',monospace", fontSize: 13, padding: "7px 10px",
    background: "var(--bg-base)", border: "1px solid var(--border)",
    color: "var(--text-primary)", borderRadius: 7, outline: "none"
  };

  if (!setAdicionales) return null;

  const innerAd = (
    <div style={{ padding: "12px 16px" }}>
        {/* Lista de adicionales cargados */}
        {adicionales.length > 0 && (
          <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {adicionales.map(x => (
              <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg-subtle)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, flex: 1, color: "var(--text-primary)" }}>{x.nombre}</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(x.monto)}</span>
                {confirmDelExtra === x.id ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => { setAdicionales(prev => prev.filter(a => a.id !== x.id)); setConfirmDelExtra(null); }}
                      style={{ padding: "2px 7px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070" }}>✓</button>
                    <button onClick={() => setConfirmDelExtra(null)}
                      style={{ padding: "2px 6px", borderRadius: 4, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelExtra(x.id)}
                    style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Toast: sugerir guardar como frecuente */}
        {toastNuevo && (
          <div style={{ marginBottom: 10, padding: "9px 12px", borderRadius: 8, background: "rgba(200,160,42,0.10)", border: "1px solid rgba(200,160,42,0.30)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#c8a02a", flex: 1 }}>
              💡 <strong>"{toastNuevo.nombre}"</strong> no está en tus extras frecuentes. ¿Guardarlo para próximos presupuestos?
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { onGuardarFrecuente && onGuardarFrecuente(toastNuevo); setToastNuevo(null); }}
                style={{ padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(200,160,42,0.18)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a" }}>
                ✓ Guardar
              </button>
              <button onClick={() => setToastNuevo(null)}
                style={{ padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontSize: 11, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                No
              </button>
            </div>
          </div>
        )}

        {/* Formulario de ingreso con autocompletado */}
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140, position: "relative" }}>
              <input
                type="text" placeholder="Descripción (ej: Flete, Instalación...)"
                value={inputNombre}
                onChange={e => { setInputNombre(e.target.value); filtrarSugerencias(e.target.value); }}
                onKeyDown={e => e.key === "Enter" && agregar()}
                style={{ ...inputSm, width: "100%" }}
                onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                onBlur={e => { e.target.style.borderColor = "var(--border)"; setTimeout(() => setSugerencias([]), 180); }}
              />
              {/* Dropdown autocompletado */}
              {sugerencias.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.35)", overflow: "hidden" }}>
                  {sugerencias.map(f => (
                    <div key={f.id} onMouseDown={() => seleccionarSugerencia(f)}
                      style={{ padding: "9px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--accent-soft)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{f.nombre}</span>
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>{fmtPeso(f.precio)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>$</span>
              <input type="number" min="0" placeholder="Monto" value={inputMonto}
                onChange={e => setInputMonto(e.target.value)}
                onKeyDown={e => e.key === "Enter" && agregar()}
                style={{ ...inputSm, width: 110, textAlign: "right" }}
                onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
            </div>
            <button onClick={agregar}
              style={{ padding: "8px 16px", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", flexShrink: 0 }}>
              + Agregar
            </button>
          </div>
        </div>
      </div>
  );

  if (sinCard) return innerAd;
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "visible", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)" }}>
          🧾 Gastos Extras / Adicionales
        </span>
        {adicionales.length > 0 && (
          <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#7ecf8a" }}>
            {fmtPeso(adicionales.reduce((a, x) => a + x.monto, 0))}
          </span>
        )}
      </div>
      {innerAd}
    </div>
  );
}

// ── ModalEdicionModulo — Nivel 2 ──────────────────────────────────
// Edición rápida de dimensiones + material sin tocar el catálogo.
// Nivel 3 disponible via botón "Editar en Catálogo".
// ── Presupuesto ───────────────────────────────────────────────────
function GestorPresupuestos({
  presupuestos,
  onCargar,
  onNuevo,
  onEliminar,
  onCambiarEstado,
  totalActual,
  itemsActual,
  nombreInicial = "",
  clienteInicial = { nombre: "", tel: "", dir: "" },
  onVer,
  itemsActivos = [],
  costosVersion = 0,
  onActualizarPresupuesto,
  modulos,
  costos
}) {
  const [abierto, setAbierto] = useState(false);
  const [confirmDelId, setConfirmDelId] = useState(null);
  const [busquedaPres, setBusquedaPres] = useState("");
  const [avisoVerId, setAvisoVerId] = useState(null);
  // Feedback visual post-actualización — muestra "✓ Actualizado" brevemente
  const [actualizadoId, setActualizadoId] = useState(null);

  const handleActualizar = (id, p) => {
    const nuevoTotal = recalcularTotalPresupuesto(p, modulos, costos);
    if (nuevoTotal !== null) {
      onActualizarPresupuesto(id, { total: Math.round(nuevoTotal), costosVersionAl: Date.now() });
      setActualizadoId(id);
      setTimeout(() => setActualizadoId(prev => prev === id ? null : prev), 3000);
    }
  };

  const totalEntries = Object.keys(presupuestos).length;

  // Derivar entradas + cálculo de "necesita" en useMemo para evitar recalcular
  // en re-renders por hover, búsqueda u otros estados locales.
  const entries = useMemo(() => {
    return Object.entries(presupuestos)
      .sort((a, b) => b[0] - a[0])
      .filter(([, p]) => {
        if (!busquedaPres.trim()) return true;
        const q = busquedaPres.toLowerCase();
        return p.nombre?.toLowerCase().includes(q) || p.cliente?.nombre?.toLowerCase().includes(q);
      })
      .map(([id, p]) => {
        const tieneRecalculable = (p.items || []).length > 0 || (p.costosDirectos || []).length > 0;
        const nuevoTotalCalc = (modulos && costos && tieneRecalculable)
          ? recalcularTotalPresupuesto(p, modulos, costos)
          : null;
        const diff = nuevoTotalCalc !== null ? Math.round(nuevoTotalCalc) - (p.total || 0) : 0;
        // Necesita actualización si: precio cambió (diff) O costos cambiaron desde que se guardó (timestamp, fallback para extras-solo)
        const necesita = presupuestoTieneContenido(p) && (
          (nuevoTotalCalc !== null && Math.abs(diff) > 1) ||
          (nuevoTotalCalc === null && presupuestoNecesitaActualizacion(id, costosVersion, p))
        );
        return [id, p, { necesita, diff, nuevoTotalCalc }];
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presupuestos, modulos, costos, costosVersion, busquedaPres]);

  return (
    <div>
      {/* Cabecera colapsable */}
      <button onClick={() => setAbierto(a => !a)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderRadius: abierto ? "10px 10px 0 0" : 10, cursor: "pointer",
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        fontFamily: "'DM Mono',monospace", transition: "all 0.15s",
        borderBottom: abierto ? "none" : "1px solid var(--border)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14 }}>🗄</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
            Mis presupuestos
          </span>
          {totalEntries > 0 && (
            <span style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 999, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>
              {totalEntries}
            </span>
          )}
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderTop: "1px solid var(--separator)", borderRadius: "0 0 10px 10px", overflow: "visible" }}>

          {/* Buscador — solo con más de 3 */}
          {totalEntries > 3 && (
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--separator)" }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-muted)", pointerEvents: "none" }}>🔍</span>
                <input value={busquedaPres} onChange={e => setBusquedaPres(e.target.value)}
                  placeholder="Buscar por nombre o cliente..."
                  style={{ width: "100%", paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 12, background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 6, outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
            </div>
          )}

          {/* Lista de presupuestos */}
          {entries.length === 0 ? (
            <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              {busquedaPres ? `Sin resultados para "${busquedaPres}"` : "No hay presupuestos guardados todavía"}
            </div>
          ) : (
            entries.map(([id, p, { necesita, diff, nuevoTotalCalc }]) => {
              const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
              return (
                <div key={id} style={{
                  borderBottom: "1px solid var(--separator)", transition: "background 0.12s"
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-subtle)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Fila principal */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", flexWrap: "wrap" }}>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 9, fontWeight: 700, background: `${est.color}20`, color: est.color, border: `1px solid ${est.color}30`, borderRadius: 3, padding: "1px 5px", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
                          {est.icon} {est.label}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, fontFamily: "'DM Mono',monospace" }}>
                        {fmtFecha(parseInt(id))} · {p.items?.length || 0} mód.
                        {p.cliente?.nombre && <span> · 👤 {p.cliente.nombre}</span>}
                        <span style={{ color: "#7ecf8a", fontWeight: 700, marginLeft: 8 }}>{fmtPeso(p.total)}</span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center", flexWrap: "wrap", position: "relative" }}>
                      {avisoVerId === id && (
                        <div style={{ position: "absolute", right: 14, top: "100%", zIndex: 100, background: "var(--bg-surface)", border: "1px solid rgba(200,160,42,0.40)", borderRadius: 8, padding: "10px 14px", boxShadow: "0 6px 20px rgba(0,0,0,0.40)", minWidth: 240 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#c8a02a", marginBottom: 6 }}>⚠ Tenés un presupuesto activo sin guardar</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>¿Querés ir a Vista Previa de todas formas?</div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => { onVer(id); setAbierto(false); setAvisoVerId(null); }}
                              style={{ padding: "5px 12px", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a", borderRadius: 5 }}>
                              Ir a Vista Previa
                            </button>
                            <button onClick={() => setAvisoVerId(null)}
                              style={{ padding: "5px 10px", fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 5 }}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                      <button onClick={() => { onCargar(p, id); setAbierto(false); }}
                        style={{ padding: "4px 10px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                        ✎ Editar
                      </button>
                      {onVer && (
                        <button onClick={() => itemsActivos.length > 0 ? setAvisoVerId(id) : (onVer(id), setAbierto(false))}
                          style={{ padding: "4px 10px", background: "rgba(112,144,176,0.12)", border: "1px solid rgba(112,144,176,0.30)", color: "#7090b0", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                          👁 Ver
                        </button>
                      )}
                      {confirmDelId === id ? (
                      <>
                        <button onClick={() => { onEliminar(id); setConfirmDelId(null); }}
                          style={{ padding: "4px 10px", background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                          ✓ Confirmar
                        </button>
                        <button onClick={() => setConfirmDelId(null)}
                          style={{ padding: "4px 8px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDelId(id)}
                        style={{ padding: "4px 8px", background: "transparent", border: "1px solid rgba(200,60,60,0.22)", color: "#e07070", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Aviso compacto de precio desactualizado */}
                {actualizadoId === id ? (
                  <div style={{ padding: "5px 14px 8px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#7ecf8a" }}>
                      ✓ Actualizado
                    </span>
                  </div>
                ) : necesita && nuevoTotalCalc !== null ? (
                  /* Costos directos / módulos: mostrar diff de precio */
                  <div style={{ padding: "5px 14px 8px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "#c8a02a", fontFamily: "'DM Mono',monospace" }}>⚠</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                      {fmtPeso(p.total)} → <strong style={{ color: "#c8a02a" }}>{fmtPeso(Math.round(nuevoTotalCalc))}</strong>
                      <span style={{ color: diff > 0 ? "#e07070" : "#7ecf8a", marginLeft: 4 }}>
                        ({diff > 0 ? "+" : ""}{fmtPeso(diff)})
                      </span>
                    </span>
                    <button onClick={() => handleActualizar(id, p)}
                      style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a", whiteSpace: "nowrap" }}>
                      Actualizar
                    </button>
                  </div>
                ) : necesita ? (
                  /* Extras-only: costos cambiaron pero el monto es fijo — solo marcar como revisado */
                  <div style={{ padding: "5px 14px 8px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "#c8a02a", fontFamily: "'DM Mono',monospace" }}>⚠</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                      Los costos cambiaron desde que se creó este presupuesto
                    </span>
                    <button onClick={() => handleActualizar(id, p)}
                      style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a", whiteSpace: "nowrap" }}>
                      Marcar revisado
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
          )}

          {/* Pie del panel */}
          <div style={{ height: 4 }} />
        </div>
      )}
    </div>
  );
}

// ── imprimirPresupuesto ───────────────────────────────────────────
function Presupuesto({
  modulos,
  costos,
  getModUsado,
  totalGeneral,
  presupuestos,
  onGuardarPresupuesto,
  onCargarPresupuesto,
  onEliminarPresupuesto,
  onCambiarEstado,
  onActualizarPresupuesto,
  onVerPresupuesto,
  costosVersion = 0,
  presupuestoParaEditar = null,
  onPresupuestoEditarConsumed,
  onGuardarExtraFrecuente,
  setModulos,
  hSaveModulos,
  onGuardarModuloCatalogo,
  borradorRecuperado = false,
  onDismissBorrador
}) {
  // Estado del editor activo: viene del contexto en lugar de props.
  // AppInterna sigue siendo dueña del estado; aquí solo lo consumimos.
  const {
    items, setItems,
    dimOverride, setDimOverride,
    composicionOverride, setComposicionOverride,
    inlineModulos, setInlineModulos,
    adicionales, setAdicionales,
    costosDirectos, setCostosDirectos,
    presupuestoActivoId, setPresupuestoActivoId,
  } = usePresupuesto();

  // LOGICA - Edición de Presupuestos Existentes
  // Cuando llega un presupuesto desde Vista Previa vía "Editar módulos",
  // lo cargamos en el estado activo y notificamos que fue consumido
  useEffect(() => {
    if (!presupuestoParaEditar) return;
    const { id, p } = presupuestoParaEditar;
    onCargarPresupuesto(p, id);
    setClienteActivo(p.cliente || { nombre: "", tel: "", dir: "" });
    setNombreTrabajo(p.nombre || "");
    setPresupuestoActivoId(id);
    setCostosDirectos(Array.isArray(p.costosDirectos) ? [...p.costosDirectos] : []);
    onPresupuestoEditarConsumed && onPresupuestoEditarConsumed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presupuestoParaEditar]);
  const [inputCod, setInputCod] = useState("");
  const [inputCant, setInputCant] = useState(1);
  const [error, setError] = useState("");
  const [preDim, setPreDim] = useState(null);
  const [clienteActivo, setClienteActivo] = useState({ nombre: "", tel: "", dir: "" });
  const [nombreTrabajo, setNombreTrabajo] = useState("");
  const [dialogoGuardar, setDialogoGuardar] = useState(false);
  const { ToastContainer } = useUndo();
  const formRef = React.useRef(null);

  // LÓGICA - Global Sync: índice del módulo que se está editando (null = agregar nuevo)
  const [editandoModuloIdx, setEditandoModuloIdx] = useState(null);
  const [confirmDelModulo, setConfirmDelModulo] = useState(null);
  // Modal Nivel 2 de edición
  const [modalEdicion, setModalEdicion] = useState(null);
  // Drawer de composición visual por instancia
  const [modalComposicion, setModalComposicion] = useState(null); // { item, idx } | null
  // Drawer de edición de piezas/herrajes por instancia
  const [modalModulo, setModalModulo] = useState(null); // { item, modInicial } | null
  const [pestañaActiva, setPestañaActiva] = useState("modulos");
  const [mostrarExtras, setMostrarExtras] = useState(true);
  const [mostrarCostosDirectos, setMostrarCostosDirectos] = useState(true);

  // Edición inline de extras frecuentes
  const [editandoExtraId, setEditandoExtraId] = useState(null);
  const [editandoExtraForm, setEditandoExtraForm] = useState(null);
  const [toastExtraSync, setToastExtraSync] = useState(null);

  // LÓGICA - Global Sync: actualiza el módulo en su posición original sin crear uno nuevo.
  // Dispara recálculo automático en Cortes, Caja y total del presupuesto.
  const handleUpdateModule = (cod, cant, dims) => {
    const modBase = modulos[cod];
    if (!modBase) return;
    const key = items[editandoModuloIdx]?.id || items[editandoModuloIdx]?.codigo || cod;
    const nuevoItem = { ...items[editandoModuloIdx], codigo: cod, cantidad: cant };
    const nuevoItems = items.map((it, i) => i === editandoModuloIdx ? nuevoItem : it);
    const nuevoDimOverride = { ...dimOverride };
    if (dims) nuevoDimOverride[key] = dims;
    setItems(nuevoItems);
    setDimOverride(nuevoDimOverride);
    // Persistir si hay presupuesto activo — sincroniza Cortes y Caja automáticamente
    if (presupuestoActivoId) {
      const totalNuevo = nuevoItems.reduce((acc, item) => {
        const base = modulos[item.codigo]; if (!base) return acc;
        const d = nuevoDimOverride[item.id || item.codigo] || base.dimensiones;
        const calc = calcularModulo({ ...base, dimensiones: d }, costos);
        return acc + (calc ? calc.total * item.cantidad : 0);
      }, 0);
      onActualizarPresupuesto && onActualizarPresupuesto(presupuestoActivoId, {
        items: nuevoItems,
        dimOverride: nuevoDimOverride,
        total: Math.round(totalNuevo)
      });
    }
    setEditandoModuloIdx(null);
    setInputCod(""); setInputCant(1); setPreDim(null); setError("");
  };

  // Detectar presupuesto desactualizado cuando se carga uno guardado
  const [alertaPrecios, setAlertaPrecios] = useState(null); // { idPres, totalOriginal, totalRecalculado }

  // Al cargar un presupuesto verificar si los precios cambiaron
  const verificarPrecios = (p, id) => {
    if (!presupuestoTieneContenido(p)) return;
    const totalRecalculado = recalcularTotalPresupuesto(p, modulos, costos);
    if (totalRecalculado === null) return;
    const diff = Math.abs(totalRecalculado - p.total);
    if (diff > 1) {
      setAlertaPrecios({ id, totalOriginal: p.total, totalRecalculado: Math.round(totalRecalculado) });
    } else {
      setAlertaPrecios(null);
    }
  };

  const handleCargar = (p, id) => {
    onCargarPresupuesto(p, id);
    setClienteActivo(p.cliente || { nombre: "", tel: "", dir: "" });
    setNombreTrabajo(p.nombre || "");
    setPresupuestoActivoId(id || null);
    setAlertaPrecios(null);
    verificarPrecios(p, id);
  };

  const handleNuevoPresupuesto = () => {
    setItems([]);
    setClienteActivo({ nombre: "", tel: "", dir: "" });
    setNombreTrabajo("");
    setPresupuestoActivoId(null);
    setAlertaPrecios(null);
  };

  const handleCodChange = (val) => {
    const cod = val.toUpperCase();
    setInputCod(cod);
    setError("");
    if (modulos[cod]) setPreDim({ ...modulos[cod].dimensiones });
    else setPreDim(null);
  };
  const agregar = () => {
    const cod = inputCod.trim().toUpperCase();
    if (!cod) {
      setError("Ingresá un código.");
      return;
    }
    const modBase = modulos[cod];
    if (!modBase) {
      setError(`"${cod}" no encontrado.`);
      return;
    }
    const cant = parseInt(inputCant) || 1;
    const nuevoId = crypto.randomUUID();
    const isCustom =
      preDim &&
      (preDim.ancho !== modBase.dimensiones.ancho ||
        preDim.profundidad !== modBase.dimensiones.profundidad ||
        preDim.alto !== modBase.dimensiones.alto);
    if (!isCustom) {
      const idx = items.findIndex(
        (i) =>
          i.codigo === cod &&
          !dimOverride[i.id || i.codigo] &&
          (!i.nota || i.nota.trim() === "")
      );
      if (idx >= 0) {
        const n = items.map((it, i) => i === idx ? { ...it, cantidad: it.cantidad + cant } : it);
        setItems(n);
        setInputCod("");
        setInputCant(1);
        setPreDim(null);
        setError("");
        return;
      }
    }
    setItems([
      ...items,
      { id: nuevoId, codigo: cod, cantidad: cant, nota: "" },
    ]);
    if (isCustom) {
      setDimOverride((prev) => ({
        ...prev,
        [nuevoId]: {
          ancho: parseInt(preDim.ancho) || 0,
          profundidad: parseInt(preDim.profundidad) || 0,
          alto: parseInt(preDim.alto) || 0
        }
      }));
    }
    setInputCod("");
    setInputCant(1);
    setPreDim(null);
    setError("");
    // Autoscroll suave al formulario
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  // ── Helpers de limpieza y condiciones de render ───────────────────────────

  /** Limpia completamente el editor: ítems, adicionales, CDs, cliente, estado. */
  const limpiarEditor = () => {
    setItems([]); setDimOverride({}); setComposicionOverride({}); setInlineModulos({}); setAdicionales([]); setCostosDirectos([]);
    setNombreTrabajo(""); setClienteActivo({ nombre: "", tel: "", dir: "" });
    setPresupuestoActivoId(null); setAlertaPrecios(null);
    setEditandoModuloIdx(null); setInputCod(""); setPreDim(null);
    onDismissBorrador && onDismissBorrador();
  };

  /** El editor tiene contenido guardable (al menos un ítem, extra o costo directo). */
  const tieneContenidoEditor = items.length > 0 || adicionales.length > 0 || costosDirectos.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* 1. Mis presupuestos */}
      <div className="no-print">
        <GestorPresupuestos
          presupuestos={presupuestos}
          onCargar={handleCargar}
          onNuevo={handleNuevoPresupuesto}
          onEliminar={onEliminarPresupuesto}
          onCambiarEstado={onCambiarEstado}
          totalActual={totalGeneral}
          itemsActual={items}
          nombreInicial={nombreTrabajo}
          clienteInicial={clienteActivo}
          onVer={onVerPresupuesto}
          itemsActivos={items}
          costosVersion={costosVersion}
          onActualizarPresupuesto={onActualizarPresupuesto}
          modulos={modulos}
          costos={costos}
        />
      </div>

      {/* 2. Tarjeta de trabajo activo — formulario siempre visible */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.22)" }}>

        {/* Banner borrador recuperado */}
        {borradorRecuperado && (
          <div style={{ padding: "10px 20px", background: "rgba(200,160,42,0.12)", borderBottom: "1px solid rgba(200,160,42,0.25)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 12, color: "#c8a02a", fontWeight: 600 }}>
              ↩ Borrador recuperado — tenés {items.length} módulo{items.length !== 1 ? "s" : ""} sin guardar
            </span>
            <button onClick={() => onDismissBorrador && onDismissBorrador()}
              style={{ fontSize: 11, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {/* Header con nombre del trabajo */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
              {nombreTrabajo || <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontWeight: 400 }}>Nuevo presupuesto</span>}
            </div>
            {clienteActivo.nombre && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                👤 {clienteActivo.nombre}{clienteActivo.tel && ` · ${clienteActivo.tel}`}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {tieneContenidoEditor && (
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color: "#7ecf8a" }}>
                {fmtPeso(totalGeneral)}
              </span>
            )}
            {tieneContenidoEditor && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {presupuestoActivoId && (() => {
                  const pActivo = presupuestos[presupuestoActivoId];
                  const nuevoTotal = pActivo ? recalcularTotalPresupuesto(pActivo, modulos, costos) : null;
                  const necesita = nuevoTotal !== null
                    ? Math.abs(Math.round(nuevoTotal) - (pActivo?.total || 0)) > 1
                    : presupuestoNecesitaActualizacion(presupuestoActivoId, costosVersion, pActivo);
                  return necesita ? (
                    <button onClick={() => {
                      if (nuevoTotal !== null) onActualizarPresupuesto(presupuestoActivoId, { total: Math.round(nuevoTotal), costosVersionAl: Date.now() });
                    }} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a" }}>
                      ↻ Actualizar
                    </button>
                  ) : null;
                })()}
                <button onClick={() => presupuestoActivoId ? setDialogoGuardar(true) : (() => {
                  onGuardarPresupuesto(nombreTrabajo || "Sin nombre", clienteActivo, "");
                  limpiarEditor();
                })()}
                  style={{ padding: "6px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)", boxShadow: "0 2px 8px rgba(180,100,20,0.25)" }}>
                  💾 Guardar
                </button>
                <button onClick={limpiarEditor} style={{ padding: "6px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "transparent", border: "1px solid rgba(200,60,60,0.30)", color: "#e07070" }}>
                  ✕ Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Formulario cliente — siempre visible */}
        <div style={{ padding: "10px 20px", background: "var(--bg-subtle)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.8fr 1fr", gap: 10 }}>
            <TextInput label="Trabajo *" placeholder="Ej: Cocina Rodríguez" small value={nombreTrabajo} onChange={setNombreTrabajo} />
            <TextInput label="Cliente" placeholder="Nombre del cliente" small value={clienteActivo.nombre} onChange={v => setClienteActivo(c => ({ ...c, nombre: v }))} />
            <TextInput label="Teléfono" placeholder="341 555-1234" small value={clienteActivo.tel} onChange={v => setClienteActivo(c => ({ ...c, tel: v }))} />
            <TextInput label="Dirección" placeholder="Av. San Martín 456" small value={clienteActivo.dir} onChange={v => setClienteActivo(c => ({ ...c, dir: v }))} />
          </div>
        </div>
      </div>

      {/* Diálogo guardar */}
      {dialogoGuardar && (() => {
        const itemsConOverride = items.filter(item => {
          const key = item.id || item.codigo;
          const over = dimOverride?.[key];
          if (!over) return false;
          const base = modulos[item.codigo];
          if (!base) return false;
          return (over.ancho != null && over.ancho !== base.dimensiones?.ancho)
            || (over.alto != null && over.alto !== base.dimensiones?.alto)
            || (over.profundidad != null && over.profundidad !== base.dimensiones?.profundidad)
            || (over.material != null && over.material !== (base.material ?? "melamina"));
        });

        const crearVariantesYGuardar = (esNuevo) => {
          let newItems = [...items];
          let newDim = { ...dimOverride };
          for (const item of itemsConOverride) {
            const key = item.id || item.codigo;
            const over = newDim[key];
            const base = modulos[item.codigo];
            if (!base || !over) continue;
            const newMod = {
              ...base,
              dimensiones: {
                ...base.dimensiones,
                ancho: over.ancho ?? base.dimensiones?.ancho,
                alto: over.alto ?? base.dimensiones?.alto,
                profundidad: over.profundidad ?? base.dimensiones?.profundidad,
              },
              material: over.material ?? base.material,
            };
            const newId = onGuardarModuloCatalogo && onGuardarModuloCatalogo(newMod, `${base.nombre || item.codigo} (variante)`);
            if (newId) {
              newItems = newItems.map(it => (it.id || it.codigo) === key ? { ...it, codigo: newId } : it);
              delete newDim[key];
            }
          }
          setItems(newItems);
          setDimOverride(newDim);
          // composicionOverride: remove entries for items whose codigo changed to a permanent variant
          const newComp = Object.fromEntries(
            Object.entries(composicionOverride).filter(([key]) =>
              newItems.some(it => (it.id || it.codigo) === key)
            )
          );
          setComposicionOverride(newComp);
          if (esNuevo) {
            onGuardarPresupuesto(nombreTrabajo || "Sin nombre", clienteActivo, "");
          } else {
            onActualizarPresupuesto && onActualizarPresupuesto(presupuestoActivoId, { nombre: nombreTrabajo, cliente: clienteActivo, items: newItems, dimOverride: newDim, composicionOverride: newComp, inlineModulos: { ...inlineModulos }, adicionales: [...adicionales], costosDirectos: [...costosDirectos], total: totalGeneral, costosVersionAl: Date.now() });
          }
          setDialogoGuardar(false);
          limpiarEditor();
        };

        return (
          <div style={{ padding: "16px 20px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--accent-border)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>💾 ¿Cómo querés guardar?</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>"{nombreTrabajo || "Sin nombre"}"</div>
            {itemsConOverride.length > 0 && (
              <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(100,140,220,0.08)", border: "1px solid rgba(100,140,220,0.20)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
                  {itemsConOverride.length} módulo{itemsConOverride.length > 1 ? "s tienen" : " tiene"} dimensiones personalizadas
                </div>
                <button onClick={() => crearVariantesYGuardar(!presupuestoActivoId)}
                  style={{ padding: "7px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "rgba(100,140,220,0.15)", border: "1px solid rgba(100,140,220,0.35)", color: "#7090d8", width: "100%" }}>
                  📚 Crear variantes en catálogo y guardar
                </button>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => {
                onActualizarPresupuesto && onActualizarPresupuesto(presupuestoActivoId, { nombre: nombreTrabajo, cliente: clienteActivo, items: [...items], dimOverride: { ...dimOverride }, composicionOverride: { ...composicionOverride }, inlineModulos: { ...inlineModulos }, adicionales: [...adicionales], costosDirectos: [...costosDirectos], total: totalGeneral, costosVersionAl: Date.now() });
                setDialogoGuardar(false);
                limpiarEditor();
              }} style={{ padding: "8px 18px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                ✓ Actualizar original
              </button>
              <button onClick={() => {
                onGuardarPresupuesto(nombreTrabajo || "Sin nombre", clienteActivo, "");
                setDialogoGuardar(false);
                limpiarEditor();
              }}
                style={{ padding: "8px 18px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                + Guardar como copia
              </button>
              <button onClick={() => setDialogoGuardar(false)}
                style={{ padding: "8px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
            </div>
          </div>
        );
      })()}

      {/* Alerta precios */}
      {alertaPrecios && (
        <div style={{ padding: "12px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "rgba(200,160,42,0.10)", border: "1px solid rgba(200,160,42,0.30)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#c8a02a", marginBottom: 2 }}>⚠ Los precios cambiaron desde que se creó este presupuesto</div>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
              Original: {fmtPeso(alertaPrecios.totalOriginal)} → Recalculado: {fmtPeso(alertaPrecios.totalRecalculado)}
              <span style={{ marginLeft: 8, color: alertaPrecios.totalRecalculado > alertaPrecios.totalOriginal ? "#e07070" : "#7ecf8a", fontWeight: 700 }}>
                ({alertaPrecios.totalRecalculado > alertaPrecios.totalOriginal ? "+" : ""}{fmtPeso(alertaPrecios.totalRecalculado - alertaPrecios.totalOriginal)})
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setAlertaPrecios(null)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>Mantener</button>
            <button onClick={() => { if (alertaPrecios.id) onActualizarPresupuesto && onActualizarPresupuesto(alertaPrecios.id, { total: alertaPrecios.totalRecalculado }); setAlertaPrecios(null); }}
              style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a" }}>
              ✓ Actualizar precio
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          CUERPO DEL PRESUPUESTO
          Tarjeta contenedora para ítems ya agregados.
          Los formularios de carga quedan FUERA de esta card.
          ══════════════════════════════════════════════════════════ */}
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        boxShadow: "0 4px 28px rgba(0,0,0,0.30), 0 1px 4px rgba(0,0,0,0.20)",
        overflow: "hidden",
        minHeight: 120
      }}>
        {/* Header de la card */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--separator)", background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text-muted)" }}>
            Ítems del presupuesto
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {/* Desglose del contador */}
            {(items.length > 0 || adicionales.length > 0 || costosDirectos.length > 0) && (
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
                {items.length} mód.
                {adicionales.length > 0 && ` · ${adicionales.length} extra${adicionales.length !== 1 ? "s" : ""}`}
                {costosDirectos.length > 0 && ` · ${costosDirectos.length} costo${costosDirectos.length !== 1 ? "s" : ""}`}
              </span>
            )}
            {/* Toggle 👁 extras */}
            {adicionales.length > 0 && (
              <button onClick={() => setMostrarExtras(v => !v)} title={mostrarExtras ? "Ocultar extras del resumen" : "Mostrar extras en el resumen"}
                style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", padding: "2px 8px", borderRadius: 5, cursor: "pointer", border: `1px solid ${mostrarExtras ? "var(--border)" : "rgba(200,160,42,0.40)"}`, background: mostrarExtras ? "transparent" : "rgba(200,160,42,0.10)", color: mostrarExtras ? "var(--text-muted)" : "#c8a02a", transition: "all 0.15s" }}>
                {mostrarExtras ? "👁 extras" : "👁 extras"}
              </button>
            )}
            {/* Toggle 👁 costos directos */}
            {costosDirectos.length > 0 && (
              <button onClick={() => setMostrarCostosDirectos(v => !v)} title={mostrarCostosDirectos ? "Ocultar costos directos del resumen" : "Mostrar costos directos en el resumen"}
                style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", padding: "2px 8px", borderRadius: 5, cursor: "pointer", border: `1px solid ${mostrarCostosDirectos ? "var(--border)" : "rgba(200,160,42,0.40)"}`, background: mostrarCostosDirectos ? "transparent" : "rgba(200,160,42,0.10)", color: mostrarCostosDirectos ? "var(--text-muted)" : "#c8a02a", transition: "all 0.15s" }}>
                {mostrarCostosDirectos ? "👁 costos" : "👁 costos"}
              </button>
            )}
          </div>
        </div>

        {/* Estado vacío */}
        {items.length === 0 && adicionales.length === 0 && costosDirectos.length === 0 && (
          <div style={{ padding: "52px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.18 }}>◻</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 400, letterSpacing: "0.01em", lineHeight: 1.6 }}>
              Agregue ítems al presupuesto
            </p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", opacity: 0.6, marginTop: 4 }}>
              Usá los formularios de arriba para sumar módulos o gastos extras
            </p>
          </div>
        )}

        {/* Módulos cargados — mismo sistema visual que FilaModuloLista del catálogo */}
        {items.length > 0 && (
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((item, idx) => {
            const keyId = item.id || item.codigo;
            const modUsado = getModUsado(item);
            if (!modUsado) return null;
            const calc = calcularModulo(modUsado, costos);
            if (!calc) return null;
            const modBase = modulos[item.codigo];
            const over = modUsado.dimensiones;
            const dimDif = modBase && (over.ancho !== modBase.dimensiones.ancho || over.profundidad !== modBase.dimensiones.profundidad || over.alto !== modBase.dimensiones.alto);
            const estaEditando = modalEdicion?.idx === idx;
            const esTemp = !!modBase?.temporal;

            return (
              <div key={keyId} style={{
                borderRadius: 10,
                border: `1px solid ${estaEditando ? "var(--accent-border)" : "var(--border)"}`,
                background: "var(--bg-surface)",
                overflow: "hidden",
                transition: "border-color 0.15s"
              }}
                onMouseEnter={e => { if (!estaEditando) e.currentTarget.style.borderColor = "var(--accent-border)"; }}
                onMouseLeave={e => { if (!estaEditando) e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                {/* Fila principal — mismo layout que FilaModuloLista */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", flexWrap: "wrap" }}>

                  {/* Thumbnail SVG → Composición visual por instancia */}
                  <div
                    onClick={() => setModalComposicion({ item, idx })}
                    title="Modificar composición visual"
                    style={{
                      width: 48, height: 48, flexShrink: 0, cursor: "pointer",
                      border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden",
                      background: "var(--bg-subtle)", transition: "border-color 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-border)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    <VistaModuloSVG
                      modulo={modUsado}
                      vistaConfig={modUsado.vistaConfig}
                      theme="dark"
                      width={48}
                      height={48}
                      plano={true}
                    />
                  </div>

                  {/* Código */}
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>
                    {item.codigo.startsWith("TEMP_") ? "VAR" : item.codigo}
                  </span>

                  {/* Nombre + badge temp + dimensiones */}
                  <div style={{ flex: 2, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{modUsado.nombre}</span>
                      {esTemp && (
                        <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.30)", color: "#c8a02a", borderRadius: 3, padding: "1px 5px" }}>
                          ✦ var
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: dimDif ? "var(--accent)" : "var(--text-muted)", marginTop: 2 }}>
                      {over.ancho}×{over.profundidad}×{over.alto} mm
                    </div>
                  </div>

                  {/* Material + espesor — mismo Badge del catálogo */}
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <Badge>{TIPO_MAT[modUsado.material]}</Badge>
                    {calc.espesor && <Badge color="#705090">{calc.espesor}mm</Badge>}
                  </div>

                  {/* Cantidad − n + */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setItems(its => its.map((it, i) => i === idx ? { ...it, cantidad: Math.max(1, it.cantidad - 1) } : it))}
                      style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, minWidth: 18, textAlign: "center", color: "var(--accent)" }}>{item.cantidad}</span>
                    <button onClick={() => setItems(its => its.map((it, i) => i === idx ? { ...it, cantidad: it.cantidad + 1 } : it))}
                      style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>

                  {/* Precio — mismo estilo que catálogo */}
                  <div style={{ display: "flex", gap: 16, flexShrink: 0, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
                    <span style={{ color: "#9ab080" }}>{fmtNum(calc.m2Neto)} m²</span>
                    <span style={{ color: "#7ecf8a", fontWeight: 700 }}>{fmtPeso(calc.total * item.cantidad)}</span>
                  </div>

                  {/* Acciones: ✎ y × */}
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        if (estaEditando) {
                          // LEGACY COMPAT: revertir TEMP (cierra sin aplicar)
                          if (modalEdicion?.tempCod && modalEdicion?.origenCodigo) {
                            const nuevosModulos = { ...modulos };
                            delete nuevosModulos[modalEdicion.tempCod];
                            setModulos && setModulos(nuevosModulos);
                            hSaveModulos && hSaveModulos(nuevosModulos);
                            setItems(its => its.map((it, i) =>
                              i === idx ? { ...it, codigo: modalEdicion.origenCodigo } : it
                            ));
                          } else if (modalEdicion) {
                            // Aplicar dims/material al cerrar el acordeón con ▲
                            const esTemp = modalEdicion.item.codigo.startsWith("TEMP_");
                            if (esTemp) {
                              const tempCod = modalEdicion.item.codigo;
                              const nuevosModulos = { ...modulos, [tempCod]: { ...modulos[tempCod], dimensiones: modalEdicion.dims, material: modalEdicion.material } };
                              setModulos && setModulos(nuevosModulos);
                              hSaveModulos && hSaveModulos(nuevosModulos);
                            } else {
                              const keyId = modalEdicion.item.id || modalEdicion.item.codigo;
                              const base = modulos[modalEdicion.origenCodigo];
                              const bd = base?.dimensiones || {};
                              const difiere = modalEdicion.dims.ancho !== bd.ancho || modalEdicion.dims.profundidad !== bd.profundidad || modalEdicion.dims.alto !== bd.alto || modalEdicion.material !== (base?.material ?? "melamina");
                              const nuevoOverride = { ...dimOverride };
                              if (difiere) nuevoOverride[keyId] = { ...modalEdicion.dims, material: modalEdicion.material };
                              else delete nuevoOverride[keyId];
                              setDimOverride(nuevoOverride);
                            }
                          }
                          setModalEdicion(null);
                          return;
                        }
                        const modOrig = modulos[item.codigo];
                        if (modOrig?.temporal) {
                          // ítem ya tiene TEMP de edición Nivel 3 — abrir con dims actuales del TEMP
                          setModalEdicion({
                            item, idx, modBase: modOrig,
                            dims: { ...modOrig.dimensiones },
                            material: modOrig.material || "melamina",
                            cantidad: item.cantidad,
                            origenCodigo: modOrig.origenCodigo || item.codigo
                          });
                          return;
                        }
                        // ítem normal: abrir con dims del dimOverride actual (o base si no hay override)
                        const keyIdEdit = item.id || item.codigo;
                        const overEdit = dimOverride?.[keyIdEdit] || {};
                        setModalEdicion({
                          item, idx, modBase: modOrig,
                          dims: {
                            ancho:       overEdit.ancho       ?? modOrig?.dimensiones.ancho,
                            profundidad: overEdit.profundidad ?? modOrig?.dimensiones.profundidad,
                            alto:        overEdit.alto        ?? modOrig?.dimensiones.alto,
                          },
                          material: overEdit.material ?? modOrig?.material ?? "melamina",
                          cantidad: item.cantidad,
                          origenCodigo: item.codigo
                        });
                      }}
                      style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${estaEditando ? "var(--accent-border)" : "var(--border)"}`, background: estaEditando ? "var(--accent-soft)" : "transparent", color: estaEditando ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, transition: "all 0.15s" }}>
                      {estaEditando ? "▲" : "✎"}
                    </button>
                    {confirmDelModulo === keyId ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => { setItems(its => its.filter((_, i) => i !== idx)); if (estaEditando) setModalEdicion(null); setConfirmDelModulo(null); }}
                          style={{ padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070", fontFamily: "'DM Mono',monospace" }}>✓</button>
                        <button onClick={() => setConfirmDelModulo(null)}
                          style={{ padding: "4px 7px", borderRadius: 5, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelModulo(keyId)}
                        style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid rgba(200,60,60,0.22)", background: "transparent", color: "#e07070", cursor: "pointer", fontSize: 11, transition: "all 0.15s" }}>×</button>
                    )}
                  </div>
                </div>

                {/* Acordeón de edición por instancia */}
                {estaEditando && modalEdicion && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 14px 12px", background: "rgba(0,0,0,0.10)" }}>

                    {/* Badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{
                        fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.08em", borderRadius: 4, padding: "1px 6px",
                        background: modalEdicion.item?.codigo?.startsWith("TEMP_") ? "var(--accent-soft)" : "rgba(120,180,100,0.12)",
                        border: `1px solid ${modalEdicion.item?.codigo?.startsWith("TEMP_") ? "var(--accent-border)" : "rgba(120,180,100,0.35)"}`,
                        color: modalEdicion.item?.codigo?.startsWith("TEMP_") ? "var(--accent)" : "#7ecf8a",
                      }}>
                        {modalEdicion.item?.codigo?.startsWith("TEMP_") ? "VARIANTE" : "SOLO PRESUPUESTO"}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                        {modalEdicion.item?.codigo?.startsWith("TEMP_") ? "módulo temporal" : "catálogo sin cambios · ▲ aplica"}
                      </span>
                    </div>

                    {/* Dims + Material compactos */}
                    <div style={{ display: "flex", gap: 5, alignItems: "flex-end", marginBottom: 8 }}>
                      {[["A", "ancho"], ["P", "profundidad"], ["H", "alto"]].map(([label, key]) => (
                        <div key={key} style={{ flex: 1 }}>
                          <div style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center", marginBottom: 3, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                          <input type="number" min="1"
                            value={modalEdicion.dims[key]}
                            onChange={e => setModalEdicion(m => ({ ...m, dims: { ...m.dims, [key]: parseInt(e.target.value) || 0 } }))}
                            style={{ width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, padding: "5px 4px", textAlign: "center", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none" }}
                            onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                            onBlur={e => e.target.style.borderColor = "var(--border)"} />
                        </div>
                      ))}
                      <div style={{ flex: 1.8 }}>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 3, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>Mat.</div>
                        <select value={modalEdicion.material}
                          onChange={e => setModalEdicion(m => ({ ...m, material: e.target.value }))}
                          style={{ width: "100%", padding: "5px 3px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontFamily: "'DM Mono',monospace", fontSize: 10, outline: "none" }}>
                          {Object.entries(TIPO_MAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Acciones compactas */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => {
                          const modInicial = getModUsado(item) || modulos[item.codigo];
                          if (!modInicial) return;
                          setModalModulo({ item, modInicial });
                        }}
                        style={{ flex: 1, padding: "5px 0", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 700, background: "transparent", border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
                        ✏ Piezas/herrajes
                      </button>
                      <button onClick={() => setModalEdicion(null)}
                        style={{ padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 10, background: "transparent", border: "1px solid rgba(200,60,60,0.22)", color: "#e07070" }}>
                        Cancelar
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}

        {/* Adicionales — mismo sistema visual que módulos */}
        {adicionales.length > 0 && (
          <div style={{ padding: "0 12px 10px", opacity: mostrarExtras ? 1 : 0.45, transition: "opacity 0.2s" }}>
            {items.length > 0 && <div style={{ height: 1, background: "var(--separator)", margin: "0 0 6px", opacity: 0.4 }} />}
            {adicionales.map(x => {
              const editandoEste = editandoExtraId === x.id;
              const esFrecuente = (costos?.extrasFrecuentes || []).some(f => f.nombre.toLowerCase() === x.nombre.toLowerCase());
              return (
                <div key={x.id} style={{
                  borderRadius: 10, border: `1px solid ${editandoEste ? "var(--accent-border)" : "var(--border)"}`,
                  background: "var(--bg-surface)", overflow: "hidden", marginBottom: 6, transition: "border-color 0.15s"
                }}
                  onMouseEnter={e => { if (!editandoEste) e.currentTarget.style.borderColor = "var(--accent-border)"; }}
                  onMouseLeave={e => { if (!editandoEste) e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  {/* Fila principal — mismo layout que módulos */}
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", alignItems: "center", gap: 14, padding: "10px 14px" }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "#c8a02a", flexShrink: 0 }}>
                      Extra
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.nombre}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "#7ecf8a", whiteSpace: "nowrap" }}>{fmtPeso(x.monto)}</span>
                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                      <button onClick={() => {
                        if (editandoEste) { setEditandoExtraId(null); setEditandoExtraForm(null); }
                        else { setEditandoExtraId(x.id); setEditandoExtraForm({ nombre: x.nombre, monto: String(x.monto) }); }
                      }} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${editandoEste ? "var(--accent-border)" : "var(--border)"}`, background: editandoEste ? "var(--accent-soft)" : "transparent", color: editandoEste ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                        {editandoEste ? "▲" : "✎"}
                      </button>
                      {confirmDelModulo === `extra-${x.id}` ? (
                        <>
                          <button onClick={() => { setAdicionales(prev => prev.filter(a => a.id !== x.id)); setConfirmDelModulo(null); if (editandoEste) { setEditandoExtraId(null); setEditandoExtraForm(null); } }}
                            style={{ padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070", fontFamily: "'DM Mono',monospace" }}>✓</button>
                          <button onClick={() => setConfirmDelModulo(null)}
                            style={{ padding: "4px 7px", borderRadius: 5, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelModulo(`extra-${x.id}`)}
                          style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid rgba(200,60,60,0.22)", background: "transparent", color: "#e07070", cursor: "pointer", fontSize: 11 }}>×</button>
                      )}
                    </div>
                  </div>
                  {/* Acordeón edición — inline */}
                  {editandoEste && editandoExtraForm && (
                    <div style={{ padding: "8px 4px 10px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                      <input type="text" value={editandoExtraForm.nombre}
                        onChange={e => setEditandoExtraForm(f => ({ ...f, nombre: e.target.value }))}
                        style={{ flex: 1, minWidth: 120, fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 12, padding: "6px 10px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-primary)", outline: "none" }}
                        onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                        onBlur={e => e.target.style.borderColor = "var(--border)"} />
                      <input type="number" min="0" value={editandoExtraForm.monto}
                        onChange={e => setEditandoExtraForm(f => ({ ...f, monto: e.target.value }))}
                        style={{ width: 100, fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, padding: "6px 10px", textAlign: "right", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "#7ecf8a", outline: "none" }}
                        onFocus={e => e.target.style.borderColor = "#7ecf8a"}
                        onBlur={e => e.target.style.borderColor = "var(--border)"} />
                      <button onClick={() => {
                        const nuevoNombre = editandoExtraForm.nombre.trim();
                        const nuevoMonto = parseFloat(editandoExtraForm.monto) || 0;
                        setAdicionales(prev => prev.map(a => a.id === x.id ? { ...a, nombre: nuevoNombre, monto: nuevoMonto } : a));
                        if (esFrecuente && nuevoNombre !== x.nombre) {
                          setToastExtraSync({ viejo: x.nombre, nuevo: nuevoNombre, monto: nuevoMonto, id: x.id });
                        } else if (esFrecuente) {
                          onGuardarExtraFrecuente && onGuardarExtraFrecuente({ nombre: nuevoNombre, precio: nuevoMonto, actualizar: x.nombre });
                        }
                        setEditandoExtraId(null); setEditandoExtraForm(null);
                      }} style={{ padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)" }}>
                        ✓
                      </button>
                      <button onClick={() => { setEditandoExtraId(null); setEditandoExtraForm(null); }}
                        style={{ padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontSize: 11, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                    </div>
                  )}
                  {toastExtraSync?.id === x.id && (
                    <div style={{ margin: "0 4px 8px", padding: "8px 12px", borderRadius: 7, background: "rgba(200,160,42,0.10)", border: "1px solid rgba(200,160,42,0.25)", fontSize: 11, color: "#c8a02a" }}>
                      <div style={{ marginBottom: 6 }}>💡 ¿Actualizar "{x.nombre}" en tus recurrentes de Costos?</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { onGuardarExtraFrecuente && onGuardarExtraFrecuente({ nombre: toastExtraSync.nuevo, precio: toastExtraSync.monto, actualizar: toastExtraSync.viejo }); setToastExtraSync(null); }}
                          style={{ padding: "3px 10px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, background: "rgba(200,160,42,0.18)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a", fontFamily: "'DM Mono',monospace" }}>Actualizar</button>
                        <button onClick={() => setToastExtraSync(null)}
                          style={{ padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>No</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Costos directos — mismo sistema visual que módulos */}
        {costosDirectos.length > 0 && (
          <div style={{ padding: `0 12px 10px`, opacity: mostrarCostosDirectos ? 1 : 0.45, transition: "opacity 0.2s" }}>
            {(items.length > 0 || adicionales.length > 0) && <div style={{ height: 1, background: "var(--separator)", margin: "0 0 6px", opacity: 0.4 }} />}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {costosDirectos.map(x => {
              const COLOR = { mo: "#9b7fd4", material: "#7090c0", herraje: "#c0906a", tapacanto: "#6aab8e" };
              const LABEL = { mo: "Mano de obra", material: "Material", herraje: "Herraje", tapacanto: "Tapacanto" };
              return (
                <div key={x.id} style={{
                  borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-surface)", overflow: "hidden", transition: "border-color 0.15s"
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", alignItems: "center", gap: 14, padding: "10px 14px" }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: COLOR[x.tipo], flexShrink: 0 }}>
                      {LABEL[x.tipo]}
                    </span>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{x.nombre}</span>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {x.cantidad} {x.unidad}
                      </div>
                    </div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "#7ecf8a", whiteSpace: "nowrap" }}>{fmtPeso(x.subtotal)}</span>
                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                      {confirmDelModulo === `cd-${x.id}` ? (
                        <>
                          <button onClick={() => { setCostosDirectos(prev => prev.filter(a => a.id !== x.id)); setConfirmDelModulo(null); }}
                            style={{ padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070", fontFamily: "'DM Mono',monospace" }}>✓</button>
                          <button onClick={() => setConfirmDelModulo(null)}
                            style={{ padding: "4px 7px", borderRadius: 5, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelModulo(`cd-${x.id}`)}
                          style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid rgba(200,60,60,0.22)", background: "transparent", color: "#e07070", cursor: "pointer", fontSize: 11 }}>×</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
        {(items.length > 0 || adicionales.length > 0 || costosDirectos.length > 0) && (
          <div style={{ borderTop: "1px solid var(--separator)", marginTop: 4 }}>
            <BarraTotal
              items={items}
              modulos={modulos}
              costos={costos}
              getModUsado={getModUsado}
              totalGeneral={totalGeneral}
              nombrePresupuesto={nombreTrabajo}
              descuento={presupuestoActivoId ? (presupuestos[presupuestoActivoId]?.descuento || 0) : 0}
              gananciaExtra={presupuestoActivoId ? (presupuestos[presupuestoActivoId]?.gananciaExtra || 0) : 0}
              adicionales={adicionales}
              costosDirectos={costosDirectos}
              mostrarExtras={mostrarExtras}
              mostrarCostosDirectos={mostrarCostosDirectos}
            />
          </div>
        )}
      </div>{/* fin card Cuerpo del Presupuesto */}

      {/* Bloqueo visual si no hay nombre Y no hay ítems cargados */}
      {!nombreTrabajo.trim() && items.length === 0 && adicionales.length === 0 && costosDirectos.length === 0 && (
        <div style={{
          padding: "18px 20px", borderRadius: 12,
          background: "var(--bg-surface)", border: "1px dashed var(--border)",
          textAlign: "center", color: "var(--text-muted)"
        }}>
          <div style={{ fontSize: 13, fontStyle: "italic" }}>
            Completá el nombre del trabajo para agregar módulos y gastos
          </div>
        </div>
      )}

      {/* ══ Card unificada de carga — 3 pestañas ══ */}
      {(nombreTrabajo.trim() || items.length > 0 || adicionales.length > 0 || costosDirectos.length > 0) && (<>

      <div ref={formRef} style={{
        background: "var(--bg-surface)",
        border: editandoModuloIdx !== null ? "1.5px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "0 4px 24px rgba(0,0,0,0.28)",
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s"
      }}>

        {/* ── Barra de pestañas ── */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-subtle)",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none"
        }}>
          {[
            { id: "modulos",  label: "📦 Módulos"        },
            { id: "costos",   label: "🔩 Costos directos" },
            { id: "extras",   label: "🧾 Extras"          },
          ].map(tab => (
            <button key={tab.id} onClick={() => setPestañaActiva(tab.id)}
              style={{
                flexShrink: 0,
                padding: "11px 18px",
                border: "none",
                borderBottom: pestañaActiva === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                background: "transparent",
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "'DM Mono',monospace",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: pestañaActiva === tab.id ? "var(--accent)" : "var(--text-muted)",
                transition: "color 0.15s, border-color 0.15s",
                whiteSpace: "nowrap"
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Contenidos de pestañas — grid para mantener altura estable ── */}
        {/* Todos los paneles apilados en la misma celda; el más alto fija la altura del card */}
        <div style={{ display: "grid" }}>

        {/* Módulos */}
        <div style={{ gridArea: "1/1", padding: "16px 20px", visibility: pestañaActiva === "modulos" ? "visible" : "hidden", pointerEvents: pestañaActiva === "modulos" ? "auto" : "none" }}>
            {/* Indicador de modo edición */}
            {editandoModuloIdx !== null && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "7px 12px", background: "var(--accent-soft)", borderRadius: 7, border: "1px solid var(--accent-border)" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", fontFamily: "'DM Mono',monospace" }}>
                  ✎ Editando módulo #{editandoModuloIdx + 1} — {inputCod}
                </span>
                <button onClick={() => { setEditandoModuloIdx(null); setInputCod(""); setInputCant(1); setPreDim(null); setError(""); }}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
                  ✕ Cancelar edición
                </button>
              </div>
            )}
            <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 100px auto", gap: 12, alignItems: "end" }}>
              <div>
                <TextInput label="Código de módulo" placeholder="MC001" value={inputCod} onChange={handleCodChange} />
                {error && <p style={{ color: "#e07070", fontSize: 12, marginTop: 5 }}>⚠ {error}</p>}
              </div>
              <TextInput label="Cantidad" type="number" value={inputCant} onChange={setInputCant} />
              <div>
                {editandoModuloIdx !== null
                  ? <Btn onClick={() => handleUpdateModule(inputCod, parseInt(inputCant) || 1, preDim)}>Actualizar</Btn>
                  : <Btn onClick={agregar}>Agregar</Btn>
                }
              </div>
            </div>
            {preDim && (
              <div style={{ marginTop: 14, padding: 14, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 10 }}>
                  ✎ Dimensiones para {inputCod} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(editables antes de agregar)</span>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {["ancho", "profundidad", "alto"].map(dim => (
                    <div key={dim} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{dim}</label>
                      <input type="number" value={preDim[dim]} onChange={e => setPreDim(p => ({ ...p, [dim]: parseInt(e.target.value) || 0 }))}
                        style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, padding: "6px 10px", background: "var(--bg-base)", border: "1px solid var(--accent-border)", color: "var(--text-primary)", borderRadius: 6, outline: "none", width: 90 }} />
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>mm</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <PanelSelectorModulos modulos={modulos} onSeleccionar={cod => handleCodChange(cod)} />
        </div>

        {/* Costos directos */}
        <div style={{ gridArea: "1/1", visibility: pestañaActiva === "costos" ? "visible" : "hidden", pointerEvents: pestañaActiva === "costos" ? "auto" : "none" }}>
          <SeccionCostosDirectos
            costosDirectos={costosDirectos}
            setCostosDirectos={setCostosDirectos}
            costos={costos}
            sinCard
          />
        </div>

        {/* Extras */}
        <div style={{ gridArea: "1/1", visibility: pestañaActiva === "extras" ? "visible" : "hidden", pointerEvents: pestañaActiva === "extras" ? "auto" : "none" }}>
          <SeccionAdicionales
            adicionales={adicionales}
            setAdicionales={setAdicionales}
            costos={costos}
            onGuardarFrecuente={onGuardarExtraFrecuente}
            sinCard
          />
        </div>

        </div>{/* fin grid */}

      </div>
      </>)}{/* fin secciones de carga */}

      <ToastContainer />

      {/* ── Drawer de edición de piezas/herrajes ─────────────────── */}
      {modalModulo && (() => {
        const { item, modInicial } = modalModulo;
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1100,
            display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
          }}
            onClick={() => setModalModulo(null)}
          >
            <div style={{
              width: "min(380px, 100vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px 0 0 16px",
              padding: 20,
              boxShadow: "-6px 0 32px rgba(0,0,0,0.40)",
              animation: "slideInRight 0.2s ease",
            }}
              onClick={e => e.stopPropagation()}
            >
              <PiezasEditor
                modulo={modInicial}
                costos={costos}
                onGuardar={(moduloModificado) => {
                  const keyId = item.id || item.codigo;
                  setInlineModulos(prev => ({ ...prev, [keyId]: moduloModificado }));
                  setDimOverride(prev => { const n = { ...prev }; delete n[keyId]; return n; });
                  setComposicionOverride(prev => { const n = { ...prev }; delete n[keyId]; return n; });
                  setModalModulo(null);
                }}
                onCancelar={() => setModalModulo(null)}
              />
            </div>
          </div>
        );
      })()}

      {/* ── Drawer de composición visual ──────────────────────────── */}
      {modalComposicion && (() => {
        const { item } = modalComposicion;
        const modBase = modulos[item.codigo];
        const vistaConfigInicial = composicionOverride[item.id]?.vistaConfig ?? modBase?.vistaConfig ?? null;
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1100,
            display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
          }}
            onClick={() => setModalComposicion(null)}
          >
            <div style={{
              width: "min(360px, 100vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px 0 0 16px",
              padding: 20,
              boxShadow: "-6px 0 32px rgba(0,0,0,0.40)",
              animation: "slideInRight 0.2s ease",
            }}
              onClick={e => e.stopPropagation()}
            >
              <ComposicionEditor
                modBase={modBase}
                vistaConfigInicial={vistaConfigInicial}
                onGuardar={(vistaConfig) => {
                  setComposicionOverride(prev => ({ ...prev, [item.id]: { vistaConfig } }));
                  setModalComposicion(null);
                }}
                onCancelar={() => setModalComposicion(null)}
              />
            </div>
          </div>
        );
      })()}

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 10. VISTA PREVIA
// ══════════════════════════════════════════════════════════════════
// ── VistaPrevia ───────────────────────────────────────────────────

export { Presupuesto, GestorPresupuestos, ResumenPresupuesto,
          BarraTotal, SeccionCostosDirectos, SeccionAdicionales,
          imprimirPresupuesto, generarFichaObra };
