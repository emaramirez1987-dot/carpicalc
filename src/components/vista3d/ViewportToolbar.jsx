// ViewportToolbar.jsx — Top toolbar for Vista 3D
// All visual primitives from ui.jsx + icons.jsx.
// No inline SVGs, no hardcoded colors, no local button definitions.
//
// Layout: [View presets] | [Scene toggles] | [Lighting ▾] [↻] | spacer | [count] [Capturar] [⤢]

import React from 'react';
import { tok } from './theme.js';
import { ToolbarBtn, ToolbarDropdown, IconBtn, TDivider } from './ui.jsx';
import { BTN, DropItem, ColorToggle } from './tokens.js';
import {
  IsoIcon, FrontIcon, SideIcon, TopIcon,
  GridIcon, LightIcon, RefreshIcon,
  MaximizeIcon, MinimizeIcon,
} from './icons.jsx';
import { CAMARAS } from '../visor3d/CamaraPresets.js';

// View preset definitions — order determines render order
const VIEW_PRESETS = [
  { key: 'iso',   Icon: IsoIcon,   label: 'ISO'   },
  { key: 'front', Icon: FrontIcon, label: 'FRONT' },
  { key: 'side',  Icon: SideIcon,  label: 'SIDE'  },
  { key: 'top',   Icon: TopIcon,   label: 'TOP'   },
];

