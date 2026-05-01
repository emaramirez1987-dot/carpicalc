import React, { useState, useEffect } from 'react';
import { Btn, Card, Badge, TextInput, Select, SectionTitle } from '../ui/index.jsx';
import { fmtPeso, fmtNum, applyFactor, restoreFrom } from '../../utils.js';
import { TIPO_MAT } from '../../constants.js';
import { cargarHistorialPrecios, guardarSnapshotPrecios } from '../../storage.js';

// Constantes de estilo compartidas entre los componentes Hc*
const hcBb = {
  padding: "4px 10px", borderRadius: 5, fontSize: 11, border: "1px solid",
  cursor: "pointer", fontFamily: "'DM Mono',monospace", fontWeight: 700, transition: "all 0.15s",
};
const hcLc = {
  fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase",
  letterSpacing: "0.08em", fontWeight: 700, display: "block", marginBottom: 4,
};
const hcFE = { display: "block" };
const hcFV = { display: "block" };

function HcBtnE({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...hcBb,
        background: "var(--accent-soft)",
        borderColor: "var(--accent-border)",
        color: "var(--accent)",
      }}
    >
      ✏ editar
    </button>
  );
}
function HcBtnD({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...hcBb,
        background: "transparent",
        borderColor: "rgba(200,60,60,0.22)",
        color: "#e07070",
      }}
    >
      × borrar
    </button>
  );
}
function HcBtnOk({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...hcBb,
        background: "rgba(100,180,80,0.12)",
        borderColor: "rgba(100,180,80,0.35)",
        color: "#7ecf8a",
      }}
    >
      ✓ guardar
    </button>
  );
}
function HcBtnCx({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...hcBb,
        background: "transparent",
        borderColor: "var(--border)",
        color: "var(--text-muted)",
      }}
    >
      cancelar
    </button>
  );
}
function HcNewBox({ children }) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.12)",
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
      }}
    >
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontWeight: 700,
          color: "var(--text-muted)",
          marginBottom: 10,
        }}
      >
        + Agregar nuevo
      </div>
      {children}
    </div>
  );
}
function HcSec({ icon, titulo, children }) {
  return (
    <Card className="rsp-card">
      <h3
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 700,
          color: "var(--accent)",
          marginBottom: 14,
        }}
      >
        {icon} {titulo}
      </h3>
      {children}
    </Card>
  );
}
function HcII({ value, onChange, type = "text" }) {
  return (
    <input
      value={value}
      type={type}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        fontFamily: "'DM Mono',monospace",
        fontSize: 13,
        padding: "5px 8px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
        borderRadius: 5,
        outline: "none",
      }}
      onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
    />
  );
}
function HcIS({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        fontFamily: "'DM Mono',monospace",
        fontSize: 12,
        padding: "5px 6px",
        background: "var(--bg-base)",
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
        borderRadius: 5,
        outline: "none",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── SeccionDesperdicio ────────────────────────────────────────────
function SeccionDesperdicio({ costos, save }) {
  const [desp, setDesp] = useState(String(costos.desperdicioPct));
  const [gan, setGan] = useState(String(costos.gastosGenerales));

  useEffect(() => { setDesp(String(costos.desperdicioPct)); }, [costos.desperdicioPct]);
  useEffect(() => { setGan(String(costos.gastosGenerales)); }, [costos.gastosGenerales]);

  // Detectar si hay cambios pendientes sin confirmar
  const despCambiado = parseFloat(desp) !== costos.desperdicioPct;
  const ganCambiado  = parseFloat(gan)  !== costos.gastosGenerales;

  const confirmarDesp = () => save({ ...costos, desperdicioPct: parseFloat(desp) || 0 });
  const confirmarGan  = () => save({ ...costos, gastosGenerales: parseFloat(gan) || 0 });

  const btnConfirmar = (cambiado, onClick) => (
    <button
      onClick={onClick}
      disabled={!cambiado}
      title={cambiado ? "Confirmar cambio" : "Sin cambios pendientes"}
      style={{
        marginTop: 8, width: "100%", padding: "7px 0", borderRadius: 7,
        cursor: cambiado ? "pointer" : "not-allowed",
        fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
        background: cambiado ? "var(--accent-soft)" : "transparent",
        border: `1px solid ${cambiado ? "var(--accent-border)" : "var(--border)"}`,
        color: cambiado ? "var(--accent)" : "var(--text-muted)",
        opacity: cambiado ? 1 : 0.45,
        transition: "all 0.18s",
      }}>
      {cambiado ? "✓ Confirmar cambio" : "Sin cambios"}
    </button>
  );

  return (
    <HcSec icon="📊" titulo="Desperdicio y Ganancia">
      <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <TextInput
            label="% Desperdicio de material"
            type="number" suffix="%" value={desp} onChange={setDesp}
          />
          <p style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6, color: "var(--text-muted)" }}>
            Cubre disco de corte, retazos y errores. Recomendado: 15–25%.
          </p>
          {btnConfirmar(despCambiado, confirmarDesp)}
        </div>
        <div>
          <TextInput
            label="% Ganancia del taller"
            type="number" suffix="%" value={gan} onChange={setGan}
          />
          <p style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6, color: "var(--text-muted)" }}>
            Se aplica sobre el costo total. El precio de venta siempre incluye tu margen limpio.
          </p>
          {btnConfirmar(ganCambiado, confirmarGan)}
        </div>
      </div>
      <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        {[
          ["Desperdicio", desp, "de material extra cubierto"],
          ["Ganancia", gan, "sobre costo total"],
        ].map(([label, val, note]) => (
          <div key={label} style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 12, padding: "14px 20px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, color: "var(--accent)" }}>
              {parseFloat(val) || 0}%
            </div>
            <div style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}>
              {label} · {note}
            </div>
          </div>
        ))}
      </div>
    </HcSec>
  );
}

