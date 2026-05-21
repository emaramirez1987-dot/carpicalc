// InspectorObjeto.jsx
// Panel de propiedades del objeto de ambiente seleccionado. Vive en la columna
// derecha (slot del Inspector) cuando hay un objeto de escenografía activo.
// Permite escala manual, rotación y eliminar. No toca costos.

import React from 'react';
import { tok } from '../theme.js';
import { SectionLabel, PanelDivider } from '../ui.jsx';

const ROT_STEP = Math.PI / 12; // 15°
const ESC_MIN = 0.25;
const ESC_MAX = 3;

function EmptyObjeto() {
  const T = tok();
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', gap: 10,
    }}>
      <div style={{ fontSize: 22, opacity: 0.3, color: T.empty.icon }}>◫</div>
      <p style={{
        fontSize: 11, fontFamily: "'DM Mono',monospace",
        color: T.empty.sub, textAlign: 'center', margin: 0, lineHeight: 1.6,
      }}>
        Seleccioná un objeto<br />de ambiente
      </p>
    </div>
  );
}

export function InspectorObjeto({ objeto, inst, onEscalar, onRotar, onEliminar }) {
  const T = tok();

  if (!objeto || !inst) return <EmptyObjeto />;

  const scale = inst.transform?.scale ?? 1;

  const btn = (extra) => ({
    flex: 1, padding: '7px 0',
    fontSize: 9, fontFamily: "'DM Mono',monospace",
    letterSpacing: '0.06em', textTransform: 'uppercase',
    background: T.inputBg, border: `1px solid ${T.inputBord}`,
    borderRadius: 6, color: T.inputText, cursor: 'pointer',
    ...extra,
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
    }}>

      {/* Header */}
      <div style={{ padding: '12px 14px 12px', flexShrink: 0 }}>
        <div style={{
          fontSize: 9, fontFamily: "'DM Mono',monospace",
          color: T.textDim, letterSpacing: '0.08em', marginBottom: 4,
        }}>
          {objeto.categoria}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700,
          fontFamily: "'Bricolage Grotesque', sans-serif",
          color: T.text, lineHeight: 1.2,
        }}>
          {objeto.nombre}
        </div>
      </div>

      <PanelDivider />

      {/* Escala */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          padding: '0 14px',
        }}>
          <SectionLabel>Escala</SectionLabel>
          <span style={{
            fontSize: 11, fontWeight: 700,
            fontFamily: "'DM Mono',monospace", color: T.accent,
          }}>
            {Math.round(scale * 100)}%
          </span>
        </div>
        <div style={{ padding: '4px 14px 12px' }}>
          <input
            type="range"
            min={ESC_MIN} max={ESC_MAX} step={0.05}
            value={scale}
            onChange={(e) => onEscalar(inst.instanceId, Number(e.target.value))}
            style={{ width: '100%', accentColor: T.accent, cursor: 'pointer' }}
          />
          <button
            onClick={() => onEscalar(inst.instanceId, 1)}
            style={{
              marginTop: 6, padding: '4px 8px',
              fontSize: 8, fontFamily: "'DM Mono',monospace",
              letterSpacing: '0.06em', textTransform: 'uppercase',
              background: 'transparent', border: `1px solid ${T.inputBord}`,
              borderRadius: 5, color: T.textDim, cursor: 'pointer',
            }}
          >
            Restablecer 100%
          </button>
        </div>
      </div>

      <PanelDivider />

      {/* Rotación */}
      <div style={{ flexShrink: 0 }}>
        <SectionLabel>Rotación</SectionLabel>
        <div style={{ display: 'flex', gap: 6, padding: '4px 14px 12px' }}>
          <button style={btn()} onClick={() => onRotar(inst.instanceId, -ROT_STEP)}>↺ 15°</button>
          <button style={btn()} onClick={() => onRotar(inst.instanceId, ROT_STEP)}>15° ↻</button>
        </div>
      </div>

      <PanelDivider />

      {/* Eliminar */}
      <div style={{ flexShrink: 0, padding: '10px 14px 14px' }}>
        <button
          style={btn({
            background: T.rmBg, border: `1px solid ${T.rmBord}`, color: T.rmText,
          })}
          onClick={() => onEliminar(inst.instanceId)}
        >
          Quitar objeto
        </button>
      </div>
    </div>
  );
}
