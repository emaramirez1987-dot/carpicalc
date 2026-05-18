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

// ─────────────────────────────────────────────────────────────────────────────
// FormParam — formulario de UN parámetro (alta o edición)
// ─────────────────────────────────────────────────────────────────────────────

const DRAFT_VACIO = {
  id: "", nombre: "", tipo: "integer", def: 0,
  min: undefined, max: undefined, unidad: "", opciones: [], expr: "",
};

function FormParam({ draft, onChangeDraft, onSubmit, editando, onCancelar, otrosParams = [] }) {
  const p = draft;
  const set = (patch) => onChangeDraft({ ...p, ...patch });
  const idError = !p.id.trim();

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{
        padding: "12px", background: "var(--bg-surface)",
        border: "1px solid var(--border)", borderRadius: 8,
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {/* Fila 1: ID · Nombre · Tipo */}
        <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 160px", gap: 8, alignItems: "end" }}>
          <div>
            <div style={lbl}>ID *</div>
            <input value={p.id}
              onChange={e => set({ id: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
              placeholder="cajones"
              style={{ ...inputBase, width: "100%", boxSizing: "border-box",
                border: `1px solid ${idError && p.id !== "" ? "rgba(224,112,112,0.55)" : "var(--border)"}` }} />
          </div>
          <div>
            <div style={lbl}>Nombre visible</div>
            <input value={p.nombre}
              onChange={e => set({ nombre: e.target.value })}
              placeholder="Cantidad de cajones"
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={lbl}>Tipo</div>
            <select value={p.tipo} onChange={e => set({ tipo: e.target.value })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }}>
              {TIPOS_PARAM.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Fila 2: según tipo */}
        {p.tipo === "formula" ? (
          <div>
            <div style={lbl}>Expresión calculada</div>
            <InputFormula value={p.expr} placeholder="ej: alto - 2*esp"
              onChange={(v) => set({ expr: v })}
              paramsConocidos={otrosParams} />
          </div>
        ) : p.tipo === "choice" ? (
          <div>
            <div style={lbl}>Opciones (separadas por coma)</div>
            <input
              value={(p.opciones || []).join(", ")}
              placeholder="liso, manija, gola"
              onChange={e => set({ opciones: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
          </div>
        ) : p.tipo === "boolean" ? (
          <div style={{ maxWidth: 160 }}>
            <div style={lbl}>Default</div>
            <select value={p.def ? "true" : "false"}
              onChange={e => set({ def: e.target.value === "true" })}
              style={{ ...inputBase, width: "100%", boxSizing: "border-box" }}>
              <option value="false">No</option>
              <option value="true">Sí</option>
            </select>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
            <div>
              <div style={lbl}>Default</div>
              <input type="number" value={p.def ?? ""}
                onChange={e => set({ def: parseFloat(e.target.value) || 0 })}
                style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={lbl}>Mínimo</div>
              <input type="number" value={p.min ?? ""} placeholder="sin límite"
                onChange={e => set({ min: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={lbl}>Máximo</div>
              <input type="number" value={p.max ?? ""} placeholder="sin límite"
                onChange={e => set({ max: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={lbl}>Unidad (opc)</div>
              <input value={p.unidad ?? ""} placeholder="mm, u, kg…"
                onChange={e => set({ unidad: e.target.value })}
                style={{ ...inputBase, width: "100%", boxSizing: "border-box" }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onSubmit} disabled={idError}
          style={{ ...btnAdd, opacity: idError ? 0.45 : 1, cursor: idError ? "not-allowed" : "pointer" }}>
          {editando ? "✓ Actualizar parámetro" : "+ Agregar parámetro"}
        </button>
        {editando && (
          <button onClick={onCancelar} style={btnDel}>Cancelar</button>
        )}
      </div>
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

// ── Barra de sub-tabs ────────────────────────────────────────────────────────
function SubTabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)} style={{
          padding: '6px 14px', background: 'none', border: 'none',
          borderBottom: active === t.id ? '2px solid var(--accent)' : '2px solid transparent',
          color: active === t.id ? 'var(--accent)' : 'var(--text-muted)',
          cursor: 'pointer', fontSize: 10, fontFamily: "'DM Mono',monospace",
          fontWeight: active === t.id ? 700 : 400, letterSpacing: '0.06em',
          textTransform: 'uppercase', transition: 'color 0.12s',
          marginBottom: -1, whiteSpace: 'nowrap',
        }}>{t.label}</button>
      ))}
    </div>
  );
}

export default function EditorParametrico({
  parametros, zonas, constraints, onChange,
  moduloPreview, costos, valoresPrueba, onValoresPruebaChange,
}) {
  const [subTab, setSubTab] = useState('params');
  const [draftParam, setDraftParam] = useState({ ...DRAFT_VACIO });
  const [editandoParamIdx, setEditandoParamIdx] = useState(null);

  const otrosParamIds = parametros.map(p => p.id).filter(Boolean);

  const agregarParam = () => {
    if (!draftParam.id.trim()) return;
    const nuevo = { ...draftParam };
    const nuevaLista = editandoParamIdx !== null
      ? parametros.map((p, i) => i === editandoParamIdx ? nuevo : p)
      : [...parametros, nuevo];
    onChange({ parametros: nuevaLista, zonas, constraints });
    setDraftParam({ ...DRAFT_VACIO });
    setEditandoParamIdx(null);
    setSubTab('preview');
  };

  const editarParam = (idx) => {
    setDraftParam({ ...DRAFT_VACIO, ...parametros[idx] });
    setEditandoParamIdx(idx);
    setSubTab('params');
  };

  const eliminarParam = (idx) => {
    onChange({ parametros: parametros.filter((_, i) => i !== idx), zonas, constraints });
  };

  const cancelarEdicionParam = () => {
    setDraftParam({ ...DRAFT_VACIO });
    setEditandoParamIdx(null);
  };

  const puedeProbar = !!moduloPreview && !!costos
    && (parametros.length > 0 || constraints.length > 0);

  let resumenPiezas = null;
  if (puedeProbar) {
    try {
      const generadas = generarPiezas(moduloPreview, valoresPrueba || {}, costos);
      const condicionales = (moduloPreview.piezas || []).filter(p => p.condition);
      const declaracionesActivas = new Set(generadas.map(p => p.nombre));
      const inactivas = condicionales.filter(p => !declaracionesActivas.has(p.nombre));
      resumenPiezas = { totalGeneradas: generadas.length, totalDefinidas: (moduloPreview.piezas || []).length, inactivas };
    } catch (_e) { resumenPiezas = null; }
  }

  const tabs = [
    { id: 'params',      label: `🎚 Params${parametros.length > 0 ? ` · ${parametros.length}` : ''}` },
    { id: 'zonas',       label: `🎨 Zonas${zonas.length > 0 ? ` · ${zonas.length}` : ''}` },
    { id: 'constraints', label: `⚠ Reglas${constraints.length > 0 ? ` · ${constraints.length}` : ''}` },
    { id: 'preview',     label: `👁 Preview${parametros.length > 0 ? ` · ${parametros.length}` : ''}` },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 10, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <SubTabBar tabs={tabs} active={subTab} onSelect={setSubTab} />

      <div style={{ padding: "14px", overflowY: "auto" }}>
        {subTab === 'params' && (
          <FormParam
            draft={draftParam}
            onChangeDraft={setDraftParam}
            onSubmit={agregarParam}
            editando={editandoParamIdx !== null}
            onCancelar={cancelarEdicionParam}
            otrosParams={otrosParamIds.filter(id => id !== draftParam.id)}
          />
        )}
        {subTab === 'zonas' && (
          <ListaZonas zonas={zonas}
            onChange={(z) => onChange({ parametros, zonas: z, constraints })} />
        )}
        {subTab === 'constraints' && (
          <ListaConstraints constraints={constraints}
            paramsConocidos={otrosParamIds}
            onChange={(c) => onChange({ parametros, zonas, constraints: c })} />
        )}
        {subTab === 'preview' && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Lista de parámetros guardados */}
            {parametros.length === 0 ? (
              <div style={{ padding: "18px 0", textAlign: "center", fontSize: 11,
                color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", lineHeight: 1.6 }}>
                Sin parámetros —{" "}
                <button onClick={() => setSubTab('params')} style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--accent)", textDecoration: "underline",
                }}>agregá el primero</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ ...lbl, marginBottom: 2 }}>Parámetros cargados</div>
                {parametros.map((p, idx) => (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                    background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6,
                  }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11,
                      color: "var(--accent)", fontWeight: 700, minWidth: 80, flexShrink: 0 }}>
                      {p.id}
                    </span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11,
                      color: "var(--text-secondary)", flex: 1, minWidth: 0 }}>
                      {p.nombre || <em style={{ opacity: 0.5 }}>sin nombre</em>}
                    </span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10,
                      color: "var(--text-muted)", flexShrink: 0 }}>
                      {TIPOS_PARAM.find(t => t.id === p.tipo)?.label || p.tipo}
                    </span>
                    <button onClick={() => editarParam(idx)}
                      style={{ padding: "3px 9px", borderRadius: 5, cursor: "pointer",
                        fontFamily: "'DM Mono',monospace", fontSize: 10,
                        background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      ✎ Editar
                    </button>
                    <button onClick={() => eliminarParam(idx)}
                      style={{ padding: "3px 9px", borderRadius: 5, cursor: "pointer",
                        fontFamily: "'DM Mono',monospace", fontSize: 10,
                        background: "transparent", border: "1px solid rgba(200,60,60,0.30)", color: "#e07070" }}>
                      ✕
                    </button>
                  </div>
                ))}
                <button onClick={() => { setDraftParam({ ...DRAFT_VACIO }); setEditandoParamIdx(null); setSubTab('params'); }}
                  style={{ ...btnAdd, alignSelf: "flex-start", marginTop: 2 }}>
                  + Agregar otro parámetro
                </button>
              </div>
            )}

            {/* Separador */}
            {parametros.length > 0 && <div style={{ height: 1, background: "var(--border)" }} />}

            {/* Configurador de prueba */}
            {puedeProbar ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.10em", color: "var(--accent)" }}>
                    Vista del configurador del cliente
                  </div>
                  {Object.keys(valoresPrueba || {}).length > 0 && (
                    <button onClick={() => onValoresPruebaChange({})}
                      style={{ padding: "3px 9px", borderRadius: 5, cursor: "pointer",
                        fontFamily: "'DM Mono',monospace", fontSize: 10,
                        background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      ↺ Defaults
                    </button>
                  )}
                </div>
                <ConfiguradorParametrico
                  modulo={moduloPreview} valores={valoresPrueba || {}}
                  onChange={onValoresPruebaChange} costos={costos} />
                {resumenPiezas && (
                  <div style={{ padding: "8px 12px", borderRadius: 6, background: "var(--bg-base)",
                    border: "1px solid var(--border)", fontFamily: "'DM Mono',monospace", fontSize: 11,
                    display: "flex", flexDirection: "column", gap: 4 }}>
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
                            style={{ color: "#e08080", marginRight: 8 }}>✕ {p.nombre || "(sin nombre)"}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", lineHeight: 1.5 }}>
                  Valores de prueba — no se guardan. El preview 3D de la derecha se actualiza en vivo.
                </div>
              </div>
            ) : parametros.length > 0 ? (
              <div style={{ padding: "14px 0", textAlign: "center", fontSize: 11,
                color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", opacity: 0.7 }}>
                Guardá el módulo para habilitar el configurador de prueba.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
