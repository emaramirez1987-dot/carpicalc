/**
 * optimizerService.js — Algoritmo Guillotine para optimización de placas
 * Función pura, sin side effects, sin React, sin localStorage.
 * Recibe datos procesados, retorna layouts + sobrantes.
 */

export const OPTIMIZER_CONFIG = {
  KERF: 4,             // mm perdido por cada corte
  DESPUNTE: 15,        // mm de seguridad en bordes
  MIN_SOBRANTE: 300,   // mm mínimo para considerar reutilizable
};

/**
 * Calcula layouts óptimos de piezas en placas usando algoritmo Guillotine.
 * @param {object[]} piezas - [{d1, d2, cantidad, rotable, vetaDir, modId, nombre, id}]
 * @param {object} plateDims - {largo, ancho, material, espesor, color?, precio?}
 * @param {object} config - Config override (kerf, despunte, etc)
 * @returns {{layouts: [...], sobrantes: [...], metricas: {...}}}
 */
export function layoutPiezas(piezas, plateDims, config = OPTIMIZER_CONFIG) {
  if (!piezas || piezas.length === 0) {
    return { layouts: [], sobrantes: [], metricas: { placasNecesarias: 0, rendimiento: 0 } };
  }

  // Expandir piezas por cantidad
  const piezasExpandidas = [];
  piezas.forEach((p) => {
    for (let i = 0; i < p.cantidad; i++) {
      piezasExpandidas.push({
        ...p,
        cantidad: 1,
        id: `${p.id}_${i}`,
      });
    }
  });

  const layouts = [];
  const sobrantes = [];
  let piezasColocadas = 0;

  // Intentar llenar placas hasta que todas las piezas estén colocadas
  while (piezasColocadas < piezasExpandidas.length) {
    const piezasRestantes = piezasExpandidas.slice(piezasColocadas);
    const layout = guillotineLayout(
      piezasRestantes,
      plateDims.largo,
      plateDims.ancho,
      config.KERF,
      config.DESPUNTE
    );

    layouts.push(layout);
    piezasColocadas += layout.piezas.length;

    // Extraer sobrantes
    const sobrantesPlaca = extraerSobrantes(layout, plateDims.largo, plateDims.ancho, config.MIN_SOBRANTE);
    sobrantes.push(...sobrantesPlaca);

    // Safety: evitar loop infinito si no se coloca ninguna pieza
    if (layout.piezas.length === 0) break;
  }

  const metricas = calcularMetricas(layouts, piezasExpandidas, plateDims, sobrantes);

  return { layouts, sobrantes, metricas };
}

/**
 * Algoritmo Guillotine: coloca piezas recursivamente cortando el espacio.
 * @returns {{piezas: [...], espacioLibre: [{x, y, w, h}], desperdicio: number}}
 */
function guillotineLayout(piezas, plateLargo, plateAncho, kerf, despunte) {
  const piezasColocadas = [];
  const espacioLibre = [{ x: despunte, y: despunte, w: plateLargo - despunte * 2, h: plateAncho - despunte * 2 }];

  for (const pieza of piezas) {
    let colocada = false;

    for (let i = 0; i < espacioLibre.length; i++) {
      const espacio = espacioLibre[i];

      // Intentar colocar en orientación normal
      if (cabe(pieza, espacio, kerf)) {
        colocarPieza(pieza, espacio, espacioLibre, kerf);
        piezasColocadas.push({
          id: pieza.id,
          modId: pieza.modId,
          nombre: pieza.nombre,
          x: espacio.x,
          y: espacio.y,
          w: pieza.d1,
          h: pieza.d2,
          rotada: false,
        });
        colocada = true;
        break;
      }

      // Si es rotable, intentar rotada
      if (pieza.rotable && cabe({ ...pieza, d1: pieza.d2, d2: pieza.d1 }, espacio, kerf)) {
        colocarPieza({ ...pieza, d1: pieza.d2, d2: pieza.d1 }, espacio, espacioLibre, kerf);
        piezasColocadas.push({
          id: pieza.id,
          modId: pieza.modId,
          nombre: pieza.nombre,
          x: espacio.x,
          y: espacio.y,
          w: pieza.d2,
          h: pieza.d1,
          rotada: true,
        });
        colocada = true;
        break;
      }
    }

    if (!colocada) break; // No cabe en esta placa, pasar a siguiente
  }

  const desperdicio = calcularDesperdicio(piezasColocadas, plateLargo, plateAncho);

  return {
    piezas: piezasColocadas,
    espacioLibre,
    desperdicio,
    plateLargo,
    plateAncho,
  };
}

