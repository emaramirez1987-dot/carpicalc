// tokens.js — Backward-compatibility barrel for Vista 3D
// All visual tokens live in theme.js. All React primitives live in ui.jsx.
// This file is kept only for useIsDark, which is a React hook and cannot
// live in the pure-JS theme.js. Import everything else directly from theme.js
// and ui.jsx — this file will be removed once all imports are updated.

import { useState, useEffect } from 'react';
import { getTema, tok } from './theme.js';

export { getTema, tok };

// ── useIsDark ──────────────────────────────────────────────────────────────────
// Reactive hook: returns true when data-theme is not 'light'.
// Observes the root element for theme attribute changes.
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

// SectionLabel and PanelDivider re-exported for any legacy imports outside vista3d.
export { SectionLabel, PanelDivider } from './ui.jsx';
