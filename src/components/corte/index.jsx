import React, { useState, useRef, useEffect } from 'react';
import { Card, Badge, SectionTitle } from '../ui/index.jsx';
import { fmtNum, fmtPeso, resolverDim, evaluarFormula, recalcularTotalPresupuesto } from '../../utils.js';
import { resolverContextoModulo, generarPiezas } from '../../services/moduloService.js';
import { OptimizerButton } from './OptimizerButton.jsx';
import * as optimizerService from '../../services/optimizerService.js';
import { ResumenOptimizado } from './ResumenOptimizado.jsx';
import { VisualizadorPlaca } from './VisualizadorPlaca.jsx';
import { BancoSobrantes } from './BancoSobrantes.jsx';

function imprimirCorte(grupos, nombre) {
  const fecha = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  let seccionesHtml = "";
  Object.entries(grupos).forEach(([nombreMat, datos]) => {
    const areaPlacaM2 = (datos.placaLargo * datos.placaAncho) / 1_000_000;
    const areaConDesp = datos.areaNetaM2 * 1.2;
    const placasNec = Math.ceil(areaConDesp / areaPlacaM2);
    seccionesHtml += `<div style="background:#fff8ee;border:1px solid #c8a060;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:16px;"><div style="flex:1"><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#9a7040;margin-bottom:4px">Resumen de compra · ${nombreMat}</div><div style="font-size:12px;color:#5a3a10">Área neta: <b>${fmtNum(
      datos.areaNetaM2
    )} m²</b> · +20%: <b>${fmtNum(areaConDesp)} m²</b> · Placa: <b>${
      datos.placaLargo
    }×${
      datos.placaAncho
    }mm</b></div></div><div style="text-align:center;background:#a07030;color:#fff;border-radius:8px;padding:8px 18px;"><div style="font-size:28px;font-weight:900;line-height:1">${placasNec}</div><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px">placa${
      placasNec !== 1 ? "s" : ""
    }</div></div></div><table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><thead><tr style="background:#e8dcc8"><td colspan="5" style="padding:8px 16px;font-weight:700;font-size:14px;color:#5a3a10;text-transform:uppercase;letter-spacing:0.1em;border-bottom:2px solid #c8a060;">🪵 ${nombreMat} (${
      datos.piezas.length
    } cortes)</td></tr><tr style="background:#f5ede0"><th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:left;border-bottom:2px solid #c8a060">Módulo</th><th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:left;border-bottom:2px solid #c8a060">Pieza</th><th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:right;border-bottom:2px solid #c8a060">Cant.</th><th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:center;border-bottom:2px solid #c8a060">Medidas Reales</th><th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:left;border-bottom:2px solid #c8a060">Tapacanto</th></tr></thead><tbody>${datos.piezas
      .map(
        (pz) =>
          `<tr><td style="padding:10px 16px;border-bottom:1px solid #e8dcc8;font-size:12px;color:#1a0e04;"><span style="font-family:monospace;font-weight:700;color:#8a5a1a;margin-right:6px;">${pz.codigo}</span>${pz.modulo}</td><td style="padding:10px 16px;border-bottom:1px solid #e8dcc8;font-size:12px;font-weight:700;color:#1a0e04;">${pz.piezaNombre}</td><td style="padding:10px 16px;border-bottom:1px solid #e8dcc8;text-align:right;font-family:monospace;font-size:15px;font-weight:700;color:#8a5a1a;">${pz.cantidad}</td><td style="padding:10px 16px;border-bottom:1px solid #e8dcc8;text-align:center;font-family:monospace;font-size:14px;font-weight:700;color:#1a6a30;">${pz.d1} × ${pz.d2} mm</td><td style="padding:10px 16px;border-bottom:1px solid #e8dcc8;font-size:10px;color:#6a5040;">${pz.tcNombre} <span style="font-family:monospace;">${pz.tcLados}</span></td></tr>`
      )
      .join("")}</tbody></table>`;
  });
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Lista de Corte — ${
    nombre || "Trabajo"
  }</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a0e04;padding:32px 40px;max-width:960px;margin:0 auto}@media print{body{padding:16px 20px}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #a07030"><div><div style="font-size:22px;font-weight:900;color:#7a4a10;letter-spacing:-0.5px">CarpiCálc</div><div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;color:#888">Lista de Corte para Taller</div></div><div style="text-align:right">${
    nombre
      ? `<div style="font-size:15px;font-weight:700;color:#1a0e04">${nombre}</div>`
      : ""
  }<div style="font-size:11px;color:#666;margin-top:4px">${fecha}</div></div></div>${seccionesHtml}<script>window.onload=()=>window.print();</script></body></html>`;
  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  } else
    alert(
      "El navegador bloqueó la ventana emergente. Habilitá los popups para este sitio e intentá de nuevo."
    );
}

function imprimirListaCompras(grupos, nombre) {
  const fecha = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const hayPrecios = Object.values(grupos).some(d => d.precioPlaca > 0);
  let totalCosto = 0;
  const filas = Object.entries(grupos).map(([nombreMat, datos]) => {
    const areaPlacaM2 = (datos.placaLargo * datos.placaAncho) / 1_000_000;
    const areaConDesp = datos.areaNetaM2 * 1.2;
    const placasNec = Math.ceil(areaConDesp / areaPlacaM2);
    const costo = datos.precioPlaca > 0 ? datos.precioPlaca * placasNec : 0;
    totalCosto += costo;
    const costoStr = costo > 0 ? `$ ${Math.round(costo).toLocaleString("es-AR")}` : "—";
    return `<tr>
      <td style="padding:14px 18px;border-bottom:1px solid #e8dcc8;font-size:14px;font-weight:700;color:#1a0e04">${nombreMat}</td>
      <td style="padding:14px 18px;border-bottom:1px solid #e8dcc8;font-family:monospace;font-size:12px;color:#6a5040;white-space:nowrap">${datos.placaLargo}x${datos.placaAncho}mm</td>
      <td style="padding:14px 18px;border-bottom:1px solid #e8dcc8;text-align:center;font-size:26px;font-weight:900;color:#8a5a1a;line-height:1.1">${placasNec}<div style="font-size:9px;font-weight:400;text-transform:uppercase;letter-spacing:0.1em;color:#9a7040;margin-top:2px">placa${placasNec !== 1 ? "s" : ""}</div></td>
      <td style="padding:14px 18px;border-bottom:1px solid #e8dcc8;font-family:monospace;font-size:12px;color:#6a5040">${fmtNum(datos.areaNetaM2)} m2</td>
      ${hayPrecios ? `<td style="padding:14px 18px;border-bottom:1px solid #e8dcc8;font-family:monospace;font-size:14px;font-weight:700;color:#2a5a20;text-align:right">${costoStr}</td>` : ""}
    </tr>`;
  }).join("");
  const thCosto = hayPrecios ? `<th style="padding:10px 18px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;color:#9a7040;border-bottom:2px solid #c8a060">Precio est.</th>` : "";
  const totalRow = hayPrecios && totalCosto > 0
    ? `<tr style="background:#f0e8d0"><td colspan="4" style="padding:12px 18px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#5a3a10">Total estimado de materiales</td><td style="padding:12px 18px;font-family:monospace;font-size:16px;font-weight:900;color:#2a5a20;text-align:right">$ ${Math.round(totalCosto).toLocaleString("es-AR")}</td></tr>`
    : "";
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Lista de Compras${nombre ? " — " + nombre : ""}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a0e04;padding:32px 40px;max-width:800px;margin:0 auto}@media print{body{padding:16px 20px}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #a07030"><div><div style="font-size:22px;font-weight:900;color:#7a4a10;letter-spacing:-0.5px">CarpiCalc</div><div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;color:#888">Lista de Compras · Materiales</div></div><div style="text-align:right">${nombre ? `<div style="font-size:15px;font-weight:700;color:#1a0e04">${nombre}</div>` : ""}<div style="font-size:11px;color:#666;margin-top:4px">${fecha}</div></div></div><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#e8dcc8"><th style="padding:10px 18px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;color:#9a7040;border-bottom:2px solid #c8a060">Material</th><th style="padding:10px 18px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;color:#9a7040;border-bottom:2px solid #c8a060">Medida placa</th><th style="padding:10px 18px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;color:#9a7040;border-bottom:2px solid #c8a060">Cantidad</th><th style="padding:10px 18px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;color:#9a7040;border-bottom:2px solid #c8a060">Area neta</th>${thCosto}</tr></thead><tbody>${filas}${totalRow}</tbody></table><script>window.onload=()=>window.print();</script></body></html>`;
  const win = window.open("", "_blank", "width=700,height=500");
  if (win) { win.document.write(html); win.document.close(); }
  else alert("El navegador bloqueo la ventana emergente. Habilita los popups para este sitio e intenta de nuevo.");
}

