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
  const btnBg        = d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const btnBord      = d ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
  // Inactive toolbar button labels.
  // dark: #7a7e8a | light: #5A5654 → 5.8:1 on #F5F3F0 (WCAG AA ✓)
  const btnText      = d ? '#7a7e8a'  : '#5A5654';
  const btnHoverBg   = d ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const btnHoverText = d ? '#c8cad4'  : '#1A1916';
  const rowHover     = d ? 'rgba(255,255,255,0.028)' : 'rgba(0,0,0,0.04)';
  // light divider: 0.12 — clearly visible on #F5F3F0 panels
  const divider      = d ? 'rgba(255,255,255,0.08)'  : 'rgba(0,0,0,0.12)';
  // light border: 0.16 — visible card edges, bona-fide definition
  const border       = d ? 'rgba(255,255,255,0.12)'  : 'rgba(0,0,0,0.16)';
  const borderSub    = d ? 'rgba(255,255,255,0.05)'  : 'rgba(0,0,0,0.07)';
  // Toolbar bg: light → #F3F1EE warm gray (not pure white); dark unchanged
  const toolbarBg    = d ? 'rgba(9,11,16,0.97)'  : 'rgba(243,241,238,0.97)';
  const toolbarShadow = d ? '0 1px 0 rgba(255,255,255,0.06)' : '0 1px 0 rgba(0,0,0,0.10)';
  const rmBg         = d ? 'rgba(200,60,60,0.08)' : 'rgba(200,60,60,0.07)';
  const rmBord       = d ? 'rgba(200,60,60,0.26)' : 'rgba(200,60,60,0.22)';
  const rmText       = d ? '#c06060' : '#b04040';
  // Section header labels.
  // dark: #7A7E8C on #0E1118 → 5.2:1 ✓ | light: #3D3A37 on #F5F3F0 → 7.2:1 (WCAG AAA ✓)
  const sectionHd    = d ? '#7A7E8C' : '#3D3A37';
  // Dim text (inputs, toolbar inline labels, secondary descriptions).
  // Lighter than sectionHd — clearly secondary.
  const textDim      = d ? '#606472' : '#6E6A66';

  return {
    // ── Flat tokens (backward compat — FASE 2 removes duplicates) ──────────────
    outerBg:      d ? '#07090c'     : '#EEE9E2',      // desk / chrome — unchanged
    // dark panel: #0E1118 (blue-dark, floats above workspace) | light: #F5F3F0 warm off-white
    panelBg:      d ? '#0E1118'     : '#F5F3F0',
    panelShadow:  d ? '2px 0 20px rgba(0,0,0,0.55)' : '2px 0 20px rgba(0,0,0,0.10)',
    // Two-layer shadow: crisp near + soft far — technical, not "landing page"
    cardShadow:   d ? '0 1px 4px rgba(0,0,0,0.45), 0 6px 28px rgba(0,0,0,0.35)'
                    : '0 1px 3px rgba(0,0,0,0.14), 0 4px 20px rgba(0,0,0,0.09)',
    // Workspace surface: a unified container behind panel cards.
    // dark: #050709 (deeper than desk #07090c)
    // light: warm ash, semi-transparent so desk #EEE9E2 bleeds through — ceniza, not blue
    workspaceBg:     d ? '#050709'                   : 'rgba(150,145,138,0.78)',
    workspaceBorder: d ? 'rgba(255,255,255,0.12)'    : 'rgba(0,0,0,0.18)',
    border, borderSub,
    toolbarBg, toolbarShadow,
    text:         d ? '#b8bcc8'     : '#1A1916',
    textDim,
    // Muted / supporting text. light: #6E6A66 (used to be sectionHd — now truly secondary)
    textMuted:    d ? '#4c5060'     : '#6E6A66',
    label:        d ? '#363a46'     : '#8A8682',
    sectionHd,
    btnBg, btnBord, btnText, btnHoverBg, btnHoverText,
    swatchBord:   d ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',
    matBg:        d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    matBord:      d ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    matText:      d ? '#7a7e8a'     : '#5A5654',
    divider,
    countText:    d ? '#4c5060'     : '#6E6A66',
    // Empty states: visible but not prominent — enough to guide, not to dominate
    emptyIcon:    d ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.18)',
    emptyTitle:   d ? 'rgba(255,255,255,0.26)' : 'rgba(0,0,0,0.45)',
    emptySub:     d ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.28)',
    // Hint text (viewport bottom): clearly readable, clearly secondary
    hint:         d ? 'rgba(255,255,255,0.26)' : 'rgba(0,0,0,0.45)',
    // Viewport background: warm-neutral, no blue cast. Thermal contrast via darkness, not hue.
    canvasFallbk: d ? '#080a0d'     : '#E6E4E0',
    inputBg:      d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    inputBord:    d ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    inputText:    d ? '#c4c8d4'     : '#1A1916',
    rowHover,
    rowSelected:  d ? 'rgba(212,175,55,0.06)' : 'rgba(184,146,10,0.07)',
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
      capsuleShadow:  d ? '0 2px 20px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.08)'
                        : '0 1px 3px rgba(0,0,0,0.14), 0 3px 16px rgba(0,0,0,0.08)',
      border,
      height:         52,     // px
      iconSize:       16,     // px — icon-only buttons need more visual weight
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

    // Empty states — synced with flat emptyIcon/emptyTitle/emptySub above
    empty: {
      icon:  d ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.18)',
      title: d ? 'rgba(255,255,255,0.26)' : 'rgba(0,0,0,0.45)',
      sub:   d ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.28)',
    },

    // Section header text
    section: {
      text: sectionHd,
    },

    // Canvas overlays (badges, hints on top of the R3F viewport)
    canvas: {
      overlayBg: d ? 'rgba(8,10,13,0.90)' : 'rgba(236,238,241,0.92)',
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
