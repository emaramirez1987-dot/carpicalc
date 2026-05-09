// useAutoLayout3D.js
// Calculates world positions for modules placed in the 3D scene.
// Returns: [{ instanceId, codigo, worldPos: [x, y, z] }, ...]
// All positions in meters (mm / 1000).
//
// Position standards (Argentine kitchen):
//   Bajos  → floor-based, y = h/2
//   Aéreos → 1500mm from floor, y = 1.5 + h/2
//   Torres → floor-based, y = h/2
//
// If inst.posicion is defined and non-zero, that manual position is used as-is.

const AEREO_BASE_Y = 1.5; // standard Argentine kitchen upper cabinet height from floor

function isManualPos(posicion) {
  if (!posicion) return false;
  const [x, y, z] = posicion;
  return x !== 0 || y !== 0 || z !== 0;
}

export function useAutoLayout3D(modulosEnEscena, modulos) {
  const result = [];
  let xCursorBajo = 0;
  let xCursorTorre = 0;

  // Separate by type
  const bajos = [];
  const aereos = [];
  const torres = [];

  for (const inst of modulosEnEscena) {
    const mod = modulos?.[inst.codigo];
    const tipo = mod?.tipoVisual || '';
    if (tipo === 'aereo') aereos.push(inst);
    else if (tipo === 'torre') torres.push(inst);
    else bajos.push(inst);
  }

  // Bajo mesada — left to right on the floor
  for (const inst of bajos) {
    const mod = modulos?.[inst.codigo];
    const dims = mod?.dimensiones || { ancho: 600, alto: 700, profundidad: 550 };
    const w = (dims.ancho || 600) / 1000;
    const h = (dims.alto  || 700) / 1000;
    const worldPos = isManualPos(inst.posicion)
      ? inst.posicion
      : [xCursorBajo + w / 2, h / 2, 0];
    result.push({ ...inst, worldPos });
    xCursorBajo += w;
  }

  // Aéreos — aligned with bajos (same X start), 1500mm from floor
  let xCursorAereo = 0; // mirrors xCursorBajo starting point (bajos start at 0)
  for (const inst of aereos) {
    const mod = modulos?.[inst.codigo];
    const dims = mod?.dimensiones || { ancho: 600, alto: 400, profundidad: 300 };
    const w = (dims.ancho || 600) / 1000;
    const h = (dims.alto  || 400) / 1000;
    const worldPos = isManualPos(inst.posicion)
      ? inst.posicion
      : [xCursorAereo + w / 2, AEREO_BASE_Y + h / 2, 0];
    result.push({ ...inst, worldPos });
    xCursorAereo += w;
  }

  // Torres — after bajos, full height
  xCursorTorre = xCursorBajo;
  for (const inst of torres) {
    const mod = modulos?.[inst.codigo];
    const dims = mod?.dimensiones || { ancho: 600, alto: 2100, profundidad: 550 };
    const w = (dims.ancho || 600) / 1000;
    const h = (dims.alto  || 2100) / 1000;
    const worldPos = isManualPos(inst.posicion)
      ? inst.posicion
      : [xCursorTorre + w / 2, h / 2, 0];
    result.push({ ...inst, worldPos });
    xCursorTorre += w;
  }

  return result;
}
