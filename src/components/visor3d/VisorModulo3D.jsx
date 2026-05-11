import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ORIENTACIONES_3D, buildPiezas3D } from './Modulo3D.jsx';
import { getMaterialProps } from './useMaterial3D.js';
import { CAMARAS } from './CamaraPresets.js';

// ── Theme palettes ────────────────────────────────────────────────────────────
const DARK_PAL  = { bg: '#1a1c22', floor: '#1e2028', fogNear: 5,  fogFar: 14, grid1: '#2a2d35', grid2: '#232630', ambInt: 0.60 };
const LIGHT_PAL = { bg: '#f0f1f4', floor: '#e8e9ed', fogNear: 8,  fogFar: 24, grid1: '#c4c5ce', grid2: '#d0d1da', ambInt: 0.88 };

// Reads data-theme from <html> without importing useTema (avoids re-render chain)
function useIsDark() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-theme') !== 'light'
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') !== 'light');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

// ── Constants ─────────────────────────────────────────────────────────────────
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

// ── PiezaAnimada (R3F) ────────────────────────────────────────────────────────
// Animated piece: lerps smoothly to targetPos/targetRotYDeg each frame.
// No drag. Click only.
function PiezaAnimada({ targetPos, targetRotYDeg, size, explodeVec, explodeFactor,
                        materialTipo, selected, isHandle, status, onClick }) {
  const grpRef   = useRef();
  const animPos  = useRef({ x: targetPos[0], y: targetPos[1], z: targetPos[2] });
  const animRotY = useRef((targetRotYDeg || 0) * Math.PI / 180);

  const edgesGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size[0], size[1], size[2]]
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
  const showEdge = selected || status === 'conflict';
  const edgeColor = status === 'conflict' ? '#EF4444' : '#FFE082';

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
      {showEdge && (
        <lineSegments renderOrder={1} geometry={edgesGeo}>
          <lineBasicMaterial color={edgeColor} depthTest={false} />
        </lineSegments>
      )}
    </group>
  );
}

// ── Entorno ───────────────────────────────────────────────────────────────────
// Usa el enfoque declarativo de R3F (<color>, <fog>) para garantizar que
// scene.background y scene.fog se actualicen correctamente al cambiar el tema.
function Entorno({ floorY, isDark }) {
  const pal  = isDark ? DARK_PAL : LIGHT_PAL;

  const grid = useMemo(() => {
    const p = isDark ? DARK_PAL : LIGHT_PAL;
    const g = new THREE.GridHelper(10, 100, p.grid1, p.grid2);
    g.position.y = floorY;
    return g;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorY, isDark]);

  return (
    <>
      <color attach="background" args={[pal.bg]} />
      <fog   attach="fog"        args={[pal.bg, pal.fogNear, pal.fogFar]} />
      <ambientLight intensity={pal.ambInt} />
      <primitive object={grid} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY - 0.001, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color={pal.floor} roughness={0.95} />
      </mesh>
    </>
  );
}

// ── CamaraController ──────────────────────────────────────────────────────────
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

// ── EscenaEditor ──────────────────────────────────────────────────────────────
function EscenaEditor({ piezas3D, explodeFactor, selectedIdx, onSelect, floorY, targetCam, isDark }) {
  return (
    <>
      <CamaraController targetPos={targetCam} />
      <Entorno floorY={floorY} isDark={isDark} />
      <directionalLight position={[3, 5, 4]}  intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 2, -3]} intensity={0.28} color="#b8d4f0" />
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
          onClick={() => onSelect(p.piezaIdx)}
        />
      ))}
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
    </>
  );
}

// ── UI primitives ─────────────────────────────────────────────────────────────
const BTN = ({ active, onClick, children, style, danger, small }) => (
  <button
    onClick={onClick}
    style={{
      background: danger ? 'rgba(200,60,60,0.12)'
                : active  ? 'rgba(212,175,55,0.20)'
                :           'rgba(255,255,255,0.05)',
      border: danger ? '1px solid rgba(200,60,60,0.35)'
            : active  ? '1px solid rgba(212,175,55,0.50)'
            :           '1px solid rgba(255,255,255,0.09)',
      color:  danger ? '#e07070' : active ? '#D4AF37' : '#999',
      borderRadius: 4,
      padding: small ? '3px 7px' : '5px 10px',
      cursor: 'pointer',
      fontSize: small ? 10 : 11,
      fontFamily: "'DM Mono',monospace",
      letterSpacing: '0.03em',
      transition: 'all 0.12s',
      whiteSpace: 'nowrap',
      lineHeight: 1.2,
      ...style,
    }}
  >
    {children}
  </button>
);

