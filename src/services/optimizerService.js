/**
 * optimizerService.js — Guillotine 2D bin-packing mejorado
 *
 * Mejoras sobre v1:
 * - Ordena piezas por área DESC antes de empaquetar (mejor compactación)
 * - Multi-placa open list: antes de abrir una placa nueva, prueba TODAS las
 *   piezas restantes (pequeñas incluidas) en los espacios libres existentes
 * - Best-fit space: elige el espacio más pequeño que contiene la pieza
 * - Split BSSF (Best Short Side Fit): el eje corto recibe el espacio grande,
 *   generando rectángulos más usables
 */

export const OPTIMIZER_CONFIG = {
  KERF: 4,           // mm perdido por corte (hoja de sierra)
  DESPUNTE: 15,      // mm de seguridad en cada borde
  MIN_SOBRANTE: 300, // mm mínimo lado para considerar un sobrante reutilizable
};

// ── API pública ────────────────────────────────────────────────────────────

export function layoutPiezas(piezas, plateDims, config = OPTIMIZER_CONFIG) {
  if (!piezas || piezas.length === 0) {
    return { layouts: [], sobrantes: [], metricas: { placasNecesarias: 0, rendimiento: 0 } };
  }

  const { KERF, DESPUNTE, MIN_SOBRANTE } = config;

  // 1. Expandir por cantidad y ordenar de mayor a menor área
  const expandidas = [];
  piezas.forEach(p => {
    for (let i = 0; i < p.cantidad; i++) {
      expandidas.push({ ...p, cantidad: 1, id: `${p.id}_${i}` });
    }
  });
  expandidas.sort((a, b) => (b.d1 * b.d2) - (a.d1 * a.d2));

  const placas = [];           // { piezas: [...], espaciosLibres: [...] }
  const noColocadas = [...expandidas];
  const sinColocar = [];       // piezas que no entran en ninguna placa

  while (noColocadas.length > 0) {
    // Intentar colocar TODAS las piezas restantes en placas ya abiertas
    // (iterar hasta que ninguna progrese)
    let hayProgreso = true;
    while (hayProgreso) {
      hayProgreso = false;
      // Iterar de atrás hacia adelante para poder splice() sin correr índices
      for (let i = noColocadas.length - 1; i >= 0; i--) {
        for (const placa of placas) {
          if (colocarEnPlaca(noColocadas[i], placa, KERF)) {
            noColocadas.splice(i, 1);
            hayProgreso = true;
            break;
          }
        }
      }
    }

    if (noColocadas.length === 0) break;

    // Ninguna pieza restante entró en placas abiertas → abrir nueva placa
    const nuevaPlaca = crearPlaca(plateDims, DESPUNTE);
    placas.push(nuevaPlaca);

    // Colocar la pieza más grande que entre en la nueva placa
    let iniciada = false;
    for (let i = 0; i < noColocadas.length; i++) {
      if (colocarEnPlaca(noColocadas[i], nuevaPlaca, KERF)) {
        noColocadas.splice(i, 1);
        iniciada = true;
        break;
      }
    }

    if (!iniciada) {
      // Ninguna pieza entra siquiera en una placa vacía (son más grandes que la placa)
      sinColocar.push(...noColocadas);
      break;
    }
  }

  // Convertir placas internas al formato de salida esperado por los componentes
  const layouts = placas.map(placa => ({
    piezas: placa.piezas,
    espacioLibre: placa.espaciosLibres,
    desperdicio: calcularDesperdicio(placa.piezas, plateDims.largo, plateDims.ancho),
    plateLargo: plateDims.largo,
    plateAncho: plateDims.ancho,
  }));

  const sobrantes = [];
  layouts.forEach((layout, idxPlaca) => {
    extraerSobrantes(layout, MIN_SOBRANTE).forEach(s => {
      sobrantes.push({ ...s, id: `sobr_p${idxPlaca}_${s.id}` });
    });
  });

  const metricas = calcularMetricas(layouts, expandidas, plateDims, sobrantes, sinColocar);

  return { layouts, sobrantes, metricas };
}

// ── Internos ───────────────────────────────────────────────────────────────

function crearPlaca(plateDims, despunte) {
  return {
    piezas: [],
    espaciosLibres: [{
      x: despunte,
      y: despunte,
      w: plateDims.largo - 2 * despunte,
      h: plateDims.ancho - 2 * despunte,
    }],
  };
}

/**
 * Intenta colocar una pieza en la placa usando best-fit (espacio más pequeño
 * que la contiene). Si encuentra ubicación, actualiza piezas y espaciosLibres.
 * Retorna true si se colocó.
 */