// ── ViewportToolbar ────────────────────────────────────────────────────────────
export function ViewportToolbar({
  // Camera
  camView, onCameraPreset,
  // Scene visibility
  mostrarPiso,     setMostrarPiso,    colorPiso,     setColorPiso,
  mostrarPared,    setMostrarPared,   colorPared,    setColorPared,
  mostrarParedIzq, setMostrarParedIzq,
  mostrarParedDer, setMostrarParedDer,
  mostrarMesada,   setMostrarMesada,  colorMesada,   setColorMesada,
  mostrarGrilla,   setMostrarGrilla,
  mostrarContornos, setMostrarContornos,
  colorContornos,   setColorContornos,
  grosorContornos,  setGrosorContornos,
  // Lighting
  shadowIntensidad, setShadowIntensidad,
  shadowAngle,      setShadowAngle,
  // Actions
  onActualizar,
  capturado, onCapturar,
  maximizado, onMaximizar,
  modulosCount,
}) {
  const T = tok();
  const tb = T.toolbar;

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 0,
      padding: '0 10px',
      background: tb.bg,
      boxShadow: tb.shadow,
      borderBottom: `1px solid ${tb.border}`,
      minHeight: tb.height,
      flexShrink: 0,
      zIndex: 10,
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      transition: 'background 0.35s ease',
    }}>

      {/* ── View presets — exclusive group ─────────────────────────────── */}
      {VIEW_PRESETS.map(({ key, Icon, label }) => (
        <ToolbarBtn
          key={key}
          variant="exclusive"
          icon={<Icon size={tb.iconSize} />}
          label={label}
          active={camView === key}
          onClick={() => onCameraPreset(key)}
          title={CAMARAS[key]?.label || label}
        />
      ))}

      <TDivider />

      {/* ── Scene toggles ──────────────────────────────────────────────── */}

      {/* Piso — toggle + color picker */}
      <ColorToggle
        value={mostrarPiso} onToggle={() => setMostrarPiso(v => !v)}
        color={colorPiso} onColor={setColorPiso} label="Piso"
      />

      {/* Paredes — dropdown: back wall + left + right */}
      <ToolbarDropdown
        label="Paredes"
        active={mostrarPared || mostrarParedIzq || mostrarParedDer}
      >
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
      </ToolbarDropdown>

      {/* Mesada — toggle + color picker */}
      <ColorToggle
        value={mostrarMesada} onToggle={() => setMostrarMesada(v => !v)}
        color={colorMesada} onColor={setColorMesada} label="Mesada"
      />

      {/* Grilla — simple toggle */}
      <ToolbarBtn
        variant="toggle"
        icon={<GridIcon size={tb.iconSize} />}
        label="Grilla"
        active={mostrarGrilla}
        onClick={() => setMostrarGrilla(v => !v)}
      />

      {/* Contornos — dropdown: toggle + color + stroke weight */}
      <ToolbarDropdown label="Contornos" active={mostrarContornos}>
        <DropItem
          active={mostrarContornos}
          onClick={() => setMostrarContornos(v => !v)}
        >
          {mostrarContornos ? '✓ ' : ''}Mostrar contornos
        </DropItem>
        {mostrarContornos && (
          <>
            <div style={{ height: 1, background: tb.divider, margin: '3px 0' }} />
            <div style={{ padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 10, fontFamily: "'DM Mono',monospace", color: T.btn.text,
              }}>
                Color
              </span>
              <input
                type="color"
                value={colorContornos}
                onChange={e => setColorContornos(e.target.value)}
                style={{
                  width: 28, height: 22, padding: 0,
                  border: 'none', background: 'transparent', cursor: 'pointer',
                }}
              />
            </div>
            <div style={{ height: 1, background: tb.divider, margin: '3px 0' }} />
            {[[1, 'Fino · 1px'], [2, 'Medio · 2px'], [3, 'Grueso · 3px']].map(([g, lbl]) => (
              <DropItem
                key={g}
                active={grosorContornos === g}
                onClick={() => setGrosorContornos(g)}
              >
                {lbl}
              </DropItem>
            ))}
          </>
        )}
      </ToolbarDropdown>

      <TDivider />

      {/* ── Lighting dropdown ──────────────────────────────────────────── */}
      <ToolbarDropdown
        label={<><LightIcon size={tb.iconSize} /> Luz</>}
        active={false}
      >
        <div style={{
          padding: '10px 12px',
          display: 'flex', flexDirection: 'column', gap: 10,
          minWidth: 170,
        }}>
          <div>
            <div style={{
              fontSize: 8, fontFamily: "'DM Mono',monospace",
              color: T.textDim, letterSpacing: '0.08em', marginBottom: 5,
            }}>
              ÁNGULO · {shadowAngle}°
            </div>
            <input
              type="range" min={0} max={359} step={1}
              value={shadowAngle}
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
      </ToolbarDropdown>

      {/* ── Refresh ────────────────────────────────────────────────────── */}
      <IconBtn
        icon={<RefreshIcon size={tb.iconSize} />}
        onClick={onActualizar}
        title="Recargar la escena 3D"
        style={{ alignSelf: 'center', marginLeft: 4 }}
      />

      {/* ── Spacer ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Module count ───────────────────────────────────────────────── */}
      {modulosCount > 0 && (
        <span style={{
          alignSelf: 'center', marginRight: 8,
          fontSize: 9, fontFamily: "'DM Mono',monospace",
          color: T.textMuted,
        }}>
          {modulosCount} módulo{modulosCount !== 1 ? 's' : ''}
        </span>
      )}

      {/* ── Capturar ───────────────────────────────────────────────────── */}
      {/* Special two-state button: idle (gold) → captured (success green). */}
      {/* Uses T.success / T.toolbar tokens — no hardcoded colors. */}
      <button
        onClick={onCapturar}
        disabled={modulosCount === 0}
        style={{
          alignSelf: 'center',
          padding: '5px 14px',
          borderRadius: 6,
          cursor: modulosCount === 0 ? 'default' : 'pointer',
          background: capturado ? T.success.bg     : tb.activeBg,
          border:     capturado ? `1px solid ${T.success.border}` : `1px solid ${tb.activeBorder}`,
          color:      capturado ? T.success.text   : tb.activeText,
          fontSize: 11,
          fontFamily: "'DM Mono',monospace",
          fontWeight: 700,
          letterSpacing: '0.04em',
          opacity: modulosCount === 0 ? 0.30 : 1,
          transition: 'all 0.2s',
          outline: 'none',
          lineHeight: 1,
        }}
      >
        {capturado ? '✓ Capturado' : '◈ Capturar'}
      </button>

      {/* ── Maximize / restore ─────────────────────────────────────────── */}
      <IconBtn
        icon={maximizado ? <MinimizeIcon size={tb.iconSize} /> : <MaximizeIcon size={tb.iconSize} />}
        onClick={onMaximizar}
        title={maximizado ? 'Restaurar' : 'Pantalla completa'}
        active={maximizado}
        style={{ alignSelf: 'center', marginLeft: 6 }}
      />
    </div>
  );
}
