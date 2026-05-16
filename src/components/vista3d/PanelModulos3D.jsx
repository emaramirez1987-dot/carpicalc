import React from 'react';

// PanelModulos3D
// Left panel — lists modules from the active budget and allows adding them to the scene.

export function PanelModulos3D({ items, modulos, inlineModulos, dimOverride, onAgregar }) {
  if (!items || items.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 12, padding: '24px 16px', color: 'var(--text-muted)',
      }}>
        <div style={{ fontSize: 28, opacity: 0.4 }}>◈</div>
        <p style={{ fontSize: 12, textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
          Cargá un presupuesto para ver los módulos
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', flex: 1 }}>
      <div style={{
        padding: '12px 14px 8px',
        fontSize: 9,
        fontFamily: "'DM Mono',monospace",
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.10em',
        color: 'var(--text-muted)',
        borderBottom: '1px solid var(--border)',
      }}>
        Módulos del presupuesto
      </div>

      {items.map((item) => {
        const keyId = item.id || item.codigo;
        const inline = inlineModulos?.[keyId];
        const base = modulos?.[item.codigo];
        const mod = inline ?? base;
        if (!mod) return null;

        const over = dimOverride?.[keyId] || {};
        const dims = {
          ancho:       over.ancho       ?? mod.dimensiones?.ancho       ?? 600,
          alto:        over.alto        ?? mod.dimensiones?.alto        ?? 700,
          profundidad: over.profundidad ?? mod.dimensiones?.profundidad ?? 550,
        };

        // Color swatch by tipoVisual
        const tipo = mod.tipoVisual || 'bajo';
        const swatchColor = tipo === 'aereo' ? '#4a6fa5' : tipo === 'torre' ? '#5a7a5a' : '#7a5a4a';
        const tipoLabel   = tipo === 'aereo' ? 'AÉR' : tipo === 'torre' ? 'TOR' : 'BAJ';

        return (
          <div
            key={item.id || item.codigo}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px',
              borderBottom: '1px solid var(--border)',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Color swatch representing type */}
            <div style={{
              width: 36, height: 36, borderRadius: 5, flexShrink: 0,
              background: swatchColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontFamily: "'DM Mono',monospace", fontWeight: 700,
              color: 'rgba(255,255,255,0.75)',
              letterSpacing: '0.05em',
            }}>
              {tipoLabel}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {mod.nombre}
              </div>
              <div style={{
                fontSize: 10, fontFamily: "'DM Mono',monospace",
                color: 'var(--text-muted)', marginTop: 1,
              }}>
                {dims.ancho}×{dims.alto}×{dims.profundidad} mm
                {item.cantidad > 1 && (
                  <span style={{ marginLeft: 5, color: '#D4AF37' }}>×{item.cantidad}</span>
                )}
              </div>
            </div>

            {/* Add button */}
            <button
              // Pasar SOLO los overrides reales del presupuesto, no las dims completas.
              // Si pasamos `dims` (con todas las dimensiones rellenadas desde el módulo),
              // cualquier edición posterior del módulo en el catálogo queda enmascarada
              // porque el "override" siempre gana sobre `modBase.dimensiones`.
              onClick={() => onAgregar?.({ codigo: item.codigo, cantidad: item.cantidad, dimsOverride: over })}
              title="Agregar a la escena"
              style={{
                width: 26, height: 26, borderRadius: 5, cursor: 'pointer', flexShrink: 0,
                background: 'rgba(212,175,55,0.10)',
                border: '1px solid rgba(212,175,55,0.35)',
                color: '#D4AF37',
                fontSize: 16, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.22)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.10)'; }}
            >
              +
            </button>
          </div>
        );
      })}
    </div>
  );
}
