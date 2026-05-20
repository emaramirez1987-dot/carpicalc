// Busca cada código EGGER del catálogo en el JSON de DIAC y produce un CSV con los resultados.
//
// Input:  C:/Users/emara/Desktop/productos-diac.json
//         C:/Users/emara/carpicalc/catalogo-egger.json
// Output: scripts/precios-egger-diac.csv

const fs   = require("fs");
const path = require("path");

const INPUT_DIAC   = "C:/Users/emara/Desktop/productos-diac.json";
const INPUT_EGGER  = path.join(__dirname, "../catalogo-egger.json");
const OUTPUT       = path.join(__dirname, "precios-egger-diac.csv");

// ── Cargar datos ──────────────────────────────────────────────────────────────
const productos = JSON.parse(fs.readFileSync(INPUT_DIAC,  "utf-8"));
const catalogo  = JSON.parse(fs.readFileSync(INPUT_EGGER, "utf-8"));

console.log(`Productos DIAC: ${productos.length}`);
console.log(`Colores EGGER:  ${catalogo.colores.length}`);

// ── Normalizar código para búsqueda (sin espacios, mayúsculas) ────────────────
// EGGER:  "H1180 ST37"  →  "H1180ST37"
// DIAC:   "...H1180ST37..." (o con espacio, depende)
function normCod(c) {
  return c.replace(/\s+/g, "").toUpperCase();
}

// ── Índice de productos DIAC por código normalizado ───────────────────────────
// Un producto DIAC puede matchear varios colores EGGER (mismo código, distintos formatos).
// Guardamos todos los productos que contengan el código como substring en su descripción.
function buildIndex(productos) {
  // idx: normCodigo → [producto, ...]
  const idx = new Map();
  for (const p of productos) {
    const desc = (p.descripcion || "").toUpperCase().replace(/\s+/g, "");
    // Extraer todos los tokens tipo H\d+ST\d+, W\d+ST\d+, etc.
    const matches = desc.matchAll(/([HWUF]\d{3,4}(?:ST\d+|HG|PG|PM|PT|SM|ST\d+))/g);
    for (const m of matches) {
      const key = m[1];
      if (!idx.has(key)) idx.set(key, []);
      idx.get(key).push(p);
    }
  }
  return idx;
}

const diacIdx = buildIndex(productos);
console.log(`Códigos EGGER únicos en DIAC: ${diacIdx.size}`);

// ── Buscar cada color EGGER ───────────────────────────────────────────────────
function toCsv(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const rows = [];
const noEncontrados = [];

for (const color of catalogo.colores) {
  const key = normCod(color.codigo);
  const hits = diacIdx.get(key) || [];

  if (hits.length === 0) {
    noEncontrados.push(color.codigo + " — " + color.nombre);
    // Igual lo registramos con precio vacío
    rows.push({
      codigoEgger:     color.codigo,
      nombreEgger:     color.nombre,
      categoria:       color.categoria,
      codigoDiac:      "",
      descripcionDiac: "",
      precio:          "",
      espesor:         "",
      largo:           "",
      ancho:           "",
    });
    continue;
  }

  for (const p of hits) {
    // Extraer espesor y dims de la descripción DIAC
    const desc  = p.descripcion || "";
    const espM  = desc.match(/(\d+(?:\.\d+)?)\s*mm/i);
    const dimM1 = desc.match(/(\d\.\d{2})\s*[xX/]\s*(\d\.\d{2})\s*m/i);
    const dimM2 = desc.match(/(\d{3,4})\s*[xX]\s*(\d{3,4})/i);

    const espesor = espM ? parseFloat(espM[1]) : "";
    let largo = "", ancho = "";
    if (dimM1) {
      largo = Math.round(parseFloat(dimM1[1]) * 1000);
      ancho = Math.round(parseFloat(dimM1[2]) * 1000);
    } else if (dimM2) {
      const a = parseInt(dimM2[1]), b = parseInt(dimM2[2]);
      if (a >= 100 && b >= 100) { largo = a; ancho = b; }
    }

    rows.push({
      codigoEgger:     color.codigo,
      nombreEgger:     color.nombre,
      categoria:       color.categoria,
      codigoDiac:      p.codigo_diac || "",
      descripcionDiac: desc,
      precio:          p.precio || "",
      espesor,
      largo,
      ancho,
    });
  }
}

// ── Escribir CSV ──────────────────────────────────────────────────────────────
const headers = ["codigoEgger", "nombreEgger", "categoria", "codigoDiac", "descripcionDiac", "precio", "espesor", "largo", "ancho"];
const csv = [
  headers.join(","),
  ...rows.map(r => headers.map(h => toCsv(r[h])).join(",")),
].join("\n");

fs.writeFileSync(OUTPUT, csv, "utf-8");

// ── Reporte ───────────────────────────────────────────────────────────────────
const encontrados = catalogo.colores.filter(c => diacIdx.has(normCod(c.codigo)));
console.log(`\nEncontrados en DIAC: ${encontrados.length} / ${catalogo.colores.length}`);
console.log(`Filas en CSV:        ${rows.length}  (varios productos por código cuando hay distintos espesores)`);

if (noEncontrados.length > 0) {
  console.log(`\nSIN PRECIO en DIAC (${noEncontrados.length}):`);
  noEncontrados.forEach(s => console.log("  ·", s));
}

console.log(`\nOutput: ${OUTPUT}`);
