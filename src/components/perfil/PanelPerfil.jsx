import React, { useState } from "react";
import { Card, SectionTitle, LogoIsotipo } from "../ui/index.jsx";
import { supabase } from "../../lib/supabase.js";
import { comprimirImagen, fmtFecha } from "../../utils.js";
import { exportarBackup, importarBackup } from "../../storage.js";
import { PanelSuscripcion } from "../suscripcion/PanelSuscripcion.jsx";

export function PanelPerfil({ perfil, onGuardar, suscripcion }) {
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

  const [passNueva,   setPassNueva]   = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [passError,   setPassError]   = useState(null);
  const [passOk,      setPassOk]      = useState(false);
  const [showPass,    setShowPass]    = useState(false);

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
    width: "100%", transition: "border-color 0.15s",
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
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
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

      {/* ── Backup ─────────────────────────────────────────────────────────── */}
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

      {/* ── Suscripción ─────────────────────────────────────────────────────── */}
      <PanelSuscripcion suscripcion={suscripcion} />

      {/* ── Seguridad ───────────────────────────────────────────────────────── */}
      <Card className="rsp-card">
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 10 }}>
          🔒 Seguridad — Contraseña de acceso
        </div>
        <button onClick={() => supabase.auth.signOut()}
          style={{ marginBottom: 16, padding: "7px 16px", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, background: "transparent", border: "1px solid rgba(200,60,60,0.30)", color: "#e07070" }}>
          🚪 Cerrar sesión
        </button>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
          Cambiá la contraseña de tu cuenta.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <input type={showPass ? "text" : "password"} value={passNueva}
              onChange={e => { setPassNueva(e.target.value); setPassError(null); }}
              placeholder="Nueva contraseña (mínimo 4 caracteres)"
              style={{ ...inp, paddingRight: 36 }} />
            <button onClick={() => setShowPass(s => !s)} tabIndex={-1}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16, padding: 0 }}>
              {showPass ? "🙈" : "👁"}
            </button>
          </div>
          <div style={{ position: "relative" }}>
            <input type={showPass ? "text" : "password"} value={passConfirm}
              onChange={e => { setPassConfirm(e.target.value); setPassError(null); }}
              placeholder="Confirmar nueva contraseña"
              style={{ ...inp, paddingRight: 36 }}
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
