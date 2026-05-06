// ════════════════════════════════════════════════════════════════════════════
// ComposicionEditor.jsx
// Editor de composición visual (vistaConfig) por instancia de presupuesto.
// Componente autónomo — no importa desde catalogo/.
// Props:
//   modBase          — módulo base del catálogo (para preview y dimensiones)
//   vistaConfigInicial — vistaConfig actual de la instancia (o null)
//   onGuardar(vistaConfig) — callback con el resultado
//   onCancelar       — callback para cerrar sin guardar
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from "react";
import VistaModuloSVG from "../vista-svg/index.js";
import { useTema } from "../../hooks/useTema.js";

// ── Constantes de dominio ─────────────────────────────────────────────────

const LAYOUT_PRESETS = [
  { id: "simple",       label: "Simple",     dir: "v", icon: "▭",  zonasDef: [{ id: "main", fr: 1 }] },
  { id: "sup_inf",      label: "Sup / Inf",  dir: "v", icon: "⊟",  zonasDef: [{ id: "sup", fr: 0.60 }, { id: "inf", fr: 0.40 }] },
  { id: "tres_franjas", label: "3 franjas",  dir: "v", icon: "≡",  zonasDef: [{ id: "sup", fr: 0.34 }, { id: "mid", fr: 0.33 }, { id: "inf", fr: 0.33 }] },
  { id: "izq_der",      label: "Izq / Der",  dir: "h", icon: "▌▐", zonasDef: [{ id: "izq", fr: 0.50 }, { id: "der", fr: 0.50 }] },
  { id: "cajonera",     label: "Cajonera",   dir: "v", icon: "⊞",  zonasDef: [{ id: "main", fr: 1 }], defaultTipo: "cajones" },
];

const ZONA_TIPOS = [
  { id: "abierto",  label: "Abierto",   icon: "⊡" },
  { id: "puerta_1", label: "1 Puerta",  icon: "□"  },
  { id: "puerta_2", label: "2 Puertas", icon: "⊟"  },
  { id: "cajones",  label: "Cajones",   icon: "≡"  },
];

const ZONA_LABELS = {
  main: "Principal", sup: "Superior", mid: "Medio",
  inf: "Inferior",   izq: "Izquierda", der: "Derecha",
};

// ── Helpers de estilo ─────────────────────────────────────────────────────

const chipSt = (activo) => ({
  padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11,
  fontFamily: "'DM Mono',monospace", fontWeight: 700, transition: "all 0.12s",
  background: activo ? "var(--accent-soft)"  : "transparent",
  border:     `1px solid ${activo ? "var(--accent-border)" : "var(--border)"}`,
  color:      activo ? "var(--accent)"        : "var(--text-muted)",
});

const numChipSt = (activo) => ({
  ...chipSt(activo), padding: "2px 8px", fontSize: 10,
});

// ── Componente ────────────────────────────────────────────────────────────

