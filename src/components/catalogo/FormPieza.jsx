// ════════════════════════════════════════════════════════════════════════════
// FormPieza.jsx — formulario inline de edición/creación de una pieza
// ════════════════════════════════════════════════════════════════════════════
//
// Vive dentro del FormModulo como columna izquierda fija. Maneja:
//   - Identificación (nombre + cantidad + sugerencias)
//   - Dimensiones (parametrizadas o libres) vía DimRow/DimRowLibre
//   - Variables del módulo (panel desplegable)
//   - Posición 3D opcional (posFormulas)
//   - Parametrización (zona / condition / repeat — Fase 6.5)
//
// Extraído de FormModulo.jsx (523 líneas) para mantener ese archivo más
// liviano. Sin cambios de comportamiento.
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import { TextInput } from '../ui/index.jsx';
import { fmtNum, resolverDim, evaluarFormula, resolverVariables } from '../../utils.js';
import { ORIENTACIONES_3D } from '../visor3d/engine/buildPiezas3D.js';
import { piezasQueUsanVar } from '../../services/moduloService.js';
import { DimRowLibre } from './DimRowEditor.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Defaults canónicos de D1/D2 según orientación 3D — convención del editor:
//   horizontal (base, techo, estante): D1 va sobre eje X (= ancho), D2 sobre eje Z (= profundidad)
//   vertical   (laterales, divisores): D1 va sobre eje Y (= alto),  D2 sobre eje Z (= profundidad)
//   frente     (puertas, cajones):     D1 va sobre eje Y (= alto),  D2 sobre eje X (= ancho)
// Las etiquetas se muestran junto al input para que el autor no se confunda.
// ─────────────────────────────────────────────────────────────────────────────
const FORMULAS_POR_ORIENT = {
  horizontal: { f1: "ancho", f2: "profundidad", l1: "Largo (= ancho del módulo)", l2: "Profundidad" },
  vertical:   { f1: "alto",  f2: "profundidad", l1: "Alto (= alto del módulo)",   l2: "Profundidad" },
  frente:     { f1: "alto",  f2: "ancho",       l1: "Alto (= alto del módulo)",   l2: "Ancho (= ancho del módulo)" },
};
// Una fórmula se considera "canónica" (auto-reemplazable al cambiar orientación)
// si está vacía o coincide exactamente con uno de los nombres de variable base.
const ES_FORMULA_CANONICA = (v) => {
  const t = (v ?? "").trim();
  return t === "" || ["ancho", "alto", "profundidad"].includes(t);
};

