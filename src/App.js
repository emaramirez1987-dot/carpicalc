import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  LogoIsotipo, GlobalStyles, Card, SectionTitle, SaveIndicator
} from "./components/ui/index.jsx";
import { HojaCostos } from "./components/costos/index.jsx";
import { CatalogoModulos, EditorVistaSVG } from "./components/catalogo/index.jsx";
import { Presupuesto } from "./components/presupuesto/index.jsx";
import { VistaPrevia } from "./components/vista-previa/index.jsx";
import { ListaCorte } from "./components/corte/index.jsx";
import { TableroKanban } from "./components/trabajos/index.jsx";
import { PanelCaja } from "./components/caja/index.jsx";
import { NavProvider, useNav } from "./state/NavContext.jsx";
import { PresupuestoContext } from "./state/PresupuestoContext.jsx";

import { PERFIL_VACIO } from "./constants.js";
import { supabase } from "./lib/supabase.js";
import { calcularModulo, comprimirImagen, fmtFecha } from "./utils.js";
import {
  cargarDatos, cargarSuscripcion,
  guardarModulos, guardarPresupuestos, guardarPerfil, guardarCostos,
  leerVersionCostos, exportarBackup, importarBackup,
} from "./storage.js";
import { useTema } from "./hooks/useTema.js";
import {
  crearPresupuesto,
  eliminarPresupuesto,
  cambiarEstado,
  actualizarPresupuesto,
  migrarTempEnPresupuestos,
} from "./services/presupuestoService.js";

// ─── PanelSuscripcion ─────────────────────────────────────────────────────────
function PanelSuscripcion({ suscripcion }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  if (!suscripcion) return null;

  const { estado, trial_ends_at, current_period_end, mp_preapproval_id } = suscripcion;

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

  return (
    <Card className="rsp-card">
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 12 }}>
        💳 Suscripción
      </div>

      {estado === "trialing" && diasTrial !== null && diasTrial > 0 && (
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
          <button onClick={handleSuscribir} disabled={loading}
            style={{ padding: "10px 0", borderRadius: 8, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)", fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", letterSpacing: "0.08em" }}>
            {loading ? "..." : "Suscribirme — $35.000/mes"}
          </button>
        </div>
      )}

      {estado === "trialing" && (diasTrial === null || diasTrial <= 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {badge("Prueba vencida", "#e07070")}
          <button onClick={handleSuscribir} disabled={loading}
            style={{ padding: "10px 0", borderRadius: 8, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)", fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", letterSpacing: "0.08em" }}>
            {loading ? "..." : "Suscribirme — $35.000/mes"}
          </button>
        </div>
      )}

      {estado === "active" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {badge("Activa", "#7ecf8a")}
          {periodFin && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Próximo cobro: {periodFin}</span>
          )}
        </div>
      )}

      {estado === "past_due" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {badge("Pago pendiente", "#e0a070")}
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Hubo un problema con tu pago. Actualizá tu método de pago en MercadoPago.</span>
        </div>
      )}

      {estado === "canceled" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {badge("Cancelada", "#e07070")}
          <button onClick={handleSuscribir} disabled={loading}
            style={{ padding: "10px 0", borderRadius: 8, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)", fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", letterSpacing: "0.08em" }}>
            {loading ? "..." : "Reactivar — $35.000/mes"}
          </button>
        </div>
      )}

      {error && <div style={{ fontSize: 11, color: "#e07070", fontFamily: "'DM Mono',monospace", marginTop: 8 }}>⚠ {error}</div>}
      {mp_preapproval_id && (
        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", marginTop: 8 }}>
          ID: {mp_preapproval_id}
        </div>
      )}
    </Card>
  );
}