export default function ComposicionEditor({ modBase, vistaConfigInicial, onGuardar, onCancelar }) {
  const { tema } = useTema();
  const vc = vistaConfigInicial || modBase?.vistaConfig || {};

  const [zocalo,      setZocalo]      = useState(String(vc.zocalo ?? 0));
  const [layoutId,    setLayoutId]    = useState(vc.layoutId || "simple");
  const [zonasConfig, setZonasConfig] = useState(vc.zonas   || {});

  const preset = LAYOUT_PRESETS.find(p => p.id === layoutId) || LAYOUT_PRESETS[0];

  const cambiarLayout = (nuevoId) => {
    const nuevo = LAYOUT_PRESETS.find(p => p.id === nuevoId) || LAYOUT_PRESETS[0];
    setLayoutId(nuevoId);
    setZonasConfig(prev => {
      const next = {};
      nuevo.zonasDef.forEach(({ id }) => {
        next[id] = prev[id] || (nuevo.defaultTipo
          ? { tipo: nuevo.defaultTipo, cantidad: 3 }
          : { tipo: "abierto" });
      });
      return next;
    });
  };

  const setZonaTipo  = (zonaId, tipo)        =>
    setZonasConfig(prev => ({ ...prev, [zonaId]: { ...(prev[zonaId] || {}), tipo } }));
  const setZonaExtra = (zonaId, campo, valor) =>
    setZonasConfig(prev => ({ ...prev, [zonaId]: { ...(prev[zonaId] || {}), [campo]: valor } }));

  const vistaPreview = useMemo(() => ({
    zocalo:    parseInt(zocalo) || 0,
    layoutId,
    layoutDir: preset.dir,
    zonasDef:  preset.zonasDef,
    zonas:     zonasConfig,
  }), [zocalo, layoutId, preset, zonasConfig]);

  const handleGuardar = () => onGuardar(vistaPreview);

  const labelStyle = {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 6,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 900, color: "var(--accent)", marginBottom: 2 }}>
          ▣ Composición
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {modBase?.nombre} · {modBase?.dimensiones?.ancho} × {modBase?.dimensiones?.profundidad} × {modBase?.dimensiones?.alto} mm
        </div>
      </div>

      {/* Preview SVG */}
      <div style={{ display: "flex", justifyContent: "center", background: "var(--bg-subtle)", borderRadius: 10, padding: 10, border: "1px solid var(--border)" }}>
        <VistaModuloSVG
          modulo={modBase}
          vistaConfig={vistaPreview}
          theme={tema}
          width={220}
          height={220}
        />
      </div>

      {/* Zócalo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>Zócalo</span>
        <input
          type="number" min="0" max="200" value={zocalo}
          onChange={e => setZocalo(e.target.value)}
          style={{
            flex: 1, fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "4px 8px",
            background: "var(--bg-base)", border: "1px solid var(--border)",
            borderRadius: 6, color: "var(--text-primary)", outline: "none", textAlign: "right",
          }}
        />
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>mm</span>
      </div>

      {/* Distribución */}
      <div>
        <div style={labelStyle}>Distribución</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {LAYOUT_PRESETS.map(p => (
            <button key={p.id} onClick={() => cambiarLayout(p.id)} style={chipSt(layoutId === p.id)}>
              <span style={{ marginRight: 4 }}>{p.icon}</span>{p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Zonas */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={labelStyle}>Zonas</div>
        {preset.zonasDef.map(({ id }) => {
          const zc   = zonasConfig[id] || {};
          const tipo = zc.tipo || (preset.defaultTipo || "abierto");
          return (
            <div key={id} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", marginBottom: 8, fontFamily: "'DM Mono',monospace" }}>
                {ZONA_LABELS[id] || id}
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: tipo !== "abierto" ? 8 : 0 }}>
                {ZONA_TIPOS.map(t => (
                  <button key={t.id} onClick={() => setZonaTipo(id, t.id)} style={chipSt(tipo === t.id)}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              {tipo === "cajones" && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Cantidad</span>
                  {[1,2,3,4,5,6].map(n => (
                    <button key={n} onClick={() => setZonaExtra(id, "cantidad", n)}
                      style={numChipSt((zc.cantidad || 3) === n)}>{n}</button>
                  ))}
                </div>
              )}
              {(tipo === "abierto" || tipo === "puerta_1" || tipo === "puerta_2") && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Estantes</span>
                  {[0,1,2,3,4].map(n => (
                    <button key={n} onClick={() => setZonaExtra(id, "estantes", n)}
                      style={numChipSt((zc.estantes || 0) === n)}>{n}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Acciones */}
      <div style={{ display: "flex", gap: 8, paddingTop: 4, borderTop: "1px solid var(--border)" }}>
        <button onClick={onCancelar}
          style={{ flex: 1, padding: "8px 0", borderRadius: 7, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          Cancelar
        </button>
        <button onClick={handleGuardar}
          style={{ flex: 2, padding: "8px 0", borderRadius: 7, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)", boxShadow: "0 2px 8px rgba(180,100,20,0.22)" }}>
          ✓ Aplicar composición
        </button>
      </div>
    </div>
  );
}
