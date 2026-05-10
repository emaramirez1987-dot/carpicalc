import React, { useState, useEffect, useRef } from "react";
import { SectionTitle } from "../ui/index.jsx";
import useIsMobile from "../../hooks/useIsMobile.js";
import { EGGER_MATERIALES } from "../../data/egger_prompts.js";
import { leerPromptsRender, guardarPromptsRender, leerConfigRender, guardarConfigRender } from "../../storage.js";
import { PLANES_RENDER } from "../../constants.js";
import { supabase } from "../../lib/supabase.js";

// ── Prompts base por defecto ──────────────────────────────────────────────────

const DEFAULT_PROMPT_BASE =
`Product photography of a single furniture piece. Plain neutral background, studio lighting. No room, no scene, no other objects around it.

Material: [MATERIAL] / Color: [COLOR] / Finish: [ACABADO]
Lens: [CAMARA] / Style: [ESTILO]

Soft shadows, realistic reflections, detailed wood grain and textures, precise joinery. Professional high-end product photo, white or light gray seamless background.`;

const DEFAULT_SCENE_PROMPT_BASE =
`Fotografía arquitectónica de interiores premium, alta resolución.

Entorno: [FONDO].
Iluminación: [ILUMINACION].
Perspectiva: [PERSPECTIVA].
Ambientación: [ACCESORIOS].

Profundidad cinematográfica, atmósfera curada, visualización arquitectónica profesional.`;

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
  { id: "material",    label: "Material",       icon: "🪵", placeholder: "[MATERIAL]",    default: "melamina",
    opciones: ["melamina blanca", "madera nogal", "roble natural", "MDF lacado blanco", "madera de pino", "madera nogal y melamina negra"] },
  { id: "color",       label: "Color",          icon: "🎨", placeholder: "[COLOR]",       default: "blanco",
    opciones: ["blanco", "negro mate", "gris cemento", "nogal oscuro", "roble claro", "verde oliva", "natural madera"] },
  { id: "acabado",     label: "Acabado",        icon: "✨", placeholder: "[ACABADO]",     default: "mate",
    opciones: ["mate", "brillante", "satinado", "textura madera natural", "lacado liso"] },
  { id: "camara",      label: "Cámara",         icon: "📷", placeholder: "[CAMARA]",      default: "lente 35mm",
    opciones: ["lente 35mm", "lente 50mm", "lente gran angular 24mm", "teleobjetivo 85mm"] },
  { id: "estilo",      label: "Estilo visual",  icon: "🎭", placeholder: "[ESTILO]",      default: "contemporáneo premium",
    opciones: ["contemporáneo premium", "escandinavo minimalista", "industrial moderno", "clásico refinado"] },
  { id: "fondo",       label: "Fondo / Entorno",icon: "🏠", placeholder: "[FONDO]",       default: "fondo neutro liso gris claro",
    opciones: ["fondo neutro liso gris claro", "espacio blanco infinito", "cocina moderna minimalista", "living contemporáneo", "dormitorio escandinavo"] },
  { id: "iluminacion", label: "Iluminación",    icon: "💡", placeholder: "[ILUMINACION]", default: "luz natural cálida desde la izquierda",
    opciones: ["luz natural cálida desde la izquierda", "iluminación difusa de estudio", "luz cenital neutra", "luz cálida ambiental nocturna", "iluminación cinematográfica dramática"] },
  { id: "perspectiva", label: "Perspectiva",    icon: "📐", placeholder: "[PERSPECTIVA]", default: "vista frontal directa",
    opciones: ["vista frontal directa", "vista frontal en 3/4", "vista lateral derecha", "vista isométrica"] },
  { id: "accesorios",  label: "Accesorios",     icon: "🌿", placeholder: "[ACCESORIOS]",  default: "sin accesorios",
    opciones: ["sin accesorios", "plantas y objetos decorativos minimalistas", "cafetera y utensilios de cocina", "vajilla y accesorios", "libros y elementos decorativos"] },
];

const ESCENA_IDS  = ["fondo", "iluminacion", "perspectiva", "accesorios"];

