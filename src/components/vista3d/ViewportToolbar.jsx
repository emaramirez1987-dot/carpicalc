// ViewportToolbar.jsx — Top toolbar for Vista 3D
// Layout: [View presets] | [Scene toggles] | [Lighting ▾] [↻] | flex | [◈ Capturar] [⤢]

import React from 'react';
import { tok, BTN, DropItem, Dropdown, ColorToggle } from './tokens.js';
import { CAMARAS } from '../visor3d/CamaraPresets.js';

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const IsoIcon = () => (
  <svg width="16" height="14" viewBox="0 0 16 14" fill="none"
    stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
    <path d="M8 1L15 5V9L8 13L1 9V5L8 1Z" />
    <path d="M8 1V13" strokeWidth="0.8" />
    <path d="M1 5L8 8.5L15 5" strokeWidth="0.8" />
  </svg>
);
const FrontIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.3">
    <rect x="2" y="2" width="10" height="10" />
  </svg>
);
const SideIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.3">
    <rect x="4" y="2" width="6" height="10" />
  </svg>
);
const TopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.3">
    <rect x="2" y="4" width="10" height="6" />
  </svg>
);
const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.2">
    <path d="M2 2H12V12H2Z" />
    <path d="M2 7H12M7 2V12" />
  </svg>
);
const LightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.3">
    <circle cx="7" cy="6" r="2.5" />
    <path d="M7 1V2M7 10V11M2 6H3M11 6H12M3.5 3.5L4.2 4.2M9.8 3.5L9.1 4.2M3.5 8.5L4.2 7.8M9.8 8.5L9.1 7.8" />
    <path d="M5.5 11H8.5" strokeWidth="1.1" />
    <path d="M6 13H8" strokeWidth="1.1" />
  </svg>
);

// View presets defined in one place (CAMARAS drives the list)
const VIEW_ICONS = {
  iso:    <IsoIcon />,
  front:  <FrontIcon />,
  side:   <SideIcon />,
  top:    <TopIcon />,
};
const VIEW_LABELS = {
  iso:    'ISO',
  front:  'FRONT',
  side:   'SIDE',
  top:    'TOP',
};

// ── View preset button ─────────────────────────────────────────────────────────
function ViewBtn({ viewKey, active, onClick }) {
  const T = tok();
  return (
    <button
      onClick={() => onClick(viewKey)}
      title={CAMARAS[viewKey]?.label || viewKey}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '7px 10px 6px',
        background: active ? 'rgba(212,175,55,0.18)' : 'transparent',
        border: active ? `1px solid ${T.goldBord}` : '1px solid transparent',
        borderRadius: 7,
        cursor: 'pointer',
        color: active ? T.gold : T.btnText,
        transition: 'all 0.14s', outline: 'none',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.rowHover; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {VIEW_ICONS[viewKey] || null}
      <span style={{
        fontSize: 7, fontFamily: "'DM Mono',monospace",
        letterSpacing: '0.06em', lineHeight: 1,
      }}>
        {VIEW_LABELS[viewKey] || viewKey.toUpperCase()}
      </span>
    </button>
  );
}

// ── Scene toggle button ────────────────────────────────────────────────────────
function ToggleBtn({ icon, label, active, onClick }) {
  const T = tok();
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '7px 8px 6px',
        background: active ? 'rgba(212,175,55,0.14)' : 'transparent',
        border: 'none',
        borderBottom: active ? `2px solid ${T.gold}` : '2px solid transparent',
        borderRadius: 0,
        cursor: 'pointer',
        color: active ? T.gold : T.btnText,
        transition: 'all 0.14s', outline: 'none',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = T.btnHoverText; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = T.btnText; }}
    >
      {icon}
      <span style={{
        fontSize: 7, fontFamily: "'DM Mono',monospace",
        letterSpacing: '0.06em', lineHeight: 1,
      }}>
        {label}
      </span>
    </button>
  );
}

