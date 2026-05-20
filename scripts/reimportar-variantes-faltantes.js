// Importa las variantes faltantes: para cada código EGGER que tiene
// tanto melamina como mdf en el CSV, agrega el tipo que no está en Supabase.
//
// Uso: node scripts/reimportar-variantes-faltantes.js <email> <password>

const { createClient } = require("../node_modules/@supabase/supabase-js/dist/index.cjs");
const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");

const SUPABASE_URL = "https://pcinsltflxpkndzhsosn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaW5zbHRmbHhwa25kemhzb3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzA2MDksImV4cCI6MjA5MzQwNjYwOX0.pSJmehmwmCS9_3oKn6b1oKoB-XV90XBGhn1lv04uo9A";

function parseCsv(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const cols = []; let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === "," && !inQ) { cols.push(cur); cur = ""; }
      else cur += c;
    }
    cols.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (cols[i] ?? "").trim()]));
  });
}

function extraerDims(desc) {
  const m1 = desc.match(/(\d\.\d{2})\s*[xX]\s*(\d\.\d{2})\s*m/i);
  if (m1) return [Math.round(parseFloat(m1[1]) * 1000), Math.round(parseFloat(m1[2]) * 1000)];
  const m2 = desc.match(/(\d{3,4})\s*[xX]\s*(\d{3,4})/i);
  if (m2) { const a = parseInt(m2[1]), b = parseInt(m2[2]); if (a >= 1000 && b >= 1000) return [a, b]; }
  if (/EDK MDP/i.test(desc)) return [2800, 2070];
  return [2600, 1830];
}

function derivarPrecioM2(precioPlaca, largo, ancho) {
  const pp = parseFloat(precioPlaca) || 0;
  if (pp <= 0 || largo <= 0 || ancho <= 0) return 0;
  return Math.round((pp / ((largo * ancho) / 1_000_000)) * 100) / 100;
}

function buildMaterial(r, now) {
  const [largo, ancho] = extraerDims(r.descripcionDiac || "");
  const precioPlaca = parseFloat(r.precio) || 0;
  return {
    id: crypto.randomUUID(),
    codigo: r.codigoEgger,
    nombre: r.nombreEgger,
    categoria: null,
    textura: null,
    tipo: r.tipo || "melamina",
    esDefault: false,
    espesor: parseFloat(r.espesor) || 18,
    placaLargo: largo,
    placaAncho: ancho,
    precioPlaca,
    precioM2: derivarPrecioM2(precioPlaca, largo, ancho),
    proveedor: "DIAC",
    veta: "ninguna",
    observaciones: r.descripcionDiac || "",
    fechaCreacion: now,
    fechaActualizacion: now,
  };
}

async function main() {
  const [,, email, password] = process.argv;
  if (!email || !password) {
    console.error("Uso: node scripts/reimportar-variantes-faltantes.js <email> <password>");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log("Autenticando...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) { console.error(authErr.message); process.exit(1); }

  const { data: wsRow } = await supabase.from("workspaces").select("id").eq("owner_id", authData.user.id).maybeSingle();
  const wsId = wsRow?.id;

  const { data: costosRow } = await supabase.from("costos").select("datos").eq("workspace_id", wsId).maybeSingle();
  const costos = costosRow?.datos ?? {};
  const existentes = Array.isArray(costos.materiales) ? costos.materiales : [];

  // Índice por codigo+tipo
  const existentesSet = new Set(existentes.map(m => `${m.codigo}|${m.tipo}`));
  console.log(`Materiales existentes: ${existentes.length}`);

  // Leer CSV
  const rows = parseCsv(fs.readFileSync(path.join(__dirname, "egger-placas-18mm.csv"), "utf-8"));
  const now = Date.now();
  const nuevos = [];

  for (const r of rows) {
    if (!r.precio || parseFloat(r.precio) <= 0) continue;
    const key = `${r.codigoEgger}|${r.tipo}`;
    if (existentesSet.has(key)) continue;
    nuevos.push(buildMaterial(r, now));
    console.log(`  + ${r.codigoEgger} (${r.tipo}) $${r.precio}`);
  }

  if (nuevos.length === 0) {
    console.log("No faltan variantes. Todo está importado.");
    return;
  }

  console.log(`\nAgregando ${nuevos.length} variantes faltantes...`);

  // Asignar categoría según tipo (igual que asignar-categorias-egger.js)
  const cats = Array.isArray(costos.materialesCategorias) ? costos.materialesCategorias : [];
  const catPorNombre = Object.fromEntries(cats.map(c => [c.nombre, c.id]));
  const tipoCat = {
    melamina:     catPorNombre["Melamina / AGL"],
    mdf:          catPorNombre["MDF"],
    tapacanto_pvc: catPorNombre["Tapacanto PVC"],
  };

  const nuevosConCat = nuevos.map(m => ({
    ...m,
    categoria: tipoCat[m.tipo] || null,
  }));

  const { error } = await supabase.from("costos").update({
    datos: { ...costos, materiales: [...existentes, ...nuevosConCat] },
  }).eq("workspace_id", wsId);

  if (error) { console.error("Error:", error.message); process.exit(1); }
  console.log(`✓ ${nuevos.length} variantes importadas y categorizadas.`);
}

main().catch(e => { console.error(e); process.exit(1); });
