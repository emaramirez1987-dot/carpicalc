import React, { useState, useRef, useMemo, useEffect } from "react";
import { Card, SectionTitle } from "../ui/index.jsx";
import { leerPlano, guardarPlano } from "../../storage.js";
import SVGPlano from "./SVGPlano.jsx";
import { exportarSVG, exportarPNG } from "./planoUtils.js";

const TIPO_META = {
  bajo:  { label: "Bajo",  color: "#7090c8" },
  aereo: { label: "Aéreo", color: "#a070c8" },
  torre: { label: "Torre", color: "#7ecf8a" },
};

function btnStyle({ primary = false, disabled = false } = {}) {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "7px 14px", borderRadius: 6,
    fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700,
    letterSpacing: "0.05em", cursor: disabled ? "default" : "pointer",
    transition: "all 0.18s", opacity: disabled ? 0.4 : 1,
    background: primary
      ? "linear-gradient(135deg,var(--accent),var(--accent-hover))"
      : "var(--bg-surface)",
    border: primary ? "none" : "1px solid var(--border)",
    color: primary ? "var(--text-inverted)" : "var(--text-secondary)",
    boxShadow: primary && !disabled ? "0 3px 12px rgba(180,100,20,0.22)" : "none",
  };
}

function arrowBtn(disabled) {
  return {
    padding: "4px 9px", borderRadius: 5,
    fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    background: "transparent",
    border: "1px solid var(--border)",
    color: disabled ? "var(--text-muted)" : "var(--text-secondary)",
    opacity: disabled ? 0.3 : 0.8,
    transition: "all 0.12s",
  };
}

// Deriva secuencias de IDs a partir del tipoVisual de cada bloque
function derivarSecuencias(bloques) {
  return {
    idsBajos: bloques.filter(b => b.tipoVisual === "bajo" || b.tipoVisual === "torre").map(b => b.id),
    idsAltos: bloques.filter(b => b.tipoVisual === "aereo").map(b => b.id),
  };
}

// Aplica dimensiones del editor activo a los bloques existentes (FIFO por código).
// Prioridad: inlineModulos[itemId].dimensiones → dimOverride → modulos base.dimensiones
// Devuelve { bloques, cambio } — preserva IDs, orden y tipoVisual.
function sincronizarDimensiones(bloquesPrev, items, dimOverride, modulos, inlineModulos = {}) {
  if (!modulos || !items.length || !bloquesPrev.length) return { bloques: bloquesPrev, cambio: false };
  const dimsPorCodigo = {};
  items.forEach(it => {
    const keyId = it.id || it.codigo;
    const mod = modulos[it.codigo];
    if (!mod) return;
    // Prioridad: inline (fuente única completa) → dimOverride → base
    const inline = inlineModulos[keyId];
    const dim = inline?.dimensiones || (dimOverride && dimOverride[keyId]) || mod.dimensiones;
    if (!dimsPorCodigo[it.codigo]) dimsPorCodigo[it.codigo] = [];
    for (let i = 0; i < (it.cantidad || 1); i++) dimsPorCodigo[it.codigo].push(dim);
  });
  const consumido = {};
  let cambio = false;
  const nuevos = bloquesPrev.map(b => {
    consumido[b.codigo] = (consumido[b.codigo] || 0) + 1;
    const dim = (dimsPorCodigo[b.codigo] || [])[consumido[b.codigo] - 1];
    if (!dim) return b;
    if (b.ancho !== dim.ancho || b.alto !== dim.alto || b.profundidad !== dim.profundidad) {
      cambio = true;
      return { ...b, ancho: dim.ancho, alto: dim.alto, profundidad: dim.profundidad };
    }
    return b;
  });
  return { bloques: nuevos, cambio };
}

