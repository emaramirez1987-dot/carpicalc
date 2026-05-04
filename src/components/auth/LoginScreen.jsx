import React, { useState } from "react";
import { GlobalStyles, LogoIsotipo } from "../ui/index.jsx";
import { supabase } from "../../lib/supabase.js";

const inpStyle = (err) => ({
  padding: "10px 14px", borderRadius: 8,
  border: `1px solid ${err ? "rgba(200,60,60,0.60)" : "var(--border)"}`,
  background: "var(--bg-base)", color: "var(--text-primary)",
  fontSize: 14, outline: "none", fontFamily: "'Bricolage Grotesque',sans-serif",
  width: "100%", boxSizing: "border-box",
});

const btnPrimary = {
  padding: "10px 0", borderRadius: 8,
  background: "linear-gradient(135deg,var(--accent),var(--accent-hover))",
  border: "none", color: "var(--text-inverted)", fontSize: 13, fontWeight: 700,
  fontFamily: "'DM Mono',monospace", cursor: "pointer", letterSpacing: "0.08em",
  textTransform: "uppercase", width: "100%",
};

const msgError = { fontSize: 11, color: "#e07070", textAlign: "center", fontFamily: "'DM Mono',monospace" };

export function LoginScreen() {
  const [tab,     setTab]     = useState("login");   // "login" | "register" | "reset"
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [taller,  setTaller]  = useState("");
  const [error,   setError]   = useState("");
  const [msg,     setMsg]     = useState("");
  const [shake,   setShake]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass,setShowPass]= useState(false);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };
  const resetMsg = () => { setError(""); setMsg(""); };

  const handleLogin = async () => {
    resetMsg(); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    setLoading(false);
    if (err) {
      setError(err.message === "Invalid login credentials" ? "Email o contraseña incorrectos" : err.message);
      triggerShake();
    }
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
      style={{
        flex: 1, padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer",
        fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
        background: tab === id ? "var(--accent)" : "transparent",
        color: tab === id ? "var(--text-inverted)" : "var(--text-muted)",
      }}>
      {label}
    </button>
  );

  return (
    <>
      <GlobalStyles />
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}>
        <div className={shake ? "anim-shake" : ""}
          style={{ width: "100%", maxWidth: 340, padding: 32, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <LogoIsotipo size={56} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: "var(--accent)" }}>CarpiCálc</div>
            <div style={{ fontSize: 10, letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", marginTop: 2 }}>Diseño & Costos</div>
          </div>

          {tab !== "reset" && (
            <div style={{ width: "100%", display: "flex", gap: 4, background: "var(--bg-base)", borderRadius: 8, padding: 4 }}>
              {tabBtn("login", "Ingresar")}
              {tabBtn("register", "Registrarse")}
            </div>
          )}

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); resetMsg(); }}
              onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : tab === "register" ? handleRegister() : handleReset())}
              placeholder="Correo electrónico" style={inpStyle(!!error)} />

            {tab === "register" && (
              <input type="text" value={taller} onChange={e => { setTaller(e.target.value); resetMsg(); }}
                placeholder="Nombre de tu taller" style={inpStyle(!!error)} />
            )}

            {tab !== "reset" && (
              <div style={{ position: "relative" }}>
                <input type={showPass ? "text" : "password"} value={pass}
                  onChange={e => { setPass(e.target.value); resetMsg(); }}
                  onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())}
                  placeholder={tab === "register" ? "Creá tu contraseña" : "Contraseña"}
                  style={{ ...inpStyle(!!error), paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 18, lineHeight: 1, padding: 0 }}>
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
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
