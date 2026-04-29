// ════════════════════════════════════════════════════════════════════════════
// hooks/useUndo.js — CarpiCálc
// ════════════════════════════════════════════════════════════════════════════
//
// Hook que provee un sistema de "Deshacer" con toasts animados.
//
// CÓMO FUNCIONA:
//   1. El componente llama a pushUndo({ mensaje, onDeshacer }) cuando hace
//      una acción destructiva (borrar un módulo, eliminar un extra, etc.)
//   2. Aparece un toast con botón "↩ Deshacer" y barra de progreso countdown
//   3. Si el usuario toca "Deshacer" antes de que venza el tiempo,
//      se ejecuta onDeshacer() para revertir la acción
//   4. Si no toca nada, el toast desaparece solo al terminar el countdown
//
// USO:
//   const { pushUndo, ToastContainer } = useUndo();
//
//   // Al borrar algo:
//   pushUndo({
//     mensaje: '"CO001" eliminado del presupuesto',
//     onDeshacer: () => setItems(prev => [...prev, itemBorrado]),
//     duracion: 5000  // opcional, default 5s
//   });
//
//   // En el render:
//   return <div>...<ToastContainer /></div>
//
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useEffect } from "react";

// ── UndoToast ─────────────────────────────────────────────────────────────
// Componente interno — no exportar directamente.
// ToastContainer lo instancia por cada toast activo.

function UndoToast({ toast, onDeshacer, onClose }) {
  const [pct, setPct] = useState(100); // progreso de la barra (100→0)

  // Barra de progreso countdown
  useEffect(() => {
    const start = Date.now();
    const iv = setInterval(() => {
      const elapsed   = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / toast.duracion) * 100);
      setPct(remaining);
      if (remaining === 0) clearInterval(iv);
    }, 30);
    return () => clearInterval(iv);
  }, [toast.duracion]);

  return (
    <div
      className="anim-slideright"
      style={{
        pointerEvents: "all",
        background:    "var(--bg-surface)",
        border:        "1px solid var(--border-strong)",
        borderRadius:  12,
        boxShadow:     "0 8px 32px rgba(0,0,0,0.55)",
        overflow:      "hidden",
        minWidth:      280,
        maxWidth:      340,
      }}
    >
      {/* Contenido del toast */}
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>🗑</span>

        <span style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
          {toast.mensaje}
        </span>

        {/* Botón Deshacer */}
        <button
          onClick={onDeshacer}
          style={{
            padding:     "5px 12px",
            borderRadius: 7,
            cursor:      "pointer",
            background:  "var(--accent-soft)",
            border:      "1px solid var(--accent-border)",
            color:       "var(--accent)",
            fontFamily:  "'DM Mono',monospace",
            fontSize:    11,
            fontWeight:  700,
            flexShrink:  0,
            transition:  "all 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(212,175,55,0.22)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--accent-soft)"}
        >
          ↩ Deshacer
        </button>

        {/* Cerrar */}
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none",
            color: "var(--text-muted)", cursor: "pointer",
            fontSize: 15, padding: "0 2px", flexShrink: 0,
          }}
        >×</button>
      </div>

      {/* Barra de progreso countdown */}
      <div style={{ height: 3, background: "var(--bg-subtle)" }}>
        <div style={{
          height:     "100%",
          background: "var(--accent)",
          width:      `${pct}%`,
          transition: "width 0.03s linear",
        }} />
      </div>
    </div>
  );
}

// ── useUndo ───────────────────────────────────────────────────────────────

export function useUndo() {
  const [toasts, setToasts] = useState([]);

  /**
   * Agrega un nuevo toast de deshacer.
   * @param {{ mensaje: string, onDeshacer: Function, duracion?: number }} opciones
   */
  const pushUndo = useCallback(({ mensaje, onDeshacer, duracion = 5000 }) => {
    const id = Date.now();
    setToasts(t => [...t, { id, mensaje, onDeshacer, duracion }]);
    // Auto-remover después de que vence el tiempo + 300ms de margen para animación
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duracion + 300);
  }, []);

  /** Ejecuta onDeshacer y cierra el toast */
  const deshacer = useCallback((id) => {
    setToasts(t => {
      const toast = t.find(x => x.id === id);
      if (toast?.onDeshacer) toast.onDeshacer();
      return t.filter(x => x.id !== id);
    });
  }, []);

  /** Cierra el toast sin deshacer */
  const cerrar = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  /**
   * Componente contenedor de todos los toasts activos.
   * Renderizar al final de cualquier componente que use pushUndo:
   *   <ToastContainer />
   */
  const ToastContainer = useCallback(() => (
    <div style={{
      position:       "fixed",
      bottom:         24,
      right:          24,
      zIndex:         9000,
      display:        "flex",
      flexDirection:  "column",
      gap:            10,
      pointerEvents:  "none",
    }}>
      {toasts.map(toast => (
        <UndoToast
          key={toast.id}
          toast={toast}
          onDeshacer={() => deshacer(toast.id)}
          onClose={() => cerrar(toast.id)}
        />
      ))}
    </div>
  ), [toasts, deshacer, cerrar]);

  return { pushUndo, ToastContainer };
}
