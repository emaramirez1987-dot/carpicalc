// ════════════════════════════════════════════════════════════════════════════
// FormPieza.jsx — panel inspector compacto para edición de piezas
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import { resolverDim, evaluarFormula } from '../../utils.js';
import { resolverContextoModulo, contextoRepeatVar } from '../../services/moduloService.js';
import { ORIENTACIONES_3D } from '../visor3d/engine/buildPiezas3D.js';
import { DimRowLibre } from './DimRowEditor.jsx';
import VarsExplorer, { construirScopes } from './VarsExplorer.jsx';

const FORMULAS_POR_ORIENT = {
  horizontal: { f1: "ancho",       f2: "profundidad", l1: "Largo",      l2: "Profundidad" },
  vertical:   { f1: "alto",        f2: "profundidad", l1: "Alto",       l2: "Profundidad" },
  frente:     { f1: "alto",        f2: "ancho",       l1: "Alto",       l2: "Ancho"       },
};
const ES_FORMULA_CANONICA = (v) => {
  const t = (v ?? "").trim();
  return t === "" || ["ancho", "alto", "profundidad"].includes(t);
};

// ── Barra de sub-pestañas ────────────────────────────────────────────────────
function SubTabBar({ tabs, active, onSelect }) {
  const M = "'DM Mono',monospace";
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)} style={{
          padding: '6px 13px', background: 'none', border: 'none',
          borderBottom: active === t.id ? '2px solid var(--accent)' : '2px solid transparent',
          color: active === t.id ? 'var(--accent)' : 'var(--text-muted)',
          cursor: 'pointer', fontSize: 10, fontFamily: M,
          fontWeight: active === t.id ? 700 : 400,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          transition: 'color 0.12s',
          marginBottom: -1, whiteSpace: 'nowrap',
        }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Estilos compartidos ──────────────────────────────────────────────────────
const M = "'DM Mono',monospace";
const inputSm = {
  fontFamily: M, fontSize: 12, padding: "4px 8px",
  background: "var(--bg-base)", border: "1px solid var(--border)",
  borderRadius: 5, color: "var(--text-primary)", outline: "none",
  height: 28, boxSizing: "border-box",
};
const lblInline = {
  fontSize: 9, fontFamily: M, color: "var(--text-muted)",
  fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
  whiteSpace: "nowrap", userSelect: "none",
};

// ── Dropdown de variables insertables ────────────────────────────────────────
// Wrapper del botón "⚡ vars" + popover con VarsExplorer (navegación
// jerárquica + buscador). Delega la lógica al componente reutilizable.
function VarsDropdown({ rowKey, openKey, onToggle, scopes, defaultScopeId, esperada, onInsert }) {
  const isOpen = openKey === rowKey;
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onMouseDown={e => { e.preventDefault(); onToggle(isOpen ? null : rowKey); }}
        style={{
          height: 28, padding: "0 9px", borderRadius: 5, cursor: "pointer",
          fontFamily: M, fontSize: 10, fontWeight: 600,
          background: isOpen ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${isOpen ? "rgba(212,175,55,0.40)" : "var(--border)"}`,
          color: isOpen ? "var(--accent)" : "var(--text-muted)",
          display: "flex", alignItems: "center", gap: 4,
          transition: "all 0.12s",
        }}>
        ⚡ vars <span style={{ fontSize: 8, opacity: 0.7 }}>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 100 }}>
          <VarsExplorer
            scopes={scopes}
            defaultScopeId={defaultScopeId}
            esperada={esperada}
            onInsert={(name) => { onInsert(name); onToggle(null); }}
          />
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
function FormPieza({ fp, setFp, onCancelar, onConfirmar, editando, modulo, costos, nombresSugeridos, valoresParametros }) {
  const [mostrarSugeridos, setMostrarSugeridos] = useState(false);
  const dims        = modulo?.dimensiones || {};
  const parametros  = modulo?.parametros || [];
  const zonas       = modulo?.zonas || [];
  const tapacantos  = costos?.tapacanto || [];
  const tieneParam = zonas.length > 0 || parametros.length > 0 || fp.zona || fp.condition || fp.repeat;
  const [subTab, setSubTab] = useState('pos3d');
  const [varsOpen, setVarsOpen]     = useState(null);
  const [orientOpen, setOrientOpen] = useState(false);
  const activeInputEl = useRef(null);

  const aplicarOrientacion = (orientId) => {
    setFp(p => {
      const eraActiva = p.orientacion3d === orientId;
      const nueva = eraActiva ? undefined : orientId;
      if (!nueva || nueva === 'ignorar') return { ...p, orientacion3d: nueva };
      const def = FORMULAS_POR_ORIENT[nueva];
      if (!def) return { ...p, orientacion3d: nueva };
      return {
        ...p, orientacion3d: nueva,
        formula1: ES_FORMULA_CANONICA(p.formula1) ? def.f1 : p.formula1,
        formula2: ES_FORMULA_CANONICA(p.formula2) ? def.f2 : p.formula2,
      };
    });
  };

  const insertarVariable = (nombre) => {
    const el = activeInputEl.current;
    if (!el) return;
    const start  = el.selectionStart ?? el.value.length;
    const end    = el.selectionEnd   ?? el.value.length;
    const newVal = el.value.slice(0, start) + nombre + el.value.slice(end);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, newVal);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    setTimeout(() => { el.setSelectionRange(start + nombre.length, start + nombre.length); el.focus(); }, 0);
  };

  // Scopes para el VarsExplorer (jerárquico). El módulo recibido puede ser
  // el padre o un sub-virtual ya armado por EditorComponenteHijo: en ambos
  // casos construirScopes produce el árbol correcto.
  const scopesExplorer = construirScopes(
    modulo || {}, costos || { materiales: [] }, valoresParametros || {},
  );

  // Contexto centralizado: dims base + variables custom + parámetros (defaults + formula).
  // Único punto de verdad — prohibido reimplementar inline (ver CLAUDE.md).
  const { modVars, espesor } = resolverContextoModulo(modulo || {}, costos || { materiales: [] }, valoresParametros || {});
  const allVars = { ...modVars, ...contextoRepeatVar(fp) };

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

  const orient   = fp.orientacion3d;
  const def      = orient ? FORMULAS_POR_ORIENT[orient] : null;
  // (Las listas planas de baseVarNames/customVarNames/piezaVarNames se
  // reemplazaron por scopesExplorer — toda la navegación vive en VarsExplorer.)
  const tienePos3d = !!(fp.posFormulas?.x || fp.posFormulas?.y || fp.posFormulas?.z);
  const tcId        = parseInt(fp.tc?.id) || 0;
  const tcLados1    = parseInt(fp.tc?.lados1) || 0;
  const tcLados2    = parseInt(fp.tc?.lados2) || 0;
  const tieneTC     = tcId > 0 && (tcLados1 > 0 || tcLados2 > 0);
  const metrosTC    = tieneTC
    ? ((parseInt(fp.cantidad) || 1) * (tcLados1 * (d1 || 0) + tcLados2 * (d2 || 0))) / 1000
    : 0;

  const subTabs = [
    { id: 'pos3d', label: `ƒ Pos. 3D${tienePos3d ? ' ●' : ''}` },
    { id: 'tc',    label: `🎗 TC${tieneTC ? ' ●' : ''}` },
    ...(tieneParam ? [{ id: 'param', label: '⚙ Param.' }] : []),
  ];

  const dimRows = [
    { key: "formula1", label: "D1", resultado: d1, valida: f1Valida, esperada: def?.f1 },
    { key: "formula2", label: "D2", resultado: d2, valida: f2Valida, esperada: def?.f2 },
  ];

  return (
    <div id="form-pieza" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Fila 1: [Cancelar] Nombre · Cantidad · Orientación · Libre ────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {/* Botón descartar — solo en modo edición, integrado en la fila */}
        {editando && (
          <button onClick={onCancelar} title="Descartar cambios y salir del editor" style={{
            height: 28, padding: "0 9px", borderRadius: 5, fontSize: 10, fontWeight: 700,
            cursor: "pointer", fontFamily: M, flexShrink: 0,
            background: "rgba(200,60,60,0.12)", border: "1px solid rgba(200,60,60,0.35)", color: "#e08080",
          }}>✕ Descartar</button>
        )}
        {/* Nombre */}
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <input
            value={fp.nombre}
            placeholder="Nombre de la pieza..."
            onChange={e => setFp(p => ({ ...p, nombre: e.target.value }))}
            onFocus={() => setMostrarSugeridos(true)}
            onBlur={() => setTimeout(() => setMostrarSugeridos(false), 150)}
            style={{ ...inputSm, width: "100%", fontSize: 13, fontWeight: 400 }}
          />
          {mostrarSugeridos && (nombresSugeridos || []).length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, zIndex: 50,
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: 7, padding: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              display: "flex", flexWrap: "wrap", gap: 3, marginTop: 2, minWidth: 200,
            }}>
              {(nombresSugeridos || []).map(n => (
                <button key={n} onMouseDown={() => { setFp(p => ({ ...p, nombre: n })); setMostrarSugeridos(false); }}
                  style={{
                    padding: "2px 9px", borderRadius: 5, border: "1px solid var(--border)",
                    background: "var(--bg-subtle)", color: "var(--text-secondary)",
                    cursor: "pointer", fontSize: 11, fontFamily: M, fontWeight: 700,
                  }}>
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cantidad */}
        <button onClick={() => setFp(p => ({ ...p, cantidad: Math.max(1, (parseInt(p.cantidad) || 1) - 1) }))}
          style={{ width: 22, height: 26, borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>−</button>
        <input type="number" value={fp.cantidad} min="1"
          onChange={e => setFp(p => ({ ...p, cantidad: e.target.value }))}
          style={{ ...inputSm, width: 34, textAlign: "center", color: "var(--accent)", fontWeight: 700, padding: "3px 2px" }} />
        <button onClick={() => setFp(p => ({ ...p, cantidad: (parseInt(p.cantidad) || 1) + 1 }))}
          style={{ width: 22, height: 26, borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>

        {/* Dropdown orientación */}
        {(() => {
          const activeOrient = ORIENTACIONES_3D.find(o => o.id === fp.orientacion3d);
          const isDanger = activeOrient?.id === 'ignorar';
          return (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={() => setOrientOpen(v => !v)}
                style={{
                  height: 28, padding: "0 10px", borderRadius: 5, cursor: "pointer",
                  fontFamily: M, fontSize: 10, fontWeight: 600,
                  background: activeOrient
                    ? (isDanger ? "rgba(200,60,60,0.15)" : "rgba(212,175,55,0.15)")
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${activeOrient
                    ? (isDanger ? "rgba(200,60,60,0.45)" : "var(--accent-border)")
                    : "var(--border)"}`,
                  color: activeOrient
                    ? (isDanger ? "#e07070" : "var(--accent)")
                    : "var(--text-muted)",
                  display: "flex", alignItems: "center", gap: 5, transition: "all 0.12s",
                }}>
                {activeOrient ? activeOrient.label : "Orientación"}
                <span style={{ fontSize: 8, opacity: 0.7 }}>{orientOpen ? "▲" : "▼"}</span>
              </button>
              {orientOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 100,
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  borderRadius: 7, padding: "6px", boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
                  display: "flex", flexDirection: "column", gap: 3, minWidth: 130,
                }}>
                  {ORIENTACIONES_3D.map(o => {
                    const active = fp.orientacion3d === o.id;
                    const danger = o.id === 'ignorar';
                    return (
                      <button key={o.id}
                        onClick={() => { aplicarOrientacion(o.id); setOrientOpen(false); }}
                        style={{
                          padding: "5px 10px", borderRadius: 5, cursor: "pointer", textAlign: "left",
                          fontFamily: M, fontSize: 10, fontWeight: active ? 700 : 500,
                          background: active
                            ? (danger ? "rgba(200,60,60,0.15)" : "rgba(212,175,55,0.15)")
                            : "transparent",
                          border: `1px solid ${active
                            ? (danger ? "rgba(200,60,60,0.40)" : "var(--accent-border)")
                            : "transparent"}`,
                          color: active
                            ? (danger ? "#e07070" : "var(--accent)")
                            : "var(--text-muted)",
                        }}>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Toggle Libre */}
        <button onClick={() => setFp(p => ({ ...p, especial: !p.especial }))}
          style={{
            height: 28, padding: "0 10px", borderRadius: 5, fontSize: 10, fontWeight: 700,
            fontFamily: M, cursor: "pointer", transition: "all 0.12s", flexShrink: 0,
            background: fp.especial ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${fp.especial ? "var(--accent-border)" : "var(--border)"}`,
            color: fp.especial ? "var(--accent)" : "var(--text-muted)",
          }}>
          ✦ Libre
        </button>
      </div>

      {/* ── Filas D1 / D2 — grupo compacto ──────────────────────────────── */}
      {!fp.especial && <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {dimRows.map(({ key, label, resultado, valida, esperada }) => {
        const advertencia = def && esperada && fp[key] && !String(fp[key]).includes(esperada);
        return (
          <div key={key} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 10px 7px 8px",
            background: "var(--bg-surface)", borderRadius: 6,
            border: `1px solid ${!valida ? "rgba(224,112,112,0.40)" : "rgba(200,160,42,0.12)"}`,
          }}>
            {/* Etiqueta */}
            <span style={{ ...lblInline, minWidth: 18, color: "rgba(200,160,42,0.75)", fontSize: 10 }}>{label}</span>

            {/* Input fórmula */}
            <input
              value={fp[key] || ""}
              onChange={e => setFp(p => ({ ...p, [key]: e.target.value }))}
              onFocus={e => { activeInputEl.current = e.target; }}
              placeholder={esperada ? `ej: ${esperada}` : "fórmula..."}
              style={{ ...inputSm, flex: 1, minWidth: 0, fontSize: 12 }}
            />

            {/* Dropdown de variables */}
            <VarsDropdown
              rowKey={key}
              openKey={varsOpen}
              onToggle={setVarsOpen}
              scopes={scopesExplorer}
              esperada={esperada}
              onInsert={insertarVariable}
            />

            {/* Resultado */}
            <div style={{ minWidth: 50, textAlign: "right", flexShrink: 0 }}>
              {valida
                ? <span style={{ fontFamily: M, fontSize: 12, fontWeight: 600, color: "var(--color-positive)" }}>
                    {Math.round(resultado)}<span style={{ fontSize: 8, color: "var(--text-muted)", marginLeft: 2 }}>mm</span>
                  </span>
                : <span style={{ fontSize: 10, color: "#e07070", fontFamily: M }}>⚠ inv.</span>}
            </div>

            {advertencia && (
              <span style={{ fontSize: 9, color: "#c89530", fontFamily: M, flexShrink: 0 }}>→{esperada}</span>
            )}
          </div>
        );
      })}</div>}

      {/* ── Medidas libres ────────────────────────────────────────────────── */}
      {fp.especial && (
        <>
          <div style={{ fontSize: 10, padding: "4px 8px", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.20)", borderRadius: 5, color: "var(--accent)", fontFamily: M }}>
            ✦ Medidas libres — no dependen de las dimensiones del módulo
          </div>
          <DimRowLibre titulo="D1" valKey="dimLibre1" fp={fp} setFp={setFp} />
          <DimRowLibre titulo="D2" valKey="dimLibre2" fp={fp} setFp={setFp} />
          {(parseInt(fp.dimLibre1) || 0) > 0 && (parseInt(fp.dimLibre2) || 0) > 0 && (
            <div style={{ padding: "3px 8px", background: "rgba(126,207,138,0.06)", border: "1px solid rgba(126,207,138,0.15)", borderRadius: 5 }}>
              <span style={{ fontFamily: M, fontSize: 11, color: "var(--color-positive)", fontWeight: 600 }}>
                {parseInt(fp.dimLibre1) || 0} × {parseInt(fp.dimLibre2) || 0} mm
              </span>
            </div>
          )}
        </>
      )}

      {/* ── Sub-tabs: Pos. 3D / Param. ───────────────────────────────────── */}
      {!fp.especial && (
        <div style={{ marginTop: 1, borderTop: "1px solid var(--border)" }}>
          <SubTabBar tabs={subTabs} active={subTab} onSelect={setSubTab} />
          <div style={{ paddingTop: 20, display: "flex", flexDirection: "column", gap: 7 }}>

            {/* ── Posición 3D ── */}
            {subTab === 'pos3d' && (
              <>
                {[
                  { axis: "x", label: "X", hint: "ej: esp" },
                  { axis: "y", label: "Y", hint: "ej: 0" },
                  { axis: "z", label: "Z", hint: "ej: 0" },
                ].map(({ axis, label, hint }) => {
                  const val = fp.posFormulas?.[axis] ?? "";
                  const resultado = val ? evaluarFormula(val, allVars) : null;
                  const valida = !val || resultado !== null;
                  return (
                    <div key={axis} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 10px 7px 8px", borderRadius: 6,
                      background: "var(--bg-surface)",
                      border: `1px solid ${!valida ? "rgba(224,112,112,0.40)" : "rgba(100,180,255,0.10)"}`,
                    }}>
                      <span style={{ ...lblInline, minWidth: 14, color: "#6ab4e8", fontSize: 10 }}>{label}</span>
                      <input
                        value={val}
                        onChange={e => { const v = e.target.value; setFp(p => ({ ...p, posFormulas: { ...(p.posFormulas || {}), [axis]: v || null } })); }}
                        onFocus={e => { activeInputEl.current = e.target; }}
                        placeholder={hint}
                        style={{ ...inputSm, flex: 1, minWidth: 0, border: `1px solid ${!valida ? "rgba(224,112,112,0.5)" : "rgba(100,180,255,0.15)"}` }}
                      />
                      {val && (
                        <button onClick={() => setFp(p => ({ ...p, posFormulas: { ...(p.posFormulas || {}), [axis]: null } }))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, padding: "0 2px", flexShrink: 0 }}>×</button>
                      )}
                      <VarsDropdown
                        rowKey={`pos_${axis}`}
                        openKey={varsOpen}
                        onToggle={setVarsOpen}
                        scopes={scopesExplorer}
                        esperada={null}
                        onInsert={insertarVariable}
                      />
                      <div style={{ minWidth: 44, textAlign: "right", flexShrink: 0 }}>
                        {val
                          ? valida && resultado !== null
                            ? <span style={{ fontFamily: M, fontSize: 11, fontWeight: 600, color: "#6ab4e8" }}>{Math.round(resultado * 10) / 10}<span style={{ fontSize: 8, color: "var(--text-muted)", marginLeft: 1 }}>mm</span></span>
                            : <span style={{ fontSize: 9, color: "#e07070", fontFamily: M }}>⚠</span>
                          : <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: M }}>auto</span>}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* ── Tapacanto ── */}
            {subTab === 'tc' && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 10px 7px 8px", borderRadius: 6,
                  background: "var(--bg-surface)",
                  border: "1px solid rgba(212,175,55,0.12)",
                }}>
                  <span style={{ ...lblInline, color: "rgba(212,175,55,0.85)", fontSize: 10 }}>Cinta</span>
                  <select
                    value={tcId}
                    onChange={e => setFp(p => ({ ...p, tc: { ...(p.tc || {}), id: parseInt(e.target.value) || 0 } }))}
                    style={{ ...inputSm, flex: 1, minWidth: 0, cursor: "pointer" }}>
                    <option value={0}>Sin tapacanto</option>
                    {tapacantos.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>

                {tcId > 0 && (
                  <>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 10px 7px 8px", borderRadius: 6,
                      background: "var(--bg-surface)",
                      border: "1px solid rgba(212,175,55,0.12)",
                    }}>
                      <span style={{ ...lblInline, minWidth: 18, color: "rgba(212,175,55,0.85)", fontSize: 10 }}>D1</span>
                      <span style={{ ...lblInline, fontSize: 9 }}>lados</span>
                      <button
                        onClick={() => setFp(p => ({ ...p, tc: { ...(p.tc || {}), lados1: Math.max(0, (parseInt(p.tc?.lados1) || 0) - 1) } }))}
                        style={{ width: 22, height: 26, borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>−</button>
                      <input
                        type="number" min="0" max="2"
                        value={tcLados1}
                        onChange={e => setFp(p => ({ ...p, tc: { ...(p.tc || {}), lados1: parseInt(e.target.value) || 0 } }))}
                        style={{ ...inputSm, width: 36, textAlign: "center", color: "var(--accent)", fontWeight: 700, padding: "3px 2px" }} />
                      <button
                        onClick={() => setFp(p => ({ ...p, tc: { ...(p.tc || {}), lados1: Math.min(2, (parseInt(p.tc?.lados1) || 0) + 1) } }))}
                        style={{ width: 22, height: 26, borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
                      <span style={{ ...lblInline, fontSize: 9, marginLeft: 6 }}>D2</span>
                      <span style={{ ...lblInline, fontSize: 9 }}>lados</span>
                      <button
                        onClick={() => setFp(p => ({ ...p, tc: { ...(p.tc || {}), lados2: Math.max(0, (parseInt(p.tc?.lados2) || 0) - 1) } }))}
                        style={{ width: 22, height: 26, borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>−</button>
                      <input
                        type="number" min="0" max="2"
                        value={tcLados2}
                        onChange={e => setFp(p => ({ ...p, tc: { ...(p.tc || {}), lados2: parseInt(e.target.value) || 0 } }))}
                        style={{ ...inputSm, width: 36, textAlign: "center", color: "var(--accent)", fontWeight: 700, padding: "3px 2px" }} />
                      <button
                        onClick={() => setFp(p => ({ ...p, tc: { ...(p.tc || {}), lados2: Math.min(2, (parseInt(p.tc?.lados2) || 0) + 1) } }))}
                        style={{ width: 22, height: 26, borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
                    </div>

                    {tieneTC && (
                      <div style={{ padding: "5px 10px", borderRadius: 5,
                        background: "rgba(126,207,138,0.06)", border: "1px solid rgba(126,207,138,0.15)",
                        fontFamily: M, fontSize: 11, color: "var(--color-positive)", fontWeight: 600,
                        textAlign: "right",
                      }}>
                        → {(Math.round(metrosTC * 100) / 100).toFixed(2)} m lineales
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Parametrización ── */}
            {subTab === 'param' && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>

                {/* Zona + Condición en una sola fila */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={lblInline}>Zona</span>
                  <select value={fp.zona || ""} onChange={e => setFp(p => ({ ...p, zona: e.target.value || undefined }))}
                    style={{ ...inputSm, width: 130 }}>
                    <option value="">(módulo)</option>
                    {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre || z.id} — {z.material}</option>)}
                  </select>
                  <span style={{ ...lblInline, marginLeft: 4 }}>Cond</span>
                  <input value={fp.condition || ""} placeholder="ej: cajones > 0"
                    onChange={e => setFp(p => ({ ...p, condition: e.target.value || undefined }))}
                    style={{ ...inputSm, flex: 1, minWidth: 0 }} />
                </div>

                {/* Repeat en una sola fila */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={lblInline}>Repeat</span>
                  <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: M }}>var</span>
                  <input value={fp.repeat?.var || ""} placeholder="i"
                    onChange={e => setFp(p => ({ ...p, repeat: e.target.value ? { ...(p.repeat || { from: 1, to: 1 }), var: e.target.value } : (p.repeat?.from || p.repeat?.to ? { ...p.repeat, var: undefined } : undefined) }))}
                    style={{ ...inputSm, width: 36 }} />
                  <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: M }}>from</span>
                  <input value={fp.repeat?.from ?? ""} placeholder="1"
                    onChange={e => setFp(p => ({ ...p, repeat: e.target.value !== "" ? { var: "i", to: 1, ...(p.repeat || {}), from: e.target.value } : (p.repeat?.var || p.repeat?.to ? { ...p.repeat, from: undefined } : undefined) }))}
                    style={{ ...inputSm, width: 40 }} />
                  <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: M }}>to</span>
                  <input value={fp.repeat?.to ?? ""} placeholder="cajones"
                    onChange={e => setFp(p => ({ ...p, repeat: e.target.value !== "" ? { var: "i", from: 1, ...(p.repeat || {}), to: e.target.value } : (p.repeat?.var || p.repeat?.from ? { ...p.repeat, to: undefined } : undefined) }))}
                    style={{ ...inputSm, flex: 1, minWidth: 0 }} />
                </div>

              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

export default FormPieza;
