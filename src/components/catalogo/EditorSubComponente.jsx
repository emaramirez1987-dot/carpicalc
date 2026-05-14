// ════════════════════════════════════════════════════════════════════════════
// EditorSubComponente.jsx — editor de UN subcomponente del módulo
// ════════════════════════════════════════════════════════════════════════════
//
// Un subcomp tiene su propio mundo: dimensiones locales, eje 0 propio,
// parámetros propios, piezas propias y herrajes propios. Se posiciona en
// el padre vía `origen.x/y/z`. Se replica con `repeat` opcional.
//
// Las fórmulas dentro del subcomp pueden usar:
//   • Vars del padre (ancho, alto, profundidad, esp, parámetros del padre)
//   • Vars locales del subcomp (ancho, alto, profundidad del subcomp,
//     parámetros propios del subcomp)
//   • i — índice del repeat (en origen y dentro del subcomp)
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';

const M = "'DM Mono', monospace";

const inputBase = {
  fontFamily: M, fontSize: 12, padding: "6px 8px",
  background: "var(--bg-base)", border: "1px solid var(--border)",
  borderRadius: 6, color: "var(--text-primary)", outline: "none",
};
const lbl = {
  fontSize: 10, fontFamily: M, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3,
};
const btnDel = {
  padding: "4px 10px", borderRadius: 6, cursor: "pointer",
  fontFamily: M, fontSize: 10,
  background: "transparent", border: "1px solid rgba(200,60,60,0.30)",
  color: "#e07070",
};
const btnAdd = {
  padding: "6px 12px", borderRadius: 6, cursor: "pointer",
  fontFamily: M, fontSize: 11, fontWeight: 700,
  background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.45)",
  color: "#c8a02a",
};

