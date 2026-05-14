// ════════════════════════════════════════════════════════════════════════════
// storage.js — CarpiCálc
// ════════════════════════════════════════════════════════════════════════════
//
// Capa de persistencia. Lee y escribe en Supabase (fuente de verdad).
// localStorage se usa solo para datos efímeros/locales:
//   carpicalc:costos_version  → timestamp UI para detección de stale
//   carpicalc:perfil_cache    → copia sync del perfil para leerPerfil() (PDFs)
//   carpicalc:borrador        → autosave del presupuesto activo
//   carpicalc:borrador_modulo → estado de FormModulo entre pestañas
//   carpicalc:roles_pieza     → roles personalizados del taller
//   carpicalc:tema            → "dark" | "light"
//   carpicalc:ultimo_backup   → timestamp del último backup exportado
//
// IMPORTANTE: Este archivo NO importa React.
// ════════════════════════════════════════════════════════════════════════════

import { modulosIniciales, costoIniciales, PERFIL_VACIO } from "./constants.js";
import { supabase } from "./lib/supabase.js";
import { parsearModulo, parsearPresupuesto } from "./services/moduloService.js";
import { notificarError } from "./hooks/useToastErrores.js";

// ── Escritura localStorage (datos locales/efímeros) ───────────────────────
export const _save = async (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
};

// ── Workspace ID (cacheado por usuario) ───────────────────────────────────
let _cachedWs = { userId: null, wsId: null };

async function getWorkspaceId() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    if (_cachedWs.userId === user.id) return _cachedWs.wsId;
    const { data } = await supabase.from("workspaces").select("id").single();
    _cachedWs = { userId: user.id, wsId: data?.id ?? null };
    return _cachedWs.wsId;
  } catch {
    return null;
  }
}

// ── Carga inicial de toda la aplicación ───────────────────────────────────
export async function cargarDatos() {
  try {
    const wsId = await getWorkspaceId();
    if (!wsId) {
      return {
        modulos: modulosIniciales,
        costos: costoIniciales,
        presupuestos: {},
        perfil: { ...PERFIL_VACIO },
      };
    }

    const [
      { data: modulosRows },
      { data: costosRow },
      { data: presupuestosRows },
      { data: perfilRow },
    ] = await Promise.all([
      supabase.from("modulos").select("codigo, datos").eq("workspace_id", wsId),
      supabase.from("costos").select("datos").eq("workspace_id", wsId).maybeSingle(),
      supabase.from("presupuestos").select("id, datos").eq("workspace_id", wsId),
      supabase.from("perfil_taller").select("datos").eq("workspace_id", wsId).maybeSingle(),
    ]);

    // Reconstruir { [codigo]: datos } — parsearModulo normaliza y descarta corruptos
    const modulos = (modulosRows || []).reduce((acc, row) => {
      const m = parsearModulo(row.datos);
      if (m) acc[row.codigo] = m;
      else console.warn("storage: módulo descartado por schema inválido:", row.codigo);
      return acc;
    }, {});

    // Reconstruir { [id]: datos } — parsearPresupuesto normaliza y descarta corruptos
    const presupuestos = (presupuestosRows || []).reduce((acc, row) => {
      const p = parsearPresupuesto(row.datos);
      if (p) acc[row.id] = p;
      else console.warn("storage: presupuesto descartado por schema inválido:", row.id);
      return acc;
    }, {});

    // Limpiar módulos temporales huérfanos
    const presIds = new Set(Object.keys(presupuestos));
    const modulosLimpios = Object.fromEntries(
      Object.entries(modulos).filter(([, m]) => {
        if (!m.temporal) return true;
        if (!m.presupuestoId) return false;
        return presIds.has(m.presupuestoId);
      })
    );

    const perfil = perfilRow?.datos
      ? { ...PERFIL_VACIO, ...perfilRow.datos }
      : { ...PERFIL_VACIO };

    // Cache del perfil para leerPerfil() síncrono (PDFs)
    try { localStorage.setItem("carpicalc:perfil_cache", JSON.stringify(perfil)); } catch {}

    return {
      modulos: Object.keys(modulosLimpios).length > 0 ? modulosLimpios : modulosIniciales,
      costos: costosRow?.datos ?? costoIniciales,
      presupuestos,
      perfil,
    };
  } catch (e) {
    console.error("cargarDatos:", e);
    return {
      modulos: modulosIniciales,
      costos: costoIniciales,
      presupuestos: {},
      perfil: { ...PERFIL_VACIO },
    };
  }
}

