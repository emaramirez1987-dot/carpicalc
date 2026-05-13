import React, { useState, useMemo } from 'react';
import { fmtPeso, fmtFecha, recalcularTotalPresupuesto, presupuestoTieneContenido, presupuestoNecesitaActualizacion } from '../../utils.js';
import { ESTADOS_TRABAJO } from '../../constants.js';

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
  costosVersion = 0,
  onActualizarPresupuesto,
  modulos,
  costos
}) {
  const [abierto, setAbierto] = useState(false);
  const [confirmDelId, setConfirmDelId] = useState(null);
  const [busquedaPres, setBusquedaPres] = useState("");
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
                        <span style={{ color: "var(--color-positive)", fontWeight: 700, marginLeft: 8 }}>{fmtPeso(p.total)}</span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center", flexWrap: "wrap", position: "relative" }}>
                      <button onClick={() => { onCargar(p, id); setAbierto(false); }}
                        style={{ padding: "4px 10px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                        ✎ Editar
                      </button>
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
                    <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--color-positive)" }}>
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

export default GestorPresupuestos;