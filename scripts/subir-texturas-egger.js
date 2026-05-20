// Redimensiona las texturas PNG extraídas del PDF EGGER y las sube
// como base64 dataURL al campo `textura` de cada material en Supabase.
//
// La misma textura se aplica a TODOS los materiales (AGL + MDF) que
// compartan el código EGGER base (e.g. "H3133" de "H3133 ST12").
//
// Uso: node scripts/subir-texturas-egger.js <email> <password>

const { createClient } = require("../node_modules/@supabase/supabase-js/dist/index.cjs");
const sharp   = require("sharp");
const fs      = require("fs");
const path    = require("path");

const SUPABASE_URL = "https://pcinsltflxpkndzhsosn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaW5zbHRmbHhwa25kemhzb3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzA2MDksImV4cCI6MjA5MzQwNjYwOX0.pSJmehmwmCS9_3oKn6b1oKoB-XV90XBGhn1lv04uo9A";

const TEXTURAS_DIR  = path.join(__dirname, "texturas-egger");
const MAPA_PATH     = path.join(__dirname, "mapa-texturas-egger.json");
const RESIZE_WIDTH  = 400; // px — balance entre calidad visible y tamaño base64

async function resizarADataURL(filePath) {
  const buf = await sharp(filePath)
    .resize({ width: RESIZE_WIDTH, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return "data:image/png;base64," + buf.toString("base64");
}

// Normaliza un código de material: "H3133 ST12" → "H3133"
// Permite buscar por código base sin el sufijo de acabado
function codigoBase(cod) {
  return cod.trim().split(/\s+/)[0].toUpperCase();
}

async function main() {
  const [,, email, password] = process.argv;
  if (!email || !password) {
    console.error("Uso: node scripts/subir-texturas-egger.js <email> <password>");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("Autenticando...");
  const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) { console.error("Auth error:", authErr.message); process.exit(1); }

  console.log("Leyendo costos desde Supabase...");
  const { data: rows, error: fetchErr } = await supabase
    .from("costos")
    .select("id, datos")
    .limit(1);
  if (fetchErr) { console.error("Fetch error:", fetchErr.message); process.exit(1); }
  if (!rows || rows.length === 0) { console.error("Sin datos de costos"); process.exit(1); }

  const row      = rows[0];
  const materiales = row.datos?.materiales || [];
  console.log(`Materiales en Supabase: ${materiales.length}`);

  const mapa = JSON.parse(fs.readFileSync(MAPA_PATH, "utf-8"));
  const codigos = Object.keys(mapa); // ["H1180 ST40", "U702 PG", ...]
  console.log(`Texturas disponibles: ${codigos.length}`);

  // Construir índice: codigoBase → dataURL
  // (un mismo base puede tener múltiples acabados; usamos el primero disponible)
  const baseADataURL = {};
  let resizados = 0;
  for (const cod of codigos) {
    const base = codigoBase(cod);
    if (baseADataURL[base]) continue; // ya procesado con otro acabado
    const filePath = path.join(TEXTURAS_DIR, mapa[cod]);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ No existe: ${filePath}`);
      continue;
    }
    process.stdout.write(`  Redimensionando ${cod}...`);
    baseADataURL[base] = await resizarADataURL(filePath);
    const kb = Math.round(baseADataURL[base].length / 1024);
    console.log(` ${kb} KB`);
    resizados++;
  }
  console.log(`\n✓ ${resizados} texturas redimensionadas`);

  // Asignar textura a cada material cuyo código base coincida
  let asignados = 0;
  const actualizados = materiales.map(mat => {
    // mat.codigo puede ser "H3133 ST12 - 18mm AGL" o similar
    // extraemos el código base de la primera "palabra" que empiece con H/W/U/F
    const partes = (mat.codigo || "").split(/\s+/);
    const codPart = partes.find(p => /^[HWUF]\d{3,4}$/i.test(p));
    if (!codPart) return mat;
    const base = codPart.toUpperCase();
    if (!baseADataURL[base]) return mat;
    asignados++;
    return { ...mat, textura: baseADataURL[base] };
  });

  console.log(`\nMateriales a actualizar con textura: ${asignados}`);
  if (asignados === 0) {
    console.log("Nada que actualizar.");
    process.exit(0);
  }

  const nuevosDatos = { ...row.datos, materiales: actualizados };

  console.log("Guardando en Supabase...");
  const { error: saveErr } = await supabase
    .from("costos")
    .update({ datos: nuevosDatos })
    .eq("id", row.id);
  if (saveErr) { console.error("Save error:", saveErr.message); process.exit(1); }

  console.log(`✓ Texturas subidas y asignadas a ${asignados} materiales.`);
}

main().catch(e => { console.error(e); process.exit(1); });
