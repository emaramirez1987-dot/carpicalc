// ════════════════════════════════════════════════════════════════════════════
// EditorComponenteHijo.jsx — editor de UN subcomponente (vive en su tab)
// ════════════════════════════════════════════════════════════════════════════
//
// Reemplaza al viejo EditorSubComponente cuando el subcomponente se edita
// como pestaña principal del FormModulo. Layout amplio tipo "página":
//   • Banner superior con chips de variables del padre (informativo +
//     click-to-insert en el último input enfocado).
//   • Dimensiones locales (fórmulas que usan vars del padre).
//   • Posición 3D en el padre (origen x/y/z).
//   • Repetición (acordeón).
//   • Piezas del hijo — reutiliza FormPieza + FilaPieza con dims locales
//     evaluadas. Soporta tapacanto y todos los presets como el padre.
//   • Herrajes (acordeón).
//   • Parámetros propios del hijo (acordeón).
//   • Subcomponentes anidados (acordeón con el viejo EditorSubComponente).
//
// El preview 3D global ya muestra este subcomp automáticamente porque
// `expandirSubComponentes` lo procesa en cada render del FormModulo.
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import FormPieza from './FormPieza.jsx';
import FilaPieza from './FilaPieza.jsx';
import EditorSubComponente from './EditorSubComponente.jsx';
import { evaluarFormula, resolverVariables } from '../../utils.js';

// Estado inicial de una pieza nueva (mismo PIEZA_VACIA del FormModulo)
const PIEZA_VACIA = {
  nombre: "", cantidad: 1,
  formula1: "alto", formula2: "profundidad",
  usaDim: "alto", usaDim2: "profundidad",
  offsetEsp: 0, offsetMm: 0, divisor: 1,
  offsetEsp2: 0, offsetMm2: 0, divisor2: 1,
  tc: { id: 1, lados1: 1, lados2: 0 },
  especial: false, dimLibre1: "", dimLibre2: ""
};

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