// ── SeccionGastosFijos ────────────────────────────────────────────
// Permite cargar los gastos operativos fijos del taller y calcula
// automáticamente el costo por hora de taller (COSTO_HORA_TALLER).
// Fila de gasto fijo: controlada individualmente para que refleje
// cambios externos (ej: ajuste por inflación) sin perder el foco del usuario.
function FilaGastoFijo({ item, onUpdate, onDelete }) {
  const [valor, setValor] = useState(String(item.monto));

  // Sincroniza el input cuando el monto cambia externamente (inflación, restauración)
  useEffect(() => {
    setValor(String(item.monto));
  }, [item.monto]);

  const inpSm = {
    fontFamily: "'DM Mono',monospace", fontSize: 13, padding: "7px 10px",
    background: "var(--bg-base)", border: "1px solid var(--border)",
    color: "var(--text-primary)", borderRadius: 7, outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <tr style={{ borderBottom: "1px solid var(--separator)" }}>
      <td style={{ padding: "9px 12px", color: "var(--text-primary)", fontWeight: 500 }}>
        {item.nombre}
      </td>
      <td style={{ padding: "9px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>$</span>
          <input
            type="number" min="0"
            value={valor}
            onChange={e => setValor(e.target.value)}
            onBlur={() => onUpdate(item.id, valor)}
            style={{ ...inpSm, width: 120, textAlign: "right" }}
            onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
          />
        </div>
      </td>
      <td style={{ padding: "9px 8px", textAlign: "center" }}>
        <button onClick={onDelete} title="Eliminar gasto"
          style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 5 }}>×</button>
      </td>
    </tr>
  );
}

