// Extrae placas y tapacantos PVC del JSON DIAC → CSVs editables.
//
// Input:  C:/Users/emara/Desktop/productos-diac.json
// Output: scripts/lista-placas.csv
//         scripts/lista-tapacantos-pvc.csv
//
// Filtro de tapacantos: SOLO PVC (excluye aluminio, anodizados, productos químicos).
// Parser tolerante: si no logra extraer un campo, lo deja vacío. El usuario edita.

const fs = require("fs");
const path = require("path");

const INPUT = "C:/Users/emara/Desktop/productos-diac.json";
const OUT_DIR = __dirname;

// ── Detectores ──────────────────────────────────────────────────────────
// Orden importa: más específico primero.
const TIPO_DETECTORS = [
  [/\bench(?:apad[oa]|\.)\b/i, "enchapado"],
  [/\bmel(?:amina|am)?\b/i,    "melamina"],
  [/\bmdf\b/i,                 "mdf"],
  [/\baglo(?:merado)?\b/i,     "aglomerado"],
  [/\bterc(?:iado)?\b/i,       "terciado"],
  [/\bmac(?:iza)?\b/i,         "madera_maciza"],
  [/\bmfc\b/i,                 "melamina"],
  [/\bgua(?:tambu)?\b/i,       "terciado"],
  [/\bfibrofacil\b/i,          "mdf"],
];

const ESPESOR_RE  = /(\d+(?:\.\d+)?)\s*mm/i;
const DIMS_RE     = /(\d\.\d{2})\s*[xX/]\s*(\d\.\d{2})\s*m/i;
const DIMS_ALT_RE = /(\d{3,4})\s*[xX]\s*(\d{3,4})/i;

// Tapacanto PVC: incluye "Tapa Canto" + "PVC" o "ABS" o "melamínico p/canto" o "PVC Cubrec".
// Excluye "A.mte", "anod" (aluminio anodizado).
const TAPACANTO_PVC_RE = /\b(pvc\s*(?:cubrec|tapacanto|canto)|abs\s*canto|melam[íi]nico\s*p\.?\s*canto|tapacanto\s*pvc)\b/i;
const ES_ALUMINIO_RE = /\b(a\.\s*mte|aluminio|anod|alum\.)\b/i;

function detectarTipo(desc) {
  for (const [rx, tipo] of TIPO_DETECTORS) {
    if (rx.test(desc)) return tipo;
  }
  return "";
}

function extraerEspesor(desc) {
  const m = desc.match(ESPESOR_RE);
  return m ? parseFloat(m[1]) : "";
}

function extraerDims(desc) {
  let m = desc.match(DIMS_RE);
  if (m) return [Math.round(parseFloat(m[1]) * 1000), Math.round(parseFloat(m[2]) * 1000)];
  m = desc.match(DIMS_ALT_RE);
  if (m) {
    const a = parseInt(m[1], 10), b = parseInt(m[2], 10);
    if (a >= 1000 && b >= 1000) return [a, b];
  }
  return ["", ""];
}

function limpiarNombre(desc) {
  let s = desc;
  s = s.replace(new RegExp(ESPESOR_RE.source, "gi"), "");
  s = s.replace(new RegExp(DIMS_RE.source,    "gi"), "");
  s = s.replace(new RegExp(DIMS_ALT_RE.source,"gi"), "");
  for (const [rx] of TIPO_DETECTORS) {
    s = s.replace(new RegExp(rx.source, "gi"), "");
  }
  s = s.replace(/\b(euca|euda|rec\s*\w+|simil|ln|x\d{2,}|lc|lex?\d+|xa\d+)\b/gi, "");
  s = s.replace(/\s+/g, " ").replace(/^[\s\-·.,]+|[\s\-·.,]+$/g, "");
  return s;
}

function esPlaca(desc) {
  if (!detectarTipo(desc)) return false;
  if (extraerEspesor(desc) === "") return false;
  const [a, b] = extraerDims(desc);
  return a !== "" && b !== "";
}

function esTapacantoPVC(desc) {
  if (ES_ALUMINIO_RE.test(desc)) return false;
  return TAPACANTO_PVC_RE.test(desc);
}

function toCsvField(v) {
  const s = String(v == null ? "" : v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows, headers) {
  const out = [headers.map(toCsvField).join(",")];
  for (const r of rows) {
    out.push(headers.map(h => toCsvField(r[h])).join(","));
  }
  return out.join("\n");
}

// ── Run ─────────────────────────────────────────────────────────────────
console.log(`Leyendo ${INPUT}...`);
const productos = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
console.log(`Total productos: ${productos.length}`);

const placas = [];
const tapacantos = [];
let descartados = 0;

for (const p of productos) {
  const desc = p.descripcion || "";
  const codigoDiac = p.codigo_diac || "";
  const precio = p.precio || "";

  if (esTapacantoPVC(desc)) {
    tapacantos.push({
      codigo:           "",
      nombre:           desc,
      espesor:          extraerEspesor(desc) || "",
      precio,
      codigoDiac,
      descripcionDiac:  desc,
    });
    continue;
  }

  if (esPlaca(desc)) {
    const tipo = detectarTipo(desc);
    const espesor = extraerEspesor(desc);
    const [largo, ancho] = extraerDims(desc);
    placas.push({
      codigo:           "",
      nombre:           limpiarNombre(desc),
      tipo,
      espesor,
      placaLargo:       largo,
      placaAncho:       ancho,
      precioPlaca:      precio,
      codigoDiac,
      descripcionDiac:  desc,
    });
    continue;
  }

  descartados += 1;
}

placas.sort((a, b) =>
  (a.tipo || "").localeCompare(b.tipo || "") ||
  (a.espesor || 0) - (b.espesor || 0) ||
  (a.nombre || "").localeCompare(b.nombre || "")
);
tapacantos.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

const placasCsv = rowsToCsv(placas, ["codigo", "nombre", "tipo", "espesor", "placaLargo", "placaAncho", "precioPlaca", "codigoDiac", "descripcionDiac"]);
const tapaCsv   = rowsToCsv(tapacantos, ["codigo", "nombre", "espesor", "precio", "codigoDiac", "descripcionDiac"]);

const PLACAS_PATH = path.join(OUT_DIR, "lista-placas.csv");
const TAPA_PATH   = path.join(OUT_DIR, "lista-tapacantos-pvc.csv");

fs.writeFileSync(PLACAS_PATH, placasCsv, "utf-8");
fs.writeFileSync(TAPA_PATH,   tapaCsv,   "utf-8");

console.log(`\nResultados:`);
console.log(`  Placas extraidas:        ${placas.length}`);
console.log(`  Tapacantos PVC:          ${tapacantos.length}`);
console.log(`  Descartados:             ${descartados}`);

// Distribución por tipo (placas)
const porTipo = {};
for (const p of placas) porTipo[p.tipo] = (porTipo[p.tipo] || 0) + 1;
console.log(`\nPlacas por tipo:`);
for (const [t, n] of Object.entries(porTipo).sort((a,b) => b[1] - a[1])) {
  console.log(`  ${t.padEnd(15)} ${n}`);
}

console.log(`\nArchivos generados:`);
console.log(`  ${PLACAS_PATH}`);
console.log(`  ${TAPA_PATH}`);
