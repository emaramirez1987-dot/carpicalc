import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Modulo3D, { ROLES_3D, buildPiezas3D } from './Modulo3D.jsx';
import { CAMARAS } from './CamaraPresets.js';

// ── CamaraController ──────────────────────────────────────────────────────────
function CamaraController({ targetPos }) {
  const { camera, controls } = useThree();
  useEffect(() => {
    if (!targetPos) return;
    camera.position.set(...targetPos);
    camera.lookAt(0, 0, 0);
    if (controls) controls.target.set(0, 0, 0);
  }, [targetPos, camera, controls]);
  return null;
}

// ── PiezaArrastrable — overlay arrastrable sobre la pieza seleccionada ────────
function PiezaArrastrable({ size, pos, orbitRef, onDragEnd, onPosChange }) {
  const groupRef   = useRef();
  const isDragging = useRef(false);
  const { camera, gl } = useThree();

  // Plano horizontal en Y de la pieza para XZ drag
  const floorPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -pos[1]),
    [pos]
  );
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // Sync position when `pos` prop changes from outside (e.g. role snap)
  useEffect(() => {
    if (groupRef.current && !isDragging.current) {
      groupRef.current.position.set(...pos);
    }
  }, [pos]);

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
        groupRef.current.position.x = hit.x;
        groupRef.current.position.z = hit.z;
        const p = groupRef.current.position;
        onPosChange?.([
          Math.round(p.x * 1000),
          Math.round(p.y * 1000),
          Math.round(p.z * 1000),
        ]);
      }
    };

    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (orbitRef.current) orbitRef.current.enabled = true;
      canvas.style.cursor = 'auto';
      if (groupRef.current) {
        const p = groupRef.current.position;
        onDragEnd([p.x, p.y, p.z]);
      }
    };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup',   onUp);
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup',   onUp);
    };
  }, [camera, gl, floorPlane, raycaster, orbitRef, onDragEnd, onPosChange]);

  // Bloquear Y al pos original
  useFrame(() => {
    if (groupRef.current) groupRef.current.position.y = pos[1];
  });

  return (
    <group
      ref={groupRef}
      position={pos}
      onPointerDown={(e) => {
        e.stopPropagation();
        isDragging.current = true;
        if (orbitRef.current) orbitRef.current.enabled = false;
        gl.domElement.style.cursor = 'grabbing';
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!isDragging.current) gl.domElement.style.cursor = 'grab';
      }}
      onPointerOut={() => {
        if (!isDragging.current) gl.domElement.style.cursor = 'auto';
      }}
    >
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#D4AF37" transparent opacity={0.75} />
      </mesh>
      {/* Wireframe outline */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
        <lineBasicMaterial color="#FFE082" />
      </lineSegments>
    </group>
  );
}

// ── Escena ────────────────────────────────────────────────────────────────────
function Escena({ modulo, costos, explodeFactor, selectedPiezaId, onSelectPieza,
                  targetCam, selectedInfo, orbitRef, onDragEnd, onPosChange }) {
  return (
    <>
      <CamaraController targetPos={targetCam} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.2} castShadow />
      <directionalLight position={[-3, -2, -3]} intensity={0.3} />
      <Modulo3D
        modulo={modulo}
        costos={costos}
        explodeFactor={explodeFactor}
        selectedPieza={selectedPiezaId}
        onSelectPieza={onSelectPieza}
      />
      {selectedInfo && (
        <PiezaArrastrable
          key={selectedInfo.id}
          size={selectedInfo.size}
          pos={selectedInfo.pos}
          orbitRef={orbitRef}
          onDragEnd={onDragEnd}
          onPosChange={onPosChange}
        />
      )}
      <OrbitControls ref={orbitRef} makeDefault enableDamping dampingFactor={0.08} />
    </>
  );
}

