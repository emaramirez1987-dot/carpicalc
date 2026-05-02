import React from 'react';

export function BancoSobrantes({ sobrantes }) {
  const reutilizables = sobrantes.filter((s) => s.reutilizable);

  if (reutilizables.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        marginBottom: 20,
        padding: '16px 20px',
        background: 'rgba(200,160,96,0.06)',
        border: '1px solid rgba(200,160,96,0.2)',
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 700,
          color: 'var(--text-muted)',
          marginBottom: 12,
        }}
      >
        📋 Banco de Sobrantes Reutilizables
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 10,
        }}
      >
        {reutilizables.map((sobr, idx) => (
          <div
            key={`${sobr.id}-${idx}`}
            style={{
              padding: '10px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--accent-border)',
              borderRadius: 6,
              fontSize: 11,
            }}
          >
            <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>
              {sobr.w}×{sobr.h}mm
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              Área: {sobr.area.toFixed(3)} m²
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
              ✓ Apto para molduras, tapas, tiras
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BancoSobrantes;
