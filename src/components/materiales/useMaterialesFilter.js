// ════════════════════════════════════════════════════════════════════════════
// useMaterialesFilter — Hook puro de filtrado/agrupamiento de materiales
// ════════════════════════════════════════════════════════════════════════════
//
// Recibe materiales + categorias + query + categoriaActiva + vista y devuelve:
//   - filtrados:        Material[]                  (después de búsqueda)
//   - enCategoriaActiva: Material[]                  (filtrados ∩ categoría seleccionada)
//   - agrupados:        Map<categoriaId, Material[]> (para vista agrupada)
//   - counts:           { [categoriaId]: number }    (para sidebar)
//
// IMPORTANTE: No importa React (es un hook puro de useMemo).
// ════════════════════════════════════════════════════════════════════════════

import { useMemo } from "react";

// IDs reservados
export const CATEGORIA_SIN_ASIGNAR = "__sin_categoria__";
export const CATEGORIA_TODOS       = "__todos__";

// ── Pool de colores rotativo para categorías nuevas ───────────────────────
const POOL_COLORES_CATEGORIA = [
  "#7090c0", "#9070b0", "#70a080", "#c09050",
  "#5090a0", "#c87060", "#a09060", "#6080a0",
];

// Devuelve el próximo color a usar para una categoría nueva.
// Estrategia actual: primer color libre del pool, en orden.
// Para cambiar estrategia (random, generativo, hash de nombre, etc.) editar acá.
export function getNextCategoriaColor(categoriasExistentes = []) {
  const usados = new Set(categoriasExistentes.map(c => c.color));
  const libre = POOL_COLORES_CATEGORIA.find(c => !usados.has(c));
  return libre || POOL_COLORES_CATEGORIA[categoriasExistentes.length % POOL_COLORES_CATEGORIA.length];
}

// ── Hook principal ────────────────────────────────────────────────────────
export function useMaterialesFilter({
  materiales,
  categorias,
  query,
  categoriaActiva,
  vista,
  orden = "nombre",        // "nombre" | "codigo" | "precio" | "fecha"
}) {
  // Búsqueda por nombre / código / tipo / proveedor (multi-término AND)
  const filtrados = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    let base = materiales;
    if (q) {
      const terms = q.split(/\s+/);
      base = base.filter(m => {
        const hay = [
          m.nombre, m.codigo, m.tipo, m.proveedor,
          m.espesor != null ? String(m.espesor) + "mm" : "",
        ].join(" ").toLowerCase();
        return terms.every(t => hay.includes(t));
      });
    }
    // Ordenamiento
    const cmp = (a, b) => {
      switch (orden) {
        case "codigo": return (a.codigo || "").localeCompare(b.codigo || "");
        case "precio": return (a.precioM2 || 0) - (b.precioM2 || 0);
        case "fecha":  return (b.fechaActualizacion || 0) - (a.fechaActualizacion || 0);
        case "nombre":
        default:       return (a.nombre || "").localeCompare(b.nombre || "");
      }
    };
    return [...base].sort(cmp);
  }, [materiales, query, orden]);

  // Si hay una categoría activa (no es __todos__), filtrar
  const enCategoriaActiva = useMemo(() => {
    if (!categoriaActiva || categoriaActiva === CATEGORIA_TODOS) return filtrados;
    if (categoriaActiva === CATEGORIA_SIN_ASIGNAR) return filtrados.filter(m => !m.categoria);
    return filtrados.filter(m => m.categoria === categoriaActiva);
  }, [filtrados, categoriaActiva]);

  // Agrupar para vista "agrupada"
  const agrupados = useMemo(() => {
    if (vista !== "agrupada") return null;
    const map = new Map();
    for (const c of categorias) map.set(c.id, []);
    map.set(CATEGORIA_SIN_ASIGNAR, []);
    for (const m of enCategoriaActiva) {
      const key = m.categoria && map.has(m.categoria) ? m.categoria : CATEGORIA_SIN_ASIGNAR;
      map.get(key).push(m);
    }
    return map;
  }, [enCategoriaActiva, categorias, vista]);

  // Counts sobre el set filtrado por búsqueda (no por categoría activa)
  const counts = useMemo(() => {
    const c = { [CATEGORIA_TODOS]: filtrados.length, [CATEGORIA_SIN_ASIGNAR]: 0 };
    for (const cat of categorias) c[cat.id] = 0;
    for (const m of filtrados) {
      if (!m.categoria || !c.hasOwnProperty(m.categoria)) c[CATEGORIA_SIN_ASIGNAR] += 1;
      else c[m.categoria] += 1;
    }
    return c;
  }, [filtrados, categorias]);

  return { filtrados, enCategoriaActiva, agrupados, counts };
}
