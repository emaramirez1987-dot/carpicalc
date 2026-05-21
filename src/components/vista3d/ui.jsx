// ui.jsx — Visual primitives for Vista 3D
// Rules:
//   • No hardcoded colors — all values from tok() in theme.js
//   • No hover via useState — use onMouseEnter/Leave DOM mutation
//   • No inline SVGs — import from icons.jsx
//   • BaseButton is the internal foundation; not exported
//   • One primitive per concern — keep each export focused

import React, { useState, useEffect, useRef } from 'react';
import { tok } from './theme.js';

// ── BaseButton ─────────────────────────────────────────────────────────────────
// Internal only. Provides: cursor, outline:none, transition baseline.
// Callers control all visual state via style + onHoverIn/Out.
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
// Full-height stacked button: icon above, label below.
// Stretches to fill toolbar height — keeps all buttons visually level.
//
// variant  'exclusive' — camera presets: full border + rounded corners
//          'toggle'    — scene toggles: underline only, no radius
export function ToolbarBtn({ icon, label, active, onClick, title, variant = 'exclusive' }) {
  const T  = tok();
  const tb = T.toolbar;
  const isExclusive = variant === 'exclusive';

  // Both variants use the same box-style active treatment for visual consistency.
  // exclusive = camera presets (mutually exclusive radio group)
  // toggle    = independent scene toggles
  const style = isExclusive ? {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
    padding: '7px 10px 6px',
    background:   active ? tb.activeBg    : tb.inactiveBg,
    border:       active ? `1px solid ${tb.activeBorder}` : '1px solid transparent',
    borderRadius: 7,
    color:        active ? tb.activeText  : tb.inactiveText,
  } : {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
    padding: '7px 8px 6px',
    background:   active ? tb.activeBg   : 'transparent',
    border:       active ? `1px solid ${tb.activeBorder}` : '1px solid transparent',
    borderRadius: 7,
    color:        active ? tb.activeText  : tb.inactiveText,
  };

  const hoverIn  = (e) => {
    if (active) return;
    e.currentTarget.style.background = tb.hoverBg;
    e.currentTarget.style.color      = tb.hoverText;
  };
  const hoverOut = (e) => {
    if (active) return;
    e.currentTarget.style.background = isExclusive ? tb.inactiveBg : 'transparent';
    e.currentTarget.style.color      = tb.inactiveText;
  };

  return (
    <BaseButton onClick={onClick} title={title} style={style} onHoverIn={hoverIn} onHoverOut={hoverOut}>
      {icon}
      {label && (
        <span style={{ fontSize: 7, fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em' }}>
          {label}
        </span>
      )}
    </BaseButton>
  );
}

// ── ToolbarColorToggle ─────────────────────────────────────────────────────────
// Full-height toggle with adjacent color-picker swatch.
// Toggle action and color selection are independent click targets.
//
// icon      ReactNode — shown inside the toggle button (required for icon-only mode)
// title     string — tooltip shown on hover for both the button and the swatch
// label     string — fallback for title if title not provided (legacy compat)
export function ToolbarColorToggle({ icon, value, onToggle, color, onColor, label, title }) {
  const inputRef = useRef();
  const T = tok();
  const tip = title || label || '';

  return (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      <ToolbarBtn
        variant="toggle"
        icon={icon}
        active={value}
        onClick={onToggle}
        title={tip}
      />
      {/* Color swatch — sits right of toggle, vertically centered. Square, clearly a picker. */}
      <div
        onClick={() => inputRef.current?.click()}
        title={`Color: ${tip}`}
        style={{
          width: 11, height: 11,
          borderRadius: 3,
          background: color,
          border: `1.5px solid ${T.swatchBord}`,
          cursor: 'pointer',
          alignSelf: 'center',
          flexShrink: 0,
          marginLeft: -1,
          marginRight: 5,
          transition: 'transform 0.12s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.20)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.45)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      />
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={e => onColor(e.target.value)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      />
    </div>
  );
}

// ── ToolbarDropdown ────────────────────────────────────────────────────────────
// Full-height dropdown trigger: icon above, label below, ▾ after icon.
// Stretches to match ToolbarBtn height — unified toolbar rhythm.
// Manages open/close + outside-click + panel positioning only.
//
// icon      ReactNode from icons.jsx
// label     string — optional short label shown below icon (omit for icon-only mode)
// title     string — tooltip shown on hover (falls back to label)
// active    boolean — trigger shows active state independently of open state
export function ToolbarDropdown({ icon, label, title, active, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const T  = tok();
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

  const hoverIn  = (e) => {
    if (isActive) return;
    e.currentTarget.style.background = tb.hoverBg;
    e.currentTarget.style.color      = tb.hoverText;
  };
  const hoverOut = (e) => {
    if (isActive) return;
    e.currentTarget.style.background = 'transparent';
    e.currentTarget.style.color      = tb.inactiveText;
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex' }}>
      <BaseButton
        onClick={() => setOpen(v => !v)}
        title={title || label}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 3,
          padding: '7px 10px 6px',
          width: '100%',
          background:   isActive ? tb.activeBg   : 'transparent',
          border:       isActive ? `1px solid ${tb.activeBorder}` : '1px solid transparent',
          borderRadius: 7,
          color:        isActive ? tb.activeText  : tb.inactiveText,
        }}
        onHoverIn={hoverIn}
        onHoverOut={hoverOut}
      >
        {/* Icon row: icon + chevron side by side */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {icon}
          <span style={{ fontSize: 6, opacity: 0.55, lineHeight: 1, marginTop: 1 }}>▾</span>
        </span>
        {/* Label below — only rendered if label prop is provided */}
        {label && (
          <span style={{ fontSize: 7, fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em' }}>
            {label}
          </span>
        )}
      </BaseButton>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0,
          background: tb.bg,
          border: `1px solid ${tb.border}`,
          borderRadius: 8,
          padding: 5,
          zIndex: 300,
          minWidth: 150,
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

// ── DropItem ───────────────────────────────────────────────────────────────────
// Item inside a ToolbarDropdown panel. Full-width, left-aligned text.
// Migrated from tokens.js — uses semantic tokens only.
export function DropItem({ active, onClick, children }) {
  const T = tok();
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? T.toolbar.activeBg    : 'transparent',
        border:     active ? `1px solid ${T.toolbar.activeBorder}` : '1px solid transparent',
        color:      active ? T.toolbar.activeText  : T.btn.text,
        borderRadius: 5,
        padding: '5px 10px',
        cursor: 'pointer',
        fontSize: 11,
        fontFamily: "'DM Mono', monospace",
        textAlign: 'left',
        width: '100%',
        transition: 'background 0.12s',
        outline: 'none',
        lineHeight: 1.4,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.btn.hoverBg; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ── ColorToggle ────────────────────────────────────────────────────────────────
// Compact toggle + color swatch for use inside dropdown panels (not the toolbar).
// Migrated from tokens.js. Uses btn tokens for compact panel context.
export function ColorToggle({ value, onToggle, color, onColor, label }) {
  const inputRef = useRef();
  const T = tok();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        onClick={onToggle}
        style={{
          background:   value ? T.toolbar.activeBg    : T.btn.bg,
          border:       value ? `1px solid ${T.toolbar.activeBorder}` : `1px solid ${T.btn.border}`,
          color:        value ? T.toolbar.activeText  : T.btn.text,
          borderRadius: 6,
          padding: '4px 10px',
          cursor: 'pointer',
          fontSize: 11,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.04em',
          transition: 'all 0.14s',
          lineHeight: 1,
          outline: 'none',
        }}
        onMouseEnter={e => { if (!value) { e.currentTarget.style.background = T.btn.hoverBg; e.currentTarget.style.color = T.btn.hoverText; }}}
        onMouseLeave={e => { if (!value) { e.currentTarget.style.background = T.btn.bg;      e.currentTarget.style.color = T.btn.text; }}}
      >
        {label}
      </button>
      <div
        onClick={() => inputRef.current?.click()}
        title={`Color de ${label}`}
        style={{
          width: 14, height: 14, borderRadius: 3,
          background: color,
          border: `1px solid ${T.swatchBord}`,
          cursor: 'pointer', flexShrink: 0,
          transition: 'transform 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      />
      <input
        ref={inputRef} type="color" value={color}
        onChange={e => onColor(e.target.value)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      />
    </div>
  );
}

// ── IconBtn ────────────────────────────────────────────────────────────────────
// Square icon-only button for actions (rotate, delete, maximize, refresh).
// danger  — red/destructive styling
// active  — gold/active styling (e.g. maximize engaged)
export function IconBtn({ icon, onClick, title, danger, active, size = 32, style }) {
  const T     = tok();
  const group = danger ? T.danger : T.btn;
  const bg    = active ? T.toolbar.activeBg     : group.bg;
  const bord  = active ? T.toolbar.activeBorder : group.border;
  const color = active ? T.toolbar.activeText   : group.text;

  const hoverIn  = (e) => {
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

// ── TDivider ───────────────────────────────────────────────────────────────────
// Vertical 1px divider between toolbar groups.
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
// Uppercase category header for side panels.
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
