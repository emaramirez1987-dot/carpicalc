// ════════════════════════════════════════════════════════════════════════════
// agruparVariantes — colapsa placas del mismo color en una sola card
// ════════════════════════════════════════════════════════════════════════════
//
// Dos placas con el mismo `codigo` EGGER pero distinto `tipo` (AGL vs MDF) son
// el mismo color/textura: se muestran como UNA card con toggle de variante.
// El resto (tapacantos, materiales sin código) va como card individual.
//
// Devuelve: { key, variantes: Material[] }[]  — variantes ordenadas AGL → MDF.
// Los registros subyacentes NO se modifican: cada variante conserva su id.
// ════════════════════════════════════════════════════════════════════════════

const TIPOS_AGRUPABLES = new Set(["melamina", "mdf"]);
const ORDEN_TIPO = { melamina: 0, mdf: 1 };

export function agruparVariantes(materiales) {
  const grupos = [];
  const indicePorCodigo = new Map();

  for (const mat of materiales) {
    if (mat.codigo && TIPOS_AGRUPABLES.has(mat.tipo)) {
      const key = mat.codigo.trim().toUpperCase();
      const idx = indicePorCodigo.get(key);
      if (idx !== undefined) {
        grupos[idx].variantes.push(mat);
        continue;
      }
      indicePorCodigo.set(key, grupos.length);
      grupos.push({ key: `cod_${key}`, variantes: [mat] });
    } else {
      grupos.push({ key: mat.id, variantes: [mat] });
    }
  }

  for (const g of grupos) {
    if (g.variantes.length > 1) {
      g.variantes.sort((a, b) => (ORDEN_TIPO[a.tipo] ?? 9) - (ORDEN_TIPO[b.tipo] ?? 9));
    }
  }

  return grupos;
}
