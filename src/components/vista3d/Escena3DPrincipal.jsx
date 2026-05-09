import React, { useRef, useState, useEffect, useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Modulo3D from '../visor3d/Modulo3D.jsx';
import { useAutoLayout3D } from './useAutoLayout3D.js';

export const WALL_Z = -0.6; // posición de la pared trasera

// ── Theme palettes ─────────────────────────────────────────────────────────────
const DARK_PAL  = { bg: '#080a0d', fogNear: 6,  fogFar: 18, ambInt: 0.35, hemiSky: '#1e2540', hemiGnd: '#060709', hemiInt: 0.55 };
const LIGHT_PAL = { bg: '#eff0f4', fogNear: 10, fogFar: 28, ambInt: 0.45, hemiSky: '#c8d8f0', hemiGnd: '#c4c0ba', hemiInt: 0.70 };

// ── Shadow direction presets ───────────────────────────────────────────────────
const SHADOW_DIRS = {
  left:  [-5, 7, 3],
  right: [ 5, 7, 3],
  top:   [ 1, 10, 2],
};

// ── EntornoEscena — adapts background, fog, ambient and hemisphere to theme ───
function EntornoEscena({ isDark }) {
  const pal = isDark ? DARK_PAL : LIGHT_PAL;
  return (
    <>
      <color attach="background" args={[pal.bg]} />
      <fog   attach="fog"        args={[pal.bg, pal.fogNear, pal.fogFar]} />
      <ambientLight intensity={pal.ambInt} />
      <hemisphereLight args={[pal.hemiSky, pal.hemiGnd, pal.hemiInt]} />
    </>
  );
}

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

// ── resolveCollision ──────────────────────────────────────────────────────────
// Empuja el módulo arrastrado fuera de cualquier módulo con el que colisione.
// livePositions: { [instanceId]: { x, z, hw, hd } }
// Devuelve { x, z } resuelto.
function resolveCollision(proposedX, proposedZ, hw, hd, selfId, livePositions) {
  let x = proposedX;
  let z = proposedZ;

  for (const [id, other] of Object.entries(livePositions)) {
    if (id === selfId) continue;
    const overlapX = hw + other.hw - Math.abs(x - other.x);
    const overlapZ = hd + other.hd - Math.abs(z - other.z);
    if (overlapX > 0 && overlapZ > 0) {
      // Empujar por el eje de menor penetración
      if (overlapX < overlapZ) {
        x += x > other.x ? overlapX : -overlapX;
      } else {
        z += z > other.z ? overlapZ : -overlapZ;
      }
    }
  }
  return { x, z };
}

// ── ModuloEnEscena ────────────────────────────────────────────────────────────
function ModuloEnEscena({ inst, modulos, costos, isSelected, onSelect, onUpdatePosicion, orbitRef, livePositions, texturaDataUrl }) {
  const groupRef   = useRef();
  const isDragging = useRef(false);
  const [hovered, setHovered] = useState(false);
  const { camera, gl } = useThree();

  const [x, y, z] = inst.worldPos;
  const mod        = modulos?.[inst.codigo];

  const halfWidth = useMemo(
    () => (mod?.dimensiones?.ancho       || 600) / 2 / 1000,
    [mod]
  );
  const halfDepth = useMemo(
    () => (mod?.dimensiones?.profundidad || 550) / 2 / 1000,
    [mod]
  );

  // Plano del piso para raycasting durante drag
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const raycaster  = useMemo(() => new THREE.Raycaster(), []);

  // Ref "latest" para evitar closures viejas en los listeners DOM
  const latestRef = useRef({ y, halfWidth, halfDepth, instanceId: inst.instanceId, onUpdatePosicion });
  useEffect(() => {
    latestRef.current = { y, halfWidth, halfDepth, instanceId: inst.instanceId, onUpdatePosicion };
  });

  // Listeners DOM en el canvas — funcionan aunque el cursor salga del módulo
  useEffect(() => {
    const canvas = gl.domElement;

    const onMove = (e) => {
      if (!isDragging.current) return;
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
      const ny = -((e.clientY - rect.top)  / rect.height) *  2 + 1;
      raycaster.setFromCamera({ x: nx, y: ny }, camera);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(floorPlane, hit) && groupRef.current) {
        const { halfWidth: hw, halfDepth: hd, instanceId } = latestRef.current;

        // Colisión con pared trasera
        const clampedZ = Math.max(hit.z, WALL_Z + hd);

        // Colisión entre módulos
        const resolved = resolveCollision(hit.x, clampedZ, hw, hd, instanceId, livePositions.current);

        groupRef.current.position.x = resolved.x;
        groupRef.current.position.z = resolved.z;
      }
    };

    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (orbitRef.current) orbitRef.current.enabled = true;
      canvas.style.cursor = 'auto';
      if (groupRef.current) {
        const p = groupRef.current.position;
        latestRef.current.onUpdatePosicion(latestRef.current.instanceId, [p.x, latestRef.current.y, p.z]);
      }
    };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup',   onUp);
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup',   onUp);
    };
  }, [camera, gl, floorPlane, raycaster, orbitRef, livePositions]);

  // Actualizar posición en vivo + bloquear Y + colisión con pared
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.y = y;
    if (groupRef.current.position.z < WALL_Z + halfDepth) {
      groupRef.current.position.z = WALL_Z + halfDepth;
    }
    // Registrar posición live para que otros módulos puedan evitarla
    livePositions.current[inst.instanceId] = {
      x:  groupRef.current.position.x,
      z:  groupRef.current.position.z,
      hw: halfWidth,
      hd: halfDepth,
    };
  });

  if (!mod) return null;

  return (
    <group
      ref={groupRef}
      position={[x, y, z]}
      onPointerDown={(e) => {
        e.stopPropagation();
        isDragging.current = true;
        if (orbitRef.current) orbitRef.current.enabled = false;
        gl.domElement.style.cursor = 'grabbing';
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        gl.domElement.style.cursor = isDragging.current ? 'grabbing' : 'grab';
      }}
      onPointerOut={() => {
        setHovered(false);
        if (!isDragging.current) gl.domElement.style.cursor = 'auto';
      }}
    >
      <Modulo3D
        modulo={mod}
        costos={costos}
        explodeFactor={0}
        selectedPieza={null}
        onSelectPieza={null}
        texturaDataUrl={texturaDataUrl}
      />

      {/* Highlight hover / selección */}
      {(isSelected || hovered) && (
        <mesh>
          <boxGeometry args={[
            (mod.dimensiones?.ancho       || 600) / 1000 + 0.015,
            (mod.dimensiones?.alto        || 700) / 1000 + 0.015,
            (mod.dimensiones?.profundidad || 550) / 1000 + 0.015,
          ]} />
          <meshStandardMaterial
            color={isSelected ? '#D4AF37' : '#ffffff'}
            transparent
            opacity={isSelected ? 0.13 : 0.06}
          />
        </mesh>
      )}
    </group>
  );
}

