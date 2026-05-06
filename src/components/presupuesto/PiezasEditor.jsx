// ════════════════════════════════════════════════════════════════════════════
// PiezasEditor.jsx
// Editor de piezas y herrajes para módulos inlineados en presupuesto.
// Opera sobre una copia completa del módulo — nunca toca el catálogo.
// Props:
//   modulo          — copia del módulo a editar (piezas, herrajes, dims, etc.)
//   costos          — tabla de costos (para nombres y selección de herrajes)
//   onGuardar(mod)  — callback con el módulo modificado
//   onCancelar      — cerrar sin guardar
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from "react";
import { resolverDim, evaluarFormula } from "../../utils.js";

// ── Helpers ───────────────────────────────────────────────────────────────

function computeDims(pieza, dimMap, esp) {
  if (pieza.especial) return { d1: parseInt(pieza.dimLibre1) || 0, d2: parseInt(pieza.dimLibre2) || 0 };
  const modVars = { ...dimMap, esp };
  const d1 = pieza.formula1 != null
    ? (evaluarFormula(pieza.formula1, modVars) ?? 0)
    : resolverDim(dimMap[pieza.usaDim], pieza.offsetEsp, pieza.offsetMm, pieza.divisor || 1, esp);
  const d2 = pieza.formula2 != null
    ? (evaluarFormula(pieza.formula2, modVars) ?? 0)
    : resolverDim(dimMap[pieza.usaDim2], pieza.offsetEsp2, pieza.offsetMm2, pieza.divisor2 || 1, esp);
  return { d1, d2 };
}

const st = {
  label: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 },
  row: { display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, background: "var(--bg-subtle)", border: "1px solid var(--border)", marginBottom: 5 },
  numInput: { width: 52, fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, padding: "4px 6px", textAlign: "center", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-primary)", outline: "none" },
  dimInput: { width: 68, fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "4px 6px", textAlign: "center", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-primary)", outline: "none" },
  btn: (variant) => ({
    padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11,
    fontFamily: "'DM Mono',monospace", fontWeight: 700,
    background: variant === "danger" ? "rgba(200,60,60,0.10)" : "transparent",
    border: `1px solid ${variant === "danger" ? "rgba(200,60,60,0.35)" : "var(--border)"}`,
    color: variant === "danger" ? "#e07070" : "var(--text-muted)",
  }),
};

// ── Componente ────────────────────────────────────────────────────────────