export function PlanoDos({ modulos, items = [], dimOverride = {}, composicionOverride = {}, inlineModulos = {}, presupuestoActivoId = null }) {
  const saved = leerPlano();
  const bloquesSaved = saved?.bloques || [];
  // Sincronizar al montar (sin flicker): aplicar dimOverride + inlineModulos antes del primer render
  const { bloques: bloquesInit, cambio: bloquesSincronizados } = sincronizarDimensiones(bloquesSaved, items, dimOverride, modulos, inlineModulos);
  const { idsBajos: defB, idsAltos: defA } = derivarSecuencias(bloquesInit);

  const [bloques, setBloques]         = useState(bloquesInit);

  // Persistir la sincronización de montaje si hubo cambios
  useEffect(() => {
    if (!bloquesSincronizados) return;
    guardarPlano({
      bloques: bloquesInit,
      idsBajos: saved?.idsBajos ?? defB,
      idsAltos: saved?.idsAltos ?? defA,
      altoCielorraso: saved?.altoCielorraso || 2400,
      offsetBajos: saved?.offsetBajos ?? 0,
      offsetAltos: saved?.offsetAltos ?? 0,
      colgadoAereos: saved?.colgadoAereos ?? 200,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [idsBajos, setIdsBajos]       = useState(() => saved?.idsBajos ?? defB);
  const [idsAltos, setIdsAltos]       = useState(() => saved?.idsAltos ?? defA);
  const [altoCielorraso, setAlto]     = useState(() => saved?.altoCielorraso || 2400);
  const [offsetBajos, setOffsetBajos] = useState(() => saved?.offsetBajos ?? 0);
  const [offsetAltos, setOffsetAltos] = useState(() => saved?.offsetAltos ?? 0);
  const [colgadoAereos, setColgado]   = useState(() => saved?.colgadoAereos ?? 200);
  const [selectedId, setSelectedId]   = useState(null);
  const [temaClaro, setTemaClaro]     = useState(false);
  const svgRef = useRef(null);

  // Cuando se carga un presupuesto diferente, re-leer todo desde localStorage.
  // guardarPlano() ya fue llamado en App.js (handleCargarPresupuesto / handleGuardarPresupuesto)
  // con los bloques del nuevo presupuesto, antes de que este efecto se ejecute.
  const prevPresIdRef = useRef(presupuestoActivoId);
  useEffect(() => {
    if (prevPresIdRef.current === presupuestoActivoId) return;
    prevPresIdRef.current = presupuestoActivoId;
    const fresh = leerPlano();
    const freshBloques = fresh?.bloques || [];
    const { bloques: synced } = sincronizarDimensiones(freshBloques, items, dimOverride, modulos, inlineModulos);
    const { idsBajos: fb, idsAltos: fa } = derivarSecuencias(synced);
    setBloques(synced);
    setIdsBajos(fresh?.idsBajos ?? fb);
    setIdsAltos(fresh?.idsAltos ?? fa);
    setAlto(fresh?.altoCielorraso || 2400);
    setOffsetBajos(fresh?.offsetBajos ?? 0);
    setOffsetAltos(fresh?.offsetAltos ?? 0);
    setColgado(fresh?.colgadoAereos ?? 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presupuestoActivoId]);

  // Sincronizar dimensiones de bloques existentes cuando el usuario edita dims/piezas
  // en Presupuesto (mismo presupuesto activo). No reinicia el layout, solo actualiza medidas.
  useEffect(() => {
    if (!modulos || !items.length) return;
    const { bloques: synced, cambio } = sincronizarDimensiones(bloques, items, dimOverride, modulos, inlineModulos);
    if (!cambio) return;
    setBloques(synced);
    const currentSaved = leerPlano();
    if (currentSaved) guardarPlano({ ...currentSaved, bloques: synced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, dimOverride, inlineModulos]);

  // Persist always using latest state values; pass overrides explicitly
  const guardarTodo = ({ nb = bloques, niB = idsBajos, niA = idsAltos, alto = altoCielorraso, offB = offsetBajos, offA = offsetAltos, colgado = colgadoAereos } = {}) => {
    guardarPlano({ bloques: nb, idsBajos: niB, idsAltos: niA, altoCielorraso: alto, offsetBajos: offB, offsetAltos: offA, colgadoAereos: colgado });
  };

  // Resolved arrays for SVG rendering
  const bloquePorId = useMemo(() => {
    const m = {};
    bloques.forEach(b => { m[b.id] = b; });
    return m;
  }, [bloques]);

  const resolvedBajos = useMemo(
    () => idsBajos.map(id => bloquePorId[id]).filter(Boolean),
    [idsBajos, bloquePorId]
  );
  const resolvedAltos = useMemo(
    () => idsAltos.map(id => bloquePorId[id]).filter(Boolean),
    [idsAltos, bloquePorId]
  );

  // ── Movimiento dentro de cada zona ──────────────────────────────────────
  const moverBajo = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= idsBajos.length) return;
    const newIds = [...idsBajos];
    [newIds[idx], newIds[target]] = [newIds[target], newIds[idx]];
    setIdsBajos(newIds);
    guardarTodo({ niB: newIds });
  };

  const moverAlto = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= idsAltos.length) return;
    const newIds = [...idsAltos];
    [newIds[idx], newIds[target]] = [newIds[target], newIds[idx]];
    setIdsAltos(newIds);
    guardarTodo({ niA: newIds });
  };

  // ── Eliminar bloque ──────────────────────────────────────────────────────
  const eliminarBloque = (id) => {
    const nb  = bloques.filter(b => b.id !== id);
    const niB = idsBajos.filter(i => i !== id);
    const niA = idsAltos.filter(i => i !== id);
    setBloques(nb);
    setIdsBajos(niB);
    setIdsAltos(niA);
    if (selectedId === id) setSelectedId(null);
    guardarTodo({ nb, niB, niA });
  };

  // ── Cambiar tipo visual ──────────────────────────────────────────────────
  const cambiarTipo = (id, nuevoTipo) => {
    const nb  = bloques.map(b => b.id === id ? { ...b, tipoVisual: nuevoTipo || undefined } : b);
    let niB   = idsBajos.filter(i => i !== id);
    let niA   = idsAltos.filter(i => i !== id);
    if (nuevoTipo === "bajo" || nuevoTipo === "torre") niB = [...niB, id];
    else if (nuevoTipo === "aereo")                    niA = [...niA, id];
    setBloques(nb);
    setIdsBajos(niB);
    setIdsAltos(niA);
    guardarTodo({ nb, niB, niA });
  };

  // ── Configuración ────────────────────────────────────────────────────────
  const handleAlto = (v) => {
    const val = Math.max(1800, parseInt(v) || 2400);
    setAlto(val);
    guardarTodo({ alto: val });
  };

  const handleOffsetBajos = (v) => {
    const val = Math.max(-2000, Math.min(2000, parseInt(v) || 0));
    setOffsetBajos(val);
    guardarTodo({ offB: val });
  };

  const handleOffsetAltos = (v) => {
    const val = Math.max(-2000, Math.min(2000, parseInt(v) || 0));
    setOffsetAltos(val);
    guardarTodo({ offA: val });
  };

  const handleColgado = (v) => {
    const val = Math.max(0, Math.min(1200, parseInt(v) || 200));
    setColgado(val);
    guardarTodo({ colgado: val });
  };

  const sinTipo  = bloques.filter(b => !b.tipoVisual).length;
  const totalMM  = Math.max(
    resolvedBajos.reduce((s, b) => s + b.ancho, 0),
    resolvedAltos.reduce((s, b) => s + b.ancho, 0),
  );
  const nombreExport = "plano-2d";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Encabezado ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <SectionTitle sub="Vista frontal · dos zonas independientes (bajos / altos)">
          Plano 2D
        </SectionTitle>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <button onClick={() => exportarSVG(svgRef.current, nombreExport)} disabled={!bloques.length} style={btnStyle({ disabled: !bloques.length })}>↗ SVG</button>
          <button onClick={() => exportarPNG(svgRef.current, nombreExport)} disabled={!bloques.length} style={btnStyle({ disabled: !bloques.length })}>↗ PNG</button>
        </div>
      </div>

      {/* ── Barra de configuración ────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
          PISO–TECHO
          <input type="number" value={altoCielorraso} min={1800} max={4000} step={50}
            onChange={e => handleAlto(e.target.value)}
            style={{ width: 68, padding: "4px 6px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)", fontFamily: "'DM Mono',monospace", fontSize: 12, textAlign: "right" }} />
          <span style={{ fontSize: 10 }}>mm</span>
        </label>

        <div style={{ width: 1, height: 18, background: "var(--border)" }} />

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
          AEREOS DESDE TECHO
          <input type="number" value={colgadoAereos} min={0} max={1200} step={50}
            onChange={e => handleColgado(e.target.value)}
            style={{ width: 56, padding: "4px 6px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)", fontFamily: "'DM Mono',monospace", fontSize: 12, textAlign: "right" }} />
          <span style={{ fontSize: 10 }}>mm</span>
        </label>

        <div style={{ width: 1, height: 18, background: "var(--border)" }} />

        {/* Offset bajos */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
          BAJOS
          <button onClick={() => handleOffsetBajos(offsetBajos - 50)} style={arrowBtn(false)}>←</button>
          <span style={{ minWidth: 42, textAlign: "center", fontSize: 10, color: offsetBajos !== 0 ? "var(--accent)" : "var(--text-muted)" }}>
            {offsetBajos > 0 ? `+${offsetBajos}` : offsetBajos} mm
          </span>
          <button onClick={() => handleOffsetBajos(offsetBajos + 50)} style={arrowBtn(false)}>→</button>
          {offsetBajos !== 0 && <button onClick={() => handleOffsetBajos(0)} style={{ ...arrowBtn(false), fontSize: 9, padding: "3px 6px" }}>0</button>}
        </div>

        {/* Offset altos */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
          ALTOS
          <button onClick={() => handleOffsetAltos(offsetAltos - 50)} style={arrowBtn(false)}>←</button>
          <span style={{ minWidth: 42, textAlign: "center", fontSize: 10, color: offsetAltos !== 0 ? "var(--accent)" : "var(--text-muted)" }}>
            {offsetAltos > 0 ? `+${offsetAltos}` : offsetAltos} mm
          </span>
          <button onClick={() => handleOffsetAltos(offsetAltos + 50)} style={arrowBtn(false)}>→</button>
          {offsetAltos !== 0 && <button onClick={() => handleOffsetAltos(0)} style={{ ...arrowBtn(false), fontSize: 9, padding: "3px 6px" }}>0</button>}
        </div>

        <div style={{ width: 1, height: 18, background: "var(--border)" }} />

        <button onClick={() => setTemaClaro(t => !t)}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, transition: "all 0.15s", background: temaClaro ? "rgba(253,250,245,0.12)" : "var(--bg-surface)", border: `1px solid ${temaClaro ? "rgba(253,250,245,0.30)" : "var(--border)"}`, color: temaClaro ? "#e8e0d0" : "var(--text-secondary)" }}>
          {temaClaro ? "☀ Claro" : "🌙 Oscuro"}
        </button>

        {sinTipo > 0 && (
          <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", padding: "3px 9px", borderRadius: 5, color: "#e07070", background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.22)" }}>
            ⚠ {sinTipo} sin tipo
          </div>
        )}

        {bloques.length > 0 && (
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", marginLeft: "auto" }}>
            {bloques.length} mód. · {totalMM} mm
          </div>
        )}
      </div>

      {/* ── Vista SVG ────────────────────────────────────────────────── */}
      <Card className="rsp-card" style={{ padding: 0, overflow: "hidden", background: temaClaro ? "#FAFAF7" : "#0d1117", border: "1px solid rgba(255,255,255,0.06)", transition: "background 0.2s" }}>
        <SVGPlano
          bloquesAltos={resolvedAltos}
          bloquesBajos={resolvedBajos}
          altoCielorraso={altoCielorraso}
          svgRef={svgRef}
          onSelect={setSelectedId}
          selectedId={selectedId}
          modulos={modulos}
          composicionOverride={composicionOverride}
          temaClaro={temaClaro}
          offsetBajos={offsetBajos}
          offsetAltos={offsetAltos}
          colgadoAereos={colgadoAereos}
        />
      </Card>

      {/* ── Leyenda de tipos ─────────────────────────────────────────── */}
      {bloques.length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {Object.entries(TIPO_META).map(([id, meta]) => (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: "'DM Mono',monospace", color: meta.color, opacity: 0.8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: meta.color + "30", border: `1px solid ${meta.color}60`, display: "inline-block" }} />
              {meta.label}
            </div>
          ))}
        </div>
      )}

      {/* ── Composición: dos zonas independientes ────────────────────── */}
      {bloques.length > 0 && (
        <Card className="rsp-card">
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 14 }}>
            Composición
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Zona alta */}
            <ZonaComposicion
              label="▲ Zona alta (aéreos)"
              bloques={resolvedAltos}
              ids={idsAltos}
              allBloques={bloques}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMover={moverAlto}
              onEliminar={eliminarBloque}
              onCambiarTipo={cambiarTipo}
              labelColor={TIPO_META.aereo.color}
            />

            {/* Zona baja */}
            <ZonaComposicion
              label="▼ Zona baja (bajos + torres)"
              bloques={resolvedBajos}
              ids={idsBajos}
              allBloques={bloques}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMover={moverBajo}
              onEliminar={eliminarBloque}
              onCambiarTipo={cambiarTipo}
              labelColor={TIPO_META.bajo.color}
            />

          </div>
        </Card>
      )}

      {/* ── Estado vacío ─────────────────────────────────────────────── */}
      {bloques.length === 0 && (
        <div style={{ textAlign: "center", padding: "56px 0", border: "1px dashed var(--border)", borderRadius: 12, color: "var(--text-muted)" }}>
          <div style={{ fontSize: 34, marginBottom: 14 }}>📐</div>
          <p style={{ fontSize: 14, marginBottom: 8 }}>Sin módulos en el plano</p>
          <p style={{ fontSize: 12 }}>Seleccioná un presupuesto en la pestaña Vista Previa para cargar los módulos.</p>
        </div>
      )}

    </div>
  );
}

