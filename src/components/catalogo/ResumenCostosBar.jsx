// ════════════════════════════════════════════════════════════════════════════
// ResumenCostosBar.jsx — footer sticky con desglose de costos del módulo
// ════════════════════════════════════════════════════════════════════════════
//
// Muestra material / tapacanto / herrajes / mano obra / TOTAL en una sola
// fila al pie del FormModulo. Siempre visible mientras se edita el módulo —
// feedback continuo del costo a medida que cambian piezas/dims/herrajes.
//
// Recibe el resultado de calcularModulo(modulo, costos). Si es null
// (módulo sin piezas o costos faltantes), muestra mensaje placeholder.
// ════════════════════════════════════════════════════════════════════════════

import React from "react";
import { fmtPeso } from "../../utils.js";

const M = "'DM Mono', monospace";

function Stat({ label, valor, color = "var(--text-secondary)", strong = false }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "flex-start", gap: 1, minWidth: 80,
    }}>
      <span style={{
        fontSize: 9, fontFamily: M, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.08em",
      }}>{label}</span>
      <span style={{
        fontFamily: M, fontSize: strong ? 16 : 13,
        fontWeight: strong ? 900 : 700, color,
      }}>{valor}</span>
    </div>
  );
}

export default function ResumenCostosBar({ calc, sinPiezas, onCancelar, onGuardar, labelGuardar }) {
  if (!calc) {
    return (
      <div style={{
        padding: "10px 18px",
        background: "linear-gradient(180deg, rgba(212,175,55,0.04), rgba(212,175,55,0.10))",
        borderTop: "1px solid var(--accent-border)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <span style={{ fontSize: 11, fontFamily: M, color: "var(--text-muted)", fontStyle: "italic" }}>
          {sinPiezas
            ? "Agregá al menos una pieza para ver el costo del módulo"
            : "Esperando datos para calcular costos…"}
        </span>
        <Botones onCancelar={onCancelar} onGuardar={onGuardar} labelGuardar={labelGuardar} />
      </div>
    );
  }

  return (
    <div style={{
      padding: "10px 18px",
      background: "linear-gradient(180deg, rgba(212,175,55,0.04), rgba(212,175,55,0.10))",
      borderTop: "1px solid var(--accent-border)",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
      flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
        <Stat label="Material"     valor={fmtPeso(calc.costoMaterial || 0)} />
        <Stat label="Tapacanto"    valor={fmtPeso(calc.costoTapacanto || 0)} />
        <Stat label="Herrajes"     valor={fmtPeso(calc.costoHerrajes || 0)} />
        <Stat label="Mano de obra" valor={fmtPeso(calc.costoMO || 0)} />
        <div style={{
          width: 1, height: 32, background: "var(--accent-border)",
          margin: "0 6px", flexShrink: 0,
        }} />
        <Stat label="Costo base" valor={fmtPeso(calc.costoBase || 0)} />
        <Stat
          label="Total con G.G."
          valor={fmtPeso(calc.total || 0)}
          color="var(--accent)"
          strong
        />
      </div>
      <Botones onCancelar={onCancelar} onGuardar={onGuardar} labelGuardar={labelGuardar} />
    </div>
  );
}

function Botones({ onCancelar, onGuardar, labelGuardar }) {
  return (
    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
      {onCancelar && (
        <button onClick={onCancelar}
          style={{ padding: "5px 14px", borderRadius: 5, cursor: "pointer", fontFamily: M, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          Cancelar
        </button>
      )}
      {onGuardar && (
        <button onClick={onGuardar}
          style={{ padding: "5px 16px", borderRadius: 5, cursor: "pointer", fontFamily: M, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", background: "rgba(180,145,40,0.15)", border: "1px solid rgba(180,145,40,0.45)", color: "#c8a02a" }}>
          {labelGuardar || "✓ Guardar"}
        </button>
      )}
    </div>
  );
}
