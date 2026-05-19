// ════════════════════════════════════════════════════════════════════════════
// MaterialSearchToolbar — Buscador + ordenamiento + vista + botón Nuevo
// ════════════════════════════════════════════════════════════════════════════
//
// Componente presentacional puro. Recibe estado y callbacks por props.
// El input de búsqueda mantiene su propio valor local para que el typing
// no se pause si el padre usa useDeferredValue para diferir el filtrado.
// ════════════════════════════════════════════════════════════════════════════

import React from "react";

const M = "'DM Mono',monospace";

const ORDEN_OPTS = [
  { value: "nombre", label: "Nombre A→Z" },
  { value: "codigo", label: "Código A→Z" },
  { value: "precio", label: "Precio ↑" },
  { value: "fecha",  label: "Actualizado" },
];

function ToggleVista({ vista, onChange }) {
  return (
    <div style={{
      display: "flex", border: "1px solid var(--border)",
      borderRadius: 5, overflow: "hidden", flexShrink: 0,
    }}>
      {["agrupada", "plana"].map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          title={v === "agrupada" ? "Agrupado por categoría" : "Lista plana"}
          style={{
            padding: "5px 10px", fontSize: 10, fontFamily: M, fontWeight: 700,
            cursor: "pointer",
            background: vista === v ? "var(--accent-soft)" : "transparent",
            color: vista === v ? "var(--accent)" : "var(--text-muted)",
            border: "none",
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
          {v === "agrupada" ? "▤ Agrup." : "≡ Plana"}
        </button>
      ))}
    </div>
  );
}

export default function MaterialSearchToolbar({
  query, onQueryChange,
  orden, onOrdenChange,
  vista, onVistaChange,
  resultadosCount,
  onNuevo, nuevoDisabled = false,
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 12px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg-surface)",
    }}>
      {/* Buscador (flex-grow) */}
      <input
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        placeholder="🔍 Buscar por nombre, código, proveedor, tipo..."
        style={{
          flex: 1, minWidth: 0, fontFamily: M, fontSize: 12,
          padding: "6px 10px", background: "var(--bg-base)",
          border: "1px solid var(--border)", color: "var(--text-primary)",
          borderRadius: 6, outline: "none",
        }}
        onFocus={e => (e.target.style.borderColor = "var(--accent)")}
        onBlur={e => (e.target.style.borderColor = "var(--border)")}
      />

      {/* Contador */}
      <span style={{
        fontSize: 10, fontFamily: M, color: "var(--text-muted)",
        flexShrink: 0, whiteSpace: "nowrap",
      }}>
        {resultadosCount} {resultadosCount === 1 ? "resultado" : "resultados"}
      </span>

      {/* Ordenamiento */}
      <select
        value={orden}
        onChange={e => onOrdenChange(e.target.value)}
        title="Ordenar por"
        style={{
          padding: "5px 8px", fontSize: 10, fontFamily: M, fontWeight: 700,
          cursor: "pointer",
          background: "var(--bg-base)", border: "1px solid var(--border)",
          color: "var(--text-secondary)", borderRadius: 5, outline: "none",
          flexShrink: 0,
        }}>
        {ORDEN_OPTS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <ToggleVista vista={vista} onChange={onVistaChange} />

      <button
        onClick={onNuevo}
        disabled={nuevoDisabled}
        style={{
          padding: "6px 12px", fontSize: 11, fontFamily: M, fontWeight: 700,
          cursor: nuevoDisabled ? "not-allowed" : "pointer",
          background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
          border: "none", color: "var(--text-inverted)", borderRadius: 5,
          flexShrink: 0, opacity: nuevoDisabled ? 0.5 : 1,
        }}>
        + Nuevo material
      </button>
    </div>
  );
}