const DIVIDER = () => (
  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '10px 0' }} />
);

const LABEL = ({ children }) => (
  <div style={{
    fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#3a3d46',
    letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase',
  }}>
    {children}
  </div>
);

// ── VisorModulo3D ─────────────────────────────────────────────────────────────
export default function VisorModulo3D({ modulo, costos, onClose, onActualizar }) {
  const isDark = useIsDark();
  const [selectedIdx,    setSelectedIdx]    = useState(null);
  const [stepMm,         setStepMm]         = useState(1);
  const [explodeFactor,  setExplodeFactor]  = useState(0);
  const [exploding,      setExploding]      = useState(false);
  const [camView,        setCamView]        = useState('iso');
  const [targetCam,      setTargetCam]      = useState(CAMARAS.iso.pos);
  const glRef = useRef(null);

  const { ancho = 600, alto = 700, profundidad = 550 } = modulo?.dimensiones || {};
  const floorY = -(alto / 2 / 1000);

  // Build 3D pieces — recomputes when module changes
  const piezas3D = useMemo(
    () => buildPiezas3D(modulo, costos),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modulo?.piezas, modulo?.dimensiones, modulo?.material, costos]
  );

  // Selected piece data
  const selectedPieza = selectedIdx != null ? modulo?.piezas?.[selectedIdx] : null;
  const selectedP3D   = piezas3D.find(p => !p.isHandle && p.piezaIdx === selectedIdx) ?? null;

  const currentRol    = selectedP3D?.role ?? null;
  const currentRot    = selectedPieza?.rot3d ?? 0;
  const currentOffset = selectedPieza?.offset3d ?? { x: 0, y: 0, z: 0 };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSelect = useCallback((piezaIdx) => {
    setSelectedIdx(prev => prev === piezaIdx ? null : piezaIdx);
  }, []);

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

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Header — una sola línea siempre ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'nowrap',
        padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(10,12,18,0.98)', zIndex: 10, minHeight: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#d4af37', fontFamily: "'DM Mono',monospace", letterSpacing: '0.06em', flexShrink: 0 }}>
          ◈ EDITOR 3D
        </span>
        <span style={{ fontSize: 11, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
          {modulo?.nombre}
        </span>
        <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#333', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {ancho}×{profundidad}×{alto}
        </span>
        <BTN small danger onClick={onClose}>✕</BTN>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left panel: piece list ── */}
        <div style={{
          width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: '#0a0c10', borderRight: '1px solid rgba(255,255,255,0.05)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 10px 4px',
            fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#2d3040',
            letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            PIEZAS ({modulo?.piezas?.length ?? 0})
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
            {(modulo?.piezas || []).map((p, idx) => {
              const p3d      = piezas3D.find(x => !x.isHandle && x.piezaIdx === idx);
              const isSelected = selectedIdx === idx;
              const st       = p3d?.status ?? 'unassigned';
              const stColor  = STATUS_COLOR[st];
              const rolLabel = ORIENTACIONES_3D.find(r => r.id === p3d?.role)?.label ?? null;

              return (
                <div
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  style={{
                    padding: '5px 7px', borderRadius: 5, marginBottom: 2,
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(212,175,55,0.09)' : 'rgba(255,255,255,0.015)',
                    border: isSelected ? '1px solid rgba(212,175,55,0.28)' : '1px solid transparent',
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: 2, flexShrink: 0,
                      background: stColor, display: 'inline-block',
                      boxShadow: isSelected ? `0 0 6px ${stColor}` : 'none',
                    }} />
                    <span style={{
                      fontSize: 11, flex: 1,
                      color: isSelected ? '#ddc86a' : '#888',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.nombre}
                    </span>
                    {p.cantidad > 1 && (
                      <span style={{ fontSize: 9, color: '#333', fontFamily: "'DM Mono',monospace" }}>×{p.cantidad}</span>
                    )}
                  </div>
                  {rolLabel && (
                    <div style={{
                      fontSize: 9, fontFamily: "'DM Mono',monospace",
                      color: stColor, marginTop: 2, paddingLeft: 12, opacity: 0.75,
                    }}>
                      {rolLabel}
                      {st === 'manual' && ' · ajustada'}
                    </div>
                  )}
                  {!rolLabel && (
                    <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#F59E0B', marginTop: 2, paddingLeft: 12, opacity: 0.75 }}>
                      sin función
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
            {Object.entries(STATUS_COLOR).map(([k, c]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: 1, background: c, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#333' }}>{STATUS_LABEL[k]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Canvas ── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* Toolbar flotante sobre el canvas */}
          <div style={{
            position: 'absolute', top: 8, right: 8, zIndex: 20,
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(10,12,18,0.82)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8, padding: '4px 8px',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}>
            {Object.entries(CAMARAS).map(([k, v]) => (
              <BTN key={k} small active={camView === k} onClick={() => irACamara(k)}>{v.label}</BTN>
            ))}
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.10)', margin: '0 2px' }} />
            <BTN small active={exploding} onClick={toggleExplode}>💥</BTN>
            <BTN small onClick={exportPNG}>↓ PNG</BTN>
          </div>

          <Canvas
            shadows
            camera={{ position: CAMARAS.iso.pos, fov: 45, near: 0.01, far: 50 }}
            gl={{ preserveDrawingBuffer: true, antialias: true }}
            onCreated={({ gl }) => { glRef.current = gl; }}
            onPointerMissed={() => { setSelectedIdx(null); document.body.style.cursor = 'default'; }}
            style={{ width: '100%', height: '100%', background: isDark ? '#1a1c22' : '#f0f1f4' }}
          >
            <EscenaEditor
              piezas3D={piezas3D}
              explodeFactor={explodeFactor}
              selectedIdx={selectedIdx}
              onSelect={handleSelect}
              floorY={floorY}
              targetCam={targetCam}
              isDark={isDark}
            />
          </Canvas>

          {/* Canvas hint */}
          <div style={{
            position: 'absolute', bottom: 10, left: 12, pointerEvents: 'none',
            fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#2a2d38',
          }}>
            {selectedIdx != null
              ? 'Click en fondo para deseleccionar · Scroll zoom · Drag rotar'
              : 'Click en una pieza para editar · Drag para rotar · Scroll zoom'}
          </div>
        </div>

        {/* ── Right panel: edit selected piece ── */}
        <div style={{
          width: 256, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: '#0a0c10', borderLeft: '1px solid rgba(255,255,255,0.05)',
          overflow: 'hidden',
        }}>
          {selectedIdx == null || !selectedP3D ? (
            // Empty state
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: 20, gap: 8,
            }}>
              <div style={{ fontSize: 22, opacity: 0.15 }}>◻</div>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#2d3040', textAlign: 'center', lineHeight: 1.5 }}>
                Seleccioná una pieza<br />en el visor o en la lista
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 16px' }}>

              {/* Piece header */}
              <div style={{ marginBottom: 10 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                    background: STATUS_COLOR[selectedP3D.status],
                    boxShadow: `0 0 8px ${STATUS_COLOR[selectedP3D.status]}`,
                    display: 'inline-block',
                  }} />
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: '#d0b85a',
                    fontFamily: "'DM Mono',monospace",
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }}>
                    {selectedPieza?.nombre}
                  </span>
                </div>
                <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: STATUS_COLOR[selectedP3D.status], paddingLeft: 14 }}>
                  {STATUS_LABEL[selectedP3D.status]}
                  {selectedPieza?.cantidad > 1 && ` · ${selectedPieza.cantidad} instancias`}
                </div>
              </div>

              <DIVIDER />

              {/* Orientación 3D */}
              <LABEL>Orientación 3D</LABEL>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 4 }}>
                {ORIENTACIONES_3D.map(o => (
                  <button
                    key={o.id}
                    onClick={() => handleOrientacion(o.id)}
                    style={{
                      padding: '6px 8px', borderRadius: 4, cursor: 'pointer',
                      fontSize: 10, fontFamily: "'DM Mono',monospace", textAlign: 'left',
                      background: currentRol === o.id
                        ? (o.id === 'ignorar' ? 'rgba(200,60,60,0.12)' : `${STATUS_COLOR['auto']}22`)
                        : 'rgba(255,255,255,0.03)',
                      border: currentRol === o.id
                        ? (o.id === 'ignorar' ? '1px solid rgba(200,60,60,0.35)' : `1px solid ${STATUS_COLOR['auto']}88`)
                        : '1px solid rgba(255,255,255,0.07)',
                      color: currentRol === o.id
                        ? (o.id === 'ignorar' ? '#e07070' : STATUS_COLOR['auto'])
                        : '#666',
                      transition: 'all 0.1s',
                    }}
                  >{o.label}</button>
                ))}
              </div>

              <DIVIDER />

              {/* Rotación */}
              <LABEL>Rotación</LABEL>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 3, marginBottom: 2 }}>
                {[0, 90, 180, 270].map(deg => (
                  <button
                    key={deg}
                    onClick={() => handleRotar(deg)}
                    style={{
                      padding: '5px 2px', borderRadius: 4, cursor: 'pointer',
                      fontSize: 10, fontFamily: "'DM Mono',monospace",
                      background: currentRot === deg
                        ? 'rgba(212,175,55,0.18)'
                        : 'rgba(255,255,255,0.03)',
                      border: currentRot === deg
                        ? '1px solid rgba(212,175,55,0.45)'
                        : '1px solid rgba(255,255,255,0.07)',
                      color: currentRot === deg ? '#D4AF37' : '#666',
                      textAlign: 'center', transition: 'all 0.1s',
                    }}
                  >
                    {deg}°
                  </button>
                ))}
              </div>

              <DIVIDER />

              {/* Ajuste fino */}
              <LABEL>Ajuste fino</LABEL>

              {/* Step selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#444', marginRight: 2 }}>Paso</span>
                {STEP_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setStepMm(s)}
                    style={{
                      padding: '3px 7px', borderRadius: 4, cursor: 'pointer',
                      fontSize: 9, fontFamily: "'DM Mono',monospace",
                      background: stepMm === s ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                      border: stepMm === s ? '1px solid rgba(212,175,55,0.40)' : '1px solid rgba(255,255,255,0.08)',
                      color: stepMm === s ? '#D4AF37' : '#555', transition: 'all 0.1s',
                    }}
                  >
                    {s}mm
                  </button>
                ))}
              </div>

              {/* Axis nudge rows */}
              {[['X', 'x'], ['Y', 'y'], ['Z', 'z']].map(([label, axis]) => {
                const val = Math.round((currentOffset[axis] || 0) * 10) / 10;
                const isOff = val !== 0;
                return (
                  <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#555',
                      width: 12, flexShrink: 0, fontWeight: 700,
                    }}>
                      {label}
                    </span>
                    <button
                      onClick={() => handleNudge(axis, -stepMm)}
                      style={{
                        width: 24, height: 24, borderRadius: 4, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        color: '#777', fontSize: 12, padding: 0, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1,
                      }}
                    >‹</button>
                    <div style={{
                      flex: 1, textAlign: 'center',
                      fontSize: 10, fontFamily: "'DM Mono',monospace",
                      color: isOff ? STATUS_COLOR['manual'] : '#333',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 4, padding: '3px 0',
                    }}>
                      {val > 0 ? '+' : ''}{val} mm
                    </div>
                    <button
                      onClick={() => handleNudge(axis, stepMm)}
                      style={{
                        width: 24, height: 24, borderRadius: 4, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        color: '#777', fontSize: 12, padding: 0, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1,
                      }}
                    >›</button>
                  </div>
                );
              })}

              {/* Reset button — only shown when there's an offset or rotation */}
              {(selectedPieza?.offset3d || selectedPieza?.rot3d) && (
                <button
                  onClick={handleReset}
                  style={{
                    width: '100%', marginTop: 6, padding: '6px 0', borderRadius: 4,
                    cursor: 'pointer',
                    background: 'rgba(212,175,55,0.05)',
                    border: '1px solid rgba(212,175,55,0.15)',
                    color: '#7a6020', fontSize: 9,
                    fontFamily: "'DM Mono',monospace", fontWeight: 700,
                    transition: 'all 0.12s',
                  }}
                >
                  ↺ Resetear a posición automática
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
