import React, { useState, useEffect, useRef } from "react";
import { SectionTitle } from "../ui/index.jsx";
import useIsMobile from "../../hooks/useIsMobile.js";
import { leerConfigRender, guardarConfigRender } from "../../storage.js";
import { PLANES_RENDER } from "../../constants.js";
import { supabase } from "../../lib/supabase.js";

// ── Prompts por defecto ───────────────────────────────────────────────────────

const DEFAULT_PROMPT_KONTEXT =
`Convert this 3D furniture render into a professional interior photo.
Preserve the exact materials, colors, finishes, and structure from the input image. Do not change or recolor anything.

Scene: [FONDO]
Lighting: [ILUMINACION]
Camera: [CAMARA] / Angle: [PERSPECTIVA]
Style: [ESTILO]
Styling: [ACCESORIOS]

Soft shadows, realistic reflections, detailed textures. Professional high-end interior photography.`;

const DEFAULT_PROMPT_GPT =
`Transform this 3D furniture render into a photorealistic interior photo.
Preserve the exact structure, proportions, materials and finish visible in the render.

Scene: [FONDO]
Lighting: [ILUMINACION]
Camera angle: [PERSPECTIVA]
Styling: [ACCESORIOS]

Professional interior photography, natural shadows, realistic reflections, high resolution.`;

// ── Variables ─────────────────────────────────────────────────────────────────

const VARIABLES_CONFIG = [
  { id: "material",    label: "Material",        icon: "🪵", placeholder: "[MATERIAL]",    default: "melamina",
    opciones: ["melamina blanca", "madera nogal", "roble natural", "MDF lacado blanco", "madera de pino", "madera nogal y melamina negra"] },
  { id: "color",       label: "Color",           icon: "🎨", placeholder: "[COLOR]",       default: "blanco",
    opciones: ["blanco", "negro mate", "gris cemento", "nogal oscuro", "roble claro", "verde oliva", "natural madera"] },
  { id: "acabado",     label: "Acabado",         icon: "✨", placeholder: "[ACABADO]",     default: "mate",
    opciones: ["mate", "brillante", "satinado", "textura madera natural", "lacado liso"] },
  { id: "camara",      label: "Cámara",          icon: "📷", placeholder: "[CAMARA]",      default: "lente 35mm",
    opciones: ["lente 35mm", "lente 50mm", "lente gran angular 24mm", "teleobjetivo 85mm"] },
  { id: "estilo",      label: "Estilo visual",   icon: "🎭", placeholder: "[ESTILO]",      default: "contemporáneo premium",
    opciones: ["contemporáneo premium", "escandinavo minimalista", "industrial moderno", "clásico refinado"] },
  { id: "fondo",       label: "Fondo / Entorno", icon: "🏠", placeholder: "[FONDO]",       default: "fondo neutro liso gris claro",
    opciones: ["fondo neutro liso gris claro", "espacio blanco infinito", "cocina moderna minimalista", "living contemporáneo", "dormitorio escandinavo"] },
  { id: "iluminacion", label: "Iluminación",     icon: "💡", placeholder: "[ILUMINACION]", default: "luz natural cálida desde la izquierda",
    opciones: ["luz natural cálida desde la izquierda", "iluminación difusa de estudio", "luz cenital neutra", "luz cálida ambiental nocturna", "iluminación cinematográfica dramática"] },
  { id: "perspectiva", label: "Perspectiva",     icon: "📐", placeholder: "[PERSPECTIVA]", default: "vista frontal directa",
    opciones: ["vista frontal directa", "vista frontal en 3/4", "vista lateral derecha", "vista isométrica"] },
  { id: "accesorios",  label: "Accesorios",      icon: "🌿", placeholder: "[ACCESORIOS]",  default: "sin accesorios",
    opciones: ["sin accesorios", "plantas y objetos decorativos minimalistas", "cafetera y utensilios de cocina", "vajilla y accesorios", "libros y elementos decorativos"] },
];

const KONTEXT_IDS  = ["camara", "estilo", "fondo", "iluminacion", "perspectiva", "accesorios"];
const VARS_KONTEXT = VARIABLES_CONFIG.filter(v => KONTEXT_IDS.includes(v.id));

// ── Presets de estilo para GPT ────────────────────────────────────────────────

