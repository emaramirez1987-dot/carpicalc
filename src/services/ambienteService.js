// ════════════════════════════════════════════════════════════════════════════
// ambienteService.js — CarpiCálc
// ════════════════════════════════════════════════════════════════════════════
//
// Dominio puro de la capa de ESCENOGRAFÍA de Vista 3D: objetos 3D de ambiente
// (lámparas, sillones, plantas, etc.). Son props de presentación/render — NO
// son módulos, NO tienen costo, NO tocan el motor paramétrico.
//
// No importa React. Sin side effects.
//
// Dos conceptos:
//   • Objeto de catálogo  → entrada de la biblioteca curada (objetos-ambiente.json)
//   • Instancia en escena → un objeto colocado, con su transform. Persiste en
//                           presupuesto.escenografia.
// ════════════════════════════════════════════════════════════════════════════

import catalogoRaw from "../data/objetos-ambiente.json";

// tipo: habilita snaps/restricciones futuras (Fase 2). Hoy es informativo.
const TIPOS = ["floor", "decor", "lighting", "wall"];

/**
 * Normaliza una entrada cruda del catálogo. Retorna null si es inutilizable.
 * @param {Object} raw
 * @returns {Object|null}
 */
export function parsearObjetoAmbiente(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.modelUrl !== "string" || !raw.modelUrl) return null;
  return {
    id:           raw.id,
    nombre:       typeof raw.nombre === "string" ? raw.nombre : raw.id,
    categoria:    typeof raw.categoria === "string" ? raw.categoria : "General",
    tipo:         TIPOS.includes(raw.tipo) ? raw.tipo : "decor",
    modelUrl:     raw.modelUrl,
    thumbnailUrl: typeof raw.thumbnailUrl === "string" ? raw.thumbnailUrl : null,
    // tamanoBase — metros del lado mayor objetivo. El componente auto-escala
    // cualquier GLB a esta medida vía bounding box, sin calibración manual.
    tamanoBase:   Number.isFinite(raw.tamanoBase) && raw.tamanoBase > 0 ? raw.tamanoBase : 1,
    // alturaBase — metros del piso a la base del objeto (lámpara colgante, cuadro).
    alturaBase:   Number.isFinite(raw.alturaBase) ? raw.alturaBase : 0,
  };
}

/**
 * Carga el catálogo curado completo, normalizado. Las entradas corruptas
 * se descartan.
 * @returns {Array<Object>}
 */
export function cargarCatalogoAmbiente() {
  const arr = Array.isArray(catalogoRaw) ? catalogoRaw : [];
  return arr.map(parsearObjetoAmbiente).filter(Boolean);
}

/**
 * Agrupa el catálogo por categoría (para la galería).
 * @param {Array<Object>} catalogo
 * @returns {Object<string, Array<Object>>}
 */
export function agruparPorCategoria(catalogo) {
  const grupos = {};
  for (const obj of catalogo) {
    if (!grupos[obj.categoria]) grupos[obj.categoria] = [];
    grupos[obj.categoria].push(obj);
  }
  return grupos;
}

/**
 * Crea una instancia nueva de un objeto para colocar en la escena.
 * Transform estructurado (sin arrays mágicos) — persiste en presupuesto.escenografia.
 * @param {string} objetoId
 * @param {{x:number,y:number,z:number}=} pos  Posición inicial (metros)
 * @returns {Object}
 */
export function crearInstanciaAmbiente(objetoId, pos = {}) {
  return {
    instanceId: crypto.randomUUID(),
    objetoId,
    transform: {
      position: { x: pos.x || 0, y: pos.y || 0, z: pos.z || 0 },
      rotation: { y: 0 },
      scale: 1,
    },
  };
}