// ── Guardar módulos ───────────────────────────────────────────────────────
export const guardarModulos = async (modulosObj, ts) => {
  _save("carpicalc:costos_version", (ts || Date.now()).toString());
  try {
    const wsId = await getWorkspaceId();
    if (!wsId) return false;

    const entries = Object.entries(modulosObj);

    // Delete all + insert all (app single-user: gap es imperceptible)
    const { error: delErr } = await supabase.from("modulos").delete().eq("workspace_id", wsId);
    if (delErr) { console.error("guardarModulos delete:", delErr); return false; }

    if (entries.length > 0) {
      const { error } = await supabase.from("modulos").insert(
        entries.map(([codigo, datos]) => ({ workspace_id: wsId, codigo, datos }))
      );
      if (error) { console.error("guardarModulos insert:", error); return false; }
    }
    return true;
  } catch (e) {
    notificarError("No se pudieron guardar los módulos. Verificá tu conexión.", e);
    return false;
  }
};

// ── Guardar presupuestos ──────────────────────────────────────────────────
export const guardarPresupuestos = async (presupuestosObj) => {
  try {
    const wsId = await getWorkspaceId();
    if (!wsId) return false;

    const entries = Object.entries(presupuestosObj);

    const { error: delErr } = await supabase.from("presupuestos").delete().eq("workspace_id", wsId);
    if (delErr) { console.error("guardarPresupuestos delete:", delErr); return false; }

    if (entries.length > 0) {
      const { error } = await supabase.from("presupuestos").insert(
        entries.map(([id, datos]) => ({
          id,
          workspace_id: wsId,
          datos,
          estado: datos.estado || "nuevo",
        }))
      );
      if (error) { console.error("guardarPresupuestos insert:", error); return false; }
    }
    return true;
  } catch (e) {
    notificarError("No se pudieron guardar los presupuestos. Verificá tu conexión.", e);
    return false;
  }
};

// ── Guardar perfil del taller ─────────────────────────────────────────────
export const guardarPerfil = async (perfil) => {
  // Cache local para leerPerfil() síncrono
  try { localStorage.setItem("carpicalc:perfil_cache", JSON.stringify(perfil)); } catch {}
  try {
    const wsId = await getWorkspaceId();
    if (!wsId) return false;
    const { error } = await supabase.from("perfil_taller").upsert(
      { workspace_id: wsId, datos: perfil },
      { onConflict: "workspace_id" }
    );
    if (error) { console.error("guardarPerfil:", error); return false; }
    return true;
  } catch (e) {
    notificarError("No se pudo guardar el perfil del taller.", e);
    return false;
  }
};

// ── Guardar costos ────────────────────────────────────────────────────────
export const guardarCostos = async (costos) => {
  _save("carpicalc:costos_version", Date.now().toString());
  try {
    const wsId = await getWorkspaceId();
    if (!wsId) return false;
    const { error } = await supabase.from("costos").upsert(
      { workspace_id: wsId, datos: costos, updated_at: new Date().toISOString() },
      { onConflict: "workspace_id" }
    );
    if (error) { console.error("guardarCostos:", error); return false; }
    return true;
  } catch (e) {
    notificarError("No se pudieron guardar los costos.", e);
    return false;
  }
};

// ── Suscripción ───────────────────────────────────────────────────────────
export async function cargarSuscripcion() {
  try {
    const wsId = await getWorkspaceId();
    if (!wsId) return null;
    const { data } = await supabase
      .from("subscriptions")
      .select("estado, trial_ends_at, current_period_end, plan_id, mp_preapproval_id, renders_usados, renders_reset_at")
      .eq("workspace_id", wsId)
      .single();
    return data || null;
  } catch {
    return null;
  }
}

// ── Versión de costos (UI local, stale detection) ─────────────────────────
export const leerVersionCostos = () => {
  try { return parseInt(localStorage.getItem("carpicalc:costos_version") || "0"); }
  catch { return 0; }
};

