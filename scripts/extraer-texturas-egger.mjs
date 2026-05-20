// ESM — extraer texturas del PDF EGGER
// Uso: node scripts/extraer-texturas-egger.mjs

import { pdf }       from "pdf-to-img";
import { getDocument } from "../node_modules/pdf-to-img/node_modules/pdfjs-dist/legacy/build/pdf.mjs";
import fs             from "fs";
import path           from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF = "C:/Users/emara/Desktop/Catalogo+diseños+EGGER+Coleccion+Decorativa+26+.pdf_wa.pdf";
const OUT = path.join(__dirname, "texturas-egger");

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

const CODIGO_RE = /\b([HWUF]\d{3,4})\s*(ST\d+|HG|PG|PM|PT|SM)\b/gi;

function normCodigo(base, sufijo) {
  return `${base.toUpperCase()} ${sufijo.toUpperCase()}`;
}

async function textoDePagina(pdfDoc, num) {
  const page    = await pdfDoc.getPage(num);
  const content = await page.getTextContent();
  return content.items.map(i => i.str).join(" ");
}

async function main() {
  console.log("Cargando PDF para texto...");
  const loadingTask = getDocument(PDF);
  const pdfDoc = await loadingTask.promise;
  const total  = pdfDoc.numPages;
  console.log(`Páginas: ${total}`);

  console.log("Cargando renderer...");
  const renderer = await pdf(PDF, { scale: 2 });

  const mapa       = {};
  let guardados    = 0;
  const sinCodigo  = [];

  for (let i = 1; i <= total; i++) {
    const texto  = await textoDePagina(pdfDoc, i);
    const matches = [...texto.matchAll(CODIGO_RE)];

    if (matches.length === 0) {
      sinCodigo.push(i);
      continue;
    }

    const codigos = [...new Set(matches.map(m => normCodigo(m[1], m[2])))];
    const imgBuf  = await renderer.getPage(i);

    for (const cod of codigos) {
      const filename = cod.replace(/\s+/g, "_") + ".png";
      const filepath = path.join(OUT, filename);
      fs.writeFileSync(filepath, imgBuf);
      mapa[cod] = filename;
      guardados++;
      console.log(`  [${i}/${total}] ✓ ${cod}`);
    }
  }

  console.log(`\n✓ Guardadas: ${guardados} texturas`);
  console.log(`  Sin código EGGER: ${sinCodigo.length} páginas (tapas, intro, etc.)`);

  const mapaPath = path.join(__dirname, "mapa-texturas-egger.json");
  fs.writeFileSync(mapaPath, JSON.stringify(mapa, null, 2), "utf-8");
  console.log(`  Mapa: ${mapaPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
