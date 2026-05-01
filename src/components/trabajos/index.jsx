import React, { useState } from 'react';
import { Card, SectionTitle } from '../ui/index.jsx';
import { fmtPeso, fmtFecha, resolverDim, calcularModulo, leerPerfil } from '../../utils.js';
import { CATEGORIAS_DEFAULT, ESTADOS_TRABAJO } from '../../constants.js';
import { generarFichaObra } from '../presupuesto/index.jsx';


function AccionesTrabajo({ id, p, onCambiarEstado, onEliminar, onCargar, compact }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const estadoActual = ESTADOS_TRABAJO.findIndex(e => e.id === (p.estado || "nuevo"));
  const prev = ESTADOS_TRABAJO[estadoActual - 1];
  const next = ESTADOS_TRABAJO[estadoActual + 1];
  const btnBase = {
    fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700,
    borderRadius: 6, cursor: "pointer", padding: compact ? "4px 9px" : "5px 12px",
    transition: "all 0.15s", outline: "none"
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
      {prev && (
        <button onClick={() => onCambiarEstado(id, prev.id)} title={`← ${prev.label}`}
          style={{ ...btnBase, background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-subtle)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
          ←
        </button>
      )}
      {next && (
        <button onClick={() => onCambiarEstado(id, next.id)} title={`${next.label} →`}
          style={{ ...btnBase, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,175,55,0.20)"; e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--accent-soft)"; e.currentTarget.style.borderColor = "var(--accent-border)"; }}>
          →
        </button>
      )}
      {confirmDel ? (
        <>
          <button onClick={() => { onEliminar(id); setConfirmDel(false); }}
            style={{ ...btnBase, background: "rgba(200,60,60,0.18)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070" }}>✓</button>
          <button onClick={() => setConfirmDel(false)}
            style={{ ...btnBase, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
        </>
      ) : (
        <button onClick={() => setConfirmDel(true)}
          style={{ ...btnBase, background: "transparent", border: "1px solid rgba(200,60,60,0.25)", color: "#e07070" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,60,60,0.12)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>×</button>
      )}
    </div>
  );
}

function TarjetaKanban({ id, p, onCambiarEstado, onEliminar, onCargar, modulos, costos }) {
  const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
  const esProduccion = (p.estado || "nuevo") === "produccion";
  return (
    <div
      className="hover-lift anim-fadeup"
      draggable
      onDragStart={e => {
        e.dataTransfer.setData("presupuestoId", id);
        e.dataTransfer.effectAllowed = "move";
        setTimeout(() => { e.target.style.opacity = "0.45"; }, 0);
      }}
      onDragEnd={e => { e.target.style.opacity = "1"; }}
      style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10,
        padding: "12px 13px", marginBottom: 8, cursor: "grab",
        boxShadow: "var(--shadow-sm)", borderLeft: `3px solid ${est.color}`
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-strong)"}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.borderLeftColor = est.color; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: est.color, flexShrink: 0, marginTop: 4, boxShadow: `0 0 6px ${est.color}80` }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>{p.nombre}</span>
      </div>
      {p.cliente && p.cliente.nombre && (
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2, paddingLeft: 15, fontWeight: 300 }}>
          👤 {p.cliente.nombre}
          {p.cliente.tel && <span style={{ color: "var(--text-muted)", marginLeft: 5 }}>· {p.cliente.tel}</span>}
        </div>
      )}
      <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", marginBottom: 10, paddingLeft: 15, fontWeight: 300 }}>
        {fmtFecha(parseInt(id))} · {p.items.length} mód.
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(p.total)}</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          {esProduccion && modulos && costos && (
            <button onClick={() => generarFichaObra(id, p, modulos, costos, leerPerfil())}
              style={{ padding: "4px 9px", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(200,80,48,0.15)", border: "1px solid rgba(200,80,48,0.35)", color: "#c85030", borderRadius: 5, cursor: "pointer" }}>
              📋 Ficha
            </button>
          )}
          <AccionesTrabajo id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} compact />
        </div>
      </div>
    </div>
  );
}