// ── Estilos compartidos ───────────────────────────────────────────────────────
const BTN = ({ active, onClick, children, style, danger }) => (
  <button
    onClick={onClick}
    style={{
      background: danger ? 'rgba(200,60,60,0.12)'
                : active  ? 'rgba(212,175,55,0.22)'
                :           'rgba(255,255,255,0.06)',
      border: danger ? '1px solid rgba(200,60,60,0.35)'
            : active  ? '1px solid rgba(212,175,55,0.55)'
            :           '1px solid rgba(255,255,255,0.10)',
      color: danger ? '#e07070' : active ? '#D4AF37' : '#bbb',
      borderRadius: 5, padding: '5px 10px', cursor: 'pointer',
      fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: '0.04em',
      transition: 'all 0.15s', whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </button>
);

const ROL_COLOR = {
  lateral_izq: '#6a9fd8', lateral_der: '#6a9fd8',
  lateral:     '#6a9fd8', techo: '#7ecf8a',
  base:        '#7ecf8a', fondo: '#c89a5a',
  puerta:      '#d4af37', cajon: '#c47fd0',
  estante:     '#80cbc4', ignorar: '#666',
  unknown:     '#555',
};

// ── VisorModulo3D ─────────────────────────────────────────────────────────────
export default function VisorModulo3D({ modulo, costos, onClose, onActualizar }) {
  const [camView,      setCamView]      = useState('iso');
  const [targetCam,    setTargetCam]    = useState(CAMARAS.iso.pos);
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [exploding,    setExploding]    = useState(false);

  // Pieza seleccionada: { id, piezaIdx, nombre, role, size, pos }
  const [selectedInfo, setSelectedInfo] = useState(null);
  // Display en mm (live durante drag)
  const [displayPos,   setDisplayPos]   = useState([0, 0, 0]);

  const orbitRef = useRef();
  const glRef    = useRef(null);

  const irACamara = (key) => { setCamView(key); setTargetCam([...CAMARAS[key].pos]); };

  const toggleExplode = useCallback(() => {
    const next = !exploding;
    setExploding(next);
    let start = null;
    const from = explodeFactor;
    const to   = next ? 1 : 0;
    const step = (ts) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / 500, 1);
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
    a.href = url; a.download = `${modulo?.nombre || 'modulo'}_3d.png`; a.click();
  }, [modulo?.nombre]);

  // Cuando se selecciona una pieza en el canvas
  const handleSelectPieza = useCallback((info) => {
    if (!info) { setSelectedInfo(null); return; }
    setSelectedInfo(info);
    setDisplayPos([
      Math.round(info.pos[0] * 1000),
      Math.round(info.pos[1] * 1000),
      Math.round(info.pos[2] * 1000),
    ]);
  }, []);

  // Drag terminó: guardar pos3d
  const handleDragEnd = useCallback((newPos) => {
    if (!selectedInfo || !onActualizar) return;
    const nuevasPiezas = modulo.piezas.map((p, i) =>
      i === selectedInfo.piezaIdx ? { ...p, pos3d: newPos } : p
    );
    const nuevoMod = { ...modulo, piezas: nuevasPiezas };
    onActualizar(nuevoMod);
    setSelectedInfo(prev => prev ? { ...prev, pos: newPos } : null);
  }, [selectedInfo, modulo, onActualizar]);

  // Asignar rol3d
  const handleAsignarRol = useCallback((rol3d) => {
    if (!selectedInfo || !onActualizar) return;
    const nuevasPiezas = modulo.piezas.map((p, i) =>
      i === selectedInfo.piezaIdx ? { ...p, rol3d } : p
    );
    const nuevoMod = { ...modulo, piezas: nuevasPiezas };
    onActualizar(nuevoMod);

    // Recalcular posición automática con el nuevo rol y actualizar overlay
    const piezas3D = buildPiezas3D(nuevoMod, costos);
    const pieza3D  = piezas3D.find(p => p.piezaIdx === selectedInfo.piezaIdx);
    if (pieza3D) {
      const newPos = pieza3D.pos;
      setSelectedInfo(prev => prev ? { ...prev, role: rol3d, pos: newPos } : null);
      setDisplayPos([Math.round(newPos[0] * 1000), Math.round(newPos[1] * 1000), Math.round(newPos[2] * 1000)]);
    }
  }, [selectedInfo, modulo, costos, onActualizar]);

  // Editar posición desde inputs
  const handlePosInput = useCallback((axis, valMm) => {
    const newDisplayPos = [...displayPos];
    newDisplayPos[axis] = valMm;
    setDisplayPos(newDisplayPos);
    const newPos = [newDisplayPos[0] / 1000, newDisplayPos[1] / 1000, newDisplayPos[2] / 1000];
    setSelectedInfo(prev => prev ? { ...prev, pos: newPos } : null);
    handleDragEnd(newPos);
  }, [displayPos, handleDragEnd]);

  // Reset a posición automática
  const handleResetPos = useCallback(() => {
    if (!selectedInfo || !onActualizar) return;
    const nuevasPiezas = modulo.piezas.map((p, i) =>
      i === selectedInfo.piezaIdx ? { ...p, pos3d: undefined } : p
    );
    const nuevoMod = { ...modulo, piezas: nuevasPiezas };
    onActualizar(nuevoMod);
    const piezas3D = buildPiezas3D(nuevoMod, costos);
    const pieza3D  = piezas3D.find(p => p.piezaIdx === selectedInfo.piezaIdx);
    if (pieza3D) {
      setSelectedInfo(prev => prev ? { ...prev, pos: pieza3D.pos } : null);
      setDisplayPos([Math.round(pieza3D.pos[0] * 1000), Math.round(pieza3D.pos[1] * 1000), Math.round(pieza3D.pos[2] * 1000)]);
    }
  }, [selectedInfo, modulo, costos, onActualizar]);

  const piezasConRol = useMemo(() => {
    if (!modulo?.piezas) return [];
    return modulo.piezas.map((p, idx) => ({ ...p, idx, efectiveRole: p.rol3d || null }));
  }, [modulo]);

  const { ancho = 600, alto = 700, profundidad = 550 } = modulo?.dimensiones || {};

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(8,10,13,0.95)', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#d4af37', fontFamily: "'DM Mono',monospace" }}>◈ EDITOR 3D</span>
        <span style={{ fontSize: 12, color: '#888', flex: 1 }}>{modulo?.nombre}</span>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#555' }}>
          {ancho} × {profundidad} × {alto} mm
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {Object.entries(CAMARAS).map(([k, v]) => (
            <BTN key={k} active={camView === k} onClick={() => irACamara(k)}>{v.label}</BTN>
          ))}
        </div>
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
        <BTN active={exploding} onClick={toggleExplode}>💥 Explotar</BTN>
        <BTN onClick={exportPNG}>⬇ PNG</BTN>
        <BTN danger onClick={onClose}>✕ Cerrar</BTN>
      </div>

      {/* ── Main: panel izq + canvas ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Panel izquierdo ── */}
        <div style={{
          width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: '#0a0c10', borderRight: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}>
          {/* Lista de piezas */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
            <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#444', marginBottom: 8, letterSpacing: '0.08em' }}>
              PIEZAS ({piezasConRol.length})
            </div>
            {piezasConRol.map((p) => {
              const isSelected = selectedInfo?.piezaIdx === p.idx;
              const rolColor   = ROL_COLOR[p.efectiveRole] || ROL_COLOR.unknown;
              return (
                <div
                  key={p.idx}
                  onClick={() => {
                    // Select piece programmatically by finding it in buildPiezas3D result
                    const piezas3D = buildPiezas3D(modulo, costos);
                    const p3d = piezas3D.find(x => x.piezaIdx === p.idx);
                    if (p3d) handleSelectPieza({ id: p3d.id, piezaIdx: p.idx, nombre: p.nombre, role: p3d.role, size: p3d.size, pos: p3d.pos });
                  }}
                  style={{
                    padding: '6px 8px', borderRadius: 5, marginBottom: 3, cursor: 'pointer',
                    background: isSelected ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)',
                    border: isSelected ? '1px solid rgba(212,175,55,0.35)' : '1px solid transparent',
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {!p.efectiveRole && (
                      <span title="Sin rol asignado" style={{ fontSize: 10, color: '#e07070' }}>⚠</span>
                    )}
                    <span style={{
                      display: 'inline-block', width: 7, height: 7, borderRadius: 2,
                      background: rolColor, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 11, color: isSelected ? '#e0c86a' : '#aaa', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.nombre}
                    </span>
                    {p.cantidad > 1 && (
                      <span style={{ fontSize: 9, color: '#555', fontFamily: "'DM Mono',monospace" }}>×{p.cantidad}</span>
                    )}
                  </div>
                  {p.efectiveRole && (
                    <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: rolColor, marginTop: 2, paddingLeft: 12 }}>
                      {ROLES_3D.find(r => r.id === p.efectiveRole)?.label || p.efectiveRole}
                      {modulo.piezas[p.idx]?.pos3d && <span style={{ color: '#d4af37', marginLeft: 4 }}>✎</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Panel editor — visible cuando hay pieza seleccionada */}
          {selectedInfo && (
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              padding: '10px 10px 12px',
              background: '#0d0f14', flexShrink: 0,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#d4af37', fontFamily: "'DM Mono',monospace", marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedInfo.nombre}
              </div>

              {/* Selector de rol */}
              <div style={{ fontSize: 9, color: '#555', fontFamily: "'DM Mono',monospace", marginBottom: 5, letterSpacing: '0.06em' }}>ROL 3D</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 10 }}>
                {ROLES_3D.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleAsignarRol(r.id)}
                    style={{
                      padding: '3px 7px', borderRadius: 4, cursor: 'pointer', fontSize: 9,
                      fontFamily: "'DM Mono',monospace",
                      background: selectedInfo.role === r.id ? `${ROL_COLOR[r.id]}22` : 'rgba(255,255,255,0.04)',
                      border: selectedInfo.role === r.id ? `1px solid ${ROL_COLOR[r.id]}88` : '1px solid rgba(255,255,255,0.08)',
                      color: selectedInfo.role === r.id ? ROL_COLOR[r.id] : '#777',
                      transition: 'all 0.12s',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Posición XYZ */}
              <div style={{ fontSize: 9, color: '#555', fontFamily: "'DM Mono',monospace", marginBottom: 5, letterSpacing: '0.06em' }}>POSICIÓN (mm)</div>
              {['X', 'Y', 'Z'].map((axis, i) => (
                <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#888', width: 10 }}>{axis}</span>
                  <input
                    type="number"
                    value={displayPos[i]}
                    onChange={e => handlePosInput(i, parseFloat(e.target.value) || 0)}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 4, color: '#ddd', fontFamily: "'DM Mono',monospace", fontSize: 10,
                      padding: '3px 5px', outline: 'none',
                    }}
                  />
                </div>
              ))}

              {/* Reset */}
              {modulo.piezas[selectedInfo.piezaIdx]?.pos3d && (
                <button
                  onClick={handleResetPos}
                  style={{
                    width: '100%', marginTop: 6, padding: '4px 0', borderRadius: 4, cursor: 'pointer',
                    background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)',
                    color: '#a08030', fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                  }}
                >
                  ↺ Reset a posición auto
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Canvas ── */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Canvas
            shadows
            camera={{ position: CAMARAS.iso.pos, fov: 45, near: 0.01, far: 50 }}
            gl={{ preserveDrawingBuffer: true }}
            onCreated={({ gl }) => { glRef.current = gl; }}
            style={{ background: '#080a0d', width: '100%', height: '100%' }}
          >
            <Escena
              modulo={modulo}
              costos={costos}
              explodeFactor={explodeFactor}
              selectedPiezaId={selectedInfo?.id}
              onSelectPieza={handleSelectPieza}
              targetCam={targetCam}
              selectedInfo={selectedInfo}
              orbitRef={orbitRef}
              onDragEnd={handleDragEnd}
              onPosChange={(posMm) => setDisplayPos(posMm)}
            />
          </Canvas>

          <div style={{
            position: 'absolute', bottom: 12, left: 12,
            fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#333', pointerEvents: 'none',
          }}>
            {selectedInfo
              ? 'Arrastrá la pieza dorada · Panel izq para cambiar rol o posición exacta'
              : 'Click en pieza para seleccionar · Arrastrá para rotar · Scroll para zoom'}
          </div>
        </div>
      </div>
    </div>
  );
}
