// POST /api/generate-render { workspaceId, prompt }
// Verifica créditos, llama a Replicate (flux-schnell) y devuelve la imagen generada.
const { createClient } = require("@supabase/supabase-js");

const RENDERS_POR_PLAN = {
  trialing: null, // TODO: volver a 4 tras pruebas
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
  const ahora = new Date();
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

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { workspaceId, prompt, imageBase64, promptStrength = 0.45 } = req.body || {};
  if (!workspaceId || !prompt) {
    return res.status(400).json({ error: "workspaceId y prompt requeridos" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const deduct = await deductCredit(supabase, workspaceId);
  if (!deduct.ok) return res.status(403).json({ error: deduct.error });

  try {
    const endpoint = "https://api.replicate.com/v1/models/black-forest-labs/flux-canny-pro/predictions";
    let input;

    if (imageBase64) {
      const controlStrength = parseFloat((1 - promptStrength).toFixed(2));
      // guidance varía con el slider: estructura → bajo (5), libre → alto (28)
      const guidance = Math.round(5 + promptStrength * 23);
      console.log(`[render] promptStrength=${promptStrength} → control_strength=${controlStrength} guidance=${guidance}`);
      input = {
        prompt:           prompt,
        control_image:    `data:image/png;base64,${imageBase64}`,
        control_strength: controlStrength,
        guidance:         guidance,
        num_outputs:      1,
        output_format:    "jpg",
        output_quality:   90,
        safety_tolerance: 2,
      };
    } else {
      input = {
        prompt:      prompt,
        num_outputs: 1,
        output_format: "jpg",
        output_quality: 90,
        safety_tolerance: 2,
      };
    }

    const rpRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({ input }),
    });

    const data = await rpRes.json();

    if (!rpRes.ok || data.error) {
      console.error("Replicate error status:", rpRes.status, JSON.stringify(data));
      const msg = data.detail || data.error || `Replicate HTTP ${rpRes.status}`;
      return res.status(500).json({ error: msg });
    }

    const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output;
    if (!imageUrl) return res.status(500).json({ error: "No se recibió imagen" });

    return res.json({ ok: true, imageUrl });
  } catch (e) {
    console.error("generate-render:", e);
    return res.status(500).json({ error: e.message });
  }
};
