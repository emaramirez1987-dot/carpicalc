// ui.jsx — Visual primitives for Vista 3D
// Rules:
//   • No hardcoded colors — all values from tok() in theme.js
//   • No hover via useState — use onMouseEnter/Leave DOM mutation
//   • No inline SVGs — import from icons.jsx
//   • BaseButton is the internal foundation; not exported
//   • Keep this file small: one primitive per concern

import React, { useState, useEffect, useRef } from 'react';
import { tok } from './theme.js';

// ── BaseButton ─────────────────────────────────────────────────────────────────
// Internal only — not exported. Use ToolbarBtn, IconBtn, etc. instead.
// Provides: cursor, outline:none, transition, disabled guard.
// Callers pass onHoverIn/Out to control hover visual state.
function BaseButton({ onClick, title, disabled, style, onHoverIn, onHoverOut, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        cursor: disabled ? 'default' : 'pointer',
        outline: 'none',
        transition: 'background 0.14s, color 0.14s, border-color 0.14s',
        lineHeight: 1,
        padding: 0,
        margin: 0,
        ...style,
      }}
      onMouseEnter={onHoverIn}
      onMouseLeave={onHoverOut}
    >
      {children}
    </button>
  );
}

// ── ToolbarBtn ─────────────────────────────────────────────────────────────────
// A toolbar button with two variants:
//   exclusive — camera presets: full border + rounded, one active at a time
//   toggle    — scene toggles: underline-only when active, no radius
//
// Props:
//   variant    'exclusive' | 'toggle'   default: 'exclusive'
//   icon       ReactNode (from icons.jsx)
//   label      string — short uppercase label below icon
//   active     boolean
//   onClick    function
//   title      string — tooltip
export function ToolbarBtn({ icon, label, active, onClick, title, variant = 'exclusive' }) {
  const T = tok();
  const tb = T.toolbar;
  const isExclusive = variant === 'exclusive';

  const style = isExclusive ? {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    padding: '7px 10px 6px',
    background: active ? tb.activeBg    : tb.inactiveBg,
    border:     active ? `1px solid ${tb.activeBorder}` : '1px solid transparent',
    borderRadius: 7,
    color:      active ? tb.activeText  : tb.inactiveText,
  } : {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    padding: '7px 8px 6px',
    background: active ? tb.activeBg   : 'transparent',
    border: 'none',
    borderBottom: active ? `2px solid ${tb.activeText}` : '2px solid transparent',
    borderRadius: 0,
    color: active ? tb.activeText : tb.inactiveText,
  };

  const hoverIn = (e) => {
    if (active) return;
    e.currentTarget.style.background = tb.hoverBg;
    e.currentTarget.style.color = tb.hoverText;
  };

  const hoverOut = (e) => {
    if (active) return;
    e.currentTarget.style.background = isExclusive ? tb.inactiveBg : 'transparent';
    e.currentTarget.style.color = tb.inactiveText;
  };

  return (
    <BaseButton onClick={onClick} title={title} style={style} onHoverIn={hoverIn} onHoverOut={hoverOut}>
      {icon}
      {label && (
        <span style={{
          fontSize: 7,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.06em',
        }}>
          {label}
        </span>
      )}
    </BaseButton>
  );
}

// ── IconBtn ────────────────────────────────────────────────────────────────────
// Square icon button. Used for actions (rotate, delete, maximize, refresh).
//
// Props:
//   icon     ReactNode
//   size     number (px) — default 32
//   danger   boolean — uses danger token group
//   active   boolean — uses toolbar.active token group
//   style    additional styles (e.g. alignSelf, margin)
export function IconBtn({ icon, onClick, title, danger, active, size = 32, style }) {
  const T = tok();
  const group = danger ? T.danger : T.btn;
  const bg    = active ? T.toolbar.activeBg     : group.bg;
  const bord  = active ? T.toolbar.activeBorder : group.border;
  const color = active ? T.toolbar.activeText   : group.text;

  const hoverIn = (e) => {
    if (active) return;
    e.currentTarget.style.background = danger ? T.danger.hoverBg : T.btn.hoverBg;
    e.currentTarget.style.color      = danger ? T.danger.hoverText : T.btn.hoverText;
  };

  const hoverOut = (e) => {
    if (active) return;
    e.currentTarget.style.background = bg;
    e.currentTarget.style.color      = color;
  };

  return (
    <BaseButton
      onClick={onClick}
      title={title}
      style={{
        width: size, height: size,
        background: bg,
        border: `1px solid ${bord}`,
        borderRadius: 7,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
        flexShrink: 0,
        ...style,
      }}
      onHoverIn={hoverIn}
      onHoverOut={hoverOut}
    >
      {icon}
    </BaseButton>
  );
}

// ── ToolbarDropdown ────────────────────────────────────────────────────────────
// Manages open/close, outside-click, and panel positioning only.
// No knowledge of what's inside the panel — that's the caller's concern.
//
// Props:
//   label    string | ReactNode — trigger button content
//   active   boolean — trigger shows active state (independent of open)
//   children — panel content
export function ToolbarDropdown({ label, active, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const T = tok();
  const tb = T.toolbar;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isActive = active || open;

  const hoverIn = (e) => {
    if (isActive) return;
    e.currentTarget.style.background = T.btn.hoverBg;
    e.currentTarget.style.color      = T.btn.hoverText;
  };

  const hoverOut = (e) => {
    if (isActive) return;
    e.currentTarget.style.background = T.btn.bg;
    e.currentTarget.style.color      = T.btn.text;
  };

  return (
    <div ref={ref} style={{ position: 'relative', alignSelf: 'center' }}>
      <BaseButton
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px',
          background: isActive ? tb.activeBg : T.btn.bg,
          border:     isActive ? `1px solid ${tb.activeBorder}` : `1px solid ${T.btn.border}`,
          borderRadius: 6,
          color:      isActive ? tb.activeText : T.btn.text,
          fontSize: 11,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.04em',
        }}
        onHoverIn={hoverIn}
        onHoverOut={hoverOut}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{label}</span>
        <span style={{ fontSize: 7, opacity: 0.65, lineHeight: 1 }}>▾</span>
      </BaseButton>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 5px)', left: 0,
          background: tb.bg,
          border: `1px solid ${tb.border}`,
          borderRadius: 8,
          padding: 5,
          zIndex: 300,
          minWidth: 140,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.30)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── TDivider ───────────────────────────────────────────────────────────────────
// Vertical divider for use inside a toolbar row.
export function TDivider() {
  const T = tok();
  return (
    <div style={{
      width: 1, height: 20,
      background: T.toolbar.divider,
      margin: '0 4px',
      flexShrink: 0,
      alignSelf: 'center',
    }} />
  );
}

// ── SectionLabel ───────────────────────────────────────────────────────────────
// Uppercase category header used in side panels.
export function SectionLabel({ children, style }) {
  const T = tok();
  return (
    <div style={{
      fontSize: 9,
      fontFamily: "'DM Mono', monospace",
      color: T.section.text,
      letterSpacing: '0.10em',
      textTransform: 'uppercase',
      padding: '10px 14px 5px',
      fontWeight: 500,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── PanelDivider ───────────────────────────────────────────────────────────────
// Horizontal 1px divider for side panels.
export function PanelDivider({ style }) {
  const T = tok();
  return <div style={{ height: 1, background: T.divider, ...style }} />;
}
