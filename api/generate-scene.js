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
    // ── Paso 1: eliminar fondo ────────────────────────────────────────────────
    // Busca la versión más reciente entre los candidatos conocidos
    // 851-labs/background-remover — versión fija, evita lookup dinámico
    const brgVersion = "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc";
    console.log(`[scene] usando rembg version=${brgVersion}`);
    const rmRes = await fetch("https://api.replicate.com/v1/predictions", {
      method:  "POST",
      headers,
      body: JSON.stringify({
        version: brgVersion,
        input:   { image: `data:image/jpeg;base64,${imageBase64}` },
      }),
    });
    const rmData = await rmRes.json();
    if (!rmRes.ok || rmData.error) {
      const msg = rmData.detail || rmData.error || `rembg HTTP ${rmRes.status}`;
      console.error("[scene] rembg error:", msg);
      return res.status(500).json({ error: `Remoción de fondo: ${msg}` });
    }

    console.log(`[scene] rembg prediction id=${rmData.id} status=${rmData.status} output=${JSON.stringify(rmData.output)}`);

    // Prefer:wait devuelve output directo si termina en <60s; si no, hay que hacer polling
    let transparentUrl = Array.isArray(rmData.output) ? rmData.output[0] : rmData.output;

    if (!transparentUrl && rmData.id && ["starting", "processing"].includes(rmData.status)) {
      console.log(`[scene] rembg polling ${rmData.id}...`);
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const pollRes  = await fetch(`https://api.replicate.com/v1/predictions/${rmData.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pollData = await pollRes.json();
        console.log(`[scene] rembg poll ${i + 1}: status=${pollData.status}`);
        if (pollData.status === "succeeded") {
          transparentUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
          break;
        }
        if (["failed", "canceled"].includes(pollData.status)) {
          return res.status(500).json({ error: `rembg falló: ${pollData.error || "sin detalle"}` });
        }
      }
    }

    if (!transparentUrl) return res.status(500).json({ error: "rembg no devolvió imagen tras 2 min de espera" });

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

    let fillRes, fillData;
    for (let attempt = 1; attempt <= 4; attempt++) {
      fillRes  = await fetch(
        "https://api.replicate.com/v1/models/black-forest-labs/flux-fill-pro/predictions",
        { method: "POST", headers, body: JSON.stringify({ input: fillInput }) }
      );
      fillData = await fillRes.json();
      const isThrottled = fillRes.status === 429 ||
        (fillData?.detail || fillData?.error || "").toLowerCase().includes("throttled");
      if (isThrottled) {
        console.log(`[scene] flux-fill-pro throttled (intento ${attempt}), esperando 15s...`);
        await new Promise(r => setTimeout(r, 15000));
        continue;
      }
      break;
    }
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
