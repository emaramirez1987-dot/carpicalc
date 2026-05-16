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
import { resolverVariables, evaluarExpresion, evaluarCondicion, evaluarFormula } from "../utils.js";

// ── Tipos del schema paramétrico (JSDoc) ──────────────────────────────────

/**
 * @typedef {Object} Parametro
 * @property {string} id            Identificador único (válido como variable JS)
 * @property {string} nombre        Etiqueta para UI
 * @property {("number"|"integer"|"boolean"|"choice"|"formula")} tipo
 * @property {(number|boolean|string)} def  Valor por defecto
 * @property {number=}   min         Solo para number/integer
 * @property {number=}   max         Solo para number/integer
 * @property {string[]=} opciones    Solo para choice
 * @property {string=}   expr        Solo para formula (calculado, no editable)
 * @property {string=}   unidad      Para UI: "mm", "cm", etc.
 */

/**
 * @typedef {Object} Zona
 * @property {string}  id        Identificador único (válido como referencia)
 * @property {string}  nombre    Etiqueta para UI
 * @property {string}  material  Clave de TIPO_MAT
 * @property {number=} espesor   Override opcional del espesor del material
 */

/**
 * @typedef {Object} Constraint
 * @property {string} expr  Fórmula que debe evaluar a truthy (ej: "alto >= cajones * 80")
 * @property {string} msg   Mensaje al usuario si expr es false
 */

/**
 * @typedef {Object} Herraje
 * @property {(number|string)} id        ID del herraje en costos.herrajes
 * @property {(number|string)} cantidad  Numero fijo o fórmula (ej: "cajones")
 * @property {string=}         condition Fórmula booleana — herraje solo se incluye si true
 */

/**
 * @typedef {Object} SubComponente
 *
 * Un subcomponente es un mini-módulo dentro del módulo padre, con su propio
 * eje local (0,0,0 = esquina inferior-izquierda-fondo del subcomp). Su origen
 * en coords del padre se define con `origen.x/y/z` (fórmulas que pueden usar
 * vars del padre y el índice `i` del repeat).
 *
 * Las piezas del subcomp se diseñan en coords LOCALES — el motor las traslada
 * automáticamente a coords del padre al expandir.
 *
 * @property {string}                 id
 * @property {string}                 nombre
 * @property {Object=}                repeat       { var, from, to } — opcional
 * @property {string=}                condition    Fórmula booleana — solo si truthy
 * @property {{x: string, y: string, z: string}=} origen
 *   Origen del subcomp en coords del padre (mm). Default: (0,0,0).
 * @property {{ancho: (string|number), alto: (string|number), profundidad: (string|number)}} dimensiones
 *   Dimensiones LOCALES del subcomp (pueden ser fórmulas que usan vars del padre)
 * @property {Parametro[]=}           parametros   Parámetros propios del subcomp
 * @property {Object[]}               piezas       Piezas en coords LOCALES
 * @property {Herraje[]=}             herrajes     Herrajes propios
 */

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
    parametros:     Array.isArray(raw.parametros)     ? raw.parametros     : [],
    zonas:          Array.isArray(raw.zonas)          ? raw.zonas          : [],
    constraints:    Array.isArray(raw.constraints)    ? raw.constraints    : [],
    subComponentes: Array.isArray(raw.subComponentes) ? raw.subComponentes : [],
  };
}

