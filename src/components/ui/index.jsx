import React, {  } from "react";

// ══════════════════════════════════════════════════════════════════
// UI PRIMITIVOS — CarpiCalc
// Componentes visuales atómicos sin lógica de dominio.
// Dependen solo de React y variables CSS del tema.
// ══════════════════════════════════════════════════════════════════

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
      --bg-nav:rgba(8,10,13,0.92);
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
      --bg-nav:rgba(236,234,227,0.92);
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
      line-height:1.62;
      letter-spacing:-0.005em;
      font-feature-settings:"kern" 1,"liga" 1,"calt" 1;
      transition:background-color 0.3s,color 0.3s;
      -webkit-font-smoothing:antialiased;
      -moz-osx-font-smoothing:grayscale;
    }

    /* ── Tipografía de titulares ────────────────────────────────── */
    h1,h2,h3{
      text-rendering:optimizeLegibility;
      font-feature-settings:"kern" 1,"liga" 1;
      font-optical-sizing:auto;
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

    /* Loading dot pulse — splash screen */
    @keyframes dotPulse {
      0%,80%,100% { opacity: 0.3; transform: scale(1); }
      40%          { opacity: 1;   transform: scale(1.4); }
    }

    /* Shake — login error feedback */
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      15%      { transform: translateX(-7px); }
      30%      { transform: translateX(7px); }
      45%      { transform: translateX(-5px); }
      60%      { transform: translateX(5px); }
      75%      { transform: translateX(-3px); }
      90%      { transform: translateX(3px); }
    }
    .anim-shake { animation: shake 0.5s cubic-bezier(0.36,0.07,0.19,0.97) both; }

    /* Scrollbar fina y elegante */
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:var(--scrollbar-thumb);border-radius:4px;}
    ::-webkit-scrollbar-thumb:hover{background:var(--accent-border);}
    input[type="number"]::-webkit-inner-spin-button{opacity:0.3;}
    input[type="number"],input[type="text"]{
      font-variant-numeric:tabular-nums;
      font-feature-settings:"tnum" 1;
    }

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
      font-variant-numeric:tabular-nums;
      font-feature-settings:"tnum" 1,"zero" 1;
    }
    /* Peso variable para jerarquía */
    .text-display  { font-weight: 700; letter-spacing: -0.03em; }
    .text-label    { font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; font-size: 0.75em; }
    .text-data     { font-family: 'DM Mono', monospace; font-weight: 500; font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1, "zero" 1; }
    .text-subtle   { font-weight: 300; color: var(--text-muted); line-height: 1.65; }

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
          display: "block"
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
  disabled
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
            cursor: disabled ? "not-allowed" : undefined
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
              color: "var(--text-muted)"
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
          cursor: "pointer"
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
  disabled
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
    fontSize: small ? 12 : 13
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
          boxShadow: "0 3px 12px rgba(180,100,20,0.28)"
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
        color: "var(--text-secondary)"
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
        ...style
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
        alignItems: "center"
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
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1.14 }}>
          {children}
        </h2>
      </div>
      {sub && (
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, marginLeft: 15, fontWeight: 300, letterSpacing: "0.01em", lineHeight: 1.62 }}>
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
      label: "Guardando..."
    },
    guardado: { color: "#7ecf8a", icon: "✓", label: "Guardado" },
    error: { color: "#e07070", icon: "✗", label: "Error" }
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
        color: cfg.color
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
        color: value ? "var(--accent)" : "var(--text-muted)"
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
          transition: "background 0.2s"
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
            left: value ? 16 : 2
          }}
        />
      </span>
      {label}
    </button>
  );
}


export {
  LogoIsotipo,
  GlobalStyles,
  Field,
  TextInput,
  Select,
  Btn,
  Card,
  Badge,
  SectionTitle,
  SaveIndicator,
  ToggleSwitch
};
