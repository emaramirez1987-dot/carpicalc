// ════════════════════════════════════════════════════════════════════════════
// materialesService.js — CarpiCálc
// ════════════════════════════════════════════════════════════════════════════
//
// Service puro de materiales:
//   - MATERIAL_VACIO: contrato canónico
//   - normalizarMaterial: parser tolerante (acepta legacy, nuevo, partial)
//   - derivarPrecioM2: cálculo precioPlaca → precioM2
//   - unificarLegacy: migración costos.materiales + materiales3D mapa → array unificado
//   - asignacionesDe: helper derivado (no persistido), recorre módulos para listar usos
//
//   Resolución de materiales para cálculo de costo:
//   - resolverMaterial: id → default → fallback-vacio (sin caída a legacy en runtime)
//   - backfillEsDefault: heal one-time para materiales pre-flag esDefault
//   - aplicarDefaultExclusivo: garantiza single-default-por-tipo al guardar
//   - autopromoverPorTipo: oldest-by-fechaCreacion cuando un tipo queda huérfano
//   - derivarCostosMateriales: arma el array que calcularModulo consume
//
// IMPORTANTE: No importa React. Funciones puras.
// ════════════════════════════════════════════════════════════════════════════

// ── Contrato canónico del Material ─────────────────────────────────────────
export const MATERIAL_VACIO = {
  id:                  null,        // string (uuid) — generado al crear
  codigo:              "",          // ex codigoEgger — clave de relación con texturas y zonas
  nombre:              "",
  categoria:           null,        // categoriaId del workspace, o null
  textura:             null,        // dataURL PNG o null — preview/render visual
  tipo:                "melamina",  // TIPO_MAT — categorización técnica (afecta corte y cálculo)
  esDefault:           false,       // único default por tipo → resolver lo prefiere
  espesor:             18,          // mm
  placaLargo:          2750,        // mm
  placaAncho:          1830,        // mm
  precioPlaca:         0,           // ARS — input principal
  precioM2:            0,           // ARS/m² — derivado de precioPlaca, cacheado para no recalcular
  proveedor:           "",
  veta:                "ninguna",   // "horizontal" | "vertical" | "ninguna"
  observaciones:       "",
  fechaCreacion:       null,        // timestamp ms
  fechaActualizacion:  null,        // timestamp ms
};

// ── Helper: derivar precioM2 desde precioPlaca + dimensiones ──────────────
export function derivarPrecioM2(precioPlaca, placaLargo, placaAncho) {
  const pp = parseFloat(precioPlaca) || 0;
  const pl = parseFloat(placaLargo)  || 0;
  const pa = parseFloat(placaAncho)  || 0;
  if (pp <= 0 || pl <= 0 || pa <= 0) return 0;
  const m2 = (pl * pa) / 1_000_000;
  return Math.round((pp / m2) * 100) / 100;
}

// ── Normalizador: acepta varios formatos y devuelve el canónico ───────────
export function normalizarMaterial(raw, opts = {}) {
  if (!raw || typeof raw !== "object") return null;
  const now = opts.now ?? Date.now();

  const codigo = raw.codigo ?? raw.codigoEgger ?? "";
  const textura = raw.textura ?? raw.dataUrl ?? null;
  const categoria = raw.categoria ?? raw.grupo ?? null;
  const placaLargo = parseFloat(raw.placaLargo) || MATERIAL_VACIO.placaLargo;
  const placaAncho = parseFloat(raw.placaAncho) || MATERIAL_VACIO.placaAncho;
  const precioM2Legacy = parseFloat(raw.precioM2) || 0;

  let precioPlaca = parseFloat(raw.precioPlaca);
  let precioM2;
  if (!isNaN(precioPlaca) && precioPlaca > 0) {
    precioM2 = derivarPrecioM2(precioPlaca, placaLargo, placaAncho);
  } else if (precioM2Legacy > 0) {
    const m2 = (placaLargo * placaAncho) / 1_000_000;
    precioPlaca = Math.round(precioM2Legacy * m2 * 100) / 100;
    precioM2 = precioM2Legacy;
  } else {
    precioPlaca = 0;
    precioM2 = 0;
  }

  return {
    ...MATERIAL_VACIO,
    id:                 raw.id ?? null,
    codigo:             String(codigo || "").toUpperCase().trim(),
    nombre:             raw.nombre ?? "",
    categoria,
    textura,
    tipo:               raw.tipo ?? MATERIAL_VACIO.tipo,
    // esDefault solo se setea si vino explícito. Falsy por default — el backfill o el usuario lo elevan.
    esDefault:          raw.esDefault === true,
    espesor:            parseFloat(raw.espesor) || MATERIAL_VACIO.espesor,
    placaLargo,
    placaAncho,
    precioPlaca,
    precioM2,
    proveedor:          raw.proveedor ?? "",
    veta:               raw.veta ?? MATERIAL_VACIO.veta,
    observaciones:      raw.observaciones ?? "",
    fechaCreacion:      raw.fechaCreacion ?? now,
    fechaActualizacion: raw.fechaActualizacion ?? now,
  };
}

