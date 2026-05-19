import React, { useState } from 'react';
import { fmtNum, resolverDim, evaluarFormula, resolverVariables } from '../../utils.js';

// ════════════════════════════════════════════════════════════════════════════
// FilaPieza — fila de una pieza dentro del listado de piezas en FormModulo
// ════════════════════════════════════════════════════════════════════════════

function FilaPieza({ pieza, idx, onDelete, onEdit, onDuplicate, onMoveUp, onMoveDown, dims, espesor, tapacanto, isFirst, isLast, modVars }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const baseVars = { ancho: dims.ancho || 0, alto: dims.alto || 0, profundidad: dims.profundidad || 0, esp: espesor };
  const allVars = resolverVariables(modVars, baseVars);
  const d1 = pieza.formula1 != null
    ? (evaluarFormula(pieza.formula1, allVars) ?? 0)
    : resolverDim(dims[pieza.usaDim], pieza.offsetEsp, pieza.offsetMm, pieza.divisor || 1, espesor);
  const d2 = pieza.formula2 != null
    ? (evaluarFormula(pieza.formula2, allVars) ?? 0)
    : resolverDim(dims[pieza.usaDim2], pieza.offsetEsp2, pieza.offsetMm2, pieza.divisor2 || 1, espesor);
  const area = (d1 * d2 * pieza.cantidad) / 1_000_000;
  const tcDef = tapacanto?.find((t) => t.id === pieza.tc?.id);
  const mTc = pieza.tc?.id
    ? (pieza.cantidad * ((pieza.tc.lados1 || 0) * d1 + (pieza.tc.lados2 || 0) * d2)) / 1000
    : 0;
  const offsetLabel = (esp, mm, div) => {
    const p = [];
    if (esp) p.push(`${esp > 0 ? "+" : ""}${esp} esp.`);
    if (mm) p.push(`${mm > 0 ? "+" : ""}${mm} mm`);
    if (div && div > 1) p.push(`÷${div}`);
    return p.length ? `(${p.join(", ")})` : "";
  };

  const btnSt = { background: "transparent", border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer", color: "var(--text-secondary)", fontSize: 11, padding: "3px 8px", fontFamily: "'DM Mono',monospace", fontWeight: 700, transition: "all 0.15s", whiteSpace: "nowrap" };
  const metSt = { display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 };
  const metLabel = { fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginBottom: 1 };
  const metVal = { fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" };

  return (
    <div style={{ padding: "8px 10px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

      {/* Nombre */}
      <div style={{ flex: "1 1 130px", minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {pieza.nombre}
        </div>
        <div style={{ fontSize: 10, marginTop: 1, fontFamily: "'DM Mono',monospace", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {pieza.formula1 != null
            ? `${pieza.formula1} × ${pieza.formula2}`
            : `${pieza.usaDim}${offsetLabel(pieza.offsetEsp, pieza.offsetMm, pieza.divisor || 1)} × ${pieza.usaDim2}${offsetLabel(pieza.offsetEsp2, pieza.offsetMm2, pieza.divisor2 || 1)}`}
        </div>
      </div>

      {/* Separador */}
      <div style={{ width: 1, height: 28, background: "var(--border)", flexShrink: 0 }} />

      {/* Medidas */}
      <div style={metSt}>
        <div style={metLabel}>Medidas</div>
        <div style={metVal}>{Math.round(d1)}×{Math.round(d2)}<span style={{ fontSize: 10, color: "var(--text-secondary)", marginLeft: 2 }}>mm</span></div>
      </div>

      {/* Área */}
      <div style={metSt}>
        <div style={metLabel}>Área</div>
        <div style={metVal}>{fmtNum(area)}<span style={{ fontSize: 10, color: "var(--text-secondary)", marginLeft: 2 }}>m²</span></div>
      </div>

      {/* Tapacanto */}
      {tcDef && (
        <div style={metSt}>
          <div style={metLabel}>Tapac.</div>
          <div style={{ ...metVal, color: "var(--accent)" }}>{fmtNum(mTc, 2)}<span style={{ fontSize: 10, color: "var(--text-secondary)", marginLeft: 2 }}>m</span></div>
        </div>
      )}

      {/* Separador */}
      <div style={{ width: 1, height: 28, background: "var(--border)", flexShrink: 0 }} />

      {/* Acciones */}
      <div style={{ display: "flex", gap: 3, alignItems: "center", flexShrink: 0 }}>
        <button onClick={() => onEdit(idx)} style={{ ...btnSt, color: "var(--accent)", borderColor: "var(--accent-border)", background: "var(--accent-soft)" }}>✎ editar</button>
        <button onClick={() => onDuplicate(idx)} style={btnSt}>⧉ dup.</button>
        <button onClick={() => onMoveUp(idx)} disabled={isFirst} style={{ ...btnSt, opacity: isFirst ? 0.3 : 1, padding: "3px 6px" }}>↑</button>
        <button onClick={() => onMoveDown(idx)} disabled={isLast} style={{ ...btnSt, opacity: isLast ? 0.3 : 1, padding: "3px 6px" }}>↓</button>
        {confirmDelete ? (
          <>
            <button onClick={() => { onDelete(idx); setConfirmDelete(false); }}
              style={{ padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700, background: "rgba(200,60,60,0.12)", border: "1px solid rgba(200,60,60,0.35)", color: "#e07070", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>✓ ok</button>
            <button onClick={() => setConfirmDelete(false)} style={btnSt}>✕</button>
          </>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            style={{ ...btnSt, color: "#e07070", borderColor: "rgba(200,60,60,0.25)" }}>× elim.</button>
        )}
      </div>
    </div>
  );
}

// React.memo evita re-render cuando los props no cambian — al editar
// una pieza, solo esa fila se re-renderiza, no las otras 4-10 filas.
export default React.memo(FilaPieza);