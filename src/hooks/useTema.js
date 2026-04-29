// ════════════════════════════════════════════════════════════════════════════
// hooks/useTema.js — CarpiCálc
// ════════════════════════════════════════════════════════════════════════════
//
// Hook para gestionar el tema visual de la aplicación (oscuro / claro).
//
// CÓMO FUNCIONA:
//   - Lee el tema guardado en localStorage al montar
//   - Aplica el atributo data-theme al <html> para que las CSS vars cambien
//   - Persiste la preferencia en localStorage al cambiar
//
// USO:
//   const { tema, toggleTema } = useTema();
//
//   // tema === "dark" | "light"
//   // toggleTema() alterna entre ambos
//
// Los estilos visuales están definidos en GlobalStyles.jsx
// usando los selectores :root / [data-theme="dark"] / [data-theme="light"]
//
// ════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from "react";

export function useTema() {
  // Inicializa desde localStorage (o "dark" por defecto)
  const [tema, setTema] = useState(() => {
    try { return localStorage.getItem("carpicalc:tema") || "dark"; }
    catch { return "dark"; }
  });

  // Cada vez que cambia el tema:
  //   1. Aplica data-theme al <html> → activa las variables CSS correspondientes
  //   2. Persiste en localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    try { localStorage.setItem("carpicalc:tema", tema); }
    catch {}
  }, [tema]);

  /** Alterna entre modo oscuro y modo claro */
  const toggleTema = useCallback(
    () => setTema((t) => (t === "dark" ? "light" : "dark")),
    []
  );

  return { tema, toggleTema };
}