function SeccionGastosFijos({ costos, save }) {
  const gf = costos.gastosFijos || { items: [], horasProductivasMes: 160 };

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoMonto, setNuevoMonto] = useState("");
  const [horas, setHoras] = useState(String(gf.horasProductivasMes));

  // Sincroniza horas cuando cambia externamente
  useEffect(() => {
    setHoras(String(gf.horasProductivasMes));
  }, [gf.horasProductivasMes]);

  // LÓGICA - Cálculo de indicadores operativos
  const totalMensual = gf.items.reduce((a, i) => a + (parseFloat(i.monto) || 0), 0);
  const costoDiario  = totalMensual / 22;
  const costoHora    = gf.horasProductivasMes > 0
    ? totalMensual / gf.horasProductivasMes
    : 0;

  const saveGf = (nuevoGf) => save({ ...costos, gastosFijos: nuevoGf });

  const agregarItem = () => {
    if (!nuevoNombre.trim() || !nuevoMonto) return;
    const item = {
      id: Date.now(),
      nombre: nuevoNombre.trim(),
      monto: parseFloat(nuevoMonto) || 0,
    };
    saveGf({ ...gf, items: [...gf.items, item] });
    setNuevoNombre("");
    setNuevoMonto("");
  };

  const actualizarMonto = (id, monto) =>
    saveGf({ ...gf, items: gf.items.map((i) => i.id === id ? { ...i, monto: parseFloat(monto) || 0 } : i) });

  const actualizarHoras = (h) =>
    saveGf({ ...gf, horasProductivasMes: parseInt(h) || 160 });

  // Estilo de input compacto reutilizable
  const inpSm = {
    fontFamily: "'DM Mono',monospace", fontSize: 13, padding: "7px 10px",
    background: "var(--bg-base)", border: "1px solid var(--border)",
    color: "var(--text-primary)", borderRadius: 7, outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <HcSec icon="🏭" titulo="Gastos Fijos del Taller">

      {/* Tabla de gastos */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--accent-soft)" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, borderBottom: "1px solid var(--border)" }}>
                  Concepto
                </th>
                <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, borderBottom: "1px solid var(--border)", width: 160 }}>
                  Monto mensual
                </th>
                <th style={{ width: 40, borderBottom: "1px solid var(--border)" }} />
              </tr>
            </thead>
            <tbody>
              {gf.items.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: "16px 12px", color: "var(--text-muted)", fontSize: 12, fontStyle: "italic", textAlign: "center" }}>
                    Sin gastos cargados. Agregá tus costos operativos mensuales.
                  </td>
                </tr>
              )}
              {gf.items.map((item) => (
                <FilaGastoFijo
                  key={item.id}
                  item={item}
                  onUpdate={actualizarMonto}
                  onDelete={() => saveGf({ ...gf, items: gf.items.filter(i => i.id !== item.id) })}
                />
              ))}
            </tbody>
            {gf.items.length > 0 && (
              <tfoot>
                <tr>
                  <td style={{ padding: "10px 12px", fontWeight: 700, fontSize: 12, color: "var(--text-secondary)", fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "2px solid var(--border)" }}>
                    Total mensual
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 900, color: "var(--accent)", borderTop: "2px solid var(--border)" }}>
                    {fmtPeso(totalMensual)}
                  </td>
                  <td style={{ borderTop: "2px solid var(--border)" }} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Fila para agregar nuevo gasto */}
        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text" placeholder="Nombre del gasto (ej: Alquiler)"
            value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregarItem()}
            style={{ ...inpSm, flex: 1, minWidth: 160 }}
            onFocus={(e) => e.target.style.borderColor = "var(--accent-border)"}
            onBlur={(e) => e.target.style.borderColor = "var(--border)"}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>$</span>
            <input
              type="number" min="0" placeholder="Monto"
              value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && agregarItem()}
              style={{ ...inpSm, width: 120, textAlign: "right" }}
              onFocus={(e) => e.target.style.borderColor = "var(--accent-border)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border)"}
            />
          </div>
          <button onClick={agregarItem}
            style={{ padding: "7px 16px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            + Agregar
          </button>
        </div>
      </div>

      {/* Campo: horas productivas al mes */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--bg-subtle)", borderRadius: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
          Horas productivas al mes
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="number" min="1"
            value={horas}
            onChange={e => setHoras(e.target.value)}
            onBlur={() => actualizarHoras(horas)}
            style={{ ...inpSm, width: 80, textAlign: "center", fontWeight: 700 }}
            onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
          />
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>hs/mes</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)", width: "100%" }}>
          Promedio: 22 días × 8 hs = 176 hs. Ajustá según tu ritmo real.
        </span>
      </div>

      {/* LÓGICA - Indicadores operativos: 3 cards destacadas */}
      {totalMensual > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Total mensual", valor: fmtPeso(totalMensual), sub: "gastos fijos del taller", color: "var(--accent)", icon: "📅" },
            { label: "Costo diario", valor: fmtPeso(Math.round(costoDiario)), sub: "÷ 22 días laborales", color: "#7090c0", icon: "📆" },
            { label: "Costo por hora", valor: fmtPeso(Math.round(costoHora)), sub: `÷ ${gf.horasProductivasMes} hs productivas`, color: "#7ecf8a", icon: "⏱" },
          ].map(({ label, valor, sub, color, icon }) => (
            <div key={label} style={{
              background: "var(--bg-surface)", border: `1px solid ${color}30`,
              borderTop: `3px solid ${color}`, borderRadius: 10,
              padding: "14px 16px", textAlign: "center",
            }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 900, color, letterSpacing: -0.5, lineHeight: 1 }}>
                {valor}
              </div>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginTop: 8 }}>
                {label}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                {sub}
              </div>
            </div>
          ))}
        </div>
      )}
    </HcSec>
  );
}

