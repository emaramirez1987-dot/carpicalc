// Importa los materiales EGGER (placas 18mm + tapacantos PVC) a Supabase.
//
// Inputs:
//   scripts/egger-placas-18mm.csv
//   scripts/egger-tapacantos-pvc.csv
//   carpicalc-egger.json  (para categorías)
//
// Uso:
//   node scripts/importar-egger-materiales.js <email> <password>
//
// El script:
//   1. Autentica en Supabase
//   2. Lee los costos actuales (no pisa nada)
//   3. Agrega los materiales nuevos (sin duplicar por codigo)
//   4. Guarda

const { createClient } = require("../node_modules/@supabase/supabase-js/dist/index.cjs");
const fs   = require("fs");
const path = require("path");
const crypto = require("crypto");

const SUPABASE_URL = "https://pcinsltflxpkndzhsosn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaW5zbHRmbHhwa25kemhzb3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzA2MDksImV4cCI6MjA5MzQwNjYwOX0.pSJmehmwmCS9_3oKn6b1oKoB-XV90XBGhn1lv04uo9A";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CSV parser mínimo ─────────────────────────────────────────────────────────
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
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (cols[i] ?? "").trim()]));
  });
}

// ── Derivar precioM2 ──────────────────────────────────────────────────────────
function derivarPrecioM2(precioPlaca, placaLargo, placaAncho) {
  const pp = parseFloat(precioPlaca) || 0;
  const pl = parseFloat(placaLargo)  || 0;
  const pa = parseFloat(placaAncho)  || 0;
  if (pp <= 0 || pl <= 0 || pa <= 0) return 0;
  return Math.round((pp / ((pl * pa) / 1_000_000)) * 100) / 100;
}

// ── Dimensiones por tipo de placa (inferido de la descripción DIAC) ───────────
// EDK MDP: 2800x2070mm   EDK AGL: 2600x1830mm   EDK MDF: 2600x1830mm
// Pero varían. Intentamos extraerlas de la descripción.
function extraerDims(desc) {
  const m1 = desc.match(/(\d\.\d{2})\s*[xX]\s*(\d\.\d{2})\s*m/i);
  if (m1) return [Math.round(parseFloat(m1[1]) * 1000), Math.round(parseFloat(m1[2]) * 1000)];
  const m2 = desc.match(/(\d{3,4})\s*[xX]\s*(\d{3,4})/i);
  if (m2) {
    const a = parseInt(m2[1]), b = parseInt(m2[2]);
    if (a >= 1000 && b >= 1000) return [a, b];
  }
  // Fallback EGGER estándar
  if (/EDK MDP/i.test(desc)) return [2800, 2070];
  return [2600, 1830];
}

// ── Construir material canónico ───────────────────────────────────────────────
function buildMaterial({ codigoEgger, nombreEgger, categoria, tipo, descripcionDiac, precio, espesor }, now) {
  const [largo, ancho] = extraerDims(descripcionDiac);
  const precioPlaca = parseFloat(precio) || 0;
  const precioM2 = derivarPrecioM2(precioPlaca, largo, ancho);
  return {
    id:                 crypto.randomUUID(),
    codigo:             codigoEgger,
    nombre:             nombreEgger,
    categoria:          null,           // sin categoría por ahora; el usuario organiza desde la app
    textura:            null,
    tipo:               tipo || "melamina",
    esDefault:          false,
    espesor:            parseFloat(espesor) || 18,
    placaLargo:         largo,
    placaAncho:         ancho,
    precioPlaca,
    precioM2,
    proveedor:          "DIAC",
    veta:               "ninguna",
    observaciones:      descripcionDiac,
    fechaCreacion:      now,
    fechaActualizacion: now,
  };
}

