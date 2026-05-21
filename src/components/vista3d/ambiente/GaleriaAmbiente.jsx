// GaleriaAmbiente.jsx
// Panel de galería de la biblioteca curada de objetos 3D de ambiente.
// Click en una card → agrega el objeto a la escena. No toca costos.

import React from 'react';
import { tok } from '../theme.js';
import { agruparPorCategoria } from '../../../services/ambienteService.js';

// Placeholder cuando el objeto no tiene thumbnail (stand-ins de desarrollo).
function Miniatura({ objeto, T }) {
  if (objeto.thumbnailUrl) {
    return (
      <img
        src={objeto.thumbnailUrl}
        alt={objeto.nombre}
        style={{ width: '100%', height: 56, objectFit: 'cover', display: 'block' }}
      />
    );
  }
  return (
    <div style={{
      width: '100%', height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: T.inputBg,
      color: T.textMuted, fontSize: 20,
    }}>
      ◫
    </div>
  );
}

function Card({ objeto, onAgregar, T }) {
  return (
    <button
      onClick={() => onAgregar(objeto.id)}
      title={`Agregar ${objeto.nombre}`}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accent; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.inputBord; }}
      style={{
        display: 'flex', flexDirection: 'column',
        padding: 0, overflow: 'hidden',
        background: T.inputBg,
        border: `1px solid ${T.inputBord}`,
        borderRadius: 7, cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      <Miniatura objeto={objeto} T={T} />
      <span style={{
        padding: '5px 6px',
        fontSize: 9, fontFamily: "'DM Mono',monospace",
        color: T.text, textAlign: 'left', lineHeight: 1.3,
      }}>
        {objeto.nombre}
      </span>
    </button>
  );
}

export function GaleriaAmbiente({ catalogo, onAgregar, onCerrar }) {
  const T = tok();
  const grupos = agruparPorCategoria(catalogo);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: 244, height: '100%',
      background: T.panelBg,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      boxShadow: T.cardShadow,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 12px', flexShrink: 0,
        borderBottom: `1px solid ${T.divider}`,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          fontFamily: "'Bricolage Grotesque',sans-serif",
          color: T.text,
        }}>
          Objetos de ambiente
        </span>
        <button
          onClick={onCerrar}
          title="Cerrar galería"
          style={{
            width: 22, height: 22, borderRadius: 5,
            background: 'transparent', border: `1px solid ${T.border}`,
            color: T.textDim, cursor: 'pointer', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 0 12px' }}>
        {catalogo.length === 0 && (
          <p style={{
            fontSize: 10, fontFamily: "'DM Mono',monospace",
            color: T.emptySub, textAlign: 'center', padding: '24px 16px', margin: 0,
          }}>
            Sin objetos en la biblioteca
          </p>
        )}
        {Object.entries(grupos).map(([categoria, objetos]) => (
          <div key={categoria} style={{ marginBottom: 4 }}>
            <div style={{
              fontSize: 8, fontFamily: "'DM Mono',monospace",
              color: T.textMuted, letterSpacing: '0.10em',
              textTransform: 'uppercase',
              padding: '10px 12px 6px',
            }}>
              {categoria}
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 6, padding: '0 12px',
            }}>
              {objetos.map((obj) => (
                <Card key={obj.id} objeto={obj} onAgregar={onAgregar} T={T} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div style={{
        flexShrink: 0, padding: '8px 12px',
        borderTop: `1px solid ${T.divider}`,
        fontSize: 8, fontFamily: "'DM Mono',monospace",
        color: T.textMuted, lineHeight: 1.5,
      }}>
        Objetos decorativos — no afectan el costo del presupuesto.
      </div>
    </div>
  );
}
