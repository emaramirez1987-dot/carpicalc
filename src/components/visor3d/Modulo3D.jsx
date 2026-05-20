// ════════════════════════════════════════════════════════════════════════════
// Modulo3D.jsx — componente React que renderiza UN módulo en una escena 3D
// ════════════════════════════════════════════════════════════════════════════
//
// La lógica del motor (cálculo de piezas, orientaciones) vive en
// ./engine/buildPiezas3D.js. Este archivo solo se ocupa del render.
//
// Material visual: recibe `visual` ya resuelto (resolverVisualMaterial del
// service) — textura + props PBR derivadas del material asignado al ítem.
// No conoce `texturaCode` ni mapas de texturas; la fuente de verdad es el
// material. Cuando `visual.material` es null cae al fallback por tipo de pieza.
// ════════════════════════════════════════════════════════════════════════════

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';
import { getMaterialProps } from './useMaterial3D.js';
import { buildPiezas3D } from './engine/buildPiezas3D.js';

// ── Pieza ─────────────────────────────────────────────────────────────────────
function Pieza({ size, pos, explodeVec, explodeFactor, materialTipo, selected, onClick, textura, visual, rotY = 0, contornos = null }) {
  const esHandle  = materialTipo === 'manija';
  // Con material resuelto y pieza no-manija → props PBR del material.
  // Sin material o pieza manija → fallback por tipo de pieza.
  const usaVisual = !!(visual && visual.material) && !esHandle;
  const pbr = usaVisual
    ? { color: visual.color, roughness: visual.roughness, metalness: visual.metalness }
    : getMaterialProps(materialTipo);
  const tex = (usaVisual && textura) ? textura : null;

  const ep       = explodeFactor * 0.35;
  const finalPos = [
    pos[0] + explodeVec[0] * ep,
    pos[1] + explodeVec[1] * ep,
    pos[2] + explodeVec[2] * ep,
  ];

  return (
    <group position={finalPos} rotation={[0, rotY * Math.PI / 180, 0]} onClick={onClick}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          key={tex ? (visual.material.id || 'tex') : 'plain'}
          color={selected ? '#d4af37' : (tex ? '#ffffff' : pbr.color)}
          roughness={tex ? 0.65 : pbr.roughness}
          metalness={tex ? 0.0  : pbr.metalness}
          map={tex ?? undefined}
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
export default function Modulo3D({ modulo, costos, explodeFactor = 0, selectedPieza, onSelectPieza, visual, texturaRepeat = 2, parametrosValores, contornos = null }) {
  const piezas = useMemo(
    () => buildPiezas3D(modulo, costos, parametrosValores || {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modulo?.codigo, modulo?.dimensiones, modulo?.material, modulo?.piezas, costos, parametrosValores]
  );

  // Una sola textura THREE por módulo, compartida por todas las piezas no-handle.
  // Evita crear un TextureLoader por pieza. Se libera al cambiar o desmontar.
  const textura = useMemo(() => {
    const url = visual?.textura;
    if (!url) return null;
    const tex = new THREE.TextureLoader().load(url);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(texturaRepeat, texturaRepeat);
    return tex;
  }, [visual?.textura, texturaRepeat]);

  useEffect(() => () => { textura?.dispose(); }, [textura]);

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
          textura={textura}
          visual={visual}
          contornos={contornos}
        />
      ))}
    </group>
  );
}
