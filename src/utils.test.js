// ════════════════════════════════════════════════════════════════════════════
// utils.test.js — Unit tests for CarpiCálc pure calculation functions
// Run with: npm test -- --watchAll=false
// ════════════════════════════════════════════════════════════════════════════

import {
  evaluarFormula,
  resolverVariables,
  resolverDim,
  calcularModulo,
  recalcularTotalPresupuesto,
  presupuestoNecesitaActualizacion,
  presupuestoTieneContenido,
  calcularTotalVisual,
  applyFactor,
  restoreFrom,
} from "./utils.js";

// ════════════════════════════════════════════════════════════════════════════
// evaluarFormula
// ════════════════════════════════════════════════════════════════════════════

describe("evaluarFormula", () => {
  test("suma simple", () => {
    expect(evaluarFormula("2 + 3", {})).toBe(5);
  });

  test("sustituye variables", () => {
    expect(evaluarFormula("alto - 32", { alto: 700 })).toBe(668);
  });

  test("variables más largas primero (no colisión parcial)", () => {
    expect(evaluarFormula("profundidad - 10", { profundidad: 550, prof: 999 })).toBe(540);
  });

  test("resultado negativo clampeado a 0", () => {
    expect(evaluarFormula("10 - 500", {})).toBe(0);
  });

  test("expr vacía retorna null", () => {
    expect(evaluarFormula("", {})).toBeNull();
  });

  test("expr con letras sin variable retorna null", () => {
    expect(evaluarFormula("alto - 32", {})).toBeNull();
  });

  test("división por cero retorna null (Infinity no es finito)", () => {
    expect(evaluarFormula("1 / 0", {})).toBeNull();
  });

  test("paréntesis y multiplicación", () => {
    expect(evaluarFormula("(ancho - 2) * 2", { ancho: 100 })).toBe(196);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// resolverVariables
// ════════════════════════════════════════════════════════════════════════════

describe("resolverVariables", () => {
  const baseVars = { ancho: 800, alto: 700, profundidad: 550, esp: 18 };

  test("variable numérica directa", () => {
    const r = resolverVariables({ zocalo: 100 }, baseVars);
    expect(r.zocalo).toBe(100);
  });

  test("variable como fórmula sobre base", () => {
    const r = resolverVariables({ altura_util: "alto - 100" }, baseVars);
    expect(r.altura_util).toBe(600);
  });

  test("cadena de dependencias", () => {
    const r = resolverVariables(
      { altura_util: "alto - 100", altura_media: "altura_util / 2" },
      baseVars
    );
    expect(r.altura_util).toBe(600);
    expect(r.altura_media).toBe(300);
  });

  test("dependencia circular → 0 (no infinito ni crash)", () => {
    const r = resolverVariables({ a: "b + 1", b: "a + 1" }, baseVars);
    expect(r.a).toBe(0);
    expect(r.b).toBe(0);
  });

  test("rawVars null → solo retorna baseVars", () => {
    const r = resolverVariables(null, baseVars);
    expect(r.ancho).toBe(800);
  });

  test("variables base disponibles en resultado", () => {
    const r = resolverVariables({}, baseVars);
    expect(r.alto).toBe(700);
    expect(r.esp).toBe(18);
  });

  // ── Regresión: bugs detectados en reimplementaciones inline ──────────────
  // Hist: corte/index.jsx, visor3d/buildPiezas3D.js y FormModulo preview
  // tenían cada uno una versión inline que rompía estos casos. Estos tests
  // garantizan que no vuelva a pasar al cambiar dimensiones.

  test("[regresión] variable con string vacío no rompe ni propaga NaN", () => {
    const r = resolverVariables({ vacia: "" }, baseVars);
    expect(r.vacia).toBe(0);
    expect(r.ancho).toBe(800); // base intacta
  });

  test("[regresión] variable B → A (orden inverso) se resuelve por iteración", () => {
    // En reimplementación de una pasada, B = 0 si venía antes que A.
    const r = resolverVariables(
      { b_depende_a: "a_simple + 10", a_simple: "ancho / 2" },
      baseVars
    );
    expect(r.a_simple).toBe(400);
    expect(r.b_depende_a).toBe(410);
  });

  test("[regresión] variable custom con nombre de dim base es ignorada (no pisa la dim)", () => {
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const r = resolverVariables({ ancho: "" }, baseVars);
    expect(r.ancho).toBe(800); // dim base intacta
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test("[regresión] fórmula con identificador inexistente → 0, no NaN", () => {
    // evaluarFormula no resuelve identificadores desconocidos: la expresión
    // queda con letras y falla el regex de validación → null → 0.
    const r = resolverVariables({ x: "no_existe + 5" }, baseVars);
    expect(r.x).toBe(0);
    expect(Number.isNaN(r.x)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// resolverDim
// ════════════════════════════════════════════════════════════════════════════

describe("resolverDim", () => {
  test("base - 2 espesores de 18mm = 664", () => {
    expect(resolverDim(700, -2, 0, 1, 18)).toBe(664);
  });

  test("con divisor", () => {
    expect(resolverDim(800, 0, 0, 2, 18)).toBe(400);
  });

  test("resultado negativo clampeado a 0", () => {
    expect(resolverDim(10, -10, 0, 1, 18)).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// calcularModulo
// ════════════════════════════════════════════════════════════════════════════

const MAT_MEL = { tipo: "melamina", precioM2: 1000, espesor: 18 };
const MAT_MDF = { tipo: "mdf", precioM2: 1200, espesor: 15 };

const COSTOS_BASE = {
  materiales: [MAT_MEL, MAT_MDF],
  tapacanto: [{ id: "tc1", precio: 50 }],
  manoDeObra: [{ id: "mo1", tipo: "por_modulo", precio: 500 }],
  herrajes: [{ id: "h1", precio: 200 }],
  gastosGenerales: 30,
  desperdicioPct: 20,
};

const MODULO_SIMPLE = {
  nombre: "Cuerpo simple",
  material: "melamina",
  dimensiones: { ancho: 800, profundidad: 550, alto: 700 },
  variables: {},
  piezas: [
    { nombre: "Lateral", usaDim: "alto", usaDim2: "profundidad", offsetEsp: 0, offsetMm: 0, offsetEsp2: 0, offsetMm2: 0, divisor: 1, divisor2: 1, cantidad: 2 },
    { nombre: "Base", usaDim: "ancho", usaDim2: "profundidad", offsetEsp: -2, offsetMm: 0, offsetEsp2: 0, offsetMm2: 0, divisor: 1, divisor2: 1, cantidad: 1 },
  ],
  moDeObra: { tipo: "por_modulo" },
  herrajes: [],
};

describe("calcularModulo", () => {
  test("retorna null si faltan piezas o costos", () => {
    expect(calcularModulo(null, COSTOS_BASE)).toBeNull();
    expect(calcularModulo(MODULO_SIMPLE, null)).toBeNull();
    expect(calcularModulo({ ...MODULO_SIMPLE, piezas: undefined }, COSTOS_BASE)).toBeNull();
  });

  test("calcula total > 0", () => {
    const r = calcularModulo(MODULO_SIMPLE, COSTOS_BASE);
    expect(r).not.toBeNull();
    expect(r.total).toBeGreaterThan(0);
  });

  test("materialFallback = false cuando el material existe", () => {
    const r = calcularModulo(MODULO_SIMPLE, COSTOS_BASE);
    expect(r.materialFallback).toBe(false);
  });

  test("materialFallback = true cuando el material NO existe", () => {
    const mod = { ...MODULO_SIMPLE, material: "inexistente" };
    const r = calcularModulo(mod, COSTOS_BASE);
    expect(r).not.toBeNull();
    expect(r.materialFallback).toBe(true);
  });

  test("aumentar alto aumenta el precio", () => {
    const modBajo = { ...MODULO_SIMPLE, dimensiones: { ancho: 800, profundidad: 550, alto: 700 } };
    const modAlto = { ...MODULO_SIMPLE, dimensiones: { ancho: 800, profundidad: 550, alto: 1000 } };
    const rBajo = calcularModulo(modBajo, COSTOS_BASE);
    const rAlto = calcularModulo(modAlto, COSTOS_BASE);
    expect(rAlto.total).toBeGreaterThan(rBajo.total);
  });

  test("espesor del material correcto", () => {
    const r = calcularModulo(MODULO_SIMPLE, COSTOS_BASE);
    expect(r.espesor).toBe(18);
  });

  test("aplica % desperdicio", () => {
    const r = calcularModulo(MODULO_SIMPLE, COSTOS_BASE);
    expect(r.m2Total).toBeCloseTo(r.m2Neto * 1.2, 5);
  });

  test("aplica % gastosGenerales", () => {
    const r = calcularModulo(MODULO_SIMPLE, COSTOS_BASE);
    expect(r.total).toBeCloseTo(r.costoBase * 1.3, 1);
  });

  test("variables personalizadas afectan dimensiones", () => {
    const mod = {
      ...MODULO_SIMPLE,
      variables: { altura_util: "alto - 100" },
      piezas: [
        { nombre: "Lateral", formula1: "altura_util", usaDim2: "profundidad", offsetEsp2: 0, offsetMm2: 0, divisor2: 1, cantidad: 2 },
      ],
    };
    const r = calcularModulo(mod, COSTOS_BASE);
    expect(r).not.toBeNull();
    // lateral: altura_util = 700 - 100 = 600
    expect(r.desglosePiezas[0].d1).toBe(600);
  });

  test("piezasNegativas vacío cuando todo es positivo", () => {
    const r = calcularModulo(MODULO_SIMPLE, COSTOS_BASE);
    expect(r.piezasNegativas).toEqual([]);
  });

  test("piezasNegativas detecta fórmula negativa", () => {
    const mod = {
      ...MODULO_SIMPLE,
      piezas: [
        { nombre: "Negativa", formula1: "alto - 5000", usaDim2: "profundidad", offsetEsp2: 0, offsetMm2: 0, divisor2: 1, cantidad: 1 },
      ],
    };
    const r = calcularModulo(mod, COSTOS_BASE);
    expect(r.piezasNegativas).toContain("Negativa");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// recalcularTotalPresupuesto
// ════════════════════════════════════════════════════════════════════════════

describe("recalcularTotalPresupuesto", () => {
  const modulos = { MOD1: MODULO_SIMPLE };

  const presupuesto = {
    items: [{ id: "item1", codigo: "MOD1", cantidad: 2 }],
    dimOverride: {},
    adicionales: [{ id: "ad1", monto: "500" }],
    costosDirectos: [],
  };

  test("retorna null si faltan datos mínimos", () => {
    expect(recalcularTotalPresupuesto(null, modulos, COSTOS_BASE)).toBeNull();
    expect(recalcularTotalPresupuesto(presupuesto, null, COSTOS_BASE)).toBeNull();
  });

  test("total = 2 × precio_módulo + adicionales", () => {
    const r = recalcularTotalPresupuesto(presupuesto, modulos, COSTOS_BASE);
    const modCalc = calcularModulo(MODULO_SIMPLE, COSTOS_BASE);
    expect(r).toBeCloseTo(modCalc.total * 2 + 500, 0);
  });

  test("dimOverride cambia el total", () => {
    const conOverride = {
      ...presupuesto,
      dimOverride: { item1: { ancho: 800, profundidad: 550, alto: 1000 } },
    };
    const sinOverride = recalcularTotalPresupuesto(presupuesto, modulos, COSTOS_BASE);
    const conOv = recalcularTotalPresupuesto(conOverride, modulos, COSTOS_BASE);
    expect(conOv).toBeGreaterThan(sinOverride);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// presupuestoTieneContenido
// ════════════════════════════════════════════════════════════════════════════

describe("presupuestoTieneContenido", () => {
  test("true si tiene items", () => {
    expect(presupuestoTieneContenido({ items: [{}] })).toBe(true);
  });

  test("true si tiene adicionales", () => {
    expect(presupuestoTieneContenido({ items: [], adicionales: [{}] })).toBe(true);
  });

  test("false si todo vacío", () => {
    expect(presupuestoTieneContenido({ items: [], adicionales: [], costosDirectos: [] })).toBe(false);
  });

  test("false si es null", () => {
    expect(presupuestoTieneContenido(null)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// calcularTotalVisual
// ════════════════════════════════════════════════════════════════════════════

describe("calcularTotalVisual", () => {
  test("sin descuento ni ganancia", () => {
    const r = calcularTotalVisual(10000, 0, 0);
    expect(r.totalFinal).toBe(10000);
    expect(r.hayDescuento).toBe(false);
    expect(r.hayGanancia).toBe(false);
  });

  test("con descuento", () => {
    const r = calcularTotalVisual(10000, 1000, 0);
    expect(r.totalFinal).toBe(9000);
    expect(r.hayDescuento).toBe(true);
  });

  test("con ganancia extra", () => {
    const r = calcularTotalVisual(10000, 0, 2000);
    expect(r.totalFinal).toBe(12000);
    expect(r.hayGanancia).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// applyFactor / restoreFrom
// ════════════════════════════════════════════════════════════════════════════

describe("applyFactor", () => {
  test("multiplica el campo correcto", () => {
    const arr = [{ id: 1, precioM2: 1000 }];
    const r = applyFactor(arr, "precioM2", 1.1);
    expect(r[0].precioM2).toBe(1100);
  });

  test("no muta el array original", () => {
    const arr = [{ id: 1, precio: 500 }];
    applyFactor(arr, "precio", 2);
    expect(arr[0].precio).toBe(500);
  });
});

describe("restoreFrom", () => {
  test("restaura por id", () => {
    const current = [{ id: "a", precio: 999 }];
    const snap    = [{ id: "a", precio: 500 }];
    const r = restoreFrom(current, snap, "precio");
    expect(r[0].precio).toBe(500);
  });

  test("fallback por nombre cuando no hay id match", () => {
    const current = [{ id: "x", nombre: "Melamina", precio: 999 }];
    const snap    = [{ id: "y", nombre: "Melamina", precio: 500 }];
    const r = restoreFrom(current, snap, "precio");
    expect(r[0].precio).toBe(500);
  });

  test("no toca ítems sin match", () => {
    const current = [{ id: "z", nombre: "Otro", precio: 999 }];
    const snap    = [{ id: "a", nombre: "Melamina", precio: 500 }];
    const r = restoreFrom(current, snap, "precio");
    expect(r[0].precio).toBe(999);
  });
});
