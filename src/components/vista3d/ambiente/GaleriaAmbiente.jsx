// GaleriaAmbiente.jsx
// Contenido de la galería de la biblioteca curada de objetos 3D de ambiente.
// Se renderiza dentro de la sección desplegable "Ambiente" del panel derecho
// (el contenedor/panel lo provee Vista3DTab — este componente es solo contenido).
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
        style={{ width: '100%', height: 48, objectFit: 'cover', display: 'block' }}
      />
    );
  }
  return (
    <div style={{
      width: '100%', height: 48,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: T.inputBg,
      color: T.textMuted, fontSize: 18,
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
        borderRadius: 6, cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      <Miniatura objeto={objeto} T={T} />
      <span style={{
        padding: '4px 5px',
        fontSize: 8.5, fontFamily: "'DM Mono',monospace",
        color: T.text, textAlign: 'left', lineHeight: 1.3,
      }}>
        {objeto.nombre}
      </span>
    </button>
  );
}

export function GaleriaAmbiente({ catalogo, onAgregar }) {
  const T = tok();
  const grupos = agruparPorCategoria(catalogo);

  return (
    <div style={{ padding: '2px 0 8px' }}>
      {catalogo.length === 0 && (
        <p style={{
          fontSize: 10, fontFamily: "'DM Mono',monospace",
          color: T.emptySub, textAlign: 'center', padding: '16px', margin: 0,
        }}>
          Sin objetos en la biblioteca
        </p>
      )}

      {Object.entries(grupos).map(([categoria, objetos]) => (
        <div key={categoria} style={{ marginBottom: 2 }}>
          <div style={{
            fontSize: 8, fontFamily: "'DM Mono',monospace",
            color: T.textMuted, letterSpacing: '0.10em',
            textTransform: 'uppercase',
            padding: '8px 12px 5px',
          }}>
            {categoria}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 5, padding: '0 12px',
          }}>
            {objetos.map((obj) => (
              <Card key={obj.id} objeto={obj} onAgregar={onAgregar} T={T} />
            ))}
          </div>
        </div>
      ))}

      <p style={{
        fontSize: 8, fontFamily: "'DM Mono',monospace",
        color: T.textMuted, lineHeight: 1.5,
        padding: '8px 12px 2px', margin: 0,
      }}>
        Objetos decorativos — no afectan el costo.
      </p>
    </div>
  );
}
