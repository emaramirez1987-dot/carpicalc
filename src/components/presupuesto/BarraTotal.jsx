import React, { useState } from 'react';
import { Badge } from '../ui/index.jsx';
import { fmtPeso, fmtFechaLarga, calcularModulo, calcularTotalVisual } from '../../utils.js';
import { TIPO_MAT } from '../../constants.js';

// ════════════════════════════════════════════════════════════════════════════
// ResumenPresupuesto
// Tabla detallada de ítems con totales. Usada dentro de BarraTotal (expandido)
// y en vista-previa para impresión.
// ════════════════════════════════════════════════════════════════════════════
export function ResumenPresupuesto({
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
        style={{ marginBottom: 28, borderBottom: "2px solid #a07030", paddingBottom: 16 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 900, color: "#7a4a10", lineHeight: 1 }}>
              CarpiCálc
            </div>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 4, color: "#888" }}>
              Presupuesto de carpintería
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {nombrePresupuesto && (
              <div style={{ fontSize: 16, fontWeight: 700, color: "#2c1a08" }}>{nombrePresupuesto}</div>
            )}
            <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{fechaHoy}</div>
          </div>
        </div>
      </div>

      <div className="rsp-scroll-x" style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
        <div className="rsp-table-inner">
          {/* Encabezado tabla */}
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 0, padding: "10px 20px", background: "var(--accent-soft)", borderBottom: "1px solid var(--border)" }}>
            {["Código", "Módulo", "Cant.", ...(mostrarPrecioUnitario ? ["P. unit."] : [""]), "Subtotal"]
              .filter(h => h)
              .map(h => (
                <div key={h} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", textAlign: (h === "Cant." || h === "P. unit." || h === "Subtotal") ? "right" : "left" }}>
                  {h}
                </div>
              ))}
          </div>

          {/* Filas de ítems */}
          {itemsValidos.map((item, idx) => {
            const modBase = modulos[item.codigo];
            if (!modBase) return null;
            const modUsado = getModUsado(item);
            const calc = calcularModulo(modUsado, costos, item.parametrosValores || {});
            if (!calc) return null;
            const over = modUsado.dimensiones;
            const dimDif = over.ancho !== modBase.dimensiones.ancho || over.profundidad !== modBase.dimensiones.profundidad || over.alto !== modBase.dimensiones.alto;
            return (
              <div
                key={item.id || item.codigo}
                className="print-table-row"
                style={{ display: "grid", gridTemplateColumns: cols, gap: 0, padding: "14px 20px", borderBottom: idx < items.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-soft)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent)", paddingTop: 3 }}>
                  {item.codigo}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{modBase.nombre}</div>
                  {modBase.descripcion && (
                    <div style={{ fontSize: 12, marginTop: 2, fontStyle: "italic", color: "var(--text-muted)" }}>{modBase.descripcion}</div>
                  )}
                  {item.nota && item.nota.trim() && (
                    <div className="item-nota-print" style={{ fontSize: 12, marginTop: 4, color: "var(--accent)", fontStyle: "italic", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ opacity: 0.7 }}>📝</span> {item.nota}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: dimDif ? "var(--accent)" : "var(--text-muted)" }}>
                      {over.ancho}×{over.profundidad}×{over.alto} mm
                    </span>
                    {dimDif && <Badge color="var(--accent)">★ personalizado</Badge>}
                    <Badge color="#7090b0">{TIPO_MAT[modUsado.material]}</Badge>
                  </div>
                </div>
                <div style={{ textAlign: "right", paddingTop: 3 }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color: "var(--accent)" }}>{item.cantidad}</span>
                </div>
                {mostrarPrecioUnitario && (
                  <div style={{ textAlign: "right", paddingTop: 3, fontFamily: "'DM Mono',monospace", fontSize: 12, color: "var(--text-secondary)" }}>
                    {fmtPeso(calc.total)}
                  </div>
                )}
                <div style={{ textAlign: "right", paddingTop: 3, fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color: "var(--color-positive)" }}>
                  {fmtPeso(calc.total * item.cantidad)}
                </div>
              </div>
            );
          })}

          {/* Bloque de total */}
          <div className="print-total-block" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, padding: "16px 24px", alignItems: "center", background: "var(--bg-surface)", borderTop: "1px solid var(--accent-border)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {items.reduce((a, i) => a + i.cantidad, 0)} u · {items.length} mód.
                {(adicionales || []).length > 0 && ` · ${adicionales.length} extra${adicionales.length !== 1 ? "s" : ""}`}
                {(costosDirectos || []).length > 0 && ` · ${costosDirectos.length} costo${costosDirectos.length !== 1 ? "s" : ""}`}
              </div>
              <button
                onClick={() => setMostrarIVA(v => !v)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, background: mostrarIVA ? "rgba(126,207,138,0.12)" : "var(--accent-soft)", border: `1px solid ${mostrarIVA ? "rgba(126,207,138,0.30)" : "var(--accent-border)"}`, color: mostrarIVA ? "#7ecf8a" : "var(--accent)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, width: "fit-content", transition: "all 0.15s" }}
              >
                {mostrarIVA ? "✓ Con IVA 21%" : "+ Ver con IVA 21%"}
              </button>
            </div>
            <div style={{ textAlign: "right" }}>
              {tv.hayDescuento || tv.hayGanancia ? (
                <>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 2, color: "var(--text-muted)" }}>
                    {mostrarIVA ? "Total + IVA 21%" : "Total sin IVA"}
                  </div>
                  {tv.hayDescuento && (
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700, color: "var(--text-muted)", textDecoration: "line-through", opacity: 0.55, letterSpacing: "0.02em", marginBottom: 4 }}>
                      {fmtPeso(mostrarIVA ? totalConIVA : totalGeneral)}
                    </div>
                  )}
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1, color: "var(--color-positive)", transition: "all 0.2s" }}>
                    {fmtPeso(mostrarIVA ? totalAjustadoConIVA : tv.totalFinal)}
                  </div>
                  {tv.hayDescuento && (
                    <div style={{ fontSize: 10, color: "#e07070", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>🏷 Precio con descuento</div>
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
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1, color: "var(--color-positive)", transition: "all 0.2s" }}>
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

// ════════════════════════════════════════════════════════════════════════════
// BarraTotal
// Barra colapsable en el editor de presupuesto que muestra el total y
// expande a ResumenPresupuesto al hacer clic.
// ════════════════════════════════════════════════════════════════════════════
export function BarraTotal({ items, modulos, costos, getModUsado, totalGeneral, nombrePresupuesto, descuento = 0, gananciaExtra = 0, adicionales = [], costosDirectos = [], mostrarExtras = true, mostrarCostosDirectos = true }) {
  const [expandido, setExpandido] = useState(false);
  const [mostrarIVA, setMostrarIVA] = useState(false);
  const totalConIVA = Math.round(totalGeneral * 1.21);
  const totalUnid = items.reduce((a, i) => a + i.cantidad, 0);
  const tv = calcularTotalVisual(totalGeneral, descuento, gananciaExtra);
  const totalFinalConIVA = Math.round(tv.totalFinal * 1.21);
  const hayAjuste = tv.hayDescuento || tv.hayGanancia;

  return (
    <div style={{ borderRadius: expandido ? "10px 10px 0 0" : 10, overflow: "hidden", border: "1px solid var(--accent-border)", background: "var(--bg-surface)" }}>
      {/* Barra principal — siempre visible */}
      <div
        style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", cursor: "pointer", background: "var(--accent-soft)", borderBottom: expandido ? "1px solid var(--accent-border)" : "none" }}
        onClick={() => setExpandido(v => !v)}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
            {totalUnid} u · {items.length} mód.
          </span>
          <button
            onClick={e => { e.stopPropagation(); setMostrarIVA(v => !v); }}
            style={{ padding: "3px 10px", borderRadius: 5, fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: mostrarIVA ? "rgba(126,207,138,0.15)" : "transparent", border: `1px solid ${mostrarIVA ? "rgba(126,207,138,0.35)" : "var(--accent-border)"}`, color: mostrarIVA ? "#7ecf8a" : "var(--accent)", transition: "all 0.15s" }}
          >
            {mostrarIVA ? "✓ Con IVA" : "+ IVA 21%"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {tv.hayDescuento && (
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textDecoration: "line-through", opacity: 0.5, letterSpacing: "0.02em" }}>
              {fmtPeso(mostrarIVA ? totalConIVA : totalGeneral)}
            </span>
          )}
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 900, color: "var(--color-positive)", letterSpacing: -0.5 }}>
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
