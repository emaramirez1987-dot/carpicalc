// ════════════════════════════════════════════════════════════════════════════
// MaterialCard — Tarjeta visual de material (solo display)
// ════════════════════════════════════════════════════════════════════════════
//
// La edición se hace en MaterialEditorDrawer. Esta card es solo visual.
// Memoizada: solo re-renderiza si cambia el material o su categoría asignada.
//
// Layout:
//   ┌─────────────────────┐
//   │ ░ TEXTURA THUMB  ●  │  ← preview de textura (o placeholder) + dot categoría
//   │                     │
//   ├─────────────────────┤
//   │ W1100 ST9           │  ← código (acento)
//   │ Blanco Alpino       │  ← nombre
//   │ MDF · 18mm          │  ← tipo + espesor
//   │ $131.729 /m²        │  ← precio
//   │             [✎] [×] │  ← acciones
//   └─────────────────────┘
// ════════════════════════════════════════════════════════════════════════════

import React, { memo } from "react";
import { fmtPeso } from "../../utils.js";

const M = "'DM Mono',monospace";

function MaterialCardBase({
  mat,
  categoria,                  // {id,nombre,color} | null
  onEditar,
  onEliminar,
}) {
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      overflow: "hidden",
      display: "flex", flexDirection: "column",
      transition: "border-color 0.15s, box-shadow 0.15s, transform 0.12s",
      cursor: "default",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--accent-border)";
        e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.22)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Preview textura (75% aspect, como la biblioteca legacy) */}
      <div
        onClick={onEditar}
        style={{
          position: "relative", paddingTop: "75%", cursor: "pointer",
          background: mat.textura ? "transparent" : "var(--bg-base)",
        }}>
        {mat.textura ? (
          <img
            src={mat.textura} alt={mat.codigo || mat.nombre}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%", objectFit: "cover", display: "block",
            }}
          />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", fontSize: 11, fontFamily: M,
            background: "linear-gradient(135deg, rgba(255,255,255,0.02), rgba(0,0,0,0.06))",
          }}>
            sin textura
          </div>
        )}

        {/* Dot de categoría (esquina sup. der.) */}
        {categoria && (
          <span
            title={categoria.nombre}
            style={{
              position: "absolute", top: 6, right: 6,
              width: 10, height: 10, borderRadius: "50%",
              background: categoria.color,
              border: "2px solid rgba(0,0,0,0.30)",
            }}
          />
        )}

        {/* Estrella de default (esquina sup. izq.) */}
        {mat.esDefault && (
          <span
            title={`Material por defecto para "${mat.tipo}"`}
            style={{
              position: "absolute", top: 4, left: 6,
              fontSize: 13, lineHeight: 1, color: "var(--accent)",
              textShadow: "0 1px 3px rgba(0,0,0,0.55)",
              pointerEvents: "none",
            }}>
            ⭐
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{
        padding: "8px 10px", display: "flex", flexDirection: "column", gap: 2,
        background: "var(--bg-surface)",
      }}>
        {/* Código (acento) */}
        {mat.codigo && (
          <div style={{
            fontSize: 9, fontFamily: M, fontWeight: 700, color: "var(--accent)",
            letterSpacing: "0.05em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}>
            {mat.codigo}
          </div>
        )}

        {/* Nombre */}
        <div style={{
          fontSize: 11, color: "var(--text-primary)", fontWeight: 600,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          lineHeight: 1.3,
        }}>
          {mat.nombre || <em style={{ color: "var(--text-muted)", fontWeight: 400 }}>(sin nombre)</em>}
        </div>

        {/* Meta */}
        <div style={{ fontSize: 10, fontFamily: M, color: "var(--text-muted)" }}>
          {mat.tipo} · {mat.espesor}mm
        </div>

        {/* Precio + acciones */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: 4,
        }}>
          <span style={{
            fontFamily: M, fontSize: 11, fontWeight: 700, color: "var(--accent)",
          }}>
            {mat.precioM2 > 0 ? `${fmtPeso(mat.precioM2)}/m²` : <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>sin precio</span>}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={onEditar}
              title="Editar"
              style={{
                width: 22, height: 22, padding: 0, fontSize: 11,
                cursor: "pointer", background: "var(--accent-soft)",
                border: "1px solid var(--accent-border)", color: "var(--accent)",
                borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              ✎
            </button>
            <button
              onClick={onEliminar}
              title="Eliminar"
              style={{
                width: 22, height: 22, padding: 0, fontSize: 13,
                cursor: "pointer", background: "transparent",
                border: "1px solid rgba(200,60,60,0.22)", color: "#e07070",
                borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Memo: solo re-render si cambia mat o categoría
const MaterialCard = memo(MaterialCardBase, (prev, next) => {
  return prev.mat === next.mat && prev.categoria === next.categoria;
});

export default MaterialCard;