// ── Migración legacy: unifica costos.materiales[] + materiales3D mapa ─────
export function unificarLegacy({ costosMateriales = [], materiales3DMap = {}, now = Date.now() } = {}) {
  const porCodigo = new Map();
  const sinCodigo = [];

  for (const raw of costosMateriales) {
    const m = normalizarMaterial(raw, { now });
    if (!m) continue;
    if (!m.id) m.id = generarId();
    if (m.codigo) {
      porCodigo.set(m.codigo, m);
    } else {
      sinCodigo.push(m);
    }
  }

  for (const [codRaw, mat3d] of Object.entries(materiales3DMap || {})) {
    const cod = String(codRaw || "").toUpperCase().trim();
    if (!cod) continue;
    const existente = porCodigo.get(cod);
    if (existente) {
      if (!existente.textura && mat3d?.dataUrl) existente.textura = mat3d.dataUrl;
      if (!existente.nombre && mat3d?.nombre) existente.nombre = mat3d.nombre;
    } else {
      porCodigo.set(cod, normalizarMaterial({
        id: generarId(),
        codigo: cod,
        nombre: mat3d?.nombre || cod,
        textura: mat3d?.dataUrl ?? null,
      }, { now }));
    }
  }

  // Marcar default explícito: primer material por tipo (criterio: fechaCreacion asc).
  // Esto reemplaza la "selección implícita por orden de array" del sistema anterior,
  // convirtiéndola en intención persistida y editable.
  const merged = [...porCodigo.values(), ...sinCodigo];
  return aplicarBackfillInterno(merged);
}

// ── Vista derivada: mapa por código para Vista 3D / Render IA legacy ──────
export function materialesComoMapa3D(materiales = []) {
  const out = {};
  for (const m of materiales) {
    if (!m?.codigo) continue;
    if (!m.textura) continue;
    out[m.codigo] = { nombre: m.nombre || m.codigo, dataUrl: m.textura };
  }
  return out;
}

// ── Asignaciones derivadas (no persistido) ─────────────────────────────────
export function asignacionesDe(materiales = [], modulos = {}) {
  const idx = {};
  const init = (cod) => { if (!idx[cod]) idx[cod] = []; };

  for (const [modCod, m] of Object.entries(modulos)) {
    if (!m) continue;
    if (m.material) { init(m.material); idx[m.material].push({ moduloCodigo: modCod }); }
    for (const z of m.zonas || []) {
      if (z.material) { init(z.material); idx[z.material].push({ moduloCodigo: modCod, zonaId: z.id }); }
    }
  }
  return idx;
}

// ════════════════════════════════════════════════════════════════════════════
//   RESOLUCIÓN DE MATERIAL PARA CÁLCULO DE COSTO
// ════════════════════════════════════════════════════════════════════════════
//
// Reglas (en orden):
//   1. modulo.materialId → buscar por id en materiales[]
//   2. modulo.material   → buscar { tipo === material, esDefault === true }
//   3. Fallback-vacio    → MATERIAL_VACIO con precioM2 = 0, warning fuerte
//
// NO existe caída a costos.materiales legacy en runtime: legacy se usa solo en
// unificarLegacy() al migrar por primera vez. Si después de migrado un tipo
// queda sin default, el resolver devuelve fallback-vacio con warning. Esto
// fuerza al usuario a actuar (marcar un default) en vez de silenciar el bug
// con un precio invisible no editable.
//
// Devuelve: { material, source, warning? }
//   source: "id" | "default" | "fallback-vacio"
//   warning: string opcional con descripción accionable
// ════════════════════════════════════════════════════════════════════════════

