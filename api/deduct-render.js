// POST /api/deduct-render { workspaceId }
// Verifica el límite mensual del plan y descuenta un crédito de render.
const { createClient } = require("@supabase/supabase-js");

const RENDERS_POR_PLAN = {
  trialing: 4,
  bronce:   5,
  plata:    20,
  oro:      null, // ilimitado
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { workspaceId } = req.body || {};
  if (!workspaceId) return res.status(400).json({ error: "workspaceId requerido" });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("estado, plan_id, renders_usados, renders_reset_at")
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !sub) return res.status(404).json({ error: "Suscripción no encontrada" });

    if (!["trialing", "active"].includes(sub.estado)) {
      return res.status(403).json({ error: "Suscripción inactiva" });
    }

    // Reset mensual si el período venció
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

    // Límite según plan
    const planKey = sub.estado === "trialing" ? "trialing" : (sub.plan_id || "plata");
    const limite  = Object.prototype.hasOwnProperty.call(RENDERS_POR_PLAN, planKey)
      ? RENDERS_POR_PLAN[planKey]
      : RENDERS_POR_PLAN.plata;

    if (limite !== null && usados >= limite) {
      return res.status(403).json({ error: "Sin créditos de render este mes", usados, limite });
    }

    const { error: updErr } = await supabase
      .from("subscriptions")
      .update({ renders_usados: usados + 1 })
      .eq("workspace_id", workspaceId);

    if (updErr) return res.status(500).json({ error: updErr.message });

    return res.json({ ok: true, usados: usados + 1, limite });
  } catch (e) {
    console.error("deduct-render:", e);
    return res.status(500).json({ error: e.message });
  }
};
