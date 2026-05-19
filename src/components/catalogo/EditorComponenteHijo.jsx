// ════════════════════════════════════════════════════════════════════════════
// EditorComponenteHijo.jsx — editor de UN subcomponente (vive en su tab)
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import FormPieza from './FormPieza.jsx';
import FilaPieza from './FilaPieza.jsx';
import EditorSubComponente from './EditorSubComponente.jsx';
import { evaluarFormula } from '../../utils.js';
import { resolverContextoModulo } from '../../services/moduloService.js';
import VarsExplorer, { construirScopes } from './VarsExplorer.jsx';
import GuiaFormulasBtn from './GuiaFormulasBtn.jsx';

const PIEZA_VACIA = {
  nombre: "", cantidad: 1,
  formula1: "alto", formula2: "profundidad",
  usaDim: "alto", usaDim2: "profundidad",
  offsetEsp: 0, offsetMm: 0, divisor: 1,
  offsetEsp2: 0, offsetMm2: 0, divisor2: 1,
  tc: { id: 1, lados1: 1, lados2: 0 },
  especial: false, dimLibre1: "", dimLibre2: "",
  posFormulas: { x: null, y: null, z: null },
  offset3d:    { x: 0, y: 0, z: 0 },
  rot3d:        0,
  orientacion3d: undefined,
  zona:          undefined,
  condition:     undefined,
  repeat:        undefined,
};

const clonarPieza = (p) => (typeof structuredClone === "function" ? structuredClone(p) : JSON.parse(JSON.stringify(p)));
const piezaVaciaNueva = () => clonarPieza(PIEZA_VACIA);

const M = "'DM Mono', monospace";

const inputBase = {
  fontFamily: M, fontSize: 12, padding: "6px 8px",
  background: "var(--bg-base)", border: "1px solid var(--border)",
  borderRadius: 6, color: "var(--text-primary)", outline: "none",
};
const lbl = {
  fontSize: 9, fontFamily: M, color: "var(--text-muted)", fontWeight: 500,
  textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 4, opacity: 0.75,
};
const btnDel = {
  padding: "6px 12px", borderRadius: 6, cursor: "pointer",
  fontFamily: M, fontSize: 11, fontWeight: 700,
  background: "rgba(200,60,60,0.10)", border: "1px solid rgba(200,60,60,0.30)",
  color: "#e07070",
};
const secHdr = {
  fontSize: 10, fontFamily: M, fontWeight: 700, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: "0.10em",
  paddingBottom: 8, marginBottom: 10, borderBottom: "1px solid var(--border)",
};
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
// chipBase eliminado — chips de variables renderizados por VarsExplorer.

// ─── SubTabBar ──────────────────────────────────────────────────────────────
function SubTabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)} style={{
          padding: "6px 13px", background: "none", border: "none",
          borderBottom: active === t.id ? "2px solid var(--accent)" : "2px solid transparent",
          color: active === t.id ? "var(--accent)" : "var(--text-muted)",
          cursor: "pointer", fontSize: 10, fontFamily: M,
          fontWeight: active === t.id ? 700 : 400,
          letterSpacing: "0.06em", textTransform: "uppercase",
          transition: "color 0.12s",
          marginBottom: -1, whiteSpace: "nowrap",
        }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── VarsDropdown ────────────────────────────────────────────────────────────
// Wrapper del botón "⚡ vars" + popover con VarsExplorer.
// Delega la navegación jerárquica al componente reutilizable VarsExplorer.
function VarsDropdown({ rowKey, openKey, onToggle, scopes, defaultScopeId, onInsert }) {
  const isOpen = openKey === rowKey;
  return (
    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
      <GuiaFormulasBtn />
      <div style={{ position: "relative" }}>
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
              onInsert={(name) => { onInsert(name); onToggle(null); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tooltip de ayuda contextual ─────────────────────────────────────────────
// Botón "?" que abre un panel explicativo en línea.
// Usado para "Copia" (repeat) y para "Parámetros" en el editor del hijo.
function AyudaTooltip({ titulo, children, posicion = 'abajo-derecha' }) {
  const [abierto, setAbierto] = useState(false);
  const posStyles = posicion === 'abajo-izquierda'
    ? { top: 'calc(100% + 6px)', right: 0 }
    : { top: 'calc(100% + 6px)', left: 0 };
  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <button
        onClick={() => setAbierto(v => !v)}
        style={{
          width: 18, height: 18, borderRadius: '50%', cursor: 'pointer',
          fontFamily: M, fontSize: 9, fontWeight: 700, lineHeight: 1,
          background: abierto ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.07)',
          border: `1px solid ${abierto ? 'rgba(212,175,55,0.55)' : 'rgba(255,255,255,0.15)'}`,
          color: abierto ? 'var(--accent)' : 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.12s', flexShrink: 0,
        }}>?</button>
      {abierto && (
        <div style={{
          position: 'absolute', ...posStyles, zIndex: 300,
          background: 'var(--bg-surface)', border: '1px solid var(--accent-border)',
          borderRadius: 8, padding: '10px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.50)',
          width: 264, fontSize: 11, lineHeight: 1.65,
          color: 'var(--text-secondary)', fontFamily: 'inherit',
        }}>
          {titulo && (
            <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 6, fontFamily: M, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {titulo}
            </div>
          )}
          {children}
          <button onClick={() => setAbierto(false)} style={{
            display: 'block', marginTop: 8, padding: '2px 8px', borderRadius: 5,
            cursor: 'pointer', fontFamily: M, fontSize: 10,
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)',
          }}>✕ Cerrar</button>
        </div>
      )}
    </div>
  );
}

// ─── Visor interactivo de parámetros del hijo ─────────────────────────────────
// Mismo formato que el configurador del padre: controles +/− para número,
// toggle para boolean, select para choice. Valores de prueba en estado local.
function VisorParamsHijo({ parametros, testVals, onTestValsChange }) {
  if (!parametros || parametros.length === 0) {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontFamily: M }}>
        Sin parámetros definidos — agregá uno en "Definición" para verlo aquí.
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {parametros.map(p => {
        const val = testVals[p.id] != null ? testVals[p.id] : (p.def ?? 0);
        const set = (v) => onTestValsChange({ ...testVals, [p.id]: v });

        if (p.tipo === 'boolean') {
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre || p.id}</span>
              <button onClick={() => set(!val)} style={{
                padding: '3px 14px', borderRadius: 5, cursor: 'pointer',
                fontFamily: M, fontSize: 11, fontWeight: 700,
                background: val ? 'rgba(126,207,138,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${val ? 'rgba(126,207,138,0.45)' : 'var(--border)'}`,
                color: val ? 'var(--color-positive)' : 'var(--text-muted)',
              }}>{val ? 'Sí' : 'No'}</button>
            </div>
          );
        }

        if (p.tipo === 'choice') {
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre || p.id}</span>
              <select value={val} onChange={e => set(e.target.value)}
                style={{ ...inputSm, width: 110 }}>
                {(p.opciones || []).map(o => (
                  <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
                ))}
              </select>
            </div>
          );
        }

        // number / integer
        const step = p.tipo === 'integer' ? 1 : 0.1;
        const numVal = Number(val) || 0;
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre || p.id}</span>
            <button onClick={() => set(p.min != null ? Math.max(p.min, numVal - step) : numVal - step)}
              style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
            <input type="number" value={val} min={p.min} max={p.max} step={step}
              onChange={e => {
                const v = p.tipo === 'integer' ? Math.round(Number(e.target.value) || 0) : (Number(e.target.value) || 0);
                const clamped = p.min != null ? Math.max(p.min, p.max != null ? Math.min(p.max, v) : v) : v;
                set(clamped);
              }}
              style={{ ...inputSm, width: 58, textAlign: 'center', color: 'var(--accent)', fontWeight: 700 }} />
            <button onClick={() => set(p.max != null ? Math.min(p.max, numVal + step) : numVal + step)}
              style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
            {(p.min != null || p.max != null) && (
              <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: M, flexShrink: 0 }}>
                {p.min ?? '−∞'}–{p.max ?? '+∞'}{p.unidad ? ` ${p.unidad}` : ''}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Editor de herrajes del subcomponente ───────────────────────────────────
