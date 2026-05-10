// POST /api/generate-render-gpt { workspaceId, prompt, imageBase64 }
// Usa gpt-image-1 (OpenAI) para transformar el render 3D en fotografía realista.
// Ve el material/textura real de la imagen — no depende solo del texto.
const { createClient } = require("@supabase/supabase-js");

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

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Variables de entorno no configuradas (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY)." });
  }

  const { workspaceId, prompt, imageBase64 } = req.body || {};
  if (!workspaceId || !prompt || !imageBase64) {
    return res.status(400).json({ error: "workspaceId, prompt e imageBase64 requeridos" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const deduct = await deductCredit(supabase, workspaceId);
  if (!deduct.ok) return res.status(403).json({ error: deduct.error });

  try {
    // gpt-image-1 requiere multipart/form-data — usa FormData nativo de Node 18+
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const imageBlob   = new Blob([imageBuffer], { type: "image/jpeg" });

    const form = new FormData();
    form.append("model",   "gpt-image-1");
    form.append("image",   imageBlob, "render.jpg");
    form.append("prompt",  prompt);
    form.append("size",    "1024x1024");
    form.append("quality", "high");
    form.append("n",       "1");

    console.log("[gpt-render] enviando a gpt-image-1...");
    const gpRes = await fetch("https://api.openai.com/v1/images/edits", {
      method:  "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body:    form,
    });

    const data = await gpRes.json();

    if (!gpRes.ok || data.error) {
      console.error("[gpt-render] error:", JSON.stringify(data));
      const msg = data.error?.message || data.error || `OpenAI HTTP ${gpRes.status}`;
      return res.status(500).json({ error: msg });
    }

    const b64 = data.data?.[0]?.b64_json;
    if (!b64) return res.status(500).json({ error: "gpt-image-1 no devolvió imagen" });

    // Devolvemos data URL — el frontend puede hacer fetch() de data URLs
    return res.json({ ok: true, imageUrl: `data:image/png;base64,${b64}` });

  } catch (e) {
    console.error("[gpt-render] error:", e);
    return res.status(500).json({ error: e.message });
  }
};
