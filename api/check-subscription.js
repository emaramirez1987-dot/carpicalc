// Vercel serverless function
// Verifica el estado de una preaprobación de MP y actualiza Supabase si está autorizada.
// POST /api/check-subscription  { preapprovalId, workspaceId }

const { createClient } = require("@supabase/supabase-js");

const ESTADO_MAP = {
  authorized: "active",
  cancelled:  "canceled",
  paused:     "past_due",
  pending:    "trialing",
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).end();

  const { preapprovalId, workspaceId } = req.body || {};
  if (!preapprovalId || !workspaceId) {
    return res.status(400).json({ error: "preapprovalId y workspaceId requeridos" });
  }

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const sub = await mpRes.json();
    if (!mpRes.ok) return res.status(400).json({ error: sub.message || "Error MP" });

    const estado = ESTADO_MAP[sub.status] || "trialing";

    // Solo actualizar Supabase si cambió a activa
    if (estado === "active") {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      await supabase.from("subscriptions").update({
        mp_preapproval_id: sub.id,
        estado,
        current_period_end: sub.next_payment_date || null,
        updated_at:         new Date().toISOString(),
      }).eq("workspace_id", workspaceId);
    }

    return res.json({ estado, mp_status: sub.status });
  } catch (e) {
    console.error("check-subscription:", e);
    return res.status(500).json({ error: e.message });
  }
};
