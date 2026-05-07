import React, { useState, useEffect, useRef } from "react";
import { SectionTitle } from "../ui/index.jsx";
import { leerPlano, leerPromptsRender, guardarPromptsRender, leerConfigRender, guardarConfigRender } from "../../storage.js";
import { PLANES_RENDER } from "../../constants.js";
import { supabase } from "../../lib/supabase.js";
import { generarImagenReferencia } from "../plano/planoUtils.js";
import SVGPlano from "../plano/SVGPlano.jsx";

// ── Prompt base por defecto ───────────────────────────────────────────────────

const DEFAULT_PROMPT_BASE =
`Usar la imagen de referencia como guía estructural principal, conservando la composición general, proporciones y distribución base del mueble.

Reinterpretar detalles constructivos, espesores, terminaciones y refinamientos visuales para transformarlo en una versión realista, funcional y de alta gama.

Generar una fotografía arquitectónica hiperrealista del mueble terminado, con apariencia de producto real fabricado profesionalmente.

Material: [MATERIAL] / Color: [COLOR] / Acabado: [ACABADO]
Cámara: [CAMARA] / Estilo: [ESTILO]

Fondo neutro liso, luz difusa de estudio. Texturas naturales, sombras suaves, reflejos realistas, detalles precisos de carpintería, fotografía profesional de producto.`;

// ── Variables dinámicas ───────────────────────────────────────────────────────

const VARIABLES_CONFIG = [
  {
    id: "material", label: "Material", icon: "🪵", placeholder: "[MATERIAL]",
    default: "melamina",
    opciones: ["melamina blanca", "madera nogal", "roble natural", "MDF lacado blanco", "madera de pino", "madera nogal y melamina negra"],
  },
  {
    id: "color", label: "Color", icon: "🎨", placeholder: "[COLOR]",
    default: "blanco",
    opciones: ["blanco", "negro mate", "gris cemento", "nogal oscuro", "roble claro", "verde oliva", "natural madera"],
  },
  {
    id: "acabado", label: "Acabado", icon: "✨", placeholder: "[ACABADO]",
    default: "mate",
    opciones: ["mate", "brillante", "satinado", "textura madera natural", "lacado liso"],
  },
  {
    id: "iluminacion", label: "Iluminación", icon: "💡", placeholder: "[ILUMINACION]",
    default: "luz natural cálida",
    opciones: ["luz natural cálida desde la izquierda", "iluminación difusa de estudio", "luz cenital neutra", "luz cálida ambiental nocturna", "iluminación cinematográfica dramática"],
  },
  {
    id: "fondo", label: "Fondo / Ambiente", icon: "🏠", placeholder: "[FONDO]",
    default: "fondo neutro gris claro",
    opciones: ["fondo neutro liso gris claro", "espacio blanco infinito", "cocina moderna minimalista", "living contemporáneo", "dormitorio escandinavo"],
  },
  {
    id: "accesorios", label: "Accesorios", icon: "🌿", placeholder: "[ACCESORIOS]",
    default: "sin accesorios",
    opciones: ["sin accesorios", "plantas y objetos decorativos minimalistas", "cafetera y utensilios de cocina", "vajilla y accesorios", "libros y elementos decorativos"],
  },
  {
    id: "perspectiva", label: "Perspectiva", icon: "📐", placeholder: "[PERSPECTIVA]",
    default: "vista frontal directa",
    opciones: ["vista frontal directa", "vista frontal en 3/4", "vista lateral derecha", "vista isométrica"],
  },
  {
    id: "camara", label: "Cámara", icon: "📷", placeholder: "[CAMARA]",
    default: "lente 35mm",
    opciones: ["lente 35mm", "lente 50mm", "lente gran angular 24mm", "teleobjetivo 85mm"],
  },
  {
    id: "estilo", label: "Estilo visual", icon: "🎭", placeholder: "[ESTILO]",
    default: "contemporáneo premium",
    opciones: ["contemporáneo premium", "escandinavo minimalista", "industrial moderno", "clásico refinado"],
  },
];

