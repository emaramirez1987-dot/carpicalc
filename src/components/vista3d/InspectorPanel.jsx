// InspectorPanel.jsx — Right panel: selected module properties
// Shows when a scene instance is selected. Contains:
//   • Module name + code (read-only; rotate/delete live as overlays in the 3D viewport)
//   • DIMENSIONES — A/H/P readOnly inputs (path prepared for editing)
//   • PARÁMETROS — ConfiguradorParametrico (if module has params)
//   • MATERIAL — MaterialGallery

import React from 'react';
import { tok } from './theme.js';
import { SectionLabel, PanelDivider } from './ui.jsx';
import { MaterialGallery } from './MaterialGallery.jsx';
import ConfiguradorParametrico from '../presupuesto/ConfiguradorParametrico.jsx';

// ── Dimension input field — one row: label left, input right ──────────────────
function DimInput({ campo, label, value }) {
  const T = tok();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
      <span style={{
        fontSize: 9, fontFamily: "'DM Mono',monospace",
        color: T.section.text, letterSpacing: '0.08em',
        textTransform: 'uppercase', flexShrink: 0, width: 52,
      }}>
        {label}
      </span>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
        <input
          type="number"
          data-campo={campo}
          value={value}
          readOnly
          style={{
            width: '100%',
            padding: '6px 26px 6px 10px',
            background: T.inputBg,
            border: `1px solid ${T.inputBord}`,
            borderRadius: 6,
            color: T.inputText,
            fontFamily: "'DM Mono',monospace",
            fontSize: 12,
            fontWeight: 600,
            outline: 'none',
            cursor: 'default',
            boxSizing: 'border-box',
          }}
        />
        <span style={{
          position: 'absolute', right: 7,
          fontSize: 7, fontFamily: "'DM Mono',monospace",
          color: T.textDim, pointerEvents: 'none',
          letterSpacing: '0.04em',
        }}>
          mm
        </span>
      </div>
    </div>
  );
}

// ── Empty state (nothing selected) ────────────────────────────────────────────
function EmptyInspector() {
  const T = tok();
  return (
    <div style={{
      flex: 1,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', gap: 10,
    }}>
      <div style={{ fontSize: 24, opacity: 0.3, color: T.empty.icon }}>◈</div>
      <p style={{
        fontSize: 11, fontFamily: "'DM Mono',monospace",
        color: T.empty.sub, textAlign: 'center', margin: 0, lineHeight: 1.6,
      }}>
        Seleccioná un módulo<br />en la escena
      </p>
    </div>
  );
}

// ── InspectorPanel ─────────────────────────────────────────────────────────────
export function InspectorPanel({
  selectedInst,
  modulo,
  dims,
  items,
  costos,
  biblioteca,
  materialIdActual,
  onAsignarMaterial,
  // onRotar / onEliminar — handled as overlays in the 3D viewport, not shown here
  // eslint-disable-next-line no-unused-vars
  onRotar,
  // eslint-disable-next-line no-unused-vars
  onEliminar,
  onSetParametros,
  texturaRepeat,
  onTexturaRepeat,
  // onDimChange — received for future wiring, not yet connected to inputs
  // eslint-disable-next-line no-unused-vars
  onDimChange,
}) {
  const T = tok();

  if (!selectedInst || !modulo) {
    return <EmptyInspector />;
  }

  const tieneParams = (modulo.parametros?.length || 0) > 0;
  const itemIdx = selectedInst.itemIdx;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflowY: 'auto', overflowX: 'hidden',
    }}>

      {/* ── Header: module code + name ────────────────────────────────── */}
      <div style={{ padding: '12px 14px 12px', flexShrink: 0 }}>
        <div style={{
          fontSize: 9, fontFamily: "'DM Mono',monospace",
          color: T.textDim, letterSpacing: '0.08em',
          marginBottom: 4,
        }}>
          {modulo.codigo || selectedInst.codigo}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700,
          fontFamily: "'Bricolage Grotesque', sans-serif",
          color: T.text, lineHeight: 1.2,
        }}>
          {modulo.nombre}
        </div>
      </div>

      <PanelDivider />

      {/* ── DIMENSIONES ───────────────────────────────────────────────── */}
      {dims && (
        <div style={{ flexShrink: 0 }}>
          <SectionLabel>Dimensiones</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '4px 0 12px' }}>
            <DimInput campo="ancho"       label="Ancho"  value={dims.ancho} />
            <DimInput campo="alto"        label="Alto"   value={dims.alto} />
            <DimInput campo="profundidad" label="Prof."  value={dims.profundidad} />
          </div>
        </div>
      )}

      {/* ── PARÁMETROS ────────────────────────────────────────────────── */}
      {tieneParams && itemIdx != null && (
        <>
          <PanelDivider />
          <div style={{ flexShrink: 0 }}>
            <SectionLabel>Parámetros</SectionLabel>
            <div style={{ padding: '0 12px 12px' }}>
              <ConfiguradorParametrico
                modulo={modulo}
                valores={items[itemIdx]?.parametrosValores || {}}
                onChange={(v) => onSetParametros(itemIdx, v)}
                costos={costos}
              />
            </div>
          </div>
        </>
      )}

      {/* ── MATERIAL ──────────────────────────────────────────────────── */}
      {biblioteca.length > 0 && itemIdx != null && (
        <>
          <PanelDivider />
          <MaterialGallery
            biblioteca={biblioteca}
            materialIdActual={materialIdActual}
            onAsignar={onAsignarMaterial}
            texturaRepeat={texturaRepeat}
            onTexturaRepeat={onTexturaRepeat}
          />
        </>
      )}

      {/* Bottom padding */}
      <div style={{ height: 16, flexShrink: 0 }} />
    </div>
  );
}