// ── Sub-acordeón interno ───────────────────────────────────────────────────
function SubAcordeon({ icon, titulo, count, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)", marginTop: 8 }}>
      <div onClick={() => setOpen(o => !o)} style={{
        padding: "6px 10px", background: "rgba(255,255,255,0.04)",
        cursor: "pointer", userSelect: "none",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 10, fontFamily: M, fontWeight: 700, color: "#c8a02a" }}>
          {icon} {titulo} <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>({count})</span>
        </span>
        <span style={{ fontSize: 9, color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▼</span>
      </div>
      {open && <div style={{ padding: 10, background: "var(--bg-base)" }}>{children}</div>}
    </div>
  );
}

// ── Tabla simple para piezas y herrajes ────────────────────────────────────

function EditorPiezasSubcomp({ piezas = [], onChange }) {
  const update = (idx, patch) => onChange(piezas.map((p, i) => i === idx ? { ...p, ...patch } : p));
  const remove = (idx) => onChange(piezas.filter((_, i) => i !== idx));
  const add = () => onChange([...piezas, {
    nombre: `Pieza ${piezas.length + 1}`, cantidad: 1,
    formula1: "alto", formula2: "ancho", cara3d: "front",
  }]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {piezas.length === 0 ? (
        <div style={{ padding: "10px 0", textAlign: "center", fontSize: 11, color: "var(--text-muted)", fontFamily: M }}>
          Sin piezas — agregá la primera abajo
        </div>
      ) : piezas.map((p, idx) => (
        <div key={idx} style={{
          padding: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6,
          display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 0.7fr 0.7fr 70px", gap: 6, alignItems: "end",
        }}>
          <div>
            <div style={lbl}>Nombre</div>
            <input value={p.nombre || ""}
              onChange={e => update(idx, { nombre: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Fórmula 1 (alto)</div>
            <input value={p.formula1 || ""} placeholder="ej: alto"
              onChange={e => update(idx, { formula1: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Fórmula 2 (ancho)</div>
            <input value={p.formula2 || ""} placeholder="ej: ancho"
              onChange={e => update(idx, { formula2: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Cara 3D</div>
            <select value={p.cara3d || ""}
              onChange={e => update(idx, { cara3d: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }}>
              <option value="">—</option>
              <option value="front">Frente</option>
              <option value="back">Atrás</option>
              <option value="left">Izq</option>
              <option value="right">Der</option>
              <option value="top">Arriba</option>
              <option value="bottom">Abajo</option>
            </select>
          </div>
          <div>
            <div style={lbl}>Zona</div>
            <input value={p.zona || ""} placeholder="opc"
              onChange={e => update(idx, { zona: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <button onClick={() => remove(idx)} style={btnDel}>✕</button>
        </div>
      ))}
      <button onClick={add} style={btnAdd}>+ Agregar pieza</button>
    </div>
  );
}

function EditorHerrajesSubcomp({ herrajes = [], onChange }) {
  const update = (idx, patch) => onChange(herrajes.map((h, i) => i === idx ? { ...h, ...patch } : h));
  const remove = (idx) => onChange(herrajes.filter((_, i) => i !== idx));
  const add = () => onChange([...herrajes, { id: "", cantidad: 1 }]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {herrajes.length === 0 ? (
        <div style={{ padding: "10px 0", textAlign: "center", fontSize: 11, color: "var(--text-muted)", fontFamily: M }}>
          Sin herrajes — agregá el primero abajo
        </div>
      ) : herrajes.map((h, idx) => (
        <div key={idx} style={{
          padding: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6,
          display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr 70px", gap: 6, alignItems: "end",
        }}>
          <div>
            <div style={lbl}>ID herraje</div>
            <input value={h.id ?? ""} placeholder="del catálogo de costos"
              onChange={e => update(idx, { id: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Cantidad (núm o fórmula)</div>
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
          <button onClick={() => remove(idx)} style={btnDel}>✕</button>
        </div>
      ))}
      <button onClick={add} style={btnAdd}>+ Agregar herraje</button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// EditorSubComponente (default export)
// ────────────────────────────────────────────────────────────────────────────

export default function EditorSubComponente({ subcomp, onChange, onDelete }) {
  const patch = (cambios) => onChange({ ...subcomp, ...cambios });
  const patchOrigen = (k, v) => onChange({ ...subcomp, origen: { ...(subcomp.origen || {}), [k]: v } });
  const patchDim    = (k, v) => onChange({ ...subcomp, dimensiones: { ...(subcomp.dimensiones || {}), [k]: v } });
  const patchRepeat = (k, v) => onChange({ ...subcomp, repeat: { ...(subcomp.repeat || { var: "i" }), [k]: v } });

  return (
    <div style={{
      padding: 12, background: "var(--bg-surface)",
      border: "1px solid rgba(200,160,42,0.30)", borderRadius: 8,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {/* Header: nombre + delete */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 80px", gap: 8, alignItems: "end" }}>
        <div>
          <div style={lbl}>ID</div>
          <input value={subcomp.id || ""}
            onChange={e => patch({ id: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
            style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
        </div>
        <div>
          <div style={lbl}>Nombre</div>
          <input value={subcomp.nombre || ""} placeholder="ej: Cajón armado"
            onChange={e => patch({ nombre: e.target.value })}
            style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
        </div>
        <button onClick={onDelete} style={btnDel}>✕ Quitar</button>
      </div>

      {/* Repetición */}
      <div style={{ display: "grid", gridTemplateColumns: "0.5fr 0.6fr 1fr 1.5fr", gap: 8 }}>
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
          <div style={lbl}>Condición (opc)</div>
          <input value={subcomp.condition || ""} placeholder="ej: cajones > 0"
            onChange={e => patch({ condition: e.target.value })}
            style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
        </div>
      </div>

      {/* Dimensiones locales */}
      <div>
        <div style={{ ...lbl, color: "var(--accent)", marginBottom: 4 }}>
          📐 Dimensiones LOCALES del subcomp (usan vars del padre)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <input value={subcomp.dimensiones?.ancho ?? ""} placeholder="Ancho local"
            onChange={e => patchDim("ancho", isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
            style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          <input value={subcomp.dimensiones?.alto ?? ""} placeholder="Alto local"
            onChange={e => patchDim("alto", isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
            style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          <input value={subcomp.dimensiones?.profundidad ?? ""} placeholder="Profundidad local"
            onChange={e => patchDim("profundidad", isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
            style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
        </div>
      </div>

      {/* Origen en coords del padre */}
      <div>
        <div style={{ ...lbl, color: "var(--accent)", marginBottom: 4 }}>
          📍 Origen en el padre (donde se ancla el 0,0,0 del subcomp)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <input value={subcomp.origen?.x ?? ""} placeholder="X (ej: esp)"
            onChange={e => patchOrigen("x", e.target.value)}
            style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          <input value={subcomp.origen?.y ?? ""} placeholder="Y (ej: (i-1)*altoCajon)"
            onChange={e => patchOrigen("y", e.target.value)}
            style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          <input value={subcomp.origen?.z ?? ""} placeholder="Z (ej: 0)"
            onChange={e => patchOrigen("z", e.target.value)}
            style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
        </div>
      </div>

      {/* Sub-acordeón: Piezas */}
      <SubAcordeon icon="🪵" titulo="Piezas del subcomp (coords locales)" count={(subcomp.piezas || []).length}>
        <EditorPiezasSubcomp piezas={subcomp.piezas || []}
          onChange={(p) => patch({ piezas: p })} />
      </SubAcordeon>

      {/* Sub-acordeón: Herrajes */}
      <SubAcordeon icon="🔩" titulo="Herrajes del subcomp" count={(subcomp.herrajes || []).length}>
        <EditorHerrajesSubcomp herrajes={subcomp.herrajes || []}
          onChange={(h) => patch({ herrajes: h })} />
      </SubAcordeon>
    </div>
  );
}
