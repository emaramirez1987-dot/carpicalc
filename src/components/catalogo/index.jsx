import React, { useState, useEffect, useMemo } from 'react';
import { useNav } from '../../state/NavContext.jsx';
import { useUndo } from '../../hooks/useUndo.js';
import { useTema } from '../../hooks/useTema.js';
import { Btn, Card, Badge, TextInput, Select, SectionTitle } from '../ui/index.jsx';
import { fmtPeso, fmtNum, resolverDim, calcularModulo, comprimirImagen, evaluarFormula } from '../../utils.js';
import VistaModuloSVG from '../vista-svg/index.js';
import { PERFIL_VACIO, TIPO_MAT, CATEGORIAS_DEFAULT, ROLES_PIEZA_DEFAULT } from '../../constants.js';
import { guardarPresupuestos, cargarRolesPieza, guardarRolesPieza, cargarBorradorModulo, guardarBorradorModulo, limpiarBorradorModulo } from '../../storage.js';

const DIMS = ["ancho", "alto", "profundidad"];

// Estado inicial vacío de una pieza nueva en el formulario
const PIEZA_VACIA = {
  nombre: "", cantidad: 1,
  formula1: "alto", formula2: "profundidad",
  usaDim: "alto", usaDim2: "profundidad",
  offsetEsp: 0, offsetMm: 0, divisor: 1,
  offsetEsp2: 0, offsetMm2: 0, divisor2: 1,
  tc: { id: 1, lados1: 1, lados2: 0 },
  especial: false, dimLibre1: "", dimLibre2: ""
};

function DimRow({ titulo, dimKey, espKey, mmKey, divKey, resultado, fp, setFp, espesor }) {
  const divVal = parseInt(fp[divKey]) || 1;
  return (
    <div style={{ background: "rgba(0,0,0,0.18)", borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", marginBottom: 8 }}>
        {titulo}
      </div>
      <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Select label="Toma de" value={fp[dimKey]} small
          onChange={(v) => setFp((p) => ({ ...p, [dimKey]: v }))}
          options={DIMS.map((d) => ({ value: d, label: d }))} />
        <TextInput label="Dividir ÷" type="number" value={fp[divKey]} placeholder="1" suffix="÷" small
          onChange={(v) => setFp((p) => ({ ...p, [divKey]: Math.max(1, parseInt(v) || 1) }))} />
        <TextInput label="Espesores ±" type="number" value={fp[espKey]} placeholder="0" suffix="esp" small
          onChange={(v) => setFp((p) => ({ ...p, [espKey]: v }))} />
        <TextInput label="mm fijos ±" type="number" value={fp[mmKey]} placeholder="0" suffix="mm" small
          onChange={(v) => setFp((p) => ({ ...p, [mmKey]: v }))} />
      </div>
      <div style={{ fontSize: 11, marginTop: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ color: "var(--text-muted)" }}>→</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--color-positive)" }}>
          {Math.round(resultado)} mm
        </span>
        {(parseInt(fp[espKey]) || 0) !== 0 && (
          <span style={{ fontFamily: "'DM Mono',monospace", color: "var(--accent)", fontSize: 11 }}>
            {parseInt(fp[espKey])} esp × {espesor}mm = {(parseInt(fp[espKey]) || 0) * espesor}mm
          </span>
        )}
        {divVal > 1 && (
          <span style={{ fontFamily: "'DM Mono',monospace", color: "#7090c0", fontSize: 11 }}>÷ {divVal}</span>
        )}
      </div>
    </div>
  );
}

// ── DimRowLibre ── para piezas especiales con medidas libres
function DimRowLibre({ titulo, valKey, fp, setFp }) {
  return (
    <div style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.20)", borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: 8 }}>
        {titulo} <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "none", fontWeight: 400 }}>— medida libre</span>
      </div>
      <TextInput label="Medida exacta (mm)" type="number" value={fp[valKey]} placeholder="0" suffix="mm" small
        onChange={(v) => setFp((p) => ({ ...p, [valKey]: parseInt(v) || 0 }))} />
      <div style={{ fontSize: 11, marginTop: 6, fontFamily: "'DM Mono',monospace", color: "var(--color-positive)" }}>
        → {parseInt(fp[valKey]) || 0} mm
      </div>
    </div>
  );
}

