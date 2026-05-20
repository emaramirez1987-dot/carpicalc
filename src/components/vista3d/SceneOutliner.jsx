// SceneOutliner.jsx — Left panel: scene instances + budget breakdown
// Two sections:
//   ESCENA      — modules currently placed in the 3D scene (selectable, removable)
//   PRESUPUESTO — all budget items with calculated costs + total

import React from 'react';
import { tok } from './theme.js';
import { SectionLabel, PanelDivider, IconBtn } from './ui.jsx';
import { fmtPeso } from '../../utils.js';

// Module type display labels (data, not visual — lives here, not in theme.js)
const TIPO_LABEL = {
  aereo: 'AÉR',
  torre: 'TOR',
  bajo:  'BAJ',
  otro:  'OTR',
};

// ── Type swatch — colored square with category abbreviation ───────────────────
function TypeSwatch({ tipo, size = 28 }) {
  const T = tok();
  const tipoKey = TIPO_LABEL[tipo] ? tipo : 'otro';
  const { bg, text } = T.tipoColors[tipoKey];
  return (
    <div style={{
      width: size, height: size, borderRadius: 5, flexShrink: 0,
      background: bg,
      border: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 7, fontFamily: "'DM Mono',monospace",
      color: text, letterSpacing: '0.04em', fontWeight: 700,
    }}>
      {TIPO_LABEL[tipoKey] || 'OTR'}
    </div>
  );
}

// ── Instance row in ESCENA section ────────────────────────────────────────────
function InstanceRow({ inst, modulo, selected, onSelect, onRemove }) {
  const T = tok();
  const tipo   = modulo?.tipoVisual || 'otro';
  const nombre = modulo?.nombre || inst.codigo;
  const k      = inst.instKey
    ? ('#' + (parseInt(inst.instKey.split('#')[1]) + 1))
    : '';

  return (
    <div
      onClick={() => onSelect(inst.instanceId)}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 12px',
        cursor: 'pointer',
        background: selected ? T.rowSelected : 'transparent',
        borderLeft: selected ? `2px solid ${T.gold}` : '2px solid transparent',
        transition: 'background 0.12s, border-color 0.12s',
        userSelect: 'none',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = T.rowHover; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      <TypeSwatch tipo={tipo} size={26} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 600,
          fontFamily: "'Bricolage Grotesque', sans-serif",
          color: selected ? T.gold : T.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {nombre}
        </div>
        <div style={{
          fontSize: 9, fontFamily: "'DM Mono',monospace", color: T.textDim, marginTop: 1,
        }}>
          {inst.codigo}{k}
        </div>
      </div>

      <IconBtn
        icon="×"
        size={20}
        onClick={e => { e.stopPropagation(); onRemove(inst.instanceId); }}
        title="Quitar de la escena"
        style={{ fontSize: 14, borderRadius: 4 }}
      />
    </div>
  );
}

// ── Budget item row in PRESUPUESTO section ────────────────────────────────────
function BudgetRow({ item, modulo, onAgregar }) {
  const T   = tok();
  const keyId  = item.id || item.codigo;
  const nombre = modulo?.nombre || item.codigo;
  const dims   = item.dims;

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '5px 12px',
      gap: 8,
    }}>
      <IconBtn
        icon="+"
        size={18}
        onClick={() => onAgregar({ itemId: keyId, codigo: item.codigo, dimsOverride: {} })}
        title="Agregar a la escena"
        style={{
          background: T.snapBg,
          border: `1px solid ${T.snapBord}`,
          color: T.snapText,
          fontSize: 13,
          borderRadius: 3,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, color: T.text,
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {nombre}
          {item.cantidad > 1 && (
            <span style={{
              marginLeft: 5, fontSize: 9,
              fontFamily: "'DM Mono',monospace",
              color: T.gold,
            }}>
              ×{item.cantidad}
            </span>
          )}
        </div>
        {dims && (
          <div style={{
            fontSize: 8, fontFamily: "'DM Mono',monospace",
            color: T.textDim, marginTop: 1,
          }}>
            {dims.ancho}×{dims.alto}×{dims.profundidad}
          </div>
        )}
      </div>

      {item.costoTotal > 0 && (
        <div style={{
          fontSize: 10, fontFamily: "'DM Mono',monospace",
          color: T.textDim, flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {fmtPeso(item.costoTotal)}
        </div>
      )}
    </div>
  );
}

// ── SceneOutliner ──────────────────────────────────────────────────────────────
export function SceneOutliner({
  modulosEnEscena,
  modulos,
  itemsConCosto,
  totalPresupuesto,
  selectedCod,
  onSelect,
  onRemove,
  onAgregar,
  onLimpiar,
}) {
  const T = tok();
  const escenaCount = modulosEnEscena.length;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>

      {/* ── ESCENA section ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', paddingRight: 10,
      }}>
        <SectionLabel>
          Escena{escenaCount > 0 ? ` · ${escenaCount}` : ''}
        </SectionLabel>
        {escenaCount > 0 && (
          <button
            onClick={onLimpiar}
            title="Limpiar toda la escena"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 9, fontFamily: "'DM Mono',monospace",
              color: T.textMuted, padding: '2px 4px', borderRadius: 3,
              transition: 'color 0.12s', lineHeight: 1, outline: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = T.rmText; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; }}
          >
            × todo
          </button>
        )}
      </div>

      <div style={{ overflowY: 'auto', minHeight: 60, maxHeight: '45%' }}>
        {escenaCount === 0 ? (
          <div style={{
            padding: '12px 14px',
            fontSize: 10, fontFamily: "'DM Mono',monospace",
            color: T.empty.sub, textAlign: 'center',
          }}>
            Usá + para agregar módulos
          </div>
        ) : (
          modulosEnEscena.map(inst => {
            const mod = modulos?.[inst.codigo];
            return (
              <InstanceRow
                key={inst.instanceId}
                inst={inst}
                modulo={mod}
                selected={inst.instanceId === selectedCod}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            );
          })
        )}
      </div>

      <PanelDivider style={{ margin: '6px 0 0' }} />

      {/* ── PRESUPUESTO section ───────────────────────────────────────────── */}
      <SectionLabel>Presupuesto</SectionLabel>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {itemsConCosto.length === 0 ? (
          <div style={{
            padding: '12px 14px',
            fontSize: 10, fontFamily: "'DM Mono',monospace",
            color: T.empty.sub, textAlign: 'center',
          }}>
            No hay módulos en el presupuesto
          </div>
        ) : (
          itemsConCosto.map(item => (
            <BudgetRow
              key={item.id || item.codigo}
              item={item}
              modulo={item.modulo}
              onAgregar={onAgregar}
            />
          ))
        )}
      </div>

      {/* ── TOTAL ─────────────────────────────────────────────────────────── */}
      {totalPresupuesto > 0 && (
        <>
          <PanelDivider />
          <div style={{
            padding: '10px 14px 12px',
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: 9, fontFamily: "'DM Mono',monospace",
              color: T.section.text, letterSpacing: '0.10em', textTransform: 'uppercase',
            }}>
              Total
            </span>
            <span style={{
              fontSize: 14, fontWeight: 700,
              fontFamily: "'DM Mono',monospace",
              color: T.gold,
            }}>
              {fmtPeso(totalPresupuesto)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
