import React, { useState, useEffect, useRef } from "react";
import { SectionTitle } from "../ui/index.jsx";
import { leerPlano, leerPromptsRender, guardarPromptsRender, leerConfigRender, guardarConfigRender } from "../../storage.js";
import { PLANES_RENDER } from "../../constants.js";
import { supabase } from "../../lib/supabase.js";
import { generarImagenReferencia } from "../plano/planoUtils.js";
import SVGPlano from "../plano/SVGPlano.jsx";

// ── Prompt base por defecto ───────────────────────────────────────────────────

const DEFAULT_PROMPT_BASE =
`Render fotorrealista de alta calidad de [TIPO_DE_MUEBLE], manteniendo la estructura y proporciones principales de la imagen de referencia.

Material principal: [MATERIAL]
Color: [COLOR]
Acabado: [ACABADO]

Iluminación: [ILUMINACION]
Fondo/Ambiente: [FONDO]
Accesorios decorativos: [ACCESORIOS]

Perspectiva: [PERSPECTIVA]
Tipo de cámara: [CAMARA]

Estilo visual: [ESTILO]
Nivel de detalle: [DETALLE]

Materiales ultra realistas, texturas naturales, sombras suaves, reflejos coherentes, profundidad realista, iluminación cinematográfica, visualización arquitectónica premium, fotografía profesional de interiores, ultra detallado, render hiperrealista, alta resolución.`;

// ── Variables dinámicas ───────────────────────────────────────────────────────

const VARIABLES_CONFIG = [
  {
    id: "tipo_mueble", label: "Tipo de mueble", icon: "🪑", placeholder: "[TIPO_DE_MUEBLE]",
    default: "mueble de cocina",
    opciones: ["mueble de cocina", "placard", "bajo mesada", "alacena", "cajonera", "rack de living", "mueble de baño", "biblioteca"],
  },
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
  {
    id: "detalle", label: "Nivel de detalle", icon: "🔬", placeholder: "[DETALLE]",
    default: "ultra detallado",
    opciones: ["ultra detallado", "detalle normal", "simplificado"],
  },
];

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

function PanelConfigAvanzada({ promptStrength, onPromptStrength, tieneImagen }) {
  const [abierto, setAbierto] = useState(false);

  const etiquetaFuerza = promptStrength <= 0.40 ? "respeta mucho la estructura"
    : promptStrength <= 0.60 ? "balance estructura / estilo"
    : promptStrength <= 0.75 ? "más libertad creativa"
    : "casi ignora la estructura";

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <div
        onClick={() => setAbierto(a => !a)}
        style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}
      >
        <span style={{ fontSize: 10, color: "var(--text-muted)", transition: "transform 0.15s", display: "inline-block", transform: abierto ? "rotate(90deg)" : "none" }}>▶</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-secondary)" }}>
          Configuración avanzada
        </span>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
          flux-canny-pro{tieneImagen ? ` · fuerza ${promptStrength}` : ""}
        </span>
      </div>

      {abierto && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Slider prompt_strength — solo cuando hay imagen de referencia */}
          {tieneImagen && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Fuerza del prompt
                </span>
                <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 4, padding: "1px 7px" }}>
                  {promptStrength}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                  {etiquetaFuerza}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>↔ estructura</span>
                <input
                  type="range" min="0.10" max="0.95" step="0.05"
                  value={promptStrength}
                  onChange={e => onPromptStrength(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--accent)" }}
                />
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>texto ↔</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                <span>0.10 — copia la imagen</span>
                <span>0.50 — balance</span>
                <span>0.95 — ignora imagen</span>
              </div>
            </div>
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

// ── PanelVariables ────────────────────────────────────────────────────────

function PanelVariables({ variables, onCambio }) {
  const [abierto, setAbierto] = useState(false);
  const activas = VARIABLES_CONFIG.filter(v => variables[v.id]).length;

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <div
        onClick={() => setAbierto(a => !a)}
        style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}
      >
        <span style={{ fontSize: 10, color: "var(--text-muted)", transition: "transform 0.15s", display: "inline-block", transform: abierto ? "rotate(90deg)" : "none" }}>▶</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-secondary)" }}>
          Variables del render
        </span>
        {activas > 0 && (
          <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 4, padding: "1px 7px" }}>
            {activas} personalizada{activas !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      {abierto && (
        <div style={{ borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 1 }}>
          {VARIABLES_CONFIG.map(vc => (
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
  const [generando, setGenerando]     = useState(false);
  const [imagenUrl, setImagenUrl]     = useState(null);
  const [errorRender, setErrorRender] = useState(null);
  const [renderListo, setRenderListo] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [debugInfo, setDebugInfo]     = useState(null);
  const [refPreview, setRefPreview]   = useState(null);

  // Prompt base (persistido)
  const [promptBase, setPromptBase]       = useState(savedCfg.promptBase ?? DEFAULT_PROMPT_BASE);
  // Variables dinámicas (persistidas)
  const [variables, setVariables]         = useState(savedCfg.variables ?? {});
  // Config avanzada (persistida)
  const [promptStrength, setPromptStrength] = useState(savedCfg.promptStrength ?? 0.45);

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
    guardarConfigRender({ promptBase, variables, promptStrength, ...patch });

  const actualizarPromptBase = (val) => { setPromptBase(val); persistirConfig({ promptBase: val }); };
  const actualizarVariable = (id, val) => {
    const nuevas = { ...variables, [id]: val };
    setVariables(nuevas);
    persistirConfig({ variables: nuevas });
  };
  const actualizarPromptStrength = (val) => { setPromptStrength(val); persistirConfig({ promptStrength: val }); };

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
      const controlStrength = parseFloat((1 - promptStrength).toFixed(2));
      const guidanceVal     = Math.round(5 + promptStrength * 23);
      setDebugInfo(imageBase64
        ? `img2img · control_strength=${controlStrength} · guidance=${guidanceVal}`
        : "text2img · sin imagen de referencia"
      );
      const res = await fetch("/api/generate-render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: wsId, prompt: promptCompleto, imageBase64, promptStrength }),
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
      {!sinDatos && modo === "render" && <PanelRender imagenUrl={imagenUrl} generando={generando} />}
      {!sinDatos && modo === "split"  && (
        <div style={{ display: "flex", gap: 12, alignItems: "stretch", minHeight: 360 }}>
          <PanelSVG {...svgProps} compact />
          <PanelRender imagenUrl={imagenUrl} generando={generando} compact />
        </div>
      )}

      {/* Panel de configuración — visible si hay plano */}
      {!sinDatos && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Config avanzada */}
          <PanelConfigAvanzada
            promptStrength={promptStrength}
            onPromptStrength={actualizarPromptStrength}
            tieneImagen={bloques.length > 0}
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
