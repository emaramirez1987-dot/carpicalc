import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Btn, TextInput, Select } from '../ui/index.jsx';
import { fmtPeso, fmtNum, resolverDim, calcularModulo, evaluarFormula, resolverVariables } from '../../utils.js';
import { CATEGORIAS_DEFAULT } from '../../constants.js';
import { cargarBorradorModulo, guardarBorradorModulo, limpiarBorradorModulo } from '../../storage.js';
import { ORIENTACIONES_3D } from '../visor3d/Modulo3D.jsx';
import { useTema } from '../../hooks/useTema.js';
import FilaPieza from './FilaPieza.jsx';
import VistaModuloSVG from '../vista-svg/index.js';

// ════════════════════════════════════════════════════════════════════════════
// FormModulo — formulario completo de edición de un módulo del catálogo
// Incluye: DimRow, DimRowLibre, FormPieza, AcordeonPreviewSVG (helpers internos)
// ════════════════════════════════════════════════════════════════════════════

const DIMS = ["ancho", "alto", "profundidad"];

// Estado inicial vacío de una pieza nueva en el formulario
const PIEZA_VACIA = {
  nombre: "", cantidad: 1,
  formula1: "alto", formula2: "profundidad",
  usaDim: "alto", usaDim2: "profundidad",
  offsetEsp: 0, offsetMm: 0, divisor: 1,
  offsetEsp2: 0, offsetMm2: 0, divisor2: 1,
  tc: { id: 1, lados1: 1, lados2: 0 },
  especial: false, dimLibre1: "", dimLibre2: ""
};

function DimRow({ titulo, dimKey, espKey, mmKey, divKey, resultado, fp, setFp, espesor }) {
  const divVal = parseInt(fp[divKey]) || 1;
  return (
    <div style={{ background: "rgba(0,0,0,0.18)", borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", marginBottom: 8 }}>
        {titulo}
      </div>
      <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Select label="Toma de" value={fp[dimKey]} small
          onChange={(v) => setFp((p) => ({ ...p, [dimKey]: v }))}
          options={DIMS.map((d) => ({ value: d, label: d }))} />
        <TextInput label="Dividir ÷" type="number" value={fp[divKey]} placeholder="1" suffix="÷" small
          onChange={(v) => setFp((p) => ({ ...p, [divKey]: Math.max(1, parseInt(v) || 1) }))} />
        <TextInput label="Espesores ±" type="number" value={fp[espKey]} placeholder="0" suffix="esp" small
          onChange={(v) => setFp((p) => ({ ...p, [espKey]: v }))} />
        <TextInput label="mm fijos ±" type="number" value={fp[mmKey]} placeholder="0" suffix="mm" small
          onChange={(v) => setFp((p) => ({ ...p, [mmKey]: v }))} />
      </div>
      <div style={{ fontSize: 11, marginTop: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ color: "var(--text-muted)" }}>→</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--color-positive)" }}>
          {Math.round(resultado)} mm
        </span>
        {(parseInt(fp[espKey]) || 0) !== 0 && (
          <span style={{ fontFamily: "'DM Mono',monospace", color: "var(--accent)", fontSize: 11 }}>
            {parseInt(fp[espKey])} esp × {espesor}mm = {(parseInt(fp[espKey]) || 0) * espesor}mm
          </span>
        )}
        {divVal > 1 && (
          <span style={{ fontFamily: "'DM Mono',monospace", color: "#7090c0", fontSize: 11 }}>÷ {divVal}</span>
        )}
      </div>
    </div>
  );
}

// ── DimRowLibre ── para piezas especiales con medidas libres
function DimRowLibre({ titulo, valKey, fp, setFp }) {
  return (
    <div style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.20)", borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: 8 }}>
        {titulo} <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "none", fontWeight: 400 }}>— medida libre</span>
      </div>
      <TextInput label="Medida exacta (mm)" type="number" value={fp[valKey]} placeholder="0" suffix="mm" small
        onChange={(v) => setFp((p) => ({ ...p, [valKey]: parseInt(v) || 0 }))} />
      <div style={{ fontSize: 11, marginTop: 6, fontFamily: "'DM Mono',monospace", color: "var(--color-positive)" }}>
        → {parseInt(fp[valKey]) || 0} mm
      </div>
    </div>
  );
}

// ── FormPieza ─────────────────────────────────────────────────────
// ── DimRow ── (fuera de FormPieza para evitar re-mount en cada render)

// Dimensiones disponibles para parametrizar piezas del catálogo


// Estado inicial vacío de una pieza nueva en el formulario

// ── Detecta en qué piezas se usa una variable (por nombre en fórmulas) ───────
function piezasQueUsanVar(varName, piezas) {
  const re = new RegExp(`\\b${varName}\\b`);
  return (piezas || []).filter(p => {
    const campos = [p.formula1, p.formula2, p.posFormulas?.x, p.posFormulas?.y, p.posFormulas?.z];
    return campos.some(f => typeof f === 'string' && re.test(f));
  });
}