// ── Presets de estilo para modo GPT ──────────────────────────────────────────
const ESTILOS_PRESET_GPT = [
  {
    id: "escandinavo", label: "Escandinavo", emoji: "🌿", desc: "Blanco, madera clara, luz natural",
    variables: {
      fondo:        "Scandinavian living room, white walls, light oak hardwood floor, large window with sheer curtains",
      iluminacion:  "soft natural daylight from a large side window, gentle diffuse shadows",
      perspectiva:  "three-quarter front view",
      accesorios:   "small potted plant, knitted throw, minimalist ceramic vase in neutral tones",
      estilo:       "escandinavo minimalista",
      camara:       "lente 35mm",
    },
  },
  {
    id: "minimalista", label: "Minimalista", emoji: "◻", desc: "Vacío, luz perfecta, producto puro",
    variables: {
      fondo:        "pure white seamless studio background, infinite white floor",
      iluminacion:  "professional studio softbox lighting, perfectly even, no harsh shadows",
      perspectiva:  "vista frontal directa",
      accesorios:   "sin accesorios, fondo completamente limpio",
      estilo:       "minimalista contemporáneo",
      camara:       "lente 50mm",
    },
  },
  {
    id: "japandi", label: "Japandi", emoji: "🎋", desc: "Japonés-escandinavo, wabi-sabi",
    variables: {
      fondo:        "japandi interior, warm beige walls, light wood floor, shoji paper screen, zen atmosphere",
      iluminacion:  "warm diffuse natural light filtered through paper screens, golden hour feel",
      perspectiva:  "vista lateral derecha",
      accesorios:   "handmade ceramic bowl, small bonsai, linen fabric, smooth river stones",
      estilo:       "japandi wabi-sabi",
      camara:       "lente 50mm",
    },
  },
  {
    id: "contemporaneo", label: "Contemporáneo", emoji: "🏙", desc: "Living moderno, luz cálida",
    variables: {
      fondo:        "contemporary living room, warm grey walls, polished concrete floor, open plan space",
      iluminacion:  "warm ambient evening light, floor lamp glow, subtle recessed ceiling lights",
      perspectiva:  "vista frontal en 3/4",
      accesorios:   "curated books, architectural plant, sculptural decorative object",
      estilo:       "contemporáneo premium",
      camara:       "lente 35mm",
    },
  },
  {
    id: "industrial", label: "Industrial", emoji: "🏗", desc: "Cemento, metal, luz dramática",
    variables: {
      fondo:        "urban loft interior, exposed concrete walls, worn brick accent wall, raw steel beams",
      iluminacion:  "dramatic overhead industrial pendant lights, strong directional shadows",
      perspectiva:  "vista frontal en 3/4",
      accesorios:   "metal pipe details, industrial pendant lamp, large monstera plant",
      estilo:       "industrial moderno",
      camara:       "lente 35mm",
    },
  },
  {
    id: "lujo", label: "Lujo", emoji: "✨", desc: "Mármol, alto brillo, dramatismo",
    variables: {
      fondo:        "luxury showroom, white Calacatta marble floor, dark charcoal walls, high ceiling",
      iluminacion:  "dramatic cinematic lighting with subtle specular highlights, moody atmosphere",
      perspectiva:  "vista isométrica",
      accesorios:   "crystal vase with flowers, premium decorative objects, gold accent details",
      estilo:       "lujo contemporáneo",
      camara:       "lente 50mm",
    },
  },
  {
    id: "midcentury", label: "Mid-Century", emoji: "🟠", desc: "Retro, maderas cálidas, vintage 60s",
    variables: {
      fondo:        "mid-century modern living room, mustard yellow accent wall, patterned geometric rug, teak wood floor",
      iluminacion:  "warm incandescent ambient light, vintage arc floor lamp",
      perspectiva:  "vista lateral derecha",
      accesorios:   "vinyl record, cactus, retro ceramic decorations, 60s inspired objects",
      estilo:       "mid-century modern",
      camara:       "lente 50mm",
    },
  },
  {
    id: "boho", label: "Boho Natural", emoji: "🌾", desc: "Tierras, plantas, texturas naturales",
    variables: {
      fondo:        "bohemian interior, terracotta walls, natural rattan furniture, warm earthy tones",
      iluminacion:  "golden hour warm sunlight streaming through a window, soft warm shadows",
      perspectiva:  "vista frontal en 3/4",
      accesorios:   "macramé wall hanging, lush tropical plants, woven baskets, natural linen textiles",
      estilo:       "boho contemporáneo",
      camara:       "lente 35mm",
    },
  },
  {
    id: "mediterraneo", label: "Mediterráneo", emoji: "🌊", desc: "Cal, terracota, luz del sur",
    variables: {
      fondo:        "Mediterranean interior, whitewashed lime walls, terracotta tile floor, arched doorway",
      iluminacion:  "intense bright southern sunlight, sharp contrasting shadows, warm white light",
      perspectiva:  "vista frontal en 3/4",
      accesorios:   "handmade ceramic pottery, olive branch, natural linen curtains, mosaic tile detail",
      estilo:       "mediterráneo contemporáneo",
      camara:       "lente 35mm",
    },
  },
  {
    id: "nordic_dark", label: "Nordic Dark", emoji: "🌑", desc: "Oscuro, velas, hygge invernal",
    variables: {
      fondo:        "dark nordic interior, deep forest green walls, dark oak floor, cozy winter atmosphere",
      iluminacion:  "warm candlelight and soft pendant lamp glow, moody hygge ambiance",
      perspectiva:  "vista frontal en 3/4",
      accesorios:   "candles, dark ceramic mugs, wool blanket, pine branches",
      estilo:       "nordic dark hygge",
      camara:       "lente 35mm",
    },
  },
  {
    id: "art_deco", label: "Art Déco", emoji: "🔷", desc: "Dorado, glamour, geometría",
    variables: {
      fondo:        "art deco interior, deep navy blue walls, gold geometric moldings, black marble floor",
      iluminacion:  "glamorous warm golden light from art deco sconces and chandelier",
      perspectiva:  "vista isométrica",
      accesorios:   "gold vase, geometric decorative objects, luxury velvet accent",
      estilo:       "art déco glamour",
      camara:       "lente 50mm",
    },
  },
  {
    id: "exterior", label: "Exterior / Jardín", emoji: "🌳", desc: "Al aire libre, luz natural",
    variables: {
      fondo:        "outdoor garden setting, lush green grass, stone patio, natural wood deck",
      iluminacion:  "bright natural outdoor daylight, dappled shade from trees",
      perspectiva:  "vista frontal en 3/4",
      accesorios:   "potted plants, garden accessories, natural stone elements",
      estilo:       "exterior contemporáneo",
      camara:       "lente 35mm",
    },
  },
];
const VARS_PASO1  = VARIABLES_CONFIG.filter(v => !ESCENA_IDS.includes(v.id));
const VARS_PASO2  = VARIABLES_CONFIG.filter(v =>  ESCENA_IDS.includes(v.id));

