// ════════════════════════════════════════════════════════════════════════════
// utils.js — CarpiCálc
// ════════════════════════════════════════════════════════════════════════════
//
// Funciones puras de cálculo, formateo y lógica de negocio.
// "Puras" = no tienen side effects, no tocan el DOM, no usan React.
//
// ¿Cuándo tocar este archivo?
//   • Para cambiar la fórmula de cálculo de un módulo (calcularModulo)
//   • Para cambiar el formato de moneda (fmtPeso)
//   • Para modificar la lógica de recálculo de presupuestos
//   • Para cambiar cuándo un presupuesto "necesita actualización"
//
// IMPORTANTE: Este archivo NO importa React.
// Se puede testear en Node.js sin montar ningún componente.
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// FORMATEO
// ════════════════════════════════════════════════════════════════════════════

/**
 * Formatea un número como peso argentino.
 * Ejemplo: 123456 → "$ 123.456"
 */
export const fmtPeso = (n) =>
  "$ " + Math.round(n).toLocaleString("es-AR");

/**
 * Formatea un número con decimales fijos.
 * Ejemplo: fmtNum(1.234, 2) → "1.23"
 */
export const fmtNum = (n, d = 2) => Number(n).toFixed(d);

/**
 * Formatea un timestamp como fecha corta en español.
 * Ejemplo: 1700000000000 → "15 nov. 2023"
 */
export const fmtFecha = (ts) =>
  new Date(ts).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
  });

/**
 * Formatea un timestamp como fecha larga en español.
 * Ejemplo: 1700000000000 → "miércoles, 15 de noviembre de 2023"
 */
export const fmtFechaLarga = (ts) =>
  new Date(ts).toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

// ════════════════════════════════════════════════════════════════════════════
// CÁLCULO DE MÓDULOS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Calcula la dimensión final de una pieza a partir de la dimensión base del módulo.
 *
 * Fórmula: (base + offsetEsp × espesor + offsetMm) / divisor
 *
 * @param {number} base       - Dimensión del módulo (ancho, alto o profundidad) en mm
 * @param {number} offsetEsp  - Cantidad de espesores de placa a restar/sumar (ej: -2 = descontar 2 espesores)
 * @param {number} offsetMm   - Milímetros fijos a restar/sumar
 * @param {number} divisor    - Para dividir (ej: puerta doble = divisor 2)
 * @param {number} espesor    - Espesor del material en mm (ej: 18 para melamina)
 * @returns {number} Dimensión final en mm, nunca negativa
 */
export function resolverDim(base, offsetEsp, offsetMm, divisor, espesor) {
  const raw = (base || 0) + (offsetEsp || 0) * (espesor || 0) + (offsetMm || 0);
  return Math.max(0, raw / Math.max(1, divisor || 1));
}

/**
 * Calcula el costo completo de un módulo de carpintería.
 *
 * Flujo de cálculo:
 *   1. Para cada pieza: calcular dimensiones reales → área neta → metros de tapacanto
 *   2. Aplicar % de desperdicio al área total
 *   3. Calcular costo de material (m² × precio/m²)
 *   4. Calcular costo de tapacanto, mano de obra y herrajes
 *   5. Sumar costo base y aplicar % de ganancia (gastosGenerales)
 *
 * @param {object} modulo  - Módulo del catálogo (con piezas, herrajes, material, dimensiones)
 * @param {object} costos  - Tabla de costos del taller (materiales, herrajes, tapacanto, etc.)
 * @returns {object|null}  - Desglose completo o null si faltan datos
 */
