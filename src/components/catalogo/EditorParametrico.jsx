// ════════════════════════════════════════════════════════════════════════════
// EditorParametrico.jsx — editor del schema paramétrico del módulo
// ════════════════════════════════════════════════════════════════════════════
//
// Panel inferior del FormModulo. Edita los tres arrays nuevos del schema:
//   • parametros[] — inputs que el usuario del presupuesto puede modificar
//   • zonas[]      — agrupaciones de piezas con material propio (libres)
//   • constraints[]— validaciones del módulo (expr booleana + mensaje)
//
// Recibe el estado actual y un handler único onChange. El padre (FormModulo)
// guarda esto en su `datos` y lo persiste en datosGuardar().
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { TIPO_MAT } from '../../constants.js';
import { inspeccionarFormula } from '../../utils.js';
import { generarPiezas } from '../../services/moduloService.js';
import ConfiguradorParametrico from '../presupuesto/ConfiguradorParametrico.jsx';

// Variables que siempre están disponibles para fórmulas dentro de un módulo:
// dims base + esp + raíces de dot notation comunes.
const VARS_BASE = ['ancho', 'alto', 'profundidad', 'esp', 'i', 'parent', 'material'];

// Componente input que muestra warning en rojo cuando la fórmula tiene
// identificadores no reconocidos. Recibe la lista de IDs de parámetros del
// módulo para sumarlos a las vars conocidas.
function InputFormula({ value, onChange, placeholder, paramsConocidos = [] }) {
  const conocidas = [...VARS_BASE, ...paramsConocidos];
  const { ok, desconocidas } = inspeccionarFormula(value, conocidas);
  const tieneError = !ok && (value || '').trim() !== '';
  return (
    <>
      <input value={value || ''} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputBase, width: "100%", boxSizing: "border-box",
          border: `1px solid ${tieneError ? "rgba(224,112,112,0.55)" : "var(--border)"}`,
        }} />
      {tieneError && (
        <div style={{ fontSize: 9, color: "#e07070", marginTop: 3,
          fontFamily: "'DM Mono',monospace", letterSpacing: "0.02em" }}>
          ⚠ desconocida{desconocidas.length > 1 ? 's' : ''}: {desconocidas.join(', ')}
        </div>
      )}
    </>
  );
}

const TIPOS_PARAM = [
  { id: "number",  label: "Número decimal" },
  { id: "integer", label: "Número entero" },
  { id: "boolean", label: "Sí / No" },
  { id: "choice",  label: "Opción de lista" },
  { id: "formula", label: "Fórmula calculada" },
];

