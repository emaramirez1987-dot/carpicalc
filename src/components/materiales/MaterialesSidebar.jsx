// ════════════════════════════════════════════════════════════════════════════
// MaterialesSidebar — Lista de categorías + creación inline + eliminación
// ════════════════════════════════════════════════════════════════════════════
//
// Muestra:
//   ▣ Todos        N
//   ─────────────
//   ● categoría 1  N
//   ● categoría 2  N
//   ─────────────
//   (sin categoría) N
//   + Categoría
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from "react";
import { CATEGORIA_TODOS, CATEGORIA_SIN_ASIGNAR, getNextCategoriaColor } from "./useMaterialesFilter.js";

const M = "'DM Mono',monospace";

function FilaCategoria({
  id, nombre, color, count, activa, onSelect, onEliminar,
  conPunto = true, estilo = "normal",
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onSelect(id)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "5px 8px", borderRadius: 5, cursor: "pointer",
        background: activa ? "var(--accent-soft)" : (hover ? "rgba(255,255,255,0.03)" : "transparent"),
        border: `1px solid ${activa ? "var(--accent-border)" : "transparent"}`,
        transition: "background 0.1s",
      }}>
      {conPunto ? (
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      ) : (
        <span style={{ width: 8, fontSize: 10, color: "var(--text-muted)", flexShrink: 0, textAlign: "center" }}>
          {estilo === "meta" && id === CATEGORIA_TODOS ? "▣" : "○"}
        </span>
      )}
      <span style={{
        flex: 1, fontSize: 12, fontFamily: M,
        color: activa ? "var(--accent)" : "var(--text-secondary)",
        fontWeight: activa ? 700 : 500,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {nombre}
      </span>
      <span style={{
        fontSize: 10, fontFamily: M, color: "var(--text-muted)",
        background: "rgba(0,0,0,0.18)", padding: "1px 6px", borderRadius: 3,
        flexShrink: 0,
      }}>
        {count}
      </span>
      {onEliminar && hover && (
        <button
          onClick={e => { e.stopPropagation(); onEliminar(id); }}
          title="Eliminar categoría"
          style={{
            background: "none", border: "none", color: "#e07070",
            cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0,
            flexShrink: 0, opacity: 0.7,
          }}>
          ×
        </button>
      )}
    </div>
  );
}

export default function MaterialesSidebar({
  categorias,
  counts,
  categoriaActiva,
  onSelectCategoria,
  onCrearCategoria,
  onEliminarCategoria,
}) {
  const [creando, setCreando] = useState(false);
  const [nombreNueva, setNombreNueva] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  const confirmarCrear = () => {
    const n = nombreNueva.trim();
    if (!n) { setCreando(false); setNombreNueva(""); return; }
    onCrearCategoria({
      id: `cat_${Date.now()}`,
      nombre: n,
      color: getNextCategoriaColor(categorias),
    });
    setCreando(false);
    setNombreNueva("");
  };

  const eliminarConfirmado = (id) => {
    onEliminarCategoria(id);
    setConfirmEliminar(null);
  };

  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: "rgba(0,0,0,0.10)",
      borderRight: "1px solid var(--border)",
      padding: "10px 8px",
      display: "flex", flexDirection: "column", gap: 2,
      overflowY: "auto",
    }}>
      <div style={{
        fontSize: 9, fontFamily: M, fontWeight: 700, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.10em",
        padding: "4px 8px 8px",
      }}>
        Categorías
      </div>

      <FilaCategoria
        id={CATEGORIA_TODOS} nombre="Todos" conPunto={false} estilo="meta"
        count={counts[CATEGORIA_TODOS] || 0}
        activa={categoriaActiva === CATEGORIA_TODOS}
        onSelect={onSelectCategoria}
      />

      {categorias.length > 0 && (
        <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />
      )}

      {categorias.map(c => (
        <div key={c.id}>
          <FilaCategoria
            id={c.id} nombre={c.nombre} color={c.color}
            count={counts[c.id] || 0}
            activa={categoriaActiva === c.id}
            onSelect={onSelectCategoria}
            onEliminar={() => setConfirmEliminar(c.id)}
          />
          {confirmEliminar === c.id && (
            <div style={{
              margin: "4px 8px", padding: "6px 8px",
              background: "rgba(200,60,60,0.08)",
              border: "1px solid rgba(200,60,60,0.30)",
              borderRadius: 5, fontSize: 10, fontFamily: M, color: "#e07070",
            }}>
              ¿Eliminar categoría? Los materiales pasan a "Sin categoría".
              <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                <button
                  onClick={() => eliminarConfirmado(c.id)}
                  style={{
                    flex: 1, padding: "3px 6px", fontSize: 10, fontFamily: M, fontWeight: 700,
                    cursor: "pointer", background: "rgba(200,60,60,0.20)",
                    border: "1px solid rgba(200,60,60,0.45)", color: "#e07070", borderRadius: 3,
                  }}>
                  Sí, eliminar
                </button>
                <button
                  onClick={() => setConfirmEliminar(null)}
                  style={{
                    padding: "3px 6px", fontSize: 10, fontFamily: M,
                    cursor: "pointer", background: "transparent",
                    border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 3,
                  }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {(counts[CATEGORIA_SIN_ASIGNAR] || 0) > 0 && (
        <>
          <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />
          <FilaCategoria
            id={CATEGORIA_SIN_ASIGNAR} nombre="Sin categoría" conPunto={false} estilo="meta"
            count={counts[CATEGORIA_SIN_ASIGNAR]}
            activa={categoriaActiva === CATEGORIA_SIN_ASIGNAR}
            onSelect={onSelectCategoria}
          />
        </>
      )}

      <div style={{ marginTop: 8 }}>
        {creando ? (
          <div style={{ display: "flex", gap: 4, padding: "0 4px" }}>
            <input
              autoFocus
              value={nombreNueva}
              onChange={e => setNombreNueva(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") confirmarCrear();
                if (e.key === "Escape") { setCreando(false); setNombreNueva(""); }
              }}
              placeholder="Nombre de categoría"
              style={{
                flex: 1, fontSize: 11, fontFamily: M, padding: "4px 6px",
                background: "var(--bg-base)", border: "1px solid var(--accent-border)",
                color: "var(--text-primary)", borderRadius: 4, outline: "none",
                minWidth: 0,
              }}
            />
            <button
              onClick={confirmarCrear}
              style={{
                padding: "0 8px", fontSize: 11, fontFamily: M, fontWeight: 700,
                cursor: "pointer", background: "var(--accent-soft)",
                border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 4,
              }}>
              ✓
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreando(true)}
            style={{
              width: "100%", padding: "6px 8px", borderRadius: 5,
              fontSize: 11, fontFamily: M, fontWeight: 700,
              cursor: "pointer", background: "transparent",
              border: "1px dashed rgba(212,175,55,0.40)",
              color: "var(--accent)", textAlign: "left",
            }}>
            + Categoría
          </button>
        )}
      </div>
    </div>
  );
}