export default function PiezasEditor({ modulo, costos, onGuardar, onCancelar }) {
  const [piezas,   setPiezas]   = useState(() => (modulo.piezas   || []).map(p => ({ ...p })));
  const [herrajes, setHerrajes] = useState(() => (modulo.herrajes || []).map(h => ({ ...h })));
  const [addHerrajeId, setAddHerrajeId] = useState("");

  const { ancho = 0, profundidad = 0, alto = 0 } = modulo.dimensiones || {};
  const matDef  = costos?.materiales?.find(m => m.tipo === modulo.material) || costos?.materiales?.[0];
  const esp     = matDef?.espesor || 18;
  const dimMap  = { ancho, profundidad, alto };

  const herrajesDisponibles = costos?.herrajes || [];

  const dimsPieza = useMemo(() =>
    piezas.map(p => computeDims(p, dimMap, esp)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [piezas, ancho, profundidad, alto, esp]);

  const setCantPieza = (idx, val) =>
    setPiezas(ps => ps.map((p, i) => i === idx ? { ...p, cantidad: Math.max(0, parseInt(val) || 0) } : p));

  const setLibrePieza = (idx, campo, val) =>
    setPiezas(ps => ps.map((p, i) => i === idx ? { ...p, [campo]: val } : p));

  const eliminarPieza = (idx) => setPiezas(ps => ps.filter((_, i) => i !== idx));

  const agregarPieza = () => setPiezas(ps => [...ps, {
    nombre: "Pieza nueva", cantidad: 1, especial: true, dimLibre1: "0", dimLibre2: "0",
  }]);

  const setCantHerraje = (idx, val) =>
    setHerrajes(hs => hs.map((h, i) => i === idx ? { ...h, cantidad: Math.max(0, parseInt(val) || 0) } : h));

  const eliminarHerraje = (idx) => setHerrajes(hs => hs.filter((_, i) => i !== idx));

  const agregarHerraje = () => {
    if (!addHerrajeId) return;
    if (herrajes.some(h => h.id === addHerrajeId)) return;
    setHerrajes(hs => [...hs, { id: addHerrajeId, cantidad: 1 }]);
    setAddHerrajeId("");
  };

  const handleGuardar = () => onGuardar({ ...modulo, piezas, herrajes });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 900, color: "var(--accent)", marginBottom: 2 }}>
          ✏ Editar módulo
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {modulo.nombre} · {ancho}×{profundidad}×{alto} mm
        </div>
        <div style={{ fontSize: 10, color: "rgba(120,180,100,0.9)", marginTop: 4, fontFamily: "'DM Mono',monospace" }}>
          Solo en este presupuesto · catálogo sin cambios
        </div>
      </div>

      {/* Piezas */}
      <div>
        <div style={st.label}>Piezas ({piezas.length})</div>
        {piezas.map((p, idx) => {
          const { d1, d2 } = dimsPieza[idx] || {};
          return (
            <div key={idx} style={st.row}>
              <span style={{ flex: 1, fontSize: 12, color: "var(--text-primary)", fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.nombre}
              </span>
              {p.especial ? (
                <>
                  <input style={st.dimInput} type="number" min="0" value={p.dimLibre1 || "0"}
                    onChange={e => setLibrePieza(idx, "dimLibre1", e.target.value)}
                    title="Dimensión 1 (mm)" />
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>×</span>
                  <input style={st.dimInput} type="number" min="0" value={p.dimLibre2 || "0"}
                    onChange={e => setLibrePieza(idx, "dimLibre2", e.target.value)}
                    title="Dimensión 2 (mm)" />
                </>
              ) : (
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {Math.round(d1)}×{Math.round(d2)}
                </span>
              )}
              <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>cant</span>
              <input style={st.numInput} type="number" min="0" value={p.cantidad}
                onChange={e => setCantPieza(idx, e.target.value)} />
              <button style={st.btn("danger")} onClick={() => eliminarPieza(idx)}>×</button>
            </div>
          );
        })}
        <button onClick={agregarPieza}
          style={{ marginTop: 4, padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "transparent", border: "1px dashed var(--border)", color: "var(--text-muted)", width: "100%" }}>
          + Agregar pieza libre
        </button>
      </div>

      {/* Herrajes */}
      <div>
        <div style={st.label}>Herrajes ({herrajes.length})</div>
        {herrajes.map((h, idx) => {
          const def = herrajesDisponibles.find(x => x.id === h.id);
          return (
            <div key={idx} style={st.row}>
              <span style={{ flex: 1, fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>
                {def?.nombre || h.id}
              </span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>cant</span>
              <input style={st.numInput} type="number" min="0" value={h.cantidad || 1}
                onChange={e => setCantHerraje(idx, e.target.value)} />
              <button style={st.btn("danger")} onClick={() => eliminarHerraje(idx)}>×</button>
            </div>
          );
        })}
        {herrajesDisponibles.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <select value={addHerrajeId} onChange={e => setAddHerrajeId(e.target.value)}
              style={{ flex: 1, fontSize: 11, fontFamily: "'DM Mono',monospace", padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", outline: "none" }}>
              <option value="">— Seleccionar herraje —</option>
              {herrajesDisponibles.filter(h => !herrajes.some(x => x.id === h.id)).map(h => (
                <option key={h.id} value={h.id}>{h.nombre}</option>
              ))}
            </select>
            <button onClick={agregarHerraje} disabled={!addHerrajeId}
              style={{ padding: "5px 12px", borderRadius: 6, cursor: addHerrajeId ? "pointer" : "default", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "transparent", border: "1px solid var(--border)", color: addHerrajeId ? "var(--accent)" : "var(--text-muted)", opacity: addHerrajeId ? 1 : 0.5 }}>
              + Agregar
            </button>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div style={{ display: "flex", gap: 8, paddingTop: 4, borderTop: "1px solid var(--border)" }}>
        <button onClick={onCancelar}
          style={{ flex: 1, padding: "8px 0", borderRadius: 7, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          Cancelar
        </button>
        <button onClick={handleGuardar}
          style={{ flex: 2, padding: "8px 0", borderRadius: 7, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)", boxShadow: "0 2px 8px rgba(180,100,20,0.22)" }}>
          ✓ Aplicar al presupuesto
        </button>
      </div>
    </div>
  );
}
