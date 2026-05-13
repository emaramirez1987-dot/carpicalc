// ════════════════════════════════════════════════════════════════════════════
// moduloService.test.js
// ════════════════════════════════════════════════════════════════════════════
//
// Tests del parser y del contrato del módulo. Cubre:
//   - parsearModulo: rechaza basura, normaliza válidos, completa campos
//   - Back-compat del schema paramétrico (Fase 1):
//       módulos viejos (sin zonas/parametros/constraints) deben pasar y
//       quedar normalizados con esos campos como [].
//   - resolverContextoModulo: integración con resolverVariables
// ════════════════════════════════════════════════════════════════════════════

import { parsearModulo, parsearPresupuesto, resolverContextoModulo } from "./moduloService.js";

// ── parsearModulo ──────────────────────────────────────────────────────────

describe("parsearModulo", () => {
  test("rechaza null", () => {
    expect(parsearModulo(null)).toBeNull();
  });

  test("rechaza string", () => {
    expect(parsearModulo("foo")).toBeNull();
  });

  test("rechaza módulo sin nombre", () => {
    expect(parsearModulo({ piezas: [], dimensiones: {} })).toBeNull();
  });

  test("rechaza módulo sin piezas (array)", () => {
    expect(parsearModulo({ nombre: "x", dimensiones: {} })).toBeNull();
  });

  test("rechaza módulo sin dimensiones", () => {
    expect(parsearModulo({ nombre: "x", piezas: [] })).toBeNull();
  });

  test("acepta módulo mínimo válido y completa defaults", () => {
    const m = parsearModulo({ nombre: "x", piezas: [], dimensiones: { ancho: 800 } });
    expect(m).not.toBeNull();
    expect(m.nombre).toBe("x");
    expect(m.dimensiones.alto).toBeGreaterThan(0); // viene de MODULO_VACIO
    expect(m.material).toBeDefined();
    expect(m.moDeObra).toBeDefined();
  });

  // ── Back-compat del schema paramétrico ─────────────────────────────────

  test("[Fase 1] módulo viejo sin parametros[] queda con []", () => {
    const m = parsearModulo({ nombre: "viejo", piezas: [], dimensiones: { ancho: 600 } });
    expect(m.parametros).toEqual([]);
  });

  test("[Fase 1] módulo viejo sin zonas[] queda con []", () => {
    const m = parsearModulo({ nombre: "viejo", piezas: [], dimensiones: { ancho: 600 } });
    expect(m.zonas).toEqual([]);
  });

  test("[Fase 1] módulo viejo sin constraints[] queda con []", () => {
    const m = parsearModulo({ nombre: "viejo", piezas: [], dimensiones: { ancho: 600 } });
    expect(m.constraints).toEqual([]);
  });

  test("[Fase 1] respeta parametros[] cuando vienen", () => {
    const params = [{ id: "cajones", nombre: "Cajones", tipo: "integer", def: 3, min: 1, max: 10 }];
    const m = parsearModulo({ nombre: "x", piezas: [], dimensiones: { ancho: 600 }, parametros: params });
    expect(m.parametros).toEqual(params);
  });

  test("[Fase 1] respeta zonas[] cuando vienen", () => {
    const zonas = [
      { id: "cuerpo",   nombre: "Cuerpo",   material: "melamina" },
      { id: "frente",   nombre: "Frente",   material: "mdf" },
    ];
    const m = parsearModulo({ nombre: "x", piezas: [], dimensiones: { ancho: 600 }, zonas });
    expect(m.zonas).toEqual(zonas);
  });

  test("[Fase 1] respeta constraints[] cuando vienen", () => {
    const cons = [{ expr: "alto >= cajones * 80", msg: "Alto insuficiente para cajones" }];
    const m = parsearModulo({ nombre: "x", piezas: [], dimensiones: { ancho: 600 }, constraints: cons });
    expect(m.constraints).toEqual(cons);
  });

  test("[Fase 1] descarta parametros si no es array (defensivo)", () => {
    const m = parsearModulo({ nombre: "x", piezas: [], dimensiones: { ancho: 600 }, parametros: "no-array" });
    expect(m.parametros).toEqual([]);
  });
});

// ── parsearPresupuesto ─────────────────────────────────────────────────────

describe("parsearPresupuesto", () => {
  test("rechaza null", () => {
    expect(parsearPresupuesto(null)).toBeNull();
  });

  test("rechaza objeto sin items", () => {
    expect(parsearPresupuesto({ nombre: "x" })).toBeNull();
  });

  test("acepta presupuesto mínimo y completa defaults", () => {
    const p = parsearPresupuesto({ items: [] });
    expect(p).not.toBeNull();
    expect(p.cliente).toEqual({ nombre: "", tel: "", dir: "" });
    expect(p.estado).toBe("nuevo");
    expect(p.adicionales).toEqual([]);
  });
});

// ── resolverContextoModulo ─────────────────────────────────────────────────

describe("resolverContextoModulo", () => {
  const costos = {
    materiales: [
      { tipo: "melamina", nombre: "Melamina 18mm", espesor: 18 },
      { tipo: "mdf",      nombre: "MDF 15mm",      espesor: 15 },
    ],
  };

  test("retorna baseVars con dims + esp del material", () => {
    const m = parsearModulo({
      nombre: "x", piezas: [],
      dimensiones: { ancho: 800, alto: 700, profundidad: 550 },
      material: "melamina",
    });
    const ctx = resolverContextoModulo(m, costos);
    expect(ctx.baseVars).toEqual({ ancho: 800, alto: 700, profundidad: 550, esp: 18 });
    expect(ctx.espesor).toBe(18);
    expect(ctx.materialDef.tipo).toBe("melamina");
  });

  test("modVars resuelve variables custom", () => {
    // Nota: construyo el módulo a mano (sin parsearModulo) porque el parser
    // actual valida `variables` como array, pero el uso real en toda la app
    // (FormModulo, corte, visor3d) la trata como objeto { key: formula }.
    // Inconsistencia heredada — deuda registrada para resolver fuera de Fase 1.
    const m = {
      nombre: "x", piezas: [],
      dimensiones: { ancho: 800, alto: 700, profundidad: 550 },
      material: "melamina",
      variables: { altura_util: "alto - 100" },
    };
    const ctx = resolverContextoModulo(m, costos);
    expect(ctx.modVars.altura_util).toBe(600);
    expect(ctx.modVars.ancho).toBe(800); // dim base preservada
  });

  test("fallback al primer material si modulo.material no matchea", () => {
    const m = parsearModulo({
      nombre: "x", piezas: [],
      dimensiones: { ancho: 600, alto: 700, profundidad: 500 },
      material: "no_existe",
    });
    const ctx = resolverContextoModulo(m, costos);
    expect(ctx.materialDef.tipo).toBe("melamina"); // primer material
  });

  test("materialDef null si costos.materiales vacío", () => {
    const m = parsearModulo({
      nombre: "x", piezas: [],
      dimensiones: { ancho: 600, alto: 700, profundidad: 500 },
    });
    const ctx = resolverContextoModulo(m, { materiales: [] });
    expect(ctx.materialDef).toBeNull();
    expect(ctx.espesor).toBe(18); // default
  });
});