const ESTILOS_PRESET_GPT = [
  { id: "escandinavo",   label: "Escandinavo",      emoji: "🌿", desc: "Blanco, madera clara, luz natural",
    variables: { fondo: "Scandinavian living room, white walls, light oak hardwood floor, large window with sheer curtains", iluminacion: "soft natural daylight from a large side window, gentle diffuse shadows", perspectiva: "three-quarter front view", accesorios: "small potted plant, knitted throw, minimalist ceramic vase in neutral tones", estilo: "escandinavo minimalista", camara: "lente 35mm" } },
  { id: "minimalista",   label: "Minimalista",      emoji: "◻",  desc: "Vacío, luz perfecta, producto puro",
    variables: { fondo: "pure white seamless studio background, infinite white floor", iluminacion: "professional studio softbox lighting, perfectly even, no harsh shadows", perspectiva: "vista frontal directa", accesorios: "sin accesorios, fondo completamente limpio", estilo: "minimalista contemporáneo", camara: "lente 50mm" } },
  { id: "japandi",       label: "Japandi",          emoji: "🎋", desc: "Japonés-escandinavo, wabi-sabi",
    variables: { fondo: "japandi interior, warm beige walls, light wood floor, shoji paper screen, zen atmosphere", iluminacion: "warm diffuse natural light filtered through paper screens, golden hour feel", perspectiva: "vista lateral derecha", accesorios: "handmade ceramic bowl, small bonsai, linen fabric, smooth river stones", estilo: "japandi wabi-sabi", camara: "lente 50mm" } },
  { id: "contemporaneo", label: "Contemporáneo",    emoji: "🏙", desc: "Living moderno, luz cálida",
    variables: { fondo: "contemporary living room, warm grey walls, polished concrete floor, open plan space", iluminacion: "warm ambient evening light, floor lamp glow, subtle recessed ceiling lights", perspectiva: "vista frontal en 3/4", accesorios: "curated books, architectural plant, sculptural decorative object", estilo: "contemporáneo premium", camara: "lente 35mm" } },
  { id: "industrial",    label: "Industrial",       emoji: "🏗", desc: "Cemento, metal, luz dramática",
    variables: { fondo: "urban loft interior, exposed concrete walls, worn brick accent wall, raw steel beams", iluminacion: "dramatic overhead industrial pendant lights, strong directional shadows", perspectiva: "vista frontal en 3/4", accesorios: "metal pipe details, industrial pendant lamp, large monstera plant", estilo: "industrial moderno", camara: "lente 35mm" } },
  { id: "lujo",          label: "Lujo",             emoji: "✨", desc: "Mármol, alto brillo, dramatismo",
    variables: { fondo: "luxury showroom, white Calacatta marble floor, dark charcoal walls, high ceiling", iluminacion: "dramatic cinematic lighting with subtle specular highlights, moody atmosphere", perspectiva: "vista isométrica", accesorios: "crystal vase with flowers, premium decorative objects, gold accent details", estilo: "lujo contemporáneo", camara: "lente 50mm" } },
  { id: "midcentury",    label: "Mid-Century",      emoji: "🟠", desc: "Retro, maderas cálidas, vintage 60s",
    variables: { fondo: "mid-century modern living room, mustard yellow accent wall, patterned geometric rug, teak wood floor", iluminacion: "warm incandescent ambient light, vintage arc floor lamp", perspectiva: "vista lateral derecha", accesorios: "vinyl record, cactus, retro ceramic decorations, 60s inspired objects", estilo: "mid-century modern", camara: "lente 50mm" } },
  { id: "boho",          label: "Boho Natural",     emoji: "🌾", desc: "Tierras, plantas, texturas naturales",
    variables: { fondo: "bohemian interior, terracotta walls, natural rattan furniture, warm earthy tones", iluminacion: "golden hour warm sunlight streaming through a window, soft warm shadows", perspectiva: "vista frontal en 3/4", accesorios: "macramé wall hanging, lush tropical plants, woven baskets, natural linen textiles", estilo: "boho contemporáneo", camara: "lente 35mm" } },
  { id: "mediterraneo",  label: "Mediterráneo",     emoji: "🌊", desc: "Cal, terracota, luz del sur",
    variables: { fondo: "Mediterranean interior, whitewashed lime walls, terracotta tile floor, arched doorway", iluminacion: "intense bright southern sunlight, sharp contrasting shadows, warm white light", perspectiva: "vista frontal en 3/4", accesorios: "handmade ceramic pottery, olive branch, natural linen curtains, mosaic tile detail", estilo: "mediterráneo contemporáneo", camara: "lente 35mm" } },
  { id: "nordic_dark",   label: "Nordic Dark",      emoji: "🌑", desc: "Oscuro, velas, hygge invernal",
    variables: { fondo: "dark nordic interior, deep forest green walls, dark oak floor, cozy winter atmosphere", iluminacion: "warm candlelight and soft pendant lamp glow, moody hygge ambiance", perspectiva: "vista frontal en 3/4", accesorios: "candles, dark ceramic mugs, wool blanket, pine branches", estilo: "nordic dark hygge", camara: "lente 35mm" } },
  { id: "art_deco",      label: "Art Déco",         emoji: "🔷", desc: "Dorado, glamour, geometría",
    variables: { fondo: "art deco interior, deep navy blue walls, gold geometric moldings, black marble floor", iluminacion: "glamorous warm golden light from art deco sconces and chandelier", perspectiva: "vista isométrica", accesorios: "gold vase, geometric decorative objects, luxury velvet accent", estilo: "art déco glamour", camara: "lente 50mm" } },
  { id: "exterior",      label: "Exterior / Jardín", emoji: "🌳", desc: "Al aire libre, luz natural",
    variables: { fondo: "outdoor garden setting, lush green grass, stone patio, natural wood deck", iluminacion: "bright natural outdoor daylight, dappled shade from trees", perspectiva: "vista frontal en 3/4", accesorios: "potted plants, garden accessories, natural stone elements", estilo: "exterior contemporáneo", camara: "lente 35mm" } },
];