// ── Historial de precios (local por ahora) ────────────────────────────────
export async function cargarHistorialPrecios() {
  try {
    const r = localStorage.getItem("carpicalc:historial");
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}

export async function guardarSnapshotPrecios(costos) {
  try {
    const hist = await cargarHistorialPrecios();
    const snap = {
      fecha:            Date.now(),
      materiales:       (costos.materiales || []).map(m => ({ id: m.id, nombre: m.nombre, precioM2: m.precioM2 })),
      herrajes:         (costos.herrajes || []).map(h => ({ id: h.id, nombre: h.nombre, precio: h.precio })),
      manoDeObra:       (costos.manoDeObra || []).map(m => ({ id: m.id, nombre: m.nombre, precio: m.precio })),
      tapacanto:        (costos.tapacanto || []).map(t => ({ id: t.id, nombre: t.nombre, precio: t.precio })),
      extrasFrecuentes: (costos.extrasFrecuentes || []).map(f => ({ id: f.id, nombre: f.nombre, precio: f.precio })),
      gastosFijos: {
        items: (costos.gastosFijos?.items || []).map(i => ({ id: i.id, nombre: i.nombre, monto: i.monto })),
      },
    };
    const nuevo = [snap, ...hist].slice(0, 20);
    localStorage.setItem("carpicalc:historial", JSON.stringify(nuevo));
  } catch {}
}

// ── Backup completo ───────────────────────────────────────────────────────
const BACKUP_CLAVES = [
  "carpicalc:historial",
  "carpicalc:costos_version",
  "carpicalc:borrador",
];

export function exportarBackup() {
  const datos = {};
  BACKUP_CLAVES.forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null) datos[k] = v;
  });
  const contenido = JSON.stringify({ version: 1, fecha: Date.now(), datos }, null, 2);
  const blob = new Blob([contenido], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carpicalc-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  localStorage.setItem("carpicalc:ultimo_backup", Date.now().toString());
}

export function importarBackup(backup) {
  if (!backup?.datos || typeof backup.datos !== "object") {
    throw new Error("Archivo de backup inválido o corrupto");
  }
  Object.entries(backup.datos).forEach(([k, v]) => {
    if (k.startsWith("carpicalc:") && k !== "carpicalc:auth") {
      localStorage.setItem(k, v);
    }
  });
}

// ── Perfil (lectura síncrona para PDFs fuera del árbol React) ────────────
export function leerPerfil() {
  try { return JSON.parse(localStorage.getItem("carpicalc:perfil_cache")) || {}; }
  catch { return {}; }
}

// ── Roles de pieza ────────────────────────────────────────────────────────
export function cargarRolesPieza() {
  try { return JSON.parse(localStorage.getItem("carpicalc:roles_pieza")) || []; }
  catch { return []; }
}

export function guardarRolesPieza(roles) {
  return _save("carpicalc:roles_pieza", roles);
}

// ── Prompts de Render IA ──────────────────────────────────────────────────
export function leerPromptsRender() {
  try { return JSON.parse(localStorage.getItem("carpicalc:prompts_render")) || []; }
  catch { return []; }
}

export function guardarPromptsRender(prompts) {
  return _save("carpicalc:prompts_render", prompts);
}

export function leerConfigRender() {
  try { return JSON.parse(localStorage.getItem("carpicalc:render_config")) || {}; }
  catch { return {}; }
}
export function guardarConfigRender(cfg) {
  return _save("carpicalc:render_config", cfg);
}

// ── Borrador de módulo en creación ────────────────────────────────────────
export function cargarBorradorModulo() {
  try { return JSON.parse(localStorage.getItem("carpicalc:borrador_modulo")) || null; }
  catch { return null; }
}

export const guardarBorradorModulo = (d) => _save("carpicalc:borrador_modulo", d);

export function limpiarBorradorModulo() {
  try { localStorage.removeItem("carpicalc:borrador_modulo"); } catch {}
}

// ── Materiales 3D (texturas PNG por código) ───────────────────────────────
// Guardado en localStorage porque son data URLs de imágenes (binario grande)
export function leerMateriales3D() {
  try { return JSON.parse(localStorage.getItem("carpicalc:materiales3d")) || {}; }
  catch { return {}; }
}

export function guardarMateriales3D(data) {
  try { localStorage.setItem("carpicalc:materiales3d", JSON.stringify(data)); }
  catch {}
}
