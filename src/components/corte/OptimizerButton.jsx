import React, { useState } from 'react';
import * as optimizerService from '../../services/optimizerService.js';

export function OptimizerButton({ piezas, plateDims, onResult, onError }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = optimizerService.layoutPiezas(piezas, plateDims);
      onResult(result);
    } catch (e) {
      const msg = e?.message || 'Error desconocido en optimización';
      setError(msg);
      if (onError) onError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6 }}>
      <button
        onClick={handleClick}
        disabled={loading || !piezas || piezas.length === 0}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 16px',
          borderRadius: 6,
          fontSize: 12,
          fontFamily: "'DM Mono',monospace",
          fontWeight: 700,
          letterSpacing: '0.05em',
          cursor: loading ? 'wait' : 'pointer',
          transition: 'all 0.18s',
          background: loading ? 'var(--accent-soft)' : 'var(--bg-surface)',
          border: loading ? '1px solid var(--accent)' : '1px solid var(--border)',
          color: loading ? 'var(--accent)' : 'var(--text-secondary)',
          opacity: loading || !piezas || piezas.length === 0 ? 0.6 : 1,
        }}
      >
        {loading ? '🔄 Optimizando...' : '📊 Optimizar Placas'}
      </button>
      {error && (
        <div
          style={{
            fontSize: 11,
            color: '#e07070',
            padding: '4px 8px',
            background: 'rgba(224,112,112,0.08)',
            borderRadius: 4,
            border: '1px solid rgba(224,112,112,0.2)',
          }}
        >
          ✗ {error}
        </div>
      )}
    </div>
  );
}

export default OptimizerButton;
