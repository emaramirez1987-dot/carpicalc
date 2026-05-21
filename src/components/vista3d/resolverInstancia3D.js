// resolverInstancia3D.js
// Resuelve el módulo efectivo de una instancia de la escena 3D.
//
// Capa única del "keying" instancia → overrides. Es el ÚNICO lugar con la
// rama compat de doble fuente de overrides:
//   - ítems del presupuesto (inst.itemKey) → dimOverride[itemKey]
//   - módulos manuales de escena            → inst.dimsOverride
//
// La resolución en sí (base + overrides) vive en resolverModuloEfectivo
// (services/moduloService). Acá solo se decide QUÉ override corresponde a
// la instancia. Commit 2 (deuda técnica) elimina inst.dimsOverride →
// esta rama se simplifica a una línea, sin tocar a los consumidores.
//
// Nota: ModuloEnEscena NO usa este helper — necesita extraer los slices
// (inlineInst/ovInst) como deps estables de un useMemo para no reconstruir
// la geometría 3D en cada render. Hace el mismo keying inline.

import { resolverModuloEfectivo } from '../../services/moduloService.js';

export function resolverModuloDeInstancia(inst, { modulos, inlineModulos, dimOverride } = {}) {
  if (!inst) return null;
  const ov     = inst.itemKey ? dimOverride?.[inst.itemKey]   : inst.dimsOverride;
  const inline = inst.itemKey ? inlineModulos?.[inst.itemKey] : null;
  return resolverModuloEfectivo({ codigo: inst.codigo, modulos, inline, dimOverride: ov });
}
