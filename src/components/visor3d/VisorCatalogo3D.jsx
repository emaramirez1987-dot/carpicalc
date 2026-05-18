// ════════════════════════════════════════════════════════════════════════════
// VisorCatalogo3D.jsx — visor 3D unificado del catálogo
// ════════════════════════════════════════════════════════════════════════════
//
// Único visor 3D en edición de módulos. Reemplaza al MiniVisor3D (preview) y
// al viejo VisorModulo3D (editor modal). Layout único: canvas + toolbar
// lateral colapsable con TODAS las funciones (helpers, cámara, explode,
// export, maximizar). Click en una pieza abre un panel flotante de edición.
//
// El padre (FormModulo) controla si está maximizado o no — en ese estado lo
// monta como overlay absoluto sobre el área del formulario en lugar de la
// columna derecha. El visor en sí solo cambia el ícono del botón maximizar.
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { ORIENTACIONES_3D, buildPiezas3D } from './engine/buildPiezas3D.js';
import { getMaterialProps } from './useMaterial3D.js';
import { CAMARAS } from './CamaraPresets.js';
import { evaluarFormula } from '../../utils.js';
import { resolverContextoModulo, contextoRepeatVar } from '../../services/moduloService.js';

const LS_PREFS_KEY = "carpicalc:visor3d_prefs";

const STATUS_COLOR = {
  unassigned: '#F59E0B',
  auto:       '#10B981',
  manual:     '#3B82F6',
  conflict:   '#EF4444',
};
const STATUS_LABEL = {
  unassigned: 'Sin función',
  auto:       'Auto',
  manual:     'Ajustada',
  conflict:   'Conflicto',
};
const STEP_OPTIONS = [1, 5, 10];

// ── Persistencia de preferencias ────────────────────────────────────────────
function leerPrefs() {
  try {
    const raw = localStorage.getItem(LS_PREFS_KEY);
    if (!raw) return { grid: true, ejes: true, aristas: true, toolbar: true, verTC: true };
    const p = JSON.parse(raw);
    return {
      grid:    p.grid    !== false,
      ejes:    p.ejes    !== false,
      aristas: p.aristas !== false,
      toolbar: p.toolbar !== false,
      verTC:   p.verTC   !== false,
    };
  } catch (_e) {
    return { grid: true, ejes: true, aristas: true, toolbar: true, verTC: true };
  }
}
function guardarPrefs(prefs) {
  try { localStorage.setItem(LS_PREFS_KEY, JSON.stringify(prefs)); } catch (_e) { /* sin-op */ }
}

