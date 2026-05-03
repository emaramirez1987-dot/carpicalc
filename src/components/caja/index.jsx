import React, { useState, useEffect } from 'react';
import { SectionTitle } from '../ui/index.jsx';
import { fmtPeso, fmtFecha, calcularModulo, calcularTotalVisual } from '../../utils.js';
import { leerPerfil } from '../../storage.js';
import { ESTADOS_TRABAJO } from '../../constants.js';
import { generarFichaObra } from '../presupuesto/index.jsx';


function FilaCaja({ id, p, onActualizar, modulos, costos, autoAbrir = false }) {
  const [abierto, setAbierto] = useState(autoAbrir); // auto-abrir si viene de "Ver Rentabilidad"
  const [montoCobro, setMontoCobro] = useState("");
  const [conceptoCobro, setConceptoCobro] = useState("Seña");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [costoReal, setCostoReal] = useState(p.costoReal ?? "");
  const [diasVigencia, setDiasVigencia] = useState(p.diasVigencia ?? 15);
  const [editandoCosto, setEditandoCosto] = useState(false);
  const [editandoVigencia, setEditandoVigencia] = useState(false);
  const [descuento, setDescuento] = useState(p.descuento ?? "");
  const [gananciaExtra, setGananciaExtra] = useState(p.gananciaExtra ?? "");
  const [abiertoCobros, setAbiertoCobros] = useState(false);
  const [abiertoRentabilidad, setAbiertoRentabilidad] = useState(false);
  const [abiertoVigencia, setAbiertoVigencia] = useState(false);

  // Costo automático: recalcular con los costos actuales del sistema
  const costoAutomatico = (() => {
    if (!p.items || !modulos || !costos) return 0;
    return Math.round(p.items.reduce((acc, item) => {
      const base = modulos[item.codigo];
      if (!base) return acc;
      const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || base.dimensiones;
      const calc = calcularModulo({ ...base, dimensiones: dims }, costos);
      if (!calc) return acc;
      return acc + calc.costoBase * item.cantidad; // solo costo sin ganancia
    }, 0));
  })();

  // Prioridad: si el usuario ingresó un costo real manual, se usa ese. Si no, el automático.
  const costoEfectivo = p.costoReal > 0 ? p.costoReal : costoAutomatico;

  // Total ajustado: precio base + ganancia extra − descuento
  const descuentoVal = parseFloat(p.descuento) || 0;
  const gananciaExtraVal = parseFloat(p.gananciaExtra) || 0;
  const totalAjustado = p.total + gananciaExtraVal - descuentoVal;

  const cobros = p.cobros || [];
  const totalCobrado = cobros.reduce((a, c) => a + c.monto, 0);
  const saldoPendiente = Math.max(0, totalAjustado - totalCobrado);
  const totalValido = totalAjustado > 0;
  const pctCobrado = totalValido ? Math.min(100, Math.round((totalCobrado / totalAjustado) * 100)) : 0;

  // Margen calculado sobre el total ajustado vs el costo efectivo
  const margen = (totalValido && costoEfectivo > 0)
    ? Math.round(((totalAjustado - costoEfectivo) / totalAjustado) * 100)
    : null;

  // Vencimiento: solo relevante si está enviado
  const diasTranscurridos = Math.floor((Date.now() - parseInt(id)) / 86400000);
  const diasRestantes = (p.diasVigencia || 15) - diasTranscurridos;
  const vencido = diasRestantes < 0;
  const porVencer = diasRestantes >= 0 && diasRestantes <= 3;
  const estadoVigencia = p.estado === "enviado" || p.estado === "nuevo"
    ? vencido ? "vencido" : porVencer ? "por_vencer" : "vigente"
    : null;

  const agregarCobro = () => {
    const monto = parseFloat(montoCobro);
    if (!monto || isNaN(monto) || monto <= 0) return;
    const nuevoCobro = { fecha: Date.now(), monto, concepto: conceptoCobro, metodo: metodoPago };
    onActualizar(id, { cobros: [...cobros, nuevoCobro] });
    setMontoCobro("");
  };

  const eliminarCobro = (idx) => {
    onActualizar(id, { cobros: cobros.filter((_, i) => i !== idx) });
  };

  const guardarCostoReal = () => {
    const v = parseFloat(costoReal);
    onActualizar(id, { costoReal: isNaN(v) ? 0 : v });
    setEditandoCosto(false);
  };

  const guardarVigencia = () => {
    const v = parseInt(diasVigencia);
    onActualizar(id, { diasVigencia: isNaN(v) ? 15 : v });
    setEditandoVigencia(false);
  };

  const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];

  const inputSm = {
    fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "5px 9px",
    background: "var(--bg-base)", border: "1px solid var(--accent-border)",
    color: "var(--text-primary)", borderRadius: 6, outline: "none",
  };

  return (
    <div id={`filacaja-${id}`} className="hover-lift anim-fadeup" style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 12, overflow: "visible", transition: "border-color 0.18s",
      borderLeft: `3px solid ${est.color}`,
    }}>
      {/* Cabecera */}
      <div style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
        onClick={() => setAbierto(a => !a)}
        onMouseEnter={e => e.currentTarget.parentElement.style.borderColor = "var(--border-strong)"}
        onMouseLeave={e => e.currentTarget.parentElement.style.borderColor = "var(--border)"}
      >
        {/* Info principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", background: `${est.color}22`, color: est.color, border: `1px solid ${est.color}44`, borderRadius: 4, padding: "2px 7px" }}>
              {est.icon} {est.label}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{p.nombre}</span>
            {p.cliente?.nombre && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· 👤 {p.cliente.nombre}</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 300 }}>
            {fmtFecha(parseInt(id))} · {p.items.length} mód.
          </div>
        </div>

        {/* Vencimiento */}
        {estadoVigencia && (
          <div style={{
            fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, padding: "3px 9px",
            borderRadius: 6, flexShrink: 0,
            background: vencido ? "rgba(200,60,60,0.15)" : porVencer ? "rgba(200,160,42,0.15)" : "rgba(100,180,80,0.10)",
            color: vencido ? "#e07070" : porVencer ? "#c8a02a" : "#7ecf8a",
            border: `1px solid ${vencido ? "rgba(200,60,60,0.35)" : porVencer ? "rgba(200,160,42,0.35)" : "rgba(100,180,80,0.25)"}`,
          }}>
            {vencido ? `⚠ Vencido hace ${Math.abs(diasRestantes)}d` : `📅 Vence en ${diasRestantes}d`}
          </div>
        )}

        {/* Barra cobro */}
        <div style={{ flexShrink: 0, textAlign: "right", minWidth: 120 }}>
          <div style={{ marginBottom: 4, textAlign: "right" }}>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: saldoPendiente > 0 ? "#e07070" : "#7ecf8a" }}>
              {fmtPeso(saldoPendiente > 0 ? saldoPendiente : 0)} pendiente
            </span>
          </div>
          <div style={{ height: 5, background: "var(--bg-subtle)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pctCobrado}%`, background: pctCobrado >= 100 ? "#7ecf8a" : "var(--accent)", borderRadius: 999, transition: "width 0.4s" }} />
          </div>
        </div>

        {/* Total y margen */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700, color: totalValido ? "#7ecf8a" : "#e07070" }}>
            {fmtPeso(p.total)}
          </div>
          {!totalValido && (
            <div style={{ fontSize: 10, color: "#e07070", fontFamily: "'DM Mono',monospace" }}>⚠ Revisar costos</div>
          )}
          {margen !== null && totalValido && (
            <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: margen >= 30 ? "#7ecf8a" : margen >= 15 ? "#c8a02a" : "#e07070", fontWeight: 700 }}>
              {margen}% margen
            </div>
          )}
        </div>

        <span style={{ color: "var(--text-muted)", fontSize: 12, flexShrink: 0 }}>{abierto ? "▲" : "▼"}</span>
      </div>

      {/* Panel expandido — 3 filas accordion */}
      {abierto && (
        <div style={{ borderTop: "1px solid var(--separator)" }}>

          {/* Ficha de Obra — solo producción */}
          {(p.estado === "produccion") && modulos && costos && (
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--separator)" }}>
              <button onClick={() => generarFichaObra(id, p, modulos, costos, leerPerfil())}
                style={{
                  width: "100%", padding: "10px 16px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(200,80,48,0.12)", border: "1px solid rgba(200,80,48,0.35)",
                  color: "#c85030", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(200,80,48,0.22)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(200,80,48,0.12)"}>
                📋 Generar Ficha de Obra — lista para imprimir o compartir
              </button>
            </div>
          )}

          {/* ── Accordion 1: Cobros ── */}
          <div>
            <div
              onClick={() => setAbiertoCobros(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 18px", cursor: "pointer", userSelect: "none" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-subtle)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 13 }}>💳</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-secondary)", flex: 1 }}>
                Cobros recibidos
              </span>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, marginRight: 10 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: totalCobrado > 0 ? "#7ecf8a" : "var(--text-muted)" }}>
                  {totalCobrado > 0 ? fmtPeso(totalCobrado) : "Sin cobros"}
                  <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 6 }}>
                    {cobros.length > 0 ? `${cobros.length} cobro${cobros.length !== 1 ? "s" : ""}` : "Registrá un pago"}
                  </span>
                </span>
                <div style={{ width: 72, height: 3, background: "var(--bg-subtle)", borderRadius: 999 }}>
                  <div style={{ height: "100%", width: `${pctCobrado}%`, background: pctCobrado >= 100 ? "#7ecf8a" : "var(--accent)", borderRadius: 999, transition: "width 0.4s" }} />
                </div>
              </div>
              <span style={{ fontSize: 10, color: "var(--text-muted)", display: "inline-block", transition: "transform 0.2s", transform: abiertoCobros ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </div>
            <div style={{ overflow: "hidden", maxHeight: abiertoCobros ? "900px" : "0", transition: "max-height 0.3s ease" }}>
              <div style={{ padding: "0 18px 16px" }}>
                {cobros.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Sin cobros registrados</div>
                ) : (
                  <div style={{ marginBottom: 10 }}>
                    {cobros.map((c, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--separator)" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{c.concepto}</span>
                            {c.metodo && (
                              <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                {c.metodo}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>{fmtFecha(c.fecha)}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(c.monto)}</span>
                          <button onClick={() => eliminarCobro(i)}
                            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, padding: 0 }}>×</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>SALDO PENDIENTE</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: saldoPendiente > 0 ? "#e07070" : "#7ecf8a" }}>
                        {fmtPeso(Math.max(0, saldoPendiente))}
                      </span>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <select value={conceptoCobro} onChange={e => setConceptoCobro(e.target.value)}
                    style={{ ...inputSm, flex: "0 0 auto" }}>
                    {["Seña","Anticipo materiales","Cuota","Saldo final","Otro"].map(c => <option key={c}>{c}</option>)}
                  </select>
                  <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
                    style={{ ...inputSm, flex: "0 0 auto" }}>
                    {["Efectivo","Transferencia","Cheque","Tarjeta","Otro"].map(m => <option key={m}>{m}</option>)}
                  </select>
                  <input type="number" value={montoCobro} onChange={e => setMontoCobro(e.target.value)}
                    placeholder="Monto $" onKeyDown={e => e.key === "Enter" && agregarCobro()}
                    style={{ ...inputSm, flex: 1, minWidth: 80 }} />
                  <button onClick={agregarCobro}
                    style={{ padding: "5px 12px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                    + Cobro
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: "var(--separator)" }} />

          {/* ── Accordion 2: Rentabilidad ── */}
          <div>
            <div
              onClick={() => setAbiertoRentabilidad(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 18px", cursor: "pointer", userSelect: "none" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-subtle)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 13 }}>📈</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-secondary)", flex: 1 }}>
                Rentabilidad
              </span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, marginRight: 10,
                color: !totalValido ? "#e07070" : margen === null ? "var(--text-muted)" : margen >= 30 ? "#7ecf8a" : margen >= 15 ? "#c8a02a" : "#e07070" }}>
                {!totalValido ? "⚠ Revisar costos" : margen === null ? "Sin costo real" : `${margen}% · ${fmtPeso(totalAjustado - costoEfectivo)} gan.`}
              </span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", display: "inline-block", transition: "transform 0.2s", transform: abiertoRentabilidad ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </div>
            <div style={{ overflow: "hidden", maxHeight: abiertoRentabilidad ? "900px" : "0", transition: "max-height 0.3s ease" }}>
              <div style={{ padding: "0 18px 16px" }}>
                {(() => {
                  const tv = calcularTotalVisual(p.total, p.descuento, p.gananciaExtra);
                  return (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tv.hayDescuento ? 4 : 10 }}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {tv.hayDescuento ? "Precio original" : "Precio base"}
                        </span>
                        <span style={{
                          fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700,
                          color: tv.hayDescuento ? "var(--text-muted)" : "#7ecf8a",
                          textDecoration: tv.hayDescuento ? "line-through" : "none",
                          opacity: tv.hayDescuento ? 0.55 : 1,
                          letterSpacing: tv.hayDescuento ? "0.02em" : "normal",
                        }}>
                          {fmtPeso(tv.totalOriginal)}
                        </span>
                      </div>
                      {tv.hayDescuento && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#e07070" }}>🏷 Con descuento</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 900, color: "#7ecf8a" }}>{fmtPeso(tv.totalFinal)}</span>
                        </div>
                      )}
                      {tv.hayGanancia && !tv.hayDescuento && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#7ecf8a" }}>💵 Total final</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 900, color: "#7ecf8a" }}>{fmtPeso(tv.totalFinal)}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
                <div style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden", marginBottom: 12 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
                    background: descuentoVal > 0 ? "rgba(224,112,112,0.08)" : "var(--bg-subtle)",
                    borderBottom: "1px solid var(--border)",
                  }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>🏷</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1, fontWeight: 600 }}>Descuento</span>
                    <span style={{ fontSize: 13, color: "#e07070", fontFamily: "'DM Mono',monospace", fontWeight: 900 }}>−</span>
                    <input
                      type="number" min="0" value={descuento} placeholder="0"
                      onChange={e => setDescuento(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { onActualizar(id, { descuento: parseFloat(descuento) || 0, gananciaExtra: parseFloat(gananciaExtra) || 0 }); e.target.blur(); } }}
                      style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, padding: "4px 8px", width: 100, textAlign: "right", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "#e07070", outline: "none" }}
                      onFocus={e => e.target.style.borderColor = "#e07070"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                    <button
                      title="Confirmar descuento"
                      onClick={() => onActualizar(id, { descuento: parseFloat(descuento) || 0, gananciaExtra: parseFloat(gananciaExtra) || 0 })}
                      style={{
                        width: 26, height: 26, borderRadius: 6, cursor: "pointer", flexShrink: 0,
                        background: parseFloat(descuento) !== descuentoVal ? "rgba(224,112,112,0.2)" : "var(--bg-base)",
                        border: `1px solid ${parseFloat(descuento) !== descuentoVal ? "#e07070" : "var(--border)"}`,
                        color: "#e07070", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                      }}>✓</button>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
                    background: gananciaExtraVal > 0 ? "rgba(126,207,138,0.08)" : "var(--bg-subtle)",
                  }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>💵</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1, fontWeight: 600 }}>Ganancia extra</span>
                    <span style={{ fontSize: 13, color: "#7ecf8a", fontFamily: "'DM Mono',monospace", fontWeight: 900 }}>+</span>
                    <input
                      type="number" min="0" value={gananciaExtra} placeholder="0"
                      onChange={e => setGananciaExtra(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { onActualizar(id, { descuento: parseFloat(descuento) || 0, gananciaExtra: parseFloat(gananciaExtra) || 0 }); e.target.blur(); } }}
                      style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, padding: "4px 8px", width: 100, textAlign: "right", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "#7ecf8a", outline: "none" }}
                      onFocus={e => e.target.style.borderColor = "#7ecf8a"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                    <button
                      title="Confirmar ganancia extra"
                      onClick={() => onActualizar(id, { descuento: parseFloat(descuento) || 0, gananciaExtra: parseFloat(gananciaExtra) || 0 })}
                      style={{
                        width: 26, height: 26, borderRadius: 6, cursor: "pointer", flexShrink: 0,
                        background: parseFloat(gananciaExtra) !== gananciaExtraVal ? "rgba(126,207,138,0.2)" : "var(--bg-base)",
                        border: `1px solid ${parseFloat(gananciaExtra) !== gananciaExtraVal ? "#7ecf8a" : "var(--border)"}`,
                        color: "#7ecf8a", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                      }}>✓</button>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Costo calculado
                    {p.costoReal > 0 && <span style={{ fontSize: 10, color: "#c8a02a", marginLeft: 6 }}>(ignorado)</span>}
                  </span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: p.costoReal > 0 ? "var(--text-muted)" : "#e07070", textDecoration: p.costoReal > 0 ? "line-through" : "none", opacity: p.costoReal > 0 ? 0.5 : 1 }}>
                    {fmtPeso(costoAutomatico)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Costo real (manual)
                    {p.costoReal > 0 && <span style={{ fontSize: 10, color: "#7ecf8a", marginLeft: 6 }}>● activo</span>}
                  </span>
                  {editandoCosto ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <input type="number" value={costoReal} onChange={e => setCostoReal(e.target.value)}
                        autoFocus onKeyDown={e => e.key === "Enter" && guardarCostoReal()}
                        style={{ ...inputSm, width: 100 }} />
                      <button onClick={guardarCostoReal}
                        style={{ padding: "4px 8px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>✓</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditandoCosto(true)}
                      style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: p.costoReal > 0 ? "#e07070" : "var(--text-muted)", background: "none", border: "1px dashed var(--border)", borderRadius: 5, padding: "2px 8px", cursor: "pointer" }}>
                      {p.costoReal > 0 ? fmtPeso(p.costoReal) : "Ingresar →"}
                    </button>
                  )}
                </div>
                {margen !== null && totalValido && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid var(--separator)" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Ganancia neta</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: (totalAjustado - costoEfectivo) >= 0 ? "#7ecf8a" : "#e07070" }}>
                        {fmtPeso(totalAjustado - costoEfectivo)}
                      </span>
                    </div>
                    <div style={{ height: 8, background: "var(--bg-subtle)", borderRadius: 999, overflow: "hidden", marginTop: 8 }}>
                      <div style={{ height: "100%", borderRadius: 999, transition: "width 0.4s", width: `${Math.max(0, Math.min(100, margen))}%`, background: margen >= 30 ? "#7ecf8a" : margen >= 15 ? "#c8a02a" : "#e07070" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontFamily: "'DM Mono',monospace" }}>
                      {margen >= 30 ? "✅ Margen saludable" : margen >= 15 ? "⚠ Margen ajustado" : "🔴 Margen bajo — revisar costos"}
                    </div>
                  </>
                )}
                {!totalValido && (
                  <div style={{ fontSize: 11, color: "#e07070", fontFamily: "'DM Mono',monospace", padding: "6px 0", borderTop: "1px solid var(--separator)" }}>
                    ⚠ El total del presupuesto es negativo. Revisá los costos en 💰 Costos.
                  </div>
                )}
                {margen === null && totalValido && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                    Margen calculado automáticamente. Podés ingresar un costo real para mayor precisión.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: "var(--separator)" }} />

          {/* ── Accordion 3: Vigencia ── */}
          <div>
            <div
              onClick={() => setAbiertoVigencia(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 18px", cursor: "pointer", userSelect: "none" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-subtle)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 13 }}>📅</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-secondary)", flex: 1 }}>
                Vigencia
              </span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, marginRight: 10,
                color: !estadoVigencia ? "var(--text-muted)" : vencido ? "#e07070" : porVencer ? "#c8a02a" : "#7ecf8a" }}>
                {!estadoVigencia
                  ? `${p.diasVigencia || 15} días`
                  : vencido
                  ? `⚠ Vencido hace ${Math.abs(diasRestantes)}d`
                  : porVencer
                  ? `⏳ Vence en ${diasRestantes}d`
                  : `✅ Vigente ${diasRestantes}d`}
              </span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", display: "inline-block", transition: "transform 0.2s", transform: abiertoVigencia ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </div>
            <div style={{ overflow: "hidden", maxHeight: abiertoVigencia ? "500px" : "0", transition: "max-height 0.3s ease" }}>
              <div style={{ padding: "0 18px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Válido por</span>
                  {editandoVigencia ? (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <input type="number" value={diasVigencia} onChange={e => setDiasVigencia(e.target.value)}
                        autoFocus onKeyDown={e => e.key === "Enter" && guardarVigencia()}
                        style={{ ...inputSm, width: 60 }} />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>días</span>
                      <button onClick={guardarVigencia}
                        style={{ padding: "4px 8px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>✓</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditandoVigencia(true)}
                      style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "var(--accent)", background: "none", border: "1px dashed var(--accent-border)", borderRadius: 5, padding: "2px 8px", cursor: "pointer" }}>
                      {p.diasVigencia || 15} días
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Creado</span>
                  <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: "var(--text-secondary)" }}>{fmtFecha(parseInt(id))}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Vencimiento</span>
                  <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: vencido ? "#e07070" : porVencer ? "#c8a02a" : "var(--text-secondary)", fontWeight: 700 }}>
                    {fmtFecha(parseInt(id) + (p.diasVigencia || 15) * 86400000)}
                  </span>
                </div>
                {estadoVigencia && (
                  <div style={{
                    padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: vencido ? "rgba(200,60,60,0.12)" : porVencer ? "rgba(200,160,42,0.12)" : "rgba(100,180,80,0.10)",
                    color: vencido ? "#e07070" : porVencer ? "#c8a02a" : "#7ecf8a",
                    border: `1px solid ${vencido ? "rgba(200,60,60,0.30)" : porVencer ? "rgba(200,160,42,0.30)" : "rgba(100,180,80,0.20)"}`,
                  }}>
                    {vencido
                      ? `⚠ Vencido hace ${Math.abs(diasRestantes)} días. Actualizá el precio antes de reenviar.`
                      : porVencer
                      ? `⏳ Vence en ${diasRestantes} días. Hacé seguimiento con el cliente.`
                      : `✅ Vigente por ${diasRestantes} días más.`}
                  </div>
                )}
                {!estadoVigencia && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                    La vigencia aplica cuando el presupuesto está en estado Nuevo o Enviado.
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

function ResumenMensual({ entries }) {
  const [expandido, setExpandido] = useState(true);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  // Agrupar cobros por mes (YYYY-MM)
  const porMes = {};
  entries.forEach(([id, p]) => {
    // Presupuesto creado en ese mes
    const mesCreado = new Date(parseInt(id)).toISOString().slice(0, 7);
    if (!porMes[mesCreado]) porMes[mesCreado] = { presupuestado: 0, cobrado: 0, trabajos: 0 };
    porMes[mesCreado].presupuestado += p.total || 0;
    porMes[mesCreado].trabajos += 1;

    // Cobros registrados en sus respectivos meses
    (p.cobros || []).forEach(c => {
      const mesCobro = new Date(c.fecha).toISOString().slice(0, 7);
      if (!porMes[mesCobro]) porMes[mesCobro] = { presupuestado: 0, cobrado: 0, trabajos: 0 };
      porMes[mesCobro].cobrado += c.monto || 0;
    });
  });

  const todosLosMeses = Object.keys(porMes).sort().reverse();
  const meses = todosLosMeses.slice(0, mostrarTodos ? todosLosMeses.length : 3);
  if (todosLosMeses.length === 0) return null;

  const fmtMes = (ym) => {
    const [y, m] = ym.split("-");
    const nombres = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${nombres[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <button
        onClick={() => setExpandido(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 18px",
          background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
          borderBottom: expandido ? "1px solid var(--border)" : "none"
        }}
      >
        <span style={{ fontSize: 14 }}>📊</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-secondary)", flex: 1 }}>
          Resumen mensual
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{expandido ? "▲ Ocultar" : "▼ Ver"}</span>
      </button>

      {expandido && (
        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Encabezados */}
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 50px 50px", gap: 12, paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>
            {["Mes", "Presupuestado", "Cobrado", "%", "Trab."].map(h => (
              <span key={h} style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontWeight: 700 }}>{h}</span>
            ))}
          </div>
          {meses.map(ym => {
            const d = porMes[ym];
            const pct = d.presupuestado > 0 ? Math.min(100, Math.round((d.cobrado / d.presupuestado) * 100)) : 0;
            const pctColor = pct >= 80 ? "#7ecf8a" : pct >= 40 ? "#c8a02a" : "#e07070";
            return (
              <div key={ym} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 50px 50px", gap: 12, alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--separator)" }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>{fmtMes(ym)}</span>
                <div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{fmtPeso(d.presupuestado)}</div>
                  <div style={{ height: 3, background: "var(--bg-subtle)", borderRadius: 999, marginTop: 3 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pctColor, borderRadius: 999, transition: "width 0.4s" }} />
                  </div>
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(d.cobrado)}</div>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: pctColor, textAlign: "center" }}>{pct}%</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>{d.trabajos}</span>
              </div>
            );
          })}
          {todosLosMeses.length > 3 && (
            <button
              onClick={() => setMostrarTodos(v => !v)}
              style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "4px 0", marginTop: 2 }}
            >
              {mostrarTodos ? "▲ Ver menos" : `▼ Ver todos (${todosLosMeses.length} meses)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PanelCaja({ presupuestos, onActualizar, modulos, costos, cajaPresId, onClearCajaPresId }) {
  const entries = Object.entries(presupuestos).sort((a, b) => b[0] - a[0]);

  // NAVEGACIÓN - Enlace Presupuesto a Caja
  // Si cajaPresId está seteado, hace scroll a esa fila y la marca para auto-abrir.
  // Se limpia después del primer render para no interferir con la navegación normal.
  const [autoAbrirId, setAutoAbrirId] = useState(cajaPresId || null);
  useEffect(() => {
    if (cajaPresId) {
      setAutoAbrirId(cajaPresId);
      // Scroll suave a la fila después de renderizar
      setTimeout(() => {
        const el = document.getElementById(`filacaja-${cajaPresId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        onClearCajaPresId && onClearCajaPresId();
      }, 150);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajaPresId]);

  // Métricas globales
  const totalPresupuestado = entries.reduce((a, [, p]) => a + p.total, 0);
  const totalCobrado = entries.reduce((a, [, p]) => {
    const cobros = p.cobros || [];
    return a + cobros.reduce((b, c) => b + c.monto, 0);
  }, 0);
  const totalPendiente = entries.reduce((a, [, p]) => {
    if (p.estado === "entregado" || p.estado === "aceptado" || p.estado === "produccion") {
      const cobros = p.cobros || [];
      const cobrado = cobros.reduce((b, c) => b + c.monto, 0);
      return a + Math.max(0, p.total - cobrado);
    }
    return a;
  }, 0);
  const vencidos = entries.filter(([id, p]) => {
    if (p.estado !== "enviado" && p.estado !== "nuevo") return false;
    const dias = Math.floor((Date.now() - parseInt(id)) / 86400000);
    return dias > (p.diasVigencia || 15);
  }).length;

  const metricaStyle = {
    background: "var(--bg-surface)", border: "1px solid var(--border)",
    borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 140,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Cobros, márgenes y vencimientos de tus trabajos">
        Caja
      </SectionTitle>

      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", borderRadius: 12, border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💵</div>
          <p style={{ fontSize: 14 }}>No hay trabajos guardados todavía.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>Guardá un presupuesto desde <strong style={{ color: "var(--accent)" }}>📋 Presupuesto</strong> para gestionarlo acá.</p>
        </div>
      ) : (
        <>
          {/* Métricas resumen */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="anim-fadeup stagger-1" style={{ ...metricaStyle, borderTop: "3px solid var(--accent)" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: 6 }}>Total presupuestado</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 900, color: "var(--accent)" }}>{fmtPeso(totalPresupuestado)}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 300 }}>{entries.length} trabajos</div>
            </div>
            <div className="anim-fadeup stagger-2" style={{ ...metricaStyle, borderTop: "3px solid #7ecf8a" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: 6 }}>Total cobrado</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 900, color: "#7ecf8a" }}>{fmtPeso(totalCobrado)}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 300 }}>
                {totalPresupuestado !== 0 ? Math.round((totalCobrado / Math.abs(totalPresupuestado)) * 100) : 0}% del total
              </div>
            </div>
            <div className="anim-fadeup stagger-3" style={{ ...metricaStyle, borderTop: "3px solid #e07070" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: 6 }}>Pendiente de cobro</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 900, color: "#e07070" }}>{fmtPeso(totalPendiente)}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 300 }}>en trabajos activos</div>
            </div>
            {vencidos > 0 && (
              <div className="anim-fadeup stagger-4" style={{ ...metricaStyle, borderTop: "3px solid #c8a02a" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: 6 }}>Presupuestos vencidos</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 900, color: "#c8a02a" }}>{vencidos}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 300 }}>requieren seguimiento</div>
              </div>
            )}
          </div>

          {/* Dashboard resumen mensual */}
          <ResumenMensual entries={entries} />

          {/* Lista de trabajos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {entries.map(([id, p]) => (
              <FilaCaja key={id} id={id} p={p} onActualizar={onActualizar} modulos={modulos} costos={costos} autoAbrir={autoAbrirId === id} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 14. MI TALLER
// ══════════════════════════════════════════════════════════════════
// ── PanelPerfil ───────────────────────────────────────────────────

export { PanelCaja };
