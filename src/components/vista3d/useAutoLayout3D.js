// useAutoLayout3D.js
// Resolución + layout de las instancias de la escena 3D.
// Devuelve: [{ ...inst, worldPos: [x,y,z], moduloEfectivo }, ...]
// Posiciones en metros (mm / 1000).
//
// Es el ÚNICO paso que resuelve el módulo efectivo de cada instancia
// (resolverModuloDeInstancia). Aguas abajo, ModuloEnEscena y Mesada son
// consumidores puros: leen inst.moduloEfectivo, no resuelven nada.
//
// Position standards (Argentine kitchen):
//   Bajos  → floor-based, y = h/2
//   Aéreos → 1500mm from floor, y = 1.5 + h/2
//   Torres → floor-based, y = h/2
//
// If inst.posicion is defined and non-zero, that manual position is used as-is.
// Las dimensiones salen del módulo efectivo → el layout reacciona a los
// overrides (ensanchar un módulo corre el siguiente).

import { resolverModuloDeInstancia } from './resolverInstancia3D.js';

const AEREO_BASE_Y = 1.5; // standard Argentine kitchen upper cabinet height from floor

function isManualPos(posicion) {
  if (!posicion) return false;
  const [x, y, z] = posicion;
  return x !== 0 || y !== 0 || z !== 0;
}

export function useAutoLayout3D(modulosEnEscena, modulos, inlineModulos = {}, dimOverride = {}) {
  // Resolver el módulo efectivo de cada instancia UNA sola vez.
  const conMod = modulosEnEscena.map(inst => ({
    inst,
    mod: resolverModuloDeInstancia(inst, { modulos, inlineModulos, dimOverride }),
  }));

  // Separar por tipo
  const bajos = [];
  const aereos = [];
  const torres = [];
  for (const entry of conMod) {
    const tipo = entry.mod?.tipoVisual || '';
    if (tipo === 'aereo') aereos.push(entry);
    else if (tipo === 'torre') torres.push(entry);
    else bajos.push(entry);
  }

  const result = [];

  // Bajo mesada — left to right on the floor
  let xCursorBajo = 0;
  for (const { inst, mod } of bajos) {
    const dims = mod?.dimensiones || { ancho: 600, alto: 700, profundidad: 550 };
    const w = (dims.ancho || 600) / 1000;
    const h = (dims.alto  || 700) / 1000;
    const worldPos = isManualPos(inst.posicion)
      ? inst.posicion
      : [xCursorBajo + w / 2, h / 2, 0];
    result.push({ ...inst, worldPos, moduloEfectivo: mod });
    xCursorBajo += w;
  }

  // Aéreos — aligned with bajos (same X start), 1500mm from floor
  let xCursorAereo = 0;
  for (const { inst, mod } of aereos) {
    const dims = mod?.dimensiones || { ancho: 600, alto: 400, profundidad: 300 };
    const w = (dims.ancho || 600) / 1000;
    const h = (dims.alto  || 400) / 1000;
    const worldPos = isManualPos(inst.posicion)
      ? inst.posicion
      : [xCursorAereo + w / 2, AEREO_BASE_Y + h / 2, 0];
    result.push({ ...inst, worldPos, moduloEfectivo: mod });
    xCursorAereo += w;
  }

  // Torres — after bajos, full height
  let xCursorTorre = xCursorBajo;
  for (const { inst, mod } of torres) {
    const dims = mod?.dimensiones || { ancho: 600, alto: 2100, profundidad: 550 };
    const w = (dims.ancho || 600) / 1000;
    const h = (dims.alto  || 2100) / 1000;
    const worldPos = isManualPos(inst.posicion)
      ? inst.posicion
      : [xCursorTorre + w / 2, h / 2, 0];
    result.push({ ...inst, worldPos, moduloEfectivo: mod });
    xCursorTorre += w;
  }

  return result;
}
