// Crea categorías en MaterialesManager y asigna cada material importado según su tipo.
//
// Categorías a crear (si no existen):
//   Melamina / AGL  → tipo "melamina"
//   MDF             → tipo "mdf"
//   Tapacanto PVC   → tipo "tapacanto_pvc"
//   Fibrofácil      → (reservada para uso manual futuro)
//
// Uso: node scripts/asignar-categorias-egger.js <email> <password>

const { createClient } = require("../node_modules/@supabase/supabase-js/dist/index.cjs");
const crypto = require("crypto");

const SUPABASE_URL = "https://pcinsltflxpkndzhsosn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaW5zbHRmbHhwa25kemhzb3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzA2MDksImV4cCI6MjA5MzQwNjYwOX0.pSJmehmwmCS9_3oKn6b1oKoB-XV90XBGhn1lv04uo9A";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORIAS_DESEADAS = [
  { nombre: "Melamina / AGL", color: "#D4AF37", tipos: ["melamina"] },
  { nombre: "MDF",            color: "#8B5A2B", tipos: ["mdf"] },
  { nombre: "Tapacanto PVC",  color: "#7A7A7A", tipos: ["tapacanto_pvc"] },
  { nombre: "Fibrofácil",     color: "#5A8A5A", tipos: [] },  // reservada
];

async function main() {
  const [,, email, password] = process.argv;
  if (!email || !password) {
    console.error("Uso: node scripts/asignar-categorias-egger.js <email> <password>");
    process.exit(1);
  }

  console.log("Autenticando...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) { console.error("Auth error:", authError.message); process.exit(1); }

  const { data: wsRow } = await supabase.from("workspaces").select("id").eq("owner_id", authData.user.id).maybeSingle();
  if (!wsRow?.id) { console.error("No se encontró workspace"); process.exit(1); }
  const wsId = wsRow.id;

  const { data: costosRow } = await supabase.from("costos").select("datos").eq("workspace_id", wsId).maybeSingle();
  const costos = costosRow?.datos ?? {};
  const materiales = Array.isArray(costos.materiales) ? costos.materiales : [];
  const catExistentes = Array.isArray(costos.materialesCategorias) ? costos.materialesCategorias : [];

  // Construir mapa nombre → categoría existente
  const porNombre = new Map(catExistentes.map(c => [c.nombre, c]));

  // Crear las que faltan
  const now = Date.now();
  const catsFinales = [...catExistentes];
  for (const def of CATEGORIAS_DESEADAS) {
    if (!porNombre.has(def.nombre)) {
      const nueva = { id: crypto.randomUUID(), nombre: def.nombre, color: def.color, creadoEn: now };
      catsFinales.push(nueva);
      porNombre.set(def.nombre, nueva);
      console.log(`  + Categoría creada: ${def.nombre}`);
    }
  }

  // Mapa tipo → categoriaId
  const tipoCatId = {};
  for (const def of CATEGORIAS_DESEADAS) {
    const cat = porNombre.get(def.nombre);
    for (const tipo of def.tipos) tipoCatId[tipo] = cat.id;
  }

  // Asignar categoría a cada material que no la tenga
  let asignados = 0;
  const materialesActualizados = materiales.map(m => {
    if (m.categoria) return m; // ya tiene una, no tocar
    const catId = tipoCatId[m.tipo];
    if (!catId) return m;
    asignados++;
    return { ...m, categoria: catId };
  });

  // Guardar
  const nuevosCostos = {
    ...costos,
    materiales: materialesActualizados,
    materialesCategorias: catsFinales,
  };

  const { error } = await supabase.from("costos").upsert(
    { workspace_id: wsId, datos: nuevosCostos, updated_at: new Date().toISOString() },
    { onConflict: "workspace_id" }
  );

  if (error) { console.error("Error al guardar:", error.message); process.exit(1); }

  console.log(`\n✓ Categorías totales: ${catsFinales.length}`);
  console.log(`✓ Materiales reasignados: ${asignados} / ${materiales.length}`);
  console.log("\nAbrí la app → Costos → Materiales para verlo.");
}

main().catch(e => { console.error(e); process.exit(1); });
