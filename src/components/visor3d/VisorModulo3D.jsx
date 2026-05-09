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

// ── Grid + fondo estilo Fusion 360 ────────────────────────────────────────────
function Entorno({ floorY }) {
  const gridRef = useRef();
  useEffect(() => {
    if (!gridRef.current) return;
    gridRef.current.position.y = floorY;
  }, [floorY]);

  return (
    <>
      {/* Fondo gris neutro */}
      <color attach="background" args={['#1a1c22']} />
      <fog   attach="fog"        args={['#1a1c22', 4, 10]} />

      {/* Grilla de piso */}
      <primitive
        ref={gridRef}
        object={new THREE.GridHelper(6, 60, '#2a2d35', '#232630')}
      />

      {/* Piso sólido semitransparente */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY - 0.001, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#1e2028" roughness={0.9} />
      </mesh>
    </>
  );
}

// ── PiezaArrastrable ──────────────────────────────────────────────────────────
// Drag sin bugs: window-level pointerup, latestRef, solo botón izquierdo
function PiezaArrastrable({ size, pos, orbitRef }) {
  const groupRef   = useRef();
  const isDragging = useRef(false);
  const { camera, gl } = useThree();

  // latestRef: evita stale closures en listeners DOM sin rehacer el effect
  const latestRef = useRef({ pos, orbitRef });
  useEffect(() => { latestRef.current = { pos, orbitRef }; });

  // Sync posición cuando cambia desde afuera (cambio de rol, reset)
  useEffect(() => {
    if (groupRef.current && !isDragging.current) {
      groupRef.current.position.set(...pos);
    }
  }, [pos]);

  const floorY    = pos[1];
  const floorPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY),
    [floorY]
  );
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useEffect(() => {
    const canvas = gl.domElement;

    const onMove = (e) => {
      if (!isDragging.current || !groupRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const nx   = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
      const ny   = -((e.clientY - rect.top) / rect.height) *  2 + 1;
      raycaster.setFromCamera({ x: nx, y: ny }, camera);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(floorPlane, hit)) {
        groupRef.current.position.x = hit.x;
        groupRef.current.position.z = hit.z;
      }
    };

    // pointerup en window para capturar aunque el cursor salga del canvas
    const onUp = (e) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      const { orbitRef: orb } = latestRef.current;
      if (orb?.current) orb.current.enabled = true;
      canvas.style.cursor = 'auto';
      // Notificar posición final al padre mediante evento custom
      if (groupRef.current) {
        const p = groupRef.current.position;
        canvas.dispatchEvent(new CustomEvent('pieza-drag-end', {
          detail: { pos: [p.x, p.y, p.z] },
          bubbles: true,
        }));
      }
    };

    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);   // window, no canvas
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };
  }, [camera, gl, floorPlane, raycaster]); // callbacks sacados — usan latestRef

  // Bloquear Y siempre al valor original
  useFrame(() => {
    if (groupRef.current) groupRef.current.position.y = pos[1];
  });

  return (
    <group
      ref={groupRef}
      position={pos}
      onPointerDown={(e) => {
        if (e.nativeEvent.button !== 0) return;   // solo botón izquierdo
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
      <mesh castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#D4AF37" transparent opacity={0.78} roughness={0.4} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
        <lineBasicMaterial color="#FFE082" />
      </lineSegments>
    </group>
  );
}

// ── Escena ────────────────────────────────────────────────────────────────────
function Escena({ modulo, costos, explodeFactor, selectedPiezaId, onSelectPieza,
                  targetCam, selectedInfo, orbitRef, floorY }) {
  return (
    <>
      <CamaraController targetPos={targetCam} />
      <Entorno floorY={floorY} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]}  intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 2, -3]} intensity={0.25} color="#b8d4f0" />
      <Modulo3D
        modulo={modulo}
        costos={costos}
        explodeFactor={explodeFactor}
        selectedPieza={selectedPiezaId}
        onSelectPieza={onSelectPieza}
      />
      {selectedInfo && (
        <PiezaArrastrable
          key={`drag-${selectedInfo.piezaIdx}`}
          size={selectedInfo.size}
          pos={selectedInfo.pos}
          orbitRef={orbitRef}
        />
      )}
      <OrbitControls ref={orbitRef} makeDefault enableDamping dampingFactor={0.08} />
    </>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
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
      color:  danger ? '#e07070' : active ? '#D4AF37' : '#bbb',
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
  lateral_izq: '#6a9fd8', lateral_der: '#6a9fd8', lateral: '#6a9fd8',
  techo: '#7ecf8a', base: '#7ecf8a', fondo: '#c89a5a',
  puerta: '#d4af37', cajon: '#c47fd0', estante: '#80cbc4',
  ignorar: '#555', unknown: '#444',
};

