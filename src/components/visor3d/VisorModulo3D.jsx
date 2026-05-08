import React, { useState, useRef, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Modulo3D from './Modulo3D.jsx';
import { CAMARAS } from './CamaraPresets.js';

// Inner component: handles camera control commands
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

function Escena({ modulo, costos, explodeFactor, selectedPieza, onSelectPieza, targetCam }) {
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
        selectedPieza={selectedPieza}
        onSelectPieza={onSelectPieza}
      />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
    </>
  );
}

const BTN = ({ active, onClick, children, style }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.06)',
      border: active ? '1px solid rgba(212,175,55,0.6)' : '1px solid rgba(255,255,255,0.1)',
      color: active ? '#d4af37' : '#ccc',
      borderRadius: 6, padding: '5px 11px', cursor: 'pointer',
      fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: '0.04em',
      transition: 'all 0.15s',
      ...style,
    }}
  >
    {children}
  </button>
);

export default function VisorModulo3D({ modulo, costos, onClose }) {
  const [camView, setCamView] = useState('iso');
  const [targetCam, setTargetCam] = useState(CAMARAS.iso.pos);
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [exploding, setExploding] = useState(false);
  const [selectedPieza, setSelectedPieza] = useState(null);
  const glRef = useRef(null);

  const { ancho = 600, alto = 700, profundidad = 550 } = modulo?.dimensiones || {};

  const irACamara = (key) => {
    setCamView(key);
    setTargetCam([...CAMARAS[key].pos]);
  };

  const toggleExplode = useCallback(() => {
    const next = !exploding;
    setExploding(next);
    // Animate explode factor with requestAnimationFrame
    let start = null;
    const from = explodeFactor;
    const to = next ? 1 : 0;
    const duration = 500;
    const step = (ts) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setExplodeFactor(from + (to - from) * eased);
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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(8,10,13,0.9)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#d4af37', fontFamily: "'DM Mono',monospace", letterSpacing: '0.06em' }}>
          ◈ VISTA 3D
        </span>
        <span style={{ fontSize: 12, color: '#888', flex: 1 }}>{modulo?.nombre}</span>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: '#666' }}>
          {ancho} × {profundidad} × {alto} mm
        </span>

        {/* Camera presets */}
        <div style={{ display: 'flex', gap: 4 }}>
          {Object.entries(CAMARAS).map(([k, v]) => (
            <BTN key={k} active={camView === k} onClick={() => irACamara(k)}>{v.label}</BTN>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

        {/* Explode */}
        <BTN active={exploding} onClick={toggleExplode}>💥 Explotar</BTN>

        {/* Export */}
        <BTN onClick={exportPNG}>⬇ PNG</BTN>

        {/* Close */}
        <BTN onClick={onClose} style={{ color: '#ff7070', borderColor: 'rgba(255,80,80,0.3)' }}>✕ Cerrar</BTN>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas
          shadows
          camera={{ position: CAMARAS.iso.pos, fov: 45, near: 0.01, far: 50 }}
          gl={{ preserveDrawingBuffer: true }}
          onCreated={({ gl }) => { glRef.current = gl; }}
          style={{ background: '#080a0d' }}
        >
          <Escena
            modulo={modulo}
            costos={costos}
            explodeFactor={explodeFactor}
            selectedPieza={selectedPieza}
            onSelectPieza={setSelectedPieza}
            targetCam={targetCam}
          />
        </Canvas>

        {/* Info overlay */}
        <div style={{
          position: 'absolute', bottom: 16, left: 16,
          fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#555',
          pointerEvents: 'none',
        }}>
          Click en pieza para seleccionar · Arrastrar para rotar · Scroll para zoom
        </div>

        {selectedPieza && (
          <div style={{
            position: 'absolute', bottom: 16, right: 16,
            background: 'rgba(8,10,13,0.9)', border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: 8, padding: '8px 14px',
            fontSize: 11, fontFamily: "'DM Mono',monospace", color: '#d4af37',
          }}>
            ◈ {selectedPieza.replace(/-\d+$/, '')}
          </div>
        )}
      </div>
    </div>
  );
}