// ── Construir tapacanto canónico ──────────────────────────────────────────────
function buildTapacanto({ codigoEgger, nombreEgger, anchoCinta, descripcionDiac, precio }, now) {
  return {
    id:                 crypto.randomUUID(),
    codigo:             codigoEgger,
    nombre:             `${nombreEgger} ${anchoCinta}mm`,
    categoria:          null,
    textura:            null,
    tipo:               "tapacanto_pvc",
    esDefault:          false,
    espesor:            0.5,            // PVC estándar
    placaLargo:         50000,          // rollo 50m → convertido a mm
    placaAncho:         parseInt(anchoCinta) || 43,
    precioPlaca:        parseFloat(precio) || 0,
    precioM2:           0,
    proveedor:          "DIAC",
    veta:               "ninguna",
    observaciones:      descripcionDiac,
    fechaCreacion:      now,
    fechaActualizacion: now,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const [,, email, password] = process.argv;
  if (!email || !password) {
    console.error("Uso: node scripts/importar-egger-materiales.js <email> <password>");
    process.exit(1);
  }

  // 1. Auth
  console.log("Autenticando...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) { console.error("Auth error:", authError.message); process.exit(1); }
  console.log("OK →", authData.user.email);

  // 2. Workspace
  const { data: wsRow } = await supabase.from("workspaces").select("id").eq("owner_id", authData.user.id).maybeSingle();
  if (!wsRow?.id) { console.error("No se encontró workspace"); process.exit(1); }
  const wsId = wsRow.id;
  console.log("Workspace:", wsId);

  // 3. Leer costos actuales (para no pisar)
  const { data: costosRow } = await supabase.from("costos").select("datos").eq("workspace_id", wsId).maybeSingle();
  const costosActuales = costosRow?.datos ?? {};
  const materialesExistentes = Array.isArray(costosActuales.materiales) ? costosActuales.materiales : [];
  const codigosExistentes = new Set(materialesExistentes.map(m => m.codigo).filter(Boolean));
  console.log(`Materiales existentes: ${materialesExistentes.length}`);

  // 4. Parsear CSVs
  const rowsPlacas    = parseCsv(fs.readFileSync(path.join(__dirname, "egger-placas-18mm.csv"),   "utf-8"));
  const rowsTapacantos = parseCsv(fs.readFileSync(path.join(__dirname, "egger-tapacantos-pvc.csv"), "utf-8"));

  const now = Date.now();
  const nuevos = [];
  const yaExistian = [];

  // Placas — solo las que tienen precio
  for (const r of rowsPlacas) {
    if (!r.precio || parseFloat(r.precio) <= 0) continue;
    // Para códigos con MDP y MDF, preferimos MDP (melamina sobre aglomerado, más común)
    // En el CSV ya vienen deduplicados pero puede haber ambos tipos para el mismo código.
    // Usamos el código + tipo como clave única.
    const key = `${r.codigoEgger}|${r.tipo}`;
    if (codigosExistentes.has(r.codigoEgger)) { yaExistian.push(r.codigoEgger); continue; }
    codigosExistentes.add(r.codigoEgger); // para evitar duplicado MDP+MDF del mismo código en este batch
    nuevos.push(buildMaterial(r, now));
  }

  // Tapacantos — solo los que tienen precio
  for (const r of rowsTapacantos) {
    if (!r.precio || parseFloat(r.precio) <= 0) continue;
    const key = `${r.codigoEgger}|tapa${r.anchoCinta}`;
    if (codigosExistentes.has(key)) { yaExistian.push(key); continue; }
    codigosExistentes.add(key);
    nuevos.push(buildTapacanto(r, now));
  }

  console.log(`\nNuevos a importar: ${nuevos.length}`);
  if (yaExistian.length) console.log(`Ya existían (saltados): ${yaExistian.length}`);

  if (nuevos.length === 0) {
    console.log("Nada que importar. Saliendo.");
    return;
  }

  // 5. Guardar
  const materialesFinal = [...materialesExistentes, ...nuevos];
  const catsFinal = Array.isArray(costosActuales.materialesCategorias)
    ? costosActuales.materialesCategorias : [];

  const nuevoCostos = {
    ...costosActuales,
    materiales: materialesFinal,
    materialesCategorias: catsFinal,
  };
  delete nuevoCostos.materialesGrupos;

  const { error } = await supabase.from("costos").upsert(
    { workspace_id: wsId, datos: nuevoCostos, updated_at: new Date().toISOString() },
    { onConflict: "workspace_id" }
  );

  if (error) {
    console.error("Error al guardar:", error.message);
    process.exit(1);
  }

  console.log(`\n✓ Importados ${nuevos.length} materiales.`);
  console.log(`  Placas:     ${nuevos.filter(m => m.tipo !== "tapacanto_pvc").length}`);
  console.log(`  Tapacantos: ${nuevos.filter(m => m.tipo === "tapacanto_pvc").length}`);
  console.log("\nAbrí la app → Costos → Materiales para verlos.");
}

main().catch(e => { console.error(e); process.exit(1); });