function FormPieza({ fp, setFp, onCancelar, onConfirmar, editando, dims, espesor, nombresSugeridos, variables, onVarsUpdate, piezas, zonas = [], parametros = [] }) {
  const [mostrarSugeridos, setMostrarSugeridos] = useState(false);
  const [parametricoAbierto, setParametricoAbierto] = useState(
    !!(fp.zona || fp.condition || fp.repeat),
  );
  const tienePos3d = !!(fp.posFormulas?.x || fp.posFormulas?.y || fp.posFormulas?.z);
  const [pos3dAbierto, setPos3dAbierto] = useState(() => tienePos3d);
  const [varsAbierto, setVarsAbierto] = useState(false);
  const [agregandoVar, setAgregandoVar] = useState(false);
  const [nuevaVarNombre, setNuevaVarNombre] = useState("");
  const [confirmDeleteVar, setConfirmDeleteVar] = useState(null); // nombre de var pendiente de confirmación
  const [editandoVar, setEditandoVar] = useState(null); // nombre de var en modo edición (null = todas en lectura)
  const [valorEditando, setValorEditando] = useState(""); // valor temporal mientras edita

  // Click en una tile de orientación: toggle + auto-completar fórmulas si
  // están vacías o son canónicas (no editadas a mano).
  const aplicarOrientacion = (orientId) => {
    setFp(p => {
      const eraActiva = p.orientacion3d === orientId;
      const nueva = eraActiva ? undefined : orientId;
      if (!nueva || nueva === 'ignorar') return { ...p, orientacion3d: nueva };
      const def = FORMULAS_POR_ORIENT[nueva];
      if (!def) return { ...p, orientacion3d: nueva };
      return {
        ...p,
        orientacion3d: nueva,
        formula1: ES_FORMULA_CANONICA(p.formula1) ? def.f1 : p.formula1,
        formula2: ES_FORMULA_CANONICA(p.formula2) ? def.f2 : p.formula2,
      };
    });
  };

  // ── Click-to-insert: ref al input activo ────────────────────────────────
  const activeInputEl = useRef(null);
  const insertarVariable = (e, nombre) => {
    e.preventDefault(); // no quitar foco del input activo
    const el = activeInputEl.current;
    if (!el) return;
    const start  = el.selectionStart ?? el.value.length;
    const end    = el.selectionEnd   ?? el.value.length;
    const newVal = el.value.slice(0, start) + nombre + el.value.slice(end);
    // Trigger React synthetic onChange via native setter
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, newVal);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    setTimeout(() => { el.setSelectionRange(start + nombre.length, start + nombre.length); el.focus(); }, 0);
  };

  const baseVars = { ancho: dims.ancho || 0, alto: dims.alto || 0, profundidad: dims.profundidad || 0, esp: espesor };
  // Parámetros del módulo (no editables como variables) — se mergean con sus
  // defaults solo para EVALUAR fórmulas. No se muestran en la lista editable.
  const paramDefaults = Object.fromEntries(
    (parametros || []).filter(p => p.tipo !== 'formula').map(p => [p.id, p.def])
  );
  const allVars = { ...resolverVariables(variables, baseVars), ...paramDefaults };
  const resolvedCustomVars = resolverVariables(variables, baseVars);

  const d1 = fp.especial
    ? (parseInt(fp.dimLibre1) || 0)
    : fp.formula1
      ? (evaluarFormula(fp.formula1, allVars) ?? 0)
      : resolverDim(dims[fp.usaDim], parseInt(fp.offsetEsp) || 0, parseInt(fp.offsetMm) || 0, parseInt(fp.divisor) || 1, espesor);
  const d2 = fp.especial
    ? (parseInt(fp.dimLibre2) || 0)
    : fp.formula2
      ? (evaluarFormula(fp.formula2, allVars) ?? 0)
      : resolverDim(dims[fp.usaDim2], parseInt(fp.offsetEsp2) || 0, parseInt(fp.offsetMm2) || 0, parseInt(fp.divisor2) || 1, espesor);

  const f1Valida = fp.especial || !fp.formula1 || evaluarFormula(fp.formula1, allVars) !== null;
  const f2Valida = fp.especial || !fp.formula2 || evaluarFormula(fp.formula2, allVars) !== null;

  return (
    <div id="form-pieza" style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>

        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          borderRadius: 12, overflow: "hidden",
          border: editando ? "1px solid var(--accent-border)" : "1px solid var(--border)",
        }}>
          {/* Header */}
          <div style={{
            padding: "11px 16px",
            background: "rgba(255,255,255,0.10)",
            borderBottom: "1px solid rgba(200,160,42,0.25)",
            borderLeft: editando ? "3px solid var(--accent)" : "3px solid rgba(200,160,42,0.5)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: editando ? "var(--accent)" : "#c8a02a" }}>
              {editando ? "✎ Editando pieza" : "＋ Nueva pieza"}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {editando && (
                <>
                  <button onClick={onCancelar} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Mono',monospace", background: "rgba(200,60,60,0.12)", border: "1px solid rgba(200,60,60,0.35)", color: "#e08080" }}>
                    ✕ Cancelar
                  </button>
                  {onConfirmar && (
                    <button onClick={onConfirmar} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Mono',monospace", background: "rgba(200,160,42,0.18)", border: "1px solid rgba(200,160,42,0.50)", color: "#c8a02a" }}>
                      ✓ Actualizar
                    </button>
                  )}
                </>
              )}
              <button onClick={() => setFp(p => ({ ...p, especial: !p.especial }))}
                style={{ padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Mono',monospace", transition: "all 0.15s", background: fp.especial ? "rgba(212,175,55,0.18)" : "var(--bg-subtle)", border: `1px solid ${fp.especial ? "var(--accent-border)" : "var(--border)"}`, color: fp.especial ? "var(--accent)" : "var(--text-muted)" }}>
                ✦ {fp.especial ? "Medida libre" : "Libre"}
              </button>
            </div>
          </div>
          <div style={{ flex: 1, background: "var(--bg-surface)", padding: "18px 18px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Nombre + Cantidad */}
            <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
              <div style={{ position: "relative" }}>
                <TextInput label="Nombre" placeholder="Lateral, Base, Puerta..." value={fp.nombre}
                  onChange={(v) => setFp((p) => ({ ...p, nombre: v }))}
                  onFocus={() => setMostrarSugeridos(true)}
                  onBlur={() => setTimeout(() => setMostrarSugeridos(false), 150)}
                  small />
                {mostrarSugeridos && (nombresSugeridos || []).length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2, minWidth: 220 }}>
                    {(nombresSugeridos || []).map(n => (
                      <button key={n} onMouseDown={() => { setFp(p => ({ ...p, nombre: n })); setMostrarSugeridos(false); }}
                        style={{ padding: "3px 10px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.10em", fontFamily: "'DM Mono',monospace", opacity: 0.75 }}>Cantidad</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={() => setFp(p => ({ ...p, cantidad: Math.max(1, (parseInt(p.cantidad) || 1) - 1) }))}
                    style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <input type="number" value={fp.cantidad} min="1"
                    onChange={e => setFp(p => ({ ...p, cantidad: e.target.value }))}
                    style={{ width: 42, textAlign: "center", fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, padding: "5px 4px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--accent)", outline: "none" }} />
                  <button onClick={() => setFp(p => ({ ...p, cantidad: (parseInt(p.cantidad) || 1) + 1 }))}
                    style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
              </div>
            </div>

            {/* Orientación 3D */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flex: 1 }}>
                {ORIENTACIONES_3D.map(o => {
                  const isActive = fp.orientacion3d === o.id;
                  const isDanger = o.id === 'ignorar';
                  return (
                    <button
                      key={o.id}
                      onClick={() => aplicarOrientacion(o.id)}
                      style={{
                        padding: "4px 13px", borderRadius: 16, fontSize: 10, fontWeight: 500,
                        fontFamily: "'DM Mono',monospace", cursor: "pointer", transition: "all 0.15s",
                        letterSpacing: "0.04em",
                        background: isActive
                          ? (isDanger ? "rgba(200,60,60,0.15)" : "rgba(212,175,55,0.18)")
                          : "var(--bg-subtle)",
                        border: `1px solid ${isActive
                          ? (isDanger ? "rgba(200,60,60,0.45)" : "var(--accent-border)")
                          : "var(--border)"}`,
                        color: isActive
                          ? (isDanger ? "#e07070" : "var(--accent)")
                          : "var(--text-muted)",
                        boxShadow: isActive && !isDanger ? "0 0 10px rgba(212,175,55,0.20)" : "none",
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 9, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.10em", fontFamily: "'DM Mono',monospace", opacity: 0.75, whiteSpace: "nowrap" }}>
                Orientación 3D
              </div>
            </div>

            {!fp.especial && (
              <>
                {/* ── Variables del módulo — acordeón unificado ── */}
                {(() => {
                  const customVarEntries = Object.entries(variables || {});
                  // Solo vars BASE en los chips. Las custom se insertan
                  // clickeando su label "nombre =" en la fila editable (sin duplicar).
                  const varsDisp = [
                    { n: 'ancho',       v: dims.ancho || 0 },
                    { n: 'alto',        v: dims.alto  || 0 },
                    { n: 'profundidad', v: dims.profundidad || 0 },
                    { n: 'esp',         v: espesor },
                  ];
                  return (
                    <div style={{ border: "1px solid rgba(212,175,55,0.25)", borderRadius: 8, overflow: "hidden" }}>
                      {/* Header */}
                      <div style={{ display: "flex", alignItems: "center", background: "rgba(212,175,55,0.06)" }}>
                        <button onClick={() => setVarsAbierto(a => !a)}
                          style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                          <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", color: "var(--accent)" }}>
                            ⚡ Variables
                          </span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                            {customVarEntries.length > 0 ? `${customVarEntries.length} custom` : "ancho · alto · esp ..."} {varsAbierto ? "▲" : "▼"}
                          </span>
                        </button>
                        {onVarsUpdate && (
                          <button
                            onClick={() => { setVarsAbierto(true); setAgregandoVar(true); setNuevaVarNombre(''); }}
                            style={{ padding: "4px 10px", margin: "0 6px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px dashed rgba(212,175,55,0.40)", color: "var(--accent)", whiteSpace: "nowrap" }}>
                            + Agregar
                          </button>
                        )}
                      </div>

                      {varsAbierto && (
                        <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(212,175,55,0.12)", display: "flex", flexDirection: "column", gap: 8 }}>

                          {/* Form para agregar nueva variable */}
                          {agregandoVar && onVarsUpdate && (
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <input autoFocus value={nuevaVarNombre}
                                onChange={e => setNuevaVarNombre(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    const n = nuevaVarNombre.trim();
                                    if (n && !(n in (variables || {}))) { onVarsUpdate({ ...(variables || {}), [n]: '' }); setNuevaVarNombre(''); setAgregandoVar(false); }
                                  }
                                  if (e.key === 'Escape') { setAgregandoVar(false); setNuevaVarNombre(''); }
                                }}
                                placeholder="nombre (ej: luz)"
                                style={{ flex: 1, minWidth: 110, fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "5px 8px", background: "var(--bg-base)", border: "1px solid var(--accent-border)", borderRadius: 6, color: "var(--text-primary)", outline: "none" }} />
                              <button onClick={() => {
                                const n = nuevaVarNombre.trim();
                                if (n && !(n in (variables || {}))) { onVarsUpdate({ ...(variables || {}), [n]: '' }); setNuevaVarNombre(''); setAgregandoVar(false); }
                              }} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)" }}>
                                OK
                              </button>
                              <button onClick={() => { setAgregandoVar(false); setNuevaVarNombre(''); }}
                                style={{ padding: "5px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>✕</button>
                            </div>
                          )}

                          {/* Variables custom — solo lectura por default; modo edición tras click ✎ */}
                          {customVarEntries.length > 0 && onVarsUpdate && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {customVarEntries.map(([nombre, valor]) => {
                                const valStr  = typeof valor === 'number' ? String(valor) : (valor || '');
                                const valEval = resolvedCustomVars[nombre];
                                const evalStr = valEval != null ? String(Math.round(valEval * 10) / 10) : null;
                                const pendiente = confirmDeleteVar === nombre;
                                const enEdicion = editandoVar === nombre;
                                const usadas = pendiente ? piezasQueUsanVar(nombre, piezas) : [];

                                const confirmarEdicion = () => {
                                  onVarsUpdate({ ...(variables || {}), [nombre]: valorEditando });
                                  setEditandoVar(null);
                                };
                                const cancelarEdicion = () => { setEditandoVar(null); setValorEditando(""); };

                                return (
                                  <div key={nombre} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(212,175,55,0.07)", border: `1px solid ${enEdicion ? "rgba(212,175,55,0.55)" : "rgba(212,175,55,0.22)"}`, borderRadius: 7, padding: "5px 8px", transition: "border-color 0.15s" }}>
                                      <button
                                        onMouseDown={e => insertarVariable(e, nombre)}
                                        title={`Insertar "${nombre}" en la fórmula activa`}
                                        style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)", flexShrink: 0, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                                        {nombre} =
                                      </button>

                                      {enEdicion ? (
                                        <>
                                          <input
                                            autoFocus
                                            type="text"
                                            value={valorEditando}
                                            onChange={e => setValorEditando(e.target.value)}
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') confirmarEdicion();
                                              if (e.key === 'Escape') cancelarEdicion();
                                            }}
                                            style={{ flex: 1, minWidth: 60, fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, padding: "3px 6px", background: "var(--bg-base)", border: "1px solid rgba(212,175,55,0.45)", borderRadius: 5, color: "var(--text-primary)", outline: "none" }}
                                          />
                                          <button onClick={confirmarEdicion} title="Guardar (Enter)"
                                            style={{ padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)", flexShrink: 0 }}>
                                            ✓
                                          </button>
                                          <button onClick={cancelarEdicion} title="Cancelar (Esc)"
                                            style={{ padding: "2px 6px", borderRadius: 5, fontSize: 11, cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
                                            ✕
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          {/* Modo lectura — valor + evaluado */}
                                          <span style={{ flex: 1, minWidth: 60, fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, padding: "3px 6px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {valStr || <span style={{ color: "var(--text-muted)", fontWeight: 400, fontStyle: "italic" }}>(vacío)</span>}
                                          </span>
                                          {evalStr !== null && evalStr !== valStr && (
                                            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--color-positive)", fontWeight: 700, flexShrink: 0 }}>= {evalStr}</span>
                                          )}
                                          <button
                                            onClick={() => { setEditandoVar(nombre); setValorEditando(valStr); }}
                                            title="Editar valor"
                                            style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 11, padding: "2px 8px", borderRadius: 5, flexShrink: 0, fontFamily: "'DM Mono',monospace", transition: "all 0.15s" }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-border)"; e.currentTarget.style.color = "var(--accent)"; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                                            ✎
                                          </button>
                                          <button
                                            onClick={() => { setConfirmDeleteVar(nombre); }}
                                            title="Eliminar variable"
                                            style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "0 2px", opacity: 0.45, flexShrink: 0, transition: "opacity 0.15s" }}
                                            onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                                            onMouseLeave={e => { e.currentTarget.style.opacity = 0.45; }}>×</button>
                                        </>
                                      )}
                                    </div>
                                    {/* Confirmación de eliminación */}
                                    {pendiente && (
                                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "6px 10px", background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.30)", borderRadius: 7 }}>
                                        {usadas.length > 0 ? (
                                          <span style={{ fontSize: 10, color: "#e07070", fontFamily: "'DM Mono',monospace", flex: 1 }}>
                                            ⚠ Usada en: <strong>{usadas.map(p => p.nombre).join(', ')}</strong>
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", flex: 1 }}>
                                            ¿Eliminar <strong style={{ color: "var(--accent)" }}>{nombre}</strong>?
                                          </span>
                                        )}
                                        <button
                                          onClick={() => { const { [nombre]: _r, ...rest } = variables || {}; onVarsUpdate(rest); setConfirmDeleteVar(null); }}
                                          style={{ padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "rgba(200,60,60,0.20)", border: "1px solid rgba(200,60,60,0.45)", color: "#e07070" }}>
                                          Sí, eliminar
                                        </button>
                                        <button
                                          onClick={() => setConfirmDeleteVar(null)}
                                          style={{ padding: "3px 8px", borderRadius: 5, fontSize: 11, cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>Cancelar</button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Chips para insertar en fórmula */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>click para insertar en fórmula:</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {varsDisp.map(({ n, v }) => (
                                <button key={n} onMouseDown={e => insertarVariable(e, n)}
                                  style={{ padding: "3px 9px", borderRadius: 5, border: "1px solid rgba(212,175,55,0.30)", background: "rgba(212,175,55,0.08)", color: "var(--accent)", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                                  {n}
                                  <span style={{ fontWeight: 400, opacity: 0.6, fontSize: 10 }}>={v}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Fórmulas D1 y D2 — un solo recuadro, filas separadas por línea interna.
                    Las etiquetas y la sugerencia de "var esperada" dependen de la orientación
                    elegida arriba (horizontal / vertical / frente) — ver FORMULAS_POR_ORIENT. */}
                {(() => {
                  const orient = fp.orientacion3d;
                  const def = orient ? FORMULAS_POR_ORIENT[orient] : null;
                  // Warning: la fórmula no incluye la variable esperada para la orientación.
                  const advertir = (val, esperada) => {
                    if (!def || !esperada || !val) return null;
                    const t = String(val);
                    if (t.includes(esperada)) return null;
                    return `Para ${orient}, el D1/D2 suele usar "${esperada}"`;
                  };
                  const filas = [
                    { key: "formula1", valida: f1Valida, resultado: d1, label: def?.l1 || "D1 — Largo",  esperada: def?.f1 },
                    { key: "formula2", valida: f2Valida, resultado: d2, label: def?.l2 || "D2 — Ancho",  esperada: def?.f2 },
                  ];
                  return (
                    <div style={{ border: "1px solid rgba(200,160,42,0.15)", borderRadius: 8, overflow: "hidden" }}>
                      {filas.map(({ key, valida, resultado, label, esperada }, idx) => {
                        const warning = advertir(fp[key], esperada);
                        return (
                          <div key={key} style={{
                            padding: "8px 14px",
                            borderTop: idx > 0 ? "1px solid rgba(200,160,42,0.10)" : "none",
                          }}>
                            {/* Etiqueta dinámica según orientación */}
                            <div style={{
                              fontSize: 9, fontWeight: 500, color: "var(--text-muted)",
                              textTransform: "uppercase", letterSpacing: "0.10em",
                              fontFamily: "'DM Mono',monospace", opacity: 0.75,
                              marginBottom: 4,
                            }}>{label}</div>
                            {/* Input + valor evaluado */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <input
                                value={fp[key] || ""}
                                onChange={e => setFp(p => ({ ...p, [key]: e.target.value }))}
                                onFocus={e => { activeInputEl.current = e.target; }}
                                placeholder={esperada ? `ej: ${esperada}` : "ej: alto - 2 * esp"}
                                style={{
                                  flex: 1, fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 400,
                                  padding: "6px 10px", background: "var(--bg-base)", color: "var(--text-primary)",
                                  border: `1px solid ${!valida ? "rgba(224,112,112,0.6)" : "var(--border)"}`,
                                  borderRadius: 7, outline: "none", letterSpacing: "0.02em",
                                }}
                              />
                              <div style={{ textAlign: "right", minWidth: 58 }}>
                                {valida ? (
                                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 500, color: "var(--color-positive)", letterSpacing: "-0.01em" }}>
                                    {Math.round(resultado)}<span style={{ fontSize: 9, fontWeight: 400, color: "var(--text-muted)", marginLeft: 2 }}>mm</span>
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 10, color: "#e07070", fontFamily: "'DM Mono',monospace" }}>⚠ inv.</span>
                                )}
                              </div>
                            </div>
                            {/* Chips de variables — un click inserta en el input enfocado */}
                            <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                              {["ancho", "alto", "profundidad", "esp"].map(v => (
                                <button key={v}
                                  onMouseDown={(e) => insertarVariable(e, v)}
                                  title={`Insertar "${v}" en el input enfocado`}
                                  style={{
                                    padding: "1px 7px", borderRadius: 10, cursor: "pointer",
                                    fontFamily: "'DM Mono',monospace", fontSize: 9, fontWeight: 500,
                                    background: v === esperada ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
                                    border: `1px solid ${v === esperada ? "rgba(212,175,55,0.40)" : "var(--border)"}`,
                                    color: v === esperada ? "var(--accent)" : "var(--text-muted)",
                                    letterSpacing: "0.04em",
                                  }}>
                                  + {v}
                                </button>
                              ))}
                            </div>
                            {/* Warning sutil de inconsistencia con la orientación */}
                            {warning && (
                              <div style={{
                                marginTop: 5, fontSize: 9, color: "#c89530",
                                fontFamily: "'DM Mono',monospace", letterSpacing: "0.02em",
                                opacity: 0.85,
                              }}>
                                ⚠ {warning}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Preview resultado */}
                {(d1 > 0 || d2 > 0) && (
                  <div style={{ padding: "9px 14px", background: "rgba(126,207,138,0.07)", border: "1px solid rgba(126,207,138,0.18)", borderRadius: 8, display: "flex", gap: 20, alignItems: "center" }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "var(--color-positive-muted)" }}>
                      Medida real: <span style={{ color: "var(--color-positive)", fontWeight: 500 }}>{Math.round(d1)} × {Math.round(d2)} mm</span>
                    </span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--text-muted)" }}>
                      Área: <span style={{ fontWeight: 500 }}>{fmtNum((d1 * d2 * (parseInt(fp.cantidad) || 1)) / 1_000_000)} m²</span>
                    </span>
                  </div>
                )}

                {/* Acordeón: Posición 3D */}
                <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(100,180,255,0.15)" }}>
                  <button
                    onClick={() => setPos3dAbierto(v => !v)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: "rgba(100,180,255,0.04)", border: "none", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#6ab4e8" }}>
                        ƒ Posición 3D
                      </span>
                      {tienePos3d && (
                        <span style={{ fontSize: 9, background: "rgba(100,180,255,0.15)", color: "#6ab4e8", border: "1px solid rgba(100,180,255,0.30)", borderRadius: 4, padding: "1px 5px", fontFamily: "'DM Mono',monospace" }}>
                          custom
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 9, color: "var(--text-muted)", opacity: 0.5 }}>{pos3dAbierto ? "▲" : "▼"}</span>
                  </button>
                  {pos3dAbierto && (
                    <div style={{ padding: "10px 12px", background: "rgba(0,0,0,0.10)", borderTop: "1px solid rgba(100,180,255,0.10)", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", lineHeight: 1.5 }}>
                        Centro de la pieza relativo al origen del módulo <span style={{ color: "#6ab4e8" }}>(0,0,0)</span>. Vacío = posición automática por función 3D.
                      </div>
                      {[
                        { label: "X  0=izq → ancho=der",    axis: "x", hint: "vars: ancho · esp · d1 · d2 — ej: esp · ancho-esp" },
                        { label: "Y  0=piso → alto=techo",  axis: "y", hint: "vars: alto · esp · d1 · d2 — ej: esp+d1 · alto-esp-d1" },
                        { label: "Z  0=fondo → prof=frente",axis: "z", hint: "vars: profundidad · esp · d1 · d2 — ej: 0 · profundidad-esp" },
                      ].map(({ label, axis, hint }) => {
                        const val      = fp.posFormulas?.[axis] ?? "";
                        const resultado = val ? evaluarFormula(val, allVars) : null;
                        const valida   = !val || resultado !== null;
                        return (
                          <div key={axis} style={{ border: "1px solid rgba(100,180,255,0.12)", borderRadius: 7, padding: "7px 10px" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", color: "#6ab4e8", marginBottom: 5 }}>{label}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <input
                                value={val}
                                onChange={e => {
                                  const v = e.target.value;
                                  setFp(p => {
                                    const pf = { ...(p.posFormulas || {}), [axis]: v || null };
                                    return { ...p, posFormulas: pf };
                                  });
                                }}
                                onFocus={e => { activeInputEl.current = e.target; }}
                                placeholder={hint}
                                style={{
                                  flex: 1, fontFamily: "'DM Mono',monospace", fontSize: 12,
                                  padding: "5px 9px", background: "var(--bg-base)", color: "var(--text-primary)",
                                  border: `1px solid ${!valida ? "rgba(224,112,112,0.6)" : "rgba(100,180,255,0.20)"}`,
                                  borderRadius: 6, outline: "none",
                                }}
                              />
                              {val ? (
                                <button
                                  onClick={() => setFp(p => {
                                    const pf = { ...(p.posFormulas || {}), [axis]: null };
                                    return { ...p, posFormulas: pf };
                                  })}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, padding: "0 3px", lineHeight: 1 }}
                                >×</button>
                              ) : null}
                              <div style={{ minWidth: 58, textAlign: "right" }}>
                                {val && valida && resultado !== null ? (
                                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#6ab4e8" }}>
                                    {Math.round(resultado * 10) / 10}<span style={{ fontSize: 9, marginLeft: 2, color: "var(--text-muted)" }}>mm</span>
                                  </span>
                                ) : val && !valida ? (
                                  <span style={{ fontSize: 9, color: "#e07070", fontFamily: "'DM Mono',monospace" }}>⚠ inv.</span>
                                ) : (
                                  <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>auto</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Parametrización (Fase 6.5) — zona, condition, repeat */}
                {(zonas.length > 0 || parametros.length > 0 || fp.zona || fp.condition || fp.repeat) && (
                  <>
                    <button onClick={() => setParametricoAbierto(v => !v)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em" }}>
                      <span style={{ transition: "transform 0.2s", display: "inline-block", transform: parametricoAbierto ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                      ⚙ Parametrización (zona · condición · repetición)
                    </button>
                    {parametricoAbierto && (
                      <div style={{ background: "rgba(0,0,0,0.12)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                        {/* Zona */}
                        <div>
                          <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                            Zona — material por grupo
                          </div>
                          <select value={fp.zona || ""} onChange={e => setFp(p => ({ ...p, zona: e.target.value || undefined }))}
                            style={{ width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "6px 8px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }}>
                            <option value="">(usa material del módulo)</option>
                            {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre || z.id} — {z.material}</option>)}
                          </select>
                        </div>
                        {/* Condition */}
                        <div>
                          <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                            Condición — la pieza solo se crea si la expresión es verdadera
                          </div>
                          <input value={fp.condition || ""} placeholder="ej: cajones > 0  ó  manija == true"
                            onChange={e => setFp(p => ({ ...p, condition: e.target.value || undefined }))}
                            style={{ width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "6px 8px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        {/* Repeat */}
                        <div>
                          <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                            Repetición — generar N piezas con índice <code>i</code> (deja vacío para una sola)
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 6 }}>
                            <input value={fp.repeat?.var || ""} placeholder="var (i)"
                              onChange={e => setFp(p => ({ ...p, repeat: e.target.value ? { ...(p.repeat || { from: 1, to: 1 }), var: e.target.value } : (p.repeat?.from || p.repeat?.to ? { ...p.repeat, var: undefined } : undefined) }))}
                              style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "6px 8px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
                            <input value={fp.repeat?.from ?? ""} placeholder="from (número o fórmula)"
                              onChange={e => setFp(p => ({ ...p, repeat: e.target.value !== "" ? { var: "i", to: 1, ...(p.repeat || {}), from: e.target.value } : (p.repeat?.var || p.repeat?.to ? { ...p.repeat, from: undefined } : undefined) }))}
                              style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "6px 8px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
                            <input value={fp.repeat?.to ?? ""} placeholder="to (ej: cajones)"
                              onChange={e => setFp(p => ({ ...p, repeat: e.target.value !== "" ? { var: "i", from: 1, ...(p.repeat || {}), to: e.target.value } : (p.repeat?.var || p.repeat?.from ? { ...p.repeat, to: undefined } : undefined) }))}
                              style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "6px 8px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                            Usá <code>{"{i}"}</code> o <code>#{"{i}"}</code> en el nombre para insertar el índice (ej: "Cajón #{"{i}"}").
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {fp.especial && (
              <>
                <div style={{ fontSize: 11, padding: "6px 10px", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.20)", borderRadius: 6, color: "var(--accent)" }}>
                  ✦ Medidas libres — no dependen de las dimensiones del módulo
                </div>
                <DimRowLibre titulo="Dim 1 (altura)" valKey="dimLibre1" fp={fp} setFp={setFp} />
                <DimRowLibre titulo="Dim 2 (ancho)" valKey="dimLibre2" fp={fp} setFp={setFp} />
                {(parseInt(fp.dimLibre1) || 0) > 0 && (parseInt(fp.dimLibre2) || 0) > 0 && (
                  <div style={{ padding: "8px 12px", background: "rgba(126,207,138,0.07)", border: "1px solid rgba(126,207,138,0.18)", borderRadius: 8 }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "var(--color-positive-muted)" }}>
                      Medida: <strong style={{ color: "var(--color-positive)" }}>{parseInt(fp.dimLibre1) || 0} × {parseInt(fp.dimLibre2) || 0} mm</strong>
                    </span>
                  </div>
                )}
              </>
            )}

          </div>
          </div>
        </div>


    </div>
  );
}

export default FormPieza;
