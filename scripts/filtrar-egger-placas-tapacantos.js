// A partir de precios-egger-diac.csv, genera dos CSVs limpios:
//   egger-placas-18mm.csv     → melaminas EDK MDP y EDK MDF 18mm (una fila por código EGGER)
//   egger-tapacantos-pvc.csv  → tapacantos PVC por código EGGER
//
// Input:  scripts/precios-egger-diac.csv
// Output: scripts/egger-placas-18mm.csv
//         scripts/egger-tapacantos-pvc.csv

const fs   = require("fs");
const path = require("path");

const INPUT  = path.join(__dirname, "precios-egger-diac.csv");
const OUT_P  = path.join(__dirname, "egger-placas-18mm.csv");
const OUT_T  = path.join(__dirname, "egger-tapacantos-pvc.csv");

// ── CSV parser mínimo (campos quoted con comas) ───────────────────────────────
function parseCsv(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const cols = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === "," && !inQ) { cols.push(cur); cur = ""; }
      else cur += c;
    }
    cols.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? ""]));
  });
}

function toCsv(rows, headers) {
  const esc = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g,"\"\"")}"` : s; };
  return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
}

const rows = parseCsv(fs.readFileSync(INPUT, "utf-8"));

// ── Clasificar ────────────────────────────────────────────────────────────────
const placasMDP = []; // melamina aglomerado 18mm
const placasMDF = []; // melamina MDF 18mm
const tapacantos = [];

for (const r of rows) {
  const desc = r.descripcionDiac.toUpperCase();
  const esp  = parseFloat(r.espesor) || 0;

  // Tapacanto PVC: "C PVC ..." en la descripción
  if (/\bC\s+PVC\b/.test(desc)) {
    tapacantos.push(r);
    continue;
  }

  // Placa MDP 18mm: "EDK MDP" o "EDK AGL" + 18mm
  if (/\bEDK\s+(MDP|AGL)\b/.test(desc) && esp === 18) {
    placasMDP.push(r);
    continue;
  }

  // Placa MDF 18mm
  if (/\bEDK\s+MDF\b/.test(desc) && esp === 18) {
    placasMDF.push(r);
    continue;
  }
}

// ── Deduplicar placas: 1 fila por código EGGER (primero MDP, luego MDF) ───────
// Si un mismo código tiene MDP y MDF, quedan en hojas separadas.
function dedup(arr) {
  const seen = new Set();
  return arr.filter(r => {
    if (seen.has(r.codigoEgger)) return false;
    seen.add(r.codigoEgger);
    return true;
  });
}

const placasMDPDedup = dedup(placasMDP);
const placasMDFDedup = dedup(placasMDF);

// ── Tapacantos: deduplicar por código EGGER + ancho (22mm / 43mm / 23mm) ──────
// Queremos uno por código × ancho estándar para el catálogo
function anchoTapa(desc) {
  const m = desc.match(/(\d+)\s*[xX]\s*(?:0\.80|0\.40|1\.50|2)\s*mm/i)
          || desc.match(/(\d+)\s*[xX]/);
  return m ? parseInt(m[1]) : 0;
}

// Para simplificar: una fila por código EGGER + ancho (las más comunes: 23mm y 43mm)
const tapasMap = new Map();
for (const r of tapacantos) {
  const ancho = anchoTapa(r.descripcionDiac);
  const key = `${r.codigoEgger}|${ancho}`;
  if (!tapasMap.has(key)) tapasMap.set(key, { ...r, anchoCinta: ancho });
}
const tapasArr = [...tapasMap.values()]
  .filter(r => [23, 43].includes(r.anchoCinta)) // quedarse con 23mm y 43mm
  .sort((a, b) => a.codigoEgger.localeCompare(b.codigoEgger) || a.anchoCinta - b.anchoCinta);

// ── Combinar MDP + MDF en un solo CSV de placas ───────────────────────────────
const placasHeaders = ["codigoEgger","nombreEgger","categoria","tipo","espesor","codigoDiac","descripcionDiac","precio"];
const placasRows = [
  ...placasMDPDedup.map(r => ({ ...r, tipo: "melamina" })),
  ...placasMDFDedup.map(r => ({ ...r, tipo: "mdf" })),
].sort((a, b) => a.codigoEgger.localeCompare(b.codigoEgger));

const tapasHeaders = ["codigoEgger","nombreEgger","categoria","anchoCinta","codigoDiac","descripcionDiac","precio"];

fs.writeFileSync(OUT_P, toCsv(placasRows,  placasHeaders), "utf-8");
fs.writeFileSync(OUT_T, toCsv(tapasArr,    tapasHeaders),  "utf-8");

// ── Reporte ───────────────────────────────────────────────────────────────────
console.log(`\nPlacas MDP 18mm:     ${placasMDPDedup.length}`);
console.log(`Placas MDF 18mm:     ${placasMDFDedup.length}`);
console.log(`Tapacantos 23+43mm:  ${tapasArr.length}`);

// Códigos del catálogo EGGER sin placa MDP
const catCodigos = new Set(require("../catalogo-egger.json").colores.map(c => c.codigo));
const conMDP = new Set(placasMDPDedup.map(r => r.codigoEgger));
const sinMDP = [...catCodigos].filter(c => !conMDP.has(c));
if (sinMDP.length) {
  console.log(`\nSin placa MDP (solo MDF u otros): ${sinMDP.length}`);
  sinMDP.forEach(c => console.log("  ·", c));
}

console.log(`\nOutput:`);
console.log(`  ${OUT_P}`);
console.log(`  ${OUT_T}`);
