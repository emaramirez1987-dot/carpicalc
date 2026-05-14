// ════════════════════════════════════════════════════════════════════════════
// ConfiguradorParametrico.jsx — controles paramétricos en el presupuesto
// ════════════════════════════════════════════════════════════════════════════
//
// Renderiza un control por cada parámetro definido en el módulo (Fase 6) y
// le permite al usuario del presupuesto cambiar su valor. Muestra también
// los warnings de constraints violadas.
//
// Vive dentro del AcordeonEdicionItem (panel inline bajo el ítem activo).
// ════════════════════════════════════════════════════════════════════════════

import React from 'react';
import {
  resolverParametros, evaluarConstraints,
} from '../../services/moduloService.js';
import { evaluarExpresion } from '../../utils.js';

const lbl = {
  fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3,
};
const inputBase = {
  fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "5px 7px",
  background: "var(--bg-base)", border: "1px solid var(--border)",
  borderRadius: 6, color: "var(--text-primary)", outline: "none",
  width: "100%", boxSizing: "border-box",
};

function ConfiguradorParametrico({ modulo, valores, onChange, costos }) {
  const params      = Array.isArray(modulo?.parametros)  ? modulo.parametros  : [];
  const constraints = Array.isArray(modulo?.constraints) ? modulo.constraints : [];

  if (params.length === 0 && constraints.length === 0) return null;

  // Resolución de valores (incluye fórmulas computadas) + chequeo de constraints
  const valoresResueltos = resolverParametros(modulo, valores);
  const checks           = evaluarConstraints(modulo, valores, costos);
  const fallidas         = checks.filter(c => !c.ok);

  const setValor = (id, valor) => onChange({ ...(valores || {}), [id]: valor });

  return (
    <div style={{
      borderTop: "1px dashed var(--border)", paddingTop: 10, marginTop: 10,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{
        fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.10em",
        color: "var(--accent)",
      }}>
        ⚙ Configuración paramétrica
      </div>

      {/* Grilla de parámetros (2 columnas) */}
      {params.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {params.map((p) => {
            const val = valores?.[p.id] ?? p.def;
            const computado = p.tipo === "formula"
              ? evaluarExpresion(p.expr || "", valoresResueltos)
              : null;

            return (
              <div key={p.id}>
                <div style={lbl}>
                  {p.nombre || p.id}
                  {p.unidad && <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>({p.unidad})</span>}
                  {p.tipo === "formula" && <span style={{ color: "var(--text-muted)", marginLeft: 6, textTransform: "none", letterSpacing: 0 }}>= {computado ?? "?"}</span>}
                </div>

                {p.tipo === "boolean" ? (
                  <select value={val ? "true" : "false"}
                    onChange={e => setValor(p.id, e.target.value === "true")}
                    style={inputBase}>
                    <option value="false">No</option>
                    <option value="true">Sí</option>
                  </select>
                ) : p.tipo === "choice" ? (
                  <select value={val ?? ""}
                    onChange={e => setValor(p.id, e.target.value)}
                    style={inputBase}>
                    {(p.opciones || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : p.tipo === "formula" ? (
                  <input value={p.expr || ""} disabled
                    style={{ ...inputBase, color: "var(--text-muted)", background: "var(--bg-subtle)" }} />
                ) : (
                  <input type="number" value={val ?? ""}
                    min={p.min} max={p.max}
                    step={p.tipo === "integer" ? 1 : "any"}
                    onChange={e => {
                      const n = e.target.value === "" ? p.def : (p.tipo === "integer" ? parseInt(e.target.value) : parseFloat(e.target.value));
                      setValor(p.id, Number.isFinite(n) ? n : p.def);
                    }}
                    style={inputBase} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Warnings de constraints */}
      {fallidas.length > 0 && (
        <div style={{
          marginTop: 4, padding: "6px 10px", borderRadius: 6,
          background: "rgba(200,60,60,0.10)", border: "1px solid rgba(200,60,60,0.30)",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {fallidas.map((c, i) => (
            <div key={i} style={{ fontSize: 11, color: "#e07070", fontFamily: "'DM Mono',monospace" }}>
              ⚠ {c.msg || c.expr}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// React.memo evita re-render cuando los props no cambian — al tipear
// dimensiones en AcordeonEdicionItem, el configurador no se re-renderiza
// si los parámetros del módulo no cambiaron.
export default React.memo(ConfiguradorParametrico);
