// ════════════════════════════════════════════════════════════════════════════
// ModalAtajos.jsx — overlay con la lista de atajos de teclado disponibles
// ════════════════════════════════════════════════════════════════════════════
//
// Se abre con "?" desde cualquier vista. Click fuera o Esc para cerrar.
// ════════════════════════════════════════════════════════════════════════════

import React from "react";

const M = "'DM Mono', monospace";

const Tecla = ({ children }) => (
  <kbd style={{
    fontFamily: M, fontSize: 11,
    padding: "2px 8px", borderRadius: 4,
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    color: "#d4af37", fontWeight: 700,
    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
    minWidth: 24, display: "inline-block", textAlign: "center",
  }}>{children}</kbd>
);

const ATAJOS = [
  { grupo: "Navegación", items: [
    { teclas: ["Ctrl", "1"], desc: "Ir a Presupuesto" },
    { teclas: ["Ctrl", "2"], desc: "Ir a Vista previa" },
    { teclas: ["Ctrl", "3"], desc: "Ir a Corte" },
    { teclas: ["Ctrl", "4"], desc: "Ir a Vista 3D" },
    { teclas: ["Ctrl", "5"], desc: "Ir a Render IA" },
    { teclas: ["Ctrl", "6"], desc: "Ir a Trabajos" },
    { teclas: ["Ctrl", "7"], desc: "Ir a Caja" },
    { teclas: ["Ctrl", "8"], desc: "Ir a Catálogo" },
    { teclas: ["Ctrl", "9"], desc: "Ir a Costos" },
  ]},
  { grupo: "General", items: [
    { teclas: ["?"],   desc: "Mostrar/ocultar esta ayuda" },
    { teclas: ["Esc"], desc: "Cerrar paneles, modales o atajos" },
  ]},
];

export default function ModalAtajos({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(8,10,13,0.85)",
      zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, backdropFilter: "blur(4px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480,
        background: "var(--bg-base)", borderRadius: 12,
        border: "1px solid rgba(212,175,55,0.40)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "12px 18px", borderBottom: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "rgba(255,255,255,0.03)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            ⌨ Atajos de teclado
          </div>
          <button onClick={onClose} style={{
            padding: "4px 10px", borderRadius: 6, cursor: "pointer",
            background: "transparent", border: "1px solid rgba(200,60,60,0.30)",
            color: "#e07070", fontFamily: M, fontSize: 11,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "14px 18px", maxHeight: "70vh", overflowY: "auto" }}>
          {ATAJOS.map(g => (
            <div key={g.grupo} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10, fontFamily: M, color: "#c8a02a",
                textTransform: "uppercase", letterSpacing: "0.10em",
                marginBottom: 8, fontWeight: 700,
              }}>{g.grupo}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {g.items.map((it, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "5px 0",
                  }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{it.desc}</span>
                    <span style={{ display: "flex", gap: 4 }}>
                      {it.teclas.map((t, j) => (
                        <React.Fragment key={j}>
                          {j > 0 && <span style={{ color: "var(--text-muted)", fontSize: 10, alignSelf: "center" }}>+</span>}
                          <Tecla>{t}</Tecla>
                        </React.Fragment>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: "8px 18px", borderTop: "1px solid var(--border)",
          fontSize: 10, color: "var(--text-muted)", fontFamily: M,
          background: "rgba(255,255,255,0.02)",
        }}>
          Tip: en cualquier momento apretá <Tecla>?</Tecla> para abrir esta ayuda
        </div>
      </div>
    </div>
  );
}
