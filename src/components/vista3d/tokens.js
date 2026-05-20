// tokens.js — Backward-compatibility barrel for Vista 3D
// Source of truth has moved to theme.js (pure tokens) and ui.jsx (primitives).
// This file keeps existing imports working during the incremental migration.
// FASE 2 will update SceneOutliner, InspectorPanel, MaterialGallery to import
// directly from theme.js / ui.jsx, then this file can be removed.

import React, { useState, useEffect, useRef } from 'react';
import { getTema, tok } from './theme.js';

export { getTema, tok };

// ── useIsDark ──────────────────────────────────────────────────────────────────
export function useIsDark() {
  const [isDark, setIsDark] = useState(() => getTema() !== 'light');
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.getAttribute('data-theme') !== 'light')
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

// ── Legacy React primitives ────────────────────────────────────────────────────
// These exist for SceneOutliner, InspectorPanel, MaterialGallery, and
// ViewportToolbar dropdown content (BTN, DropItem, ColorToggle).
// Migrate to ui.jsx primitives in FASE 2.

export const BTN = ({ active, onClick, children, style, title }) => {
  const t = tok();
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? t.toolbar.activeBg    : t.btn.bg,
        border:     active ? `1px solid ${t.toolbar.activeBorder}` : `1px solid ${t.btn.border}`,
        color:      active ? t.toolbar.activeText  : t.btn.text,
        borderRadius: 6, padding: '4px 11px', cursor: 'pointer',
        fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: '0.04em',
        transition: 'all 0.14s', lineHeight: 1,
        ...style,
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = t.btn.hoverBg; e.currentTarget.style.color = t.btn.hoverText; }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = t.btn.bg;      e.currentTarget.style.color = t.btn.text; }}}
    >
      {children}
    </button>
  );
};

export function DropItem({ active, onClick, children }) {
  const t = tok();
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? t.toolbar.activeBg   : 'transparent',
        border:     active ? `1px solid ${t.toolbar.activeBorder}` : '1px solid transparent',
        color:      active ? t.toolbar.activeText : t.btn.text,
        borderRadius: 5, padding: '5px 10px', cursor: 'pointer',
        fontSize: 11, fontFamily: "'DM Mono',monospace",
        textAlign: 'left', width: '100%', transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = t.btn.hoverBg; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

export function Dropdown({ label, active, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  const t = tok();
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <BTN active={active || open} onClick={() => setOpen(v => !v)}>
        {label} <span style={{ fontSize: 7, marginLeft: 2, opacity: 0.65 }}>▾</span>
      </BTN>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 5px)', left: 0,
          background: t.toolbarBg, border: `1px solid ${t.border}`,
          borderRadius: 8, padding: 5, zIndex: 300, minWidth: 140,
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.30)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function ColorToggle({ value, onToggle, color, onColor, label }) {
  const inputRef = useRef();
  const t = tok();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <BTN active={value} onClick={onToggle}>{value ? '✓ ' : ''}{label}</BTN>
      <div
        onClick={() => inputRef.current?.click()}
        title={`Color de ${label}`}
        style={{
          width: 14, height: 14, borderRadius: 3, cursor: 'pointer',
          background: color, border: `1px solid ${t.swatchBord}`,
          flexShrink: 0, transition: 'transform 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.25)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      />
      <input
        ref={inputRef} type="color" value={color} onChange={e => onColor(e.target.value)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      />
    </div>
  );
}

// SectionLabel and PanelDivider have moved to ui.jsx.
// Kept as re-exports here only if needed for backward compat outside vista3d.
export { SectionLabel, PanelDivider } from './ui.jsx';
