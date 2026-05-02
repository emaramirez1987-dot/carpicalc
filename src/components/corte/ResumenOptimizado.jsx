import React from 'react';
import { fmtPeso } from '../../utils.js';

export function ResumenOptimizado({ estimado, optimizado, precioPlaca }) {
  const placasAhorradas = estimado.placasNecesarias - optimizado.placasNecesarias;
  const ahorro = placasAhorradas * (precioPlaca || 0);
  const mejora = Math.round((optimizado.rendimiento - estimado.rendimiento) * 10) / 10;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 20px',
        marginBottom: 20,
        background: 'rgba(42,90,32,0.08)',
        border: '1px solid rgba(42,90,32,0.2)',
        borderRadius: 10,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 28 }}>✓</div>
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 700,
            color: 'var(--text-muted)',
            marginBottom: 6,
          }}
        >
          Optimización Completada
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Aprovechamiento:</span>{' '}
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontWeight: 700,
                color: '#2a5a20',
              }}
            >
              {optimizado.rendimiento}%
            </span>{' '}
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              (era {estimado.rendimiento}% {mejora > 0 ? `+${mejora}%` : `${mejora}%`})
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Placas optimales:</span>{' '}
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontWeight: 700,
                color: '#2a5a20',
              }}
            >
              {optimizado.placasNecesarias}
            </span>{' '}
            {placasAhorradas > 0 && (
              <span style={{ color: '#2a5a20', fontSize: 11, fontWeight: 700 }}>
                (ahorras {placasAhorradas} placa{placasAhorradas !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          {ahorro > 0 && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Ahorro estimado:</span>{' '}
              <span
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontWeight: 900,
                  color: '#2a5a20',
                  fontSize: 14,
                }}
              >
                {fmtPeso(Math.round(ahorro))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResumenOptimizado;
