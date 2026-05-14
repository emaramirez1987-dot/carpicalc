// ════════════════════════════════════════════════════════════════════════════
// useAtajosTeclado.js — atajos globales de teclado
// ════════════════════════════════════════════════════════════════════════════
//
// Registra listeners en window. Si el usuario tiene foco en un input/textarea,
// solo respeta `Esc` — el resto se ignora para no romper la escritura.
//
// Uso:
//   useAtajosTeclado({
//     "?":      () => setMostrarAtajos(true),
//     "Escape": () => cerrarModal(),
//     "ctrl+1": () => irATab("presupuesto"),
//     "ctrl+s": () => guardar(),
//   });
//
// Convención de keys:
//   - Tecla simple: "Escape", "/", "?"
//   - Combinaciones: "ctrl+s", "ctrl+1" (siempre minúscula, ctrl funciona como Cmd en Mac)
// ════════════════════════════════════════════════════════════════════════════

import { useEffect } from "react";

function esEditable(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function normalizarEvento(e) {
  const k = e.key;
  // Esc y / siempre se reportan tal cual
  if (k === "Escape" || k === "?") return k;
  // Combinaciones con Ctrl/Cmd
  if (e.ctrlKey || e.metaKey) {
    return `ctrl+${k.toLowerCase()}`;
  }
  return k;
}

export function useAtajosTeclado(mapa = {}) {
  useEffect(() => {
    function handler(e) {
      const editable = esEditable(e.target);
      const sig      = normalizarEvento(e);
      const fn       = mapa[sig];
      if (!fn) return;
      // Esc se acepta siempre (cerrar modales). El resto se ignora cuando se escribe.
      if (editable && sig !== "Escape") return;
      e.preventDefault();
      fn(e);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mapa]);
}