/**
 * Verifica si una pieza cabe en un espacio disponible.
 */
function cabe(pieza, espacio, kerf) {
  const ancho = pieza.d1 + kerf;
  const alto = pieza.d2 + kerf;
  return espacio.w >= ancho && espacio.h >= alto;
}

/**
 * Coloca pieza dividiendo el espacio (guillotina vertical u horizontal).
 */
function colocarPieza(pieza, espacio, espacioLibre, kerf) {
  const idxEspacio = espacioLibre.indexOf(espacio);
  if (idxEspacio === -1) return;

  const ancho = pieza.d1 + kerf;
  const alto = pieza.d2 + kerf;

  // Remover espacio usado
  espacioLibre.splice(idxEspacio, 1);

  // Guillotina vertical: corte a la derecha
  if (espacio.w > ancho) {
    espacioLibre.push({
      x: espacio.x + ancho,
      y: espacio.y,
      w: espacio.w - ancho,
      h: espacio.h,
    });
  }

  // Guillotina horizontal: corte abajo
  if (espacio.h > alto) {
    espacioLibre.push({
      x: espacio.x,
      y: espacio.y + alto,
      w: ancho,
      h: espacio.h - alto,
    });
  }
}

/**
 * Calcula % de desperdicio de una placa.
 */
function calcularDesperdicio(piezas, plateLargo, plateAncho) {
  const areaPlaca = plateLargo * plateAncho;
  const areaPiezas = piezas.reduce((sum, p) => sum + p.w * p.h, 0);
  return ((areaPlaca - areaPiezas) / areaPlaca) * 100;
}

/**
 * Extrae espacios libres como sobrantes reutilizables.
 */
function extraerSobrantes(layout, plateLargo, plateAncho, minSize) {
  return layout.espacioLibre
    .filter((esp) => esp.w >= minSize && esp.h >= minSize)
    .map((esp, idx) => ({
      id: `sobr_${idx}`,
      x: esp.x,
      y: esp.y,
      w: esp.w,
      h: esp.h,
      area: (esp.w * esp.h) / 1_000_000,
      reutilizable: true,
    }));
}

/**
 * Calcula métricas finales de optimización.
 */
function calcularMetricas(layouts, piezasTotal, plateDims, sobrantes) {
  const placasNecesarias = layouts.length;
  const areaPlacaM2 = (plateDims.largo * plateDims.ancho) / 1_000_000;
  const areaUsada = layouts.reduce((sum, l) => sum + l.piezas.reduce((s, p) => s + p.w * p.h, 0), 0) / 1_000_000;
  const rendimiento = (areaUsada / (placasNecesarias * areaPlacaM2)) * 100;
  const desperdicioTotal = 100 - rendimiento;
  const desperdicioReutilizable = (sobrantes.reduce((sum, s) => sum + s.area, 0) / (placasNecesarias * areaPlacaM2)) * 100;

  return {
    placasNecesarias,
    rendimiento: parseFloat(rendimiento.toFixed(1)),
    desperdicioTotal: parseFloat(desperdicioTotal.toFixed(1)),
    desperdicioReutilizable: parseFloat(desperdicioReutilizable.toFixed(1)),
    areaUsada: parseFloat(areaUsada.toFixed(2)),
    areaDisponible: parseFloat((placasNecesarias * areaPlacaM2).toFixed(2)),
  };
}
