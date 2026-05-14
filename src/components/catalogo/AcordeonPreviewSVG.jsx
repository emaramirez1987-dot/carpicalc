// ════════════════════════════════════════════════════════════════════════════
// AcordeonPreviewSVG.jsx — vista técnica de frente (SVG) del módulo en edición
// ════════════════════════════════════════════════════════════════════════════
//
// Acordeón colapsable que muestra el render SVG 2D del módulo mientras se
// edita. Read-only: solo refleja datos.dimensiones/variables/herrajes.
// La composición visual se edita aparte vía el botón ▣ de la tarjeta.
//
// Extraído de FormModulo.jsx para mantener ese archivo más liviano.
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import VistaModuloSVG from '../vista-svg/index.js';
import { useTema } from '../../hooks/useTema.js';

export default function AcordeonPreviewSVG({ datos, herrajes }) {
  const [abierto, setAbierto] = useState(false);
  const { tema } = useTema();
  const moduloPreview = useMemo(() => ({
    dimensiones: datos.dimensiones,
    herrajes,
    variables: datos.variables || {},
    vistaConfig: null,
  }), [datos.dimensiones, datos.variables, herrajes]);

  return (
    <div style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
      <button
        onClick={() => setAbierto(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 14px", background: "var(--bg-subtle)", border: "none",
          cursor: "pointer", color: "var(--text-muted)", fontSize: 12,
          fontFamily: "'DM Mono',monospace", fontWeight: 700,
        }}
      >
        <span>▣ Vista técnica de frente</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>{abierto ? "▲" : "▼"}</span>
      </button>
      {abierto && (
        <div style={{
          padding: "14px 16px", background: "var(--bg-surface)",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 20, flexWrap: "wrap",
        }}>
          <VistaModuloSVG
            modulo={moduloPreview}
            theme={tema}
            width={180}
            height={180}
          />
          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
            <div>Solo lectura · se actualiza automáticamente</div>
            <div style={{ marginTop: 4, opacity: 0.7 }}>
              Para editar la composición visual, usá<br />el botón <strong>▣</strong> en la tarjeta del módulo.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