function FormPieza({ fp, setFp, onCancelar, editando, dims, espesor, nombresSugeridos, variables, onVarsUpdate, piezas }) {
  const [mostrarSugeridos, setMostrarSugeridos] = useState(false);
  const [avanzado, setAvanzado] = useState(false);
  const tienePos3d = !!(fp.posFormulas?.x || fp.posFormulas?.y || fp.posFormulas?.z);
  const [pos3dAbierto, setPos3dAbierto] = useState(() => tienePos3d);
  const [varsAbierto, setVarsAbierto] = useState(false);
  const [agregandoVar, setAgregandoVar] = useState(false);
  const [nuevaVarNombre, setNuevaVarNombre] = useState("");
  const [confirmDeleteVar, setConfirmDeleteVar] = useState(null); // nombre de var pendiente de confirmación
  const [varInputFocus, setVarInputFocus] = useState(null); // nombre de la var con foco

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
  const allVars = resolverVariables(variables, baseVars);
  const resolvedCustomVars = allVars;

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
          boxShadow: editando ? "0 0 28px rgba(212,175,55,0.18), 0 4px 20px rgba(0,0,0,0.35)" : "0 4px 20px rgba(0,0,0,0.3)",
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
                <button onClick={onCancelar} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Mono',monospace", background: "rgba(200,60,60,0.12)", border: "1px solid rgba(200,60,60,0.35)", color: "#e08080" }}>
                  ✕ Cancelar
                </button>
              )}
              <button onClick={() => setFp(p => ({ ...p, especial: !p.especial }))}
                style={{ padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Mono',monospace", transition: "all 0.15s", background: fp.especial ? "rgba(212,175,55,0.18)" : "var(--bg-subtle)", border: `1px solid ${fp.especial ? "var(--accent-border)" : "var(--border)"}`, color: fp.especial ? "var(--accent)" : "var(--text-muted)" }}>
                ✦ {fp.especial ? "Medida libre" : "Libre"}
              </button>
            </div>
          </div>
          <div style={{ flex: 1, background: "var(--bg-surface)", padding: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

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
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Cantidad</div>
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
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Orientación 3D
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {ORIENTACIONES_3D.map(o => {
                  const isActive = fp.orientacion3d === o.id;
                  const isDanger = o.id === 'ignorar';
                  return (
                    <button
                      key={o.id}
                      onClick={() => setFp(p => ({ ...p, orientacion3d: isActive ? undefined : o.id }))}
                      style={{
                        padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        fontFamily: "'DM Mono',monospace", cursor: "pointer", transition: "all 0.15s",
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
            </div>

            {!fp.especial && (
              <>
                {/* ── Variables del módulo — acordeón unificado ── */}
                {(() => {
                  const customVarEntries = Object.entries(variables || {});
                  const varsDisp = [
                    { n: 'ancho',       v: dims.ancho || 0 },
                    { n: 'alto',        v: dims.alto  || 0 },
                    { n: 'profundidad', v: dims.profundidad || 0 },
                    { n: 'esp',         v: espesor },
                    ...customVarEntries.map(([k]) => ({ n: k, v: Math.round((resolvedCustomVars[k] ?? 0) * 10) / 10 })),
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

                          {/* Variables custom: editar valor + eliminar */}
                          {customVarEntries.length > 0 && onVarsUpdate && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {customVarEntries.map(([nombre, valor]) => {
                                const valStr  = typeof valor === 'number' ? String(valor) : (valor || '');
                                const valEval = resolvedCustomVars[nombre];
                                const evalStr = valEval != null ? String(Math.round(valEval * 10) / 10) : null;
                                const enfocado = varInputFocus === nombre;
                                const pendiente = confirmDeleteVar === nombre;
                                const usadas = pendiente ? piezasQueUsanVar(nombre, piezas) : [];
                                return (
                                  <div key={nombre} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(212,175,55,0.07)", border: `1px solid ${enfocado ? "rgba(212,175,55,0.55)" : "rgba(212,175,55,0.22)"}`, borderRadius: 7, padding: "5px 8px", transition: "border-color 0.15s" }}>
                                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>{nombre} =</span>
                                      <input
                                        type="text"
                                        value={valStr}
                                        onChange={e => onVarsUpdate({ ...(variables || {}), [nombre]: e.target.value })}
                                        onFocus={() => setVarInputFocus(nombre)}
                                        onBlur={() => setVarInputFocus(null)}
                                        style={{ flex: 1, minWidth: 60, fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, padding: "3px 6px", background: "var(--bg-base)", border: "1px solid transparent", borderRadius: 5, color: "var(--text-primary)", outline: "none" }}
                                      />
                                      {evalStr !== null && evalStr !== valStr && (
                                        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--color-positive)", fontWeight: 700, flexShrink: 0 }}>= {evalStr}</span>
                                      )}
                                      <button
                                        onClick={() => { setConfirmDeleteVar(nombre); }}
                                        title="Eliminar variable"
                                        style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "0 2px", opacity: 0.45, flexShrink: 0, transition: "opacity 0.15s" }}
                                        onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                                        onMouseLeave={e => { e.currentTarget.style.opacity = 0.45; }}>×</button>
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

                {/* Fórmulas D1 y D2 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "D1 — Largo", key: "formula1", valida: f1Valida, resultado: d1 },
                    { label: "D2 — Ancho", key: "formula2", valida: f2Valida, resultado: d2 },
                  ].map(({ label, key, valida, resultado }) => (
                    <div key={key} style={{ background: "transparent", border: "1px solid rgba(200,160,42,0.15)", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input
                          value={fp[key] || ""}
                          onChange={e => setFp(p => ({ ...p, [key]: e.target.value }))}
                          onFocus={e => { activeInputEl.current = e.target; }}
                          placeholder="ej: alto - 2 * esp"
                          style={{
                            flex: 1, fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600,
                            padding: "7px 11px", background: "var(--bg-base)", color: "var(--text-primary)",
                            border: `1px solid ${!valida ? "rgba(224,112,112,0.6)" : "var(--border)"}`,
                            borderRadius: 7, outline: "none", letterSpacing: "0.02em",
                          }}
                        />
                        <div style={{ textAlign: "right", minWidth: 70 }}>
                          {valida ? (
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 900, color: "var(--color-positive)", letterSpacing: "-0.02em" }}>
                              {Math.round(resultado)}
                              <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginLeft: 3 }}>mm</span>
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: "#e07070", fontFamily: "'DM Mono',monospace" }}>⚠ inválida</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preview resultado */}
                {(d1 > 0 || d2 > 0) && (
                  <div style={{ padding: "10px 14px", background: "rgba(126,207,138,0.07)", border: "1px solid rgba(126,207,138,0.18)", borderRadius: 8, display: "flex", gap: 20, alignItems: "center" }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "var(--color-positive-muted)" }}>
                      Medida real: <strong style={{ color: "var(--color-positive)", fontSize: 15 }}>{Math.round(d1)} × {Math.round(d2)} mm</strong>
                    </span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--text-muted)" }}>
                      Área: <strong>{fmtNum((d1 * d2 * (parseInt(fp.cantidad) || 1)) / 1_000_000)} m²</strong>
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

                {/* Toggle configuración avanzada */}
                <button onClick={() => setAvanzado(v => !v)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em" }}>
                  <span style={{ transition: "transform 0.2s", display: "inline-block", transform: avanzado ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                  ⚙ Configuración avanzada
                </button>

                {avanzado && (
                  <div style={{ background: "rgba(0,0,0,0.12)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <DimRow titulo="Dim 1 (altura)" dimKey="usaDim" espKey="offsetEsp" mmKey="offsetMm" divKey="divisor"
                      resultado={resolverDim(dims[fp.usaDim], parseInt(fp.offsetEsp) || 0, parseInt(fp.offsetMm) || 0, parseInt(fp.divisor) || 1, espesor)} fp={fp} setFp={setFp} espesor={espesor} />
                    <DimRow titulo="Dim 2 (ancho)" dimKey="usaDim2" espKey="offsetEsp2" mmKey="offsetMm2" divKey="divisor2"
                      resultado={resolverDim(dims[fp.usaDim2], parseInt(fp.offsetEsp2) || 0, parseInt(fp.offsetMm2) || 0, parseInt(fp.divisor2) || 1, espesor)} fp={fp} setFp={setFp} espesor={espesor} />
                    <div style={{ fontSize: 10, color: "var(--text-muted)", padding: "4px 0" }}>
                      Los campos avanzados se usan como fallback si no hay fórmula arriba.
                    </div>
                  </div>
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

// ── FormModulo ────────────────────────────────────────────────────

// ── AcordeonPreviewSVG ────────────────────────────────────────────────────────
// Preview de solo lectura cerrado por defecto.
function AcordeonPreviewSVG({ datos, herrajes }) {
  const [abierto, setAbierto] = useState(false);
  const { tema } = useTema();
  const moduloPreview = useMemo(() => ({
    dimensiones: datos.dimensiones,
    herrajes,
    variables: datos.variables || {},
    vistaConfig: null,
  }), [datos.dimensiones, datos.variables, herrajes]);

  return (
    <div style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
      <button
        onClick={() => setAbierto(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 14px", background: "var(--bg-subtle)", border: "none",
          cursor: "pointer", color: "var(--text-muted)", fontSize: 12,
          fontFamily: "'DM Mono',monospace", fontWeight: 700,
        }}
      >
        <span>▣ Vista técnica de frente</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>{abierto ? "▲" : "▼"}</span>
      </button>
      {abierto && (
        <div style={{
          padding: "14px 16px", background: "var(--bg-surface)",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 20, flexWrap: "wrap",
        }}>
          <VistaModuloSVG
            modulo={moduloPreview}
            theme={tema}
            width={180}
            height={180}
          />
          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
            <div>Solo lectura · se actualiza automáticamente</div>
            <div style={{ marginTop: 4, opacity: 0.7 }}>
              Para editar la composición visual, usá<br />el botón <strong>▣</strong> en la tarjeta del módulo.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormModulo({
  costos,
  onGuardar,
  onCancelar,
  moduloBase,
  codigoEditar,
  esDeepLinkPresupuesto = false, // true = viene de Nivel 3, mostrar modal antes de guardar
  presupuestosRef = {},          // para verificar presupuestos afectados al actualizar desde catálogo
  onRecalcularAfectados = null,  // (cod) → recalcula precios en presupuestos que usan ese módulo
}) {
  const esEdicion = !!codigoEditar;
  // Borrador persistido: solo para módulos nuevos (no edición de existentes)
  const _draft = !moduloBase ? cargarBorradorModulo() : null;
  const [secs, setSecs] = useState({ ident: true, tc: false, dims: false, clasif: false, vars: false, her: false, mo: false, res: false });
  const toggleSec = k => setSecs(p => ({ ...p, [k]: !p[k] }));
  // Modal de decisión: aparece al guardar desde Nivel 3
  // null = cerrado, "pidiendo" = mostrando opciones, "nombre" = ingresando nombre para catálogo
  const [modalDecision, setModalDecision] = useState(null);
  const [nombreCatalogo, setNombreCatalogo] = useState("");
  // Cancelar con confirmación si hay cambios sin guardar
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  // Acordeón de decisión al guardar desde catálogo (no desde presupuesto)
  const [decisionCatalogo, setDecisionCatalogo] = useState(null);
  // "actualizando" | "nuevo" | null
  const [nombreNuevoCatalogo, setNombreNuevoCatalogo] = useState("");
  const [listaPiezasAbierta, setListaPiezasAbierta] = useState(false);
  const [datos, setDatos] = useState(() =>
    moduloBase
      ? {
          codigo: codigoEditar || "",
          nombre: moduloBase.nombre,
          descripcion: moduloBase.descripcion || "",
          dimensiones: { ...moduloBase.dimensiones },
          material: moduloBase.material,
          categoria: moduloBase.categoria || "otros",
          tipoVisual: moduloBase.tipoVisual || null,
          variables: moduloBase.variables ? { ...moduloBase.variables } : {}
        }
      : (_draft?.datos || {
          codigo: "",
          nombre: "",
          descripcion: "",
          dimensiones: { ancho: 600, profundidad: 550, alto: 700 },
          material: "melamina",
          categoria: "otros",
          tipoVisual: null,
          variables: {}
        })
  );
  const [piezas, setPiezas] = useState(() =>
    moduloBase
      ? moduloBase.piezas.map((p) => ({
          ...p,
          divisor: p.divisor || 1,
          divisor2: p.divisor2 || 1,
          tc: p.tc ? { ...p.tc } : { id: 0, lados1: 0, lados2: 0 }
        }))
      : (_draft?.piezas || [])
  );
  const [herrajes, setHerrajes] = useState(() =>
    moduloBase ? moduloBase.herrajes.map((h) => ({ ...h })) : (_draft?.herrajes || [])
  );
  const [moDeObra, setMoDeObra] = useState(() =>
    moduloBase ? { ...moduloBase.moDeObra } : (_draft?.moDeObra || { tipo: "por_modulo", horas: 0 })
  );

  // Persistir borrador automáticamente en cada cambio (solo módulos nuevos)
  useEffect(() => {
    if (moduloBase) return;
    guardarBorradorModulo({ datos, piezas, herrajes, moDeObra });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, piezas, herrajes, moDeObra]);
  const [error, setError] = useState("");
  const [fp, setFp] = useState({ ...PIEZA_VACIA });
  const [fpError, setFpError] = useState("");
  // Edición de pieza existente: idx !== null = modo edición
  const [editandoPiezaIdx, setEditandoPiezaIdx] = useState(null);
  // Nombres sugeridos para autocompletado rápido
  const NOMBRES_SUGERIDOS = ["Lateral", "Base", "Techo", "Fondo", "Puerta", "Entrepaño", "Zarpa", "Zócalo", "Cajón"];
  const matDef =
    costos.materiales.find((m) => m.tipo === datos.material) ||
    costos.materiales[0];
  const espesor = matDef?.espesor || 18;
  const normalizarPieza = (p) => ({
    ...p,
    cantidad: Math.max(1, parseInt(p.cantidad) || 1),
    offsetEsp: parseInt(p.offsetEsp) || 0,
    offsetMm: parseInt(p.offsetMm) || 0,
    divisor: Math.max(1, parseInt(p.divisor) || 1),
    offsetEsp2: parseInt(p.offsetEsp2) || 0,
    offsetMm2: parseInt(p.offsetMm2) || 0,
    divisor2: Math.max(1, parseInt(p.divisor2) || 1),
    tc: {
      id: parseInt(p.tc?.id) || 0,
      lados1: parseInt(p.tc?.lados1) || 0,
      lados2: parseInt(p.tc?.lados2) || 0
    }
  });

  const agregarPieza = () => {
    if (!fp.nombre.trim()) { setFpError("Ingresá el nombre."); return; }
    const nueva = normalizarPieza(fp);
    if (editandoPiezaIdx !== null) {
      // Modo edición — reemplazar la pieza en su posición
      setPiezas(prev => prev.map((p, i) => i === editandoPiezaIdx ? nueva : p));
      setEditandoPiezaIdx(null);
    } else {
      setPiezas(prev => [...prev, nueva]);
    }
    setFp({ ...PIEZA_VACIA });
    setFpError("");
  };

  const editarPieza = (idx) => {
    setFp({ ...piezas[idx] });
    setEditandoPiezaIdx(idx);
    // Scroll al formulario
    setTimeout(() => document.getElementById("form-pieza")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const cancelarEdicion = () => {
    setFp({ ...PIEZA_VACIA });
    setEditandoPiezaIdx(null);
    setFpError("");
  };

  const duplicarPieza = (idx) => {
    const copia = { ...piezas[idx], nombre: `${piezas[idx].nombre} (copia)` };
    setPiezas(prev => [...prev.slice(0, idx + 1), copia, ...prev.slice(idx + 1)]);
  };

  const moverPieza = (idx, dir) => {
    const dest = idx + dir;
    if (dest < 0 || dest >= piezas.length) return;
    setPiezas(prev => {
      const n = [...prev];
      [n[idx], n[dest]] = [n[dest], n[idx]];
      return n;
    });
  };
  // Detecta si el formulario fue modificado respecto al módulo original
  const hayCambios = () => {
    if (!moduloBase) return piezas.length > 0 || datos.nombre.trim() !== "";
    if (datos.nombre !== moduloBase.nombre ||
        datos.descripcion !== (moduloBase.descripcion || "") ||
        datos.material !== moduloBase.material ||
        datos.categoria !== (moduloBase.categoria || "otros") ||
        datos.tipoVisual !== (moduloBase.tipoVisual || null)) return true;
    if (JSON.stringify(datos.dimensiones) !== JSON.stringify(moduloBase.dimensiones)) return true;
    if (JSON.stringify(datos.variables || {}) !== JSON.stringify(moduloBase.variables || {})) return true;
    const piezasBase = (moduloBase.piezas || []).map(p => ({
      ...p, divisor: p.divisor || 1, divisor2: p.divisor2 || 1,
      tc: p.tc ? { ...p.tc } : { id: 0, lados1: 0, lados2: 0 }
    }));
    if (JSON.stringify(piezas) !== JSON.stringify(piezasBase)) return true;
    if (JSON.stringify(herrajes) !== JSON.stringify((moduloBase.herrajes || []).map(h => ({ ...h })))) return true;
    return false;
  };

  // Cancelar: pregunta si hubo cambios, cierra directo si no
  const handleCancelar = () => {
    if (hayCambios()) { setConfirmandoCancelar(true); }
    else { limpiarBorradorModulo(); onCancelar(); }
  };

  const datosGuardar = () => ({
    nombre:      datos.nombre,
    descripcion: datos.descripcion,
    dimensiones: datos.dimensiones,
    material:    datos.material,
    categoria:   datos.categoria || "otros",
    tipoVisual:  datos.tipoVisual || null,
    variables:   datos.variables || {},
    piezas,
    herrajes,
    moDeObra
  });

  // Wrapper: limpia el borrador antes de delegar al padre
  const guardarYLimpiar = (cod, d) => {
    limpiarBorradorModulo();
    onGuardar(cod, d);
  };

  const guardar = () => {
    if (!datos.codigo.trim() || !datos.nombre.trim()) {
      setError("Código y nombre son obligatorios.");
      setSecs(p => ({ ...p, ident: true }));
      return;
    }
    setError("");
    // Desde presupuesto (Nivel 3): modal de decisión existente sin cambios
    if (esDeepLinkPresupuesto) {
      setNombreCatalogo(datos.nombre || "");
      setModalDecision("pidiendo");
      return;
    }
    // Desde catálogo directo: acordeón de decisión nuevo
    if (esEdicion) {
      setNombreNuevoCatalogo(`${datos.nombre} (copia)`);
      setDecisionCatalogo("pidiendo");
      return;
    }
    // Nuevo módulo — guardar directo
    guardarYLimpiar(datos.codigo.trim().toUpperCase(), datosGuardar());
  };
  const preview =
    piezas.length > 0
      ? calcularModulo({ ...datos, piezas, herrajes, moDeObra }, costos)
      : null;
  // Helper para header de acordeón
  const secHdr = (icon, title, previewNode, isOpen, onToggle) => (
    <div onClick={onToggle} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.10)", borderLeft: "3px solid rgba(200,160,42,0.5)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
      <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em", color: "#c8a02a" }}>{icon} {title}</span>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {!isOpen && previewNode}
        <span style={{ fontSize: 10, color: "var(--text-muted)", display: "inline-block", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Error banner */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, fontSize: 13, background: "rgba(200,60,60,0.10)", border: "1px solid rgba(200,60,60,0.30)", color: "#e08080" }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Vista unificada: FormPieza + Acordeones ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Columna izquierda: FormPieza */}
        <FormPieza
          fp={fp} setFp={setFp}
          onCancelar={cancelarEdicion}
          editando={editandoPiezaIdx !== null}
          dims={datos.dimensiones}
          espesor={espesor}
          nombresSugeridos={NOMBRES_SUGERIDOS}
          variables={datos.variables}
          onVarsUpdate={v => setDatos(d => ({ ...d, variables: v }))}
          piezas={datos.piezas || []}
        />

        {/* Columna derecha: Acordeones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Identificación */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {secHdr('📌', 'Identificación',
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>{datos.codigo || '—'} · {datos.nombre || 'sin nombre'}</span>,
              secs.ident, () => toggleSec('ident'))}
            {secs.ident && (
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-surface)' }}>
                <div className="rsp-grid-1" style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12 }}>
                  <TextInput
                    label="Código"
                    placeholder="MC003"
                    value={datos.codigo}
                    onChange={(v) => setDatos((d) => ({ ...d, codigo: v.toUpperCase() }))}
                    disabled={esEdicion}
                    style={esEdicion ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                  />
                  <TextInput
                    label="Nombre"
                    placeholder="Módulo bajo mesada 80cm"
                    value={datos.nombre}
                    onChange={(v) => setDatos((d) => ({ ...d, nombre: v }))}
                  />
                </div>
                {esEdicion && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: -6 }}>
                    El código no se puede modificar en modo edición
                  </div>
                )}
                <TextInput
                  label="Descripción (opcional)"
                  value={datos.descripcion}
                  onChange={(v) => setDatos((d) => ({ ...d, descripcion: v }))}
                />
              </div>
            )}
          </div>

          {/* Tapacanto */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {secHdr('🎗', 'Tapacanto',
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>
                {fp.tc.id > 0 ? (costos.tapacanto.find(t => t.id === fp.tc.id)?.nombre || 'cinta') : 'sin cinta'}
              </span>,
              secs.tc, () => toggleSec('tc'))}
            {secs.tc && (
              <div style={{ padding: '14px 16px', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Select label="Tipo de cinta" value={fp.tc.id} small
                  onChange={(v) => setFp((p) => ({ ...p, tc: { ...p.tc, id: parseInt(v) } }))}
                  options={[{ value: 0, label: 'Sin tapacanto' }, ...(costos.tapacanto || []).map((t) => ({ value: t.id, label: t.nombre }))]} />
                <div className="rsp-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <TextInput label={`Lados D1 (${fp.especial ? 'libre' : 'altura'})`} type="number" value={fp.tc.lados1} small
                    onChange={(v) => setFp((p) => ({ ...p, tc: { ...p.tc, lados1: parseInt(v) || 0 } }))} />
                  <TextInput label={`Lados D2 (${fp.especial ? 'libre' : 'ancho'})`} type="number" value={fp.tc.lados2} small
                    onChange={(v) => setFp((p) => ({ ...p, tc: { ...p.tc, lados2: parseInt(v) || 0 } }))} />
                </div>
                {fp.tc.id > 0 && (() => {
                  const allVars = { ancho: datos.dimensiones.ancho || 0, alto: datos.dimensiones.alto || 0, profundidad: datos.dimensiones.profundidad || 0, esp: espesor, ...(datos.variables || {}) };
                  const d1tc = fp.especial ? (parseInt(fp.dimLibre1) || 0) : fp.formula1 ? (evaluarFormula(fp.formula1, allVars) ?? 0) : resolverDim(datos.dimensiones[fp.usaDim], parseInt(fp.offsetEsp) || 0, parseInt(fp.offsetMm) || 0, parseInt(fp.divisor) || 1, espesor);
                  const d2tc = fp.especial ? (parseInt(fp.dimLibre2) || 0) : fp.formula2 ? (evaluarFormula(fp.formula2, allVars) ?? 0) : resolverDim(datos.dimensiones[fp.usaDim2], parseInt(fp.offsetEsp2) || 0, parseInt(fp.offsetMm2) || 0, parseInt(fp.divisor2) || 1, espesor);
                  return (
                    <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: 'var(--accent)', background: 'rgba(212,175,55,0.07)', borderRadius: 6, padding: '5px 10px' }}>
                      → <strong>{fmtNum((parseInt(fp.cantidad || 1) * ((fp.tc.lados1 || 0) * d1tc + (fp.tc.lados2 || 0) * d2tc)) / 1000, 2)} m lineales</strong>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Dimensiones y Material */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {secHdr('📐', 'Dimensiones y Material',
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>{datos.dimensiones.ancho}×{datos.dimensiones.profundidad}×{datos.dimensiones.alto}mm</span>,
              secs.dims, () => toggleSec('dims'))}
            {secs.dims && (
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-surface)' }}>
                <div className="rsp-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                  <TextInput label="Ancho (mm)" type="number" suffix="mm" value={datos.dimensiones.ancho}
                    onChange={(v) => setDatos((d) => ({ ...d, dimensiones: { ...d.dimensiones, ancho: parseInt(v) || 0 } }))} />
                  <TextInput label="Profund. (mm)" type="number" suffix="mm" value={datos.dimensiones.profundidad}
                    onChange={(v) => setDatos((d) => ({ ...d, dimensiones: { ...d.dimensiones, profundidad: parseInt(v) || 0 } }))} />
                  <TextInput label="Alto (mm)" type="number" suffix="mm" value={datos.dimensiones.alto}
                    onChange={(v) => setDatos((d) => ({ ...d, dimensiones: { ...d.dimensiones, alto: parseInt(v) || 0 } }))} />
                  <Select label="Material" value={datos.material}
                    onChange={(v) => setDatos((d) => ({ ...d, material: v }))}
                    options={costos.materiales.map((m) => ({ value: m.tipo, label: `${m.nombre} (${m.espesor}mm)` }))} />
                </div>
                {matDef && (
                  <div style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, background: 'rgba(212,175,55,0.08)', border: '1px solid var(--accent-border)', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ opacity: 0.5 }}>▶</span>
                    <span>Material activo: <strong>{matDef.nombre}</strong> — espesor <strong>{matDef.espesor}mm</strong></span>
                    {!esEdicion && moduloBase && (
                      <span style={{ marginLeft: 8, opacity: 0.6, fontSize: 11 }}>📋 Copia — editá el código antes de guardar.</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clasificación */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {secHdr('🏷', 'Clasificación',
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>{datos.categoria || 'sin cat.'}</span>,
              secs.clasif, () => toggleSec('clasif'))}
            {secs.clasif && (
              <div style={{ background: 'var(--bg-surface)' }}>
                <div className="rsp-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div style={{ padding: '14px 16px', borderRight: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>Categoría</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {CATEGORIAS_DEFAULT.map(cat => {
                        const activa = datos.categoria === cat.id;
                        return (
                          <button key={cat.id} onClick={() => setDatos(d => ({ ...d, categoria: cat.id }))}
                            style={{ padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5, background: activa ? `${cat.color}22` : 'var(--bg-subtle)', border: `1px solid ${activa ? cat.color : 'var(--border)'}`, color: activa ? cat.color : 'var(--text-muted)', boxShadow: activa ? `0 0 14px ${cat.color}40` : 'none' }}>
                            {cat.icon} {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>Tipo visual — Plano 2D</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { id: null,    label: 'Sin definir', icon: '—',  color: '#606880' },
                        { id: 'bajo',  label: 'Bajo',        icon: '⬇',  color: '#7090c8' },
                        { id: 'aereo', label: 'Aéreo',       icon: '⬆',  color: '#a070c8' },
                        { id: 'torre', label: 'Torre',       icon: '⬛', color: 'var(--color-positive)' },
                      ].map((tipo) => {
                        const activo = datos.tipoVisual === tipo.id;
                        return (
                          <button key={String(tipo.id)} onClick={() => setDatos((d) => ({ ...d, tipoVisual: tipo.id }))}
                            style={{ padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5, background: activo ? `${tipo.color}22` : 'var(--bg-subtle)', border: `1px solid ${activo ? tipo.color : 'var(--border)'}`, color: activo ? tipo.color : 'var(--text-muted)', boxShadow: activo ? `0 0 14px ${tipo.color}40` : 'none' }}>
                            {tipo.icon} {tipo.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '0 16px 14px' }}>
                  <AcordeonPreviewSVG datos={datos} herrajes={herrajes} />
                </div>
              </div>
            )}
          </div>

          {/* Herrajes */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {secHdr('🔩', 'Herrajes',
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>{herrajes.reduce((a, h) => a + h.cantidad, 0)} uds</span>,
              secs.her, () => toggleSec('her'))}
            {secs.her && (
              <div style={{ padding: '12px 16px', background: 'var(--bg-surface)' }}>
                {costos.herrajes.map((h) => {
                  const item = herrajes.find((x) => x.id === h.id);
                  const cant = item?.cantidad || 0;
                  return (
                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{h.nombre}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtPeso(h.precio)}/{h.unidad}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {[
                          ['−', () => setHerrajes((prev) => { const idx = prev.findIndex((x) => x.id === h.id); if (cant <= 1) return prev.filter((x) => x.id !== h.id); const n = [...prev]; n[idx].cantidad--; return n; })],
                          ['+', () => setHerrajes((prev) => { const idx = prev.findIndex((x) => x.id === h.id); if (idx < 0) return [...prev, { id: h.id, cantidad: 1 }]; const n = [...prev]; n[idx].cantidad++; return n; })],
                        ].map(([lbl, fn]) => (
                          <button key={lbl} onClick={fn}
                            style={{ width: 28, height: 28, background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent)', borderRadius: 5, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {lbl}
                          </button>
                        ))}
                        <span style={{ fontFamily: "'DM Mono',monospace", width: 24, textAlign: 'center', color: cant > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>{cant}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mano de Obra */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {secHdr('🔨', 'Mano de Obra',
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>{moDeObra.tipo}</span>,
              secs.mo, () => toggleSec('mo'))}
            {secs.mo && (
              <div style={{ padding: '12px 16px', background: 'var(--bg-surface)' }}>
                <Select label="Tipo" value={moDeObra.tipo}
                  onChange={(v) => setMoDeObra((m) => ({ ...m, tipo: v }))}
                  options={costos.manoDeObra.map((m) => ({ value: m.tipo, label: `${m.nombre} — ${fmtPeso(m.precio)}` }))}
                />
                {moDeObra.tipo === 'por_hora' && (
                  <div style={{ marginTop: 10 }}>
                    <TextInput label="Horas estimadas" type="number" suffix="hs" value={moDeObra.horas}
                      onChange={(v) => setMoDeObra((m) => ({ ...m, horas: parseFloat(v) || 0 }))} />
                    {(() => {
                      const gf = costos.gastosFijos;
                      if (!gf?.items?.length || !moDeObra.horas) return null;
                      const totalMensual = gf.items.reduce((a, i) => a + (parseFloat(i.monto) || 0), 0);
                      const costoHora = gf.horasProductivasMes > 0 ? totalMensual / gf.horasProductivasMes : 0;
                      const impacto = Math.round(costoHora * moDeObra.horas);
                      return (
                        <div style={{ marginTop: 8, padding: '7px 11px', borderRadius: 7, background: 'rgba(112,144,176,0.10)', border: '1px solid rgba(112,144,176,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>⏱ {moDeObra.horas}h × {fmtPeso(Math.round(costoHora))}/h taller</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#7090c0', fontFamily: "'DM Mono',monospace" }}>{fmtPeso(impacto)}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resumen de Costos */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(126,207,138,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {secHdr('📊', 'Resumen de Costos',
              preview
                ? <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: 'var(--color-positive)' }}>{fmtPeso(preview.total)}</span>
                : <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>sin piezas</span>,
              secs.res, () => toggleSec('res'))}
            {secs.res && (
              <div style={{ padding: '12px 16px', background: 'var(--bg-surface)' }}>
                {preview ? (
                  <>
                    {[
                      ['Material', preview.costoMaterial, `${fmtNum(preview.m2Neto)}m²+${preview.pctDesp}%`],
                      ['Tapacanto', preview.costoTapacanto, `${fmtNum(preview.metrosTapacanto, 2)}m`],
                      ['MO', preview.costoMO, ''],
                      ['Herrajes', preview.costoHerrajes, ''],
                      ['── Costo base', preview.costoBase, ''],
                      ['Ganancia', preview.ganancia, ''],
                    ].map(([k, v, note]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <span style={{ color: k.startsWith('──') ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: k.startsWith('──') ? 700 : 400 }}>{k}</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontFamily: "'DM Mono',monospace", color: '#c8c098' }}>{fmtPeso(v)}</span>
                          {note && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--text-muted)' }}>{note}</span>}
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 4, borderTop: '1px solid rgba(126,207,138,0.2)' }}>
                      <span style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Precio de venta</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 900, color: 'var(--color-positive)', textShadow: '0 0 20px rgba(126,207,138,0.4)' }}>{fmtPeso(preview.total)}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Agregá piezas para ver el resumen de costos.</div>
                )}
              </div>
            )}
          </div>

          {/* Agregar pieza */}
          {fpError && <p style={{ color: "#e07070", fontSize: 12, margin: 0 }}>⚠ {fpError}</p>}
          <button onClick={agregarPieza} style={{
            width: "100%", padding: "11px 0", borderRadius: 8, cursor: "pointer", fontWeight: 700,
            fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: "0.05em",
            transition: "all 0.2s", background: "rgba(200,160,42,0.15)",
            border: "1px solid rgba(200,160,42,0.45)", color: "#c8a02a",
          }}>
            {editandoPiezaIdx !== null ? "✓ ACTUALIZAR PIEZA" : "+ AGREGAR ESTA PIEZA"}
          </button>

        </div>
      </div>

      {/* Lista de piezas */}
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <div onClick={() => setListaPiezasAbierta(v => !v)}
          style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.10)', borderBottom: listaPiezasAbierta ? '1px solid rgba(200,160,42,0.25)' : 'none', borderLeft: '3px solid rgba(200,160,42,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
          <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#c8a02a' }}>
            🪵 Piezas <span style={{ color: 'var(--accent)', marginLeft: 6 }}>({piezas.length})</span>
          </span>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>
              Espesor: <span style={{ color: 'var(--accent)' }}>{espesor}mm</span>
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', transition: 'transform 0.2s', display: 'inline-block', transform: listaPiezasAbierta ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </div>
        </div>
        {listaPiezasAbierta && (
          <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {piezas.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center', fontSize: 12, borderRadius: 8, border: '1px dashed var(--border)', color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>
                Sin piezas todavía — agregá la primera arriba
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {piezas.map((p, i) => (
                  <FilaPieza key={i} pieza={p} idx={i} dims={datos.dimensiones} espesor={espesor} tapacanto={costos.tapacanto}
                    isFirst={i === 0} isLast={i === piezas.length - 1} modVars={datos.variables}
                    onDelete={(i) => { setPiezas(prev => prev.filter((_, j) => j !== i)); if (editandoPiezaIdx === i) cancelarEdicion(); }}
                    onEdit={editarPieza} onDuplicate={duplicarPieza}
                    onMoveUp={(i) => moverPieza(i, -1)} onMoveDown={(i) => moverPieza(i, 1)}
                    onChangeCantidad={(cant) => setPiezas(prev => prev.map((px, j) => j === i ? { ...px, cantidad: cant } : px))} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div style={{ display: 'grid', gridTemplateColumns: esEdicion ? '1fr 1fr 1fr' : '1fr 1fr', gap: 10, paddingTop: 4 }}>
        <Btn variant="ghost" onClick={handleCancelar} style={{ width: '100%' }}>Cancelar</Btn>
        {esEdicion && (
          <Btn variant="ghost" onClick={guardar} style={{ width: '100%', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}>
            💾 Guardar y cerrar
          </Btn>
        )}
        <button onClick={guardar}
          style={{ width: '100%', padding: '10px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 900, fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: '0.06em', transition: 'all 0.2s', background: 'linear-gradient(135deg, var(--accent), #b8852a)', border: 'none', color: '#0a0a0a', boxShadow: '0 4px 16px rgba(212,175,55,0.35)' }}>
          {esEdicion ? '✓ Guardar cambios' : '✓ Guardar módulo'}
        </button>
      </div>

      {/* Acordeón de decisión inline — desde presupuesto */}
      {modalDecision && (
        <div className="anim-fadeup" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--accent-border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: 12 }}>
            ¿Dónde guardás esta variante?
          </div>
          {modalDecision === 'nombre' ? (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Nombre en el catálogo:</div>
              <input autoFocus value={nombreCatalogo} onChange={e => setNombreCatalogo(e.target.value)}
                placeholder="Nombre del nuevo módulo..."
                style={{ width: '100%', fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: '8px 12px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-border)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                onKeyDown={e => e.key === 'Enter' && guardarYLimpiar(datos.codigo.trim().toUpperCase(), { ...datosGuardar(), nombre: nombreCatalogo.trim() || datos.nombre, _guardarEnCatalogo: true })} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { guardarYLimpiar(datos.codigo.trim().toUpperCase(), { ...datosGuardar(), nombre: nombreCatalogo.trim() || datos.nombre, _guardarEnCatalogo: true }); setModalDecision(null); }}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg,var(--accent),var(--accent-hover))', border: 'none', color: 'var(--text-inverted)' }}>
                  ✓ Confirmar nombre
                </button>
                <button onClick={() => setModalDecision('pidiendo')}
                  style={{ padding: '9px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>
                  ← Volver
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { guardarYLimpiar(datos.codigo.trim().toUpperCase(), { ...datosGuardar(), _soloPresupuesto: true }); setModalDecision(null); }}
                style={{ padding: '11px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                📋 Solo en este presupuesto
                <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginTop: 3 }}>El catálogo no cambia. Se elimina con el presupuesto.</div>
              </button>
              <button onClick={() => { setNombreCatalogo(datos.nombre || ''); setModalDecision('nombre'); }}
                style={{ padding: '11px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                📚 Guardar en catálogo
                <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginTop: 3 }}>Disponible para futuros presupuestos.</div>
              </button>
              <button onClick={() => setModalDecision(null)}
                style={{ padding: '7px 0', borderRadius: 8, cursor: 'pointer', fontSize: 11, background: 'transparent', border: 'none', color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>
                ✕ Cancelar
              </button>
            </div>
          )}
        </div>
      )}
      {/* ── Acordeón de decisión al guardar desde catálogo directo ── */}
      {decisionCatalogo && !esDeepLinkPresupuesto && (
        <div className="anim-fadeup" style={{ marginTop: 14, background: "var(--bg-subtle)", border: "1px solid var(--accent-border)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: 12 }}>
            ¿Cómo querés guardar?
          </div>
          {decisionCatalogo?.tipo === "confirmarAfectados" ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#c8a02a", marginBottom: 8 }}>
                ⚠ Este módulo se usa en {decisionCatalogo.afectados.length} presupuesto{decisionCatalogo.afectados.length !== 1 ? "s" : ""}:
              </div>
              <div style={{ marginBottom: 12 }}>
                {decisionCatalogo.afectados.slice(0, 4).map((n, i) => (
                  <div key={i} style={{ fontSize: 11, color: "var(--text-muted)", paddingLeft: 8, lineHeight: 1.8 }}>· {n}</div>
                ))}
                {decisionCatalogo.afectados.length > 4 && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", paddingLeft: 8 }}>· y {decisionCatalogo.afectados.length - 4} más...</div>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
                Sus precios pueden quedar desactualizados. Podés recalcularlos ahora o hacerlo después desde "Mis presupuestos".
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => {
                  const cod = datos.codigo.trim().toUpperCase();
                  const moduloActualizado = datosGuardar();
                  onGuardar(cod, moduloActualizado);
                  // Disparar recálculo en los presupuestos afectados
                  if (onRecalcularAfectados) onRecalcularAfectados(cod, null, null, moduloActualizado);
                  setDecisionCatalogo(null);
                }} style={{ padding: "10px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", fontSize: 12, fontWeight: 700 }}>
                  ✓ Actualizar módulo y recalcular precios
                </button>
                <button onClick={() => {
                  guardarYLimpiar(datos.codigo.trim().toUpperCase(), datosGuardar());
                  setDecisionCatalogo(null);
                }} style={{ padding: "10px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700 }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                  Actualizar solo el catálogo
                  <div style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginTop: 2 }}>Los presupuestos muestran ↻ cuando los abrás.</div>
                </button>
                <button onClick={() => setDecisionCatalogo("pidiendo")}
                  style={{ padding: "7px 0", borderRadius: 8, cursor: "pointer", fontSize: 11, background: "transparent", border: "none", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                  ← Volver
                </button>
              </div>
            </div>
          ) : decisionCatalogo === "nuevo" ? (
            <>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Nombre del nuevo módulo:</div>
              <input autoFocus value={nombreNuevoCatalogo} onChange={e => setNombreNuevoCatalogo(e.target.value)}
                placeholder="Nombre del nuevo módulo..."
                style={{ width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: "8px 12px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", outline: "none", marginBottom: 10, boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
                onKeyDown={e => e.key === "Enter" && document.getElementById("btn-crear-nuevo-mod")?.click()} />

              {/* Checkboxes: presupuestos que usan el original */}
              {(() => {
                const cod = datos.codigo.trim().toUpperCase();
                const afectados = Object.entries(presupuestosRef || {})
                  .filter(([, p]) => (p.items || []).some(it => it.codigo === cod));
                if (afectados.length === 0) return null;
                return (
                  <div style={{ marginBottom: 12, padding: "10px 12px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      ¿Reemplazar el módulo en estos presupuestos?
                    </div>
                    {afectados.map(([pid, p]) => {
                      const checked = (decisionCatalogo?.seleccionados || new Set(afectados.map(([id]) => id))).has(pid);
                      return (
                        <label key={pid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)" }}>
                          <input type="checkbox" checked={checked}
                            onChange={e => {
                              const sel = new Set(decisionCatalogo?.seleccionados || afectados.map(([id]) => id));
                              e.target.checked ? sel.add(pid) : sel.delete(pid);
                              setDecisionCatalogo({ ...decisionCatalogo, seleccionados: sel });
                            }}
                            style={{ accentColor: "var(--accent)", width: 14, height: 14, cursor: "pointer" }} />
                          <span style={{ flex: 1 }}>{p.nombre || "Sin nombre"}</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--color-positive)" }}>{fmtPeso(p.total)}</span>
                        </label>
                      );
                    })}
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
                      Reemplaza todas las instancias del módulo original en los seleccionados.
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", gap: 8 }}>
                <Btn id="btn-crear-nuevo-mod" onClick={() => {
                  const newCod = `MC${String(Date.now()).slice(-6)}`;
                  const nombreFinal = nombreNuevoCatalogo.trim() || datos.nombre;
                  onGuardar(newCod, { ...datosGuardar(), nombre: nombreFinal });
                  // Reemplazar en los presupuestos seleccionados
                  const cod = datos.codigo.trim().toUpperCase();
                  const afectados = Object.entries(presupuestosRef || {})
                    .filter(([, p]) => (p.items || []).some(it => it.codigo === cod));
                  const seleccionados = decisionCatalogo?.seleccionados || new Set(afectados.map(([id]) => id));
                  afectados.forEach(([pid, p]) => {
                    if (!seleccionados.has(pid)) return;
                    const itemsActualizados = (p.items || []).map(it =>
                      it.codigo === cod ? { ...it, codigo: newCod } : it
                    );
                    const instancias = itemsActualizados.filter(it => it.codigo === newCod).length;
                    if (instancias > 0 && onRecalcularAfectados) {
                      onRecalcularAfectados(cod, pid, itemsActualizados);
                    }
                  });
                  setDecisionCatalogo(null);
                }}>✓ Crear módulo nuevo</Btn>
                <Btn variant="ghost" onClick={() => setDecisionCatalogo("pidiendo")}>← Volver</Btn>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => {
                // Verificar si hay presupuestos afectados antes de guardar
                const cod = datos.codigo.trim().toUpperCase();
                const afectados = Object.entries(presupuestosRef || {})
                  .filter(([, p]) => (p.items || []).some(it => it.codigo === cod))
                  .map(([, p]) => p.nombre || "Sin nombre");
                if (afectados.length > 0) {
                  setDecisionCatalogo({ tipo: "confirmarAfectados", afectados });
                } else {
                  onGuardar(cod, datosGuardar());
                  setDecisionCatalogo(null);
                }
              }} style={{ padding: "11px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", fontSize: 12, fontWeight: 700 }}>
                ✓ Actualizar este módulo
                <div style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginTop: 3 }}>
                  Sobreescribe el módulo existente en el catálogo.
                </div>
              </button>
              <button onClick={() => setDecisionCatalogo("nuevo")}
                style={{ padding: "11px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                ➕ Guardar como módulo nuevo
                <div style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginTop: 3 }}>
                  El original queda intacto. Se crea una copia con nuevo nombre.
                </div>
              </button>
              <button onClick={() => setDecisionCatalogo(null)}
                style={{ padding: "7px 0", borderRadius: 8, cursor: "pointer", fontSize: 11, background: "transparent", border: "none", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                ✕ Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Acordeón de confirmación al Cancelar con cambios ── */}
      {confirmandoCancelar && (
        <div className="anim-fadeup" style={{ marginTop: 14, background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.25)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#e07070", marginBottom: 8 }}>
            ¿Descartás los cambios?
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
            Hay cambios sin guardar. Si salís ahora se pierden.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { limpiarBorradorModulo(); onCancelar(); }}
              style={{ padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070" }}>
              Descartar cambios
            </button>
            <button onClick={() => setConfirmandoCancelar(false)}
              style={{ padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
              Seguir editando
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FormModulo;