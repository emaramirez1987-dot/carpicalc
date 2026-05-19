// ════════════════════════════════════════════════════════════════════════════
// MaterialEditorDrawer — Modal centrado
// ════════════════════════════════════════════════════════════════════════════
//
// Modal para crear o editar un material completo. Se centra en pantalla
// con el mismo ancho del contenedor de materiales. Layout de dos columnas:
//
//   ┌──────────────────────────────────────────────────┐
//   │  ✎ Editar material  ·  W1100 ST9               × │  ← header
//   ├───────────────────────┬──────────────────────────┤
//   │  [Textura]            │  Especificaciones         │
//   │                       │  ─ espesor · veta         │
//   │  Identificación       │  ─ placa largo · ancho    │
//   │  ─ código · nombre    │                           │
//   │  ─ categoría · tipo   │  Costos                   │
//   │                       │  ─ precio placa           │
//   │                       │  ─ precio m² (derivado)   │
//   │                       │  ─ proveedor              │
//   │                       │                           │
//   │                       │  Observaciones            │
//   ├───────────────────────┴──────────────────────────┤
//   │  [× Eliminar]                [Cancelar] [Guardar]│  ← footer
//   └──────────────────────────────────────────────────┘
//
// Overlay oscuro detrás. Click en overlay = cancelar (con confirm si hay cambios).
// Portal a document.body para evitar clipping por backdrop-filter del header.
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { MATERIAL_VACIO, derivarPrecioM2 } from "../../services/materialesService.js";
import { fmtPeso } from "../../utils.js";

const M = "'DM Mono',monospace";

// ── Estilos ───────────────────────────────────────────────────────────────
const labelStyle = {
  fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase",
  letterSpacing: "0.08em", fontWeight: 700, display: "block", marginBottom: 4,
};
const inputStyle = {
  width: "100%", fontFamily: M, fontSize: 13, padding: "7px 10px",
  background: "var(--bg-base)", border: "1px solid var(--border)",
  color: "var(--text-primary)", borderRadius: 5, outline: "none",
  boxSizing: "border-box",
};
const sectionHeader = {
  fontSize: 10, fontFamily: M, fontWeight: 700, color: "var(--accent)",
  textTransform: "uppercase", letterSpacing: "0.10em",
  marginTop: 18, marginBottom: 10,
  paddingBottom: 6, borderBottom: "1px solid var(--border)",
};

const TIPO_OPTS = [
  { value: "melamina",      label: "Melamina" },
  { value: "mdf",           label: "MDF" },
  { value: "aglomerado",    label: "Aglomerado" },
  { value: "madera_maciza", label: "Madera maciza" },
  { value: "terciado",      label: "Terciado" },
  { value: "otro",          label: "Otro" },
];
const VETA_OPTS = [
  { value: "ninguna",    label: "Sin veta" },
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical",   label: "Vertical" },
];

