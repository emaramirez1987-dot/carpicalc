import React, { useRef, useState, useEffect } from 'react';
import { OrbitControls, TransformControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import Modulo3D from '../visor3d/Modulo3D.jsx';
import { useAutoLayout3D } from './useAutoLayout3D.js';

export const WALL_Z    = -0.6;  // posición de la pared trasera en la escena
export const WALL_X_MIN = -5;   // límites laterales del espacio

// ── CamaraController ──────────────────────────────────────────────────────────
function CamaraController({ targetPos }) {
  const { camera, controls } = useThree();
  React.useEffect(() => {
    if (!targetPos) return;
    camera.position.set(...targetPos);
    camera.lookAt(0, 0, 0);
    if (controls) controls.target.set(0, 0, 0);
  }, [targetPos, camera, controls]);
  return null;
}

// ── ModuloEnEscena ────────────────────────────────────────────────────────────
function ModuloEnEscena({ inst, modulos, costos, isSelected, onSelect, onUpdatePosicion, orbitRef }) {
  const groupRef                      = useRef();
  const [groupObject, setGroupObject] = useState(null);
  const [x, y, z]                     = inst.worldPos;
  const mod                           = modulos?.[inst.codigo];

  useEffect(() => {
    if (groupRef.current) setGroupObject(groupRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (!groupRef.current) return;
    // Bloquear eje Y — solo movimiento en X y Z
    groupRef.current.position.y = y;
    // Colisión con pared trasera — el módulo no puede atravesarla
    const halfDepth = (mod?.dimensiones?.profundidad || 550) / 2 / 1000;
    const minZ = WALL_Z + halfDepth;
    if (groupRef.current.position.z < minZ) {
      groupRef.current.position.z = minZ;
    }
  });

  if (!mod) return null;

  return (
    <>
      {groupObject && (
        <TransformControls
          object={groupObject}
          mode="translate"
          enabled={isSelected}
          visible={isSelected}
          onMouseDown={() => { if (orbitRef.current) orbitRef.current.enabled = false; }}
          onMouseUp={() => {
            if (orbitRef.current) orbitRef.current.enabled = true;
            if (groupRef.current) {
              const p = groupRef.current.position;
              onUpdatePosicion(inst.instanceId, [p.x, y, p.z]);
            }
          }}
        />
      )}

      <group
        ref={groupRef}
        position={[x, y, z]}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <Modulo3D
          modulo={mod}
          costos={costos}
          explodeFactor={0}
          selectedPieza={null}
          onSelectPieza={null}
        />
        {isSelected && (
          <mesh>
            <boxGeometry args={[
              (mod.dimensiones?.ancho       || 600) / 1000 + 0.02,
              (mod.dimensiones?.alto        || 700) / 1000 + 0.02,
              (mod.dimensiones?.profundidad || 550) / 1000 + 0.02,
            ]} />
            <meshStandardMaterial color="#D4AF37" transparent opacity={0.12} />
          </mesh>
        )}
      </group>
    </>
  );
}

// ── Escena3DPrincipal ─────────────────────────────────────────────────────────
export function Escena3DPrincipal({
  modulosEnEscena, modulos, costos,
  mostrarPiso, mostrarPared, mostrarMesada,
  colorPiso, colorPared, colorMesada,
  camTarget, onSelectModulo, selectedCod, onUpdatePosicion,
}) {
  const orbitRef    = useRef();
  const layoutItems = useAutoLayout3D(modulosEnEscena, modulos);

  const bajosLayout = layoutItems.filter(it =>
    !['aereo', 'torre'].includes(modulos?.[it.codigo]?.tipoVisual || '')
  );
  const mesadaWidth   = bajosLayout.reduce((acc, it) =>
    acc + (modulos?.[it.codigo]?.dimensiones?.ancho || 600) / 1000, 0);
  const MESADA_THICKNESS = 0.04;
  const maxBajoH      = bajosLayout.reduce((max, it) =>
    Math.max(max, (modulos?.[it.codigo]?.dimensiones?.alto || 700) / 1000), 0);
  const mesadaY       = maxBajoH + MESADA_THICKNESS / 2;
  const mesadaCenterX = mesadaWidth / 2;

  return (
    <>
      <CamaraController targetPos={camTarget} />
      <OrbitControls ref={orbitRef} makeDefault enableDamping dampingFactor={0.08} />

      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 8, 4]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-3, 4, -3]} intensity={0.4} color="#b8d4f0" />
      <directionalLight position={[0, -2, 4]} intensity={0.2} />

      {mostrarPiso && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color={colorPiso} roughness={0.9} />
        </mesh>
      )}

      {mostrarPared && (
        <mesh position={[0, 1.5, WALL_Z]}>
          <planeGeometry args={[10, 3]} />
          <meshStandardMaterial color={colorPared} roughness={0.85} side={2} />
        </mesh>
      )}

      {layoutItems.map((inst) => (
        <ModuloEnEscena
          key={inst.instanceId}
          inst={inst}
          modulos={modulos}
          costos={costos}
          isSelected={selectedCod === inst.instanceId}
          onSelect={() => onSelectModulo?.(selectedCod === inst.instanceId ? null : inst.instanceId)}
          onUpdatePosicion={onUpdatePosicion}
          orbitRef={orbitRef}
        />
      ))}

      {mostrarMesada && mesadaWidth > 0 && (
        <mesh position={[mesadaCenterX, mesadaY, 0]}>
          <boxGeometry args={[mesadaWidth, MESADA_THICKNESS, 0.62]} />
          <meshStandardMaterial color={colorMesada} roughness={0.3} metalness={0.05} />
        </mesh>
      )}
    </>
  );
}
