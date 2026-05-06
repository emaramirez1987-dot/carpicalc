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

  const { workspaceId, prompt, imageBase64 } = req.body || {};
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
    const fullPrompt = `photorealistic interior design render, professional architectural photography, 8k resolution, centered composition, furniture filling the frame, ${prompt}, custom cabinet making, soft warm lighting, clean background wall`;

    // flux-schnell text2img — rápido y confiable desde el prompt
    // TODO: img2img con plano recortado al bounding box de módulos (mejora futura)
    const endpoint = "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions";
    const input = {
      prompt:               fullPrompt,
      aspect_ratio:         "4:3",
      num_outputs:          1,
      num_inference_steps:  4,
    };

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
