// ════════════════════════════════════════════════════════════════════════════
// AcordeonEdicionItem.jsx
// ════════════════════════════════════════════════════════════════════════════
//
// Panel de edición de nivel 2: se expande inline bajo el ítem activo.
// Permite ajustar dimensiones y material sin tocar el catálogo (Nivel 2).
// Nivel 3 (edición en catálogo) se accede desde PiezasEditor.
//
// Punto de anclaje futuro: el editor 3D paramétrico se integrará aquí,
// reemplazando o extendiendo el panel de dims/material con controles
// paramétricos 3D en tiempo real.
// ════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { TIPO_MAT } from '../../constants.js';
import ConfiguradorParametrico from './ConfiguradorParametrico.jsx';

function AcordeonEdicionItem({
  modalEdicion,
  setModalEdicion,
  aplicarDims,
  modulos,
  setDimOverride,
  setModalModulo,
  getModUsado,
  costos,
  parametrosValores,
  setParametrosValores,
}) {
  const item   = modalEdicion.item;
  const isTemp = item?.codigo?.startsWith("TEMP_");
  const modUsado = getModUsado ? getModUsado(item) : (modulos?.[item?.codigo] || null);

  return (
    <div style={{ borderTop: "1px solid var(--border)", padding: "10px 14px 12px", background: "var(--bg-subtle)" }}>

      {/* Badge — indica si es variante temporal o ajuste solo para este presupuesto */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{
          fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.08em", borderRadius: 4, padding: "2px 7px",
          background: isTemp ? "var(--accent-soft)" : "rgba(120,180,100,0.12)",
          border:     `1px solid ${isTemp ? "var(--accent-border)" : "rgba(120,180,100,0.35)"}`,
          color:      isTemp ? "var(--accent)" : "#4a9e5c",
        }}>
          {isTemp ? "VARIANTE" : "SOLO PRESUPUESTO"}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'DM Mono',monospace" }}>
          {isTemp ? "módulo temporal" : "catálogo sin cambios · ▲ aplica"}
        </span>
      </div>

      {/* Dims + Material compactos */}
      <div style={{ display: "flex", gap: 5, alignItems: "flex-end", marginBottom: 8 }}>
        {[["A", "ancho"], ["P", "profundidad"], ["H", "alto"]].map(([label, key]) => (
          <div key={key} style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "center", marginBottom: 3, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {label}
            </div>
            <input
              type="number" min="1"
              value={modalEdicion.dims[key]}
              onChange={e => setModalEdicion(m => ({ ...m, dims: { ...m.dims, [key]: parseInt(e.target.value) || 0 } }))}
              style={{ width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, padding: "5px 4px", textAlign: "center", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none" }}
              onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
              onBlur={e => { e.target.style.borderColor = "var(--border)"; aplicarDims(); }}
            />
          </div>
        ))}
        <div style={{ flex: 1.8 }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 3, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Mat.
          </div>
          <select
            value={modalEdicion.material}
            onChange={e => {
              const newMat = e.target.value;
              setModalEdicion(m => ({ ...m, material: newMat }));
              if (!isTemp) {
                const keyId = item.id || item.codigo;
                const base  = modulos[modalEdicion.origenCodigo];
                const bd    = base?.dimensiones || {};
                const d     = modalEdicion.dims;
                const difiere = d.ancho !== bd.ancho || d.profundidad !== bd.profundidad || d.alto !== bd.alto || newMat !== (base?.material ?? "melamina");
                setDimOverride(prev => {
                  const n = { ...prev };
                  if (difiere) n[keyId] = { ...d, material: newMat };
                  else delete n[keyId];
                  return n;
                });
              }
            }}
            style={{ width: "100%", padding: "5px 4px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontFamily: "'DM Mono',monospace", fontSize: 11, outline: "none" }}>
            {Object.entries(TIPO_MAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Configurador paramétrico (Fase 7) — solo si el módulo tiene parámetros */}
      {modUsado && setParametrosValores && (
        <ConfiguradorParametrico
          modulo={modUsado}
          valores={parametrosValores || {}}
          onChange={setParametrosValores}
          costos={costos} />
      )}

      {/* Acciones */}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={aplicarDims}
          style={{ padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
          ✓ Actualizar
        </button>
        <button
          onClick={() => {
            const modInicial = getModUsado(item) || modulos[item.codigo];
            if (!modInicial) return;
            setModalModulo({ item, modInicial });
          }}
          style={{ flex: 1, padding: "6px 0", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, background: "var(--bg-subtle)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-soft)"; e.currentTarget.style.borderColor = "var(--accent-border)"; e.currentTarget.style.color = "var(--accent)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-subtle)"; e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-primary)"; }}>
          ✏ Piezas/herrajes
        </button>
        <button
          onClick={() => setModalEdicion(null)}
          style={{ padding: "5px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, background: "transparent", border: "1px solid rgba(200,60,60,0.28)", color: "#e07070" }}>
          ✕
        </button>
      </div>

    </div>
  );
}

// React.memo evita re-render cuando los props no cambian.
export default React.memo(AcordeonEdicionItem);