function colocarEnPlaca(pieza, placa, kerf) {
  let mejorIdx = -1;
  let mejorArea = Infinity;
  let usarRotacion = false;

  for (let i = 0; i < placa.espaciosLibres.length; i++) {
    const esp = placa.espaciosLibres[i];

    // Orientación normal
    if (esp.w >= pieza.d1 + kerf && esp.h >= pieza.d2 + kerf) {
      const area = esp.w * esp.h;
      if (area < mejorArea) { mejorArea = area; mejorIdx = i; usarRotacion = false; }
    }
    // Orientación rotada (si la pieza lo permite y tiene dimensiones distintas)
    if (pieza.rotable && pieza.d1 !== pieza.d2 &&
        esp.w >= pieza.d2 + kerf && esp.h >= pieza.d1 + kerf) {
      const area = esp.w * esp.h;
      if (area < mejorArea) { mejorArea = area; mejorIdx = i; usarRotacion = true; }
    }
  }

  if (mejorIdx === -1) return false;

  const esp = placa.espaciosLibres[mejorIdx];
  const w = usarRotacion ? pieza.d2 : pieza.d1;
  const h = usarRotacion ? pieza.d1 : pieza.d2;

  placa.piezas.push({
    id: pieza.id,
    modId: pieza.modId,
    nombre: pieza.nombre,
    x: esp.x,
    y: esp.y,
    w,
    h,
    rotada: usarRotacion,
  });

  placa.espaciosLibres.splice(mejorIdx, 1);
  guillotineSplit(esp, w + kerf, h + kerf, placa.espaciosLibres);

  return true;
}

/**
 * Split BSSF: el eje con MENOS sobrante recibe el rectángulo más pequeño;
 * el eje con MÁS sobrante recibe el ancho/alto completo del espacio padre.
 * Esto genera rectángulos más grandes y aprovechables.
 */
function guillotineSplit(esp, aw, ah, espaciosLibres) {
  const derechaW = esp.w - aw;
  const abajoH   = esp.h - ah;

  if (derechaW < abajoH) {
    // Espacio abajo es el más grande → darle el ancho completo (corte horizontal)
    if (abajoH   > 0) espaciosLibres.push({ x: esp.x,      y: esp.y + ah, w: esp.w,   h: abajoH });
    if (derechaW > 0) espaciosLibres.push({ x: esp.x + aw, y: esp.y,      w: derechaW, h: ah });
  } else {
    // Espacio derecho es el más grande → darle la altura completa (corte vertical)
    if (derechaW > 0) espaciosLibres.push({ x: esp.x + aw, y: esp.y,      w: derechaW, h: esp.h });
    if (abajoH   > 0) espaciosLibres.push({ x: esp.x,      y: esp.y + ah, w: aw,       h: abajoH });
  }
}

function calcularDesperdicio(piezas, plateLargo, plateAncho) {
  const areaPiezas = piezas.reduce((s, p) => s + p.w * p.h, 0);
  return ((plateLargo * plateAncho - areaPiezas) / (plateLargo * plateAncho)) * 100;
}

function extraerSobrantes(layout, minSize) {
  return layout.espacioLibre
    .filter(esp => esp.w >= minSize && esp.h >= minSize)
    .map((esp, idx) => ({
      id: `sobr_${idx}`,
      x: esp.x, y: esp.y, w: esp.w, h: esp.h,
      area: (esp.w * esp.h) / 1_000_000,
      reutilizable: true,
    }));
}

function calcularMetricas(layouts, piezasTotal, plateDims, sobrantes, sinColocar = []) {
  const placasNecesarias = layouts.length;
  const areaPlacaM2      = (plateDims.largo * plateDims.ancho) / 1_000_000;
  const areaUsada        = layouts.reduce(
    (s, l) => s + l.piezas.reduce((ss, p) => ss + p.w * p.h, 0), 0
  ) / 1_000_000;
  const rendimiento          = placasNecesarias > 0
    ? (areaUsada / (placasNecesarias * areaPlacaM2)) * 100 : 0;
  const desperdicioTotal     = 100 - rendimiento;
  const desperdicioReutiliz  = (sobrantes.reduce((s, x) => s + x.area, 0)
    / (placasNecesarias * areaPlacaM2)) * 100;

  return {
    placasNecesarias,
    rendimiento:              parseFloat(rendimiento.toFixed(1)),
    desperdicioTotal:         parseFloat(desperdicioTotal.toFixed(1)),
    desperdicioReutilizable:  parseFloat(desperdicioReutiliz.toFixed(1)),
    areaUsada:                parseFloat(areaUsada.toFixed(2)),
    areaDisponible:           parseFloat((placasNecesarias * areaPlacaM2).toFixed(2)),
    sinColocar:               sinColocar.map(p => ({ nombre: p.nombre, d1: p.d1, d2: p.d2 })),
  };
}
