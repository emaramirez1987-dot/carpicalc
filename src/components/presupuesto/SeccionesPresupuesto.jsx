import React, { useState } from 'react';
import { fmtPeso } from '../../utils.js';

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
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "var(--color-positive)" }}>{fmtPeso(x.subtotal)}</span>
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
        {costosDirectos.length > 0 && <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--color-positive)" }}>{fmtPeso(totalSeccion)}</span>}
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
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "var(--color-positive)" }}>{fmtPeso(x.monto)}</span>
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
          <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--color-positive)" }}>
            {fmtPeso(adicionales.reduce((a, x) => a + x.monto, 0))}
          </span>
        )}
      </div>
      {innerAd}
    </div>
  );
}

export { SeccionCostosDirectos, SeccionAdicionales };