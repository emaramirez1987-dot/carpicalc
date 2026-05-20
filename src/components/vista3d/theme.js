// theme.js — Single source of visual truth for Vista 3D
// Pure JS: no React, no components. Only tokens and theme utilities.
// Rules:
//   • All visual values come from here — no hardcoded colors in components
//   • Semantic sub-groups (toolbar.activeBg) preferred over flat names (gold20)
//   • Flat keys preserved for backward compat — FASE 2 removes duplicates

// ── Theme detection ─────────────────────────────────────────────────────────────
export function getTema() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr) return attr;
  try { return localStorage.getItem('carpicalc:tema') || 'dark'; }
  catch { return 'dark'; }
}

// ── Design tokens ───────────────────────────────────────────────────────────────
// Returns a token object. Semantic sub-groups are the canonical API for new code.
// Flat root keys exist for components not yet migrated to sub-groups.
export function tok() {
  const d = getTema() !== 'light';

  // ── Base values — used to build semantic groups ───────────────────────────────
  const gold         = d ? '#D4AF37' : '#B8920A';
  const goldDim      = d ? '#9a7828' : '#9A7818';
  const goldBord     = d ? 'rgba(212,175,55,0.38)' : 'rgba(184,146,10,0.38)';
  const btnBg        = d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const btnBord      = d ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const btnText      = d ? '#7a7e8a'  : '#6A6662';
  const btnHoverBg   = d ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)';
  const btnHoverText = d ? '#c8cad4'  : '#1A1916';
  const rowHover     = d ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)';
  const divider      = d ? 'rgba(255,255,255,0.06)'  : 'rgba(0,0,0,0.06)';
  const border       = d ? 'rgba(255,255,255,0.06)'  : 'rgba(0,0,0,0.07)';
  const borderSub    = d ? 'rgba(255,255,255,0.04)'  : 'rgba(0,0,0,0.04)';
  const toolbarBg    = d ? 'rgba(9,11,16,0.97)'  : 'rgba(255,255,255,0.97)';
  const toolbarShadow = d ? '0 1px 0 rgba(255,255,255,0.05)' : '0 1px 0 rgba(0,0,0,0.07)';
  const rmBg         = d ? 'rgba(200,60,60,0.08)' : 'rgba(200,60,60,0.07)';
  const rmBord       = d ? 'rgba(200,60,60,0.26)' : 'rgba(200,60,60,0.22)';
  const rmText       = d ? '#c06060' : '#b04040';
  const sectionHd    = d ? '#4a4e5c' : '#9A9590';
  const textDim      = d ? '#4a4e5c' : '#9A9590';

  return {
    // ── Flat tokens (backward compat — FASE 2 removes duplicates) ──────────────
    outerBg:      d ? '#07090c'     : '#EEE9E2',
    panelBg:      d ? '#0b0d12'     : '#FFFFFF',
    panelShadow:  d ? '2px 0 20px rgba(0,0,0,0.45)' : '2px 0 20px rgba(0,0,0,0.06)',
    border, borderSub,
    toolbarBg, toolbarShadow,
    text:         d ? '#b8bcc8'     : '#1A1916',
    textDim,
    textMuted:    d ? '#3c404c'     : '#B0ABA5',
    label:        d ? '#282b35'     : '#C4BFBA',
    sectionHd,
    btnBg, btnBord, btnText, btnHoverBg, btnHoverText,
    swatchBord:   d ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.16)',
    matBg:        d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    matBord:      d ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    matText:      d ? '#7a7e8a'     : '#6A6662',
    divider,
    countText:    d ? '#3c404c'     : '#B0ABA5',
    emptyIcon:    d ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
    emptyTitle:   d ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.16)',
    emptySub:     d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)',
    hint:         d ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.25)',
    canvasFallbk: d ? '#080a0d'     : '#EEE9E2',
    inputBg:      d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    inputBord:    d ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    inputText:    d ? '#c4c8d4'     : '#1A1916',
    rowHover,
    rowSelected:  d ? 'rgba(212,175,55,0.05)' : 'rgba(184,146,10,0.06)',
    gold, goldDim, goldBord,
    accent: gold,
    rmBg, rmBord, rmText,
    snapBg:       d ? 'rgba(212,175,55,0.07)'  : 'rgba(184,146,10,0.08)',
    snapBord:     d ? 'rgba(212,175,55,0.22)'  : 'rgba(184,146,10,0.28)',
    snapText:     d ? '#9a7828'     : '#8a6818',

    // ── Semantic groups — canonical API for new components ──────────────────────

    // Toolbar
    toolbar: {
      bg:             toolbarBg,
      shadow:         toolbarShadow,
      border,
      height:         52,     // px
      iconSize:       14,     // px
      activeBg:       d ? 'rgba(212,175,55,0.18)' : 'rgba(184,146,10,0.12)',
      activeBorder:   goldBord,
      activeText:     gold,
      inactiveBg:     'transparent',
      inactiveBorder: 'transparent',
      inactiveText:   btnText,
      hoverBg:        rowHover,
      hoverText:      btnHoverText,
      divider,
    },

    // Generic button
    btn: {
      bg:        btnBg,
      border:    btnBord,
      text:      btnText,
      hoverBg:   btnHoverBg,
      hoverText: btnHoverText,
    },

    // Danger / destructive action
    danger: {
      bg:        rmBg,
      border:    rmBord,
      text:      rmText,
      hoverBg:   rmBord,
      hoverText: d ? '#e07070' : '#c05050',
    },

    // Success / confirmation state
    success: {
      bg:     d ? 'rgba(126,207,138,0.14)' : 'rgba(80,160,100,0.10)',
      border: d ? 'rgba(126,207,138,0.48)' : 'rgba(80,160,100,0.40)',
      text:   d ? '#7ecf8a'                : '#4a9a60',
    },

    // Empty states
    empty: {
      icon:  d ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
      title: d ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.16)',
      sub:   d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)',
    },

    // Section header text
    section: {
      text: sectionHd,
    },

    // Canvas overlays (badges, hints on top of the R3F viewport)
    canvas: {
      overlayBg: d ? 'rgba(8,10,13,0.85)' : 'rgba(255,255,255,0.90)',
    },

    // Module type indicator swatches — semantic category colors.
    // Backgrounds are always dark so text is always white regardless of theme.
    tipoColors: {
      aereo: { bg: '#3a5a8a', text: 'rgba(255,255,255,0.75)' },
      torre: { bg: '#3a6a4a', text: 'rgba(255,255,255,0.75)' },
      bajo:  { bg: '#6a4a3a', text: 'rgba(255,255,255,0.75)' },
      otro:  { bg: '#4a4a5a', text: 'rgba(255,255,255,0.75)' },
    },
  };
}
