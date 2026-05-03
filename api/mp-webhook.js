// Vercel serverless function
// Recibe notificaciones de MercadoPago y actualiza el estado de suscripción en Supabase.
// Configurar en MP Developer → tu app → Webhooks → URL: https://carpicalc.vercel.app/api/mp-webhook

const { createClient } = require("@supabase/supabase-js");

const ESTADO_MAP = {
  authorized: "active",
  cancelled:  "canceled",
  paused:     "past_due",
  pending:    "trialing",
};

module.exports = async function handler(req, res) {
  // MP verifica el endpoint con GET al configurar el webhook
  if (req.method === "GET") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { type, data } = req.body || {};

  // Solo procesar eventos de suscripción
  if (type !== "subscription_preapproval") return res.status(200).end();

  try {
    // Obtener detalles de la preaprobación desde MP
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${data.id}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const sub = await mpRes.json();

    const estado = ESTADO_MAP[sub.status] || sub.status;

    // Actualizar Supabase con service_role (bypassa RLS)
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabase
      .from("subscriptions")
      .update({
        mp_preapproval_id: sub.id,
        estado,
        current_period_end: sub.next_payment_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", sub.external_reference);

    return res.status(200).end();
  } catch (e) {
    console.error("mp-webhook error:", e);
    return res.status(500).end();
  }
};
