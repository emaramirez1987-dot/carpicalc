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
