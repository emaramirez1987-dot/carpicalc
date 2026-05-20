// tokens.js — Shared theme utilities + UI primitives for vista3d/
// Extracted from Vista3DTab to avoid duplication across new panel components.

import React, { useState, useEffect, useRef } from 'react';

// ── Theme detection ────────────────────────────────────────────────────────────
export function getTema() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr) return attr;
  try { return localStorage.getItem('carpicalc:tema') || 'dark'; }
  catch { return 'dark'; }
}

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

// ── Design tokens — called every render (reads DOM attr) ──────────────────────
export function tok() {
  const d = getTema() !== 'light';
  return d ? {
    // ── Dark ──────────────────────────────────────────────────────────────────
    outerBg:      '#07090c',
    panelBg:      '#0b0d12',
    panelShadow:  '2px 0 20px rgba(0,0,0,0.45)',
    border:       'rgba(255,255,255,0.06)',
    borderSub:    'rgba(255,255,255,0.04)',
    toolbarBg:    'rgba(9,11,16,0.97)',
    toolbarShadow:'0 1px 0 rgba(255,255,255,0.05)',
    text:         '#b8bcc8',
    textDim:      '#4a4e5c',
    textMuted:    '#3c404c',
    label:        '#282b35',
    sectionHd:    '#4a4e5c',
    btnBg:        'rgba(255,255,255,0.05)',
    btnBord:      'rgba(255,255,255,0.09)',
    btnText:      '#7a7e8a',
    btnHoverBg:   'rgba(255,255,255,0.10)',
    btnHoverText: '#c8cad4',
    swatchBord:   'rgba(255,255,255,0.16)',
    matBg:        'rgba(255,255,255,0.04)',
    matBord:      'rgba(255,255,255,0.08)',
    matText:      '#7a7e8a',
    divider:      'rgba(255,255,255,0.06)',
    countText:    '#3c404c',
    emptyIcon:    'rgba(255,255,255,0.10)',
    emptyTitle:   'rgba(255,255,255,0.14)',
    emptySub:     'rgba(255,255,255,0.07)',
    hint:         'rgba(255,255,255,0.18)',
    canvasFallbk: '#080a0d',
    inputBg:      'rgba(255,255,255,0.05)',
    inputBord:    'rgba(255,255,255,0.10)',
    inputText:    '#c4c8d4',
    rowHover:     'rgba(255,255,255,0.025)',
    rowSelected:  'rgba(212,175,55,0.05)',
    gold:         '#D4AF37',
    goldDim:      '#9a7828',
    goldBord:     'rgba(212,175,55,0.38)',
    accent:       '#D4AF37',
    rmBg:         'rgba(200,60,60,0.08)',
    rmBord:       'rgba(200,60,60,0.26)',
    rmText:       '#c06060',
    snapBg:       'rgba(212,175,55,0.07)',
    snapBord:     'rgba(212,175,55,0.22)',
    snapText:     '#9a7828',
  } : {
    // ── Light — warm / breathable ─────────────────────────────────────────────
    outerBg:      '#EEE9E2',
    panelBg:      '#FFFFFF',
    panelShadow:  '2px 0 20px rgba(0,0,0,0.06)',
    border:       'rgba(0,0,0,0.07)',
    borderSub:    'rgba(0,0,0,0.04)',
    toolbarBg:    'rgba(255,255,255,0.97)',
    toolbarShadow:'0 1px 0 rgba(0,0,0,0.07)',
    text:         '#1A1916',
    textDim:      '#9A9590',
    textMuted:    '#B0ABA5',
    label:        '#C4BFBA',
    sectionHd:    '#9A9590',
    btnBg:        'rgba(0,0,0,0.04)',
    btnBord:      'rgba(0,0,0,0.08)',
    btnText:      '#6A6662',
    btnHoverBg:   'rgba(0,0,0,0.07)',
    btnHoverText: '#1A1916',
    swatchBord:   'rgba(0,0,0,0.16)',
    matBg:        'rgba(0,0,0,0.03)',
    matBord:      'rgba(0,0,0,0.08)',
    matText:      '#6A6662',
    divider:      'rgba(0,0,0,0.06)',
    countText:    '#B0ABA5',
    emptyIcon:    'rgba(0,0,0,0.07)',
    emptyTitle:   'rgba(0,0,0,0.16)',
    emptySub:     'rgba(0,0,0,0.09)',
    hint:         'rgba(0,0,0,0.25)',
    canvasFallbk: '#EEE9E2',
    inputBg:      'rgba(0,0,0,0.03)',
    inputBord:    'rgba(0,0,0,0.10)',
    inputText:    '#1A1916',
    rowHover:     'rgba(0,0,0,0.025)',
    rowSelected:  'rgba(184,146,10,0.06)',
    gold:         '#B8920A',
    goldDim:      '#9A7818',
    goldBord:     'rgba(184,146,10,0.38)',
    accent:       '#B8920A',
    rmBg:         'rgba(200,60,60,0.07)',
    rmBord:       'rgba(200,60,60,0.22)',
    rmText:       '#b04040',
    snapBg:       'rgba(184,146,10,0.08)',
    snapBord:     'rgba(184,146,10,0.28)',
    snapText:     '#8a6818',
  };
}

// ── Shared primitives ─────────────────────────────────────────────────────────

export const BTN = ({ active, onClick, children, style, title }) => {
  const t = tok();
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? 'rgba(212,175,55,0.20)' : t.btnBg,
        border:     active ? `1px solid ${t.goldBord}` : `1px solid ${t.btnBord}`,
        color:      active ? t.gold : t.btnText,
        borderRadius: 6, padding: '4px 11px', cursor: 'pointer',
        fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: '0.04em',
        transition: 'all 0.14s', lineHeight: 1,
        ...style,
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = t.btnHoverBg; e.currentTarget.style.color = t.btnHoverText; }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = t.btnBg; e.currentTarget.style.color = t.btnText; }}}
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
        background: active ? 'rgba(212,175,55,0.18)' : 'transparent',
        border: active ? `1px solid ${t.goldBord}` : '1px solid transparent',
        color: active ? t.gold : t.btnText,
        borderRadius: 5, padding: '5px 10px', cursor: 'pointer',
        fontSize: 11, fontFamily: "'DM Mono',monospace",
        textAlign: 'left', width: '100%', transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = t.btnHoverBg; }}
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

// ── Section header ─────────────────────────────────────────────────────────────
export function SectionLabel({ children, style }) {
  const T = tok();
  return (
    <div style={{
      fontSize: 9, fontFamily: "'DM Mono',monospace",
      color: T.sectionHd, letterSpacing: '0.10em', textTransform: 'uppercase',
      padding: '10px 14px 5px', fontWeight: 500,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Thin divider ───────────────────────────────────────────────────────────────
export function PanelDivider({ style }) {
  const T = tok();
  return <div style={{ height: 1, background: T.divider, margin: '0', ...style }} />;
}
