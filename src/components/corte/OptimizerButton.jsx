import React, { useState } from 'react';
import * as optimizerService from '../../services/optimizerService.js';

export function OptimizerButton({ piezas, plateDims, onResult, onError }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasPiezas = piezas && piezas.length > 0;

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = optimizerService.layoutPiezas(piezas, plateDims);
      onResult(result);
    } catch (e) {
      const msg = e?.message || 'Error desconocido en optimización';
      setError(msg);
      console.error('Optimizer error:', e);
      if (onError) onError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || !hasPiezas}
      title={!hasPiezas ? 'Agregá piezas para optimizar' : 'Optimizar distribución de placas'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '7px 16px',
        borderRadius: 6,
        fontSize: 12,
        fontFamily: "'DM Mono',monospace",
        fontWeight: 700,
        letterSpacing: '0.05em',
        cursor: !hasPiezas || loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.18s',
        background: loading ? 'var(--accent-soft)' : 'var(--bg-surface)',
        border: `1px solid ${loading ? 'var(--accent)' : 'var(--border)'}`,
        color: loading ? 'var(--accent)' : 'var(--text-secondary)',
        opacity: loading || !hasPiezas ? 0.5 : 1,
      }}
    >
      {loading ? '🔄 Optimizando...' : '📊 Optimizar'}
      {error && ` ✗`}
    </button>
  );
}

export default OptimizerButton;