function ensamblarPrompt(base, variables, varsConfig) {
  let r = base;
  varsConfig.forEach(v => { r = r.replace(v.placeholder, variables[v.id] || v.default); });
  return r;
}

async function urlToBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror  = reject;
    reader.readAsDataURL(blob);
  });
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

// ── SliderParam ───────────────────────────────────────────────────────────────

function SliderParam({ label, value, min, max, step, onChange, izq, der, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 4, padding: "1px 7px" }}>
          {value}
        </span>
        {hint && <span style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>{hint}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>{izq}</span>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value, 10))}
          style={{ flex: 1, accentColor: "var(--accent)" }}
        />
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>{der}</span>
      </div>
    </div>
  );
}

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

function StepCard({ numero, titulo, subtitulo, listo, generando, onGenerar, onPreview, bloqueado, creditos, children, defaultOpen = true, disabled = false, autoClose = false }) {
  const [abierto, setAbierto] = useState(defaultOpen);
  const prevListoRef = React.useRef(listo);

  React.useEffect(() => {
    if (autoClose && !prevListoRef.current && listo) setAbierto(false);
    prevListoRef.current = listo;
  }, [listo, autoClose]);

  const toggleAbierto = () => { if (!disabled) setAbierto(a => !a); };

  // Dorado cuando colapsado, normal cuando expandido
  const borderColor = !abierto ? "var(--accent-border)" : "var(--border)";
  const headerBg    = !abierto ? "var(--accent-soft)"   : "transparent";

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      overflow: "hidden",
      transition: "border-color 0.2s",
      opacity: disabled ? 0.5 : 1,
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 12,
        background: headerBg,
        transition: "background 0.2s",
      }}>
        {/* Badge */}
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: listo ? "var(--accent-soft)" : "var(--bg-subtle)",
          border: `1px solid ${listo ? "var(--accent-border)" : "var(--border)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700,
          color: listo ? "var(--accent)" : "var(--text-muted)",
        }}>
          {listo ? "✓" : numero}
        </div>

        {/* Título */}
        <div onClick={toggleAbierto} style={{ flex: 1, cursor: disabled ? "default" : "pointer", userSelect: "none" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{titulo}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
            {disabled ? "Completá el Paso 1 primero" : subtitulo}
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {creditos && (
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: creditos.bloqueado ? "#e07070" : "var(--text-muted)" }}>
              {creditos.bloqueado
                ? "Sin renders"
                : creditos.limite === null
                  ? `${creditos.usados} usados`
                  : `${creditos.restantes} disponibles`}
            </span>
          )}
          {onPreview && (
            <button onClick={onPreview} disabled={disabled} title="Vista previa" style={{ ...btnSm(), padding: "6px 9px", fontSize: 13, opacity: disabled ? 0.4 : 1, cursor: disabled ? "default" : "pointer" }}>🔍</button>
          )}
          <button onClick={onGenerar} disabled={bloqueado || generando || disabled}
            style={{ ...btnSm("accent"), padding: "7px 14px", fontSize: 12, opacity: (bloqueado || generando || disabled) ? 0.4 : 1, cursor: (bloqueado || generando || disabled) ? "default" : "pointer" }}>
            {generando ? "⏳ Generando…" : "▶ Renderizar"}
          </button>
        </div>

        {/* Chevron */}
        <button onClick={toggleAbierto}
          style={{ background: "none", border: "none", cursor: disabled ? "default" : "pointer", padding: "4px 2px", color: "var(--text-muted)", fontSize: 10, transition: "transform 0.2s", transform: abierto ? "rotate(180deg)" : "none", flexShrink: 0 }}>
          ▼
        </button>
      </div>

      {/* Body */}
      {abierto && <div style={{ borderTop: "1px solid var(--border)" }}>{children}</div>}
    </div>
  );
}

// ── SelectorMaterialEgger ─────────────────────────────────────────────────────

const EGGER_CATS = [
  { id: "blancos",  label: "Blancos",           icon: "⬜" },
  { id: "grises",   label: "Grises",            icon: "🩶" },
  { id: "negros",   label: "Negros",            icon: "⬛" },
  { id: "lisos",    label: "Lisos / Color",     icon: "🎨" },
  { id: "piedra",   label: "Piedra y Cemento",  icon: "🪨" },
  { id: "feelwood", label: "Feelwood",          icon: "🌿" },
  { id: "maderas",  label: "Maderas",           icon: "🪵" },
];

function SelectorMaterialEgger({ codigoSeleccionado, onSeleccionar }) {
  const [abiertos, setAbiertos] = useState({});
  const toggle = (id) => setAbiertos(p => ({ ...p, [id]: !p[id] }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {EGGER_CATS.map(cat => {
        const mats = EGGER_MATERIALES.filter(m => m.renderCat === cat.id);
        if (!mats.length) return null;
        const abierto = !!abiertos[cat.id];
        const selEnCat = mats.find(m => m.codigo === codigoSeleccionado);
        return (
          <div key={cat.id} style={{ border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden" }}>
            <div onClick={() => toggle(cat.id)} style={{ padding: "7px 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none", background: "var(--bg-surface)" }}>
              <span style={{ fontSize: 13 }}>{cat.icon}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{cat.label}</span>
              {selEnCat && (
                <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 4, padding: "1px 6px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selEnCat.nombre}
                </span>
              )}
              <span style={{ fontSize: 9, color: "var(--text-muted)", display: "inline-block", transform: abierto ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
            </div>
            {abierto && (
              <div style={{ padding: "6px 12px 10px", borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 5, background: "var(--bg-subtle)" }}>
                {mats.map(m => (
                  <button
                    key={m.codigo}
                    onClick={() => onSeleccionar(codigoSeleccionado === m.codigo ? null : m)}
                    title={m.codigo}
                    style={{ ...btnSm(codigoSeleccionado === m.codigo ? "accent" : "default"), fontSize: 10, padding: "4px 9px" }}
                  >
                    {m.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── PanelRender ───────────────────────────────────────────────────────────────

function PanelRender({ imagenUrl, imagenEscenaUrl, generando, generandoEscena, compact = false }) {
  const [tab, setTab] = useState("paso1");
  useEffect(() => { if (imagenEscenaUrl) setTab("paso2"); }, [imagenEscenaUrl]);

  const mostrarUrl  = tab === "paso2" ? imagenEscenaUrl : imagenUrl;
  const enGenerando = tab === "paso2" ? generandoEscena : generando;
  const showTabs    = imagenUrl && (imagenEscenaUrl || generandoEscena);

  if (enGenerando) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-surface)", border: "1px dashed var(--border)", borderRadius: 12, padding: compact ? "24px 16px" : "60px 32px", gap: 12 }}>
      <div style={{ fontSize: compact ? 26 : 38 }}>⏳</div>
      <div style={{ fontSize: compact ? 12 : 14, fontWeight: 700, color: "var(--text-primary)" }}>Generando render…</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Puede tardar unos segundos</div>
    </div>
  );

  if (mostrarUrl) return (
    <div style={{ flex: 1, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: compact ? "8px 12px" : "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
        {showTabs ? (
          <>
            <button onClick={() => setTab("paso1")} style={{ ...btnSm(tab === "paso1" ? "accent" : "default"), fontSize: 10 }}>Paso 1 · Mueble</button>
            <button onClick={() => setTab("paso2")} style={{ ...btnSm(tab === "paso2" ? "accent" : "default"), fontSize: 10 }}>Paso 2 · Escena</button>
          </>
        ) : (
          <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>✨ Render IA</span>
        )}
        <div style={{ flex: 1 }} />
        <a href={mostrarUrl} download="render.webp" target="_blank" rel="noopener noreferrer"
          style={{ ...btnSm("accent"), textDecoration: "none", display: "inline-block" }}>⬇ Descargar</a>
      </div>
      <img src={mostrarUrl} alt="render IA" style={{ width: "100%", height: "auto", display: "block" }} />
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

// ── Helpers ───────────────────────────────────────────────────────────────────

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
      {/* Upload */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 160 }}>
          <input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Código (ej: W908)" style={{ ...inp, fontSize: 12 }} />
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre (opcional)" style={{ ...inp, fontSize: 12 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 56, height: 56, borderRadius: 6, cursor: 'pointer',
              border: '1px dashed var(--border)', background: 'var(--bg-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {preview
              ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>+</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          <button onClick={handleGuardar} style={{ ...btnSm('accent'), fontSize: 11 }}>Cargar</button>
        </div>
      </div>
      {error && <div style={{ fontSize: 11, color: '#e07070', fontFamily: "'DM Mono',monospace" }}>{error}</div>}

      {/* Catálogo de materiales */}
      {Object.keys(materiales3D).length === 0 ? (
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin materiales cargados</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          {Object.entries(materiales3D).map(([cod, mat]) => (
            <div
              key={cod}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent-border)';
                e.currentTarget.style.boxShadow   = '0 4px 14px rgba(0,0,0,0.18)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow   = 'none';
              }}
            >
              {/* Imagen — aspect-ratio 4:3 */}
              <div style={{ position: 'relative', paddingTop: '75%' }}>
                <img
                  src={mat.dataUrl}
                  alt={cod}
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover', display: 'block',
                  }}
                />
                {/* Botón eliminar */}
                <button
                  onClick={() => onEliminar(cod)}
                  title="Eliminar material"
                  style={{
                    position: 'absolute', top: 5, right: 5,
                    width: 20, height: 20, borderRadius: 5,
                    background: 'rgba(0,0,0,0.60)',
                    border: '1px solid rgba(255,255,255,0.20)',
                    color: '#fff', fontSize: 12, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,60,60,0.80)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.60)'; }}
                >
                  ×
                </button>
              </div>

              {/* Texto */}
              <div style={{ padding: '6px 8px 8px', background: 'var(--bg-surface)' }}>
                <div style={{
                  fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                  color: 'var(--accent)', letterSpacing: '0.05em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}>
                  {cod}
                </div>
                <div style={{
                  fontSize: 9, color: 'var(--text-secondary)',
                  fontFamily: "'Bricolage Grotesque',sans-serif",
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  lineHeight: 1.4, marginTop: 1,
                }}>
                  {mat.nombre || cod}
                </div>
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

  // Visualización
  const [modo,     setModo]     = useState(isMobile ? "render" : "split");
  const [wsId,     setWsId]     = useState(null);

  // Paso 1
  const [selectedEggerCode, setSelectedEggerCode] = useState(null);
  const [generando,    setGenerando]    = useState(false);
  const [imagenUrl,    setImagenUrl]    = useState(null);
  const [errorRender,  setErrorRender]  = useState(null);

  // Paso 2
  const [generandoEscena,  setGenerandoEscena]  = useState(false);
  const [imagenEscenaUrl,  setImagenEscenaUrl]  = useState(null);
  const [refPreview2,      setRefPreview2]      = useState(null);

  // Config persistida — Paso 1
  const [promptBase,      setPromptBase]      = useState(savedCfg.promptBase      ?? DEFAULT_PROMPT_BASE);
  const [variables,       setVariables]       = useState(savedCfg.variables       ?? {});
  const [guidance,        setGuidance]        = useState(savedCfg.guidance        ?? 30);
  const [controlStrength, setControlStrength] = useState(savedCfg.controlStrength ?? 0.65);
  const [modeloRender,    setModeloRender]    = useState(savedCfg.modeloRender    ?? "flux");
  const [seed1,           setSeed1]           = useState(savedCfg.seed1           ?? "");
  const [presets1,        setPresets1]        = useState(() => leerPromptsRender());

  // Config persistida — Modo GPT (etapa única)
  const [promptGpt,       setPromptGpt]       = useState(savedCfg.promptGpt       ?? DEFAULT_PROMPT_GPT);
  const [variablesGpt,    setVariablesGpt]    = useState(savedCfg.variablesGpt    ?? {});
  const [estiloActivoGpt, setEstiloActivoGpt] = useState(savedCfg.estiloActivoGpt ?? null);

  // Config persistida — Paso 2
  const [promptBaseEscena,     setPromptBaseEscena]     = useState(savedCfg.promptBaseEscena     ?? DEFAULT_SCENE_PROMPT_BASE);
  const [variablesEscena,      setVariablesEscena]      = useState(savedCfg.variablesEscena      ?? {});
  const [sceneGuidance,        setSceneGuidance]        = useState(savedCfg.sceneGuidance        ?? 30);
  const [seed2,                setSeed2]                = useState(savedCfg.seed2                ?? "");
  const [presets2,             setPresets2]             = useState(savedCfg.presetsEscena        ?? []);

  useEffect(() => {
    supabase.from("workspaces").select("id").single().then(({ data }) => {
      if (data) setWsId(data.id);
    });
  }, []);

  const persistirConfig = (patch) =>
    guardarConfigRender({
      promptBase, variables, guidance, controlStrength, modeloRender, seed1,
      promptGpt, variablesGpt, estiloActivoGpt,
      promptBaseEscena, variablesEscena, sceneGuidance, seed2,
      presetsEscena: presets2,
      ...patch,
    });

  // Updaters — Paso 1
  const actualizarPromptBase      = (val) => { setPromptBase(val);       persistirConfig({ promptBase: val }); };
  const actualizarVariable        = (id, val) => { const v = { ...variables, [id]: val };       setVariables(v);       persistirConfig({ variables: v }); };
  const actualizarGuidance        = (val) => { setGuidance(val);         persistirConfig({ guidance: val }); };
  const actualizarControlStrength = (val) => { setControlStrength(val);  persistirConfig({ controlStrength: val }); };
  const actualizarModeloRender    = (val) => { setModeloRender(val);     persistirConfig({ modeloRender: val }); };
  const actualizarPromptGpt       = (val) => { setPromptGpt(val);        persistirConfig({ promptGpt: val }); };
  const actualizarVariableGpt     = (id, val) => {
    const v = { ...variablesGpt, [id]: val };
    setVariablesGpt(v);
    setEstiloActivoGpt(null);
    persistirConfig({ variablesGpt: v, estiloActivoGpt: null });
  };
  const aplicarEstiloGpt = (preset) => {
    setVariablesGpt(preset.variables);
    setEstiloActivoGpt(preset.id);
    persistirConfig({ variablesGpt: preset.variables, estiloActivoGpt: preset.id });
  };
  const actualizarSeed1           = (val) => { setSeed1(val);            persistirConfig({ seed1: val }); };

  const guardarPreset1  = (p)  => { const n = [...presets1, p];               setPresets1(n); guardarPromptsRender(n); };
  const eliminarPreset1 = (id) => { const n = presets1.filter(p => p.id !== id); setPresets1(n); guardarPromptsRender(n); };

  // Updaters — Paso 2
  const actualizarPromptBaseEscena    = (val) => { setPromptBaseEscena(val);    persistirConfig({ promptBaseEscena: val }); };
  const actualizarVariableEscena      = (id, val) => { const v = { ...variablesEscena, [id]: val }; setVariablesEscena(v); persistirConfig({ variablesEscena: v }); };
  const actualizarSceneGuidance       = (val) => { setSceneGuidance(val);       persistirConfig({ sceneGuidance: val }); };
  const actualizarSeed2               = (val) => { setSeed2(val);               persistirConfig({ seed2: val }); };

  const guardarPreset2  = (p)  => { const n = [...presets2, p];               setPresets2(n); persistirConfig({ presetsEscena: n }); };
  const eliminarPreset2 = (id) => { const n = presets2.filter(p => p.id !== id); setPresets2(n); persistirConfig({ presetsEscena: n }); };

  const promptCompleto       = ensamblarPrompt(promptBase,      variables,      VARS_PASO1);
  const promptCompletoEscena = ensamblarPrompt(promptBaseEscena, variablesEscena, VARS_PASO2);
  const promptCompletoGpt    = ensamblarPrompt(promptGpt,        variablesGpt,   VARIABLES_CONFIG);

  const handleGenerar = async () => {
    if (!wsId) return;
    setGenerando(true); setErrorRender(null); setImagenUrl(null);
    try {
      const imageBase64 = imagenRef3D ? imagenRef3D.replace(/^data:image\/\w+;base64,/, '') : null;
      const endpoint = modeloRender === "gpt" ? "/api/generate-render-gpt" : "/api/generate-render";
      const prompt   = modeloRender === "gpt" ? promptCompletoGpt : promptCompleto;
      const body = { workspaceId: wsId, prompt, imageBase64 };
      if (modeloRender !== "gpt") { body.guidance = guidance; body.controlStrength = controlStrength; }
      if (seed1 !== "") body.seed = parseInt(seed1, 10);
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

  const handleGenerarEscena = async () => {
    if (!wsId || !imagenUrl) return;
    setGenerandoEscena(true); setErrorRender(null);
    try {
      const b64  = await urlToBase64(imagenUrl);
      const body = { workspaceId: wsId, prompt: promptCompletoEscena, imageBase64: b64, guidance: sceneGuidance };
      if (seed2 !== "") body.seed = parseInt(seed2, 10);
      const res = await fetch("/api/generate-scene", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      let data;
      try { data = await res.json(); }
      catch { throw new Error(window.location.hostname === "localhost"
        ? "Las funciones API no están disponibles en dev local. Deployá en Vercel o usá 'vercel dev'."
        : `Error del servidor (HTTP ${res.status}). Revisá los logs en Vercel → Functions.`); }
      if (!res.ok) { setErrorRender(data.error || "Error al generar escena"); return; }
      setImagenEscenaUrl(data.imageUrl);
    } catch (e) { setErrorRender(e.message); }
    finally { setGenerandoEscena(false); }
  };

  const sinDatos     = !imagenRef3D;
  const creditos     = calcularCreditos(suscripcion);
  const puedeGenerar = !generando && !creditos.bloqueado;

  const hintGuidance  = guidance <= 15 ? "muy libre" : guidance <= 40 ? "balance" : guidance <= 70 ? "literal" : "muy literal";
  const hintControl   = controlStrength <= 0.25 ? "ignora estructura" : controlStrength <= 0.55 ? "balance" : "respeta estructura";
  const hintSceneGuidance = sceneGuidance <= 15 ? "muy libre" : sceneGuidance <= 40 ? "balance" : sceneGuidance <= 70 ? "literal" : "muy literal";

  const activasP1  = VARS_PASO1.filter(v => variables[v.id]).length;
  const activasP2  = VARS_PASO2.filter(v => variablesEscena[v.id]).length;
  const activasGpt = VARIABLES_CONFIG.filter(v => variablesGpt[v.id]).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Cabecera */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <SectionTitle sub="Genera renders realistas en dos etapas">Render IA</SectionTitle>
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
      {!sinDatos && modo === "render" && <PanelRender imagenUrl={imagenUrl} imagenEscenaUrl={imagenEscenaUrl} generando={generando} generandoEscena={generandoEscena} />}
      {!sinDatos && modo === "split"  && (
        <div className="rsp-render-split" style={{ display: "flex", gap: 12, alignItems: "stretch", minHeight: isMobile ? "auto" : 360 }}>
          <Panel3DRef imagenRef3D={imagenRef3D} compact />
          <PanelRender imagenUrl={imagenUrl} imagenEscenaUrl={imagenEscenaUrl} generando={generando} generandoEscena={generandoEscena} compact />
        </div>
      )}

      {/* Error global */}
      {errorRender && (
        <div style={{ fontSize: 12, color: "#e07070", fontFamily: "'DM Mono',monospace", padding: "8px 12px", background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.25)", borderRadius: 7 }}>
          ⚠ {errorRender}
        </div>
      )}

      {/* ── Paso 1 · Render Base ─────────────────────────────────────────────── */}
      {!sinDatos && (
        <StepCard
          numero="01"
          titulo={modeloRender === "gpt" ? "Render Completo" : "Render Base"}
          subtitulo={modeloRender === "gpt" ? "Material, estructura y escena en una sola pasada" : "Genera el mueble con material y terminación"}
          listo={!!imagenUrl} generando={generando}
          onGenerar={handleGenerar}
          bloqueado={!puedeGenerar} creditos={creditos} autoClose
        >
          {modeloRender === "gpt" ? (
            <>
              <InnerSection label="Prompt" icon="📝" badge={promptGpt !== DEFAULT_PROMPT_GPT ? "personalizado" : null}>
                <PromptSection value={promptGpt} onChange={actualizarPromptGpt} defaultValue={DEFAULT_PROMPT_GPT} />
              </InnerSection>
              <InnerSection label="Estilo de escena" icon="🎨" badge={estiloActivoGpt ? (ESTILOS_PRESET_GPT.find(p => p.id === estiloActivoGpt)?.label ?? null) : (activasGpt > 0 ? "personalizado" : null)}>
                {/* Grilla de presets */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 12 }}>
                  {ESTILOS_PRESET_GPT.map(preset => {
                    const activo = estiloActivoGpt === preset.id;
                    return (
                      <button key={preset.id} onClick={() => aplicarEstiloGpt(preset)}
                        title={preset.desc}
                        style={{
                          padding: "8px 6px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                          background: activo ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
                          border: activo ? "1px solid rgba(212,175,55,0.6)" : "1px solid rgba(255,255,255,0.09)",
                          color: activo ? "#D4AF37" : "var(--text-secondary)",
                          transition: "all 0.15s",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                        }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>{preset.emoji}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2 }}>{preset.label}</span>
                        <span style={{ fontSize: 9, opacity: 0.6, lineHeight: 1.2 }}>{preset.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Variables editables (se rellenan al aplicar preset, editables individualmente) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {VARIABLES_CONFIG.map(vc => (
                    <VariableItem key={vc.id} config={vc} value={variablesGpt[vc.id] ?? null} onChange={val => actualizarVariableGpt(vc.id, val)} />
                  ))}
                </div>
              </InnerSection>
            </>
          ) : (
            <>
              <InnerSection label="Prompt base" icon="📝" badge={promptBase !== DEFAULT_PROMPT_BASE ? "personalizado" : null}>
                <PromptSection value={promptBase} onChange={actualizarPromptBase} defaultValue={DEFAULT_PROMPT_BASE} />
              </InnerSection>
              <InnerSection label="Variables del mueble" icon="🎨" badge={activasP1 > 0 ? `${activasP1} activa${activasP1 !== 1 ? "s" : ""}` : null}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {VARS_PASO1.map(vc => (
                    <VariableItem key={vc.id} config={vc} value={variables[vc.id] ?? null} onChange={val => actualizarVariable(vc.id, val)} />
                  ))}
                </div>
              </InnerSection>
            </>
          )}

          {modeloRender !== "gpt" && (
            <InnerSection label="Materiales EGGER" icon="🪵" badge={selectedEggerCode ? (EGGER_MATERIALES.find(m => m.codigo === selectedEggerCode)?.nombre ?? null) : null}>
              <SelectorMaterialEgger
                codigoSeleccionado={selectedEggerCode}
                onSeleccionar={(mat) => {
                  if (!mat) {
                    setSelectedEggerCode(null);
                    actualizarVariable("material", null);
                  } else {
                    setSelectedEggerCode(mat.codigo);
                    actualizarVariable("material", mat.prompt);
                  }
                }}
              />
            </InnerSection>
          )}

          <InnerSection label="Configuración avanzada" icon="⚙️" defaultOpen={false}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Selector de modelo IA */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Modelo IA</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { id: "flux", label: "Flux Canny", desc: "Rápido · estructura fiel" },
                    { id: "gpt",  label: "GPT-4o",     desc: "Ve el material real" },
                  ].map(m => (
                    <button key={m.id} onClick={() => actualizarModeloRender(m.id)}
                      style={{
                        flex: 1, padding: "7px 10px", borderRadius: 7, cursor: "pointer", textAlign: "left",
                        background: modeloRender === m.id ? "rgba(212,175,55,0.13)" : "rgba(255,255,255,0.04)",
                        border: modeloRender === m.id ? "1px solid rgba(212,175,55,0.55)" : "1px solid rgba(255,255,255,0.10)",
                        color: modeloRender === m.id ? "#D4AF37" : "var(--text-secondary)",
                        transition: "all 0.15s",
                      }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{m.label}</div>
                      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {modeloRender !== "gpt" && (
                <>
                  <SliderParam label="Adherencia al prompt" value={guidance} min={1} max={100} step={1}
                    onChange={actualizarGuidance} hint={hintGuidance} izq="1 — libre" der="100 — literal" />
                  <SliderParam label="Fuerza estructural" value={controlStrength} min={0.05} max={0.95} step={0.05}
                    onChange={actualizarControlStrength} hint={hintControl} izq="0.05 — libre" der="0.95 — estricto" />
                </>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Seed</span>
                <input type="number" value={seed1} onChange={e => actualizarSeed1(e.target.value)}
                  placeholder="Aleatorio (vacío)" style={{ ...inp, fontSize: 12, maxWidth: 180 }} />
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Fijá un número para resultados reproducibles</span>
              </div>
            </div>
          </InnerSection>

          <InnerSection label="Presets" icon="💾" defaultOpen={false} badge={presets1.length > 0 ? String(presets1.length) : null}>
            <PresetsSection presets={presets1} promptBase={promptBase}
              onGuardar={guardarPreset1} onCargar={actualizarPromptBase} onEliminar={eliminarPreset1} />
          </InnerSection>

        </StepCard>
      )}

      {/* ── Paso 2 · Render de Escena (solo modo Flux) ───────────────────────── */}
      {!sinDatos && modeloRender !== "gpt" && (
        <StepCard
          numero="02" titulo="Render de Escena"
          subtitulo="Ambienta el mueble en su contexto final"
          listo={!!imagenEscenaUrl} generando={generandoEscena}
          onGenerar={handleGenerarEscena}
          onPreview={() => setRefPreview2(imagenUrl)}
          bloqueado={generandoEscena || creditos.bloqueado}
          disabled={!imagenUrl}
          defaultOpen={false}
        >
          <InnerSection label="Prompt de escena" icon="🎬" badge={promptBaseEscena !== DEFAULT_SCENE_PROMPT_BASE ? "personalizado" : null}>
            <PromptSection value={promptBaseEscena} onChange={actualizarPromptBaseEscena} defaultValue={DEFAULT_SCENE_PROMPT_BASE} />
          </InnerSection>

          <InnerSection label="Variables de escena" icon="🏠" badge={activasP2 > 0 ? `${activasP2} activa${activasP2 !== 1 ? "s" : ""}` : null}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {VARS_PASO2.map(vc => (
                <VariableItem key={vc.id} config={vc} value={variablesEscena[vc.id] ?? null} onChange={val => actualizarVariableEscena(vc.id, val)} />
              ))}
            </div>
          </InnerSection>

          <InnerSection label="Configuración avanzada" icon="⚙️" defaultOpen={false}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <SliderParam label="Guidance" value={sceneGuidance} min={1} max={100} step={1}
                onChange={actualizarSceneGuidance} hint={hintSceneGuidance} izq="1 — libre" der="100 — literal" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Seed</span>
                <input type="number" value={seed2} onChange={e => actualizarSeed2(e.target.value)}
                  placeholder="Aleatorio (vacío)" style={{ ...inp, fontSize: 12, maxWidth: 180 }} />
              </div>
            </div>
          </InnerSection>

          <InnerSection label="Presets de escena" icon="💾" defaultOpen={false} badge={presets2.length > 0 ? String(presets2.length) : null}>
            <PresetsSection presets={presets2} promptBase={promptBaseEscena}
              onGuardar={guardarPreset2} onCargar={actualizarPromptBaseEscena} onEliminar={eliminarPreset2} />
          </InnerSection>

          {refPreview2 && (
            <div style={{ borderTop: "1px solid var(--border)", padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
                  Imagen enviada a Replicate
                </span>
                <button onClick={() => setRefPreview2(null)} style={btnSm("danger")}>✕ Cerrar</button>
              </div>
              <img src={refPreview2} alt="referencia escena" style={{ width: "100%", height: "auto", display: "block", borderRadius: 8 }} />
            </div>
          )}
        </StepCard>
      )}

    </div>
  );
}
