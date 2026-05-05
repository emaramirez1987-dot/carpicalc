import React, { useState, useRef } from "react";
import { Card, SectionTitle } from "../ui/index.jsx";
import { leerPlano, guardarPlano } from "../../storage.js";
import SVGPlano from "./SVGPlano.jsx";
import { exportarSVG, exportarPNG } from "./planoUtils.js";

const TIPO_META = {
  bajo:  { label: "Bajo",  color: "#7090c8" },
  aereo: { label: "Aéreo", color: "#a070c8" },
  torre: { label: "Torre", color: "#7ecf8a" },
};

// ── Estilos reutilizables ─────────────────────────────────────────────────
function btnStyle({ primary = false, disabled = false } = {}) {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "7px 14px", borderRadius: 6,
    fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700,
    letterSpacing: "0.05em", cursor: disabled ? "default" : "pointer",
    transition: "all 0.18s", opacity: disabled ? 0.4 : 1,
    background: primary
      ? "linear-gradient(135deg,var(--accent),var(--accent-hover))"
      : "var(--bg-surface)",
    border: primary ? "none" : "1px solid var(--border)",
    color: primary ? "var(--text-inverted)" : "var(--text-secondary)",
    boxShadow: primary && !disabled ? "0 3px 12px rgba(180,100,20,0.22)" : "none",
  };
}

function arrowBtn(disabled) {
  return {
    padding: "4px 9px", borderRadius: 5,
    fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    background: "transparent",
    border: "1px solid var(--border)",
    color: disabled ? "var(--text-muted)" : "var(--text-secondary)",
    opacity: disabled ? 0.3 : 0.8,
    transition: "all 0.12s",
  };
}

