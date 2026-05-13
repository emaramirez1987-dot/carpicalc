import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import ReactDOM from 'react-dom';
import { useNav } from '../../state/NavContext.jsx';
import { useUndo } from '../../hooks/useUndo.js';
import { useTema } from '../../hooks/useTema.js';
import { Btn, Card, Badge, SectionTitle } from '../ui/index.jsx';
import { fmtPeso, fmtNum, calcularModulo, comprimirImagen } from '../../utils.js';
import VistaModuloSVG from '../vista-svg/index.js';
import { PERFIL_VACIO, TIPO_MAT, CATEGORIAS_DEFAULT } from '../../constants.js';
import { guardarPresupuestos, cargarBorradorModulo } from '../../storage.js';
import FormModulo from './FormModulo.jsx';

const VisorModulo3D = lazy(() => import('../visor3d/VisorModulo3D.jsx'));

// ══════════════════════════════════════════════════════════════════
// ── CatalogoModulos ───────────────────────────────────────────────
function AccionesModulo({ onEditar, onEliminar, onDuplicar, onAbrirVista, on3D, presupuestosAfectados = [] }) {
  const [confirmar, setConfirmar] = useState(false);
  const tieneAfectados = presupuestosAfectados.length > 0;
  const iconBtn = (color, bg, border) => ({
    width: 28, height: 28, borderRadius: 6, fontSize: 14, lineHeight: 1,
    cursor: "pointer", transition: "all 0.15s", display: "flex",
    alignItems: "center", justifyContent: "center",
    background: bg, border, color, flexShrink: 0,
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
      {/* Fila de iconos compactos */}
      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={onEditar} title="Editar"
          style={iconBtn("var(--accent)", "var(--accent-soft)", "1px solid var(--accent-border)")}>✎</button>
        <button onClick={onDuplicar} title="Duplicar"
          style={iconBtn("#7090b0", "rgba(112,144,176,0.12)", "1px solid rgba(112,144,176,0.30)")}>⧉</button>
        {onAbrirVista && (
          <button onClick={onAbrirVista} title="Editor visual"
            style={iconBtn("#8090c0", "rgba(128,144,192,0.12)", "1px solid rgba(128,144,192,0.30)")}>▣</button>
        )}
        {on3D && (
          <button onClick={on3D} title="Vista 3D"
            style={iconBtn("#70b090", "rgba(112,176,144,0.12)", "1px solid rgba(112,176,144,0.30)")}>◈</button>
        )}
        <button onClick={() => setConfirmar(v => !v)} title="Eliminar"
          style={iconBtn("#e07070", confirmar ? "rgba(200,60,60,0.15)" : "transparent", "1px solid rgba(200,60,60,0.30)")}>×</button>
      </div>
      {/* Confirmación de borrado — aparece debajo */}
      {confirmar && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
          {tieneAfectados && (
            <div style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(200,100,50,0.10)", border: "1px solid rgba(200,100,50,0.28)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#d47a50", fontFamily: "'DM Mono',monospace", marginBottom: 3 }}>
                ⚠ Usado en {presupuestosAfectados.length} presupuesto{presupuestosAfectados.length > 1 ? "s" : ""}
              </div>
              {presupuestosAfectados.slice(0, 3).map((nombre, i) => (
                <div key={i} style={{ fontSize: 10, color: "var(--text-muted)", paddingLeft: 6 }}>· {nombre || "Sin nombre"}</div>
              ))}
              {presupuestosAfectados.length > 3 && (
                <div style={{ fontSize: 10, color: "var(--text-muted)", paddingLeft: 6 }}>· y {presupuestosAfectados.length - 3} más...</div>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => { onEliminar(); setConfirmar(false); }}
              style={{ flex: 1, padding: "5px 0", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070" }}>
              ✓ {tieneAfectados ? "borrar igual" : "confirmar"}
            </button>
            <button onClick={() => setConfirmar(false)}
              style={{ padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function VistaToggle({ vista, onChange }) {
  const btn = (id, icon, lbl) => (
    <button
      onClick={() => onChange(id)}
      title={lbl}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        fontSize: 14,
        cursor: "pointer",
        transition: "all 0.15s",
        background: vista === id ? "var(--accent-soft)" : "var(--bg-surface)",
        border: `1px solid ${
          vista === id ? "var(--accent-border)" : "var(--border)"
        }`,
        color: vista === id ? "var(--accent)" : "var(--text-muted)"
      }}
    >
      {icon}
    </button>
  );
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {btn("grid", "⊞", "Cuadrícula")}
      {btn("list", "☰", "Lista")}
    </div>
  );
}
// ── Imagen de módulo ──────────────────────────────────────────────
function ImagenModulo({ imagen, cod, onSubir, onBorrar, compact = false }) {
  const inputRef = React.useRef();
  const [cargando, setCargando] = useState(false);
  const [modal, setModal] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCargando(true);
    try {
      const base64 = await comprimirImagen(file);
      onSubir(base64);
    } catch { /* silent */ } finally {
      setCargando(false);
      e.target.value = "";
    }
  };

  if (compact) {
    // Vista lista: miniatura 48×48
    return (
      <>
        <div
          onClick={() => imagen ? setModal(true) : inputRef.current?.click()}
          title={imagen ? "Ver imagen" : "Agregar imagen"}
          style={{
            width: 48, height: 48, flexShrink: 0, borderRadius: 8,
            overflow: "hidden", cursor: "pointer", position: "relative",
            background: "var(--bg-subtle)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "border-color 0.15s"
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
        >
          {imagen
            ? <img src={imagen} alt={cod} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 18, opacity: 0.35 }}>📷</span>
          }
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        {modal && imagen && (
          <ModalImagen imagen={imagen} cod={cod} onClose={() => setModal(false)} onBorrar={onBorrar} onCambiar={() => { setModal(false); setTimeout(() => inputRef.current?.click(), 100); }} />
        )}
      </>
    );
  }

  // Vista grid: franja superior de la tarjeta
  return (
    <>
      <div style={{ position: "relative", margin: "-20px -20px 14px -20px", height: 148, borderRadius: "12px 12px 0 0", overflow: "hidden", background: "var(--bg-subtle)" }}>
        {imagen ? (
          <>
            <img
              src={imagen} alt={cod}
              onClick={() => setModal(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in", display: "block", transition: "transform 0.3s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            />
            <button
              onClick={() => inputRef.current?.click()}
              title="Cambiar imagen"
              style={{
                position: "absolute", top: 8, right: 8, width: 28, height: 28,
                borderRadius: "50%", border: "none", cursor: "pointer",
                background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center",
                backdropFilter: "blur(4px)", transition: "background 0.15s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.8)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.55)"}
            >✎</button>
          </>
        ) : (
          <div
            onClick={() => !cargando && inputRef.current?.click()}
            style={{
              width: "100%", height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 6,
              cursor: cargando ? "wait" : "pointer",
              borderBottom: "1px dashed var(--border)",
              transition: "background 0.15s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--accent-soft)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ fontSize: 26, opacity: 0.3 }}>📷</span>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", fontWeight: 700 }}>
              {cargando ? "Procesando..." : "Agregar foto de referencia"}
            </span>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      {modal && imagen && (
        <ModalImagen imagen={imagen} cod={cod} onClose={() => setModal(false)} onBorrar={onBorrar} onCambiar={() => { setModal(false); setTimeout(() => inputRef.current?.click(), 100); }} />
      )}
    </>
  );
}

function ModalImagen({ imagen, cod, onClose, onBorrar, onCambiar }) {
  const [confirmBorrar, setConfirmBorrar] = useState(false);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(0,0,0,0.88)", display: "flex",
        alignItems: "center", justifyContent: "center",
        padding: 20, backdropFilter: "blur(6px)",
        animation: "fadeIn 0.2s ease"
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: 800, width: "100%", animation: "scaleIn 0.22s cubic-bezier(0.22,1,0.36,1)" }}>
        <img src={imagen} alt={cod} style={{ width: "100%", borderRadius: 12, display: "block", boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }} />
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
          {!confirmBorrar ? (
            <>
              <button onClick={onCambiar}
                style={{ padding: "7px 14px", borderRadius: 7, background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}>
                ✎ Cambiar
              </button>
              <button onClick={() => setConfirmBorrar(true)}
                style={{ padding: "7px 14px", borderRadius: 7, background: "rgba(180,40,40,0.65)", border: "1px solid rgba(255,100,100,0.3)", color: "#fff", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}>
                × Quitar
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { onBorrar(); onClose(); }}
                style={{ padding: "7px 14px", borderRadius: 7, background: "rgba(200,40,40,0.85)", border: "1px solid rgba(255,100,100,0.4)", color: "#fff", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer" }}>
                ✓ Confirmar
              </button>
              <button onClick={() => setConfirmBorrar(false)}
                style={{ padding: "7px 14px", borderRadius: 7, background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 12, fontFamily: "'DM Mono',monospace", cursor: "pointer" }}>
                Cancelar
              </button>
            </>
          )}
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            ×
          </button>
        </div>
        <div style={{ position: "absolute", bottom: 12, left: 16, fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.5)", padding: "4px 10px", borderRadius: 5, backdropFilter: "blur(4px)" }}>
          {cod}
        </div>
      </div>
    </div>
  );
}

function TarjetaModuloGrid({ cod, mod, c, onEditar, onEliminar, onDuplicar, onAbrirVista, on3D, onImagenChange, presupuestosAfectados = [] }) {
  return (
    <Card className="rsp-card">
      <ImagenModulo
        imagen={mod.imagen}
        cod={cod}
        onSubir={(b64) => onImagenChange(cod, b64)}
        onBorrar={() => onImagenChange(cod, null)}
      />
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--accent)" }}>
          {cod}
        </span>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: "var(--text-primary)" }}>
          {mod.nombre}
        </h3>
        {mod.descripcion && (
          <p style={{ fontSize: 12, marginTop: 2, color: "var(--text-muted)" }}>{mod.descripcion}</p>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
        <Badge>{TIPO_MAT[mod.material]}</Badge>
        <Badge color="#7090b0">{mod.piezas.length} piezas</Badge>
        <Badge color="#705090">{c.espesor}mm</Badge>
      </div>
      <p style={{ fontSize: 11, marginBottom: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
        {mod.dimensiones.ancho} × {mod.dimensiones.profundidad} × {mod.dimensiones.alto} mm
      </p>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* Métricas + precio — columna izquierda */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10, fontSize: 11 }}>
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>m² neto</div>
                <div style={{ fontFamily: "'DM Mono',monospace", color: "var(--color-positive-muted)" }}>{fmtNum(c.m2Neto)} m²</div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Tapacanto</div>
                <div style={{ fontFamily: "'DM Mono',monospace", color: "var(--accent)" }}>{fmtNum(c.metrosTapacanto, 2)} m</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Precio de venta</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 17, fontWeight: 700, marginTop: 2, color: "var(--color-positive)" }}>{fmtPeso(c.total)}</div>
            </div>
          </div>
          {/* Botones — columna derecha */}
          <AccionesModulo onEditar={onEditar} onEliminar={onEliminar} onDuplicar={onDuplicar} onAbrirVista={onAbrirVista} on3D={on3D} presupuestosAfectados={presupuestosAfectados} />
        </div>
      </div>
    </Card>
  );
}

// ── Botones de acción para vista móvil (4 en fila, ícono puro) ────
function AccionesMobileMod({ onEditar, onEliminar, onDuplicar, onAbrirVista, on3D, presupuestosAfectados = [] }) {
  const [confirmar, setConfirmar] = useState(false);
  const tieneAfectados = presupuestosAfectados.length > 0;
  const btnM = (onClick, icon, color, bg) => (
    <button onClick={onClick}
      style={{
        flex: 1, padding: "11px 0", fontSize: 17, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: bg, border: "none", borderRight: "1px solid var(--border)",
        color, transition: "background 0.15s",
      }}>
      {icon}
    </button>
  );
  return (
    <div>
      {confirmar && tieneAfectados && (
        <div style={{ padding: "6px 12px", background: "rgba(200,100,50,0.10)", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#d47a50", fontFamily: "'DM Mono',monospace" }}>
            ⚠ Usado en {presupuestosAfectados.length} presupuesto{presupuestosAfectados.length > 1 ? "s" : ""}
          </div>
        </div>
      )}
      <div style={{ display: "flex", borderTop: "1px solid var(--border)" }}>
        {btnM(onEditar,   "✎", "var(--accent)", "var(--accent-soft)")}
        {btnM(onDuplicar, "⧉", "#7090b0",       "rgba(112,144,176,0.08)")}
        {onAbrirVista && btnM(onAbrirVista, "▣", "#8090c0", "rgba(128,144,192,0.08)")}
        {on3D && btnM(on3D, "◈", "#70b090", "rgba(112,176,144,0.08)")}
        <button
          onClick={() => { if (confirmar) { onEliminar(); setConfirmar(false); } else setConfirmar(true); }}
          style={{
            flex: 1, padding: "11px 0", fontSize: confirmar ? 14 : 17, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: confirmar ? "rgba(200,60,60,0.15)" : "transparent",
            border: "none", color: "#e07070", transition: "all 0.15s",
          }}>
          {confirmar ? "✓" : "×"}
        </button>
      </div>
    </div>
  );
}

function FilaModuloLista({ cod, mod, c, onEditar, onEliminar, onDuplicar, onAbrirVista, on3D, onImagenChange, presupuestosAfectados = [] }) {
  const [expandido, setExpandido] = useState(false);
  return (
    <div
      style={{ borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border)", transition: "border-color 0.15s", overflow: "hidden" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
    >
      {/* ── DESKTOP: fila horizontal ── */}
      <div className="rsp-mod-desktop" style={{ alignItems: "center", gap: 14, padding: "10px 16px" }}>
        <ImagenModulo imagen={mod.imagen} cod={cod} compact
          onSubir={(b64) => onImagenChange(cod, b64)}
          onBorrar={() => onImagenChange(cod, null)}
        />
        <div style={{ flex: 2, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>{cod}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mod.nombre}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, overflow: "hidden" }}>
            {mod.descripcion && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 1 }}>{mod.descripcion}</span>
            )}
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--text-muted)", flexShrink: 0, whiteSpace: "nowrap" }}>
              {mod.dimensiones.ancho}×{mod.dimensiones.profundidad}×{mod.dimensiones.alto}mm
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <Badge>{TIPO_MAT[mod.material]}</Badge>
          <Badge>{c.espesor}mm</Badge>
        </div>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "var(--color-positive)", flexShrink: 0 }}>
          {fmtPeso(c.total)}
        </span>
        <AccionesModulo onEditar={onEditar} onEliminar={onEliminar} onDuplicar={onDuplicar} onAbrirVista={onAbrirVista} on3D={on3D} presupuestosAfectados={presupuestosAfectados} />
      </div>

      {/* ── MÓVIL: vertical con imagen como toggle ── */}
      <div className="rsp-mod-mobile">
        {/* Imagen — ancho completo, clic = desplegar */}
        <div
          onClick={() => setExpandido(v => !v)}
          style={{
            width: "100%", height: expandido ? 160 : 54, overflow: "hidden",
            background: "var(--bg-subtle)", cursor: "pointer", position: "relative",
            borderBottom: "1px solid var(--border)",
            transition: "height 0.25s cubic-bezier(0.22,1,0.36,1)"
          }}
        >
          {mod.imagen
            ? <img src={mod.imagen} alt={cod} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
                <span style={{ fontSize: expandido ? 22 : 15, opacity: 0.28 }}>📷</span>
                {!expandido && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>{cod} · {mod.nombre}</span>}
              </div>
            )
          }
          <div style={{
            position: "absolute", right: 8, bottom: 5, fontSize: 9,
            fontFamily: "'DM Mono',monospace", fontWeight: 700,
            color: "rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.38)",
            borderRadius: 4, padding: "2px 6px"
          }}>
            {expandido ? "▲" : "▼"}
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: "10px 14px 8px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>{cod}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{mod.nombre}</span>
          </div>
          {mod.descripcion && (
            <p style={{ fontSize: 11, marginTop: 2, color: "var(--text-muted)", fontStyle: "italic" }}>{mod.descripcion}</p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <Badge>{TIPO_MAT[mod.material]}</Badge>
            <Badge>{c.espesor}mm</Badge>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--text-muted)" }}>
              {mod.dimensiones.ancho}×{mod.dimensiones.profundidad}×{mod.dimensiones.alto}mm
            </span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "var(--color-positive)", marginLeft: "auto" }}>
              {fmtPeso(c.total)}
            </span>
          </div>
        </div>

        {/* Botones móvil */}
        <AccionesMobileMod onEditar={onEditar} onEliminar={onEliminar} onDuplicar={onDuplicar} onAbrirVista={onAbrirVista} on3D={on3D} presupuestosAfectados={presupuestosAfectados} />
      </div>
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════
// 8. CATÁLOGO
// ══════════════════════════════════════════════════════════════════
// ── CatalogoModulos ───────────────────────────────────────────────
function CatalogoModulos({
  modulos,
  setModulos,
  costos,
  onSave,
  setCostos,
  hSaveC,
  presupuestos,
  perfil,
  onGuardarPerfil,
  deepLinkCodigo = null,
  onDeepLinkConsumed,
  onVolverAlPresupuesto = null,
  origenEdicion = null,
  onGuardarPermanente = null,
  onGuardarPresupuestoAfectado = null, // (id, cambios) recalcula presupuesto afectado
}) {
  const { dispatch } = useNav();
  const [visor3D, setVisor3D] = useState(null); // { cod, mod }
  const [modo, setModo] = useState(() => {
    // Si hay un borrador de módulo nuevo en progreso, reabrir el formulario automáticamente
    const draft = cargarBorradorModulo();
    if (draft) return { tipo: "nuevo" };
    return null;
  });

  // Deep Link Nivel 3: abrir automáticamente el formulario de edición del módulo
  useEffect(() => {
    if (deepLinkCodigo && modulos[deepLinkCodigo]) {
      // Pasar el módulo completo — FormModulo lo usa para inicializar piezas y datos
      setModo({ tipo: "editar", codigo: deepLinkCodigo, modulo: modulos[deepLinkCodigo] });
      onDeepLinkConsumed && onDeepLinkConsumed();
      setTimeout(() => {
        document.getElementById("catalogo-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkCodigo]);
  const [msg, setMsg] = useState(null);
  const [vistaLayout, setVistaLayout] = useState(() => {
    try { return localStorage.getItem("carpicalc:catalogo_vista") || "grid"; }
    catch { return "grid"; }
  });
  const setVista = (v) => {
    setVistaLayout(v);
    try { localStorage.setItem("carpicalc:catalogo_vista", v); } catch {}
  };
  const [busqueda, setBusqueda] = useState("");
  const [categoriasColapsadas, setCategoriasColapsadas] = useState({});
  const { ToastContainer } = useUndo();
  const formRef = React.useRef(null);

  const abrirModo = (nuevoModo) => {
    setModo(nuevoModo);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const toggleCategoria = (id) => setCategoriasColapsadas(c => ({ ...c, [id]: !c[id] }));

  const showMsg = (texto, tipo = "ok") => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 3500);
  };

  const guardar = (codigo, datos) => {
    const soloPresupuesto  = datos._soloPresupuesto;
    const guardarCatalogo  = datos._guardarEnCatalogo;
    // Limpiar flags internos antes de guardar
    const datosSinFlags = { ...datos };
    delete datosSinFlags._soloPresupuesto;
    delete datosSinFlags._guardarEnCatalogo;

    const existente = modulos[codigo];
    const datosConImagen = existente?.imagen && !datosSinFlags.imagen
      ? { ...datosSinFlags, imagen: existente.imagen }
      : datosSinFlags;

    if (guardarCatalogo) {
      // Opción B: crear módulo permanente y eliminar el TEMP
      const newId = `MC${String(Date.now()).slice(-6)}`;
      const modPermanente = { ...datosConImagen, temporal: false, presupuestoId: undefined, origenCodigo: undefined };
      const todosMods = { ...modulos, [newId]: modPermanente };
      // Eliminar el TEMP original si existía
      if (existente?.temporal) delete todosMods[codigo];
      setModulos(todosMods);
      onSave(todosMods);
      // Notificar a AppInterna para que actualice referencias en el presupuesto
      if (onGuardarPermanente) onGuardarPermanente(codigo, newId);
      setModo(null);
      showMsg(`"${modPermanente.nombre}" guardado en catálogo.`);
    } else {
      // Opción A: solo en presupuesto (temporal) o guardado normal sin deep link
      const todosMods = { ...modulos, [codigo]: { ...datosConImagen, temporal: soloPresupuesto ? true : (existente?.temporal ?? false) } };
      setModulos(todosMods);
      onSave(todosMods);
      setModo(null);
      showMsg(
        modo?.tipo === "editar"  ? `"${codigo}" actualizado.`
        : modo?.tipo === "duplicar" ? `"${codigo}" duplicado.`
        : `"${codigo}" guardado.`
      );
    }

    // Cierre completo del ciclo: volver al presupuesto
    if (onVolverAlPresupuesto) {
      setTimeout(() => onVolverAlPresupuesto(), 600);
    }
  };

  const handleImagenChange = (cod, base64) => {
    const nuevo = {
      ...modulos,
      [cod]: { ...modulos[cod], imagen: base64 || undefined }
    };
    setModulos(nuevo);
    onSave(nuevo);
  };


  // Helper: nombres de presupuestos que usan un módulo dado
  const presupuestosQueUsan = (cod) =>
    Object.values(presupuestos || {})
      .filter(p => (p.items || []).some(it => it.codigo === cod))
      .map(p => p.nombre || "Sin nombre");

  const eliminar = (cod) => {
    const n = { ...modulos };
    delete n[cod];
    setModulos(n);
    onSave(n);
    showMsg(`"${cod}" eliminado.`, "warn");
  };

  // 🧪 Ejemplo paramétrico — para probar el ciclo paramétrico end-to-end.
  // Inserta una "Cajonera (paramétrica)" con 1 parámetro (cajones), 2 zonas
  // (cuerpo / frentes) y 1 constraint. Las piezas usan repeat para generar
  // los frentes según `cajones`.
  const cargarEjemploParametrico = () => {
    const cod = "MC100001";
    const yaExiste = !!modulos[cod];
    const ejemplo = {
      nombre: "Cajonera (paramétrica)",
      descripcion: "Ejemplo: cantidad de cajones es ajustable desde el presupuesto",
      categoria: "otros",
      material: "melamina",
      dimensiones: { ancho: 600, alto: 720, profundidad: 550 },
      tipoVisual: null,
      imagen: null,
      variables: {},
      parametros: [
        { id: "cajones", nombre: "Cantidad de cajones", tipo: "integer", def: 3, min: 1, max: 6 },
      ],
      zonas: [
        { id: "cuerpo", nombre: "Cuerpo",  material: "melamina" },
        { id: "frente", nombre: "Frentes", material: "mdf" },
      ],
      constraints: [
        { expr: "alto >= cajones * 80", msg: "El alto no alcanza para tantos cajones" },
      ],
      piezas: [
        { nombre: "Lateral izq", cantidad: 1, zona: "cuerpo", cara3d: "left",
          formula1: "alto", formula2: "profundidad" },
        { nombre: "Lateral der", cantidad: 1, zona: "cuerpo", cara3d: "right",
          formula1: "alto", formula2: "profundidad",
          posFormulas: { x: "ancho - esp", y: "0", z: "0" } },
        { nombre: "Base", cantidad: 1, zona: "cuerpo", cara3d: "bottom",
          formula1: "ancho - 2*esp", formula2: "profundidad",
          posFormulas: { x: "esp", y: "0", z: "0" } },
        { nombre: "Tapa", cantidad: 1, zona: "cuerpo", cara3d: "top",
          formula1: "ancho - 2*esp", formula2: "profundidad",
          posFormulas: { x: "esp", y: "alto - esp", z: "0" } },
        { nombre: "Frente cajón #{i}", cantidad: 1, zona: "frente", orientacion3d: "frente",
          formula1: "(alto - 2*esp) / cajones - 4", formula2: "ancho - 4",
          posFormulas: {
            x: "2",
            y: "(i-1) * ((alto - 2*esp) / cajones) + esp + 2",
            z: "profundidad",
          },
          repeat: { var: "i", from: 1, to: "cajones" } },
      ],
      herrajes: [
        { id: 1, cantidad: "cajones", condition: "cajones > 0" },
      ],
      moDeObra: { tipo: "por_modulo", horas: 0 },
    };
    const nuevo = { ...modulos, [cod]: ejemplo };
    setModulos(nuevo);
    onSave(nuevo);
    showMsg(yaExiste
      ? "Cajonera paramétrica actualizada con la última versión."
      : "Cajonera paramétrica cargada al catálogo.");
  };

  // 💾 LÓGICA DE BACKUP (Exportar/Importar)
  const handleExport = () => {
    const data = {
      version: 2,
      fecha: new Date().toISOString(),
      modulos,
      costos,
      presupuestos: presupuestos || {},
      perfil: perfil || {}
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carpicalc-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    // Guardar timestamp del último backup para el recordatorio
    localStorage.setItem("carpicalc:ultimo_backup", Date.now().toString());
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data.modulos || !data.costos) {
          showMsg("El archivo no tiene el formato correcto.", "warn");
          return;
        }
        // Módulos + costos (siempre)
        setModulos(data.modulos);
        onSave(data.modulos);
        setCostos(data.costos);
        hSaveC(data.costos);
        // Presupuestos (solo si existen en el backup v2)
        if (data.presupuestos && typeof data.presupuestos === "object") {
          guardarPresupuestos(data.presupuestos);
        }
        // Perfil (solo si existe en el backup v2)
        if (data.perfil && typeof data.perfil === "object" && onGuardarPerfil) {
          onGuardarPerfil({ ...PERFIL_VACIO, ...data.perfil });
        }
        const extras = data.version === 2 ? " (incluye presupuestos y perfil)" : "";
        showMsg(`Backup cargado con éxito${extras}.`);
      } catch {
        showMsg("Error al leer el archivo.", "warn");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const tituloForm = () => {
    if (!modo) return "";
    if (modo.tipo === "editar") return `Editando: ${modo.codigo}`;
    if (modo.tipo === "duplicar") return `Duplicando: ${modo.codigoSugerido}`;
    return "Nuevo módulo";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        className="rsp-stack"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16
        }}
      >
        <SectionTitle sub="Definí tus módulos con piezas reales, espesores automáticos y tapacanto">
          Catálogo de Módulos
        </SectionTitle>
        {!modo && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            marginTop: 4, flexWrap: "wrap", width: "100%",
            justifyContent: "flex-end"
          }}>
            {/* ── Fila 1 (mobile): Buscador + toggle de vista ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 220 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-muted)", pointerEvents: "none" }}>🔍</span>
                <input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar módulo..."
                  style={{
                    paddingLeft: 28, paddingRight: busqueda ? 28 : 10, paddingTop: 8, paddingBottom: 8,
                    fontFamily: "'DM Mono',monospace", fontSize: 12,
                    background: "var(--bg-surface)", border: "1px solid var(--border)",
                    color: "var(--text-primary)", borderRadius: 8, outline: "none",
                    width: "100%", transition: "border-color 0.15s"
                  }}
                  onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
                {busqueda && (
                  <button onClick={() => setBusqueda("")}
                    style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}>
                    ×
                  </button>
                )}
              </div>
              <div style={{ width: 1, height: 22, background: "var(--border)", flexShrink: 0 }} />
              <VistaToggle vista={vistaLayout} onChange={setVista} />
            </div>

            {/* ── Fila 2 (mobile): Import + Export + Nuevo módulo ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <button
                onClick={handleExport}
                title="Descargar backup del catálogo"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--text-muted)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                ↓ Export
              </button>
              <label
                title="Cargar backup desde la PC"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", transition: "all 0.15s", margin: 0 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--text-muted)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                ↑ Import
                <input type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
              </label>
              <button
                onClick={cargarEjemploParametrico}
                title="Carga una cajonera paramétrica de ejemplo"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(200,160,42,0.12)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,160,42,0.20)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(200,160,42,0.12)"; }}
              >
                🧪 Ejemplo paramétrico
              </button>
              <Btn onClick={() => abrirModo({ tipo: "nuevo" })}>+ Nuevo módulo</Btn>
            </div>
          </div>
        )}
      </div>

      {/* El resto del código sigue igual (mensajes, formulario y lista) */}
      {msg && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            background:
              msg.tipo === "warn"
                ? "rgba(200,140,40,0.10)"
                : "rgba(60,180,80,0.10)",
            border: `1px solid ${
              msg.tipo === "warn"
                ? "rgba(200,140,40,0.30)"
                : "rgba(60,180,80,0.30)"
            }`,
            color: msg.tipo === "warn" ? "#d4a040" : "#7ecf8a"
          }}
        >
          {msg.tipo === "warn" ? "⚠" : "✓"} {msg.texto}
        </div>
      )}

      {modo && (
        <div id="catalogo-form" ref={formRef}>
        <Card className="rsp-card" highlight style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20
            }}
          >
            <h3
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--accent)"
              }}
            >
              {tituloForm()}
            </h3>
            {modo.tipo === "duplicar" && (
              <Badge color="#7090b0">⧉ Copia — asigná un código nuevo</Badge>
            )}
            {modo.tipo === "editar" && <Badge color="#d4a040">Edición</Badge>}
          </div>
          <FormModulo
            costos={costos}
            onGuardar={guardar}
            onCancelar={() => setModo(null)}
            moduloBase={modo.tipo !== "nuevo" ? modo.modulo : null}
            codigoEditar={modo.tipo === "editar" ? modo.codigo : null}
            esDeepLinkPresupuesto={!!origenEdicion && origenEdicion.tipo === "presupuesto"}
            presupuestosRef={presupuestos || {}}
            onRecalcularAfectados={(cod, pid, itemsReemplazados, moduloActualizado) => {
              // Caso 1: reemplazo de items (guardar como nuevo módulo con checkboxes)
              if (pid && itemsReemplazados) {
                if (onGuardarPresupuestoAfectado) {
                  onGuardarPresupuestoAfectado(pid, { items: itemsReemplazados });
                }
                return;
              }
              // Caso 2: recalcular precios. Usa moduloActualizado para evitar leer estado React desactualizado.
              const tsAhora = Date.now();
              Object.entries(presupuestos || {}).forEach(([presId, p]) => {
                if (!(p.items || []).some(it => it.codigo === cod)) return;
                const nuevoTotal = (p.items || []).reduce((acc, it) => {
                  const base = it.codigo === cod ? (moduloActualizado || modulos[it.codigo]) : modulos[it.codigo];
                  if (!base) return acc;
                  const c = calcularModulo(base, costos);
                  return acc + (c ? c.total * it.cantidad : 0);
                }, 0);
                if (nuevoTotal > 0 && onGuardarPresupuestoAfectado) {
                  onGuardarPresupuestoAfectado(presId, {
                    total: Math.round(nuevoTotal),
                    costosVersionAl: tsAhora
                  });
                }
              });
            }}
          />
        </Card>
        </div>
      )}

      {/* Grid / List view agrupado por categorías */}
      {(() => {
        // Fix: excluir módulos temporales del catálogo visible.
        // Los TEMP_ solo existen para la sesión de edición de un presupuesto.
        const filtrados = Object.entries(modulos).filter(([cod, mod]) =>
          !mod.temporal &&
          (!busqueda || cod.toLowerCase().includes(busqueda.toLowerCase()) || mod.nombre.toLowerCase().includes(busqueda.toLowerCase()))
        );
        if (filtrados.length === 0 && Object.keys(modulos).length > 0) {
          return <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 13 }}>Sin resultados para "{busqueda}"</div>;
        }
        // Agrupar por categoría
        const grupos = {};
        filtrados.forEach(([cod, mod]) => {
          const cat = mod.categoria || "otros";
          if (!grupos[cat]) grupos[cat] = [];
          grupos[cat].push([cod, mod]);
        });
        const ordenCats = CATEGORIAS_DEFAULT.map(c => c.id).concat(
          Object.keys(grupos).filter(k => !CATEGORIAS_DEFAULT.find(c => c.id === k))
        );
        return ordenCats.filter(catId => grupos[catId]?.length > 0).map(catId => {
          const cat = CATEGORIAS_DEFAULT.find(c => c.id === catId) || { id: catId, label: catId, icon: "📦", color: "#808080" };
          const items = grupos[catId];
          const colapsada = categoriasColapsadas[catId];
          const totalCat = items.reduce((s, [, mod]) => {
            const c = calcularModulo(mod, costos);
            return s + (c ? c.total : 0);
          }, 0);
          return (
            <div key={catId} style={{ marginBottom: 20 }}>
              {/* Header de categoría */}
              <button onClick={() => toggleCategoria(catId)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px", marginBottom: colapsada ? 0 : 10,
                borderRadius: colapsada ? 10 : "10px 10px 0 0",
                background: `${cat.color}12`, border: `1px solid ${cat.color}30`,
                borderBottom: colapsada ? undefined : `2px solid ${cat.color}50`,
                cursor: "pointer", transition: "all 0.18s"
              }}>
                <span style={{ fontSize: 16 }}>{cat.icon}</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: cat.color, flex: 1, textAlign: "left" }}>
                  {cat.label}
                </span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: cat.color, opacity: 0.7, background: `${cat.color}20`, border: `1px solid ${cat.color}30`, borderRadius: 999, padding: "2px 8px" }}>
                  {items.length} mód.
                </span>
                {!busqueda && (
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: cat.color }}>
                    {fmtPeso(totalCat)} base
                  </span>
                )}
                <span style={{ fontSize: 11, color: cat.color, opacity: 0.6, marginLeft: 4 }}>{colapsada ? "▼" : "▲"}</span>
              </button>
              {!colapsada && (
                vistaLayout === "grid" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12, padding: "4px 2px" }}>
                    {items.map(([cod, mod]) => {
                      const c = calcularModulo(mod, costos);
                      if (!c) return null;
                      return <TarjetaModuloGrid key={cod} cod={cod} mod={mod} c={c}
                        onEditar={() => abrirModo({ tipo: "editar", codigo: cod, modulo: mod })}
                        onEliminar={() => eliminar(cod)}
                        onDuplicar={() => abrirModo({ tipo: "duplicar", modulo: mod, codigoSugerido: cod })}
                        onAbrirVista={() => dispatch({ type: "ABRIR_EDITOR_VISTA", payload: { cod } })}
                        on3D={() => setVisor3D({ cod, mod })}
                        onImagenChange={handleImagenChange}
                        presupuestosAfectados={presupuestosQueUsan(cod)} />;
                    })}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 2px" }}>
                    {items.map(([cod, mod]) => {
                      const c = calcularModulo(mod, costos);
                      if (!c) return null;
                      return <FilaModuloLista key={cod} cod={cod} mod={mod} c={c}
                        onEditar={() => abrirModo({ tipo: "editar", codigo: cod, modulo: mod })}
                        onEliminar={() => eliminar(cod)}
                        onDuplicar={() => abrirModo({ tipo: "duplicar", modulo: mod, codigoSugerido: cod })}
                        onAbrirVista={() => dispatch({ type: "ABRIR_EDITOR_VISTA", payload: { cod } })}
                        on3D={() => setVisor3D({ cod, mod })}
                        onImagenChange={handleImagenChange}
                        presupuestosAfectados={presupuestosQueUsan(cod)} />;
                    })}
                  </div>
                )
              )}
            </div>
          );
        });
      })()}

      {Object.keys(modulos).length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", borderRadius: 16, border: "1px dashed var(--border)", color: "var(--text-muted)", background: "var(--bg-subtle)" }}>
          <div style={{ marginBottom: 18, opacity: 0.7 }} dangerouslySetInnerHTML={{ __html: `<svg width="52" height="52" viewBox="0 0 52 52" fill="none"><rect x="8" y="8" width="36" height="36" rx="8" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.5"/><path d="M20 26h12M26 20v12" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" opacity="0.7"/></svg>` }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Catálogo vacío</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>No hay módulos en el catálogo.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>
            Hacé clic en <strong style={{ color: "var(--accent)" }}>+ Nuevo módulo</strong> para empezar.
          </p>
        </div>
      )}
      <ToastContainer />

      {/* ── Visor 3D — Portal: se monta en document.body para evitar
           que transforms/animations de ancestros creen un containing block
           que limite position:fixed al div del catálogo en vez del viewport ── */}
      {visor3D && ReactDOM.createPortal(
        <Suspense fallback={null}>
          <VisorModulo3D
            modulo={visor3D.mod}
            costos={costos}
            onClose={() => setVisor3D(null)}
            onActualizar={(nuevoMod) => {
              const cod        = visor3D.cod;
              const nuevosMods = { ...modulos, [cod]: nuevoMod };
              setModulos(nuevosMods);
              onSave(nuevosMods);
              setVisor3D({ cod, mod: nuevoMod });
            }}
          />
        </Suspense>,
        document.body
      )}
    </div>
  );
}