// ── Helpers agrupado y export distribuidora ──────────────────────────────────
function parseTcLados(tcLados) {
  if (!tcLados || tcLados === '-') return { d1: 0, d2: 0 };
  const m = tcLados.match(/D1:(\d+)[^D]*D2:(\d+)/);
  return m ? { d1: parseInt(m[1]), d2: parseInt(m[2]) } : { d1: 0, d2: 0 };
}

function agruparPiezasPorMedida(piezas) {
  const mapa = new Map();
  piezas.forEach(pz => {
    const key = `${pz.d1}_${pz.d2}`;
    if (!mapa.has(key)) mapa.set(key, { d1: pz.d1, d2: pz.d2, cantTotal: 0, subPiezas: [] });
    const g = mapa.get(key);
    g.cantTotal += pz.cantidad;
    const existing = g.subPiezas.find(s => s.piezaNombre === pz.piezaNombre && s.tcNombre === pz.tcNombre);
    if (existing) existing.cantidad += pz.cantidad;
    else g.subPiezas.push({ ...pz });
  });
  return [...mapa.values()];
}

function exportarDistribuidora(grupos, nombre) {
  const filas = [['cant','base','altura','detalle','rota','canto_arr','canto_aba','canto_izq','canto_der'].join('\t')];
  Object.entries(grupos).forEach(([, datos]) => {
    datos.piezas.forEach(pz => {
      const tc = parseTcLados(pz.tcLados);
      const sinTC = pz.tcNombre === 'Sin tapacanto';
      const [cArr, cAba] = sinTC ? [0,0] : tc.d1 >= 2 ? [1,1] : tc.d1 === 1 ? [1,0] : [0,0];
      const [cIzq, cDer] = sinTC ? [0,0] : tc.d2 >= 2 ? [1,1] : tc.d2 === 1 ? [1,0] : [0,0];
      filas.push([pz.cantidad, pz.d1, pz.d2, `${pz.modulo} - ${pz.piezaNombre}`, 1, cArr, cAba, cIzq, cDer].join('\t'));
    });
  });
  const blob = new Blob([filas.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cortes${nombre ? '-' + nombre.replace(/[^a-z0-9]/gi,'_') : ''}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportarExcel(grupos, nombre) {
  const bom = '﻿';
  const filas = [['Material','Módulo','Pieza','Cant.','Largo (mm)','Ancho (mm)','Tapacanto'].join(',')];
  Object.entries(grupos).forEach(([nombreMat, datos]) => {
    datos.piezas.forEach(pz => {
      filas.push([`"${nombreMat}"`,`"${pz.modulo}"`,`"${pz.piezaNombre}"`,pz.cantidad,pz.d1,pz.d2,`"${pz.tcNombre}"`].join(','));
    });
  });
  const blob = new Blob([bom + filas.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cortes${nombre ? '-' + nombre.replace(/[^a-z0-9]/gi,'_') : ''}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Estilos de tabla
const thStyle = {
  padding: "6px 10px", textAlign: "left", fontSize: 10,
  fontFamily: "'DM Mono',monospace", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.08em",
  color: "var(--text-muted)", borderBottom: "1px solid var(--border)"
};
const tdStyle = {
  padding: "5px 10px", fontSize: 12, verticalAlign: "middle",
  borderBottom: "1px solid var(--separator)"
};

function ResumenCompra({ nombreMat, placaLargo, placaAncho, areaNetaM2, precioPlaca }) {
  const areaPlacaM2 = (placaLargo * placaAncho) / 1_000_000;
  const areaConDesp = areaNetaM2 * 1.2;
  const placasNec = Math.ceil(areaConDesp / areaPlacaM2);
  const pct = ((areaNetaM2 / (placasNec * areaPlacaM2)) * 100).toFixed(1);
  const costoEstimado = precioPlaca > 0 ? placasNec * precioPlaca : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 20px",
        marginBottom: 16,
        background: "rgba(200,128,42,0.06)",
        border: "1px solid var(--accent-border)",
        borderRadius: 10,
        flexWrap: "wrap"
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 28 }}>🛒</div>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 700,
            color: "var(--text-muted)",
            marginBottom: 4
          }}
        >
          Resumen de compra
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Área neta:{" "}
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              color: "var(--text-primary)"
            }}
          >
            {fmtNum(areaNetaM2)} m²
          </span>
          <span style={{ margin: "0 6px", color: "var(--text-muted)" }}>·</span>
          +20%:{" "}
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              color: "var(--text-primary)"
            }}
          >
            {fmtNum(areaConDesp)} m²
          </span>
          <span style={{ margin: "0 6px", color: "var(--text-muted)" }}>·</span>
          Placa:{" "}
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              color: "var(--text-primary)"
            }}
          >
            {placaLargo}×{placaAncho}mm
          </span>
        </div>
        <div style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}>
          Aprovechamiento estimado: {pct}%
          {costoEstimado !== null && (
            <span style={{ marginLeft: 12 }}>
              · Costo aprox.:{" "}
              <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--text-primary)" }}>
                {fmtPeso(Math.round(costoEstimado))}
              </span>
            </span>
          )}
        </div>
      </div>
      <div
        style={{
          flexShrink: 0,
          textAlign: "center",
          background: "var(--accent-soft)",
          border: "1px solid var(--accent-border)",
          borderRadius: 10,
          padding: "10px 20px",
          minWidth: 80
        }}
      >
        <div
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 36,
            fontWeight: 900,
            color: "var(--accent)",
            lineHeight: 1
          }}
        >
          {placasNec}
        </div>
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            marginTop: 4
          }}
        >
          placa{placasNec !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

function TablaGrupoCorte({ nombreMat, piezas, rotadas, onToggleRotar, onOptimizar, hayRotaciones, agruparPorMedida }) {
  const [expandidas, setExpandidas] = useState(new Set());

  const piezasVista = agruparPorMedida ? agruparPiezasPorMedida(piezas) : null;
  const totalCortes  = agruparPorMedida ? piezasVista.length : piezas.length;

  const toggleExpandir = (key) => setExpandidas(prev => {
    const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s;
  });

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "var(--accent)", margin: 0 }}>
            🪵 {nombreMat}
          </h3>
          <Badge color="#7090b0">{totalCortes} {agruparPorMedida ? "medidas" : "cortes"}</Badge>
        </div>
        {!agruparPorMedida && (
          <button
            onClick={hayRotaciones ? onOptimizar : undefined}
            disabled={!hayRotaciones}
            title={hayRotaciones ? "Re-optimizar con rotaciones aplicadas" : "Rotá piezas para habilitar"}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 7,
              fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700,
              letterSpacing: "0.08em", cursor: hayRotaciones ? "pointer" : "default",
              transition: "all 0.2s",
              background: hayRotaciones ? "linear-gradient(135deg,var(--accent),var(--accent-hover))" : "transparent",
              border: hayRotaciones ? "1px solid var(--accent-border)" : "1px solid var(--border)",
              color: hayRotaciones ? "var(--text-inverted)" : "var(--text-muted)",
              boxShadow: hayRotaciones ? "0 2px 10px rgba(212,175,55,0.25)" : "none",
              opacity: hayRotaciones ? 1 : 0.55,
            }}
          >
            ↺ Actualizar optimización
          </button>
        )}
      </div>

      <div className="rsp-scroll-x" style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
        <div className="rsp-table-inner">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>

            {agruparPorMedida ? (
              <>
                <thead style={{ background: "var(--accent-soft)", borderBottom: "1px solid var(--border)" }}>
                  <tr>
                    <th style={{ ...thStyle, textAlign: "center" }}>Medidas</th>
                    <th style={thStyle}>Pieza</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Cant.</th>
                    <th style={thStyle}>Tapacanto</th>
                  </tr>
                </thead>
                <tbody>
                  {piezasVista.map((grupo) => {
                    const key = `${grupo.d1}_${grupo.d2}`;
                    const multiNombre = grupo.subPiezas.length > 1;
                    const expanded    = expandidas.has(key);
                    const tcUnicos    = [...new Set(grupo.subPiezas.map(s => s.tcNombre))];
                    const tcLabel     = tcUnicos.length === 1
                      ? `${grupo.subPiezas[0].tcNombre} ${grupo.subPiezas[0].tcLados}`
                      : "—";
                    return (
                      <React.Fragment key={key}>
                        <tr
                          onClick={multiNombre ? () => toggleExpandir(key) : undefined}
                          style={{ cursor: multiNombre ? "pointer" : "default", background: expanded ? "rgba(212,175,55,0.06)" : "transparent", transition: "background 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-soft)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = expanded ? "rgba(212,175,55,0.06)" : "transparent"; }}
                        >
                          <td style={{ ...tdStyle, textAlign: "center", fontFamily: "'DM Mono',monospace", color: "var(--color-positive-muted)", fontSize: 14, fontWeight: 700 }}>
                            {grupo.d1} × {grupo.d2} mm
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>
                            {multiNombre ? (
                              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 9, color: "var(--accent)" }}>{expanded ? "▲" : "▼"}</span>
                                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                  {grupo.subPiezas[0].piezaNombre}
                                  <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>(+{grupo.subPiezas.length - 1} más)</span>
                                </span>
                              </span>
                            ) : grupo.subPiezas[0].piezaNombre}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 16, color: "var(--accent)" }}>
                            {grupo.cantTotal}
                          </td>
                          <td style={{ ...tdStyle, fontSize: 11, color: "var(--text-muted)" }}>{tcLabel}</td>
                        </tr>
                        {multiNombre && expanded && grupo.subPiezas.map((sub, i) => (
                          <tr key={`${key}-sub-${i}`} style={{ background: "rgba(212,175,55,0.03)" }}>
                            <td style={{ ...tdStyle, paddingLeft: 28 }}>
                              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--accent)", marginRight: 6 }}>{sub.codigo}</span>
                              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub.modulo}</span>
                            </td>
                            <td style={{ ...tdStyle, paddingLeft: 20, fontSize: 12, color: "var(--text-secondary)" }}>{sub.piezaNombre}</td>
                            <td style={{ ...tdStyle, textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 13, color: "var(--text-secondary)" }}>{sub.cantidad}</td>
                            <td style={{ ...tdStyle, fontSize: 11, color: "var(--text-muted)" }}>
                              {sub.tcNombre} <span style={{ fontFamily: "'DM Mono',monospace" }}>{sub.tcLados}</span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </>
            ) : (
              <>
                <thead style={{ background: "var(--accent-soft)", borderBottom: "1px solid var(--border)" }}>
                  <tr>
                    <th style={thStyle}>Módulo</th>
                    <th style={thStyle}>Pieza</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Cant.</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Medidas reales</th>
                    <th style={thStyle}>Tapacanto</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>↺</th>
                  </tr>
                </thead>
                <tbody>
                  {piezas.map((pz, idx) => {
                    const piezaId = `${pz.codigo}-${pz.piezaNombre}`;
                    const rotada  = rotadas?.has(piezaId);
                    const d1      = rotada ? pz.d2 : pz.d1;
                    const d2      = rotada ? pz.d1 : pz.d2;
                    return (
                      <tr key={idx}
                        style={{ transition: "background 0.15s", background: rotada ? "rgba(212,175,55,0.06)" : "transparent" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = rotada ? "rgba(212,175,55,0.10)" : "var(--accent-soft)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = rotada ? "rgba(212,175,55,0.06)" : "transparent")}
                      >
                        <td style={tdStyle}>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)", marginRight: 8 }}>{pz.codigo}</span>
                          {pz.modulo}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{pz.piezaNombre}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 16, color: "var(--accent)" }}>{pz.cantidad}</td>
                        <td style={{ ...tdStyle, textAlign: "center", fontFamily: "'DM Mono',monospace", color: rotada ? "var(--accent)" : "#c8d098", fontSize: 14 }}>
                          {d1} × {d2} mm
                          {rotada && <span style={{ fontSize: 9, marginLeft: 5, color: "var(--accent)", fontWeight: 700, verticalAlign: "middle" }}>90°</span>}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 11, color: "var(--text-muted)" }}>
                          {pz.tcNombre}{" "}
                          <span style={{ fontFamily: "'DM Mono',monospace", marginLeft: 4, color: "var(--text-secondary)" }}>{pz.tcLados}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <button
                            onClick={() => onToggleRotar?.(piezaId)}
                            title={rotada ? "Quitar rotación" : "Rotar 90°"}
                            style={{
                              background: rotada ? "var(--accent-soft)" : "transparent",
                              border: `1px solid ${rotada ? "var(--accent-border)" : "var(--border)"}`,
                              borderRadius: 5, cursor: "pointer", padding: "2px 7px",
                              fontSize: 14, color: rotada ? "var(--accent)" : "var(--text-muted)",
                              transition: "all 0.15s",
                            }}
                          >↺</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}

          </table>
        </div>
      </div>
    </div>
  );
}

function ListaCorte({ items, modulos, costos, getModUsado, presupuestos, presupuestoActivoId, onActualizarPresupuesto }) {
  const [copiadoOk, setCopiadoOk] = useState(false);
  const [layoutOptimizado, setLayoutOptimizado] = useState(null);
  const [bannerDesc, setBannerDesc] = useState(false);
  const [rotadas, setRotadas] = useState(new Set());
  const [agruparPorMedida, setAgruparPorMedida] = useState(false);
  const [menuAbierto, setMenuAbierto]           = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuAbierto) return;
    const handler = (e) => { if (!menuRef.current?.contains(e.target)) setMenuAbierto(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuAbierto]);

  // Limpiar layout optimizado al cambiar de presupuesto activo
  useEffect(() => {
    setLayoutOptimizado(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presupuestoActivoId]);

  const itemsEfectivos = items;
  const getModUsadoEfectivo = getModUsado;

  if (itemsEfectivos.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <SectionTitle sub="Lista detallada agrupada por material con medidas listas para la escuadradora">
          Lista de Corte
        </SectionTitle>
        <div style={{ textAlign: "center", padding: "60px 0", borderRadius: 12, border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🪚</div>
          <p style={{ fontSize: 14 }}>No hay piezas para cortar.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>
            Agregá módulos desde{" "}
            <strong style={{ color: "var(--accent)" }}>📋 Presupuesto</strong>{" "}
            para generar la lista.
          </p>
        </div>
      </div>
    );

  }
  const nombreActivo = presupuestoActivoId ? (presupuestos[presupuestoActivoId]?.nombre ?? null) : null;
  const grupos = {};
  itemsEfectivos.forEach((item) => {
    const modBase = modulos[item.codigo];
    if (!modBase) return;
    // Fase 7.5: módulo paramétrico → módulo concreto antes de listar piezas.
    // Back-compat: módulos viejos pasan idénticos.
    const modUsado = generarPiezas(getModUsadoEfectivo(item), item.parametrosValores || {}, costos);
    const { materialDef: matDef, espesor: esp, modVars } = resolverContextoModulo(modUsado, costos, item.parametrosValores || {});
    if (!matDef) return;
    const matKey = `${matDef.nombre} (${esp}mm)`;
    if (!grupos[matKey])
      grupos[matKey] = {
        nombre: matDef.nombre,
        espesor: esp,
        placaLargo: matDef.placaLargo ?? 2750,
        placaAncho: matDef.placaAncho ?? 1830,
        precioPlaca: matDef.precio || 0,
        areaNetaM2: 0,
        piezas: []
      };

    modUsado.piezas.forEach((p) => {
      const piezaVars = p._repeatVars ? { ...modVars, ...p._repeatVars } : modVars;
      const d1 = p.especial
        ? (parseFloat(p.dimLibre1) || 0)
        : p.formula1 != null
          ? (evaluarFormula(p.formula1, piezaVars) ?? 0)
          : resolverDim(modUsado.dimensiones[p.usaDim], p.offsetEsp, p.offsetMm, p.divisor || 1, esp);
      const d2 = p.especial
        ? (parseFloat(p.dimLibre2) || 0)
        : p.formula2 != null
          ? (evaluarFormula(p.formula2, piezaVars) ?? 0)
          : resolverDim(modUsado.dimensiones[p.usaDim2], p.offsetEsp2, p.offsetMm2, p.divisor2 || 1, esp);
      const tcDef = costos.tapacanto?.find((t) => t.id === p.tc?.id);
      const cant = p.cantidad * item.cantidad;
      grupos[matKey].areaNetaM2 += (d1 * d2 * cant) / 1_000_000;
      grupos[matKey].piezas.push({
        modulo: modBase.nombre,
        codigo: item.codigo,
        piezaNombre: p.nombre,
        cantidad: cant,
        d1: Math.round(d1),
        d2: Math.round(d2),
        tcNombre: tcDef ? tcDef.nombre : "Sin tapacanto",
        tcLados: p.tc?.id
          ? `[D1:${p.tc.lados1 || 0} | D2:${p.tc.lados2 || 0}]`
          : "-"
      });
    });
  });

  const piezasOptimizer = Object.values(grupos).flatMap(g => g.piezas.map(p => {
    const piezaId = `${p.codigo}-${p.piezaNombre}`;
    const rotada = rotadas.has(piezaId);
    return {
      id: piezaId,
      d1: rotada ? p.d2 : p.d1,
      d2: rotada ? p.d1 : p.d2,
      cantidad: p.cantidad,
      modId: p.modulo.toLowerCase().replace(/\s+/g, ''),
      nombre: p.piezaNombre,
      rotable: !rotada,
      vetaDir: "horizontal"
    };
  }));
  const plateDimsOptimizer = {
    largo: Object.values(grupos)[0]?.placaLargo ?? 2750,
    ancho: Object.values(grupos)[0]?.placaAncho ?? 1830,
  };
  const handleOptimizar = () => {
    try {
      const result = optimizerService.layoutPiezas(piezasOptimizer, plateDimsOptimizer);
      setLayoutOptimizado(result);
      setBannerDesc(false);
    } catch (e) {
      console.error('Optimizer error:', e);
    }
  };
  const hayRotaciones = rotadas.size > 0;

  const copiarLista = () => {
    const lines = [`📦 LISTA DE COMPRAS${nombreActivo ? " — " + nombreActivo : ""}`, ""];
    let total = 0;
    Object.entries(grupos).forEach(([nombreMat, datos]) => {
      const areaPlacaM2 = (datos.placaLargo * datos.placaAncho) / 1_000_000;
      const placasNec = Math.ceil((datos.areaNetaM2 * 1.2) / areaPlacaM2);
      const costo = datos.precioPlaca > 0 ? datos.precioPlaca * placasNec : 0;
      total += costo;
      const costoStr = costo > 0 ? ` (~${fmtPeso(Math.round(costo))})` : "";
      lines.push(`• ${placasNec} placa${placasNec !== 1 ? "s" : ""} de ${nombreMat}${costoStr}`);
    });
    if (total > 0) { lines.push(""); lines.push(`TOTAL ESTIMADO: ${fmtPeso(Math.round(total))}`); }
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopiadoOk(true);
      setMenuAbierto(false);
      setTimeout(() => setCopiadoOk(false), 2000);
    });
  };

  const mItemSty = {
    display: "flex", alignItems: "center", gap: 10, width: "100%",
    padding: "9px 16px", background: "transparent", border: "none",
    textAlign: "left", fontSize: 12, fontFamily: "'DM Mono',monospace",
    fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer",
    transition: "background 0.12s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        className="rsp-stack"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16
        }}
      >
        <SectionTitle sub="Medidas reales descontando espesores y offsets, agrupadas para el operario">
          Lista de Corte
        </SectionTitle>
        <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>

          {/* ── Menú Acciones ───────────────────────────── */}
          <div style={{ position: "relative" }} ref={menuRef}>
            <button
              onClick={() => setMenuAbierto(m => !m)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 16px",
                borderRadius: 6, fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                letterSpacing: "0.05em", cursor: "pointer", transition: "all 0.18s",
                background: "linear-gradient(135deg,var(--accent),var(--accent-hover))",
                border: "none", color: "var(--text-inverted)",
                boxShadow: "0 3px 12px rgba(180,100,20,0.28)",
              }}
            >
              Acciones {menuAbierto ? "▲" : "▾"}
            </button>
            {menuAbierto && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 200,
                minWidth: 220, background: "var(--bg-surface)",
                border: "1px solid var(--border)", borderRadius: 8,
                boxShadow: "0 8px 32px rgba(0,0,0,0.30)", overflow: "hidden",
              }}>
                <button style={mItemSty} onClick={copiarLista}>
                  {copiadoOk ? "✓ Copiado" : "📋 Copiar lista"}
                </button>
                <button style={mItemSty} onClick={() => { imprimirListaCompras(grupos, nombreActivo); setMenuAbierto(false); }}>
                  🛒 Lista de compras
                </button>
                <button style={mItemSty} onClick={() => { imprimirCorte(grupos, nombreActivo); setMenuAbierto(false); }}>
                  🪚 Lista de cortes
                </button>
                <div style={{ height: 1, background: "var(--border)", margin: "2px 0" }} />
                <button style={mItemSty} onClick={() => { imprimirCorte(grupos, nombreActivo); setMenuAbierto(false); }}>
                  ↗ Exportar PDF
                </button>
                <button style={mItemSty} onClick={() => { exportarExcel(grupos, nombreActivo); setMenuAbierto(false); }}>
                  ↗ Exportar Excel (.csv)
                </button>
                <button style={mItemSty} onClick={() => { exportarDistribuidora(grupos, nombreActivo); setMenuAbierto(false); }}>
                  ↗ Distribuidora (.txt)
                </button>
              </div>
            )}
          </div>

          {/* ── Toggle agrupar ──────────────────────────── */}
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 6, fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: agruparPorMedida ? "rgba(212,175,55,0.10)" : "var(--bg-surface)", border: `1px solid ${agruparPorMedida ? "var(--accent-border)" : "var(--border)"}`, color: agruparPorMedida ? "var(--accent)" : "var(--text-secondary)", transition: "all 0.18s" }}>
            <input type="checkbox" checked={agruparPorMedida} onChange={e => setAgruparPorMedida(e.target.checked)} style={{ accentColor: "var(--accent)", width: 13, height: 13 }} />
            Agrupar por medida
          </label>

          {/* ── Optimizador ─────────────────────────────── */}
          <OptimizerButton
            piezas={piezasOptimizer}
            plateDims={plateDimsOptimizer}
            onResult={(r) => { setLayoutOptimizado(r); setBannerDesc(false); }}
            onError={(e) => console.error('Optimizer error:', e)}
          />
        </div>
      </div>
      <div className="no-print">
        {/* Resumen estimado original */}
        {Object.entries(grupos).map(([nombreMat, datos]) => (
          <Card
            key={nombreMat}
            className="rsp-card"
            style={{ marginBottom: 20 }}
          >
            <ResumenCompra
              nombreMat={nombreMat}
              placaLargo={datos.placaLargo}
              placaAncho={datos.placaAncho}
              areaNetaM2={datos.areaNetaM2}
              precioPlaca={datos.precioPlaca}
            />
          </Card>
        ))}

        {/* Visualización del optimizador si existe */}
        {layoutOptimizado && (() => {
          const g0 = Object.values(grupos)[0];
          const areaPlacaM2 = g0 ? (g0.placaLargo * g0.placaAncho) / 1_000_000 : 2.75 * 1.83;
          const areaTotal = Object.values(grupos).reduce((s, d) => s + d.areaNetaM2, 0);
          const placasEst = Math.ceil((areaTotal * 1.2) / areaPlacaM2);
          const rendEst = placasEst > 0 ? Math.round((areaTotal / (placasEst * areaPlacaM2)) * 100) : 0;
          const plateDimsViz = { largo: g0?.placaLargo ?? 2750, ancho: g0?.placaAncho ?? 1830 };
          return (
          <div style={{ marginBottom: 24 }}>
            <ResumenOptimizado
              estimado={{ placasNecesarias: placasEst, rendimiento: rendEst }}
              optimizado={layoutOptimizado.metricas}
              precioPlaca={g0?.precioPlaca || 0}
            />

            {/* ── Banner desperdicio real vs configurado ── */}
            {(() => {
              const real = Math.round(layoutOptimizado.metricas.desperdicioTotal);
              const conf = costos.desperdicioPct || 20;
              if (Math.abs(real - conf) < 2) return null;

              const presIdActivo = presupuestoActivoId || null;
              const presActivo = presIdActivo ? presupuestos[presIdActivo] : null;
              if (!presActivo) return null;

              const yaAplicado = presActivo.desperdicioOverride != null;
              const ahorra = real < conf;
              const totalConReal = recalcularTotalPresupuesto(presActivo, modulos, { ...costos, desperdicioPct: real });
              const delta = totalConReal != null ? Math.round(totalConReal - (presActivo.total || 0)) : null;

              if (yaAplicado) return (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                  background: 'rgba(126,207,138,0.08)', border: '1px solid rgba(126,207,138,0.25)',
                  borderRadius: 8, marginBottom: 16, flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: 13 }}>✓</span>
                  <span style={{ fontSize: 12, color: 'var(--color-positive)', fontWeight: 700, flex: 1 }}>
                    Desperdicio real ({presActivo.desperdicioOverride}%) aplicado · El total se actualizará la próxima vez que recalculés el presupuesto.
                  </span>
                  {onActualizarPresupuesto && (
                    <button
                      onClick={() => onActualizarPresupuesto(presIdActivo, { desperdicioOverride: null })}
                      style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, padding: '4px 10px', borderRadius: 5, cursor: 'pointer', background: 'none', border: '1px solid rgba(126,207,138,0.4)', color: 'var(--color-positive)' }}
                    >Revertir</button>
                  )}
                </div>
              );

              if (bannerDesc) return null;

              return (
                <div style={{
                  padding: '12px 16px', borderRadius: 8, marginBottom: 16,
                  background: ahorra ? 'rgba(126,207,138,0.06)' : 'rgba(200,160,42,0.08)',
                  border: `1px solid ${ahorra ? 'rgba(126,207,138,0.25)' : 'rgba(200,160,42,0.3)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13 }}>{ahorra ? '📉' : '⚠'}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: ahorra ? '#7ecf8a' : '#c8a02a', flex: 1 }}>
                      Desperdicio real: {real}% · Configurado: {conf}%
                      {delta != null && (
                        <span style={{ fontFamily: "'DM Mono',monospace", marginLeft: 8, fontWeight: 900 }}>
                          ({ahorra ? '−' : '+'}{fmtPeso(Math.abs(delta))} {ahorra ? 'menos' : 'más'} en material)
                        </span>
                      )}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setBannerDesc(true)}
                      style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, padding: '5px 12px', borderRadius: 5, cursor: 'pointer', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                    >Mantener actual</button>
                    {onActualizarPresupuesto && (
                      <button
                        onClick={() => { onActualizarPresupuesto(presIdActivo, { desperdicioOverride: real }); setBannerDesc(false); }}
                        style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, padding: '5px 12px', borderRadius: 5, cursor: 'pointer', background: ahorra ? 'rgba(126,207,138,0.15)' : 'rgba(200,160,42,0.15)', border: `1px solid ${ahorra ? 'rgba(126,207,138,0.4)' : 'rgba(200,160,42,0.4)'}`, color: ahorra ? '#7ecf8a' : '#c8a02a' }}
                      >Aplicar al presupuesto</button>
                    )}
                  </div>
                </div>
              );
            })()}

            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, marginTop: 20 }}>
              Diagramas de Placas Optimizadas
            </h3>
            {layoutOptimizado.layouts.map((layout, idx) => (
              <div key={idx} style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, fontFamily: "'DM Mono',monospace" }}>
                  PLACA {idx + 1} — {layout.piezas.length} pieza{layout.piezas.length !== 1 ? 's' : ''} · {(100 - layout.desperdicio).toFixed(1)}% aprovechado
                </h4>
                <VisualizadorPlaca layout={layout} plateDims={plateDimsViz} />
              </div>
            ))}

            <BancoSobrantes sobrantes={layoutOptimizado.sobrantes} />

            <button
              onClick={() => window.print()}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 16px",
                borderRadius: 6, fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                letterSpacing: "0.05em", cursor: "pointer", transition: "all 0.18s",
                background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)",
              }}
            >
              🖨 Imprimir diagrama
            </button>
          </div>
          );
        })()}

        {/* Tabla de corte original (siempre visible) */}
        {Object.entries(grupos).map(([nombreMat, datos]) => (
          <Card
            key={nombreMat}
            className="rsp-card"
            style={{ marginBottom: 20 }}
          >
            <TablaGrupoCorte nombreMat={nombreMat} piezas={datos.piezas} rotadas={rotadas}
              onToggleRotar={(id) => setRotadas(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; })}
              onOptimizar={handleOptimizar}
              hayRotaciones={hayRotaciones}
              agruparPorMedida={agruparPorMedida} />
          </Card>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 12. TABLERO DE TRABAJOS
// ══════════════════════════════════════════════════════════════════
// ── TableroKanban ─────────────────────────────────────────────────

export { ListaCorte };