// ── piezasQueUsanVar ──────────────────────────────────────────────────────
// Devuelve las piezas que referencian `varName` en alguna de sus fórmulas.
// Útil para advertir al usuario cuando elimina una variable.
export function piezasQueUsanVar(varName, piezas) {
  const re = new RegExp(`\\b${varName}\\b`);
  return (piezas || []).filter(p => {
    const campos = [p.formula1, p.formula2, p.posFormulas?.x, p.posFormulas?.y, p.posFormulas?.z];
    return campos.some(f => typeof f === 'string' && re.test(f));
  });
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
// @param {Object=} valoresParametros  Si vienen, se mergean en modVars
// @returns {{baseVars: object, modVars: object, espesor: number, materialDef: object|null}}
export function resolverContextoModulo(modulo, costos, valoresParametros = {}) {
  const materialDef =
    costos?.materiales?.find((m) => m.tipo === modulo?.material) ||
    costos?.materiales?.[0] ||
    null;
  const espesor = materialDef?.espesor || 18;
  const { ancho = 0, alto = 0, profundidad = 0 } = modulo?.dimensiones || {};
  const baseVars = { ancho, alto, profundidad, esp: espesor };
  // modVars combina dims base + variables custom + parámetros (si vienen).
  // Sin esto, las fórmulas que referencian parámetros (ej: "cajones") no
  // resuelven y caen a 0. Bug detectado al armar el módulo cajonera de Fase 8.
  const baseConVars  = resolverVariables(modulo?.variables, baseVars);
  const paramVals    = resolverParametros(modulo, valoresParametros);
  const modVars      = { ...baseConVars, ...paramVals };
  return { baseVars, modVars, espesor, materialDef };
}

// ════════════════════════════════════════════════════════════════════════════
// Generador paramétrico (Fase 3)
// ════════════════════════════════════════════════════════════════════════════
//
// Capa anterior a buildPiezas3D. Toma un módulo paramétrico + los valores
// elegidos por el usuario y produce un "módulo concreto" cuyas piezas ya
// están expandidas (repeat) y filtradas (condition). Ese módulo concreto
// se le pasa a buildPiezas3D sin cambios.
//
//   modulo paramétrico + valores → generarPiezas → modulo concreto → buildPiezas3D
//
// Back-compat: un módulo sin `parametros[]` pasa idéntico (no hay
// repeat ni condition que evaluar).

/**
 * Resuelve los valores efectivos de los parámetros del módulo.
 * Combina los defaults con los valores elegidos por el usuario y resuelve
 * los parámetros tipo "formula" (computados, no editables).
 *
 * @param {Object}  modulo
 * @param {Object=} valoresParametros  Overrides del usuario { [paramId]: valor }
 * @returns {Object} { [paramId]: valorResuelto } — siempre números, booleans o strings
 */
export function resolverParametros(modulo, valoresParametros = {}) {
  const params = Array.isArray(modulo?.parametros) ? modulo.parametros : [];
  const out = {};
  // 1) Defaults + override del usuario, ignorando los tipo "formula"
  for (const p of params) {
    if (p.tipo === "formula") continue;
    const userVal = valoresParametros?.[p.id];
    out[p.id] = userVal !== undefined ? userVal : p.def;
  }
  // 2) Resolver parámetros tipo "formula" (pueden depender de los anteriores)
  //    Pasada iterativa similar a resolverVariables (deps cruzadas → 0)
  const formulaParams = params.filter((p) => p.tipo === "formula");
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of formulaParams) {
      if (out[p.id] !== undefined) continue;
      const v = evaluarExpresion(p.expr, out);
      if (v !== null) { out[p.id] = v; changed = true; }
    }
  }
  // 3) Formulas no resolubles → 0 (consistente con resolverVariables)
  for (const p of formulaParams) {
    if (out[p.id] === undefined) out[p.id] = 0;
  }
  return out;
}

/**
 * Construye el contexto de variables para evaluar fórmulas dentro del
 * generador. Mezcla dims base, variables custom del módulo y los valores
 * de los parámetros. El espesor base es el del material default del módulo.
 * @returns {Object} variables planas listas para evaluarFormula/evaluarCondicion
 */
function _contextoParametrico(modulo, valoresParametros, costos) {
  const ctx = costos ? resolverContextoModulo(modulo, costos) : null;
  const espesor = ctx?.espesor ?? 18;
  const { ancho = 0, alto = 0, profundidad = 0 } = modulo?.dimensiones || {};
  const baseVars = { ancho, alto, profundidad, esp: espesor };
  const modVars  = resolverVariables(modulo?.variables, baseVars);
  const paramVals = resolverParametros(modulo, valoresParametros);
  // Los parámetros tienen prioridad sobre variables, las cuales tienen
  // prioridad sobre dims base. Si hay colisión gana el más específico.
  return { ...modVars, ...paramVals };
}

/** Sustituye {i} y #{i} en una string por el índice. */
function _interpolarIndice(str, i) {
  if (typeof str !== "string") return str;
  return str.replace(/#?\{i\}/g, String(i));
}

/**
 * Resuelve una dimensión que puede venir como número o como string-fórmula.
 * @private
 */
function _resolverDimSubcomp(valor, ctx, defaultVal = 0) {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    const v = evaluarFormula(valor, ctx);
    return v !== null ? v : defaultVal;
  }
  return defaultVal;
}

