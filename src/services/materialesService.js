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
// Acepta:
//   - material nuevo (formato canónico) → pass-through
//   - material legacy de costos.materiales → mapeo de campos
//   - material legacy de materiales3D mapa { nombre, dataUrl } → solo textura
//   - partial (creación nueva) → completa con defaults
export function normalizarMaterial(raw, opts = {}) {
  if (!raw || typeof raw !== "object") return null;
  const now = opts.now ?? Date.now();

  // Mapeo de campos legacy → canónico
  const codigo = raw.codigo ?? raw.codigoEgger ?? "";
  const textura = raw.textura ?? raw.dataUrl ?? null;
  const categoria = raw.categoria ?? raw.grupo ?? null;       // grupo del MVP → categoria
  const placaLargo = parseFloat(raw.placaLargo) || MATERIAL_VACIO.placaLargo;
  const placaAncho = parseFloat(raw.placaAncho) || MATERIAL_VACIO.placaAncho;
  const precioM2Legacy = parseFloat(raw.precioM2) || 0;

  // Si vino precioPlaca explícito, usar ese; si no, derivar desde precioM2 legacy
  let precioPlaca = parseFloat(raw.precioPlaca);
  let precioM2;
  if (!isNaN(precioPlaca) && precioPlaca > 0) {
    precioM2 = derivarPrecioM2(precioPlaca, placaLargo, placaAncho);
  } else if (precioM2Legacy > 0) {
    // Legacy: solo tenían precioM2. Derivar precioPlaca para que el modelo quede consistente.
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
// Estrategia:
//   1. Cada item de costos.materiales se normaliza (lleva precio, espesor, código)
//   2. Cada entry de materiales3D mapa { [codigo]: { nombre, dataUrl } } se
//      fusiona con el material existente por código, o crea uno nuevo solo-textura
//   3. Resultado: array de materiales unificados, sin duplicados por código
export function unificarLegacy({ costosMateriales = [], materiales3DMap = {}, now = Date.now() } = {}) {
  const porCodigo = new Map();     // codigoUpper → material
  const sinCodigo = [];            // materiales legacy sin código (raros)

  // 1. Materiales de costos
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

  // 2. Texturas 3D — fusionar o crear
  for (const [codRaw, mat3d] of Object.entries(materiales3DMap || {})) {
    const cod = String(codRaw || "").toUpperCase().trim();
    if (!cod) continue;
    const existente = porCodigo.get(cod);
    if (existente) {
      // Fusionar: agregar textura al material existente
      if (!existente.textura && mat3d?.dataUrl) {
        existente.textura = mat3d.dataUrl;
      }
      // Si tenía nombre 3D y el material no tiene nombre, usarlo
      if (!existente.nombre && mat3d?.nombre) {
        existente.nombre = mat3d.nombre;
      }
    } else {
      // Crear material solo-textura (sin precio aún)
      porCodigo.set(cod, normalizarMaterial({
        id: generarId(),
        codigo: cod,
        nombre: mat3d?.nombre || cod,
        textura: mat3d?.dataUrl ?? null,
      }, { now }));
    }
  }

  return [...porCodigo.values(), ...sinCodigo];
}

// ── Vista derivada: mapa por código para Vista 3D / Render IA legacy ──────
// Mantiene el shape { [codigo]: { nombre, dataUrl } } que esperan los componentes
// 3D actuales. Permite migrar el modelo sin tocar Vista3DTab/Escena3DPrincipal.
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
// Dada la lista de módulos, devuelve para cada material qué módulos lo usan
// (vía modulo.material o pieza.zona → zonas[].material).
// Resultado: { [codigoMaterial]: [{moduloCodigo, piezaIndex?}] }
export function asignacionesDe(materiales = [], modulos = {}) {
  const idx = {};
  const init = (cod) => { if (!idx[cod]) idx[cod] = []; };

  for (const [modCod, m] of Object.entries(modulos)) {
    if (!m) continue;
    // Material del módulo (referencia por tipo, no por código todavía — esto es
    // legacy. La integración completa con vista 3D viene en otra fase.)
    if (m.material) { init(m.material); idx[m.material].push({ moduloCodigo: modCod }); }
    // Zonas
    for (const z of m.zonas || []) {
      if (z.material) { init(z.material); idx[z.material].push({ moduloCodigo: modCod, zonaId: z.id }); }
    }
  }
  return idx;
}

// ── ID generator ──────────────────────────────────────────────────────────
function generarId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `mat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