// Acordeón colapsable simple
function Acordeon({ icon, titulo, count, abierto, onToggle, children, accent = "#c8a02a" }) {
  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
      <button onClick={onToggle} style={{
        width: "100%", padding: "9px 14px",
        background: abierto ? "rgba(100,110,125,0.06)" : "transparent",
        border: "none", cursor: "pointer", userSelect: "none",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        textAlign: "left",
      }}>
        <span style={{ fontSize: 10, fontFamily: M, fontWeight: 700, color: accent, letterSpacing: "0.10em", textTransform: "uppercase" }}>
          {icon} {titulo}
          {count != null && (
            <span style={{ color: "var(--text-muted)", marginLeft: 6, fontWeight: 400 }}>({count})</span>
          )}
        </span>
        <span style={{ fontSize: 9, color: "var(--text-muted)", transform: abierto ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>▼</span>
      </button>
      {abierto && <div style={{ padding: 12, background: "var(--bg-base)" }}>{children}</div>}
    </div>
  );
}

// Chip clickeable para banner de variables disponibles
function VarChip({ nombre, valor, onInsert }) {
  return (
    <button onMouseDown={(e) => onInsert(e, nombre)} title={`Insertar "${nombre}" — valor actual: ${valor}`}
      style={{
        padding: "4px 11px", borderRadius: 16, cursor: "pointer",
        fontFamily: M, fontSize: 10, fontWeight: 500, letterSpacing: "0.04em",
        background: "rgba(100,110,125,0.08)", border: "1px solid rgba(100,110,125,0.22)",
        color: "var(--text-primary)", whiteSpace: "nowrap",
      }}>
      {nombre}
      <span style={{ marginLeft: 4, color: "var(--text-muted)", fontWeight: 400 }}>= {valor}</span>
    </button>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Editor de herrajes del subcomponente
// ───────────────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────────────
// Editor de parámetros propios del subcomp
// ───────────────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────────────
// EditorComponenteHijo — default export
// ───────────────────────────────────────────────────────────────────────────

export default function EditorComponenteHijo({
  subcomp,
  onChange,
  onDelete,
  // Contexto del padre (necesario para resolver fórmulas locales del hijo)
  parentDims,           // { ancho, alto, profundidad } numéricos
  parentVariables,      // {} de vars del padre
  parentParametros,     // [] de params del padre
  parentZonas,          // [] de zonas del padre
  espesor,              // espesor del material del padre (mm)
  costos,               // catálogo (herrajes, materiales, tapacantos...)
}) {
  // ── Estado UI ───────────────────────────────────────────────────────────
  const [accRepeat, setAccRepeat]       = useState(!!subcomp.repeat?.from || !!subcomp.repeat?.to);
  const [accHerrajes, setAccHerrajes]   = useState(false);
  const [accParams, setAccParams]       = useState(false);
  const [accNietos, setAccNietos]       = useState(false);
  const [confirmandoDelete, setConfirmandoDelete] = useState(false);

  // Form de pieza (estado local del editor de piezas del hijo)
  const [fp, setFp] = useState({ ...PIEZA_VACIA });
  const [editandoIdx, setEditandoIdx] = useState(null);
  const [fpError, setFpError] = useState("");

  // Ref al último input enfocado para el click-to-insert de chips
  const lastInputRef = useRef(null);

  // ── Mutaciones ──────────────────────────────────────────────────────────
  const patch       = (cambios) => onChange({ ...subcomp, ...cambios });
  const patchOrigen = (k, v) => onChange({ ...subcomp, origen: { ...(subcomp.origen || {}), [k]: v } });
  const patchDim    = (k, v) => onChange({ ...subcomp, dimensiones: { ...(subcomp.dimensiones || {}), [k]: v } });
  const patchRepeat = (k, v) => onChange({ ...subcomp, repeat: { ...(subcomp.repeat || { var: "i" }), [k]: v } });

  // ── Contexto de fórmulas (vars conocidas del padre) ─────────────────────
  const ctxPadreBase = {
    ancho: parentDims.ancho || 0,
    alto:  parentDims.alto  || 0,
    profundidad: parentDims.profundidad || 0,
    esp: espesor || 18,
  };
  const customVars = resolverVariables(parentVariables || {}, ctxPadreBase);
  const paramDefaults = Object.fromEntries(
    (parentParametros || []).filter(p => p.tipo !== 'formula').map(p => [p.id, p.def])
  );
  const ctxPadre = { ...ctxPadreBase, ...customVars, ...paramDefaults, i: 1 };

  // ── Evaluar dimensiones locales con vars del padre ──────────────────────
  const evalDim = (formula, fallback) => {
    if (formula == null || formula === "") return fallback;
    if (typeof formula === "number") return formula;
    const v = evaluarFormula(String(formula), ctxPadre);
    return (v != null && Number.isFinite(v)) ? Math.round(v) : fallback;
  };
  const localAncho = evalDim(subcomp.dimensiones?.ancho, parentDims.ancho);
  const localAlto  = evalDim(subcomp.dimensiones?.alto,  parentDims.alto);
  const localProf  = evalDim(subcomp.dimensiones?.profundidad, parentDims.profundidad);
  const dimsLocales = { ancho: localAncho, alto: localAlto, profundidad: localProf };

  // ── Chips de variables del padre disponibles ────────────────────────────
  const chipsPadre = [
    { nombre: "ancho", valor: ctxPadreBase.ancho },
    { nombre: "alto", valor: ctxPadreBase.alto },
    { nombre: "profundidad", valor: ctxPadreBase.profundidad },
    { nombre: "esp", valor: ctxPadreBase.esp },
    ...Object.keys(customVars).map(k => ({ nombre: k, valor: customVars[k] })),
    ...(parentParametros || []).filter(p => p.id).map(p => ({
      nombre: p.id, valor: paramDefaults[p.id] ?? "?",
    })),
  ];

  // Insertar texto en el último input enfocado
  const insertarEnInput = (e, texto) => {
    e.preventDefault();
    const el = lastInputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd   ?? el.value.length;
    const newVal = el.value.slice(0, start) + texto + el.value.slice(end);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(el, newVal);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    setTimeout(() => { el.setSelectionRange(start + texto.length, start + texto.length); el.focus(); }, 0);
  };
  // wrapper para registrar el input como "último enfocado"
  const onFocusCapture = (e) => { if (e.target.tagName === "INPUT") lastInputRef.current = e.target; };

  // ── Vars combinadas que pasamos a FormPieza/FilaPieza ───────────────────
  // FormPieza ve: dims locales evaluadas + parámetros del padre disponibles + vars del padre
  const variablesParaPieza  = { ...(parentVariables || {}), ...(subcomp.variables || {}) };
  const parametrosParaPieza = [
    ...(parentParametros || []),
    ...(subcomp.parametros || []),
  ];
  const zonasParaPieza = [...(parentZonas || []), ...(subcomp.zonas || [])];
  const modVarsLista = {
    ...resolverVariables(variablesParaPieza, { ...dimsLocales, esp: espesor }),
    ...Object.fromEntries(parametrosParaPieza.filter(p => p.tipo !== 'formula').map(p => [p.id, p.def])),
  };

  // ── Acciones sobre piezas del hijo ──────────────────────────────────────
  const normalizar = (p) => ({
    ...p,
    cantidad: Math.max(1, parseInt(p.cantidad) || 1),
    offsetEsp: parseInt(p.offsetEsp) || 0,
    offsetMm: parseInt(p.offsetMm) || 0,
    divisor: Math.max(1, parseInt(p.divisor) || 1),
    offsetEsp2: parseInt(p.offsetEsp2) || 0,
    offsetMm2: parseInt(p.offsetMm2) || 0,
    divisor2: Math.max(1, parseInt(p.divisor2) || 1),
    tc: { id: parseInt(p.tc?.id) || 0, lados1: parseInt(p.tc?.lados1) || 0, lados2: parseInt(p.tc?.lados2) || 0 },
  });
  const agregarPieza = () => {
    if (!fp.nombre.trim()) { setFpError("Ingresá el nombre."); return; }
    const nueva = normalizar(fp);
    const piezasNuevas = editandoIdx !== null
      ? (subcomp.piezas || []).map((p, i) => i === editandoIdx ? nueva : p)
      : [...(subcomp.piezas || []), nueva];
    patch({ piezas: piezasNuevas });
    setFp({ ...PIEZA_VACIA });
    setEditandoIdx(null);
    setFpError("");
  };
  const editarPieza = (idx) => {
    setFp({ ...(subcomp.piezas || [])[idx] });
    setEditandoIdx(idx);
    setTimeout(() => document.getElementById("form-pieza")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  const cancelarEdicion = () => { setFp({ ...PIEZA_VACIA }); setEditandoIdx(null); setFpError(""); };
  const eliminarPieza = (idx) => {
    patch({ piezas: (subcomp.piezas || []).filter((_, i) => i !== idx) });
    if (editandoIdx === idx) cancelarEdicion();
  };
  const duplicarPieza = (idx) => {
    const orig = (subcomp.piezas || [])[idx];
    const copia = { ...orig, nombre: `${orig.nombre} (copia)` };
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

  // ── Render ──────────────────────────────────────────────────────────────
  const NOMBRES_SUGERIDOS = ["Frente", "Lateral", "Base", "Trasera", "Tapa", "Costado"];

  return (
    <div onFocusCapture={onFocusCapture} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Header del componente: nombre + ID + delete ────────────────── */}
      <div style={{
        padding: "10px 14px", background: "rgba(100,110,125,0.05)",
        border: "1px solid rgba(100,110,125,0.20)", borderRadius: 8,
        display: "flex", alignItems: "flex-end", gap: 10,
      }}>
        <div style={{ width: 110, flexShrink: 0 }}>
          <div style={lbl}>ID</div>
          <input value={subcomp.id || ""} placeholder="cajon1"
            onChange={e => patch({ id: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
            style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={lbl}>Nombre del componente</div>
          <input value={subcomp.nombre || ""} placeholder="ej: Cajón, Puerta, Frente con marco"
            onChange={e => patch({ nombre: e.target.value })}
            style={{ ...inputBase, width: "100%", boxSizing: "border-box", fontSize: 13 }} />
        </div>
        {/* Confirmación inline — reemplaza el modal al final del componente */}
        {confirmandoDelete ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontFamily: M, color: "#e07070", whiteSpace: "nowrap" }}>¿Confirmar eliminación?</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { setConfirmandoDelete(false); onDelete(); }}
                style={{ padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontFamily: M, fontSize: 11,
                  background: "rgba(200,60,60,0.18)", border: "1px solid rgba(200,60,60,0.45)", color: "#e07070" }}>
                Sí, eliminar
              </button>
              <button onClick={() => setConfirmandoDelete(false)}
                style={{ padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontFamily: M, fontSize: 11,
                  background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmandoDelete(true)} style={{ ...btnDel, alignSelf: "flex-end", flexShrink: 0 }}>
            ✕ Eliminar
          </button>
        )}
      </div>

      {/* ── Banner de variables del padre disponibles ──────────────────── */}
      <div style={{
        padding: "10px 12px", background: "var(--bg-base)",
        border: "1px solid rgba(100,110,125,0.20)", borderRadius: 8,
      }}>
        <div style={{ fontSize: 10, fontFamily: M, fontWeight: 700, color: "#c8a02a",
          textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 8 }}>
          Variables del padre · click para insertar
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {chipsPadre.map(c => (
            <VarChip key={c.nombre} nombre={c.nombre} valor={c.valor} onInsert={insertarEnInput} />
          ))}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 7, fontStyle: "italic" }}>
          También podés usar <code style={{ fontFamily: M, color: "var(--text-primary)" }}>i</code> (índice del repeat) en cualquier fórmula.
        </div>
      </div>

      {/* ── Dimensiones locales ────────────────────────────────────────── */}
      <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
        <div style={{ padding: "9px 14px", background: "rgba(100,110,125,0.06)", borderBottom: "1px solid var(--border)",
          fontSize: 10, fontFamily: M, fontWeight: 700, color: "#c8a02a",
          textTransform: "uppercase", letterSpacing: "0.10em" }}>
          📐 Dimensiones del componente
        </div>
        <div style={{ padding: 12, background: "var(--bg-base)",
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div>
            <div style={lbl}>Ancho (fórmula)</div>
            <input value={subcomp.dimensiones?.ancho ?? ""} placeholder="ej: ancho - 2*esp"
              onChange={e => patchDim("ancho", e.target.value)}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
            <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: M, marginTop: 3 }}>
              = <span style={{ color: "var(--accent)" }}>{localAncho} mm</span>
            </div>
          </div>
          <div>
            <div style={lbl}>Alto (fórmula)</div>
            <input value={subcomp.dimensiones?.alto ?? ""} placeholder="ej: alto / cajones"
              onChange={e => patchDim("alto", e.target.value)}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
            <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: M, marginTop: 3 }}>
              = <span style={{ color: "var(--accent)" }}>{localAlto} mm</span>
            </div>
          </div>
          <div>
            <div style={lbl}>Profundidad (fórmula)</div>
            <input value={subcomp.dimensiones?.profundidad ?? ""} placeholder="ej: profundidad - 50"
              onChange={e => patchDim("profundidad", e.target.value)}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
            <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: M, marginTop: 3 }}>
              = <span style={{ color: "var(--accent)" }}>{localProf} mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Posición 3D en el padre ────────────────────────────────────── */}
      <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
        <div style={{ padding: "9px 14px", background: "rgba(100,110,125,0.06)", borderBottom: "1px solid var(--border)",
          fontSize: 10, fontFamily: M, fontWeight: 700, color: "#c8a02a",
          textTransform: "uppercase", letterSpacing: "0.10em" }}>
          📍 Posición en el módulo padre
        </div>
        <div style={{ padding: 12, background: "var(--bg-base)",
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div>
            <div style={lbl}>X (ej: esp)</div>
            <input value={subcomp.origen?.x ?? ""} placeholder="0"
              onChange={e => patchOrigen("x", e.target.value)}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Y (ej: (i-1)*altoCajon)</div>
            <input value={subcomp.origen?.y ?? ""} placeholder="0"
              onChange={e => patchOrigen("y", e.target.value)}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Z (ej: esp)</div>
            <input value={subcomp.origen?.z ?? ""} placeholder="0"
              onChange={e => patchOrigen("z", e.target.value)}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
        </div>
      </div>

      {/* ── Acordeón: Repetición ───────────────────────────────────────── */}
      <Acordeon icon="🔁" titulo="Repetición (instanciar N veces)"
        abierto={accRepeat} onToggle={() => setAccRepeat(v => !v)}>
        <div style={{ display: "grid", gridTemplateColumns: "0.6fr 0.8fr 1fr 1.4fr", gap: 8 }}>
          <div>
            <div style={lbl}>Var</div>
            <input value={subcomp.repeat?.var || "i"}
              onChange={e => patchRepeat("var", e.target.value)}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Desde</div>
            <input value={subcomp.repeat?.from ?? ""} placeholder="1"
              onChange={e => patchRepeat("from", isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Hasta (núm o fórmula)</div>
            <input value={subcomp.repeat?.to ?? ""} placeholder="cajones"
              onChange={e => patchRepeat("to", isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Condición (opcional)</div>
            <input value={subcomp.condition || ""} placeholder="ej: cajones > 0"
              onChange={e => patch({ condition: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
        </div>
      </Acordeon>

      {/* ── Piezas del hijo ─────────────────────────────────────────────── */}
      <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
        <div style={{ padding: "9px 14px", background: "rgba(100,110,125,0.06)", borderBottom: "1px solid var(--border)",
          fontSize: 10, fontFamily: M, fontWeight: 700, color: "#c8a02a",
          textTransform: "uppercase", letterSpacing: "0.10em" }}>
          🪵 Piezas del componente <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 4 }}>({(subcomp.piezas || []).length})</span>
        </div>
        <div style={{ padding: 12, background: "var(--bg-base)", display: "flex", flexDirection: "column", gap: 10 }}>

        <FormPieza
          fp={fp} setFp={setFp}
          onCancelar={cancelarEdicion}
          editando={editandoIdx !== null}
          dims={dimsLocales}
          espesor={espesor}
          nombresSugeridos={NOMBRES_SUGERIDOS}
          variables={variablesParaPieza}
          onVarsUpdate={v => patch({ variables: { ...(subcomp.variables || {}), ...v } })}
          piezas={subcomp.piezas || []}
          zonas={zonasParaPieza}
          parametros={parametrosParaPieza} />

        {fpError && <p style={{ color: "#e07070", fontSize: 12, margin: "6px 0 0" }}>⚠ {fpError}</p>}

        <button onClick={agregarPieza} style={{
          width: "100%", padding: "11px 0", borderRadius: 8, cursor: "pointer", fontWeight: 700,
          fontFamily: M, fontSize: 12, letterSpacing: "0.05em",
          background: "rgba(100,110,125,0.15)", border: "1px solid rgba(100,110,125,0.45)", color: "var(--text-primary)",
        }}>
          {editandoIdx !== null ? "✓ ACTUALIZAR PIEZA" : "+ AGREGAR PIEZA AL COMPONENTE"}
        </button>

        {/* Lista de piezas agregadas */}
        {(subcomp.piezas || []).length === 0 ? (
          <div style={{ padding: "18px 0", textAlign: "center", fontSize: 12, borderRadius: 8,
            border: "1px dashed var(--border)", color: "var(--text-muted)", fontFamily: M }}>
            Sin piezas todavía — agregá la primera arriba
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, fontFamily: M, fontWeight: 700, color: "#c8a02a",
                textTransform: "uppercase", letterSpacing: "0.10em" }}>
                Lista ({(subcomp.piezas || []).length})
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

        </div>{/* cierre del padding interno de la sección Piezas */}
      </div>

      {/* ── Acordeón: Herrajes ─────────────────────────────────────────── */}
      <Acordeon icon="🔩" titulo="Herrajes del componente" count={(subcomp.herrajes || []).length}
        abierto={accHerrajes} onToggle={() => setAccHerrajes(v => !v)}>
        <EditorHerrajesSub herrajes={subcomp.herrajes || []}
          onChange={(h) => patch({ herrajes: h })}
          costos={costos} />
      </Acordeon>

      {/* ── Acordeón: Parámetros propios ───────────────────────────────── */}
      <Acordeon icon="🎚" titulo="Parámetros propios del componente" count={(subcomp.parametros || []).length}
        abierto={accParams} onToggle={() => setAccParams(v => !v)}>
        <EditorParamsSub parametros={subcomp.parametros || []}
          onChange={(p) => patch({ parametros: p })} />
      </Acordeon>

      {/* ── Acordeón: Subcomponentes anidados (nietos) ─────────────────── */}
      <Acordeon icon="🧩" titulo="Subcomponentes anidados (avanzado)" count={(subcomp.subComponentes || []).length}
        abierto={accNietos} onToggle={() => setAccNietos(v => !v)}>
        <ListaNietos
          subComponentes={subcomp.subComponentes || []}
          onChange={(s) => patch({ subComponentes: s })} />
      </Acordeon>

    </div>
  );
}

// ── Lista de subcomponentes anidados (caso avanzado) ────────────────────────
// Usa el viejo EditorSubComponente — la UI anidada queda como acordeón
// compacto. Soportar tabs anidadas excede el caso normal.
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
