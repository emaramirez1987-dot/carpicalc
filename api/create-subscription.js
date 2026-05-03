// Vercel serverless function
// Crea una preaprobación de suscripción en MercadoPago y devuelve el link de pago.
// POST /api/create-subscription  { workspaceId, userEmail }

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { workspaceId, userEmail } = req.body || {};
  if (!workspaceId || !userEmail) {
    return res.status(400).json({ error: "workspaceId y userEmail requeridos" });
  }

  try {
    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: "CarpiCálc — Plan Base",
        external_reference: workspaceId,
        payer_email: userEmail,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 35000,
          currency_id: "ARS",
        },
        back_url: process.env.APP_URL || "https://carpicalc.vercel.app",
        status: "pending",
      }),
    });

    const data = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP error:", data);
      return res.status(400).json({ error: data.message || "Error de MercadoPago" });
    }

    return res.json({ init_point: data.init_point, id: data.id });
  } catch (e) {
    console.error("create-subscription:", e);
    return res.status(500).json({ error: e.message });
  }
};
