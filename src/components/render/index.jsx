import React, { useState, useEffect, useRef } from "react";
import { SectionTitle } from "../ui/index.jsx";
import { leerPlano, leerPromptsRender, guardarPromptsRender } from "../../storage.js";
import { PLANES_RENDER } from "../../constants.js";
import { supabase } from "../../lib/supabase.js";
import { generarImagenReferencia } from "../plano/planoUtils.js";
import SVGPlano from "../plano/SVGPlano.jsx";

// ── Helpers ───────────────────────────────────────────────────────────────────

function derivarSecuencias(bloques) {
  return {
    idsBajos: bloques.filter(b => b.tipoVisual !== "aereo").map(b => b.id),
    idsAltos: bloques.filter(b => b.tipoVisual === "aereo").map(b => b.id),
  };
}

// ── Estilos compartidos ───────────────────────────────────────────────────────

const inp = {
  width: "100%", boxSizing: "border-box",
  background: "var(--bg-subtle)", border: "1px solid var(--border)",
  borderRadius: 6, color: "var(--text-primary)",
  fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13,
  padding: "8px 10px", outline: "none", transition: "border-color 0.15s",
};

const btnSm = (variant = "default") => ({
  padding: "4px 10px", borderRadius: 5, cursor: "pointer",
  fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
  transition: "all 0.15s", whiteSpace: "nowrap",
  background: variant === "accent" ? "var(--accent-soft)"
            : variant === "danger" ? "rgba(200,60,60,0.10)"
            : "var(--bg-subtle)",
  border:     variant === "accent" ? "1px solid var(--accent-border)"
            : variant === "danger" ? "1px solid rgba(200,60,60,0.30)"
            : "1px solid var(--border)",
  color:      variant === "accent" ? "var(--accent)"
            : variant === "danger" ? "#e07070"
            : "var(--text-secondary)",
});

// ── BtnModo ───────────────────────────────────────────────────────────────────

function BtnModo({ activo, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 6, cursor: "pointer",
      fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.06em", transition: "all 0.15s",
      background: activo ? "var(--accent-soft)"  : "var(--bg-subtle)",
      border: `1px solid ${activo ? "var(--accent-border)" : "var(--border)"}`,
      color:  activo ? "var(--accent)" : "var(--text-secondary)",
    }}>{children}</button>
  );
}

// ── Placeholder render ────────────────────────────────────────────────────────

function PanelRender({ imagenUrl, generando, compact = false }) {
  if (generando) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "var(--bg-surface)", border: "1px dashed var(--border)",
        borderRadius: 12, padding: compact ? "24px 16px" : "60px 32px", gap: 12,
      }}>
        <div style={{ fontSize: compact ? 26 : 38 }}>⏳</div>
        <div style={{ fontSize: compact ? 12 : 14, fontWeight: 700, color: "var(--text-primary)" }}>
          Generando render…
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Puede tardar unos segundos</div>
      </div>
    );
  }
  if (imagenUrl) {
    return (
      <div style={{
        flex: 1, background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: compact ? "8px 12px" : "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", flex: 1 }}>
            ✨ Render IA
          </span>
          <a href={imagenUrl} download="render.webp" target="_blank" rel="noopener noreferrer"
            style={{ ...btnSm("accent"), textDecoration: "none", display: "inline-block" }}>
            ⬇ Descargar
          </a>
        </div>
        <img src={imagenUrl} alt="render IA" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
    );
  }
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg-surface)", border: "1px dashed var(--border)",
      borderRadius: 12, padding: compact ? "24px 16px" : "60px 32px", gap: 10,
    }}>
      <div style={{ fontSize: compact ? 26 : 38 }}>✨</div>
      <div style={{ fontSize: compact ? 12 : 14, fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>
        Render realista con IA
      </div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "center", maxWidth: 240 }}>
        Escribí un prompt y presioná Generar render
      </div>
    </div>
  );
}

// ── Panel SVG estático ────────────────────────────────────────────────────────

function PanelSVG({ bloques, idsBajos, idsAltos, altoCielorraso, composicionOverride, modulos, compact = false }) {
  const bloquesAltos = bloques.filter(b => idsAltos.includes(b.id));
  const bloquesBajos = bloques.filter(b => idsBajos.includes(b.id));
  const svgProps = { bloquesAltos, bloquesBajos, altoCielorraso, modulos, composicionOverride, onSelect: null, selectedId: null };
  return (
    <div style={{
      flex: 1, background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: compact ? "8px 12px" : "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
          📐 Plano técnico
        </span>
        <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, padding: "2px 7px", borderRadius: 4,
          background: bloques.length > 0 ? "rgba(80,180,100,0.12)" : "rgba(150,150,150,0.10)",
          border: `1px solid ${bloques.length > 0 ? "rgba(80,180,100,0.35)" : "rgba(150,150,150,0.25)"}`,
          color: bloques.length > 0 ? "#4ab870" : "var(--text-muted)" }}>
          {bloques.length > 0 ? `✓ ${bloques.length} mód. — se usará como referencia` : "sin módulos — solo texto"}
        </span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
        <SVGPlano {...svgProps} />
      </div>
    </div>
  );
}

