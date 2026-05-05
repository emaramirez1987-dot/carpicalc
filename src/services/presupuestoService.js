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
    creadoEn: Date.now(),
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
 * Migración global Format B → Format A para dimOverride en todos los presupuestos.
 * Format B (legado): clave `${codigo}-${id||0}`
 * Format A (actual): clave `id || codigo`
 * También asigna UUID a items legacy sin id.
 * Devuelve { presupuestos, cambiaron } para evitar saves innecesarios.
 */
export function migrarDimOverridePresupuestos(presupuestos) {
  let cambiaron = false;
  const resultado = {};
  for (const [pid, p] of Object.entries(presupuestos)) {
    const itemsOriginales = p.items || [];
    let itemsCambiaron = false;
    const items = itemsOriginales.map(it => {
      if (it.id) return it;
      itemsCambiaron = true;
      return { ...it, id: crypto.randomUUID() };
    });

    const dimOriginal = p.dimOverride && typeof p.dimOverride === "object" ? p.dimOverride : {};
    const dimNuevo = {};
    let dimCambio = false;
    items.forEach(item => {
      const keyA = item.id || item.codigo;
      const keyB = `${item.codigo}-${item.id || 0}`;
      if (dimOriginal[keyA] !== undefined) {
        dimNuevo[keyA] = dimOriginal[keyA];
      } else if (dimOriginal[keyB] !== undefined) {
        dimNuevo[keyA] = dimOriginal[keyB];
        dimCambio = true;
      }
    });
    const keysOriginales = Object.keys(dimOriginal);
    const keysNuevas = Object.keys(dimNuevo);
    if (keysOriginales.length !== keysNuevas.length) dimCambio = true;

    if (itemsCambiaron || dimCambio) {
      cambiaron = true;
      resultado[pid] = { ...p, items, dimOverride: dimNuevo };
    } else {
      resultado[pid] = p;
    }
  }
  return { presupuestos: resultado, cambiaron };
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