function ensamblarPrompt(base, variables, varsConfig) {
  let r = base;
  varsConfig.forEach(v => { r = r.replace(v.placeholder, variables[v.id] || v.default); });
  return r;
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

// ── VariableItem ──────────────────────────────────────────────────────────────

function VariableItem({ config, value, onChange }) {
  const [abierto,    setAbierto]    = useState(false);
  const [custom,     setCustom]     = useState("");
  const [modoCustom, setModoCustom] = useState(false);

  const seleccionar = (val) => { onChange(val); setAbierto(false); setModoCustom(false); };
  const limpiar     = (e)   => { e.stopPropagation(); onChange(null); setModoCustom(false); };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--bg-surface)" }}>
      <div onClick={() => setAbierto(a => !a)} style={{ padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: 14 }}>{config.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{config.label}</span>
        {value ? (
          <>
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 4, padding: "2px 7px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {value}
            </span>
            <button onClick={limpiar} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, padding: "0 2px", lineHeight: 1 }}>×</button>
          </>
        ) : (
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontStyle: "italic" }}>default: {config.default}</span>
        )}
        <span style={{ fontSize: 9, color: "var(--text-muted)", transition: "transform 0.15s", display: "inline-block", transform: abierto ? "rotate(180deg)" : "none" }}>▼</span>
      </div>
      {abierto && (
        <div style={{ padding: "8px 12px 12px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {config.opciones.map(op => (
              <button key={op} onClick={() => seleccionar(op)} style={{ ...btnSm(value === op ? "accent" : "default"), fontSize: 11, padding: "5px 10px" }}>{op}</button>
            ))}
            <button onClick={() => setModoCustom(mc => !mc)} style={{ ...btnSm(modoCustom ? "accent" : "default"), fontSize: 11, padding: "5px 10px" }}>✎ personalizado</button>
          </div>
          {modoCustom && (
            <div style={{ display: "flex", gap: 6 }}>
              <input autoFocus value={custom} onChange={e => setCustom(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && custom.trim()) seleccionar(custom.trim()); }}
                placeholder={`Describí ${config.label.toLowerCase()}…`} style={{ ...inp, flex: 1, fontSize: 12 }} />
              <button onClick={() => { if (custom.trim()) seleccionar(custom.trim()); }} style={btnSm("accent")}>Ok</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── InnerSection ──────────────────────────────────────────────────────────────

function InnerSection({ label, icon, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
        {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
        <span style={{ flex: 1, fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
          {label}
        </span>
        {badge && (
          <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 4, padding: "1px 7px" }}>
            {badge}
          </span>
        )}
        <span style={{ fontSize: 9, color: "var(--text-muted)", display: "inline-block", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
      </div>
      {open && <div style={{ padding: "4px 16px 16px" }}>{children}</div>}
    </div>
  );
}

// ── PromptSection ─────────────────────────────────────────────────────────────

function PromptSection({ value, onChange, defaultValue }) {
  const [editando, setEditando] = useState(false);
  const [draft,    setDraft]    = useState(value);

  const guardar  = () => { onChange(draft); setEditando(false); };
  const cancelar = () => { setDraft(value); setEditando(false); };
  const reset    = () => { onChange(defaultValue); setDraft(defaultValue); setEditando(false); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {editando ? (
        <>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={9}
            style={{ ...inp, resize: "vertical", fontSize: 12, lineHeight: 1.55 }} autoFocus />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={guardar}  style={btnSm("accent")}>Guardar</button>
            <button onClick={cancelar} style={btnSm()}>Cancelar</button>
            <button onClick={reset}    style={btnSm("danger")}>↩ Default</button>
          </div>
        </>
      ) : (
        <>
          <pre style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "'Bricolage Grotesque',sans-serif", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 7, padding: "10px 12px" }}>
            {value}
          </pre>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => { setDraft(value); setEditando(true); }} style={btnSm()}>✎ Editar</button>
            {value !== defaultValue && <button onClick={reset} style={btnSm("danger")}>↩ Default</button>}
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
              {value === defaultValue ? "default" : "personalizado"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ── PresetsSection ────────────────────────────────────────────────────────────

function PresetsSection({ presets, promptBase, onGuardar, onCargar, onEliminar }) {
  const [nombre,     setNombre]     = useState("");
  const [ok,         setOk]         = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const guardar = () => {
    if (!nombre.trim()) return;
    onGuardar({ id: crypto.randomUUID(), nombre: nombre.trim(), texto: promptBase, creadoEn: Date.now() });
    setNombre("");
    setOk(true);
    setTimeout(() => setOk(false), 1500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={nombre} onChange={e => setNombre(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") guardar(); }}
          placeholder="Nombre del preset…" style={{ ...inp, flex: 1, fontSize: 12 }} />
        <button onClick={guardar} disabled={!nombre.trim()}
          style={{ ...btnSm(ok ? "accent" : "default"), opacity: nombre.trim() ? 1 : 0.4 }}>
          {ok ? "✓" : "Guardar"}
        </button>
      </div>
      {presets.length === 0 ? (
        <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>Sin presets guardados</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {presets.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 7 }}>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</span>
              <button onClick={() => onCargar(p.texto)} style={btnSm("accent")}>Cargar</button>
              {confirmDel === p.id ? (
                <>
                  <button onClick={() => { onEliminar(p.id); setConfirmDel(null); }} style={btnSm("danger")}>✓</button>
                  <button onClick={() => setConfirmDel(null)} style={btnSm()}>✕</button>
                </>
              ) : (
                <button onClick={() => setConfirmDel(p.id)} style={btnSm("danger")}>×</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── StepCard ──────────────────────────────────────────────────────────────────

function StepCard({ numero, titulo, subtitulo, listo, generando, onGenerar, bloqueado, creditos, children, defaultOpen = true, autoClose = false }) {
  const [abierto, setAbierto] = useState(defaultOpen);
  const prevListoRef = React.useRef(listo);

  React.useEffect(() => {
    if (autoClose && !prevListoRef.current && listo) setAbierto(false);
    prevListoRef.current = listo;
  }, [listo, autoClose]);

  const borderColor = !abierto ? "var(--accent-border)" : "var(--border)";
  const headerBg    = !abierto ? "var(--accent-soft)"   : "transparent";

  return (
    <div style={{ background: "var(--bg-surface)", border: `1px solid ${borderColor}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, background: headerBg, transition: "background 0.2s" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: listo ? "var(--accent-soft)" : "var(--bg-subtle)", border: `1px solid ${listo ? "var(--accent-border)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: listo ? "var(--accent)" : "var(--text-muted)" }}>
          {listo ? "✓" : numero}
        </div>
        <div onClick={() => setAbierto(a => !a)} style={{ flex: 1, cursor: "pointer", userSelect: "none" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{titulo}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{subtitulo}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {creditos && (
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: creditos.bloqueado ? "#e07070" : "var(--text-muted)" }}>
              {creditos.bloqueado ? "Sin renders" : creditos.limite === null ? `${creditos.usados} usados` : `${creditos.restantes} disponibles`}
            </span>
          )}
          <button onClick={onGenerar} disabled={bloqueado || generando}
            style={{ ...btnSm("accent"), padding: "7px 14px", fontSize: 12, opacity: (bloqueado || generando) ? 0.4 : 1, cursor: (bloqueado || generando) ? "default" : "pointer" }}>
            {generando ? "⏳ Generando…" : "▶ Renderizar"}
          </button>
        </div>
        <button onClick={() => setAbierto(a => !a)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 2px", color: "var(--text-muted)", fontSize: 10, transition: "transform 0.2s", transform: abierto ? "rotate(180deg)" : "none", flexShrink: 0 }}>
          ▼
        </button>
      </div>
      {abierto && <div style={{ borderTop: "1px solid var(--border)" }}>{children}</div>}
    </div>
  );
}

// ── PanelRender ───────────────────────────────────────────────────────────────

function PanelRender({ imagenUrl, generando, compact = false }) {
  if (generando) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-surface)", border: "1px dashed var(--border)", borderRadius: 12, padding: compact ? "24px 16px" : "60px 32px", gap: 12 }}>
      <div style={{ fontSize: compact ? 26 : 38 }}>⏳</div>
      <div style={{ fontSize: compact ? 12 : 14, fontWeight: 700, color: "var(--text-primary)" }}>Generando render…</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Puede tardar unos segundos</div>
    </div>
  );

  if (imagenUrl) return (
    <div style={{ flex: 1, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: compact ? "8px 12px" : "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>✨ Render IA</span>
        <div style={{ flex: 1 }} />
        <a href={imagenUrl} download="render.jpg" target="_blank" rel="noopener noreferrer"
          style={{ ...btnSm("accent"), textDecoration: "none", display: "inline-block" }}>⬇ Descargar</a>
      </div>
      <img src={imagenUrl} alt="render IA" style={{ width: "100%", height: "auto", display: "block" }} />
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-surface)", border: "1px dashed var(--border)", borderRadius: 12, padding: compact ? "24px 16px" : "60px 32px", gap: 10 }}>
      <div style={{ fontSize: compact ? 26 : 38 }}>✨</div>
      <div style={{ fontSize: compact ? 12 : 14, fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>Render realista con IA</div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "center", maxWidth: 240 }}>Configurá el prompt y presioná Renderizar</div>
    </div>
  );
}

// ── Panel3DRef ────────────────────────────────────────────────────────────────

function Panel3DRef({ imagenRef3D, compact = false }) {
  return (
    <div style={{ flex: 1, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
      <img src={imagenRef3D} alt="Captura 3D" style={{ maxWidth: "100%", maxHeight: compact ? 200 : "none", objectFit: "contain", borderRadius: 8 }} />
    </div>
  );
}

// ── calcularCreditos ──────────────────────────────────────────────────────────

function calcularCreditos(suscripcion) {
  if (!suscripcion) return { usados: 0, limite: 0, restantes: 0, bloqueado: true };
  const { estado, plan_id, renders_usados } = suscripcion;
  if (!["trialing", "active"].includes(estado)) return { usados: 0, limite: 0, restantes: 0, bloqueado: true };
  const planKey   = estado === "trialing" ? "trialing" : (plan_id || "plata");
  const plan      = PLANES_RENDER[planKey] ?? PLANES_RENDER.plata;
  const usados    = renders_usados || 0;
  const limite    = plan.renders;
  const restantes = limite === null ? Infinity : Math.max(0, limite - usados);
  return { usados, limite, restantes, bloqueado: restantes === 0 };
}

// ── BibliotecaMateriales3D ────────────────────────────────────────────────────

function BibliotecaMateriales3D({ materiales3D, onGuardar, onEliminar }) {
  const fileRef  = useRef();
  const [codigo, setCodigo]   = useState('');
  const [nombre, setNombre]   = useState('');
  const [preview, setPreview] = useState(null);
  const [error,   setError]   = useState('');

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo imágenes PNG/JPG'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setPreview(reader.result); setError(''); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGuardar = () => {
    if (!codigo.trim()) { setError('Ingresá un código'); return; }
    if (!preview)       { setError('Seleccioná una imagen'); return; }
    onGuardar(codigo.trim().toUpperCase(), { nombre: nombre.trim() || codigo.trim(), dataUrl: preview });
    setCodigo(''); setNombre(''); setPreview(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 160 }}>
          <input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Código (ej: W908)" style={{ ...inp, fontSize: 12 }} />
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre (opcional)" style={{ ...inp, fontSize: 12 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
          <div onClick={() => fileRef.current?.click()} style={{ width: 56, height: 56, borderRadius: 6, cursor: 'pointer', border: '1px dashed var(--border)', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {preview ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>+</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          <button onClick={handleGuardar} style={{ ...btnSm('accent'), fontSize: 11 }}>Cargar</button>
        </div>
      </div>
      {error && <div style={{ fontSize: 11, color: '#e07070', fontFamily: "'DM Mono',monospace" }}>{error}</div>}
      {Object.keys(materiales3D).length === 0 ? (
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin materiales cargados</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          {Object.entries(materiales3D).map(([cod, mat]) => (
            <div key={cod} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'border-color 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ position: 'relative', paddingTop: '75%' }}>
                <img src={mat.dataUrl} alt={cod} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button onClick={() => onEliminar(cod)} title="Eliminar material"
                  style={{ position: 'absolute', top: 5, right: 5, width: 20, height: 20, borderRadius: 5, background: 'rgba(0,0,0,0.60)', border: '1px solid rgba(255,255,255,0.20)', color: '#fff', fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', transition: 'background 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,60,60,0.80)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.60)'; }}>×</button>
              </div>
              <div style={{ padding: '6px 8px 8px', background: 'var(--bg-surface)' }}>
                <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{cod}</div>
                <div style={{ fontSize: 9, color: 'var(--text-secondary)', fontFamily: "'Bricolage Grotesque',sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4, marginTop: 1 }}>{mat.nombre || cod}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function RenderIA({
  modulos = {},               // eslint-disable-line no-unused-vars
  composicionOverride = {},   // eslint-disable-line no-unused-vars
  presupuestoActivoId = null, // eslint-disable-line no-unused-vars
  suscripcion = null,
  onRenderGenerado = null,
  imagenRef3D = null,
  materiales3D = {},
  onGuardarMaterial3D = null,
  onEliminarMaterial3D = null,
}) {
  const savedCfg = leerConfigRender();
  const isMobile = useIsMobile();

  const [modo,      setModo]      = useState(isMobile ? "render" : "split");
  const [wsId,      setWsId]      = useState(null);
  const [generando, setGenerando] = useState(false);
  const [imagenUrl, setImagenUrl] = useState(null);
  const [errorRender, setErrorRender] = useState(null);

  // Config Kontext
  const [promptKontext,    setPromptKontext]    = useState(savedCfg.promptKontext    ?? DEFAULT_PROMPT_KONTEXT);
  const [variablesKontext, setVariablesKontext] = useState(savedCfg.variablesKontext ?? {});
  const [presetsKontext,   setPresetsKontext]   = useState(savedCfg.presetsKontext   ?? []);

  // Config GPT
  const [promptGpt,       setPromptGpt]       = useState(savedCfg.promptGpt       ?? DEFAULT_PROMPT_GPT);
  const [variablesGpt,    setVariablesGpt]    = useState(savedCfg.variablesGpt    ?? {});
  const [estiloActivoGpt, setEstiloActivoGpt] = useState(savedCfg.estiloActivoGpt ?? null);

  // Shared
  const [modeloRender, setModeloRender] = useState(savedCfg.modeloRender ?? "flux-kontext");
  const [seed,         setSeed]         = useState(savedCfg.seed         ?? "");

  useEffect(() => {
    supabase.from("workspaces").select("id").single().then(({ data }) => {
      if (data) setWsId(data.id);
    });
  }, []);

  const persistir = (patch) =>
    guardarConfigRender({
      promptKontext, variablesKontext, presetsKontext,
      promptGpt, variablesGpt, estiloActivoGpt,
      modeloRender, seed,
      ...patch,
    });

  const actualizarPromptKontext   = (val) => { setPromptKontext(val);    persistir({ promptKontext: val }); };
  const actualizarVariableKontext = (id, val) => { const v = { ...variablesKontext, [id]: val }; setVariablesKontext(v); persistir({ variablesKontext: v }); };
  const guardarPresetKontext      = (p)  => { const n = [...presetsKontext, p];                  setPresetsKontext(n); persistir({ presetsKontext: n }); };
  const eliminarPresetKontext     = (id) => { const n = presetsKontext.filter(p => p.id !== id); setPresetsKontext(n); persistir({ presetsKontext: n }); };

  const actualizarPromptGpt    = (val) => { setPromptGpt(val); persistir({ promptGpt: val }); };
  const actualizarVariableGpt  = (id, val) => {
    const v = { ...variablesGpt, [id]: val };
    setVariablesGpt(v);
    setEstiloActivoGpt(null);
    persistir({ variablesGpt: v, estiloActivoGpt: null });
  };
  const aplicarEstiloGpt = (preset) => {
    setVariablesGpt(preset.variables);
    setEstiloActivoGpt(preset.id);
    persistir({ variablesGpt: preset.variables, estiloActivoGpt: preset.id });
  };

  const actualizarModelo = (val) => { setModeloRender(val); persistir({ modeloRender: val }); };
  const actualizarSeed   = (val) => { setSeed(val);         persistir({ seed: val }); };

  const promptCompletoKontext = ensamblarPrompt(promptKontext, variablesKontext, VARS_KONTEXT);
  const promptCompletoGpt     = ensamblarPrompt(promptGpt,     variablesGpt,     VARIABLES_CONFIG);

  const handleGenerar = async () => {
    if (!wsId) return;
    setGenerando(true); setErrorRender(null); setImagenUrl(null);
    try {
      const imageBase64 = imagenRef3D ? imagenRef3D.replace(/^data:image\/\w+;base64,/, '') : null;
      const endpoint = modeloRender === "gpt" ? "/api/generate-render-gpt" : "/api/generate-render";
      const prompt   = modeloRender === "gpt" ? promptCompletoGpt : promptCompletoKontext;
      const body = { workspaceId: wsId, prompt, imageBase64 };
      if (modeloRender === "flux-kontext") body.modelType = "flux-kontext";
      if (seed !== "") body.seed = parseInt(seed, 10);
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      let data;
      try { data = await res.json(); }
      catch { throw new Error(window.location.hostname === "localhost"
        ? "Las funciones API no están disponibles en dev local. Deployá en Vercel o usá 'vercel dev'."
        : `Error del servidor (HTTP ${res.status}). Revisá los logs en Vercel → Functions.`); }
      if (!res.ok) { setErrorRender(data.error || "Error al generar"); return; }
      setImagenUrl(data.imageUrl);
      if (onRenderGenerado) onRenderGenerado();
    } catch (e) { setErrorRender(e.message); }
    finally { setGenerando(false); }
  };

  const sinDatos     = !imagenRef3D;
  const creditos     = calcularCreditos(suscripcion);
  const puedeGenerar = !generando && !creditos.bloqueado;

  const activasKontext = VARS_KONTEXT.filter(v => variablesKontext[v.id]).length;
  const activasGpt     = VARIABLES_CONFIG.filter(v => variablesGpt[v.id]).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Cabecera */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <SectionTitle sub="Genera renders realistas con IA">Render IA</SectionTitle>
        {!sinDatos && !isMobile && (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setModo("ref3d")}  style={btnSm(modo === "ref3d"  ? "accent" : "default")}>◈ Vista 3D</button>
            <button onClick={() => setModo("render")} style={btnSm(modo === "render" ? "accent" : "default")}>✨ Render</button>
            <button onClick={() => setModo("split")}  style={btnSm(modo === "split"  ? "accent" : "default")}>⊞ Dividido</button>
          </div>
        )}
      </div>

      {/* Biblioteca de materiales 3D */}
      <InnerSection label="Biblioteca de Materiales 3D" icon="🪵" badge={Object.keys(materiales3D).length > 0 ? String(Object.keys(materiales3D).length) : null} defaultOpen={false}>
        <BibliotecaMateriales3D
          materiales3D={materiales3D}
          onGuardar={(cod, mat) => onGuardarMaterial3D?.(cod, mat)}
          onEliminar={(cod) => onEliminarMaterial3D?.(cod)}
        />
        <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Subí el PNG del tablero (ej. melamina EGGER). En Vista 3D podrás asignarlo a cada módulo para ver la textura real antes de renderizar.
        </p>
      </InnerSection>

      {/* Empty state */}
      {sinDatos && (
        <div style={{ textAlign: "center", padding: "80px 0", borderRadius: 12, border: "1px dashed var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 40 }}>◈</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>No hay captura 3D</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            Armá la escena en <strong style={{ color: "var(--accent)" }}>Vista 3D</strong> y capturá para usar como referencia
          </p>
        </div>
      )}

      {/* Visualización */}
      {!sinDatos && modo === "ref3d"  && <Panel3DRef imagenRef3D={imagenRef3D} />}
      {!sinDatos && modo === "render" && <PanelRender imagenUrl={imagenUrl} generando={generando} />}
      {!sinDatos && modo === "split"  && (
        <div className="rsp-render-split" style={{ display: "flex", gap: 12, alignItems: "stretch", minHeight: isMobile ? "auto" : 360 }}>
          <Panel3DRef imagenRef3D={imagenRef3D} compact />
          <PanelRender imagenUrl={imagenUrl} generando={generando} compact />
        </div>
      )}

      {/* Error */}
      {errorRender && (
        <div style={{ fontSize: 12, color: "#e07070", fontFamily: "'DM Mono',monospace", padding: "8px 12px", background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.25)", borderRadius: 7 }}>
          ⚠ {errorRender}
        </div>
      )}

      {/* ── Render ───────────────────────────────────────────────────────────── */}
      {!sinDatos && (
        <StepCard
          numero="01"
          titulo={modeloRender === "gpt" ? "Render Completo" : "Render"}
          subtitulo={modeloRender === "gpt" ? "Escena completa en una sola pasada" : "Preserva materiales · escena configurable"}
          listo={!!imagenUrl} generando={generando}
          onGenerar={handleGenerar}
          bloqueado={!puedeGenerar} creditos={creditos} autoClose
        >
          {/* Selector de modelo */}
          <InnerSection label="Modelo IA" icon="🤖" badge={modeloRender === "flux-kontext" ? "FLUX.1 Kontext" : "GPT-4o"} defaultOpen={false}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {[
                { id: "flux-kontext", label: "FLUX.1 Kontext", tag: "⚡ Recomendado", desc: "Preserva materiales · 1 paso · más rápido" },
                { id: "gpt",          label: "GPT-4o",         tag: null,             desc: "Interpreta el render visualmente" },
              ].map(m => (
                <button key={m.id} onClick={() => actualizarModelo(m.id)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 7, cursor: "pointer", textAlign: "left", background: modeloRender === m.id ? "rgba(212,175,55,0.13)" : "rgba(255,255,255,0.04)", border: modeloRender === m.id ? "1px solid rgba(212,175,55,0.55)" : "1px solid rgba(255,255,255,0.10)", color: modeloRender === m.id ? "#D4AF37" : "var(--text-secondary)", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{m.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{m.desc}</div>
                  </div>
                  {m.tag && (
                    <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(212,175,55,0.18)", border: "1px solid rgba(212,175,55,0.40)", color: "#D4AF37", borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>
                      {m.tag}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </InnerSection>

          {/* Kontext: prompt + variables de escena */}
          {modeloRender === "flux-kontext" && (
            <>
              <InnerSection label="Prompt base" icon="📝" badge={promptKontext !== DEFAULT_PROMPT_KONTEXT ? "personalizado" : null}>
                <PromptSection value={promptKontext} onChange={actualizarPromptKontext} defaultValue={DEFAULT_PROMPT_KONTEXT} />
              </InnerSection>
              <InnerSection label="Escena y estilo" icon="🎨" badge={activasKontext > 0 ? `${activasKontext} activa${activasKontext !== 1 ? "s" : ""}` : null}>
                <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Los materiales se preservan de la imagen 3D. Configurá la escena y el ambiente.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {VARS_KONTEXT.map(vc => (
                    <VariableItem key={vc.id} config={vc} value={variablesKontext[vc.id] ?? null} onChange={val => actualizarVariableKontext(vc.id, val)} />
                  ))}
                </div>
              </InnerSection>
              <InnerSection label="Presets" icon="💾" defaultOpen={false} badge={presetsKontext.length > 0 ? String(presetsKontext.length) : null}>
                <PresetsSection presets={presetsKontext} promptBase={promptKontext}
                  onGuardar={guardarPresetKontext} onCargar={actualizarPromptKontext} onEliminar={eliminarPresetKontext} />
              </InnerSection>
            </>
          )}

          {/* GPT: prompt + estilos preset + variables */}
          {modeloRender === "gpt" && (
            <>
              <InnerSection label="Prompt" icon="📝" badge={promptGpt !== DEFAULT_PROMPT_GPT ? "personalizado" : null}>
                <PromptSection value={promptGpt} onChange={actualizarPromptGpt} defaultValue={DEFAULT_PROMPT_GPT} />
              </InnerSection>
              <InnerSection label="Estilo de escena" icon="🎨" badge={estiloActivoGpt ? (ESTILOS_PRESET_GPT.find(p => p.id === estiloActivoGpt)?.label ?? null) : (activasGpt > 0 ? "personalizado" : null)}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 12 }}>
                  {ESTILOS_PRESET_GPT.map(preset => {
                    const activo = estiloActivoGpt === preset.id;
                    return (
                      <button key={preset.id} onClick={() => aplicarEstiloGpt(preset)} title={preset.desc}
                        style={{ padding: "8px 6px", borderRadius: 8, cursor: "pointer", textAlign: "center", background: activo ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)", border: activo ? "1px solid rgba(212,175,55,0.6)" : "1px solid rgba(255,255,255,0.09)", color: activo ? "#D4AF37" : "var(--text-secondary)", transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>{preset.emoji}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2 }}>{preset.label}</span>
                        <span style={{ fontSize: 9, opacity: 0.6, lineHeight: 1.2 }}>{preset.desc}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {VARIABLES_CONFIG.map(vc => (
                    <VariableItem key={vc.id} config={vc} value={variablesGpt[vc.id] ?? null} onChange={val => actualizarVariableGpt(vc.id, val)} />
                  ))}
                </div>
              </InnerSection>
            </>
          )}

          {/* Seed (ambos modelos) */}
          <InnerSection label="Configuración avanzada" icon="⚙️" defaultOpen={false}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Seed</span>
              <input type="number" value={seed} onChange={e => actualizarSeed(e.target.value)}
                placeholder="Aleatorio (vacío)" style={{ ...inp, fontSize: 12, maxWidth: 180 }} />
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Fijá un número para resultados reproducibles</span>
            </div>
          </InnerSection>

        </StepCard>
      )}

    </div>
  );
}
