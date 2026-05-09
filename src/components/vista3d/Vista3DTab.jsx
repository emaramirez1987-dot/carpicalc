import React, { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { CAMARAS } from '../visor3d/CamaraPresets.js';
import { PanelModulos3D } from './PanelModulos3D.jsx';
import { Escena3DPrincipal, WALL_Z } from './Escena3DPrincipal.jsx';
import { useAutoLayout3D } from './useAutoLayout3D.js';

// ── Colores por defecto de la escena ──────────────────────────────────────────
const DEFAULTS = {
  colorPiso:   '#2a2c30',
  colorPared:  '#1e2128',
  colorMesada: '#c8b89a',
};

// ── BTN ───────────────────────────────────────────────────────────────────────
const BTN = ({ active, onClick, children, style }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? 'rgba(212,175,55,0.22)' : 'rgba(255,255,255,0.05)',
      border: active ? '1px solid rgba(212,175,55,0.55)' : '1px solid rgba(255,255,255,0.10)',
      color: active ? '#D4AF37' : '#aaa',
      borderRadius: 5, padding: '4px 10px', cursor: 'pointer',
      fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: '0.04em',
      transition: 'all 0.15s',
      ...style,
    }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#ccc'; }}}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#aaa'; }}}
  >
    {children}
  </button>
);