export function resolverMaterial({ modulo, materiales = [] } = {}) {
  if (!modulo || typeof modulo !== "object") {
    return {
      material: { ...MATERIAL_VACIO },
      source: "fallback-vacio",
      warning: "resolverMaterial: módulo vacío o inválido — usando material vacío (precioM2=0)",
    };
  }

  // 1. Resolución por ID (preparado para futuro B)
  if (modulo.materialId) {
    const porId = materiales.find(m => m && m.id === modulo.materialId);
    if (porId) return { material: porId, source: "id" };
    // Si materialId apunta a algo borrado, advertimos y caemos al paso 2.
    const warningId = `resolverMaterial: módulo "${modulo.nombre || modulo.codigo || "?"}" referencia materialId="${modulo.materialId}" que no existe en biblioteca — intentando resolver por tipo`;
    const porTipo = resolverPorTipo(modulo, materiales);
    if (porTipo) return { material: porTipo, source: "default", warning: warningId };
    return {
      material: { ...MATERIAL_VACIO, tipo: modulo.material || MATERIAL_VACIO.tipo },
      source: "fallback-vacio",
      warning: `${warningId} — tampoco hay default para tipo "${modulo.material || "?"}", usando vacío (precioM2=0)`,
    };
  }

  // 2. Resolución por tipo + esDefault
  const porTipo = resolverPorTipo(modulo, materiales);
  if (porTipo) return { material: porTipo, source: "default" };

  // 3. Fallback-vacio
  const tipo = modulo.material || MATERIAL_VACIO.tipo;
  return {
    material: { ...MATERIAL_VACIO, tipo },
    source: "fallback-vacio",
    warning: `resolverMaterial: no hay material default para tipo "${tipo}" en la biblioteca — usando vacío (precioM2=0). Marcá un default en Costos → Materiales.`,
  };
}

function resolverPorTipo(modulo, materiales) {
  const tipo = modulo.material;
  if (!tipo) return null;
  return materiales.find(m => m && m.tipo === tipo && m.esDefault === true) || null;
}

// ────────────────────────────────────────────────────────────────────────────
// backfillEsDefault — heal one-time para datos pre-flag
//
// Recorre materiales[]: si algún material carece de la propiedad esDefault
// (legacy pre-feature), aplica la regla determinista de promoción: para cada
// tipo presente, marcar como default el material más antiguo por fechaCreacion.
// Devuelve { materiales: nuevos[], cambiado: bool, log: string[] }.
// El caller debe persistir si cambiado === true.
// ────────────────────────────────────────────────────────────────────────────

export function backfillEsDefault(materiales = []) {
  const sinFlag = materiales.some(m => m && typeof m.esDefault !== "boolean");
  if (!sinFlag) return { materiales, cambiado: false, log: [] };

  const log = [];
  const nuevos = aplicarBackfillInterno(materiales, log);
  return { materiales: nuevos, cambiado: true, log };
}