// ── Ejes XYZ con cilindros + flechas + labels ───────────────────────────────
function Eje({ color, rotation, length, radius }) {
  const bodyLen = length * 0.88;
  const tipLen  = length * 0.12;
  return (
    <group rotation={rotation}>
      <mesh position={[0, bodyLen / 2, 0]}>
        <cylinderGeometry args={[radius, radius, bodyLen, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, bodyLen + tipLen / 2, 0]}>
        <coneGeometry args={[radius * 2.4, tipLen, 14]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function EjesConLabels({ origen = [0, 0, 0], largo = 0.3, grosor = 0.005 }) {
  const colX = "#ff4030", colY = "#40d040", colZ = "#4080ff";
  const tip = largo + 0.04;
  const labelSize = Math.max(0.04, largo * 0.10);
  return (
    <group position={origen}>
      <mesh>
        <sphereGeometry args={[grosor * 1.8, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <Eje color={colX} rotation={[0, 0, -Math.PI / 2]} length={largo} radius={grosor} />
      <Eje color={colY} rotation={[0, 0, 0]}            length={largo} radius={grosor} />
      <Eje color={colZ} rotation={[Math.PI / 2, 0, 0]}  length={largo} radius={grosor} />
      <Text position={[tip, 0, 0]} fontSize={labelSize} color={colX} anchorX="center" anchorY="middle" outlineWidth={0.003} outlineColor="#000">X</Text>
      <Text position={[0, tip, 0]} fontSize={labelSize} color={colY} anchorX="center" anchorY="middle" outlineWidth={0.003} outlineColor="#000">Y</Text>
      <Text position={[0, 0, tip]} fontSize={labelSize} color={colZ} anchorX="center" anchorY="middle" outlineWidth={0.003} outlineColor="#000">Z</Text>
    </group>
  );
}

// ── Geometría de aristas con tapacanto (yellow rim per lados D1/D2) ─────────
function buildTCEdgesGeo(orientacion, size, tc) {
  if (!tc || (parseInt(tc.id) || 0) <= 0) return null;
  const lados1 = parseInt(tc.lados1) || 0;
  const lados2 = parseInt(tc.lados2) || 0;
  if (lados1 === 0 && lados2 === 0) return null;

  const [sx, sy, sz] = size;
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;

  // Cada "lado" del rim agrupa los 2 box-edges que lo delimitan (front+back face).
  let d1Sides, d2Sides;
  if (orientacion === 'vertical') {
    // size=[te,d1,d2]: D1∥Y, D2∥Z
    d1Sides = [
      [ [+hx,-hy,-hz,+hx,+hy,-hz], [-hx,-hy,-hz,-hx,+hy,-hz] ],
      [ [+hx,-hy,+hz,+hx,+hy,+hz], [-hx,-hy,+hz,-hx,+hy,+hz] ],
    ];
    d2Sides = [
      [ [+hx,-hy,-hz,+hx,-hy,+hz], [-hx,-hy,-hz,-hx,-hy,+hz] ],
      [ [+hx,+hy,-hz,+hx,+hy,+hz], [-hx,+hy,-hz,-hx,+hy,+hz] ],
    ];
  } else if (orientacion === 'horizontal') {
    // size=[d1,te,d2]: D1∥X, D2∥Z
    d1Sides = [
      [ [-hx,+hy,-hz,+hx,+hy,-hz], [-hx,-hy,-hz,+hx,-hy,-hz] ],
      [ [-hx,+hy,+hz,+hx,+hy,+hz], [-hx,-hy,+hz,+hx,-hy,+hz] ],
    ];
    d2Sides = [
      [ [-hx,+hy,-hz,-hx,+hy,+hz], [-hx,-hy,-hz,-hx,-hy,+hz] ],
      [ [+hx,+hy,-hz,+hx,+hy,+hz], [+hx,-hy,-hz,+hx,-hy,+hz] ],
    ];
  } else if (orientacion === 'frente') {
    // size=[d2,d1,te]: D1∥Y, D2∥X
    d1Sides = [
      [ [-hx,-hy,+hz,-hx,+hy,+hz], [-hx,-hy,-hz,-hx,+hy,-hz] ],
      [ [+hx,-hy,+hz,+hx,+hy,+hz], [+hx,-hy,-hz,+hx,+hy,-hz] ],
    ];
    d2Sides = [
      [ [-hx,-hy,+hz,+hx,-hy,+hz], [-hx,-hy,-hz,+hx,-hy,-hz] ],
      [ [-hx,+hy,+hz,+hx,+hy,+hz], [-hx,+hy,-hz,+hx,+hy,-hz] ],
    ];
  } else {
    return null;
  }

  const vs = [];
  const push = (sides, count) => {
    for (let i = 0; i < Math.min(count, sides.length); i++) {
      for (const seg of sides[i]) vs.push(...seg);
    }
  };
  push(d1Sides, lados1);
  push(d2Sides, lados2);
  if (vs.length === 0) return null;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vs, 3));
  return geo;
}

// ── PiezaAnimada — animación + selección + contornos opcionales ─────────────
function PiezaAnimada({ targetPos, targetRotYDeg, size, explodeVec, explodeFactor,
                        materialTipo, selected, isHandle, status, onClick, aristasColor,
                        tc, orientacion, showTC }) {
  const grpRef   = useRef();
  const animPos  = useRef({ x: targetPos[0], y: targetPos[1], z: targetPos[2] });
  const animRotY = useRef((targetRotYDeg || 0) * Math.PI / 180);

  const edgesGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size[0], size[1], size[2]]
  );

  const tcEdgesGeo = useMemo(
    () => showTC ? buildTCEdgesGeo(orientacion, size, tc) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showTC, orientacion, size[0], size[1], size[2], tc?.id, tc?.lados1, tc?.lados2]
  );

  useFrame((_, dt) => {
    if (!grpRef.current) return;
    const ep = explodeFactor * 0.35;
    const tx = targetPos[0] + explodeVec[0] * ep;
    const ty = targetPos[1] + explodeVec[1] * ep;
    const tz = targetPos[2] + explodeVec[2] * ep;
    const targetRot = (targetRotYDeg || 0) * Math.PI / 180;
    const k = Math.min(12 * dt, 1);
    animPos.current.x  += (tx - animPos.current.x) * k;
    animPos.current.y  += (ty - animPos.current.y) * k;
    animPos.current.z  += (tz - animPos.current.z) * k;
    animRotY.current   += (targetRot - animRotY.current) * k;
    grpRef.current.position.set(animPos.current.x, animPos.current.y, animPos.current.z);
    grpRef.current.rotation.y = animRotY.current;
  });

  const mat = getMaterialProps(materialTipo);
  const showSelectEdge = selected || status === 'conflict';
  const selectEdgeColor = status === 'conflict' ? '#EF4444' : '#FFE082';

  return (
    <group ref={grpRef} position={targetPos}>
      <mesh
        castShadow
        receiveShadow
        onClick={isHandle ? undefined : (e) => { e.stopPropagation(); onClick?.(); }}
        onPointerOver={isHandle ? undefined : (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={isHandle ? undefined : () => { document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={selected ? '#C8A830' : mat.color}
          roughness={selected ? 0.35 : mat.roughness}
          metalness={selected ? 0.05 : mat.metalness}
          transparent={selected}
          opacity={selected ? 0.82 : 1}
        />
      </mesh>
      {showSelectEdge && (
        <lineSegments renderOrder={1} geometry={edgesGeo}>
          <lineBasicMaterial color={selectEdgeColor} depthTest={false} />
        </lineSegments>
      )}
      {!showSelectEdge && aristasColor && (
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial color={aristasColor} />
        </lineSegments>
      )}
      {tcEdgesGeo && (
        <lineSegments renderOrder={2} geometry={tcEdgesGeo}>
          <lineBasicMaterial color="#FFD400" depthTest={false} transparent opacity={0.95} />
        </lineSegments>
      )}
    </group>
  );
}

// ── CamaraController ────────────────────────────────────────────────────────
function CamaraController({ targetPos }) {
  const { camera, controls } = useThree();
  useEffect(() => {
    if (!targetPos) return;
    camera.position.set(...targetPos);
    camera.lookAt(0, 0, 0);
    if (controls) { controls.target.set(0, 0, 0); controls.update?.(); }
  }, [targetPos, camera, controls]);
  return null;
}

// ── UI primitives ───────────────────────────────────────────────────────────
function ToolBtn({ activo, onClick, title, ancho, children }) {
  return (
    <button onClick={onClick} title={title}
      style={{
        width: ancho || 32, height: 28,
        borderRadius: 5, cursor: "pointer",
        fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
        background: activo ? "rgba(212,175,55,0.20)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${activo ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.10)"}`,
        color: activo ? "#e0c060" : "rgba(255,255,255,0.65)",
        transition: "all 0.12s",
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0,
      }}>
      {children}
    </button>
  );
}

function ToolGroup({ titulo, children, expandido }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      {expandido && (
        <div style={{
          fontSize: 8, color: 'rgba(255,255,255,0.35)',
          fontFamily: "'DM Mono',monospace", letterSpacing: '0.12em',
          marginTop: 4, marginBottom: 2,
        }}>{titulo}</div>
      )}
      {children}
    </div>
  );
}

const SeparadorTool = () => (
  <div style={{ width: '70%', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '6px 0' }} />
);

// ── Componente principal ────────────────────────────────────────────────────
export default function VisorCatalogo3D({
  modulo, costos, parametrosValores,
  onActualizar,
  maximizado = false,
  onToggleMaximizar,
  ejesOrigen,
  onSelectPieza,  // (idx, subComponenteId?) => void — el padre sincroniza con su form/tab
}) {
  // Contexto centralizado de variables (regla de oro CLAUDE.md — único punto de verdad).
  // Incluye dims base, variables custom, parámetros (defaults + valores actuales + fórmula).
  // La var de `repeat` (ej: `i`) la mergea PanelEdicionPieza por pieza seleccionada.
  const { modVars: allVars } = useMemo(
    () => resolverContextoModulo(modulo || {}, costos || { materiales: [] }, parametrosValores || {}),
    [modulo, costos, parametrosValores]
  );
  const tapacantoOptions = costos?.tapacanto || [];
  const [prefs, setPrefsState] = useState(leerPrefs);
  const [selectedIdx,   setSelectedIdx]   = useState(null);
  const [stepMm,        setStepMm]        = useState(1);
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [exploding,     setExploding]     = useState(false);
  const [camView,       setCamView]       = useState('iso');
  const [targetCam,     setTargetCam]     = useState(CAMARAS.iso.pos);
  const glRef = useRef(null);

  const setPref = useCallback((k) => {
    setPrefsState(p => { const next = { ...p, [k]: !p[k] }; guardarPrefs(next); return next; });
  }, []);

  // ── Cálculos comunes ──────────────────────────────────────────────────────
  const { ancho = 700, alto = 700, profundidad = 500 } = modulo?.dimensiones || {};
  const pisoY  = -(alto / 2 / 1000);
  const origenPadre = [-(ancho / 2 / 1000), pisoY, -(profundidad / 2 / 1000)];
  const origenEjes  = Array.isArray(ejesOrigen) ? ejesOrigen : origenPadre;
  const ejesLargo   = Math.max(ancho, alto, profundidad) / 1000 * 1.15;

  const piezas3D = useMemo(
    () => buildPiezas3D(modulo, costos, parametrosValores || {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modulo?.piezas, modulo?.subComponentes, modulo?.dimensiones, modulo?.material, modulo?.zonas, modulo?.parametros, costos, parametrosValores]
  );

  // Si la pieza seleccionada deja de existir (cambio de parámetros, etc.),
  // limpiar la selección para no mostrar un panel huérfano.
  useEffect(() => {
    if (selectedIdx != null && (selectedIdx >= (modulo?.piezas?.length || 0))) {
      setSelectedIdx(null);
    }
  }, [selectedIdx, modulo?.piezas]);

  // ── Handlers de edición ───────────────────────────────────────────────────
  const handleSelect = useCallback((piezaIdx, subComponenteId = null) => {
    setSelectedIdx(prev => {
      const nuevo = prev === piezaIdx ? null : piezaIdx;
      // Notificar al padre. Si la pieza pertenece a un subcomponente, pasa
      // `subComponenteId` para que FormModulo navegue al tab correspondiente.
      onSelectPieza?.(nuevo, subComponenteId);
      return nuevo;
    });
  }, [onSelectPieza]);

  const handleOrientacion = useCallback((orientacion3d) => {
    if (selectedIdx == null || !onActualizar) return;
    const nuevasPiezas = modulo.piezas.map((p, i) =>
      i === selectedIdx ? { ...p, orientacion3d, offset3d: undefined, rot3d: undefined } : p
    );
    onActualizar({ ...modulo, piezas: nuevasPiezas });
    if (orientacion3d === 'ignorar') setSelectedIdx(null);
  }, [selectedIdx, modulo, onActualizar]);

  const handleRotar = useCallback((deg) => {
    if (selectedIdx == null || !onActualizar) return;
    const nuevasPiezas = modulo.piezas.map((p, i) =>
      i === selectedIdx ? { ...p, rot3d: deg } : p
    );
    onActualizar({ ...modulo, piezas: nuevasPiezas });
  }, [selectedIdx, modulo, onActualizar]);

  const handleNudge = useCallback((axis, delta) => {
    if (selectedIdx == null || !onActualizar) return;
    const pieza  = modulo.piezas[selectedIdx];
    const old    = pieza.offset3d || { x: 0, y: 0, z: 0 };
    const updated = { ...old, [axis]: Math.round(((old[axis] || 0) + delta) * 100) / 100 };
    const nuevasPiezas = modulo.piezas.map((p, i) =>
      i === selectedIdx ? { ...p, offset3d: updated } : p
    );
    onActualizar({ ...modulo, piezas: nuevasPiezas });
  }, [selectedIdx, modulo, onActualizar]);

  const handleReset = useCallback(() => {
    if (selectedIdx == null || !onActualizar) return;
    const nuevasPiezas = modulo.piezas.map((p, i) =>
      i === selectedIdx ? { ...p, offset3d: undefined, rot3d: undefined } : p
    );
    onActualizar({ ...modulo, piezas: nuevasPiezas });
  }, [selectedIdx, modulo, onActualizar]);

  // Patch genérico para una propiedad de la pieza seleccionada.
  const patchPieza = useCallback((patch) => {
    if (selectedIdx == null || !onActualizar) return;
    const nuevasPiezas = modulo.piezas.map((p, i) =>
      i === selectedIdx ? { ...p, ...patch } : p
    );
    onActualizar({ ...modulo, piezas: nuevasPiezas });
  }, [selectedIdx, modulo, onActualizar]);

  const handleSetFormula = useCallback((key, value) => {
    patchPieza({ [key]: value });
  }, [patchPieza]);

  const handleSetPosFormula = useCallback((axis, value) => {
    if (selectedIdx == null || !onActualizar) return;
    const pieza = modulo.piezas[selectedIdx];
    const pf = { ...(pieza.posFormulas || {}), [axis]: value || null };
    patchPieza({ posFormulas: pf });
  }, [selectedIdx, modulo, onActualizar, patchPieza]);

  const handleSetTc = useCallback((field, value) => {
    if (selectedIdx == null || !onActualizar) return;
    const pieza = modulo.piezas[selectedIdx];
    const tc = { id: 1, lados1: 0, lados2: 0, ...(pieza.tc || {}), [field]: value };
    patchPieza({ tc });
  }, [selectedIdx, modulo, onActualizar, patchPieza]);

  const irACamara = (key) => { setCamView(key); setTargetCam([...CAMARAS[key].pos]); };

  const toggleExplode = useCallback(() => {
    const next = !exploding;
    setExploding(next);
    const from = explodeFactor, to = next ? 1 : 0;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / 450, 1);
      const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setExplodeFactor(from + (to - from) * e);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [exploding, explodeFactor]);

  const exportPNG = useCallback(() => {
    if (!glRef.current) return;
    const url = glRef.current.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${modulo?.nombre || 'modulo'}_3d.png`;
    a.click();
  }, [modulo?.nombre]);

  if (!modulo || !costos) {
    return (
      <div style={{
        height: "100%", width: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-base)",
        color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontSize: 11,
      }}>
        Sin datos para previsualizar
      </div>
    );
  }

  // ── Datos de la pieza seleccionada (para el panel flotante) ──────────────
  const selectedPieza = selectedIdx != null ? modulo?.piezas?.[selectedIdx] : null;
  const selectedP3D   = piezas3D.find(p => !p.isHandle && p.piezaIdx === selectedIdx) ?? null;
  const currentRol    = selectedP3D?.role ?? null;
  const currentRot    = selectedPieza?.rot3d ?? 0;
  const currentOffset = selectedPieza?.offset3d ?? { x: 0, y: 0, z: 0 };
  const panelAbierto  = selectedIdx != null && selectedP3D;

  const toolbarWidth = prefs.toolbar ? 56 : 30;

  return (
    <div style={{
      width: '100%', height: '100%',
      position: 'relative',
      background: '#15171d',
      display: 'flex',
      overflow: 'hidden',
    }}>

      {/* ── Toolbar lateral (siempre visible, colapsable) ──────────────────── */}
      <div style={{
        width: toolbarWidth, flexShrink: 0,
        background: 'rgba(10,12,18,0.92)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '6px 4px', gap: 2,
        transition: 'width 0.15s',
        overflowY: 'auto',
      }}>
        {/* Colapsar/expandir toolbar */}
        <button onClick={() => setPref("toolbar")}
          title={prefs.toolbar ? "Colapsar herramientas" : "Expandir herramientas"}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)', fontSize: 12, padding: '2px 4px',
            marginBottom: 4,
          }}>
          {prefs.toolbar ? '◀' : '▶'}
        </button>

        {/* Maximizar / minimizar */}
        <ToolBtn
          activo={maximizado}
          onClick={() => onToggleMaximizar?.(!maximizado)}
          title={maximizado ? "Reducir a columna lateral" : "Maximizar a editor completo"}>
          {maximizado ? '⛯' : '⛶'}
        </ToolBtn>

        <SeparadorTool />

        {/* Helpers */}
        <ToolGroup titulo="HELP" expandido={prefs.toolbar}>
          <ToolBtn activo={prefs.grid}    onClick={() => setPref("grid")}    title="Grilla del piso">▦</ToolBtn>
          <ToolBtn activo={prefs.ejes}    onClick={() => setPref("ejes")}    title="Ejes XYZ">⊕</ToolBtn>
          <ToolBtn activo={prefs.aristas} onClick={() => setPref("aristas")} title="Aristas negras">◇</ToolBtn>
          <ToolBtn activo={prefs.verTC}   onClick={() => setPref("verTC")}   title="Resaltar tapacanto en amarillo">🎗</ToolBtn>
        </ToolGroup>

        <SeparadorTool />

        {/* Cámara */}
        <ToolGroup titulo="CAM" expandido={prefs.toolbar}>
          {Object.entries(CAMARAS).map(([k, v]) => (
            <ToolBtn key={k} activo={camView === k} onClick={() => irACamara(k)} title={v.label}>
              {v.label.charAt(0)}
            </ToolBtn>
          ))}
        </ToolGroup>

        <SeparadorTool />

        {/* Acciones */}
        <ToolGroup titulo="ACC" expandido={prefs.toolbar}>
          <ToolBtn activo={exploding} onClick={toggleExplode} title="Desarmar / juntar piezas">💥</ToolBtn>
          <ToolBtn activo={false}     onClick={exportPNG}     title="Exportar PNG">↓</ToolBtn>
        </ToolGroup>
      </div>

      {/* ── Canvas + overlays ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        <Canvas
          shadows={maximizado}
          camera={{ position: CAMARAS.iso.pos, fov: 45, near: 0.01, far: 50 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
          onCreated={({ gl }) => { glRef.current = gl; }}
          onPointerMissed={() => { setSelectedIdx(null); document.body.style.cursor = 'default'; }}
          style={{ width: '100%', height: '100%', background: '#15171d' }}
        >
          <CamaraController targetPos={targetCam} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 5, 4]}   intensity={1.0} castShadow={maximizado} shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-3, 2, -3]} intensity={0.28} color="#b8d4f0" />

          {prefs.grid && (
            <gridHelper args={[2, 20, "#888888", "#3a3a3a"]} position={[0, pisoY, 0]} />
          )}
          {prefs.ejes && (
            <EjesConLabels origen={origenEjes} largo={ejesLargo} />
          )}

          <Suspense fallback={null}>
            {piezas3D.map(p => (
              <PiezaAnimada
                key={p.id}
                targetPos={p.pos}
                targetRotYDeg={p.rot3d || 0}
                size={p.size}
                explodeVec={p.explodeVec}
                explodeFactor={explodeFactor}
                materialTipo={p.materialTipo}
                selected={!p.isHandle && selectedIdx === p.piezaIdx}
                isHandle={p.isHandle}
                status={p.status}
                onClick={() => handleSelect(p.piezaIdx, p._subComponente)}
                aristasColor={prefs.aristas ? "#000000" : null}
                tc={p.tc}
                orientacion={p.orientacion}
                showTC={prefs.verTC}
              />
            ))}
          </Suspense>

          <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
        </Canvas>

        {/* Hint inferior */}
        <div style={{
          position: 'absolute', bottom: 6, left: 10, pointerEvents: 'none',
          fontSize: 9, fontFamily: "'DM Mono',monospace", color: 'rgba(255,255,255,0.35)',
        }}>
          {selectedIdx != null
            ? 'Click fondo: deseleccionar · Drag rotar · Scroll zoom'
            : 'Click pieza: editar · Drag rotar · Scroll zoom'}
        </div>

        {/* ── Panel flotante: edición de pieza seleccionada ────────────── */}
        {panelAbierto && (
          <PanelEdicionPieza
            pieza={selectedPieza}
            piezaP3D={selectedP3D}
            currentRol={currentRol}
            currentRot={currentRot}
            currentOffset={currentOffset}
            stepMm={stepMm}
            onStepMm={setStepMm}
            onOrientacion={handleOrientacion}
            onRotar={handleRotar}
            onNudge={handleNudge}
            onReset={handleReset}
            onClose={() => setSelectedIdx(null)}
            allVars={allVars}
            tapacantoOptions={tapacantoOptions}
            onSetFormula={handleSetFormula}
            onSetPosFormula={handleSetPosFormula}
            onSetTc={handleSetTc}
          />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Panel flotante: aparece arriba-derecha cuando hay pieza seleccionada
// ────────────────────────────────────────────────────────────────────────────
function PanelEdicionPieza({
  pieza, piezaP3D, currentRol, currentRot, currentOffset,
  stepMm, onStepMm, onOrientacion, onRotar, onNudge, onReset, onClose,
  allVars, tapacantoOptions = [],
  onSetFormula, onSetPosFormula, onSetTc,
}) {
  const stColor = STATUS_COLOR[piezaP3D?.status] || '#888';
  // Si la pieza seleccionada tiene `repeat`, mergear la var de iteración (ej: `i`)
  // para que las fórmulas que la usen evalúen durante la edición. Mismo idiom
  // que generarPiezasInternal usa en runtime.
  const varsConRepeat = { ...allVars, ...contextoRepeatVar(pieza) };
  return (
    <div style={{
      position: 'absolute', top: 8, right: 8, zIndex: 30,
      width: 240, maxHeight: 'calc(100% - 16px)',
      background: 'rgba(10,12,18,0.96)',
      border: '1px solid rgba(212,175,55,0.30)',
      borderRadius: 8,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: 2,
          background: stColor, boxShadow: `0 0 8px ${stColor}`,
        }} />
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#d0b85a',
          fontFamily: "'DM Mono',monospace",
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>
          {pieza?.nombre || '(sin nombre)'}
        </span>
        <button onClick={onClose}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.45)', fontSize: 14, padding: '0 2px', lineHeight: 1,
          }}>×</button>
      </div>

      <div style={{ padding: '8px 10px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>

        <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: stColor }}>
          {STATUS_LABEL[piezaP3D?.status]}
          {pieza?.cantidad > 1 && ` · ${pieza.cantidad} instancias`}
        </div>

        {/* Dimensiones (fórmulas D1/D2) — sólo si no es medida libre */}
        {!pieza?.especial && (
          <Seccion titulo="Dimensiones">
            <DimRowEditor
              etiqueta="D1 (largo)"
              valor={pieza?.formula1 ?? ''}
              onChange={(v) => onSetFormula?.('formula1', v)}
              vars={varsConRepeat}
            />
            <DimRowEditor
              etiqueta="D2 (ancho)"
              valor={pieza?.formula2 ?? ''}
              onChange={(v) => onSetFormula?.('formula2', v)}
              vars={varsConRepeat}
            />
          </Seccion>
        )}

        {/* Posición 3D (posFormulas) */}
        <Seccion titulo="Posición 3D">
          <div style={{ fontSize: 9, color: '#666', fontFamily: "'DM Mono',monospace", marginBottom: 4, lineHeight: 1.4 }}>
            Origen (0,0,0): borde izq · piso · fondo. Vacío = automático.
          </div>
          {[
            { axis: 'x', label: 'X (ancho)',     placeholder: 'ej: esp · ancho-esp' },
            { axis: 'y', label: 'Y (alto)',      placeholder: 'ej: esp+d1' },
            { axis: 'z', label: 'Z (prof.)',     placeholder: 'ej: 0 · profundidad-esp' },
          ].map(({ axis, label, placeholder }) => (
            <DimRowEditor
              key={axis}
              etiqueta={label}
              valor={pieza?.posFormulas?.[axis] ?? ''}
              onChange={(v) => onSetPosFormula?.(axis, v)}
              vars={varsConRepeat}
              placeholder={placeholder}
              esPosicion
            />
          ))}
        </Seccion>

        {/* Canto (tapacanto) */}
        <Seccion titulo="Canto (tapacanto)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <select value={pieza?.tc?.id ?? 0}
              onChange={(e) => onSetTc?.('id', parseInt(e.target.value) || 0)}
              style={{
                fontFamily: "'DM Mono',monospace", fontSize: 10,
                padding: '5px 7px', borderRadius: 4,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#ccc', outline: 'none',
              }}>
              <option value={0}>(sin canto)</option>
              {tapacantoOptions.map(tc => (
                <option key={tc.id} value={tc.id}>{tc.nombre}</option>
              ))}
            </select>
            {pieza?.tc?.id ? (
              <>
                <LadosCanto
                  etiqueta="Lados D1"
                  valor={pieza?.tc?.lados1 || 0}
                  onChange={(v) => onSetTc?.('lados1', v)}
                />
                <LadosCanto
                  etiqueta="Lados D2"
                  valor={pieza?.tc?.lados2 || 0}
                  onChange={(v) => onSetTc?.('lados2', v)}
                />
              </>
            ) : null}
          </div>
        </Seccion>

        {/* Orientación */}
        <Seccion titulo="Orientación 3D">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {ORIENTACIONES_3D.map(o => (
              <button key={o.id} onClick={() => onOrientacion(o.id)}
                style={{
                  padding: '5px 7px', borderRadius: 4, cursor: 'pointer',
                  fontSize: 10, fontFamily: "'DM Mono',monospace", textAlign: 'left',
                  background: currentRol === o.id
                    ? (o.id === 'ignorar' ? 'rgba(200,60,60,0.15)' : `${STATUS_COLOR.auto}22`)
                    : 'rgba(255,255,255,0.03)',
                  border: currentRol === o.id
                    ? (o.id === 'ignorar' ? '1px solid rgba(200,60,60,0.40)' : `1px solid ${STATUS_COLOR.auto}88`)
                    : '1px solid rgba(255,255,255,0.07)',
                  color: currentRol === o.id
                    ? (o.id === 'ignorar' ? '#e07070' : STATUS_COLOR.auto)
                    : '#aaa',
                }}>{o.label}</button>
            ))}
          </div>
        </Seccion>

        {/* Rotación */}
        <Seccion titulo="Rotación">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 3 }}>
            {[0, 90, 180, 270].map(deg => (
              <button key={deg} onClick={() => onRotar(deg)}
                style={{
                  padding: '5px 2px', borderRadius: 4, cursor: 'pointer',
                  fontSize: 10, fontFamily: "'DM Mono',monospace",
                  background: currentRot === deg ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.03)',
                  border: currentRot === deg ? '1px solid rgba(212,175,55,0.45)' : '1px solid rgba(255,255,255,0.07)',
                  color: currentRot === deg ? '#D4AF37' : '#aaa',
                  textAlign: 'center',
                }}>{deg}°</button>
            ))}
          </div>
        </Seccion>

        {/* Ajuste fino */}
        <Seccion titulo="Ajuste fino">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#777' }}>Paso</span>
            {STEP_OPTIONS.map(s => (
              <button key={s} onClick={() => onStepMm(s)}
                style={{
                  padding: '2px 7px', borderRadius: 4, cursor: 'pointer',
                  fontSize: 9, fontFamily: "'DM Mono',monospace",
                  background: stepMm === s ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                  border: stepMm === s ? '1px solid rgba(212,175,55,0.40)' : '1px solid rgba(255,255,255,0.08)',
                  color: stepMm === s ? '#D4AF37' : '#888',
                }}>{s}mm</button>
            ))}
          </div>
          {[['X', 'x'], ['Y', 'y'], ['Z', 'z']].map(([label, axis]) => {
            const val = Math.round((currentOffset[axis] || 0) * 10) / 10;
            const isOff = val !== 0;
            return (
              <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#888', width: 10, fontWeight: 700 }}>{label}</span>
                <button onClick={() => onNudge(axis, -stepMm)}
                  style={{
                    width: 22, height: 22, borderRadius: 4, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                    color: '#bbb', fontSize: 12, padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>‹</button>
                <div style={{
                  flex: 1, textAlign: 'center',
                  fontSize: 10, fontFamily: "'DM Mono',monospace",
                  color: isOff ? STATUS_COLOR.manual : '#777',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 4, padding: '2px 0',
                }}>{val > 0 ? '+' : ''}{val} mm</div>
                <button onClick={() => onNudge(axis, stepMm)}
                  style={{
                    width: 22, height: 22, borderRadius: 4, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                    color: '#bbb', fontSize: 12, padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>›</button>
              </div>
            );
          })}
          {(pieza?.offset3d || pieza?.rot3d) && (
            <button onClick={onReset}
              style={{
                width: '100%', marginTop: 4, padding: '5px 0', borderRadius: 4,
                cursor: 'pointer',
                background: 'rgba(212,175,55,0.06)',
                border: '1px solid rgba(212,175,55,0.18)',
                color: '#a08030', fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700,
              }}>↺ Resetear a automático</button>
          )}
        </Seccion>
      </div>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <div>
      <div style={{
        fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#888',
        letterSpacing: '0.08em', marginBottom: 5, textTransform: 'uppercase',
      }}>
        {titulo}
      </div>
      {children}
    </div>
  );
}

// Fila editor de fórmula: input + valor resuelto en mm.
function DimRowEditor({ etiqueta, valor, onChange, vars, placeholder = "ej: alto - 2*esp", esPosicion = false }) {
  const v = valor || '';
  const resultado = v.trim() ? evaluarFormula(v, vars) : null;
  const invalida = v.trim() && resultado === null;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#888',
        marginBottom: 2,
      }}>{etiqueta}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input value={v} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1, minWidth: 0,
            fontFamily: "'DM Mono',monospace", fontSize: 10,
            padding: '4px 6px', borderRadius: 4,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${invalida ? 'rgba(224,112,112,0.55)' : 'rgba(255,255,255,0.10)'}`,
            color: '#ddd', outline: 'none',
          }} />
        <div style={{ minWidth: 48, textAlign: 'right' }}>
          {resultado !== null ? (
            <span style={{
              fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 600,
              color: esPosicion ? '#6ab4e8' : '#10B981',
            }}>
              {Math.round(resultado * 10) / 10}
              <span style={{ fontSize: 8, color: '#666', marginLeft: 1 }}>mm</span>
            </span>
          ) : invalida ? (
            <span style={{ fontSize: 9, color: '#e07070', fontFamily: "'DM Mono',monospace" }}>⚠ inv.</span>
          ) : (
            <span style={{ fontSize: 9, color: '#555', fontFamily: "'DM Mono',monospace" }}>{esPosicion ? 'auto' : '—'}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Selector visual de cantidad de lados (0, 1 o 2).
function LadosCanto({ etiqueta, valor, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#888', flex: 1 }}>{etiqueta}</span>
      {[0, 1, 2].map(n => (
        <button key={n} onClick={() => onChange(n)}
          style={{
            width: 26, height: 22, borderRadius: 4, cursor: 'pointer',
            fontSize: 10, fontFamily: "'DM Mono',monospace",
            background: valor === n ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.04)',
            border: valor === n ? '1px solid rgba(212,175,55,0.45)' : '1px solid rgba(255,255,255,0.09)',
            color: valor === n ? '#D4AF37' : '#888',
          }}>{n}</button>
      ))}
    </div>
  );
}
