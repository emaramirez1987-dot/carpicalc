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
  fontSize: 10, fontFamily: "'DM Mono',monospace",
  color: "var(--text-muted)", textTransform: "uppercase",
  letterSpacing: "0.06em", marginBottom: 3,
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
    padding: "8px 12px", background: "rgba(255,255,255,0.05)",
    borderLeft: "2px solid rgba(200,160,42,0.4)",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    cursor: "pointer", userSelect: "none",
  }}>
    <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.10em", color: "#c8a02a" }}>
      {icon} {title} <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>({count})</span>
    </span>
    <span style={{ fontSize: 10, color: "var(--text-muted)", transition: "transform 0.2s",
      display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ListaParametros
// ─────────────────────────────────────────────────────────────────────────────

function ListaParametros({ parametros, onChange }) {
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
              <input value={p.expr || ""} placeholder="ej: alto - 2*esp"
                onChange={e => update(idx, { expr: e.target.value })}
                style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
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

function ListaConstraints({ constraints, onChange }) {
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
            <input value={c.expr} placeholder="ej: alto >= cajones * 80"
              onChange={e => update(idx, { expr: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box", fontFamily: "'DM Mono',monospace" }} />
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

export default function EditorParametrico({ parametros, zonas, constraints, onChange }) {
  const [secs, setSecs] = useState({ params: true, zonas: false, constraints: false });
  const toggleSec = k => setSecs(p => ({ ...p, [k]: !p[k] }));

  return (
    <div style={{
      borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)",
      background: "var(--bg-subtle)", display: "flex", flexDirection: "column", gap: 1,
    }}>
      {/* Sub-acordeón: Parámetros */}
      <div>
        {subSecHdr("🎚", "Parámetros configurables", parametros.length, secs.params, () => toggleSec("params"))}
        {secs.params && <ListaParametros parametros={parametros}
          onChange={(p) => onChange({ parametros: p, zonas, constraints })} />}
      </div>
      {/* Sub-acordeón: Zonas */}
      <div>
        {subSecHdr("🎨", "Zonas (material por grupo de piezas)", zonas.length, secs.zonas, () => toggleSec("zonas"))}
        {secs.zonas && <ListaZonas zonas={zonas}
          onChange={(z) => onChange({ parametros, zonas: z, constraints })} />}
      </div>
      {/* Sub-acordeón: Constraints */}
      <div>
        {subSecHdr("⚠", "Reglas de validación", constraints.length, secs.constraints, () => toggleSec("constraints"))}
        {secs.constraints && <ListaConstraints constraints={constraints}
          onChange={(c) => onChange({ parametros, zonas, constraints: c })} />}
      </div>
    </div>
  );
}