// ── Toolbar vertical divider ───────────────────────────────────────────────────
function TDivider() {
  const T = tok();
  return (
    <div style={{ width: 1, height: 20, background: T.divider, margin: '0 4px', flexShrink: 0, alignSelf: 'center' }} />
  );
}

// ── ViewportToolbar ────────────────────────────────────────────────────────────
// Props are intentionally numerous — this toolbar is the single control surface
// for all scene display options. Grouping into objects would obscure the API.
export function ViewportToolbar({
  // Camera
  camView, onCameraPreset,
  // Scene visibility
  mostrarPiso, setMostrarPiso, colorPiso, setColorPiso,
  mostrarPared, setMostrarPared, colorPared, setColorPared,
  mostrarParedIzq, setMostrarParedIzq,
  mostrarParedDer, setMostrarParedDer,
  mostrarMesada, setMostrarMesada, colorMesada, setColorMesada,
  mostrarGrilla, setMostrarGrilla,
  mostrarContornos, setMostrarContornos,
  colorContornos, setColorContornos,
  grosorContornos, setGrosorContornos,
  // Lighting
  shadowIntensidad, setShadowIntensidad,
  shadowAngle, setShadowAngle,
  // Actions
  onActualizar,
  capturado, onCapturar,
  maximizado, onMaximizar,
  modulosCount,
}) {
  const T = tok();

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 0,
      padding: '0 10px',
      background: T.toolbarBg,
      boxShadow: T.toolbarShadow,
      borderBottom: `1px solid ${T.border}`,
      flexShrink: 0, zIndex: 10,
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      minHeight: 52,
      transition: 'background 0.35s ease',
    }}>

      {/* ── View presets ──────────────────────────────────────────────── */}
      {Object.keys(VIEW_ICONS).map(key => (
        <ViewBtn
          key={key}
          viewKey={key}
          active={camView === key}
          onClick={onCameraPreset}
        />
      ))}

      <TDivider />

      {/* ── Scene toggles — Floor / Walls / Counter / Grid / Edges ──── */}
      <ColorToggle
        value={mostrarPiso} onToggle={() => setMostrarPiso(v => !v)}
        color={colorPiso} onColor={setColorPiso} label="Piso"
      />

      {/* Paredes — dropdown (trasera con color + lateral izq + lateral der) */}
      <Dropdown label="Paredes" active={mostrarPared || mostrarParedIzq || mostrarParedDer}>
        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ColorToggle
            value={mostrarPared} onToggle={() => setMostrarPared(v => !v)}
            color={colorPared} onColor={setColorPared} label="Trasera"
          />
          <BTN active={mostrarParedIzq} onClick={() => setMostrarParedIzq(v => !v)}>
            Izquierda
          </BTN>
          <BTN active={mostrarParedDer} onClick={() => setMostrarParedDer(v => !v)}>
            Derecha
          </BTN>
        </div>
      </Dropdown>

      <ColorToggle
        value={mostrarMesada} onToggle={() => setMostrarMesada(v => !v)}
        color={colorMesada} onColor={setColorMesada} label="Mesada"
      />

      <ToggleBtn icon={<GridIcon />} label="Grilla" active={mostrarGrilla} onClick={() => setMostrarGrilla(v => !v)} />

      {/* Contornos — dropdown (toggle + color + grosor) */}
      <Dropdown label="Contornos" active={mostrarContornos}>
        <DropItem active={mostrarContornos} onClick={() => setMostrarContornos(v => !v)}>
          {mostrarContornos ? '✓ ' : ''}Mostrar contornos
        </DropItem>
        {mostrarContornos && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '3px 0' }} />
            <div style={{ padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: T.btnText }}>
                Color
              </span>
              <input
                type="color" value={colorContornos}
                onChange={e => setColorContornos(e.target.value)}
                style={{ width: 28, height: 22, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '3px 0' }} />
            {[[1, 'Fino · 1px'], [2, 'Medio · 2px'], [3, 'Grueso · 3px']].map(([g, lbl]) => (
              <DropItem key={g} active={grosorContornos === g} onClick={() => setGrosorContornos(g)}>
                {lbl}
              </DropItem>
            ))}
          </>
        )}
      </Dropdown>

      <TDivider />

      {/* ── Lighting ──────────────────────────────────────────────────── */}
      <div style={{ alignSelf: 'center' }}>
        <Dropdown
          label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <LightIcon /> Luz
            </span>
          }
          active={false}
        >
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 170 }}>
            <div>
              <div style={{
                fontSize: 8, fontFamily: "'DM Mono',monospace",
                color: T.textDim, letterSpacing: '0.08em', marginBottom: 5,
              }}>
                ÁNGULO · {shadowAngle}°
              </div>
              <input
                type="range" min={0} max={359} step={1} value={shadowAngle}
                onChange={e => setShadowAngle(Number(e.target.value))}
                style={{ width: '100%', accentColor: T.accent, cursor: 'pointer' }}
              />
            </div>
            <div>
              <div style={{
                fontSize: 8, fontFamily: "'DM Mono',monospace",
                color: T.textDim, letterSpacing: '0.08em', marginBottom: 5,
              }}>
                INTENSIDAD · {Math.round(shadowIntensidad * 100)}%
              </div>
              <input
                type="range" min={20} max={140} step={5}
                value={Math.round(shadowIntensidad * 100)}
                onChange={e => setShadowIntensidad(Number(e.target.value) / 100)}
                style={{ width: '100%', accentColor: T.accent, cursor: 'pointer' }}
              />
            </div>
          </div>
        </Dropdown>
      </div>

      {/* ── Refresh ───────────────────────────────────────────────────── */}
      <button
        onClick={onActualizar}
        title="Recargar la escena 3D con los datos actuales"
        style={{
          alignSelf: 'center', marginLeft: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          color: T.btnText, fontSize: 16, lineHeight: 1,
          padding: '4px 6px', borderRadius: 5, transition: 'all 0.14s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = T.btnHoverText; e.currentTarget.style.background = T.rowHover; }}
        onMouseLeave={e => { e.currentTarget.style.color = T.btnText; e.currentTarget.style.background = 'none'; }}
      >
        ↻
      </button>

      {/* ── Spacer + count ────────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {modulosCount > 0 && (
        <span style={{
          alignSelf: 'center', marginRight: 8,
          fontSize: 9, fontFamily: "'DM Mono',monospace",
          color: T.textMuted,
        }}>
          {modulosCount} módulo{modulosCount !== 1 ? 's' : ''}
        </span>
      )}

      {/* ── Capturar ──────────────────────────────────────────────────── */}
      <button
        onClick={onCapturar}
        disabled={modulosCount === 0}
        style={{
          alignSelf: 'center',
          padding: '5px 14px', borderRadius: 6, cursor: modulosCount === 0 ? 'default' : 'pointer',
          background: capturado ? 'rgba(126,207,138,0.14)' : 'rgba(212,175,55,0.14)',
          border: capturado ? '1px solid rgba(126,207,138,0.48)' : `1px solid ${T.goldBord}`,
          color: capturado ? '#7ecf8a' : T.gold,
          fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700,
          letterSpacing: '0.04em',
          opacity: modulosCount === 0 ? 0.30 : 1,
          transition: 'all 0.2s',
        }}
      >
        {capturado ? '✓ Capturado' : '◈ Capturar'}
      </button>

      {/* ── Maximize ──────────────────────────────────────────────────── */}
      <button
        onClick={onMaximizar}
        title={maximizado ? 'Restaurar' : 'Pantalla completa'}
        style={{
          alignSelf: 'center', marginLeft: 6,
          padding: '5px 9px', borderRadius: 6, cursor: 'pointer',
          background: maximizado ? 'rgba(212,175,55,0.14)' : T.btnBg,
          border: maximizado ? `1px solid ${T.goldBord}` : `1px solid ${T.btnBord}`,
          color: maximizado ? T.gold : T.btnText,
          fontSize: 13, lineHeight: 1, transition: 'all 0.15s',
        }}
      >
        {maximizado ? '⤡' : '⤢'}
      </button>
    </div>
  );
}
