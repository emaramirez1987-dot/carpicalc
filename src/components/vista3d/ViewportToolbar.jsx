// ViewportToolbar.jsx — Top toolbar for Vista 3D
// All visual primitives from ui.jsx + icons.jsx.
// No inline SVGs, no hardcoded colors, no local button definitions.
//
// Layout: [View presets] | [Scene toggles] | [Lighting ▾] [↻] | spacer | [count] [Capturar] [⤢]

import React from 'react';
import { tok } from './theme.js';
import { ToolbarBtn, ToolbarColorToggle, ToolbarDropdown, DropItem, ColorToggle, IconBtn, TDivider } from './ui.jsx';
import {
  IsoIcon, FrontIcon, SideIcon, TopIcon,
  FloorIcon, MesadaIcon,
  GridIcon, LightIcon, RefreshIcon,
  MaximizeIcon, MinimizeIcon,
  WallsIcon, ContourIcon,
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
      padding: '0 12px',
      background: tb.bg,
      boxShadow: tb.capsuleShadow,
      border: `1px solid ${tb.border}`,
      borderRadius: 14,
      minHeight: tb.height,
      flexShrink: 0,
      zIndex: 10,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      transition: 'background 0.35s ease',
    }}>

      {/* ── View presets — exclusive group — icon only, title tooltip ────── */}
      {VIEW_PRESETS.map(({ key, Icon, label }) => (
        <ToolbarBtn
          key={key}
          variant="exclusive"
          icon={<Icon size={tb.iconSize} />}
          active={camView === key}
          onClick={() => onCameraPreset(key)}
          title={CAMARAS[key]?.label || label}
        />
      ))}

      <TDivider />

      {/* ── Scene toggles — icon only, title tooltip ───────────────────── */}

      {/* Piso — toggle + color picker */}
      <ToolbarColorToggle
        icon={<FloorIcon size={tb.iconSize} />}
        value={mostrarPiso} onToggle={() => setMostrarPiso(v => !v)}
        color={colorPiso} onColor={setColorPiso} title="Piso"
      />

      {/* Paredes — dropdown: back wall + left + right */}
      <ToolbarDropdown
        icon={<WallsIcon size={tb.iconSize} />}
        title="Paredes"
        active={mostrarPared || mostrarParedIzq || mostrarParedDer}
      >
        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ColorToggle
            value={mostrarPared} onToggle={() => setMostrarPared(v => !v)}
            color={colorPared} onColor={setColorPared} label="Trasera"
          />
          <DropItem active={mostrarParedIzq} onClick={() => setMostrarParedIzq(v => !v)}>
            Izquierda
          </DropItem>
          <DropItem active={mostrarParedDer} onClick={() => setMostrarParedDer(v => !v)}>
            Derecha
          </DropItem>
        </div>
      </ToolbarDropdown>

      {/* Mesada — toggle + color picker */}
      <ToolbarColorToggle
        icon={<MesadaIcon size={tb.iconSize} />}
        value={mostrarMesada} onToggle={() => setMostrarMesada(v => !v)}
        color={colorMesada} onColor={setColorMesada} title="Mesada"
      />

      {/* Grilla — simple toggle */}
      <ToolbarBtn
        variant="toggle"
        icon={<GridIcon size={tb.iconSize} />}
        active={mostrarGrilla}
        onClick={() => setMostrarGrilla(v => !v)}
        title="Grilla"
      />

      {/* Contornos — dropdown: toggle + color + stroke weight */}
      <ToolbarDropdown icon={<ContourIcon size={tb.iconSize} />} title="Contornos" active={mostrarContornos}>
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
        icon={<LightIcon size={tb.iconSize} />}
        title="Iluminación"
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

      {/* ── Spacer — pushes right group to the edge ────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Right group: count · Capturar · maximize ───────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        borderLeft: `1px solid ${tb.divider}`,
        paddingLeft: 10, marginLeft: 4,
      }}>

        {/* Module count — only when scene has content */}
        {modulosCount > 0 && (
          <span style={{
            fontSize: 9, fontFamily: "'DM Mono',monospace",
            color: T.textMuted, letterSpacing: '0.05em',
          }}>
            {modulosCount}
          </span>
        )}

        {/* Capturar — gold camera icon, same size as maximize button */}
        {/* Two-state: idle (gold) → captured (success green). */}
        <IconBtn
          icon={capturado
            ? <svg width={tb.iconSize} height={tb.iconSize} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5.5C2 4.7 2.7 4 3.5 4H4l1-1.5h6L12 4h.5C13.3 4 14 4.7 14 5.5v6c0 .8-.7 1.5-1.5 1.5h-9C2.7 13 2 12.3 2 11.5v-6Z"/><circle cx="8" cy="8.5" r="2"/><path d="M6 6l1 1" strokeWidth="1" opacity="0.6"/></svg>
            : <svg width={tb.iconSize} height={tb.iconSize} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5.5C2 4.7 2.7 4 3.5 4H4l1-1.5h6L12 4h.5C13.3 4 14 4.7 14 5.5v6c0 .8-.7 1.5-1.5 1.5h-9C2.7 13 2 12.3 2 11.5v-6Z"/><circle cx="8" cy="8.5" r="2"/></svg>
          }
          onClick={modulosCount === 0 ? undefined : onCapturar}
          title={capturado ? 'Vista capturada — clic para recapturar' : 'Capturar vista 3D'}
          style={{
            opacity: modulosCount === 0 ? 0.28 : 1,
            background: capturado ? T.success.bg                    : tb.activeBg,
            border:     capturado ? `1px solid ${T.success.border}` : `1px solid ${tb.activeBorder}`,
            color:      capturado ? T.success.text                  : tb.activeText,
          }}
        />

        {/* Maximize / restore — always on the far right edge */}
        <IconBtn
          icon={maximizado ? <MinimizeIcon size={tb.iconSize} /> : <MaximizeIcon size={tb.iconSize} />}
          onClick={onMaximizar}
          title={maximizado ? 'Restaurar' : 'Pantalla completa'}
          active={maximizado}
        />
      </div>
    </div>
  );
}