// ── ColorToggle — toggle con color picker inline ──────────────────────────────
function ColorToggle({ value, onToggle, color, onColor, label }) {
  const inputRef = useRef();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <BTN active={value} onClick={onToggle}>
        {value ? '✓ ' : ''}{label}
      </BTN>
      {/* Swatch — abre el color picker nativo */}
      <div
        onClick={() => inputRef.current?.click()}
        title={`Color de ${label}`}
        style={{
          width: 16, height: 16, borderRadius: 3, cursor: 'pointer',
          background: color,
          border: '1px solid rgba(255,255,255,0.18)',
          flexShrink: 0,
          transition: 'transform 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      />
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={e => onColor(e.target.value)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      />
    </div>
  );
}

// ── DPadBtn ───────────────────────────────────────────────────────────────────
const DPadBtn = ({ onClick, children, title }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 28, height: 28, borderRadius: 5, cursor: 'pointer',
      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
      color: '#aaa', fontSize: 11, lineHeight: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.12s',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.18)'; e.currentTarget.style.color = '#D4AF37'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
  >
    {children}
  </button>
);

// ── Vista3DTab ────────────────────────────────────────────────────────────────
export function Vista3DTab({
  modulos,
  costos,
  items = [],
  dimOverride = {},
  inlineModulos = {},
  presupuestoActivoId,  // eslint-disable-line no-unused-vars
  onCaptura,
}) {
  const glRef = useRef(null);

  // Módulos en escena
  const [modulosEnEscena, setModulosEnEscena] = useState([]);
  const [selectedCod,     setSelectedCod]     = useState(null);

  // Visibilidad de elementos
  const [mostrarPiso,   setMostrarPiso]   = useState(true);
  const [mostrarPared,  setMostrarPared]  = useState(true);
  const [mostrarMesada, setMostrarMesada] = useState(true);

  // Colores de ambiente
  const [colorPiso,   setColorPiso]   = useState(DEFAULTS.colorPiso);
  const [colorPared,  setColorPared]  = useState(DEFAULTS.colorPared);
  const [colorMesada, setColorMesada] = useState(DEFAULTS.colorMesada);

  // Cámara
  const [camTarget, setCamTarget] = useState(CAMARAS.iso.pos);
  const [camView,   setCamView]   = useState('iso');

  // Feedback captura
  const [capturado, setCapturado] = useState(false);

  const irACamara = (key) => {
    setCamView(key);
    setCamTarget([...CAMARAS[key].pos]);
  };

  const handleAgregar = ({ codigo }) => {
    const instanceId = `${codigo}-${crypto.randomUUID()}`;
    setModulosEnEscena(prev => [...prev, { instanceId, codigo, posicion: [0, 0, 0] }]);
  };

  // layoutItems refleja las posiciones actuales (auto o manuales) — usado por nudge
  const layoutItems = useAutoLayout3D(modulosEnEscena, modulos);

  const handleUpdatePosicion = (instanceId, newPos) => {
    setModulosEnEscena(prev => prev.map(m =>
      m.instanceId === instanceId ? { ...m, posicion: newPos } : m
    ));
  };

  const NUDGE_STEP = 0.05; // 50mm por click

  const handleNudge = (dx, dz) => {
    if (!selectedCod) return;
    const item = layoutItems.find(it => it.instanceId === selectedCod);
    if (!item) return;
    const [cx, cy, cz] = item.worldPos;
    handleUpdatePosicion(selectedCod, [cx + dx, cy, cz + dz]);
  };

  const handleSnapToWall = () => {
    if (!selectedCod) return;
    const item = layoutItems.find(it => it.instanceId === selectedCod);
    if (!item) return;
    const mod = modulos?.[item.codigo];
    const halfDepth = (mod?.dimensiones?.profundidad || 550) / 2 / 1000;
    const snapZ = WALL_Z + halfDepth;
    handleUpdatePosicion(selectedCod, [item.worldPos[0], item.worldPos[1], snapZ]);
  };

  const handleCapturar = () => {
    if (!glRef.current) return;
    const dataUrl = glRef.current.domElement.toDataURL('image/png');
    onCaptura?.(dataUrl);
    setCapturado(true);
    setTimeout(() => setCapturado(false), 2000);
  };

  const handleLimpiarEscena = () => {
    setModulosEnEscena([]);
    setSelectedCod(null);
  };

  const handleEliminarSeleccionado = () => {
    if (!selectedCod) return;
    setModulosEnEscena(prev => prev.filter(m => m.instanceId !== selectedCod));
    setSelectedCod(null);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'row',
      height: 'calc(100vh - 120px)',
      margin: '0 -20px',
      background: '#080a0d',
    }}>

      {/* ── Panel izquierdo ─────────────────────────────────────── */}
      <div style={{
        width: 240, flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.08)',
        background: '#0e1014',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <PanelModulos3D
            items={items}
            modulos={modulos}
            inlineModulos={inlineModulos}
            dimOverride={dimOverride}
            costos={costos}
            onAgregar={handleAgregar}
          />
        </div>

        {/* Panel inferior izquierdo */}
        {modulosEnEscena.length > 0 && (
          <div style={{
            padding: '10px 14px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#555', marginBottom: 8 }}>
              En escena: {modulosEnEscena.length}
            </div>

            {/* D-pad — solo visible cuando hay un módulo seleccionado */}
            {selectedCod && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#444', marginBottom: 6, letterSpacing: '0.08em' }}>
                  MOVER SELECCIONADO
                </div>

                {/* Fila superior: ↑ */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>
                  <DPadBtn onClick={() => handleNudge(0, -NUDGE_STEP)} title="Acercar a pared">▲</DPadBtn>
                </div>
                {/* Fila media: ← · → */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: 3 }}>
                  <DPadBtn onClick={() => handleNudge(-NUDGE_STEP, 0)} title="Izquierda">◀</DPadBtn>
                  <div style={{ width: 28, height: 28, borderRadius: 5, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
                  <DPadBtn onClick={() => handleNudge(NUDGE_STEP, 0)} title="Derecha">▶</DPadBtn>
                </div>
                {/* Fila inferior: ↓ */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <DPadBtn onClick={() => handleNudge(0, NUDGE_STEP)} title="Alejar de pared">▼</DPadBtn>
                </div>

                {/* Snap a pared */}
                <button
                  onClick={handleSnapToWall}
                  title="Pegar el módulo a la pared trasera"
                  style={{
                    width: '100%', padding: '5px 0', borderRadius: 5, cursor: 'pointer',
                    background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)',
                    color: '#a08030', fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}
                >
                  ⊡ Pegar a pared
                </button>

                {/* Quitar módulo */}
                <button
                  onClick={handleEliminarSeleccionado}
                  style={{
                    width: '100%', marginTop: 5, padding: '5px 0', borderRadius: 5, cursor: 'pointer',
                    background: 'rgba(200,60,60,0.10)', border: '1px solid rgba(200,60,60,0.30)',
                    color: '#e07070', fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                  }}
                >
                  ✕ Quitar módulo
                </button>
              </div>
            )}

            {/* Limpiar toda la escena */}
            <button
              onClick={handleLimpiarEscena}
              style={{
                width: '100%', padding: '5px 0', borderRadius: 5, cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
                color: '#555', fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
              }}
            >
              Limpiar escena
            </button>
          </div>
        )}
      </div>

      {/* ── Área derecha: toolbar + canvas ──────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px',
          background: 'rgba(8,10,13,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexWrap: 'wrap',
          flexShrink: 0,
          zIndex: 10,
        }}>
          {/* Ángulos de cámara */}
          <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#555', marginRight: 2 }}>ÁNGULO</span>
          {Object.entries(CAMARAS).map(([k, v]) => (
            <BTN key={k} active={camView === k} onClick={() => irACamara(k)}>{v.label}</BTN>
          ))}

          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

          {/* Toggles con color pickers */}
          <ColorToggle
            value={mostrarPiso}   onToggle={() => setMostrarPiso(v => !v)}
            color={colorPiso}     onColor={setColorPiso}
            label="Piso"
          />
          <ColorToggle
            value={mostrarPared}  onToggle={() => setMostrarPared(v => !v)}
            color={colorPared}    onColor={setColorPared}
            label="Pared"
          />
          <ColorToggle
            value={mostrarMesada} onToggle={() => setMostrarMesada(v => !v)}
            color={colorMesada}   onColor={setColorMesada}
            label="Mesada"
          />

          <div style={{ flex: 1 }} />

          {/* Cantidad de módulos */}
          {modulosEnEscena.length > 0 && (
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#555' }}>
              {modulosEnEscena.length} módulo{modulosEnEscena.length !== 1 ? 's' : ''}
            </span>
          )}

          {/* Capturar */}
          <button
            onClick={handleCapturar}
            disabled={modulosEnEscena.length === 0}
            style={{
              padding: '5px 14px', borderRadius: 5,
              cursor: modulosEnEscena.length === 0 ? 'default' : 'pointer',
              background: capturado ? 'rgba(126,207,138,0.15)' : 'rgba(212,175,55,0.15)',
              border: capturado ? '1px solid rgba(126,207,138,0.50)' : '1px solid rgba(212,175,55,0.45)',
              color: capturado ? '#7ecf8a' : '#D4AF37',
              fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700,
              opacity: modulosEnEscena.length === 0 ? 0.35 : 1,
              transition: 'all 0.2s',
            }}
          >
            {capturado ? '✓ Capturado' : '◈ Capturar'}
          </button>
        </div>

        {/* Empty state overlay */}
        {modulosEnEscena.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', zIndex: 5,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.18 }}>◈</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.15)', margin: 0 }}>Escena vacía</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.08)', margin: '6px 0 0' }}>
              Usá el panel izquierdo para agregar módulos
            </p>
          </div>
        )}

        {/* Canvas R3F */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Canvas
            shadows
            camera={{ position: CAMARAS.iso.pos, fov: 45, near: 0.01, far: 100 }}
            gl={{ preserveDrawingBuffer: true }}
            onCreated={({ gl }) => { glRef.current = gl; }}
            style={{ background: '#080a0d', width: '100%', height: '100%' }}
          >
            <Escena3DPrincipal
              modulosEnEscena={modulosEnEscena}
              modulos={modulos}
              costos={costos}
              mostrarPiso={mostrarPiso}
              mostrarPared={mostrarPared}
              mostrarMesada={mostrarMesada}
              colorPiso={colorPiso}
              colorPared={colorPared}
              colorMesada={colorMesada}
              camTarget={camTarget}
              onSelectModulo={setSelectedCod}
              selectedCod={selectedCod}
              onUpdatePosicion={handleUpdatePosicion}
            />
          </Canvas>

          {/* Hint inferior */}
          <div style={{
            position: 'absolute', bottom: 12, left: 16,
            fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#333',
            pointerEvents: 'none',
          }}>
            Arrastrá para rotar · Scroll para zoom · Click para seleccionar · Seleccionado: arrastrar flechas para mover
          </div>
        </div>
      </div>
    </div>
  );
}
