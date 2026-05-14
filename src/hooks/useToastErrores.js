// ════════════════════════════════════════════════════════════════════════════
// useToastErrores.js — sistema simple de toast global de errores
// ════════════════════════════════════════════════════════════════════════════
//
// Cualquier código puede emitir un error y el componente raíz lo muestra
// como toast. Sin librería externa — un CustomEvent en window.
//
// API:
//   notificarError("No se pudo guardar el módulo", err)      → muestra toast
//   useToastErrores()                                         → hook que escucha
//
// El toast se monta una sola vez en App.js. Cualquier llamada a Supabase
// que falle emite el evento desde storage.js u otra capa.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";

const EVT = "carpicalc:error";

/** Emisor — cualquier código puede llamarlo */
export function notificarError(mensaje, errorOriginal = null) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line no-console
  if (errorOriginal) console.error(mensaje, errorOriginal);
  window.dispatchEvent(new CustomEvent(EVT, {
    detail: { mensaje, errorOriginal, timestamp: Date.now() },
  }));
}

/** Hook que escucha errores globales y los expone como cola de toasts. */
export function useToastErrores() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const id = e.detail.timestamp + Math.random();
      setToasts((prev) => [...prev, { id, mensaje: e.detail.mensaje }]);
      // Auto-dismiss después de 7s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 7000);
    };
    window.addEventListener(EVT, handler);
    return () => window.removeEventListener(EVT, handler);
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
  return { toasts, dismiss };
}