function FilaLista({ id, p, onCambiarEstado, onEliminar, onCargar, modulos, costos, onActualizarPresupuesto }) {
  const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
  const [expandido, setExpandido] = useState(false);
  const [tabActiva, setTabActiva] = useState("presupuesto");

  const tabs = [
    { id: "presupuesto", label: "Presupuesto", icon: "📋" },
    { id: "corte",       label: "Corte",       icon: "✂" },
    { id: "modulos",     label: "Módulos",     icon: "🪵" },
    { id: "notas",       label: "Notas",       icon: "📝" },
    { id: "gastos",      label: "Gastos",      icon: "💸" },
    { id: "ficha",       label: "Ficha",       icon: "📄" },
  ];

  return (
    <div className="anim-fadeup" style={{
      border: `1px solid ${expandido ? "var(--accent-border)" : "var(--border)"}`,
      borderRadius: 10, overflow: "visible", transition: "border-color 0.18s",
      background: "var(--bg-surface)", marginBottom: 2
    }}>
      {/* Fila principal — click para expandir */}
      <div className="lista-fila" style={{
        display: "grid", gridTemplateColumns: "1fr 120px 130px auto",
        alignItems: "center", gap: 12, padding: "12px 16px",
        cursor: "pointer", transition: "background 0.12s",
        borderRadius: expandido ? "10px 10px 0 0" : 10,
        borderBottom: expandido ? "1px solid var(--border)" : "none"
      }}
        onClick={() => setExpandido(v => !v)}
        onMouseEnter={e => e.currentTarget.style.background = "var(--accent-soft)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", background: `${est.color}22`, color: est.color, border: `1px solid ${est.color}44`, borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>
              {est.icon} {est.label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 300 }}>
            {fmtFecha(parseInt(id))} · {p.items.length} mód.
            {p.cliente?.nombre && <span> · 👤 {p.cliente.nombre}</span>}
          </div>
          {/* Mobile row */}
          <div className="lista-mobile-row" style={{ display: "none", marginTop: 8, alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(p.total)}</span>
            <select value={p.estado || "nuevo"} onChange={e => { e.stopPropagation(); onCambiarEstado(id, e.target.value); }}
              onClick={e => e.stopPropagation()}
              style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "4px 6px", background: `${est.color}18`, border: `1px solid ${est.color}44`, color: est.color, borderRadius: 6, cursor: "pointer", outline: "none", fontWeight: 700 }}>
              {ESTADOS_TRABAJO.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
            </select>
          </div>
        </div>
        <div className="lista-desktop-col" style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: "#7ecf8a", textAlign: "right" }}>
          {fmtPeso(p.total)}
        </div>
        <select className="lista-desktop-col" value={p.estado || "nuevo"}
          onChange={e => { e.stopPropagation(); onCambiarEstado(id, e.target.value); }}
          onClick={e => e.stopPropagation()}
          style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "5px 6px", background: `${est.color}18`, border: `1px solid ${est.color}44`, color: est.color, borderRadius: 6, cursor: "pointer", outline: "none", fontWeight: 700 }}>
          {ESTADOS_TRABAJO.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
        </select>
        <div className="lista-desktop-col" onClick={e => e.stopPropagation()}>
          <AccionesTrabajo id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} compact />
        </div>
      </div>

      {/* Panel expandido */}
      {expandido && (
        <div style={{ padding: "0 0 16px 0" }}>
          {/* Tabs internas */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", padding: "0 16px" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTabActiva(t.id)} style={{
                padding: "10px 16px", background: "transparent", border: "none",
                borderBottom: `2px solid ${tabActiva === t.id ? "var(--accent)" : "transparent"}`,
                color: tabActiva === t.id ? "var(--accent)" : "var(--text-muted)",
                fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
                transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "16px 16px 0" }}>
            {tabActiva === "presupuesto" && (
              <TabPresupuestoTrabajo p={p} modulos={modulos} costos={costos} />
            )}
            {tabActiva === "corte" && (
              <TabCorteTrabajo p={p} modulos={modulos} costos={costos} />
            )}
            {tabActiva === "modulos" && (
              <TabModulosTrabajo id={id} p={p} modulos={modulos} costos={costos} onActualizar={onActualizarPresupuesto} />
            )}
            {tabActiva === "notas" && (
              <TabNotas id={id} p={p} onActualizar={onActualizarPresupuesto} />
            )}
            {tabActiva === "gastos" && (
              <TabGastos id={id} p={p} onActualizar={onActualizarPresupuesto} />
            )}
            {tabActiva === "ficha" && modulos && costos && (
              <div style={{ textAlign: "center", paddingTop: 8 }}>
                <button onClick={() => generarFichaObra(id, p, modulos, costos, leerPerfil())}
                  style={{
                    padding: "12px 28px", borderRadius: 8, cursor: "pointer",
                    background: "rgba(200,80,48,0.12)", border: "1px solid rgba(200,80,48,0.35)",
                    color: "#c85030", fontFamily: "'DM Mono',monospace", fontSize: 12,
                    fontWeight: 700, letterSpacing: "0.08em", transition: "all 0.15s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(200,80,48,0.22)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(200,80,48,0.12)"}>
                  📋 Generar Ficha de Obra — lista para imprimir o compartir
                </button>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10, fontFamily: "'DM Mono',monospace" }}>
                  Incluye módulos, lista de corte, materiales y estado de cobros
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tabs internas de FilaLista ────────────────────────────────────
function TabPresupuestoTrabajo({ p, modulos, costos }) {
  if (!p.items || p.items.length === 0) return <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Sin módulos cargados.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {p.items.map((item, idx) => {
        const modBase = modulos[item.codigo];
        if (!modBase) return null;
        const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
        const modUsado = { ...modBase, dimensiones: dims };
        const calc = calcularModulo(modUsado, costos);
        return (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-subtle)", borderRadius: 8, gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>{item.codigo}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginLeft: 8 }}>{modBase.nombre}</span>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
                {dims.ancho}×{dims.profundidad}×{dims.alto} mm · ×{item.cantidad}
              </div>
            </div>
            {calc && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#7ecf8a", flexShrink: 0 }}>{fmtPeso(calc.total * item.cantidad)}</span>}
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--separator)" }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 900, color: "#7ecf8a" }}>{fmtPeso(p.total)}</span>
      </div>
    </div>
  );
}

function TabCorteTrabajo({ p, modulos, costos }) {
  if (!p.items || p.items.length === 0) return <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Sin módulos cargados.</div>;
  const piezas = [];
  p.items.forEach(item => {
    const modBase = modulos[item.codigo];
    if (!modBase) return;
    const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
    const modUsado = { ...modBase, dimensiones: dims };
    const matDef = costos.materiales.find(m => m.tipo === modUsado.material) || costos.materiales[0];
    const esp = matDef?.espesor || 18;
    const dimMap = { ancho: dims.ancho, profundidad: dims.profundidad, alto: dims.alto };
    modUsado.piezas.forEach(pz => {
      const d1 = pz.especial ? (parseInt(pz.dimLibre1)||0) : Math.round(resolverDim(dimMap[pz.usaDim], pz.offsetEsp, pz.offsetMm, pz.divisor||1, esp));
      const d2 = pz.especial ? (parseInt(pz.dimLibre2)||0) : Math.round(resolverDim(dimMap[pz.usaDim2], pz.offsetEsp2, pz.offsetMm2, pz.divisor2||1, esp));
      piezas.push({ nombre: pz.nombre, modulo: `${item.codigo} ${modBase.nombre}`, d1, d2, cant: (pz.cantidad||1)*(item.cantidad||1) });
    });
  });
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "var(--accent-soft)" }}>
            {["Módulo","Pieza","Alto","Ancho","Cant"].map(h => (
              <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, borderBottom: "1px solid var(--border)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {piezas.map((pz, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--separator)" }}>
              <td style={{ padding: "6px 10px", fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>{pz.modulo}</td>
              <td style={{ padding: "6px 10px", fontWeight: 600, color: "var(--text-primary)" }}>{pz.nombre}</td>
              <td style={{ padding: "6px 10px", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#7ecf8a" }}>{pz.d1}</td>
              <td style={{ padding: "6px 10px", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#7ecf8a" }}>{pz.d2}</td>
              <td style={{ padding: "6px 10px", fontFamily: "'DM Mono',monospace", fontWeight: 900, color: "var(--accent)" }}>×{pz.cant}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabModulosTrabajo({ id, p, modulos, costos, onActualizar }) {
  const [editandoIdx, setEditandoIdx] = useState(null);
  const [dimsEdit, setDimsEdit] = useState({});

  const abrirEdit = (idx, item) => {
    const modBase = modulos[item.codigo];
    const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase?.dimensiones || { ancho: 600, profundidad: 550, alto: 700 };
    setDimsEdit({ ...dims });
    setEditandoIdx(idx);
  };

  const guardarDims = (idx, item) => {
    const keyId = `${item.codigo}-${item.id || 0}`;
    const nuevoOverride = { ...(p.dimOverride || {}), [keyId]: { ...dimsEdit } };
    onActualizar(id, { dimOverride: nuevoOverride });
    setEditandoIdx(null);
  };

  const inp = { fontFamily: "'DM Mono',monospace", fontSize: 13, padding: "6px 9px", background: "var(--bg-base)", border: "1px solid var(--accent-border)", color: "var(--text-primary)", borderRadius: 6, outline: "none", width: 80, textAlign: "center" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
        Los cambios aplican solo a este presupuesto. El catálogo no se modifica.
      </p>
      {p.items.map((item, idx) => {
        const modBase = modulos[item.codigo];
        if (!modBase) return null;
        const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
        const estaEditando = editandoIdx === idx;
        const cat = CATEGORIAS_DEFAULT.find(c => c.id === (modBase.categoria || "otros")) || CATEGORIAS_DEFAULT[5];

        return (
          <div key={idx} style={{
            background: estaEditando ? "var(--accent-soft)" : "var(--bg-subtle)",
            border: `1px solid ${estaEditando ? "var(--accent-border)" : "var(--border)"}`,
            borderRadius: 10, padding: "12px 14px", transition: "all 0.15s"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: estaEditando ? 14 : 0, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, background: `${cat.color}20`, color: cat.color, border: `1px solid ${cat.color}30`, borderRadius: 4, padding: "1px 7px", fontFamily: "'DM Mono',monospace" }}>
                {cat.icon} {item.codigo}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{modBase.nombre}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--text-muted)" }}>
                {dims.ancho}×{dims.profundidad}×{dims.alto} mm · ×{item.cantidad}
              </span>
              {!estaEditando && (
                <button onClick={() => abrirEdit(idx, item)}
                  style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                  ✎ Editar dimensiones
                </button>
              )}
            </div>

            {estaEditando && (
              <div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
                  {["ancho", "profundidad", "alto"].map(dim => (
                    <div key={dim} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                      <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{dim}</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input type="number" value={dimsEdit[dim]} onChange={e => setDimsEdit(d => ({ ...d, [dim]: parseInt(e.target.value) || 0 }))}
                          style={inp} />
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>mm</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => guardarDims(idx, item)}
                    style={{ padding: "7px 18px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                    ✓ Guardar
                  </button>
                  <button onClick={() => setEditandoIdx(null)}
                    style={{ padding: "7px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    Cancelar
                  </button>
                  {p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`] && (
                    <button onClick={() => {
                      const keyId = `${item.codigo}-${item.id || 0}`;
                      const nuevoOverride = { ...(p.dimOverride || {}) };
                      delete nuevoOverride[keyId];
                      onActualizar(id, { dimOverride: nuevoOverride });
                      setEditandoIdx(null);
                    }}
                      style={{ padding: "7px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid rgba(200,60,60,0.25)", color: "#e07070" }}>
                      ↩ Restaurar original
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
// ── TabNotas ─────────────────────────────────────────────────────
function TabNotas({ id, p, onActualizar }) {
  const [nota, setNota] = useState(p.nota || "");
  const [guardado, setGuardado] = useState(false);

  const guardar = () => {
    onActualizar(id, { nota });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <textarea
        value={nota}
        onChange={e => { setNota(e.target.value); setGuardado(false); }}
        placeholder="Anotá detalles del trabajo, medidas especiales, materiales a pedir, contactos..."
        style={{
          width: "100%", minHeight: 120, padding: "10px 12px", boxSizing: "border-box",
          fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, lineHeight: 1.6,
          background: "var(--bg-base)", border: "1px solid var(--border)",
          color: "var(--text-primary)", borderRadius: 8, outline: "none",
          resize: "vertical", transition: "border-color 0.15s"
        }}
        onFocus={e => { e.target.style.borderColor = "var(--accent-border)"; }}
        onBlur={e => { e.target.style.borderColor = "var(--border)"; }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={guardar} style={{
          padding: "7px 18px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace",
          fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)",
          border: "1px solid var(--accent-border)", color: "var(--accent)"
        }}>
          ✓ Guardar nota
        </button>
        {guardado && (
          <span style={{ fontSize: 11, color: "#7ecf8a", fontFamily: "'DM Mono',monospace" }}>✓ Guardado</span>
        )}
      </div>
    </div>
  );
}

// ── TabGastos ─────────────────────────────────────────────────────
function TabGastos({ id, p, onActualizar }) {
  const gastos = p.gastos || [];
  const [form, setForm] = useState({
    concepto: "",
    monto: "",
    fecha: new Date().toISOString().slice(0, 10)
  });

  const agregar = () => {
    if (!form.concepto.trim() || !form.monto) return;
    const nuevos = [...gastos, { id: Date.now(), ...form, monto: parseFloat(form.monto) || 0 }];
    onActualizar(id, { gastos: nuevos });
    setForm({ concepto: "", monto: "", fecha: new Date().toISOString().slice(0, 10) });
  };

  const eliminar = (gastoId) => {
    onActualizar(id, { gastos: gastos.filter(g => g.id !== gastoId) });
  };

  const total = gastos.reduce((s, g) => s + (g.monto || 0), 0);

  const inputSt = {
    width: "100%", boxSizing: "border-box", padding: "8px 10px",
    fontFamily: "'DM Mono',monospace", fontSize: 13,
    background: "var(--bg-base)", border: "1px solid var(--border)",
    color: "var(--text-primary)", borderRadius: 7, outline: "none"
  };
  const labelSt = {
    fontSize: 10, fontFamily: "'DM Mono',monospace", textTransform: "uppercase",
    letterSpacing: "0.1em", color: "var(--text-muted)", display: "block", marginBottom: 4
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Formulario agregar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px auto", gap: 8, alignItems: "flex-end" }}>
        <div>
          <label style={labelSt}>Concepto</label>
          <input value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
            placeholder="Material, flete, mano de obra..." style={inputSt}
            onKeyDown={e => e.key === "Enter" && agregar()} />
        </div>
        <div>
          <label style={labelSt}>Monto $</label>
          <input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
            placeholder="0" style={inputSt} onKeyDown={e => e.key === "Enter" && agregar()} />
        </div>
        <div>
          <label style={labelSt}>Fecha</label>
          <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
            style={{ ...inputSt, fontSize: 12 }} />
        </div>
        <button onClick={agregar} style={{
          padding: "8px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace",
          fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)",
          border: "1px solid var(--accent-border)", color: "var(--accent)", whiteSpace: "nowrap"
        }}>
          + Agregar
        </button>
      </div>

      {/* Lista de gastos */}
      {gastos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
          Sin gastos registrados
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {gastos.map(g => (
            <div key={g.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
              background: "var(--bg-subtle)", borderRadius: 7, border: "1px solid var(--border)"
            }}>
              <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", flexShrink: 0 }}>{g.fecha}</span>
              <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.concepto}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#e07070", flexShrink: 0 }}>{fmtPeso(g.monto)}</span>
              <button onClick={() => eliminar(g.id)} style={{
                background: "transparent", border: "none", color: "var(--text-muted)",
                cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1
              }}>×</button>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>Total gastos</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color: "#e07070" }}>{fmtPeso(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TableroKanban({ presupuestos, onCambiarEstado, onEliminar, onCargar, modulos, costos, onActualizarPresupuesto }) {
  const [vistaTab, setVistaTab] = useState("lista");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [orden, setOrden] = useState("fecha_desc");

  const ORDENES = [
    { id: "fecha_desc",  label: "Más reciente",  fn: (a, b) => b[0] - a[0] },
    { id: "fecha_asc",   label: "Más antiguo",   fn: (a, b) => a[0] - b[0] },
    { id: "total_desc",  label: "Mayor monto",   fn: (a, b) => b[1].total - a[1].total },
    { id: "total_asc",   label: "Menor monto",   fn: (a, b) => a[1].total - b[1].total },
    { id: "nombre_asc",  label: "Nombre A→Z",    fn: (a, b) => a[1].nombre.localeCompare(b[1].nombre) },
  ];

  const fnOrden = ORDENES.find(o => o.id === orden)?.fn || ORDENES[0].fn;
  const entries = Object.entries(presupuestos).sort(fnOrden);
  const filtradas = filtroEstado === "todos" ? entries : entries.filter(([, p]) => (p.estado || "nuevo") === filtroEstado);

  const btnVista = (id, icon, label) => (
    <button onClick={() => setVistaTab(id)} style={{
      padding: "6px 14px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace",
      fontWeight: 700, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6,
      background: vistaTab === id ? "var(--accent-soft)" : "transparent",
      border: `1px solid ${vistaTab === id ? "var(--accent-border)" : "var(--border)"}`,
      color: vistaTab === id ? "var(--accent)" : "var(--text-muted)"
    }}>{icon} {label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <SectionTitle sub="Seguí el avance de cada trabajo de un vistazo">
          Tablero de Trabajos
        </SectionTitle>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
          {/* Selector de orden */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Ordenar</span>
            <select value={orden} onChange={e => setOrden(e.target.value)} style={{
              fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
              padding: "6px 10px", borderRadius: 6, cursor: "pointer", outline: "none",
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", transition: "border-color 0.15s"
            }}
              onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            >
              {ORDENES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          {btnVista("kanban", "⊞", "Kanban")}
          {btnVista("lista", "☰", "Lista")}
        </div>
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", borderRadius: 12, border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <p style={{ fontSize: 14 }}>No hay trabajos guardados todavía.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>Guardá un presupuesto desde <strong style={{ color: "var(--accent)" }}>📋 Presupuesto</strong> para verlo acá.</p>
        </div>
      ) : (
        <>
          {/* Contadores siempre visibles */}
          <div className="filtros-estado" style={{ display: "flex", gap: 6 }}>
            {ESTADOS_TRABAJO.map(est => {
              const count = entries.filter(([, p]) => (p.estado || "nuevo") === est.id).length;
              const active = filtroEstado === est.id;
              return (
                <button key={est.id} onClick={() => setFiltroEstado(active ? "todos" : est.id)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                    background: active ? `${est.color}25` : count > 0 ? `${est.color}10` : "var(--bg-surface)",
                    border: `1px solid ${active ? est.color : count > 0 ? est.color + "44" : "var(--border)"}`,
                    transition: "all 0.15s"
                  }}>
                  <span style={{ fontSize: 14 }}>{est.icon}</span>
                  <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 900, color: count > 0 ? est.color : "var(--text-muted)", lineHeight: 1 }}>{count}</span>
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: active ? est.color : "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{est.label}</span>
                </button>
              );
            })}
            {filtroEstado !== "todos" && (
              <button onClick={() => setFiltroEstado("todos")}
                style={{ padding: "7px 12px", borderRadius: 8, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>
                × Ver todos
              </button>
            )}
          </div>

          {/* ── Vista KANBAN ── */}
          {vistaTab === "kanban" && (
            <div className="kanban-board" style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: 8 }}>
              {ESTADOS_TRABAJO.filter(est => filtroEstado === "todos" || filtroEstado === est.id).map(est => {
                const cards = entries.filter(([, p]) => (p.estado || "nuevo") === est.id);
                return (
                  <div key={est.id} className="kanban-col" style={{ flex: "0 0 210px", minWidth: 210 }}>
                    <div className="kanban-col-header" style={{
                      padding: "9px 13px", borderRadius: "10px 10px 0 0",
                      background: `${est.color}20`, border: `1px solid ${est.color}40`, borderBottom: "none",
                      display: "flex", alignItems: "center", gap: 7
                    }}>
                      <span style={{ fontSize: 15 }}>{est.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: est.color, fontFamily: "'DM Mono',monospace", flex: 1 }}>{est.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace", background: `${est.color}30`, color: est.color, borderRadius: 999, padding: "1px 7px" }}>{cards.length}</span>
                    </div>
                    <div
                      style={{ minHeight: 80, maxHeight: 520, overflowY: "auto", padding: "8px 8px 4px", border: `1px solid ${est.color}40`, borderRadius: "0 0 10px 10px", background: "var(--bg-subtle)", transition: "background 0.15s" }}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = `${est.color}18`; }}
                      onDragLeave={e => { e.currentTarget.style.background = "var(--bg-subtle)"; }}
                      onDrop={e => {
                        e.currentTarget.style.background = "var(--bg-subtle)";
                        const pid = e.dataTransfer.getData("presupuestoId");
                        if (pid && (presupuestos[pid]?.estado || "nuevo") !== est.id) {
                          onCambiarEstado(pid, est.id);
                        }
                      }}
                    >
                      {cards.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>Sin trabajos</div>
                      ) : (
                        cards.map(([id, p]) => (
                          <TarjetaKanban key={id} id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} modulos={modulos} costos={costos} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Vista LISTA ── */}
          {vistaTab === "lista" && (
            <Card className="rsp-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="lista-header" style={{ display: "grid", gridTemplateColumns: "1fr 120px 130px auto", gap: 12, padding: "9px 16px", background: "var(--accent-soft)", borderBottom: "1px solid var(--border)" }}>
                {["Trabajo / Cliente", "Total", "Estado", "Acciones"].map(h => (
                  <div key={h} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>{h}</div>
                ))}
              </div>
              {filtradas.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)", fontSize: 13 }}>No hay trabajos en este estado.</div>
              ) : (
                filtradas.map(([id, p]) => (
                  <FilaLista key={id} id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} modulos={modulos} costos={costos} onActualizarPresupuesto={onActualizarPresupuesto} />
                ))
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 13. CAJA
// ══════════════════════════════════════════════════════════════════
// ── PanelCaja ─────────────────────────────────────────────────────

export { TableroKanban };
