// ════════════════════════════════════════════════════════════════════════════
// moduloService.js — CarpiCálc
// ════════════════════════════════════════════════════════════════════════════
//
// Dominio puro del objeto Módulo: parseo, normalización y validación.
// No importa React. No llama a setState ni dispatch. Sin side effects.
//
// Patrón "parse, don't validate":
//   parsearModulo(raw)      → Modulo normalizado | null si irrecuperable
//   parsearPresupuesto(raw) → Presupuesto normalizado | null si irrecuperable
//
// Esto garantiza que cualquier módulo que pase por parsearModulo()
// siempre tenga todos los campos del contrato, incluyendo los nuevos
// (como `parametros`) sin romper datos guardados anteriormente.
// ════════════════════════════════════════════════════════════════════════════

import { MODULO_VACIO } from "../constants.js";
import { resolverVariables } from "../utils.js";

// ── parsearModulo ─────────────────────────────────────────────────────────
// Recibe datos crudos (Supabase, localStorage, importación JSON).
// Retorna null si el dato es fundamentalmente corrupto (no se puede usar).
// Retorna el módulo normalizado si es recuperable, completando campos
// faltantes con los defaults de MODULO_VACIO.
export function parsearModulo(raw) {
  if (raw === null || typeof raw !== "object") return null;
  if (typeof raw.nombre !== "string")           return null;
  if (!Array.isArray(raw.piezas))               return null;
  if (raw.dimensiones === null || typeof raw.dimensiones !== "object") return null;

  return {
    ...MODULO_VACIO,
    ...raw,
    dimensiones: {
      ...MODULO_VACIO.dimensiones,
      ...raw.dimensiones,
    },
    piezas:     Array.isArray(raw.piezas)     ? raw.piezas     : [],
    variables:  Array.isArray(raw.variables)  ? raw.variables  : [],
    herrajes:   Array.isArray(raw.herrajes)   ? raw.herrajes   : [],
    parametros: Array.isArray(raw.parametros) ? raw.parametros : [],
  };
}

// ── parsearPresupuesto ────────────────────────────────────────────────────
// Mismo patrón: null si irrecuperable, objeto normalizado si no.
export function parsearPresupuesto(raw) {
  if (raw === null || typeof raw !== "object") return null;
  if (!Array.isArray(raw.items))               return null;

  return {
    nombre:       "",
    nota:         "",
    estado:       "nuevo",
    dimOverride:  {},
    total:        0,
    costoReal:    0,
    diasVigencia: 30,
    ...raw,
    cliente:       { nombre: "", tel: "", dir: "", ...(raw.cliente || {}) },
    items:         Array.isArray(raw.items)          ? raw.items          : [],
    adicionales:   Array.isArray(raw.adicionales)    ? raw.adicionales    : [],
    costosDirectos:Array.isArray(raw.costosDirectos) ? raw.costosDirectos : [],
    cobros:        Array.isArray(raw.cobros)         ? raw.cobros         : [],
  };
}

// ── resolverContextoModulo ────────────────────────────────────────────────
// Punto único de verdad para evaluar fórmulas de un módulo.
//
// Retorna { baseVars, modVars, espesor, materialDef } a partir del módulo
// y la tabla de costos. Toda la app debe consumir esta función para
// resolver variables — está PROHIBIDO reimplementar la lógica inline.
//
// Por qué existe: tres archivos (corte, visor3d, FormModulo preview)
// reimplementaban inline el resuelvo de variables, y cada copia tenía
// bugs distintos (una sola pasada → deps inversas a 0, override de dims,
// errores comidos por `?? 0`). Centralizando acá, imposible reimplementar mal.
//
// @param {object} modulo - Módulo (debe tener dimensiones, variables, material)
// @param {object} costos - Tabla de costos (debe tener materiales[])
// @returns {{baseVars: object, modVars: object, espesor: number, materialDef: object|null}}
export function resolverContextoModulo(modulo, costos) {
  const materialDef =
    costos?.materiales?.find((m) => m.tipo === modulo?.material) ||
    costos?.materiales?.[0] ||
    null;
  const espesor = materialDef?.espesor || 18;
  const { ancho = 0, alto = 0, profundidad = 0 } = modulo?.dimensiones || {};
  const baseVars = { ancho, alto, profundidad, esp: espesor };
  const modVars  = resolverVariables(modulo?.variables, baseVars);
  return { baseVars, modVars, espesor, materialDef };
}