/**
 * Expande los subcomponentes del módulo en piezas y herrajes "concretos"
 * con coordenadas ya traducidas al sistema del padre.
 *
 * Estrategia:
 *   1. Por cada subcomponente, resolver repeat → N instancias
 *   2. Por cada instancia:
 *      - Resolver origen (en coords del padre)
 *      - Resolver dimensiones LOCALES del subcomp
 *      - Resolver parámetros propios
 *      - Expandir las piezas del subcomp en su contexto LOCAL
 *      - Convertir cada pieza a "pieza especial" con dimLibre1/dimLibre2
 *        y posFormulas precalculadas en coords del padre
 *      - Resolver herrajes del subcomp y agregarlos al pool
 *
 * Las piezas del subcomp resultantes se marcan con _subComponente y _instancia
 * para trazabilidad.
 *
 * @param {Object}  modulo
 * @param {Object=} valoresParametros  Valores del PADRE
 * @param {Object=} costos
 * @returns {Object} módulo con piezas/herrajes extras del expandido
 */
const MAX_SUBCOMP_DEPTH = 5;

export function expandirSubComponentes(modulo, valoresParametros = {}, costos = null, _profundidad = 0) {
  const subs = Array.isArray(modulo?.subComponentes) ? modulo.subComponentes : [];
  if (subs.length === 0) return modulo;
  // Guard contra recursión accidental (ciclos por mala config).
  if (_profundidad >= MAX_SUBCOMP_DEPTH) {
    // eslint-disable-next-line no-console
    console.warn(`[expandirSubComponentes] Profundidad máxima (${MAX_SUBCOMP_DEPTH}) alcanzada — subcomps anidados ignorados.`);
    return modulo;
  }

  const ctxPadre = _contextoParametrico(modulo, valoresParametros, costos);
  const espPadre = ctxPadre.esp ?? 18;

  const piezasExtras   = [];
  const herrajesExtras = [];

  for (const sub of subs) {
    // Decidir cuántas instancias
    let indices = [];
    if (sub.repeat && typeof sub.repeat === "object") {
      const varName = sub.repeat.var || "i";
      const from = typeof sub.repeat.from === "number"
        ? sub.repeat.from
        : Math.round(evaluarFormula(String(sub.repeat.from ?? "0"), ctxPadre) ?? 0);
      const to = typeof sub.repeat.to === "number"
        ? sub.repeat.to
        : Math.round(evaluarFormula(String(sub.repeat.to ?? "0"), ctxPadre) ?? 0);
      if (Number.isFinite(from) && Number.isFinite(to) && to >= from) {
        for (let i = from; i <= to; i++) {
          const ctxIter = { ...ctxPadre, [varName]: i };
          if (sub.condition && !evaluarCondicion(sub.condition, ctxIter)) continue;
          indices.push({ i, varName });
        }
      }
    } else {
      // Sin repeat → instancia única
      if (!sub.condition || evaluarCondicion(sub.condition, ctxPadre)) {
        indices.push({ i: 0, varName: "i" });
      }
    }

    for (const { i, varName } of indices) {
      const ctxIter = { ...ctxPadre, [varName]: i };

      // Resolver dimensiones LOCALES del subcomp
      const dims = sub.dimensiones || {};
      const anchoLoc = _resolverDimSubcomp(dims.ancho,       ctxIter, 100);
      const altoLoc  = _resolverDimSubcomp(dims.alto,        ctxIter, 100);
      const profLoc  = _resolverDimSubcomp(dims.profundidad, ctxIter, 100);

      // Resolver parámetros propios del subcomp (sin overrides — futuro)
      const paramValsSub = resolverParametros(sub, {});

      // Contexto LOCAL para las piezas del subcomp
      const ctxLocal = {
        ancho: anchoLoc, alto: altoLoc, profundidad: profLoc,
        esp: espPadre,
        ...paramValsSub,
      };

      // Resolver origen en coords del padre
      const ox = evaluarFormula(String(sub.origen?.x ?? "0"), ctxIter) ?? 0;
      const oy = evaluarFormula(String(sub.origen?.y ?? "0"), ctxIter) ?? 0;
      const oz = evaluarFormula(String(sub.origen?.z ?? "0"), ctxIter) ?? 0;

      // Expandir las piezas del subcomp (con su propio repeat/condition interno).
      // Anidamiento: si el subcomp tiene sub-subcomps adentro, se procesan
      // recursivamente. El guard MAX_SUBCOMP_DEPTH limita la profundidad.
      const subModuloVirtual = {
        ...sub,
        material: modulo.material,
        zonas: modulo.zonas,
        variables: modulo.variables,
        dimensiones: { ancho: anchoLoc, alto: altoLoc, profundidad: profLoc },
        subComponentes: Array.isArray(sub.subComponentes) ? sub.subComponentes : [],
      };
      const subConcreto = generarPiezasInternal(subModuloVirtual, paramValsSub, costos, _profundidad + 1);

      // Trasladar cada pieza del subcomp a coords del padre
      for (const p of subConcreto.piezas) {
        const piezaCtx = p._repeatVars ? { ...ctxLocal, ...p._repeatVars } : ctxLocal;
        // d1 / d2 en contexto local
        const d1 = p.especial
          ? (parseFloat(p.dimLibre1) || 0)
          : p.formula1 != null
            ? (evaluarFormula(p.formula1, piezaCtx) ?? 0)
            : 0;
        const d2 = p.especial
          ? (parseFloat(p.dimLibre2) || 0)
          : p.formula2 != null
            ? (evaluarFormula(p.formula2, piezaCtx) ?? 0)
            : 0;
        // pos local
        let px = 0, py = 0, pz = 0;
        if (p.posFormulas) {
          const posCtx = { ...piezaCtx, d1, d2 };
          px = evaluarFormula(String(p.posFormulas.x ?? "0"), posCtx) ?? 0;
          py = evaluarFormula(String(p.posFormulas.y ?? "0"), posCtx) ?? 0;
          pz = evaluarFormula(String(p.posFormulas.z ?? "0"), posCtx) ?? 0;
        }
        // pieza precalculada en coords del padre
        piezasExtras.push({
          nombre: `${sub.nombre || sub.id}${i ? " #" + i : ""} · ${p.nombre}`,
          especial: true,
          dimLibre1: d1,
          dimLibre2: d2,
          cantidad: p.cantidad || 1,
          cara3d: p.cara3d,
          orientacion3d: p.orientacion3d,
          rol3d: p.rol3d,
          zona: p.zona,
          // Preservar tapacanto y material override de la pieza del subcomp.
          // Sin esto las piezas del hijo perdían su tapacanto al expandirse.
          tc: p.tc,
          material: p.material,
          posFormulas: {
            x: String(ox + px),
            y: String(oy + py),
            z: String(oz + pz),
          },
          _subComponente: sub.id,
          _instancia: i,
        });
      }

      // Herrajes del subcomp en contexto local
      const subHerrajes = resolverHerrajes(subModuloVirtual, paramValsSub, costos);
      for (const h of subHerrajes) {
        herrajesExtras.push({ id: h.id, cantidad: h.cantidad });
      }
    }
  }

  return {
    ...modulo,
    piezas:   [...(modulo.piezas || []),   ...piezasExtras],
    herrajes: [...(modulo.herrajes || []), ...herrajesExtras],
  };
}