// ── Sub-componente de zona ────────────────────────────────────────────────
function ZonaComposicion({ label, bloques, selectedId, onSelect, onMover, onEliminar, onCambiarTipo, labelColor }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: labelColor, marginBottom: 7, letterSpacing: "0.08em" }}>
        {label}
      </div>

      {bloques.length === 0 ? (
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", padding: "6px 10px" }}>
          Sin módulos en esta zona
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {bloques.map((b, idx) => {
            const meta = TIPO_META[b.tipoVisual];
            const sel  = selectedId === b.id;
            return (
              <div key={b.id} onClick={() => onSelect(b.id)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 7, cursor: "pointer", background: sel ? "rgba(212,175,55,0.07)" : "var(--bg-subtle)", border: `1px solid ${sel ? "rgba(212,175,55,0.30)" : "var(--border)"}`, transition: "all 0.15s" }}>

                <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, minWidth: 18, textAlign: "center", color: sel ? "var(--accent)" : "var(--text-muted)" }}>
                  {idx + 1}
                </span>

                {/* Selector tipo */}
                <select value={b.tipoVisual || ""} onChange={e => { e.stopPropagation(); onCambiarTipo(b.id, e.target.value); }} onClick={e => e.stopPropagation()}
                  style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, padding: "3px 6px", borderRadius: 4, cursor: "pointer", background: meta ? `${meta.color}18` : "rgba(90,95,120,0.14)", border: `1px solid ${meta ? meta.color + "55" : "rgba(90,95,120,0.35)"}`, color: meta ? meta.color : "var(--text-muted)", outline: "none" }}>
                  <option value="">—</option>
                  <option value="bajo">Bajo</option>
                  <option value="aereo">Aéreo</option>
                  <option value="torre">Torre</option>
                </select>

                {/* Nombre y dimensiones */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.nombre}</div>
                  <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>{b.ancho} × {b.alto} mm</div>
                </div>

                {/* Controles de orden + eliminar */}
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); onMover(idx, -1); }} disabled={idx === 0} style={arrowBtn(idx === 0)}>←</button>
                  <button onClick={e => { e.stopPropagation(); onMover(idx, +1); }} disabled={idx === bloques.length - 1} style={arrowBtn(idx === bloques.length - 1)}>→</button>
                  <button onClick={e => { e.stopPropagation(); onEliminar(b.id); }} style={{ ...arrowBtn(false), color: "#c05050", borderColor: "rgba(200,60,60,0.28)" }}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
