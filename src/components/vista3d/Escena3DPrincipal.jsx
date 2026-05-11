import React, { useRef, useState, useEffect, useMemo } from 'react';
import { OrbitControls, Html } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Modulo3D from '../visor3d/Modulo3D.jsx';
import { useAutoLayout3D } from './useAutoLayout3D.js';

export const WALL_Z = -0.6; // posición de la pared trasera

// ── Theme palettes — identical to VisorModulo3D (no HDRI, manual lighting only) ─
const DARK_PAL  = { bg: '#1a1c22', fogNear: 5,  fogFar: 14, ambInt: 0.60 };
const LIGHT_PAL = { bg: '#f0f1f4', fogNear: 8,  fogFar: 24, ambInt: 0.88 };

// ── EntornoEscena — background + fog + ambient (idéntico a VisorModulo3D) ────
function EntornoEscena({ isDark }) {
  const pal = isDark ? DARK_PAL : LIGHT_PAL;
  return (
    <>
      <color attach="background" args={[pal.bg]} />
      <fog   attach="fog"        args={[pal.bg, pal.fogNear, pal.fogFar]} />
      <ambientLight intensity={pal.ambInt} />
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
// Props >8 justificados: escena 3D con controles flotantes integrados
function ModuloEnEscena({ inst, modulos, costos, isSelected, onSelect, onUpdatePosicion, orbitRef, livePositions, texturaDataUrl, onRotar90, onEliminarModulo }) {
  const groupRef   = useRef();
  const isDragging = useRef(false);
  const [hovered, setHovered] = useState(false);
  const { camera, gl } = useThree();

  const [x, y, z] = inst.worldPos;
  const modBase    = modulos?.[inst.codigo];
  const mod = useMemo(() => {
    if (!modBase || !inst.dimsOverride) return modBase;
    return { ...modBase, dimensiones: { ...modBase.dimensiones, ...inst.dimsOverride } };
  }, [modBase, inst.dimsOverride]);

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

  // Handlers para el overlay flotante (usan refs para evitar closures viejas)
  const handleLocalNudge = (dx, dz) => {
    if (!groupRef.current) return;
    const p = groupRef.current.position;
    latestRef.current.onUpdatePosicion(latestRef.current.instanceId, [p.x + dx, latestRef.current.y, p.z + dz]);
  };
  const handleLocalSnap = () => {
    if (!groupRef.current) return;
    const p = groupRef.current.position;
    latestRef.current.onUpdatePosicion(latestRef.current.instanceId, [p.x, latestRef.current.y, WALL_Z + latestRef.current.halfDepth]);
  };

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
    // Swap hw/hd cuando el módulo está rotado 90° (footprint se transpone)
    const rotSteps = Math.round((inst.rotacionY || 0) / (Math.PI / 2)) % 2;
    const effectiveHW = rotSteps !== 0 ? halfDepth : halfWidth;
    const effectiveHD = rotSteps !== 0 ? halfWidth  : halfDepth;
    livePositions.current[inst.instanceId] = {
      x:  groupRef.current.position.x,
      z:  groupRef.current.position.z,
      hw: effectiveHW,
      hd: effectiveHD,
    };
  });

  if (!mod) return null;

  const ow = (mod.dimensiones?.ancho       || 600) / 1000;
  const oh = (mod.dimensiones?.alto        || 700) / 1000;
  const od = (mod.dimensiones?.profundidad || 550) / 1000;

  return (
    <group
      ref={groupRef}
      position={[x, y, z]}
      rotation={[0, inst.rotacionY || 0, 0]}
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

      {/* Outline de selección — cyan #4D8CFF: halo glow exterior + filo sólido */}
      {isSelected && (
        <>
          <mesh>
            <boxGeometry args={[ow + 0.028, oh + 0.028, od + 0.028]} />
            <meshBasicMaterial color="#4D8CFF" side={THREE.BackSide} transparent opacity={0.13} depthWrite={false} />
          </mesh>
          <mesh>
            <boxGeometry args={[ow + 0.011, oh + 0.011, od + 0.011]} />
            <meshBasicMaterial color="#4D8CFF" side={THREE.BackSide} transparent opacity={0.88} depthWrite={false} />
          </mesh>
        </>
      )}
      {hovered && !isSelected && (
        <mesh>
          <boxGeometry args={[ow + 0.009, oh + 0.009, od + 0.009]} />
          <meshBasicMaterial color="#4D8CFF" side={THREE.BackSide} transparent opacity={0.09} depthWrite={false} />
        </mesh>
      )}

      {/* Overlay flotante — mini toolbar discreta, escala con zoom via distanceFactor */}
      {isSelected && (
        <Html
          position={[0, oh / 2 + 0.13, 0]}
          center
          distanceFactor={2.5}
          zIndexRange={[50, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            onPointerDown={e => e.stopPropagation()}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(12,14,20,0.88)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 7,
              padding: '4px 5px',
              display: 'flex', gap: 3, alignItems: 'center',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              boxShadow: '0 3px 12px rgba(0,0,0,0.55)',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <button style={FLOAT_BTN} onClick={() => handleLocalNudge(-FLOAT_STEP, 0)} title="Izquierda">◀</button>
            <button style={FLOAT_BTN} onClick={() => handleLocalNudge(0, -FLOAT_STEP)} title="Acercar a pared">▲</button>
            <button style={FLOAT_BTN} onClick={() => handleLocalNudge(0,  FLOAT_STEP)} title="Alejar de pared">▼</button>
            <button style={FLOAT_BTN} onClick={() => handleLocalNudge( FLOAT_STEP, 0)} title="Derecha">▶</button>
            <div style={{ width: 1, height: 11, background: 'rgba(255,255,255,0.13)', flexShrink: 0 }} />
            <button style={{ ...FLOAT_BTN, color: 'rgba(100,140,255,0.92)' }} onClick={() => onRotar90(inst.instanceId)} title="Rotar 90°">↻</button>
            <button style={{ ...FLOAT_BTN, color: 'rgba(210,175,70,0.92)' }} onClick={handleLocalSnap} title="Pegar a pared">⊡</button>
            <button style={{ ...FLOAT_BTN, color: 'rgba(210,80,80,0.92)' }} onClick={() => onEliminarModulo(inst.instanceId)} title="Quitar módulo">✕</button>
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Floating overlay constants ────────────────────────────────────────────────
// distanceFactor=2.5 + 20px CSS → ~28px visual at iso view (~1.8u) | escala con zoom
const FLOAT_STEP = 0.05; // 5 cm de nudge
const FLOAT_BTN = {
  width: 20, height: 20, borderRadius: 4,
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: 'rgba(185,195,215,0.82)', cursor: 'pointer', fontSize: 10, lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0, flexShrink: 0,
};

// ── Grid colors per theme ──────────────────────────────────────────────────────
const GRID_DARK  = { c1: '#2a2d35', c2: '#232630' };
const GRID_LIGHT = { c1: '#c4c5ce', c2: '#d0d1da' };

// ── GrillaFloor — piso receptor de sombras + grilla superpuesta ───────────────
function GrillaFloor({ colorPiso, isDark, mostrarGrilla, divisiones }) {
  const grid = useMemo(() => {
    const { c1, c2 } = isDark ? GRID_DARK : GRID_LIGHT;
    const g = new THREE.GridHelper(10, divisiones, c1, c2);
    g.position.y = 0.002; // sobre el plano para evitar z-fighting
    return g;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, divisiones]);

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color={colorPiso} roughness={0.92} metalness={0.01} />
      </mesh>
      {mostrarGrilla && <primitive object={grid} />}
    </>
  );
}

const MESADA_THICKNESS = 0.04;
const MESADA_DEPTH     = 0.62;

// ── Mesada — sigue las posiciones vivas de los módulos bajos ──────────────────
function Mesada({ livePositions, modulosEnEscena, modulos, color }) {
  const meshRef = useRef();

  useFrame(() => {
    if (!meshRef.current) return;

    const bajos = modulosEnEscena.filter(inst =>
      !['aereo', 'torre'].includes(modulos?.[inst.codigo]?.tipoVisual || '')
    );

    if (bajos.length === 0) { meshRef.current.visible = false; return; }

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxH = 0;
    for (const inst of bajos) {
      const live = livePositions.current[inst.instanceId];
      if (!live) continue;
      const h = (modulos[inst.codigo]?.dimensiones?.alto || 700) / 1000;
      minX = Math.min(minX, live.x - live.hw);
      maxX = Math.max(maxX, live.x + live.hw);
      minZ = Math.min(minZ, live.z - live.hd);
      maxZ = Math.max(maxZ, live.z + live.hd);
      maxH = Math.max(maxH, h);
    }

    if (minX === Infinity) { meshRef.current.visible = false; return; }

    meshRef.current.visible    = true;
    meshRef.current.position.x = (minX + maxX) / 2;
    meshRef.current.position.y = maxH + MESADA_THICKNESS / 2;
    meshRef.current.position.z = (minZ + maxZ) / 2;
    // scale.x sobre una geometría de ancho=1 equivale al ancho real
    meshRef.current.scale.x    = maxX - minX;
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, MESADA_THICKNESS, MESADA_DEPTH]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.05} />
    </mesh>
  );
}

// ── Escena3DPrincipal ─────────────────────────────────────────────────────────
export function Escena3DPrincipal({
  modulosEnEscena, modulos, costos,
  mostrarPiso, mostrarPared, mostrarMesada,
  colorPiso, colorPared, colorMesada,
  camTarget, onSelectModulo, selectedCod, onUpdatePosicion,
  materiales3D, isDark = true,
  shadowIntensidad = 1, shadowAngle = 45,
  mostrarGrilla = true, divisionesGrilla = 50,
  onRotar90, onEliminarModulo,
  mostrarParedIzq = false, mostrarParedDer = false,
}) {
  const orbitRef       = useRef();
  const livePositions  = useRef({}); // { [instanceId]: { x, z, hw, hd } }
  const layoutItems    = useAutoLayout3D(modulosEnEscena, modulos);
  // shadowAngle: azimuth en grados (0=frente, 90=derecha, 180=atrás, 270=izquierda)
  const shadowRad      = (shadowAngle * Math.PI) / 180;
  const shadowLightPos = [Math.sin(shadowRad) * 7, 7, Math.cos(shadowRad) * 7];

  return (
    <>
      <CamaraController targetPos={camTarget} />
      <OrbitControls ref={orbitRef} makeDefault enableDamping dampingFactor={0.08} />

      <EntornoEscena isDark={isDark} />
      {/* Luces idénticas a VisorModulo3D — sin HDRI */}
      <directionalLight position={shadowLightPos} intensity={1.1 * shadowIntensidad} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 2, -3]} intensity={0.28} color="#b8d4f0" />

      {mostrarPiso && (
        <GrillaFloor
          colorPiso={colorPiso}
          isDark={isDark}
          mostrarGrilla={mostrarGrilla}
          divisiones={divisionesGrilla}
        />
      )}

      {mostrarPared && (
        <mesh position={[0, 1.5, WALL_Z]}>
          <planeGeometry args={[10, 3]} />
          <meshStandardMaterial color={colorPared} roughness={0.82} metalness={0.0} side={2} />
        </mesh>
      )}

      {/* Pared lateral izquierda */}
      {mostrarParedIzq && (
        <mesh position={[-5, 1.5, WALL_Z + 3]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[6, 3]} />
          <meshStandardMaterial color={colorPared} roughness={0.82} metalness={0.0} side={2} />
        </mesh>
      )}

      {/* Pared lateral derecha */}
      {mostrarParedDer && (
        <mesh position={[5, 1.5, WALL_Z + 3]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[6, 3]} />
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
            onRotar90={onRotar90}
            onEliminarModulo={onEliminarModulo}
            texturaDataUrl={texturaDataUrl}
          />
        );
      })}

      {mostrarMesada && (
        <Mesada
          livePositions={livePositions}
          modulosEnEscena={modulosEnEscena}
          modulos={modulos}
          color={colorMesada}
        />
      )}
    </>
  );
}