function aplicarBackfillInterno(materiales, log = []) {
  // Agrupar por tipo, ordenar por fechaCreacion asc, marcar el primero como default.
  const porTipo = new Map();
  for (const m of materiales) {
    if (!m) continue;
    const tipo = m.tipo || MATERIAL_VACIO.tipo;
    if (!porTipo.has(tipo)) porTipo.set(tipo, []);
    porTipo.get(tipo).push(m);
  }

  const idsDefault = new Set();
  for (const [tipo, lista] of porTipo.entries()) {
    const ordenados = [...lista].sort((a, b) => (a.fechaCreacion || 0) - (b.fechaCreacion || 0));
    const elegido = ordenados[0];
    if (elegido?.id) {
      idsDefault.add(elegido.id);
      log.push(`backfill: tipo "${tipo}" → default="${elegido.codigo || elegido.nombre || elegido.id}" (fechaCreacion ${elegido.fechaCreacion})`);
    }
  }

  return materiales.map(m => {
    if (!m) return m;
    return { ...m, esDefault: idsDefault.has(m.id) };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// aplicarDefaultExclusivo — single default por tipo
//
// Cuando se guarda un material con esDefault=true, desmarca a todos los demás
// del MISMO tipo. Usa el tipo NUEVO del material guardado (no el viejo). Si el
// material guardado tiene esDefault=false, no toca a los otros — pero el caller
// debe llamar a autopromoverPorTipo para chequear si el tipo quedó huérfano.
// ────────────────────────────────────────────────────────────────────────────

export function aplicarDefaultExclusivo(materiales = [], guardado) {
  if (!guardado || !guardado.id) return materiales;
  if (guardado.esDefault !== true) return materiales;
  return materiales.map(m => {
    if (!m || m.id === guardado.id) return m;
    if (m.tipo !== guardado.tipo) return m;
    if (m.esDefault !== true) return m;
    return { ...m, esDefault: false };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// autopromoverPorTipo — continuidad operativa
//
// Si un tipo quedó sin default (porque se borró el default, o porque el default
// cambió a otro tipo), promueve al material más antiguo (por fechaCreacion) del
// tipo huérfano. Devuelve { materiales, promociones: [{tipo, id, motivo}] }.
//
// El caller usa `promociones` para emitir warnings al usuario.
// ────────────────────────────────────────────────────────────────────────────

export function autopromoverPorTipo(materiales = []) {
  const porTipo = new Map();
  for (const m of materiales) {
    if (!m) continue;
    const tipo = m.tipo || MATERIAL_VACIO.tipo;
    if (!porTipo.has(tipo)) porTipo.set(tipo, []);
    porTipo.get(tipo).push(m);
  }

  const promociones = [];
  const idsNuevoDefault = new Set();

  for (const [tipo, lista] of porTipo.entries()) {
    const tieneDefault = lista.some(m => m.esDefault === true);
    if (tieneDefault) continue;
    const ordenados = [...lista].sort((a, b) => (a.fechaCreacion || 0) - (b.fechaCreacion || 0));
    const elegido = ordenados[0];
    if (elegido?.id) {
      idsNuevoDefault.add(elegido.id);
      promociones.push({
        tipo,
        id: elegido.id,
        codigo: elegido.codigo || elegido.nombre || elegido.id,
        motivo: "Tipo quedó sin default — autopromovido el más antiguo por fechaCreacion",
      });
    }
  }

  if (promociones.length === 0) return { materiales, promociones: [] };

  const nuevos = materiales.map(m => {
    if (!m) return m;
    if (idsNuevoDefault.has(m.id)) return { ...m, esDefault: true };
    return m;
  });
  return { materiales: nuevos, promociones };
}

// ────────────────────────────────────────────────────────────────────────────
// derivarCostosMateriales — puente al motor de costo
//
// calcularModulo (utils.js) espera costos.materiales como array plano de
// { tipo, precioM2, espesor, ... }. Esta función lo arma desde la biblioteca,
// tomando UN material por tipo (el default). Si un tipo no tiene default y
// existe en `costosLegacy`, conserva la entrada legacy (compat durante boot
// con datos no migrados). En estado normal post-migración, todo viene de la
// biblioteca.
// ────────────────────────────────────────────────────────────────────────────

export function derivarCostosMateriales(materiales = [], costosLegacy = []) {
  const porTipo = new Map();

  for (const m of materiales) {
    if (!m || m.esDefault !== true) continue;
    if (!m.tipo) continue;
    porTipo.set(m.tipo, {
      tipo:      m.tipo,
      precioM2:  m.precioM2 || 0,
      espesor:   m.espesor  || MATERIAL_VACIO.espesor,
      // Conservar datos extras por si algún consumidor los lee
      codigo:    m.codigo,
      nombre:    m.nombre,
      _sourceId: m.id,
    });
  }

  // Conservar entradas legacy para tipos no cubiertos por la biblioteca.
  // Esto cubre el caso transitorio donde la biblioteca está vacía pero
  // existen presupuestos vivos que dependen del array legacy.
  for (const raw of costosLegacy) {
    if (!raw?.tipo) continue;
    if (porTipo.has(raw.tipo)) continue;
    porTipo.set(raw.tipo, raw);
  }

  return [...porTipo.values()];
}

// ── ID generator ──────────────────────────────────────────────────────────
function generarId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `mat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