// ─── PanelPerfil ─────────────────────────────────────────────────────────────
function PanelPerfil({ perfil, onGuardar, suscripcion }) {
  const [form, setForm] = useState({ ...perfil });
  const [guardado, setGuardado] = useState(false);
  const logoRef = React.useRef();
  const backupRef = React.useRef();

  const [diasDesdeBackup, setDiasDesdeBackup] = useState(() => {
    try {
      const ts = localStorage.getItem("carpicalc:ultimo_backup");
      if (!ts) return null;
      return Math.floor((Date.now() - parseInt(ts)) / (1000 * 60 * 60 * 24));
    } catch { return null; }
  });
  const [confirmandoImport, setConfirmandoImport] = useState(false);
  const [datosImport, setDatosImport] = useState(null);
  const [importError, setImportError] = useState(null);

  const handleExportar = () => {
    exportarBackup();
    setDiasDesdeBackup(0);
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed?.datos) throw new Error();
        setDatosImport(parsed);
        setConfirmandoImport(true);
      } catch {
        setImportError("El archivo no es un backup válido de CarpiCálc.");
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmarImport = () => {
    try {
      importarBackup(datosImport);
      window.location.reload();
    } catch (err) {
      setImportError(err.message);
      setConfirmandoImport(false);
    }
  };

  const [passNueva, setPassNueva]     = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [passError, setPassError]     = useState(null);
  const [passOk, setPassOk]           = useState(false);
  const [showPass, setShowPass]       = useState(false);

  const handleCambiarPass = async () => {
    setPassError(null);
    setPassOk(false);
    if (passNueva.trim().length < 6) {
      setPassError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (passNueva !== passConfirm) {
      setPassError("Las contraseñas no coinciden.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: passNueva.trim() });
    if (error) { setPassError(error.message); return; }
    setPassNueva(""); setPassConfirm("");
    setPassOk(true);
    setTimeout(() => setPassOk(false), 3000);
  };

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await comprimirImagen(file, 300, 120, 0.88);
    upd("logo", b64);
    e.target.value = "";
  };

  const handleGuardar = () => {
    onGuardar({ ...form });
    localStorage.setItem("carpicalc:onboarding_done", "1");
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  const inp = {
    fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: "9px 13px",
    background: "var(--bg-base)", border: "1px solid var(--border)",
    color: "var(--text-primary)", borderRadius: 8, outline: "none",
    width: "100%", transition: "border-color 0.15s"
  };

  const esNuevo = !perfil?.nombre;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {esNuevo && (
        <div style={{
          borderRadius: 16,
          background: "linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)",
          border: "1px solid rgba(212,175,55,0.30)",
          padding: "28px 28px 24px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 28 }}>🪵</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 900, color: "var(--accent)", lineHeight: 1.1 }}>
                ¡Bienvenido a CarpiCálc!
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em" }}>
                Tu taller de carpintería, ahora profesionalizado
              </div>
            </div>
          </div>
          <div style={{ width: "100%", height: 1, background: "rgba(212,175,55,0.15)" }} />
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Para empezar, completá los datos de tu taller a continuación. Aparecerán en todos tus presupuestos, PDF y documentos generados.
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
              Podés actualizar estos datos en cualquier momento
            </span>
          </div>
        </div>
      )}

      <SectionTitle sub="Esta información aparece en todos los documentos generados">
        ⚙ Mi Taller
      </SectionTitle>

      {(diasDesdeBackup === null || diasDesdeBackup >= 7) && (
        <div style={{
          padding: "12px 16px", borderRadius: 10,
          background: diasDesdeBackup === null ? "rgba(200,160,42,0.10)" : diasDesdeBackup >= 14 ? "rgba(200,60,60,0.10)" : "rgba(200,160,42,0.10)",
          border: `1px solid ${diasDesdeBackup === null || diasDesdeBackup < 14 ? "rgba(200,160,42,0.30)" : "rgba(200,60,60,0.30)"}`,
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap"
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: diasDesdeBackup !== null && diasDesdeBackup >= 14 ? "#e07070" : "#c8a02a", marginBottom: 2 }}>
              {diasDesdeBackup === null ? "⚠ Nunca realizaste un backup" : `⚠ Último backup hace ${diasDesdeBackup} días`}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Tus datos viven en este navegador. Un backup protege meses de trabajo.
            </div>
          </div>
          <button onClick={handleExportar}
            style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#c8a02a", background: "rgba(200,160,42,0.12)", border: "1px solid rgba(200,160,42,0.35)", borderRadius: 6, padding: "6px 14px", cursor: "pointer", whiteSpace: "nowrap" }}>
            ⬇ Exportar ahora
          </button>
        </div>
      )}

      <Card className="rsp-card">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 10 }}>
              Logo del taller
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {form.logo
                ? <img src={form.logo} alt="logo" style={{ height: 60, maxWidth: 160, objectFit: "contain", borderRadius: 6 }} />
                : <div style={{ width: 100, height: 60, borderRadius: 6, border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <LogoIsotipo size={36} />
                  </div>
              }
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button onClick={() => logoRef.current?.click()}
                  style={{ padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                  {form.logo ? "Cambiar logo" : "Subir logo"}
                </button>
                {form.logo && (
                  <button onClick={() => upd("logo", null)}
                    style={{ padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", background: "transparent", border: "1px solid rgba(200,60,60,0.30)", color: "#e07070" }}>
                    Eliminar logo
                  </button>
                )}
                <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogo} />
              </div>
            </div>
          </div>
          {[
            ["nombre",    "Nombre del taller",       "Carpintería Don José"],
            ["cuit",      "CUIT / DNI",               "20-12345678-9"],
            ["telefono",  "Teléfono",                 "+54 341 555-1234"],
            ["email",     "Email",                    "contacto@taller.com"],
            ["direccion", "Dirección",                "Av. San Martín 456"],
            ["ciudad",    "Ciudad / Localidad",       "Rosario, Santa Fe"],
            ["web",       "Sitio web (opcional)",     "www.misitio.com"],
          ].map(([k, label, ph]) => (
            <div key={k}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
              <input value={form[k] || ""} onChange={e => upd(k, e.target.value)} placeholder={ph} style={inp}
                onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"} />
            </div>
          ))}
        </div>
      </Card>

      <button onClick={handleGuardar}
        style={{ padding: "12px 0", borderRadius: 10, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, background: guardado ? "rgba(100,180,80,0.15)" : "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: guardado ? "1px solid rgba(100,180,80,0.40)" : "none", color: guardado ? "#7ecf8a" : "var(--text-inverted)", transition: "all 0.2s" }}>
        {guardado ? "✓ Guardado" : "💾 Guardar perfil"}
      </button>

      {/* ── Backup completo ───────────────────────────────────────────── */}
      <Card className="rsp-card">
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 10 }}>
          💾 Backup completo del sistema
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
          Un archivo JSON con todos tus datos: módulos, costos, presupuestos, perfil e historial de precios.
          Si algo le pasa al navegador, restaurás todo en segundos.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={handleExportar}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)", boxShadow: "0 2px 10px rgba(180,100,20,0.22)" }}>
            ⬇ Exportar backup
          </button>
          <button onClick={() => { setImportError(null); backupRef.current?.click(); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            ⬆ Importar backup
          </button>
          <input ref={backupRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleFileImport} />
        </div>

        {/* Confirmación de importación */}
        {confirmandoImport && datosImport && (
          <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 8, background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.28)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e07070", marginBottom: 6 }}>
              ⚠ Esto reemplazará TODOS los datos actuales
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
              Backup del {fmtFecha(datosImport.fecha)}. La página se recargará automáticamente.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleConfirmarImport}
                style={{ padding: "7px 16px", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "rgba(200,60,60,0.18)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070" }}>
                Sí, restaurar
              </button>
              <button onClick={() => { setConfirmandoImport(false); setDatosImport(null); }}
                style={{ padding: "7px 16px", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
        {importError && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#e07070", fontFamily: "'DM Mono',monospace" }}>⚠ {importError}</div>
        )}
      </Card>

      {/* ── Seguridad ─────────────────────────────────────────────────── */}
      {/* ── Suscripción ───────────────────────────────────────────────── */}
      <PanelSuscripcion suscripcion={suscripcion} />

      <Card className="rsp-card">
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 10 }}>
          🔒 Seguridad — Contraseña de acceso
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ marginBottom: 16, padding: "7px 16px", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, background: "transparent", border: "1px solid rgba(200,60,60,0.30)", color: "#e07070" }}
        >
          🚪 Cerrar sesión
        </button>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
          Cambiá la contraseña de tu cuenta.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <input type={showPass ? "text" : "password"} value={passNueva} onChange={e => { setPassNueva(e.target.value); setPassError(null); }}
              placeholder="Nueva contraseña (mínimo 4 caracteres)" style={{ ...inp, paddingRight: 36 }} />
            <button onClick={() => setShowPass(s => !s)} tabIndex={-1}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16, padding: 0 }}>
              {showPass ? "🙈" : "👁"}
            </button>
          </div>
          <div style={{ position: "relative" }}>
            <input type={showPass ? "text" : "password"} value={passConfirm} onChange={e => { setPassConfirm(e.target.value); setPassError(null); }}
              placeholder="Confirmar nueva contraseña" style={{ ...inp, paddingRight: 36 }}
              onKeyDown={e => e.key === "Enter" && handleCambiarPass()} />
            <button onClick={() => setShowPass(s => !s)} tabIndex={-1}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16, padding: 0 }}>
              {showPass ? "🙈" : "👁"}
            </button>
          </div>
          {passError && <div style={{ fontSize: 11, color: "#e07070", fontFamily: "'DM Mono',monospace" }}>⚠ {passError}</div>}
          {passOk    && <div style={{ fontSize: 11, color: "#7ecf8a", fontFamily: "'DM Mono',monospace" }}>✓ Contraseña actualizada correctamente</div>}
          <button onClick={handleCambiarPass}
            style={{ padding: "10px 0", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)", transition: "all 0.2s" }}>
            Actualizar contraseña
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────
function Header({ tabs, saveEst, tema, toggleTema }) {
  const { nav, dispatch } = useNav();
  return (
    <header
      className="no-print rsp-header-inner"
      style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", gap: 24,
        padding: "0 28px",
        background: "var(--bg-nav)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 1px 0 var(--separator), var(--shadow-sm)",
        transition: "background 0.3s",
      }}
    >
      {/* Brand */}
      <div className="rsp-brand" style={{ padding: "12px 0", flexShrink: 0, display: "flex", alignItems: "center", gap: 9 }}>
        <LogoIsotipo size={36} />
        <div className="rsp-brand-text">
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 900, color: "var(--accent)", lineHeight: 1, letterSpacing: "-0.02em" }}>
            CarpiCálc
          </div>
          <div style={{ fontSize: 8, letterSpacing: "0.26em", textTransform: "uppercase", marginTop: 3, color: "var(--text-muted)", fontWeight: 400, fontFamily: "'DM Mono',monospace" }}>
            Diseño & Costos
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="rsp-nav" style={{ display: "flex", flex: 1, overflowX: "auto", scrollbarWidth: "none" }}>
        {tabs.map(t => {
          const active = nav.vista === t.id;
          return (
            <button
              key={t.id}
              data-vista={t.id}
              onClick={() => dispatch({ type: "CAMBIAR_VISTA", payload: { vista: t.id } })}
              style={{
                position: "relative",
                background: "transparent", border: "none",
                borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                color: active ? "var(--accent)" : "var(--text-muted)",
                padding: "18px 20px",
                cursor: "pointer",
                fontSize: 11, fontWeight: active ? 700 : 500,
                letterSpacing: "0.12em", textTransform: "uppercase",
                fontFamily: "'DM Mono',monospace",
                transition: "all 0.2s", flexShrink: 0, whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderBottomColor = "var(--accent-border)"; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderBottomColor = "transparent"; }}}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </nav>

      {/* Controles */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <SaveIndicator estado={saveEst} />
        <button
          onClick={toggleTema}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 999, fontSize: 11,
            fontFamily: "'DM Mono',monospace", fontWeight: 700,
            cursor: "pointer", transition: "all 0.2s",
            border: "1px solid var(--accent-border)",
            background: "var(--accent-soft)",
            color: "var(--accent)", whiteSpace: "nowrap",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,175,55,0.18)"; e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--accent-soft)"; e.currentTarget.style.borderColor = "var(--accent-border)"; }}
        >
          {tema === "dark" ? "☀ Cálido" : "🌑 Taller"}
        </button>
      </div>
    </header>
  );
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────
const inpStyle = (err) => ({
  padding: "10px 14px", borderRadius: 8,
  border: `1px solid ${err ? "rgba(200,60,60,0.60)" : "var(--border)"}`,
  background: "var(--bg-base)", color: "var(--text-primary)",
  fontSize: 14, outline: "none", fontFamily: "'Bricolage Grotesque',sans-serif", width: "100%", boxSizing: "border-box",
});
const btnPrimary = {
  padding: "10px 0", borderRadius: 8,
  background: "linear-gradient(135deg,var(--accent),var(--accent-hover))",
  border: "none", color: "var(--text-inverted)", fontSize: 13, fontWeight: 700,
  fontFamily: "'DM Mono',monospace", cursor: "pointer", letterSpacing: "0.08em",
  textTransform: "uppercase", width: "100%",
};
const msgError = { fontSize: 11, color: "#e07070", textAlign: "center", fontFamily: "'DM Mono',monospace" };

function LoginScreen() {
  const [tab,    setTab]    = useState("login");   // "login" | "register" | "reset"
  const [email,  setEmail]  = useState("");
  const [pass,   setPass]   = useState("");
  const [taller, setTaller] = useState("");
  const [error,  setError]  = useState("");
  const [msg,    setMsg]    = useState("");
  const [shake,  setShake]  = useState(false);
  const [loading, setLoading] = useState(false);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };
  const resetMsg = () => { setError(""); setMsg(""); };

  const handleLogin = async () => {
    resetMsg(); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    setLoading(false);
    if (err) { setError(err.message === "Invalid login credentials" ? "Email o contraseña incorrectos" : err.message); triggerShake(); }
    // on success, onAuthStateChange in App() sets autenticado → true automatically
  };

  const handleRegister = async () => {
    resetMsg();
    if (!taller.trim()) { setError("Ingresá el nombre de tu taller"); triggerShake(); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(), password: pass,
      options: { data: { nombre_taller: taller.trim() } },
    });
    setLoading(false);
    if (err) { setError(err.message); triggerShake(); }
    else setMsg("¡Registrado! Tu correo de confirmación se enviará a la brevedad.");
  };

  const handleReset = async () => {
    resetMsg(); setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (err) { setError(err.message); triggerShake(); }
    else setMsg("Revisá tu correo para restablecer la contraseña.");
  };

  const tabBtn = (id, label) => (
    <button onClick={() => { setTab(id); resetMsg(); }}
      style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        background: tab === id ? "var(--accent)" : "transparent",
        color: tab === id ? "var(--text-inverted)" : "var(--text-muted)" }}>
      {label}
    </button>
  );

  return (
    <>
      <GlobalStyles />
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}>
        <div className={shake ? "anim-shake" : ""} style={{ width: "100%", maxWidth: 340, padding: 32, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <LogoIsotipo size={56} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: "var(--accent)" }}>CarpiCálc</div>
            <div style={{ fontSize: 10, letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", marginTop: 2 }}>Diseño & Costos</div>
          </div>

          {/* Tabs */}
          {tab !== "reset" && (
            <div style={{ width: "100%", display: "flex", gap: 4, background: "var(--bg-base)", borderRadius: 8, padding: 4 }}>
              {tabBtn("login", "Ingresar")}
              {tabBtn("register", "Registrarse")}
            </div>
          )}

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Email (todos los tabs) */}
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); resetMsg(); }}
              onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : tab === "register" ? handleRegister() : handleReset())}
              placeholder="Correo electrónico" style={inpStyle(!!error)} />

            {/* Nombre taller (solo register) */}
            {tab === "register" && (
              <input type="text" value={taller} onChange={e => { setTaller(e.target.value); resetMsg(); }}
                placeholder="Nombre de tu taller"
                style={inpStyle(!!error)} />
            )}

            {/* Password (login + register) */}
            {tab !== "reset" && (
              <input type="password" value={pass} onChange={e => { setPass(e.target.value); resetMsg(); }}
                onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())}
                placeholder="Contraseña" style={inpStyle(!!error)} />
            )}

            {error && <div style={msgError}>{error}</div>}
            {msg   && <div style={{ ...msgError, color: "var(--accent)" }}>{msg}</div>}

            {tab === "login" && (
              <button onClick={handleLogin} disabled={loading} style={btnPrimary}>
                {loading ? "..." : "Ingresar"}
              </button>
            )}
            {tab === "register" && (
              <button onClick={handleRegister} disabled={loading} style={btnPrimary}>
                {loading ? "..." : "Crear cuenta"}
              </button>
            )}
            {tab === "reset" && (
              <>
                <button onClick={handleReset} disabled={loading} style={btnPrimary}>
                  {loading ? "..." : "Enviar enlace"}
                </button>
                <button onClick={() => { setTab("login"); resetMsg(); }}
                  style={{ ...btnPrimary, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  Volver
                </button>
              </>
            )}

            {tab === "login" && (
              <button onClick={() => { setTab("reset"); resetMsg(); }}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace", textDecoration: "underline", textAlign: "center" }}>
                Olvidé mi contraseña
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── AppInterna ───────────────────────────────────────────────────────────────
// Estado de dominio + coordinación. La navegación vive en NavContext.
function AppInterna() {
  const { tema, toggleTema } = useTema();
  const { nav, dispatch } = useNav();

  // ── Estado de dominio (no es navegación — queda aquí) ────────────────────
  const [modulos,        setModulos]        = useState(null);
  const [costos,         setCostos]         = useState(null);
  const [presupuestos,   setPresupuestos]   = useState({});
  const [perfil,         setPerfil]         = useState({ ...PERFIL_VACIO });
  const [cargando,       setCargando]       = useState(true);
  const [saveEst,        setSaveEst]        = useState(null);
  const [items,              setItems]              = useState([]);
  const [dimOverride,        setDimOverride]        = useState({});
  const [adicionales,        setAdicionales]        = useState([]);
  const [costosDirectos,     setCostosDirectos]     = useState([]);
  const [costosVersion,      setCostosVersion]      = useState(leerVersionCostos);
  const [borradorRecuperado, setBorradorRecuperado] = useState(false);
  // ID del presupuesto en edición activa. null = presupuesto nuevo sin guardar.
  // Se levanta aquí (no en Presupuesto) para que el borrador pueda persistirlo
  // y restaurarlo correctamente entre sesiones.
  const [presupuestoActivoId, setPresupuestoActivoId] = useState(null);
  const [suscripcion,         setSuscripcion]         = useState(null);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Verificar si el usuario volvió de MercadoPago con preapproval_id
    const params = new URLSearchParams(window.location.search);
    const preapprovalId = params.get("preapproval_id");
    if (preapprovalId) {
      window.history.replaceState({}, "", window.location.pathname);
      supabase.from("workspaces").select("id").single().then(({ data: ws }) => {
        if (!ws) return;
        fetch("/api/check-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preapprovalId, workspaceId: ws.id }),
        }).finally(() => cargarSuscripcion().then(setSuscripcion));
      });
    } else {
      cargarSuscripcion().then(setSuscripcion);
    }
    cargarDatos().then(({ modulos, costos, presupuestos, perfil }) => {
      setModulos(modulos);
      setCostos(costos);
      setPresupuestos(presupuestos || {});
      if (perfil) setPerfil(perfil);
      // Primera vez: perfil vacío y nunca completó onboarding → ir a Mi Taller
      const onboardingDone = localStorage.getItem("carpicalc:onboarding_done");
      if (!perfil?.nombre && !onboardingDone) {
        dispatch({ type: "CAMBIAR_VISTA", payload: { vista: "config" } });
      }
      try {
        const borrador = localStorage.getItem("carpicalc:borrador");
        if (borrador) {
          const { items: bItems, dimOverride: bDim, presupuestoActivoId: bPresId } = JSON.parse(borrador);
          if (bItems?.length > 0) {
            setItems(bItems);
            setDimOverride(bDim || {});
            if (bPresId) setPresupuestoActivoId(bPresId);
            setBorradorRecuperado(true);
          }
        }
      } catch {}
      setCargando(false);
    });
  }, [dispatch]);

  // ── Autosave de borrador ──────────────────────────────────────────────────
  useEffect(() => {
    if (items.length > 0) {
      try {
        localStorage.setItem("carpicalc:borrador", JSON.stringify({
          items, dimOverride,
          ...(presupuestoActivoId ? { presupuestoActivoId } : {}),
        }));
      }
      catch {}
    } else {
      localStorage.removeItem("carpicalc:borrador");
    }
  }, [items, dimOverride, presupuestoActivoId]);

  // ── Aviso antes de cerrar con datos sin guardar ───────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (items.length > 0) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [items]);

  // ── Persistencia con cola serializada ─────────────────────────────────────
  // Garantiza que saves paralelos no se pisen entre sí.
  const saveQueue   = useRef([]);
  const saveRunning = useRef(false);

  const withSave = useCallback((fn) => {
    saveQueue.current.push(fn);
    if (saveRunning.current) return;
    const drain = async () => {
      saveRunning.current = true;
      setSaveEst("guardando");
      let lastOk = true;
      while (saveQueue.current.length > 0) {
        const next = saveQueue.current.shift();
        const ok = await next();
        if (!ok) lastOk = false;
      }
      setSaveEst(lastOk ? "guardado" : "error");
      setTimeout(() => setSaveEst(null), 2500);
      saveRunning.current = false;
    };
    drain();
  }, []);

  const hSaveM = (data) => {
    const ts = Date.now();
    setCostosVersion(ts);
    return withSave(() => guardarModulos(data, ts));
  };

  const hSaveC = (data) => {
    setCostosVersion(Date.now());
    return withSave(() => guardarCostos(data));
  };

  // ── getModUsado — resuelve módulo con dimOverride del presupuesto activo ──
  const getModUsado = useCallback((item) => {
    if (!modulos || !item) return null;
    const cod   = typeof item === "string" ? item : item.codigo;
    const keyId = typeof item === "string" ? item : item.id || item.codigo;
    const base  = modulos[cod];
    if (!base) return null;
    const over  = dimOverride[keyId] || {};
    return {
      ...base,
      dimensiones: {
        ancho:       over.ancho       ?? base.dimensiones.ancho,
        profundidad: over.profundidad ?? base.dimensiones.profundidad,
        alto:        over.alto        ?? base.dimensiones.alto,
      },
    };
  }, [modulos, dimOverride]);

  // ── Total del presupuesto activo ──────────────────────────────────────────
  const totalModulos = !costos ? 0 : items.reduce((acc, it) => {
    const m = getModUsado(it);
    if (!m) return acc;
    const c = calcularModulo(m, costos);
    if (!c) return acc;
    return acc + c.total * it.cantidad;
  }, 0);
  const totalAdicionales    = adicionales.reduce((a, x) => a + (parseFloat(x.monto) || 0), 0);
  const totalCostosDirectos = costosDirectos.reduce((a, x) => a + (parseFloat(x.subtotal) || 0), 0);
  const totalGeneral        = totalModulos + totalAdicionales + totalCostosDirectos;

  // ── Handlers de dominio de presupuestos ───────────────────────────────────
  const handleGuardarPresupuesto = (nombre, cliente, nota, presupuestoCompleto) => {
    const { id, presupuestos: nuevo } = crearPresupuesto({
      presupuestos, nombre, cliente, nota,
      items, dimOverride, adicionales, costosDirectos,
      total: totalGeneral,
      costosVersionAl: leerVersionCostos() || Date.now(),
      presupuestoCompleto,
    });
    setPresupuestos(nuevo);
    setPresupuestoActivoId(id);   // el nuevo presupuesto ya tiene ID permanente
    withSave(() => guardarPresupuestos(nuevo));
    localStorage.removeItem("carpicalc:borrador");
  };

  const handleCargarPresupuesto = (p, id) => {
    setItems(p.items ? [...p.items] : []);
    setDimOverride(p.dimOverride && typeof p.dimOverride === "object" ? { ...p.dimOverride } : {});
    setAdicionales(Array.isArray(p.adicionales) ? [...p.adicionales] : []);
    setCostosDirectos(Array.isArray(p.costosDirectos) ? [...p.costosDirectos] : []);
    if (id) setPresupuestoActivoId(id);
    localStorage.removeItem("carpicalc:borrador");
  };

  const handleEliminarPresupuesto = (id) => {
    const { presupuestos: nuevo, modulos: nuevosModulos, modulosCambiaron } =
      eliminarPresupuesto({ presupuestos, modulos, id });
    if (modulosCambiaron) {
      setModulos(nuevosModulos);
      withSave(() => guardarModulos(nuevosModulos));
    }
    setPresupuestos(nuevo);
    withSave(() => guardarPresupuestos(nuevo));
  };

  const handleCambiarEstado = (id, estado) => {
    const nuevo = cambiarEstado({ presupuestos, id, estado });
    setPresupuestos(nuevo);
    withSave(() => guardarPresupuestos(nuevo));
  };

  const handleActualizarPresupuesto = (id, cambios) => {
    const nuevo = actualizarPresupuesto({ presupuestos, id, cambios });
    setPresupuestos(nuevo);
    withSave(() => guardarPresupuestos(nuevo));
  };

  const handleGuardarExtraFrecuente = (extra) => {
    const nuevo = {
      ...costos,
      extrasFrecuentes: [...(costos.extrasFrecuentes || []),
        { id: Date.now(), nombre: extra.nombre, precio: extra.precio }],
    };
    setCostos(nuevo);
    withSave(() => guardarCostos(nuevo));
  };

  const tabs = [
    { id: "presupuesto", label: "Presupuesto", icon: "📋" },
    { id: "preview",     label: "Vista previa", icon: "📄" },
    { id: "corte",       label: "Corte",        icon: "🪚" },
    { id: "trabajos",    label: "Trabajos",     icon: "📊" },
    { id: "caja",        label: "Caja",         icon: "💵" },
    { id: "catalogo",    label: "Catálogo",     icon: "🗂" },
    { id: "costos",      label: "Costos",       icon: "💰" },
    { id: "config",      label: "Mi taller",    icon: "⚙" },
  ];

  // ── Valor del contexto del editor activo ──────────────────────────────────
  // Debe ir ANTES del return temprano de carga — regla de hooks.
  // Estado permanece en AppInterna; el contexto solo lo publica para que
  // Presupuesto lo consuma sin recibir 10 props extra.
  // useMemo evita re-renders innecesarios cuando AppInterna actualiza por
  // razones ajenas al editor (ej: cambio de nav).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const presupuestoCtxValue = useMemo(() => ({
    items, setItems,
    dimOverride, setDimOverride,
    adicionales, setAdicionales,
    costosDirectos, setCostosDirectos,
    presupuestoActivoId, setPresupuestoActivoId,
  }), [items, dimOverride, adicionales, costosDirectos, presupuestoActivoId]);

  if (cargando)
    return (
      <>
        <GlobalStyles />
        <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="anim-scalein" style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <LogoIsotipo size={88} />
            </div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 900, color: "var(--accent)", letterSpacing: "-0.02em", marginBottom: 6 }}>
              CarpiCálc
            </div>
            <div style={{ fontSize: 9, letterSpacing: "0.30em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 28, fontWeight: 400, fontFamily: "'DM Mono',monospace" }}>
              Diseño & Gestión de Costos
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", animation: "dotPulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.18}s`, opacity: 0.3 }} />
              ))}
            </div>
            <style>{`@keyframes dotPulse{0%,80%,100%{opacity:0.3;transform:scale(1)}40%{opacity:1;transform:scale(1.4)}}`}</style>
          </div>
        </div>
      </>
    );

  return (
    <PresupuestoContext.Provider value={presupuestoCtxValue}>
    <>
      <GlobalStyles />
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", transition: "background 0.3s" }}>
        <Header tabs={tabs} saveEst={saveEst} tema={tema} toggleTema={toggleTema} />
        <main className="rsp-main" style={{ maxWidth: 980, margin: "0 auto", padding: "28px 20px" }}>
          <div key={nav.vista} className="tab-view">

            {nav.vista === "presupuesto" && (
              <Presupuesto
                modulos={modulos}
                costos={costos}
                getModUsado={getModUsado}
                totalGeneral={totalGeneral}
                presupuestos={presupuestos}
                onGuardarPresupuesto={handleGuardarPresupuesto}
                onCargarPresupuesto={handleCargarPresupuesto}
                onEliminarPresupuesto={handleEliminarPresupuesto}
                onCambiarEstado={handleCambiarEstado}
                onActualizarPresupuesto={handleActualizarPresupuesto}
                onVerPresupuesto={(id) => dispatch({ type: "ABRIR_VISTA_PREVIA", payload: { presupuestoId: id } })}
                costosVersion={costosVersion}
                presupuestoParaEditar={nav.presupuestoParaEditar}
                onPresupuestoEditarConsumed={() => dispatch({ type: "PRESUPUESTO_PARA_EDITAR_CONSUMIDO" })}
                borradorRecuperado={borradorRecuperado}
                onDismissBorrador={() => setBorradorRecuperado(false)}
                onGuardarExtraFrecuente={handleGuardarExtraFrecuente}
                onVerCatalogo={(codigo, contexto) => dispatch({
                  type: "INICIAR_EDICION_NIVEL3",
                  payload: { cod: codigo, contexto },
                })}
                onDeepLinkListo={(cod, contexto) => dispatch({
                  type: "DEEPLINK_LISTO",
                  payload: { cod, contexto },
                })}
                pendingDeepLink={nav.pendingDeepLink}
                pendingDeepLinkCtx={nav.pendingDeepLinkCtx}
                setModulos={setModulos}
                hSaveModulos={hSaveM}
                onLimpiarTemps={(itemsActuales) => {
                  const codsTemp = itemsActuales.filter(it => it.codigo?.startsWith("TEMP_")).map(it => it.codigo);
                  if (codsTemp.length === 0) return;
                  const nuevos = Object.fromEntries(Object.entries(modulos).filter(([c]) => !codsTemp.includes(c)));
                  setModulos(nuevos);
                  hSaveM(nuevos);
                }}
                onGuardarModuloCatalogo={(nuevoMod, nombreFinal, tempCod, presupuestoId) => {
                  const newId = `MC${String(Date.now()).slice(-6)}`;
                  const modPermanente = {
                    ...nuevoMod, nombre: nombreFinal || nuevoMod.nombre,
                    temporal: false, presupuestoId: undefined, origenCodigo: undefined,
                  };
                  const nuevosModulos = { ...modulos, [newId]: modPermanente };
                  if (tempCod && nuevosModulos[tempCod]) delete nuevosModulos[tempCod];
                  setModulos(nuevosModulos);
                  hSaveM(nuevosModulos);
                  if (presupuestoId && tempCod && presupuestos[presupuestoId]) {
                    const nuevosPres = migrarTempEnPresupuestos({ presupuestos, tempCod, newId });
                    setPresupuestos(nuevosPres);
                    withSave(() => guardarPresupuestos(nuevosPres));
                  }
                  return newId;
                }}
              />
            )}

            {nav.vista === "preview" && (
              <VistaPrevia
                items={items}
                modulos={modulos}
                costos={costos}
                onLimpiar={() => { setItems([]); setDimOverride({}); }}
                getModUsado={getModUsado}
                totalGeneral={totalGeneral}
                presupuestos={presupuestos}
                perfil={perfil}
                onActualizarPresupuesto={handleActualizarPresupuesto}
                onCambiarEstado={handleCambiarEstado}
                onCargarPresupuesto={handleCargarPresupuesto}
                presupuestoSelId={nav.presupuestoVistaPreviaId}
                onSeleccionarPresupuesto={(id) => dispatch({ type: "SELECCIONAR_PRESUPUESTO_PREVIEW", payload: { presupuestoId: id } })}
                costosVersion={costosVersion}
                onVerRentabilidad={(id) => dispatch({ type: "ABRIR_CAJA", payload: { presupuestoId: id } })}
                onEditarModulos={(id, p) => {
                  handleCargarPresupuesto(p, id);
                  dispatch({ type: "EDITAR_PRESUPUESTO", payload: { id, p } });
                }}
              />
            )}

            {nav.vista === "corte" && (
              <ListaCorte
                items={items}
                modulos={modulos}
                costos={costos}
                getModUsado={getModUsado}
                presupuestos={presupuestos}
                presupuestoVistaPreviaId={nav.presupuestoVistaPreviaId}
                onActualizarPresupuesto={handleActualizarPresupuesto}
              />
            )}

            {nav.vista === "trabajos" && (
              <TableroKanban
                presupuestos={presupuestos}
                onCambiarEstado={handleCambiarEstado}
                onEliminar={handleEliminarPresupuesto}
                onCargar={(p) => {
                  handleCargarPresupuesto(p);
                  dispatch({ type: "CAMBIAR_VISTA", payload: { vista: "presupuesto" } });
                }}
                modulos={modulos}
                costos={costos}
                onActualizarPresupuesto={handleActualizarPresupuesto}
              />
            )}

            {nav.vista === "caja" && (
              <PanelCaja
                presupuestos={presupuestos}
                onActualizar={handleActualizarPresupuesto}
                modulos={modulos}
                costos={costos}
                cajaPresId={nav.cajaPresId}
                onClearCajaPresId={() => dispatch({ type: "CAJA_PRES_ID_CONSUMIDO" })}
              />
            )}

            {nav.vista === "catalogo" && (
              <CatalogoModulos
                modulos={modulos}
                setModulos={setModulos}
                costos={costos}
                onSave={hSaveM}
                setCostos={setCostos}
                hSaveC={hSaveC}
                presupuestos={presupuestos}
                perfil={perfil}
                onGuardarPerfil={(nuevo) => { setPerfil(nuevo); withSave(() => guardarPerfil(nuevo)); }}
                deepLinkCodigo={nav.catalogoDeepLink}
                onDeepLinkConsumed={() => dispatch({ type: "DEEPLINK_CONSUMIDO" })}
                origenEdicion={nav.origenEdicion}
                onGuardarPresupuestoAfectado={(pid, cambios) => handleActualizarPresupuesto(pid, cambios)}
                onGuardarPermanente={(tempCod, newId) => {
                  if (nav.origenEdicion?.presupuestoId && presupuestos[nav.origenEdicion.presupuestoId]) {
                    const nuevosPres = migrarTempEnPresupuestos({ presupuestos, tempCod, newId });
                    setPresupuestos(nuevosPres);
                    withSave(() => guardarPresupuestos(nuevosPres));
                  }
                  setItems(prev => prev.map(it => it.codigo === tempCod ? { ...it, codigo: newId } : it));
                }}
                onVolverAlPresupuesto={nav.origenEdicion?.tipo === "presupuesto"
                  ? () => dispatch({ type: "VOLVER_A_PRESUPUESTO" })
                  : (nav.catalogoDeepLink
                    ? () => dispatch({ type: "VOLVER_A_PRESUPUESTO" })
                    : null)
                }
              />
            )}

            {nav.vista === "costos" && (
              <HojaCostos costos={costos} setCostos={setCostos} onSave={hSaveC} />
            )}

            {nav.vista === "config" && (
              <PanelPerfil
                perfil={perfil}
                onGuardar={(nuevo) => { setPerfil(nuevo); withSave(() => guardarPerfil(nuevo)); }}
                suscripcion={suscripcion}
              />
            )}

            {nav.vista === "editor_vista" && nav.editorVistaCod && modulos?.[nav.editorVistaCod] && (
              <EditorVistaSVG
                modulo={modulos[nav.editorVistaCod]}
                onGuardar={(vistaConfig) => {
                  const cod = nav.editorVistaCod;
                  const updated = { ...modulos, [cod]: { ...modulos[cod], vistaConfig } };
                  setModulos(updated);
                  withSave(() => guardarModulos(updated));
                  dispatch({ type: "EDITOR_VISTA_CERRADO" });
                }}
                onCerrar={() => dispatch({ type: "EDITOR_VISTA_CERRADO" })}
              />
            )}

          </div>
        </main>
      </div>
    </>
    </PresupuestoContext.Provider>
  );
}

// ─── App (raíz) ───────────────────────────────────────────────────────────────
export default function App() {
  // null = cargando sesión, false = no autenticado, true = autenticado
  const [autenticado, setAutenticado] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAutenticado(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAutenticado(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (autenticado === null) {
    return (
      <>
        <GlobalStyles />
        <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LogoIsotipo size={48} />
        </div>
      </>
    );
  }
  if (!autenticado) return <LoginScreen />;
  return (
    <NavProvider>
      <AppInterna />
    </NavProvider>
  );
}