/**
 * Expande las piezas del módulo aplicando `condition` y `repeat`.
 * Devuelve una copia del módulo con `piezas[]` resueltas.
 *
 * Forma de las piezas extendidas:
 *   {
 *     ...campos previos,
 *     zona?:      string,                   // referencia a modulo.zonas[*].id
 *     condition?: string,                   // expr booleana — pieza solo si truthy
 *     repeat?:    { var: "i", from, to },   // genera N piezas con var en contexto
 *   }
 *
 * `from` y `to` pueden ser números o strings (fórmulas). Si `to < from`
 * o el rango es inválido, no se generan piezas.
 *
 * @param {Object}  modulo
 * @param {Object=} valoresParametros
 * @param {Object=} costos              Opcional: si viene, esp se toma del material
 * @returns {Object} módulo concreto con piezas expandidas
 */
export function generarPiezas(modulo, valoresParametros = {}, costos = null) {
  return generarPiezasInternal(modulo, valoresParametros, costos, 0);
}

// Versión interna que acepta profundidad de recursión (para anidamiento
// de subcomponentes). El callsite público generarPiezas siempre arranca en 0.
function generarPiezasInternal(modulo, valoresParametros, costos, profundidad) {
  if (!modulo) return modulo;

  // Fase Subcomponentes: si el módulo tiene subComponentes[], primero
  // los expandimos a piezas/herrajes concretas en coords del padre.
  // El resto del flujo (repeat/condition de piezas del padre) sigue igual.
  const moduloExpandido = (Array.isArray(modulo.subComponentes) && modulo.subComponentes.length > 0)
    ? expandirSubComponentes(modulo, valoresParametros, costos, profundidad)
    : modulo;

  const piezasIn = Array.isArray(moduloExpandido.piezas) ? moduloExpandido.piezas : [];
  const ctxBase  = _contextoParametrico(moduloExpandido, valoresParametros, costos);

  const out = [];
  for (const p of piezasIn) {
    // ── Repeat ──────────────────────────────────────────────────────────
    if (p.repeat && typeof p.repeat === "object") {
      const varName = p.repeat.var || "i";
      const from = typeof p.repeat.from === "number"
        ? p.repeat.from
        : Math.round(evaluarFormula(String(p.repeat.from ?? "0"), ctxBase) ?? 0);
      const to = typeof p.repeat.to === "number"
        ? p.repeat.to
        : Math.round(evaluarFormula(String(p.repeat.to ?? "0"), ctxBase) ?? 0);
      if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) continue;

      for (let i = from; i <= to; i++) {
        const ctxI = { ...ctxBase, [varName]: i };
        if (p.condition && !evaluarCondicion(p.condition, ctxI)) continue;
        const { repeat: _r, condition: _c, ...rest } = p;
        out.push({
          ...rest,
          nombre: _interpolarIndice(p.nombre, i),
          _indice: i,
          // Vars locales del repeat para que buildPiezas3D pueda evaluar
          // formula1/formula2/posFormulas con `i` (o el var name del repeat).
          _repeatVars: { [varName]: i },
        });
      }
      continue;
    }

    // ── Sin repeat ──────────────────────────────────────────────────────
    if (p.condition && !evaluarCondicion(p.condition, ctxBase)) continue;
    const { condition: _c, ...rest } = p;
    out.push(rest);
  }

  return { ...moduloExpandido, piezas: out };
}

