// ════════════════════════════════════════════════════════════════════════════
// EditorComponenteHijo.jsx — editor de UN subcomponente (vive en su tab)
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import FormPieza from './FormPieza.jsx';
import FilaPieza from './FilaPieza.jsx';
import EditorSubComponente from './EditorSubComponente.jsx';
import { evaluarFormula } from '../../utils.js';
import { resolverContextoModulo } from '../../services/moduloService.js';

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
const chipBase = (active, custom) => ({
  padding: "2px 8px", borderRadius: 8, cursor: "pointer",
  fontFamily: M, fontSize: 10, fontWeight: active ? 700 : 500,
  background: active ? "rgba(212,175,55,0.18)" : custom ? "rgba(120,180,255,0.08)" : "rgba(255,255,255,0.04)",
  border: `1px solid ${active ? "rgba(212,175,55,0.45)" : custom ? "rgba(120,180,255,0.28)" : "var(--border)"}`,
  color: active ? "var(--accent)" : custom ? "#8ab4e8" : "var(--text-muted)",
  letterSpacing: "0.04em", flexShrink: 0,
});

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
function VarsDropdown({ rowKey, openKey, onToggle, baseVarNames, customVarNames, onInsert }) {
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
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 100,
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: 7, padding: "8px 10px", boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
          display: "flex", flexWrap: "wrap", gap: 4, minWidth: 180, maxWidth: 260,
        }}>
          {baseVarNames.map(v => (
            <button key={v} onMouseDown={e => { onInsert(e, v); onToggle(null); }}
              style={chipBase(false, false)}>{v}</button>
          ))}
          {customVarNames.length > 0 && (
            <div style={{ width: "100%", height: 1, background: "var(--border)", margin: "3px 0" }} />
          )}
          {customVarNames.map(n => (
            <button key={n} onMouseDown={e => { onInsert(e, n); onToggle(null); }}
              style={chipBase(false, true)}>{n}</button>
          ))}
        </div>
      )}
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
  espesor,
  costos,
}) {
  // ── Estado UI ────────────────────────────────────────────────────────────
  const [subTabMain, setSubTabMain]     = useState('editor');
  const [subTabEditor, setSubTabEditor] = useState('ident');
  const [subTabPiezas, setSubTabPiezas] = useState('datos');
  const [confirmandoDelete, setConfirmandoDelete] = useState(false);
  const [varsOpen, setVarsOpen] = useState(null);
  const activeInputEl = useRef(null);

  // Estado del editor de piezas
  const [fp, setFp]               = useState(() => piezaVaciaNueva());
  const [editandoIdx, setEditandoIdx] = useState(null);
  const [fpError, setFpError]     = useState("");

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
  };
  const { modVars: padreVars, baseVars: padreBase } = resolverContextoModulo(
    moduloPadreVirtual,
    costos || { materiales: [] },
  );
  // El espesor llega como prop resuelto: lo imponemos sobre el que
  // resolverContextoModulo derivó del material por defecto.
  const ctxPadre = { ...padreVars, ...(espesor != null ? { esp: espesor } : {}), i: 1 };

  // ── Dimensiones locales evaluadas ────────────────────────────────────────
  const evalDim = (formula, fallback) => {
    if (formula == null || formula === "") return fallback;
    if (typeof formula === "number") return formula;
    const v = evaluarFormula(String(formula), ctxPadre);
    return (v != null && Number.isFinite(v)) ? Math.round(v) : fallback;
  };
  const localAncho = evalDim(subcomp.dimensiones?.ancho, parentDims?.ancho ?? 0);
  const localAlto  = evalDim(subcomp.dimensiones?.alto,  parentDims?.alto  ?? 0);
  const localProf  = evalDim(subcomp.dimensiones?.profundidad, parentDims?.profundidad ?? 0);
  const dimsLocales = { ancho: localAncho, alto: localAlto, profundidad: localProf };

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
  );

  const baseVarNamesHijo   = Object.keys(padreBase).concat(['i']);
  const customVarNamesHijo = Object.keys(ctxPadre).filter(k => !baseVarNamesHijo.includes(k));

  const localOrigenX = evalDim(subcomp.origen?.x, 0);
  const localOrigenY = evalDim(subcomp.origen?.y, 0);
  const localOrigenZ = evalDim(subcomp.origen?.z, 0);

  const insertarVariable = (e, nombre) => {
    e.preventDefault();
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
        { id: 'piezas', label: `🪵 Piezas · ${(subcomp.piezas || []).length}` },
      ]} active={subTabMain} onSelect={setSubTabMain} />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Sub-tab EDITOR                                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {subTabMain === 'editor' && (
        <div style={{ display: "flex", flexDirection: "column" }}>

          {/* Sub-tabs internos del editor */}
          <SubTabBar tabs={[
            { id: 'ident',    label: '✎ Ident.' },
            { id: 'herrajes', label: `🔩 Herrajes${(subcomp.herrajes || []).length > 0 ? ` · ${(subcomp.herrajes || []).length}` : ""}` },
            { id: 'params',   label: `🎚 Params${(subcomp.parametros || []).length > 0 ? ` · ${(subcomp.parametros || []).length}` : ""}` },
            { id: 'nietos',   label: `🧩 Nietos${(subcomp.subComponentes || []).length > 0 ? ` · ${(subcomp.subComponentes || []).length}` : ""}` },
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

              {/* Repetición: compact inline row */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px",
                background: "var(--bg-surface)", borderRadius: 6, border: "1px solid var(--border)" }}>
                <span style={{ ...lblInline, fontSize: 10 }}>🔁</span>
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
          )}

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
            <div style={{ paddingTop: 16 }}>
              <EditorParamsSub parametros={subcomp.parametros || []}
                onChange={(p) => patch({ parametros: p })} />
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
      {/* Sub-tab PIEZAS                                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {subTabMain === 'piezas' && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          <SubTabBar tabs={[
            { id: 'datos',  label: '📐 Datos hijo' },
            { id: 'nueva',  label: editandoIdx !== null ? '✎ Editando' : '+ Nueva pieza' },
            { id: 'lista',  label: `▤ Lista · ${(subcomp.piezas || []).length}` },
          ]} active={subTabPiezas} onSelect={setSubTabPiezas} />

          {/* ── Datos hijo: dimensiones + posición 3D ─────────────────── */}
          {subTabPiezas === 'datos' && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 20 }}>

              {/* Dimensiones */}
              <div>
                <div style={secHdr}>📐 Dimensiones</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {[
                    { key: "ancho",       label: "A", resultado: localAncho, placeholder: "ancho - 2*esp" },
                    { key: "alto",        label: "H", resultado: localAlto,  placeholder: "alto / cajones" },
                    { key: "profundidad", label: "P", resultado: localProf,  placeholder: "profundidad - 50" },
                  ].map(({ key, label, resultado, placeholder }) => {
                    const formula = subcomp.dimensiones?.[key] ?? "";
                    const valida = !formula || evaluarFormula(String(formula), ctxPadre) !== null;
                    return (
                      <div key={key} style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "7px 10px 7px 8px",
                        background: "var(--bg-surface)", borderRadius: 6,
                        border: `1px solid ${!valida ? "rgba(224,112,112,0.40)" : "rgba(200,160,42,0.12)"}`,
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
                          baseVarNames={baseVarNamesHijo} customVarNames={customVarNamesHijo}
                          onInsert={insertarVariable}
                        />
                        <div style={{ minWidth: 50, textAlign: "right", flexShrink: 0, fontFamily: M, fontSize: 11, color: "var(--text-muted)" }}>
                          {Math.round(resultado)}<span style={{ fontSize: 8 }}>mm</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Posición */}
              <div>
                <div style={secHdr}>📍 Posición</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {[
                    { key: "x", label: "X", resultado: localOrigenX, placeholder: "esp" },
                    { key: "y", label: "Y", resultado: localOrigenY, placeholder: "(i-1)*altoCajon" },
                    { key: "z", label: "Z", resultado: localOrigenZ, placeholder: "esp" },
                  ].map(({ key, label, resultado, placeholder }) => {
                    const formula = subcomp.origen?.[key] ?? "";
                    const valida = !formula || evaluarFormula(String(formula), ctxPadre) !== null;
                    return (
                      <div key={key} style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "7px 10px 7px 8px",
                        background: "var(--bg-surface)", borderRadius: 6,
                        border: `1px solid ${!valida ? "rgba(224,112,112,0.40)" : "rgba(200,160,42,0.12)"}`,
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
                          baseVarNames={baseVarNamesHijo} customVarNames={customVarNamesHijo}
                          onInsert={insertarVariable}
                        />
                        <div style={{ minWidth: 50, textAlign: "right", flexShrink: 0, fontFamily: M, fontSize: 11, color: "var(--text-muted)" }}>
                          {Math.round(resultado)}<span style={{ fontSize: 8 }}>mm</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ── Nueva pieza ───────────────────────────────────────────── */}
          {subTabPiezas === 'nueva' && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <FormPieza
                fp={fp} setFp={setFp}
                onCancelar={cancelarEdicion}
                editando={editandoIdx !== null}
                nombresSugeridos={NOMBRES_SUGERIDOS}
                modulo={moduloSubVirtual}
                costos={costos} />

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
