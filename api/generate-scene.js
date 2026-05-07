// POST /api/generate-scene { workspaceId, prompt, imageBase64, guidance, seed }
// Pipeline:
//   1. BRIA-RMBG  → elimina el fondo del render (PNG con transparencia)
//   2. generarMascara → extrae canal alpha → PNG B&N (blanco = rellenar, negro = conservar)
//   3. flux-fill-pro → rellena el fondo con la escena descrita en el prompt
const { createClient } = require("@supabase/supabase-js");
const { PNG }          = require("pngjs");

const RENDERS_POR_PLAN = {
  trialing: null,
  bronce:   5,
  plata:    20,
  oro:      null,
};

async function deductCredit(supabase, workspaceId) {
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select("estado, plan_id, renders_usados, renders_reset_at")
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !sub) return { ok: false, error: "Suscripción no encontrada" };
  if (!["trialing", "active"].includes(sub.estado)) return { ok: false, error: "Suscripción inactiva" };

  let usados = sub.renders_usados || 0;
  const ahora  = new Date();
  const resetAt = sub.renders_reset_at ? new Date(sub.renders_reset_at) : null;

  if (!resetAt || ahora > resetAt) {
    usados = 0;
    const proximoReset = new Date(ahora);
    proximoReset.setMonth(proximoReset.getMonth() + 1);
    await supabase
      .from("subscriptions")
      .update({ renders_usados: 0, renders_reset_at: proximoReset.toISOString() })
      .eq("workspace_id", workspaceId);
  }

  const planKey = sub.estado === "trialing" ? "trialing" : (sub.plan_id || "plata");
  const limite  = Object.prototype.hasOwnProperty.call(RENDERS_POR_PLAN, planKey)
    ? RENDERS_POR_PLAN[planKey]
    : RENDERS_POR_PLAN.plata;

  if (limite !== null && usados >= limite) {
    return { ok: false, error: "Sin créditos de render este mes" };
  }

  await supabase
    .from("subscriptions")
    .update({ renders_usados: usados + 1 })
    .eq("workspace_id", workspaceId);

  return { ok: true };
}

// Genera un PNG B&N desde el canal alpha de un PNG transparente.
// Blanco (255) = fondo → rellenar. Negro (0) = mueble → conservar.
function generarMascara(pngBuffer) {
  return new Promise((resolve, reject) => {
    const src = new PNG();
    src.parse(pngBuffer, (err, data) => {
      if (err) return reject(new Error(`Error parseando PNG de máscara: ${err.message}`));

      const mask = new PNG({ width: data.width, height: data.height });
      for (let i = 0; i < data.data.length; i += 4) {
        const alpha = data.data[i + 3];
        // alpha < 128 → era fondo → blanco en máscara (rellenar)
        // alpha >= 128 → era mueble → negro en máscara (conservar)
        const v = alpha < 128 ? 255 : 0;
        mask.data[i]     = v;
        mask.data[i + 1] = v;
        mask.data[i + 2] = v;
        mask.data[i + 3] = 255;
      }

      resolve(PNG.sync.write(mask).toString("base64"));
    });
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).end();

  const { workspaceId, prompt, imageBase64, guidance = 30, seed } = req.body || {};
  if (!workspaceId || !prompt || !imageBase64) {
    return res.status(400).json({ error: "workspaceId, prompt e imageBase64 requeridos" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const deduct = await deductCredit(supabase, workspaceId);
  if (!deduct.ok) return res.status(403).json({ error: deduct.error });

  const token   = process.env.REPLICATE_API_TOKEN;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" };

  try {
    // ── Paso 1: eliminar fondo con BRIA-RMBG ──────────────────────────────────
    console.log("[scene] paso 1: BRIA-RMBG remoción de fondo");
    const rmRes = await fetch(
      "https://api.replicate.com/v1/models/851-labs/BRIA-RMBG/predictions",
      {
        method:  "POST",
        headers,
        body: JSON.stringify({
          input: { image: `data:image/jpeg;base64,${imageBase64}` },
        }),
      }
    );
    const rmData = await rmRes.json();
    if (!rmRes.ok || rmData.error) {
      const msg = rmData.detail || rmData.error || `BRIA-RMBG HTTP ${rmRes.status}`;
      console.error("[scene] BRIA-RMBG error:", msg);
      return res.status(500).json({ error: `Remoción de fondo: ${msg}` });
    }
    const transparentUrl = Array.isArray(rmData.output) ? rmData.output[0] : rmData.output;
    if (!transparentUrl) return res.status(500).json({ error: "BRIA-RMBG no devolvió imagen" });

    // ── Paso 2: generar máscara B&N desde el alpha ────────────────────────────
    console.log("[scene] paso 2: generando máscara desde alpha");
    const pngResp   = await fetch(transparentUrl);
    const pngBuffer = Buffer.from(await pngResp.arrayBuffer());
    const maskBase64 = await generarMascara(pngBuffer);

    // ── Paso 3: flux-fill-pro — rellenar fondo con escena ────────────────────
    console.log(`[scene] paso 3: flux-fill-pro guidance=${guidance}`);
    const fillInput = {
      image:            `data:image/jpeg;base64,${imageBase64}`,
      mask:             `data:image/png;base64,${maskBase64}`,
      prompt,
      guidance:         parseInt(guidance, 10),
      steps:            28,
      output_format:    "webp",
      output_quality:   90,
      safety_tolerance: 2,
    };
    if (seed != null) fillInput.seed = parseInt(seed, 10);

    const fillRes = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-fill-pro/predictions",
      {
        method:  "POST",
        headers,
        body: JSON.stringify({ input: fillInput }),
      }
    );
    const fillData = await fillRes.json();
    if (!fillRes.ok || fillData.error) {
      const msg = fillData.detail || fillData.error || `flux-fill-pro HTTP ${fillRes.status}`;
      console.error("[scene] flux-fill-pro error:", msg);
      return res.status(500).json({ error: `flux-fill-pro: ${msg}` });
    }

    const imageUrl = Array.isArray(fillData.output) ? fillData.output[0] : fillData.output;
    if (!imageUrl) return res.status(500).json({ error: "flux-fill-pro no devolvió imagen" });

    return res.json({ ok: true, imageUrl });

  } catch (e) {
    console.error("[scene] error:", e);
    return res.status(500).json({ error: e.message });
  }
};