export function calcularModulo(modulo, costos) {
  if (!modulo?.piezas || !costos?.materiales) return null;

  const matDef = costos.materiales.find((m) => m.tipo === modulo.material) || costos.materiales[0];
  if (!matDef) return null;

  const { ancho, profundidad, alto } = modulo.dimensiones || {};
  if (!ancho && !profundidad && !alto) return null;

  const dimMap = { ancho: ancho || 0, profundidad: profundidad || 0, alto: alto || 0 };
  const esp = matDef.espesor || 18;

  let m2Neto = 0, metrosTapacanto = 0, costoTapacanto = 0;
  const desglosePiezas = [];

  for (const p of modulo.piezas) {
    // Pieza especial: usa dimensiones libres en lugar de las parametrizadas
    const d1 = p.especial
      ? (parseInt(p.dimLibre1) || 0)
      : resolverDim(dimMap[p.usaDim],  p.offsetEsp,  p.offsetMm,  p.divisor  || 1, esp);
    const d2 = p.especial
      ? (parseInt(p.dimLibre2) || 0)
      : resolverDim(dimMap[p.usaDim2], p.offsetEsp2, p.offsetMm2, p.divisor2 || 1, esp);

    const area = (d1 * d2 * p.cantidad) / 1_000_000; // mm² → m²
    m2Neto += area;

    let mTc = 0;
    if (p.tc?.id) {
      // metros de tapacanto = suma de lados que llevan tape × dimensión correspondiente
      mTc = (p.cantidad * ((p.tc.lados1 || 0) * d1 + (p.tc.lados2 || 0) * d2)) / 1000;
      metrosTapacanto += mTc;
      const tcDef = (costos.tapacanto || []).find((t) => t.id === p.tc.id);
      if (tcDef) costoTapacanto += mTc * tcDef.precio;
    }

    desglosePiezas.push({ nombre: p.nombre, cantidad: p.cantidad, d1, d2, area, mTc, especial: !!p.especial });
  }

  const pctDesp    = costos.desperdicioPct || 20;
  const m2Total    = m2Neto * (1 + pctDesp / 100);  // área con desperdicio
  const costoMaterial = m2Total * matDef.precioM2;

  // Mano de obra: precio fijo por módulo ó precio × horas
  let costoMO = 0;
  const moItem = costos.manoDeObra?.find((m) => m.tipo === modulo.moDeObra?.tipo);
  if (moItem)
    costoMO = moItem.tipo === "por_modulo"
      ? moItem.precio
      : moItem.precio * (modulo.moDeObra.horas || 0);

  // Herrajes: suma unitaria según catálogo
  let costoHerrajes = 0;
  for (const h of modulo.herrajes || []) {
    const herr = costos.herrajes?.find((x) => x.id === h.id);
    if (herr) costoHerrajes += herr.precio * (h.cantidad || 1);
  }

  const costoBase = costoMaterial + costoTapacanto + costoMO + costoHerrajes;
  const ganancia  = costoBase * ((costos.gastosGenerales || 0) / 100);
  const total     = costoBase + ganancia;

  return {
    // Costos parciales
    costoMaterial, costoTapacanto, costoMO, costoHerrajes,
    // Subtotales
    costoBase, ganancia, total,
    // Métricas de material
    m2Neto, m2Total, pctDesp, metrosTapacanto,
    // Detalle pieza a pieza (usado en Lista de Corte)
    desglosePiezas,
    // Espesor del material usado
    espesor: esp,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// LÓGICA DE PRESUPUESTO
// ════════════════════════════════════════════════════════════════════════════

/**
 * Lee el perfil del taller desde localStorage.
 * Útil fuera de React (ej: en funciones de exportación PDF).
 * Retorna {} si no existe o hay error.
 */
export function leerPerfil() {
  try { return JSON.parse(localStorage.getItem("carpicalc:perfil")) || {}; }
  catch { return {}; }
}

/**
 * Determina si un presupuesto fue creado con costos desactualizados.
 *
 * Un presupuesto necesita actualización cuando:
 *   - Los costos del taller se modificaron DESPUÉS de la última vez que
 *     se recalculó el presupuesto (botón "↻ Actualizar precio").
 *
 * Usa p.costosVersionAl como marca de tiempo del último recálculo.
 * Si nunca se actualizó, usa el presId (timestamp de creación) como fallback.
 *
 * @param {string} presId         - ID del presupuesto (timestamp de creación)
 * @param {number} costosVersion  - Timestamp del último cambio en costos
 * @param {object} p              - Objeto del presupuesto
 * @returns {boolean}
 */
export function presupuestoNecesitaActualizacion(presId, costosVersion, p) {
  if (!costosVersion || !presId) return false;
  const referencia = p?.costosVersionAl ?? parseInt(presId);
  return referencia < costosVersion;
}

/**
 * Calcula el "Total Visual" que se muestra al cliente.
 *
 * Lógica de precios:
 *   - Si hay descuento:      el cliente ve el precio original tachado + precio con descuento
 *   - Si hay ganancia extra: el cliente ve solo el precio final (sin rastro del margen)
 *   - Si ambos:              se aplican los dos simultáneamente
 *
 * @param {number} totalBase     - Total base del presupuesto (suma de módulos)
 * @param {number} descuento     - Monto a descontar (en pesos, no porcentaje)
 * @param {number} gananciaExtra - Monto adicional a sumar (en pesos, no porcentaje)
 * @returns {{ totalFinal, totalOriginal, hayDescuento, hayGanancia, descuentoVal, gananciaVal }}
 */
export function calcularTotalVisual(totalBase, descuento, gananciaExtra) {
  const d = parseFloat(descuento) || 0;
  const g = parseFloat(gananciaExtra) || 0;
  return {
    totalFinal:    Math.round(totalBase + g - d),
    totalOriginal: totalBase,
    hayDescuento:  d > 0,
    hayGanancia:   g > 0,
    descuentoVal:  d,
    gananciaVal:   g,
  };
}

/**
 * Recalcula el total de un presupuesto con los costos actuales del taller.
 *
 * Itera sobre todos los ítems del presupuesto, resuelve las dimensiones
 * (respetando dimOverride si el módulo fue personalizado) y suma los totales.
 *
 * @param {object} p        - Presupuesto con items y dimOverride
 * @param {object} modulos  - Catálogo de módulos
 * @param {object} costos   - Costos actuales del taller
 * @returns {number|null}   - Nuevo total o null si hay error
 */
export function recalcularTotalPresupuesto(p, modulos, costos) {
  if (!p?.items || !modulos || !costos) return null;
  return p.items.reduce((acc, item) => {
    const base = modulos[item.codigo];
    if (!base) return acc;
    // Respeta dimensiones personalizadas (dimOverride) si las tiene
    const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || base.dimensiones;
    const mod  = { ...base, dimensiones: dims };
    const calc = calcularModulo(mod, costos);
    if (!calc) return acc;
    return acc + calc.total * item.cantidad;
  }, 0);
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN / COMUNICACIÓN
// ════════════════════════════════════════════════════════════════════════════

/**
 * Genera el texto para compartir por WhatsApp.
 * Incluye listado de módulos, total y datos del cliente.
 * Copia al portapapeles y también retorna el string.
 *
 * @returns {string} Texto formateado con emojis y asteriscos para WhatsApp
 */
export function generarTextoWhatsApp(items, modulos, costos, getModUsado, totalGeneral, nombre, cliente) {
  const fecha = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
  });

  let txt = "🪵 *CARPICÁLC — PRESUPUESTO*\n";
  txt += "━━━━━━━━━━━━━━━━━━━\n";
  if (nombre) txt += `📋 *Trabajo:* ${nombre}\n`;
  if (cliente?.nombre) txt += `👤 *Cliente:* ${cliente.nombre}\n`;
  if (cliente?.tel)    txt += `📱 *Tel:* ${cliente.tel}\n`;
  txt += `📅 *Fecha:* ${fecha}\n`;
  txt += "━━━━━━━━━━━━━━━━━━━\n\n";

  items.forEach((item) => {
    const m = getModUsado(item);
    if (!m) return;
    const c = calcularModulo(m, costos);
    if (!c) return;
    const subtotal = c.total * item.cantidad;
    txt += `▸ ${item.cantidad}× *${item.codigo}* — ${m.nombre}\n`;
    txt += `   ${m.dimensiones.ancho}×${m.dimensiones.profundidad}×${m.dimensiones.alto}mm\n`;
    txt += `   ${fmtPeso(subtotal)}\n\n`;
  });

  txt += "━━━━━━━━━━━━━━━━━━━\n";
  txt += `💰 *TOTAL: ${fmtPeso(totalGeneral)}*\n`;
  txt += "\n_Presupuesto generado con CarpiCálc_";

  try { navigator.clipboard.writeText(txt); } catch {}
  return txt;
}

/**
 * Comprime una imagen seleccionada por el usuario a base64.
 * Usada para el logo del taller y las imágenes del catálogo.
 *
 * @param {File}   file     - Archivo de imagen del input
 * @param {number} maxW     - Ancho máximo en px
 * @param {number} maxH     - Alto máximo en px
 * @param {number} quality  - Calidad JPEG (0-1)
 * @returns {Promise<string>} Base64 de la imagen comprimida
 */
export function comprimirImagen(file, maxW = 400, maxH = 280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
