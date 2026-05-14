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

import {
  parsearModulo,
  parsearPresupuesto,
  resolverContextoModulo,
  resolverParametros,
  generarPiezas,
  evaluarConstraints,
  resolverHerrajes,
  expandirSubComponentes,
} from "./moduloService.js";

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

// ════════════════════════════════════════════════════════════════════════════
// resolverParametros (Fase 3)
// ════════════════════════════════════════════════════════════════════════════

describe("resolverParametros (Fase 3)", () => {
  test("módulo sin parametros[] → {}", () => {
    expect(resolverParametros({}, {})).toEqual({});
  });

  test("usa def cuando el usuario no provee valor", () => {
    const m = { parametros: [
      { id: "cajones", tipo: "integer", def: 3 },
      { id: "manija",  tipo: "boolean", def: false },
    ]};
    expect(resolverParametros(m, {})).toEqual({ cajones: 3, manija: false });
  });

  test("override del usuario sobre def", () => {
    const m = { parametros: [{ id: "cajones", tipo: "integer", def: 3 }] };
    expect(resolverParametros(m, { cajones: 5 })).toEqual({ cajones: 5 });
  });

  test("parámetro tipo formula se evalúa con los demás", () => {
    const m = { parametros: [
      { id: "cajones",  tipo: "integer", def: 3 },
      { id: "altoCaja", tipo: "formula", expr: "100 + cajones * 10" },
    ]};
    const r = resolverParametros(m, { cajones: 4 });
    expect(r.altoCaja).toBe(140);
  });

  test("parámetro formula con dependencia circular → 0", () => {
    const m = { parametros: [
      { id: "a", tipo: "formula", expr: "b + 1" },
      { id: "b", tipo: "formula", expr: "a + 1" },
    ]};
    const r = resolverParametros(m, {});
    expect(r.a).toBe(0);
    expect(r.b).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// generarPiezas (Fase 3)
// ════════════════════════════════════════════════════════════════════════════

describe("generarPiezas (Fase 3)", () => {
  const moduloBase = {
    nombre: "test", piezas: [], dimensiones: { ancho: 600, alto: 700, profundidad: 500 },
  };

  test("módulo viejo sin parametros → idéntico", () => {
    const m = { ...moduloBase, piezas: [{ nombre: "Lateral", cantidad: 2 }] };
    const r = generarPiezas(m, {});
    expect(r.piezas).toHaveLength(1);
    expect(r.piezas[0].nombre).toBe("Lateral");
  });

  test("condition: pieza descartada si false", () => {
    const m = { ...moduloBase,
      parametros: [{ id: "tieneTapa", tipo: "boolean", def: false }],
      piezas: [
        { nombre: "Lateral", cantidad: 2 },
        { nombre: "Tapa",    cantidad: 1, condition: "tieneTapa" },
      ],
    };
    const sin = generarPiezas(m, {});
    expect(sin.piezas).toHaveLength(1);
    expect(sin.piezas[0].nombre).toBe("Lateral");

    const con = generarPiezas(m, { tieneTapa: true });
    expect(con.piezas).toHaveLength(2);
  });

  test("condition con comparación", () => {
    const m = { ...moduloBase,
      parametros: [{ id: "cajones", tipo: "integer", def: 0 }],
      piezas: [{ nombre: "Frente cajón", cantidad: 1, condition: "cajones > 0" }],
    };
    expect(generarPiezas(m, { cajones: 0 }).piezas).toHaveLength(0);
    expect(generarPiezas(m, { cajones: 3 }).piezas).toHaveLength(1);
  });

  test("repeat con from/to numéricos", () => {
    const m = { ...moduloBase,
      piezas: [{ nombre: "Estante", cantidad: 1,
        repeat: { var: "i", from: 1, to: 3 } }],
    };
    const r = generarPiezas(m, {});
    expect(r.piezas).toHaveLength(3);
  });

  test("repeat con `to` como fórmula sobre parámetro", () => {
    const m = { ...moduloBase,
      parametros: [{ id: "cajones", tipo: "integer", def: 3 }],
      piezas: [{ nombre: "Frente #{i}", cantidad: 1,
        repeat: { var: "i", from: 1, to: "cajones" } }],
    };
    const r = generarPiezas(m, { cajones: 4 });
    expect(r.piezas).toHaveLength(4);
    expect(r.piezas.map(p => p.nombre)).toEqual([
      "Frente 1", "Frente 2", "Frente 3", "Frente 4",
    ]);
  });

  test("repeat con condition por iteración", () => {
    // Solo iteraciones impares
    const m = { ...moduloBase,
      piezas: [{ nombre: "Pieza #{i}", cantidad: 1,
        condition: "(i / 2) != round(i / 2)",  // i impar
        repeat: { var: "i", from: 1, to: 5 } }],
    };
    const r = generarPiezas(m, {});
    expect(r.piezas.map(p => p.nombre)).toEqual(["Pieza 1", "Pieza 3", "Pieza 5"]);
  });

  test("repeat con rango inválido → 0 piezas, no crash", () => {
    const m = { ...moduloBase,
      piezas: [{ nombre: "x", cantidad: 1, repeat: { var: "i", from: 5, to: 1 } }],
    };
    expect(generarPiezas(m, {}).piezas).toHaveLength(0);
  });

  test("repeat con `to: 0` (parámetro vacío) → 0 piezas", () => {
    const m = { ...moduloBase,
      parametros: [{ id: "cajones", tipo: "integer", def: 0 }],
      piezas: [{ nombre: "Cajón #{i}", cantidad: 1,
        repeat: { var: "i", from: 1, to: "cajones" } }],
    };
    expect(generarPiezas(m, { cajones: 0 }).piezas).toHaveLength(0);
  });

  test("interpolación {i} en nombre", () => {
    const m = { ...moduloBase,
      piezas: [{ nombre: "Estante {i}", cantidad: 1,
        repeat: { var: "i", from: 1, to: 2 } }],
    };
    const r = generarPiezas(m, {});
    expect(r.piezas[0].nombre).toBe("Estante 1");
    expect(r.piezas[1].nombre).toBe("Estante 2");
  });

  test("[regresión] piezas expandidas llevan _repeatVars con el índice", () => {
    // Bug previo: formula1/formula2/posFormulas que usaban `i` no resolvían
    // porque el contexto de repeat no se propagaba a buildPiezas3D / calcularModulo.
    const m = { ...moduloBase,
      piezas: [{ nombre: "P #{i}", cantidad: 1,
        repeat: { var: "i", from: 1, to: 3 } }],
    };
    const r = generarPiezas(m, {});
    expect(r.piezas).toHaveLength(3);
    expect(r.piezas[0]._repeatVars).toEqual({ i: 1 });
    expect(r.piezas[1]._repeatVars).toEqual({ i: 2 });
    expect(r.piezas[2]._repeatVars).toEqual({ i: 3 });
  });

  test("piezas expandidas no llevan repeat ni condition", () => {
    const m = { ...moduloBase,
      piezas: [{ nombre: "x", cantidad: 1, condition: "1==1",
        repeat: { var: "i", from: 1, to: 1 } }],
    };
    const r = generarPiezas(m, {});
    expect(r.piezas[0].repeat).toBeUndefined();
    expect(r.piezas[0].condition).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// evaluarConstraints (Fase 3)
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// resolverHerrajes (Fase 5)
// ════════════════════════════════════════════════════════════════════════════

describe("resolverHerrajes (Fase 5)", () => {
  test("módulo sin herrajes → []", () => {
    expect(resolverHerrajes({}, {})).toEqual([]);
  });

  test("herraje viejo { id, cantidad: number } pasa idéntico", () => {
    const m = { herrajes: [{ id: 7, cantidad: 4 }] };
    expect(resolverHerrajes(m, {})).toEqual([{ id: 7, cantidad: 4 }]);
  });

  test("herraje con cantidad como fórmula sobre parámetro", () => {
    const m = {
      parametros: [{ id: "cajones", tipo: "integer", def: 3 }],
      herrajes:   [{ id: 1, cantidad: "cajones" }],
    };
    expect(resolverHerrajes(m, { cajones: 5 })).toEqual([{ id: 1, cantidad: 5 }]);
  });

  test("herraje con cantidad como fórmula compleja", () => {
    const m = {
      parametros: [{ id: "puertas", tipo: "integer", def: 2 }],
      herrajes:   [{ id: 1, cantidad: "puertas * 2" }],
    };
    expect(resolverHerrajes(m, { puertas: 3 })).toEqual([{ id: 1, cantidad: 6 }]);
  });

  test("condition false → herraje omitido", () => {
    const m = {
      parametros: [{ id: "cajones", tipo: "integer", def: 0 }],
      herrajes:   [{ id: 1, cantidad: "cajones", condition: "cajones > 0" }],
    };
    expect(resolverHerrajes(m, { cajones: 0 })).toEqual([]);
    expect(resolverHerrajes(m, { cajones: 3 })).toEqual([{ id: 1, cantidad: 3 }]);
  });

  test("cantidad redondeada al entero más cercano", () => {
    const m = { herrajes: [{ id: 1, cantidad: "3.6" }] };
    expect(resolverHerrajes(m, {})).toEqual([{ id: 1, cantidad: 4 }]);
  });

  test("cantidad 0 → herraje omitido", () => {
    const m = { herrajes: [{ id: 1, cantidad: 0 }, { id: 2, cantidad: "0" }] };
    expect(resolverHerrajes(m, {})).toEqual([]);
  });

  test("cantidad-fórmula inválida → 0 → omitido", () => {
    const m = { herrajes: [{ id: 1, cantidad: "no_existe + 5" }] };
    expect(resolverHerrajes(m, {})).toEqual([]);
  });

  test("mix: viejos y condicionales conviven", () => {
    const m = {
      parametros: [{ id: "puertas", tipo: "integer", def: 0 }],
      herrajes: [
        { id: 1, cantidad: 4 },                                           // viejo
        { id: 2, cantidad: "puertas * 2", condition: "puertas > 0" },     // condicional
        { id: 3, cantidad: "puertas",     condition: "puertas > 0" },     // condicional
      ],
    };
    const r = resolverHerrajes(m, { puertas: 2 });
    expect(r).toEqual([
      { id: 1, cantidad: 4 },
      { id: 2, cantidad: 4 },
      { id: 3, cantidad: 2 },
    ]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// expandirSubComponentes (Fase Subcomponentes)
// ════════════════════════════════════════════════════════════════════════════

describe("expandirSubComponentes", () => {
  const moduloPadre = {
    nombre: "Cajonera",
    material: "melamina",
    dimensiones: { ancho: 600, alto: 720, profundidad: 550 },
    variables: {},
    piezas: [
      { nombre: "Base", cantidad: 1, formula1: "ancho", formula2: "profundidad", cara3d: "bottom" },
    ],
    herrajes: [],
    parametros: [{ id: "cajones", tipo: "integer", def: 3, min: 1, max: 6 }],
  };

  test("módulo sin subComponentes → idéntico", () => {
    const r = expandirSubComponentes(moduloPadre, {});
    expect(r.piezas).toHaveLength(1);
    expect(r.piezas[0].nombre).toBe("Base");
  });

  test("subcomp con repeat genera N instancias × M piezas internas", () => {
    const m = {
      ...moduloPadre,
      subComponentes: [{
        id: "cajon",
        nombre: "Cajón",
        repeat: { var: "i", from: 1, to: "cajones" },
        origen: { x: "esp", y: "(i-1) * 100", z: "0" },
        dimensiones: { ancho: "ancho - 2*esp", alto: "80", profundidad: "profundidad - 20" },
        piezas: [
          { nombre: "Frente",   cantidad: 1, formula1: "alto",  formula2: "ancho", cara3d: "front" },
          { nombre: "Base caja",cantidad: 1, formula1: "ancho", formula2: "profundidad", cara3d: "bottom" },
        ],
        herrajes: [{ id: 99, cantidad: 2 }],
      }],
    };
    const r = expandirSubComponentes(m, { cajones: 3 });
    // 1 base del padre + 3 instancias × 2 piezas = 7
    expect(r.piezas).toHaveLength(7);
    // 3 instancias × 2 herrajes
    expect(r.herrajes).toEqual([
      { id: 99, cantidad: 2 },
      { id: 99, cantidad: 2 },
      { id: 99, cantidad: 2 },
    ]);
  });

  test("piezas expandidas llevan _subComponente y _instancia para traza", () => {
    const m = {
      ...moduloPadre,
      subComponentes: [{
        id: "cajon", nombre: "Cajón",
        repeat: { var: "i", from: 1, to: 2 },
        dimensiones: { ancho: 100, alto: 80, profundidad: 100 },
        piezas: [{ nombre: "Frente", cantidad: 1, formula1: "alto", formula2: "ancho", cara3d: "front" }],
      }],
    };
    const r = expandirSubComponentes(m, {});
    const delSub = r.piezas.filter(p => p._subComponente === "cajon");
    expect(delSub).toHaveLength(2);
    expect(delSub[0]._instancia).toBe(1);
    expect(delSub[1]._instancia).toBe(2);
  });

  test("subcomp sin repeat genera 1 instancia", () => {
    const m = {
      ...moduloPadre,
      subComponentes: [{
        id: "puerta", nombre: "Puerta",
        dimensiones: { ancho: "ancho - 4", alto: "alto - 4", profundidad: 18 },
        piezas: [{ nombre: "Frente", cantidad: 1, formula1: "alto", formula2: "ancho", cara3d: "front" }],
      }],
    };
    const r = expandirSubComponentes(m, {});
    expect(r.piezas).toHaveLength(2); // base del padre + 1 frente del subcomp
  });

  test("subcomp con condition: si false, no se expande", () => {
    const m = {
      ...moduloPadre,
      subComponentes: [{
        id: "puerta", nombre: "Puerta",
        condition: "cajones > 5",
        dimensiones: { ancho: 100, alto: 100, profundidad: 18 },
        piezas: [{ nombre: "Frente", cantidad: 1, formula1: "alto", formula2: "ancho", cara3d: "front" }],
      }],
    };
    const r = expandirSubComponentes(m, { cajones: 3 });
    expect(r.piezas).toHaveLength(1); // solo la base del padre
  });

  test("piezas del subcomp tienen posición en coords del PADRE (origen + pos local)", () => {
    const m = {
      ...moduloPadre,
      subComponentes: [{
        id: "cajon", nombre: "Cajón",
        repeat: { var: "i", from: 1, to: 2 },
        origen: { x: "10", y: "(i-1) * 200 + 50", z: "5" },
        dimensiones: { ancho: 100, alto: 80, profundidad: 100 },
        piezas: [{
          nombre: "Frente", cantidad: 1, formula1: "alto", formula2: "ancho", cara3d: "front",
          posFormulas: { x: "20", y: "30", z: "40" },
        }],
      }],
    };
    const r = expandirSubComponentes(m, {});
    const frentes = r.piezas.filter(p => p._subComponente === "cajon");
    // i=1: origen (10, 50, 5) + pos local (20, 30, 40) = (30, 80, 45)
    expect(frentes[0].posFormulas).toEqual({ x: "30", y: "80", z: "45" });
    // i=2: origen (10, 250, 5) + pos local (20, 30, 40) = (30, 280, 45)
    expect(frentes[1].posFormulas).toEqual({ x: "30", y: "280", z: "45" });
  });

  test("anidamiento: subcomp dentro de subcomp se expande recursivamente", () => {
    const m = {
      ...moduloPadre,
      subComponentes: [{
        id: "compartimento", nombre: "Compartimento",
        repeat: { var: "j", from: 1, to: 2 },
        dimensiones: { ancho: "ancho", alto: "100", profundidad: "profundidad" },
        subComponentes: [{
          id: "cajon", nombre: "Cajón",
          repeat: { var: "i", from: 1, to: 3 },
          dimensiones: { ancho: "ancho", alto: "30", profundidad: "profundidad" },
          piezas: [{ nombre: "Frente", cantidad: 1, formula1: "alto", formula2: "ancho", cara3d: "front" }],
        }],
      }],
    };
    const r = generarPiezas(m, {});
    // 1 base del padre + (2 compartimentos × 3 cajones × 1 pieza) = 7 piezas
    expect(r.piezas).toHaveLength(1 + 6);
  });

  test("anidamiento: respeta el guard de profundidad máxima (5)", () => {
    // Construyo una cadena artificial de profundidad 6 para verificar el guard.
    const construirAnidado = (n) => n === 0
      ? { piezas: [{ nombre: "P", cantidad: 1, formula1: "alto", formula2: "ancho", cara3d: "front" }] }
      : {
          dimensiones: { ancho: 100, alto: 100, profundidad: 100 },
          subComponentes: [{
            id: `n${n}`, nombre: `N${n}`,
            dimensiones: { ancho: 100, alto: 100, profundidad: 100 },
            ...construirAnidado(n - 1),
          }],
        };
    const m = { ...moduloPadre, piezas: [], ...construirAnidado(7) };
    // No debe romper, debe loguear warn y cortar
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const r = generarPiezas(m, {});
    expect(Array.isArray(r.piezas)).toBe(true);
    spy.mockRestore();
  });

  test("integración: generarPiezas dispara expandirSubComponentes automáticamente", () => {
    const m = {
      ...moduloPadre,
      subComponentes: [{
        id: "cajon", nombre: "Cajón",
        repeat: { var: "i", from: 1, to: 3 },
        dimensiones: { ancho: 100, alto: 80, profundidad: 100 },
        piezas: [{ nombre: "Frente", cantidad: 1, formula1: "alto", formula2: "ancho", cara3d: "front" }],
      }],
    };
    const r = generarPiezas(m, {});
    expect(r.piezas).toHaveLength(1 + 3); // base + 3 frentes del subcomp
  });
});

describe("evaluarConstraints (Fase 3)", () => {
  test("sin constraints → []", () => {
    expect(evaluarConstraints({}, {})).toEqual([]);
  });

  test("constraint que pasa", () => {
    const m = {
      dimensiones: { ancho: 600, alto: 700, profundidad: 500 },
      parametros:  [{ id: "cajones", tipo: "integer", def: 3 }],
      constraints: [{ expr: "alto >= cajones * 80", msg: "Alto insuficiente" }],
    };
    const r = evaluarConstraints(m, { cajones: 3 });
    expect(r).toHaveLength(1);
    expect(r[0].ok).toBe(true);
  });

  test("constraint que falla retorna ok=false con su msg", () => {
    const m = {
      dimensiones: { ancho: 600, alto: 200, profundidad: 500 },
      parametros:  [{ id: "cajones", tipo: "integer", def: 5 }],
      constraints: [{ expr: "alto >= cajones * 80", msg: "Alto insuficiente" }],
    };
    const r = evaluarConstraints(m, { cajones: 5 });
    expect(r[0].ok).toBe(false);
    expect(r[0].msg).toBe("Alto insuficiente");
  });
});