/**
 * Resuelve los herrajes efectivos del módulo aplicando `condition` y
 * fórmulas de `cantidad`. Retorna un array listo para sumar al costo.
 *
 * Soporta:
 *   • `condition`: si la expr es falsy, el herraje se omite.
 *   • `cantidad` como número: se usa directo.
 *   • `cantidad` como string: se evalúa como fórmula y se redondea.
 *
 * Back-compat: un herraje viejo `{ id, cantidad: number }` sin condition
 * pasa idéntico (no se filtra, cantidad numérica intacta).
 *
 * @param {Object}  modulo
 * @param {Object=} valoresParametros
 * @param {Object=} costos
 * @returns {Array<{id, cantidad: number}>}
 */
export function resolverHerrajes(modulo, valoresParametros = {}, costos = null) {
  const herrajes = Array.isArray(modulo?.herrajes) ? modulo.herrajes : [];
  if (herrajes.length === 0) return [];
  const ctx = _contextoParametrico(modulo, valoresParametros, costos);
  const out = [];
  for (const h of herrajes) {
    if (h.condition && !evaluarCondicion(h.condition, ctx)) continue;
    let cantidad;
    if (typeof h.cantidad === "number") {
      cantidad = h.cantidad;
    } else if (typeof h.cantidad === "string") {
      const v = evaluarFormula(h.cantidad, ctx);
      cantidad = v !== null ? Math.round(v) : 0;
    } else {
      cantidad = 1;
    }
    if (cantidad > 0) out.push({ id: h.id, cantidad });
  }
  return out;
}

/**
 * Evalúa todas las constraints del módulo contra los valores de parámetros.
 * Retorna un array con el resultado de cada constraint para mostrar al usuario.
 *
 * @param {Object}  modulo
 * @param {Object=} valoresParametros
 * @param {Object=} costos
 * @returns {Array<{expr: string, msg: string, ok: boolean}>}
 */
export function evaluarConstraints(modulo, valoresParametros = {}, costos = null) {
  const constraints = Array.isArray(modulo?.constraints) ? modulo.constraints : [];
  if (constraints.length === 0) return [];
  const ctx = _contextoParametrico(modulo, valoresParametros, costos);
  return constraints.map((c) => ({
    expr: c.expr,
    msg:  c.msg,
    ok:   evaluarCondicion(c.expr, ctx),
  }));
}