// ── Escena3DPrincipal ─────────────────────────────────────────────────────────
export function Escena3DPrincipal({
  modulosEnEscena, modulos, costos,
  mostrarPiso, mostrarPared, mostrarMesada,
  colorPiso, colorPared, colorMesada,
  camTarget, onSelectModulo, selectedCod, onUpdatePosicion,
  materiales3D, isDark = true,
  shadowIntensidad = 1, shadowDir = 'right',
}) {
  const orbitRef      = useRef();
  const livePositions = useRef({}); // { [instanceId]: { x, z, hw, hd } }
  const layoutItems   = useAutoLayout3D(modulosEnEscena, modulos);
  const shadowLightPos = SHADOW_DIRS[shadowDir] || SHADOW_DIRS.right;

  const bajosLayout = layoutItems.filter(it =>
    !['aereo', 'torre'].includes(modulos?.[it.codigo]?.tipoVisual || '')
  );
  const mesadaWidth = bajosLayout.reduce(
    (acc, it) => acc + (modulos?.[it.codigo]?.dimensiones?.ancho || 600) / 1000, 0
  );
  const MESADA_THICKNESS = 0.04;
  const maxBajoH = bajosLayout.reduce(
    (max, it) => Math.max(max, (modulos?.[it.codigo]?.dimensiones?.alto || 700) / 1000), 0
  );
  const mesadaY       = maxBajoH + MESADA_THICKNESS / 2;
  const mesadaCenterX = mesadaWidth / 2;

  return (
    <>
      <CamaraController targetPos={camTarget} />
      <OrbitControls ref={orbitRef} makeDefault enableDamping dampingFactor={0.08} />

      <EntornoEscena isDark={isDark} />
      <directionalLight position={shadowLightPos} intensity={1.4 * shadowIntensidad} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-3, 4, -3]} intensity={0.35} color="#b8d4f0" />
      <directionalLight position={[0, -2, 4]} intensity={0.15} />

      {mostrarPiso && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color={colorPiso} roughness={0.92} metalness={0.01} />
        </mesh>
      )}

      {mostrarPared && (
        <mesh position={[0, 1.5, WALL_Z]}>
          <planeGeometry args={[10, 3]} />
          <meshStandardMaterial color={colorPared} roughness={0.82} metalness={0.0} side={2} />
        </mesh>
      )}

      {/* Floor/wall junction shadow strip */}
      {mostrarPiso && mostrarPared && (
        <mesh position={[0, 0.001, WALL_Z + 0.07]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 0.14]} />
          <meshStandardMaterial
            color={isDark ? '#030405' : '#a8a6a3'}
            roughness={1}
            transparent
            opacity={0.55}
          />
        </mesh>
      )}

      {layoutItems.map((inst) => {
        const texturaCode   = inst.texturaCode;
        const texturaDataUrl = texturaCode ? materiales3D?.[texturaCode]?.dataUrl : null;
        return (
          <ModuloEnEscena
            key={inst.instanceId}
            inst={inst}
            modulos={modulos}
            costos={costos}
            isSelected={selectedCod === inst.instanceId}
            onSelect={() => onSelectModulo?.(selectedCod === inst.instanceId ? null : inst.instanceId)}
            onUpdatePosicion={onUpdatePosicion}
            orbitRef={orbitRef}
            livePositions={livePositions}
            texturaDataUrl={texturaDataUrl}
          />
        );
      })}

      {mostrarMesada && mesadaWidth > 0 && (
        <mesh position={[mesadaCenterX, mesadaY, 0]}>
          <boxGeometry args={[mesadaWidth, MESADA_THICKNESS, 0.62]} />
          <meshStandardMaterial color={colorMesada} roughness={0.3} metalness={0.05} />
        </mesh>
      )}
    </>
  );
}
