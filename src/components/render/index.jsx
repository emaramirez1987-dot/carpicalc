import React, { useState, useEffect, useRef } from "react";
import { SectionTitle } from "../ui/index.jsx";
import { leerPlano } from "../../storage.js";
import SVGPlano from "../plano/SVGPlano.jsx";

// ── Helpers ───────────────────────────────────────────────────────────────────

function bloquesDesdePresupuesto(p, modulos) {
  const pItems  = p.items || [];
  const pInline = p.inlineModulos || {};
  const pDim    = p.dimOverride || {};
  return pItems.flatMap(item => {
    const keyId  = item.id || item.codigo;
    const inline = pInline[keyId];
    const mod    = inline ?? modulos[item.codigo];
    if (!mod) return [];
    const dims = inline
      ? inline.dimensiones
      : (pDim[keyId] ? { ...mod.dimensiones, ...pDim[keyId] } : mod.dimensiones);
    return Array.from({ length: item.cantidad }, () => ({
      id:          crypto.randomUUID(),
      itemId:      item.id,
      codigo:      item.codigo,
      nombre:      mod.nombre,
      tipoVisual:  mod.tipoVisual || null,
      ancho:       dims.ancho,
      alto:        dims.alto,
      profundidad: dims.profundidad,
    }));
  });
}

function derivarSecuencias(bloques) {
  return {
    idsBajos: bloques.filter(b => b.tipoVisual !== "aereo").map(b => b.id),
    idsAltos: bloques.filter(b => b.tipoVisual === "aereo").map(b => b.id),
  };
}

// ── Botón de modo ─────────────────────────────────────────────────────────────

function BtnModo({ activo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px", borderRadius: 6, cursor: "pointer",
        fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
        letterSpacing: "0.06em", transition: "all 0.15s",
        background: activo ? "var(--accent-soft)" : "var(--bg-subtle)",
        border: `1px solid ${activo ? "var(--accent-border)" : "var(--border)"}`,
        color: activo ? "var(--accent)" : "var(--text-secondary)",
      }}
    >{children}</button>
  );
}

// ── Placeholder render ────────────────────────────────────────────────────────

function PlaceholderRender({ compact = false }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg-surface)", border: "1px dashed var(--border)",
      borderRadius: 12, padding: compact ? "24px 16px" : "60px 32px", gap: 12,
    }}>
      <div style={{ fontSize: compact ? 28 : 40 }}>✨</div>
      <div style={{ fontSize: compact ? 13 : 15, fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>
        Render realista con IA
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", maxWidth: 260 }}>
        Próximamente — la IA generará una foto realista a partir de este plano y tu descripción
      </div>
      <div style={{
        marginTop: 8, padding: "7px 18px", borderRadius: 6,
        fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
        background: "var(--bg-subtle)", border: "1px solid var(--border)",
        color: "var(--text-muted)", cursor: "default", opacity: 0.6,
      }}>▶ Generar render</div>
    </div>
  );
}

// ── Panel SVG estático ────────────────────────────────────────────────────────

function PanelSVG({ bloques, idsBajos, idsAltos, altoCielorraso, composicionOverride, modulos, compact = false }) {
  const bloquesAltos = bloques.filter(b => idsAltos.includes(b.id));
  const bloquesBajos = bloques.filter(b => idsBajos.includes(b.id));
  return (
    <div style={{
      flex: 1, background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: compact ? "8px 12px" : "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
          📐 Plano técnico
        </span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
        <SVGPlano
          bloquesAltos={bloquesAltos}
          bloquesBajos={bloquesBajos}
          altoCielorraso={altoCielorraso}
          modulos={modulos}
          composicionOverride={composicionOverride}
          onSelect={null}
          selectedId={null}
        />
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function RenderIA({
  modulos = {},
  composicionOverride = {},
  items = [],
  dimOverride = {},
  inlineModulos = {},
  presupuestoActivoId = null,
  presupuestoVistaPreviaId = null,
  presupuestos = {},
}) {
  const [modo, setModo]         = useState("svg");
  const [bloques, setBloques]   = useState([]);
  const [idsBajos, setIdsBajos] = useState([]);
  const [idsAltos, setIdsAltos] = useState([]);
  const [alto, setAlto]         = useState(2400);
  const prevKeyRef              = useRef(null);

  useEffect(() => {
    const key = presupuestoVistaPreviaId || presupuestoActivoId || null;
    if (prevKeyRef.current === key) return;
    prevKeyRef.current = key;

    if (!key) {
      setBloques([]); setIdsBajos([]); setIdsAltos([]);
      return;
    }

    if (presupuestoVistaPreviaId) {
      const p = presupuestos[presupuestoVistaPreviaId];
      if (!p) { setBloques([]); setIdsBajos([]); setIdsAltos([]); return; }
      const bs = bloquesDesdePresupuesto(p, modulos);
      const { idsBajos: fb, idsAltos: fa } = derivarSecuencias(bs);
      setBloques(bs); setIdsBajos(fb); setIdsAltos(fa);
      return;
    }

    const saved = leerPlano();
    const bs = saved?.bloques || [];
    const { idsBajos: fb, idsAltos: fa } = derivarSecuencias(bs);
    setBloques(bs);
    setIdsBajos(saved?.idsBajos ?? fb);
    setIdsAltos(saved?.idsAltos ?? fa);
    setAlto(saved?.altoCielorraso || 2400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presupuestoVistaPreviaId, presupuestoActivoId]);

  const sinDatos = bloques.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Cabecera */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <SectionTitle sub="Visualizá el diseño técnico y generá renders realistas con IA">
          Render IA
        </SectionTitle>

        {/* Toggle modos */}
        {!sinDatos && (
          <div style={{ display: "flex", gap: 6 }}>
            <BtnModo activo={modo === "svg"}    onClick={() => setModo("svg")}>📐 Plano</BtnModo>
            <BtnModo activo={modo === "render"} onClick={() => setModo("render")}>✨ Render</BtnModo>
            <BtnModo activo={modo === "split"}  onClick={() => setModo("split")}>⊞ Dividido</BtnModo>
          </div>
        )}
      </div>

      {/* Empty state */}
      {sinDatos && (
        <div style={{
          textAlign: "center", padding: "80px 0",
          borderRadius: 12, border: "1px dashed var(--border)",
          color: "var(--text-muted)", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 12,
        }}>
          <div style={{ fontSize: 40 }}>📐</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>
            No hay plano activo
          </p>
          <p style={{ fontSize: 12, margin: 0 }}>
            Abrí un presupuesto y armá el layout en{" "}
            <strong style={{ color: "var(--accent)" }}>Plano 2D</strong>{" "}
            para visualizarlo acá
          </p>
        </div>
      )}

      {/* Modo SVG */}
      {!sinDatos && modo === "svg" && (
        <PanelSVG
          bloques={bloques} idsBajos={idsBajos} idsAltos={idsAltos}
          altoCielorraso={alto} composicionOverride={composicionOverride} modulos={modulos}
        />
      )}

      {/* Modo Render */}
      {!sinDatos && modo === "render" && (
        <PlaceholderRender />
      )}

      {/* Modo Split */}
      {!sinDatos && modo === "split" && (
        <div style={{ display: "flex", gap: 12, alignItems: "stretch", minHeight: 380 }}>
          <PanelSVG
            bloques={bloques} idsBajos={idsBajos} idsAltos={idsAltos}
            altoCielorraso={alto} composicionOverride={composicionOverride} modulos={modulos}
            compact
          />
          <PlaceholderRender compact />
        </div>
      )}

    </div>
  );
}