// ── GestorPrompts — estado de UI local, datos desde props ─────────────────────

function GestorPrompts({ prompts, onEliminar, onActualizar, onUsar }) {
  const [expandido,  setExpandido]  = useState(null);
  const [editando,   setEditando]   = useState(null); // { id, nombre, texto }
  const [confirmDel, setConfirmDel] = useState(null);

  const guardarEdicion = () => {
    if (!editando) return;
    onActualizar(editando.id, { nombre: editando.nombre, texto: editando.texto });
    setEditando(null);
  };

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>

      {/* Cabecera */}
      <div style={{ padding: "10px 14px", borderBottom: prompts.length ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", flex: 1 }}>
          Prompts guardados{" "}
          {prompts.length > 0 && <span style={{ color: "var(--accent)" }}>({prompts.length})</span>}
        </span>
        {prompts.length === 0 && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Guardá prompts para reutilizarlos rápido</span>
        )}
      </div>

      {/* Lista */}
      {prompts.map((p, idx) => (
        <div key={p.id} style={{ borderBottom: idx < prompts.length - 1 ? "1px solid var(--border)" : "none" }}>

          {/* Fila */}
          <div
            onClick={() => { setExpandido(expandido === p.id ? null : p.id); setEditando(null); setConfirmDel(null); }}
            style={{
              padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
              cursor: "pointer", userSelect: "none", transition: "background 0.12s",
              background: expandido === p.id ? "var(--bg-subtle)" : "transparent",
            }}
          >
            <span style={{ fontSize: 10, color: "var(--text-muted)", transition: "transform 0.15s", display: "inline-block", transform: expandido === p.id ? "rotate(90deg)" : "none" }}>▶</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {p.nombre}
            </span>
            <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => onUsar(p.texto)} style={btnSm("accent")}>Usar</button>
              <button onClick={() => { setEditando({ id: p.id, nombre: p.nombre, texto: p.texto }); setExpandido(p.id); }} style={btnSm()}>✎</button>
              {confirmDel === p.id ? (
                <>
                  <button onClick={() => { onEliminar(p.id); setConfirmDel(null); if (expandido === p.id) setExpandido(null); }} style={btnSm("danger")}>✓ ok</button>
                  <button onClick={() => setConfirmDel(null)} style={btnSm()}>✕</button>
                </>
              ) : (
                <button onClick={() => setConfirmDel(p.id)} style={btnSm("danger")}>×</button>
              )}
            </div>
          </div>

          {/* Detalle */}
          {expandido === p.id && (
            <div style={{ padding: "0 14px 12px 32px" }}>
              {editando?.id === p.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    value={editando.nombre}
                    onChange={e => setEditando({ ...editando, nombre: e.target.value })}
                    placeholder="Nombre del prompt"
                    style={{ ...inp, fontSize: 12 }}
                  />
                  <textarea
                    value={editando.texto}
                    onChange={e => setEditando({ ...editando, texto: e.target.value })}
                    rows={3}
                    style={{ ...inp, resize: "vertical", fontSize: 12 }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={guardarEdicion} style={btnSm("accent")}>Guardar cambios</button>
                    <button onClick={() => setEditando(null)} style={btnSm()}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, fontStyle: "italic" }}>
                  "{p.texto}"
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Helpers de créditos ───────────────────────────────────────────────────────

function calcularCreditos(suscripcion) {
  if (!suscripcion) return { usados: 0, limite: 0, restantes: 0, bloqueado: true };
  const { estado, plan_id, renders_usados } = suscripcion;
  if (!["trialing", "active"].includes(estado)) {
    return { usados: 0, limite: 0, restantes: 0, bloqueado: true };
  }
  const planKey  = estado === "trialing" ? "trialing" : (plan_id || "plata");
  const plan     = PLANES_RENDER[planKey] ?? PLANES_RENDER.plata;
  const usados   = renders_usados || 0;
  const limite   = plan.renders;
  const restantes = limite === null ? Infinity : Math.max(0, limite - usados);
  return { usados, limite, restantes, bloqueado: restantes === 0 };
}

// ── Panel de prompt activo ────────────────────────────────────────────────────

function PanelPrompt({ prompt, onPromptChange, onGuardar, onGenerar, generando, creditos }) {
  const [nombre, setNombre]         = useState("");
  const [guardadoOk, setGuardadoOk] = useState(false);

  const handleGuardar = () => {
    if (!prompt.trim() || !nombre.trim()) return;
    onGuardar(nombre.trim(), prompt.trim());
    setNombre("");
    setGuardadoOk(true);
    setTimeout(() => setGuardadoOk(false), 1800);
  };

  const puedeGuardar  = prompt.trim() && nombre.trim();
  const puedeGenerar  = prompt.trim() && !generando && creditos && !creditos.bloqueado;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10 }}>
      <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
        Descripción del render
      </div>
      <textarea
        value={prompt}
        onChange={e => onPromptChange(e.target.value)}
        placeholder="Describí el estilo del mueble — ej: placard de roble natural, estilo minimalista, iluminación cálida..."
        rows={3}
        style={{ ...inp, resize: "vertical" }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Nombre para guardar (opcional)"
          style={{ ...inp, flex: "1 1 180px", fontSize: 12 }}
        />
        <button
          onClick={handleGuardar}
          disabled={!puedeGuardar}
          style={{ ...btnSm(guardadoOk ? "accent" : "default"), opacity: puedeGuardar ? 1 : 0.4, cursor: puedeGuardar ? "pointer" : "default" }}
        >
          {guardadoOk ? "✓ Guardado" : "Guardar prompt"}
        </button>
        <button
          onClick={onGenerar}
          disabled={!puedeGenerar}
          style={{ ...btnSm("accent"), opacity: puedeGenerar ? 1 : 0.4, cursor: puedeGenerar ? "pointer" : "default" }}
        >
          {generando ? "⏳ Generando…" : "▶ Generar render"}
        </button>
        {creditos && (
          <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: creditos.bloqueado ? "#e07070" : "var(--text-muted)", whiteSpace: "nowrap" }}>
            {creditos.bloqueado
              ? "Sin renders este mes"
              : creditos.limite === null
                ? `${creditos.usados} usados · ∞`
                : `${creditos.limite - creditos.usados} render${creditos.limite - creditos.usados !== 1 ? "s" : ""} disponible${creditos.limite - creditos.usados !== 1 ? "s" : ""}`}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function RenderIA({
  modulos = {},
  composicionOverride = {},
  items = [],
  dimOverride = {},
  inlineModulos = {},
  presupuestoActivoId = null,
  suscripcion = null,
  onRenderGenerado = null,
}) {
  const [modo, setModo]               = useState("svg");
  const [bloques, setBloques]         = useState([]);
  const [idsBajos, setIdsBajos]       = useState([]);
  const [idsAltos, setIdsAltos]       = useState([]);
  const [alto, setAlto]               = useState(2400);
  const [prompt, setPrompt]           = useState("");
  const [prompts, setPrompts]         = useState(() => leerPromptsRender());
  const [wsId, setWsId]               = useState(null);
  const [generando, setGenerando]     = useState(false);
  const [imagenUrl, setImagenUrl]     = useState(null);
  const [errorRender, setErrorRender] = useState(null);
  const [refPreview, setRefPreview]   = useState(null); // debug: imagen de referencia
  const prevKeyRef                    = useRef(null);

  useEffect(() => {
    supabase.from("workspaces").select("id").single().then(({ data }) => {
      if (data) setWsId(data.id);
    });
  }, []);

  const persistirPrompts = (nuevo) => { setPrompts(nuevo); guardarPromptsRender(nuevo); };

  const handleGenerar = async () => {
    if (!wsId || !prompt.trim()) return;
    setGenerando(true);
    setErrorRender(null);
    setImagenUrl(null);
    try {
      // img2img: genera imagen de referencia con los módulos ampliados
      let imageBase64 = null;
      if (bloques.length > 0) {
        const bloquesAltosRef = bloques.filter(b => idsAltos.includes(b.id));
        const bloquesBajosRef = bloques.filter(b => idsBajos.includes(b.id));
        try { imageBase64 = await generarImagenReferencia({ bloquesAltos: bloquesAltosRef, bloquesBajos: bloquesBajosRef }); } catch {}
      }
      const res = await fetch("/api/generate-render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: wsId, prompt: prompt.trim(), imageBase64 }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorRender(data.error || "Error al generar"); return; }
      setImagenUrl(data.imageUrl);
      setModo("render");
      if (onRenderGenerado) onRenderGenerado();
    } catch (e) {
      setErrorRender(e.message);
    } finally {
      setGenerando(false);
    }
  };

  const handleVerReferencia = async () => {
    const bloquesAltosRef = bloques.filter(b => idsAltos.includes(b.id));
    const bloquesBajosRef = bloques.filter(b => idsBajos.includes(b.id));
    try {
      const b64 = await generarImagenReferencia({ bloquesAltos: bloquesAltosRef, bloquesBajos: bloquesBajosRef });
      setRefPreview(`data:image/jpeg;base64,${b64}`);
    } catch (e) {
      setErrorRender("Error generando preview: " + e.message);
    }
  };

  const handleGuardarPrompt = (nombre, texto) =>
    persistirPrompts([...prompts, { id: crypto.randomUUID(), nombre, texto, creadoEn: Date.now() }]);

  const handleEliminarPrompt = (id) =>
    persistirPrompts(prompts.filter(p => p.id !== id));

  const handleActualizarPrompt = (id, cambios) =>
    persistirPrompts(prompts.map(p => p.id === id ? { ...p, ...cambios } : p));

  useEffect(() => {
    if (prevKeyRef.current === presupuestoActivoId) return;
    prevKeyRef.current = presupuestoActivoId;

    if (!presupuestoActivoId) { setBloques([]); setIdsBajos([]); setIdsAltos([]); return; }

    const saved = leerPlano();
    const bs = saved?.bloques || [];
    const { idsBajos: fb, idsAltos: fa } = derivarSecuencias(bs);
    setBloques(bs);
    setIdsBajos(saved?.idsBajos ?? fb);
    setIdsAltos(saved?.idsAltos ?? fa);
    setAlto(saved?.altoCielorraso || 2400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presupuestoActivoId]);

  const sinDatos    = bloques.length === 0;
  const svgProps    = { bloques, idsBajos, idsAltos, altoCielorraso: alto, composicionOverride, modulos };
  const creditos    = calcularCreditos(suscripcion);
  const renderProps = { imagenUrl, generando };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Cabecera */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <SectionTitle sub="Visualizá el diseño técnico y generá renders realistas con IA">
          Render IA
        </SectionTitle>
        {!sinDatos && (
          <div style={{ display: "flex", gap: 6 }}>
            <BtnModo activo={modo === "svg"}    onClick={() => setModo("svg")}>📐 Plano</BtnModo>
            <BtnModo activo={modo === "render"} onClick={() => setModo("render")}>✨ Render</BtnModo>
            <BtnModo activo={modo === "split"}  onClick={() => setModo("split")}>⊞ Dividido</BtnModo>
          </div>
        )}
      </div>

      {/* Empty state */}
      {sinDatos && (
        <div style={{ textAlign: "center", padding: "80px 0", borderRadius: 12, border: "1px dashed var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 40 }}>📐</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>No hay plano activo</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            Abrí un presupuesto y armá el layout en{" "}
            <strong style={{ color: "var(--accent)" }}>Plano 2D</strong>{" "}
            para visualizarlo acá
          </p>
        </div>
      )}

      {/* Visualización */}
      {!sinDatos && modo === "svg"    && <PanelSVG {...svgProps} />}
      {!sinDatos && modo === "render" && <PanelRender {...renderProps} />}
      {!sinDatos && modo === "split"  && (
        <div style={{ display: "flex", gap: 12, alignItems: "stretch", minHeight: 360 }}>
          <PanelSVG {...svgProps} compact />
          <PanelRender {...renderProps} compact />
        </div>
      )}

      {/* Prompt + Gestor — siempre visibles si hay plano */}
      {!sinDatos && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <PanelPrompt
            prompt={prompt}
            onPromptChange={setPrompt}
            onGuardar={handleGuardarPrompt}
            onGenerar={handleGenerar}
            generando={generando}
            creditos={creditos}
          />
          {errorRender && (
            <div style={{ fontSize: 12, color: "#e07070", fontFamily: "'DM Mono',monospace", padding: "8px 12px", background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.25)", borderRadius: 7 }}>
              ⚠ {errorRender}
            </div>
          )}
          {/* Debug: imagen de referencia que se envía a Replicate */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={handleVerReferencia} style={{ ...btnSm(), fontSize: 11 }}>
              🔍 Ver imagen de referencia
            </button>
            {refPreview && (
              <button onClick={() => setRefPreview(null)} style={{ ...btnSm("danger"), fontSize: 11 }}>✕ cerrar</button>
            )}
          </div>
          {refPreview && (
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
                Imagen de referencia → Replicate
              </div>
              <img src={refPreview} alt="referencia" style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
          )}
          <GestorPrompts
            prompts={prompts}
            onUsar={(texto) => setPrompt(texto)}
            onEliminar={handleEliminarPrompt}
            onActualizar={handleActualizarPrompt}
          />
        </div>
      )}

    </div>
  );
}