// ── Componente principal ──────────────────────────────────────────────────
export function PlanoDos({ items, modulos }) {
  const saved = leerPlano();
  const [bloques, setBloques]         = useState(() => saved?.bloques || []);
  const [altoCielorraso, setAlto]     = useState(() => saved?.altoCielorraso || 2400);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const svgRef = useRef(null);

  const persistir = (nuevosBloques, nuevoAlto) => {
    guardarPlano({ bloques: nuevosBloques, altoCielorraso: nuevoAlto });
  };

  const handleImportar = () => {
    if (!items.length) return;
    const nuevos = items.flatMap((item) => {
      const mod = modulos[item.codigo];
      if (!mod) return [];
      return Array.from({ length: item.cantidad }, () => ({
        id:          crypto.randomUUID(),
        codigo:      item.codigo,
        nombre:      mod.nombre,
        tipoVisual:  mod.tipoVisual || null,
        ancho:       mod.dimensiones.ancho,
        alto:        mod.dimensiones.alto,
        profundidad: mod.dimensiones.profundidad,
      }));
    });
    setBloques(nuevos);
    setSelectedIdx(null);
    persistir(nuevos, altoCielorraso);
  };

  const moverIzquierda = (idx) => {
    if (idx === 0) return;
    setBloques((prev) => {
      const a = [...prev];
      [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
      persistir(a, altoCielorraso);
      return a;
    });
    setSelectedIdx(idx - 1);
  };

  const moverDerecha = (idx) => {
    if (idx >= bloques.length - 1) return;
    setBloques((prev) => {
      const a = [...prev];
      [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]];
      persistir(a, altoCielorraso);
      return a;
    });
    setSelectedIdx(idx + 1);
  };

  const eliminarBloque = (idx) => {
    setBloques((prev) => {
      const a = prev.filter((_, i) => i !== idx);
      persistir(a, altoCielorraso);
      return a;
    });
    setSelectedIdx(null);
  };

  const handleAlto = (v) => {
    const val = Math.max(1800, parseInt(v) || 2400);
    setAlto(val);
    persistir(bloques, val);
  };

  const sinTipo = bloques.filter((b) => !b.tipoVisual).length;
  const totalMM = bloques.reduce((s, b) => s + b.ancho, 0);
  const nombreExport = "plano-2d";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Encabezado ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <SectionTitle sub="Vista frontal · estado visual independiente del presupuesto">
          Plano 2D
        </SectionTitle>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <button
            onClick={handleImportar}
            disabled={!items.length}
            style={btnStyle({ primary: true, disabled: !items.length })}>
            ↓ Importar presupuesto
          </button>
          <button
            onClick={() => exportarSVG(svgRef.current, nombreExport)}
            disabled={!bloques.length}
            style={btnStyle({ disabled: !bloques.length })}>
            ↗ SVG
          </button>
          <button
            onClick={() => exportarPNG(svgRef.current, nombreExport)}
            disabled={!bloques.length}
            style={btnStyle({ disabled: !bloques.length })}>
            ↗ PNG
          </button>
        </div>
      </div>

      {/* ── Barra de configuración ────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
          PISO–TECHO
          <input
            type="number" value={altoCielorraso} min={1800} max={4000} step={50}
            onChange={(e) => handleAlto(e.target.value)}
            style={{
              width: 72, padding: "4px 8px", borderRadius: 5,
              border: "1px solid var(--border)", background: "var(--bg-subtle)",
              color: "var(--text-primary)", fontFamily: "'DM Mono',monospace",
              fontSize: 12, textAlign: "right",
            }}
          />
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>mm</span>
        </label>

        {sinTipo > 0 && (
          <div style={{
            fontSize: 10, fontFamily: "'DM Mono',monospace",
            padding: "3px 9px", borderRadius: 5,
            color: "#e07070",
            background: "rgba(200,60,60,0.08)",
            border: "1px solid rgba(200,60,60,0.22)",
          }}>
            ⚠ {sinTipo} sin tipo visual — asignalo en Catálogo
          </div>
        )}

        {bloques.length > 0 && (
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", marginLeft: "auto" }}>
            {bloques.length} módulo{bloques.length !== 1 ? "s" : ""} · {totalMM} mm
          </div>
        )}
      </div>

      {/* ── Vista SVG ────────────────────────────────────────────────── */}
      <Card
        className="rsp-card"
        style={{ padding: 0, overflow: "hidden", background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
        <SVGPlano
          bloques={bloques}
          altoCielorraso={altoCielorraso}
          svgRef={svgRef}
          onSelect={setSelectedIdx}
          selectedIdx={selectedIdx}
          modulos={modulos}
        />
      </Card>

      {/* ── Leyenda de tipos ─────────────────────────────────────────── */}
      {bloques.length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {Object.entries(TIPO_META).map(([id, meta]) => (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: "'DM Mono',monospace", color: meta.color, opacity: 0.8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: meta.color + "30", border: `1px solid ${meta.color}60`, display: "inline-block" }} />
              {meta.label}
            </div>
          ))}
        </div>
      )}

      {/* ── Tira de composición ──────────────────────────────────────── */}
      {bloques.length > 0 && (
        <Card className="rsp-card">
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 12 }}>
            Composición
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {bloques.map((b, idx) => {
              const meta = TIPO_META[b.tipoVisual];
              const sel  = selectedIdx === idx;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedIdx(idx)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 10px", borderRadius: 7, cursor: "pointer",
                    background: sel ? "rgba(212,175,55,0.07)" : "var(--bg-subtle)",
                    border: `1px solid ${sel ? "rgba(212,175,55,0.30)" : "var(--border)"}`,
                    transition: "all 0.15s",
                  }}
                >
                  {/* Número */}
                  <span style={{
                    fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                    minWidth: 18, textAlign: "center",
                    color: sel ? "var(--accent)" : "var(--text-muted)",
                  }}>
                    {idx + 1}
                  </span>

                  {/* Badge tipo */}
                  <span style={{
                    fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                    padding: "2px 8px", borderRadius: 4, minWidth: 46, textAlign: "center",
                    background: meta ? `${meta.color}18` : "rgba(90,95,120,0.14)",
                    border: `1px solid ${meta ? meta.color + "40" : "rgba(90,95,120,0.30)"}`,
                    color: meta ? meta.color : "#4a5060",
                  }}>
                    {meta ? meta.label : "—"}
                  </span>

                  {/* Nombre y dimensiones */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: "var(--text-primary)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {b.nombre}
                    </div>
                    <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
                      {b.ancho} × {b.alto} mm
                    </div>
                  </div>

                  {/* Controles */}
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); moverIzquierda(idx); }}
                      disabled={idx === 0}
                      style={arrowBtn(idx === 0)}>
                      ←
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moverDerecha(idx); }}
                      disabled={idx === bloques.length - 1}
                      style={arrowBtn(idx === bloques.length - 1)}>
                      →
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); eliminarBloque(idx); }}
                      style={{ ...arrowBtn(false), color: "#c05050", borderColor: "rgba(200,60,60,0.28)" }}>
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Estado vacío ─────────────────────────────────────────────── */}
      {bloques.length === 0 && (
        <div style={{
          textAlign: "center", padding: "56px 0",
          border: "1px dashed var(--border)", borderRadius: 12,
          color: "var(--text-muted)",
        }}>
          <div style={{ fontSize: 34, marginBottom: 14 }}>📐</div>
          <p style={{ fontSize: 14, marginBottom: 8 }}>Sin módulos en el plano</p>
          <p style={{ fontSize: 12 }}>
            {items.length > 0
              ? <>Usá <strong style={{ color: "var(--accent)" }}>↓ Importar presupuesto</strong> para comenzar.</>
              : "Cargá módulos en la pestaña Presupuesto primero."}
          </p>
        </div>
      )}

    </div>
  );
}
