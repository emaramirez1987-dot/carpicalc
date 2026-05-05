// POST /api/cancel-subscription  { preapprovalId, workspaceId }
const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { preapprovalId, workspaceId } = req.body || {};
  if (!preapprovalId || !workspaceId) {
    return res.status(400).json({ error: "preapprovalId y workspaceId requeridos" });
  }

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "cancelled" }),
    });

    const data = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP cancel error:", data);
      return res.status(400).json({ error: data.message || "Error al cancelar en MercadoPago" });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    await supabase
      .from("subscriptions")
      .update({ estado: "canceled", updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId);

    return res.json({ ok: true });
  } catch (e) {
    console.error("cancel-subscription:", e);
    return res.status(500).json({ error: e.message });
  }
};
