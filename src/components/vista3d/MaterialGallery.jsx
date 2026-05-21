// MaterialGallery.jsx — Visual material picker for InspectorPanel
// Replaces the <select> element: cards with PNG thumbnail or color swatch,
// name, and price/m². Grouped by tipo with collapsible section headers.

import React, { useMemo, useState } from 'react';
import { tok } from './theme.js';
import { SectionLabel } from './ui.jsx';
import { fmtPeso } from '../../utils.js';

// ── Individual material card ───────────────────────────────────────────────────
function MaterialCard({ selected, onClick, thumbnail, bgColor, nombre, precio }) {
  const T = tok();

  return (
    <button
      onClick={onClick}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = T.rowHover; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = T.matBg; }}
      title={nombre}
      style={{
        background: selected ? T.toolbar.activeBg : T.matBg,
        border: selected
          ? `1.5px solid ${T.toolbar.activeBorder}`
          : `1px solid ${T.matBord}`,
        borderRadius: 7,
        padding: '4px 4px 5px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        transition: 'all 0.14s',
        textAlign: 'center',
        minWidth: 0,
        outline: 'none',
      }}
    >
      {/* Thumbnail — PNG texture or color swatch */}
      <div style={{
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: 4,
        overflow: 'hidden',
        background: bgColor || T.label,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : precio == null ? (
          <span style={{ fontSize: 13, color: selected ? T.toolbar.activeText : T.textDim, opacity: 0.7 }}>◈</span>
        ) : null}
      </div>

      {/* Material name */}
      <div style={{
        fontSize: 9,
        fontFamily: "'DM Mono',monospace",
        fontWeight: selected ? 600 : 500,
        color: selected ? T.toolbar.activeText : T.text,
        lineHeight: 1.25,
        width: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {nombre}
      </div>

      {/* Price — only for real materials */}
      {precio != null && (
        <div style={{
          fontSize: 8,
          fontFamily: "'DM Mono',monospace",
          color: T.textDim,
          lineHeight: 1,
        }}>
          {fmtPeso(precio)}/m²
        </div>
      )}
    </button>
  );
}

// ── Collapsible group header ───────────────────────────────────────────────────
function GroupHeader({ label, open, onToggle, count }) {
  const T = tok();
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 0 3px', margin: 0, outline: 'none',
      }}
    >
      <span style={{
        fontSize: 8, fontFamily: "'DM Mono',monospace",
        color: T.section.text, letterSpacing: '0.10em', textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <span style={{ fontSize: 7, color: T.textDim, marginLeft: 4 }}>
        {count} {open ? '▴' : '▾'}
      </span>
    </button>
  );
}

// ── MaterialGallery ────────────────────────────────────────────────────────────
export function MaterialGallery({ biblioteca, materialIdActual, onAsignar, texturaRepeat, onTexturaRepeat }) {
  const T = tok();

  const materialesPorTipo = useMemo(() => {
    const g = {};
    for (const m of biblioteca) {
      const t = m.tipo || 'otro';
      (g[t] || (g[t] = [])).push(m);
    }
    for (const t of Object.keys(g)) {
      g[t].sort((a, b) => (a.nombre || a.codigo || '').localeCompare(b.nombre || b.codigo || ''));
    }
    return g;
  }, [biblioteca]);

  const [collapsed, setCollapsed] = useState({});
  const toggleGroup = (tipo) => setCollapsed(prev => ({ ...prev, [tipo]: !prev[tipo] }));

  const materialElegido = materialIdActual
    ? biblioteca.find(m => m.id === materialIdActual) || null
    : null;

  const isDefault = !materialIdActual;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      <SectionLabel style={{ paddingTop: 8 }}>Material</SectionLabel>

      <div style={{ padding: '0 12px 8px' }}>

        {/* "Default del módulo" — full-width special card */}
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => onAsignar(null)}
            title="Usar el material por defecto del módulo"
            style={{
              width: '100%',
              background: isDefault ? T.toolbar.activeBg : T.matBg,
              border: isDefault
                ? `1.5px solid ${T.toolbar.activeBorder}`
                : `1px solid ${T.matBord}`,
              borderRadius: 7,
              padding: '7px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.14s',
              outline: 'none',
            }}
          >
            <span style={{
              fontSize: 12, opacity: 0.8,
              color: isDefault ? T.toolbar.activeText : T.textDim,
            }}>
              ◈
            </span>
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: 10, fontFamily: "'DM Mono',monospace",
                color: isDefault ? T.toolbar.activeText : T.text,
                fontWeight: 500,
              }}>
                Default del módulo
              </div>
              <div style={{
                fontSize: 8, fontFamily: "'DM Mono',monospace",
                color: T.textDim, marginTop: 1,
              }}>
                Definido en el catálogo
              </div>
            </div>
          </button>
        </div>

        {/* Materials grouped by tipo */}
        {Object.entries(materialesPorTipo).map(([tipo, lista]) => (
          <div key={tipo} style={{ marginBottom: 8 }}>
            <GroupHeader
              label={tipo}
              count={lista.length}
              open={!collapsed[tipo]}
              onToggle={() => toggleGroup(tipo)}
            />
            {!collapsed[tipo] && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 5,
                marginTop: 4,
              }}>
                {lista.map(m => (
                  <MaterialCard
                    key={m.id}
                    selected={m.id === materialIdActual}
                    onClick={() => onAsignar(m.id)}
                    thumbnail={m.textura || null}
                    bgColor={m.color || null}
                    nombre={m.nombre || m.codigo || 'Sin nombre'}
                    precio={m.precioM2 ?? null}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Selected material info + texture scale */}
        {materialElegido && (
          <div style={{
            marginTop: 4,
            padding: '8px 10px',
            background: T.rowSelected,
            border: `1px solid ${T.goldBord}`,
            borderRadius: 7,
          }}>
            <div style={{
              fontSize: 9, fontFamily: "'DM Mono',monospace",
              color: T.gold, marginBottom: 2,
            }}>
              {fmtPeso(materialElegido.precioM2)}/m²
              {materialElegido.espesor ? ` · ${materialElegido.espesor}mm` : ''}
              {materialElegido.textura ? ' · textura PNG' : ''}
            </div>

            {materialElegido.textura && (
              <div style={{ marginTop: 8 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 8, fontFamily: "'DM Mono',monospace",
                  color: T.textDim, marginBottom: 5,
                }}>
                  <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Escala textura
                  </span>
                  <span style={{ color: T.gold }}>×{texturaRepeat.toFixed(1)}</span>
                </div>
                <input
                  type="range" min={0.25} max={4} step={0.05}
                  value={texturaRepeat}
                  onChange={e => onTexturaRepeat(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: T.accent, cursor: 'pointer' }}
                />
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 7, fontFamily: "'DM Mono',monospace",
                  color: T.textMuted, marginTop: 2,
                }}>
                  {['0.25', '0.50', '1.00', '2.00', '4.00'].map(v => (
                    <span key={v}>{v}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {biblioteca.length === 0 && (
          <div style={{
            padding: '16px 0', textAlign: 'center',
            fontSize: 10, fontFamily: "'DM Mono',monospace", color: T.textDim,
          }}>
            No hay materiales en la biblioteca
          </div>
        )}
      </div>
    </div>
  );
}
