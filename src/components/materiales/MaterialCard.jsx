// ════════════════════════════════════════════════════════════════════════════
// MaterialCard — Tarjeta visual de material (solo display)
// ════════════════════════════════════════════════════════════════════════════
//
// Recibe un grupo de variantes del mismo color. AGL y MDF del mismo código
// EGGER comparten textura: se muestran en una sola card con un toggle de tipo.
// Al alternar, el precio / espesor / categoría se actualizan a esa variante.
// La edición se hace en MaterialEditorDrawer — esta card es solo visual.
//
// Layout:
//   ┌─────────────────────┐
//   │ ░ TEXTURA THUMB  ●  │  ← preview de textura (compartida) + dot categoría
//   │                  ⤢  │  ← lupa (hover) → lightbox
//   ├─────────────────────┤
//   │ W1100 ST9           │  ← código (acento)
//   │ Blanco Alpino       │  ← nombre
//   │ [AGL][MDF]  18mm    │  ← toggle de variante (o "MDF · 18mm" si es única)
//   │ $131.729 /m²        │  ← precio (de la variante activa)
//   │             [✎] [×] │  ← acciones
//   └─────────────────────┘
// ════════════════════════════════════════════════════════════════════════════

import React, { memo, useState, useEffect, useCallback } from "react";
import { fmtPeso } from "../../utils.js";

const M = "'DM Mono',monospace";
const TIPO_LABEL = { melamina: "AGL", mdf: "MDF" };

function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.82)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "zoom-out",
      }}
    >
      <img
        src={src} alt={alt}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: "88vw", maxHeight: "88vh",
          objectFit: "contain", borderRadius: 8,
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          cursor: "default",
        }}
      />
      <button
        onClick={onClose}
        title="Cerrar (Esc)"
        style={{
          position: "fixed", top: 18, right: 22,
          width: 34, height: 34, borderRadius: "50%",
          background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)",
          color: "#fff", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1,
        }}
      >×</button>
    </div>
  );
}

function MaterialCardBase({
  variantes,                  // Material[] — 1 o más (mismo color, distinto tipo)
  categoriaPorId,             // Map<id, {id,nombre,color}>
  onEditar,                   // (mat) => void
  onEliminar,                 // (id) => void
}) {
  const [varianteIdx, setVarianteIdx]   = useState(0);
  const [hoverImg, setHoverImg]         = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const idx  = Math.min(varianteIdx, variantes.length - 1);
  const mat  = variantes[idx];
  const tieneVariantes = variantes.length > 1;

  // AGL y MDF del mismo color comparten textura — se toma la que esté cargada
  const textura   = variantes.find(v => v.textura)?.textura || null;
  const categoria = mat.categoria ? categoriaPorId.get(mat.categoria) || null : null;

  const openLightbox  = useCallback((e) => { e.stopPropagation(); setLightboxOpen(true); }, []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

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
        onClick={() => onEditar(mat)}
        onMouseEnter={() => setHoverImg(true)}
        onMouseLeave={() => setHoverImg(false)}
        style={{
          position: "relative", paddingTop: "75%", cursor: "pointer",
          background: textura ? "transparent" : "var(--bg-base)",
        }}>
        {textura ? (
          <>
            <img
              src={textura} alt={mat.codigo || mat.nombre}
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%", objectFit: "cover", display: "block",
              }}
            />
            {/* Botón lupa — aparece al hacer hover */}
            <button
              onClick={openLightbox}
              title="Ver textura"
              style={{
                position: "absolute", bottom: 6, right: 6,
                width: 24, height: 24, borderRadius: 5, padding: 0,
                background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.90)", fontSize: 12, cursor: "zoom-in",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: hoverImg ? 1 : 0,
                transition: "opacity 0.15s",
                backdropFilter: "blur(2px)",
              }}
            >⤢</button>
          </>
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

        {/* Meta — toggle de variante si hay más de una */}
        {tieneVariantes ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
            <div style={{ display: "flex", gap: 2 }}>
              {variantes.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => setVarianteIdx(i)}
                  title={v.tipo}
                  style={{
                    padding: "1px 6px", fontSize: 9, fontFamily: M, fontWeight: 700,
                    borderRadius: 3, cursor: "pointer", lineHeight: 1.6,
                    border: "1px solid " + (i === idx ? "var(--accent-border)" : "var(--border)"),
                    background: i === idx ? "var(--accent-soft)" : "transparent",
                    color: i === idx ? "var(--accent)" : "var(--text-muted)",
                    transition: "all 0.12s",
                  }}>
                  {TIPO_LABEL[v.tipo] || v.tipo}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 10, fontFamily: M, color: "var(--text-muted)" }}>
              {mat.espesor}mm
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 10, fontFamily: M, color: "var(--text-muted)" }}>
            {mat.tipo} · {mat.espesor}mm
          </div>
        )}

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
              onClick={() => onEditar(mat)}
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
              onClick={() => onEliminar(mat.id)}
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

      {lightboxOpen && textura && (
        <Lightbox src={textura} alt={mat.codigo || mat.nombre} onClose={closeLightbox} />
      )}
    </div>
  );
}

// Memo: solo re-render si cambian las variantes o el mapa de categorías
const MaterialCard = memo(MaterialCardBase, (prev, next) => {
  if (prev.categoriaPorId !== next.categoriaPorId) return false;
  if (prev.variantes.length !== next.variantes.length) return false;
  return prev.variantes.every((v, i) => v === next.variantes[i]);
});

export default MaterialCard;
