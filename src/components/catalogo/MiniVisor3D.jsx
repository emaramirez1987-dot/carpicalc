// ════════════════════════════════════════════════════════════════════════════
// MiniVisor3D.jsx — visor 3D compacto para el panel paramétrico
// ════════════════════════════════════════════════════════════════════════════
//
// Renderiza una vista 3D pequeña del módulo en edición. Se monta al costado
// del EditorParametrico mientras se arma un módulo paramétrico, así el
// autor ve cómo queda mientras toca parámetros, zonas y piezas.
//
// Liviano: usa Modulo3D ya disponible, sin gizmos ni controles complejos.
// OrbitControls básico para rotar + zoom. Sin sombras (perf).
// ════════════════════════════════════════════════════════════════════════════

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Modulo3D from "../visor3d/Modulo3D.jsx";

export default function MiniVisor3D({ modulo, costos }) {
  if (!modulo || !costos) {
    return (
      <div style={{
        height: 280, display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-base)", borderRadius: 8, border: "1px solid var(--border)",
        color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontSize: 11,
      }}>
        Sin datos para previsualizar
      </div>
    );
  }

  return (
    <div style={{
      height: 320, borderRadius: 8, overflow: "hidden",
      border: "1px solid var(--border)",
      background: "var(--bg-base)",
      position: "relative",
    }}>
      <Canvas
        shadows={false}
        camera={{ position: [1.2, 1.0, 1.4], fov: 45, near: 0.01, far: 50 }}
        style={{ background: "#15171d" }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={0.6} />
        <directionalLight position={[-3, 2, -3]} intensity={0.25} />
        <Suspense fallback={null}>
          <Modulo3D modulo={modulo} costos={costos} />
        </Suspense>
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={[0, 0.35, 0]}
        />
      </Canvas>
      <div style={{
        position: "absolute", bottom: 6, left: 8,
        fontSize: 9, fontFamily: "'DM Mono',monospace",
        color: "rgba(255,255,255,0.35)", pointerEvents: "none",
      }}>
        Drag rotar · Scroll zoom · Defaults aplicados
      </div>
    </div>
  );
}
