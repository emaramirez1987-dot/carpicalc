// ════════════════════════════════════════════════════════════════════════════
// AvisoTrial.jsx — banner amable + paywall del trial
// ════════════════════════════════════════════════════════════════════════════
//
// Dos componentes según estado del trial:
//
// BannerTrial      → barra suave arriba cuando quedan ≤5 días. Dismissible.
// PaywallTrial     → overlay bloqueante cuando el trial vence y el usuario
//                    NO es admin. Permite suscribirse o ver lo cargado en
//                    modo lectura limitada.
//
// El componente raíz `AvisoTrial` decide cuál mostrar según `suscripcion`.
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from "react";
import { supabase } from "../../lib/supabase.js";

const KEY_BANNER_VISTO = "carpicalc:trial_banner_dismissed";

function diasRestantes(suscripcion) {
  const fin = suscripcion?.trial_ends_at;
  if (!fin) return null;
  return Math.ceil((new Date(fin) - new Date()) / (1000 * 60 * 60 * 24));
}

// ── Banner suave: "Te quedan X días de prueba" ─────────────────────────────
function BannerTrial({ dias, onSuscribirse }) {
  const [oculto, setOculto] = useState(() => {
    try { return localStorage.getItem(KEY_BANNER_VISTO) === String(dias); }
    catch { return false; }
  });
  if (oculto) return null;
  const dismiss = () => {
    try { localStorage.setItem(KEY_BANNER_VISTO, String(dias)); } catch {}
    setOculto(true);
  };
  return (
    <div style={{
      padding: "8px 16px", background: "rgba(212,175,55,0.10)",
      borderBottom: "1px solid rgba(212,175,55,0.30)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
      fontFamily: "'DM Mono',monospace", fontSize: 12,
    }}>
      <span style={{ color: "#d4af37" }}>
        ⏳ Tu prueba gratuita termina en <b>{dias} día{dias !== 1 ? "s" : ""}</b>
      </span>
      <button onClick={onSuscribirse} style={{
        padding: "4px 12px", borderRadius: 6, cursor: "pointer",
        background: "linear-gradient(135deg, #d4af37, #b8852a)",
        border: "none", color: "#0a0a0a", fontSize: 11, fontWeight: 700,
        fontFamily: "'DM Mono',monospace",
      }}>Suscribirme</button>
      <button onClick={dismiss} style={{
        padding: "2px 8px", borderRadius: 4, cursor: "pointer",
        background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
        color: "var(--text-muted)", fontSize: 10,
      }}>✕</button>
    </div>
  );
}

// ── Paywall: overlay completo cuando el trial venció ───────────────────────
function PaywallTrial() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 5000,
      background: "rgba(8, 10, 13, 0.94)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 460,
        background: "var(--bg-base)", borderRadius: 14,
        border: "1px solid rgba(212,175,55,0.45)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        padding: 32, textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏰</div>
        <div style={{
          fontSize: 20, fontWeight: 700, color: "var(--text-primary)",
          marginBottom: 6, fontFamily: "'Bricolage Grotesque',sans-serif",
        }}>
          Tu prueba gratuita terminó
        </div>
        <div style={{
          fontSize: 13, color: "var(--text-secondary)", marginBottom: 22,
          lineHeight: 1.55,
        }}>
          Tus presupuestos, módulos y costos están guardados.
          Suscribite para seguir usando CarpiCálc sin perder nada.
        </div>

        <button onClick={handleSuscribir} disabled={loading} style={{
          width: "100%", padding: "12px 0", borderRadius: 8, cursor: "pointer",
          background: "linear-gradient(135deg, #d4af37, #b8852a)",
          border: "none", color: "#0a0a0a",
          fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono',monospace",
          letterSpacing: "0.06em",
        }}>
          {loading ? "..." : "Suscribirme — $35.000/mes"}
        </button>

        {error && (
          <div style={{ marginTop: 12, fontSize: 11, color: "#e07070", fontFamily: "'DM Mono',monospace" }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ marginTop: 18, fontSize: 11, color: "var(--text-muted)" }}>
          ¿Tenés problemas? Escribinos antes de suscribirte.
        </div>

        <button onClick={handleLogout} style={{
          marginTop: 16, padding: "6px 14px", borderRadius: 6, cursor: "pointer",
          background: "transparent", border: "1px solid var(--border)",
          color: "var(--text-muted)", fontSize: 11, fontFamily: "'DM Mono',monospace",
        }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function AvisoTrial({ suscripcion, onIrASuscripcion }) {
  if (!suscripcion) return null;

  // Admin: nunca se muestra nada
  if (suscripcion.app_role === "admin") return null;

  const { estado } = suscripcion;
  const dias = diasRestantes(suscripcion);

  // Trial vencido o cancelado / past_due → paywall bloqueante
  if (
    (estado === "trialing" && dias !== null && dias <= 0) ||
    estado === "past_due" ||
    estado === "canceled" ||
    estado === "unpaid"
  ) {
    return <PaywallTrial />;
  }

  // Trial activo con ≤5 días restantes → banner amable
  if (estado === "trialing" && dias !== null && dias > 0 && dias <= 5) {
    return <BannerTrial dias={dias} onSuscribirse={onIrASuscripcion} />;
  }

  return null;
}