// ── PanelSelectorModulos ──────────────────────────────────────────
function PanelSelectorModulos({ modulos, onSeleccionar }) {
  const [busqueda, setBusqueda] = useState("");
  const [colapsadas, setColapsadas] = useState(() =>
    Object.fromEntries(CATEGORIAS_DEFAULT.map(c => [c.id, true]))
  );
  const inputRef = React.useRef();

  const toggle = (id) => setColapsadas(c => ({ ...c, [id]: !c[id] }));

  const buscando = busqueda.trim().length > 0;
  const termino = busqueda.toLowerCase();

  // Agrupar módulos por categoría — excluir temporales
  const grupos = {};
  Object.entries(modulos).forEach(([cod, mod]) => {
    if (mod.temporal) return; // ← TEMP_ nunca aparecen en el selector
    if (buscando) {
      const match = cod.toLowerCase().includes(termino) || mod.nombre.toLowerCase().includes(termino);
      if (!match) return;
    }
    const cat = mod.categoria || "otros";
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push({ cod, mod });
  });

  const ordenCats = CATEGORIAS_DEFAULT.map(c => c.id).filter(id => grupos[id]?.length > 0);

  return (
    <div style={{ marginTop: 14 }}>
      {/* Buscador */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text-muted)", pointerEvents: "none" }}>🔍</span>
        <input
          ref={inputRef}
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o código... (ej: bajo mesada, PL001)"
          style={{
            width: "100%", paddingLeft: 32, paddingRight: busqueda ? 32 : 12,
            paddingTop: 8, paddingBottom: 8,
            fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13,
            background: "var(--bg-base)", border: "1px solid var(--border)",
            color: "var(--text-primary)", borderRadius: 8, outline: "none",
            transition: "border-color 0.15s"
          }}
          onFocus={e => { e.target.style.borderColor = "var(--accent-border)"; if (buscando) setColapsadas(Object.fromEntries(CATEGORIAS_DEFAULT.map(c => [c.id, false]))); }}
          onBlur={e => e.target.style.borderColor = "var(--border)"}
          onKeyDown={e => {
            if (e.key === "Escape") { setBusqueda(""); e.target.blur(); }
          }}
        />
        {busqueda && (
          <button onClick={() => { setBusqueda(""); inputRef.current?.focus(); }}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>
            ×
          </button>
        )}
      </div>

      {/* Grupos por categoría */}
      {ordenCats.length === 0 && buscando ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "10px 0", fontFamily: "'DM Mono',monospace" }}>
          Sin resultados para "{busqueda}"
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ordenCats.map(catId => {
            const cat = CATEGORIAS_DEFAULT.find(c => c.id === catId) || { id: catId, label: catId, icon: "📦", color: "#808080" };
            const items = grupos[catId] || [];
            const abierta = buscando || !colapsadas[catId];
            return (
              <div key={catId} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${cat.color}25` }}>
                {/* Header colapsable */}
                <button onClick={() => toggle(catId)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 12px", background: `${cat.color}10`,
                    border: "none", cursor: "pointer", transition: "background 0.15s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = `${cat.color}20`}
                  onMouseLeave={e => e.currentTarget.style.background = `${cat.color}10`}
                >
                  <span style={{ fontSize: 13 }}>{cat.icon}</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: cat.color, flex: 1, textAlign: "left" }}>
                    {cat.label}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: cat.color, opacity: 0.6, background: `${cat.color}20`, border: `1px solid ${cat.color}30`, borderRadius: 999, padding: "1px 7px" }}>
                    {items.length}
                  </span>
                  <span style={{ fontSize: 10, color: cat.color, opacity: 0.5 }}>{abierta ? "▲" : "▼"}</span>
                </button>

                {/* Chips de módulos */}
                {abierta && (
                  <div style={{ padding: "8px 10px", display: "flex", flexWrap: "wrap", gap: 5, background: "var(--bg-subtle)" }}>
                    {items.map(({ cod, mod }) => (
                      <button key={cod} onClick={() => { onSeleccionar(cod); setBusqueda(""); }}
                        style={{
                          background: "var(--bg-surface)", border: "1px solid var(--border)",
                          color: "var(--text-secondary)", borderRadius: 6, padding: "5px 10px",
                          fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace",
                          transition: "all 0.13s", display: "flex", alignItems: "center", gap: 5
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = cat.color; e.currentTarget.style.background = `${cat.color}12`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
                        title={`Agregar ${mod.nombre}`}
                      >
                        <span style={{ color: cat.color, fontWeight: 700 }}>{cod}</span>
                        <span style={{ color: "var(--text-muted)" }}>— {mod.nombre}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 9. EDITOR VISUAL SVG
// ══════════════════════════════════════════════════════════════════

// ── Presets de layout ─────────────────────────────────────────────
// dir "v" = zonas apiladas verticalmente, dir "h" = lado a lado
const LAYOUT_PRESETS = [
  { id: "simple",       label: "Simple",     dir: "v", icon: "▭",  zonasDef: [{ id: "main", fr: 1 }] },
  { id: "sup_inf",      label: "Sup / Inf",  dir: "v", icon: "⊟",  zonasDef: [{ id: "sup", fr: 0.60 }, { id: "inf", fr: 0.40 }] },
  { id: "tres_franjas", label: "3 franjas",  dir: "v", icon: "≡",  zonasDef: [{ id: "sup", fr: 0.34 }, { id: "mid", fr: 0.33 }, { id: "inf", fr: 0.33 }] },
  { id: "izq_der",      label: "Izq / Der",  dir: "h", icon: "▌▐", zonasDef: [{ id: "izq", fr: 0.50 }, { id: "der", fr: 0.50 }] },
  { id: "cajonera",     label: "Cajonera",   dir: "v", icon: "⊞",  zonasDef: [{ id: "main", fr: 1 }], defaultTipo: "cajones" },
];

// ── Tipos de zona ─────────────────────────────────────────────────
const ZONA_TIPOS = [
  { id: "abierto",  label: "Abierto",   icon: "⊡" },
  { id: "puerta_1", label: "1 Puerta",  icon: "□"  },
  { id: "puerta_2", label: "2 Puertas", icon: "⊟"  },
  { id: "cajones",  label: "Cajones",   icon: "≡"  },
];

const ZONA_LABELS = { main: "Principal", sup: "Superior", mid: "Medio", inf: "Inferior", izq: "Izquierda", der: "Derecha" };

/**
 * Vista independiente para configurar la composición visual de un módulo.
 * Accesible desde AccionesModulo → botón ▣.
 * Guarda vistaConfig con estructura por bloques en el módulo.
 */
function EditorVistaSVG({ modulo, onGuardar, onCerrar }) {
  const { tema } = useTema();
  const vc = modulo.vistaConfig || {};

  const [zocalo,      setZocalo]      = useState(String(vc.zocalo ?? 0));
  const [layoutId,    setLayoutId]    = useState(vc.layoutId    || "simple");
  const [zonasConfig, setZonasConfig] = useState(vc.zonas || {});
  const [temaSVG,     setTemaSVG]     = useState(tema); // tema local solo para el SVG

  const preset = LAYOUT_PRESETS.find(p => p.id === layoutId) || LAYOUT_PRESETS[0];

  // Cuando cambia el layout: conservar config de zonas con el mismo id, resetear las nuevas
  const cambiarLayout = (nuevoId) => {
    const nuevo = LAYOUT_PRESETS.find(p => p.id === nuevoId) || LAYOUT_PRESETS[0];
    setLayoutId(nuevoId);
    setZonasConfig(prev => {
      const next = {};
      nuevo.zonasDef.forEach(({ id }) => {
        next[id] = prev[id] || (nuevo.defaultTipo ? { tipo: nuevo.defaultTipo, cantidad: 3 } : { tipo: "abierto" });
      });
      return next;
    });
  };

  const setZonaTipo = (zonaId, tipo) =>
    setZonasConfig(prev => ({ ...prev, [zonaId]: { ...(prev[zonaId] || {}), tipo } }));

  const setZonaExtra = (zonaId, campo, valor) =>
    setZonasConfig(prev => ({ ...prev, [zonaId]: { ...(prev[zonaId] || {}), [campo]: valor } }));

  // Preview reactivo
  const vistaPreview = useMemo(() => ({
    zocalo:     parseInt(zocalo) || 0,
    layoutId,
    layoutDir:  preset.dir,
    zonasDef:   preset.zonasDef,
    zonas:      zonasConfig,
  }), [zocalo, layoutId, preset, zonasConfig]);

  const chipSt = (activo) => ({
    padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11,
    fontFamily: "'DM Mono',monospace", fontWeight: 700, transition: "all 0.12s",
    background: activo ? "var(--accent-soft)"    : "transparent",
    border:     `1px solid ${activo ? "var(--accent-border)" : "var(--border)"}`,
    color:      activo ? "var(--accent)"          : "var(--text-muted)",
  });

  const numChipSt = (activo) => ({
    ...chipSt(activo), padding: "3px 9px", fontSize: 10,
  });

  const guardar = () => onGuardar(vistaPreview);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 800, margin: "0 auto" }}>
      <div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 900, color: "var(--accent)", marginBottom: 2 }}>
          ▣ Vista técnica
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {modulo.nombre} · {modulo.dimensiones?.ancho} × {modulo.dimensiones?.profundidad} × {modulo.dimensiones?.alto} mm
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>

        {/* ── Panel izquierdo: preview SVG ── */}
        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          {/* Toggle tema local SVG */}
          <div style={{ width: "100%", display: "flex", justifyContent: "center", gap: 8 }}>
            <button
              onClick={() => setTemaSVG("dark")}
              style={{
                flex: 1, padding: "6px 10px", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                borderRadius: 6, border: temaSVG === "dark" ? "2px solid var(--accent)" : "1px solid var(--border)",
                background: temaSVG === "dark" ? "var(--bg-subtle)" : "transparent",
                color: temaSVG === "dark" ? "var(--accent)" : "var(--text-muted)",
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              🌙 Oscuro
            </button>
            <button
              onClick={() => setTemaSVG("light")}
              style={{
                flex: 1, padding: "6px 10px", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                borderRadius: 6, border: temaSVG === "light" ? "2px solid var(--accent)" : "1px solid var(--border)",
                background: temaSVG === "light" ? "var(--bg-subtle)" : "transparent",
                color: temaSVG === "light" ? "var(--accent)" : "var(--text-muted)",
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              ☀ Claro
            </button>
          </div>
          <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: 12, border: "1px solid var(--border)" }}>
            <VistaModuloSVG
              modulo={modulo}
              vistaConfig={vistaPreview}
              theme={temaSVG}
              width={300}
              height={300}
            />
          </div>
          {/* Zócalo */}
          <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>Zócalo</span>
            <input
              type="number" min="0" max="200" value={zocalo}
              onChange={e => setZocalo(e.target.value)}
              style={{
                flex: 1, fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "4px 8px",
                background: "var(--bg-base)", border: "1px solid var(--border)",
                borderRadius: 6, color: "var(--text-primary)", outline: "none", textAlign: "right",
              }}
            />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>mm</span>
          </div>
        </div>

        {/* ── Panel derecho: controles ── */}
        <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Layout presets */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>
              Distribución
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {LAYOUT_PRESETS.map(p => (
                <button key={p.id} onClick={() => cambiarLayout(p.id)} style={chipSt(layoutId === p.id)}>
                  <span style={{ marginRight: 5 }}>{p.icon}</span>{p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Zonas */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
              Zonas
            </div>
            {preset.zonasDef.map(({ id }) => {
              const zc   = zonasConfig[id] || {};
              const tipo = zc.tipo || (preset.defaultTipo || "abierto");
              return (
                <div key={id} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 8, fontFamily: "'DM Mono',monospace" }}>
                    {ZONA_LABELS[id] || id}
                  </div>
                  {/* Tipo */}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: tipo !== "abierto" ? 8 : 0 }}>
                    {ZONA_TIPOS.map(t => (
                      <button key={t.id} onClick={() => setZonaTipo(id, t.id)} style={chipSt(tipo === t.id)}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                  {/* Opciones según tipo */}
                  {tipo === "cajones" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Cantidad</span>
                      {[1,2,3,4,5,6].map(n => (
                        <button key={n} onClick={() => setZonaExtra(id, "cantidad", n)}
                          style={numChipSt((zc.cantidad || 3) === n)}>{n}</button>
                      ))}
                    </div>
                  )}
                  {(tipo === "abierto" || tipo === "puerta_1" || tipo === "puerta_2") && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Estantes</span>
                      {[0,1,2,3,4].map(n => (
                        <button key={n} onClick={() => setZonaExtra(id, "estantes", n)}
                          style={numChipSt((zc.estantes || 0) === n)}>{n}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onCerrar}>Cancelar</Btn>
        <Btn onClick={guardar}>💾 Guardar vista</Btn>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 10. PRESUPUESTO
// ══════════════════════════════════════════════════════════════════
// ── GestorPresupuestos ────────────────────────────────────────────

export { CatalogoModulos, PanelSelectorModulos, EditorVistaSVG };