const INP = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 4, color: '#ddd', fontFamily: "'DM Mono',monospace", fontSize: 10,
  padding: '3px 5px', outline: 'none', width: '100%', boxSizing: 'border-box',
};

// ── VisorModulo3D ─────────────────────────────────────────────────────────────
export default function VisorModulo3D({ modulo, costos, onClose, onActualizar }) {
  const [camView,      setCamView]      = useState('iso');
  const [targetCam,    setTargetCam]    = useState(CAMARAS.iso.pos);
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [exploding,    setExploding]    = useState(false);
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [displayPos,   setDisplayPos]   = useState([0, 0, 0]);

  const orbitRef = useRef();
  const glRef    = useRef(null);
  const canvasRef = useRef(null);

  // Escuchar evento custom del canvas cuando termina el drag
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e) => {
      const newPos = e.detail.pos;
      setDisplayPos([
        Math.round(newPos[0] * 1000),
        Math.round(newPos[1] * 1000),
        Math.round(newPos[2] * 1000),
      ]);
      setSelectedInfo(prev => {
        if (!prev) return null;
        // Guardar pos3d en el módulo
        if (onActualizar) {
          const nuevasPiezas = modulo.piezas.map((p, i) =>
            i === prev.piezaIdx ? { ...p, pos3d: newPos } : p
          );
          onActualizar({ ...modulo, piezas: nuevasPiezas });
        }
        return { ...prev, pos: newPos };
      });
    };
    canvas.addEventListener('pieza-drag-end', handler);
    return () => canvas.removeEventListener('pieza-drag-end', handler);
  }, [modulo, onActualizar]);

  // Movimiento teclado: flechas = ±1mm en XZ, Shift+flechas = ±1mm en Y
  useEffect(() => {
    const onKey = (e) => {
      if (!selectedInfo) return;
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      const step = 0.001; // 1mm
      let [x, y, z] = selectedInfo.pos;
      if (e.shiftKey) {
        if (e.key === 'ArrowUp')   y += step;
        if (e.key === 'ArrowDown') y -= step;
      } else {
        if (e.key === 'ArrowLeft')  x -= step;
        if (e.key === 'ArrowRight') x += step;
        if (e.key === 'ArrowUp')    z -= step;
        if (e.key === 'ArrowDown')  z += step;
      }
      const newPos = [x, y, z];
      applyPosChange(newPos, selectedInfo.piezaIdx);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInfo]);

  const applyPosChange = useCallback((newPos, piezaIdx) => {
    setDisplayPos([
      Math.round(newPos[0] * 1000),
      Math.round(newPos[1] * 1000),
      Math.round(newPos[2] * 1000),
    ]);
    setSelectedInfo(prev => prev ? { ...prev, pos: newPos } : null);
    if (onActualizar) {
      const nuevasPiezas = modulo.piezas.map((p, i) =>
        i === piezaIdx ? { ...p, pos3d: newPos } : p
      );
      onActualizar({ ...modulo, piezas: nuevasPiezas });
    }
  }, [modulo, onActualizar]);

  const irACamara = (key) => { setCamView(key); setTargetCam([...CAMARAS[key].pos]); };

  const toggleExplode = useCallback(() => {
    const next = !exploding;
    setExploding(next);
    let start = null;
    const from = explodeFactor, to = next ? 1 : 0;
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

  const handleSelectPieza = useCallback((info) => {
    if (!info) { setSelectedInfo(null); return; }
    setSelectedInfo(info);
    setDisplayPos([
      Math.round(info.pos[0] * 1000),
      Math.round(info.pos[1] * 1000),
      Math.round(info.pos[2] * 1000),
    ]);
  }, []);

  const handleAsignarRol = useCallback((rol3d) => {
    if (!selectedInfo || !onActualizar) return;
    const nuevasPiezas = modulo.piezas.map((p, i) =>
      i === selectedInfo.piezaIdx ? { ...p, rol3d } : p
    );
    const nuevoMod = { ...modulo, piezas: nuevasPiezas };
    onActualizar(nuevoMod);
    const piezas3D = buildPiezas3D(nuevoMod, costos);
    const p3d = piezas3D.find(p => p.piezaIdx === selectedInfo.piezaIdx);
    if (p3d) {
      setSelectedInfo(prev => prev ? { ...prev, role: rol3d, pos: p3d.pos } : null);
      setDisplayPos([Math.round(p3d.pos[0] * 1000), Math.round(p3d.pos[1] * 1000), Math.round(p3d.pos[2] * 1000)]);
    }
  }, [selectedInfo, modulo, costos, onActualizar]);

  const handlePosInput = (axis, valMm) => {
    if (!selectedInfo) return;
    const newDisplayPos = [...displayPos];
    newDisplayPos[axis] = valMm;
    setDisplayPos(newDisplayPos);
    const newPos = [newDisplayPos[0] / 1000, newDisplayPos[1] / 1000, newDisplayPos[2] / 1000];
    applyPosChange(newPos, selectedInfo.piezaIdx);
  };

  const handleNudge = (axis, deltaMm) => {
    if (!selectedInfo) return;
    const newDisplayPos = [...displayPos];
    newDisplayPos[axis] = (newDisplayPos[axis] || 0) + deltaMm;
    setDisplayPos(newDisplayPos);
    const newPos = [newDisplayPos[0] / 1000, newDisplayPos[1] / 1000, newDisplayPos[2] / 1000];
    applyPosChange(newPos, selectedInfo.piezaIdx);
  };

  const handleResetPos = useCallback(() => {
    if (!selectedInfo || !onActualizar) return;
    const nuevasPiezas = modulo.piezas.map((p, i) =>
      i === selectedInfo.piezaIdx ? { ...p, pos3d: undefined } : p
    );
    const nuevoMod = { ...modulo, piezas: nuevasPiezas };
    onActualizar(nuevoMod);
    const piezas3D = buildPiezas3D(nuevoMod, costos);
    const p3d = piezas3D.find(p => p.piezaIdx === selectedInfo.piezaIdx);
    if (p3d) {
      setSelectedInfo(prev => prev ? { ...prev, pos: p3d.pos } : null);
      setDisplayPos([Math.round(p3d.pos[0] * 1000), Math.round(p3d.pos[1] * 1000), Math.round(p3d.pos[2] * 1000)]);
    }
  }, [selectedInfo, modulo, costos, onActualizar]);

  const piezasLista = useMemo(() => {
    if (!modulo?.piezas) return [];
    return modulo.piezas.map((p, idx) => ({ ...p, idx }));
  }, [modulo]);

  const { ancho = 600, alto = 700, profundidad = 550 } = modulo?.dimensiones || {};
  const floorY = -(alto / 2 / 1000);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(10,12,18,0.98)', flexShrink: 0, flexWrap: 'wrap',
        zIndex: 10,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#d4af37', fontFamily: "'DM Mono',monospace", letterSpacing: '0.06em' }}>
          ◈ EDITOR 3D
        </span>
        <span style={{ fontSize: 12, color: '#777', flex: 1 }}>{modulo?.nombre}</span>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#444' }}>
          {ancho} × {profundidad} × {alto} mm
        </span>

        <div style={{ display: 'flex', gap: 4 }}>
          {Object.entries(CAMARAS).map(([k, v]) => (
            <BTN key={k} active={camView === k} onClick={() => irACamara(k)}>{v.label}</BTN>
          ))}
        </div>

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />

        <BTN active={exploding} onClick={toggleExplode}>💥 Explotar</BTN>
        <BTN onClick={exportPNG}>⬇ PNG</BTN>
        <BTN danger onClick={onClose}>✕ Cerrar</BTN>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Panel izquierdo ── */}
        <div style={{
          width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: '#0a0c10', borderRight: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}>
          {/* Lista de piezas */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
            <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#3a3d46', marginBottom: 7, letterSpacing: '0.08em' }}>
              PIEZAS ({piezasLista.length})
            </div>
            {piezasLista.map((p) => {
              const isSelected = selectedInfo?.piezaIdx === p.idx;
              const rol        = p.rol3d || null;
              const rolColor   = ROL_COLOR[rol] || ROL_COLOR.unknown;
              const hasOverride = !!modulo.piezas[p.idx]?.pos3d;
              return (
                <div
                  key={p.idx}
                  onClick={() => {
                    const piezas3D = buildPiezas3D(modulo, costos);
                    const p3d = piezas3D.find(x => x.piezaIdx === p.idx);
                    if (p3d) handleSelectPieza({ id: p3d.id, piezaIdx: p.idx, nombre: p.nombre, role: p3d.role, size: p3d.size, pos: p3d.pos });
                  }}
                  style={{
                    padding: '6px 8px', borderRadius: 5, marginBottom: 3, cursor: 'pointer',
                    background: isSelected ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.02)',
                    border: isSelected ? '1px solid rgba(212,175,55,0.30)' : '1px solid transparent',
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {!rol && <span title="Sin rol" style={{ fontSize: 9, color: '#e07070', lineHeight: 1 }}>⚠</span>}
                    <span style={{
                      width: 7, height: 7, borderRadius: 2, flexShrink: 0, display: 'inline-block',
                      background: rolColor, opacity: rol ? 1 : 0.3,
                    }} />
                    <span style={{ fontSize: 11, color: isSelected ? '#e0c86a' : '#999', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.nombre}
                    </span>
                    {p.cantidad > 1 && <span style={{ fontSize: 9, color: '#444', fontFamily: "'DM Mono',monospace" }}>×{p.cantidad}</span>}
                    {hasOverride && <span title="Posición manual" style={{ fontSize: 8, color: '#d4af37' }}>✎</span>}
                  </div>
                  {rol && (
                    <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: rolColor, marginTop: 2, paddingLeft: 12, opacity: 0.8 }}>
                      {ROLES_3D.find(r => r.id === rol)?.label || rol}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Editor de pieza seleccionada */}
          {selectedInfo && (
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.07)',
              padding: '10px 10px 14px',
              background: '#0d0f15', flexShrink: 0,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#d4af37', fontFamily: "'DM Mono',monospace", marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedInfo.nombre}
              </div>

              {/* Rol */}
              <div style={{ fontSize: 9, color: '#3a3d46', fontFamily: "'DM Mono',monospace", marginBottom: 4, letterSpacing: '0.06em' }}>ROL 3D</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 10 }}>
                {ROLES_3D.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleAsignarRol(r.id)}
                    style={{
                      padding: '3px 7px', borderRadius: 4, cursor: 'pointer', fontSize: 9,
                      fontFamily: "'DM Mono',monospace",
                      background: selectedInfo.role === r.id ? `${ROL_COLOR[r.id] || '#888'}22` : 'rgba(255,255,255,0.03)',
                      border: selectedInfo.role === r.id ? `1px solid ${ROL_COLOR[r.id] || '#888'}88` : '1px solid rgba(255,255,255,0.07)',
                      color: selectedInfo.role === r.id ? (ROL_COLOR[r.id] || '#aaa') : '#666',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Posición XYZ */}
              <div style={{ fontSize: 9, color: '#3a3d46', fontFamily: "'DM Mono',monospace", marginBottom: 5, letterSpacing: '0.06em' }}>
                POSICIÓN (mm) · flechas = ±1mm · Shift+↑↓ = Y
              </div>
              {[['X', 0], ['Y', 1], ['Z', 2]].map(([label, axis]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#666', width: 10, flexShrink: 0 }}>{label}</span>
                  <button onClick={() => handleNudge(axis, -1)} style={{ width: 18, height: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, cursor: 'pointer', color: '#777', fontSize: 10, padding: 0, flexShrink: 0 }}>−</button>
                  <input
                    type="number"
                    value={displayPos[axis]}
                    onChange={e => handlePosInput(axis, parseFloat(e.target.value) || 0)}
                    style={{ ...INP, flex: 1 }}
                  />
                  <button onClick={() => handleNudge(axis, 1)} style={{ width: 18, height: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, cursor: 'pointer', color: '#777', fontSize: 10, padding: 0, flexShrink: 0 }}>+</button>
                </div>
              ))}

              {modulo.piezas[selectedInfo.piezaIdx]?.pos3d && (
                <button
                  onClick={handleResetPos}
                  style={{
                    width: '100%', marginTop: 7, padding: '4px 0', borderRadius: 4, cursor: 'pointer',
                    background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.18)',
                    color: '#907030', fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                  }}
                >
                  ↺ Reset a posición auto
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Canvas ── */}
        <div ref={canvasRef} style={{ flex: 1, position: 'relative' }}>
          <Canvas
            shadows
            camera={{ position: CAMARAS.iso.pos, fov: 45, near: 0.01, far: 50 }}
            gl={{ preserveDrawingBuffer: true }}
            onCreated={({ gl }) => { glRef.current = gl; }}
            style={{ width: '100%', height: '100%' }}
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
              floorY={floorY}
            />
          </Canvas>

          <div style={{
            position: 'absolute', bottom: 10, left: 12,
            fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#2a2d35', pointerEvents: 'none',
          }}>
            {selectedInfo
              ? '↔ Arrastrá · flechas ±1mm · Shift+↑↓ = altura'
              : 'Click en pieza para editar · Arrastrar para rotar · Scroll zoom'}
          </div>
        </div>
      </div>
    </div>
  );
}