// ── FilaVista (nivel superior) ─────────────────────────────────────
const FilaVista = ({ style, onEnter, onLeave, children }) => (
  <div style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════════
// 7. COSTOS
// ══════════════════════════════════════════════════════════════════
// ── HojaCostos ────────────────────────────────────────────────────
function HojaCostos({ costos, setCostos, onSave }) {
  const [nuevoMat, setNuevoMat] = useState({
    nombre: "",
    tipo: "melamina",
    espesor: 18,
    precioM2: "",
    placaLargo: 2750,
    placaAncho: 1830,
  });
  const [nuevaMO, setNuevaMO] = useState({
    nombre: "",
    tipo: "por_modulo",
    precio: "",
  });
  const [nuevoH, setNuevoH] = useState({ nombre: "", precio: "", unidad: "u" });
  const [nuevoTc, setNuevoTc] = useState({ nombre: "", precio: "" });
  const [editando, setEditando] = useState(null);
  const [pctInflacion, setPctInflacion] = useState("");
  const [historial, setHistorial] = useState([]);
  const [verHistorial, setVerHistorial] = useState(false);
  const [confirmInflacion, setConfirmInflacion] = useState(false);

  useEffect(() => {
    cargarHistorialPrecios().then(setHistorial);
  }, []);

  const save = (updated) => {
    setCostos(updated);
    onSave(updated);
  };

  const aplicarInflacion = async () => {
    const pct = parseFloat(pctInflacion);
    if (!pct || isNaN(pct)) return;
    const factor = 1 + pct / 100;
    if (factor <= 0) {
      alert(`⚠ Con ${pct}% los precios quedarían negativos o en cero. Usá un valor mayor a -100%.`);
      return;
    }
    await guardarSnapshotPrecios(costos);
    const gf = costos.gastosFijos || { items: [], horasProductivasMes: 160 };
    const updated = {
      ...costos,
      materiales:       applyFactor(costos.materiales,            "precioM2", factor),
      herrajes:         applyFactor(costos.herrajes,              "precio",   factor),
      manoDeObra:       applyFactor(costos.manoDeObra,            "precio",   factor),
      tapacanto:        applyFactor(costos.tapacanto || [],        "precio",   factor),
      extrasFrecuentes: applyFactor(costos.extrasFrecuentes || [], "precio",   factor),
      gastosFijos:      { ...gf, items: applyFactor(gf.items || [], "monto", factor) },
    };
    save(updated);
    setHistorial(await cargarHistorialPrecios());
    setPctInflacion("");
    setConfirmInflacion(false);
  };

  const restaurarDesdeHistorial = async (snap) => {
    if (!window.confirm(`¿Restaurar precios del ${new Date(snap.fecha).toLocaleDateString("es-AR")}?`)) return;
    const gf = costos.gastosFijos || { items: [], horasProductivasMes: 160 };
    const updated = {
      ...costos,
      materiales:       restoreFrom(costos.materiales,            snap.materiales       || [], "precioM2"),
      herrajes:         restoreFrom(costos.herrajes,              snap.herrajes         || [], "precio"),
      manoDeObra:       restoreFrom(costos.manoDeObra,            snap.manoDeObra       || [], "precio"),
      tapacanto:        restoreFrom(costos.tapacanto        || [], snap.tapacanto        || [], "precio"),
      extrasFrecuentes: restoreFrom(costos.extrasFrecuentes || [], snap.extrasFrecuentes || [], "precio"),
      gastosFijos:      { ...gf, items: restoreFrom(gf.items || [], snap.gastosFijos?.items || [], "monto") },
    };
    save(updated);
    setHistorial(await cargarHistorialPrecios());
  };

  const ini = (sec, item) =>
    setEditando({ sec, id: item.id, data: { ...item } });
  const updE = (k, v) =>
    setEditando((e) => ({ ...e, data: { ...e.data, [k]: v } }));
  const ok = () => {
    const { sec, id, data } = editando;
    if (sec === "mat")
      save({
        ...costos,
        materiales: costos.materiales.map((m) =>
          m.id === id
            ? {
                ...data,
                espesor: parseFloat(data.espesor) || 0,
                precioM2: parseFloat(data.precioM2) || 0,
                placaLargo: parseFloat(data.placaLargo) || 2750,
                placaAncho: parseFloat(data.placaAncho) || 1830,
              }
            : m
        ),
      });
    if (sec === "mo")
      save({
        ...costos,
        manoDeObra: costos.manoDeObra.map((m) =>
          m.id === id ? { ...data, precio: parseFloat(data.precio) || 0 } : m
        ),
      });
    if (sec === "h")
      save({
        ...costos,
        herrajes: costos.herrajes.map((h) =>
          h.id === id ? { ...data, precio: parseFloat(data.precio) || 0 } : h
        ),
      });
    if (sec === "tc")
      save({
        ...costos,
        tapacanto: costos.tapacanto.map((t) =>
          t.id === id ? { ...data, precio: parseFloat(data.precio) || 0 } : t
        ),
      });
    setEditando(null);
  };
  const matOpts = [
    { value: "melamina", label: "Melamina" },
    { value: "mdf", label: "MDF" },
    { value: "madera_maciza", label: "Madera maciza" },
    { value: "terciado", label: "Terciado" },
  ];
  const unidOpts = [
    { value: "u", label: "Unidad" },
    { value: "m", label: "Metro" },
    { value: "par", label: "Par" },
  ];
  const moOpts = [
    { value: "por_modulo", label: "Por módulo" },
    { value: "por_hora", label: "Por hora" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Valores base para todos los cálculos">
        Hoja de Costos
      </SectionTitle>

      {/* ── Ajuste por Inflación ── */}
      <HcSec icon="📈" titulo="Ajuste de precios por inflación">
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={hcLc}>% de aumento a aplicar</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                value={pctInflacion}
                onChange={e => setPctInflacion(e.target.value)}
                placeholder="Ej: 15"
                style={{
                  flex: 1, fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700,
                  padding: "8px 12px", background: "var(--bg-subtle)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", borderRadius: 6, outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
              <span style={{ fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", fontSize: 14 }}>%</span>
            </div>
            {/* Alerta si el resultado sería negativo */}
            {pctInflacion && parseFloat(pctInflacion) <= -100 && (
              <div style={{ marginTop: 6, fontSize: 11, color: "#e07070", fontFamily: "'DM Mono',monospace' " }}>
                ⚠ Con este valor los precios quedarían negativos. Mínimo: -99%
              </div>
            )}
            {/* Calculadora de reversión */}
            {pctInflacion && parseFloat(pctInflacion) > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace'" }}>
                💡 Para revertir este aumento exactamente aplicá: <strong style={{ color: "var(--accent)" }}>
                  {(-(parseFloat(pctInflacion) / (1 + parseFloat(pctInflacion) / 100))).toFixed(2)}%
                </strong>
              </div>
            )}
          </div>
          <div>
            {!confirmInflacion ? (
              <button
                disabled={!pctInflacion || isNaN(parseFloat(pctInflacion)) || parseFloat(pctInflacion) <= -100}
                onClick={() => setConfirmInflacion(true)}
                style={{
                  padding: "9px 18px", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.4)",
                  color: "#c8a02a", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace",
                  fontWeight: 700, fontSize: 12,
                  opacity: (!pctInflacion || isNaN(parseFloat(pctInflacion)) || parseFloat(pctInflacion) <= -100) ? 0.4 : 1,
                }}
              >
                📈 Aplicar {parseFloat(pctInflacion) > 0 ? "+" : ""}{pctInflacion || 0}%
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={aplicarInflacion}
                  style={{ padding: "9px 16px", background: "rgba(100,180,80,0.15)", border: "1px solid rgba(100,180,80,0.4)", color: "#7ecf8a", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 12 }}>
                  ✓ Confirmar
                </button>
                <button onClick={() => setConfirmInflacion(false)}
                  style={{ padding: "9px 12px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
          Actualiza en un solo clic materiales, herrajes, tapacanto, mano de obra, gastos fijos y extras frecuentes. Se guarda un snapshot antes de aplicar.
        </p>

        {historial.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setVerHistorial(v => !v)}
                style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, textDecoration: "underline" }}>
                {verHistorial ? "▲ Ocultar" : "▼ Ver"} historial de precios ({historial.length})
              </button>
              <button onClick={async () => {
                if (!window.confirm("¿Limpiar todo el historial de precios?")) return;
                localStorage.removeItem("carpicalc:historial");
                setHistorial([]);
                setVerHistorial(false);
              }}
                style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", textDecoration: "underline" }}>
                × Limpiar historial
              </button>
            </div>
            {verHistorial && (
              <div style={{ marginTop: 10, background: "rgba(0,0,0,0.15)", borderRadius: 8, padding: 12 }}>
                {historial.map((snap, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: i < historial.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                        📅 {new Date(snap.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <button onClick={() => restaurarDesdeHistorial(snap)}
                        style={{ padding: "3px 10px", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 5 }}>
                        ↩ Restaurar estos precios
                      </button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {snap.materiales.map(m => (
                        <span key={m.nombre} style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 4, padding: "2px 7px", color: "var(--text-secondary)" }}>
                          {m.nombre}: {fmtPeso(m.precioM2)}/m²
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </HcSec>

      <HcSec icon="🪵" titulo="Materiales">
        {costos.materiales.map((mat) => {
          const ed = editando?.sec === "mat" && editando?.id === mat.id;
          return (
            <FilaVista
              key={mat.id}
              style={ed ? hcFE : hcFV}
              onEnter={(e) => {
                if (!ed)
                  e.currentTarget.style.borderColor = "var(--accent-border)";
              }}
              onLeave={(e) => {
                if (!ed) e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {ed ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div
                    className="rsp-grid-1"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <label style={hcLc}>Nombre</label>
                      <HcII
                        value={editando.data.nombre}
                        onChange={(v) => updE("nombre", v)}
                      />
                    </div>
                    <div>
                      <label style={hcLc}>Tipo</label>
                      <HcIS
                        value={editando.data.tipo}
                        onChange={(v) => updE("tipo", v)}
                        options={matOpts}
                      />
                    </div>
                    <div>
                      <label style={hcLc}>Espesor mm</label>
                      <HcII
                        value={editando.data.espesor}
                        onChange={(v) => updE("espesor", v)}
                        type="number"
                      />
                    </div>
                    <div>
                      <label style={hcLc}>$/m²</label>
                      <HcII
                        value={editando.data.precioM2}
                        onChange={(v) => updE("precioM2", v)}
                        type="number"
                      />
                    </div>
                  </div>
                  <div
                    className="rsp-grid-1"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 2fr",
                      gap: 10,
                      paddingTop: 6,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <label style={hcLc}>Largo placa (mm)</label>
                      <HcII
                        value={editando.data.placaLargo ?? 2750}
                        onChange={(v) => updE("placaLargo", v)}
                        type="number"
                      />
                    </div>
                    <div>
                      <label style={hcLc}>Ancho placa (mm)</label>
                      <HcII
                        value={editando.data.placaAncho ?? 1830}
                        onChange={(v) => updE("placaAncho", v)}
                        type="number"
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        paddingBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          fontFamily: "'DM Mono',monospace",
                        }}
                      >
                        Área:{" "}
                        {fmtNum(
                          ((editando.data.placaLargo ?? 2750) *
                            (editando.data.placaAncho ?? 1830)) /
                            1_000_000
                        )}{" "}
                        m²
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                    }}
                  >
                    <HcBtnCx onClick={() => setEditando(null)} />
                    <HcBtnOk onClick={ok} />
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      flex: 2,
                      minWidth: 120,
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    {mat.nombre}
                  </span>
                  <Badge>{TIPO_MAT[mat.tipo]}</Badge>
                  <Badge color="#705090">{mat.espesor}mm</Badge>
                  <Badge color="#507060">
                    {mat.placaLargo ?? 2750}×{mat.placaAncho ?? 1830}
                  </Badge>
                  <span
                    style={{
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 13,
                      color: "#7ecf8a",
                    }}
                  >
                    {fmtPeso(mat.precioM2)}/m²
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <HcBtnE onClick={() => ini("mat", mat)} />
                    <HcBtnD
                      onClick={() =>
                        save({
                          ...costos,
                          materiales: costos.materiales.filter(
                            (m) => m.id !== mat.id
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </FilaVista>
          );
        })}
        <HcNewBox>
          <div
            className="rsp-grid-1"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <TextInput
              label="Nombre"
              placeholder="Melamina 15mm"
              value={nuevoMat.nombre}
              onChange={(v) => setNuevoMat((p) => ({ ...p, nombre: v }))}
              small
            />
            <Select
              label="Tipo"
              value={nuevoMat.tipo}
              onChange={(v) => setNuevoMat((p) => ({ ...p, tipo: v }))}
              small
              options={matOpts}
            />
            <TextInput
              label="Espesor mm"
              type="number"
              value={nuevoMat.espesor}
              onChange={(v) => setNuevoMat((p) => ({ ...p, espesor: v }))}
              small
              suffix="mm"
            />
            <TextInput
              label="$/m²"
              type="number"
              value={nuevoMat.precioM2}
              onChange={(v) => setNuevoMat((p) => ({ ...p, precioM2: v }))}
              small
            />
          </div>
          <div
            className="rsp-grid-1"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 8,
              alignItems: "end",
            }}
          >
            <TextInput
              label="Largo placa (mm)"
              type="number"
              value={nuevoMat.placaLargo}
              onChange={(v) => setNuevoMat((p) => ({ ...p, placaLargo: v }))}
              small
              suffix="mm"
            />
            <TextInput
              label="Ancho placa (mm)"
              type="number"
              value={nuevoMat.placaAncho}
              onChange={(v) => setNuevoMat((p) => ({ ...p, placaAncho: v }))}
              small
              suffix="mm"
            />
            <div>
              <Btn
                small
                onClick={() => {
                  if (!nuevoMat.nombre || !nuevoMat.precioM2) return;
                  save({
                    ...costos,
                    materiales: [
                      ...costos.materiales,
                      {
                        ...nuevoMat,
                        id: Date.now(),
                        espesor: parseFloat(nuevoMat.espesor) || 18,
                        precioM2: parseFloat(nuevoMat.precioM2),
                        placaLargo: parseFloat(nuevoMat.placaLargo) || 2750,
                        placaAncho: parseFloat(nuevoMat.placaAncho) || 1830,
                      },
                    ],
                  });
                  setNuevoMat({
                    nombre: "",
                    tipo: "melamina",
                    espesor: 18,
                    precioM2: "",
                    placaLargo: 2750,
                    placaAncho: 1830,
                  });
                }}
              >
                + Agregar
              </Btn>
            </div>
          </div>
        </HcNewBox>
      </HcSec>

      <HcSec icon="🎗" titulo="Tapacanto (por metro lineal)">
        {(costos.tapacanto || []).map((tc) => {
          const ed = editando?.sec === "tc" && editando?.id === tc.id;
          return (
            <FilaVista
              key={tc.id}
              style={ed ? hcFE : hcFV}
              onEnter={(e) => {
                if (!ed)
                  e.currentTarget.style.borderColor = "var(--accent-border)";
              }}
              onLeave={(e) => {
                if (!ed) e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {ed ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div
                    className="rsp-grid-1"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <label style={hcLc}>Nombre</label>
                      <HcII
                        value={editando.data.nombre}
                        onChange={(v) => updE("nombre", v)}
                      />
                    </div>
                    <div>
                      <label style={hcLc}>$/m lineal</label>
                      <HcII
                        value={editando.data.precio}
                        onChange={(v) => updE("precio", v)}
                        type="number"
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                    }}
                  >
                    <HcBtnCx onClick={() => setEditando(null)} />
                    <HcBtnOk onClick={ok} />
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      flex: 2,
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    {tc.nombre}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      textAlign: "right",
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 13,
                      color: "#7ecf8a",
                    }}
                  >
                    {fmtPeso(tc.precio)}/m
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <HcBtnE onClick={() => ini("tc", tc)} />
                    <HcBtnD
                      onClick={() =>
                        save({
                          ...costos,
                          tapacanto: costos.tapacanto.filter(
                            (t) => t.id !== tc.id
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </FilaVista>
          );
        })}
        <HcNewBox>
          <div
            className="rsp-grid-1"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr auto",
              gap: 8,
              alignItems: "end",
            }}
          >
            <TextInput
              label="Nombre"
              placeholder="Tapacanto PVC 1mm"
              value={nuevoTc.nombre}
              onChange={(v) => setNuevoTc((p) => ({ ...p, nombre: v }))}
              small
            />
            <TextInput
              label="$/m lineal"
              type="number"
              value={nuevoTc.precio}
              onChange={(v) => setNuevoTc((p) => ({ ...p, precio: v }))}
              small
            />
            <div>
              <Btn
                small
                onClick={() => {
                  if (!nuevoTc.nombre || !nuevoTc.precio) return;
                  save({
                    ...costos,
                    tapacanto: [
                      ...(costos.tapacanto || []),
                      {
                        ...nuevoTc,
                        id: Date.now(),
                        precio: parseFloat(nuevoTc.precio),
                      },
                    ],
                  });
                  setNuevoTc({ nombre: "", precio: "" });
                }}
              >
                + Agregar
              </Btn>
            </div>
          </div>
        </HcNewBox>
      </HcSec>

      <HcSec icon="🔨" titulo="Mano de Obra">
        {costos.manoDeObra.map((mo) => {
          const ed = editando?.sec === "mo" && editando?.id === mo.id;
          return (
            <FilaVista
              key={mo.id}
              style={ed ? hcFE : hcFV}
              onEnter={(e) => {
                if (!ed)
                  e.currentTarget.style.borderColor = "var(--accent-border)";
              }}
              onLeave={(e) => {
                if (!ed) e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {ed ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div
                    className="rsp-grid-1"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <label style={hcLc}>Descripción</label>
                      <HcII
                        value={editando.data.nombre}
                        onChange={(v) => updE("nombre", v)}
                      />
                    </div>
                    <div>
                      <label style={hcLc}>Tipo</label>
                      <HcIS
                        value={editando.data.tipo}
                        onChange={(v) => updE("tipo", v)}
                        options={moOpts}
                      />
                    </div>
                    <div>
                      <label style={hcLc}>Precio</label>
                      <HcII
                        value={editando.data.precio}
                        onChange={(v) => updE("precio", v)}
                        type="number"
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                    }}
                  >
                    <HcBtnCx onClick={() => setEditando(null)} />
                    <HcBtnOk onClick={ok} />
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      flex: 2,
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    {mo.nombre}
                  </span>
                  <Badge color="#7090c0">
                    {mo.tipo === "por_modulo" ? "por módulo" : "por hora"}
                  </Badge>
                  <span
                    style={{
                      flex: 1,
                      textAlign: "right",
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 13,
                      color: "#7ecf8a",
                    }}
                  >
                    {fmtPeso(mo.precio)}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <HcBtnE onClick={() => ini("mo", mo)} />
                    <HcBtnD
                      onClick={() =>
                        save({
                          ...costos,
                          manoDeObra: costos.manoDeObra.filter(
                            (m) => m.id !== mo.id
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </FilaVista>
          );
        })}
        <HcNewBox>
          <div
            className="rsp-grid-1"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr auto",
              gap: 8,
              alignItems: "end",
            }}
          >
            <TextInput
              label="Descripción"
              value={nuevaMO.nombre}
              onChange={(v) => setNuevaMO((p) => ({ ...p, nombre: v }))}
              small
            />
            <Select
              label="Tipo"
              value={nuevaMO.tipo}
              onChange={(v) => setNuevaMO((p) => ({ ...p, tipo: v }))}
              small
              options={moOpts}
            />
            <TextInput
              label="Precio"
              type="number"
              value={nuevaMO.precio}
              onChange={(v) => setNuevaMO((p) => ({ ...p, precio: v }))}
              small
            />
            <div>
              <Btn
                small
                onClick={() => {
                  if (!nuevaMO.nombre || !nuevaMO.precio) return;
                  save({
                    ...costos,
                    manoDeObra: [
                      ...costos.manoDeObra,
                      {
                        ...nuevaMO,
                        id: Date.now(),
                        precio: parseFloat(nuevaMO.precio),
                      },
                    ],
                  });
                  setNuevaMO({ nombre: "", tipo: "por_modulo", precio: "" });
                }}
              >
                + Agregar
              </Btn>
            </div>
          </div>
        </HcNewBox>
      </HcSec>

      <HcSec icon="🔩" titulo="Herrajes y Accesorios">
        {costos.herrajes.map((h) => {
          const ed = editando?.sec === "h" && editando?.id === h.id;
          return (
            <FilaVista
              key={h.id}
              style={ed ? hcFE : hcFV}
              onEnter={(e) => {
                if (!ed)
                  e.currentTarget.style.borderColor = "var(--accent-border)";
              }}
              onLeave={(e) => {
                if (!ed) e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {ed ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div
                    className="rsp-grid-1"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <label style={hcLc}>Nombre</label>
                      <HcII
                        value={editando.data.nombre}
                        onChange={(v) => updE("nombre", v)}
                      />
                    </div>
                    <div>
                      <label style={hcLc}>Unidad</label>
                      <HcIS
                        value={editando.data.unidad}
                        onChange={(v) => updE("unidad", v)}
                        options={unidOpts}
                      />
                    </div>
                    <div>
                      <label style={hcLc}>Precio</label>
                      <HcII
                        value={editando.data.precio}
                        onChange={(v) => updE("precio", v)}
                        type="number"
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                    }}
                  >
                    <HcBtnCx onClick={() => setEditando(null)} />
                    <HcBtnOk onClick={ok} />
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      flex: 2,
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    {h.nombre}
                  </span>
                  <Badge color="#907060">/{h.unidad}</Badge>
                  <span
                    style={{
                      flex: 1,
                      textAlign: "right",
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 13,
                      color: "#7ecf8a",
                    }}
                  >
                    {fmtPeso(h.precio)}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <HcBtnE onClick={() => ini("h", h)} />
                    <HcBtnD
                      onClick={() =>
                        save({
                          ...costos,
                          herrajes: costos.herrajes.filter(
                            (x) => x.id !== h.id
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </FilaVista>
          );
        })}
        <HcNewBox>
          <div
            className="rsp-grid-1"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr auto",
              gap: 8,
              alignItems: "end",
            }}
          >
            <TextInput
              label="Nombre"
              value={nuevoH.nombre}
              onChange={(v) => setNuevoH((p) => ({ ...p, nombre: v }))}
              small
            />
            <Select
              label="Unidad"
              value={nuevoH.unidad}
              onChange={(v) => setNuevoH((p) => ({ ...p, unidad: v }))}
              small
              options={unidOpts}
            />
            <TextInput
              label="Precio"
              type="number"
              value={nuevoH.precio}
              onChange={(v) => setNuevoH((p) => ({ ...p, precio: v }))}
              small
            />
            <div>
              <Btn
                small
                onClick={() => {
                  if (!nuevoH.nombre || !nuevoH.precio) return;
                  save({
                    ...costos,
                    herrajes: [
                      ...costos.herrajes,
                      {
                        ...nuevoH,
                        id: Date.now(),
                        precio: parseFloat(nuevoH.precio),
                      },
                    ],
                  });
                  setNuevoH({ nombre: "", precio: "", unidad: "u" });
                }}
              >
                + Agregar
              </Btn>
            </div>
          </div>
        </HcNewBox>
      </HcSec>

      <SeccionDesperdicio costos={costos} save={save} />
      <SeccionGastosFijos costos={costos} save={save} />

      {/* Extras frecuentes — base para autocompletado en Presupuesto */}
      <HcSec icon="📦" titulo="Extras y Servicios Frecuentes">
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.6 }}>
          Estos ítems aparecen como sugerencias al cargar adicionales en un presupuesto (flete, instalación, etc.).
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(costos.extrasFrecuentes || []).map(f => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg-subtle)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)" }}>{f.nombre}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{fmtPeso(f.precio)}</span>
              <button onClick={() => save({ ...costos, extrasFrecuentes: (costos.extrasFrecuentes || []).filter(x => x.id !== f.id) })}
                style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input id="ef-nombre" type="text" placeholder="Nombre del servicio" style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontFamily: "'DM Mono',monospace", fontSize: 12, outline: "none" }} />
          <input id="ef-precio" type="number" placeholder="Precio" style={{ width: 110, padding: "7px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontFamily: "'DM Mono',monospace", fontSize: 12, outline: "none", textAlign: "right" }} />
          <button onClick={() => {
            const nom = document.getElementById("ef-nombre")?.value.trim();
            const pre = parseFloat(document.getElementById("ef-precio")?.value) || 0;
            if (!nom) return;
            save({ ...costos, extrasFrecuentes: [...(costos.extrasFrecuentes || []), { id: Date.now(), nombre: nom, precio: pre }] });
            if (document.getElementById("ef-nombre")) document.getElementById("ef-nombre").value = "";
            if (document.getElementById("ef-precio")) document.getElementById("ef-precio").value = "";
          }} style={{ padding: "7px 14px", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
            + Agregar
          </button>
        </div>
      </HcSec>
    </div>
  );
}

// ── FilaPieza ─────────────────────────────────────────────────────

export { HojaCostos, SeccionDesperdicio, SeccionGastosFijos };
