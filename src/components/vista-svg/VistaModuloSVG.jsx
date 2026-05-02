import { useMemo } from 'react';
import { generarVistaSVG } from '../../utils';

/**
 * Componente wrapper de generarVistaSVG — reutilizable en Vista Previa, PDF, Ficha Técnica.
 *
 * @param {object} modulo - Módulo con dimensiones, variables, vistaConfig
 * @param {object} vistaConfig - Configuración visual (opcional)
 * @param {string} theme - "dark" o "light" (OBLIGATORIO)
 * @param {number} width - Ancho SVG en px (default 200)
 * @param {number} height - Alto SVG en px (default 200)
 * @param {string} className - CSS class adicional (opcional)
 */
export function VistaModuloSVG({
  modulo,
  vistaConfig = null,
  theme = 'dark',
  width = 200,
  height = 200,
  className = '',
}) {
  const svgStr = useMemo(() => {
    try {
      return generarVistaSVG(
        { ...modulo, vistaConfig },
        { width, height, theme }
      );
    } catch (e) {
      console.error('Error rendering VistaModuloSVG:', e);
      return null;
    }
  }, [modulo, vistaConfig, width, height, theme]);

  if (!svgStr) {
    // Fallback visual consistente — no texto plano
    return (
      <div
        className={`vista-svg-error ${className}`}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed var(--border)',
          borderRadius: '4px',
          background: 'var(--bg-surface)',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          textAlign: 'center',
        }}
      >
        <span>Visualización no disponible</span>
      </div>
    );
  }

  return (
    <div
      className={`vista-svg-container ${className}`}
      // DEUDA TÉCNICA v3: dangerouslySetInnerHTML permite interactividad futura vía event listeners
      // en data-zona-id / data-estante-index. Migrar a canvas o SVG ref si se necesita drag/resize.
      dangerouslySetInnerHTML={{ __html: svgStr }}
      role="img"
      aria-label={`Vista módulo ${modulo?.codigo || 'sin código'}`}
    />
  );
}

export default VistaModuloSVG;