// ── Estilos compartidos (DM Mono / tokens del proyecto) ──────────────────────
const inputBase = {
  fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "6px 8px",
  background: "var(--bg-base)", border: "1px solid var(--border)",
  borderRadius: 6, color: "var(--text-primary)", outline: "none",
};
const lbl = {
  fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
  color: "var(--text-muted)", textTransform: "uppercase",
  letterSpacing: "0.08em", marginBottom: 4,
};
const btnAdd = {
  padding: "8px 14px", borderRadius: 8, cursor: "pointer",
  fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
  background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.45)",
  color: "#c8a02a",
};
const btnDel = {
  padding: "4px 10px", borderRadius: 6, cursor: "pointer",
  fontFamily: "'DM Mono',monospace", fontSize: 10,
  background: "transparent", border: "1px solid rgba(200,60,60,0.30)",
  color: "#e07070",
};
const subSecHdr = (icon, title, count, isOpen, onToggle) => (
  <div onClick={onToggle} style={{
    padding: "9px 14px", background: "rgba(200,160,42,0.06)",
    borderLeft: "2px solid rgba(200,160,42,0.45)",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    cursor: "pointer", userSelect: "none",
  }}>
    <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.10em", color: "#c8a02a" }}>
      {icon} {title} <span style={{ color: "var(--text-muted)", marginLeft: 6, fontWeight: 400 }}>({count})</span>
    </span>
    <span style={{ fontSize: 9, color: "var(--text-muted)", transition: "transform 0.2s",
      display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ListaParametros
// ─────────────────────────────────────────────────────────────────────────────

function ListaParametros({ parametros, onChange }) {
  const otrosParams = parametros.map(p => p.id).filter(Boolean);
  const update = (idx, patch) => onChange(parametros.map((p, i) => i === idx ? { ...p, ...patch } : p));
  const remove = (idx) => onChange(parametros.filter((_, i) => i !== idx));
  const add = () => onChange([...parametros, {
    id: `param${parametros.length + 1}`, nombre: "", tipo: "integer", def: 0,
  }]);

  if (parametros.length === 0) {
    return (
      <div style={{ padding: "20px 14px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10,
          fontFamily: "'DM Mono',monospace" }}>
          Sin parámetros — el módulo no es configurable por el usuario del presupuesto.
        </div>
        <button onClick={add} style={btnAdd}>+ Agregar parámetro</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {parametros.map((p, idx) => (
        <div key={idx} style={{
          padding: 10, background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: 8, display: "grid",
          gridTemplateColumns: "1.2fr 1.6fr 1.6fr 1fr 1fr 80px",
          gap: 8, alignItems: "end",
        }}>
          <div>
            <div style={lbl}>ID</div>
            <input value={p.id} onChange={e => update(idx, { id: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Nombre visible</div>
            <input value={p.nombre} onChange={e => update(idx, { nombre: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Tipo</div>
            <select value={p.tipo} onChange={e => update(idx, { tipo: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }}>
              {TIPOS_PARAM.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          {p.tipo === "formula" ? (
            <div style={{ gridColumn: "span 2" }}>
              <div style={lbl}>Expresión</div>
              <InputFormula value={p.expr} placeholder="ej: alto - 2*esp"
                onChange={(v) => update(idx, { expr: v })}
                paramsConocidos={otrosParams.filter(id => id !== p.id)} />
            </div>
          ) : p.tipo === "choice" ? (
            <div style={{ gridColumn: "span 2" }}>
              <div style={lbl}>Opciones (separadas por coma)</div>
              <input
                value={(p.opciones || []).join(", ")}
                placeholder="liso, manija, gola"
                onChange={e => update(idx, { opciones: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
            </div>
          ) : p.tipo === "boolean" ? (
            <div style={{ gridColumn: "span 2" }}>
              <div style={lbl}>Default</div>
              <select value={p.def ? "true" : "false"}
                onChange={e => update(idx, { def: e.target.value === "true" })}
                style={{ ...inputBase, width: "100%", boxSizing: "border-box" }}>
                <option value="false">No</option>
                <option value="true">Sí</option>
              </select>
            </div>
          ) : (
            <>
              <div>
                <div style={lbl}>Default</div>
                <input type="number" value={p.def ?? ""}
                  onChange={e => update(idx, { def: parseFloat(e.target.value) || 0 })}
                  style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={lbl}>Min / Max</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <input type="number" value={p.min ?? ""} placeholder="min"
                    onChange={e => update(idx, { min: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                    style={{ ...inputBase, width: "50%", boxSizing: "border-box" }} />
                  <input type="number" value={p.max ?? ""} placeholder="max"
                    onChange={e => update(idx, { max: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                    style={{ ...inputBase, width: "50%", boxSizing: "border-box" }} />
                </div>
              </div>
            </>
          )}
          <button onClick={() => remove(idx)} style={btnDel}>✕ Quitar</button>
        </div>
      ))}
      <button onClick={add} style={btnAdd}>+ Agregar parámetro</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ListaZonas
// ─────────────────────────────────────────────────────────────────────────────

function ListaZonas({ zonas, onChange }) {
  const update = (idx, patch) => onChange(zonas.map((z, i) => i === idx ? { ...z, ...patch } : z));
  const remove = (idx) => onChange(zonas.filter((_, i) => i !== idx));
  const add = () => onChange([...zonas, {
    id: `zona${zonas.length + 1}`, nombre: "", material: "melamina",
  }]);

  if (zonas.length === 0) {
    return (
      <div style={{ padding: "20px 14px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10,
          fontFamily: "'DM Mono',monospace" }}>
          Sin zonas — todas las piezas usan el material del módulo.
        </div>
        <button onClick={add} style={btnAdd}>+ Agregar zona</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {zonas.map((z, idx) => (
        <div key={idx} style={{
          padding: 10, background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: 8, display: "grid",
          gridTemplateColumns: "1.2fr 1.6fr 1.6fr 1fr 80px",
          gap: 8, alignItems: "end",
        }}>
          <div>
            <div style={lbl}>ID</div>
            <input value={z.id} onChange={e => update(idx, { id: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Nombre (ej: frente, cuerpo)</div>
            <input value={z.nombre} onChange={e => update(idx, { nombre: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Material</div>
            <select value={z.material} onChange={e => update(idx, { material: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }}>
              {Object.entries(TIPO_MAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <div style={lbl}>Espesor (opcional)</div>
            <input type="number" value={z.espesor ?? ""}
              placeholder="usa el del material"
              onChange={e => update(idx, { espesor: e.target.value === "" ? undefined : parseInt(e.target.value) || undefined })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <button onClick={() => remove(idx)} style={btnDel}>✕ Quitar</button>
        </div>
      ))}
      <button onClick={add} style={btnAdd}>+ Agregar zona</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ListaConstraints
// ─────────────────────────────────────────────────────────────────────────────

function ListaConstraints({ constraints, onChange, paramsConocidos = [] }) {
  const update = (idx, patch) => onChange(constraints.map((c, i) => i === idx ? { ...c, ...patch } : c));
  const remove = (idx) => onChange(constraints.filter((_, i) => i !== idx));
  const add = () => onChange([...constraints, { expr: "", msg: "" }]);

  if (constraints.length === 0) {
    return (
      <div style={{ padding: "20px 14px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10,
          fontFamily: "'DM Mono',monospace" }}>
          Sin reglas — el módulo no valida combinaciones inválidas.
        </div>
        <button onClick={add} style={btnAdd}>+ Agregar regla</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {constraints.map((c, idx) => (
        <div key={idx} style={{
          padding: 10, background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: 8, display: "grid",
          gridTemplateColumns: "1.5fr 2.5fr 80px",
          gap: 8, alignItems: "end",
        }}>
          <div>
            <div style={lbl}>Condición que debe ser verdadera</div>
            <InputFormula value={c.expr} placeholder="ej: alto >= cajones * 80"
              onChange={(v) => update(idx, { expr: v })}
              paramsConocidos={paramsConocidos} />
          </div>
          <div>
            <div style={lbl}>Mensaje al usuario si falla</div>
            <input value={c.msg} placeholder="ej: El alto no alcanza para tantos cajones"
              onChange={e => update(idx, { msg: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <button onClick={() => remove(idx)} style={btnDel}>✕ Quitar</button>
        </div>
      ))}
      <button onClick={add} style={btnAdd}>+ Agregar regla</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EditorParametrico (default export)
// ─────────────────────────────────────────────────────────────────────────────
//
// Edita parámetros, zonas y reglas de validación del módulo padre — lo que
// el cliente del presupuesto puede configurar en vivo. Los subcomponentes
// (hijos) se editan desde su propia pestaña del FormModulo, no acá.
// ─────────────────────────────────────────────────────────────────────────────

export default function EditorParametrico({
  parametros, zonas, constraints, onChange,
  moduloPreview, costos, valoresPrueba, onValoresPruebaChange,
}) {
  const [secs, setSecs] = useState({ params: true, zonas: false, constraints: false });
  const toggleSec = k => setSecs(p => ({ ...p, [k]: !p[k] }));

  const puedeProbar = !!moduloPreview && !!costos
    && (parametros.length > 0 || constraints.length > 0);

  // Readout: cuántas piezas activan los valores actuales vs el total de
  // piezas con `condition` declaradas (las que pueden ser ocultadas).
  let resumenPiezas = null;
  if (puedeProbar) {
    try {
      const generadas = generarPiezas(moduloPreview, valoresPrueba || {}, costos);
      const condicionales = (moduloPreview.piezas || []).filter(p => p.condition);
      // Generadas filtra por condition y expande repeat; queremos saber
      // qué declaraciones aparecen al menos una vez. Comparamos por nombre+condition.
      const declaracionesActivas = new Set(generadas.map(p => p.nombre));
      const inactivas = condicionales.filter(p => !declaracionesActivas.has(p.nombre));
      resumenPiezas = {
        totalGeneradas: generadas.length,
        totalDefinidas: (moduloPreview.piezas || []).length,
        inactivas,
      };
    } catch (_e) {
      resumenPiezas = null;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 10 }}>
      {/* Sub-acordeón: Parámetros */}
      <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
        {subSecHdr("🎚", "Parámetros configurables por el cliente", parametros.length, secs.params, () => toggleSec("params"))}
        {secs.params && <ListaParametros parametros={parametros}
          onChange={(p) => onChange({ parametros: p, zonas, constraints })} />}
      </div>
      {/* Sub-acordeón: Zonas */}
      <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
        {subSecHdr("🎨", "Zonas (material por grupo de piezas)", zonas.length, secs.zonas, () => toggleSec("zonas"))}
        {secs.zonas && <ListaZonas zonas={zonas}
          onChange={(z) => onChange({ parametros, zonas: z, constraints })} />}
      </div>
      {/* Sub-acordeón: Constraints */}
      <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
        {subSecHdr("⚠", "Reglas de validación", constraints.length, secs.constraints, () => toggleSec("constraints"))}
        {secs.constraints && <ListaConstraints constraints={constraints}
          paramsConocidos={parametros.map(p => p.id).filter(Boolean)}
          onChange={(c) => onChange({ parametros, zonas, constraints: c })} />}
      </div>

      {/* ────────────────────────────────────────────────────────────────
          Panel de prueba: simula lo que verá el cliente en el presupuesto.
          Los valores se reflejan en el preview 3D de la derecha en vivo.
          ──────────────────────────────────────────────────────────────── */}
      {puedeProbar && (
        <div style={{
          marginTop: 4, borderRadius: 8, border: "1px solid rgba(212,175,55,0.30)",
          background: "rgba(212,175,55,0.04)", overflow: "hidden",
        }}>
          <div style={{
            padding: "9px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(212,175,55,0.06)", borderBottom: "1px solid rgba(212,175,55,0.20)",
          }}>
            <div style={{
              fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.10em", color: "var(--accent)",
            }}>
              👁 Vista previa del configurador del cliente
            </div>
            {Object.keys(valoresPrueba || {}).length > 0 && (
              <button onClick={() => onValoresPruebaChange({})}
                style={{
                  padding: "3px 9px", borderRadius: 5, cursor: "pointer",
                  fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 500,
                  background: "transparent", border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}>
                ↺ Restaurar defaults
              </button>
            )}
          </div>

          <div style={{ padding: "10px 14px 14px" }}>
            <ConfiguradorParametrico
              modulo={moduloPreview}
              valores={valoresPrueba || {}}
              onChange={onValoresPruebaChange}
              costos={costos}
            />

            {/* Readout: piezas que aparecen / desaparecen con estos valores */}
            {resumenPiezas && (
              <div style={{
                marginTop: 10, padding: "8px 12px", borderRadius: 6,
                background: "var(--bg-base)", border: "1px solid var(--border)",
                fontFamily: "'DM Mono',monospace", fontSize: 11,
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                <div style={{ color: "var(--text-secondary)" }}>
                  Piezas generadas: <span style={{ color: "var(--accent)", fontWeight: 700 }}>{resumenPiezas.totalGeneradas}</span>
                  {resumenPiezas.totalDefinidas !== resumenPiezas.totalGeneradas && (
                    <span style={{ color: "var(--text-muted)" }}> · {resumenPiezas.totalDefinidas} declaradas</span>
                  )}
                </div>
                {resumenPiezas.inactivas.length > 0 && (
                  <div style={{ color: "var(--text-muted)", fontSize: 10 }}>
                    Ocultas: {resumenPiezas.inactivas.map(p => (
                      <span key={p.nombre} title={`condition: ${p.condition}`}
                        style={{ color: "#e08080", marginRight: 8 }}>
                        ✕ {p.nombre || "(sin nombre)"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{
              marginTop: 8, fontSize: 10, color: "var(--text-muted)",
              fontFamily: "'DM Mono',monospace", lineHeight: 1.5,
            }}>
              Estos valores no se guardan — solo prueban cómo reacciona el módulo. El preview 3D de la derecha se actualiza en vivo.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