function EditorHerrajesSub({ herrajes = [], onChange, costos }) {
  const update = (idx, patch) => onChange(herrajes.map((h, i) => i === idx ? { ...h, ...patch } : h));
  const remove = (idx) => onChange(herrajes.filter((_, i) => i !== idx));
  const add = () => onChange([...herrajes, { id: costos?.herrajes?.[0]?.id || "", cantidad: 1 }]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {herrajes.length === 0 ? (
        <div style={{ padding: "10px 0", textAlign: "center", fontSize: 11, color: "var(--text-muted)", fontFamily: M }}>
          Sin herrajes en este componente
        </div>
      ) : herrajes.map((h, idx) => (
        <div key={idx} style={{
          padding: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6,
          display: "grid", gridTemplateColumns: "1.4fr 1fr 1.4fr 60px", gap: 6, alignItems: "end",
        }}>
          <div>
            <div style={lbl}>Herraje</div>
            <select value={h.id || ""} onChange={e => update(idx, { id: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }}>
              <option value="">—</option>
              {(costos?.herrajes || []).map(item => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={lbl}>Cantidad (núm/fórmula)</div>
            <input value={h.cantidad ?? ""} placeholder="2 o cajones"
              onChange={e => update(idx, { cantidad: isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Condición (opc)</div>
            <input value={h.condition || ""} placeholder="ej: cajones > 0"
              onChange={e => update(idx, { condition: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <button onClick={() => remove(idx)} style={{ ...btnDel, padding: "6px 8px" }}>✕</button>
        </div>
      ))}
      <button onClick={add} style={{
        padding: "7px 12px", borderRadius: 6, cursor: "pointer",
        fontFamily: M, fontSize: 11, fontWeight: 700,
        background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.45)",
        color: "#c8a02a", alignSelf: "flex-start",
      }}>+ Agregar herraje</button>
    </div>
  );
}

// ─── Editor de parámetros propios del subcomp ───────────────────────────────
const TIPOS_PARAM_SUB = [
  { id: "number", label: "Número" },
  { id: "integer", label: "Entero" },
  { id: "boolean", label: "Sí / No" },
  { id: "choice", label: "Opción" },
];

function EditorParamsSub({ parametros = [], onChange }) {
  const update = (idx, patch) => onChange(parametros.map((p, i) => i === idx ? { ...p, ...patch } : p));
  const remove = (idx) => onChange(parametros.filter((_, i) => i !== idx));
  const add = () => onChange([...parametros, {
    id: `p${parametros.length + 1}`, nombre: "", tipo: "integer", def: 0,
  }]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {parametros.length === 0 ? (
        <div style={{ padding: "10px 0", textAlign: "center", fontSize: 11, color: "var(--text-muted)", fontFamily: M }}>
          Sin parámetros propios del componente.
        </div>
      ) : parametros.map((p, idx) => (
        <div key={idx} style={{
          padding: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6,
          display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr 1fr 60px", gap: 6, alignItems: "end",
        }}>
          <div>
            <div style={lbl}>ID</div>
            <input value={p.id} onChange={e => update(idx, { id: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Nombre visible</div>
            <input value={p.nombre} onChange={e => update(idx, { nombre: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Tipo</div>
            <select value={p.tipo} onChange={e => update(idx, { tipo: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }}>
              {TIPOS_PARAM_SUB.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <div style={lbl}>Default</div>
            {p.tipo === "boolean" ? (
              <select value={p.def ? "true" : "false"}
                onChange={e => update(idx, { def: e.target.value === "true" })}
                style={{ ...inputBase, width: "100%", boxSizing: "border-box" }}>
                <option value="false">No</option>
                <option value="true">Sí</option>
              </select>
            ) : (
              <input type="number" value={p.def ?? ""}
                onChange={e => update(idx, { def: parseFloat(e.target.value) || 0 })}
                style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
            )}
          </div>
          <button onClick={() => remove(idx)} style={{ ...btnDel, padding: "6px 8px" }}>✕</button>
        </div>
      ))}
      <button onClick={add} style={{
        padding: "7px 12px", borderRadius: 6, cursor: "pointer",
        fontFamily: M, fontSize: 11, fontWeight: 700,
        background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.45)",
        color: "#c8a02a", alignSelf: "flex-start",
      }}>+ Agregar parámetro</button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// EditorComponenteHijo — default export
// ════════════════════════════════════════════════════════════════════════════

export default function EditorComponenteHijo({
  subcomp,
  onChange,
  onDelete,
  parentDims,
  parentVariables,
  parentParametros,
  parentZonas,
  parentPiezas,              // ← piezas del módulo padre (para pieza-vars del padre)
  parentValoresParametros,   // ← valores efectivos del configurador de prueba
  espesor,
  costos,
}) {
  // ── Estado UI ────────────────────────────────────────────────────────────
  const [subTabMain, setSubTabMain]     = useState('editor');
  const [subTabEditor, setSubTabEditor] = useState('ident');
  const [subTabPiezas, setSubTabPiezas] = useState('lista');
  const [confirmandoDelete, setConfirmandoDelete] = useState(false);
  const [paramTestVals, setParamTestVals] = useState({});
  const [varsOpen, setVarsOpen] = useState(null);
  const activeInputEl = useRef(null);

  // Estado del editor de piezas
  const [fp, setFp]               = useState(() => piezaVaciaNueva());
  const [editandoIdx, setEditandoIdx] = useState(null);
  const [fpError, setFpError]     = useState("");

  // Estado del editor de variables propias
  const [varAgregando, setVarAgregando]         = useState(false);
  const [varNuevoNombre, setVarNuevoNombre]     = useState("");
  const [varEditando, setVarEditando]           = useState(null);
  const [varValorEditando, setVarValorEditando] = useState("");
  const [varConfirmDelete, setVarConfirmDelete] = useState(null);

  // ── Mutaciones ───────────────────────────────────────────────────────────
  const patch       = (cambios) => onChange({ ...subcomp, ...cambios });
  const patchOrigen = (k, v) => onChange({ ...subcomp, origen: { ...(subcomp.origen || {}), [k]: v } });
  const patchDim    = (k, v) => onChange({ ...subcomp, dimensiones: { ...(subcomp.dimensiones || {}), [k]: v } });
  const patchRepeat = (k, v) => onChange({ ...subcomp, repeat: { ...(subcomp.repeat || { var: "i" }), [k]: v } });

  // ── Contexto de fórmulas del padre (regla de oro: resolverContextoModulo) ──
  // Construimos un módulo virtual con los datos del padre para que
  // resolverContextoModulo resuelva variables y parámetros en un solo lugar.
  const moduloPadreVirtual = {
    dimensiones: parentDims || { ancho: 0, alto: 0, profundidad: 0 },
    variables:   parentVariables || {},
    parametros:  parentParametros || [],
    piezas:      parentPiezas || [],   // necesarias para que las pieza-vars del padre lleguen al subcomp
  };
  const { modVars: padreVars } = resolverContextoModulo(
    moduloPadreVirtual,
    costos || { materiales: [] },
    parentValoresParametros || {},
  );
  // El espesor llega como prop resuelto: lo imponemos sobre el que
  // resolverContextoModulo derivó del material por defecto.
  const ctxPadreSinI = { ...padreVars, ...(espesor != null ? { esp: espesor } : {}) };

  // ── Rango de la variable de repetición (i) ───────────────────────────────
  // El subcomp se replica con repeat { var, from, to }. Cada instancia tiene
  // su propio valor de `i`. Las dimensiones y posiciones que dependen de `i`
  // deben mostrarse como rango (min…max) sobre todas las instancias.
  const repeatCfg = subcomp.repeat || {};
  const repeatVar = repeatCfg.var || 'i';
  const iFromRaw  = repeatCfg.from == null ? 1 : evaluarFormula(String(repeatCfg.from), ctxPadreSinI);
  const iToRaw    = repeatCfg.to   == null ? 1 : evaluarFormula(String(repeatCfg.to),   ctxPadreSinI);
  const iFrom = Math.max(1, Math.floor(Number.isFinite(iFromRaw) ? iFromRaw : 1));
  const iTo   = Math.max(iFrom, Math.floor(Number.isFinite(iToRaw) ? iToRaw : 1));
  const iValues = [];
  for (let i = iFrom; i <= iTo; i++) iValues.push(i);
  if (iValues.length === 0) iValues.push(1);

  // ctxPadre con i = primera instancia (para todo lo que necesita un valor único)
  const ctxPadre = { ...ctxPadreSinI, [repeatVar]: iFrom };

  // ── Evaluación de fórmulas ───────────────────────────────────────────────
  // evalDim: valor estable (primera instancia) — para dimsLocales que se
  // propaga a piezas y al 3D.
  const evalDim = (formula, fallback) => {
    if (formula == null || formula === "") return fallback;
    if (typeof formula === "number") return formula;
    const v = evaluarFormula(String(formula), ctxPadre);
    return (v != null && Number.isFinite(v)) ? Math.round(v) : fallback;
  };

  // evalDimRango: rango sobre TODAS las instancias del repeat — para mostrar
  // en la UI cómo cambia el valor entre i=from e i=to.
  const evalDimRango = (formula, fallback) => {
    if (formula == null || formula === "") return { min: fallback, max: fallback, varies: false, valido: true };
    if (typeof formula === "number") return { min: formula, max: formula, varies: false, valido: true };
    const raws = iValues.map(i => evaluarFormula(String(formula), { ...ctxPadreSinI, [repeatVar]: i }));
    const valido = raws.every(v => v != null && Number.isFinite(v));
    if (!valido) return { min: fallback, max: fallback, varies: false, valido: false };
    const nums = raws.map(v => Math.round(v));
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return { min, max, varies: min !== max, valido: true };
  };

  const localAncho = evalDim(subcomp.dimensiones?.ancho, parentDims?.ancho ?? 0);
  const localAlto  = evalDim(subcomp.dimensiones?.alto,  parentDims?.alto  ?? 0);
  const localProf  = evalDim(subcomp.dimensiones?.profundidad, parentDims?.profundidad ?? 0);
  const dimsLocales = { ancho: localAncho, alto: localAlto, profundidad: localProf };

  // Rangos para mostrar en la UI
  const rangoAncho = evalDimRango(subcomp.dimensiones?.ancho, parentDims?.ancho ?? 0);
  const rangoAlto  = evalDimRango(subcomp.dimensiones?.alto,  parentDims?.alto  ?? 0);
  const rangoProf  = evalDimRango(subcomp.dimensiones?.profundidad, parentDims?.profundidad ?? 0);
  const rangoX     = evalDimRango(subcomp.origen?.x, 0);
  const rangoY     = evalDimRango(subcomp.origen?.y, 0);
  const rangoZ     = evalDimRango(subcomp.origen?.z, 0);

  // ── Variables y parámetros combinados para las piezas ───────────────────
  const variablesParaPieza  = { ...(parentVariables || {}), ...(subcomp.variables || {}) };
  const parametrosParaPieza = [...(parentParametros || []), ...(subcomp.parametros || [])];
  const zonasParaPieza      = [...(parentZonas || []), ...(subcomp.zonas || [])];

  // Módulo virtual del subcomponente — contexto usado en FormPieza y FilaPieza
  const moduloSubVirtual = {
    dimensiones: dimsLocales,
    variables:   variablesParaPieza,
    parametros:  parametrosParaPieza,
    zonas:       zonasParaPieza,
    piezas:      subcomp.piezas || [],
  };
  const { modVars: modVarsLista } = resolverContextoModulo(
    moduloSubVirtual,
    costos || { materiales: [] },
    parentValoresParametros || {},
  );

  // (Las listas planas de vars antes calculadas acá fueron reemplazadas por
  // construirScopes(...) + VarsExplorer — todo el árbol jerárquico de
  // navegación se arma una sola vez en scopesExplorer.)

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

  // Construir los scopes para el VarsExplorer:
  //   • scope "padre" — módulo padre con todas sus piezas/vars
  //   • scope "sub:..." — subcomp actual con sus piezas/vars
  // Reusamos construirScopes pasando un módulo unificado: padre + este sub.
  const moduloUnificadoExplorer = {
    ...moduloPadreVirtual,
    nombre: 'Padre',
    subComponentes: [subcomp],
  };
  const scopesExplorer = construirScopes(
    moduloUnificadoExplorer,
    costos || { materiales: [] },
    parentValoresParametros || {},
  );
  const subScopeId = `sub:${subcomp.id || subcomp.nombre || 0}`;

  // ── Acciones sobre piezas ────────────────────────────────────────────────
  const normalizar = (p) => ({
    ...p,
    cantidad:  Math.max(1, parseInt(p.cantidad) || 1),
    offsetEsp: parseInt(p.offsetEsp) || 0,
    offsetMm:  parseInt(p.offsetMm) || 0,
    divisor:   Math.max(1, parseInt(p.divisor) || 1),
    offsetEsp2: parseInt(p.offsetEsp2) || 0,
    offsetMm2:  parseInt(p.offsetMm2) || 0,
    divisor2:   Math.max(1, parseInt(p.divisor2) || 1),
    tc: { id: parseInt(p.tc?.id) || 0, lados1: parseInt(p.tc?.lados1) || 0, lados2: parseInt(p.tc?.lados2) || 0 },
  });

  const agregarPieza = () => {
    if (!fp.nombre.trim()) { setFpError("Ingresá el nombre."); return; }
    const nueva = clonarPieza(normalizar(fp));
    const piezasNuevas = editandoIdx !== null
      ? (subcomp.piezas || []).map((p, i) => i === editandoIdx ? nueva : p)
      : [...(subcomp.piezas || []), nueva];
    patch({ piezas: piezasNuevas });
    setFp(piezaVaciaNueva());
    setEditandoIdx(null);
    setFpError("");
  };
  const editarPieza = (idx) => {
    setFp({ ...piezaVaciaNueva(), ...clonarPieza((subcomp.piezas || [])[idx]) });
    setEditandoIdx(idx);
    setSubTabMain('piezas');
    setSubTabPiezas('nueva');
  };
  const cancelarEdicion = () => { setFp(piezaVaciaNueva()); setEditandoIdx(null); setFpError(""); };
  const eliminarPieza = (idx) => {
    patch({ piezas: (subcomp.piezas || []).filter((_, i) => i !== idx) });
    if (editandoIdx === idx) cancelarEdicion();
  };
  const duplicarPieza = (idx) => {
    const orig = (subcomp.piezas || [])[idx];
    const copia = { ...clonarPieza(orig), nombre: `${orig.nombre} (copia)` };
    patch({ piezas: [
      ...(subcomp.piezas || []).slice(0, idx + 1),
      copia,
      ...(subcomp.piezas || []).slice(idx + 1),
    ] });
  };
  const moverPieza = (idx, dir) => {
    const lista = subcomp.piezas || [];
    const dest = idx + dir;
    if (dest < 0 || dest >= lista.length) return;
    const n = [...lista];
    [n[idx], n[dest]] = [n[dest], n[idx]];
    patch({ piezas: n });
  };

  const NOMBRES_SUGERIDOS = ["Frente", "Lateral", "Base", "Trasera", "Tapa", "Costado"];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Sub-tabs principales ─────────────────────────────────────────── */}
      <SubTabBar tabs={[
        { id: 'editor', label: '✎ Editor' },
        { id: 'datos',  label: '📐 Datos' },
        { id: 'piezas', label: `🪵 Piezas · ${(subcomp.piezas || []).length}` },
      ]} active={subTabMain} onSelect={setSubTabMain} />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Sub-tab EDITOR                                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {subTabMain === 'editor' && (
        <div style={{ display: "flex", flexDirection: "column" }}>

          {/* Sub-tabs internos del editor */}
          <SubTabBar tabs={[
            { id: 'ident',     label: '✎ Ident.' },
            { id: 'variables', label: `⚡ Vars${Object.keys(subcomp.variables || {}).length > 0 ? ` · ${Object.keys(subcomp.variables || {}).length}` : ""}` },
            { id: 'herrajes',  label: `🔩 Herrajes${(subcomp.herrajes || []).length > 0 ? ` · ${(subcomp.herrajes || []).length}` : ""}` },
            { id: 'params',    label: `🎚 Params${(subcomp.parametros || []).length > 0 ? ` · ${(subcomp.parametros || []).length}` : ""}` },
            { id: 'nietos',    label: `🧩 Nietos${(subcomp.subComponentes || []).length > 0 ? ` · ${(subcomp.subComponentes || []).length}` : ""}` },
          ]} active={subTabEditor} onSelect={setSubTabEditor} />

          {/* ── Ident: ID + Nombre + Repetición ───────────────────────── */}
          {subTabEditor === 'ident' && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 16 }}>

              {/* Row: ID + Nombre + delete */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input value={subcomp.id || ""} placeholder="id"
                  onChange={e => patch({ id: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
                  style={{ ...inputSm, width: 90, flexShrink: 0 }} />
                <input value={subcomp.nombre || ""} placeholder="Nombre del componente"
                  onChange={e => patch({ nombre: e.target.value })}
                  style={{ ...inputSm, flex: 1, minWidth: 0, fontSize: 13 }} />
                {confirmandoDelete ? (
                  <>
                    <span style={{ fontSize: 10, fontFamily: M, color: "#e07070", whiteSpace: "nowrap", flexShrink: 0 }}>¿Eliminar?</span>
                    <button onClick={() => { setConfirmandoDelete(false); onDelete(); }}
                      style={{ height: 28, padding: "0 10px", borderRadius: 5, cursor: "pointer", fontWeight: 700,
                        fontFamily: M, fontSize: 10, flexShrink: 0,
                        background: "rgba(200,60,60,0.18)", border: "1px solid rgba(200,60,60,0.45)", color: "#e07070" }}>
                      Sí
                    </button>
                    <button onClick={() => setConfirmandoDelete(false)}
                      style={{ height: 28, padding: "0 10px", borderRadius: 5, cursor: "pointer",
                        fontFamily: M, fontSize: 10, flexShrink: 0,
                        background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      No
                    </button>
                  </>
                ) : (
                  <button onClick={() => setConfirmandoDelete(true)}
                    style={{ height: 28, padding: "0 11px", borderRadius: 5, cursor: "pointer",
                      fontFamily: M, fontSize: 10, fontWeight: 700, flexShrink: 0,
                      background: "rgba(200,60,60,0.10)", border: "1px solid rgba(200,60,60,0.30)", color: "#e07070" }}>
                    ✕
                  </button>
                )}
              </div>

              {/* Copia: repetición del componente entero */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ ...lbl, margin: 0 }}>📋 COPIA</span>
                  <AyudaTooltip titulo="¿Qué es Copia?" posicion="abajo-derecha">
                    <p style={{ margin: '0 0 6px' }}>Replica este componente <strong>N veces</strong> dentro del módulo padre.</p>
                    <p style={{ margin: '0 0 6px' }}>La variable (ej: <code style={{ color: 'var(--accent)', fontFamily: M }}>i</code>) toma valores del rango definido en cada copia.</p>
                    <p style={{ margin: '0 0 6px' }}>Usá <code style={{ color: 'var(--accent)', fontFamily: M }}>i</code> en las fórmulas de posición para distribuirlas en el espacio.</p>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 10 }}>Ej: 3 cajones → Hasta = cajones · Y = (i-1) * alto_cajon</p>
                  </AyudaTooltip>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px",
                  background: "var(--bg-surface)", borderRadius: 6, border: "1px solid var(--border)" }}>
                  <span style={lblInline}>var</span>
                  <input value={subcomp.repeat?.var || "i"}
                    onChange={e => patchRepeat("var", e.target.value)}
                    style={{ ...inputSm, width: 36 }} />
                  <span style={lblInline}>de</span>
                  <input value={subcomp.repeat?.from ?? ""} placeholder="1"
                    onChange={e => patchRepeat("from", isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
                    style={{ ...inputSm, width: 40 }} />
                  <span style={lblInline}>a</span>
                  <input value={subcomp.repeat?.to ?? ""} placeholder="N"
                    onChange={e => patchRepeat("to", isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
                    style={{ ...inputSm, width: 70 }} />
                  <span style={lblInline}>si</span>
                  <input value={subcomp.condition || ""} placeholder="condición (opcional)"
                    onChange={e => patch({ condition: e.target.value })}
                    style={{ ...inputSm, flex: 1, minWidth: 0 }} />
                </div>
              </div>

            </div>
          )}

          {/* ── Variables propias ────────────────────────────────────── */}
          {subTabEditor === 'variables' && (() => {
            const variables = subcomp.variables || {};
            const customEntries = Object.entries(variables);
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 14 }}>

                {/* Contexto disponible — explorador unificado en modo solo-lectura */}
                <div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: M, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Contexto disponible
                  </div>
                  <VarsExplorer
                    scopes={scopesExplorer}
                    defaultScopeId={subScopeId}
                    readOnly={false}
                    onInsert={() => {}}
                    style={{ width: "100%", maxHeight: 320 }}
                    carpetas={subcomp.variablesCarpetas || {}}
                    onCarpetasChange={(scopeId, newC) =>
                      patch({ variablesCarpetas: { ...(subcomp.variablesCarpetas || {}), [scopeId]: newC } })
                    }
                  />
                </div>

                {/* Header + botón agregar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: M, textTransform: "uppercase", letterSpacing: "0.08em" }}>Variables propias</div>
                  {varAgregando ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input autoFocus value={varNuevoNombre}
                        onChange={e => setVarNuevoNombre(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const n = varNuevoNombre.trim();
                            if (n && !(n in variables)) {
                              patch({ variables: { ...(subcomp.variables || {}), [n]: '' } });
                              setVarNuevoNombre(''); setVarAgregando(false);
                            }
                          }
                          if (e.key === 'Escape') { setVarAgregando(false); setVarNuevoNombre(''); }
                        }}
                        placeholder="nombre (ej: luz)"
                        style={{ width: 110, fontFamily: M, fontSize: 12, padding: "5px 8px", background: "var(--bg-base)", border: "1px solid rgba(212,175,55,0.45)", borderRadius: 6, color: "var(--text-primary)", outline: "none" }} />
                      <button
                        onClick={() => {
                          const n = varNuevoNombre.trim();
                          if (n && !(n in variables)) {
                            patch({ variables: { ...(subcomp.variables || {}), [n]: '' } });
                            setVarNuevoNombre(''); setVarAgregando(false);
                          }
                        }}
                        style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: M, cursor: "pointer", background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)" }}>
                        OK
                      </button>
                      <button onClick={() => { setVarAgregando(false); setVarNuevoNombre(''); }}
                        style={{ padding: "5px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: M }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setVarAgregando(true); setVarNuevoNombre(''); }}
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: M, cursor: "pointer", background: "transparent", border: "1px dashed rgba(212,175,55,0.40)", color: "var(--accent)" }}>
                      + Variable propia
                    </button>
                  )}
                </div>

                {customEntries.length === 0 && !varAgregando && (
                  <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12, borderRadius: 8, border: "1px dashed var(--border)", color: "var(--text-muted)", fontFamily: M }}>
                    Sin variables propias — creá una nueva o usá las del contexto
                  </div>
                )}

                {customEntries.map(([nombre, valor]) => {
                  const valStr    = typeof valor === 'number' ? String(valor) : (valor || '');
                  const evalVal   = modVarsLista[nombre];
                  const evalStr   = evalVal != null ? String(Math.round(evalVal * 10) / 10) : null;
                  const pendiente = varConfirmDelete === nombre;
                  const enEdicion = varEditando === nombre;
                  const confirmar = () => {
                    patch({ variables: { ...(subcomp.variables || {}), [nombre]: varValorEditando } });
                    setVarEditando(null);
                  };
                  const cancelar = () => { setVarEditando(null); setVarValorEditando(''); };
                  return (
                    <div key={nombre} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 5,
                        background: "rgba(212,175,55,0.07)",
                        border: `1px solid ${enEdicion ? "rgba(212,175,55,0.55)" : "rgba(212,175,55,0.22)"}`,
                        borderRadius: 7, padding: "5px 8px",
                      }}>
                        <span style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>{nombre} =</span>
                        {enEdicion ? (
                          <>
                            <input autoFocus type="text" value={varValorEditando}
                              onFocus={e => { activeInputEl.current = e.target; }}
                              onChange={e => setVarValorEditando(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') confirmar(); if (e.key === 'Escape') cancelar(); }}
                              style={{ flex: 1, minWidth: 60, fontFamily: M, fontSize: 12, fontWeight: 700, padding: "3px 6px", background: "var(--bg-base)", border: "1px solid rgba(212,175,55,0.45)", borderRadius: 5, color: "var(--text-primary)", outline: "none" }} />
                            <VarsDropdown
                              rowKey={`var_${nombre}`} openKey={varsOpen} onToggle={setVarsOpen}
                              scopes={scopesExplorer} defaultScopeId={subScopeId}
                              onInsert={(n) => {
                                insertarVariable(n);
                                // Sync con el state controlado del editor
                                const el = activeInputEl.current;
                                if (el) setVarValorEditando(el.value);
                              }}
                            />
                            <button onClick={confirmar} style={{ padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, fontFamily: M, cursor: "pointer", background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)", flexShrink: 0 }}>✓</button>
                            <button onClick={cancelar} style={{ padding: "2px 6px", borderRadius: 5, fontSize: 11, cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: M, flexShrink: 0 }}>✕</button>
                          </>
                        ) : (
                          <>
                            <span style={{ flex: 1, fontFamily: M, fontSize: 12, fontWeight: 700, padding: "3px 6px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {valStr || <span style={{ color: "var(--text-muted)", fontWeight: 400, fontStyle: "italic" }}>(vacío)</span>}
                            </span>
                            {evalStr !== null && evalStr !== valStr && (
                              <span style={{ fontSize: 10, fontFamily: M, color: "var(--color-positive)", fontWeight: 700, flexShrink: 0 }}>= {evalStr}</span>
                            )}
                            <button
                              onClick={() => { setVarEditando(nombre); setVarValorEditando(valStr); }}
                              style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 11, padding: "2px 8px", borderRadius: 5, flexShrink: 0, fontFamily: M }}>
                              ✎
                            </button>
                            <button
                              onClick={() => setVarConfirmDelete(nombre)}
                              style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "0 2px", opacity: 0.45, flexShrink: 0 }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = 0.45; }}>
                              ×
                            </button>
                          </>
                        )}
                      </div>
                      {pendiente && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.30)", borderRadius: 7 }}>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: M, flex: 1 }}>
                            ¿Eliminar <strong style={{ color: "var(--accent)" }}>{nombre}</strong>?
                          </span>
                          <button
                            onClick={() => {
                              const { [nombre]: _r, ...rest } = variables;
                              patch({ variables: rest });
                              setVarConfirmDelete(null);
                            }}
                            style={{ padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 700, fontFamily: M, cursor: "pointer", background: "rgba(200,60,60,0.20)", border: "1px solid rgba(200,60,60,0.45)", color: "#e07070" }}>
                            Sí
                          </button>
                          <button onClick={() => setVarConfirmDelete(null)}
                            style={{ padding: "3px 8px", borderRadius: 5, fontSize: 11, cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: M }}>
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            );
          })()}

          {/* ── Herrajes ──────────────────────────────────────────────── */}
          {subTabEditor === 'herrajes' && (
            <div style={{ paddingTop: 16 }}>
              <EditorHerrajesSub herrajes={subcomp.herrajes || []}
                onChange={(h) => patch({ herrajes: h })}
                costos={costos} />
            </div>
          )}

          {/* ── Parámetros propios ────────────────────────────────────── */}
          {subTabEditor === 'params' && (
            <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Header con ayuda */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ ...secHdr, margin: 0, border: 'none', paddingBottom: 0, flex: 1 }}>🎚 Vista previa — valores de prueba</div>
                <AyudaTooltip titulo="¿Qué son los parámetros?" posicion="abajo-izquierda">
                  <p style={{ margin: '0 0 6px' }}>Son valores configurables que el usuario puede ajustar al armar un presupuesto.</p>
                  <p style={{ margin: '0 0 6px' }}>Podés definir tipo (número, sí/no, opción), rango y valor por defecto.</p>
                  <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 10 }}>Ej: cantidad de cajones, tipo de cierre, número de estantes.</p>
                </AyudaTooltip>
              </div>

              {/* Visor interactivo — misma UI que el configurador del padre */}
              <VisorParamsHijo
                parametros={subcomp.parametros || []}
                testVals={paramTestVals}
                onTestValsChange={setParamTestVals}
              />

              {/* Editor de definición */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={secHdr}>Definición de parámetros</div>
                <EditorParamsSub parametros={subcomp.parametros || []}
                  onChange={(p) => patch({ parametros: p })} />
              </div>

            </div>
          )}

          {/* ── Nietos ────────────────────────────────────────────────── */}
          {subTabEditor === 'nietos' && (
            <div style={{ paddingTop: 16 }}>
              <ListaNietos
                subComponentes={subcomp.subComponentes || []}
                onChange={(s) => patch({ subComponentes: s })} />
            </div>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Sub-tab DATOS — dimensiones + posición del hijo                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {subTabMain === 'datos' && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 20 }}>

          {/* Dimensiones */}
          <div>
            <div style={secHdr}>
              📐 Dimensiones
              {iValues.length > 1 && (
                <span style={{ marginLeft: 8, color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                  · {iValues.length} instancia{iValues.length !== 1 ? "s" : ""} ({repeatVar}={iFrom}…{iTo})
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                { key: "ancho",       label: "A", rango: rangoAncho, placeholder: "ancho - 2*esp" },
                { key: "alto",        label: "H", rango: rangoAlto,  placeholder: "alto / cajones" },
                { key: "profundidad", label: "P", rango: rangoProf,  placeholder: "profundidad - 50" },
              ].map(({ key, label, rango, placeholder }) => {
                const formula = subcomp.dimensiones?.[key] ?? "";
                return (
                  <div key={key} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "7px 10px 7px 8px",
                    background: "var(--bg-surface)", borderRadius: 6,
                    border: `1px solid ${!rango.valido ? "rgba(224,112,112,0.40)" : "rgba(200,160,42,0.12)"}`,
                  }}>
                    <span style={{ ...lblInline, minWidth: 18, color: "rgba(200,160,42,0.75)", fontSize: 10 }}>{label}</span>
                    <input
                      value={formula}
                      placeholder={placeholder}
                      onFocus={e => { activeInputEl.current = e.target; }}
                      onChange={e => patchDim(key, e.target.value)}
                      style={{ ...inputSm, flex: 1, minWidth: 0 }}
                    />
                    <VarsDropdown
                      rowKey={`dim_${key}`} openKey={varsOpen} onToggle={setVarsOpen}
                      scopes={scopesExplorer} defaultScopeId={subScopeId}
                      onInsert={insertarVariable}
                    />
                    <div style={{ minWidth: 70, textAlign: "right", flexShrink: 0, fontFamily: M, fontSize: 11, color: rango.varies ? "var(--accent)" : "var(--text-muted)", fontWeight: rango.varies ? 700 : 400 }}>
                      {rango.varies ? `${rango.min}…${rango.max}` : rango.min}
                      <span style={{ fontSize: 8 }}>mm</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Posición */}
          <div>
            <div style={secHdr}>
              📍 Posición
              {iValues.length > 1 && (
                <span style={{ marginLeft: 8, color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                  · rango sobre {repeatVar}={iFrom}…{iTo}
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                { key: "x", label: "X", rango: rangoX, placeholder: "esp" },
                { key: "y", label: "Y", rango: rangoY, placeholder: "(i-1)*altoCajon" },
                { key: "z", label: "Z", rango: rangoZ, placeholder: "esp" },
              ].map(({ key, label, rango, placeholder }) => {
                const formula = subcomp.origen?.[key] ?? "";
                return (
                  <div key={key} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "7px 10px 7px 8px",
                    background: "var(--bg-surface)", borderRadius: 6,
                    border: `1px solid ${!rango.valido ? "rgba(224,112,112,0.40)" : "rgba(200,160,42,0.12)"}`,
                  }}>
                    <span style={{ ...lblInline, minWidth: 18, color: "rgba(200,160,42,0.75)", fontSize: 10 }}>{label}</span>
                    <input
                      value={formula}
                      placeholder={placeholder}
                      onFocus={e => { activeInputEl.current = e.target; }}
                      onChange={e => patchOrigen(key, e.target.value)}
                      style={{ ...inputSm, flex: 1, minWidth: 0 }}
                    />
                    <VarsDropdown
                      rowKey={`orig_${key}`} openKey={varsOpen} onToggle={setVarsOpen}
                      scopes={scopesExplorer} defaultScopeId={subScopeId}
                      onInsert={insertarVariable}
                    />
                    <div style={{ minWidth: 70, textAlign: "right", flexShrink: 0, fontFamily: M, fontSize: 11, color: rango.varies ? "var(--accent)" : "var(--text-muted)", fontWeight: rango.varies ? 700 : 400 }}>
                      {rango.varies ? `${rango.min}…${rango.max}` : rango.min}
                      <span style={{ fontSize: 8 }}>mm</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Sub-tab PIEZAS                                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {subTabMain === 'piezas' && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          <SubTabBar tabs={[
            { id: 'nueva',  label: editandoIdx !== null ? '✎ Editando' : '+ Nueva pieza' },
            { id: 'lista',  label: `▤ Lista · ${(subcomp.piezas || []).length}` },
          ]} active={subTabPiezas} onSelect={setSubTabPiezas} />

          {/* ── Nueva pieza ───────────────────────────────────────────── */}
          {subTabPiezas === 'nueva' && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <FormPieza
                fp={fp} setFp={setFp}
                onCancelar={cancelarEdicion}
                editando={editandoIdx !== null}
                nombresSugeridos={NOMBRES_SUGERIDOS}
                modulo={moduloSubVirtual}
                costos={costos}
                valoresParametros={parentValoresParametros || {}} />

              {fpError && <p style={{ color: "#e07070", fontSize: 12, margin: "6px 0 0" }}>⚠ {fpError}</p>}

              <button onClick={agregarPieza} style={{
                width: "100%", padding: "7px 0", borderRadius: 7, cursor: "pointer", fontWeight: 600,
                fontFamily: M, fontSize: 11, letterSpacing: "0.05em",
                background: "rgba(100,110,125,0.15)", border: "1px solid rgba(100,110,125,0.45)", color: "var(--text-primary)",
              }}>
                {editandoIdx !== null ? "✓ ACTUALIZAR PIEZA" : "+ AGREGAR PIEZA AL COMPONENTE"}
              </button>
            </div>
          )}

          {/* ── Lista de piezas ───────────────────────────────────────── */}
          {subTabPiezas === 'lista' && (
            <div>
              {(subcomp.piezas || []).length === 0 ? (
                <div style={{ padding: "28px 0", textAlign: "center", fontSize: 12,
                  borderRadius: 8, border: "1px dashed var(--border)",
                  color: "var(--text-muted)", fontFamily: M }}>
                  Sin piezas todavía — agregá la primera en "Nueva pieza"
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontFamily: M, color: "var(--text-muted)" }}>
                      {(subcomp.piezas || []).length} pieza{(subcomp.piezas || []).length !== 1 ? "s" : ""}
                    </span>
                    <span style={{ fontSize: 10, fontFamily: M, color: "var(--text-muted)" }}>
                      Dims: <span style={{ color: "var(--text-primary)" }}>{localAncho}×{localAlto}×{localProf} mm</span>
                    </span>
                  </div>
                  {(subcomp.piezas || []).map((p, i) => (
                    <FilaPieza key={i} pieza={p} idx={i}
                      dims={dimsLocales} espesor={espesor} tapacanto={costos.tapacanto}
                      isFirst={i === 0} isLast={i === (subcomp.piezas || []).length - 1}
                      modVars={modVarsLista}
                      onDelete={eliminarPieza}
                      onEdit={editarPieza}
                      onDuplicate={duplicarPieza}
                      onMoveUp={(j) => moverPieza(j, -1)}
                      onMoveDown={(j) => moverPieza(j, 1)}
                      onChangeCantidad={(cant) => patch({
                        piezas: (subcomp.piezas || []).map((px, j) => j === i ? { ...px, cantidad: cant } : px),
                      })} />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}

// ── Lista de subcomponentes anidados ────────────────────────────────────────
function ListaNietos({ subComponentes, onChange }) {
  const update = (idx, sub) => onChange(subComponentes.map((s, i) => i === idx ? sub : s));
  const remove = (idx) => onChange(subComponentes.filter((_, i) => i !== idx));
  const add = () => onChange([...subComponentes, {
    id: `nieto${subComponentes.length + 1}`, nombre: "",
    repeat: { var: "i", from: 1, to: 1 },
    origen: { x: "0", y: "0", z: "0" },
    dimensiones: { ancho: "ancho", alto: "alto", profundidad: "profundidad" },
    parametros: [], piezas: [], herrajes: [], subComponentes: [],
  }]);

  if (subComponentes.length === 0) {
    return (
      <div style={{ padding: "10px 0", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, fontFamily: M }}>
          Sin nietos — para casos complejos (ej: cajón con compartimentos internos).
        </div>
        <button onClick={add} style={{
          padding: "6px 12px", borderRadius: 6, cursor: "pointer",
          fontFamily: M, fontSize: 11, fontWeight: 700,
          background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.45)",
          color: "#c8a02a",
        }}>+ Anidar subcomponente</button>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {subComponentes.map((sub, idx) => (
        <EditorSubComponente
          key={idx}
          subcomp={sub}
          onChange={(s) => update(idx, s)}
          onDelete={() => remove(idx)} />
      ))}
      <button onClick={add} style={{
        padding: "6px 12px", borderRadius: 6, cursor: "pointer",
        fontFamily: M, fontSize: 11, fontWeight: 700,
        background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.45)",
        color: "#c8a02a", alignSelf: "flex-start",
      }}>+ Anidar otro subcomponente</button>
    </div>
  );
}