// ── Helpers ───────────────────────────────────────────────────────────────
function Campo({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && (
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, fontFamily: M }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function TexturaUploader({ value, onChange }) {
  const fileRef = useRef();
  const [error, setError] = useState("");
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Solo imágenes PNG/JPG"); return; }
    const reader = new FileReader();
    reader.onloadend = () => { onChange(reader.result); setError(""); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          width: 110, height: 110, borderRadius: 8, cursor: "pointer",
          border: value ? "1px solid var(--border)" : "2px dashed var(--accent-border)",
          background: "var(--bg-base)", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
        {value
          ? <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 28, color: "var(--text-muted)" }}>+</span>}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Imagen de textura para el render 3D.
        </div>
        {value && (
          <button
            onClick={() => onChange(null)}
            style={{
              padding: "4px 10px", fontSize: 10, fontFamily: M, fontWeight: 700,
              cursor: "pointer", background: "transparent",
              border: "1px solid rgba(200,60,60,0.30)", color: "#e07070",
              borderRadius: 4, alignSelf: "flex-start",
            }}>
            × Quitar textura
          </button>
        )}
        {error && (
          <div style={{ fontSize: 10, color: "#e07070", fontFamily: M }}>{error}</div>
        )}
      </div>
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────
export default function MaterialEditorDrawer({
  abierto,
  material,                    // material existente o null = nuevo
  categorias,
  onClose,
  onSave,
  onEliminar,                  // null = no mostrar botón eliminar (creación)
}) {
  const esNuevo = !material?.id;
  const [data, setData] = useState(material || MATERIAL_VACIO);
  const [dirty, setDirty] = useState(false);

  // Reset al abrir con un material distinto
  useEffect(() => {
    if (abierto) {
      setData(material || MATERIAL_VACIO);
      setDirty(false);
    }
  }, [abierto, material]);

  const upd = (k, v) => {
    setData(d => ({ ...d, [k]: v }));
    setDirty(true);
  };

  // Precio m² derivado
  const precioM2Calculado = useMemo(
    () => derivarPrecioM2(data.precioPlaca, data.placaLargo, data.placaAncho),
    [data.precioPlaca, data.placaLargo, data.placaAncho]
  );

  const guardar = () => {
    const limpio = {
      ...data,
      codigo: (data.codigo || "").toUpperCase().trim(),
      precioPlaca: parseFloat(data.precioPlaca) || 0,
      precioM2: precioM2Calculado,
      espesor: parseFloat(data.espesor) || 0,
      placaLargo: parseFloat(data.placaLargo) || 2750,
      placaAncho: parseFloat(data.placaAncho) || 1830,
      esDefault:  data.esDefault === true,
      fechaActualizacion: Date.now(),
    };
    onSave(limpio);
  };

  const intentarCerrar = () => {
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Cerrar de todos modos?")) return;
    onClose();
  };

  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return;
    const handler = (e) => { if (e.key === "Escape") intentarCerrar(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, dirty]);

  if (!abierto) return null;

  const categoriaOpts = [
    { value: "", label: "— Sin categoría —" },
    ...categorias.map(c => ({ value: c.id, label: c.nombre })),
  ];

  // Portal a document.body: garantiza que `position: fixed` se calcule contra
  // el viewport real, sin importar si algún ancestro tiene transform/filter/etc.
  // (Sin portal, el header con backdrop-filter:blur convierte al ancestro en
  // containing-block y el modal toma medidas incorrectas.)
  return createPortal(
    <>
      <style>{`
        @keyframes matmodal-in   { from { opacity: 0; transform: scale(0.96) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes matoverlay-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Overlay — también es el centrador flex */}
      <div
        onClick={intentarCerrar}
        style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(0,0,0,0.50)", backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px 16px",
          animation: "matoverlay-in 0.18s ease-out",
        }}
      >
        {/* Modal panel — stopPropagation evita que click interno cierre */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: "min(920px, 100%)",
            maxHeight: "calc(100vh - 40px)",
            zIndex: 1101,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
            display: "flex", flexDirection: "column",
            animation: "matmodal-in 0.22s cubic-bezier(0.22, 0.61, 0.36, 1)",
          }}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 20px", borderBottom: "1px solid var(--border)",
            background: "var(--bg-surface)", flexShrink: 0, borderRadius: "10px 10px 0 0",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontSize: 11, fontFamily: M, fontWeight: 700, color: "var(--accent)",
                textTransform: "uppercase", letterSpacing: "0.10em",
              }}>
                {esNuevo ? "＋ Nuevo material" : "✎ Editar material"}
              </span>
              {data.codigo && !esNuevo && (
                <span style={{
                  fontSize: 10, fontFamily: M, fontWeight: 700, color: "var(--text-muted)",
                }}>
                  {data.codigo}
                </span>
              )}
            </div>
            <button
              onClick={intentarCerrar}
              title="Cerrar (Esc)"
              style={{
                background: "none", border: "1px solid var(--border)",
                color: "var(--text-muted)", cursor: "pointer",
                fontSize: 16, lineHeight: 1, padding: "2px 8px", borderRadius: 4,
              }}>
              ×
            </button>
          </div>

          {/* ── Body — dos columnas, scrollable ────────────────────── */}
          <div style={{
            flex: 1, overflowY: "auto",
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0,
            minHeight: 0,
          }}>
            {/* Columna izquierda: Textura + Identificación + Especificaciones */}
            <div style={{ padding: "18px 20px", borderRight: "1px solid var(--border)" }}>
              <Campo label="Textura">
                <TexturaUploader value={data.textura} onChange={v => upd("textura", v)} />
              </Campo>

              <div style={sectionHeader}>Identificación</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Campo label="Código EGGER">
                  <input
                    value={data.codigo || ""}
                    onChange={e => upd("codigo", e.target.value)}
                    placeholder="W1100 ST9"
                    style={inputStyle}
                  />
                </Campo>
                <Campo label="Nombre">
                  <input
                    value={data.nombre || ""}
                    onChange={e => upd("nombre", e.target.value)}
                    placeholder="Blanco Alpino"
                    style={inputStyle}
                  />
                </Campo>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Campo label="Categoría">
                  <select value={data.categoria || ""} onChange={e => upd("categoria", e.target.value || null)} style={inputStyle}>
                    {categoriaOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Campo>
                <Campo label="Tipo técnico">
                  <select value={data.tipo} onChange={e => upd("tipo", e.target.value)} style={inputStyle}>
                    {TIPO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Campo>
              </div>

              <div style={sectionHeader}>Especificaciones</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Campo label="Espesor (mm)">
                  <input
                    type="number" value={data.espesor || ""} onChange={e => upd("espesor", e.target.value)}
                    style={inputStyle}
                  />
                </Campo>
                <Campo label="Orientación de veta">
                  <select value={data.veta} onChange={e => upd("veta", e.target.value)} style={inputStyle}>
                    {VETA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Campo>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Campo label="Placa largo (mm)">
                  <input
                    type="number" value={data.placaLargo || ""} onChange={e => upd("placaLargo", e.target.value)}
                    style={inputStyle}
                  />
                </Campo>
                <Campo label="Placa ancho (mm)">
                  <input
                    type="number" value={data.placaAncho || ""} onChange={e => upd("placaAncho", e.target.value)}
                    style={inputStyle}
                  />
                </Campo>
              </div>
            </div>

            {/* Columna derecha: Costos + Observaciones */}
            <div style={{ padding: "18px 20px" }}>
              <div style={sectionHeader}>Costos</div>
              <Campo label="Precio por placa">
                <input
                  type="number" value={data.precioPlaca || ""} onChange={e => upd("precioPlaca", e.target.value)}
                  placeholder="0"
                  style={inputStyle}
                />
              </Campo>
              <Campo label="Precio por m² (calculado)" hint="Derivado automáticamente desde precio de placa y medidas.">
                <div style={{
                  ...inputStyle,
                  background: "rgba(212,175,55,0.06)",
                  borderColor: "var(--accent-border)",
                  color: "var(--accent)", fontWeight: 700,
                  display: "flex", alignItems: "center",
                }}>
                  {fmtPeso(precioM2Calculado)} /m²
                </div>
              </Campo>
              <label style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", marginBottom: 12,
                background: data.esDefault ? "rgba(212,175,55,0.10)" : "var(--bg-base)",
                border: `1px solid ${data.esDefault ? "var(--accent-border)" : "var(--border)"}`,
                borderRadius: 5, cursor: "pointer",
                transition: "all 0.15s",
              }}>
                <input
                  type="checkbox"
                  checked={data.esDefault === true}
                  onChange={e => upd("esDefault", e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--accent)" }}
                />
                <div style={{ flex: 1, lineHeight: 1.4 }}>
                  <div style={{
                    fontSize: 11, fontFamily: M, fontWeight: 700,
                    color: data.esDefault ? "var(--accent)" : "var(--text-primary)",
                  }}>
                    {data.esDefault ? "⭐ " : ""}Material por defecto para "{data.tipo}"
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                    Este precio se aplica al calcular módulos de este tipo. Solo uno por tipo.
                  </div>
                </div>
              </label>
              <Campo label="Proveedor">
                <input
                  value={data.proveedor || ""} onChange={e => upd("proveedor", e.target.value)}
                  placeholder="ej: DIAC, EGGER, otro"
                  style={inputStyle}
                />
              </Campo>

              <div style={sectionHeader}>Observaciones</div>
              <Campo label="Notas internas">
                <textarea
                  value={data.observaciones || ""} onChange={e => upd("observaciones", e.target.value)}
                  rows={4}
                  placeholder="Stock, fecha de cotización, comentarios..."
                  style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical", minHeight: 72 }}
                />
              </Campo>
            </div>
          </div>

          {/* ── Footer sticky ────────────────────────────────────────── */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
            padding: "12px 20px", borderTop: "1px solid var(--border)",
            background: "var(--bg-surface)", flexShrink: 0, borderRadius: "0 0 10px 10px",
          }}>
            <div>
              {!esNuevo && onEliminar && (
                <button
                  onClick={() => {
                    if (window.confirm(`¿Eliminar el material "${data.nombre || data.codigo}"?`)) {
                      onEliminar(data.id);
                    }
                  }}
                  style={{
                    padding: "7px 12px", fontSize: 11, fontFamily: M, fontWeight: 700,
                    cursor: "pointer", background: "transparent",
                    border: "1px solid rgba(200,60,60,0.35)", color: "#e07070",
                    borderRadius: 5,
                  }}>
                  × Eliminar
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={intentarCerrar}
                style={{
                  padding: "7px 14px", fontSize: 11, fontFamily: M, fontWeight: 700,
                  cursor: "pointer", background: "transparent",
                  border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 5,
                }}>
                Cancelar
              </button>
              <button
                onClick={guardar}
                style={{
                  padding: "7px 16px", fontSize: 11, fontFamily: M, fontWeight: 700,
                  cursor: "pointer",
                  background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
                  border: "none", color: "var(--text-inverted)", borderRadius: 5,
                }}>
                ✓ Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