// IDs de variables que pertenecen al Paso 2 (escena)
const ESCENA_IDS = ["fondo", "iluminacion", "perspectiva", "accesorios"];

// Construye el prompt de escena a partir de las variables seleccionadas
function buildScenePrompt(variables) {
  const cfg = VARIABLES_CONFIG.reduce((acc, v) => ({ ...acc, [v.id]: v }), {});
  const get  = (id) => variables[id] || cfg[id]?.default || "";
  return `Fotografía arquitectónica de interiores, premium. ${get("fondo")}. ${get("iluminacion")}. ${get("perspectiva")}. ${get("accesorios")}. Fotografía profesional de interiores, alta resolución, visualización arquitectónica.`;
}

// Descarga una URL como base64 (para pasar el render a la API)
async function urlToBase64(url) {
  const res  = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror  = reject;
    reader.readAsDataURL(blob);
  });
}

// Reemplaza cada placeholder por el valor elegido (o el default si no hay selección)
function ensamblarPrompt(base, variables) {
  let resultado = base;
  VARIABLES_CONFIG.forEach(v => {
    resultado = resultado.replace(v.placeholder, variables[v.id] || v.default);
  });
  return resultado;
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

// ── PanelRender ───────────────────────────────────────────────────────────────

function PanelRender({ imagenUrl, imagenEscenaUrl, generando, generandoEscena, compact = false }) {
  const [tab, setTab] = useState("paso1");

  useEffect(() => { if (imagenEscenaUrl) setTab("paso2"); }, [imagenEscenaUrl]);

  const mostrarUrl    = tab === "paso2" ? imagenEscenaUrl : imagenUrl;
  const enGenerando   = tab === "paso2" ? generandoEscena : generando;
  const showTabs      = imagenUrl && (imagenEscenaUrl || generandoEscena);

  if (enGenerando) {
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
  if (mostrarUrl) {
    return (
      <div style={{
        flex: 1, background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: compact ? "8px 12px" : "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          {showTabs ? (
            <>
              <button onClick={() => setTab("paso1")} style={{ ...btnSm(tab === "paso1" ? "accent" : "default"), fontSize: 10 }}>Paso 1 · Mueble</button>
              <button onClick={() => setTab("paso2")} style={{ ...btnSm(tab === "paso2" ? "accent" : "default"), fontSize: 10 }}>Paso 2 · Escena</button>
            </>
          ) : (
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
              ✨ Render IA
            </span>
          )}
          <div style={{ flex: 1 }} />
          <a href={mostrarUrl} download="render.webp" target="_blank" rel="noopener noreferrer"
            style={{ ...btnSm("accent"), textDecoration: "none", display: "inline-block" }}>
            ⬇ Descargar
          </a>
        </div>
        <img src={mostrarUrl} alt="render IA" style={{ width: "100%", height: "auto", display: "block" }} />
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
        Configurá el prompt y presioná Generar render
      </div>
    </div>
  );
}

// ── PanelSVG ──────────────────────────────────────────────────────────────────

function PanelSVG({ bloques, idsBajos, idsAltos, altoCielorraso, composicionOverride, modulos, compact = false }) {
  const bloquesAltos = bloques.filter(b => idsAltos.includes(b.id));
  const bloquesBajos = bloques.filter(b => idsBajos.includes(b.id));
  const svgProps = { bloquesAltos, bloquesBajos, altoCielorraso, modulos, composicionOverride, onSelect: null, selectedId: null, temaClaro: true, fitToModules: true };
  return (
    <div style={{
      flex: 1, background: "#FAFAF7", border: "1px solid var(--border)",
      borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 8,
    }}>
      <SVGPlano {...svgProps} />
    </div>
  );
}

// ── PanelPromptBase ───────────────────────────────────────────────────────────

function PanelPromptBase({ value, onChange, onReset }) {
  const [abierto,  setAbierto]  = useState(false);
  const [editando, setEditando] = useState(false);
  const [draft,    setDraft]    = useState(value);

  const guardar = () => { onChange(draft); setEditando(false); };
  const cancelar = () => { setDraft(value); setEditando(false); };

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <div
        onClick={() => { if (!editando) setAbierto(a => !a); }}
        style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: editando ? "default" : "pointer", userSelect: "none" }}
      >
        <span style={{ fontSize: 10, color: "var(--text-muted)", transition: "transform 0.15s", display: "inline-block", transform: abierto ? "rotate(90deg)" : "none" }}>▶</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-secondary)" }}>
          Prompt base estructural
        </span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
          {value === DEFAULT_PROMPT_BASE ? "default" : "personalizado"}
        </span>
      </div>

      {abierto && (
        <div style={{ padding: "0 14px 14px 14px", borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {editando ? (
            <>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={12}
                style={{ ...inp, resize: "vertical", fontSize: 12, lineHeight: 1.5 }}
                autoFocus
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={guardar}  style={btnSm("accent")}>Guardar</button>
                <button onClick={cancelar} style={btnSm()}>Cancelar</button>
                <button onClick={() => { setDraft(DEFAULT_PROMPT_BASE); onChange(DEFAULT_PROMPT_BASE); setEditando(false); }} style={btnSm("danger")}>
                  Restaurar default
                </button>
              </div>
            </>
          ) : (
            <>
              <pre style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.55, whiteSpace: "pre-wrap", fontFamily: "'Bricolage Grotesque',sans-serif" }}>
                {value}
              </pre>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { setDraft(value); setEditando(true); }} style={btnSm()}>✎ Editar</button>
                {value !== DEFAULT_PROMPT_BASE && (
                  <button onClick={() => { onChange(DEFAULT_PROMPT_BASE); setDraft(DEFAULT_PROMPT_BASE); }} style={btnSm("danger")}>
                    Restaurar default
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Modelos disponibles ───────────────────────────────────────────────────────

// ── PanelConfigAvanzada ───────────────────────────────────────────────────────

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
        {hint && <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>{hint}</span>}
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

function PanelConfigAvanzada({ guidance, onGuidance, controlStrength, onControlStrength, tieneImagen }) {
  const [abierto, setAbierto] = useState(false);

  const hintGuidance = guidance <= 15 ? "muy libre" : guidance <= 40 ? "balance" : guidance <= 70 ? "literal" : "muy literal";
  const hintControl  = controlStrength <= 0.25 ? "ignora estructura" : controlStrength <= 0.55 ? "balance" : "respeta estructura";

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <div onClick={() => setAbierto(a => !a)}
        style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", transition: "transform 0.15s", display: "inline-block", transform: abierto ? "rotate(90deg)" : "none" }}>▶</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-secondary)" }}>
          Configuración avanzada
        </span>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
          guidance {guidance}{tieneImagen ? ` · strength ${controlStrength}` : ""}
        </span>
      </div>

      {abierto && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
          <SliderParam
            label="Guidance" value={guidance} min={1} max={100} step={1}
            onChange={onGuidance} hint={hintGuidance}
            izq="1 — libre" der="100 — literal"
          />
          {tieneImagen && (
            <SliderParam
              label="Control strength" value={controlStrength} min={0.05} max={0.95} step={0.05}
              onChange={onControlStrength} hint={hintControl}
              izq="0.05 — ignora" der="0.95 — estructura"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── VariableItem ──────────────────────────────────────────────────────────────

function VariableItem({ config, value, onChange }) {
  const [abierto,   setAbierto]   = useState(false);
  const [custom,    setCustom]    = useState("");
  const [modoCustom, setModoCustom] = useState(false);

  const seleccionar = (val) => {
    onChange(val);
    setAbierto(false);
    setModoCustom(false);
  };

  const limpiar = (e) => { e.stopPropagation(); onChange(null); setModoCustom(false); };

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      {/* Fila principal */}
      <div
        onClick={() => setAbierto(a => !a)}
        style={{ padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}
      >
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
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontStyle: "italic" }}>
            default: {config.default}
          </span>
        )}
        <span style={{ fontSize: 9, color: "var(--text-muted)", transition: "transform 0.15s", display: "inline-block", transform: abierto ? "rotate(180deg)" : "none" }}>▼</span>
      </div>

      {/* Opciones desplegables */}
      {abierto && (
        <div style={{ padding: "8px 12px 12px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {config.opciones.map(op => (
              <button
                key={op}
                onClick={() => seleccionar(op)}
                style={{
                  ...btnSm(value === op ? "accent" : "default"),
                  fontSize: 11, padding: "5px 10px",
                }}
              >
                {op}
              </button>
            ))}
            <button
              onClick={() => setModoCustom(mc => !mc)}
              style={{ ...btnSm(modoCustom ? "accent" : "default"), fontSize: 11, padding: "5px 10px" }}
            >
              ✎ personalizado
            </button>
          </div>
          {modoCustom && (
            <div style={{ display: "flex", gap: 6 }}>
              <input
                autoFocus
                value={custom}
                onChange={e => setCustom(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && custom.trim()) seleccionar(custom.trim()); }}
                placeholder={`Describí ${config.label.toLowerCase()}…`}
                style={{ ...inp, flex: 1, fontSize: 12 }}
              />
              <button onClick={() => { if (custom.trim()) seleccionar(custom.trim()); }} style={btnSm("accent")}>
                Ok
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── GestorPrompts ─────────────────────────────────────────────────────────────

function GestorPrompts({ prompts, onEliminar, onActualizar, onUsar }) {
  const [expandido,  setExpandido]  = useState(null);
  const [editando,   setEditando]   = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const guardarEdicion = () => {
    if (!editando) return;
    onActualizar(editando.id, { nombre: editando.nombre, texto: editando.texto });
    setEditando(null);
  };

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: prompts.length ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", flex: 1 }}>
          Configuraciones guardadas{" "}
          {prompts.length > 0 && <span style={{ color: "var(--accent)" }}>({prompts.length})</span>}
        </span>
        {prompts.length === 0 && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Guardá configuraciones para reutilizarlas</span>
        )}
      </div>

      {prompts.map((p, idx) => (
        <div key={p.id} style={{ borderBottom: idx < prompts.length - 1 ? "1px solid var(--border)" : "none" }}>
          <div
            onClick={() => { setExpandido(expandido === p.id ? null : p.id); setEditando(null); setConfirmDel(null); }}
            style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none", background: expandido === p.id ? "var(--bg-subtle)" : "transparent" }}
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
          {expandido === p.id && (
            <div style={{ padding: "0 14px 12px 32px" }}>
              {editando?.id === p.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input value={editando.nombre} onChange={e => setEditando({ ...editando, nombre: e.target.value })} placeholder="Nombre" style={{ ...inp, fontSize: 12 }} />
                  <textarea value={editando.texto} onChange={e => setEditando({ ...editando, texto: e.target.value })} rows={4} style={{ ...inp, resize: "vertical", fontSize: 12 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={guardarEdicion} style={btnSm("accent")}>Guardar</button>
                    <button onClick={() => setEditando(null)} style={btnSm()}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <pre style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, whiteSpace: "pre-wrap", fontFamily: "'Bricolage Grotesque',sans-serif" }}>
                  {p.texto}
                </pre>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── PanelPaso2 ────────────────────────────────────────────────────────────

function PanelPaso2({ imagenUrl, onGenerar, generando, variables, onVariable, imagePromptStrength, onStrength }) {
  const [abierto,       setAbierto]       = useState(false);
  const [promptAbierto, setPromptAbierto] = useState(false);
  const [editando,      setEditando]      = useState(false);
  const [promptOverride, setPromptOverride] = useState(null); // null = auto

  useEffect(() => { if (imagenUrl) setAbierto(true); }, [imagenUrl]);
  if (!imagenUrl) return null;

  const escenaVars  = VARIABLES_CONFIG.filter(v => ESCENA_IDS.includes(v.id));
  const promptAuto  = buildScenePrompt(variables);
  const promptFinal = promptOverride ?? promptAuto;
  const esPersonalizado = promptOverride !== null;

  const etiqueta = imagePromptStrength >= 0.75 ? "muy fiel al mueble"
                 : imagePromptStrength >= 0.50 ? "balance mueble / escena"
                 : "más libertad de escena";

  const handleVariableChange = (id, val) => {
    onVariable(id, val);
    // si no hay override, el prompt auto se actualiza solo
  };

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--accent-border)", borderRadius: 10, overflow: "hidden" }}>
      <div onClick={() => setAbierto(a => !a)} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", transition: "transform 0.15s", display: "inline-block", transform: abierto ? "rotate(90deg)" : "none" }}>▶</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--accent)" }}>
          Paso 2 — Colocar en escena
        </span>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>flux-1.1-pro · IP-Adapter</span>
      </div>

      {abierto && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Variables de escena */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {escenaVars.map(vc => (
              <VariableItem key={vc.id} config={vc} value={variables[vc.id] ?? null} onChange={val => handleVariableChange(vc.id, val)} />
            ))}
          </div>

          {/* Prompt de escena — acordeón */}
          <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <div
              onClick={() => { if (!editando) setPromptAbierto(a => !a); }}
              style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, cursor: editando ? "default" : "pointer", userSelect: "none" }}
            >
              <span style={{ fontSize: 9, color: "var(--text-muted)", transition: "transform 0.15s", display: "inline-block", transform: promptAbierto ? "rotate(90deg)" : "none" }}>▶</span>
              <span style={{ flex: 1, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)" }}>
                Prompt de escena
              </span>
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: esPersonalizado ? "var(--accent)" : "var(--text-muted)" }}>
                {esPersonalizado ? "personalizado" : "auto"}
              </span>
            </div>
            {promptAbierto && (
              <div style={{ padding: "0 12px 12px", borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {editando ? (
                  <>
                    <textarea
                      value={promptFinal}
                      onChange={e => setPromptOverride(e.target.value)}
                      rows={5}
                      style={{ ...inp, resize: "vertical", fontSize: 11, lineHeight: 1.5 }}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setEditando(false)} style={btnSm("accent")}>Guardar</button>
                      {esPersonalizado && (
                        <button onClick={() => { setPromptOverride(null); setEditando(false); }} style={btnSm("danger")}>
                          Restaurar auto
                        </button>
                      )}
                      <button onClick={() => { setPromptOverride(null); setEditando(false); }} style={btnSm()}>Cancelar</button>
                    </div>
                  </>
                ) : (
                  <>
                    <pre style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.55, whiteSpace: "pre-wrap", fontFamily: "'Bricolage Grotesque',sans-serif" }}>
                      {promptFinal}
                    </pre>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setPromptOverride(promptFinal); setEditando(true); }} style={btnSm()}>✎ Editar</button>
                      {esPersonalizado && (
                        <button onClick={() => setPromptOverride(null)} style={btnSm("danger")}>Restaurar auto</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Slider fidelidad */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Fidelidad al mueble
              </span>
              <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 4, padding: "1px 7px" }}>
                {imagePromptStrength}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>{etiqueta}</span>
            </div>
            <input type="range" min="0.30" max="0.95" step="0.05" value={imagePromptStrength}
              onChange={e => onStrength(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
              <span>0.30 — más libertad</span>
              <span>0.60 — balance</span>
              <span>0.95 — muy fiel</span>
            </div>
          </div>

          <button onClick={() => onGenerar(promptFinal)} disabled={generando} style={{ ...btnSm("accent"), padding: "8px 18px", fontSize: 12, opacity: generando ? 0.4 : 1, cursor: generando ? "default" : "pointer" }}>
            {generando ? "⏳ Generando escena…" : "▶ Generar escena"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── PanelVariables ────────────────────────────────────────────────────────

// Variables del Paso 1 (excluye las de escena que van al Paso 2)
const VARS_PASO1 = VARIABLES_CONFIG.filter(v => !ESCENA_IDS.includes(v.id));

function PanelVariables({ variables, onCambio }) {
  const [abierto, setAbierto] = useState(false);
  const activas = VARS_PASO1.filter(v => variables[v.id]).length;

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <div
        onClick={() => setAbierto(a => !a)}
        style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}
      >
        <span style={{ fontSize: 10, color: "var(--text-muted)", transition: "transform 0.15s", display: "inline-block", transform: abierto ? "rotate(90deg)" : "none" }}>▶</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-secondary)" }}>
          Variables del mueble
        </span>
        {activas > 0 && (
          <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 4, padding: "1px 7px" }}>
            {activas} personalizada{activas !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      {abierto && (
        <div style={{ borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 1 }}>
          {VARS_PASO1.map(vc => (
            <VariableItem
              key={vc.id}
              config={vc}
              value={variables[vc.id] ?? null}
              onChange={val => onCambio(vc.id, val)}
            />
          ))}
        </div>
      )}
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
  const planKey   = estado === "trialing" ? "trialing" : (plan_id || "plata");
  const plan      = PLANES_RENDER[planKey] ?? PLANES_RENDER.plata;
  const usados    = renders_usados || 0;
  const limite    = plan.renders;
  const restantes = limite === null ? Infinity : Math.max(0, limite - usados);
  return { usados, limite, restantes, bloqueado: restantes === 0 };
}

function derivarSecuencias(bloques) {
  return {
    idsBajos: bloques.filter(b => b.tipoVisual !== "aereo").map(b => b.id),
    idsAltos: bloques.filter(b => b.tipoVisual === "aereo").map(b => b.id),
  };
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
  // Config persistida
  const savedCfg = leerConfigRender();

  const [modo, setModo]               = useState("split");
  const [bloques, setBloques]         = useState([]);
  const [idsBajos, setIdsBajos]       = useState([]);
  const [idsAltos, setIdsAltos]       = useState([]);
  const [alto, setAlto]               = useState(2400);
  const [wsId, setWsId]               = useState(null);
  const [generando, setGenerando]         = useState(false);
  const [imagenUrl, setImagenUrl]         = useState(null);
  const [errorRender, setErrorRender]     = useState(null);
  const [renderListo, setRenderListo]     = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [debugInfo, setDebugInfo]         = useState(null);
  const [imagenEscenaUrl, setImagenEscenaUrl] = useState(null);
  const [generandoEscena, setGenerandoEscena] = useState(false);
  const [variablesEscena, setVariablesEscena] = useState({});
  const [imagePromptStrength, setImagePromptStrength] = useState(0.70);
  const [refPreview, setRefPreview]   = useState(null);

  // Prompt base (persistido)
  const [promptBase, setPromptBase]       = useState(savedCfg.promptBase ?? DEFAULT_PROMPT_BASE);
  // Variables dinámicas (persistidas)
  const [variables, setVariables]         = useState(savedCfg.variables ?? {});
  // Config avanzada (persistida)
  const [guidance, setGuidance]               = useState(savedCfg.guidance ?? 30);
  const [controlStrength, setControlStrength] = useState(savedCfg.controlStrength ?? 0.55);

  // Prompts guardados
  const [prompts, setPrompts]         = useState(() => leerPromptsRender());
  const [nombreGuardar, setNombreGuardar] = useState("");
  const [guardadoOk, setGuardadoOk]   = useState(false);

  const prevKeyRef = useRef(null);

  useEffect(() => {
    supabase.from("workspaces").select("id").single().then(({ data }) => {
      if (data) setWsId(data.id);
    });
  }, []);

  // Helper para persistir config completa
  const persistirConfig = (patch) =>
    guardarConfigRender({ promptBase, variables, guidance, controlStrength, ...patch });

  const actualizarPromptBase = (val) => { setPromptBase(val); persistirConfig({ promptBase: val }); };
  const actualizarVariable = (id, val) => {
    const nuevas = { ...variables, [id]: val };
    setVariables(nuevas);
    persistirConfig({ variables: nuevas });
  };
  const actualizarGuidance       = (val) => { setGuidance(val);       persistirConfig({ guidance: val }); };
  const actualizarControlStrength = (val) => { setControlStrength(val); persistirConfig({ controlStrength: val }); };

  const persistirPrompts = (nuevo) => { setPrompts(nuevo); guardarPromptsRender(nuevo); };

  const promptCompleto = ensamblarPrompt(promptBase, variables);

  const handleGenerar = async () => {
    if (!wsId) return;
    setGenerando(true);
    setErrorRender(null);
    setImagenUrl(null);
    try {
      let imageBase64 = null;
      if (bloques.length > 0) {
        const bloquesAltosRef = bloques.filter(b => idsAltos.includes(b.id));
        const bloquesBajosRef = bloques.filter(b => idsBajos.includes(b.id));
        try {
          imageBase64 = await generarImagenReferencia({ bloquesAltos: bloquesAltosRef, bloquesBajos: bloquesBajosRef, composicionOverride, modulos });
        } catch (imgErr) {
          setErrorRender(`Error generando imagen de referencia: ${imgErr.message}`);
          return;
        }
      }
      setDebugInfo(imageBase64
        ? `img2img · control_strength=${controlStrength} · guidance=${guidance}`
        : "text2img · sin imagen de referencia"
      );
      const res = await fetch("/api/generate-render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: wsId, prompt: promptCompleto, imageBase64, guidance, controlStrength }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorRender(data.error || "Error al generar"); return; }
      setImagenUrl(data.imageUrl);
      setRenderListo(true);
      if (onRenderGenerado) onRenderGenerado();
    } catch (e) {
      setErrorRender(e.message);
    } finally {
      setGenerando(false);
    }
  };

  const handleGenerarEscena = async (prompt) => {
    if (!wsId || !imagenUrl) return;
    setGenerandoEscena(true);
    setErrorRender(null);
    try {
      const b64 = await urlToBase64(imagenUrl);
      const res = await fetch("/api/generate-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: wsId, prompt, imageBase64: b64, imagePromptStrength }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorRender(data.error || "Error al generar escena"); return; }
      setImagenEscenaUrl(data.imageUrl);
    } catch (e) {
      setErrorRender(e.message);
    } finally {
      setGenerandoEscena(false);
    }
  };

  const handleVerReferencia = async () => {
    const bloquesAltosRef = bloques.filter(b => idsAltos.includes(b.id));
    const bloquesBajosRef = bloques.filter(b => idsBajos.includes(b.id));
    try {
      const b64 = await generarImagenReferencia({ bloquesAltos: bloquesAltosRef, bloquesBajos: bloquesBajosRef, composicionOverride, modulos });
      setRefPreview(`data:image/jpeg;base64,${b64}`);
    } catch (e) {
      setErrorRender("Error generando preview: " + e.message);
    }
  };

  const handleGuardarPrompt = () => {
    if (!nombreGuardar.trim()) return;
    persistirPrompts([...prompts, { id: crypto.randomUUID(), nombre: nombreGuardar.trim(), texto: promptCompleto, creadoEn: Date.now() }]);
    setNombreGuardar("");
    setGuardadoOk(true);
    setTimeout(() => setGuardadoOk(false), 1800);
  };

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
  const puedeGenerar = !generando && !creditos.bloqueado;

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
            <BtnModo activo={modo === "render"} onClick={() => { setModo("render"); setRenderListo(false); }}>
              ✨ Render{renderListo && modo !== "render" ? " ●" : ""}
            </BtnModo>
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
      {!sinDatos && modo === "render" && <PanelRender imagenUrl={imagenUrl} imagenEscenaUrl={imagenEscenaUrl} generando={generando} generandoEscena={generandoEscena} />}
      {!sinDatos && modo === "split"  && (
        <div style={{ display: "flex", gap: 12, alignItems: "stretch", minHeight: 360 }}>
          <PanelSVG {...svgProps} compact />
          <PanelRender imagenUrl={imagenUrl} imagenEscenaUrl={imagenEscenaUrl} generando={generando} generandoEscena={generandoEscena} compact />
        </div>
      )}

      {/* Panel de configuración — visible si hay plano */}
      {!sinDatos && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Config avanzada */}
          <PanelConfigAvanzada
            guidance={guidance}
            onGuidance={actualizarGuidance}
            controlStrength={controlStrength}
            onControlStrength={actualizarControlStrength}
            tieneImagen={bloques.length > 0}
          />

          {/* Paso 2 — escena */}
          <PanelPaso2
            imagenUrl={imagenUrl}
            onGenerar={handleGenerarEscena}
            generando={generandoEscena}
            variables={variablesEscena}
            onVariable={(id, val) => setVariablesEscena(prev => ({ ...prev, [id]: val }))}
            imagePromptStrength={imagePromptStrength}
            onStrength={setImagePromptStrength}
          />

          {/* Prompt base */}
          <PanelPromptBase
            value={promptBase}
            onChange={actualizarPromptBase}
          />

          {/* Variables dinámicas — acordeón */}
          <PanelVariables variables={variables} onCambio={actualizarVariable} />

          {/* Acciones: generar */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={handleGenerar}
                disabled={!puedeGenerar}
                style={{ ...btnSm("accent"), padding: "8px 18px", fontSize: 12, opacity: puedeGenerar ? 1 : 0.4, cursor: puedeGenerar ? "pointer" : "default" }}
              >
                {generando ? "⏳ Generando…" : "▶ Generar render"}
              </button>
              {creditos && (
                <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: creditos.bloqueado ? "#e07070" : "var(--text-muted)" }}>
                  {creditos.bloqueado
                    ? "Sin renders este mes"
                    : creditos.limite === null
                      ? `${creditos.usados} usados · ∞`
                      : `${creditos.limite - creditos.usados} render${creditos.limite - creditos.usados !== 1 ? "s" : ""} disponible${creditos.limite - creditos.usados !== 1 ? "s" : ""}`}
                </span>
              )}
              <div style={{ flex: 1 }} />
              {/* Guardar configuración actual */}
              <input
                value={nombreGuardar}
                onChange={e => setNombreGuardar(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleGuardarPrompt(); }}
                placeholder="Nombre para guardar…"
                style={{ ...inp, width: "auto", flex: "1 1 160px", fontSize: 12 }}
              />
              <button
                onClick={handleGuardarPrompt}
                disabled={!nombreGuardar.trim()}
                style={{ ...btnSm(guardadoOk ? "accent" : "default"), opacity: nombreGuardar.trim() ? 1 : 0.4 }}
              >
                {guardadoOk ? "✓ Guardado" : "Guardar config"}
              </button>
            </div>

            {/* Debug: ver imagen de referencia */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={handleVerReferencia} style={{ ...btnSm(), fontSize: 11 }}>
                🔍 Ver imagen de referencia
              </button>
              {refPreview && (
                <button onClick={() => setRefPreview(null)} style={{ ...btnSm("danger"), fontSize: 11 }}>✕ cerrar</button>
              )}
            </div>
          </div>

          {/* Debug info */}
          {debugInfo && (
            <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", padding: "4px 0" }}>
              {debugInfo}
            </div>
          )}

          {/* Error */}
          {errorRender && (
            <div style={{ fontSize: 12, color: "#e07070", fontFamily: "'DM Mono',monospace", padding: "8px 12px", background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.25)", borderRadius: 7 }}>
              ⚠ {errorRender}
            </div>
          )}

          {/* Preview imagen de referencia */}
          {refPreview && (
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
                Imagen de referencia → Replicate
              </div>
              <img src={refPreview} alt="referencia" style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
          )}

          {/* Configuraciones guardadas */}
          <GestorPrompts
            prompts={prompts}
            onUsar={(texto) => {
              // Cargar el prompt completo en el base (no hay separación simple)
              actualizarPromptBase(texto);
            }}
            onEliminar={(id) => persistirPrompts(prompts.filter(p => p.id !== id))}
            onActualizar={(id, cambios) => persistirPrompts(prompts.map(p => p.id === id ? { ...p, ...cambios } : p))}
          />

        </div>
      )}
    </div>
  );
}
