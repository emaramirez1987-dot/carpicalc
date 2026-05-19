// Tests para materialesService.js — resolver y helpers de defaults

import {
  resolverMaterial,
  backfillEsDefault,
  aplicarDefaultExclusivo,
  autopromoverPorTipo,
  derivarCostosMateriales,
  unificarLegacy,
  MATERIAL_VACIO,
} from "./materialesService.js";

// ── Helpers de fixtures ───────────────────────────────────────────────────
const mat = (over = {}) => ({
  ...MATERIAL_VACIO,
  id:            over.id   || `id-${Math.random().toString(36).slice(2, 8)}`,
  codigo:        over.codigo || "",
  nombre:        over.nombre || "",
  tipo:          over.tipo  || "melamina",
  esDefault:     over.esDefault === true,
  precioM2:      over.precioM2 ?? 1000,
  espesor:       over.espesor  ?? 18,
  fechaCreacion: over.fechaCreacion ?? 1000,
  ...over,
});

// ════════════════════════════════════════════════════════════════════════════
//   resolverMaterial — 5 casos críticos
// ════════════════════════════════════════════════════════════════════════════

describe("resolverMaterial", () => {
  test("1. resuelve por materialId (hit directo)", () => {
    const m1 = mat({ id: "m1", tipo: "melamina", esDefault: false, precioM2: 100 });
    const m2 = mat({ id: "m2", tipo: "mdf",      esDefault: true,  precioM2: 200 });
    const r = resolverMaterial({
      modulo: { materialId: "m1", material: "melamina" },
      materiales: [m1, m2],
    });
    expect(r.source).toBe("id");
    expect(r.material.id).toBe("m1");
    expect(r.warning).toBeUndefined();
  });

  test("2. materialId apunta a material borrado → cae a tipo+default con warning", () => {
    const m1 = mat({ id: "m1", tipo: "melamina", esDefault: true, precioM2: 100 });
    const r = resolverMaterial({
      modulo: { materialId: "borrado-no-existe", material: "melamina" },
      materiales: [m1],
    });
    expect(r.source).toBe("default");
    expect(r.material.id).toBe("m1");
    expect(r.warning).toMatch(/materialId="borrado-no-existe"/);
  });

  test("3. resuelve por tipo cuando hay default explícito", () => {
    const m1 = mat({ id: "m1", tipo: "melamina", esDefault: false, precioM2: 100 });
    const m2 = mat({ id: "m2", tipo: "melamina", esDefault: true,  precioM2: 200 });
    const r = resolverMaterial({
      modulo: { material: "melamina" },
      materiales: [m1, m2],
    });
    expect(r.source).toBe("default");
    expect(r.material.id).toBe("m2");
    expect(r.material.precioM2).toBe(200);
  });

  test("4. tipo sin default → fallback-vacio con warning fuerte", () => {
    const m1 = mat({ id: "m1", tipo: "melamina", esDefault: false });
    const r = resolverMaterial({
      modulo: { material: "melamina" },
      materiales: [m1],
    });
    expect(r.source).toBe("fallback-vacio");
    expect(r.material.precioM2).toBe(0);
    expect(r.material.tipo).toBe("melamina");
    expect(r.warning).toMatch(/no hay material default para tipo "melamina"/);
  });

  test("5. modulo.material undefined → fallback-vacio", () => {
    const r = resolverMaterial({
      modulo: { /* sin material ni materialId */ },
      materiales: [mat({ esDefault: true })],
    });
    expect(r.source).toBe("fallback-vacio");
    expect(r.material.precioM2).toBe(0);
    expect(r.warning).toBeDefined();
  });

  test("modulo null/undefined no rompe — devuelve fallback-vacio", () => {
    const r = resolverMaterial({ modulo: null, materiales: [] });
    expect(r.source).toBe("fallback-vacio");
    expect(r.warning).toMatch(/módulo vacío/);
  });

  test("materialId apunta a borrado Y tipo tampoco tiene default → fallback-vacio doble warning", () => {
    const r = resolverMaterial({
      modulo: { materialId: "ghost", material: "aglomerado" },
      materiales: [mat({ tipo: "melamina", esDefault: true })],
    });
    expect(r.source).toBe("fallback-vacio");
    expect(r.material.tipo).toBe("aglomerado");
    expect(r.warning).toMatch(/materialId="ghost"/);
    expect(r.warning).toMatch(/tampoco hay default/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
//   backfillEsDefault — heal one-time
// ════════════════════════════════════════════════════════════════════════════

describe("backfillEsDefault", () => {
  test("no toca nada si todos los materiales ya tienen esDefault: boolean", () => {
    const ms = [mat({ esDefault: true }), mat({ esDefault: false })];
    const r = backfillEsDefault(ms);
    expect(r.cambiado).toBe(false);
    expect(r.materiales).toBe(ms); // misma referencia
  });

  test("marca como default el más antiguo por fechaCreacion en cada tipo", () => {
    // Quito esDefault para simular legacy
    const sinFlag = (over) => {
      const m = mat(over);
      delete m.esDefault;
      return m;
    };
    const ms = [
      sinFlag({ id: "mela-nuevo",  tipo: "melamina", fechaCreacion: 3000 }),
      sinFlag({ id: "mela-viejo",  tipo: "melamina", fechaCreacion: 1000 }),
      sinFlag({ id: "mela-medio",  tipo: "melamina", fechaCreacion: 2000 }),
      sinFlag({ id: "mdf-unico",   tipo: "mdf",      fechaCreacion: 1500 }),
    ];
    const r = backfillEsDefault(ms);
    expect(r.cambiado).toBe(true);
    const out = Object.fromEntries(r.materiales.map(m => [m.id, m.esDefault]));
    expect(out["mela-viejo"]).toBe(true);
    expect(out["mela-medio"]).toBe(false);
    expect(out["mela-nuevo"]).toBe(false);
    expect(out["mdf-unico"]).toBe(true);
    expect(r.log.length).toBe(2); // un log por tipo
  });
});

// ════════════════════════════════════════════════════════════════════════════
//   aplicarDefaultExclusivo — single default por tipo
// ════════════════════════════════════════════════════════════════════════════

describe("aplicarDefaultExclusivo", () => {
  test("al marcar uno como default, desmarca otros del mismo tipo", () => {
    const ms = [
      mat({ id: "a", tipo: "melamina", esDefault: true }),
      mat({ id: "b", tipo: "melamina", esDefault: false }),
      mat({ id: "c", tipo: "mdf",      esDefault: true }),
    ];
    const guardado = mat({ id: "b", tipo: "melamina", esDefault: true });
    const out = aplicarDefaultExclusivo(ms, guardado);
    expect(out.find(m => m.id === "a").esDefault).toBe(false);
    expect(out.find(m => m.id === "c").esDefault).toBe(true); // otro tipo, intacto
  });

  test("no toca nada si guardado.esDefault es false", () => {
    const ms = [mat({ id: "a", tipo: "melamina", esDefault: true })];
    const guardado = mat({ id: "b", tipo: "melamina", esDefault: false });
    const out = aplicarDefaultExclusivo(ms, guardado);
    expect(out).toBe(ms);
  });

  test("usa el tipo NUEVO del guardado, no el viejo (caso cambio de tipo)", () => {
    // Material que era de melamina, ahora se guarda como MDF y como default.
    // Debe desmarcar otros MDFs, NO otros melaminas.
    const ms = [
      mat({ id: "viejo-mela",  tipo: "melamina", esDefault: true }),
      mat({ id: "otro-mdf",    tipo: "mdf",      esDefault: true }),
    ];
    const guardado = mat({ id: "cambiado", tipo: "mdf", esDefault: true });
    const out = aplicarDefaultExclusivo(ms, guardado);
    expect(out.find(m => m.id === "viejo-mela").esDefault).toBe(true);  // intacto
    expect(out.find(m => m.id === "otro-mdf").esDefault).toBe(false);   // desmarcado
  });
});

// ════════════════════════════════════════════════════════════════════════════
//   autopromoverPorTipo — continuidad cuando tipo queda huérfano
// ════════════════════════════════════════════════════════════════════════════

describe("autopromoverPorTipo", () => {
  test("promueve el más antiguo cuando un tipo no tiene default", () => {
    const ms = [
      mat({ id: "a", tipo: "melamina", esDefault: false, fechaCreacion: 2000 }),
      mat({ id: "b", tipo: "melamina", esDefault: false, fechaCreacion: 1000 }),
      mat({ id: "c", tipo: "mdf",      esDefault: true,  fechaCreacion: 1500 }),
    ];
    const r = autopromoverPorTipo(ms);
    expect(r.promociones).toHaveLength(1);
    expect(r.promociones[0].tipo).toBe("melamina");
    expect(r.promociones[0].id).toBe("b");
    expect(r.materiales.find(m => m.id === "b").esDefault).toBe(true);
    expect(r.materiales.find(m => m.id === "a").esDefault).toBe(false);
    expect(r.materiales.find(m => m.id === "c").esDefault).toBe(true);
  });

  test("no hace nada si todos los tipos ya tienen default", () => {
    const ms = [
      mat({ id: "a", tipo: "melamina", esDefault: true }),
      mat({ id: "b", tipo: "mdf",      esDefault: true }),
    ];
    const r = autopromoverPorTipo(ms);
    expect(r.promociones).toHaveLength(0);
    expect(r.materiales).toBe(ms);
  });

  test("tipo sin materiales no genera promoción (no rompe)", () => {
    const r = autopromoverPorTipo([]);
    expect(r.promociones).toHaveLength(0);
    expect(r.materiales).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
//   derivarCostosMateriales — puente al motor
// ════════════════════════════════════════════════════════════════════════════

describe("derivarCostosMateriales", () => {
  test("usa el default de cada tipo, ignora no-defaults", () => {
    const ms = [
      mat({ id: "a", tipo: "melamina", esDefault: false, precioM2: 999 }),
      mat({ id: "b", tipo: "melamina", esDefault: true,  precioM2: 100 }),
      mat({ id: "c", tipo: "mdf",      esDefault: true,  precioM2: 200 }),
    ];
    const out = derivarCostosMateriales(ms, []);
    expect(out).toHaveLength(2);
    const porTipo = Object.fromEntries(out.map(o => [o.tipo, o.precioM2]));
    expect(porTipo.melamina).toBe(100);
    expect(porTipo.mdf).toBe(200);
  });

  test("conserva entradas legacy cuando un tipo no tiene default en biblioteca", () => {
    const ms = [mat({ tipo: "melamina", esDefault: true, precioM2: 100 })];
    const legacy = [
      { tipo: "mdf", precioM2: 300, espesor: 18 },
      { tipo: "melamina", precioM2: 999, espesor: 18 }, // ignorado, ya hay default
    ];
    const out = derivarCostosMateriales(ms, legacy);
    const porTipo = Object.fromEntries(out.map(o => [o.tipo, o.precioM2]));
    expect(porTipo.melamina).toBe(100); // biblioteca gana
    expect(porTipo.mdf).toBe(300);      // legacy completa
  });
});

// ════════════════════════════════════════════════════════════════════════════
//   unificarLegacy — backfill durante migración
// ════════════════════════════════════════════════════════════════════════════

describe("unificarLegacy aplica backfill", () => {
  test("primer material por tipo (fechaCreacion asc) queda marcado default", () => {
    const out = unificarLegacy({
      costosMateriales: [
        { codigo: "A1", tipo: "melamina", precioM2: 100, espesor: 18 },
        { codigo: "A2", tipo: "melamina", precioM2: 110, espesor: 18 },
        { codigo: "B1", tipo: "mdf",      precioM2: 200, espesor: 15 },
      ],
      now: 5000,
    });
    // Todos comparten fechaCreacion=5000 (no la pasamos por raw), así que el
    // primero del array (A1) gana melamina; B1 gana mdf.
    const porCodigo = Object.fromEntries(out.map(m => [m.codigo, m.esDefault]));
    expect(porCodigo.A1).toBe(true);
    expect(porCodigo.A2).toBe(false);
    expect(porCodigo.B1).toBe(true);
  });
});
