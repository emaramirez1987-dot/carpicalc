// ════════════════════════════════════════════════════════════════════════════
// buildPiezas3D.js — motor puro del visor 3D
// ════════════════════════════════════════════════════════════════════════════
//
// Función pura: recibe un módulo + tabla de costos, retorna la lista de
// piezas con su geometría, posición y metadatos de render.
//
// REGLA: este archivo NO importa React, three.js, ni nada del DOM.
// Puede depender de utils.js y de funciones puras de services/
// (ej: resolverContextoModulo) — todas sin side effects.
//
// Es el corazón del motor 3D. El editor paramétrico va a extender este
// archivo (ej: aplicarParametros) sin tocar componentes UI.
// ════════════════════════════════════════════════════════════════════════════

import { resolverDim, evaluarFormula } from '../../../utils.js';
import { resolverContextoModulo } from '../../../services/moduloService.js';

// ── Orientaciones 3D ──────────────────────────────────────────────────────────
// Solo 3 orientaciones + ignorar. La posición exacta siempre viene de posFormulas.
export const ORIENTACIONES_3D = [
  { id: 'vertical',    label: 'Vertical'   },  // espesor en X — laterales, divisores
  { id: 'horizontal',  label: 'Horizontal' },  // espesor en Y — techo, base, estantes
  { id: 'frente',      label: 'De frente'  },  // espesor en Z — puertas, cajones, fondos
  { id: 'ignorar',     label: 'No mostrar' },
];

// Migración desde sistemas anteriores (rol3d / cara3d)
const ROL3D_TO_ORIENT = {
  lateral_izq: 'vertical', lateral_der: 'vertical', lateral: 'vertical',
  techo: 'horizontal', base: 'horizontal', fondo: 'frente',
  puerta: 'frente', cajon: 'frente', estante: 'horizontal',
  horizontal_interna: 'horizontal', ignorar: 'ignorar',
};
const CARA_TO_ORIENT = {
  left: 'vertical', right: 'vertical',
  top: 'horizontal', bottom: 'horizontal', interior: 'horizontal',
  back: 'frente', front: 'frente',
  estante: 'horizontal', cajon: 'frente', ignorar: 'ignorar',
};

// Fallback por nombre cuando no hay campo orientacion3d/rol3d/cara3d
function clasificarPorNombre(nombre) {
  const n = (nombre || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/cajon|cajones|gaveta|puerta|frente|fondo|trasera|respaldo/.test(n)) return 'frente';
  if (/lateral|costado/.test(n))                                           return 'vertical';
  if (/techo|base|piso|estante|balda|horizontal|entrepa/.test(n))          return 'horizontal';
  return null;
}

function getOrientacion(pieza) {
  if (pieza.orientacion3d) return pieza.orientacion3d;
  if (pieza.cara3d  && CARA_TO_ORIENT[pieza.cara3d])  return CARA_TO_ORIENT[pieza.cara3d];
  if (pieza.rol3d   && ROL3D_TO_ORIENT[pieza.rol3d])  return ROL3D_TO_ORIENT[pieza.rol3d];
  return clasificarPorNombre(pieza.nombre);
}

// ── buildPiezas3D ─────────────────────────────────────────────────────────────
export function buildPiezas3D(modulo, costos) {
  if (!modulo?.piezas || !costos?.materiales) return [];

  const { materialDef: matDef, espesor: esp, modVars } = resolverContextoModulo(modulo, costos);
  if (!matDef) return [];

  const { ancho = 600, alto = 700, profundidad = 550 } = modulo.dimensiones || {};
  const M = 1000;

  const hw = ancho       / 2 / M;
  const hh = alto        / 2 / M;
  const hd = profundidad / 2 / M;
  const te = esp / M;

  const result = [];

  modulo.piezas.forEach((p, piezaIdx) => {
    const orientacion = getOrientacion(p);
    if (orientacion === 'ignorar') return;

    const d1 = p.especial
      ? (parseFloat(p.dimLibre1) || 0)
      : p.formula1 != null
        ? (evaluarFormula(p.formula1, modVars) ?? 0)
        : resolverDim({ ancho, alto, profundidad }[p.usaDim], p.offsetEsp, p.offsetMm, p.divisor  || 1, esp);

    const d2 = p.especial
      ? (parseFloat(p.dimLibre2) || 0)
      : p.formula2 != null
        ? (evaluarFormula(p.formula2, modVars) ?? 0)
        : resolverDim({ ancho, alto, profundidad }[p.usaDim2], p.offsetEsp2, p.offsetMm2, p.divisor2 || 1, esp);

    const cantidad = p.cantidad || 1;

    for (let i = 0; i < cantidad; i++) {
      let size, autoPos, explodeVec;

      // Orientación determina cómo se mapean d1/d2 a los ejes 3D.
      // La posición exacta viene de posFormulas; estos son los defaults.
      switch (orientacion) {
        case 'vertical':
          size       = [te, d1 / M, d2 / M];
          autoPos    = [-(hw - te / 2), 0, 0];
          explodeVec = [-1, 0, 0];
          break;
        case 'horizontal':
          size       = [d1 / M, te, d2 / M];
          autoPos    = [0, hh - te / 2, 0];
          explodeVec = [0, 1, 0];
          break;
        case 'frente':
          size       = [d2 / M, d1 / M, te];
          autoPos    = [0, 0, hd + te / 2];
          explodeVec = [0, 0, 1];
          break;
        default:
          size       = [d1 / M || 0.3, te, d2 / M || 0.3];
          autoPos    = [0, 0, 0];
          explodeVec = [0, 1, 0];
      }

      // posFormulas: posición exacta desde esquina inferior-izquierda-fondo (mm).
      //   X: 0 = borde izq  →  ancho       = borde der
      //   Y: 0 = piso       →  alto        = techo
      //   Z: 0 = fondo      →  profundidad = frente
      if (p.posFormulas) {
        const pf      = p.posFormulas;
        const posVars = { ...modVars, d1, d2 };
        if (pf.x != null && pf.x !== '') { const v = evaluarFormula(String(pf.x), posVars); if (v !== null) autoPos[0] = v / 1000 + size[0] / 2 - hw; }
        if (pf.y != null && pf.y !== '') { const v = evaluarFormula(String(pf.y), posVars); if (v !== null) autoPos[1] = v / 1000 + size[1] / 2 - hh; }
        if (pf.z != null && pf.z !== '') { const v = evaluarFormula(String(pf.z), posVars); if (v !== null) autoPos[2] = v / 1000 + size[2] / 2 - hd; }
      }

      const offset3d = p.offset3d || { x: 0, y: 0, z: 0 };
      const rot3d    = p.rot3d || 0;
      const pos = [
        autoPos[0] + (offset3d.x || 0) / 1000,
        autoPos[1] + (offset3d.y || 0) / 1000,
        autoPos[2] + (offset3d.z || 0) / 1000,
      ];
      const hasOffset =
        Math.abs(offset3d.x || 0) > 0.01 ||
        Math.abs(offset3d.y || 0) > 0.01 ||
        Math.abs(offset3d.z || 0) > 0.01;
      const status = !orientacion ? 'unassigned' : hasOffset ? 'manual' : 'auto';

      result.push({
        id:           `${p.nombre}-${i}`,
        nombre:       p.nombre,
        role:         orientacion ?? 'unassigned',
        piezaIdx,
        size,
        pos,
        autoPos,
        explodeVec,
        offset3d,
        rot3d,
        status,
        materialTipo: modulo.material || 'melamina',
        isHandle:     false,
        hasManualPos: hasOffset,
      });
    }
  });

  return result;
}
