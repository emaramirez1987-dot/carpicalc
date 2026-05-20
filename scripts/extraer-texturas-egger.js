// Escanea el PDF de EGGER, detecta páginas con código de color (H/W/U/F),
// y guarda cada una como PNG en scripts/texturas-egger/CODIGO.png
//
// Uso: node scripts/extraer-texturas-egger.js

const { pdf }  = require("pdf-to-img");
const fs       = require("fs");
const path     = require("path");

const PDF  = "C:/Users/emara/Desktop/Catalogo+diseños+EGGER+Coleccion+Decorativa+26+.pdf_wa.pdf";
const OUT  = path.join(__dirname, "texturas-egger");

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

// Detecta código EGGER en el texto de la página (renderizado como imagen,
// así que usamos un approach diferente: pdfjs-dist para el texto)
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

function normCodigo(raw) {
  // "H3170   ST12" → "H3170 ST12"  /  "H3170ST12" → "H3170 ST12"
  return raw.trim().replace(/\s+/, " ").toUpperCase();
}

// Regex para detectar código EGGER: H/W/U/F seguido de dígitos, espacio(s), sufijo
const CODIGO_RE = /\b([HWUF]\d{3,4})\s+(ST\d+|HG|PG|PM|PT|SM)\b/gi;

async function extraerTextoPagina(pdfDoc, numPag) {
  const page    = await pdfDoc.getPage(numPag);
  const content = await page.getTextContent();
  return content.items.map(i => i.str).join(" ");
}

async function main() {
  console.log("Cargando PDF...");
  const pdfDoc = await pdfjsLib.getDocument(PDF).promise;
  const totalPags = pdfDoc.numPages;
  console.log(`Total páginas: ${totalPags}`);

  console.log("Abriendo renderer...");
  const renderer = await pdf(PDF, { scale: 2 });
  console.log(`Páginas en renderer: ${renderer.length}`);

  let guardados = 0;
  const noEncontrados = [];
  const mapa = {}; // codigo → archivo

  for (let i = 1; i <= totalPags; i++) {
    const texto = await extraerTextoPagina(pdfDoc, i);
    const matches = [...texto.matchAll(CODIGO_RE)];

    if (matches.length === 0) {
      process.stdout.write(`  [pag ${i}] sin código EGGER\n`);
      continue;
    }

    // Puede haber más de un código en la misma página (poco común pero posible)
    const codigos = [...new Set(matches.map(m => normCodigo(`${m[1]} ${m[2]}`)))];

    // Renderizar la página una sola vez
    const imgBuf = await renderer.getPage(i);

    for (const cod of codigos) {
      const filename = cod.replace(/\s+/g, "_") + ".png";
      const filepath = path.join(OUT, filename);
      fs.writeFileSync(filepath, imgBuf);
      mapa[cod] = filename;
      guardados++;
      process.stdout.write(`  [pag ${i}] ✓ ${cod} → ${filename}\n`);
    }
  }

  // Resumen
  console.log(`\n✓ Texturas guardadas: ${guardados}`);
  console.log(`  Carpeta: ${OUT}`);

  // Guardar mapa codigo → archivo para el script de importación
  const mapaPath = path.join(__dirname, "mapa-texturas-egger.json");
  fs.writeFileSync(mapaPath, JSON.stringify(mapa, null, 2), "utf-8");
  console.log(`  Mapa guardado: ${mapaPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
