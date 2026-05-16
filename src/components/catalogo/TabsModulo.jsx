// ════════════════════════════════════════════════════════════════════════════
// TabsModulo.jsx — barra de pestañas tipo ficha (estilo carpeta)
// ════════════════════════════════════════════════════════════════════════════
//
// Soporta dos "familias" de tabs en una misma barra:
//   • tipo: "padre" — pestañas del módulo padre (dorado/normal).
//   • tipo: "hijo"  — pestañas de subcomponentes (azul-violeta), aparecen
//                     a la derecha tras un separador vertical.
//   • tipo: "add"   — tab-botón especial para crear un nuevo hijo.
//
// API por tab: { id, label, icon, badge?, tipo?, onAction? }
// `badge`: "ok" (verde) | "warn" (amarillo) | "dirty" (dorado).
// `onAction`: handler para el tipo "add" (no cambia de tab).
// ════════════════════════════════════════════════════════════════════════════

import React from "react";

const M = "'DM Mono', monospace";

// Paletas por tipo
const PALETA = {
  padre: {
    activeBorder:   "rgba(212,175,55,0.55)",
    inactiveBorder: "var(--border)",
    activeColor:    "var(--accent)",
    activeBg:       "var(--bg-surface)",
    glow:           "0 -6px 16px rgba(212,175,55,0.10), inset 0 1px 0 rgba(212,175,55,0.18)",
  },
  hijo: {
    activeBorder:   "rgba(120,160,220,0.50)",
    inactiveBorder: "var(--border)",
    activeColor:    "#9ab8e0",
    activeBg:       "var(--bg-surface)",
    glow:           "0 -6px 16px rgba(120,160,220,0.10), inset 0 1px 0 rgba(120,160,220,0.18)",
  },
  add: {
    activeBorder:   "rgba(126,207,138,0.40)",
    inactiveBorder: "rgba(126,207,138,0.25)",
    activeColor:    "#7ecf8a",
    activeBg:       "transparent",
    glow:           "none",
  },
};

function Badge({ tipo }) {
  if (!tipo) return null;
  const color =
    tipo === "ok"    ? "rgba(126,207,138,0.80)" :
    tipo === "warn"  ? "rgba(200,160,42,0.70)"  :
    tipo === "dirty" ? "rgba(212,175,55,0.80)"  : "var(--text-muted)";
  // Punto minimalista en lugar de símbolo
  return (
    <span style={{
      display: "inline-block",
      width: 4, height: 4,
      borderRadius: "50%",
      background: color,
      marginLeft: 3,
      flexShrink: 0,
    }} />
  );
}

export default function TabsModulo({ tabs, activeId, onChange }) {
  // Insertamos un separador vertical entre el último tab de padre y el primer
  // tab de hijo — refuerza visualmente que se cambia de "ámbito".
  const indexPrimerHijo = tabs.findIndex(t => t.tipo === "hijo");

  return (
    <div style={{
      display: "flex", alignItems: "flex-end",
      paddingLeft: 0, gap: 0,
      background: "var(--bg-surface)",
      overflowX: "auto",
    }}>
      {tabs.map((tab, idx) => {
        const tipo  = tab.tipo || "padre";
        const pal   = PALETA[tipo];
        const isAdd = tipo === "add";
        const active = !isAdd && tab.id === activeId;

        // Separador vertical antes del primer hijo
        const renderSep = idx === indexPrimerHijo && idx > 0;

        return (
          <React.Fragment key={tab.id}>
            {renderSep && (
              <div style={{
                width: 1, height: 20, background: "var(--border)",
                margin: "0 6px 0", alignSelf: "flex-end",
              }} />
            )}
            <button
              onClick={() => isAdd ? tab.onAction?.() : onChange(tab.id)}
              title={tab.label}
              style={{
                padding: active ? "9px 16px 10px" : "7px 14px 8px",
                borderTopLeftRadius: 5, borderTopRightRadius: 5,
                borderTop: `1px solid ${active ? pal.activeBorder : "var(--border)"}`,
                borderLeft: `1px solid ${active ? pal.activeBorder : "var(--border)"}`,
                borderRight: `1px solid ${active ? pal.activeBorder : "var(--border)"}`,
                borderBottom: active ? "none" : "1px solid var(--accent-border)",
                marginBottom: 0,
                background: active ? "var(--bg-surface)" : "transparent",
                color: active ? pal.activeColor : (isAdd ? pal.activeColor : "var(--text-muted)"),
                fontFamily: M, fontSize: 11, fontWeight: active ? 700 : 400,
                letterSpacing: "0.06em",
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s, box-shadow 0.15s",
                display: "inline-flex", alignItems: "center", gap: 4,
                whiteSpace: "nowrap",
                boxShadow: active ? pal.glow : "none",
                position: "relative", zIndex: active ? 2 : 1,
                opacity: (!active && !isAdd) ? 0.80 : 1,
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.color = pal.activeColor;
                  e.currentTarget.style.opacity = "1";
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.color = isAdd ? pal.activeColor : "var(--text-muted)";
                  e.currentTarget.style.opacity = isAdd ? "1" : "0.65";
                }
              }}
            >
              {tab.icon && <span style={{ fontSize: 11, lineHeight: 1 }}>{tab.icon}</span>}
              <span>{tab.label}</span>
              <Badge tipo={tab.badge} />
            </button>
          </React.Fragment>
        );
      })}
      {/* Rellena el espacio a la derecha de las tabs con la línea divisoria */}
      <div style={{ flex: 1, minWidth: 0, alignSelf: "flex-end", borderBottom: "1px solid var(--accent-border)" }} />
    </div>
  );
}