function FilaPieza({ pieza, idx, onDelete, onEdit, onDuplicate, onMoveUp, onMoveDown, onChangeCantidad, dims, espesor, tapacanto, isFirst, isLast, modVars }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const allVars = { ancho: dims.ancho || 0, alto: dims.alto || 0, profundidad: dims.profundidad || 0, esp: espesor, ...(modVars || {}) };
  const d1 = pieza.especial
    ? (parseInt(pieza.dimLibre1) || 0)
    : pieza.formula1 != null
      ? (evaluarFormula(pieza.formula1, allVars) ?? 0)
      : resolverDim(dims[pieza.usaDim], pieza.offsetEsp, pieza.offsetMm, pieza.divisor || 1, espesor);
  const d2 = pieza.especial
    ? (parseInt(pieza.dimLibre2) || 0)
    : pieza.formula2 != null
      ? (evaluarFormula(pieza.formula2, allVars) ?? 0)
      : resolverDim(dims[pieza.usaDim2], pieza.offsetEsp2, pieza.offsetMm2, pieza.divisor2 || 1, espesor);
  const area = (d1 * d2 * pieza.cantidad) / 1_000_000;
  const tcDef = tapacanto?.find((t) => t.id === pieza.tc?.id);
  const mTc = pieza.tc?.id
    ? (pieza.cantidad * ((pieza.tc.lados1 || 0) * d1 + (pieza.tc.lados2 || 0) * d2)) / 1000
    : 0;
  const offsetLabel = (esp, mm, div) => {
    const p = [];
    if (esp) p.push(`${esp > 0 ? "+" : ""}${esp} esp.`);
    if (mm) p.push(`${mm > 0 ? "+" : ""}${mm} mm`);
    if (div && div > 1) p.push(`÷${div}`);
    return p.length ? `(${p.join(", ")})` : "";
  };

  const btnSt = { background: "transparent", border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer", color: "var(--text-secondary)", fontSize: 11, padding: "3px 8px", fontFamily: "'DM Mono',monospace", fontWeight: 700, transition: "all 0.15s", whiteSpace: "nowrap" };
  const metSt = { display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 };
  const metLabel = { fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginBottom: 1 };
  const metVal = { fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" };

  return (
    <div style={{ padding: "8px 10px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

      {/* Nombre */}
      <div style={{ flex: "1 1 130px", minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 5 }}>
          {pieza.nombre}
          {pieza.especial && (
            <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(212,175,55,0.18)", color: "var(--accent)", border: "1px solid var(--accent-border)", borderRadius: 4, padding: "1px 4px", flexShrink: 0 }}>ESP</span>
          )}
        </div>
        <div style={{ fontSize: 10, marginTop: 1, fontFamily: "'DM Mono',monospace", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {pieza.especial
            ? `libre: ${pieza.dimLibre1 || 0}×${pieza.dimLibre2 || 0}mm`
            : pieza.formula1 != null
              ? `${pieza.formula1} × ${pieza.formula2}`
              : `${pieza.usaDim}${offsetLabel(pieza.offsetEsp, pieza.offsetMm, pieza.divisor || 1)} × ${pieza.usaDim2}${offsetLabel(pieza.offsetEsp2, pieza.offsetMm2, pieza.divisor2 || 1)}`}
        </div>
      </div>

      {/* Separador */}
      <div style={{ width: 1, height: 28, background: "var(--border)", flexShrink: 0 }} />

      {/* Medidas */}
      <div style={metSt}>
        <div style={metLabel}>Medidas</div>
        <div style={metVal}>{Math.round(d1)}×{Math.round(d2)}<span style={{ fontSize: 10, color: "var(--text-secondary)", marginLeft: 2 }}>mm</span></div>
      </div>

      {/* Área */}
      <div style={metSt}>
        <div style={metLabel}>Área</div>
        <div style={metVal}>{fmtNum(area)}<span style={{ fontSize: 10, color: "var(--text-secondary)", marginLeft: 2 }}>m²</span></div>
      </div>

      {/* Tapacanto */}
      {tcDef && (
        <div style={metSt}>
          <div style={metLabel}>Tapac.</div>
          <div style={{ ...metVal, color: "var(--accent)" }}>{fmtNum(mTc, 2)}<span style={{ fontSize: 10, color: "var(--text-secondary)", marginLeft: 2 }}>m</span></div>
        </div>
      )}

      {/* Separador */}
      <div style={{ width: 1, height: 28, background: "var(--border)", flexShrink: 0 }} />

      {/* Cantidad */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
        <button onClick={() => onChangeCantidad(Math.max(1, pieza.cantidad - 1))}
          style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "var(--accent)", minWidth: 24, textAlign: "center" }}>×{pieza.cantidad}</span>
        <button onClick={() => onChangeCantidad(pieza.cantidad + 1)}
          style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
      </div>

      {/* Separador */}
      <div style={{ width: 1, height: 28, background: "var(--border)", flexShrink: 0 }} />

      {/* Acciones */}
      <div style={{ display: "flex", gap: 3, alignItems: "center", flexShrink: 0 }}>
        <button onClick={() => onEdit(idx)} style={{ ...btnSt, color: "var(--accent)", borderColor: "var(--accent-border)", background: "var(--accent-soft)" }}>✎ editar</button>
        <button onClick={() => onDuplicate(idx)} style={btnSt}>⧉ dup.</button>
        <button onClick={() => onMoveUp(idx)} disabled={isFirst} style={{ ...btnSt, opacity: isFirst ? 0.3 : 1, padding: "3px 6px" }}>↑</button>
        <button onClick={() => onMoveDown(idx)} disabled={isLast} style={{ ...btnSt, opacity: isLast ? 0.3 : 1, padding: "3px 6px" }}>↓</button>
        {confirmDelete ? (
          <>
            <button onClick={() => { onDelete(idx); setConfirmDelete(false); }}
              style={{ padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700, background: "rgba(200,60,60,0.12)", border: "1px solid rgba(200,60,60,0.35)", color: "#e07070", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>✓ ok</button>
            <button onClick={() => setConfirmDelete(false)} style={btnSt}>✕</button>
          </>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            style={{ ...btnSt, color: "#e07070", borderColor: "rgba(200,60,60,0.25)" }}>× elim.</button>
        )}
      </div>
    </div>
  );
}

// ── FormPieza ─────────────────────────────────────────────────────
// ── DimRow ── (fuera de FormPieza para evitar re-mount en cada render)

// Dimensiones disponibles para parametrizar piezas del catálogo


// Estado inicial vacío de una pieza nueva en el formulario

function FormPieza({ fp, setFp, onAgregar, onCancelar, editando, error, dims, espesor, tapacanto, nombresSugeridos, variables }) {
  const [mostrarSugeridos, setMostrarSugeridos] = useState(false);
  const [rolesTaller, setRolesTaller] = useState(() => cargarRolesPieza());
  const todosRoles = [...ROLES_PIEZA_DEFAULT, ...rolesTaller];
  const [avanzado, setAvanzado] = useState(false);
  const [dialogoRol, setDialogoRol] = useState(false);
  const [nombreRolNuevo, setNombreRolNuevo] = useState("");

  const allVars = { ancho: dims.ancho || 0, alto: dims.alto || 0, profundidad: dims.profundidad || 0, esp: espesor, ...(variables || {}) };

  const d1 = fp.especial
    ? (parseInt(fp.dimLibre1) || 0)
    : fp.formula1
      ? (evaluarFormula(fp.formula1, allVars) ?? 0)
      : resolverDim(dims[fp.usaDim], parseInt(fp.offsetEsp) || 0, parseInt(fp.offsetMm) || 0, parseInt(fp.divisor) || 1, espesor);
  const d2 = fp.especial
    ? (parseInt(fp.dimLibre2) || 0)
    : fp.formula2
      ? (evaluarFormula(fp.formula2, allVars) ?? 0)
      : resolverDim(dims[fp.usaDim2], parseInt(fp.offsetEsp2) || 0, parseInt(fp.offsetMm2) || 0, parseInt(fp.divisor2) || 1, espesor);

  const f1Valida = fp.especial || !fp.formula1 || evaluarFormula(fp.formula1, allVars) !== null;
  const f2Valida = fp.especial || !fp.formula2 || evaluarFormula(fp.formula2, allVars) !== null;

  const aplicarRol = (rol) => {
    setFp(p => ({
      ...p,
      formula1: rol.formula1,
      formula2: rol.formula2,
      tc: { ...p.tc, lados1: rol.tc?.lados1 ?? p.tc.lados1, lados2: rol.tc?.lados2 ?? p.tc.lados2 },
    }));
  };

  const handleGuardarRol = () => {
    if (!nombreRolNuevo.trim()) return;
    const nuevo = {
      id: crypto.randomUUID(),
      nombre: nombreRolNuevo.trim(),
      sistema: false,
      formula1: fp.formula1,
      formula2: fp.formula2,
      tc: { lados1: fp.tc.lados1, lados2: fp.tc.lados2 },
    };
    const nuevos = [...rolesTaller, nuevo];
    setRolesTaller(nuevos);
    guardarRolesPieza(nuevos);
    setDialogoRol(false);
    setNombreRolNuevo("");
  };

  return (
    <div id="form-pieza" style={{
      borderRadius: 12, overflow: "hidden",
      border: editando ? "1px solid var(--accent-border)" : "1px solid rgba(255,255,255,0.08)",
      boxShadow: editando ? "0 0 28px rgba(212,175,55,0.18), 0 6px 28px rgba(0,0,0,0.45)" : "0 6px 28px rgba(0,0,0,0.4)",
    }}>
      {/* Header */}
      <div style={{
        padding: "11px 16px",
        background: "rgba(255,255,255,0.10)",
        borderBottom: "1px solid rgba(200,160,42,0.25)",
        borderLeft: editando ? "3px solid var(--accent)" : "3px solid rgba(200,160,42,0.5)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: editando ? "var(--accent)" : "#c8a02a" }}>
          {editando ? "✎ Editando pieza" : "＋ Nueva pieza"}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {editando && (
            <button onClick={onCancelar} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Mono',monospace", background: "rgba(200,60,60,0.12)", border: "1px solid rgba(200,60,60,0.35)", color: "#e08080" }}>
              ✕ Cancelar
            </button>
          )}
          <button onClick={() => setFp(p => ({ ...p, especial: !p.especial }))}
            style={{ padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Mono',monospace", transition: "all 0.15s", background: fp.especial ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.04)", border: `1px solid ${fp.especial ? "var(--accent-border)" : "rgba(255,255,255,0.12)"}`, color: fp.especial ? "var(--accent)" : "rgba(255,255,255,0.4)" }}>
            ✦ {fp.especial ? "Medida libre" : "Libre"}
          </button>
        </div>
      </div>
      <div style={{ background: "var(--bg-surface)", padding: "16px" }}>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Nombre + Cantidad */}
        <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <TextInput label="Nombre" placeholder="Lateral, Base, Puerta..." value={fp.nombre}
              onChange={(v) => setFp((p) => ({ ...p, nombre: v }))}
              onFocus={() => setMostrarSugeridos(true)}
              onBlur={() => setTimeout(() => setMostrarSugeridos(false), 150)}
              small />
            {mostrarSugeridos && (nombresSugeridos || []).length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2, minWidth: 220 }}>
                {(nombresSugeridos || []).map(n => (
                  <button key={n} onMouseDown={() => { setFp(p => ({ ...p, nombre: n })); setMostrarSugeridos(false); }}
                    style={{ padding: "3px 10px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Cantidad</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={() => setFp(p => ({ ...p, cantidad: Math.max(1, (parseInt(p.cantidad) || 1) - 1) }))}
                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
              <input type="number" value={fp.cantidad} min="1"
                onChange={e => setFp(p => ({ ...p, cantidad: e.target.value }))}
                style={{ width: 42, textAlign: "center", fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, padding: "5px 4px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--accent)", outline: "none" }} />
              <button onClick={() => setFp(p => ({ ...p, cantidad: (parseInt(p.cantidad) || 1) + 1 }))}
                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
          </div>
        </div>

        {!fp.especial && (
          <>
            {/* Selector de roles */}
            <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ padding: "7px 12px", background: "rgba(255,255,255,0.10)", borderBottom: "1px solid rgba(200,160,42,0.25)", borderLeft: "2px solid rgba(200,160,42,0.5)" }}>
                <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#c8a02a" }}>Rol de pieza</span>
              </div>
              <div style={{ padding: "10px 12px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {todosRoles.map(rol => {
                  const isActive = fp.formula1 === rol.formula1 && fp.formula2 === rol.formula2;
                  return (
                    <button key={rol.id} onClick={() => aplicarRol(rol)}
                      style={{
                        padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        fontFamily: "'DM Mono',monospace", cursor: "pointer",
                        transition: "all 0.15s",
                        background: isActive ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isActive ? "var(--accent-border)" : "rgba(255,255,255,0.1)"}`,
                        color: isActive ? "var(--accent)" : "rgba(255,255,255,0.4)",
                        boxShadow: isActive ? "0 0 12px rgba(212,175,55,0.25)" : "none",
                      }}>
                      {rol.nombre}
                      {!rol.sistema && (
                        <span onClick={(e) => { e.stopPropagation(); const nuevos = rolesTaller.filter(r => r.id !== rol.id); setRolesTaller(nuevos); guardarRolesPieza(nuevos); }}
                          style={{ marginLeft: 5, opacity: 0.5, cursor: "pointer" }}>×</span>
                      )}
                    </button>
                  );
                })}
              </div>
              </div>
            </div>

            {/* Fórmulas D1 y D2 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "D1 — Altura", key: "formula1", valida: f1Valida, resultado: d1 },
                { label: "D2 — Ancho",  key: "formula2", valida: f2Valida, resultado: d2 },
              ].map(({ label, key, valida, resultado }) => (
                <div key={key} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(200,160,42,0.15)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      value={fp[key] || ""}
                      onChange={e => setFp(p => ({ ...p, [key]: e.target.value }))}
                      placeholder="ej: alto - 2 * esp"
                      style={{
                        flex: 1, fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600,
                        padding: "7px 11px", background: "var(--bg-base)", color: "var(--text-primary)",
                        border: `1px solid ${!valida ? "rgba(224,112,112,0.6)" : "var(--border)"}`,
                        borderRadius: 7, outline: "none", letterSpacing: "0.02em",
                      }}
                    />
                    <div style={{ textAlign: "right", minWidth: 70 }}>
                      {valida ? (
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 900, color: "var(--color-positive)", letterSpacing: "-0.02em" }}>
                          {Math.round(resultado)}
                          <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginLeft: 3 }}>mm</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: "#e07070", fontFamily: "'DM Mono',monospace" }}>⚠ inválida</span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, marginTop: 5, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                    Variables: <span style={{ color: "var(--accent)", opacity: 0.8 }}>ancho</span> · <span style={{ color: "var(--accent)", opacity: 0.8 }}>alto</span> · <span style={{ color: "var(--accent)", opacity: 0.8 }}>profundidad</span> · <span style={{ color: "var(--accent)", opacity: 0.8 }}>esp</span>
                    {Object.keys(variables || {}).map(v => (
                      <span key={v}> · <span style={{ color: "var(--accent)", fontWeight: 700 }}>{v}</span></span>
                    ))}
                    {dims && <span style={{ marginLeft: 10, color: "var(--text-muted)" }}>({dims.ancho}·{dims.alto}·{dims.profundidad}·{espesor}{Object.entries(variables || {}).map(([k, v]) => `·${k}=${v}`).join('')})</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Preview resultado prominente */}
            {(d1 > 0 || d2 > 0) && (
              <div style={{ padding: "10px 14px", background: "rgba(126,207,138,0.07)", border: "1px solid rgba(126,207,138,0.18)", borderRadius: 8, display: "flex", gap: 20, alignItems: "center" }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "var(--color-positive-muted)" }}>
                  Medida real: <strong style={{ color: "var(--color-positive)", fontSize: 15 }}>{Math.round(d1)} × {Math.round(d2)} mm</strong>
                </span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--text-muted)" }}>
                  Área: <strong>{fmtNum((d1 * d2 * (parseInt(fp.cantidad) || 1)) / 1_000_000)} m²</strong>
                </span>
              </div>
            )}

            {/* Toggle configuración avanzada */}
            <button onClick={() => setAvanzado(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em" }}>
              <span style={{ transition: "transform 0.2s", display: "inline-block", transform: avanzado ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
              ⚙ Configuración avanzada
            </button>

            {avanzado && (
              <div style={{ background: "rgba(0,0,0,0.12)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <DimRow titulo="Dim 1 (altura)" dimKey="usaDim" espKey="offsetEsp" mmKey="offsetMm" divKey="divisor"
                  resultado={resolverDim(dims[fp.usaDim], parseInt(fp.offsetEsp) || 0, parseInt(fp.offsetMm) || 0, parseInt(fp.divisor) || 1, espesor)} fp={fp} setFp={setFp} espesor={espesor} />
                <DimRow titulo="Dim 2 (ancho)" dimKey="usaDim2" espKey="offsetEsp2" mmKey="offsetMm2" divKey="divisor2"
                  resultado={resolverDim(dims[fp.usaDim2], parseInt(fp.offsetEsp2) || 0, parseInt(fp.offsetMm2) || 0, parseInt(fp.divisor2) || 1, espesor)} fp={fp} setFp={setFp} espesor={espesor} />
                <div style={{ fontSize: 10, color: "var(--text-muted)", padding: "4px 0" }}>
                  Los campos avanzados se usan como fallback si no hay fórmula arriba.
                </div>
                {/* Guardar como rol */}
                {!dialogoRol ? (
                  <button onClick={() => { setDialogoRol(true); setNombreRolNuevo(""); }}
                    style={{ alignSelf: "flex-start", padding: "5px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "rgba(255,255,255,0.10)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                    💾 Guardar fórmulas como rol
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <input autoFocus value={nombreRolNuevo} onChange={e => setNombreRolNuevo(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleGuardarRol(); if (e.key === 'Escape') setDialogoRol(false); }}
                      placeholder="Nombre del rol..."
                      style={{ flex: 1, minWidth: 140, fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "5px 10px", background: "var(--bg-base)", border: "1px solid var(--accent-border)", borderRadius: 6, color: "var(--text-primary)", outline: "none" }} />
                    <button onClick={handleGuardarRol}
                      style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)" }}>
                      Guardar
                    </button>
                    <button onClick={() => setDialogoRol(false)}
                      style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {fp.especial && (
          <>
            <div style={{ fontSize: 11, padding: "6px 10px", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.20)", borderRadius: 6, color: "var(--accent)" }}>
              ✦ Medidas libres — no dependen de las dimensiones del módulo
            </div>
            <DimRowLibre titulo="Dim 1 (altura)" valKey="dimLibre1" fp={fp} setFp={setFp} />
            <DimRowLibre titulo="Dim 2 (ancho)" valKey="dimLibre2" fp={fp} setFp={setFp} />
            {(parseInt(fp.dimLibre1) || 0) > 0 && (parseInt(fp.dimLibre2) || 0) > 0 && (
              <div style={{ padding: "8px 12px", background: "rgba(126,207,138,0.07)", border: "1px solid rgba(126,207,138,0.18)", borderRadius: 8 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "var(--color-positive-muted)" }}>
                  Medida: <strong style={{ color: "var(--color-positive)" }}>{parseInt(fp.dimLibre1) || 0} × {parseInt(fp.dimLibre2) || 0} mm</strong>
                </span>
              </div>
            )}
          </>
        )}

        {/* Tapacanto */}
        <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ padding: "7px 12px", background: "rgba(255,255,255,0.10)", borderBottom: "1px solid rgba(200,160,42,0.25)", borderLeft: "2px solid rgba(200,160,42,0.5)" }}>
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#c8a02a" }}>🎗 Tapacanto</span>
          </div>
          <div style={{ padding: "10px 12px" }}>
          <div style={{ marginBottom: 8 }}>
            <Select label="Tipo de cinta" value={fp.tc.id} small
              onChange={(v) => setFp((p) => ({ ...p, tc: { ...p.tc, id: parseInt(v) } }))}
              options={[{ value: 0, label: "Sin tapacanto" }, ...(tapacanto || []).map((t) => ({ value: t.id, label: t.nombre }))]} />
          </div>
          <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <TextInput label={`Lados D1 (${fp.especial ? "libre" : "altura"})`} type="number" value={fp.tc.lados1} small
              onChange={(v) => setFp((p) => ({ ...p, tc: { ...p.tc, lados1: parseInt(v) || 0 } }))} />
            <TextInput label={`Lados D2 (${fp.especial ? "libre" : "ancho"})`} type="number" value={fp.tc.lados2} small
              onChange={(v) => setFp((p) => ({ ...p, tc: { ...p.tc, lados2: parseInt(v) || 0 } }))} />
          </div>
          {fp.tc.id > 0 && (
            <div style={{ fontSize: 11, marginTop: 8, fontFamily: "'DM Mono',monospace", color: "var(--accent)", background: "rgba(212,175,55,0.07)", borderRadius: 6, padding: "5px 10px" }}>
              → <strong>{fmtNum((parseInt(fp.cantidad || 1) * ((fp.tc.lados1 || 0) * d1 + (fp.tc.lados2 || 0) * d2)) / 1000, 2)} m lineales</strong>
            </div>
          )}
          </div>
        </div>

        {error && <p style={{ color: "#e07070", fontSize: 12 }}>⚠ {error}</p>}
        <button onClick={onAgregar} style={{
          width: "100%", padding: "9px 0", borderRadius: 8, cursor: "pointer", fontWeight: 700,
          fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: "0.05em",
          transition: "all 0.2s",
          background: "rgba(200,160,42,0.15)",
          border: "1px solid rgba(200,160,42,0.45)",
          color: "#c8a02a",
          boxShadow: "none",
        }}>
          {editando ? "✓ ACTUALIZAR PIEZA" : "+ AGREGAR ESTA PIEZA"}
        </button>
      </div>
      </div>
    </div>
  );
}

// ── StepIndicator + FormModulo ────────────────────────────────────
function StepIndicator({ paso }) {
  const steps = [
    ["1", "Datos"],
    ["2", "Piezas"],
    ["3", "Herrajes y MO"],
  ];
  return (
    <div style={{
      display: "flex", alignItems: "center", marginBottom: 28,
      padding: "14px 20px",
      background: "var(--bg-surface)",
      borderRadius: 12,
      border: "1px solid var(--border)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
    }}>
      {steps.map(([n, label], i) => {
        const done = paso > i + 1;
        const active = paso === i + 1;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 900, fontFamily: "'DM Mono',monospace",
                transition: "all 0.25s",
                background: active
                  ? "linear-gradient(135deg, var(--accent), #c8952a)"
                  : done ? "rgba(200,160,42,0.15)" : "rgba(255,255,255,0.04)",
                border: `2px solid ${active ? "var(--accent)" : done ? "rgba(200,160,42,0.5)" : "rgba(255,255,255,0.12)"}`,
                color: active ? "#0a0a0a" : done ? "#c8a02a" : "rgba(255,255,255,0.3)",
                boxShadow: active ? "0 0 16px rgba(212,175,55,0.4), 0 2px 8px rgba(0,0,0,0.4)" : "none",
              }}>
                {done ? "✓" : n}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{
                  fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.10em",
                  color: active ? "#c8a02a" : done ? "rgba(200,160,42,0.7)" : "rgba(255,255,255,0.3)",
                  transition: "color 0.2s",
                }}>
                  {label}
                </span>
                {active && (
                  <span style={{ fontSize: 9, color: "rgba(200,160,42,0.6)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em" }}>
                    EN CURSO
                  </span>
                )}
              </div>
            </div>
            {i < 2 && (
              <div style={{ flex: 1, height: 2, margin: "0 14px", borderRadius: 2,
                background: done
                  ? "linear-gradient(90deg, rgba(200,160,42,0.6), rgba(200,160,42,0.15))"
                  : "rgba(255,255,255,0.07)"
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── AcordeonPreviewSVG ────────────────────────────────────────────────────────
// Preview de solo lectura que vive en FormModulo paso 1.
// Cerrado por defecto — el carpintero lo expande si quiere ver la vista técnica.
function AcordeonPreviewSVG({ datos, herrajes }) {
  const [abierto, setAbierto] = useState(false);
  const { tema } = useTema();
  const moduloPreview = useMemo(() => ({
    dimensiones: datos.dimensiones,
    herrajes,
    variables: datos.variables || {},
    vistaConfig: null,
  }), [datos.dimensiones, datos.variables, herrajes]);

  return (
    <div style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
      <button
        onClick={() => setAbierto(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 14px", background: "var(--bg-subtle)", border: "none",
          cursor: "pointer", color: "var(--text-muted)", fontSize: 12,
          fontFamily: "'DM Mono',monospace", fontWeight: 700,
        }}
      >
        <span>▣ Vista técnica de frente</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>{abierto ? "▲" : "▼"}</span>
      </button>
      {abierto && (
        <div style={{
          padding: "14px 16px", background: "var(--bg-surface)",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 20, flexWrap: "wrap",
        }}>
          <VistaModuloSVG
            modulo={moduloPreview}
            theme={tema}
            width={180}
            height={180}
          />
          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
            <div>Solo lectura · se actualiza automáticamente</div>
            <div style={{ marginTop: 4, opacity: 0.7 }}>
              Para editar la composición visual, usá<br />el botón <strong>▣</strong> en la tarjeta del módulo.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormModulo({
  costos,
  onGuardar,
  onCancelar,
  moduloBase,
  codigoEditar,
  esDeepLinkPresupuesto = false, // true = viene de Nivel 3, mostrar modal antes de guardar
  presupuestosRef = {},          // para verificar presupuestos afectados al actualizar desde catálogo
  onRecalcularAfectados = null,  // (cod) → recalcula precios en presupuestos que usan ese módulo
}) {
  const esEdicion = !!codigoEditar;
  // Borrador persistido: solo para módulos nuevos (no edición de existentes)
  const _draft = !moduloBase ? cargarBorradorModulo() : null;
  const [paso, setPaso] = useState(() => esEdicion ? 2 : (_draft?.paso || 1));
  // Modal de decisión: aparece al guardar desde Nivel 3
  // null = cerrado, "pidiendo" = mostrando opciones, "nombre" = ingresando nombre para catálogo
  const [modalDecision, setModalDecision] = useState(null);
  const [nombreCatalogo, setNombreCatalogo] = useState("");
  // Cancelar con confirmación si hay cambios sin guardar
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  // Acordeón de decisión al guardar desde catálogo (no desde presupuesto)
  const [decisionCatalogo, setDecisionCatalogo] = useState(null);
  // "actualizando" | "nuevo" | null
  const [nombreNuevoCatalogo, setNombreNuevoCatalogo] = useState("");
  // Variables personalizadas: gestión del formulario de agregar
  const [agregandoVar, setAgregandoVar] = useState(false);
  const [nuevaVarNombre, setNuevaVarNombre] = useState("");
  const [datos, setDatos] = useState(() =>
    moduloBase
      ? {
          codigo: codigoEditar || "",
          nombre: moduloBase.nombre,
          descripcion: moduloBase.descripcion || "",
          dimensiones: { ...moduloBase.dimensiones },
          material: moduloBase.material,
          categoria: moduloBase.categoria || "otros",
          tipoVisual: moduloBase.tipoVisual || null,
          variables: moduloBase.variables ? { ...moduloBase.variables } : {}
        }
      : (_draft?.datos || {
          codigo: "",
          nombre: "",
          descripcion: "",
          dimensiones: { ancho: 600, profundidad: 550, alto: 700 },
          material: "melamina",
          categoria: "otros",
          tipoVisual: null,
          variables: {}
        })
  );
  const [piezas, setPiezas] = useState(() =>
    moduloBase
      ? moduloBase.piezas.map((p) => ({
          ...p,
          divisor: p.divisor || 1,
          divisor2: p.divisor2 || 1,
          tc: p.tc ? { ...p.tc } : { id: 0, lados1: 0, lados2: 0 }
        }))
      : (_draft?.piezas || [])
  );
  const [herrajes, setHerrajes] = useState(() =>
    moduloBase ? moduloBase.herrajes.map((h) => ({ ...h })) : (_draft?.herrajes || [])
  );
  const [moDeObra, setMoDeObra] = useState(() =>
    moduloBase ? { ...moduloBase.moDeObra } : (_draft?.moDeObra || { tipo: "por_modulo", horas: 0 })
  );

  // Persistir borrador automáticamente en cada cambio (solo módulos nuevos)
  useEffect(() => {
    if (moduloBase) return;
    guardarBorradorModulo({ paso, datos, piezas, herrajes, moDeObra });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso, datos, piezas, herrajes, moDeObra]);
  const [error, setError] = useState("");
  const [fp, setFp] = useState({ ...PIEZA_VACIA });
  const [fpError, setFpError] = useState("");
  // Edición de pieza existente: idx !== null = modo edición
  const [editandoPiezaIdx, setEditandoPiezaIdx] = useState(null);
  // Nombres sugeridos para autocompletado rápido
  const NOMBRES_SUGERIDOS = ["Lateral", "Base", "Techo", "Fondo", "Puerta", "Entrepaño", "Zarpa", "Zócalo", "Cajón"];
  const matDef =
    costos.materiales.find((m) => m.tipo === datos.material) ||
    costos.materiales[0];
  const espesor = matDef?.espesor || 18;
  const normalizarPieza = (p) => ({
    ...p,
    cantidad: Math.max(1, parseInt(p.cantidad) || 1),
    offsetEsp: parseInt(p.offsetEsp) || 0,
    offsetMm: parseInt(p.offsetMm) || 0,
    divisor: Math.max(1, parseInt(p.divisor) || 1),
    offsetEsp2: parseInt(p.offsetEsp2) || 0,
    offsetMm2: parseInt(p.offsetMm2) || 0,
    divisor2: Math.max(1, parseInt(p.divisor2) || 1),
    tc: {
      id: parseInt(p.tc?.id) || 0,
      lados1: parseInt(p.tc?.lados1) || 0,
      lados2: parseInt(p.tc?.lados2) || 0
    }
  });

  const agregarPieza = () => {
    if (!fp.nombre.trim()) { setFpError("Ingresá el nombre."); return; }
    const nueva = normalizarPieza(fp);
    if (editandoPiezaIdx !== null) {
      // Modo edición — reemplazar la pieza en su posición
      setPiezas(prev => prev.map((p, i) => i === editandoPiezaIdx ? nueva : p));
      setEditandoPiezaIdx(null);
    } else {
      setPiezas(prev => [...prev, nueva]);
    }
    setFp({ ...PIEZA_VACIA });
    setFpError("");
  };

  const editarPieza = (idx) => {
    setFp({ ...piezas[idx] });
    setEditandoPiezaIdx(idx);
    // Scroll al formulario
    setTimeout(() => document.getElementById("form-pieza")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const cancelarEdicion = () => {
    setFp({ ...PIEZA_VACIA });
    setEditandoPiezaIdx(null);
    setFpError("");
  };

  const duplicarPieza = (idx) => {
    const copia = { ...piezas[idx], nombre: `${piezas[idx].nombre} (copia)` };
    setPiezas(prev => [...prev.slice(0, idx + 1), copia, ...prev.slice(idx + 1)]);
  };

  const moverPieza = (idx, dir) => {
    const dest = idx + dir;
    if (dest < 0 || dest >= piezas.length) return;
    setPiezas(prev => {
      const n = [...prev];
      [n[idx], n[dest]] = [n[dest], n[idx]];
      return n;
    });
  };
  const siguiente = () => {
    if (paso === 1) {
      if (!datos.codigo.trim() || !datos.nombre.trim()) {
        setError("Código y nombre son obligatorios.");
        return;
      }
      setError("");
      setPaso(2);
    } else if (paso === 2) {
      if (piezas.length === 0) {
        setError("Agregá al menos una pieza.");
        return;
      }
      setError("");
      setPaso(3);
    }
  };
  // Detecta si el formulario fue modificado respecto al módulo original
  const hayCambios = () => {
    if (!moduloBase) return piezas.length > 0 || datos.nombre.trim() !== "";
    if (datos.nombre !== moduloBase.nombre ||
        datos.descripcion !== (moduloBase.descripcion || "") ||
        datos.material !== moduloBase.material ||
        datos.categoria !== (moduloBase.categoria || "otros") ||
        datos.tipoVisual !== (moduloBase.tipoVisual || null)) return true;
    if (JSON.stringify(datos.dimensiones) !== JSON.stringify(moduloBase.dimensiones)) return true;
    if (JSON.stringify(datos.variables || {}) !== JSON.stringify(moduloBase.variables || {})) return true;
    const piezasBase = (moduloBase.piezas || []).map(p => ({
      ...p, divisor: p.divisor || 1, divisor2: p.divisor2 || 1,
      tc: p.tc ? { ...p.tc } : { id: 0, lados1: 0, lados2: 0 }
    }));
    if (JSON.stringify(piezas) !== JSON.stringify(piezasBase)) return true;
    if (JSON.stringify(herrajes) !== JSON.stringify((moduloBase.herrajes || []).map(h => ({ ...h })))) return true;
    return false;
  };

  // Cancelar: pregunta si hubo cambios, cierra directo si no
  const handleCancelar = () => {
    if (hayCambios()) { setConfirmandoCancelar(true); }
    else { limpiarBorradorModulo(); onCancelar(); }
  };

  const datosGuardar = () => ({
    nombre:      datos.nombre,
    descripcion: datos.descripcion,
    dimensiones: datos.dimensiones,
    material:    datos.material,
    categoria:   datos.categoria || "otros",
    tipoVisual:  datos.tipoVisual || null,
    variables:   datos.variables || {},
    piezas,
    herrajes,
    moDeObra
  });

  // Wrapper: limpia el borrador antes de delegar al padre
  const guardarYLimpiar = (cod, d) => {
    limpiarBorradorModulo();
    onGuardar(cod, d);
  };

  const guardar = () => {
    // Desde presupuesto (Nivel 3): modal de decisión existente sin cambios
    if (esDeepLinkPresupuesto) {
      setNombreCatalogo(datos.nombre || "");
      setModalDecision("pidiendo");
      return;
    }
    // Desde catálogo directo: acordeón de decisión nuevo
    if (esEdicion) {
      setNombreNuevoCatalogo(`${datos.nombre} (copia)`);
      setDecisionCatalogo("pidiendo");
      return;
    }
    // Nuevo módulo — guardar directo
    guardarYLimpiar(datos.codigo.trim().toUpperCase(), datosGuardar());
  };
  const preview =
    piezas.length > 0
      ? calcularModulo({ ...datos, piezas, herrajes, moDeObra }, costos)
      : null;
  return (
    <div>
      <StepIndicator paso={paso} />
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            background: "rgba(200,60,60,0.10)",
            border: "1px solid rgba(200,60,60,0.30)",
            color: "#e08080"
          }}
        >
          ⚠ {error}
        </div>
      )}

      {paso === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* ── Bloque 1: Identificación ── */}
          <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 6px 28px rgba(0,0,0,0.4)", overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.10)", borderBottom: "1px solid rgba(200,160,42,0.25)", borderLeft: "3px solid rgba(200,160,42,0.5)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em", color: "#c8a02a" }}>📌 Identificación</span>
            </div>
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12, background: "var(--bg-surface)" }}>
              <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12 }}>
                <TextInput
                  label="Código"
                  placeholder="MC003"
                  value={datos.codigo}
                  onChange={(v) => setDatos((d) => ({ ...d, codigo: v.toUpperCase() }))}
                  disabled={esEdicion}
                  style={esEdicion ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
                />
                <TextInput
                  label="Nombre"
                  placeholder="Módulo bajo mesada 80cm"
                  value={datos.nombre}
                  onChange={(v) => setDatos((d) => ({ ...d, nombre: v }))}
                />
              </div>
              {esEdicion && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", marginTop: -6 }}>
                  El código no se puede modificar en modo edición
                </div>
              )}
              <TextInput
                label="Descripción (opcional)"
                value={datos.descripcion}
                onChange={(v) => setDatos((d) => ({ ...d, descripcion: v }))}
              />
            </div>
          </div>

          {/* ── Bloque 2: Dimensiones y Material ── */}
          <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 6px 28px rgba(0,0,0,0.4)", overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.10)", borderBottom: "1px solid rgba(200,160,42,0.25)", borderLeft: "3px solid rgba(200,160,42,0.5)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em", color: "#c8a02a" }}>📐 Dimensiones y Material</span>
            </div>
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12, background: "var(--bg-surface)" }}>
              <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                <TextInput label="Ancho (mm)" type="number" suffix="mm" value={datos.dimensiones.ancho}
                  onChange={(v) => setDatos((d) => ({ ...d, dimensiones: { ...d.dimensiones, ancho: parseInt(v) || 0 } }))} />
                <TextInput label="Profund. (mm)" type="number" suffix="mm" value={datos.dimensiones.profundidad}
                  onChange={(v) => setDatos((d) => ({ ...d, dimensiones: { ...d.dimensiones, profundidad: parseInt(v) || 0 } }))} />
                <TextInput label="Alto (mm)" type="number" suffix="mm" value={datos.dimensiones.alto}
                  onChange={(v) => setDatos((d) => ({ ...d, dimensiones: { ...d.dimensiones, alto: parseInt(v) || 0 } }))} />
                <Select label="Material" value={datos.material}
                  onChange={(v) => setDatos((d) => ({ ...d, material: v }))}
                  options={costos.materiales.map((m) => ({ value: m.tipo, label: `${m.nombre} (${m.espesor}mm)` }))} />
              </div>
              {matDef && (
                <div style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, background: "rgba(212,175,55,0.08)", border: "1px solid var(--accent-border)", color: "var(--accent)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ opacity: 0.5 }}>▶</span>
                  <span>Material activo: <strong>{matDef.nombre}</strong> — espesor <strong>{matDef.espesor}mm</strong></span>
                  {!esEdicion && moduloBase && (
                    <span style={{ marginLeft: 8, opacity: 0.6, fontSize: 11 }}>📋 Copia — editá el código antes de guardar.</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Bloque 3: Clasificación ── */}
          <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 6px 28px rgba(0,0,0,0.4)", overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.10)", borderBottom: "1px solid rgba(200,160,42,0.25)", borderLeft: "3px solid rgba(200,160,42,0.5)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em", color: "#c8a02a" }}>🏷 Clasificación</span>
            </div>
            <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--bg-surface)" }}>
              {/* Categoría */}
              <div style={{ padding: "14px 16px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 10 }}>Categoría</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {CATEGORIAS_DEFAULT.map(cat => {
                    const activa = datos.categoria === cat.id;
                    return (
                      <button key={cat.id} onClick={() => setDatos(d => ({ ...d, categoria: cat.id }))}
                        style={{
                          padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                          fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
                          transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5,
                          background: activa ? `${cat.color}22` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${activa ? cat.color : "rgba(255,255,255,0.1)"}`,
                          color: activa ? cat.color : "rgba(255,255,255,0.3)",
                          boxShadow: activa ? `0 0 14px ${cat.color}40` : "none",
                        }}>
                        {cat.icon} {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Tipo visual */}
              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 10 }}>Tipo visual — Plano 2D</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { id: null,    label: "Sin definir", icon: "—",  color: "#606880" },
                    { id: "bajo",  label: "Bajo",        icon: "⬇",  color: "#7090c8" },
                    { id: "aereo", label: "Aéreo",       icon: "⬆",  color: "#a070c8" },
                    { id: "torre", label: "Torre",       icon: "⬛", color: "var(--color-positive)" },
                  ].map((tipo) => {
                    const activo = datos.tipoVisual === tipo.id;
                    return (
                      <button key={String(tipo.id)} onClick={() => setDatos((d) => ({ ...d, tipoVisual: tipo.id }))}
                        style={{
                          padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                          fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
                          transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5,
                          background: activo ? `${tipo.color}22` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${activo ? tipo.color : "rgba(255,255,255,0.1)"}`,
                          color: activo ? tipo.color : "rgba(255,255,255,0.3)",
                          boxShadow: activo ? `0 0 14px ${tipo.color}40` : "none",
                        }}>
                        {tipo.icon} {tipo.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Preview técnico SVG — acordeón cerrado por defecto */}
          <AcordeonPreviewSVG datos={datos} herrajes={herrajes} />

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", paddingTop: 4 }}>
            <Btn variant="ghost" onClick={handleCancelar}>Cancelar</Btn>
            {esEdicion && (
              <Btn variant="ghost" onClick={guardar} style={{ borderColor: "var(--accent-border)", color: "var(--accent)" }}>
                💾 Guardar y cerrar
              </Btn>
            )}
            <Btn onClick={siguiente} style={{ background: "linear-gradient(135deg, var(--accent), #b8852a)", color: "#0a0a0a", fontWeight: 800, boxShadow: "0 4px 16px rgba(212,175,55,0.35)", border: "none" }}>
              Siguiente → Piezas
            </Btn>
          </div>
        </div>
      )}

      {paso === 2 && (
        // rsp-paso2: apila verticalmente en móvil
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Variables personalizadas — ancho completo, encima de las columnas */}
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 6px 28px rgba(0,0,0,0.4)" }}>
          <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.10)", borderBottom: "1px solid rgba(200,160,42,0.25)", borderLeft: "3px solid rgba(200,160,42,0.5)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em", color: "#c8a02a" }}>⚡ Variables del módulo</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>usables en fórmulas de piezas</span>
            <div style={{ flex: 1 }} />
            {!agregandoVar && (
              <button onClick={() => { setAgregandoVar(true); setNuevaVarNombre(""); }}
                style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px dashed var(--border)", color: "var(--text-muted)", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-border)"; e.currentTarget.style.color = "var(--accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                + Agregar variable
              </button>
            )}
          </div>

          <div style={{ padding: "12px 16px", background: "var(--bg-surface)" }}>
          {Object.entries(datos.variables || {}).length === 0 && !agregandoVar && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontStyle: "italic", fontFamily: "'DM Mono',monospace" }}>
              Sin variables — agregá una para usarla en fórmulas (ej: <span style={{ color: "var(--accent)" }}>luz</span>, <span style={{ color: "var(--accent)" }}>zocalo</span>).
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(datos.variables || {}).map(([nombre, valor]) => (
              <div key={nombre} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.22)", borderRadius: 8, padding: "5px 10px" }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>{nombre} =</span>
                <input
                  type="number"
                  value={valor}
                  onChange={e => setDatos(d => ({ ...d, variables: { ...d.variables, [nombre]: parseFloat(e.target.value) || 0 } }))}
                  style={{ width: 72, fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, padding: "3px 6px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-primary)", outline: "none", textAlign: "right" }}
                />
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>mm</span>
                <button
                  onClick={() => setDatos(d => { const { [nombre]: _r, ...rest } = d.variables; return { ...d, variables: rest }; })}
                  style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 16, lineHeight: 1, opacity: 0.5, padding: "0 2px" }}
                  onMouseEnter={e => e.target.style.opacity = 1}
                  onMouseLeave={e => e.target.style.opacity = 0.5}>×</button>
              </div>
            ))}

            {agregandoVar && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  autoFocus
                  value={nuevaVarNombre}
                  onChange={e => setNuevaVarNombre(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const n = nuevaVarNombre.trim();
                      if (n && !(n in (datos.variables || {}))) {
                        setDatos(d => ({ ...d, variables: { ...(d.variables || {}), [n]: 0 } }));
                        setNuevaVarNombre("");
                        setAgregandoVar(false);
                      }
                    }
                    if (e.key === 'Escape') { setAgregandoVar(false); setNuevaVarNombre(""); }
                  }}
                  placeholder="nombre (ej: luz)"
                  style={{ width: 130, fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "5px 8px", background: "var(--bg-base)", border: "1px solid var(--accent-border)", borderRadius: 6, color: "var(--text-primary)", outline: "none" }}
                />
                <button
                  onClick={() => {
                    const n = nuevaVarNombre.trim();
                    if (n && !(n in (datos.variables || {}))) {
                      setDatos(d => ({ ...d, variables: { ...(d.variables || {}), [n]: 0 } }));
                      setNuevaVarNombre("");
                      setAgregandoVar(false);
                    }
                  }}
                  style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)" }}>
                  Agregar
                </button>
                <button onClick={() => { setAgregandoVar(false); setNuevaVarNombre(""); }}
                  style={{ padding: "5px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* ── Fila 2: FormPieza ancho completo ── */}
        <FormPieza
          fp={fp} setFp={setFp}
          onAgregar={agregarPieza}
          onCancelar={cancelarEdicion}
          editando={editandoPiezaIdx !== null}
          error={fpError}
          dims={datos.dimensiones}
          espesor={espesor}
          tapacanto={costos.tapacanto}
          nombresSugeridos={NOMBRES_SUGERIDOS}
          variables={datos.variables}
        />

        {/* ── Fila 3: Lista de piezas ── */}
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 6px 28px rgba(0,0,0,0.4)" }}>
          <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.10)", borderBottom: "1px solid rgba(200,160,42,0.25)", borderLeft: "3px solid rgba(200,160,42,0.5)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em", color: "#c8a02a" }}>
              🪵 Piezas <span style={{ color: "var(--accent)", marginLeft: 6 }}>({piezas.length})</span>
            </span>
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.3)" }}>
              Espesor: <span style={{ color: "var(--accent)" }}>{espesor}mm</span>
            </span>
          </div>
          <div style={{ padding: "12px 14px", background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: 6 }}>

          {piezas.length === 0 ? (
            <div style={{ padding: "28px 0", textAlign: "center", fontSize: 12, borderRadius: 8, border: "1px dashed rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono',monospace" }}>
              Sin piezas todavía — agregá la primera arriba
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {piezas.map((p, i) => (
                <FilaPieza
                  key={i}
                  pieza={p}
                  idx={i}
                  dims={datos.dimensiones}
                  espesor={espesor}
                  tapacanto={costos.tapacanto}
                  isFirst={i === 0}
                  isLast={i === piezas.length - 1}
                  modVars={datos.variables}
                  onDelete={(i) => {
                    setPiezas(prev => prev.filter((_, j) => j !== i));
                    if (editandoPiezaIdx === i) cancelarEdicion();
                  }}
                  onEdit={editarPieza}
                  onDuplicate={duplicarPieza}
                  onMoveUp={(i) => moverPieza(i, -1)}
                  onMoveDown={(i) => moverPieza(i, 1)}
                  onChangeCantidad={(cant) => setPiezas(prev => prev.map((px, j) => j === i ? { ...px, cantidad: cant } : px))}
                />
              ))}
            </div>
          )}

          {/* Preview métricas */}
          {preview && (
            <Card style={{ borderColor: "rgba(126,207,138,0.15)" }}>
              <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                {[
                  ["m² neto", `${fmtNum(preview.m2Neto)} m²`],
                  ["m² c/desp.", `${fmtNum(preview.m2Total)} m²`],
                  [`Desp.(${preview.pctDesp}%)`, `${fmtNum(preview.m2Total - preview.m2Neto)} m²`],
                  ["Tapacanto", `${fmtNum(preview.metrosTapacanto, 2)} m`],
                ].map(([k, v]) => (
                  <div key={k} style={{ textAlign: "center", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 14, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--text-primary)" }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          </div>
        </div>

        {/* ── Fila 4: Botones de navegación ── */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", paddingTop: 4 }}>
          <Btn variant="ghost" onClick={() => { setPaso(1); setError(""); }}>← Volver</Btn>
          <Btn variant="ghost" onClick={handleCancelar}>Cancelar</Btn>
          {esEdicion && !modalDecision && !decisionCatalogo && (
            <Btn variant="ghost" onClick={guardar} style={{ borderColor: "var(--accent-border)", color: "var(--accent)" }}>
              💾 Guardar y cerrar
            </Btn>
          )}
          {!modalDecision && !decisionCatalogo && (
            <button onClick={siguiente} disabled={piezas.length === 0}
              style={{ padding: "10px 22px", borderRadius: 8, cursor: piezas.length === 0 ? "default" : "pointer", fontWeight: 900, fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: "0.06em", transition: "all 0.2s", background: piezas.length === 0 ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, var(--accent), #b8852a)", border: "none", color: piezas.length === 0 ? "rgba(255,255,255,0.2)" : "#0a0a0a", boxShadow: piezas.length === 0 ? "none" : "0 4px 16px rgba(212,175,55,0.35)" }}>
              Siguiente → Herrajes
            </button>
          )}
        </div>

        {/* Acordeón de decisión inline */}
        {modalDecision && (
          <div className="anim-fadeup" style={{ background: "var(--bg-subtle)", border: "1px solid var(--accent-border)", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: 12 }}>
              ¿Dónde guardás esta variante?
            </div>
            {modalDecision === "nombre" ? (
              <>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Nombre en el catálogo:</div>
                <input autoFocus value={nombreCatalogo} onChange={e => setNombreCatalogo(e.target.value)}
                  placeholder="Nombre del nuevo módulo..."
                  style={{ width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: "8px 12px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", outline: "none", marginBottom: 10, boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                  onKeyDown={e => e.key === "Enter" && guardarYLimpiar(datos.codigo.trim().toUpperCase(), { ...datosGuardar(), nombre: nombreCatalogo.trim() || datos.nombre, _guardarEnCatalogo: true })} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { guardarYLimpiar(datos.codigo.trim().toUpperCase(), { ...datosGuardar(), nombre: nombreCatalogo.trim() || datos.nombre, _guardarEnCatalogo: true }); setModalDecision(null); }}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)" }}>
                    ✓ Confirmar nombre
                  </button>
                  <button onClick={() => setModalDecision("pidiendo")}
                    style={{ padding: "9px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                    ← Volver
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => { guardarYLimpiar(datos.codigo.trim().toUpperCase(), { ...datosGuardar(), _soloPresupuesto: true }); setModalDecision(null); }}
                  style={{ padding: "11px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700, transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                  📋 Solo en este presupuesto
                  <div style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)", marginTop: 3 }}>El catálogo no cambia. Se elimina con el presupuesto.</div>
                </button>
                <button onClick={() => { setNombreCatalogo(datos.nombre || ""); setModalDecision("nombre"); }}
                  style={{ padding: "11px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700, transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                  📚 Guardar en catálogo
                  <div style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)", marginTop: 3 }}>Disponible para futuros presupuestos.</div>
                </button>
                <button onClick={() => setModalDecision(null)}
                  style={{ padding: "7px 0", borderRadius: 8, cursor: "pointer", fontSize: 11, background: "transparent", border: "none", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                  ✕ Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        </div>
      )}

      {paso === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            className="rsp-grid-1"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
          >
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 6px 28px rgba(0,0,0,0.4)" }}>
              <div style={{ background: "rgba(255,255,255,0.10)", borderLeft: "3px solid rgba(200,160,42,0.5)", padding: "10px 16px" }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c8a02a" }}>🔩 Herrajes</span>
              </div>
              <div style={{ padding: "12px 16px", background: "var(--bg-surface)" }}>
              {costos.herrajes.map((h) => {
                const item = herrajes.find((x) => x.id === h.id);
                const cant = item?.cantidad || 0;
                return (
                  <div
                    key={h.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--border)"
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 13, color: "var(--text-primary)" }}
                      >
                        {h.nombre}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {fmtPeso(h.precio)}/{h.unidad}
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      {[
                        [
                          "−",
                          () =>
                            setHerrajes((prev) => {
                              const idx = prev.findIndex((x) => x.id === h.id);
                              if (cant <= 1)
                                return prev.filter((x) => x.id !== h.id);
                              const n = [...prev];
                              n[idx].cantidad--;
                              return n;
                            }),
                        ],
                        [
                          "+",
                          () =>
                            setHerrajes((prev) => {
                              const idx = prev.findIndex((x) => x.id === h.id);
                              if (idx < 0)
                                return [...prev, { id: h.id, cantidad: 1 }];
                              const n = [...prev];
                              n[idx].cantidad++;
                              return n;
                            }),
                        ],
                      ].map(([lbl, fn]) => (
                        <button
                          key={lbl}
                          onClick={fn}
                          style={{
                            width: 28,
                            height: 28,
                            background: "var(--accent-soft)",
                            border: "1px solid var(--accent-border)",
                            color: "var(--accent)",
                            borderRadius: 5,
                            cursor: "pointer",
                            fontSize: 15,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          {lbl}
                        </button>
                      ))}
                      <span
                        style={{
                          fontFamily: "'DM Mono',monospace",
                          width: 24,
                          textAlign: "center",
                          color:
                            cant > 0 ? "var(--accent)" : "var(--text-muted)"
                        }}
                      >
                        {cant}
                      </span>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 6px 28px rgba(0,0,0,0.4)" }}>
                <div style={{ background: "rgba(255,255,255,0.10)", borderLeft: "3px solid rgba(200,160,42,0.5)", padding: "10px 16px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c8a02a" }}>🔨 Mano de obra</span>
                </div>
                <div style={{ padding: "12px 16px", background: "var(--bg-surface)" }}>
                <Select
                  label="Tipo"
                  value={moDeObra.tipo}
                  onChange={(v) => setMoDeObra((m) => ({ ...m, tipo: v }))}
                  options={costos.manoDeObra.map((m) => ({
                    value: m.tipo,
                    label: `${m.nombre} — ${fmtPeso(m.precio)}`
                  }))}
                />
                {moDeObra.tipo === "por_hora" && (
                  <div style={{ marginTop: 10 }}>
                    <TextInput
                      label="Horas estimadas"
                      type="number"
                      suffix="hs"
                      value={moDeObra.horas}
                      onChange={(v) =>
                        setMoDeObra((m) => ({
                          ...m,
                          horas: parseFloat(v) || 0
                        }))
                      }
                    />
                    {/* Indicador: impacto de gastos fijos en estas horas */}
                    {(() => {
                      const gf = costos.gastosFijos;
                      if (!gf?.items?.length || !moDeObra.horas) return null;
                      const totalMensual = gf.items.reduce((a, i) => a + (parseFloat(i.monto) || 0), 0);
                      const costoHora = gf.horasProductivasMes > 0 ? totalMensual / gf.horasProductivasMes : 0;
                      const impacto = Math.round(costoHora * moDeObra.horas);
                      return (
                        <div style={{
                          marginTop: 8, padding: "7px 11px", borderRadius: 7,
                          background: "rgba(112,144,176,0.10)", border: "1px solid rgba(112,144,176,0.25)",
                          display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                            ⏱ {moDeObra.horas}h × {fmtPeso(Math.round(costoHora))}/h taller
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#7090c0", fontFamily: "'DM Mono',monospace" }}>
                            {fmtPeso(impacto)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
                </div>
              </div>
              {(() => {
                const c = calcularModulo(
                  { ...datos, piezas, herrajes, moDeObra },
                  costos
                );
                if (!c) return null;
                return (
                  <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(126,207,138,0.3)", boxShadow: "0 6px 28px rgba(0,0,0,0.4)" }}>
                    <div style={{ background: "rgba(255,255,255,0.10)", borderLeft: "3px solid rgba(200,160,42,0.5)", padding: "10px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c8a02a" }}>📊 Resumen de costos</span>
                    </div>
                    <div style={{ padding: "12px 16px", background: "var(--bg-surface)" }}>
                    {[
                      [
                        "Material",
                        c.costoMaterial,
                        `${fmtNum(c.m2Neto)}m²+${c.pctDesp}%`,
                      ],
                      [
                        "Tapacanto",
                        c.costoTapacanto,
                        `${fmtNum(c.metrosTapacanto, 2)}m`,
                      ],
                      ["MO", c.costoMO, ""],
                      ["Herrajes", c.costoHerrajes, ""],
                      ["── Costo base", c.costoBase, ""],
                      ["Ganancia", c.ganancia, ""],
                    ].map(([k, v, note]) => (
                      <div
                        key={k}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "4px 0",
                          borderBottom: "1px solid var(--border)",
                          fontSize: 13
                        }}
                      >
                        <span
                          style={{
                            color: k.startsWith("──")
                              ? "var(--text-primary)"
                              : "var(--text-muted)",
                            fontWeight: k.startsWith("──") ? 700 : 400
                          }}
                        >
                          {k}
                        </span>
                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              fontFamily: "'DM Mono',monospace",
                              color: "#c8c098"
                            }}
                          >
                            {fmtPeso(v)}
                          </span>
                          {note && (
                            <span
                              style={{
                                fontSize: 10,
                                marginLeft: 6,
                                color: "var(--text-muted)"
                              }}
                            >
                              {note}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingTop: 12,
                        marginTop: 4,
                        borderTop: "1px solid rgba(126,207,138,0.2)"
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                        Precio de venta
                      </span>
                      <span
                        style={{
                          fontFamily: "'DM Mono',monospace",
                          fontSize: 22,
                          fontWeight: 900,
                          color: "var(--color-positive)",
                          textShadow: "0 0 20px rgba(126,207,138,0.4)"
                        }}
                      >
                        {fmtPeso(c.total)}
                      </span>
                    </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button
              onClick={() => { setPaso(2); setError(""); }}
              style={{ padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: "0.04em", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-muted)", transition: "all 0.15s" }}>
              ← Volver
            </button>
            <button onClick={handleCancelar}
              style={{ padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: "0.04em", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-muted)", transition: "all 0.15s" }}>
              Cancelar
            </button>
            <button onClick={guardar}
              style={{ padding: "10px 22px", borderRadius: 8, cursor: "pointer", fontWeight: 900, fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: "0.06em", transition: "all 0.2s", background: "linear-gradient(135deg, var(--accent), #b8852a)", border: "none", color: "#0a0a0a", boxShadow: "0 4px 16px rgba(212,175,55,0.35)" }}>
              {esEdicion ? "✓ Guardar cambios" : "✓ Guardar módulo"}
            </button>
          </div>
        </div>
      )}

      {/* ── Acordeón de decisión al guardar desde catálogo directo ── */}
      {decisionCatalogo && !esDeepLinkPresupuesto && (
        <div className="anim-fadeup" style={{ marginTop: 14, background: "var(--bg-subtle)", border: "1px solid var(--accent-border)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: 12 }}>
            ¿Cómo querés guardar?
          </div>
          {decisionCatalogo?.tipo === "confirmarAfectados" ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#c8a02a", marginBottom: 8 }}>
                ⚠ Este módulo se usa en {decisionCatalogo.afectados.length} presupuesto{decisionCatalogo.afectados.length !== 1 ? "s" : ""}:
              </div>
              <div style={{ marginBottom: 12 }}>
                {decisionCatalogo.afectados.slice(0, 4).map((n, i) => (
                  <div key={i} style={{ fontSize: 11, color: "var(--text-muted)", paddingLeft: 8, lineHeight: 1.8 }}>· {n}</div>
                ))}
                {decisionCatalogo.afectados.length > 4 && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", paddingLeft: 8 }}>· y {decisionCatalogo.afectados.length - 4} más...</div>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
                Sus precios pueden quedar desactualizados. Podés recalcularlos ahora o hacerlo después desde "Mis presupuestos".
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => {
                  const cod = datos.codigo.trim().toUpperCase();
                  onGuardar(cod, datosGuardar());
                  // Disparar recálculo en los presupuestos afectados
                  if (onRecalcularAfectados) onRecalcularAfectados(cod);
                  setDecisionCatalogo(null);
                }} style={{ padding: "10px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", fontSize: 12, fontWeight: 700 }}>
                  ✓ Actualizar módulo y recalcular precios
                </button>
                <button onClick={() => {
                  guardarYLimpiar(datos.codigo.trim().toUpperCase(), datosGuardar());
                  setDecisionCatalogo(null);
                }} style={{ padding: "10px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700 }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                  Actualizar solo el catálogo
                  <div style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginTop: 2 }}>Los presupuestos muestran ↻ cuando los abrás.</div>
                </button>
                <button onClick={() => setDecisionCatalogo("pidiendo")}
                  style={{ padding: "7px 0", borderRadius: 8, cursor: "pointer", fontSize: 11, background: "transparent", border: "none", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                  ← Volver
                </button>
              </div>
            </div>
          ) : decisionCatalogo === "nuevo" ? (
            <>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Nombre del nuevo módulo:</div>
              <input autoFocus value={nombreNuevoCatalogo} onChange={e => setNombreNuevoCatalogo(e.target.value)}
                placeholder="Nombre del nuevo módulo..."
                style={{ width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: "8px 12px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", outline: "none", marginBottom: 10, boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
                onKeyDown={e => e.key === "Enter" && document.getElementById("btn-crear-nuevo-mod")?.click()} />

              {/* Checkboxes: presupuestos que usan el original */}
              {(() => {
                const cod = datos.codigo.trim().toUpperCase();
                const afectados = Object.entries(presupuestosRef || {})
                  .filter(([, p]) => (p.items || []).some(it => it.codigo === cod));
                if (afectados.length === 0) return null;
                return (
                  <div style={{ marginBottom: 12, padding: "10px 12px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      ¿Reemplazar el módulo en estos presupuestos?
                    </div>
                    {afectados.map(([pid, p]) => {
                      const checked = (decisionCatalogo?.seleccionados || new Set(afectados.map(([id]) => id))).has(pid);
                      return (
                        <label key={pid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)" }}>
                          <input type="checkbox" checked={checked}
                            onChange={e => {
                              const sel = new Set(decisionCatalogo?.seleccionados || afectados.map(([id]) => id));
                              e.target.checked ? sel.add(pid) : sel.delete(pid);
                              setDecisionCatalogo({ ...decisionCatalogo, seleccionados: sel });
                            }}
                            style={{ accentColor: "var(--accent)", width: 14, height: 14, cursor: "pointer" }} />
                          <span style={{ flex: 1 }}>{p.nombre || "Sin nombre"}</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--color-positive)" }}>{fmtPeso(p.total)}</span>
                        </label>
                      );
                    })}
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
                      Reemplaza todas las instancias del módulo original en los seleccionados.
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", gap: 8 }}>
                <Btn id="btn-crear-nuevo-mod" onClick={() => {
                  const newCod = `MC${String(Date.now()).slice(-6)}`;
                  const nombreFinal = nombreNuevoCatalogo.trim() || datos.nombre;
                  onGuardar(newCod, { ...datosGuardar(), nombre: nombreFinal });
                  // Reemplazar en los presupuestos seleccionados
                  const cod = datos.codigo.trim().toUpperCase();
                  const afectados = Object.entries(presupuestosRef || {})
                    .filter(([, p]) => (p.items || []).some(it => it.codigo === cod));
                  const seleccionados = decisionCatalogo?.seleccionados || new Set(afectados.map(([id]) => id));
                  afectados.forEach(([pid, p]) => {
                    if (!seleccionados.has(pid)) return;
                    const itemsActualizados = (p.items || []).map(it =>
                      it.codigo === cod ? { ...it, codigo: newCod } : it
                    );
                    const instancias = itemsActualizados.filter(it => it.codigo === newCod).length;
                    if (instancias > 0 && onRecalcularAfectados) {
                      onRecalcularAfectados(cod, pid, itemsActualizados);
                    }
                  });
                  setDecisionCatalogo(null);
                }}>✓ Crear módulo nuevo</Btn>
                <Btn variant="ghost" onClick={() => setDecisionCatalogo("pidiendo")}>← Volver</Btn>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => {
                // Verificar si hay presupuestos afectados antes de guardar
                const cod = datos.codigo.trim().toUpperCase();
                const afectados = Object.entries(presupuestosRef || {})
                  .filter(([, p]) => (p.items || []).some(it => it.codigo === cod))
                  .map(([, p]) => p.nombre || "Sin nombre");
                if (afectados.length > 0) {
                  setDecisionCatalogo({ tipo: "confirmarAfectados", afectados });
                } else {
                  onGuardar(cod, datosGuardar());
                  setDecisionCatalogo(null);
                }
              }} style={{ padding: "11px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", fontSize: 12, fontWeight: 700 }}>
                ✓ Actualizar este módulo
                <div style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginTop: 3 }}>
                  Sobreescribe el módulo existente en el catálogo.
                </div>
              </button>
              <button onClick={() => setDecisionCatalogo("nuevo")}
                style={{ padding: "11px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                ➕ Guardar como módulo nuevo
                <div style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginTop: 3 }}>
                  El original queda intacto. Se crea una copia con nuevo nombre.
                </div>
              </button>
              <button onClick={() => setDecisionCatalogo(null)}
                style={{ padding: "7px 0", borderRadius: 8, cursor: "pointer", fontSize: 11, background: "transparent", border: "none", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                ✕ Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Acordeón de confirmación al Cancelar con cambios ── */}
      {confirmandoCancelar && (
        <div className="anim-fadeup" style={{ marginTop: 14, background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.25)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#e07070", marginBottom: 8 }}>
            ¿Descartás los cambios?
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
            Hay cambios sin guardar. Si salís ahora se pierden.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { limpiarBorradorModulo(); onCancelar(); }}
              style={{ padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070" }}>
              Descartar cambios
            </button>
            <button onClick={() => setConfirmandoCancelar(false)}
              style={{ padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
              Seguir editando
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════
// ── CatalogoModulos ───────────────────────────────────────────────
function AccionesModulo({ onEditar, onEliminar, onDuplicar, onAbrirVista, presupuestosAfectados = [] }) {
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

function TarjetaModuloGrid({ cod, mod, c, onEditar, onEliminar, onDuplicar, onAbrirVista, onImagenChange, presupuestosAfectados = [] }) {
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
          <AccionesModulo onEditar={onEditar} onEliminar={onEliminar} onDuplicar={onDuplicar} onAbrirVista={onAbrirVista} presupuestosAfectados={presupuestosAfectados} />
        </div>
      </div>
    </Card>
  );
}

// ── Botones de acción para vista móvil (4 en fila, ícono puro) ────
function AccionesMobileMod({ onEditar, onEliminar, onDuplicar, onAbrirVista, presupuestosAfectados = [] }) {
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

function FilaModuloLista({ cod, mod, c, onEditar, onEliminar, onDuplicar, onAbrirVista, onImagenChange, presupuestosAfectados = [] }) {
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
        <AccionesModulo onEditar={onEditar} onEliminar={onEliminar} onDuplicar={onDuplicar} onAbrirVista={onAbrirVista} presupuestosAfectados={presupuestosAfectados} />
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
        <AccionesMobileMod onEditar={onEditar} onEliminar={onEliminar} onDuplicar={onDuplicar} onAbrirVista={onAbrirVista} presupuestosAfectados={presupuestosAfectados} />
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
            onRecalcularAfectados={(cod, pid, itemsReemplazados) => {
              // Caso 1: reemplazo de items (guardar como nuevo módulo con checkboxes)
              if (pid && itemsReemplazados) {
                if (onGuardarPresupuestoAfectado) {
                  onGuardarPresupuestoAfectado(pid, { items: itemsReemplazados });
                }
                return;
              }
              // Caso 2: recalcular precios en todos los presupuestos que usan ese módulo
              const tsAhora = Date.now();
              Object.entries(presupuestos || {}).forEach(([presId, p]) => {
                if (!(p.items || []).some(it => it.codigo === cod)) return;
                const nuevoTotal = (p.items || []).reduce((acc, it) => {
                  const base = modulos[it.codigo];
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
