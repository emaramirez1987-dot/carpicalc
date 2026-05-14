// ════════════════════════════════════════════════════════════════════════════
// Modulo3D.jsx — componente React que renderiza UN módulo en una escena 3D
// ════════════════════════════════════════════════════════════════════════════
//
// La lógica del motor (cálculo de piezas, orientaciones) vive en
// ./engine/buildPiezas3D.js. Este archivo solo se ocupa del render.
// ════════════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';
import { getMaterialProps } from './useMaterial3D.js';
import { buildPiezas3D } from './engine/buildPiezas3D.js';

// ── Pieza ─────────────────────────────────────────────────────────────────────
function Pieza({ size, pos, explodeVec, explodeFactor, materialTipo, selected, onClick, texturaDataUrl, rotY = 0, contornos = null }) {
  const matProps = getMaterialProps(materialTipo);
  const ep       = explodeFactor * 0.35;
  const finalPos = [
    pos[0] + explodeVec[0] * ep,
    pos[1] + explodeVec[1] * ep,
    pos[2] + explodeVec[2] * ep,
  ];

  const texture = useMemo(() => {
    if (!texturaDataUrl || materialTipo === 'manija') return null;
    const tex = new THREE.TextureLoader().load(texturaDataUrl);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }, [texturaDataUrl, materialTipo]);

  return (
    <group position={finalPos} rotation={[0, rotY * Math.PI / 180, 0]} onClick={onClick}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          key={texturaDataUrl ?? 'plain'}
          color={selected ? '#d4af37' : (texture ? '#ffffff' : matProps.color)}
          roughness={texture ? 0.65 : matProps.roughness}
          metalness={texture ? 0.0  : matProps.metalness}
          map={texture ?? undefined}
          transparent={selected}
          opacity={selected ? 0.9 : 1}
        />
        {/* Contornos opcionales — aristas resaltadas para mejor contraste */}
        {contornos && (
          <Edges
            scale={1.001}
            threshold={15}
            color={contornos.color || '#000000'}
            linewidth={contornos.linewidth || 1} />
        )}
      </mesh>
    </group>
  );
}

// ── Modulo3D (default export — used in main scene) ────────────────────────────
export default function Modulo3D({ modulo, costos, explodeFactor = 0, selectedPieza, onSelectPieza, texturaDataUrl, parametrosValores, contornos = null }) {
  const piezas = useMemo(
    () => buildPiezas3D(modulo, costos, parametrosValores || {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modulo?.codigo, modulo?.dimensiones, modulo?.material, modulo?.piezas, costos, parametrosValores]
  );

  return (
    <group>
      {piezas.filter(p => !p.isHandle).map(p => (
        <Pieza
          key={p.id}
          size={p.size}
          pos={p.pos}
          explodeVec={p.explodeVec}
          explodeFactor={explodeFactor}
          materialTipo={p.materialTipo}
          selected={selectedPieza === p.id}
          rotY={p.rot3d || 0}
          onClick={(e) => {
            e.stopPropagation();
            onSelectPieza?.({ id: p.id, piezaIdx: p.piezaIdx, nombre: p.nombre, role: p.role, size: p.size, pos: p.pos });
          }}
          texturaDataUrl={texturaDataUrl}
          contornos={contornos}
        />
      ))}
    </group>
  );
}
