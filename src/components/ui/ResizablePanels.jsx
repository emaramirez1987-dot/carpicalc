import { useState, useRef } from "react";

/**
 * Dos paneles side-by-side con divisor arrastrable.
 * Props:
 *   left        — contenido columna izquierda
 *   right       — contenido columna derecha
 *   defaultSplit — porcentaje inicial de la columna izquierda (default 55)
 *   minLeft      — mínimo % izquierda (default 30)
 *   maxLeft      — máximo % izquierda (default 80)
 *   style        — estilos del contenedor exterior
 */
export default function ResizablePanels({
  left,
  right,
  overlay,
  defaultSplit = 55,
  minLeft = 30,
  maxLeft = 80,
  style = {},
}) {
  const [splitPct, setSplitPct] = useState(defaultSplit);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const startDrag = (e) => {
    e.preventDefault();
    dragging.current = true;

    const onMove = (ev) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(maxLeft, Math.max(minLeft, pct)));
    };

    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      ref={containerRef}
      style={{ display: "flex", overflow: "hidden", position: "relative", ...style }}
    >
      {/* Columna izquierda */}
      <div style={{ width: `${splitPct}%`, minWidth: 0, overflow: "hidden" }}>
        {left}
      </div>

      {/* Divisor arrastrable */}
      <div
        onMouseDown={startDrag}
        style={{
          width: 5,
          flexShrink: 0,
          cursor: "col-resize",
          background: "var(--border)",
          transition: "background 0.15s",
          position: "relative",
          zIndex: 10,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--accent)")}
        onMouseLeave={e => (e.currentTarget.style.background = "var(--border)")}
      />

      {/* Columna derecha */}
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        {right}
      </div>

      {/* Overlay opcional — cubre ambas columnas */}
      {overlay}
    </div>
  );
}
