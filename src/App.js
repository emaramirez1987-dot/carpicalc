import React, { useState, useCallback, useEffect } from "react";

// ── Módulos internos ──────────────────────────────────────────────────────
// constants.js  → datos iniciales, constantes de dominio (TIPO_MAT, ESTADOS_TRABAJO, etc.)
// utils.js      → funciones puras de cálculo y formateo (sin React, testeables)
// storage.js    → capa de abstracción sobre localStorage
// hooks/        → hooks de React reutilizables
import {
  PASS_HASH, PASS_KEY, PERFIL_VACIO,
  TIPO_MAT, CATEGORIAS_DEFAULT, ESTADOS_TRABAJO,
} from "./constants.js";
import {
  fmtPeso, fmtNum, fmtFecha, fmtFechaLarga,
  resolverDim, calcularModulo,
  leerPerfil, presupuestoNecesitaActualizacion,
  calcularTotalVisual, recalcularTotalPresupuesto,
  generarTextoWhatsApp, comprimirImagen,
} from "./utils.js";
import {
  cargarDatos,
  guardarModulos, guardarPresupuestos, guardarPerfil, guardarCostos,
  leerVersionCostos, cargarHistorialPrecios, guardarSnapshotPrecios,
} from "./storage.js";
import { useUndo } from "./hooks/useUndo.js";
import { useTema } from "./hooks/useTema.js";

// ╔══════════════════════════════════════════════════════════════════╗
// ║                        CarpiCálc — App.js                       ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  SECCIONES (buscar por el nombre para navegar):                 ║
// ║  1. DATOS INICIALES      — costoIniciales, modulosIniciales     ║
// ║  2. PERSISTENCIA         — cargarDatos, guardarXxx, historial   ║
// ║  3. CÁLCULO              — resolverDim, calcularModulo          ║
// ║  4. CONSTANTES GLOBALES  — PERFIL_VACIO, TIPO_MAT, CATEGORIAS  ║
// ║  5. UTILIDADES           — fmtPeso, fmtFecha, helpers           ║
// ║  6. HOOKS                — useUndo, useTema                     ║
// ║  7. EXPORTACIÓN          — WhatsApp, PDF, Ficha de Obra         ║
// ║  8. UI PRIMITIVOS        — Field, TextInput, Card, Btn...       ║
// ║  9. COSTOS               — HojaCostos y sus sub-componentes     ║
// ║ 10. CATÁLOGO             — FormModulo, TarjetaModulo...         ║
// ║ 11. PRESUPUESTO          — GestorPresupuestos, BarraTotal...    ║
// ║ 12. VISTA PREVIA         — VistaPrevia                          ║
// ║ 13. LISTA DE CORTE       — ListaCorte y sus sub-componentes     ║
// ║ 14. TABLERO DE TRABAJOS  — Kanban, FilaLista, tabs internas     ║
// ║ 15. CAJA                 — FilaCaja, PanelCaja                  ║
// ║ 16. MI TALLER            — PanelPerfil                          ║
// ║ 17. APP PRINCIPAL        — Header, Login, AppInterna, App       ║
// ╚══════════════════════════════════════════════════════════════════╝

// ╔══════════════════════════════════════════════════════════════════╗
// ║  GlobalStyles — incluye @media (max-width: 768px)               ║
// ╚══════════════════════════════════════════════════════════════════╝

// ── LogoIsotipo ── Isotipo vectorial de CarpiCálc ─────────────────
// Diseño: arco C (carpintería) + regla de medición (cálculo)
// Funciona en cualquier tamaño: 24px header → 120px login
function LogoIsotipo({ size = 40, color = "var(--accent)" }) {
  const s = size;
  return (
    <svg
      width={s} height={s}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* Círculo exterior — perfección y límite */}
      <circle cx="50" cy="50" r="46" stroke={color} strokeWidth="1.2" opacity="0.35"/>

      {/* Arco C 270° — la carpintería, la forma */}
      <path
        d="M 71.21,28.79 A 30,30 0 1,0 71.21,71.21"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Regla de medición horizontal — el cálculo */}
      <line x1="20" y1="50" x2="80" y2="50" stroke={color} strokeWidth="1" opacity="0.6"/>

      {/* Marcas de medición en la regla */}
      <line x1="35" y1="44" x2="35" y2="56" stroke={color} strokeWidth="1" opacity="0.5"/>
      <line x1="50" y1="42" x2="50" y2="58" stroke={color} strokeWidth="1" opacity="0.7"/>
      <line x1="65" y1="44" x2="65" y2="56" stroke={color} strokeWidth="1" opacity="0.5"/>

      {/* Punto central — pivote, origen */}
      <circle cx="50" cy="50" r="2.5" fill={color}/>
    </svg>
  );
}

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700&family=DM+Mono:wght@300;400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

    /* ── Modo oscuro premium (default) ─────────────────────────── */
    :root,[data-theme="dark"]{
      --bg-base:#080A0D;
      --bg-surface:#141720;
      --bg-subtle:rgba(255,255,255,0.04);
      --bg-overlay:rgba(10,12,16,0.97);
      --border:rgba(255,255,255,0.07);
      --border-strong:rgba(212,175,55,0.18);
      --text-primary:#F0EDE6;
      --text-secondary:#A09880;
      --text-muted:rgba(255,255,255,0.28);
      --text-inverted:#0F1115;
      --accent:#D4AF37;
      --accent-hover:#E8C84A;
      --accent-soft:rgba(212,175,55,0.10);
      --accent-border:rgba(212,175,55,0.28);
      --shadow:0 4px 32px rgba(0,0,0,0.65);
      --shadow-sm:0 1px 8px rgba(0,0,0,0.45);
      --scrollbar-thumb:rgba(212,175,55,0.20);
      --radius-card:12px;
      --separator:rgba(255,255,255,0.05);
      --grain-opacity:0.032;
    }

    /* ── Modo claro ─────────────────────────────────────────────── */
    [data-theme="light"]{
      --bg-base:#ECEAE3;
      --bg-surface:#FAFAF8;
      --bg-subtle:#E4E0D6;
      --bg-overlay:rgba(245,242,236,0.97);
      --border:#E4DDD0;
      --border-strong:rgba(180,140,30,0.30);
      --text-primary:#1C1A16;
      --text-secondary:#6B5E45;
      --text-muted:#A0907A;
      --text-inverted:#FFFFFF;
      --accent:#B8962A;
      --accent-hover:#9A7C1E;
      --accent-soft:rgba(184,150,42,0.10);
      --accent-border:rgba(184,150,42,0.32);
      --shadow:0 2px 20px rgba(0,0,0,0.10);
      --shadow-sm:0 1px 6px rgba(0,0,0,0.07);
      --scrollbar-thumb:rgba(184,150,42,0.28);
      --radius-card:12px;
      --separator:rgba(0,0,0,0.05);
      --grain-opacity:0.018;
    }

    /* ── Grain texture — profundidad sin peso visual ─────────────── */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 9999;
      opacity: var(--grain-opacity);
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      background-repeat: repeat;
      background-size: 128px 128px;
    }

    body{
      background-color:var(--bg-base);
      color:var(--text-primary);
      font-family:'Bricolage Grotesque',system-ui,sans-serif;
      font-weight:400;
      font-optical-sizing:auto;
      transition:background-color 0.3s,color 0.3s;
      -webkit-font-smoothing:antialiased;
      -moz-osx-font-smoothing:grayscale;
    }

    /* ── Animaciones de entrada ──────────────────────────────────── */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.97); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes slideRight {
      from { opacity: 0; transform: translateX(-10px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes counterPulse {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.12); }
      100% { transform: scale(1); }
    }

    /* Animación de entrada al cambiar de pestaña */
    @keyframes tabEnter {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .tab-view {
      animation: tabEnter 0.32s cubic-bezier(0.22,1,0.36,1) both;
    }

    /* Stagger de tarjetas — cada nth-child recibe delay */
    .anim-fadein    { animation: fadeIn  0.35s ease both; }
    .anim-fadeup    { animation: fadeUp  0.40s cubic-bezier(0.22,1,0.36,1) both; }
    .anim-scalein   { animation: scaleIn 0.30s cubic-bezier(0.22,1,0.36,1) both; }
    .anim-slideright{ animation: slideRight 0.32s cubic-bezier(0.22,1,0.36,1) both; }

    /* Delay escalonado para listas */
    .stagger-1  { animation-delay: 0.04s; }
    .stagger-2  { animation-delay: 0.08s; }
    .stagger-3  { animation-delay: 0.12s; }
    .stagger-4  { animation-delay: 0.16s; }
    .stagger-5  { animation-delay: 0.20s; }
    .stagger-6  { animation-delay: 0.24s; }

    /* Hover microlift para cards interactivas */
    .hover-lift {
      transition: transform 0.18s cubic-bezier(0.22,1,0.36,1),
                  box-shadow 0.18s cubic-bezier(0.22,1,0.36,1),
                  border-color 0.18s ease;
    }
    .hover-lift:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(0,0,0,0.38);
    }

    /* Pulse en métricas de caja al actualizar */
    .metric-pulse { animation: counterPulse 0.4s cubic-bezier(0.22,1,0.36,1); }

    /* Scrollbar fina y elegante */
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:var(--scrollbar-thumb);border-radius:4px;}
    ::-webkit-scrollbar-thumb:hover{background:var(--accent-border);}
    input[type="number"]::-webkit-inner-spin-button{opacity:0.3;}

    /* Separadores sutiles entre secciones */
    .section-divider{
      border:none;
      border-top:1px solid var(--separator);
      margin:0;
    }

    /* Hover pronunciado en dark mode */
    .btn-secondary:hover{
      background:rgba(212,175,55,0.18) !important;
      border-color:rgba(212,175,55,0.40) !important;
    }

    /* ── Tipografía mejorada ─────────────────────────────────────── */
    h1,h2,h3 {
      font-family:'Playfair Display',serif;
      letter-spacing:-0.02em;
    }
    code, kbd, .mono {
      font-family:'DM Mono',monospace;
    }
    /* Peso variable para jerarquía */
    .text-display  { font-weight: 700; letter-spacing: -0.03em; }
    .text-label    { font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; font-size: 0.75em; }
    .text-data     { font-family: 'DM Mono', monospace; font-weight: 500; }
    .text-subtle   { font-weight: 300; color: var(--text-muted); }

    @media print{
      .no-print{display:none !important;}.print-only{display:block !important;}
      body{background:#fff !important;color:#1a1a1a !important;font-size:12px;}
      body::before{display:none !important;}
      main{padding:0 !important;max-width:100% !important;}
      .print-table-row{break-inside:avoid;}
      .print-total-block{background:#f5f5f0 !important;border-top:2px solid #a07030 !important;}
      .item-nota-print{font-style:italic;color:#666 !important;font-size:11px;margin-top:2px;}
    }
    .print-only{display:none;}

    /* ── Responsive mobile ─────────────────────────────────────── */
    @media (max-width: 768px) {
      .rsp-main { padding: 14px 10px !important; }
      .rsp-card { padding: 14px !important; }
      .rsp-grid-1 { grid-template-columns: 1fr !important; }
      .rsp-scroll-x {
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch;
      }
      .rsp-lista-item {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 10px !important;
      }
      .rsp-lista-precio {
        width: 100% !important;
        justify-content: space-between !important;
      }
      .rsp-header-inner {
        flex-wrap: wrap !important;
        gap: 0px 10px !important;
        padding: 0 12px !important;
      }
      .rsp-brand { padding: 12px 0 !important; }
      .rsp-brand-text { display: none !important; }
      .rsp-brand > div:first-child { transform: scale(0.9); }
      .rsp-nav {
        order: 3 !important;
        width: 100% !important;
        flex: none !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch;
        border-top: 1px solid var(--border);
        scrollbar-width: none;
      }
      .rsp-nav::-webkit-scrollbar { display: none !important; }
      .rsp-nav button {
        padding: 12px 16px !important;
        font-size: 11px !important;
        flex-shrink: 0;
      }
      .rsp-paso2 { flex-direction: column !important; }
      .rsp-paso2 > *:first-child { flex: none !important; width: 100% !important; }
      .rsp-stack { flex-direction: column !important; align-items: flex-start !important; }
      .rsp-table-inner { min-width: 520px; }
      .rsp-item-actions { flex-direction: row !important; flex-wrap: wrap !important; gap: 4px !important; }

      /* Kanban: scroll horizontal en desktop */
      .kanban-board {
        display: flex;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      /* Kanban mobile: apilado vertical, 100% ancho, sin scroll horizontal */
      .kanban-board-mobile-fix,
      .lista-mobile-row { display: none; }

    }

    @media (max-width: 768px) {
      .kanban-board {
        flex-direction: column !important;
        overflow: visible !important;
        gap: 16px !important;
        padding-bottom: 0 !important;
      }
      .kanban-col {
        flex: none !important;
        width: 100% !important;
        min-width: 0 !important;
      }
      .kanban-col-header {
        justify-content: center !important;
        text-align: center !important;
      }
      /* Lista: colapsar grid a 1 columna, ocultar columnas desktop */
      .lista-fila {
        grid-template-columns: 1fr !important;
        gap: 0 !important;
      }
      .lista-desktop-col { display: none !important; }
      .lista-mobile-row { display: flex !important; }
      .lista-header { display: none !important; }

      /* Filtros de estado: columna vertical en mobile */
      .filtros-estado {
        flex-direction: column !important;
        gap: 6px !important;
      }
      .filtros-estado > button {
        width: 100% !important;
        justify-content: flex-start !important;
      }

      /* Deshabilitar hover-lift en touch */
      .hover-lift:hover {
        transform: none !important;
        box-shadow: none !important;
      }
    }
  `}</style>
);

// ══════════════════════════════════════════════════════════════════
// 6. UI PRIMITIVOS
// ══════════════════════════════════════════════════════════════════
// ── UI Primitives ─────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "'DM Mono',monospace",
          color: "var(--text-muted)",
          display: "block",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
function TextInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  suffix,
  small,
  disabled,
}) {
  return (
    <Field label={label}>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            fontFamily: "'DM Mono',monospace",
            padding: small ? "6px 10px" : "10px 12px",
            fontSize: small ? 13 : 14,
            paddingRight: suffix ? 36 : undefined,
            background: "var(--bg-subtle)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            borderRadius: 6,
            outline: "none",
            transition: "border-color 0.2s",
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : undefined,
          }}
          onFocus={(e) => {
            if (!disabled) e.target.style.borderColor = "var(--accent)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border)";
            onBlur && onBlur(e.target.value);
          }}
        />
        {suffix && (
          <span
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 11,
              fontFamily: "'DM Mono',monospace",
              color: "var(--text-muted)",
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}
function Select({ label, value, onChange, options, small }) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          fontFamily: "'DM Mono',monospace",
          padding: small ? "6px 8px" : "10px 10px",
          fontSize: small ? 13 : 14,
          background: "var(--bg-base)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          borderRadius: 6,
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
function Btn({
  children,
  onClick,
  variant = "primary",
  small,
  full,
  disabled,
}) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Mono',monospace",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    borderRadius: 6,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s",
    opacity: disabled ? 0.5 : 1,
    width: full ? "100%" : undefined,
    padding: small ? "6px 14px" : "10px 20px",
    fontSize: small ? 12 : 13,
  };
  if (variant === "primary")
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          ...base,
          background:
            "linear-gradient(135deg,var(--accent),var(--accent-hover))",
          color: "var(--text-inverted)",
          boxShadow: "0 3px 12px rgba(180,100,20,0.28)",
        }}
      >
        {children}
      </button>
    );
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...base,
        background: "var(--accent-soft)",
        border: "1px solid var(--accent-border)",
        color: "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}
// ▶ Card acepta className para poder agregar rsp-card en móvil
function Card({ children, style, highlight, onClick, className }) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: highlight ? "var(--accent-soft)" : "var(--bg-surface)",
        border: `1px solid ${highlight ? "var(--accent-border)" : "var(--border)"}`,
        borderRadius: 14,
        padding: 20,
        boxShadow: highlight
          ? "0 4px 24px rgba(212,175,55,0.08), var(--shadow-sm)"
          : "0 2px 12px rgba(0,0,0,0.28), var(--shadow-sm)",
        cursor: onClick ? "pointer" : undefined,
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.18s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
function Badge({ children, color }) {
  const c = color || "var(--accent)";
  return (
    <span
      style={{
        background: c + "22",
        border: `1px solid ${c}55`,
        color: c,
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily: "'DM Mono',monospace",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {children}
    </span>
  );
}
function SectionTitle({ children, sub }) {
  return (
    <div className="anim-fadeup" style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: sub ? 8 : 0 }}>
        <div style={{ width: 3, height: 28, borderRadius: 999, background: "linear-gradient(180deg, var(--accent) 0%, var(--accent-border) 100%)", flexShrink: 0 }} />
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.8, lineHeight: 1 }}>
          {children}
        </h2>
      </div>
      {sub && (
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, marginLeft: 15, fontWeight: 300, letterSpacing: "0.01em", lineHeight: 1.5 }}>
          {sub}
        </p>
      )}
    </div>
  );
}
function SaveIndicator({ estado }) {
  const cfg = {
    guardando: {
      color: "var(--text-secondary)",
      icon: "⟳",
      label: "Guardando...",
    },
    guardado: { color: "#7ecf8a", icon: "✓", label: "Guardado" },
    error: { color: "#e07070", icon: "✗", label: "Error" },
  }[estado];
  if (!cfg) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontFamily: "'DM Mono',monospace",
        letterSpacing: "0.05em",
        color: cfg.color,
      }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}
function ToggleSwitch({ value, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 11,
        fontFamily: "'DM Mono',monospace",
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s",
        border: "1px solid",
        background: value ? "var(--accent-soft)" : "transparent",
        borderColor: value ? "var(--accent-border)" : "var(--border)",
        color: value ? "var(--accent)" : "var(--text-muted)",
      }}
    >
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: 28,
          height: 14,
          background: value ? "var(--accent)" : "var(--border)",
          borderRadius: 7,
          flexShrink: 0,
          transition: "background 0.2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
            left: value ? 16 : 2,
          }}
        />
      </span>
      {label}
    </button>
  );
}

// ── HojaCostos primitives (nivel superior) ────────────────────────
const hcBb = {
  padding: "3px 10px",
  borderRadius: 5,
  fontSize: 11,
  fontWeight: 700,
  fontFamily: "'DM Mono',monospace",
  cursor: "pointer",
  transition: "all 0.15s",
  border: "1px solid",
};
const hcLc = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontFamily: "'DM Mono',monospace",
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 4,
};
const hcFV = {
  padding: "10px 12px",
  background: "var(--bg-subtle)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  marginBottom: 5,
  transition: "border-color 0.15s",
};
const hcFE = {
  padding: "12px",
  background: "var(--accent-soft)",
  border: "1px solid var(--accent-border)",
  borderRadius: 8,
  marginBottom: 5,
};
function HcBtnE({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...hcBb,
        background: "var(--accent-soft)",
        borderColor: "var(--accent-border)",
        color: "var(--accent)",
      }}
    >
      ✏ editar
    </button>
  );
}
function HcBtnD({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...hcBb,
        background: "transparent",
        borderColor: "rgba(200,60,60,0.22)",
        color: "#e07070",
      }}
    >
      × borrar
    </button>
  );
}
function HcBtnOk({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...hcBb,
        background: "rgba(100,180,80,0.12)",
        borderColor: "rgba(100,180,80,0.35)",
        color: "#7ecf8a",
      }}
    >
      ✓ guardar
    </button>
  );
}
function HcBtnCx({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...hcBb,
        background: "transparent",
        borderColor: "var(--border)",
        color: "var(--text-muted)",
      }}
    >
      cancelar
    </button>
  );
}
function HcNewBox({ children }) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.12)",
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
      }}
    >
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontWeight: 700,
          color: "var(--text-muted)",
          marginBottom: 10,
        }}
      >
        + Agregar nuevo
      </div>
      {children}
    </div>
  );
}
function HcSec({ icon, titulo, children }) {
  return (
    <Card className="rsp-card">
      <h3
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 700,
          color: "var(--accent)",
          marginBottom: 14,
        }}
      >
        {icon} {titulo}
      </h3>
      {children}
    </Card>
  );
}
function HcII({ value, onChange, type = "text" }) {
  return (
    <input
      value={value}
      type={type}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        fontFamily: "'DM Mono',monospace",
        fontSize: 13,
        padding: "5px 8px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
        borderRadius: 5,
        outline: "none",
      }}
      onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
    />
  );
}
function HcIS({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        fontFamily: "'DM Mono',monospace",
        fontSize: 12,
        padding: "5px 6px",
        background: "var(--bg-base)",
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
        borderRadius: 5,
        outline: "none",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── SeccionDesperdicio ────────────────────────────────────────────
function SeccionDesperdicio({ costos, save }) {
  const [desp, setDesp] = useState(String(costos.desperdicioPct));
  const [gan, setGan] = useState(String(costos.gastosGenerales));

  useEffect(() => { setDesp(String(costos.desperdicioPct)); }, [costos.desperdicioPct]);
  useEffect(() => { setGan(String(costos.gastosGenerales)); }, [costos.gastosGenerales]);

  // Detectar si hay cambios pendientes sin confirmar
  const despCambiado = parseFloat(desp) !== costos.desperdicioPct;
  const ganCambiado  = parseFloat(gan)  !== costos.gastosGenerales;

  const confirmarDesp = () => save({ ...costos, desperdicioPct: parseFloat(desp) || 0 });
  const confirmarGan  = () => save({ ...costos, gastosGenerales: parseFloat(gan) || 0 });

  const btnConfirmar = (cambiado, onClick) => (
    <button
      onClick={onClick}
      disabled={!cambiado}
      title={cambiado ? "Confirmar cambio" : "Sin cambios pendientes"}
      style={{
        marginTop: 8, width: "100%", padding: "7px 0", borderRadius: 7,
        cursor: cambiado ? "pointer" : "not-allowed",
        fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
        background: cambiado ? "var(--accent-soft)" : "transparent",
        border: `1px solid ${cambiado ? "var(--accent-border)" : "var(--border)"}`,
        color: cambiado ? "var(--accent)" : "var(--text-muted)",
        opacity: cambiado ? 1 : 0.45,
        transition: "all 0.18s",
      }}>
      {cambiado ? "✓ Confirmar cambio" : "Sin cambios"}
    </button>
  );

  return (
    <HcSec icon="📊" titulo="Desperdicio y Ganancia">
      <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <TextInput
            label="% Desperdicio de material"
            type="number" suffix="%" value={desp} onChange={setDesp}
          />
          <p style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6, color: "var(--text-muted)" }}>
            Cubre disco de corte, retazos y errores. Recomendado: 15–25%.
          </p>
          {btnConfirmar(despCambiado, confirmarDesp)}
        </div>
        <div>
          <TextInput
            label="% Ganancia del taller"
            type="number" suffix="%" value={gan} onChange={setGan}
          />
          <p style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6, color: "var(--text-muted)" }}>
            Se aplica sobre el costo total. El precio de venta siempre incluye tu margen limpio.
          </p>
          {btnConfirmar(ganCambiado, confirmarGan)}
        </div>
      </div>
      <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        {[
          ["Desperdicio", desp, "de material extra cubierto"],
          ["Ganancia", gan, "sobre costo total"],
        ].map(([label, val, note]) => (
          <div key={label} style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 12, padding: "14px 20px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, color: "var(--accent)" }}>
              {parseFloat(val) || 0}%
            </div>
            <div style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}>
              {label} · {note}
            </div>
          </div>
        ))}
      </div>
    </HcSec>
  );
}

// ── SeccionGastosFijos ────────────────────────────────────────────
// Permite cargar los gastos operativos fijos del taller y calcula
// automáticamente el costo por hora de taller (COSTO_HORA_TALLER).
function SeccionGastosFijos({ costos, save }) {
  const gf = costos.gastosFijos || { items: [], horasProductivasMes: 160 };

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoMonto, setNuevoMonto] = useState("");

  // LÓGICA - Cálculo de indicadores operativos
  const totalMensual = gf.items.reduce((a, i) => a + (parseFloat(i.monto) || 0), 0);
  const costoDiario  = totalMensual / 22;
  const costoHora    = gf.horasProductivasMes > 0
    ? totalMensual / gf.horasProductivasMes
    : 0;

  const saveGf = (nuevoGf) => save({ ...costos, gastosFijos: nuevoGf });

  const agregarItem = () => {
    if (!nuevoNombre.trim() || !nuevoMonto) return;
    const item = {
      id: Date.now(),
      nombre: nuevoNombre.trim(),
      monto: parseFloat(nuevoMonto) || 0,
    };
    saveGf({ ...gf, items: [...gf.items, item] });
    setNuevoNombre("");
    setNuevoMonto("");
  };

  const [confirmDelFijo, setConfirmDelFijo] = useState(null);

  const actualizarMonto = (id, monto) =>
    saveGf({ ...gf, items: gf.items.map((i) => i.id === id ? { ...i, monto: parseFloat(monto) || 0 } : i) });

  const actualizarHoras = (h) =>
    saveGf({ ...gf, horasProductivasMes: parseInt(h) || 160 });

  // Estilo de input compacto reutilizable
  const inpSm = {
    fontFamily: "'DM Mono',monospace", fontSize: 13, padding: "7px 10px",
    background: "var(--bg-base)", border: "1px solid var(--border)",
    color: "var(--text-primary)", borderRadius: 7, outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <HcSec icon="🏭" titulo="Gastos Fijos del Taller">

      {/* Tabla de gastos */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--accent-soft)" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, borderBottom: "1px solid var(--border)" }}>
                  Concepto
                </th>
                <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, borderBottom: "1px solid var(--border)", width: 160 }}>
                  Monto mensual
                </th>
                <th style={{ width: 40, borderBottom: "1px solid var(--border)" }} />
              </tr>
            </thead>
            <tbody>
              {gf.items.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: "16px 12px", color: "var(--text-muted)", fontSize: 12, fontStyle: "italic", textAlign: "center" }}>
                    Sin gastos cargados. Agregá tus costos operativos mensuales.
                  </td>
                </tr>
              )}
              {gf.items.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--separator)" }}>
                  <td style={{ padding: "9px 12px", color: "var(--text-primary)", fontWeight: 500 }}>
                    {item.nombre}
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>$</span>
                      <input
                        type="number" min="0"
                        defaultValue={item.monto}
                        onBlur={(e) => actualizarMonto(item.id, e.target.value)}
                        style={{ ...inpSm, width: 120, textAlign: "right" }}
                        onFocus={(e) => e.target.style.borderColor = "var(--accent-border)"}
                      />
                    </div>
                  </td>
                  <td style={{ padding: "9px 8px", textAlign: "center" }}>
                    {confirmDelFijo === item.id ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => { saveGf({ ...gf, items: gf.items.filter(i => i.id !== item.id) }); setConfirmDelFijo(null); }}
                          style={{ padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070" }}>✓</button>
                        <button onClick={() => setConfirmDelFijo(null)}
                          style={{ padding: "3px 7px", borderRadius: 5, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelFijo(item.id)} title="Eliminar gasto"
                        style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 5 }}>×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {gf.items.length > 0 && (
              <tfoot>
                <tr>
                  <td style={{ padding: "10px 12px", fontWeight: 700, fontSize: 12, color: "var(--text-secondary)", fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "2px solid var(--border)" }}>
                    Total mensual
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 900, color: "var(--accent)", borderTop: "2px solid var(--border)" }}>
                    {fmtPeso(totalMensual)}
                  </td>
                  <td style={{ borderTop: "2px solid var(--border)" }} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Fila para agregar nuevo gasto */}
        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text" placeholder="Nombre del gasto (ej: Alquiler)"
            value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregarItem()}
            style={{ ...inpSm, flex: 1, minWidth: 160 }}
            onFocus={(e) => e.target.style.borderColor = "var(--accent-border)"}
            onBlur={(e) => e.target.style.borderColor = "var(--border)"}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>$</span>
            <input
              type="number" min="0" placeholder="Monto"
              value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && agregarItem()}
              style={{ ...inpSm, width: 120, textAlign: "right" }}
              onFocus={(e) => e.target.style.borderColor = "var(--accent-border)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border)"}
            />
          </div>
          <button onClick={agregarItem}
            style={{ padding: "7px 16px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            + Agregar
          </button>
        </div>
      </div>

      {/* Campo: horas productivas al mes */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--bg-subtle)", borderRadius: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
          Horas productivas al mes
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="number" min="1"
            defaultValue={gf.horasProductivasMes}
            onBlur={(e) => actualizarHoras(e.target.value)}
            style={{ ...inpSm, width: 80, textAlign: "center", fontWeight: 700 }}
            onFocus={(e) => e.target.style.borderColor = "var(--accent-border)"}
          />
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>hs/mes</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)", width: "100%" }}>
          Promedio: 22 días × 8 hs = 176 hs. Ajustá según tu ritmo real.
        </span>
      </div>

      {/* LÓGICA - Indicadores operativos: 3 cards destacadas */}
      {totalMensual > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Total mensual", valor: fmtPeso(totalMensual), sub: "gastos fijos del taller", color: "var(--accent)", icon: "📅" },
            { label: "Costo diario", valor: fmtPeso(Math.round(costoDiario)), sub: "÷ 22 días laborales", color: "#7090c0", icon: "📆" },
            { label: "Costo por hora", valor: fmtPeso(Math.round(costoHora)), sub: `÷ ${gf.horasProductivasMes} hs productivas`, color: "#7ecf8a", icon: "⏱" },
          ].map(({ label, valor, sub, color, icon }) => (
            <div key={label} style={{
              background: "var(--bg-surface)", border: `1px solid ${color}30`,
              borderTop: `3px solid ${color}`, borderRadius: 10,
              padding: "14px 16px", textAlign: "center",
            }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 900, color, letterSpacing: -0.5, lineHeight: 1 }}>
                {valor}
              </div>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginTop: 8 }}>
                {label}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                {sub}
              </div>
            </div>
          ))}
        </div>
      )}
    </HcSec>
  );
}

// ── FilaVista (nivel superior) ─────────────────────────────────────
const FilaVista = ({ style, onEnter, onLeave, children }) => (
  <div style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════════
// 7. COSTOS
// ══════════════════════════════════════════════════════════════════
// ── HojaCostos ────────────────────────────────────────────────────
function HojaCostos({ costos, setCostos, onSave }) {
  const [nuevoMat, setNuevoMat] = useState({
    nombre: "",
    tipo: "melamina",
    espesor: 18,
    precioM2: "",
    placaLargo: 2750,
    placaAncho: 1830,
  });
  const [nuevaMO, setNuevaMO] = useState({
    nombre: "",
    tipo: "por_modulo",
    precio: "",
  });
  const [nuevoH, setNuevoH] = useState({ nombre: "", precio: "", unidad: "u" });
  const [nuevoTc, setNuevoTc] = useState({ nombre: "", precio: "" });
  const [editando, setEditando] = useState(null);
  const [pctInflacion, setPctInflacion] = useState("");
  const [historial, setHistorial] = useState([]);
  const [verHistorial, setVerHistorial] = useState(false);
  const [confirmInflacion, setConfirmInflacion] = useState(false);

  useEffect(() => {
    cargarHistorialPrecios().then(setHistorial);
  }, []);

  const save = (updated) => {
    setCostos(updated);
    onSave(updated);
  };

  const aplicarInflacion = async () => {
    const pct = parseFloat(pctInflacion);
    if (!pct || isNaN(pct)) return;
    const factor = 1 + pct / 100;
    // Bloquear si el factor haría precios negativos
    if (factor <= 0) {
      alert(`⚠ Con ${pct}% los precios quedarían negativos o en cero. Usá un valor mayor a -100%.`);
      return;
    }
    await guardarSnapshotPrecios(costos);
    const updated = {
      ...costos,
      materiales: costos.materiales.map(m => ({ ...m, precioM2: Math.round(m.precioM2 * factor) })),
      herrajes: costos.herrajes.map(h => ({ ...h, precio: Math.round(h.precio * factor) })),
      manoDeObra: costos.manoDeObra.map(m => ({ ...m, precio: Math.round(m.precio * factor) })),
      tapacanto: (costos.tapacanto || []).map(t => ({ ...t, precio: Math.round(t.precio * factor) })),
    };
    save(updated);
    setHistorial(await cargarHistorialPrecios());
    setPctInflacion("");
    setConfirmInflacion(false);
  };

  const restaurarDesdeHistorial = async (snap) => {
    if (!window.confirm(`¿Restaurar precios del ${new Date(snap.fecha).toLocaleDateString("es-AR")}?`)) return;
    const updated = {
      ...costos,
      materiales: costos.materiales.map(m => {
        const h = snap.materiales.find(x => x.nombre === m.nombre);
        return h ? { ...m, precioM2: h.precioM2 } : m;
      }),
    };
    save(updated);
    setHistorial(await cargarHistorialPrecios());
  };

  const ini = (sec, item) =>
    setEditando({ sec, id: item.id, data: { ...item } });
  const updE = (k, v) =>
    setEditando((e) => ({ ...e, data: { ...e.data, [k]: v } }));
  const ok = () => {
    const { sec, id, data } = editando;
    if (sec === "mat")
      save({
        ...costos,
        materiales: costos.materiales.map((m) =>
          m.id === id
            ? {
                ...data,
                espesor: parseFloat(data.espesor) || 0,
                precioM2: parseFloat(data.precioM2) || 0,
                placaLargo: parseFloat(data.placaLargo) || 2750,
                placaAncho: parseFloat(data.placaAncho) || 1830,
              }
            : m
        ),
      });
    if (sec === "mo")
      save({
        ...costos,
        manoDeObra: costos.manoDeObra.map((m) =>
          m.id === id ? { ...data, precio: parseFloat(data.precio) || 0 } : m
        ),
      });
    if (sec === "h")
      save({
        ...costos,
        herrajes: costos.herrajes.map((h) =>
          h.id === id ? { ...data, precio: parseFloat(data.precio) || 0 } : h
        ),
      });
    if (sec === "tc")
      save({
        ...costos,
        tapacanto: costos.tapacanto.map((t) =>
          t.id === id ? { ...data, precio: parseFloat(data.precio) || 0 } : t
        ),
      });
    setEditando(null);
  };
  const matOpts = [
    { value: "melamina", label: "Melamina" },
    { value: "mdf", label: "MDF" },
    { value: "madera_maciza", label: "Madera maciza" },
    { value: "terciado", label: "Terciado" },
  ];
  const unidOpts = [
    { value: "u", label: "Unidad" },
    { value: "m", label: "Metro" },
    { value: "par", label: "Par" },
  ];
  const moOpts = [
    { value: "por_modulo", label: "Por módulo" },
    { value: "por_hora", label: "Por hora" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Valores base para todos los cálculos">
        Hoja de Costos
      </SectionTitle>

      {/* ── Ajuste por Inflación ── */}
      <HcSec icon="📈" titulo="Ajuste de precios por inflación">
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={hcLc}>% de aumento a aplicar</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                value={pctInflacion}
                onChange={e => setPctInflacion(e.target.value)}
                placeholder="Ej: 15"
                style={{
                  flex: 1, fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700,
                  padding: "8px 12px", background: "var(--bg-subtle)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", borderRadius: 6, outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
              <span style={{ fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", fontSize: 14 }}>%</span>
            </div>
            {/* Alerta si el resultado sería negativo */}
            {pctInflacion && parseFloat(pctInflacion) <= -100 && (
              <div style={{ marginTop: 6, fontSize: 11, color: "#e07070", fontFamily: "'DM Mono',monospace' " }}>
                ⚠ Con este valor los precios quedarían negativos. Mínimo: -99%
              </div>
            )}
            {/* Calculadora de reversión */}
            {pctInflacion && parseFloat(pctInflacion) > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace'" }}>
                💡 Para revertir este aumento exactamente aplicá: <strong style={{ color: "var(--accent)" }}>
                  {(-(parseFloat(pctInflacion) / (1 + parseFloat(pctInflacion) / 100))).toFixed(2)}%
                </strong>
              </div>
            )}
          </div>
          <div>
            {!confirmInflacion ? (
              <button
                disabled={!pctInflacion || isNaN(parseFloat(pctInflacion)) || parseFloat(pctInflacion) <= -100}
                onClick={() => setConfirmInflacion(true)}
                style={{
                  padding: "9px 18px", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.4)",
                  color: "#c8a02a", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace",
                  fontWeight: 700, fontSize: 12,
                  opacity: (!pctInflacion || isNaN(parseFloat(pctInflacion)) || parseFloat(pctInflacion) <= -100) ? 0.4 : 1,
                }}
              >
                📈 Aplicar {parseFloat(pctInflacion) > 0 ? "+" : ""}{pctInflacion || 0}%
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={aplicarInflacion}
                  style={{ padding: "9px 16px", background: "rgba(100,180,80,0.15)", border: "1px solid rgba(100,180,80,0.4)", color: "#7ecf8a", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 12 }}>
                  ✓ Confirmar
                </button>
                <button onClick={() => setConfirmInflacion(false)}
                  style={{ padding: "9px 12px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
          Actualiza en un solo clic materiales, herrajes, tapacanto y mano de obra. Se guarda un snapshot antes de aplicar.
        </p>

        {historial.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setVerHistorial(v => !v)}
                style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, textDecoration: "underline" }}>
                {verHistorial ? "▲ Ocultar" : "▼ Ver"} historial de precios ({historial.length})
              </button>
              <button onClick={async () => {
                if (!window.confirm("¿Limpiar todo el historial de precios?")) return;
                localStorage.removeItem("carpicalc:historial");
                setHistorial([]);
                setVerHistorial(false);
              }}
                style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", textDecoration: "underline" }}>
                × Limpiar historial
              </button>
            </div>
            {verHistorial && (
              <div style={{ marginTop: 10, background: "rgba(0,0,0,0.15)", borderRadius: 8, padding: 12 }}>
                {historial.map((snap, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: i < historial.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                        📅 {new Date(snap.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <button onClick={() => restaurarDesdeHistorial(snap)}
                        style={{ padding: "3px 10px", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 5 }}>
                        ↩ Restaurar estos precios
                      </button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {snap.materiales.map(m => (
                        <span key={m.nombre} style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 4, padding: "2px 7px", color: "var(--text-secondary)" }}>
                          {m.nombre}: {fmtPeso(m.precioM2)}/m²
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </HcSec>

      <HcSec icon="🪵" titulo="Materiales">
        {costos.materiales.map((mat) => {
          const ed = editando?.sec === "mat" && editando?.id === mat.id;
          return (
            <FilaVista
              key={mat.id}
              style={ed ? hcFE : hcFV}
              onEnter={(e) => {
                if (!ed)
                  e.currentTarget.style.borderColor = "var(--accent-border)";
              }}
              onLeave={(e) => {
                if (!ed) e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {ed ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div
                    className="rsp-grid-1"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <label style={hcLc}>Nombre</label>
                      <HcII
                        value={editando.data.nombre}
                        onChange={(v) => updE("nombre", v)}
                      />
                    </div>
                    <div>
                      <label style={hcLc}>Tipo</label>
                      <HcIS
                        value={editando.data.tipo}
                        onChange={(v) => updE("tipo", v)}
                        options={matOpts}
                      />
                    </div>
                    <div>
                      <label style={hcLc}>Espesor mm</label>
                      <HcII
                        value={editando.data.espesor}
                        onChange={(v) => updE("espesor", v)}
                        type="number"
                      />
                    </div>
                    <div>
                      <label style={hcLc}>$/m²</label>
                      <HcII
                        value={editando.data.precioM2}
                        onChange={(v) => updE("precioM2", v)}
                        type="number"
                      />
                    </div>
                  </div>
                  <div
                    className="rsp-grid-1"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 2fr",
                      gap: 10,
                      paddingTop: 6,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <label style={hcLc}>Largo placa (mm)</label>
                      <HcII
                        value={editando.data.placaLargo ?? 2750}
                        onChange={(v) => updE("placaLargo", v)}
                        type="number"
                      />
                    </div>
                    <div>
                      <label style={hcLc}>Ancho placa (mm)</label>
                      <HcII
                        value={editando.data.placaAncho ?? 1830}
                        onChange={(v) => updE("placaAncho", v)}
                        type="number"
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        paddingBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          fontFamily: "'DM Mono',monospace",
                        }}
                      >
                        Área:{" "}
                        {fmtNum(
                          ((editando.data.placaLargo ?? 2750) *
                            (editando.data.placaAncho ?? 1830)) /
                            1_000_000
                        )}{" "}
                        m²
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                    }}
                  >
                    <HcBtnCx onClick={() => setEditando(null)} />
                    <HcBtnOk onClick={ok} />
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      flex: 2,
                      minWidth: 120,
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    {mat.nombre}
                  </span>
                  <Badge>{TIPO_MAT[mat.tipo]}</Badge>
                  <Badge color="#705090">{mat.espesor}mm</Badge>
                  <Badge color="#507060">
                    {mat.placaLargo ?? 2750}×{mat.placaAncho ?? 1830}
                  </Badge>
                  <span
                    style={{
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 13,
                      color: "#7ecf8a",
                    }}
                  >
                    {fmtPeso(mat.precioM2)}/m²
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <HcBtnE onClick={() => ini("mat", mat)} />
                    <HcBtnD
                      onClick={() =>
                        save({
                          ...costos,
                          materiales: costos.materiales.filter(
                            (m) => m.id !== mat.id
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </FilaVista>
          );
        })}
        <HcNewBox>
          <div
            className="rsp-grid-1"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <TextInput
              label="Nombre"
              placeholder="Melamina 15mm"
              value={nuevoMat.nombre}
              onChange={(v) => setNuevoMat((p) => ({ ...p, nombre: v }))}
              small
            />
            <Select
              label="Tipo"
              value={nuevoMat.tipo}
              onChange={(v) => setNuevoMat((p) => ({ ...p, tipo: v }))}
              small
              options={matOpts}
            />
            <TextInput
              label="Espesor mm"
              type="number"
              value={nuevoMat.espesor}
              onChange={(v) => setNuevoMat((p) => ({ ...p, espesor: v }))}
              small
              suffix="mm"
            />
            <TextInput
              label="$/m²"
              type="number"
              value={nuevoMat.precioM2}
              onChange={(v) => setNuevoMat((p) => ({ ...p, precioM2: v }))}
              small
            />
          </div>
          <div
            className="rsp-grid-1"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 8,
              alignItems: "end",
            }}
          >
            <TextInput
              label="Largo placa (mm)"
              type="number"
              value={nuevoMat.placaLargo}
              onChange={(v) => setNuevoMat((p) => ({ ...p, placaLargo: v }))}
              small
              suffix="mm"
            />
            <TextInput
              label="Ancho placa (mm)"
              type="number"
              value={nuevoMat.placaAncho}
              onChange={(v) => setNuevoMat((p) => ({ ...p, placaAncho: v }))}
              small
              suffix="mm"
            />
            <div>
              <Btn
                small
                onClick={() => {
                  if (!nuevoMat.nombre || !nuevoMat.precioM2) return;
                  save({
                    ...costos,
                    materiales: [
                      ...costos.materiales,
                      {
                        ...nuevoMat,
                        id: Date.now(),
                        espesor: parseFloat(nuevoMat.espesor) || 18,
                        precioM2: parseFloat(nuevoMat.precioM2),
                        placaLargo: parseFloat(nuevoMat.placaLargo) || 2750,
                        placaAncho: parseFloat(nuevoMat.placaAncho) || 1830,
                      },
                    ],
                  });
                  setNuevoMat({
                    nombre: "",
                    tipo: "melamina",
                    espesor: 18,
                    precioM2: "",
                    placaLargo: 2750,
                    placaAncho: 1830,
                  });
                }}
              >
                + Agregar
              </Btn>
            </div>
          </div>
        </HcNewBox>
      </HcSec>

      <HcSec icon="🎗" titulo="Tapacanto (por metro lineal)">
        {(costos.tapacanto || []).map((tc) => {
          const ed = editando?.sec === "tc" && editando?.id === tc.id;
          return (
            <FilaVista
              key={tc.id}
              style={ed ? hcFE : hcFV}
              onEnter={(e) => {
                if (!ed)
                  e.currentTarget.style.borderColor = "var(--accent-border)";
              }}
              onLeave={(e) => {
                if (!ed) e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {ed ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div
                    className="rsp-grid-1"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <label style={hcLc}>Nombre</label>
                      <HcII
                        value={editando.data.nombre}
                        onChange={(v) => updE("nombre", v)}
                      />
                    </div>
                    <div>
                      <label style={hcLc}>$/m lineal</label>
                      <HcII
                        value={editando.data.precio}
                        onChange={(v) => updE("precio", v)}
                        type="number"
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                    }}
                  >
                    <HcBtnCx onClick={() => setEditando(null)} />
                    <HcBtnOk onClick={ok} />
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      flex: 2,
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    {tc.nombre}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      textAlign: "right",
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 13,
                      color: "#7ecf8a",
                    }}
                  >
                    {fmtPeso(tc.precio)}/m
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <HcBtnE onClick={() => ini("tc", tc)} />
                    <HcBtnD
                      onClick={() =>
                        save({
                          ...costos,
                          tapacanto: costos.tapacanto.filter(
                            (t) => t.id !== tc.id
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </FilaVista>
          );
        })}
        <HcNewBox>
          <div
            className="rsp-grid-1"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr auto",
              gap: 8,
              alignItems: "end",
            }}
          >
            <TextInput
              label="Nombre"
              placeholder="Tapacanto PVC 1mm"
              value={nuevoTc.nombre}
              onChange={(v) => setNuevoTc((p) => ({ ...p, nombre: v }))}
              small
            />
            <TextInput
              label="$/m lineal"
              type="number"
              value={nuevoTc.precio}
              onChange={(v) => setNuevoTc((p) => ({ ...p, precio: v }))}
              small
            />
            <div>
              <Btn
                small
                onClick={() => {
                  if (!nuevoTc.nombre || !nuevoTc.precio) return;
                  save({
                    ...costos,
                    tapacanto: [
                      ...(costos.tapacanto || []),
                      {
                        ...nuevoTc,
                        id: Date.now(),
                        precio: parseFloat(nuevoTc.precio),
                      },
                    ],
                  });
                  setNuevoTc({ nombre: "", precio: "" });
                }}
              >
                + Agregar
              </Btn>
            </div>
          </div>
        </HcNewBox>
      </HcSec>

      <HcSec icon="🔨" titulo="Mano de Obra">
        {costos.manoDeObra.map((mo) => {
          const ed = editando?.sec === "mo" && editando?.id === mo.id;
          return (
            <FilaVista
              key={mo.id}
              style={ed ? hcFE : hcFV}
              onEnter={(e) => {
                if (!ed)
                  e.currentTarget.style.borderColor = "var(--accent-border)";
              }}
              onLeave={(e) => {
                if (!ed) e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {ed ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div
                    className="rsp-grid-1"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <label style={hcLc}>Descripción</label>
                      <HcII
                        value={editando.data.nombre}
                        onChange={(v) => updE("nombre", v)}
                      />
                    </div>
                    <div>
                      <label style={hcLc}>Tipo</label>
                      <HcIS
                        value={editando.data.tipo}
                        onChange={(v) => updE("tipo", v)}
                        options={moOpts}
                      />
                    </div>
                    <div>
                      <label style={hcLc}>Precio</label>
                      <HcII
                        value={editando.data.precio}
                        onChange={(v) => updE("precio", v)}
                        type="number"
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                    }}
                  >
                    <HcBtnCx onClick={() => setEditando(null)} />
                    <HcBtnOk onClick={ok} />
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      flex: 2,
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    {mo.nombre}
                  </span>
                  <Badge color="#7090c0">
                    {mo.tipo === "por_modulo" ? "por módulo" : "por hora"}
                  </Badge>
                  <span
                    style={{
                      flex: 1,
                      textAlign: "right",
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 13,
                      color: "#7ecf8a",
                    }}
                  >
                    {fmtPeso(mo.precio)}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <HcBtnE onClick={() => ini("mo", mo)} />
                    <HcBtnD
                      onClick={() =>
                        save({
                          ...costos,
                          manoDeObra: costos.manoDeObra.filter(
                            (m) => m.id !== mo.id
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </FilaVista>
          );
        })}
        <HcNewBox>
          <div
            className="rsp-grid-1"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr auto",
              gap: 8,
              alignItems: "end",
            }}
          >
            <TextInput
              label="Descripción"
              value={nuevaMO.nombre}
              onChange={(v) => setNuevaMO((p) => ({ ...p, nombre: v }))}
              small
            />
            <Select
              label="Tipo"
              value={nuevaMO.tipo}
              onChange={(v) => setNuevaMO((p) => ({ ...p, tipo: v }))}
              small
              options={moOpts}
            />
            <TextInput
              label="Precio"
              type="number"
              value={nuevaMO.precio}
              onChange={(v) => setNuevaMO((p) => ({ ...p, precio: v }))}
              small
            />
            <div>
              <Btn
                small
                onClick={() => {
                  if (!nuevaMO.nombre || !nuevaMO.precio) return;
                  save({
                    ...costos,
                    manoDeObra: [
                      ...costos.manoDeObra,
                      {
                        ...nuevaMO,
                        id: Date.now(),
                        precio: parseFloat(nuevaMO.precio),
                      },
                    ],
                  });
                  setNuevaMO({ nombre: "", tipo: "por_modulo", precio: "" });
                }}
              >
                + Agregar
              </Btn>
            </div>
          </div>
        </HcNewBox>
      </HcSec>

      <HcSec icon="🔩" titulo="Herrajes y Accesorios">
        {costos.herrajes.map((h) => {
          const ed = editando?.sec === "h" && editando?.id === h.id;
          return (
            <FilaVista
              key={h.id}
              style={ed ? hcFE : hcFV}
              onEnter={(e) => {
                if (!ed)
                  e.currentTarget.style.borderColor = "var(--accent-border)";
              }}
              onLeave={(e) => {
                if (!ed) e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {ed ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div
                    className="rsp-grid-1"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <label style={hcLc}>Nombre</label>
                      <HcII
                        value={editando.data.nombre}
                        onChange={(v) => updE("nombre", v)}
                      />
                    </div>
                    <div>
                      <label style={hcLc}>Unidad</label>
                      <HcIS
                        value={editando.data.unidad}
                        onChange={(v) => updE("unidad", v)}
                        options={unidOpts}
                      />
                    </div>
                    <div>
                      <label style={hcLc}>Precio</label>
                      <HcII
                        value={editando.data.precio}
                        onChange={(v) => updE("precio", v)}
                        type="number"
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                    }}
                  >
                    <HcBtnCx onClick={() => setEditando(null)} />
                    <HcBtnOk onClick={ok} />
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      flex: 2,
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    {h.nombre}
                  </span>
                  <Badge color="#907060">/{h.unidad}</Badge>
                  <span
                    style={{
                      flex: 1,
                      textAlign: "right",
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 13,
                      color: "#7ecf8a",
                    }}
                  >
                    {fmtPeso(h.precio)}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <HcBtnE onClick={() => ini("h", h)} />
                    <HcBtnD
                      onClick={() =>
                        save({
                          ...costos,
                          herrajes: costos.herrajes.filter(
                            (x) => x.id !== h.id
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </FilaVista>
          );
        })}
        <HcNewBox>
          <div
            className="rsp-grid-1"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr auto",
              gap: 8,
              alignItems: "end",
            }}
          >
            <TextInput
              label="Nombre"
              value={nuevoH.nombre}
              onChange={(v) => setNuevoH((p) => ({ ...p, nombre: v }))}
              small
            />
            <Select
              label="Unidad"
              value={nuevoH.unidad}
              onChange={(v) => setNuevoH((p) => ({ ...p, unidad: v }))}
              small
              options={unidOpts}
            />
            <TextInput
              label="Precio"
              type="number"
              value={nuevoH.precio}
              onChange={(v) => setNuevoH((p) => ({ ...p, precio: v }))}
              small
            />
            <div>
              <Btn
                small
                onClick={() => {
                  if (!nuevoH.nombre || !nuevoH.precio) return;
                  save({
                    ...costos,
                    herrajes: [
                      ...costos.herrajes,
                      {
                        ...nuevoH,
                        id: Date.now(),
                        precio: parseFloat(nuevoH.precio),
                      },
                    ],
                  });
                  setNuevoH({ nombre: "", precio: "", unidad: "u" });
                }}
              >
                + Agregar
              </Btn>
            </div>
          </div>
        </HcNewBox>
      </HcSec>

      <SeccionDesperdicio costos={costos} save={save} />
      <SeccionGastosFijos costos={costos} save={save} />

      {/* Extras frecuentes — base para autocompletado en Presupuesto */}
      <HcSec icon="📦" titulo="Extras y Servicios Frecuentes">
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.6 }}>
          Estos ítems aparecen como sugerencias al cargar adicionales en un presupuesto (flete, instalación, etc.).
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(costos.extrasFrecuentes || []).map(f => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg-subtle)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)" }}>{f.nombre}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{fmtPeso(f.precio)}</span>
              <button onClick={() => save({ ...costos, extrasFrecuentes: (costos.extrasFrecuentes || []).filter(x => x.id !== f.id) })}
                style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input id="ef-nombre" type="text" placeholder="Nombre del servicio" style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontFamily: "'DM Mono',monospace", fontSize: 12, outline: "none" }} />
          <input id="ef-precio" type="number" placeholder="Precio" style={{ width: 110, padding: "7px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontFamily: "'DM Mono',monospace", fontSize: 12, outline: "none", textAlign: "right" }} />
          <button onClick={() => {
            const nom = document.getElementById("ef-nombre")?.value.trim();
            const pre = parseFloat(document.getElementById("ef-precio")?.value) || 0;
            if (!nom) return;
            save({ ...costos, extrasFrecuentes: [...(costos.extrasFrecuentes || []), { id: Date.now(), nombre: nom, precio: pre }] });
            if (document.getElementById("ef-nombre")) document.getElementById("ef-nombre").value = "";
            if (document.getElementById("ef-precio")) document.getElementById("ef-precio").value = "";
          }} style={{ padding: "7px 14px", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
            + Agregar
          </button>
        </div>
      </HcSec>
    </div>
  );
}

// ── FilaPieza ─────────────────────────────────────────────────────
function FilaPieza({ pieza, idx, onDelete, dims, espesor, tapacanto }) {
  const d1 = pieza.especial
    ? (parseInt(pieza.dimLibre1) || 0)
    : resolverDim(dims[pieza.usaDim], pieza.offsetEsp, pieza.offsetMm, pieza.divisor || 1, espesor);
  const d2 = pieza.especial
    ? (parseInt(pieza.dimLibre2) || 0)
    : resolverDim(dims[pieza.usaDim2], pieza.offsetEsp2, pieza.offsetMm2, pieza.divisor2 || 1, espesor);
  const area = (d1 * d2 * pieza.cantidad) / 1_000_000;
  const tcDef = tapacanto?.find((t) => t.id === pieza.tc?.id);
  const mTc = pieza.tc?.id
    ? (pieza.cantidad *
        ((pieza.tc.lados1 || 0) * d1 + (pieza.tc.lados2 || 0) * d2)) /
      1000
    : 0;
  const offsetLabel = (esp, mm, div) => {
    const p = [];
    if (esp) p.push(`${esp > 0 ? "+" : ""}${esp} esp.`);
    if (mm) p.push(`${mm > 0 ? "+" : ""}${mm} mm`);
    if (div && div > 1) p.push(`÷${div}`);
    return p.length ? `(${p.join(", ")})` : "";
  };
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "var(--accent-soft)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        marginBottom: 6,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 36px 130px 90px 90px 24px",
          gap: 8,
          alignItems: "center",
        }}
      >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
              {pieza.nombre}
              {pieza.especial && (
                <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(212,175,55,0.18)", color: "var(--accent)", border: "1px solid var(--accent-border)", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>✦ ESP</span>
              )}
            </div>
            <div style={{ fontSize: 11, marginTop: 2, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {pieza.especial
                ? `libre: ${pieza.dimLibre1 || 0} × ${pieza.dimLibre2 || 0} mm`
                : `${pieza.usaDim} ${offsetLabel(pieza.offsetEsp, pieza.offsetMm, pieza.divisor || 1)} × ${pieza.usaDim2} ${offsetLabel(pieza.offsetEsp2, pieza.offsetMm2, pieza.divisor2 || 1)}`}
            </div>
          </div>
        <div
          style={{
            textAlign: "center",
            fontFamily: "'DM Mono',monospace",
            fontSize: 13,
            color: "var(--accent)",
          }}
        >
          ×{pieza.cantidad}
        </div>
        <div style={{ textAlign: "right", minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            medidas reales
          </div>
          <div
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 12,
              color: "#c8d098",
              whiteSpace: "nowrap",
            }}
          >
            {Math.round(d1)}×{Math.round(d2)} mm
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            área
          </div>
          <div
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 12,
              color: "#7ecf8a",
              whiteSpace: "nowrap",
            }}
          >
            {fmtNum(area)} m²
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {tcDef ? (
            <>
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                }}
              >
                tapacanto
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 12,
                  color: "var(--accent)",
                }}
              >
                {fmtNum(mTc, 2)} m
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              sin tapac.
            </div>
          )}
        </div>
        <button
          onClick={() => onDelete(idx)}
          style={{
            background: "none",
            border: "none",
            color: "#e07070",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            opacity: 0.6,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.target.style.opacity = 1)}
          onMouseLeave={(e) => (e.target.style.opacity = 0.6)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ── FormPieza ─────────────────────────────────────────────────────
// ── DimRow ── (fuera de FormPieza para evitar re-mount en cada render)

// Dimensiones disponibles para parametrizar piezas del catálogo
const DIMS = ["ancho", "alto", "profundidad"];

// Estado inicial vacío de una pieza nueva en el formulario
const PIEZA_VACIA = {
  nombre: "", cantidad: 1,
  usaDim: "ancho", usaDim2: "alto",
  offsetEsp: 0, offsetMm: 0, divisor: 1,
  offsetEsp2: 0, offsetMm2: 0, divisor2: 1,
  tc: { id: 1, lados1: 0, lados2: 0 },
  especial: false, dimLibre1: "", dimLibre2: "",
};

function DimRow({ titulo, dimKey, espKey, mmKey, divKey, resultado, fp, setFp, espesor }) {
  const divVal = parseInt(fp[divKey]) || 1;
  return (
    <div style={{ background: "rgba(0,0,0,0.18)", borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>
        {titulo}
      </div>
      <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Select label="Toma de" value={fp[dimKey]} small
          onChange={(v) => setFp((p) => ({ ...p, [dimKey]: v }))}
          options={DIMS.map((d) => ({ value: d, label: d }))} />
        <TextInput label="Dividir ÷" type="number" value={fp[divKey]} placeholder="1" suffix="÷" small
          onChange={(v) => setFp((p) => ({ ...p, [divKey]: Math.max(1, parseInt(v) || 1) }))} />
        <TextInput label="Espesores ±" type="number" value={fp[espKey]} placeholder="0" suffix="esp" small
          onChange={(v) => setFp((p) => ({ ...p, [espKey]: v }))} />
        <TextInput label="mm fijos ±" type="number" value={fp[mmKey]} placeholder="0" suffix="mm" small
          onChange={(v) => setFp((p) => ({ ...p, [mmKey]: v }))} />
      </div>
      <div style={{ fontSize: 11, marginTop: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ color: "var(--text-muted)" }}>→</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#7ecf8a" }}>
          {Math.round(resultado)} mm
        </span>
        {(parseInt(fp[espKey]) || 0) !== 0 && (
          <span style={{ fontFamily: "'DM Mono',monospace", color: "var(--accent)", fontSize: 11 }}>
            {parseInt(fp[espKey])} esp × {espesor}mm = {(parseInt(fp[espKey]) || 0) * espesor}mm
          </span>
        )}
        {divVal > 1 && (
          <span style={{ fontFamily: "'DM Mono',monospace", color: "#7090c0", fontSize: 11 }}>÷ {divVal}</span>
        )}
      </div>
    </div>
  );
}

// ── DimRowLibre ── para piezas especiales con medidas libres
function DimRowLibre({ titulo, valKey, fp, setFp }) {
  return (
    <div style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.20)", borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: 8 }}>
        {titulo} <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "none", fontWeight: 400 }}>— medida libre</span>
      </div>
      <TextInput label="Medida exacta (mm)" type="number" value={fp[valKey]} placeholder="0" suffix="mm" small
        onChange={(v) => setFp((p) => ({ ...p, [valKey]: parseInt(v) || 0 }))} />
      <div style={{ fontSize: 11, marginTop: 6, fontFamily: "'DM Mono',monospace", color: "#7ecf8a" }}>
        → {parseInt(fp[valKey]) || 0} mm
      </div>
    </div>
  );
}

function FormPieza({ fp, setFp, onAgregar, error, dims, espesor, tapacanto }) {
  const esEspecial = !!fp.especial;
  const d1 = esEspecial
    ? (parseInt(fp.dimLibre1) || 0)
    : resolverDim(dims[fp.usaDim], parseInt(fp.offsetEsp) || 0, parseInt(fp.offsetMm) || 0, parseInt(fp.divisor) || 1, espesor);
  const d2 = esEspecial
    ? (parseInt(fp.dimLibre2) || 0)
    : resolverDim(dims[fp.usaDim2], parseInt(fp.offsetEsp2) || 0, parseInt(fp.offsetMm2) || 0, parseInt(fp.divisor2) || 1, espesor);

  return (
    <Card className="rsp-card" highlight>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)" }}>
          ➕ Agregar pieza
        </h4>
        {/* Toggle pieza especial */}
        <button
          onClick={() => setFp(p => ({ ...p, especial: !p.especial, dimLibre1: p.dimLibre1 || 0, dimLibre2: p.dimLibre2 || 0 }))}
          title="Pieza especial: medidas libres sin fórmula"
          style={{
            display: "flex", alignItems: "center", gap: 5, padding: "3px 10px",
            borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
            fontFamily: "'DM Mono',monospace", transition: "all 0.15s",
            background: esEspecial ? "rgba(212,175,55,0.18)" : "transparent",
            border: `1px solid ${esEspecial ? "var(--accent-border)" : "var(--border)"}`,
            color: esEspecial ? "var(--accent)" : "var(--text-muted)",
          }}>
          ✦ {esEspecial ? "Especial activa" : "Pieza especial"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
          <TextInput label="Nombre" placeholder="Lateral, Base, Puerta..." value={fp.nombre}
            onChange={(v) => setFp((p) => ({ ...p, nombre: v }))} small />
          <TextInput label="Cantidad" type="number" value={fp.cantidad}
            onChange={(v) => setFp((p) => ({ ...p, cantidad: v }))} small />
        </div>

        {esEspecial ? (
          <>
            <div style={{ fontSize: 11, padding: "6px 10px", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.20)", borderRadius: 6, color: "var(--accent)" }}>
              ✦ Medidas libres — no dependen de las dimensiones del módulo
            </div>
            <DimRowLibre titulo="Dim 1 (altura)" valKey="dimLibre1" fp={fp} setFp={setFp} />
            <DimRowLibre titulo="Dim 2 (ancho)" valKey="dimLibre2" fp={fp} setFp={setFp} />
          </>
        ) : (
          <>
            <DimRow titulo="Dim 1 (altura)" dimKey="usaDim" espKey="offsetEsp" mmKey="offsetMm" divKey="divisor"
              resultado={d1} fp={fp} setFp={setFp} espesor={espesor} />
            <DimRow titulo="Dim 2 (ancho)" dimKey="usaDim2" espKey="offsetEsp2" mmKey="offsetMm2" divKey="divisor2"
              resultado={d2} fp={fp} setFp={setFp} espesor={espesor} />
          </>
        )}

        <div style={{ background: "rgba(0,0,0,0.18)", borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>
            🎗 Tapacanto
          </div>
          <div style={{ marginBottom: 8 }}>
            <Select label="Tipo de cinta" value={fp.tc.id} small
              onChange={(v) => setFp((p) => ({ ...p, tc: { ...p.tc, id: parseInt(v) } }))}
              options={[{ value: 0, label: "Sin tapacanto" }, ...(tapacanto || []).map((t) => ({ value: t.id, label: t.nombre }))]} />
          </div>
          <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <TextInput label={`Lados D1 (${esEspecial ? "libre" : fp.usaDim})`} type="number" value={fp.tc.lados1} small
              onChange={(v) => setFp((p) => ({ ...p, tc: { ...p.tc, lados1: parseInt(v) || 0 } }))} />
            <TextInput label={`Lados D2 (${esEspecial ? "libre" : fp.usaDim2})`} type="number" value={fp.tc.lados2} small
              onChange={(v) => setFp((p) => ({ ...p, tc: { ...p.tc, lados2: parseInt(v) || 0 } }))} />
          </div>
          {fp.tc.id > 0 && (
            <div style={{ fontSize: 11, marginTop: 6, fontFamily: "'DM Mono',monospace", color: "var(--accent)" }}>
              → {fmtNum((parseInt(fp.cantidad || 1) * ((fp.tc.lados1 || 0) * d1 + (fp.tc.lados2 || 0) * d2)) / 1000, 2)} m lineales
            </div>
          )}
        </div>

        {error && <p style={{ color: "#e07070", fontSize: 12 }}>⚠ {error}</p>}
        <Btn onClick={onAgregar} full>+ Agregar esta pieza</Btn>
      </div>
    </Card>
  );
}

// ── StepIndicator + FormModulo ────────────────────────────────────
function StepIndicator({ paso }) {
  const steps = [
    ["1", "Datos"],
    ["2", "Piezas"],
    ["3", "Herrajes y MO"],
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
      {steps.map(([n, label], i) => {
        const done = paso > i + 1;
        const active = paso === i + 1;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  transition: "all 0.2s",
                  background: active
                    ? "var(--accent)"
                    : done
                    ? "rgba(126,207,138,0.2)"
                    : "var(--bg-subtle)",
                  border: `2px solid ${
                    active
                      ? "var(--accent)"
                      : done
                      ? "#7ecf8a"
                      : "var(--border)"
                  }`,
                  color: active
                    ? "#fff"
                    : done
                    ? "#7ecf8a"
                    : "var(--text-muted)",
                }}
              >
                {done ? "✓" : n}
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: active
                    ? "var(--accent)"
                    : done
                    ? "#7ecf8a"
                    : "var(--text-muted)",
                  fontWeight: active ? 700 : 400,
                }}
              >
                {label}
              </span>
            </div>
            {i < 2 && (
              <div
                style={{
                  width: 28,
                  height: 1,
                  background: "var(--border)",
                  margin: "0 10px",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
function FormModulo({
  costos,
  onGuardar,
  onCancelar,
  moduloBase,
  codigoEditar,
  esDeepLinkPresupuesto = false, // true = viene de Nivel 3, mostrar modal antes de guardar
}) {
  const esEdicion = !!codigoEditar;
  const [paso, setPaso] = useState(esEdicion ? 2 : 1);
  // Modal de decisión: aparece al guardar desde Nivel 3
  // null = cerrado, "pidiendo" = mostrando opciones, "nombre" = ingresando nombre para catálogo
  const [modalDecision, setModalDecision] = useState(null);
  const [nombreCatalogo, setNombreCatalogo] = useState("");
  const [datos, setDatos] = useState(() =>
    moduloBase
      ? {
          codigo: codigoEditar || "",
          nombre: moduloBase.nombre,
          descripcion: moduloBase.descripcion || "",
          dimensiones: { ...moduloBase.dimensiones },
          material: moduloBase.material,
          categoria: moduloBase.categoria || "otros",
        }
      : {
          codigo: "",
          nombre: "",
          descripcion: "",
          dimensiones: { ancho: 600, profundidad: 550, alto: 700 },
          material: "melamina",
          categoria: "otros",
        }
  );
  const [piezas, setPiezas] = useState(
    moduloBase
      ? moduloBase.piezas.map((p) => ({
          ...p,
          divisor: p.divisor || 1,
          divisor2: p.divisor2 || 1,
          tc: p.tc ? { ...p.tc } : { id: 0, lados1: 0, lados2: 0 },
        }))
      : []
  );
  const [herrajes, setHerrajes] = useState(
    moduloBase ? moduloBase.herrajes.map((h) => ({ ...h })) : []
  );
  const [moDeObra, setMoDeObra] = useState(
    moduloBase ? { ...moduloBase.moDeObra } : { tipo: "por_modulo", horas: 0 }
  );
  const [error, setError] = useState("");
  const [fp, setFp] = useState({ ...PIEZA_VACIA });
  const [fpError, setFpError] = useState("");
  const matDef =
    costos.materiales.find((m) => m.tipo === datos.material) ||
    costos.materiales[0];
  const espesor = matDef?.espesor || 18;
  const agregarPieza = () => {
    if (!fp.nombre.trim()) {
      setFpError("Ingresá el nombre.");
      return;
    }
    setPiezas((prev) => [
      ...prev,
      {
        ...fp,
        cantidad: parseInt(fp.cantidad) || 1,
        offsetEsp: parseInt(fp.offsetEsp) || 0,
        offsetMm: parseInt(fp.offsetMm) || 0,
        divisor: Math.max(1, parseInt(fp.divisor) || 1),
        offsetEsp2: parseInt(fp.offsetEsp2) || 0,
        offsetMm2: parseInt(fp.offsetMm2) || 0,
        divisor2: Math.max(1, parseInt(fp.divisor2) || 1),
        tc: {
          id: parseInt(fp.tc.id) || 0,
          lados1: parseInt(fp.tc.lados1) || 0,
          lados2: parseInt(fp.tc.lados2) || 0,
        },
      },
    ]);
    setFp({ ...PIEZA_VACIA });
    setFpError("");
  };
  const siguiente = () => {
    if (paso === 1) {
      if (!datos.codigo.trim() || !datos.nombre.trim()) {
        setError("Código y nombre son obligatorios.");
        return;
      }
      setError("");
      setPaso(2);
    } else if (paso === 2) {
      if (piezas.length === 0) {
        setError("Agregá al menos una pieza.");
        return;
      }
      setError("");
      setPaso(3);
    }
  };
  const datosGuardar = () => ({
    nombre:      datos.nombre,
    descripcion: datos.descripcion,
    dimensiones: datos.dimensiones,
    material:    datos.material,
    categoria:   datos.categoria || "otros",
    piezas,
    herrajes,
    moDeObra,
  });

  const guardar = () => {
    // Si viene de Nivel 3, mostrar modal de decisión antes de guardar
    if (esDeepLinkPresupuesto) {
      setNombreCatalogo(datos.nombre || "");
      setModalDecision("pidiendo");
      return;
    }
    onGuardar(datos.codigo.trim().toUpperCase(), datosGuardar());
  };
  const preview =
    piezas.length > 0
      ? calcularModulo({ ...datos, piezas, herrajes, moDeObra }, costos)
      : null;
  return (
    <div>
      <StepIndicator paso={paso} />
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            background: "rgba(200,60,60,0.10)",
            border: "1px solid rgba(200,60,60,0.30)",
            color: "#e08080",
          }}
        >
          ⚠ {error}
        </div>
      )}

      {paso === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            className="rsp-grid-1"
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr",
              gap: 12,
            }}
          >
            <TextInput
              label="Código"
              placeholder="MC003"
              value={datos.codigo}
              onChange={(v) =>
                setDatos((d) => ({ ...d, codigo: v.toUpperCase() }))
              }
              disabled={esEdicion}
              style={esEdicion ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
            />
            {esEdicion && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", marginTop: -6 }}>
                El código no se puede modificar en modo edición
              </div>
            )}
            <TextInput
              label="Nombre"
              placeholder="Módulo bajo mesada 80cm"
              value={datos.nombre}
              onChange={(v) => setDatos((d) => ({ ...d, nombre: v }))}
            />
          </div>
          <TextInput
            label="Descripción (opcional)"
            value={datos.descripcion}
            onChange={(v) => setDatos((d) => ({ ...d, descripcion: v }))}
          />
          <div
            className="rsp-grid-1"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 12,
            }}
          >
            <TextInput
              label="Ancho (mm)"
              type="number"
              suffix="mm"
              value={datos.dimensiones.ancho}
              onChange={(v) =>
                setDatos((d) => ({
                  ...d,
                  dimensiones: { ...d.dimensiones, ancho: parseInt(v) || 0 },
                }))
              }
            />
            <TextInput
              label="Profund. (mm)"
              type="number"
              suffix="mm"
              value={datos.dimensiones.profundidad}
              onChange={(v) =>
                setDatos((d) => ({
                  ...d,
                  dimensiones: {
                    ...d.dimensiones,
                    profundidad: parseInt(v) || 0,
                  },
                }))
              }
            />
            <TextInput
              label="Alto (mm)"
              type="number"
              suffix="mm"
              value={datos.dimensiones.alto}
              onChange={(v) =>
                setDatos((d) => ({
                  ...d,
                  dimensiones: { ...d.dimensiones, alto: parseInt(v) || 0 },
                }))
              }
            />
            <Select
              label="Material"
              value={datos.material}
              onChange={(v) => setDatos((d) => ({ ...d, material: v }))}
              options={costos.materiales.map((m) => ({
                value: m.tipo,
                label: `${m.nombre} (${m.espesor}mm)`,
              }))}
            />
          </div>
          {matDef && (
            <div
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12,
                background: "var(--accent-soft)",
                border: "1px solid var(--accent-border)",
                color: "var(--accent)",
              }}
            >
              Material: <strong>{matDef.nombre}</strong> — espesor{" "}
              <strong>{matDef.espesor}mm</strong>
              {!esEdicion && moduloBase && (
                <span style={{ marginLeft: 12, opacity: 0.7 }}>
                  📋 Copia — editá el código antes de guardar.
                </span>
              )}
            </div>
          )}

          {/* Selector de categoría */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>
              Categoría
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CATEGORIAS_DEFAULT.map(cat => {
                const activa = datos.categoria === cat.id;
                return (
                  <button key={cat.id} onClick={() => setDatos(d => ({ ...d, categoria: cat.id }))}
                    style={{
                      padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                      fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
                      transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5,
                      background: activa ? `${cat.color}25` : "transparent",
                      border: `1px solid ${activa ? cat.color : "var(--border)"}`,
                      color: activa ? cat.color : "var(--text-muted)",
                      boxShadow: activa ? `0 0 10px ${cat.color}30` : "none",
                    }}>
                    {cat.icon} {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Btn variant="ghost" onClick={onCancelar}>Cancelar</Btn>
            {esEdicion && (
              <Btn variant="ghost" onClick={guardar} style={{ borderColor: "var(--accent-border)", color: "var(--accent)" }}>
                💾 Guardar y cerrar
              </Btn>
            )}
            <Btn onClick={siguiente}>Siguiente → Piezas</Btn>
          </div>
        </div>
      )}

      {paso === 2 && (
        // rsp-paso2: apila verticalmente en móvil
        <div className="rsp-paso2" style={{ display: "flex", gap: 20 }}>
          <div
            style={{
              flex: "0 0 340px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <FormPieza
              fp={fp}
              setFp={setFp}
              onAgregar={agregarPieza}
              error={fpError}
              dims={datos.dimensiones}
              espesor={espesor}
              tapacanto={costos.tapacanto}
            />
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h4
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                }}
              >
                Piezas{" "}
                <span style={{ color: "var(--accent)" }}>
                  ({piezas.length})
                </span>
              </h4>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Espesor:{" "}
                <span style={{ color: "var(--accent)" }}>{espesor}mm</span>
              </span>
            </div>
            {piezas.length === 0 ? (
              <div
                style={{
                  padding: "24px 0",
                  textAlign: "center",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px dashed var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                Sin piezas todavía.
              </div>
            ) : (
              piezas.map((p, i) => (
                <FilaPieza
                  key={i}
                  pieza={p}
                  idx={i}
                  dims={datos.dimensiones}
                  espesor={espesor}
                  tapacanto={costos.tapacanto}
                  onDelete={(i) =>
                    setPiezas((prev) => prev.filter((_, j) => j !== i))
                  }
                />
              ))
            )}
            {preview && (
              <Card style={{ borderColor: "rgba(126,207,138,0.15)" }}>
                <div
                  className="rsp-grid-1"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr",
                    gap: 10,
                  }}
                >
                  {[
                    ["m² neto", `${fmtNum(preview.m2Neto)} m²`],
                    ["m² c/desp.", `${fmtNum(preview.m2Total)} m²`],
                    [
                      `Desp.(${preview.pctDesp}%)`,
                      `${fmtNum(preview.m2Total - preview.m2Neto)} m²`,
                    ],
                    ["Tapacanto", `${fmtNum(preview.metrosTapacanto, 2)} m`],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        textAlign: "center",
                        background: "rgba(0,0,0,0.2)",
                        borderRadius: 8,
                        padding: "8px 4px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "#5a7040",
                        }}
                      >
                        {k}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontFamily: "'DM Mono',monospace",
                          fontWeight: 700,
                          marginTop: 2,
                          color: "#7ecf8a",
                        }}
                      >
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => { setPaso(1); setError(""); }}>← Volver</Btn>
              {esEdicion && !modalDecision && (
                <Btn variant="ghost" onClick={guardar} style={{ borderColor: "var(--accent-border)", color: "var(--accent)" }}>
                  💾 Guardar y cerrar
                </Btn>
              )}
              {!modalDecision && (
                <Btn onClick={siguiente} disabled={piezas.length === 0}>
                  Siguiente → Herrajes
                </Btn>
              )}
            </div>

            {/* Acordeón de decisión inline — reemplaza al modal superpuesto */}
            {modalDecision && (
              <div className="anim-fadeup" style={{ marginTop: 14, background: "var(--bg-subtle)", border: "1px solid var(--accent-border)", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: 12 }}>
                  ¿Dónde guardás esta variante?
                </div>

                {modalDecision === "nombre" ? (
                  <>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Nombre en el catálogo:</div>
                    <input autoFocus value={nombreCatalogo} onChange={e => setNombreCatalogo(e.target.value)}
                      placeholder="Nombre del nuevo módulo..."
                      style={{ width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: "8px 12px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", outline: "none", marginBottom: 10, boxSizing: "border-box" }}
                      onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                      onKeyDown={e => e.key === "Enter" && onGuardar(datos.codigo.trim().toUpperCase(), { ...datosGuardar(), nombre: nombreCatalogo.trim() || datos.nombre, _guardarEnCatalogo: true })} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => {
                        onGuardar(datos.codigo.trim().toUpperCase(), { ...datosGuardar(), nombre: nombreCatalogo.trim() || datos.nombre, _guardarEnCatalogo: true });
                        setModalDecision(null);
                      }} style={{ flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)" }}>
                        ✓ Confirmar nombre
                      </button>
                      <button onClick={() => setModalDecision("pidiendo")}
                        style={{ padding: "9px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                        ← Volver
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button onClick={() => { onGuardar(datos.codigo.trim().toUpperCase(), { ...datosGuardar(), _soloPresupuesto: true }); setModalDecision(null); }}
                      style={{ padding: "11px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700, transition: "border-color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                      📋 Solo en este presupuesto
                      <div style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)", marginTop: 3 }}>
                        El catálogo no cambia. Se elimina con el presupuesto.
                      </div>
                    </button>
                    <button onClick={() => { setNombreCatalogo(datos.nombre || ""); setModalDecision("nombre"); }}
                      style={{ padding: "11px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700, transition: "border-color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                      📚 Guardar en catálogo
                      <div style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)", marginTop: 3 }}>
                        Disponible para futuros presupuestos.
                      </div>
                    </button>
                    <button onClick={() => setModalDecision(null)}
                      style={{ padding: "7px 0", borderRadius: 8, cursor: "pointer", fontSize: 11, background: "transparent", border: "none", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                      ✕ Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {paso === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            className="rsp-grid-1"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
          >
            <Card className="rsp-card">
              <h4
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 700,
                  color: "var(--accent)",
                  marginBottom: 14,
                }}
              >
                🔩 Herrajes
              </h4>
              {costos.herrajes.map((h) => {
                const item = herrajes.find((x) => x.id === h.id);
                const cant = item?.cantidad || 0;
                return (
                  <div
                    key={h.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 13, color: "var(--text-primary)" }}
                      >
                        {h.nombre}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {fmtPeso(h.precio)}/{h.unidad}
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      {[
                        [
                          "−",
                          () =>
                            setHerrajes((prev) => {
                              const idx = prev.findIndex((x) => x.id === h.id);
                              if (cant <= 1)
                                return prev.filter((x) => x.id !== h.id);
                              const n = [...prev];
                              n[idx].cantidad--;
                              return n;
                            }),
                        ],
                        [
                          "+",
                          () =>
                            setHerrajes((prev) => {
                              const idx = prev.findIndex((x) => x.id === h.id);
                              if (idx < 0)
                                return [...prev, { id: h.id, cantidad: 1 }];
                              const n = [...prev];
                              n[idx].cantidad++;
                              return n;
                            }),
                        ],
                      ].map(([lbl, fn]) => (
                        <button
                          key={lbl}
                          onClick={fn}
                          style={{
                            width: 28,
                            height: 28,
                            background: "var(--accent-soft)",
                            border: "1px solid var(--accent-border)",
                            color: "var(--accent)",
                            borderRadius: 5,
                            cursor: "pointer",
                            fontSize: 15,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {lbl}
                        </button>
                      ))}
                      <span
                        style={{
                          fontFamily: "'DM Mono',monospace",
                          width: 24,
                          textAlign: "center",
                          color:
                            cant > 0 ? "var(--accent)" : "var(--text-muted)",
                        }}
                      >
                        {cant}
                      </span>
                    </div>
                  </div>
                );
              })}
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Card className="rsp-card">
                <h4
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: 700,
                    color: "var(--accent)",
                    marginBottom: 14,
                  }}
                >
                  🔨 Mano de obra
                </h4>
                <Select
                  label="Tipo"
                  value={moDeObra.tipo}
                  onChange={(v) => setMoDeObra((m) => ({ ...m, tipo: v }))}
                  options={costos.manoDeObra.map((m) => ({
                    value: m.tipo,
                    label: `${m.nombre} — ${fmtPeso(m.precio)}`,
                  }))}
                />
                {moDeObra.tipo === "por_hora" && (
                  <div style={{ marginTop: 10 }}>
                    <TextInput
                      label="Horas estimadas"
                      type="number"
                      suffix="hs"
                      value={moDeObra.horas}
                      onChange={(v) =>
                        setMoDeObra((m) => ({
                          ...m,
                          horas: parseFloat(v) || 0,
                        }))
                      }
                    />
                    {/* Indicador: impacto de gastos fijos en estas horas */}
                    {(() => {
                      const gf = costos.gastosFijos;
                      if (!gf?.items?.length || !moDeObra.horas) return null;
                      const totalMensual = gf.items.reduce((a, i) => a + (parseFloat(i.monto) || 0), 0);
                      const costoHora = gf.horasProductivasMes > 0 ? totalMensual / gf.horasProductivasMes : 0;
                      const impacto = Math.round(costoHora * moDeObra.horas);
                      return (
                        <div style={{
                          marginTop: 8, padding: "7px 11px", borderRadius: 7,
                          background: "rgba(112,144,176,0.10)", border: "1px solid rgba(112,144,176,0.25)",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                            ⏱ {moDeObra.horas}h × {fmtPeso(Math.round(costoHora))}/h taller
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#7090c0", fontFamily: "'DM Mono',monospace" }}>
                            {fmtPeso(impacto)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </Card>
              {(() => {
                const c = calcularModulo(
                  { ...datos, piezas, herrajes, moDeObra },
                  costos
                );
                if (!c) return null;
                return (
                  <Card
                    className="rsp-card"
                    style={{
                      borderColor: "rgba(126,207,138,0.20)",
                      background: "rgba(126,207,138,0.03)",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#7ecf8a",
                        marginBottom: 12,
                      }}
                    >
                      Resumen
                    </h4>
                    {[
                      [
                        "Material",
                        c.costoMaterial,
                        `${fmtNum(c.m2Neto)}m²+${c.pctDesp}%`,
                      ],
                      [
                        "Tapacanto",
                        c.costoTapacanto,
                        `${fmtNum(c.metrosTapacanto, 2)}m`,
                      ],
                      ["MO", c.costoMO, ""],
                      ["Herrajes", c.costoHerrajes, ""],
                      ["── Costo base", c.costoBase, ""],
                      ["Ganancia", c.ganancia, ""],
                    ].map(([k, v, note]) => (
                      <div
                        key={k}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "4px 0",
                          borderBottom: "1px solid var(--border)",
                          fontSize: 13,
                        }}
                      >
                        <span
                          style={{
                            color: k.startsWith("──")
                              ? "var(--text-primary)"
                              : "var(--text-muted)",
                            fontWeight: k.startsWith("──") ? 700 : 400,
                          }}
                        >
                          {k}
                        </span>
                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              fontFamily: "'DM Mono',monospace",
                              color: "#c8c098",
                            }}
                          >
                            {fmtPeso(v)}
                          </span>
                          {note && (
                            <span
                              style={{
                                fontSize: 10,
                                marginLeft: 6,
                                color: "var(--text-muted)",
                              }}
                            >
                              {note}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 10,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        Precio de venta
                      </span>
                      <span
                        style={{
                          fontFamily: "'DM Mono',monospace",
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#7ecf8a",
                        }}
                      >
                        {fmtPeso(c.total)}
                      </span>
                    </div>
                  </Card>
                );
              })()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn
              variant="ghost"
              onClick={() => {
                setPaso(2);
                setError("");
              }}
            >
              ← Volver
            </Btn>
            <Btn onClick={guardar}>
              {esEdicion ? "✓ Guardar cambios" : "✓ Guardar módulo"}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 8. CATÁLOGO
// ══════════════════════════════════════════════════════════════════
// ── CatalogoModulos ───────────────────────────────────────────────
function AccionesModulo({ onEditar, onEliminar, onDuplicar, presupuestosAfectados = [] }) {
  const [confirmar, setConfirmar] = useState(false);
  const tieneAfectados = presupuestosAfectados.length > 0;
  const s = (type) => ({
    padding: "5px 12px", borderRadius: 6, fontSize: 11,
    fontWeight: 700, fontFamily: "'DM Mono',monospace",
    cursor: "pointer", transition: "all 0.15s", width: "100%",
    background:
      type === "edit" ? "var(--accent-soft)" :
      type === "dup"  ? "rgba(112,144,176,0.12)" : "transparent",
    border:
      type === "edit" ? "1px solid var(--accent-border)" :
      type === "dup"  ? "1px solid rgba(112,144,176,0.30)" :
                        "1px solid rgba(200,60,60,0.22)",
    color:
      type === "edit" ? "var(--accent)" :
      type === "dup"  ? "#7090b0" : "#e07070",
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 90 }}>
      <button onClick={onEditar} style={s("edit")}>✏ editar</button>
      <button onClick={onDuplicar} style={s("dup")}>⧉ duplicar</button>
      {confirmar ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Aviso de presupuestos afectados */}
          {tieneAfectados && (
            <div style={{ padding: "7px 8px", borderRadius: 6, background: "rgba(200,100,50,0.12)", border: "1px solid rgba(200,100,50,0.30)", marginBottom: 2 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#d47a50", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>
                ⚠ Usado en {presupuestosAfectados.length} presupuesto{presupuestosAfectados.length > 1 ? "s" : ""}:
              </div>
              {presupuestosAfectados.slice(0, 3).map((nombre, i) => (
                <div key={i} style={{ fontSize: 10, color: "var(--text-muted)", paddingLeft: 6, lineHeight: 1.6 }}>
                  · {nombre || "Sin nombre"}
                </div>
              ))}
              {presupuestosAfectados.length > 3 && (
                <div style={{ fontSize: 10, color: "var(--text-muted)", paddingLeft: 6 }}>
                  · y {presupuestosAfectados.length - 3} más...
                </div>
              )}
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4, fontStyle: "italic" }}>
                Esos ítems quedarán como referencia rota.
              </div>
            </div>
          )}
          <button onClick={() => { onEliminar(); setConfirmar(false); }}
            style={{ ...s("del"), background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", fontWeight: 900 }}>
            ✓ {tieneAfectados ? "borrar igual" : "confirmar"}
          </button>
          <button onClick={() => setConfirmar(false)}
            style={{ ...s("del"), color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            cancelar
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirmar(true)} style={s("del")}>× borrar</button>
      )}
    </div>
  );
}
function VistaToggle({ vista, onChange }) {
  const btn = (id, icon, lbl) => (
    <button
      onClick={() => onChange(id)}
      title={lbl}
      style={{
        padding: "4px 8px",
        borderRadius: 6,
        fontSize: 14,
        cursor: "pointer",
        transition: "all 0.15s",
        background: vista === id ? "var(--accent-soft)" : "transparent",
        border: `1px solid ${
          vista === id ? "var(--accent-border)" : "var(--border)"
        }`,
        color: vista === id ? "var(--accent)" : "var(--text-muted)",
      }}
    >
      {icon}
    </button>
  );
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {btn("grid", "⊞", "Cuadrícula")}
      {btn("list", "☰", "Lista")}
    </div>
  );
}
// ── Imagen de módulo ──────────────────────────────────────────────
function ImagenModulo({ imagen, cod, onSubir, onBorrar, compact = false }) {
  const inputRef = React.useRef();
  const [cargando, setCargando] = useState(false);
  const [modal, setModal] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCargando(true);
    try {
      const base64 = await comprimirImagen(file);
      onSubir(base64);
    } catch { /* silent */ } finally {
      setCargando(false);
      e.target.value = "";
    }
  };

  if (compact) {
    // Vista lista: miniatura 48×48
    return (
      <>
        <div
          onClick={() => imagen ? setModal(true) : inputRef.current?.click()}
          title={imagen ? "Ver imagen" : "Agregar imagen"}
          style={{
            width: 48, height: 48, flexShrink: 0, borderRadius: 8,
            overflow: "hidden", cursor: "pointer", position: "relative",
            background: "var(--bg-subtle)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
        >
          {imagen
            ? <img src={imagen} alt={cod} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 18, opacity: 0.35 }}>📷</span>
          }
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        {modal && imagen && (
          <ModalImagen imagen={imagen} cod={cod} onClose={() => setModal(false)} onBorrar={onBorrar} onCambiar={() => { setModal(false); setTimeout(() => inputRef.current?.click(), 100); }} />
        )}
      </>
    );
  }

  // Vista grid: franja superior de la tarjeta
  return (
    <>
      <div style={{ position: "relative", margin: "-20px -20px 14px -20px", height: 148, borderRadius: "12px 12px 0 0", overflow: "hidden", background: "var(--bg-subtle)" }}>
        {imagen ? (
          <>
            <img
              src={imagen} alt={cod}
              onClick={() => setModal(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in", display: "block", transition: "transform 0.3s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            />
            <button
              onClick={() => inputRef.current?.click()}
              title="Cambiar imagen"
              style={{
                position: "absolute", top: 8, right: 8, width: 28, height: 28,
                borderRadius: "50%", border: "none", cursor: "pointer",
                background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center",
                backdropFilter: "blur(4px)", transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.8)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.55)"}
            >✎</button>
          </>
        ) : (
          <div
            onClick={() => !cargando && inputRef.current?.click()}
            style={{
              width: "100%", height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 6,
              cursor: cargando ? "wait" : "pointer",
              borderBottom: "1px dashed var(--border)",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--accent-soft)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ fontSize: 26, opacity: 0.3 }}>📷</span>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", fontWeight: 700 }}>
              {cargando ? "Procesando..." : "Agregar foto de referencia"}
            </span>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      {modal && imagen && (
        <ModalImagen imagen={imagen} cod={cod} onClose={() => setModal(false)} onBorrar={onBorrar} onCambiar={() => { setModal(false); setTimeout(() => inputRef.current?.click(), 100); }} />
      )}
    </>
  );
}

function ModalImagen({ imagen, cod, onClose, onBorrar, onCambiar }) {
  const [confirmBorrar, setConfirmBorrar] = useState(false);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(0,0,0,0.88)", display: "flex",
        alignItems: "center", justifyContent: "center",
        padding: 20, backdropFilter: "blur(6px)",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: 800, width: "100%", animation: "scaleIn 0.22s cubic-bezier(0.22,1,0.36,1)" }}>
        <img src={imagen} alt={cod} style={{ width: "100%", borderRadius: 12, display: "block", boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }} />
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
          {!confirmBorrar ? (
            <>
              <button onClick={onCambiar}
                style={{ padding: "7px 14px", borderRadius: 7, background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}>
                ✎ Cambiar
              </button>
              <button onClick={() => setConfirmBorrar(true)}
                style={{ padding: "7px 14px", borderRadius: 7, background: "rgba(180,40,40,0.65)", border: "1px solid rgba(255,100,100,0.3)", color: "#fff", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}>
                × Quitar
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { onBorrar(); onClose(); }}
                style={{ padding: "7px 14px", borderRadius: 7, background: "rgba(200,40,40,0.85)", border: "1px solid rgba(255,100,100,0.4)", color: "#fff", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer" }}>
                ✓ Confirmar
              </button>
              <button onClick={() => setConfirmBorrar(false)}
                style={{ padding: "7px 14px", borderRadius: 7, background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 12, fontFamily: "'DM Mono',monospace", cursor: "pointer" }}>
                Cancelar
              </button>
            </>
          )}
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            ×
          </button>
        </div>
        <div style={{ position: "absolute", bottom: 12, left: 16, fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.5)", padding: "4px 10px", borderRadius: 5, backdropFilter: "blur(4px)" }}>
          {cod}
        </div>
      </div>
    </div>
  );
}

function TarjetaModuloGrid({ cod, mod, c, onEditar, onEliminar, onDuplicar, onImagenChange, presupuestosAfectados = [] }) {
  return (
    <Card className="rsp-card">
      <ImagenModulo
        imagen={mod.imagen}
        cod={cod}
        onSubir={(b64) => onImagenChange(cod, b64)}
        onBorrar={() => onImagenChange(cod, null)}
      />
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--accent)" }}>
          {cod}
        </span>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: "var(--text-primary)" }}>
          {mod.nombre}
        </h3>
        {mod.descripcion && (
          <p style={{ fontSize: 12, marginTop: 2, color: "var(--text-muted)" }}>{mod.descripcion}</p>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
        <Badge>{TIPO_MAT[mod.material]}</Badge>
        <Badge color="#7090b0">{mod.piezas.length} piezas</Badge>
        <Badge color="#705090">{c.espesor}mm</Badge>
      </div>
      <p style={{ fontSize: 11, marginBottom: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
        {mod.dimensiones.ancho} × {mod.dimensiones.profundidad} × {mod.dimensiones.alto} mm
      </p>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* Métricas + precio — columna izquierda */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10, fontSize: 11 }}>
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>m² neto</div>
                <div style={{ fontFamily: "'DM Mono',monospace", color: "#9ab080" }}>{fmtNum(c.m2Neto)} m²</div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Tapacanto</div>
                <div style={{ fontFamily: "'DM Mono',monospace", color: "var(--accent)" }}>{fmtNum(c.metrosTapacanto, 2)} m</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Precio de venta</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 17, fontWeight: 700, marginTop: 2, color: "#7ecf8a" }}>{fmtPeso(c.total)}</div>
            </div>
          </div>
          {/* Botones — columna derecha */}
          <AccionesModulo onEditar={onEditar} onEliminar={onEliminar} onDuplicar={onDuplicar} presupuestosAfectados={presupuestosAfectados} />
        </div>
      </div>
    </Card>
  );
}

function FilaModuloLista({ cod, mod, c, onEditar, onEliminar, onDuplicar, onImagenChange, presupuestosAfectados = [] }) {
  return (
    <div
      className="rsp-lista-item"
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border)", transition: "border-color 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
    >
      <ImagenModulo imagen={mod.imagen} cod={cod} compact
        onSubir={(b64) => onImagenChange(cod, b64)}
        onBorrar={() => onImagenChange(cod, null)}
      />
      <div style={{ flex: 2, minWidth: 0 }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)", marginRight: 8 }}>{cod}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{mod.nombre}</span>
        {mod.descripcion && (
          <p style={{ fontSize: 11, marginTop: 2, color: "var(--text-muted)", fontStyle: "italic" }}>{mod.descripcion}</p>
        )}
      </div>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
        {mod.dimensiones.ancho}×{mod.dimensiones.profundidad}×{mod.dimensiones.alto} mm
      </span>
      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        <Badge>{TIPO_MAT[mod.material]}</Badge>
        <Badge color="#705090">{c.espesor}mm</Badge>
      </div>
      <div className="rsp-lista-precio" style={{ display: "flex", gap: 16, flexShrink: 0, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
        <span style={{ color: "#9ab080" }}>{fmtNum(c.m2Neto)} m²</span>
        <span style={{ color: "#7ecf8a", fontWeight: 700 }}>{fmtPeso(c.total)}</span>
      </div>
      <AccionesModulo onEditar={onEditar} onEliminar={onEliminar} onDuplicar={onDuplicar} presupuestosAfectados={presupuestosAfectados} />
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════
// 8. CATÁLOGO
// ══════════════════════════════════════════════════════════════════
// ── CatalogoModulos ───────────────────────────────────────────────
function CatalogoModulos({
  modulos,
  setModulos,
  costos,
  onSave,
  setCostos,
  hSaveC,
  presupuestos,
  perfil,
  onGuardarPerfil,
  deepLinkCodigo = null,
  onDeepLinkConsumed,
  onVolverAlPresupuesto = null,
  origenEdicion = null,
  onGuardarPermanente = null, // (tempCod, newId) → actualiza referencias en presupuesto
}) {
  const [modo, setModo] = useState(null);

  // Deep Link Nivel 3: abrir automáticamente el formulario de edición del módulo
  useEffect(() => {
    if (deepLinkCodigo && modulos[deepLinkCodigo]) {
      // Pasar el módulo completo — FormModulo lo usa para inicializar piezas y datos
      setModo({ tipo: "editar", codigo: deepLinkCodigo, modulo: modulos[deepLinkCodigo] });
      onDeepLinkConsumed && onDeepLinkConsumed();
      setTimeout(() => {
        document.getElementById("catalogo-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkCodigo]);
  const [msg, setMsg] = useState(null);
  const [vistaLayout, setVistaLayout] = useState(() => {
    try { return localStorage.getItem("carpicalc:catalogo_vista") || "grid"; }
    catch { return "grid"; }
  });
  const setVista = (v) => {
    setVistaLayout(v);
    try { localStorage.setItem("carpicalc:catalogo_vista", v); } catch {}
  };
  const [busqueda, setBusqueda] = useState("");
  const [categoriasColapsadas, setCategoriasColapsadas] = useState({});
  const { ToastContainer } = useUndo();
  const formRef = React.useRef(null);

  const abrirModo = (nuevoModo) => {
    setModo(nuevoModo);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const toggleCategoria = (id) => setCategoriasColapsadas(c => ({ ...c, [id]: !c[id] }));

  const showMsg = (texto, tipo = "ok") => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 3500);
  };

  const guardar = (codigo, datos) => {
    const soloPresupuesto  = datos._soloPresupuesto;
    const guardarCatalogo  = datos._guardarEnCatalogo;
    // Limpiar flags internos antes de guardar
    const datosSinFlags = { ...datos };
    delete datosSinFlags._soloPresupuesto;
    delete datosSinFlags._guardarEnCatalogo;

    const existente = modulos[codigo];
    const datosConImagen = existente?.imagen && !datosSinFlags.imagen
      ? { ...datosSinFlags, imagen: existente.imagen }
      : datosSinFlags;

    if (guardarCatalogo) {
      // Opción B: crear módulo permanente y eliminar el TEMP
      const newId = `MC${String(Date.now()).slice(-6)}`;
      const modPermanente = { ...datosConImagen, temporal: false, presupuestoId: undefined, origenCodigo: undefined };
      const todosMods = { ...modulos, [newId]: modPermanente };
      // Eliminar el TEMP original si existía
      if (existente?.temporal) delete todosMods[codigo];
      setModulos(todosMods);
      onSave(todosMods);
      // Notificar a AppInterna para que actualice referencias en el presupuesto
      if (onGuardarPermanente) onGuardarPermanente(codigo, newId);
      setModo(null);
      showMsg(`"${modPermanente.nombre}" guardado en catálogo.`);
    } else {
      // Opción A: solo en presupuesto (temporal) o guardado normal sin deep link
      const todosMods = { ...modulos, [codigo]: { ...datosConImagen, temporal: soloPresupuesto ? true : (existente?.temporal ?? false) } };
      setModulos(todosMods);
      onSave(todosMods);
      setModo(null);
      showMsg(
        modo?.tipo === "editar"  ? `"${codigo}" actualizado.`
        : modo?.tipo === "duplicar" ? `"${codigo}" duplicado.`
        : `"${codigo}" guardado.`
      );
    }

    // Cierre completo del ciclo: volver al presupuesto
    if (onVolverAlPresupuesto) {
      setTimeout(() => onVolverAlPresupuesto(), 600);
    }
  };

  const handleImagenChange = (cod, base64) => {
    const nuevo = {
      ...modulos,
      [cod]: { ...modulos[cod], imagen: base64 || undefined },
    };
    setModulos(nuevo);
    onSave(nuevo);
  };


  // Helper: nombres de presupuestos que usan un módulo dado
  const presupuestosQueUsan = (cod) =>
    Object.values(presupuestos || {})
      .filter(p => (p.items || []).some(it => it.codigo === cod))
      .map(p => p.nombre || "Sin nombre");

  const eliminar = (cod) => {
    const n = { ...modulos };
    delete n[cod];
    setModulos(n);
    onSave(n);
    showMsg(`"${cod}" eliminado.`, "warn");
  };

  // 💾 LÓGICA DE BACKUP (Exportar/Importar)
  const handleExport = () => {
    const data = {
      version: 2,
      fecha: new Date().toISOString(),
      modulos,
      costos,
      presupuestos: presupuestos || {},
      perfil: perfil || {},
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carpicalc-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    // Guardar timestamp del último backup para el recordatorio
    localStorage.setItem("carpicalc:ultimo_backup", Date.now().toString());
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data.modulos || !data.costos) {
          showMsg("El archivo no tiene el formato correcto.", "warn");
          return;
        }
        // Módulos + costos (siempre)
        setModulos(data.modulos);
        onSave(data.modulos);
        setCostos(data.costos);
        hSaveC(data.costos);
        // Presupuestos (solo si existen en el backup v2)
        if (data.presupuestos && typeof data.presupuestos === "object") {
          guardarPresupuestos(data.presupuestos);
        }
        // Perfil (solo si existe en el backup v2)
        if (data.perfil && typeof data.perfil === "object" && onGuardarPerfil) {
          onGuardarPerfil({ ...PERFIL_VACIO, ...data.perfil });
        }
        const extras = data.version === 2 ? " (incluye presupuestos y perfil)" : "";
        showMsg(`Backup cargado con éxito${extras}.`);
      } catch {
        showMsg("Error al leer el archivo.", "warn");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const tituloForm = () => {
    if (!modo) return "";
    if (modo.tipo === "editar") return `Editando: ${modo.codigo}`;
    if (modo.tipo === "duplicar") return `Duplicando: ${modo.codigoSugerido}`;
    return "Nuevo módulo";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        className="rsp-stack"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <SectionTitle sub="Definí tus módulos con piezas reales, espesores automáticos y tapacanto">
          Catálogo de Módulos
        </SectionTitle>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
            flexShrink: 0,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {/* Buscador + toggle de vista agrupados */}
          {!modo && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-muted)", pointerEvents: "none" }}>🔍</span>
                <input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar módulo..."
                  style={{
                    paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                    fontFamily: "'DM Mono',monospace", fontSize: 12,
                    background: "var(--bg-surface)", border: "1px solid var(--border)",
                    color: "var(--text-primary)", borderRadius: 7, outline: "none",
                    width: 160, transition: "border-color 0.15s, width 0.2s",
                  }}
                  onFocus={e => { e.target.style.borderColor = "var(--accent-border)"; e.target.style.width = "200px"; }}
                  onBlur={e => { e.target.style.borderColor = "var(--border)"; if (!busqueda) e.target.style.width = "160px"; }}
                />
                {busqueda && (
                  <button onClick={() => setBusqueda("")}
                    style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}>
                    ×
                  </button>
                )}
              </div>
              {/* Separador */}
              <div style={{ width: 1, height: 22, background: "var(--border)", margin: "0 2px" }} />
              <VistaToggle vista={vistaLayout} onChange={setVista} />
            </div>
          )}
          {/* BOTONES DE BACKUP (Estilo idéntico a Nuevo Módulo) */}
          {!modo && (
            <>
              <button
                onClick={handleExport}
                title="Descargar Backup a la PC"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  padding: "8px 16px",
                  fontSize: 20,
                  fontWeight: "bold",
                  background:
                    "var(--accent)" /* Mismo naranja que el botón principal */,
                  color: "#ffffff" /* Flecha en color blanco puro */,
                }}
              >
                ↓
              </button>
              <label
                title="Cargar Backup desde la PC"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  padding: "8px 16px",
                  fontSize: 20,
                  fontWeight: "bold",
                  background:
                    "var(--accent)" /* Mismo naranja que el botón principal */,
                  color: "#ffffff" /* Flecha en color blanco puro */,
                  margin: 0,
                }}
              >
                ↑
                <input
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={handleImport}
                />
              </label>
            </>
          )}

          {!modo && (
            <Btn onClick={() => abrirModo({ tipo: "nuevo" })}>+ Nuevo módulo</Btn>
          )}
        </div>
      </div>

      {/* El resto del código sigue igual (mensajes, formulario y lista) */}
      {msg && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            background:
              msg.tipo === "warn"
                ? "rgba(200,140,40,0.10)"
                : "rgba(60,180,80,0.10)",
            border: `1px solid ${
              msg.tipo === "warn"
                ? "rgba(200,140,40,0.30)"
                : "rgba(60,180,80,0.30)"
            }`,
            color: msg.tipo === "warn" ? "#d4a040" : "#7ecf8a",
          }}
        >
          {msg.tipo === "warn" ? "⚠" : "✓"} {msg.texto}
        </div>
      )}

      {modo && (
        <div id="catalogo-form" ref={formRef}>
        <Card className="rsp-card" highlight style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <h3
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--accent)",
              }}
            >
              {tituloForm()}
            </h3>
            {modo.tipo === "duplicar" && (
              <Badge color="#7090b0">⧉ Copia — asigná un código nuevo</Badge>
            )}
            {modo.tipo === "editar" && <Badge color="#d4a040">Edición</Badge>}
          </div>
          <FormModulo
            costos={costos}
            onGuardar={guardar}
            onCancelar={() => setModo(null)}
            moduloBase={modo.tipo !== "nuevo" ? modo.modulo : null}
            codigoEditar={modo.tipo === "editar" ? modo.codigo : null}
            esDeepLinkPresupuesto={!!origenEdicion && origenEdicion.tipo === "presupuesto"}
          />
        </Card>
        </div>
      )}

      {/* Grid / List view agrupado por categorías */}
      {(() => {
        // Fix: excluir módulos temporales del catálogo visible.
        // Los TEMP_ solo existen para la sesión de edición de un presupuesto.
        const filtrados = Object.entries(modulos).filter(([cod, mod]) =>
          !mod.temporal &&
          (!busqueda || cod.toLowerCase().includes(busqueda.toLowerCase()) || mod.nombre.toLowerCase().includes(busqueda.toLowerCase()))
        );
        if (filtrados.length === 0 && Object.keys(modulos).length > 0) {
          return <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 13 }}>Sin resultados para "{busqueda}"</div>;
        }
        // Agrupar por categoría
        const grupos = {};
        filtrados.forEach(([cod, mod]) => {
          const cat = mod.categoria || "otros";
          if (!grupos[cat]) grupos[cat] = [];
          grupos[cat].push([cod, mod]);
        });
        const ordenCats = CATEGORIAS_DEFAULT.map(c => c.id).concat(
          Object.keys(grupos).filter(k => !CATEGORIAS_DEFAULT.find(c => c.id === k))
        );
        return ordenCats.filter(catId => grupos[catId]?.length > 0).map(catId => {
          const cat = CATEGORIAS_DEFAULT.find(c => c.id === catId) || { id: catId, label: catId, icon: "📦", color: "#808080" };
          const items = grupos[catId];
          const colapsada = categoriasColapsadas[catId];
          const totalCat = items.reduce((s, [, mod]) => {
            const c = calcularModulo(mod, costos);
            return s + (c ? c.total : 0);
          }, 0);
          return (
            <div key={catId} style={{ marginBottom: 20 }}>
              {/* Header de categoría */}
              <button onClick={() => toggleCategoria(catId)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px", marginBottom: colapsada ? 0 : 10,
                borderRadius: colapsada ? 10 : "10px 10px 0 0",
                background: `${cat.color}12`, border: `1px solid ${cat.color}30`,
                borderBottom: colapsada ? undefined : `2px solid ${cat.color}50`,
                cursor: "pointer", transition: "all 0.18s",
              }}>
                <span style={{ fontSize: 16 }}>{cat.icon}</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: cat.color, flex: 1, textAlign: "left" }}>
                  {cat.label}
                </span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: cat.color, opacity: 0.7, background: `${cat.color}20`, border: `1px solid ${cat.color}30`, borderRadius: 999, padding: "2px 8px" }}>
                  {items.length} mód.
                </span>
                {!busqueda && (
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: cat.color }}>
                    {fmtPeso(totalCat)} base
                  </span>
                )}
                <span style={{ fontSize: 11, color: cat.color, opacity: 0.6, marginLeft: 4 }}>{colapsada ? "▼" : "▲"}</span>
              </button>
              {!colapsada && (
                vistaLayout === "grid" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12, padding: "4px 2px" }}>
                    {items.map(([cod, mod]) => {
                      const c = calcularModulo(mod, costos);
                      if (!c) return null;
                      return <TarjetaModuloGrid key={cod} cod={cod} mod={mod} c={c}
                        onEditar={() => abrirModo({ tipo: "editar", codigo: cod, modulo: mod })}
                        onEliminar={() => eliminar(cod)}
                        onDuplicar={() => abrirModo({ tipo: "duplicar", modulo: mod, codigoSugerido: cod })}
                        onImagenChange={handleImagenChange}
                        presupuestosAfectados={presupuestosQueUsan(cod)} />;
                    })}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 2px" }}>
                    {items.map(([cod, mod]) => {
                      const c = calcularModulo(mod, costos);
                      if (!c) return null;
                      return <FilaModuloLista key={cod} cod={cod} mod={mod} c={c}
                        onEditar={() => abrirModo({ tipo: "editar", codigo: cod, modulo: mod })}
                        onEliminar={() => eliminar(cod)}
                        onDuplicar={() => abrirModo({ tipo: "duplicar", modulo: mod, codigoSugerido: cod })}
                        onImagenChange={handleImagenChange}
                        presupuestosAfectados={presupuestosQueUsan(cod)} />;
                    })}
                  </div>
                )
              )}
            </div>
          );
        });
      })()}

      {Object.keys(modulos).length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", borderRadius: 16, border: "1px dashed var(--border)", color: "var(--text-muted)", background: "var(--bg-subtle)" }}>
          <div style={{ marginBottom: 18, opacity: 0.7 }} dangerouslySetInnerHTML={{ __html: `<svg width="52" height="52" viewBox="0 0 52 52" fill="none"><rect x="8" y="8" width="36" height="36" rx="8" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.5"/><path d="M20 26h12M26 20v12" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" opacity="0.7"/></svg>` }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Catálogo vacío</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>No hay módulos en el catálogo.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>
            Hacé clic en <strong style={{ color: "var(--accent)" }}>+ Nuevo módulo</strong> para empezar.
          </p>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}

// ── PanelSelectorModulos ──────────────────────────────────────────
function PanelSelectorModulos({ modulos, onSeleccionar }) {
  const [busqueda, setBusqueda] = useState("");
  const [colapsadas, setColapsadas] = useState(() =>
    Object.fromEntries(CATEGORIAS_DEFAULT.map(c => [c.id, true]))
  );
  const inputRef = React.useRef();

  const toggle = (id) => setColapsadas(c => ({ ...c, [id]: !c[id] }));

  const buscando = busqueda.trim().length > 0;
  const termino = busqueda.toLowerCase();

  // Agrupar módulos por categoría — excluir temporales
  const grupos = {};
  Object.entries(modulos).forEach(([cod, mod]) => {
    if (mod.temporal) return; // ← TEMP_ nunca aparecen en el selector
    if (buscando) {
      const match = cod.toLowerCase().includes(termino) || mod.nombre.toLowerCase().includes(termino);
      if (!match) return;
    }
    const cat = mod.categoria || "otros";
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push({ cod, mod });
  });

  const ordenCats = CATEGORIAS_DEFAULT.map(c => c.id).filter(id => grupos[id]?.length > 0);

  return (
    <div style={{ marginTop: 14 }}>
      {/* Buscador */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text-muted)", pointerEvents: "none" }}>🔍</span>
        <input
          ref={inputRef}
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o código... (ej: bajo mesada, PL001)"
          style={{
            width: "100%", paddingLeft: 32, paddingRight: busqueda ? 32 : 12,
            paddingTop: 8, paddingBottom: 8,
            fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13,
            background: "var(--bg-base)", border: "1px solid var(--border)",
            color: "var(--text-primary)", borderRadius: 8, outline: "none",
            transition: "border-color 0.15s",
          }}
          onFocus={e => { e.target.style.borderColor = "var(--accent-border)"; if (buscando) setColapsadas(Object.fromEntries(CATEGORIAS_DEFAULT.map(c => [c.id, false]))); }}
          onBlur={e => e.target.style.borderColor = "var(--border)"}
          onKeyDown={e => {
            if (e.key === "Escape") { setBusqueda(""); e.target.blur(); }
          }}
        />
        {busqueda && (
          <button onClick={() => { setBusqueda(""); inputRef.current?.focus(); }}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>
            ×
          </button>
        )}
      </div>

      {/* Grupos por categoría */}
      {ordenCats.length === 0 && buscando ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "10px 0", fontFamily: "'DM Mono',monospace" }}>
          Sin resultados para "{busqueda}"
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ordenCats.map(catId => {
            const cat = CATEGORIAS_DEFAULT.find(c => c.id === catId) || { id: catId, label: catId, icon: "📦", color: "#808080" };
            const items = grupos[catId] || [];
            const abierta = buscando || !colapsadas[catId];
            return (
              <div key={catId} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${cat.color}25` }}>
                {/* Header colapsable */}
                <button onClick={() => toggle(catId)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 12px", background: `${cat.color}10`,
                    border: "none", cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = `${cat.color}20`}
                  onMouseLeave={e => e.currentTarget.style.background = `${cat.color}10`}
                >
                  <span style={{ fontSize: 13 }}>{cat.icon}</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: cat.color, flex: 1, textAlign: "left" }}>
                    {cat.label}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: cat.color, opacity: 0.6, background: `${cat.color}20`, border: `1px solid ${cat.color}30`, borderRadius: 999, padding: "1px 7px" }}>
                    {items.length}
                  </span>
                  <span style={{ fontSize: 10, color: cat.color, opacity: 0.5 }}>{abierta ? "▲" : "▼"}</span>
                </button>

                {/* Chips de módulos */}
                {abierta && (
                  <div style={{ padding: "8px 10px", display: "flex", flexWrap: "wrap", gap: 5, background: "var(--bg-subtle)" }}>
                    {items.map(({ cod, mod }) => (
                      <button key={cod} onClick={() => { onSeleccionar(cod); setBusqueda(""); }}
                        style={{
                          background: "var(--bg-surface)", border: "1px solid var(--border)",
                          color: "var(--text-secondary)", borderRadius: 6, padding: "5px 10px",
                          fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace",
                          transition: "all 0.13s", display: "flex", alignItems: "center", gap: 5,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = cat.color; e.currentTarget.style.background = `${cat.color}12`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
                        title={`Agregar ${mod.nombre}`}
                      >
                        <span style={{ color: cat.color, fontWeight: 700 }}>{cod}</span>
                        <span style={{ color: "var(--text-muted)" }}>— {mod.nombre}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 9. PRESUPUESTO
// ══════════════════════════════════════════════════════════════════
// ── GestorPresupuestos ────────────────────────────────────────────
function GestorPresupuestos({
  presupuestos,
  onCargar,
  onNuevo,
  onEliminar,
  onCambiarEstado,
  totalActual,
  itemsActual,
  nombreInicial = "",
  clienteInicial = { nombre: "", tel: "", dir: "" },
  onVer,
  itemsActivos = [],
  costosVersion = 0,
  onActualizarPresupuesto,
  modulos,
  costos,
}) {
  const [abierto, setAbierto] = useState(false);
  const [confirmDelId, setConfirmDelId] = useState(null);
  const [busquedaPres, setBusquedaPres] = useState("");
  const [avisoVerId, setAvisoVerId] = useState(null); // aviso de cambios sin guardar

  const totalEntries = Object.keys(presupuestos).length;
  const entries = Object.entries(presupuestos)
    .sort((a, b) => b[0] - a[0])
    .filter(([, p]) => {
      if (!busquedaPres.trim()) return true;
      const q = busquedaPres.toLowerCase();
      return p.nombre?.toLowerCase().includes(q) || p.cliente?.nombre?.toLowerCase().includes(q);
    });

  return (
    <div>
      {/* Cabecera colapsable */}
      <button onClick={() => setAbierto(a => !a)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderRadius: abierto ? "10px 10px 0 0" : 10, cursor: "pointer",
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        fontFamily: "'DM Mono',monospace", transition: "all 0.15s",
        borderBottom: abierto ? "none" : "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14 }}>🗄</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
            Mis presupuestos
          </span>
          {totalEntries > 0 && (
            <span style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 999, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>
              {totalEntries}
            </span>
          )}
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderTop: "1px solid var(--separator)", borderRadius: "0 0 10px 10px", overflow: "visible" }}>

          {/* Buscador — solo con más de 3 */}
          {totalEntries > 3 && (
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--separator)" }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-muted)", pointerEvents: "none" }}>🔍</span>
                <input value={busquedaPres} onChange={e => setBusquedaPres(e.target.value)}
                  placeholder="Buscar por nombre o cliente..."
                  style={{ width: "100%", paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 12, background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 6, outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
            </div>
          )}

          {/* Lista de presupuestos */}
          {entries.length === 0 ? (
            <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              {busquedaPres ? `Sin resultados para "${busquedaPres}"` : "No hay presupuestos guardados todavía"}
            </div>
          ) : (
            entries.map(([id, p]) => {
              const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
              return (
                <div key={id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                  borderBottom: "1px solid var(--separator)", transition: "background 0.12s",
                  flexWrap: "wrap",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-subtle)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, background: `${est.color}20`, color: est.color, border: `1px solid ${est.color}30`, borderRadius: 3, padding: "1px 5px", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
                        {est.icon} {est.label}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, fontFamily: "'DM Mono',monospace" }}>
                      {fmtFecha(parseInt(id))} · {p.items?.length || 0} mód.
                      {p.cliente?.nombre && <span> · 👤 {p.cliente.nombre}</span>}
                      <span style={{ color: "#7ecf8a", fontWeight: 700, marginLeft: 8 }}>{fmtPeso(p.total)}</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center", flexWrap: "wrap" }}>

                    {/* Aviso cambios sin guardar al ir a Ver */}
                    {avisoVerId === id && (
                      <div style={{ position: "absolute", right: 14, top: "100%", zIndex: 100, background: "var(--bg-surface)", border: "1px solid rgba(200,160,42,0.40)", borderRadius: 8, padding: "10px 14px", boxShadow: "0 6px 20px rgba(0,0,0,0.40)", minWidth: 240 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#c8a02a", marginBottom: 6 }}>⚠ Tenés un presupuesto activo sin guardar</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>¿Querés ir a Vista Previa de todas formas?</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { onVer(id); setAbierto(false); setAvisoVerId(null); }}
                            style={{ padding: "5px 12px", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a", borderRadius: 5 }}>
                            Ir a Vista Previa
                          </button>
                          <button onClick={() => setAvisoVerId(null)}
                            style={{ padding: "5px 10px", fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 5 }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    <button onClick={() => { onCargar(p, id); setAbierto(false); }}
                      style={{ padding: "4px 10px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                      ✎ Editar
                    </button>
                    {/* Botón Actualizar precio — se habilita cuando los costos cambiaron después de crear el presupuesto */}
                    {onActualizarPresupuesto && modulos && costos && (() => {
                      const necesita = presupuestoNecesitaActualizacion(id, costosVersion, p);
                      return (
                        <button
                          disabled={!necesita}
                          onClick={() => {
                            const nuevoTotal = recalcularTotalPresupuesto(p, modulos, costos);
                            if (nuevoTotal !== null) onActualizarPresupuesto(id, { total: Math.round(nuevoTotal), costosVersionAl: Date.now() });
                          }}
                          title={necesita ? "Los costos cambiaron desde que se creó este presupuesto" : "Los precios están actualizados"}
                          style={{
                            padding: "4px 10px", borderRadius: 5, cursor: necesita ? "pointer" : "not-allowed",
                            fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                            background: necesita ? "rgba(200,160,42,0.15)" : "transparent",
                            border: `1px solid ${necesita ? "rgba(200,160,42,0.40)" : "var(--border)"}`,
                            color: necesita ? "#c8a02a" : "var(--text-muted)",
                            opacity: necesita ? 1 : 0.45, transition: "all 0.2s",
                          }}>
                          ↻ Actualizar
                        </button>
                      );
                    })()}
                    {onVer && (
                      <button onClick={() => itemsActivos.length > 0 ? setAvisoVerId(id) : (onVer(id), setAbierto(false))}
                        style={{ padding: "4px 10px", background: "rgba(112,144,176,0.12)", border: "1px solid rgba(112,144,176,0.30)", color: "#7090b0", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                        👁 Ver
                      </button>
                    )}
                    {confirmDelId === id ? (
                      <>
                        <button onClick={() => { onEliminar(id); setConfirmDelId(null); }}
                          style={{ padding: "4px 10px", background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                          ✓ Confirmar
                        </button>
                        <button onClick={() => setConfirmDelId(null)}
                          style={{ padding: "4px 8px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDelId(id)}
                        style={{ padding: "4px 8px", background: "transparent", border: "1px solid rgba(200,60,60,0.22)", color: "#e07070", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>
                        ×
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Pie del panel */}
          <div style={{ height: 4 }} />
        </div>
      )}
    </div>
  );
}

// ── imprimirPresupuesto ───────────────────────────────────────────
function imprimirPresupuesto(
  items,
  modulos,
  costos,
  getModUsado,
  totalGeneral,
  nombre,
  mostrarPrecioUnitario,
  cliente,
  textoApertura = "",
  condiciones = "",
  descuento = 0,
  gananciaExtra = 0,
  tema = "dorado",
  adicionales = []
) {
  const perfil = leerPerfil();
  const fecha = fmtFechaLarga(Date.now());
  const tv = calcularTotalVisual(totalGeneral, descuento, gananciaExtra);

  // ── Paletas de color premium ───────────────────────────────────
  const TEMAS = {
    dorado: {
      acento:       "#a07030",   // líneas y bordes principales
      acentoSuave:  "#c8a060",   // borde inferior encabezado tabla
      fondoHeader:  "#f5ede0",   // fondo encabezado tabla + pie
      fondoFila:    "#fdfaf6",   // filas alternas
      fondoCliente: "#fff8ee",   // tarjeta del cliente
      bordeCliente: "#e8d0a0",
      textoAcento:  "#9a7040",   // textos en dorado (labels, muted)
      textoPrincipal:"#1a0e04",  // texto oscuro principal
      textoSec:     "#7a6040",   // texto secundario
      totalColor:   "#1a6a30",   // total final (verde)
      descuentoColor:"#e07070",
      separador:    "#ede0cc",
    },
    gris: {
      acento:        "#5a5a5a",
      acentoSuave:   "#9a9a9a",
      fondoHeader:   "#f0f0f0",
      fondoFila:     "#fafafa",
      fondoCliente:  "#f5f5f5",
      bordeCliente:  "#d8d8d8",
      textoAcento:   "#777777",
      textoPrincipal:"#1a1a1a",
      textoSec:      "#555555",
      totalColor:    "#222222",
      descuentoColor:"#888888",
      separador:     "#e0e0e0",
    },
    carbon: {
      acento:        "#2c2c2c",
      acentoSuave:   "#555555",
      fondoHeader:   "#222222",
      fondoFila:     "#f8f8f8",
      fondoCliente:  "#1a1a1a",
      bordeCliente:  "#333333",
      textoAcento:   "#aaaaaa",
      textoPrincipal:"#111111",
      textoSec:      "#444444",
      totalColor:    "#111111",
      descuentoColor:"#666666",
      separador:     "#dddddd",
      // overrides especiales para encabezado oscuro
      headerTexto:   "#ffffff",
      headerTextoSec:"#cccccc",
    },
    bosque: {
      acento:        "#2d5a27",
      acentoSuave:   "#5a8a54",
      fondoHeader:   "#edf5ec",
      fondoFila:     "#f7fbf7",
      fondoCliente:  "#f0f7ef",
      bordeCliente:  "#b8d8b4",
      textoAcento:   "#4a7a44",
      textoPrincipal:"#0f1e0d",
      textoSec:      "#3a5a36",
      totalColor:    "#1a4016",
      descuentoColor:"#c0392b",
      separador:     "#c8e0c4",
    },
    marino: {
      acento:        "#1a3a5c",
      acentoSuave:   "#3a6a9c",
      fondoHeader:   "#edf2f8",
      fondoFila:     "#f7f9fc",
      fondoCliente:  "#eef3f9",
      bordeCliente:  "#b0c8e0",
      textoAcento:   "#3a5a7a",
      textoPrincipal:"#0a1520",
      textoSec:      "#2a4a6a",
      totalColor:    "#0a2040",
      descuentoColor:"#c0392b",
      separador:     "#c0d4e8",
    },
    bordo: {
      acento:        "#6b1a2a",
      acentoSuave:   "#9a3a4a",
      fondoHeader:   "#f8eeef",
      fondoFila:     "#fdf7f7",
      fondoCliente:  "#f8eced",
      bordeCliente:  "#e0b0b8",
      textoAcento:   "#7a3040",
      textoPrincipal:"#1a0508",
      textoSec:      "#5a2030",
      totalColor:    "#3a0a14",
      descuentoColor:"#8a1a2a",
      separador:     "#e8c8cc",
    },
  };

  const p = TEMAS[tema] || TEMAS.dorado;
  const encabezadoTaller = perfil?.nombre
    ? `<div style="display:flex;align-items:center;gap:14px">
        ${perfil.logo ? `<img src="${perfil.logo}" style="height:44px;object-fit:contain" />` : ""}
        <div>
          <div style="font-family:'Georgia',serif;font-size:20px;font-weight:900;color:${p.acento}">${perfil.nombre}</div>
          ${perfil.slogan ? `<div style="font-size:11px;color:${p.textoAcento};font-style:italic">${perfil.slogan}</div>` : ""}
          <div style="font-size:10px;color:${p.textoAcento};margin-top:2px;opacity:0.7">${[perfil.tel, perfil.email, perfil.direccion].filter(Boolean).join(" · ")}</div>
        </div>
      </div>`
    : `<div><div style="font-size:22px;font-weight:900;color:${p.acento}">CarpiCálc</div><div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;color:${p.textoAcento}">Presupuesto de carpintería</div></div>`;
  const filas = items
    .map((item) => {
      const modBase = modulos[item.codigo];
      if (!modBase) return "";
      const modUsado = getModUsado(item);
      const calc = calcularModulo(modUsado, costos);
      if (!calc) return "";
      const over = modUsado.dimensiones;
      const dimDif =
        over.ancho !== modBase.dimensiones.ancho ||
        over.profundidad !== modBase.dimensiones.profundidad ||
        over.alto !== modBase.dimensiones.alto;
      return `<tr>
        <td class="cod" style="color:${p.acento}">${item.codigo}</td>
        <td>
          <div class="mod-nombre" style="color:${p.textoPrincipal}">${modBase.nombre}</div>
          ${modBase.descripcion ? `<div class="mod-desc" style="color:${p.textoSec}">${modBase.descripcion}</div>` : ""}
          ${item.nota?.trim() ? `<div class="mod-nota" style="color:${p.acento}">📝 ${item.nota}</div>` : ""}
          <div class="mod-dim" style="color:${dimDif ? p.acento : p.textoAcento}">
            ${over.ancho}×${over.profundidad}×${over.alto} mm${dimDif ? " ★ personalizado" : ""} · ${TIPO_MAT[modUsado.material]}
          </div>
        </td>
        <td class="num" style="font-weight:700;color:${p.acento}">${item.cantidad}</td>
        ${mostrarPrecioUnitario ? `<td class="num precio-u" style="color:${p.textoSec}">${fmtPeso(calc.total)}</td>` : ""}
        <td class="num subtotal" style="color:${p.totalColor}">${fmtPeso(calc.total * item.cantidad)}</td>
      </tr>`;
    })
    .join("");

  // Filas de adicionales — sección separada con divisor visual
  const filasAdicionales = adicionales.length > 0
    ? `<tr><td colspan="${mostrarPrecioUnitario ? 5 : 4}" style="padding:10px 14px 4px;border-top:1px dashed ${p.acentoSuave}">
        <span style="font-size:9px;text-transform:uppercase;letter-spacing:0.14em;font-weight:700;color:${p.textoAcento}">Servicios y adicionales</span>
      </td></tr>` +
      adicionales.map(x => `<tr>
        <td style="padding:9px 14px;border-bottom:1px solid ${p.separador};font-size:11px;color:${p.textoAcento}">+</td>
        <td style="padding:9px 14px;border-bottom:1px solid ${p.separador};color:${p.textoPrincipal};font-style:italic">${x.nombre}</td>
        <td class="num" style="border-bottom:1px solid ${p.separador};color:${p.textoAcento}">—</td>
        ${mostrarPrecioUnitario ? `<td class="num" style="border-bottom:1px solid ${p.separador};color:${p.textoSec}">${fmtPeso(x.monto)}</td>` : ""}
        <td class="num subtotal" style="border-bottom:1px solid ${p.separador};color:${p.totalColor}">${fmtPeso(x.monto)}</td>
      </tr>`).join("")
    : "";

  const totalUnid = items.reduce((a, i) => a + i.cantidad, 0);
  // ── HTML del PDF ──────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${perfil?.nombre || "CarpiCálc"} — ${nombre || "Presupuesto"}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #fff;
      color: ${p.textoPrincipal};
      padding: 36px 44px;
      max-width: 920px;
      margin: 0 auto;
      font-size: 13px;
      line-height: 1.5;
    }
    @media print {
      body { padding: 16px 20px; font-size: 12px; }
      @page { margin: 1.2cm 1.4cm; }
    }
    .tabla-items { width: 100%; border-collapse: collapse; }
    .tabla-items thead tr { background: ${p.fondoHeader}; }
    .tabla-items th {
      font-size: 9px; text-transform: uppercase; letter-spacing: 0.16em;
      font-weight: 700; color: ${tema === "carbon" ? p.headerTextoSec : p.textoAcento};
      padding: 10px 14px; border-bottom: 2px solid ${p.acentoSuave};
    }
    .tabla-items th.num { text-align: right; }
    .tabla-items th.txt { text-align: left; }
    .tabla-items td { padding: 11px 14px; border-bottom: 1px solid ${p.separador}; vertical-align: top; }
    .tabla-items tbody tr:nth-child(even) td { background: ${p.fondoFila}; }
    .cod  { font-family: monospace; font-size: 10px; font-weight: 700; white-space: nowrap; }
    .num  { text-align: right; font-family: monospace; }
    .subtotal { font-size: 14px; font-weight: 700; }
    .precio-u  { font-size: 12px; }
    .mod-nombre { font-size: 13px; font-weight: 700; }
    .mod-desc   { font-size: 11px; font-style: italic; margin-top: 3px; }
    .mod-dim    { font-size: 10px; font-family: monospace; margin-top: 4px; }
    .mod-nota   { font-size: 11px; font-style: italic; margin-top: 4px; }
  </style>
</head>
<body>

  <!-- ZONA 1: HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid ${p.acento};margin-bottom:16px;gap:24px">
    <div style="flex:1">${encabezadoTaller}</div>
    <div style="text-align:right;min-width:200px">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.2em;color:${p.textoAcento};margin-bottom:4px">Presupuesto</div>
      <div style="font-size:11px;color:${p.textoAcento};margin-bottom:12px;opacity:0.7">${fecha}</div>
      ${cliente && (cliente.nombre || cliente.tel || cliente.dir) ? `
      <div style="background:${p.fondoCliente};border:1px solid ${p.bordeCliente};border-radius:8px;padding:10px 14px;font-size:12px;color:${p.textoSec};text-align:left;display:inline-block;min-width:180px">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.14em;color:${p.textoAcento};font-weight:700;margin-bottom:6px">Cliente</div>
        ${cliente.nombre ? `<div style="font-weight:700;font-size:13px;margin-bottom:3px;color:${p.textoPrincipal}">${cliente.nombre}</div>` : ""}
        ${cliente.tel ? `<div style="font-size:11px;margin-top:2px">📞 ${cliente.tel}</div>` : ""}
        ${cliente.dir ? `<div style="font-size:11px;margin-top:2px">📍 ${cliente.dir}</div>` : ""}
      </div>` : ""}
    </div>
  </div>

  ${nombre ? `<div style="text-align:center;font-family:'Georgia',serif;font-size:18px;font-style:italic;font-weight:700;color:${p.acento};padding:10px 0 20px 0;letter-spacing:0.02em">${nombre}</div>` : ""}

  ${textoApertura ? `<div style="margin-bottom:20px;padding:12px 16px;background:${p.fondoCliente};border-left:3px solid ${p.acentoSuave};border-radius:0 6px 6px 0;font-size:13px;color:${p.textoSec};line-height:1.7">${textoApertura.replace(/\n/g, "<br>")}</div>` : ""}

  <!-- ZONA 2: TABLA -->
  <table class="tabla-items">
    <thead>
      <tr>
        <th class="txt" style="width:70px">Código</th>
        <th class="txt">Módulo / Descripción</th>
        <th class="num" style="width:52px">Cant.</th>
        ${mostrarPrecioUnitario ? `<th class="num" style="width:110px">P. unit.</th>` : ""}
        <th class="num" style="width:120px">Subtotal</th>
      </tr>
    </thead>
    <tbody>${filas}${filasAdicionales}</tbody>
  </table>

  <!-- ZONA 3: PIE -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:32px;margin-top:0;padding:20px 0 0 0;border-top:2px solid ${p.acento}">

    <div style="flex:1;max-width:55%">
      ${condiciones ? `
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.16em;font-weight:700;color:${p.textoAcento};margin-bottom:8px">Condiciones y observaciones</div>
      <div style="font-size:11px;color:${p.textoSec};line-height:1.7;background:${p.fondoFila};border:1px solid ${p.separador};border-radius:6px;padding:10px 14px">${condiciones.replace(/\n/g, "<br>")}</div>
      ` : `<div style="font-size:11px;color:${p.textoAcento};font-style:italic;opacity:0.6">Sin condiciones especificadas.</div>`}
      <div style="margin-top:12px;font-size:10px;color:${p.textoAcento};opacity:0.7">
        ${totalUnid} unidad${totalUnid !== 1 ? "es" : ""} · ${items.length} módulo${items.length !== 1 ? "s" : ""}
      </div>
    </div>

    <div style="min-width:220px;text-align:right">
      <table style="width:100%;border-collapse:collapse;font-family:'Segoe UI',Arial,sans-serif">
        <tr>
          <td style="font-size:11px;color:${p.textoAcento};padding:4px 0;text-align:left">Subtotal</td>
          <td style="font-size:13px;font-weight:700;color:${tv.hayDescuento ? p.textoAcento : p.textoPrincipal};text-align:right;padding:4px 0;${tv.hayDescuento ? "text-decoration:line-through;opacity:0.55;letter-spacing:0.02em" : ""}">
            ${fmtPeso(tv.totalOriginal)}
          </td>
        </tr>
        ${tv.hayDescuento ? `
        <tr>
          <td style="font-size:11px;color:${p.descuentoColor};padding:4px 0;text-align:left">🏷 Descuento</td>
          <td style="font-size:13px;font-weight:700;color:${p.descuentoColor};text-align:right;padding:4px 0">− ${fmtPeso(tv.descuentoVal)}</td>
        </tr>` : ""}
        ${tv.hayGanancia ? `
        <tr>
          <td style="font-size:11px;color:${p.textoAcento};padding:4px 0;text-align:left">Recargo</td>
          <td style="font-size:13px;font-weight:700;color:${p.textoSec};text-align:right;padding:4px 0">+ ${fmtPeso(tv.gananciaVal)}</td>
        </tr>` : ""}
        ${tv.hayDescuento || tv.hayGanancia ? `
        <tr><td colspan="2" style="padding:6px 0 0 0;border-top:1px solid ${p.acentoSuave}"></td></tr>` : ""}
        <tr>
          <td style="font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:${p.textoAcento};padding-top:6px;text-align:left">Total del trabajo</td>
          <td style="padding-top:6px;text-align:right">
            <span style="font-family:'Georgia',serif;font-size:28px;font-weight:900;color:${p.totalColor};letter-spacing:-0.5px">${fmtPeso(tv.totalFinal)}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="font-size:9px;color:${p.textoAcento};padding-top:4px;text-align:right;opacity:0.7">IVA no incluido</td>
        </tr>
      </table>
    </div>
  </div>

<script>window.onload=()=>window.print();</script>
</body>
</html>`;
  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  } else alert("El navegador bloqueó la ventana emergente.");
}

// ── Ficha de Obra ─────────────────────────────────────────────────
function generarFichaObra(id, p, modulos, costos, perfil = {}) {
  const fecha = fmtFechaLarga(Date.now());
  const creacion = fmtFechaLarga(parseInt(id));
  const cobros = p.cobros || [];
  const totalCobrado = cobros.reduce((a, c) => a + c.monto, 0);
  const saldo = p.total - totalCobrado;

  const encabezadoTaller = perfil?.nombre ? `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px">
      ${perfil.logo ? `<img src="${perfil.logo}" style="height:40px;object-fit:contain" />` : ""}
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:18px;font-weight:900;color:#7a4a10">${perfil.nombre}</div>
        ${perfil.slogan ? `<div style="font-size:11px;color:#9a7040;font-style:italic">${perfil.slogan}</div>` : ""}
        <div style="font-size:10px;color:#aaa">${[perfil.tel, perfil.email, perfil.direccion].filter(Boolean).join(" · ")}</div>
      </div>
    </div>` : `<div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:900;color:#7a4a10">CarpiCálc</div>`;

  // Calcular piezas de corte agrupadas
  const piezasCorte = [];
  (p.items || []).forEach(item => {
    const modBase = modulos[item.codigo];
    if (!modBase) return;
    const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
    const modUsado = { ...modBase, dimensiones: dims };
    const matDef = costos.materiales.find(m => m.tipo === modUsado.material) || costos.materiales[0];
    const esp = matDef?.espesor || 18;
    const dimMap = { ancho: dims.ancho, profundidad: dims.profundidad, alto: dims.alto };
    modUsado.piezas.forEach(pz => {
      const d1 = pz.especial ? (parseInt(pz.dimLibre1) || 0)
        : Math.round(resolverDim(dimMap[pz.usaDim], pz.offsetEsp, pz.offsetMm, pz.divisor || 1, esp));
      const d2 = pz.especial ? (parseInt(pz.dimLibre2) || 0)
        : Math.round(resolverDim(dimMap[pz.usaDim2], pz.offsetEsp2, pz.offsetMm2, pz.divisor2 || 1, esp));
      const cant = (pz.cantidad || 1) * (item.cantidad || 1);
      piezasCorte.push({ nombre: pz.nombre, modulo: `${item.codigo} ${modBase.nombre}`, d1, d2, cant, especial: !!pz.especial });
    });
  });

  // Calcular materiales necesarios
  const calcMat = (() => {
    const matMap = {};
    (p.items || []).forEach(item => {
      const modBase = modulos[item.codigo];
      if (!modBase) return;
      const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
      const modUsado = { ...modBase, dimensiones: dims };
      const calc = calcularModulo(modUsado, costos);
      if (!calc) return;
      const key = modUsado.material;
      if (!matMap[key]) matMap[key] = { nombre: costos.materiales.find(m => m.tipo === key)?.nombre || key, m2: 0, espesor: costos.materiales.find(m => m.tipo === key)?.espesor || 18, placaL: costos.materiales.find(m => m.tipo === key)?.placaLargo || 2750, placaA: costos.materiales.find(m => m.tipo === key)?.placaAncho || 1830 };
      matMap[key].m2 += calc.m2Total * item.cantidad;
    });
    return Object.values(matMap).map(m => ({
      ...m,
      placas: Math.ceil(m.m2 / ((m.placaL * m.placaA) / 1_000_000))
    }));
  })();

  const calcTc = (() => {
    const tcMap = {};
    (p.items || []).forEach(item => {
      const modBase = modulos[item.codigo];
      if (!modBase) return;
      const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
      const modUsado = { ...modBase, dimensiones: dims };
      const calc = calcularModulo(modUsado, costos);
      if (!calc) return;
      modUsado.piezas.forEach(pz => {
        if (!pz.tc?.id) return;
        const tcDef = costos.tapacanto?.find(t => t.id === pz.tc.id);
        if (!tcDef) return;
        const esp = costos.materiales.find(m => m.tipo === modUsado.material)?.espesor || 18;
        const dimMap = { ancho: dims.ancho, profundidad: dims.profundidad, alto: dims.alto };
        const d1 = pz.especial ? (parseInt(pz.dimLibre1) || 0) : resolverDim(dimMap[pz.usaDim], pz.offsetEsp, pz.offsetMm, pz.divisor || 1, esp);
        const d2 = pz.especial ? (parseInt(pz.dimLibre2) || 0) : resolverDim(dimMap[pz.usaDim2], pz.offsetEsp2, pz.offsetMm2, pz.divisor2 || 1, esp);
        const metros = (pz.cantidad * item.cantidad * ((pz.tc.lados1 || 0) * d1 + (pz.tc.lados2 || 0) * d2)) / 1000;
        if (!tcMap[tcDef.id]) tcMap[tcDef.id] = { nombre: tcDef.nombre, metros: 0 };
        tcMap[tcDef.id].metros += metros;
      });
    });
    return Object.values(tcMap);
  })();

  const calcHerrajes = (() => {
    const hMap = {};
    (p.items || []).forEach(item => {
      const modBase = modulos[item.codigo];
      if (!modBase) return;
      (modBase.herrajes || []).forEach(h => {
        const hDef = costos.herrajes?.find(hd => hd.id === h.id);
        if (!hDef) return;
        if (!hMap[h.id]) hMap[h.id] = { nombre: hDef.nombre, unidad: hDef.unidad || "u", cant: 0 };
        hMap[h.id].cant += (h.cantidad || 1) * item.cantidad;
      });
    });
    return Object.values(hMap);
  })();

  const filasCorte = piezasCorte.map((pz, i) =>
    `<tr style="background:${i % 2 === 0 ? '#f9f6f0' : '#fff'}">
      <td style="padding:7px 12px;font-size:12px;color:#5a3a10;font-family:monospace">${pz.modulo}</td>
      <td style="padding:7px 12px;font-size:13px;font-weight:600;color:#1a0e04">${pz.nombre}${pz.especial ? ' <span style="font-size:9px;background:#fff3cd;color:#8a6010;border:1px solid #e0c060;border-radius:3px;padding:1px 4px">ESP</span>' : ''}</td>
      <td style="padding:7px 12px;font-family:monospace;font-size:13px;font-weight:700;color:#1a6a30;text-align:right">${pz.d1}</td>
      <td style="padding:7px 12px;font-family:monospace;font-size:13px;font-weight:700;color:#1a6a30;text-align:right">${pz.d2}</td>
      <td style="padding:7px 12px;font-family:monospace;font-size:14px;font-weight:900;color:#7a4a10;text-align:center">×${pz.cant}</td>
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Ficha de Obra — ${p.nombre}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a0e04;padding:28px 36px;max-width:960px;margin:0 auto;font-size:13px}
  h2{font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#7a4a10;margin-bottom:14px;padding-bottom:6px;border-bottom:2px solid #e8d0a0}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  th{font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:7px 12px;border-bottom:2px solid #c8a060;text-align:left;background:#fdf6ec}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700}
  .section{margin-bottom:24px;padding:16px 18px;border:1px solid #e8d0a0;border-radius:8px;background:#fdf9f3}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
  .label{font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#9a7040;font-weight:700;margin-bottom:3px}
  .val{font-size:14px;font-weight:700;color:#1a0e04;font-family:monospace}
  .chip{display:inline-block;background:#f0e8d8;border:1px solid #c8a060;border-radius:4px;padding:2px 8px;font-size:11px;color:#7a4a10;margin:2px}
  @media print{body{padding:12px 16px} .no-print{display:none}}
</style></head><body>

<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:14px;border-bottom:3px solid #a07030">
  <div>${encabezadoTaller}
    <div style="font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#aaa;margin-top:6px">FICHA DE OBRA</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:18px;font-weight:800;color:#1a0e04">${p.nombre}</div>
    <div style="font-size:11px;color:#888;margin-top:3px">Creado: ${creacion} · Impreso: ${fecha}</div>
    <span class="badge" style="background:#c85030;color:#fff;margin-top:6px">🪚 En producción</span>
  </div>
</div>

${p.cliente && (p.cliente.nombre || p.cliente.tel || p.cliente.dir) ? `
<div class="section" style="margin-bottom:20px">
  <div class="grid3">
    ${p.cliente.nombre ? `<div><div class="label">Cliente</div><div class="val">${p.cliente.nombre}</div></div>` : ''}
    ${p.cliente.tel ? `<div><div class="label">Teléfono</div><div class="val">${p.cliente.tel}</div></div>` : ''}
    ${p.cliente.dir ? `<div><div class="label">Dirección entrega</div><div class="val">${p.cliente.dir}</div></div>` : ''}
  </div>
</div>` : ''}

<div class="grid2" style="margin-bottom:20px">
  <div class="section">
    <h2>📦 Módulos del trabajo</h2>
    ${(p.items || []).map(item => {
      const modBase = modulos[item.codigo];
      if (!modBase) return '';
      const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
      return `<div style="padding:8px 0;border-bottom:1px solid #e8d8c0;display:flex;justify-content:space-between;align-items:center">
        <div>
          <span style="font-family:monospace;font-size:10px;color:#9a7040;font-weight:700">${item.codigo}</span>
          <span style="font-size:13px;font-weight:700;color:#1a0e04;margin-left:8px">${modBase.nombre}</span>
          <div style="font-size:11px;color:#7a6040;font-family:monospace;margin-top:2px">${dims.ancho}×${dims.profundidad}×${dims.alto} mm</div>
        </div>
        <span style="font-family:monospace;font-size:16px;font-weight:900;color:#7a4a10">×${item.cantidad}</span>
      </div>`;
    }).join('')}
  </div>

  <div>
    <div class="section" style="margin-bottom:12px">
      <h2>🪵 Material necesario</h2>
      ${calcMat.map(m => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #e8d8c0">
          <div>
            <div style="font-weight:700;color:#1a0e04">${m.nombre} ${m.espesor}mm</div>
            <div style="font-size:11px;color:#888;font-family:monospace">${m.m2.toFixed(2)} m² (c/desp.)</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:18px;font-weight:900;color:#7a4a10;font-family:monospace">${m.placas}</div>
            <div style="font-size:10px;color:#888">placas</div>
          </div>
        </div>`).join('')}
      ${calcTc.length > 0 ? `<div style="margin-top:10px"><div class="label">Tapacanto</div>${calcTc.map(t => `<span class="chip">🎗 ${t.nombre}: ${t.metros.toFixed(1)} m</span>`).join('')}</div>` : ''}
      ${calcHerrajes.length > 0 ? `<div style="margin-top:10px"><div class="label">Herrajes</div>${calcHerrajes.map(h => `<span class="chip">⚙ ${h.nombre}: ${h.cant} ${h.unidad}</span>`).join('')}</div>` : ''}
    </div>

    <div class="section">
      <h2>💵 Estado de cobros</h2>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="color:#888">Total acordado</span>
        <span style="font-family:monospace;font-weight:700;color:#1a6a30">${fmtPeso(p.total)}</span>
      </div>
      ${cobros.map(c => `
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0">
          <span style="color:#888">${c.concepto} — ${fmtFecha(c.fecha)}</span>
          <span style="font-family:monospace;color:#5a8a5a">${fmtPeso(c.monto)}</span>
        </div>`).join('')}
      <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:2px solid #e8d0a0">
        <span style="font-weight:700">Saldo pendiente</span>
        <span style="font-family:monospace;font-weight:900;font-size:16px;color:${saldo > 0 ? '#c84040' : '#1a6a30'}">${fmtPeso(Math.max(0, saldo))}</span>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <h2>✂ Lista de corte completa (${piezasCorte.length} piezas · ${piezasCorte.reduce((a, p) => a + p.cant, 0)} unidades)</h2>
  <table>
    <thead><tr>
      <th>Módulo</th><th>Pieza</th>
      <th style="text-align:right">Alto (mm)</th>
      <th style="text-align:right">Ancho (mm)</th>
      <th style="text-align:center">Cant.</th>
    </tr></thead>
    <tbody>${filasCorte}</tbody>
  </table>
</div>

${p.nota ? `<div class="section"><h2>📋 Observaciones</h2><p style="font-size:13px;color:#3a2810;line-height:1.6;margin-top:6px">${p.nota}</p></div>` : ''}

<div style="margin-top:16px;padding:12px 16px;background:#f0f0f0;border-radius:6px;display:flex;justify-content:space-between;font-size:11px;color:#888">
  <span>CarpiCálc · Ficha de Obra generada el ${fecha}</span>
  <span>${p.nombre} · ${(p.items||[]).length} módulo${(p.items||[]).length !== 1 ? 's' : ''}</span>
</div>

<script>window.onload=()=>window.print();</script>
</body></html>`;

  const win = window.open("", "_blank", "width=1000,height=750");
  if (win) { win.document.write(html); win.document.close(); }
  else alert("El navegador bloqueó la ventana. Permití popups para este sitio.");
}

// ── ResumenPresupuesto ────────────────────────────────────────────
function ResumenPresupuesto({
  items,
  modulos,
  costos,
  getModUsado,
  totalGeneral,
  mostrarPrecioUnitario,
  nombrePresupuesto,
  descuento = 0,
  gananciaExtra = 0,
  adicionales = [],
  costosDirectos = [],
}) {
  const [mostrarIVA, setMostrarIVA] = useState(false);
  const totalConIVA = Math.round(totalGeneral * 1.21);
  // LÓGICA - Precios Tachados y PDF: usar función centralizada
  const tv = calcularTotalVisual(totalGeneral, descuento, gananciaExtra);
  const totalAjustadoConIVA = Math.round(tv.totalFinal * 1.21);
  if (items.length === 0) return null;
  const itemsValidos = items.filter(item => {
    const mod = getModUsado(item);
    return mod && mod.piezas;
  });
  if (itemsValidos.length === 0) return null;
  const cols = mostrarPrecioUnitario
    ? "80px 1fr 50px 120px 130px"
    : "80px 1fr 50px 130px";
  const fechaHoy = fmtFechaLarga(Date.now());
  return (
    <div>
      <div
        className="print-only"
        style={{
          marginBottom: 28,
          borderBottom: "2px solid #a07030",
          paddingBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 22,
                fontWeight: 900,
                color: "#7a4a10",
                lineHeight: 1,
              }}
            >
              CarpiCálc
            </div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginTop: 4,
                color: "#888",
              }}
            >
              Presupuesto de carpintería
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {nombrePresupuesto && (
              <div style={{ fontSize: 16, fontWeight: 700, color: "#2c1a08" }}>
                {nombrePresupuesto}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
              {fechaHoy}
            </div>
          </div>
        </div>
      </div>
      {/* rsp-scroll-x: scroll horizontal táctil en móvil */}
      <div
        className="rsp-scroll-x"
        style={{
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        <div className="rsp-table-inner">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              gap: 0,
              padding: "10px 20px",
              background: "var(--accent-soft)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {[
              "Código",
              "Módulo",
              "Cant.",
              ...(mostrarPrecioUnitario ? ["P. unit."] : [""]),
              "Subtotal",
            ]
              .filter((h) => h)
              .map((h) => (
                <div
                  key={h}
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontWeight: 700,
                    fontFamily: "'DM Mono',monospace",
                    color: "var(--text-muted)",
                    textAlign:
                      h === "Cant." || h === "P. unit." || h === "Subtotal"
                        ? "right"
                        : "left",
                  }}
                >
                  {h}
                </div>
              ))}
          </div>
          {(itemsValidos).map((item, idx) => {
            const modBase = modulos[item.codigo];
            if (!modBase) return null;
            const modUsado = getModUsado(item);
            const calc = calcularModulo(modUsado, costos);
            if (!calc) return null;
            const over = modUsado.dimensiones;
            const dimDif =
              over.ancho !== modBase.dimensiones.ancho ||
              over.profundidad !== modBase.dimensiones.profundidad ||
              over.alto !== modBase.dimensiones.alto;
            return (
              <div
                key={item.id || item.codigo}
                className="print-table-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: cols,
                  gap: 0,
                  padding: "14px 20px",
                  borderBottom:
                    idx < items.length - 1 ? "1px solid var(--border)" : "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--accent-soft)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "var(--accent)",
                    paddingTop: 3,
                  }}
                >
                  {item.codigo}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {modBase.nombre}
                  </div>
                  {modBase.descripcion && (
                    <div
                      style={{
                        fontSize: 12,
                        marginTop: 2,
                        fontStyle: "italic",
                        color: "var(--text-muted)",
                      }}
                    >
                      {modBase.descripcion}
                    </div>
                  )}
                  {item.nota && item.nota.trim() && (
                    <div
                      className="item-nota-print"
                      style={{
                        fontSize: 12,
                        marginTop: 4,
                        color: "var(--accent)",
                        fontStyle: "italic",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span style={{ opacity: 0.7 }}>📝</span> {item.nota}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 5,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "'DM Mono',monospace",
                        color: dimDif ? "var(--accent)" : "var(--text-muted)",
                      }}
                    >
                      {over.ancho}×{over.profundidad}×{over.alto} mm
                    </span>
                    {dimDif && (
                      <Badge color="var(--accent)">★ personalizado</Badge>
                    )}
                    <Badge color="#7090b0">{TIPO_MAT[modUsado.material]}</Badge>
                  </div>
                </div>
                <div style={{ textAlign: "right", paddingTop: 3 }}>
                  <span
                    style={{
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--accent)",
                    }}
                  >
                    {item.cantidad}
                  </span>
                </div>
                {mostrarPrecioUnitario && (
                  <div
                    style={{
                      textAlign: "right",
                      paddingTop: 3,
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {fmtPeso(calc.total)}
                  </div>
                )}
                <div
                  style={{
                    textAlign: "right",
                    paddingTop: 3,
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#7ecf8a",
                  }}
                >
                  {fmtPeso(calc.total * item.cantidad)}
                </div>
              </div>
            );
          })}
          <div
            className="print-total-block"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 20,
              padding: "16px 24px",
              alignItems: "center",
              background: "var(--bg-surface)",
              borderTop: "1px solid var(--accent-border)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {items.reduce((a, i) => a + i.cantidad, 0)} u · {items.length} mód.
                {(adicionales || []).length > 0 && ` · ${adicionales.length} extra${adicionales.length !== 1 ? "s" : ""}`}
                {(costosDirectos || []).length > 0 && ` · ${costosDirectos.length} costo${costosDirectos.length !== 1 ? "s" : ""}`}
              </div>
              <button onClick={() => setMostrarIVA(v => !v)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: mostrarIVA ? "rgba(126,207,138,0.12)" : "var(--accent-soft)",
                  border: `1px solid ${mostrarIVA ? "rgba(126,207,138,0.30)" : "var(--accent-border)"}`,
                  color: mostrarIVA ? "#7ecf8a" : "var(--accent)",
                  borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                  fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, width: "fit-content",
                  transition: "all 0.15s",
                }}>
                {mostrarIVA ? "✓ Con IVA 21%" : "+ Ver con IVA 21%"}
              </button>
            </div>
            <div style={{ textAlign: "right" }}>
              {/* Total original — tachado si hay descuento */}
              {tv.hayDescuento || tv.hayGanancia ? (
                <>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 2, color: "var(--text-muted)" }}>
                    {mostrarIVA ? "Total + IVA 21%" : "Total sin IVA"}
                  </div>
                  {tv.hayDescuento && (
                    <div style={{
                      fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700,
                      color: "var(--text-muted)", textDecoration: "line-through",
                      opacity: 0.55, letterSpacing: "0.02em", marginBottom: 4,
                    }}>
                      {fmtPeso(mostrarIVA ? totalConIVA : totalGeneral)}
                    </div>
                  )}
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1, color: "#7ecf8a", transition: "all 0.2s" }}>
                    {fmtPeso(mostrarIVA ? totalAjustadoConIVA : tv.totalFinal)}
                  </div>
                  {tv.hayDescuento && (
                    <div style={{ fontSize: 10, color: "#e07070", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
                      🏷 Precio con descuento
                    </div>
                  )}
                  {mostrarIVA && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
                      base: {fmtPeso(tv.totalFinal)} · iva: {fmtPeso(totalAjustadoConIVA - tv.totalFinal)}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 4, color: "var(--text-muted)" }}>
                    {mostrarIVA ? "Total + IVA 21%" : "Total sin IVA"}
                  </div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1, color: "#7ecf8a", transition: "all 0.2s" }}>
                    {fmtPeso(mostrarIVA ? totalConIVA : totalGeneral)}
                  </div>
                  {mostrarIVA && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
                      base: {fmtPeso(totalGeneral)} · iva: {fmtPeso(totalConIVA - totalGeneral)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BarraTotal ────────────────────────────────────────────────────
function BarraTotal({ items, modulos, costos, getModUsado, totalGeneral, nombrePresupuesto, descuento = 0, gananciaExtra = 0, adicionales = [], costosDirectos = [], mostrarExtras = true, mostrarCostosDirectos = true }) {
  const [expandido, setExpandido] = useState(false);
  const [mostrarIVA, setMostrarIVA] = useState(false);
  const totalConIVA = Math.round(totalGeneral * 1.21);
  const totalUnid = items.reduce((a, i) => a + i.cantidad, 0);
  // LÓGICA - Precios Tachados: usar función centralizada para reactividiad instantánea
  const tv = calcularTotalVisual(totalGeneral, descuento, gananciaExtra);
  const totalFinalConIVA = Math.round(tv.totalFinal * 1.21);
  const hayAjuste = tv.hayDescuento || tv.hayGanancia;

  return (
    <div style={{ borderRadius: expandido ? "10px 10px 0 0" : 10, overflow: "hidden", border: "1px solid var(--accent-border)", background: "var(--bg-surface)" }}>
      {/* Barra principal — siempre visible */}
      <div style={{
        padding: "10px 16px", display: "flex", alignItems: "center",
        gap: 12, flexWrap: "wrap", cursor: "pointer",
        background: "var(--accent-soft)",
        borderBottom: expandido ? "1px solid var(--accent-border)" : "none",
      }}
        onClick={() => setExpandido(v => !v)}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
            {totalUnid} u · {items.length} mód.
          </span>
          <button
            onClick={e => { e.stopPropagation(); setMostrarIVA(v => !v); }}
            style={{
              padding: "3px 10px", borderRadius: 5, fontSize: 10,
              fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer",
              background: mostrarIVA ? "rgba(126,207,138,0.15)" : "transparent",
              border: `1px solid ${mostrarIVA ? "rgba(126,207,138,0.35)" : "var(--accent-border)"}`,
              color: mostrarIVA ? "#7ecf8a" : "var(--accent)",
              transition: "all 0.15s",
            }}>
            {mostrarIVA ? "✓ Con IVA" : "+ IVA 21%"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Total original — tachado elegante si hay descuento */}
          {tv.hayDescuento && (
            <span style={{
              fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700,
              color: "var(--text-muted)", textDecoration: "line-through",
              opacity: 0.5, letterSpacing: "0.02em",
            }}>
              {fmtPeso(mostrarIVA ? totalConIVA : totalGeneral)}
            </span>
          )}
          {/* Total final — verde destacado */}
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 900, color: "#7ecf8a", letterSpacing: -0.5 }}>
            {fmtPeso(mostrarIVA ? (hayAjuste ? totalFinalConIVA : totalConIVA) : (hayAjuste ? tv.totalFinal : totalGeneral))}
          </span>
          {mostrarIVA && !hayAjuste && (
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
              base {fmtPeso(totalGeneral)}
            </span>
          )}
          <span style={{ color: "var(--accent)", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
            {expandido ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Resumen expandido */}
      {expandido && (
        <ResumenPresupuesto
          items={items}
          modulos={modulos}
          costos={costos}
          getModUsado={getModUsado}
          totalGeneral={totalGeneral}
          nombrePresupuesto={nombrePresupuesto}
          descuento={descuento}
          gananciaExtra={gananciaExtra}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SeccionCostosDirectos
// ════════════════════════════════════════════════════════════════════════════
// Carga ítems de la tabla de Costos directamente en el presupuesto.
// Casos: horas de MO extra, m² de material, herrajes sueltos, tapacanto.
// Cada ítem guarda refId para poder actualizarse si el precio cambia en Costos.
// Los Cortes NO leen estos ítems — son montos directos al total.
function SeccionCostosDirectos({ costosDirectos, setCostosDirectos, costos, sinCard = false }) {
  const [tipoSel,    setTipoSel]    = useState("mo");
  const [refSel,     setRefSel]     = useState("");
  const [cant,       setCant]       = useState(1);
  const [precio,     setPrecio]     = useState("");
  const [editId,     setEditId]     = useState(null);
  const [editForm,   setEditForm]   = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const TIPOS = [
    { id: "mo",        label: "Mano de obra", unidad: "hs",  items: costos?.manoDeObra || [] },
    { id: "material",  label: "Materiales",   unidad: "m²",  items: costos?.materiales || [] },
    { id: "herraje",   label: "Herrajes",     unidad: "u",   items: costos?.herrajes   || [] },
    { id: "tapacanto", label: "Tapacanto",    unidad: "ml",  items: costos?.tapacanto  || [] },
  ];
  const tipoActual = TIPOS.find(t => t.id === tipoSel);

  const getItemCostos = (tipo, refId) =>
    (TIPOS.find(x => x.id === tipo)?.items || []).find(x => String(x.id) === String(refId)) || null;

  const getPrecioRef = (tipo, refId) => {
    const item = getItemCostos(tipo, refId);
    if (!item) return 0;
    return tipo === "material" ? (item.precioM2 || 0) : (item.precio || 0);
  };

  const handleSelItem = (refId) => {
    setRefSel(refId);
    const p = getPrecioRef(tipoSel, refId);
    setPrecio(p ? String(p) : "");
  };

  const agregar = () => {
    if (!refSel) return;
    const item     = getItemCostos(tipoSel, refSel);
    if (!item) return;
    const cantNum  = parseFloat(cant)   || 1;
    const precNum  = parseFloat(precio) || getPrecioRef(tipoSel, refSel);
    const precBase = getPrecioRef(tipoSel, refSel);
    setCostosDirectos(prev => [...prev, {
      id: Date.now(), tipo: tipoSel, refId: refSel,
      nombre: item.nombre, unidad: tipoActual?.unidad || "u",
      cantidad: cantNum, precioUnit: precNum,
      precioManual: precNum !== precBase,
      subtotal: Math.round(cantNum * precNum),
    }]);
    setRefSel(""); setCant(1); setPrecio("");
  };

  const actualizarPrecio = (id) => {
    setCostosDirectos(prev => prev.map(x => {
      if (x.id !== id) return x;
      const pAct = getPrecioRef(x.tipo, x.refId);
      return { ...x, precioUnit: pAct, precioManual: false, subtotal: Math.round(x.cantidad * pAct) };
    }));
  };

  const totalSeccion = costosDirectos.reduce((a, x) => a + (x.subtotal || 0), 0);
  const BADGE = { mo: "MO", material: "MAT", herraje: "HRJ", tapacanto: "TC" };
  const inpSt = { fontFamily: "'DM Mono',monospace", fontSize: 13, padding: "7px 10px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-primary)", outline: "none" };

  const inner = (
    <div style={{ padding: "12px 16px" }}>
        {/* Ítems cargados */}
        {costosDirectos.length > 0 && (
          <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {costosDirectos.map(x => {
              const precActual = getPrecioRef(x.tipo, x.refId);
              const hayCambio  = precActual > 0 && precActual !== x.precioUnit;
              const editando   = editId === x.id;
              return (
                <div key={x.id} style={{ borderRadius: 8, overflow: "hidden", border: editando ? "1.5px solid var(--accent)" : "1px solid var(--border)", background: "var(--bg-surface)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", background: "var(--bg-subtle)", padding: "2px 5px", borderRadius: 4, border: "1px solid var(--border)", flexShrink: 0 }}>
                      {BADGE[x.tipo]}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{x.nombre}</span>
                    <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>{x.cantidad} {x.unidad} × {fmtPeso(x.precioUnit)}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(x.subtotal)}</span>
                    {hayCambio && (
                      <button onClick={() => actualizarPrecio(x.id)} title={`Precio actual en Costos: ${fmtPeso(precActual)}`}
                        style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, cursor: "pointer", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.35)", color: "#c8a02a", fontFamily: "'DM Mono',monospace", fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" }}>
                        ↻ {fmtPeso(precActual)}
                      </button>
                    )}
                    <button onClick={() => { if (editando) { setEditId(null); setEditForm(null); } else { setEditId(x.id); setEditForm({ cantidad: String(x.cantidad), precioUnit: String(x.precioUnit) }); } }}
                      style={{ background: editando ? "var(--accent-soft)" : "transparent", border: `1px solid ${editando ? "var(--accent-border)" : "var(--border)"}`, color: editando ? "var(--accent)" : "var(--text-muted)", borderRadius: 5, cursor: "pointer", fontSize: 11, padding: "3px 8px", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                      {editando ? "▲" : "✎"}
                    </button>
                    {confirmDel === x.id ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => { setCostosDirectos(p => p.filter(a => a.id !== x.id)); setConfirmDel(null); if (editando) { setEditId(null); setEditForm(null); } }}
                          style={{ padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070", fontFamily: "'DM Mono',monospace" }}>✓</button>
                        <button onClick={() => setConfirmDel(null)} style={{ padding: "3px 7px", borderRadius: 5, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDel(x.id)} style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
                    )}
                  </div>
                  {editando && editForm && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "10px 12px", background: "var(--bg-subtle)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Cantidad ({x.unidad})</div>
                        <input type="number" min="0.1" step="0.1" value={editForm.cantidad}
                          onChange={e => setEditForm(f => ({ ...f, cantidad: e.target.value }))}
                          style={{ ...inpSt, width: 90, textAlign: "right" }}
                          onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                          onBlur={e => e.target.style.borderColor = "var(--border)"} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Precio unit.</div>
                        <input type="number" min="0" value={editForm.precioUnit}
                          onChange={e => setEditForm(f => ({ ...f, precioUnit: e.target.value }))}
                          style={{ ...inpSt, width: 110, textAlign: "right" }}
                          onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                          onBlur={e => e.target.style.borderColor = "var(--border)"} />
                      </div>
                      <button onClick={() => {
                        const c2 = parseFloat(editForm.cantidad)  || x.cantidad;
                        const p2 = parseFloat(editForm.precioUnit) || x.precioUnit;
                        const pb = getPrecioRef(x.tipo, x.refId);
                        setCostosDirectos(prev => prev.map(a => a.id === x.id ? { ...a, cantidad: c2, precioUnit: p2, precioManual: p2 !== pb, subtotal: Math.round(c2 * p2) } : a));
                        setEditId(null); setEditForm(null);
                      }} style={{ padding: "8px 14px", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)" }}>✓ Confirmar</button>
                      <button onClick={() => { setEditId(null); setEditForm(null); }}
                        style={{ padding: "8px 12px", borderRadius: 7, cursor: "pointer", fontSize: 11, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>Cancelar</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pestañas de tipo */}
        <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
          {TIPOS.map(t => (
            <button key={t.id} onClick={() => { setTipoSel(t.id); setRefSel(""); setPrecio(""); }}
              style={{ padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, transition: "all 0.15s",
                background: tipoSel === t.id ? "var(--accent-soft)" : "transparent",
                border: tipoSel === t.id ? "1px solid var(--accent-border)" : "1px solid var(--border)",
                color: tipoSel === t.id ? "var(--accent)" : "var(--text-muted)" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Selector + cantidad + precio */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <select value={refSel} onChange={e => handleSelItem(e.target.value)} style={{ ...inpSt, flex: 1, minWidth: 140 }}>
            <option value="">— Seleccioná un ítem —</option>
            {(tipoActual?.items || []).map(it => (
              <option key={it.id} value={String(it.id)}>
                {it.nombre} — {fmtPeso(tipoSel === "material" ? it.precioM2 : it.precio)}/{tipoActual?.unidad}
              </option>
            ))}
          </select>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Cant. ({tipoActual?.unidad})</div>
            <input type="number" min="0.1" step="0.1" placeholder="1" value={cant}
              onChange={e => setCant(e.target.value)} style={{ ...inpSt, width: 80, textAlign: "right" }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Precio unit.</div>
            <input type="number" min="0" placeholder="auto" value={precio}
              onChange={e => setPrecio(e.target.value)} style={{ ...inpSt, width: 110, textAlign: "right" }} />
          </div>
          <button onClick={agregar} disabled={!refSel}
            style={{ padding: "8px 16px", borderRadius: 7, cursor: refSel ? "pointer" : "not-allowed", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, opacity: refSel ? 1 : 0.45, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
            + Agregar
          </button>
        </div>
      </div>
  );

  if (sinCard) return inner;
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", overflow: "visible" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)" }}>
          🔩 Costos directos del taller
        </span>
        {costosDirectos.length > 0 && <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(totalSeccion)}</span>}
      </div>
      {inner}
    </div>
  );
}

// ── SeccionAdicionales ────────────────────────────────────────────
// Gastos extra: flete, instalación, diseño, etc.
// Independiente de los módulos — no afecta Cortes ni Materiales.
// Integrado con costos.extrasFrecuentes para autocompletado.
function SeccionAdicionales({ adicionales, setAdicionales, costos, onGuardarFrecuente, sinCard = false }) {
  const [inputNombre, setInputNombre] = useState("");
  const [inputMonto, setInputMonto] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [toastNuevo, setToastNuevo] = useState(null); // nombre del extra nuevo para sugerir guardar

  const frecuentes = costos?.extrasFrecuentes || [];

  const filtrarSugerencias = (texto) => {
    if (!texto.trim() || texto.length < 2) { setSugerencias([]); return; }
    const hits = frecuentes.filter(f =>
      f.nombre.toLowerCase().includes(texto.toLowerCase())
    );
    setSugerencias(hits);
  };

  const seleccionarSugerencia = (f) => {
    setInputNombre(f.nombre);
    setInputMonto(String(f.precio));
    setSugerencias([]);
  };

  const agregar = () => {
    const nombre = inputNombre.trim();
    const monto = parseFloat(inputMonto) || 0;
    if (!nombre || monto <= 0) return;

    const nuevoExtra = { id: Date.now(), nombre, monto };
    setAdicionales(prev => [...prev, nuevoExtra]);

    // ¿Es nuevo (no está en frecuentes)? Sugerir guardarlo si tiene monto real
    const yaExiste = frecuentes.some(f => f.nombre.toLowerCase() === nombre.toLowerCase());
    if (!yaExiste && monto > 0 && nombre.length >= 3) {
      setToastNuevo({ nombre, precio: monto });
    }

    setInputNombre(""); setInputMonto(""); setSugerencias([]);
  };

  const [confirmDelExtra, setConfirmDelExtra] = useState(null);

  const inputSm = {
    fontFamily: "'DM Mono',monospace", fontSize: 13, padding: "7px 10px",
    background: "var(--bg-base)", border: "1px solid var(--border)",
    color: "var(--text-primary)", borderRadius: 7, outline: "none",
  };

  if (!setAdicionales) return null;

  const innerAd = (
    <div style={{ padding: "12px 16px" }}>
        {/* Lista de adicionales cargados */}
        {adicionales.length > 0 && (
          <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {adicionales.map(x => (
              <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg-subtle)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, flex: 1, color: "var(--text-primary)" }}>{x.nombre}</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(x.monto)}</span>
                {confirmDelExtra === x.id ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => { setAdicionales(prev => prev.filter(a => a.id !== x.id)); setConfirmDelExtra(null); }}
                      style={{ padding: "2px 7px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070" }}>✓</button>
                    <button onClick={() => setConfirmDelExtra(null)}
                      style={{ padding: "2px 6px", borderRadius: 4, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelExtra(x.id)}
                    style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Toast: sugerir guardar como frecuente */}
        {toastNuevo && (
          <div style={{ marginBottom: 10, padding: "9px 12px", borderRadius: 8, background: "rgba(200,160,42,0.10)", border: "1px solid rgba(200,160,42,0.30)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#c8a02a", flex: 1 }}>
              💡 <strong>"{toastNuevo.nombre}"</strong> no está en tus extras frecuentes. ¿Guardarlo para próximos presupuestos?
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { onGuardarFrecuente && onGuardarFrecuente(toastNuevo); setToastNuevo(null); }}
                style={{ padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(200,160,42,0.18)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a" }}>
                ✓ Guardar
              </button>
              <button onClick={() => setToastNuevo(null)}
                style={{ padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontSize: 11, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                No
              </button>
            </div>
          </div>
        )}

        {/* Formulario de ingreso con autocompletado */}
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140, position: "relative" }}>
              <input
                type="text" placeholder="Descripción (ej: Flete, Instalación...)"
                value={inputNombre}
                onChange={e => { setInputNombre(e.target.value); filtrarSugerencias(e.target.value); }}
                onKeyDown={e => e.key === "Enter" && agregar()}
                style={{ ...inputSm, width: "100%" }}
                onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                onBlur={e => { e.target.style.borderColor = "var(--border)"; setTimeout(() => setSugerencias([]), 180); }}
              />
              {/* Dropdown autocompletado */}
              {sugerencias.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.35)", overflow: "hidden" }}>
                  {sugerencias.map(f => (
                    <div key={f.id} onMouseDown={() => seleccionarSugerencia(f)}
                      style={{ padding: "9px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--accent-soft)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{f.nombre}</span>
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>{fmtPeso(f.precio)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>$</span>
              <input type="number" min="0" placeholder="Monto" value={inputMonto}
                onChange={e => setInputMonto(e.target.value)}
                onKeyDown={e => e.key === "Enter" && agregar()}
                style={{ ...inputSm, width: 110, textAlign: "right" }}
                onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
            </div>
            <button onClick={agregar}
              style={{ padding: "8px 16px", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", flexShrink: 0 }}>
              + Agregar
            </button>
          </div>
        </div>
      </div>
  );

  if (sinCard) return innerAd;
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "visible", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)" }}>
          🧾 Gastos Extras / Adicionales
        </span>
        {adicionales.length > 0 && (
          <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#7ecf8a" }}>
            {fmtPeso(adicionales.reduce((a, x) => a + x.monto, 0))}
          </span>
        )}
      </div>
      {innerAd}
    </div>
  );
}

// ── ModalEdicionModulo — Nivel 2 ──────────────────────────────────
// Edición rápida de dimensiones + material sin tocar el catálogo.
// Nivel 3 disponible via botón "Editar en Catálogo".
// ── Presupuesto ───────────────────────────────────────────────────
function Presupuesto({
  modulos,
  costos,
  items,
  setItems,
  dimOverride,
  setDimOverride,
  getModUsado,
  totalGeneral,
  presupuestos,
  onGuardarPresupuesto,
  onCargarPresupuesto,
  onEliminarPresupuesto,
  onCambiarEstado,
  onActualizarPresupuesto,
  onVerPresupuesto,
  costosVersion = 0,
  presupuestoParaEditar = null,
  onPresupuestoEditarConsumed,
  adicionales = [],
  setAdicionales,
  costosDirectos = [],
  setCostosDirectos,
  onGuardarExtraFrecuente,
  // Nivel 3: integración con catálogo
  onVerCatalogo,
  onVolverDesCatalogo,
  setModulos,
  hSaveModulos,
  onLimpiarTemps,   // limpia TEMP activos al cancelar el presupuesto
  onActualizarCatalogo,
  onGuardarModuloCatalogo,
  borradorRecuperado = false,
  onDismissBorrador,
}) {
  // LOGICA - Edición de Presupuestos Existentes
  // Cuando llega un presupuesto desde Vista Previa vía "Editar módulos",
  // lo cargamos en el estado activo y notificamos que fue consumido
  useEffect(() => {
    if (!presupuestoParaEditar) return;
    const { id, p } = presupuestoParaEditar;
    onCargarPresupuesto(p);
    setClienteActivo(p.cliente || { nombre: "", tel: "", dir: "" });
    setNombreTrabajo(p.nombre || "");
    setPresupuestoActivoId(id);
    if (typeof setCostosDirectos === "function")
      setCostosDirectos(Array.isArray(p.costosDirectos) ? [...p.costosDirectos] : []);
    onPresupuestoEditarConsumed && onPresupuestoEditarConsumed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presupuestoParaEditar]);
  const [inputCod, setInputCod] = useState("");
  const [inputCant, setInputCant] = useState(1);
  const [error, setError] = useState("");
  const [preDim, setPreDim] = useState(null);
  const [clienteActivo, setClienteActivo] = useState({ nombre: "", tel: "", dir: "" });
  const [nombreTrabajo, setNombreTrabajo] = useState("");
  const [presupuestoActivoId, setPresupuestoActivoId] = useState(null);
  const [dialogoGuardar, setDialogoGuardar] = useState(false);
  const { ToastContainer } = useUndo();
  const formRef = React.useRef(null);

  // LÓGICA - Global Sync: índice del módulo que se está editando (null = agregar nuevo)
  const [editandoModuloIdx, setEditandoModuloIdx] = useState(null);
  const [confirmDelModulo, setConfirmDelModulo] = useState(null);
  // Modal Nivel 2 de edición
  const [modalEdicion, setModalEdicion] = useState(null);
  const [pestañaActiva, setPestañaActiva] = useState("modulos");
  // Toggle visual por sección — no afecta el cálculo del total
  const [mostrarExtras, setMostrarExtras] = useState(true);
  const [mostrarCostosDirectos, setMostrarCostosDirectos] = useState(true);
  // Fix timing Nivel 3: pendingDeepLink espera que modulos[tempCod] exista
  // antes de navegar. El useEffect lo detecta después del re-render.
  const [pendingDeepLink, setPendingDeepLink] = useState(null);
  const [pendingDeepLinkContexto, setPendingDeepLinkContexto] = useState(null);

  useEffect(() => {
    if (!pendingDeepLink) return;
    if (modulos[pendingDeepLink]) {
      // Limpiar PRIMERO: si onVerCatalogo falla, el estado queda limpio
      const contexto = pendingDeepLinkContexto;
      setPendingDeepLink(null);
      setPendingDeepLinkContexto(null);
      onVerCatalogo && onVerCatalogo(pendingDeepLink, contexto);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDeepLink, modulos]);
  // Edición inline de extras frecuentes
  const [editandoExtraId, setEditandoExtraId] = useState(null);
  const [editandoExtraForm, setEditandoExtraForm] = useState(null);
  const [toastExtraSync, setToastExtraSync] = useState(null);

  // LÓGICA - Global Sync: actualiza el módulo en su posición original sin crear uno nuevo.
  // Dispara recálculo automático en Cortes, Caja y total del presupuesto.
  const handleUpdateModule = (cod, cant, dims) => {
    const modBase = modulos[cod];
    if (!modBase) return;
    const key = `${cod}-${items[editandoModuloIdx]?.id || 0}`;
    const nuevoItem = { ...items[editandoModuloIdx], codigo: cod, cantidad: cant };
    const nuevoItems = items.map((it, i) => i === editandoModuloIdx ? nuevoItem : it);
    const nuevoDimOverride = { ...dimOverride };
    if (dims) nuevoDimOverride[key] = dims;
    setItems(nuevoItems);
    setDimOverride(nuevoDimOverride);
    // Persistir si hay presupuesto activo — sincroniza Cortes y Caja automáticamente
    if (presupuestoActivoId) {
      const totalNuevo = nuevoItems.reduce((acc, item) => {
        const base = modulos[item.codigo]; if (!base) return acc;
        const d = nuevoDimOverride[`${item.codigo}-${item.id || 0}`] || base.dimensiones;
        const calc = calcularModulo({ ...base, dimensiones: d }, costos);
        return acc + (calc ? calc.total * item.cantidad : 0);
      }, 0);
      onActualizarPresupuesto && onActualizarPresupuesto(presupuestoActivoId, {
        items: nuevoItems,
        dimOverride: nuevoDimOverride,
        total: Math.round(totalNuevo),
      });
    }
    setEditandoModuloIdx(null);
    setInputCod(""); setInputCant(1); setPreDim(null); setError("");
  };

  // Detectar presupuesto desactualizado cuando se carga uno guardado
  const [alertaPrecios, setAlertaPrecios] = useState(null); // { idPres, totalOriginal, totalRecalculado }

  // Al cargar un presupuesto verificar si los precios cambiaron
  const verificarPrecios = (p, id) => {
    if (!p.items || p.items.length === 0) return;
    const totalRecalculado = p.items.reduce((acc, item) => {
      const base = modulos[item.codigo];
      if (!base) return acc;
      const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || base.dimensiones;
      const mod = { ...base, dimensiones: dims };
      const calc = calcularModulo(mod, costos);
      if (!calc) return acc;
      return acc + calc.total * item.cantidad;
    }, 0);
    const diff = Math.abs(totalRecalculado - p.total);
    if (diff > 1) { // diferencia mayor a $1 → precios cambiaron
      setAlertaPrecios({ id, totalOriginal: p.total, totalRecalculado: Math.round(totalRecalculado) });
    } else {
      setAlertaPrecios(null);
    }
  };

  const handleCargar = (p, id) => {
    onCargarPresupuesto(p);
    setClienteActivo(p.cliente || { nombre: "", tel: "", dir: "" });
    setNombreTrabajo(p.nombre || "");
    setPresupuestoActivoId(id || null);
    setAlertaPrecios(null);
    
    verificarPrecios(p, id);
  };

  const handleNuevoPresupuesto = () => {
    setItems([]);
    setClienteActivo({ nombre: "", tel: "", dir: "" });
    setNombreTrabajo("");
    setPresupuestoActivoId(null);
    setAlertaPrecios(null);
     // abre panel de cliente
  };

  const handleCodChange = (val) => {
    const cod = val.toUpperCase();
    setInputCod(cod);
    setError("");
    if (modulos[cod]) setPreDim({ ...modulos[cod].dimensiones });
    else setPreDim(null);
  };
  const agregar = () => {
    const cod = inputCod.trim().toUpperCase();
    if (!cod) {
      setError("Ingresá un código.");
      return;
    }
    const modBase = modulos[cod];
    if (!modBase) {
      setError(`"${cod}" no encontrado.`);
      return;
    }
    const cant = parseInt(inputCant) || 1;
    const nuevoId =
      Date.now().toString(36) + Math.random().toString(36).substring(2);
    const isCustom =
      preDim &&
      (preDim.ancho !== modBase.dimensiones.ancho ||
        preDim.profundidad !== modBase.dimensiones.profundidad ||
        preDim.alto !== modBase.dimensiones.alto);
    if (!isCustom) {
      const idx = items.findIndex(
        (i) =>
          i.codigo === cod &&
          !dimOverride[i.id || i.codigo] &&
          (!i.nota || i.nota.trim() === "")
      );
      if (idx >= 0) {
        const n = [...items];
        n[idx].cantidad += cant;
        setItems(n);
        setInputCod("");
        setInputCant(1);
        setPreDim(null);
        setError("");
        return;
      }
    }
    setItems([
      ...items,
      { id: nuevoId, codigo: cod, cantidad: cant, nota: "" },
    ]);
    if (isCustom) {
      setDimOverride((prev) => ({
        ...prev,
        [nuevoId]: {
          ancho: parseInt(preDim.ancho) || 0,
          profundidad: parseInt(preDim.profundidad) || 0,
          alto: parseInt(preDim.alto) || 0,
        },
      }));
    }
    setInputCod("");
    setInputCant(1);
    setPreDim(null);
    setError("");
    // Autoscroll suave al formulario
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* 1. Mis presupuestos */}
      <div className="no-print">
        <GestorPresupuestos
          presupuestos={presupuestos}
          onCargar={handleCargar}
          onNuevo={handleNuevoPresupuesto}
          onEliminar={onEliminarPresupuesto}
          onCambiarEstado={onCambiarEstado}
          totalActual={totalGeneral}
          itemsActual={items}
          nombreInicial={nombreTrabajo}
          clienteInicial={clienteActivo}
          onVer={onVerPresupuesto}
          itemsActivos={items}
          costosVersion={costosVersion}
          onActualizarPresupuesto={onActualizarPresupuesto}
          modulos={modulos}
          costos={costos}
        />
      </div>

      {/* 2. Tarjeta de trabajo activo — formulario siempre visible */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.22)" }}>

        {/* Banner borrador recuperado */}
        {borradorRecuperado && (
          <div style={{ padding: "10px 20px", background: "rgba(200,160,42,0.12)", borderBottom: "1px solid rgba(200,160,42,0.25)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 12, color: "#c8a02a", fontWeight: 600 }}>
              ↩ Borrador recuperado — tenés {items.length} módulo{items.length !== 1 ? "s" : ""} sin guardar
            </span>
            <button onClick={() => onDismissBorrador && onDismissBorrador()}
              style={{ fontSize: 11, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {/* Header con nombre del trabajo */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
              {nombreTrabajo || <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontWeight: 400 }}>Nuevo presupuesto</span>}
            </div>
            {clienteActivo.nombre && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                👤 {clienteActivo.nombre}{clienteActivo.tel && ` · ${clienteActivo.tel}`}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {(items.length > 0 || adicionales.length > 0) && (
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color: "#7ecf8a" }}>
                {fmtPeso(totalGeneral)}
              </span>
            )}
            {(items.length > 0 || adicionales.length > 0) && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {presupuestoActivoId && (() => {
                  const necesita = presupuestoNecesitaActualizacion(presupuestoActivoId, costosVersion, presupuestos[presupuestoActivoId]);
                  return necesita ? (
                    <button onClick={() => {
                      const pActivo = presupuestos[presupuestoActivoId];
                      const nuevoTotal = recalcularTotalPresupuesto(pActivo, modulos, costos);
                      if (nuevoTotal !== null) onActualizarPresupuesto(presupuestoActivoId, { total: Math.round(nuevoTotal), costosVersionAl: Date.now() });
                    }} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a" }}>
                      ↻ Actualizar
                    </button>
                  ) : null;
                })()}
                <button onClick={() => presupuestoActivoId ? setDialogoGuardar(true) : (() => {
                  onGuardarPresupuesto(nombreTrabajo || "Sin nombre", clienteActivo, "");
                  onLimpiarTemps && onLimpiarTemps(items); setItems([]); setDimOverride({}); setAdicionales([]); setCostosDirectos([]); setNombreTrabajo(""); setClienteActivo({ nombre: "", tel: "", dir: "" }); setPresupuestoActivoId(null); setAlertaPrecios(null); onDismissBorrador && onDismissBorrador();
                })()}
                  style={{ padding: "6px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)", boxShadow: "0 2px 8px rgba(180,100,20,0.25)" }}>
                  💾 Guardar
                </button>
                <button onClick={() => {
                  onLimpiarTemps && onLimpiarTemps(items); setItems([]); setDimOverride({}); setAdicionales([]); setCostosDirectos([]); setNombreTrabajo(""); setClienteActivo({ nombre: "", tel: "", dir: "" }); setPresupuestoActivoId(null); setAlertaPrecios(null); setEditandoModuloIdx(null); setInputCod(""); setPreDim(null); onDismissBorrador && onDismissBorrador();
                }} style={{ padding: "6px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "transparent", border: "1px solid rgba(200,60,60,0.30)", color: "#e07070" }}>
                  ✕ Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Formulario cliente — siempre visible */}
        <div style={{ padding: "14px 20px", background: "var(--bg-subtle)" }}>
          <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 10 }}>
            Datos del trabajo
          </div>
          <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 10 }}>
            <TextInput
              label="Nombre del trabajo *"
              placeholder="Ej: Cocina Rodríguez"
              small value={nombreTrabajo} onChange={setNombreTrabajo}
            />
            <TextInput label="Cliente" placeholder="Nombre del cliente" small value={clienteActivo.nombre} onChange={v => setClienteActivo(c => ({ ...c, nombre: v }))} />
            <TextInput label="Teléfono" placeholder="341 555-1234" small value={clienteActivo.tel} onChange={v => setClienteActivo(c => ({ ...c, tel: v }))} />
          </div>
          <TextInput label="Dirección de entrega" placeholder="Av. San Martín 456" small value={clienteActivo.dir} onChange={v => setClienteActivo(c => ({ ...c, dir: v }))} />
          {!nombreTrabajo.trim() && (
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
              * Completá el nombre del trabajo para habilitar la carga de módulos
            </div>
          )}
        </div>
      </div>

      {/* Diálogo guardar */}
      {dialogoGuardar && (
        <div style={{ padding: "16px 20px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--accent-border)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>💾 ¿Cómo querés guardar?</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>"{nombreTrabajo || "Sin nombre"}"</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => {
              onActualizarPresupuesto && onActualizarPresupuesto(presupuestoActivoId, { nombre: nombreTrabajo, cliente: clienteActivo, items: [...items], dimOverride: { ...dimOverride }, total: totalGeneral });
              setDialogoGuardar(false);
              setItems([]); setDimOverride({}); setNombreTrabajo(""); setClienteActivo({ nombre: "", tel: "", dir: "" }); setPresupuestoActivoId(null);
            }} style={{ padding: "8px 18px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
              ✓ Actualizar original
            </button>
            <button onClick={() => {
              onGuardarPresupuesto(nombreTrabajo || "Sin nombre", clienteActivo, "");
              setDialogoGuardar(false);
              setItems([]); setDimOverride({}); setNombreTrabajo(""); setClienteActivo({ nombre: "", tel: "", dir: "" }); setPresupuestoActivoId(null);
            }}
              style={{ padding: "8px 18px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              + Guardar como copia
            </button>
            <button onClick={() => setDialogoGuardar(false)}
              style={{ padding: "8px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Alerta precios */}
      {alertaPrecios && (
        <div style={{ padding: "12px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "rgba(200,160,42,0.10)", border: "1px solid rgba(200,160,42,0.30)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#c8a02a", marginBottom: 2 }}>⚠ Los precios cambiaron desde que se creó este presupuesto</div>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
              Original: {fmtPeso(alertaPrecios.totalOriginal)} → Recalculado: {fmtPeso(alertaPrecios.totalRecalculado)}
              <span style={{ marginLeft: 8, color: alertaPrecios.totalRecalculado > alertaPrecios.totalOriginal ? "#e07070" : "#7ecf8a", fontWeight: 700 }}>
                ({alertaPrecios.totalRecalculado > alertaPrecios.totalOriginal ? "+" : ""}{fmtPeso(alertaPrecios.totalRecalculado - alertaPrecios.totalOriginal)})
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setAlertaPrecios(null)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>Mantener</button>
            <button onClick={() => { if (alertaPrecios.id) onActualizarPresupuesto && onActualizarPresupuesto(alertaPrecios.id, { total: alertaPrecios.totalRecalculado }); setAlertaPrecios(null); }}
              style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a" }}>
              ✓ Actualizar precio
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          CUERPO DEL PRESUPUESTO
          Tarjeta contenedora para ítems ya agregados.
          Los formularios de carga quedan FUERA de esta card.
          ══════════════════════════════════════════════════════════ */}
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        boxShadow: "0 4px 28px rgba(0,0,0,0.30), 0 1px 4px rgba(0,0,0,0.20)",
        overflow: "hidden",
        minHeight: 120,
      }}>
        {/* Header de la card */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--separator)", background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text-muted)" }}>
            Ítems del presupuesto
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {/* Desglose del contador */}
            {(items.length > 0 || adicionales.length > 0 || costosDirectos.length > 0) && (
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
                {items.length} mód.
                {adicionales.length > 0 && ` · ${adicionales.length} extra${adicionales.length !== 1 ? "s" : ""}`}
                {costosDirectos.length > 0 && ` · ${costosDirectos.length} costo${costosDirectos.length !== 1 ? "s" : ""}`}
              </span>
            )}
            {/* Toggle 👁 extras */}
            {adicionales.length > 0 && (
              <button onClick={() => setMostrarExtras(v => !v)} title={mostrarExtras ? "Ocultar extras del resumen" : "Mostrar extras en el resumen"}
                style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", padding: "2px 8px", borderRadius: 5, cursor: "pointer", border: `1px solid ${mostrarExtras ? "var(--border)" : "rgba(200,160,42,0.40)"}`, background: mostrarExtras ? "transparent" : "rgba(200,160,42,0.10)", color: mostrarExtras ? "var(--text-muted)" : "#c8a02a", transition: "all 0.15s" }}>
                {mostrarExtras ? "👁 extras" : "👁 extras"}
              </button>
            )}
            {/* Toggle 👁 costos directos */}
            {costosDirectos.length > 0 && (
              <button onClick={() => setMostrarCostosDirectos(v => !v)} title={mostrarCostosDirectos ? "Ocultar costos directos del resumen" : "Mostrar costos directos en el resumen"}
                style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", padding: "2px 8px", borderRadius: 5, cursor: "pointer", border: `1px solid ${mostrarCostosDirectos ? "var(--border)" : "rgba(200,160,42,0.40)"}`, background: mostrarCostosDirectos ? "transparent" : "rgba(200,160,42,0.10)", color: mostrarCostosDirectos ? "var(--text-muted)" : "#c8a02a", transition: "all 0.15s" }}>
                {mostrarCostosDirectos ? "👁 costos" : "👁 costos"}
              </button>
            )}
          </div>
        </div>

        {/* Estado vacío */}
        {items.length === 0 && adicionales.length === 0 && costosDirectos.length === 0 && (
          <div style={{ padding: "52px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.18 }}>◻</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 400, letterSpacing: "0.01em", lineHeight: 1.6 }}>
              Agregue ítems al presupuesto
            </p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", opacity: 0.6, marginTop: 4 }}>
              Usá los formularios de arriba para sumar módulos o gastos extras
            </p>
          </div>
        )}

        {/* 3. Módulos cargados — acordeón inline para edición */}
        {items.length > 0 && (
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, idx) => {
            const keyId = item.id || item.codigo;
            const modUsado = getModUsado(item);
            if (!modUsado) return null;
            const calc = calcularModulo(modUsado, costos);
            if (!calc) return null;
            const modBase = modulos[item.codigo];
            const over = modUsado.dimensiones;
            const dimDif = modBase && (over.ancho !== modBase.dimensiones.ancho || over.profundidad !== modBase.dimensiones.profundidad || over.alto !== modBase.dimensiones.alto);
            const estaEditando = modalEdicion?.idx === idx;
            const esTemp = !!modBase?.temporal;

            return (
              <div key={keyId} style={{
                overflow: "hidden",
                borderBottom: estaEditando ? "none" : "1px solid rgba(255,255,255,0.04)",
                transition: "background 0.15s",
              }}>
                {/* Fila principal del módulo — misma grilla que extras y costos */}
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 16px" }}>
                  <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--accent)", whiteSpace: "nowrap", opacity: 0.7 }}>{item.codigo.startsWith("TEMP_") ? "VAR" : item.codigo}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {modUsado.nombre}
                      {esTemp && (
                        <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.30)", color: "#c8a02a", borderRadius: 3, padding: "1px 4px" }}>
                          ✦ temp
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: dimDif ? "var(--accent)" : "var(--text-muted)", marginTop: 1, opacity: 0.8 }}>
                      {over.ancho}×{over.profundidad}×{over.alto} · {TIPO_MAT[modUsado.material]}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <button onClick={() => setItems(its => its.map((it, i) => i === idx ? { ...it, cantidad: Math.max(1, it.cantidad - 1) } : it))}
                        style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.7 }}>−</button>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, minWidth: 18, textAlign: "center" }}>{item.cantidad}</span>
                      <button onClick={() => setItems(its => its.map((it, i) => i === idx ? { ...it, cantidad: it.cantidad + 1 } : it))}
                        style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.7 }}>+</button>
                    </div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "#7ecf8a", minWidth: 72, textAlign: "right" }}>
                      {fmtPeso(calc.total * item.cantidad)}
                    </span>
                    <button
                      onClick={() => {
                        if (estaEditando) {
                          // Revertir: eliminar la copia temporal y restaurar el item al original
                          if (modalEdicion?.tempCod && modalEdicion?.origenCodigo) {
                            const nuevosModulos = { ...modulos };
                            delete nuevosModulos[modalEdicion.tempCod];
                            setModulos && setModulos(nuevosModulos);
                            hSaveModulos && hSaveModulos(nuevosModulos); // persiste limpieza
                            setItems(its => its.map((it, i) =>
                              i === idx ? { ...it, codigo: modalEdicion.origenCodigo } : it
                            ));
                          }
                          setModalEdicion(null);
                          return;
                        }
                        // ── Crear copia del módulo INMEDIATAMENTE al abrir el acordeón ──
                        // Así tanto la edición rápida como el Nivel 3 trabajan sobre la misma copia.
                        // Nunca se toca el módulo original.
                        const modOrig = modulos[item.codigo];

                        // Si el ítem ya apunta a un TEMP existente, reutilizarlo
                        // conservando todos los cambios previos (piezas, dimensiones, etc.)
                        if (modOrig?.temporal) {
                          setModalEdicion({
                            item,
                            idx,
                            modBase:     modOrig,
                            dims:        { ...modOrig.dimensiones },
                            material:    modOrig.material || "melamina",
                            cantidad:    item.cantidad,
                            dialogoGuardar: false,
                            tempCod:     item.codigo,
                            origenCodigo: modOrig.origenCodigo || item.codigo,
                          });
                          return;
                        }

                        // Ítem apunta al original → crear copia TEMP
                        // El TEMP hereda todas las piezas y datos del original
                        const origenBase    = item.codigo;
                        const modOrigenReal = modOrig;

                        // Calcular número de variante incremental
                        const varianteN = Object.values(modulos).filter(m =>
                          m.origenCodigo === origenBase && m.temporal
                        ).length + 1;

                        const tempCod = `TEMP_${Date.now()}`;
                        const copiaInicial = {
                          ...modOrigenReal,
                          nombre: `${modOrigenReal?.nombre || origenBase} - Variante ${varianteN}`,
                          temporal:      true,
                          origenCodigo:  origenBase,
                          presupuestoId: presupuestoActivoId || null,
                          piezas:   (modOrigenReal?.piezas   || []).map(p => ({ ...p })),
                          herrajes: (modOrigenReal?.herrajes  || []).map(h => ({ ...h })),
                        };

                        // Si el ítem ya era un TEMP lo reutilizamos (ver bloque arriba).
                        // Llegando aquí siempre es un módulo original → crear TEMP nuevo.
                        setModulos && setModulos(prev => ({
                          ...prev,
                          [tempCod]: copiaInicial,
                        }));

                        // Redirigir el item del presupuesto a la copia
                        const nuevoItem = { ...item, codigo: tempCod };
                        setItems(its => its.map((it, i) => i === idx ? nuevoItem : it));

                        // Abrir el acordeón sobre la copia
                        setModalEdicion({
                          item: nuevoItem,    // item ya apunta a la copia
                          idx,
                          modBase: copiaInicial,
                          dims: { ...copiaInicial.dimensiones },
                          material: copiaInicial.material || "melamina",
                          cantidad: item.cantidad,
                          dialogoGuardar: false,
                          tempCod,            // guardamos el código para Nivel 3
                          origenCodigo: origenBase,
                        });
                      }}
                      title={estaEditando ? "Cerrar edición" : "Editar módulo (crea variante automática)"}
                      style={{
                        background: estaEditando ? "var(--accent-soft)" : "transparent",
                        border: `1px solid ${estaEditando ? "var(--accent-border)" : "var(--border)"}`,
                        color: estaEditando ? "var(--accent)" : "var(--text-muted)",
                        borderRadius: 5, cursor: "pointer", fontSize: 11, padding: "3px 8px",
                        fontFamily: "'DM Mono',monospace", fontWeight: 700,
                      }}>
                      {estaEditando ? "▲" : "✎"}
                    </button>
                    {confirmDelModulo === keyId ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => { setItems(its => its.filter((_, i) => i !== idx)); if (estaEditando) setModalEdicion(null); setConfirmDelModulo(null); }}
                          style={{ padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070", fontFamily: "'DM Mono',monospace" }}>✓</button>
                        <button onClick={() => setConfirmDelModulo(null)}
                          style={{ padding: "3px 7px", borderRadius: 5, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelModulo(keyId)}
                        style={{ background: "transparent", border: "1px solid rgba(200,60,60,0.22)", color: "#e07070", borderRadius: 5, cursor: "pointer", fontSize: 11, padding: "3px 8px" }}>×</button>
                    )}
                  </div>
                </div>

                {/* Acordeón nuevo flujo — copia automática, nunca toca el original */}
                {estaEditando && modalEdicion && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px", background: "rgba(0,0,0,0.12)" }}>

                    {/* Estado 1: edición de dimensiones */}
                    {!modalEdicion.dialogoGuardar && (
                      <>
                        <div style={{ fontSize: 11, color: "var(--accent)", fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 4, padding: "1px 6px", fontSize: 10 }}>COPIA</span>
                          Editás una copia — el original queda intacto
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>Dimensiones (mm)</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                            {[["Ancho", "ancho"], ["Prof.", "profundidad"], ["Alto", "alto"]].map(([label, key]) => (
                              <div key={key}>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4, textAlign: "center" }}>{label}</div>
                                <input type="number" min="1"
                                  value={modalEdicion.dims[key]}
                                  onChange={e => setModalEdicion(m => ({ ...m, dims: { ...m.dims, [key]: parseInt(e.target.value) || 0 } }))}
                                  style={{ width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, padding: "7px 8px", textAlign: "center", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-primary)", outline: "none" }}
                                  onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>Material</div>
                          <select value={modalEdicion.material}
                            onChange={e => setModalEdicion(m => ({ ...m, material: e.target.value }))}
                            style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontFamily: "'DM Mono',monospace", fontSize: 12, outline: "none" }}>
                            {Object.entries(TIPO_MAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={() => setModalEdicion(m => ({ ...m, dialogoGuardar: true }))}
                            style={{ flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)", boxShadow: "0 3px 10px rgba(180,100,20,0.25)" }}>
                            ✓ Confirmar cambio
                          </button>
                          <button onClick={() => {
                            // Cancelar: revertir al original y persistir limpieza
                            if (modalEdicion?.tempCod && modalEdicion?.origenCodigo) {
                              const nuevosModulos = { ...modulos };
                              delete nuevosModulos[modalEdicion.tempCod];
                              setModulos && setModulos(nuevosModulos);
                              hSaveModulos && hSaveModulos(nuevosModulos);
                              setItems(its => its.map((it, i) => i === idx ? { ...it, codigo: modalEdicion.origenCodigo } : it));
                            }
                            setModalEdicion(null);
                          }}
                            style={{ padding: "9px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>Cancelar</button>
                          <button onClick={() => {
                            // Nivel 3: actualiza las dims en la copia y setea el pendingDeepLink.
                            // El useEffect detectará cuando modulos[tempCod] exista y navegará.
                            const codigoCopia = modalEdicion.tempCod || item.codigo;
                            setModulos && setModulos(prev => ({
                              ...prev,
                              [codigoCopia]: {
                                ...prev[codigoCopia],
                                dimensiones: modalEdicion.dims,
                                material:    modalEdicion.material,
                              }
                            }));
                            // Setear pendingDeepLink — el useEffect navega cuando el módulo esté listo
                            setPendingDeepLink(codigoCopia);
                            // Guardar contexto de retorno para cierre completo del ciclo
                            setPendingDeepLinkContexto({
                              tipo:          "presupuesto",
                              presupuestoId: presupuestoActivoId,
                              itemIdx:       idx,
                              tempCod:       codigoCopia,
                            });
                            setModalEdicion(null);
                          }}
                            style={{ width: "100%", padding: "8px 0", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, background: "transparent", border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
                            🔧 Editar piezas en Catálogo (Nivel 3)
                          </button>
                        </div>
                      </>
                    )}

                    {/* Estado 2: modal de decisión */}
                    {modalEdicion.dialogoGuardar && (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>¿Dónde guardás este módulo editado?</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>La copia tiene las nuevas dimensiones. El original no fue tocado.</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

                          {/* Opción A: solo en este presupuesto — la copia ya existe */}
                          <button onClick={() => {
                            const tempCod = modalEdicion.tempCod || item.codigo;
                            // Actualizar dimensiones y material en la copia existente
                            const nuevosModulos = {
                              ...modulos,
                              [tempCod]: {
                                ...modulos[tempCod],
                                dimensiones: modalEdicion.dims,
                                material:    modalEdicion.material,
                              }
                            };
                            setModulos && setModulos(nuevosModulos);
                            hSaveModulos && hSaveModulos(nuevosModulos); // persiste TEMP actualizado
                            // Persistir presupuesto
                            if (presupuestoActivoId) {
                              const nuevoItems = items.map((it, i) => i === idx ? modalEdicion.item : it);
                              const totalNuevo = nuevoItems.reduce((acc, it) => {
                                const base = nuevosModulos[it.codigo];
                                if (!base) return acc;
                                const calc = calcularModulo(base, costos);
                                return acc + (calc ? calc.total * it.cantidad : 0);
                              }, 0);
                              onActualizarPresupuesto && onActualizarPresupuesto(presupuestoActivoId, {
                                items: nuevoItems,
                                total: Math.round(totalNuevo),
                              });
                            }
                            setModalEdicion(null);
                          }} style={{ padding: "10px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", fontSize: 12, fontWeight: 700 }}>
                            📋 Solo en este presupuesto
                            <div style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginTop: 2 }}>
                              El catálogo no cambia. Badge ✦ Temporal en el ítem.
                              Se borra automáticamente si eliminás el presupuesto.
                            </div>
                          </button>

                          {/* Opción B: guardar en catálogo */}
                          {!modalEdicion.pidiendonombre ? (
                            <button onClick={() => setModalEdicion(m => ({ ...m, pidiendonombre: true, nombreNuevo: `${modulos[item.codigo]?.nombre || item.codigo} (variante)` }))}
                              style={{ padding: "10px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700 }}>
                              📚 Guardar en catálogo como módulo nuevo
                              <div style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginTop: 2 }}>
                                Quedará disponible para futuros presupuestos. Podés darle un nombre.
                              </div>
                            </button>
                          ) : (
                            <div style={{ padding: "12px 14px", borderRadius: 8, background: "var(--bg-surface)", border: "1px solid var(--accent-border)" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>📚 Nombre en el catálogo:</div>
                              <input
                                value={modalEdicion.nombreNuevo || ""}
                                onChange={e => setModalEdicion(m => ({ ...m, nombreNuevo: e.target.value }))}
                                style={{ width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: "8px 10px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-primary)", outline: "none", marginBottom: 8 }}
                                placeholder="Nombre del nuevo módulo..."
                                autoFocus
                                onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                                onBlur={e => e.target.style.borderColor = "var(--border)"} />
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => {
                                  const modBase = modulos[item.codigo];
                                  const nombreFinal = (modalEdicion.nombreNuevo || "").trim() || `${modBase?.nombre} (variante)`;
                                  // Guardar permanentemente en catálogo
                                  const newId = onGuardarModuloCatalogo && onGuardarModuloCatalogo({
                                    ...modBase,
                                    dimensiones: modalEdicion.dims,
                                    material: modalEdicion.material,
                                  }, nombreFinal);
                                  // Actualizar el item para apuntar al nuevo módulo permanente
                                  const nuevoItem = { ...item, codigo: newId || item.codigo, cantidad: modalEdicion.cantidad || item.cantidad };
                                  const nuevoItems = items.map((it, i) => i === idx ? nuevoItem : it);
                                  setItems(nuevoItems);
                                  if (presupuestoActivoId) {
                                    onActualizarPresupuesto && onActualizarPresupuesto(presupuestoActivoId, { items: nuevoItems });
                                  }
                                  setModalEdicion(null);
                                }} style={{ flex: 1, padding: "8px 0", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)" }}>
                                  ✓ Confirmar y guardar
                                </button>
                                <button onClick={() => setModalEdicion(m => ({ ...m, pidiendonombre: false }))}
                                  style={{ padding: "8px 12px", borderRadius: 7, cursor: "pointer", fontSize: 11, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                                  ← Volver
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <button onClick={() => setModalEdicion(m => ({ ...m, dialogoGuardar: false }))}
                          style={{ marginTop: 8, width: "100%", padding: "6px 0", borderRadius: 6, cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 11 }}>← Volver a editar</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}

        {/* Adicionales — misma grilla que módulos, con toggle de visibilidad */}
        {adicionales.length > 0 && (
          <div style={{ padding: "0 16px 4px", opacity: mostrarExtras ? 1 : 0.45, transition: "opacity 0.2s" }}>
            {items.length > 0 && <div style={{ height: 1, background: "var(--separator)", margin: "0 0 4px", opacity: 0.5 }} />}
            {adicionales.map(x => {
              const editandoEste = editandoExtraId === x.id;
              const esFrecuente = (costos?.extrasFrecuentes || []).some(f => f.nombre.toLowerCase() === x.nombre.toLowerCase());
              return (
                <div key={x.id} style={{ borderBottom: editandoEste ? "none" : "1px solid rgba(255,255,255,0.04)", overflow: "hidden" }}>
                  {/* Fila principal — misma grilla que módulos */}
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", alignItems: "center", gap: 10, padding: "7px 4px" }}>
                    <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#c8a02a", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                      Extra
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.nombre}</span>
                    <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", textAlign: "right" }}>—</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "#7ecf8a", textAlign: "right", whiteSpace: "nowrap" }}>{fmtPeso(x.monto)}</span>
                    <div style={{ display: "flex", gap: 3, justifyContent: "flex-end" }}>
                      <button onClick={() => {
                        if (editandoEste) { setEditandoExtraId(null); setEditandoExtraForm(null); }
                        else { setEditandoExtraId(x.id); setEditandoExtraForm({ nombre: x.nombre, monto: String(x.monto) }); }
                      }} style={{ background: "none", border: "none", color: editandoEste ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontSize: 11, padding: "2px 5px", fontFamily: "'DM Mono',monospace", fontWeight: 700, opacity: 0.7 }}>
                        {editandoEste ? "▲" : "✎"}
                      </button>
                      {confirmDelModulo === `extra-${x.id}` ? (
                        <>
                          <button onClick={() => { setAdicionales(prev => prev.filter(a => a.id !== x.id)); setConfirmDelModulo(null); if (editandoEste) { setEditandoExtraId(null); setEditandoExtraForm(null); } }}
                            style={{ padding: "2px 7px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.35)", color: "#e07070", fontFamily: "'DM Mono',monospace" }}>✓</button>
                          <button onClick={() => setConfirmDelModulo(null)}
                            style={{ padding: "2px 6px", borderRadius: 4, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelModulo(`extra-${x.id}`)}
                          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, padding: "2px 4px", opacity: 0.5, lineHeight: 1 }}>×</button>
                      )}
                    </div>
                  </div>
                  {/* Acordeón edición — inline */}
                  {editandoEste && editandoExtraForm && (
                    <div style={{ padding: "8px 4px 10px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                      <input type="text" value={editandoExtraForm.nombre}
                        onChange={e => setEditandoExtraForm(f => ({ ...f, nombre: e.target.value }))}
                        style={{ flex: 1, minWidth: 120, fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 12, padding: "6px 10px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-primary)", outline: "none" }}
                        onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                        onBlur={e => e.target.style.borderColor = "var(--border)"} />
                      <input type="number" min="0" value={editandoExtraForm.monto}
                        onChange={e => setEditandoExtraForm(f => ({ ...f, monto: e.target.value }))}
                        style={{ width: 100, fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, padding: "6px 10px", textAlign: "right", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "#7ecf8a", outline: "none" }}
                        onFocus={e => e.target.style.borderColor = "#7ecf8a"}
                        onBlur={e => e.target.style.borderColor = "var(--border)"} />
                      <button onClick={() => {
                        const nuevoNombre = editandoExtraForm.nombre.trim();
                        const nuevoMonto = parseFloat(editandoExtraForm.monto) || 0;
                        setAdicionales(prev => prev.map(a => a.id === x.id ? { ...a, nombre: nuevoNombre, monto: nuevoMonto } : a));
                        if (esFrecuente && nuevoNombre !== x.nombre) {
                          setToastExtraSync({ viejo: x.nombre, nuevo: nuevoNombre, monto: nuevoMonto, id: x.id });
                        } else if (esFrecuente) {
                          onGuardarExtraFrecuente && onGuardarExtraFrecuente({ nombre: nuevoNombre, precio: nuevoMonto, actualizar: x.nombre });
                        }
                        setEditandoExtraId(null); setEditandoExtraForm(null);
                      }} style={{ padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)" }}>
                        ✓
                      </button>
                      <button onClick={() => { setEditandoExtraId(null); setEditandoExtraForm(null); }}
                        style={{ padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontSize: 11, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                    </div>
                  )}
                  {toastExtraSync?.id === x.id && (
                    <div style={{ margin: "0 4px 8px", padding: "8px 12px", borderRadius: 7, background: "rgba(200,160,42,0.10)", border: "1px solid rgba(200,160,42,0.25)", fontSize: 11, color: "#c8a02a" }}>
                      <div style={{ marginBottom: 6 }}>💡 ¿Actualizar "{x.nombre}" en tus recurrentes de Costos?</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { onGuardarExtraFrecuente && onGuardarExtraFrecuente({ nombre: toastExtraSync.nuevo, precio: toastExtraSync.monto, actualizar: toastExtraSync.viejo }); setToastExtraSync(null); }}
                          style={{ padding: "3px 10px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, background: "rgba(200,160,42,0.18)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a", fontFamily: "'DM Mono',monospace" }}>Actualizar</button>
                        <button onClick={() => setToastExtraSync(null)}
                          style={{ padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>No</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Costos directos — misma grilla que módulos, con botón × y toggle */}
        {costosDirectos.length > 0 && (
          <div style={{ padding: "0 16px 4px", opacity: mostrarCostosDirectos ? 1 : 0.45, transition: "opacity 0.2s" }}>
            {items.length > 0 || adicionales.length > 0
              ? <div style={{ height: 1, background: "var(--separator)", margin: "0 0 4px", opacity: 0.5 }} />
              : null}
            {costosDirectos.map(x => {
              const COLOR = { mo: "#9b7fd4", material: "#7090c0", herraje: "#c0906a", tapacanto: "#6aab8e" };
              const LABEL = { mo: "Mano de obra", material: "Material", herraje: "Herraje", tapacanto: "Tapacanto" };
              return (
                <div key={x.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", alignItems: "center", gap: 10, padding: "7px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: COLOR[x.tipo], textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                    {LABEL[x.tipo]}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.nombre}</span>
                  <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", textAlign: "right", whiteSpace: "nowrap" }}>
                    {x.cantidad} {x.unidad}
                  </span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "#7ecf8a", textAlign: "right", whiteSpace: "nowrap" }}>{fmtPeso(x.subtotal)}</span>
                  {/* Botón × con confirmación */}
                  <div style={{ display: "flex", gap: 3, justifyContent: "flex-end" }}>
                    {confirmDelModulo === `cd-${x.id}` ? (
                      <>
                        <button onClick={() => { setCostosDirectos(prev => prev.filter(a => a.id !== x.id)); setConfirmDelModulo(null); }}
                          style={{ padding: "2px 7px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.35)", color: "#e07070", fontFamily: "'DM Mono',monospace" }}>✓</button>
                        <button onClick={() => setConfirmDelModulo(null)}
                          style={{ padding: "2px 6px", borderRadius: 4, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDelModulo(`cd-${x.id}`)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, padding: "2px 4px", opacity: 0.5, lineHeight: 1 }}>×</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {(items.length > 0 || adicionales.length > 0 || costosDirectos.length > 0) && (
          <div style={{ borderTop: "1px solid var(--separator)", marginTop: 4 }}>
            <BarraTotal
              items={items}
              modulos={modulos}
              costos={costos}
              getModUsado={getModUsado}
              totalGeneral={totalGeneral}
              nombrePresupuesto={nombreTrabajo}
              descuento={presupuestoActivoId ? (presupuestos[presupuestoActivoId]?.descuento || 0) : 0}
              gananciaExtra={presupuestoActivoId ? (presupuestos[presupuestoActivoId]?.gananciaExtra || 0) : 0}
              adicionales={adicionales}
              costosDirectos={costosDirectos}
              mostrarExtras={mostrarExtras}
              mostrarCostosDirectos={mostrarCostosDirectos}
            />
          </div>
        )}
      </div>{/* fin card Cuerpo del Presupuesto */}

      {/* Bloqueo visual si no hay nombre Y no hay ítems cargados */}
      {!nombreTrabajo.trim() && items.length === 0 && adicionales.length === 0 && costosDirectos.length === 0 && (
        <div style={{
          padding: "18px 20px", borderRadius: 12,
          background: "var(--bg-surface)", border: "1px dashed var(--border)",
          textAlign: "center", color: "var(--text-muted)",
        }}>
          <div style={{ fontSize: 13, fontStyle: "italic" }}>
            Completá el nombre del trabajo para agregar módulos y gastos
          </div>
        </div>
      )}

      {/* ══ Card unificada de carga — 3 pestañas ══ */}
      {(nombreTrabajo.trim() || items.length > 0 || adicionales.length > 0 || costosDirectos.length > 0) && (<>

      <div ref={formRef} style={{
        background: "var(--bg-surface)",
        border: editandoModuloIdx !== null ? "1.5px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "0 4px 24px rgba(0,0,0,0.28)",
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}>

        {/* ── Barra de pestañas ── */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-subtle)",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}>
          {[
            { id: "modulos",  label: "📦 Módulos"        },
            { id: "costos",   label: "🔩 Costos directos" },
            { id: "extras",   label: "🧾 Extras"          },
          ].map(tab => (
            <button key={tab.id} onClick={() => setPestañaActiva(tab.id)}
              style={{
                flexShrink: 0,
                padding: "11px 18px",
                border: "none",
                borderBottom: pestañaActiva === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                background: "transparent",
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "'DM Mono',monospace",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: pestañaActiva === tab.id ? "var(--accent)" : "var(--text-muted)",
                transition: "color 0.15s, border-color 0.15s",
                whiteSpace: "nowrap",
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Contenido de pestaña: Módulos ── */}
        {pestañaActiva === "modulos" && (
          <div style={{ padding: "16px 20px" }}>
            {/* Indicador de modo edición */}
            {editandoModuloIdx !== null && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "7px 12px", background: "var(--accent-soft)", borderRadius: 7, border: "1px solid var(--accent-border)" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", fontFamily: "'DM Mono',monospace" }}>
                  ✎ Editando módulo #{editandoModuloIdx + 1} — {inputCod}
                </span>
                <button onClick={() => { setEditandoModuloIdx(null); setInputCod(""); setInputCant(1); setPreDim(null); setError(""); }}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
                  ✕ Cancelar edición
                </button>
              </div>
            )}
            <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 100px auto", gap: 12, alignItems: "end" }}>
              <div>
                <TextInput label="Código de módulo" placeholder="MC001" value={inputCod} onChange={handleCodChange} />
                {error && <p style={{ color: "#e07070", fontSize: 12, marginTop: 5 }}>⚠ {error}</p>}
              </div>
              <TextInput label="Cantidad" type="number" value={inputCant} onChange={setInputCant} />
              <div>
                {editandoModuloIdx !== null
                  ? <Btn onClick={() => handleUpdateModule(inputCod, parseInt(inputCant) || 1, preDim)}>Actualizar</Btn>
                  : <Btn onClick={agregar}>Agregar</Btn>
                }
              </div>
            </div>
            {preDim && (
              <div style={{ marginTop: 14, padding: 14, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 10 }}>
                  ✎ Dimensiones para {inputCod} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(editables antes de agregar)</span>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {["ancho", "profundidad", "alto"].map(dim => (
                    <div key={dim} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{dim}</label>
                      <input type="number" value={preDim[dim]} onChange={e => setPreDim(p => ({ ...p, [dim]: parseInt(e.target.value) || 0 }))}
                        style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, padding: "6px 10px", background: "var(--bg-base)", border: "1px solid var(--accent-border)", color: "var(--text-primary)", borderRadius: 6, outline: "none", width: 90 }} />
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>mm</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <PanelSelectorModulos modulos={modulos} onSeleccionar={cod => handleCodChange(cod)} />
          </div>
        )}

        {/* ── Contenido de pestaña: Costos directos ── */}
        {pestañaActiva === "costos" && (
          <SeccionCostosDirectos
            costosDirectos={costosDirectos}
            setCostosDirectos={setCostosDirectos}
            costos={costos}
            sinCard
          />
        )}

        {/* ── Contenido de pestaña: Extras ── */}
        {pestañaActiva === "extras" && (
          <SeccionAdicionales
            adicionales={adicionales}
            setAdicionales={setAdicionales}
            costos={costos}
            onGuardarFrecuente={onGuardarExtraFrecuente}
            sinCard
          />
        )}

      </div>
      </>)}{/* fin secciones de carga */}

      <ToastContainer />


    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 10. VISTA PREVIA
// ══════════════════════════════════════════════════════════════════
// ── VistaPrevia ───────────────────────────────────────────────────
function VistaPrevia({
  items, modulos, costos, onLimpiar, getModUsado,
  totalGeneral, presupuestos, perfil,
  onActualizarPresupuesto, onCambiarEstado, onCargarPresupuesto,
  presupuestoSelId, onSeleccionarPresupuesto,
  costosVersion = 0,
  onVerRentabilidad,
  onEditarModulos,
}) {
  const entries = Object.entries(presupuestos).sort((a, b) => b[0] - a[0]);
  const [presSelIdLocal, setPresSelIdLocal] = useState(presupuestoSelId || null);
  const presSelId = presupuestoSelId !== undefined ? presupuestoSelId : presSelIdLocal;
  const setPresSelId = (id) => {
    setPresSelIdLocal(id);
    if (onSeleccionarPresupuesto) onSeleccionarPresupuesto(id);
  };
  const [mostrarLista, setMostrarLista] = useState(!presupuestoSelId);
  const [mostrarPrecioUnitario, setMostrarPrecioUnitario] = useState(true);
  const [temaPDF, setTemaPDF] = useState(() => {
    try { return localStorage.getItem("carpicalc:temaPDF") || "dorado"; }
    catch { return "dorado"; }
  });

  const cambiarTema = (t) => {
    setTemaPDF(t);
    try { localStorage.setItem("carpicalc:temaPDF", t); } catch {}
  };
  const [whatsappCopiado, setWhatsappCopiado] = useState(false);
  const [guardandoTexto, setGuardandoTexto] = useState(false);

  useEffect(() => {
    if (presupuestoSelId) setMostrarLista(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const presSel = presSelId ? presupuestos[presSelId] : null;
  const [textoApertura, setTextoApertura] = useState("");
  const [condiciones, setCondiciones] = useState("");

  // UI - Campos de Ajuste: sincronizados bidireccionalmente con Caja
  // Se leen del presupuesto al seleccionarlo y se guardan al cambiar (onBlur)
  const [descuentoVP, setDescuentoVP] = useState("");
  const [gananciaExtraVP, setGananciaExtraVP] = useState("");

  useEffect(() => {
    if (presSel) {
      setTextoApertura(presSel.textoApertura || perfil?.textoApertura || "");
      setCondiciones(presSel.condiciones || perfil?.condiciones || "");
      // Sincronización: cargar ajustes desde el presupuesto seleccionado
      setDescuentoVP(presSel.descuento ?? "");
      setGananciaExtraVP(presSel.gananciaExtra ?? "");
      setMostrarLista(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presSelId]);

  const guardarTextos = () => {
    if (!presSelId) return;
    const prevTotal = presSel.total;
    const cambios = { textoApertura, condiciones };
    // Historial si cambió el total
    if (presSel.total !== prevTotal) {
      cambios.historialVersiones = [
        ...(presSel.historialVersiones || []),
        { fecha: Date.now(), total: presSel.total }
      ].slice(-5);
    }
    onActualizarPresupuesto(presSelId, cambios);
    setGuardandoTexto(true);
    setTimeout(() => setGuardandoTexto(false), 1800);
  };

  const handleWhatsApp = () => {
    if (!presSel) return;
    const txt = generarTextoWhatsApp(
      presSel.items, modulos, costos,
      (item) => { const base = modulos[item.codigo]; const dims = (presSel.dimOverride && presSel.dimOverride[`${item.codigo}-${item.id||0}`]) || base?.dimensiones; return { ...base, dimensiones: dims }; },
      presSel.total, presSel.nombre, presSel.cliente
    );
    navigator.clipboard.writeText(txt).then(() => { setWhatsappCopiado(true); setTimeout(() => setWhatsappCopiado(false), 2500); });
  };

  const handlePDF = () => {
    if (!presSel) return;
    const getModUsadoLocal = (item) => {
      const base = modulos[item.codigo];
      const dims = (presSel.dimOverride && presSel.dimOverride[`${item.codigo}-${item.id||0}`]) || base?.dimensiones;
      return { ...base, dimensiones: dims };
    };
    imprimirPresupuesto(presSel.items, modulos, costos, getModUsadoLocal, presSel.total, presSel.nombre, mostrarPrecioUnitario, presSel.cliente, textoApertura, condiciones, presSel.descuento || 0, presSel.gananciaExtra || 0, temaPDF, presSel.adicionales || []);
  };

  const estSel = presSel ? (ESTADOS_TRABAJO.find(e => e.id === (presSel.estado || "nuevo")) || ESTADOS_TRABAJO[0]) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <SectionTitle sub="Editá y enviá tus presupuestos guardados">
          Vista Previa
        </SectionTitle>
        {presSelId && (
          <button onClick={() => { setPresSelId(null); setMostrarLista(true); if (onSeleccionarPresupuesto) onSeleccionarPresupuesto(null); }}
            style={{ padding: "6px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "transparent", border: "1px solid rgba(200,60,60,0.25)", color: "#e07070", flexShrink: 0, marginTop: 4 }}>
            ✕ Limpiar vista
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", borderRadius: 12, border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
          <div style={{ marginBottom: 18, opacity: 0.7 }} dangerouslySetInnerHTML={{ __html: `<svg width="52" height="52" viewBox="0 0 52 52" fill="none"><rect x="10" y="8" width="32" height="36" rx="6" stroke="var(--accent)" stroke-width="1.5" opacity="0.5"/><line x1="18" y1="20" x2="34" y2="20" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/><line x1="18" y1="27" x2="34" y2="27" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/><line x1="18" y1="34" x2="26" y2="34" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" opacity="0.25"/></svg>` }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Sin presupuestos guardados</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>Todavía no hay nada acá.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>Guardá uno desde <strong style={{ color: "var(--accent)" }}>📋 Presupuesto</strong>.</p>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }} className="vp-layout">
          {/* ── Panel izquierdo: lista de trabajos ── */}
          <div className={`vp-lista ${!mostrarLista ? "vp-lista-hidden" : ""}`} style={{
            width: 260, flexShrink: 0, background: "var(--bg-surface)",
            border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden",
            boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
          }}>
            {/* Header con contador */}
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", background: "var(--accent-soft)" }}>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--accent)" }}>
                {entries.length} presupuestos
              </div>
            </div>

            {entries.map(([id, p]) => {
              const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
              const activo = presSelId === id;
              const tv = calcularTotalVisual(p.total, p.descuento, p.gananciaExtra);
              return (
                <div key={id} onClick={() => setPresSelId(id)} style={{
                  cursor: "pointer", transition: "all 0.18s",
                  borderBottom: "1px solid var(--separator)",
                  background: activo ? "var(--accent-soft)" : "transparent",
                  borderLeft: `3px solid ${activo ? "var(--accent)" : "transparent"}`,
                }}
                  onMouseEnter={e => { if (!activo) e.currentTarget.style.background = "var(--bg-subtle)"; }}
                  onMouseLeave={e => { if (!activo) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Precio arriba — pequeño, ancho completo */}
                  <div style={{
                    padding: "6px 14px 0",
                    fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
                    color: tv.hayDescuento ? "var(--text-muted)" : "#7ecf8a",
                    textDecoration: tv.hayDescuento ? "line-through" : "none",
                    opacity: tv.hayDescuento ? 0.55 : 1,
                    letterSpacing: "0.02em",
                  }}>
                    {fmtPeso(p.total)}
                  </div>
                  {tv.hayDescuento && (
                    <div style={{ padding: "2px 14px 0", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "#7ecf8a" }}>
                      {fmtPeso(tv.totalFinal)}
                    </div>
                  )}

                  {/* Título y nombre del cliente */}
                  <div style={{ padding: "5px 14px 8px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: activo ? "var(--accent)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
                      {p.nombre}
                    </div>
                    {p.cliente?.nombre && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>
                        {p.cliente.nombre}
                      </div>
                    )}
                    {/* Estado */}
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, background: `${est.color}20`, color: est.color, border: `1px solid ${est.color}30`, borderRadius: 3, padding: "1px 5px", fontFamily: "'DM Mono',monospace" }}>
                        {est.icon} {est.label}
                      </span>
                    </div>
                    {/* Última fila: Rentabilidad + Editar */}
                    <div style={{ display: "flex", gap: 5 }}>
                      {onVerRentabilidad && (
                        <button
                          onClick={e => { e.stopPropagation(); onVerRentabilidad(id); }}
                          title="Ver rentabilidad en Caja"
                          style={{
                            flex: 1, padding: "4px 0", borderRadius: 5, cursor: "pointer",
                            fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                            background: "rgba(134,200,150,0.15)",
                            border: "1px solid rgba(134,200,150,0.35)",
                            color: "#6db885",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(134,200,150,0.28)"}
                          onMouseLeave={e => e.currentTarget.style.background = "rgba(134,200,150,0.15)"}
                        >
                          Rentabilidad
                        </button>
                      )}
                      {onEditarModulos && (
                        <button
                          onClick={e => { e.stopPropagation(); onEditarModulos(id, p); }}
                          title="Editar módulos de este presupuesto"
                          style={{
                            flex: 1, padding: "4px 0", borderRadius: 5, cursor: "pointer",
                            fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                            background: "var(--accent-soft)",
                            border: "1px solid var(--accent-border)",
                            color: "var(--accent)", transition: "all 0.15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(212,175,55,0.20)"}
                          onMouseLeave={e => e.currentTarget.style.background = "var(--accent-soft)"}
                        >
                          ✎ Editar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Panel derecho: documento ── */}
          <div className={`vp-doc ${mostrarLista && !presSel ? "vp-doc-hidden" : ""}`} style={{ flex: 1, minWidth: 0 }}>
            {!presSel ? (
              <div style={{ textAlign: "center", padding: "60px 20px", borderRadius: 16, border: "1px dashed var(--border)", color: "var(--text-muted)", background: "var(--bg-subtle)" }}>
                <div style={{ marginBottom: 18, opacity: 0.7 }} dangerouslySetInnerHTML={{ __html: `<svg width="52" height="52" viewBox="0 0 52 52" fill="none"><path d="M16 26l10 10 18-18" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/><circle cx="26" cy="26" r="18" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.25"/></svg>` }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Seleccioná un presupuesto</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>Elegí uno de la lista para ver el detalle</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Botón volver mobile */}
                <button className="vp-back" onClick={() => setMostrarLista(true)}
                  style={{ display: "none", alignSelf: "flex-start", padding: "6px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", marginBottom: 4 }}>
                  ← Lista de presupuestos
                </button>

                {/* ── Toolbar — Estado + Actualizar + Tema PDF ── */}
                <div style={{
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  borderRadius: 12, overflow: "hidden",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
                }}>
                  {/* ROW 1 — ESTADO */}
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                    <select
                      value={presSel.estado || "nuevo"}
                      onChange={e => onCambiarEstado(presSelId, e.target.value)}
                      style={{
                        width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 12,
                        padding: "9px 12px", borderRadius: 8, cursor: "pointer",
                        outline: "none", fontWeight: 700, letterSpacing: "0.04em",
                        background: `${estSel.color}14`,
                        border: `1.5px solid ${estSel.color}50`,
                        color: estSel.color,
                      }}>
                      {ESTADOS_TRABAJO.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
                    </select>
                  </div>

                  {/* ROW 2 — CONFIGURACIÓN: tema PDF + actualizar */}
                  <div style={{ padding: "8px 14px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: "var(--bg-subtle)" }}>
                    <select value={temaPDF} onChange={e => cambiarTema(e.target.value)}
                      title="Tema de color del PDF"
                      style={{
                        fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 600,
                        padding: "5px 8px", borderRadius: 6, cursor: "pointer", outline: "none",
                        background: "transparent", border: "1px solid var(--border)",
                        color: "var(--text-muted)", flex: 1, minWidth: 90,
                      }}>
                      <option value="dorado">🟡 Dorado</option>
                      <option value="gris">⬜ Gris Perla</option>
                      <option value="carbon">⬛ Carbón</option>
                      <option value="bosque">🟢 Bosque</option>
                      <option value="marino">🔵 Marino</option>
                      <option value="bordo">🟥 Burdeos</option>
                    </select>
                    <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }} />
                    {(() => {
                      const necesita = presSelId && presupuestoNecesitaActualizacion(presSelId, costosVersion, presSel);
                      return (
                        <button
                          disabled={!necesita}
                          onClick={() => {
                            // Recalcula módulos
                            const nuevoTotalModulos = recalcularTotalPresupuesto(presSel, modulos, costos);
                            // Recalcula costos directos vinculados (usa precio actual de la tabla)
                            const PRECIO_REF = (tipo, refId) => {
                              const tabla = { mo: costos?.manoDeObra, material: costos?.materiales, herraje: costos?.herrajes, tapacanto: costos?.tapacanto };
                              const it = (tabla[tipo] || []).find(x => String(x.id) === String(refId));
                              if (!it) return null;
                              return tipo === "material" ? it.precioM2 : it.precio;
                            };
                            const nuevosCostosDirectos = (presSel.costosDirectos || []).map(x => {
                              if (x.precioManual) return x; // precio sobreescrito manualmente → no tocar
                              const precActual = PRECIO_REF(x.tipo, x.refId);
                              if (!precActual) return x;
                              return { ...x, precioUnit: precActual, subtotal: Math.round(x.cantidad * precActual) };
                            });
                            const totalCD = nuevosCostosDirectos.reduce((a, x) => a + (x.subtotal || 0), 0);
                            const totalAd = (presSel.adicionales || []).reduce((a, x) => a + (parseFloat(x.monto) || 0), 0);
                            const nuevoTotal = (nuevoTotalModulos || 0) + totalCD + totalAd;
                            onActualizarPresupuesto(presSelId, {
                              total: Math.round(nuevoTotal),
                              costosVersionAl: Date.now(),
                              costosDirectos: nuevosCostosDirectos,
                            });
                          }}
                          title={necesita ? "Costos actualizados — recalculá el precio" : "Precio al día"}
                          style={{
                            padding: "5px 10px", borderRadius: 6, fontSize: 11,
                            fontFamily: "'DM Mono',monospace", fontWeight: 700,
                            cursor: necesita ? "pointer" : "default",
                            background: necesita ? "rgba(200,160,42,0.15)" : "transparent",
                            border: `1px solid ${necesita ? "rgba(200,160,42,0.40)" : "transparent"}`,
                            color: necesita ? "#c8a02a" : "var(--text-muted)",
                            opacity: necesita ? 1 : 0.35,
                            transition: "all 0.2s", whiteSpace: "nowrap",
                          }}>
                          ↻ Actualizar
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* Historial de versiones */}
                {(presSel.historialVersiones || []).length > 0 && (
                  <div style={{ padding: "8px 14px", background: "rgba(200,160,42,0.08)", border: "1px solid rgba(200,160,42,0.20)", borderRadius: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--accent)", fontWeight: 700 }}>Versiones anteriores:</span>
                    {(presSel.historialVersiones || []).map((v, i) => (
                      <span key={i} style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
                        {fmtFecha(v.fecha)}: {fmtPeso(v.total)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ajustes de precio */}
                {(() => {
                  const descuentoActual = parseFloat(presSel.descuento) || 0;
                  const gananciaActual  = parseFloat(presSel.gananciaExtra) || 0;
                  const totalAjustadoVP = presSel.total + gananciaActual - descuentoActual;
                  const guardarAjuste = (d, g) => {
                    onActualizarPresupuesto(presSelId, {
                      descuento: parseFloat(d) || 0,
                      gananciaExtra: parseFloat(g) || 0,
                    });
                  };
                  return (
                    <div style={{
                      background: "var(--bg-surface)", border: "1px solid var(--border)",
                      borderRadius: 12, overflow: "hidden",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
                    }}>
                      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
                          💲 Ajustes de precio
                        </span>
                        {(descuentoActual > 0 || gananciaActual > 0) && (
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 900, color: "#7ecf8a" }}>
                            Total ajustado: {fmtPeso(totalAjustadoVP)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 0 }}>
                        <div style={{ flex: 1, padding: "10px 14px", borderRight: "1px solid var(--border)", background: descuentoActual > 0 ? "rgba(224,112,112,0.06)" : "transparent" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 13 }}>🏷</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>Descuento</span>
                            <span style={{ fontSize: 12, color: "#e07070", fontWeight: 900, fontFamily: "'DM Mono',monospace" }}>−</span>
                          </div>
                          <input type="number" min="0" value={descuentoVP} placeholder="0"
                            onChange={e => setDescuentoVP(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && guardarAjuste(descuentoVP, gananciaExtraVP)}
                            style={{ width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, padding: "6px 10px", textAlign: "right", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "#e07070", outline: "none" }}
                            onFocus={e => e.target.style.borderColor = "#e07070"} />
                          <button onClick={() => guardarAjuste(descuentoVP, gananciaExtraVP)}
                            style={{ marginTop: 6, width: "100%", padding: "5px 0", borderRadius: 6, cursor: "pointer", background: parseFloat(descuentoVP) !== parseFloat(presSel?.descuento || 0) ? "rgba(224,112,112,0.18)" : "var(--bg-base)", border: `1px solid ${parseFloat(descuentoVP) !== parseFloat(presSel?.descuento || 0) ? "#e07070" : "var(--border)"}`, color: "#e07070", fontSize: 13, fontWeight: 700 }}>
                            ✓ Confirmar
                          </button>
                        </div>
                        <div style={{ flex: 1, padding: "10px 14px", background: gananciaActual > 0 ? "rgba(126,207,138,0.06)" : "transparent" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 13 }}>💵</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>Ganancia extra</span>
                            <span style={{ fontSize: 12, color: "#7ecf8a", fontWeight: 900, fontFamily: "'DM Mono',monospace" }}>+</span>
                          </div>
                          <input type="number" min="0" value={gananciaExtraVP} placeholder="0"
                            onChange={e => setGananciaExtraVP(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && guardarAjuste(descuentoVP, gananciaExtraVP)}
                            style={{ width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, padding: "6px 10px", textAlign: "right", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "#7ecf8a", outline: "none" }}
                            onFocus={e => e.target.style.borderColor = "#7ecf8a"} />
                          <button onClick={() => guardarAjuste(descuentoVP, gananciaExtraVP)}
                            style={{ marginTop: 6, width: "100%", padding: "5px 0", borderRadius: 6, cursor: "pointer", background: parseFloat(gananciaExtraVP) !== parseFloat(presSel?.gananciaExtra || 0) ? "rgba(126,207,138,0.18)" : "var(--bg-base)", border: `1px solid ${parseFloat(gananciaExtraVP) !== parseFloat(presSel?.gananciaExtra || 0) ? "#7ecf8a" : "var(--border)"}`, color: "#7ecf8a", fontSize: 13, fontWeight: 700 }}>
                            ✓ Confirmar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Texto de apertura */}
                <div style={{
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "14px 16px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
                }}>
                  <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>
                    📝 Texto de apertura
                  </div>
                  <textarea value={textoApertura} onChange={e => setTextoApertura(e.target.value)}
                    placeholder="Ej: Estimado cliente, le hacemos llegar el presente presupuesto..."
                    rows={3}
                    style={{ width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: "9px 12px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 8, outline: "none", resize: "vertical", lineHeight: 1.6 }}
                    onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"} />
                </div>

                {/* Toggle P. unit. — justo encima del listado de módulos */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", background: "var(--bg-subtle)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>Mostrar precio unitario</span>
                  <ToggleSwitch value={mostrarPrecioUnitario} onChange={setMostrarPrecioUnitario} label="" />
                </div>

                {/* Resumen del presupuesto */}
                <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.22)" }}>
                  <ResumenPresupuesto
                    items={presSel.items}
                    modulos={modulos}
                    costos={costos}
                    getModUsado={(item) => {
                      const base = modulos[item.codigo];
                      const dims = (presSel.dimOverride && presSel.dimOverride[`${item.codigo}-${item.id||0}`]) || base?.dimensiones;
                      return { ...base, dimensiones: dims };
                    }}
                    totalGeneral={presSel.total}
                    mostrarPrecioUnitario={mostrarPrecioUnitario}
                    nombrePresupuesto={presSel.nombre}
                    descuento={presSel.descuento || 0}
                    gananciaExtra={presSel.gananciaExtra || 0}
                  />
                </div>

                {/* Condiciones editables */}
                <div style={{
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "14px 16px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
                }}>
                  <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>
                    📋 Condiciones y observaciones
                  </div>
                  <textarea value={condiciones} onChange={e => setCondiciones(e.target.value)}
                    placeholder="Ej: Validez 15 días. Precios sin IVA. Seña del 40% para iniciar fabricación."
                    rows={3}
                    style={{ width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: "9px 12px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 8, outline: "none", resize: "vertical", lineHeight: 1.6 }}
                    onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"} />
                </div>

                {/* Fila inferior: WhatsApp + PDF + Guardar cambios — alineados a la izquierda */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {/* WhatsApp */}
                  <button onClick={handleWhatsApp}
                    style={{
                      padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontSize: 12,
                      fontFamily: "'DM Mono',monospace", fontWeight: 700, letterSpacing: "0.03em",
                      background: whatsappCopiado ? "rgba(126,207,138,0.12)" : "var(--bg-surface)",
                      border: `1px solid ${whatsappCopiado ? "rgba(126,207,138,0.40)" : "var(--border)"}`,
                      color: whatsappCopiado ? "#7ecf8a" : "var(--text-secondary)",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (!whatsappCopiado) { e.currentTarget.style.background = "var(--bg-subtle)"; e.currentTarget.style.borderColor = "var(--text-muted)"; }}}
                    onMouseLeave={e => { if (!whatsappCopiado) { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.borderColor = "var(--border)"; }}}
                  >
                    {whatsappCopiado ? "✓ Copiado" : "📲 WhatsApp"}
                  </button>
                  {/* PDF — ghost con hover fill dorado */}
                  <button onClick={handlePDF}
                    style={{
                      padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontSize: 12,
                      fontFamily: "'DM Mono',monospace", fontWeight: 700, letterSpacing: "0.06em",
                      background: "transparent",
                      border: "1.5px solid var(--accent)",
                      color: "var(--accent)", transition: "background 0.2s, color 0.2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(135deg,var(--accent),var(--accent-hover))"; e.currentTarget.style.color = "var(--text-inverted)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--accent)"; }}
                  >
                    🖨 PDF
                  </button>
                  {/* Separador */}
                  <div style={{ flex: 1 }} />
                  {/* Guardar cambios */}
                  <button onClick={guardarTextos} style={{
                    padding: "9px 22px", borderRadius: 8, cursor: "pointer",
                    background: guardandoTexto ? "rgba(126,207,138,0.15)" : "var(--accent-soft)",
                    border: `1px solid ${guardandoTexto ? "rgba(126,207,138,0.4)" : "var(--accent-border)"}`,
                    color: guardandoTexto ? "#7ecf8a" : "var(--accent)",
                    fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, transition: "all 0.2s",
                  }}>
                    {guardandoTexto ? "✓ Guardado" : "💾 Guardar cambios"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .vp-layout { align-items: flex-start; }
        @media (max-width: 768px) {
          .vp-layout { flex-direction: column !important; }
          .vp-lista { width: 100% !important; }
          .vp-lista-hidden { display: none !important; }
          .vp-doc { width: 100% !important; }
          .vp-doc-hidden { display: none !important; }
          .vp-back { display: inline-flex !important; }
        }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 11. LISTA DE CORTE
// ══════════════════════════════════════════════════════════════════
// ── ListaCorte ────────────────────────────────────────────────────
const thStyle = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: 700,
  fontFamily: "'DM Mono',monospace",
  color: "var(--text-muted)",
  textAlign: "left",
  padding: "10px 16px",
};
const tdStyle = {
  padding: "12px 16px",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
  color: "var(--text-primary)",
};

function ResumenCompra({ nombreMat, placaLargo, placaAncho, areaNetaM2 }) {
  const areaPlacaM2 = (placaLargo * placaAncho) / 1_000_000;
  const areaConDesp = areaNetaM2 * 1.2;
  const placasNec = Math.ceil(areaConDesp / areaPlacaM2);
  const pct = ((areaNetaM2 / (placasNec * areaPlacaM2)) * 100).toFixed(1);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 20px",
        marginBottom: 16,
        background: "rgba(200,128,42,0.06)",
        border: "1px solid var(--accent-border)",
        borderRadius: 10,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 28 }}>🛒</div>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 700,
            color: "var(--text-muted)",
            marginBottom: 4,
          }}
        >
          Resumen de compra
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Área neta:{" "}
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              color: "var(--text-primary)",
            }}
          >
            {fmtNum(areaNetaM2)} m²
          </span>
          <span style={{ margin: "0 6px", color: "var(--text-muted)" }}>·</span>
          +20%:{" "}
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              color: "var(--text-primary)",
            }}
          >
            {fmtNum(areaConDesp)} m²
          </span>
          <span style={{ margin: "0 6px", color: "var(--text-muted)" }}>·</span>
          Placa:{" "}
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              color: "var(--text-primary)",
            }}
          >
            {placaLargo}×{placaAncho}mm
          </span>
        </div>
        <div style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}>
          Aprovechamiento estimado: {pct}%
        </div>
      </div>
      <div
        style={{
          flexShrink: 0,
          textAlign: "center",
          background: "var(--accent-soft)",
          border: "1px solid var(--accent-border)",
          borderRadius: 10,
          padding: "10px 20px",
          minWidth: 80,
        }}
      >
        <div
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 36,
            fontWeight: 900,
            color: "var(--accent)",
            lineHeight: 1,
          }}
        >
          {placasNec}
        </div>
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            marginTop: 4,
          }}
        >
          placa{placasNec !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

function TablaGrupoCorte({ nombreMat, piezas }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h3
          style={{
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 700,
            color: "var(--accent)",
            margin: 0,
          }}
        >
          🪵 {nombreMat}
        </h3>
        <Badge color="#7090b0">{piezas.length} cortes</Badge>
      </div>
      {/* rsp-scroll-x: scroll táctil en tablas */}
      <div
        className="rsp-scroll-x"
        style={{
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        <div className="rsp-table-inner">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead
              style={{
                background: "var(--accent-soft)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <tr>
                <th style={thStyle}>Módulo</th>
                <th style={thStyle}>Pieza</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cant.</th>
                <th style={{ ...thStyle, textAlign: "center" }}>
                  Medidas reales
                </th>
                <th style={thStyle}>Tapacanto</th>
              </tr>
            </thead>
            <tbody>
              {piezas.map((pz, idx) => (
                <tr
                  key={idx}
                  style={{ transition: "background 0.15s" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--accent-soft)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontFamily: "'DM Mono',monospace",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--accent)",
                        marginRight: 8,
                      }}
                    >
                      {pz.codigo}
                    </span>
                    {pz.modulo}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {pz.piezaNombre}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontFamily: "'DM Mono',monospace",
                      fontWeight: 700,
                      fontSize: 16,
                      color: "var(--accent)",
                    }}
                  >
                    {pz.cantidad}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      fontFamily: "'DM Mono',monospace",
                      color: "#c8d098",
                      fontSize: 14,
                    }}
                  >
                    {pz.d1} × {pz.d2} mm
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    {pz.tcNombre}{" "}
                    <span
                      style={{
                        fontFamily: "'DM Mono',monospace",
                        marginLeft: 4,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {pz.tcLados}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function imprimirCorte(grupos, nombre) {
  const fecha = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  let seccionesHtml = "";
  Object.entries(grupos).forEach(([nombreMat, datos]) => {
    const areaPlacaM2 = (datos.placaLargo * datos.placaAncho) / 1_000_000;
    const areaConDesp = datos.areaNetaM2 * 1.2;
    const placasNec = Math.ceil(areaConDesp / areaPlacaM2);
    seccionesHtml += `<div style="background:#fff8ee;border:1px solid #c8a060;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:16px;"><div style="flex:1"><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#9a7040;margin-bottom:4px">Resumen de compra · ${nombreMat}</div><div style="font-size:12px;color:#5a3a10">Área neta: <b>${fmtNum(
      datos.areaNetaM2
    )} m²</b> · +20%: <b>${fmtNum(areaConDesp)} m²</b> · Placa: <b>${
      datos.placaLargo
    }×${
      datos.placaAncho
    }mm</b></div></div><div style="text-align:center;background:#a07030;color:#fff;border-radius:8px;padding:8px 18px;"><div style="font-size:28px;font-weight:900;line-height:1">${placasNec}</div><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px">placa${
      placasNec !== 1 ? "s" : ""
    }</div></div></div><table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><thead><tr style="background:#e8dcc8"><td colspan="5" style="padding:8px 16px;font-weight:700;font-size:14px;color:#5a3a10;text-transform:uppercase;letter-spacing:0.1em;border-bottom:2px solid #c8a060;">🪵 ${nombreMat} (${
      datos.piezas.length
    } cortes)</td></tr><tr style="background:#f5ede0"><th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:left;border-bottom:2px solid #c8a060">Módulo</th><th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:left;border-bottom:2px solid #c8a060">Pieza</th><th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:right;border-bottom:2px solid #c8a060">Cant.</th><th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:center;border-bottom:2px solid #c8a060">Medidas Reales</th><th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:left;border-bottom:2px solid #c8a060">Tapacanto</th></tr></thead><tbody>${datos.piezas
      .map(
        (pz) =>
          `<tr><td style="padding:10px 16px;border-bottom:1px solid #e8dcc8;font-size:12px;color:#1a0e04;"><span style="font-family:monospace;font-weight:700;color:#8a5a1a;margin-right:6px;">${pz.codigo}</span>${pz.modulo}</td><td style="padding:10px 16px;border-bottom:1px solid #e8dcc8;font-size:12px;font-weight:700;color:#1a0e04;">${pz.piezaNombre}</td><td style="padding:10px 16px;border-bottom:1px solid #e8dcc8;text-align:right;font-family:monospace;font-size:15px;font-weight:700;color:#8a5a1a;">${pz.cantidad}</td><td style="padding:10px 16px;border-bottom:1px solid #e8dcc8;text-align:center;font-family:monospace;font-size:14px;font-weight:700;color:#1a6a30;">${pz.d1} × ${pz.d2} mm</td><td style="padding:10px 16px;border-bottom:1px solid #e8dcc8;font-size:10px;color:#6a5040;">${pz.tcNombre} <span style="font-family:monospace;">${pz.tcLados}</span></td></tr>`
      )
      .join("")}</tbody></table>`;
  });
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Lista de Corte — ${
    nombre || "Trabajo"
  }</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a0e04;padding:32px 40px;max-width:960px;margin:0 auto}@media print{body{padding:16px 20px}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #a07030"><div><div style="font-size:22px;font-weight:900;color:#7a4a10;letter-spacing:-0.5px">CarpiCálc</div><div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;color:#888">Lista de Corte para Taller</div></div><div style="text-align:right">${
    nombre
      ? `<div style="font-size:15px;font-weight:700;color:#1a0e04">${nombre}</div>`
      : ""
  }<div style="font-size:11px;color:#666;margin-top:4px">${fecha}</div></div></div>${seccionesHtml}<script>window.onload=()=>window.print();</script></body></html>`;
  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  } else
    alert(
      "El navegador bloqueó la ventana emergente. Habilitá los popups para este sitio e intentá de nuevo."
    );
}

function ListaCorte({ items, modulos, costos, getModUsado, presupuestos, presupuestoVistaPreviaId }) {
  // Si hay un presupuesto seleccionado en Vista Previa, usarlo en lugar del activo
  const presVP = presupuestoVistaPreviaId ? presupuestos[presupuestoVistaPreviaId] : null;
  const itemsEfectivos = presVP ? (presVP.items || []) : items;
  const getModUsadoEfectivo = presVP
    ? (item) => {
        const base = modulos[item.codigo];
        if (!base) return null;
        const dims = (presVP.dimOverride && presVP.dimOverride[`${item.codigo}-${item.id || 0}`]) || base.dimensiones;
        return { ...base, dimensiones: dims };
      }
    : getModUsado;

  if (itemsEfectivos.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <SectionTitle sub="Lista detallada agrupada por material con medidas listas para la escuadradora">
          Lista de Corte{presVP ? ` — ${presVP.nombre}` : ""}
        </SectionTitle>
        <div style={{ textAlign: "center", padding: "60px 0", borderRadius: 12, border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🪚</div>
          <p style={{ fontSize: 14 }}>No hay piezas para cortar.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>
            Agregá módulos desde{" "}
            <strong style={{ color: "var(--accent)" }}>📋 Presupuesto</strong>{" "}
            para generar la lista.
          </p>
        </div>
      </div>
    );

  }
  const nombreActivo = presVP ? presVP.nombre : (() => {
    const entries = Object.entries(presupuestos || {});
    const codsActuales = itemsEfectivos.map((i) => i.codigo).join(",");
    const match = entries.find(
      ([, p]) => p.items.map((i) => i.codigo).join(",") === codsActuales
    );
    return match ? match[1].nombre : null;
  })();
  const grupos = {};
  itemsEfectivos.forEach((item) => {
    const modBase = modulos[item.codigo];
    if (!modBase) return;
    const modUsado = getModUsadoEfectivo(item);
    const matDef =
      costos.materiales.find((m) => m.tipo === modUsado.material) ||
      costos.materiales[0];
    if (!matDef) return;
    const esp = matDef.espesor || 18;
    const matKey = `${matDef.nombre} (${esp}mm)`;
    if (!grupos[matKey])
      grupos[matKey] = {
        nombre: matDef.nombre,
        espesor: esp,
        placaLargo: matDef.placaLargo ?? 2750,
        placaAncho: matDef.placaAncho ?? 1830,
        areaNetaM2: 0,
        piezas: [],
      };
    modUsado.piezas.forEach((p) => {
      const d1 = resolverDim(
        modUsado.dimensiones[p.usaDim],
        p.offsetEsp,
        p.offsetMm,
        p.divisor || 1,
        esp
      );
      const d2 = resolverDim(
        modUsado.dimensiones[p.usaDim2],
        p.offsetEsp2,
        p.offsetMm2,
        p.divisor2 || 1,
        esp
      );
      const tcDef = costos.tapacanto?.find((t) => t.id === p.tc?.id);
      const cant = p.cantidad * item.cantidad;
      grupos[matKey].areaNetaM2 += (d1 * d2 * cant) / 1_000_000;
      grupos[matKey].piezas.push({
        modulo: modBase.nombre,
        codigo: item.codigo,
        piezaNombre: p.nombre,
        cantidad: cant,
        d1: Math.round(d1),
        d2: Math.round(d2),
        tcNombre: tcDef ? tcDef.nombre : "Sin tapacanto",
        tcLados: p.tc?.id
          ? `[D1:${p.tc.lados1 || 0} | D2:${p.tc.lados2 || 0}]`
          : "-",
      });
    });
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <SectionTitle sub="Medidas reales descontando espesores y offsets, agrupadas para el operario">
          Lista de Corte
        </SectionTitle>
        <button
          onClick={() => imprimirCorte(grupos, nombreActivo)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 16px",
            borderRadius: 6,
            fontSize: 12,
            fontFamily: "'DM Mono',monospace",
            fontWeight: 700,
            letterSpacing: "0.05em",
            cursor: "pointer",
            transition: "all 0.18s",
            background:
              "linear-gradient(135deg,var(--accent),var(--accent-hover))",
            border: "none",
            color: "var(--text-inverted)",
            boxShadow: "0 3px 12px rgba(180,100,20,0.28)",
            flexShrink: 0,
            marginTop: 4,
          }}
        >
          🖨 Imprimir Lista
        </button>
      </div>
      <div className="no-print">
        {Object.entries(grupos).map(([nombreMat, datos]) => (
          <Card
            key={nombreMat}
            className="rsp-card"
            style={{ marginBottom: 20 }}
          >
            <ResumenCompra
              nombreMat={nombreMat}
              placaLargo={datos.placaLargo}
              placaAncho={datos.placaAncho}
              areaNetaM2={datos.areaNetaM2}
            />
            <TablaGrupoCorte nombreMat={nombreMat} piezas={datos.piezas} />
          </Card>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 12. TABLERO DE TRABAJOS
// ══════════════════════════════════════════════════════════════════
// ── TableroKanban ─────────────────────────────────────────────────
function AccionesTrabajo({ id, p, onCambiarEstado, onEliminar, onCargar, compact }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const estadoActual = ESTADOS_TRABAJO.findIndex(e => e.id === (p.estado || "nuevo"));
  const prev = ESTADOS_TRABAJO[estadoActual - 1];
  const next = ESTADOS_TRABAJO[estadoActual + 1];
  const btnBase = {
    fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700,
    borderRadius: 6, cursor: "pointer", padding: compact ? "4px 9px" : "5px 12px",
    transition: "all 0.15s", outline: "none",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
      {prev && (
        <button onClick={() => onCambiarEstado(id, prev.id)} title={`← ${prev.label}`}
          style={{ ...btnBase, background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-subtle)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
          ←
        </button>
      )}
      {next && (
        <button onClick={() => onCambiarEstado(id, next.id)} title={`${next.label} →`}
          style={{ ...btnBase, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,175,55,0.20)"; e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--accent-soft)"; e.currentTarget.style.borderColor = "var(--accent-border)"; }}>
          →
        </button>
      )}
      {confirmDel ? (
        <>
          <button onClick={() => { onEliminar(id); setConfirmDel(false); }}
            style={{ ...btnBase, background: "rgba(200,60,60,0.18)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070" }}>✓</button>
          <button onClick={() => setConfirmDel(false)}
            style={{ ...btnBase, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
        </>
      ) : (
        <button onClick={() => setConfirmDel(true)}
          style={{ ...btnBase, background: "transparent", border: "1px solid rgba(200,60,60,0.25)", color: "#e07070" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,60,60,0.12)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>×</button>
      )}
    </div>
  );
}

function TarjetaKanban({ id, p, onCambiarEstado, onEliminar, onCargar, modulos, costos }) {
  const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
  const esProduccion = (p.estado || "nuevo") === "produccion";
  return (
    <div className="hover-lift anim-fadeup" style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10,
      padding: "12px 13px", marginBottom: 8,
      boxShadow: "var(--shadow-sm)", borderLeft: `3px solid ${est.color}`,
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-strong)"}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.borderLeftColor = est.color; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: est.color, flexShrink: 0, marginTop: 4, boxShadow: `0 0 6px ${est.color}80` }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>{p.nombre}</span>
      </div>
      {p.cliente && p.cliente.nombre && (
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2, paddingLeft: 15, fontWeight: 300 }}>
          👤 {p.cliente.nombre}
          {p.cliente.tel && <span style={{ color: "var(--text-muted)", marginLeft: 5 }}>· {p.cliente.tel}</span>}
        </div>
      )}
      <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", marginBottom: 10, paddingLeft: 15, fontWeight: 300 }}>
        {fmtFecha(parseInt(id))} · {p.items.length} mód.
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(p.total)}</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          {esProduccion && modulos && costos && (
            <button onClick={() => generarFichaObra(id, p, modulos, costos, leerPerfil())}
              style={{ padding: "4px 9px", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(200,80,48,0.15)", border: "1px solid rgba(200,80,48,0.35)", color: "#c85030", borderRadius: 5, cursor: "pointer" }}>
              📋 Ficha
            </button>
          )}
          <AccionesTrabajo id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} compact />
        </div>
      </div>
    </div>
  );
}

function FilaLista({ id, p, onCambiarEstado, onEliminar, onCargar, modulos, costos, onActualizarPresupuesto }) {
  const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
  const [expandido, setExpandido] = useState(false);
  const [tabActiva, setTabActiva] = useState("presupuesto");

  const tabs = [
    { id: "presupuesto", label: "Presupuesto", icon: "📋" },
    { id: "corte",       label: "Corte",       icon: "✂" },
    { id: "modulos",     label: "Módulos",     icon: "🪵" },
    { id: "ficha",       label: "Ficha",       icon: "📄" },
  ];

  return (
    <div className="anim-fadeup" style={{
      border: `1px solid ${expandido ? "var(--accent-border)" : "var(--border)"}`,
      borderRadius: 10, overflow: "visible", transition: "border-color 0.18s",
      background: "var(--bg-surface)", marginBottom: 2,
    }}>
      {/* Fila principal — click para expandir */}
      <div className="lista-fila" style={{
        display: "grid", gridTemplateColumns: "1fr 120px 130px auto",
        alignItems: "center", gap: 12, padding: "12px 16px",
        cursor: "pointer", transition: "background 0.12s",
        borderRadius: expandido ? "10px 10px 0 0" : 10,
        borderBottom: expandido ? "1px solid var(--border)" : "none",
      }}
        onClick={() => setExpandido(v => !v)}
        onMouseEnter={e => e.currentTarget.style.background = "var(--accent-soft)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", background: `${est.color}22`, color: est.color, border: `1px solid ${est.color}44`, borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>
              {est.icon} {est.label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 300 }}>
            {fmtFecha(parseInt(id))} · {p.items.length} mód.
            {p.cliente?.nombre && <span> · 👤 {p.cliente.nombre}</span>}
          </div>
          {/* Mobile row */}
          <div className="lista-mobile-row" style={{ display: "none", marginTop: 8, alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(p.total)}</span>
            <select value={p.estado || "nuevo"} onChange={e => { e.stopPropagation(); onCambiarEstado(id, e.target.value); }}
              onClick={e => e.stopPropagation()}
              style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "4px 6px", background: `${est.color}18`, border: `1px solid ${est.color}44`, color: est.color, borderRadius: 6, cursor: "pointer", outline: "none", fontWeight: 700 }}>
              {ESTADOS_TRABAJO.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
            </select>
          </div>
        </div>
        <div className="lista-desktop-col" style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: "#7ecf8a", textAlign: "right" }}>
          {fmtPeso(p.total)}
        </div>
        <select className="lista-desktop-col" value={p.estado || "nuevo"}
          onChange={e => { e.stopPropagation(); onCambiarEstado(id, e.target.value); }}
          onClick={e => e.stopPropagation()}
          style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "5px 6px", background: `${est.color}18`, border: `1px solid ${est.color}44`, color: est.color, borderRadius: 6, cursor: "pointer", outline: "none", fontWeight: 700 }}>
          {ESTADOS_TRABAJO.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
        </select>
        <div className="lista-desktop-col" onClick={e => e.stopPropagation()}>
          <AccionesTrabajo id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} compact />
        </div>
      </div>

      {/* Panel expandido */}
      {expandido && (
        <div style={{ padding: "0 0 16px 0" }}>
          {/* Tabs internas */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", padding: "0 16px" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTabActiva(t.id)} style={{
                padding: "10px 16px", background: "transparent", border: "none",
                borderBottom: `2px solid ${tabActiva === t.id ? "var(--accent)" : "transparent"}`,
                color: tabActiva === t.id ? "var(--accent)" : "var(--text-muted)",
                fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
                transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5,
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "16px 16px 0" }}>
            {tabActiva === "presupuesto" && (
              <TabPresupuestoTrabajo p={p} modulos={modulos} costos={costos} />
            )}
            {tabActiva === "corte" && (
              <TabCorteTrabajo p={p} modulos={modulos} costos={costos} />
            )}
            {tabActiva === "modulos" && (
              <TabModulosTrabajo id={id} p={p} modulos={modulos} costos={costos} onActualizar={onActualizarPresupuesto} />
            )}
            {tabActiva === "ficha" && modulos && costos && (
              <div style={{ textAlign: "center", paddingTop: 8 }}>
                <button onClick={() => generarFichaObra(id, p, modulos, costos, leerPerfil())}
                  style={{
                    padding: "12px 28px", borderRadius: 8, cursor: "pointer",
                    background: "rgba(200,80,48,0.12)", border: "1px solid rgba(200,80,48,0.35)",
                    color: "#c85030", fontFamily: "'DM Mono',monospace", fontSize: 12,
                    fontWeight: 700, letterSpacing: "0.08em", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(200,80,48,0.22)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(200,80,48,0.12)"}>
                  📋 Generar Ficha de Obra — lista para imprimir o compartir
                </button>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10, fontFamily: "'DM Mono',monospace" }}>
                  Incluye módulos, lista de corte, materiales y estado de cobros
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tabs internas de FilaLista ────────────────────────────────────
function TabPresupuestoTrabajo({ p, modulos, costos }) {
  if (!p.items || p.items.length === 0) return <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Sin módulos cargados.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {p.items.map((item, idx) => {
        const modBase = modulos[item.codigo];
        if (!modBase) return null;
        const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
        const modUsado = { ...modBase, dimensiones: dims };
        const calc = calcularModulo(modUsado, costos);
        return (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-subtle)", borderRadius: 8, gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>{item.codigo}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginLeft: 8 }}>{modBase.nombre}</span>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
                {dims.ancho}×{dims.profundidad}×{dims.alto} mm · ×{item.cantidad}
              </div>
            </div>
            {calc && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#7ecf8a", flexShrink: 0 }}>{fmtPeso(calc.total * item.cantidad)}</span>}
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--separator)" }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 900, color: "#7ecf8a" }}>{fmtPeso(p.total)}</span>
      </div>
    </div>
  );
}

function TabCorteTrabajo({ p, modulos, costos }) {
  if (!p.items || p.items.length === 0) return <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Sin módulos cargados.</div>;
  const piezas = [];
  p.items.forEach(item => {
    const modBase = modulos[item.codigo];
    if (!modBase) return;
    const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
    const modUsado = { ...modBase, dimensiones: dims };
    const matDef = costos.materiales.find(m => m.tipo === modUsado.material) || costos.materiales[0];
    const esp = matDef?.espesor || 18;
    const dimMap = { ancho: dims.ancho, profundidad: dims.profundidad, alto: dims.alto };
    modUsado.piezas.forEach(pz => {
      const d1 = pz.especial ? (parseInt(pz.dimLibre1)||0) : Math.round(resolverDim(dimMap[pz.usaDim], pz.offsetEsp, pz.offsetMm, pz.divisor||1, esp));
      const d2 = pz.especial ? (parseInt(pz.dimLibre2)||0) : Math.round(resolverDim(dimMap[pz.usaDim2], pz.offsetEsp2, pz.offsetMm2, pz.divisor2||1, esp));
      piezas.push({ nombre: pz.nombre, modulo: `${item.codigo} ${modBase.nombre}`, d1, d2, cant: (pz.cantidad||1)*(item.cantidad||1) });
    });
  });
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "var(--accent-soft)" }}>
            {["Módulo","Pieza","Alto","Ancho","Cant"].map(h => (
              <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, borderBottom: "1px solid var(--border)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {piezas.map((pz, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--separator)" }}>
              <td style={{ padding: "6px 10px", fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>{pz.modulo}</td>
              <td style={{ padding: "6px 10px", fontWeight: 600, color: "var(--text-primary)" }}>{pz.nombre}</td>
              <td style={{ padding: "6px 10px", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#7ecf8a" }}>{pz.d1}</td>
              <td style={{ padding: "6px 10px", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#7ecf8a" }}>{pz.d2}</td>
              <td style={{ padding: "6px 10px", fontFamily: "'DM Mono',monospace", fontWeight: 900, color: "var(--accent)" }}>×{pz.cant}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabModulosTrabajo({ id, p, modulos, costos, onActualizar }) {
  const [editandoIdx, setEditandoIdx] = useState(null);
  const [dimsEdit, setDimsEdit] = useState({});

  const abrirEdit = (idx, item) => {
    const modBase = modulos[item.codigo];
    const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase?.dimensiones || { ancho: 600, profundidad: 550, alto: 700 };
    setDimsEdit({ ...dims });
    setEditandoIdx(idx);
  };

  const guardarDims = (idx, item) => {
    const keyId = `${item.codigo}-${item.id || 0}`;
    const nuevoOverride = { ...(p.dimOverride || {}), [keyId]: { ...dimsEdit } };
    onActualizar(id, { dimOverride: nuevoOverride });
    setEditandoIdx(null);
  };

  const inp = { fontFamily: "'DM Mono',monospace", fontSize: 13, padding: "6px 9px", background: "var(--bg-base)", border: "1px solid var(--accent-border)", color: "var(--text-primary)", borderRadius: 6, outline: "none", width: 80, textAlign: "center" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
        Los cambios aplican solo a este presupuesto. El catálogo no se modifica.
      </p>
      {p.items.map((item, idx) => {
        const modBase = modulos[item.codigo];
        if (!modBase) return null;
        const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
        const estaEditando = editandoIdx === idx;
        const cat = CATEGORIAS_DEFAULT.find(c => c.id === (modBase.categoria || "otros")) || CATEGORIAS_DEFAULT[5];

        return (
          <div key={idx} style={{
            background: estaEditando ? "var(--accent-soft)" : "var(--bg-subtle)",
            border: `1px solid ${estaEditando ? "var(--accent-border)" : "var(--border)"}`,
            borderRadius: 10, padding: "12px 14px", transition: "all 0.15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: estaEditando ? 14 : 0, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, background: `${cat.color}20`, color: cat.color, border: `1px solid ${cat.color}30`, borderRadius: 4, padding: "1px 7px", fontFamily: "'DM Mono',monospace" }}>
                {cat.icon} {item.codigo}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{modBase.nombre}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--text-muted)" }}>
                {dims.ancho}×{dims.profundidad}×{dims.alto} mm · ×{item.cantidad}
              </span>
              {!estaEditando && (
                <button onClick={() => abrirEdit(idx, item)}
                  style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                  ✎ Editar dimensiones
                </button>
              )}
            </div>

            {estaEditando && (
              <div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
                  {["ancho", "profundidad", "alto"].map(dim => (
                    <div key={dim} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                      <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{dim}</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input type="number" value={dimsEdit[dim]} onChange={e => setDimsEdit(d => ({ ...d, [dim]: parseInt(e.target.value) || 0 }))}
                          style={inp} />
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>mm</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => guardarDims(idx, item)}
                    style={{ padding: "7px 18px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                    ✓ Guardar
                  </button>
                  <button onClick={() => setEditandoIdx(null)}
                    style={{ padding: "7px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    Cancelar
                  </button>
                  {p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`] && (
                    <button onClick={() => {
                      const keyId = `${item.codigo}-${item.id || 0}`;
                      const nuevoOverride = { ...(p.dimOverride || {}) };
                      delete nuevoOverride[keyId];
                      onActualizar(id, { dimOverride: nuevoOverride });
                      setEditandoIdx(null);
                    }}
                      style={{ padding: "7px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid rgba(200,60,60,0.25)", color: "#e07070" }}>
                      ↩ Restaurar original
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
function TableroKanban({ presupuestos, onCambiarEstado, onEliminar, onCargar, modulos, costos, onActualizarPresupuesto }) {
  const [vistaTab, setVistaTab] = useState("lista");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [orden, setOrden] = useState("fecha_desc");

  const ORDENES = [
    { id: "fecha_desc",  label: "Más reciente",  fn: (a, b) => b[0] - a[0] },
    { id: "fecha_asc",   label: "Más antiguo",   fn: (a, b) => a[0] - b[0] },
    { id: "total_desc",  label: "Mayor monto",   fn: (a, b) => b[1].total - a[1].total },
    { id: "total_asc",   label: "Menor monto",   fn: (a, b) => a[1].total - b[1].total },
    { id: "nombre_asc",  label: "Nombre A→Z",    fn: (a, b) => a[1].nombre.localeCompare(b[1].nombre) },
  ];

  const fnOrden = ORDENES.find(o => o.id === orden)?.fn || ORDENES[0].fn;
  const entries = Object.entries(presupuestos).sort(fnOrden);
  const filtradas = filtroEstado === "todos" ? entries : entries.filter(([, p]) => (p.estado || "nuevo") === filtroEstado);

  const btnVista = (id, icon, label) => (
    <button onClick={() => setVistaTab(id)} style={{
      padding: "6px 14px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace",
      fontWeight: 700, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6,
      background: vistaTab === id ? "var(--accent-soft)" : "transparent",
      border: `1px solid ${vistaTab === id ? "var(--accent-border)" : "var(--border)"}`,
      color: vistaTab === id ? "var(--accent)" : "var(--text-muted)",
    }}>{icon} {label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <SectionTitle sub="Seguí el avance de cada trabajo de un vistazo">
          Tablero de Trabajos
        </SectionTitle>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
          {/* Selector de orden */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Ordenar</span>
            <select value={orden} onChange={e => setOrden(e.target.value)} style={{
              fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
              padding: "6px 10px", borderRadius: 6, cursor: "pointer", outline: "none",
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", transition: "border-color 0.15s",
            }}
              onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            >
              {ORDENES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          {btnVista("kanban", "⊞", "Kanban")}
          {btnVista("lista", "☰", "Lista")}
        </div>
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", borderRadius: 12, border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <p style={{ fontSize: 14 }}>No hay trabajos guardados todavía.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>Guardá un presupuesto desde <strong style={{ color: "var(--accent)" }}>📋 Presupuesto</strong> para verlo acá.</p>
        </div>
      ) : (
        <>
          {/* Contadores siempre visibles */}
          <div className="filtros-estado" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ESTADOS_TRABAJO.map(est => {
              const count = entries.filter(([, p]) => (p.estado || "nuevo") === est.id).length;
              const active = filtroEstado === est.id;
              return (
                <button key={est.id} onClick={() => setFiltroEstado(active ? "todos" : est.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                    background: active ? `${est.color}25` : count > 0 ? `${est.color}10` : "var(--bg-surface)",
                    border: `1px solid ${active ? est.color : count > 0 ? est.color + "44" : "var(--border)"}`,
                    transition: "all 0.15s",
                  }}>
                  <span style={{ fontSize: 14 }}>{est.icon}</span>
                  <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 900, color: count > 0 ? est.color : "var(--text-muted)", lineHeight: 1 }}>{count}</span>
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: active ? est.color : "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{est.label}</span>
                </button>
              );
            })}
            {filtroEstado !== "todos" && (
              <button onClick={() => setFiltroEstado("todos")}
                style={{ padding: "7px 12px", borderRadius: 8, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>
                × Ver todos
              </button>
            )}
          </div>

          {/* ── Vista KANBAN ── */}
          {vistaTab === "kanban" && (
            <div className="kanban-board" style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: 8 }}>
              {ESTADOS_TRABAJO.filter(est => filtroEstado === "todos" || filtroEstado === est.id).map(est => {
                const cards = entries.filter(([, p]) => (p.estado || "nuevo") === est.id);
                return (
                  <div key={est.id} className="kanban-col" style={{ flex: "0 0 210px", minWidth: 210 }}>
                    <div className="kanban-col-header" style={{
                      padding: "9px 13px", borderRadius: "10px 10px 0 0",
                      background: `${est.color}20`, border: `1px solid ${est.color}40`, borderBottom: "none",
                      display: "flex", alignItems: "center", gap: 7,
                    }}>
                      <span style={{ fontSize: 15 }}>{est.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: est.color, fontFamily: "'DM Mono',monospace", flex: 1 }}>{est.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace", background: `${est.color}30`, color: est.color, borderRadius: 999, padding: "1px 7px" }}>{cards.length}</span>
                    </div>
                    <div style={{ minHeight: 80, maxHeight: 520, overflowY: "auto", padding: "8px 8px 4px", border: `1px solid ${est.color}40`, borderRadius: "0 0 10px 10px", background: "var(--bg-subtle)" }}>
                      {cards.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>Sin trabajos</div>
                      ) : (
                        cards.map(([id, p]) => (
                          <TarjetaKanban key={id} id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} modulos={modulos} costos={costos} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Vista LISTA ── */}
          {vistaTab === "lista" && (
            <Card className="rsp-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="lista-header" style={{ display: "grid", gridTemplateColumns: "1fr 120px 130px auto", gap: 12, padding: "9px 16px", background: "var(--accent-soft)", borderBottom: "1px solid var(--border)" }}>
                {["Trabajo / Cliente", "Total", "Estado", "Acciones"].map(h => (
                  <div key={h} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>{h}</div>
                ))}
              </div>
              {filtradas.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)", fontSize: 13 }}>No hay trabajos en este estado.</div>
              ) : (
                filtradas.map(([id, p]) => (
                  <FilaLista key={id} id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} modulos={modulos} costos={costos} onActualizarPresupuesto={onActualizarPresupuesto} />
                ))
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 13. CAJA
// ══════════════════════════════════════════════════════════════════
// ── PanelCaja ─────────────────────────────────────────────────────
function FilaCaja({ id, p, onActualizar, modulos, costos, autoAbrir = false }) {
  const [abierto, setAbierto] = useState(autoAbrir); // auto-abrir si viene de "Ver Rentabilidad"
  const [montoCobro, setMontoCobro] = useState("");
  const [conceptoCobro, setConceptoCobro] = useState("Seña");
  const [costoReal, setCostoReal] = useState(p.costoReal ?? "");
  const [diasVigencia, setDiasVigencia] = useState(p.diasVigencia ?? 15);
  const [editandoCosto, setEditandoCosto] = useState(false);
  const [editandoVigencia, setEditandoVigencia] = useState(false);
  const [descuento, setDescuento] = useState(p.descuento ?? "");
  const [gananciaExtra, setGananciaExtra] = useState(p.gananciaExtra ?? "");

  // Costo automático: recalcular con los costos actuales del sistema
  const costoAutomatico = (() => {
    if (!p.items || !modulos || !costos) return 0;
    return Math.round(p.items.reduce((acc, item) => {
      const base = modulos[item.codigo];
      if (!base) return acc;
      const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || base.dimensiones;
      const calc = calcularModulo({ ...base, dimensiones: dims }, costos);
      if (!calc) return acc;
      return acc + calc.costoBase * item.cantidad; // solo costo sin ganancia
    }, 0));
  })();

  // Prioridad: si el usuario ingresó un costo real manual, se usa ese. Si no, el automático.
  const costoEfectivo = p.costoReal > 0 ? p.costoReal : costoAutomatico;

  // Total ajustado: precio base + ganancia extra − descuento
  const descuentoVal = parseFloat(p.descuento) || 0;
  const gananciaExtraVal = parseFloat(p.gananciaExtra) || 0;
  const totalAjustado = p.total + gananciaExtraVal - descuentoVal;

  const cobros = p.cobros || [];
  const totalCobrado = cobros.reduce((a, c) => a + c.monto, 0);
  const saldoPendiente = Math.max(0, totalAjustado - totalCobrado);
  const totalValido = totalAjustado > 0;
  const pctCobrado = totalValido ? Math.min(100, Math.round((totalCobrado / totalAjustado) * 100)) : 0;

  // Margen calculado sobre el total ajustado vs el costo efectivo
  const margen = (totalValido && costoEfectivo > 0)
    ? Math.round(((totalAjustado - costoEfectivo) / totalAjustado) * 100)
    : null;

  // Vencimiento: solo relevante si está enviado
  const diasTranscurridos = Math.floor((Date.now() - parseInt(id)) / 86400000);
  const diasRestantes = (p.diasVigencia || 15) - diasTranscurridos;
  const vencido = diasRestantes < 0;
  const porVencer = diasRestantes >= 0 && diasRestantes <= 3;
  const estadoVigencia = p.estado === "enviado" || p.estado === "nuevo"
    ? vencido ? "vencido" : porVencer ? "por_vencer" : "vigente"
    : null;

  const agregarCobro = () => {
    const monto = parseFloat(montoCobro);
    if (!monto || isNaN(monto) || monto <= 0) return;
    const nuevoCobro = { fecha: Date.now(), monto, concepto: conceptoCobro };
    onActualizar(id, { cobros: [...cobros, nuevoCobro] });
    setMontoCobro("");
  };

  const eliminarCobro = (idx) => {
    onActualizar(id, { cobros: cobros.filter((_, i) => i !== idx) });
  };

  const guardarCostoReal = () => {
    const v = parseFloat(costoReal);
    onActualizar(id, { costoReal: isNaN(v) ? 0 : v });
    setEditandoCosto(false);
  };

  const guardarVigencia = () => {
    const v = parseInt(diasVigencia);
    onActualizar(id, { diasVigencia: isNaN(v) ? 15 : v });
    setEditandoVigencia(false);
  };

  const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];

  const inputSm = {
    fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "5px 9px",
    background: "var(--bg-base)", border: "1px solid var(--accent-border)",
    color: "var(--text-primary)", borderRadius: 6, outline: "none",
  };

  return (
    <div id={`filacaja-${id}`} className="hover-lift anim-fadeup" style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 12, overflow: "visible", transition: "border-color 0.18s",
      borderLeft: `3px solid ${est.color}`,
    }}>
      {/* Cabecera */}
      <div style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
        onClick={() => setAbierto(a => !a)}
        onMouseEnter={e => e.currentTarget.parentElement.style.borderColor = "var(--border-strong)"}
        onMouseLeave={e => e.currentTarget.parentElement.style.borderColor = "var(--border)"}
      >
        {/* Info principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", background: `${est.color}22`, color: est.color, border: `1px solid ${est.color}44`, borderRadius: 4, padding: "2px 7px" }}>
              {est.icon} {est.label}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{p.nombre}</span>
            {p.cliente?.nombre && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· 👤 {p.cliente.nombre}</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 300 }}>
            {fmtFecha(parseInt(id))} · {p.items.length} mód.
          </div>
        </div>

        {/* Vencimiento */}
        {estadoVigencia && (
          <div style={{
            fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, padding: "3px 9px",
            borderRadius: 6, flexShrink: 0,
            background: vencido ? "rgba(200,60,60,0.15)" : porVencer ? "rgba(200,160,42,0.15)" : "rgba(100,180,80,0.10)",
            color: vencido ? "#e07070" : porVencer ? "#c8a02a" : "#7ecf8a",
            border: `1px solid ${vencido ? "rgba(200,60,60,0.35)" : porVencer ? "rgba(200,160,42,0.35)" : "rgba(100,180,80,0.25)"}`,
          }}>
            {vencido ? `⚠ Vencido hace ${Math.abs(diasRestantes)}d` : `📅 Vence en ${diasRestantes}d`}
          </div>
        )}

        {/* Barra cobro */}
        <div style={{ flexShrink: 0, textAlign: "right", minWidth: 120 }}>
          <div style={{ marginBottom: 4, textAlign: "right" }}>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: saldoPendiente > 0 ? "#e07070" : "#7ecf8a" }}>
              {fmtPeso(saldoPendiente > 0 ? saldoPendiente : 0)} pendiente
            </span>
          </div>
          <div style={{ height: 5, background: "var(--bg-subtle)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pctCobrado}%`, background: pctCobrado >= 100 ? "#7ecf8a" : "var(--accent)", borderRadius: 999, transition: "width 0.4s" }} />
          </div>
        </div>

        {/* Total y margen */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700, color: totalValido ? "#7ecf8a" : "#e07070" }}>
            {fmtPeso(p.total)}
          </div>
          {!totalValido && (
            <div style={{ fontSize: 10, color: "#e07070", fontFamily: "'DM Mono',monospace" }}>⚠ Revisar costos</div>
          )}
          {margen !== null && totalValido && (
            <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: margen >= 30 ? "#7ecf8a" : margen >= 15 ? "#c8a02a" : "#e07070", fontWeight: 700 }}>
              {margen}% margen
            </div>
          )}
        </div>

        <span style={{ color: "var(--text-muted)", fontSize: 12, flexShrink: 0 }}>{abierto ? "▲" : "▼"}</span>
      </div>

      {/* Panel expandido */}
      {abierto && (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid var(--separator)", paddingTop: 16 }}>
          {/* Botón Ficha de Obra — solo en producción */}
          {(p.estado === "produccion") && modulos && costos && (
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => generarFichaObra(id, p, modulos, costos, leerPerfil())}
                style={{
                  width: "100%", padding: "10px 16px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(200,80,48,0.12)", border: "1px solid rgba(200,80,48,0.35)",
                  color: "#c85030", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(200,80,48,0.22)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(200,80,48,0.12)"}>
                📋 Generar Ficha de Obra — lista para imprimir o compartir
              </button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }} className="rsp-grid-1">

            {/* 1. Cobros */}
            <div>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 10, fontWeight: 700 }}>
                💳 Cobros recibidos
              </div>
              {cobros.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Sin cobros registrados</div>
              ) : (
                <div style={{ marginBottom: 10 }}>
                  {cobros.map((c, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--separator)" }}>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{c.concepto}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>{fmtFecha(c.fecha)}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(c.monto)}</span>
                        <button onClick={() => eliminarCobro(i)}
                          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, padding: 0 }}>×</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>SALDO PENDIENTE</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: saldoPendiente > 0 ? "#e07070" : "#7ecf8a" }}>
                      {fmtPeso(Math.max(0, saldoPendiente))}
                    </span>
                  </div>
                </div>
              )}
              {/* Nuevo cobro */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <select value={conceptoCobro} onChange={e => setConceptoCobro(e.target.value)}
                  style={{ ...inputSm, flex: "0 0 auto" }}>
                  {["Seña","Anticipo materiales","Cuota","Saldo final","Otro"].map(c => <option key={c}>{c}</option>)}
                </select>
                <input type="number" value={montoCobro} onChange={e => setMontoCobro(e.target.value)}
                  placeholder="Monto $" onKeyDown={e => e.key === "Enter" && agregarCobro()}
                  style={{ ...inputSm, flex: 1, minWidth: 80 }} />
                <button onClick={agregarCobro}
                  style={{ padding: "5px 12px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                  + Cobro
                </button>
              </div>
            </div>

            {/* 2. Rentabilidad */}
            <div>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 10, fontWeight: 700 }}>
                📈 Rentabilidad
              </div>
              <div style={{ marginBottom: 12 }}>

                {/* LÓGICA - Precios Tachados y PDF */}
                {(() => {
                  const tv = calcularTotalVisual(p.total, p.descuento, p.gananciaExtra);
                  return (
                    <>
                      {/* Precio base — con tachado elegante si hay descuento */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tv.hayDescuento ? 4 : 10 }}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {tv.hayDescuento ? "Precio original" : "Precio base"}
                        </span>
                        <span style={{
                          fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700,
                          color: tv.hayDescuento ? "var(--text-muted)" : "#7ecf8a",
                          textDecoration: tv.hayDescuento ? "line-through" : "none",
                          opacity: tv.hayDescuento ? 0.55 : 1,
                          letterSpacing: tv.hayDescuento ? "0.02em" : "normal",
                        }}>
                          {fmtPeso(tv.totalOriginal)}
                        </span>
                      </div>
                      {/* Total con descuento — solo si hay descuento */}
                      {tv.hayDescuento && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#e07070" }}>🏷 Con descuento</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 900, color: "#7ecf8a" }}>
                            {fmtPeso(tv.totalFinal)}
                          </span>
                        </div>
                      )}
                      {/* Total con ganancia — solo si hay ganancia (sin mostrar el original) */}
                      {tv.hayGanancia && !tv.hayDescuento && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#7ecf8a" }}>💵 Total final</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 900, color: "#7ecf8a" }}>
                            {fmtPeso(tv.totalFinal)}
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* UI - Acción de Confirmación: campos de ajuste con botón ✔ */}
                <div style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden", marginBottom: 12 }}>
                  {/* Fila Descuento */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
                    background: descuentoVal > 0 ? "rgba(224,112,112,0.08)" : "var(--bg-subtle)",
                    borderBottom: "1px solid var(--border)",
                  }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>🏷</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1, fontWeight: 600 }}>Descuento</span>
                    <span style={{ fontSize: 13, color: "#e07070", fontFamily: "'DM Mono',monospace", fontWeight: 900 }}>−</span>
                    <input
                      type="number" min="0" value={descuento} placeholder="0"
                      onChange={e => setDescuento(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { onActualizar(id, { descuento: parseFloat(descuento) || 0, gananciaExtra: parseFloat(gananciaExtra) || 0 }); e.target.blur(); } }}
                      style={{
                        fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700,
                        padding: "4px 8px", width: 100, textAlign: "right",
                        background: "var(--bg-base)", border: "1px solid var(--border)",
                        borderRadius: 6, color: "#e07070", outline: "none",
                      }}
                      onFocus={e => e.target.style.borderColor = "#e07070"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                    {/* UI - Acción de Confirmación */}
                    <button
                      title="Confirmar descuento"
                      onClick={() => onActualizar(id, { descuento: parseFloat(descuento) || 0, gananciaExtra: parseFloat(gananciaExtra) || 0 })}
                      style={{
                        width: 26, height: 26, borderRadius: 6, cursor: "pointer", flexShrink: 0,
                        background: parseFloat(descuento) !== descuentoVal ? "rgba(224,112,112,0.2)" : "var(--bg-base)",
                        border: `1px solid ${parseFloat(descuento) !== descuentoVal ? "#e07070" : "var(--border)"}`,
                        color: "#e07070", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}>
                      ✓
                    </button>
                  </div>
                  {/* Fila Ganancia Extra */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
                    background: gananciaExtraVal > 0 ? "rgba(126,207,138,0.08)" : "var(--bg-subtle)",
                  }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>💵</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1, fontWeight: 600 }}>Ganancia extra</span>
                    <span style={{ fontSize: 13, color: "#7ecf8a", fontFamily: "'DM Mono',monospace", fontWeight: 900 }}>+</span>
                    <input
                      type="number" min="0" value={gananciaExtra} placeholder="0"
                      onChange={e => setGananciaExtra(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { onActualizar(id, { descuento: parseFloat(descuento) || 0, gananciaExtra: parseFloat(gananciaExtra) || 0 }); e.target.blur(); } }}
                      style={{
                        fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700,
                        padding: "4px 8px", width: 100, textAlign: "right",
                        background: "var(--bg-base)", border: "1px solid var(--border)",
                        borderRadius: 6, color: "#7ecf8a", outline: "none",
                      }}
                      onFocus={e => e.target.style.borderColor = "#7ecf8a"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                    {/* UI - Acción de Confirmación */}
                    <button
                      title="Confirmar ganancia extra"
                      onClick={() => onActualizar(id, { descuento: parseFloat(descuento) || 0, gananciaExtra: parseFloat(gananciaExtra) || 0 })}
                      style={{
                        width: 26, height: 26, borderRadius: 6, cursor: "pointer", flexShrink: 0,
                        background: parseFloat(gananciaExtra) !== gananciaExtraVal ? "rgba(126,207,138,0.2)" : "var(--bg-base)",
                        border: `1px solid ${parseFloat(gananciaExtra) !== gananciaExtraVal ? "#7ecf8a" : "var(--border)"}`,
                        color: "#7ecf8a", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}>
                      ✓
                    </button>
                  </div>
                </div>

                {/* Costo calculado automáticamente */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Costo calculado
                    {p.costoReal > 0 && <span style={{ fontSize: 10, color: "#c8a02a", marginLeft: 6 }}>(ignorado)</span>}
                  </span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: p.costoReal > 0 ? "var(--text-muted)" : "#e07070", textDecoration: p.costoReal > 0 ? "line-through" : "none", opacity: p.costoReal > 0 ? 0.5 : 1 }}>
                    {fmtPeso(costoAutomatico)}
                  </span>
                </div>

                {/* Costo real manual — prioridad sobre el automático */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Costo real (manual)
                    {p.costoReal > 0 && <span style={{ fontSize: 10, color: "#7ecf8a", marginLeft: 6 }}>● activo</span>}
                  </span>
                  {editandoCosto ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <input type="number" value={costoReal} onChange={e => setCostoReal(e.target.value)}
                        autoFocus onKeyDown={e => e.key === "Enter" && guardarCostoReal()}
                        style={{ ...inputSm, width: 100 }} />
                      <button onClick={guardarCostoReal}
                        style={{ padding: "4px 8px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>✓</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditandoCosto(true)}
                      style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: p.costoReal > 0 ? "#e07070" : "var(--text-muted)", background: "none", border: "1px dashed var(--border)", borderRadius: 5, padding: "2px 8px", cursor: "pointer" }}>
                      {p.costoReal > 0 ? fmtPeso(p.costoReal) : "Ingresar →"}
                    </button>
                  )}
                </div>

                {/* Resultado: ganancia neta y semáforo */}
                {margen !== null && totalValido && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid var(--separator)" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Ganancia neta</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: (totalAjustado - costoEfectivo) >= 0 ? "#7ecf8a" : "#e07070" }}>
                        {fmtPeso(totalAjustado - costoEfectivo)}
                      </span>
                    </div>
                    <div style={{ height: 8, background: "var(--bg-subtle)", borderRadius: 999, overflow: "hidden", marginTop: 8 }}>
                      <div style={{
                        height: "100%", borderRadius: 999, transition: "width 0.4s",
                        width: `${Math.max(0, Math.min(100, margen))}%`,
                        background: margen >= 30 ? "#7ecf8a" : margen >= 15 ? "#c8a02a" : "#e07070",
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontFamily: "'DM Mono',monospace" }}>
                      {margen >= 30 ? "✅ Margen saludable" : margen >= 15 ? "⚠ Margen ajustado" : "🔴 Margen bajo — revisar costos"}
                    </div>
                  </>
                )}
                {!totalValido && (
                  <div style={{ fontSize: 11, color: "#e07070", fontFamily: "'DM Mono',monospace", padding: "6px 0", borderTop: "1px solid var(--separator)" }}>
                    ⚠ El total del presupuesto es negativo. Revisá los costos en 💰 Costos.
                  </div>
                )}
                {margen === null && totalValido && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                    Margen calculado automáticamente. Podés ingresar un costo real para mayor precisión.
                  </div>
                )}
              </div>
            </div>

            {/* 3. Vigencia */}
            <div>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 10, fontWeight: 700 }}>
                📅 Vigencia del presupuesto
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Válido por</span>
                  {editandoVigencia ? (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <input type="number" value={diasVigencia} onChange={e => setDiasVigencia(e.target.value)}
                        autoFocus onKeyDown={e => e.key === "Enter" && guardarVigencia()}
                        style={{ ...inputSm, width: 60 }} />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>días</span>
                      <button onClick={guardarVigencia}
                        style={{ padding: "4px 8px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>✓</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditandoVigencia(true)}
                      style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "var(--accent)", background: "none", border: "1px dashed var(--accent-border)", borderRadius: 5, padding: "2px 8px", cursor: "pointer" }}>
                      {p.diasVigencia || 15} días
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Creado</span>
                  <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: "var(--text-secondary)" }}>{fmtFecha(parseInt(id))}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Vencimiento</span>
                  <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: vencido ? "#e07070" : porVencer ? "#c8a02a" : "var(--text-secondary)", fontWeight: 700 }}>
                    {fmtFecha(parseInt(id) + (p.diasVigencia || 15) * 86400000)}
                  </span>
                </div>
                {estadoVigencia && (
                  <div style={{
                    padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: vencido ? "rgba(200,60,60,0.12)" : porVencer ? "rgba(200,160,42,0.12)" : "rgba(100,180,80,0.10)",
                    color: vencido ? "#e07070" : porVencer ? "#c8a02a" : "#7ecf8a",
                    border: `1px solid ${vencido ? "rgba(200,60,60,0.30)" : porVencer ? "rgba(200,160,42,0.30)" : "rgba(100,180,80,0.20)"}`,
                  }}>
                    {vencido
                      ? `⚠ Vencido hace ${Math.abs(diasRestantes)} días. Actualizá el precio antes de reenviar.`
                      : porVencer
                      ? `⏳ Vence en ${diasRestantes} días. Hacé seguimiento con el cliente.`
                      : `✅ Vigente por ${diasRestantes} días más.`}
                  </div>
                )}
                {!estadoVigencia && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                    La vigencia aplica cuando el presupuesto está en estado Nuevo o Enviado.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelCaja({ presupuestos, onActualizar, modulos, costos, cajaPresId, onClearCajaPresId }) {
  const entries = Object.entries(presupuestos).sort((a, b) => b[0] - a[0]);

  // NAVEGACIÓN - Enlace Presupuesto a Caja
  // Si cajaPresId está seteado, hace scroll a esa fila y la marca para auto-abrir.
  // Se limpia después del primer render para no interferir con la navegación normal.
  const [autoAbrirId, setAutoAbrirId] = useState(cajaPresId || null);
  useEffect(() => {
    if (cajaPresId) {
      setAutoAbrirId(cajaPresId);
      // Scroll suave a la fila después de renderizar
      setTimeout(() => {
        const el = document.getElementById(`filacaja-${cajaPresId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        onClearCajaPresId && onClearCajaPresId();
      }, 150);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajaPresId]);

  // Métricas globales
  const totalPresupuestado = entries.reduce((a, [, p]) => a + p.total, 0);
  const totalCobrado = entries.reduce((a, [, p]) => {
    const cobros = p.cobros || [];
    return a + cobros.reduce((b, c) => b + c.monto, 0);
  }, 0);
  const totalPendiente = entries.reduce((a, [, p]) => {
    if (p.estado === "entregado" || p.estado === "aceptado" || p.estado === "produccion") {
      const cobros = p.cobros || [];
      const cobrado = cobros.reduce((b, c) => b + c.monto, 0);
      return a + Math.max(0, p.total - cobrado);
    }
    return a;
  }, 0);
  const vencidos = entries.filter(([id, p]) => {
    if (p.estado !== "enviado" && p.estado !== "nuevo") return false;
    const dias = Math.floor((Date.now() - parseInt(id)) / 86400000);
    return dias > (p.diasVigencia || 15);
  }).length;

  const metricaStyle = {
    background: "var(--bg-surface)", border: "1px solid var(--border)",
    borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 140,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Cobros, márgenes y vencimientos de tus trabajos">
        Caja
      </SectionTitle>

      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", borderRadius: 12, border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💵</div>
          <p style={{ fontSize: 14 }}>No hay trabajos guardados todavía.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>Guardá un presupuesto desde <strong style={{ color: "var(--accent)" }}>📋 Presupuesto</strong> para gestionarlo acá.</p>
        </div>
      ) : (
        <>
          {/* Métricas resumen */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="anim-fadeup stagger-1" style={{ ...metricaStyle, borderTop: "3px solid var(--accent)" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: 6 }}>Total presupuestado</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 900, color: "var(--accent)" }}>{fmtPeso(totalPresupuestado)}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 300 }}>{entries.length} trabajos</div>
            </div>
            <div className="anim-fadeup stagger-2" style={{ ...metricaStyle, borderTop: "3px solid #7ecf8a" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: 6 }}>Total cobrado</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 900, color: "#7ecf8a" }}>{fmtPeso(totalCobrado)}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 300 }}>
                {totalPresupuestado !== 0 ? Math.round((totalCobrado / Math.abs(totalPresupuestado)) * 100) : 0}% del total
              </div>
            </div>
            <div className="anim-fadeup stagger-3" style={{ ...metricaStyle, borderTop: "3px solid #e07070" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: 6 }}>Pendiente de cobro</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 900, color: "#e07070" }}>{fmtPeso(totalPendiente)}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 300 }}>en trabajos activos</div>
            </div>
            {vencidos > 0 && (
              <div className="anim-fadeup stagger-4" style={{ ...metricaStyle, borderTop: "3px solid #c8a02a" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: 6 }}>Presupuestos vencidos</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 900, color: "#c8a02a" }}>{vencidos}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 300 }}>requieren seguimiento</div>
              </div>
            )}
          </div>

          {/* Lista de trabajos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {entries.map(([id, p]) => (
              <FilaCaja key={id} id={id} p={p} onActualizar={onActualizar} modulos={modulos} costos={costos} autoAbrir={autoAbrirId === id} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 14. MI TALLER
// ══════════════════════════════════════════════════════════════════
// ── PanelPerfil ───────────────────────────────────────────────────
function PanelPerfil({ perfil, onGuardar }) {
  const [form, setForm] = useState({ ...perfil });
  const [guardado, setGuardado] = useState(false);
  const logoRef = React.useRef();

  // Recordatorio de backup — muestra días desde el último
  const diasDesdeBackup = (() => {
    try {
      const ts = localStorage.getItem("carpicalc:ultimo_backup");
      if (!ts) return null;
      return Math.floor((Date.now() - parseInt(ts)) / (1000 * 60 * 60 * 24));
    } catch { return null; }
  })();

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await comprimirImagen(file, 300, 120, 0.88);
    upd("logo", b64);
    e.target.value = "";
  };

  const handleGuardar = () => {
    onGuardar({ ...form });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  const inp = {
    fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: "9px 13px",
    background: "var(--bg-base)", border: "1px solid var(--border)",
    color: "var(--text-primary)", borderRadius: 8, outline: "none",
    width: "100%", transition: "border-color 0.15s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 640 }}>
      <SectionTitle sub="Esta información aparece en todos los documentos generados">
        ⚙ Mi Taller
      </SectionTitle>

      {/* Banner de recordatorio de backup */}
      {(diasDesdeBackup === null || diasDesdeBackup >= 7) && (
        <div style={{
          padding: "12px 16px", borderRadius: 10,
          background: diasDesdeBackup === null ? "rgba(200,160,42,0.10)" : diasDesdeBackup >= 14 ? "rgba(200,60,60,0.10)" : "rgba(200,160,42,0.10)",
          border: `1px solid ${diasDesdeBackup === null || diasDesdeBackup < 14 ? "rgba(200,160,42,0.30)" : "rgba(200,60,60,0.30)"}`,
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: diasDesdeBackup !== null && diasDesdeBackup >= 14 ? "#e07070" : "#c8a02a", marginBottom: 2 }}>
              {diasDesdeBackup === null ? "⚠ Nunca realizaste un backup" : `⚠ Último backup hace ${diasDesdeBackup} días`}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Tus datos viven en este navegador. Un backup protege meses de trabajo.
            </div>
          </div>
          <a href="#catalogo" onClick={e => { e.preventDefault(); document.querySelector('[data-vista="catalogo"]')?.click(); }}
            style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#c8a02a", textDecoration: "underline", cursor: "pointer", whiteSpace: "nowrap" }}>
            Ir a Catálogo → Backup
          </a>
        </div>
      )}

      <Card className="rsp-card">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Logo */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 10 }}>
              Logo del taller
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 120, height: 60, borderRadius: 8, overflow: "hidden",
                border: "1px dashed var(--border)", display: "flex", alignItems: "center",
                justifyContent: "center", background: "var(--bg-subtle)", flexShrink: 0,
                cursor: "pointer", transition: "border-color 0.15s",
              }}
                onClick={() => logoRef.current?.click()}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
              >
                {form.logo
                  ? <img src={form.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  : <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", textAlign: "center" }}>🖼 Subir logo</span>
                }
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                  PNG o JPG recomendado. Se comprime automáticamente a 300×120px.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => logoRef.current?.click()}
                    style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                    {form.logo ? "Cambiar" : "Subir logo"}
                  </button>
                  {form.logo && (
                    <button onClick={() => upd("logo", null)}
                      style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid rgba(200,60,60,0.25)", color: "#e07070" }}>
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
          </div>

          <div style={{ height: 1, background: "var(--separator)" }} />

          {/* Nombre y slogan */}
          <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Nombre del taller
              </label>
              <input value={form.nombre} onChange={e => upd("nombre", e.target.value)}
                placeholder="Ej: Carpintería del Sur"
                style={inp}
                onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Slogan (opcional)
              </label>
              <input value={form.slogan} onChange={e => upd("slogan", e.target.value)}
                placeholder="Ej: Muebles a medida con calidad"
                style={inp}
                onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"} />
            </div>
          </div>

          {/* Contacto */}
          <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {[
              { k: "tel", label: "Teléfono", ph: "Ej: 341 555-1234" },
              { k: "email", label: "Email", ph: "Ej: taller@mail.com" },
              { k: "direccion", label: "Dirección", ph: "Ej: Av. San Martín 456" },
            ].map(({ k, label, ph }) => (
              <div key={k}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  {label}
                </label>
                <input value={form[k]} onChange={e => upd(k, e.target.value)}
                  placeholder={ph} style={inp}
                  onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
            ))}
          </div>

          {/* Preview */}
          {(form.nombre || form.logo) && (
            <div style={{ padding: "14px 16px", background: "#fff", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                Vista previa del encabezado
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "2px solid #a07030", paddingBottom: 10 }}>
                {form.logo && <img src={form.logo} alt="logo" style={{ height: 40, objectFit: "contain" }} />}
                <div>
                  {form.nombre && <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 900, color: "#7a4a10" }}>{form.nombre}</div>}
                  {form.slogan && <div style={{ fontSize: 11, color: "#9a7040", fontStyle: "italic" }}>{form.slogan}</div>}
                  <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>
                    {[form.tel, form.email, form.direccion].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Textos predeterminados */}
          <div style={{ height: 1, background: "var(--separator)" }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 4 }}>
              Texto de apertura predeterminado
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
              Aparece al inicio de cada presupuesto en Vista Previa. Podés editarlo por presupuesto.
            </p>
            <textarea value={form.textoApertura || ""} onChange={e => upd("textoApertura", e.target.value)}
              rows={3} placeholder="Ej: Estimado cliente, le hacemos llegar el presente presupuesto por los trabajos solicitados."
              style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 4 }}>
              Condiciones predeterminadas
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
              Aparece al pie de cada presupuesto. Podés editarlo por presupuesto.
            </p>
            <textarea value={form.condiciones || ""} onChange={e => upd("condiciones", e.target.value)}
              rows={3} placeholder="Ej: Validez del presupuesto: 15 días. Precios sin IVA. Seña del 40% para iniciar fabricación."
              style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"} />
          </div>

          {/* Guardar */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleGuardar} style={{
              padding: "10px 24px", borderRadius: 8, cursor: "pointer",
              background: guardado ? "rgba(126,207,138,0.15)" : "linear-gradient(135deg,var(--accent),var(--accent-hover))",
              border: guardado ? "1px solid rgba(126,207,138,0.4)" : "none",
              color: guardado ? "#7ecf8a" : "var(--text-inverted)",
              fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.08em", transition: "all 0.2s",
              boxShadow: guardado ? "none" : "0 3px 12px rgba(180,100,20,0.28)",
            }}>
              {guardado ? "✓ Guardado" : "Guardar datos del taller"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 15. APP PRINCIPAL
// ══════════════════════════════════════════════════════════════════
// ── Header ────────────────────────────────────────────────────────
function Header({ vista, setVista, tabs, saveEst, tema, toggleTema }) {
  return (
    <header
      className="no-print rsp-header-inner"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "0 28px",
        background: "rgba(15,17,21,0.80)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 1px 0 var(--separator), var(--shadow-sm)",
        transition: "background 0.3s",
      }}
    >
      {/* Brand — LogoIsotipo + nombre */}
      <div className="rsp-brand" style={{ padding: "12px 0", flexShrink: 0, display: "flex", alignItems: "center", gap: 9 }}>
        <LogoIsotipo size={36} />
        <div className="rsp-brand-text">
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 900, color: "var(--accent)", lineHeight: 1, letterSpacing: "-0.02em" }}>
            CarpiCálc
          </div>
          <div style={{ fontSize: 8, letterSpacing: "0.26em", textTransform: "uppercase", marginTop: 3, color: "var(--text-muted)", fontWeight: 400, fontFamily: "'DM Mono',monospace" }}>
            Diseño & Costos
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="rsp-nav" style={{ display: "flex", flex: 1 }}>
        {tabs.map((t) => {
          const active = vista === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setVista(t.id)}
              style={{
                position: "relative",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                color: active ? "var(--accent)" : "var(--text-muted)",
                padding: "18px 20px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontFamily: "'DM Mono',monospace",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderBottomColor = "var(--accent-border)"; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderBottomColor = "transparent"; }}}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </nav>

      {/* Controles */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <SaveIndicator estado={saveEst} />
        <button
          onClick={toggleTema}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 999, fontSize: 11,
            fontFamily: "'DM Mono',monospace", fontWeight: 700,
            cursor: "pointer", transition: "all 0.2s",
            border: "1px solid var(--accent-border)",
            background: "var(--accent-soft)",
            color: "var(--accent)", whiteSpace: "nowrap",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,175,55,0.18)"; e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--accent-soft)"; e.currentTarget.style.borderColor = "var(--accent-border)"; }}
        >
          {tema === "dark" ? "☀ Cálido" : "🌑 Taller"}
        </button>
      </div>
    </header>
  );
}

// ── Login ─────────────────────────────────────────────────────────

function LoginScreen({ onAccess }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const intentar = () => {
    if (btoa(input) === PASS_HASH) {
      sessionStorage.setItem(PASS_KEY, "1");
      onAccess();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setError(false), 2000);
      setInput("");
    }
  };

  return (
    <>
      <GlobalStyles />
      <div style={{
        minHeight: "100vh", background: "var(--bg-base)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}>
        <div style={{
          width: "100%", maxWidth: 380,
          background: "var(--bg-surface)", borderRadius: 16,
          border: "1px solid var(--border)", padding: "40px 36px",
          boxShadow: "var(--shadow)",
          animation: shake ? "shake 0.4s ease" : "scaleIn 0.45s cubic-bezier(0.22,1,0.36,1)",
        }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <LogoIsotipo size={72} />
            </div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>
              CarpiCálc
            </div>
            <div style={{ fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase", marginTop: 6, color: "var(--text-muted)", fontWeight: 400, fontFamily: "'DM Mono',monospace" }}>
              Diseño & Gestión de Costos
            </div>
          </div>

          {/* Campo contraseña */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: 8 }}>
              Contraseña de acceso
            </label>
            <input
              type="password"
              value={input}
              onChange={e => { setInput(e.target.value); setError(false); }}
              onKeyDown={e => e.key === "Enter" && intentar()}
              placeholder="••••••••"
              autoFocus
              style={{
                width: "100%", padding: "11px 14px",
                fontFamily: "'DM Mono',monospace", fontSize: 16,
                background: "var(--bg-base)",
                border: `1px solid ${error ? "#e07070" : "var(--border)"}`,
                borderRadius: 8, color: "var(--text-primary)", outline: "none",
                transition: "border-color 0.2s",
                letterSpacing: "0.15em",
              }}
              onFocus={e => { if (!error) e.target.style.borderColor = "var(--accent-border)"; }}
              onBlur={e => { if (!error) e.target.style.borderColor = "var(--border)"; }}
            />
            {error && (
              <div style={{ marginTop: 6, fontSize: 11, color: "#e07070", fontFamily: "'DM Mono',monospace" }}>
                Contraseña incorrecta
              </div>
            )}
          </div>

          {/* Botón */}
          <button onClick={intentar} style={{
            width: "100%", padding: "11px 0",
            background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
            border: "none", borderRadius: 8, color: "var(--text-inverted)",
            fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700,
            letterSpacing: "0.1em", cursor: "pointer", transition: "opacity 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Ingresar →
          </button>
        </div>

        <style>{`
          @keyframes shake {
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-8px)}
            40%{transform:translateX(8px)}
            60%{transform:translateX(-6px)}
            80%{transform:translateX(6px)}
          }
        `}</style>
      </div>
    </>
  );
}

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  const [autenticado, setAutenticado] = useState(
    () => sessionStorage.getItem(PASS_KEY) === "1"
  );

  if (!autenticado) return <LoginScreen onAccess={() => setAutenticado(true)} />;

  return <AppInterna />;
}

function AppInterna() {
  const { tema, toggleTema } = useTema();
  const [vista, setVista] = useState("presupuesto");
  const [modulos, setModulos] = useState(null);
  const [costos, setCostos] = useState(null);
  const [presupuestos, setPresupuestos] = useState({});
  const [perfil, setPerfil] = useState({ ...PERFIL_VACIO });
  const [cargando, setCargando] = useState(true);
  const [saveEst, setSaveEst] = useState(null);
  const [items, setItems] = useState([]);
  const [dimOverride, setDimOverride] = useState({});
  // Adicionales: gastos extra de monto libre (flete, diseño, etc.)
  const [adicionales, setAdicionales] = useState([]);
  // Costos Directos: ítems vinculados a la tabla de costos (MO, materiales, herrajes, tapacanto)
  const [costosDirectos, setCostosDirectos] = useState([]);
  const [presupuestoVistaPreviaId, setPresupuestoVistaPreviaId] = useState(null);
  // NAVEGACIÓN - Enlace Presupuesto a Caja
  // Cuando el usuario hace click en "Ver Rentabilidad" desde Vista Previa,
  // guardamos el id aquí para que PanelCaja abra esa fila automáticamente.
  const [cajaPresId, setCajaPresId] = useState(null);
  // LOGICA - Edición de Presupuestos Existentes: puente para que Presupuesto sepa que está editando uno existente
  const [presupuestoParaEditar, setPresupuestoParaEditar] = useState(null);
  // Deep Link Nivel 3: código del módulo a abrir directamente en Catálogo
  const [catalogoModuloDeepLink, setCatalogoModuloDeepLink] = useState(null);
  // origenEdicion: contexto de retorno después de edición profunda (Nivel 3).
  // Se setea al navegar al catálogo desde Presupuesto y se consume al guardar.
  // Permite cerrar el ciclo: Presupuesto → Catálogo → guardar → volver al mismo punto.
  const [origenEdicion, setOrigenEdicion] = useState(null);
  // { tipo: "presupuesto", presupuestoId, itemIdx, tempCod }
  // Versión de costos: timestamp de la última modificación en la pestaña Costos.
  const [costosVersion, setCostosVersion] = useState(leerVersionCostos);
  // Notificación de borrador recuperado
  const [borradorRecuperado, setBorradorRecuperado] = useState(false);

  useEffect(() => {
    cargarDatos().then(({ modulos, costos, presupuestos, perfil }) => {
      setModulos(modulos);
      setCostos(costos);
      setPresupuestos(presupuestos || {});
      if (perfil) setPerfil(perfil);
      // Recuperar borrador guardado (persiste entre cierres de pestaña)
      try {
        const borrador = localStorage.getItem("carpicalc:borrador");
        if (borrador) {
          const { items: bItems, dimOverride: bDim } = JSON.parse(borrador);
          if (bItems?.length > 0) {
            setItems(bItems);
            setDimOverride(bDim || {});
            setBorradorRecuperado(true); // avisar al usuario
          }
        }
      } catch {}
      setCargando(false);
    });
  }, []);

  // Autosave borrador en localStorage — persiste entre cierres de pestaña
  useEffect(() => {
    if (items.length > 0) {
      try {
        localStorage.setItem("carpicalc:borrador", JSON.stringify({ items, dimOverride }));
      } catch {}
    } else {
      localStorage.removeItem("carpicalc:borrador");
    }
  }, [items, dimOverride]);

  // Avisa antes de cerrar si hay un presupuesto sin guardar
  useEffect(() => {
    const handler = (e) => {
      if (items.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [items]);

  const withSave = async (fn) => {
    setSaveEst("guardando");
    const ok = await fn();
    setSaveEst(ok ? "guardado" : "error");
    setTimeout(() => setSaveEst(null), 2500);
  };
  const hSaveM = (data) => withSave(() => guardarModulos(data));
  const hSaveC = (data) => {
    setCostosVersion(Date.now());
    return withSave(() => guardarCostos(data));
  };

  const getModUsado = useCallback(
    (item) => {
      if (!modulos || !item) return null;
      const cod = typeof item === "string" ? item : item.codigo;
      const keyId = typeof item === "string" ? item : item.id || item.codigo;
      const base = modulos[cod];
      if (!base) return null;
      const over = dimOverride[keyId] || {};
      return {
        ...base,
        dimensiones: {
          ancho: over.ancho ?? base.dimensiones.ancho,
          profundidad: over.profundidad ?? base.dimensiones.profundidad,
          alto: over.alto ?? base.dimensiones.alto,
        },
      };
    },
    [modulos, dimOverride]
  );

  // totalGeneral = módulos + adicionales libres + costos directos vinculados a tabla
  // Solo los módulos usan calcularModulo — los otros dos son montos directos
  const totalModulos = !costos
    ? 0
    : items.reduce((acc, it) => {
        const m = getModUsado(it);
        if (!m) return acc;
        const c = calcularModulo(m, costos);
        if (!c) return acc;
        return acc + c.total * it.cantidad;
      }, 0);
  const totalAdicionales  = adicionales.reduce((a, x) => a + (parseFloat(x.monto) || 0), 0);
  const totalCostosDirectos = costosDirectos.reduce((a, x) => a + (parseFloat(x.subtotal) || 0), 0);
  const totalGeneral = totalModulos + totalAdicionales + totalCostosDirectos;

  const handleGuardarPresupuesto = async (nombre, cliente, nota, presupuestoCompleto) => {
    const id = String(Date.now());
    const nuevo = {
      ...presupuestos,
      [id]: presupuestoCompleto || {
        nombre,
        cliente:       cliente || { nombre: "", tel: "", dir: "" },
        nota:          nota || "",
        estado:        "nuevo",
        items:         [...items],
        dimOverride:   { ...dimOverride },
        adicionales:   [...adicionales],
        costosDirectos:[...costosDirectos],
        total:         totalGeneral,
      },
    };
    setPresupuestos(nuevo);
    withSave(() => guardarPresupuestos(nuevo));
    localStorage.removeItem("carpicalc:borrador");
  };
  const handleCargarPresupuesto = (p, id) => {
    setItems(p.items ? [...p.items] : []);
    setDimOverride(p.dimOverride && typeof p.dimOverride === "object" ? { ...p.dimOverride } : {});
    setAdicionales(Array.isArray(p.adicionales) ? [...p.adicionales] : []);
    setCostosDirectos(Array.isArray(p.costosDirectos) ? [...p.costosDirectos] : []);
    localStorage.removeItem("carpicalc:borrador");
  };
  // LÓGICA - Adicionales: guarda un extra nuevo en costos.extrasFrecuentes
  const handleGuardarExtraFrecuente = (extra) => {
    const nuevo = {
      ...costos,
      extrasFrecuentes: [
        ...(costos.extrasFrecuentes || []),
        { id: Date.now(), nombre: extra.nombre, precio: extra.precio },
      ],
    };
    setCostos(nuevo);
    withSave(() => guardarCostos(nuevo));
  };
  const handleEliminarPresupuesto = async (id) => {
    // Fix 3: filtrar por códigos TEMP efectivamente usados por los items
    // No depender de presupuestoId (puede ser null si el pres nunca se guardó formalmente)
    const presEliminado = presupuestos[id];
    const codigosEnUso  = new Set(
      (presEliminado?.items || []).map(it => it.codigo).filter(c => c?.startsWith("TEMP_"))
    );
    // También limpiar TEMP con presupuestoId === id (por si acaso)
    const nuevosModulos = Object.fromEntries(
      Object.entries(modulos).filter(([cod, m]) => {
        if (!m.temporal) return true;                    // permanente → conservar
        if (codigosEnUso.has(cod)) return false;         // usado en este presupuesto → eliminar
        if (m.presupuestoId === id) return false;         // vinculado por id → eliminar
        return true;                                      // temporal de otro presupuesto → conservar
      })
    );
    const seEliminaronTemporales = Object.keys(nuevosModulos).length < Object.keys(modulos).length;
    if (seEliminaronTemporales) {
      setModulos(nuevosModulos);
      withSave(() => guardarModulos(nuevosModulos));
    }
    const nuevo = { ...presupuestos };
    delete nuevo[id];
    setPresupuestos(nuevo);
    withSave(() => guardarPresupuestos(nuevo));
  };
  const handleCambiarEstado = async (id, nuevoEstado) => {
    const nuevo = {
      ...presupuestos,
      [id]: { ...presupuestos[id], estado: nuevoEstado },
    };
    setPresupuestos(nuevo);
    withSave(() => guardarPresupuestos(nuevo));
  };

  const handleActualizarPresupuesto = async (id, cambios) => {
    const nuevo = {
      ...presupuestos,
      [id]: { ...presupuestos[id], ...cambios },
    };
    setPresupuestos(nuevo);
    withSave(() => guardarPresupuestos(nuevo));
  };

  const tabs = [
    { id: "presupuesto", label: "Presupuesto", icon: "📋" },
    { id: "preview",     label: "Vista previa", icon: "📄" },
    { id: "corte",       label: "Corte",        icon: "🪚" },
    { id: "trabajos",    label: "Trabajos",     icon: "📊" },
    { id: "caja",        label: "Caja",         icon: "💵" },
    { id: "catalogo",    label: "Catálogo",     icon: "🗂" },
    { id: "costos",      label: "Costos",       icon: "💰" },
    { id: "config",      label: "Mi taller",    icon: "⚙" },
  ];

  if (cargando)
    return (
      <>
        <GlobalStyles />
        <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="anim-scalein" style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <LogoIsotipo size={88} />
            </div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 900, color: "var(--accent)", letterSpacing: "-0.02em", marginBottom: 6 }}>
              CarpiCálc
            </div>
            <div style={{ fontSize: 9, letterSpacing: "0.30em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 28, fontWeight: 400, fontFamily: "'DM Mono',monospace" }}>
              Diseño & Gestión de Costos
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%", background: "var(--accent)",
                  animation: `dotPulse 1.2s ease-in-out infinite`,
                  animationDelay: `${i * 0.18}s`,
                  opacity: 0.3,
                }} />
              ))}
            </div>
            <style>{`
              @keyframes dotPulse {
                0%,80%,100%{opacity:0.3;transform:scale(1)}
                40%{opacity:1;transform:scale(1.4)}
              }
            `}</style>
          </div>
        </div>
      </>
    );

  return (
    <>
      <GlobalStyles />
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-base)",
          color: "var(--text-primary)",
          transition: "background 0.3s",
        }}
      >
        <Header
          vista={vista}
          setVista={setVista}
          tabs={tabs}
          saveEst={saveEst}
          tema={tema}
          toggleTema={toggleTema}
        />
        {/* rsp-main: padding reducido en móvil */}
        <main
          className="rsp-main"
          style={{ maxWidth: 980, margin: "0 auto", padding: "28px 20px" }}
        >
          {/* tab-view: animación de entrada al cambiar de pestaña */}
          <div key={vista} className="tab-view">
          {vista === "presupuesto" && (
            <Presupuesto
              modulos={modulos}
              costos={costos}
              items={items}
              setItems={setItems}
              dimOverride={dimOverride}
              setDimOverride={setDimOverride}
              getModUsado={getModUsado}
              totalGeneral={totalGeneral}
              presupuestos={presupuestos}
              onGuardarPresupuesto={handleGuardarPresupuesto}
              onCargarPresupuesto={handleCargarPresupuesto}
              onEliminarPresupuesto={handleEliminarPresupuesto}
              onCambiarEstado={handleCambiarEstado}
              onActualizarPresupuesto={handleActualizarPresupuesto}
              onVerPresupuesto={(id) => { setPresupuestoVistaPreviaId(id); setVista("preview"); }}
              costosVersion={costosVersion}
              presupuestoParaEditar={presupuestoParaEditar}
              onPresupuestoEditarConsumed={() => setPresupuestoParaEditar(null)}
              borradorRecuperado={borradorRecuperado}
              onDismissBorrador={() => setBorradorRecuperado(false)}
              adicionales={adicionales}
              setAdicionales={setAdicionales}
              costosDirectos={costosDirectos}
              setCostosDirectos={setCostosDirectos}
              onGuardarExtraFrecuente={handleGuardarExtraFrecuente}
              onVerCatalogo={(codigo, contexto) => {
                setCatalogoModuloDeepLink(codigo);
                // Guardar contexto de retorno para cerrar el ciclo al guardar
                if (contexto) setOrigenEdicion(contexto);
                setVista("catalogo");
              }}
              onVolverDesCatalogo={() => setVista("presupuesto")}
              setModulos={setModulos}
              hSaveModulos={hSaveM}
              onLimpiarTemps={(itemsActuales) => {
                // Limpiar TEMP usados por el presupuesto que se está cancelando
                const codsTemp = itemsActuales.filter(it => it.codigo?.startsWith("TEMP_")).map(it => it.codigo);
                if (codsTemp.length === 0) return;
                const nuevos = Object.fromEntries(Object.entries(modulos).filter(([c]) => !codsTemp.includes(c)));
                setModulos(nuevos);
                hSaveM(nuevos);
              }}
              onActualizarCatalogo={(codigo, modActualizado) => {
                const nuevos = { ...modulos, [codigo]: modActualizado };
                setModulos(nuevos);
                hSaveM(nuevos);
              }}
              onGuardarModuloCatalogo={(nuevoMod, nombreFinal, tempCod, presupuestoId) => {
                // Migración explícita TEMP → MC_xxx (sin mutación in-place):
                // 1. Crear nuevo módulo permanente con código MC_xxx
                // 2. Actualizar referencias en el presupuesto
                // 3. Eliminar TEMP original
                // 4. Persistir ambos en el mismo ciclo
                const newId = `MC${String(Date.now()).slice(-6)}`;
                const modPermanente = {
                  ...nuevoMod,
                  nombre:    nombreFinal || nuevoMod.nombre,
                  temporal:  false,
                  presupuestoId: undefined,  // ya no es temporal
                  origenCodigo:  undefined,
                };
                // Aplicar migración al estado de módulos
                const nuevosModulos = { ...modulos };
                nuevosModulos[newId] = modPermanente;
                if (tempCod && nuevosModulos[tempCod]) delete nuevosModulos[tempCod];
                setModulos(nuevosModulos);
                hSaveM(nuevosModulos);  // persistir inmediatamente
                // Actualizar referencias en el presupuesto afectado
                if (presupuestoId && tempCod && presupuestos[presupuestoId]) {
                  const pres = presupuestos[presupuestoId];
                  const itemsActualizados = (pres.items || []).map(it =>
                    it.codigo === tempCod ? { ...it, codigo: newId } : it
                  );
                  const presMigrado = { ...pres, items: itemsActualizados };
                  const nuevosPres = { ...presupuestos, [presupuestoId]: presMigrado };
                  setPresupuestos(nuevosPres);
                  withSave(() => guardarPresupuestos(nuevosPres));  // persistir inmediatamente
                }
                return newId;
              }}
            />
          )}
          {vista === "preview" && (
            <VistaPrevia
              items={items}
              modulos={modulos}
              costos={costos}
              onLimpiar={() => { setItems([]); setDimOverride({}); }}
              getModUsado={getModUsado}
              totalGeneral={totalGeneral}
              presupuestos={presupuestos}
              perfil={perfil}
              onActualizarPresupuesto={handleActualizarPresupuesto}
              onCambiarEstado={handleCambiarEstado}
              onCargarPresupuesto={handleCargarPresupuesto}
              presupuestoSelId={presupuestoVistaPreviaId}
              onSeleccionarPresupuesto={setPresupuestoVistaPreviaId}
              costosVersion={costosVersion}
              onVerRentabilidad={(id) => {
                setCajaPresId(id);
                setVista("caja");
              }}
              // LOGICA - Edición de Presupuestos Existentes
              // Carga el presupuesto en el estado activo y navega a Presupuesto para edición completa
              onEditarModulos={(id, p) => {
                handleCargarPresupuesto(p, id);
                // Disparar handleCargar del componente Presupuesto para setear presupuestoActivoId
                // lo hacemos seteando un estado puente que Presupuesto consume al montar
                setPresupuestoParaEditar({ id, p });
                setVista("presupuesto");
              }}
            />
          )}
          {vista === "corte" && (
            <ListaCorte
              items={items}
              modulos={modulos}
              costos={costos}
              getModUsado={getModUsado}
              presupuestos={presupuestos}
              presupuestoVistaPreviaId={presupuestoVistaPreviaId}
            />
          )}
          {vista === "trabajos" && (
            <TableroKanban
              presupuestos={presupuestos}
              onCambiarEstado={handleCambiarEstado}
              onEliminar={handleEliminarPresupuesto}
              onCargar={(p) => { handleCargarPresupuesto(p); setVista("presupuesto"); }}
              modulos={modulos}
              costos={costos}
              onActualizarPresupuesto={handleActualizarPresupuesto}
            />
          )}
          {vista === "caja" && (
            <PanelCaja
              presupuestos={presupuestos}
              onActualizar={handleActualizarPresupuesto}
              modulos={modulos}
              costos={costos}
              cajaPresId={cajaPresId}
              onClearCajaPresId={() => setCajaPresId(null)}
            />
          )}
          {vista === "catalogo" && (
            <CatalogoModulos
              modulos={modulos}
              setModulos={setModulos}
              costos={costos}
              onSave={hSaveM}
              setCostos={setCostos}
              hSaveC={hSaveC}
              presupuestos={presupuestos}
              perfil={perfil}
              onGuardarPerfil={(nuevo) => {
                setPerfil(nuevo);
                withSave(() => guardarPerfil(nuevo));
              }}
              deepLinkCodigo={catalogoModuloDeepLink}
              onDeepLinkConsumed={() => setCatalogoModuloDeepLink(null)}
              origenEdicion={origenEdicion}
              onGuardarPermanente={(tempCod, newId) => {
                // Actualizar referencias del presupuesto: TEMP → MC permanente
                if (origenEdicion?.presupuestoId && presupuestos[origenEdicion.presupuestoId]) {
                  const pres = presupuestos[origenEdicion.presupuestoId];
                  const itemsActualizados = (pres.items || []).map(it =>
                    it.codigo === tempCod ? { ...it, codigo: newId } : it
                  );
                  const nuevosPres = { ...presupuestos, [origenEdicion.presupuestoId]: { ...pres, items: itemsActualizados } };
                  setPresupuestos(nuevosPres);
                  withSave(() => guardarPresupuestos(nuevosPres));
                }
                // También actualizar items del presupuesto activo en memoria
                setItems(prev => prev.map(it => it.codigo === tempCod ? { ...it, codigo: newId } : it));
              }}
              onVolverAlPresupuesto={origenEdicion?.tipo === "presupuesto"
                ? () => {
                    // Restaurar estado completo del presupuesto
                    // para que el carpintero pueda seguir trabajando normalmente
                    setVista("presupuesto");
                    setOrigenEdicion(null);
                    setCatalogoModuloDeepLink(null);
                  }
                : (catalogoModuloDeepLink ? () => setVista("presupuesto") : null)
              }
            />
          )}
          {vista === "costos" && (
            <HojaCostos costos={costos} setCostos={setCostos} onSave={hSaveC} />
          )}
          {vista === "config" && (
            <PanelPerfil
              perfil={perfil}
              onGuardar={(nuevo) => {
                setPerfil(nuevo);
                withSave(() => guardarPerfil(nuevo));
              }}
            />
          )}
          </div>{/* cierre tab-view */}
        </main>
      </div>
    </>
  );
}
