// ════════════════════════════════════════════════════════════════════════════
// storage.js — CarpiCálc
// ════════════════════════════════════════════════════════════════════════════
//
// Capa de abstracción sobre localStorage.
// Centraliza TODAS las operaciones de lectura y escritura de datos.
//
// ¿Cuándo tocar este archivo?
//   • Para cambiar la clave de una colección en localStorage
//   • Para migrar el formato de datos (agregar campo con valor por defecto)
//   • Para agregar una nueva colección persistida
//   • Para cambiar el límite de snapshots del historial de precios
//
// CLAVES DE localStorage usadas por la app:
//   carpicalc:modulos       → catálogo de módulos del carpintero
//   carpicalc:costos        → tabla de precios de materiales, herrajes, etc.
//   carpicalc:presupuestos  → trabajos guardados
//   carpicalc:perfil        → datos del taller (nombre, logo, etc.)
//   carpicalc:historial     → snapshots de precios (máx 20)
//   carpicalc:costos_version→ timestamp del último cambio en costos
//   carpicalc:borrador      → autosave del presupuesto activo
//   carpicalc:auth          → sesión de login (existe = autenticado)
//   carpicalc:tema          → "dark" | "light"
//   carpicalc:ultimo_backup → timestamp del último backup exportado
//
// IMPORTANTE: Este archivo NO importa React.
// ════════════════════════════════════════════════════════════════════════════

import { modulosIniciales, costoIniciales, PERFIL_VACIO } from "./constants.js";

// ── Escritura genérica ────────────────────────────────────────────────────

/**
 * Guarda cualquier dato serializable en localStorage.
 * Captura errores silenciosamente (ej: storage lleno en iOS Safari).
 *
 * @param {string} key   - Clave de localStorage
 * @param {any}    data  - Dato a guardar (se serializa con JSON.stringify)
 * @returns {Promise<boolean>} true si se guardó, false si hubo error
 */
export const _save = async (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
};

// ── Carga inicial de toda la aplicación ───────────────────────────────────

/**
 * Carga todos los datos persistidos al iniciar la app.
 * Si alguna clave no existe (primera vez), usa los valores iniciales.
 *
 * @returns {{ modulos, costos, presupuestos, perfil }}
 */
export async function cargarDatos() {
  try {
    const rm  = localStorage.getItem("carpicalc:modulos");
    const rc  = localStorage.getItem("carpicalc:costos");
    const rp  = localStorage.getItem("carpicalc:presupuestos");
    const rpf = localStorage.getItem("carpicalc:perfil");

    const presupuestos = rp ? JSON.parse(rp) : {};
    let   modulos      = rm ? JSON.parse(rm)  : modulosIniciales;

    // ── Limpieza de módulos temporales huérfanos ──────────────────────────
    // Ocurre ANTES de retornar los datos para que el estado de React
    // nunca vea referencias inconsistentes.
    //
    // Un TEMP es huérfano cuando su presupuestoId ya no existe en presupuestos
    // (el presupuesto fue eliminado en una sesión anterior sin limpiar correctamente).
    const presIds = new Set(Object.keys(presupuestos));
    const modulosLimpios = Object.fromEntries(
      Object.entries(modulos).filter(([, m]) => {
        if (!m.temporal) return true;               // permanente → conservar
        if (!m.presupuestoId) return false;         // temporal sin dueño → huérfano
        return presIds.has(m.presupuestoId);        // solo si el presupuesto existe
      })
    );
    const huboCambios = Object.keys(modulosLimpios).length < Object.keys(modulos).length;
    if (huboCambios) {
      // Persistir limpieza inmediatamente para que la próxima carga también esté limpia
      localStorage.setItem("carpicalc:modulos", JSON.stringify(modulosLimpios));
      modulos = modulosLimpios;
    }

    return {
      modulos,
      costos:       rc  ? JSON.parse(rc)  : costoIniciales,
      presupuestos,
      perfil:       rpf ? { ...PERFIL_VACIO, ...JSON.parse(rpf) } : { ...PERFIL_VACIO },
    };
  } catch {
    return {
      modulos:      modulosIniciales,
      costos:       costoIniciales,
      presupuestos: {},
      perfil:       { ...PERFIL_VACIO },
    };
  }
}

// ── Guardar colecciones específicas ───────────────────────────────────────
//
// Cada función es un alias de _save con la clave correspondiente.
// Se exportan por separado para que los componentes sean explícitos
// sobre qué están guardando (mejor legibilidad, más fácil de buscar).

/** Guarda el catálogo de módulos del carpintero */
// Incluye temporales (temporal:true) — el catálogo los filtra en render, no aquí.
// Huérfanos se limpian en cargarDatos() al iniciar la app.
export const guardarModulos      = (d) => _save("carpicalc:modulos", d);

/** Guarda los trabajos/presupuestos guardados */
export const guardarPresupuestos = (d) => _save("carpicalc:presupuestos", d);

/** Guarda el perfil del taller (nombre, logo, etc.) */
export const guardarPerfil       = (d) => _save("carpicalc:perfil", d);

/**
 * Guarda la tabla de costos Y actualiza el timestamp de versión.
 *
 * El timestamp (carpicalc:costos_version) permite detectar presupuestos
 * que fueron creados ANTES de la última modificación de costos.
 * Esos presupuestos muestran el botón "↻ Actualizar precio".
 */
export const guardarCostos = (d) => {
  _save("carpicalc:costos_version", Date.now().toString());
  return _save("carpicalc:costos", d);
};

/**
 * Lee el timestamp de la última modificación de costos.
 * Retorna 0 si nunca se modificaron.
 */
export const leerVersionCostos = () => {
  try { return parseInt(localStorage.getItem("carpicalc:costos_version") || "0"); }
  catch { return 0; }
};

// ── Historial de precios ──────────────────────────────────────────────────
//
// Cada vez que el carpintero modifica su tabla de costos, se guarda
// un snapshot con los precios de ese momento.
// Máximo 20 snapshots para no exceder el espacio de localStorage.

/**
 * Carga el historial de snapshots de precios.
 * @returns {Promise<Array>} Array de snapshots ordenados del más reciente al más antiguo
 */
export async function cargarHistorialPrecios() {
  try {
    const r = localStorage.getItem("carpicalc:historial");
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}

/**
 * Agrega un nuevo snapshot al historial de precios.
 * Guarda solo los campos relevantes (nombre, tipo, precio) para ahorrar espacio.
 *
 * @param {object} costos - Estado actual de costos
 */
export async function guardarSnapshotPrecios(costos) {
  try {
    const hist = await cargarHistorialPrecios();
    const snap = {
      fecha:      Date.now(),
      materiales: costos.materiales.map(m => ({ nombre: m.nombre, tipo: m.tipo, precioM2: m.precioM2 })),
      herrajes:   costos.herrajes.map(h => ({ nombre: h.nombre, precio: h.precio })),
    };
    // Mantiene solo los últimos 20 snapshots
    const nuevo = [snap, ...hist].slice(0, 20);
    localStorage.setItem("carpicalc:historial", JSON.stringify(nuevo));
  } catch {}
}
