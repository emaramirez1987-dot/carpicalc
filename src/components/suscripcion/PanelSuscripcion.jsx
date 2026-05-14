import React, { useState } from "react";
import { Card } from "../ui/index.jsx";
import { supabase } from "../../lib/supabase.js";
import { PLANES_RENDER } from "../../constants.js";

export function PanelSuscripcion({ suscripcion }) {
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [confirmCancelar, setConfirmCancelar] = useState(false);

  if (!suscripcion) return null;

  const { estado, trial_ends_at, current_period_end, plan_id, mp_preapproval_id, renders_usados, app_role } = suscripcion;
  const esAdmin = app_role === "admin";

  const planKey    = estado === "trialing" ? "trialing" : (plan_id || "plata");
  const planInfo   = PLANES_RENDER[planKey] ?? PLANES_RENDER.plata;
  const usados     = renders_usados || 0;
  const limite     = planInfo.renders;
  const sinCreditos = limite !== null && usados >= limite;

  const diasTrial = trial_ends_at
    ? Math.ceil((new Date(trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const periodFin = current_period_end
    ? new Date(current_period_end).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const handleSuscribir = async () => {
    setError(""); setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ws } = await supabase.from("workspaces").select("id").single();
      const res = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: ws.id, userEmail: user.email }),
      });
      const json = await res.json();
      if (json.init_point) {
        window.location.href = json.init_point;
      } else {
        setError(json.error || "Error al crear la suscripción");
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const badge = (txt, color) => (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", background: color + "22", color, border: `1px solid ${color}44` }}>
      {txt}
    </span>
  );

  const handleCancelar = async () => {
    setError(""); setLoading(true);
    try {
      const { data: ws } = await supabase.from("workspaces").select("id").single();
      const res = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preapprovalId: mp_preapproval_id, workspaceId: ws.id }),
      });
      const json = await res.json();
      if (!json.ok) setError(json.error || "Error al cancelar");
      else window.location.reload();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const btnSuscribir = (label) => (
    <button onClick={handleSuscribir} disabled={loading}
      style={{ padding: "10px 0", borderRadius: 8, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)", fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", letterSpacing: "0.08em" }}>
      {loading ? "..." : label}
    </button>
  );

  return (
    <Card className="rsp-card">
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 12 }}>
        💳 Suscripción
      </div>

      {/* Cuenta de administrador — acceso ilimitado, exento de pagos */}
      {esAdmin && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {badge("ADMINISTRADOR", "#d4af37")}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55 }}>
            Acceso completo a la app sin restricción de tiempo ni cobros.
            Cuenta de dueño con privilegios totales.
          </div>
        </div>
      )}

      {!esAdmin && estado === "trialing" && diasTrial !== null && diasTrial > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {badge("Prueba gratuita", "var(--accent)")}
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {diasTrial === 1 ? "Vence mañana" : `Vence en ${diasTrial} días`}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Suscribite para continuar usando CarpiCálc al vencer el período de prueba.
          </div>
          {btnSuscribir("Suscribirme — $35.000/mes")}
        </div>
      )}

      {!esAdmin && estado === "trialing" && (diasTrial === null || diasTrial <= 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {badge("Prueba vencida", "#e07070")}
          {btnSuscribir("Suscribirme — $35.000/mes")}
        </div>
      )}

      {!esAdmin && estado === "active" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {badge("Activa", "#7ecf8a")}
            {periodFin && (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Próximo cobro: {periodFin}</span>
            )}
          </div>
          {!confirmCancelar ? (
            <button onClick={() => setConfirmCancelar(true)}
              style={{ padding: "7px 0", borderRadius: 7, background: "transparent", border: "1px solid rgba(200,60,60,0.30)", color: "#e07070", fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer" }}>
              Cancelar suscripción
            </button>
          ) : (
            <div style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.28)", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, color: "#e07070", fontWeight: 700 }}>¿Confirmás la cancelación?</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Perderás acceso al finalizar el período pagado.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleCancelar} disabled={loading}
                  style={{ flex: 1, padding: "7px 0", borderRadius: 7, background: "rgba(200,60,60,0.18)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070", fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer" }}>
                  {loading ? "..." : "Sí, cancelar"}
                </button>
                <button onClick={() => setConfirmCancelar(false)} disabled={loading}
                  style={{ flex: 1, padding: "7px 0", borderRadius: 7, background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer" }}>
                  Volver
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!esAdmin && estado === "past_due" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {badge("Pago pendiente", "#e0a070")}
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Hubo un problema con tu pago. Actualizá tu método de pago en MercadoPago.</span>
        </div>
      )}

      {!esAdmin && estado === "canceled" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {badge("Cancelada", "#e07070")}
          {btnSuscribir("Reactivar — $35.000/mes")}
        </div>
      )}

      {error && <div style={{ fontSize: 11, color: "#e07070", fontFamily: "'DM Mono',monospace", marginTop: 8 }}>⚠ {error}</div>}
      {/* Renders del admin — sin límite */}
      {esAdmin && (
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "var(--bg-base)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 6 }}>
            Renders IA — Acceso admin
          </div>
          <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-secondary)" }}>
            {usados} usados · ∞ ilimitado
          </span>
        </div>
      )}
      {!esAdmin && ["trialing", "active"].includes(estado) && (
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "var(--bg-base)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 6 }}>
            Renders IA — {planInfo.nombre}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
              {limite !== null && (
                <div style={{ height: "100%", width: `${Math.min(100, (usados / limite) * 100)}%`, background: sinCreditos ? "#e07070" : "var(--accent)", borderRadius: 2, transition: "width 0.3s" }} />
              )}
            </div>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: sinCreditos ? "#e07070" : "var(--text-secondary)", whiteSpace: "nowrap" }}>
              {limite === null ? `${usados} usados · ∞` : `${usados}/${limite} este mes`}
            </span>
          </div>
          {sinCreditos && limite !== null && (
            <div style={{ fontSize: 11, color: "#e07070", marginTop: 6 }}>Sin renders disponibles hasta el próximo mes</div>
          )}
        </div>
      )}

      {mp_preapproval_id && (
        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", marginTop: 8 }}>
          ID: {mp_preapproval_id}
        </div>
      )}
    </Card>
  );
}
