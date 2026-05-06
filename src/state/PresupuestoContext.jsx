// ════════════════════════════════════════════════════════════════════════════
// PresupuestoContext.jsx — CarpiCálc
// ════════════════════════════════════════════════════════════════════════════
//
// Contexto del editor activo de presupuesto.
//
// El ESTADO sigue viviendo en AppInterna (que es quien lo persiste en el
// borrador y calcula totalGeneral). Este archivo solo define:
//   • El objeto de contexto               → PresupuestoContext
//   • El hook de consumo                  → usePresupuesto()
//
// AppInterna llena el Provider con sus propios useState, y los componentes
// descendientes (Presupuesto) consumen directamente sin recibir 10 props.
//
// Campos expuestos vía contexto:
//   items / setItems
//   dimOverride / setDimOverride
//   composicionOverride / setComposicionOverride
//   adicionales / setAdicionales
//   costosDirectos / setCostosDirectos
//   presupuestoActivoId / setPresupuestoActivoId
//
// ¿Cuándo extender este contexto?
//   Cuando un nuevo campo del editor activo necesite ser accedido desde
//   un componente profundo sin pasar por todos los intermediarios.
//   NO mover aquí estado de dominio global (modulos, costos, presupuestos).
// ════════════════════════════════════════════════════════════════════════════

import { createContext, useContext } from 'react';

export const PresupuestoContext = createContext(null);

/**
 * Hook para consumir el contexto del editor activo.
 * Lanza un error descriptivo si se usa fuera del Provider (AppInterna).
 */
export function usePresupuesto() {
  const ctx = useContext(PresupuestoContext);
  if (!ctx) throw new Error('usePresupuesto debe usarse dentro de AppInterna (PresupuestoContext.Provider)');
  return ctx;
}
