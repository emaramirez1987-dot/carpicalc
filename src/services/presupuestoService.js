// Pure domain mutations for presupuestos.
// Receive data → return new data. No side effects, no setState, no storage calls.

/**
 * Create a new presupuesto entry.
 * Accepts an optional `presupuestoCompleto` to bypass field-by-field construction.
 */
export function crearPresupuesto({
  presupuestos,
  nombre,
  cliente,
  nota,
  items,
  dimOverride,
  adicionales,
  costosDirectos,
  total,
  costosVersionAl,
  presupuestoCompleto,
}) {
  const id = crypto.randomUUID();
  const entry = presupuestoCompleto || {
    nombre,
    cliente: cliente || { nombre: "", tel: "", dir: "" },
    nota: nota || "",
    estado: "nuevo",
    items: [...items],
    dimOverride: { ...dimOverride },
    adicionales: [...adicionales],
    costosDirectos: [...costosDirectos],
    total,
    costosVersionAl,
  };
  return { id, presupuestos: { ...presupuestos, [id]: entry } };
}

/**
 * Delete a presupuesto and clean up orphaned TEMP modules that belonged to it.
 * Returns both the updated presupuestos and modulos objects, plus a flag
 * indicating whether modulos actually changed (to avoid unnecessary saves).
 */
export function eliminarPresupuesto({ presupuestos, modulos, id }) {
  const presEliminado = presupuestos[id];
  const codigosEnUso = new Set(
    (presEliminado?.items || [])
      .map(it => it.codigo)
      .filter(c => c?.startsWith("TEMP_"))
  );

  const modulosNuevos = Object.fromEntries(
    Object.entries(modulos).filter(([cod, m]) => {
      if (!m.temporal) return true;
      if (codigosEnUso.has(cod)) return false;
      if (m.presupuestoId === id) return false;
      return true;
    })
  );

  const presupuestosNuevos = { ...presupuestos };
  delete presupuestosNuevos[id];

  return {
    presupuestos: presupuestosNuevos,
    modulos: modulosNuevos,
    modulosCambiaron: Object.keys(modulosNuevos).length < Object.keys(modulos).length,
  };
}

/**
 * Change the estado of a presupuesto.
 */
export function cambiarEstado({ presupuestos, id, estado }) {
  return {
    ...presupuestos,
    [id]: { ...presupuestos[id], estado },
  };
}

/**
 * Apply arbitrary changes to a presupuesto (shallow merge).
 */
export function actualizarPresupuesto({ presupuestos, id, cambios }) {
  return {
    ...presupuestos,
    [id]: { ...presupuestos[id], ...cambios },
  };
}

/**
 * Migrate a TEMP module code to a permanent code across all presupuestos
 * that reference it in their items list.
 */
export function migrarTempEnPresupuestos({ presupuestos, tempCod, newId }) {
  return Object.fromEntries(
    Object.entries(presupuestos).map(([pid, p]) => {
      const tieneTemp = (p.items || []).some(it => it.codigo === tempCod);
      if (!tieneTemp) return [pid, p];
      return [pid, {
        ...p,
        items: p.items.map(it => it.codigo === tempCod ? { ...it, codigo: newId } : it),
      }];
    })
  );
}
