import React, { useState, useCallback, useEffect } from "react";

// ╔══════════════════════════════════════════════════════════════════╗
// ║                        CarpiCálc — App.js                       ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  SECCIONES (buscar por el nombre para navegar):                 ║
// ║  1. DATOS INICIALES      — costoIniciales, modulosIniciales     ║
// ║  2. PERSISTENCIA         — cargarDatos, guardarXxx, historial   ║
// ║  3. CÁLCULO              — resolverDim, calcularModulo          ║
// ║  4. CONSTANTES GLOBALES  — PERFIL_VACIO, TIPO_MAT, CATEGORIAS  ║
// ║  5. UTILIDADES           — fmtPeso, fmtFecha, helpers           ║
// ║  6. HOOKS                — useUndo, useTema                     ║
// ║  7. EXPORTACIÓN          — WhatsApp, PDF, Ficha de Obra         ║
// ║  8. UI PRIMITIVOS        — Field, TextInput, Card, Btn...       ║
// ║  9. COSTOS               — HojaCostos y sus sub-componentes     ║
// ║ 10. CATÁLOGO             — FormModulo, TarjetaModulo...         ║
// ║ 11. PRESUPUESTO          — GestorPresupuestos, BarraTotal...    ║
// ║ 12. VISTA PREVIA         — VistaPrevia                          ║
// ║ 13. LISTA DE CORTE       — ListaCorte y sus sub-componentes     ║
// ║ 14. TABLERO DE TRABAJOS  — Kanban, FilaLista, tabs internas     ║
// ║ 15. CAJA                 — FilaCaja, PanelCaja                  ║
// ║ 16. MI TALLER            — PanelPerfil                          ║
// ║ 17. APP PRINCIPAL        — Header, Login, AppInterna, App       ║
// ╚══════════════════════════════════════════════════════════════════╝

// ══════════════════════════════════════════════════════════════════
// 1. DATOS INICIALES
// ══════════════════════════════════════════════════════════════════

const costoIniciales = {
  materiales: [
    {
      id: 1,
      nombre: "Melamina 18mm",
      tipo: "melamina",
      espesor: 18,
      precioM2: 4200,
      placaLargo: 2750,
      placaAncho: 1830,
    },
    {
      id: 2,
      nombre: "MDF 18mm",
      tipo: "mdf",
      espesor: 18,
      precioM2: 3800,
      placaLargo: 2750,
      placaAncho: 1830,
    },
    {
      id: 3,
      nombre: "Madera maciza",
      tipo: "madera_maciza",
      espesor: 20,
      precioM2: 9500,
      placaLargo: 2440,
      placaAncho: 1220,
    },
    {
      id: 4,
      nombre: "Terciado 15mm",
      tipo: "terciado",
      espesor: 15,
      precioM2: 3200,
      placaLargo: 2440,
      placaAncho: 1220,
    },
  ],
  manoDeObra: [
    {
      id: 1,
      nombre: "Armado módulo estándar",
      tipo: "por_modulo",
      precio: 8000,
    },
    { id: 2, nombre: "Instalación en obra", tipo: "por_hora", precio: 3500 },
  ],
  herrajes: [
    { id: 1, nombre: "Bisagra cazoleta", precio: 450, unidad: "u" },
    { id: 2, nombre: "Corredor telescópico 45cm", precio: 1800, unidad: "u" },
    { id: 3, nombre: "Manija barra aluminio", precio: 900, unidad: "u" },
    { id: 4, nombre: "Perno minifix", precio: 120, unidad: "u" },
  ],
  tapacanto: [
    { id: 1, nombre: "Tapacanto melamina 19mm", precio: 180 },
    { id: 2, nombre: "Tapacanto PVC 2mm", precio: 250 },
  ],
  desperdicioPct: 20,
  gastosGenerales: 18,
  // Gastos fijos del taller — se usan para calcular el costo por hora operativo
  gastosFijos: {
    items: [
      { id: 1, nombre: "Alquiler", monto: 80000 },
      { id: 2, nombre: "Servicios (luz, gas, agua)", monto: 15000 },
      { id: 3, nombre: "Monotributo / Impuestos", monto: 25000 },
      { id: 4, nombre: "Seguros", monto: 12000 },
    ],
    horasProductivasMes: 160,
  },
};

const modulosIniciales = {
  MC001: {
    nombre: "Módulo bajo mesada 60cm",
    descripcion: "Bajo mesada con puerta",
    dimensiones: { ancho: 600, profundidad: 550, alto: 700 },
    material: "melamina",
    piezas: [
      {
        nombre: "Lateral",
        cantidad: 2,
        usaDim: "alto",
        usaDim2: "profundidad",
        offsetEsp: 0,
        offsetMm: 0,
        divisor: 1,
        offsetEsp2: 0,
        offsetMm2: 0,
        divisor2: 1,
        tc: { id: 1, lados1: 1, lados2: 0 },
      },
      {
        nombre: "Base",
        cantidad: 1,
        usaDim: "ancho",
        usaDim2: "profundidad",
        offsetEsp: -2,
        offsetMm: 0,
        divisor: 1,
        offsetEsp2: 0,
        offsetMm2: 0,
        divisor2: 1,
        tc: { id: 1, lados1: 0, lados2: 1 },
      },
      {
        nombre: "Techo",
        cantidad: 1,
        usaDim: "ancho",
        usaDim2: "profundidad",
        offsetEsp: -2,
        offsetMm: 0,
        divisor: 1,
        offsetEsp2: 0,
        offsetMm2: 0,
        divisor2: 1,
        tc: { id: 1, lados1: 1, lados2: 1 },
      },
      {
        nombre: "Puerta",
        cantidad: 1,
        usaDim: "alto",
        usaDim2: "ancho",
        offsetEsp: 0,
        offsetMm: 0,
        divisor: 1,
        offsetEsp2: 0,
        offsetMm2: 0,
        divisor2: 1,
        tc: { id: 1, lados1: 2, lados2: 2 },
      },
    ],
    herrajes: [{ id: 1, cantidad: 2 }],
    moDeObra: { tipo: "por_modulo", horas: 0 },
  },
  MC002: {
    nombre: "Módulo colgante 60cm",
    descripcion: "Alacena 2 puertas",
    dimensiones: { ancho: 600, profundidad: 350, alto: 700 },
    material: "melamina",
    piezas: [
      {
        nombre: "Lateral",
        cantidad: 2,
        usaDim: "alto",
        usaDim2: "profundidad",
        offsetEsp: 0,
        offsetMm: 0,
        divisor: 1,
        offsetEsp2: 0,
        offsetMm2: 0,
        divisor2: 1,
        tc: { id: 1, lados1: 1, lados2: 0 },
      },
      {
        nombre: "Base",
        cantidad: 1,
        usaDim: "ancho",
        usaDim2: "profundidad",
        offsetEsp: -2,
        offsetMm: 0,
        divisor: 1,
        offsetEsp2: 0,
        offsetMm2: 0,
        divisor2: 1,
        tc: { id: 1, lados1: 0, lados2: 1 },
      },
      {
        nombre: "Techo",
        cantidad: 1,
        usaDim: "ancho",
        usaDim2: "profundidad",
        offsetEsp: -2,
        offsetMm: 0,
        divisor: 1,
        offsetEsp2: 0,
        offsetMm2: 0,
        divisor2: 1,
        tc: { id: 1, lados1: 1, lados2: 1 },
      },
      {
        nombre: "Puerta",
        cantidad: 2,
        usaDim: "alto",
        usaDim2: "ancho",
        offsetEsp: 0,
        offsetMm: 0,
        divisor: 1,
        offsetEsp2: 0,
        offsetMm2: 0,
        divisor2: 1,
        tc: { id: 1, lados1: 2, lados2: 2 },
      },
    ],
    herrajes: [{ id: 1, cantidad: 4 }],
    moDeObra: { tipo: "por_modulo", horas: 0 },
  },
};

// ══════════════════════════════════════════════════════════════════
// 2. PERSISTENCIA
// ══════════════════════════════════════════════════════════════════
const PERFIL_VACIO = { nombre: "", slogan: "", tel: "", email: "", direccion: "", logo: null, textoApertura: "", condiciones: "" };

async function cargarDatos() {
  try {
    const rm = localStorage.getItem("carpicalc:modulos");
    const rc = localStorage.getItem("carpicalc:costos");
    const rp = localStorage.getItem("carpicalc:presupuestos");
    const rpf = localStorage.getItem("carpicalc:perfil");
    return {
      modulos: rm ? JSON.parse(rm) : modulosIniciales,
      costos: rc ? JSON.parse(rc) : costoIniciales,
      presupuestos: rp ? JSON.parse(rp) : {},
      perfil: rpf ? { ...PERFIL_VACIO, ...JSON.parse(rpf) } : { ...PERFIL_VACIO },
    };
  } catch {
    return {
      modulos: modulosIniciales,
      costos: costoIniciales,
      presupuestos: {},
      perfil: { ...PERFIL_VACIO },
    };
  }
}
const _save = async (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
};
const guardarModulos     = (d) => _save("carpicalc:modulos", d);
const guardarPresupuestos = (d) => _save("carpicalc:presupuestos", d);
const guardarPerfil      = (d) => _save("carpicalc:perfil", d);

// Guarda costos Y actualiza el timestamp de versión.
// Ese timestamp permite detectar presupuestos creados antes de la última modificación de costos.
const guardarCostos = (d) => {
  _save("carpicalc:costos_version", Date.now().toString());
  return _save("carpicalc:costos", d);
};

// Devuelve el timestamp (ms) de la última vez que se modificaron los costos.
// Si nunca se modificaron, retorna 0.
const leerVersionCostos = () => {
  try { return parseInt(localStorage.getItem("carpicalc:costos_version") || "0"); }
  catch { return 0; }
};

// ── Historial de precios ──────────────────────────────────────────
async function cargarHistorialPrecios() {
  try {
    const r = localStorage.getItem("carpicalc:historial");
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}
async function guardarSnapshotPrecios(costos) {
  try {
    const hist = await cargarHistorialPrecios();
    const snap = {
      fecha: Date.now(),
      materiales: costos.materiales.map(m => ({ nombre: m.nombre, tipo: m.tipo, precioM2: m.precioM2 })),
      herrajes: costos.herrajes.map(h => ({ nombre: h.nombre, precio: h.precio })),
    };
    const nuevo = [snap, ...hist].slice(0, 20); // máximo 20 snapshots
    localStorage.setItem("carpicalc:historial", JSON.stringify(nuevo));
  } catch {}
}

// ══════════════════════════════════════════════════════════════════
// 3. CÁLCULO
// ══════════════════════════════════════════════════════════════════
function resolverDim(base, offsetEsp, offsetMm, divisor, espesor) {
  const raw = (base || 0) + (offsetEsp || 0) * (espesor || 0) + (offsetMm || 0);
  return Math.max(0, raw / Math.max(1, divisor || 1));
}
function calcularModulo(modulo, costos) {
  if (!modulo?.piezas || !costos?.materiales) return null;
  const matDef = costos.materiales.find((m) => m.tipo === modulo.material) || costos.materiales[0];
  if (!matDef) return null;
  const { ancho, profundidad, alto } = modulo.dimensiones || {};
  if (!ancho && !profundidad && !alto) return null;
  const dimMap = { ancho: ancho || 0, profundidad: profundidad || 0, alto: alto || 0 };
  const esp = matDef.espesor || 18;
  let m2Neto = 0, metrosTapacanto = 0, costoTapacanto = 0;
  const desglosePiezas = [];

  for (const p of modulo.piezas) {
    const d1 = p.especial
      ? (parseInt(p.dimLibre1) || 0)
      : resolverDim(dimMap[p.usaDim], p.offsetEsp, p.offsetMm, p.divisor || 1, esp);
    const d2 = p.especial
      ? (parseInt(p.dimLibre2) || 0)
      : resolverDim(dimMap[p.usaDim2], p.offsetEsp2, p.offsetMm2, p.divisor2 || 1, esp);
    const area = (d1 * d2 * p.cantidad) / 1_000_000;
    m2Neto += area;
    let mTc = 0;
    if (p.tc?.id) {
      mTc = (p.cantidad * ((p.tc.lados1 || 0) * d1 + (p.tc.lados2 || 0) * d2)) / 1000;
      metrosTapacanto += mTc;
      // Calcular costo tapacanto en el mismo loop (evita doble iteración)
      const tcDef = (costos.tapacanto || []).find((t) => t.id === p.tc.id);
      if (tcDef) costoTapacanto += mTc * tcDef.precio;
    }
    desglosePiezas.push({ nombre: p.nombre, cantidad: p.cantidad, d1, d2, area, mTc, especial: !!p.especial });
  }

  const pctDesp = costos.desperdicioPct || 20;
  const m2Total = m2Neto * (1 + pctDesp / 100);
  const costoMaterial = m2Total * matDef.precioM2;

  let costoMO = 0;
  const moItem = costos.manoDeObra?.find((m) => m.tipo === modulo.moDeObra?.tipo);
  if (moItem)
    costoMO = moItem.tipo === "por_modulo"
      ? moItem.precio
      : moItem.precio * (modulo.moDeObra.horas || 0);

  let costoHerrajes = 0;
  for (const h of modulo.herrajes || []) {
    const herr = costos.herrajes?.find((x) => x.id === h.id);
    if (herr) costoHerrajes += herr.precio * (h.cantidad || 1);
  }

  const costoBase = costoMaterial + costoTapacanto + costoMO + costoHerrajes;
  const ganancia = costoBase * ((costos.gastosGenerales || 0) / 100);
  const total = costoBase + ganancia;
  return { costoMaterial, costoTapacanto, costoMO, costoHerrajes, costoBase, ganancia, total, m2Neto, m2Total, pctDesp, metrosTapacanto, desglosePiezas, espesor: esp };
}

// ══════════════════════════════════════════════════════════════════
// 4. CONSTANTES GLOBALES + UTILIDADES
// ══════════════════════════════════════════════════════════════════
// ─────────────────────────────────
const fmtPeso   = (n) => "$ " + Math.round(n).toLocaleString("es-AR");
const fmtNum = (n, d = 2) => Number(n).toFixed(d);
const fmtFecha = (ts) =>
  new Date(ts).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const fmtFechaLarga = (ts) =>
  new Date(ts).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
// Lee el perfil del taller desde localStorage (usable fuera de React)
function leerPerfil() {
  try { return JSON.parse(localStorage.getItem("carpicalc:perfil")) || {}; }
  catch { return {}; }
}

// Devuelve true si el presupuesto fue actualizado ANTES de la última modificación de costos.
// Compara contra p.costosVersionAl (timestamp del último "Actualizar precio" aplicado).
// Si nunca se actualizó, usa el presId (fecha de creación) como fallback.
function presupuestoNecesitaActualizacion(presId, costosVersion, p) {
  if (!costosVersion || !presId) return false;
  const referencia = p?.costosVersionAl ?? parseInt(presId);
  return referencia < costosVersion;
}

// LÓGICA - Precios Tachados y PDF
// Función centralizada para el cálculo del "Total Visual" que se muestra al cliente.
// Retorna { totalFinal, hayDescuento, hayGanancia, totalOriginal }
// - Si hay descuento: el cliente ve el precio tachado + precio con descuento
// - Si hay ganancia extra: el cliente ve solo el precio final (sin rastro del cálculo)
function calcularTotalVisual(totalBase, descuento, gananciaExtra) {
  const d = parseFloat(descuento) || 0;
  const g = parseFloat(gananciaExtra) || 0;
  return {
    totalFinal:    Math.round(totalBase + g - d),
    totalOriginal: totalBase,
    hayDescuento:  d > 0,
    hayGanancia:   g > 0,
    descuentoVal:  d,
    gananciaVal:   g,
  };
}
// Retorna el nuevo total o null si hay un error.
function recalcularTotalPresupuesto(p, modulos, costos) {
  if (!p?.items || !modulos || !costos) return null;
  return p.items.reduce((acc, item) => {
    const base = modulos[item.codigo];
    if (!base) return acc;
    const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || base.dimensiones;
    const mod = { ...base, dimensiones: dims };
    const calc = calcularModulo(mod, costos);
    if (!calc) return acc;
    return acc + calc.total * item.cantidad;
  }, 0);
}

const TIPO_MAT = {
  melamina: "Melamina",
  mdf: "MDF",
  madera_maciza: "Madera maciza",
  terciado: "Terciado",
};

const CATEGORIAS_DEFAULT = [
  { id: "bajos",    label: "Bajos",     icon: "⬇", color: "#7090c0" },
  { id: "altos",    label: "Altos",     icon: "⬆", color: "#9070b0" },
  { id: "placares", label: "Placares",  icon: "🚪", color: "#70a080" },
  { id: "living",   label: "Living",    icon: "🛋", color: "#c09050" },
  { id: "banio",    label: "Baño",      icon: "🚿", color: "#5090a0" },
  { id: "otros",    label: "Otros",     icon: "📦", color: "#808080" },
];

// ══════════════════════════════════════════════════════════════════
// 5. HOOKS PERSONALIZADOS
// ══════════════════════════════════════════════════════════════════
// ── Hook global de Undo ───────────────────────────────────────────
function useUndo() {
  const [toasts, setToasts] = useState([]);

  const pushUndo = useCallback(({ mensaje, onDeshacer, duracion = 5000 }) => {
    const id = Date.now();
    setToasts(t => [...t, { id, mensaje, onDeshacer, duracion }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duracion + 300);
  }, []);

  const deshacer = useCallback((id) => {
    setToasts(t => {
      const toast = t.find(x => x.id === id);
      if (toast?.onDeshacer) toast.onDeshacer();
      return t.filter(x => x.id !== id);
    });
  }, []);

  const cerrar = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const ToastContainer = useCallback(() => (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9000,
      display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none",
    }}>
      {toasts.map(toast => (
        <UndoToast key={toast.id} toast={toast}
          onDeshacer={() => deshacer(toast.id)}
          onClose={() => cerrar(toast.id)} />
      ))}
    </div>
  ), [toasts, deshacer, cerrar]);

  return { pushUndo, ToastContainer };
}

function UndoToast({ toast, onDeshacer, onClose }) {
  const [pct, setPct] = useState(100);
  useEffect(() => {
    const start = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / toast.duracion) * 100);
      setPct(remaining);
      if (remaining === 0) clearInterval(iv);
    }, 30);
    return () => clearInterval(iv);
  }, [toast.duracion]);

  return (
    <div className="anim-slideright" style={{
      pointerEvents: "all", background: "var(--bg-surface)",
      border: "1px solid var(--border-strong)", borderRadius: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.55)", overflow: "hidden",
      minWidth: 280, maxWidth: 340,
    }}>
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>🗑</span>
        <span style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
          {toast.mensaje}
        </span>
        <button onClick={onDeshacer} style={{
          padding: "5px 12px", borderRadius: 7, cursor: "pointer",
          background: "var(--accent-soft)", border: "1px solid var(--accent-border)",
          color: "var(--accent)", fontFamily: "'DM Mono',monospace",
          fontSize: 11, fontWeight: 700, flexShrink: 0, transition: "all 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(212,175,55,0.22)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--accent-soft)"}
        >
          ↩ Deshacer
        </button>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: "var(--text-muted)",
          cursor: "pointer", fontSize: 15, padding: "0 2px", flexShrink: 0,
        }}>×</button>
      </div>
      {/* Barra de progreso countdown */}
      <div style={{ height: 3, background: "var(--bg-subtle)" }}>
        <div style={{
          height: "100%", background: "var(--accent)",
          width: `${pct}%`, transition: "width 0.03s linear",
          borderRadius: "0 0 0 0",
        }} />
      </div>
    </div>
  );
}

const ESTADOS_TRABAJO = [
  { id: "nuevo",      label: "Nuevo",         color: "#7090b0", icon: "🆕" },
  { id: "enviado",    label: "Enviado",        color: "#c8a030", icon: "📤" },
  { id: "aceptado",   label: "Aceptado",       color: "#60a870", icon: "✅" },
  { id: "produccion", label: "En producción",  color: "#c85030", icon: "🪚" },
  { id: "entregado",  label: "Entregado",      color: "#7ecf8a", icon: "📦" },
];

function generarTextoWhatsApp(items, modulos, costos, getModUsado, totalGeneral, nombre, cliente) {
  const fecha = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
  let txt = "🪵 *CARPICÁLC — PRESUPUESTO*\n";
  txt += "━━━━━━━━━━━━━━━━━━━\n";
  if (nombre) txt += `📋 *${nombre}*\n`;
  if (cliente && cliente.nombre) txt += `👤 ${cliente.nombre}\n`;
  if (cliente && cliente.tel)    txt += `📞 ${cliente.tel}\n`;
  if (cliente && cliente.dir)    txt += `📍 ${cliente.dir}\n`;
  txt += `📅 ${fecha}\n\n`;
  txt += "*DETALLE DE MÓDULOS*\n";
  txt += "━━━━━━━━━━━━━━━━━━━\n";
  items.forEach((item) => {
    const modBase = modulos[item.codigo];
    if (!modBase) return;
    const modUsado = getModUsado(item);
    const calc = calcularModulo(modUsado, costos);
    if (!calc) return;
    const dim = modUsado.dimensiones;
    txt += `▸ *${item.codigo}* — ${modBase.nombre}\n`;
    txt += `   ${dim.ancho}×${dim.profundidad}×${dim.alto} mm · x${item.cantidad}\n`;
    if (item.nota && item.nota.trim()) txt += `   📝 _${item.nota}_\n`;
    txt += `   Subtotal: *${fmtPeso(calc.total * item.cantidad)}*\n\n`;
  });
  txt += "━━━━━━━━━━━━━━━━━━━\n";
  txt += `💰 *TOTAL: ${fmtPeso(totalGeneral)}*\n`;
  txt += "_(IVA no incluido)_";
  return txt;
}

const DIMS = ["ancho", "profundidad", "alto"];
const PIEZA_VACIA = {
  nombre: "",
  cantidad: 1,
  usaDim: "alto",
  usaDim2: "ancho",
  offsetEsp: 0,
  offsetMm: 0,
  divisor: 1,
  offsetEsp2: 0,
  offsetMm2: 0,
  divisor2: 1,
  tc: { id: 0, lados1: 0, lados2: 0 },
};

// ── useTema ───────────────────────────────────────────────────────
function useTema() {
  const [tema, setTema] = useState(() => {
    try {
      return localStorage.getItem("carpicalc:tema") || "dark";
    } catch {
      return "dark";
    }
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    try {
      localStorage.setItem("carpicalc:tema", tema);
    } catch {}
  }, [tema]);
  const toggleTema = useCallback(
    () => setTema((t) => (t === "dark" ? "light" : "dark")),
    []
  );
  return { tema, toggleTema };
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  GlobalStyles — incluye @media (max-width: 768px)               ║
// ╚══════════════════════════════════════════════════════════════════╝
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700&family=DM+Mono:wght@300;400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

    /* ── Modo oscuro premium (default) ─────────────────────────── */
    :root,[data-theme="dark"]{
      --bg-base:#0F1115;
      --bg-surface:#1A1D23;
      --bg-subtle:rgba(255,255,255,0.03);
      --bg-overlay:rgba(10,12,16,0.97);
      --border:rgba(255,255,255,0.07);
      --border-strong:rgba(212,175,55,0.18);
      --text-primary:#F0EDE6;
      --text-secondary:#A09880;
      --text-muted:rgba(255,255,255,0.28);
      --text-inverted:#0F1115;
      --accent:#D4AF37;
      --accent-hover:#E8C84A;
      --accent-soft:rgba(212,175,55,0.10);
      --accent-border:rgba(212,175,55,0.28);
      --shadow:0 4px 32px rgba(0,0,0,0.65);
      --shadow-sm:0 1px 8px rgba(0,0,0,0.45);
      --scrollbar-thumb:rgba(212,175,55,0.20);
      --radius-card:12px;
      --separator:rgba(255,255,255,0.05);
      --grain-opacity:0.032;
    }

    /* ── Modo claro ─────────────────────────────────────────────── */
    [data-theme="light"]{
      --bg-base:#F5F2EC;
      --bg-surface:#FFFFFF;
      --bg-subtle:#EDE8DF;
      --bg-overlay:rgba(245,242,236,0.97);
      --border:#E4DDD0;
      --border-strong:rgba(180,140,30,0.30);
      --text-primary:#1C1A16;
      --text-secondary:#6B5E45;
      --text-muted:#A0907A;
      --text-inverted:#FFFFFF;
      --accent:#B8962A;
      --accent-hover:#9A7C1E;
      --accent-soft:rgba(184,150,42,0.10);
      --accent-border:rgba(184,150,42,0.32);
      --shadow:0 2px 20px rgba(0,0,0,0.10);
      --shadow-sm:0 1px 6px rgba(0,0,0,0.07);
      --scrollbar-thumb:rgba(184,150,42,0.28);
      --radius-card:12px;
      --separator:rgba(0,0,0,0.05);
      --grain-opacity:0.018;
    }

    /* ── Grain texture — profundidad sin peso visual ─────────────── */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 9999;
      opacity: var(--grain-opacity);
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      background-repeat: repeat;
      background-size: 128px 128px;
    }

    body{
      background-color:var(--bg-base);
      color:var(--text-primary);
      font-family:'Bricolage Grotesque',system-ui,sans-serif;
      font-weight:400;
      font-optical-sizing:auto;
      transition:background-color 0.3s,color 0.3s;
      -webkit-font-smoothing:antialiased;
      -moz-osx-font-smoothing:grayscale;
    }

    /* ── Animaciones de entrada ──────────────────────────────────── */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.97); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes slideRight {
      from { opacity: 0; transform: translateX(-10px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes counterPulse {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.12); }
      100% { transform: scale(1); }
    }

    /* Animación de entrada al cambiar de pestaña */
    @keyframes tabEnter {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .tab-view {
      animation: tabEnter 0.32s cubic-bezier(0.22,1,0.36,1) both;
    }

    /* Stagger de tarjetas — cada nth-child recibe delay */
    .anim-fadein    { animation: fadeIn  0.35s ease both; }
    .anim-fadeup    { animation: fadeUp  0.40s cubic-bezier(0.22,1,0.36,1) both; }
    .anim-scalein   { animation: scaleIn 0.30s cubic-bezier(0.22,1,0.36,1) both; }
    .anim-slideright{ animation: slideRight 0.32s cubic-bezier(0.22,1,0.36,1) both; }

    /* Delay escalonado para listas */
    .stagger-1  { animation-delay: 0.04s; }
    .stagger-2  { animation-delay: 0.08s; }
    .stagger-3  { animation-delay: 0.12s; }
    .stagger-4  { animation-delay: 0.16s; }
    .stagger-5  { animation-delay: 0.20s; }
    .stagger-6  { animation-delay: 0.24s; }

    /* Hover microlift para cards interactivas */
    .hover-lift {
      transition: transform 0.18s cubic-bezier(0.22,1,0.36,1),
                  box-shadow 0.18s cubic-bezier(0.22,1,0.36,1),
                  border-color 0.18s ease;
    }
    .hover-lift:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(0,0,0,0.38);
    }

    /* Pulse en métricas de caja al actualizar */
    .metric-pulse { animation: counterPulse 0.4s cubic-bezier(0.22,1,0.36,1); }

    /* Scrollbar fina y elegante */
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:var(--scrollbar-thumb);border-radius:4px;}
    ::-webkit-scrollbar-thumb:hover{background:var(--accent-border);}
    input[type="number"]::-webkit-inner-spin-button{opacity:0.3;}

    /* Separadores sutiles entre secciones */
    .section-divider{
      border:none;
      border-top:1px solid var(--separator);
      margin:0;
    }

    /* Hover pronunciado en dark mode */
    .btn-secondary:hover{
      background:rgba(212,175,55,0.18) !important;
      border-color:rgba(212,175,55,0.40) !important;
    }

    /* ── Tipografía mejorada ─────────────────────────────────────── */
    h1,h2,h3 {
      font-family:'Playfair Display',serif;
      letter-spacing:-0.02em;
    }
    code, kbd, .mono {
      font-family:'DM Mono',monospace;
    }
    /* Peso variable para jerarquía */
    .text-display  { font-weight: 700; letter-spacing: -0.03em; }
    .text-label    { font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; font-size: 0.75em; }
    .text-data     { font-family: 'DM Mono', monospace; font-weight: 500; }
    .text-subtle   { font-weight: 300; color: var(--text-muted); }

    @media print{
      .no-print{display:none !important;}.print-only{display:block !important;}
      body{background:#fff !important;color:#1a1a1a !important;font-size:12px;}
      body::before{display:none !important;}
      main{padding:0 !important;max-width:100% !important;}
      .print-table-row{break-inside:avoid;}
      .print-total-block{background:#f5f5f0 !important;border-top:2px solid #a07030 !important;}
      .item-nota-print{font-style:italic;color:#666 !important;font-size:11px;margin-top:2px;}
    }
    .print-only{display:none;}

    /* ── Responsive mobile ─────────────────────────────────────── */
    @media (max-width: 768px) {
      .rsp-main { padding: 14px 10px !important; }
      .rsp-card { padding: 14px !important; }
      .rsp-grid-1 { grid-template-columns: 1fr !important; }
      .rsp-scroll-x {
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch;
      }
      .rsp-lista-item {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 10px !important;
      }
      .rsp-lista-precio {
        width: 100% !important;
        justify-content: space-between !important;
      }
      .rsp-header-inner {
        flex-wrap: wrap !important;
        gap: 0px 10px !important;
        padding: 0 12px !important;
      }
      .rsp-brand { padding: 12px 0 !important; }
      .rsp-brand-text { display: none !important; }
      .rsp-brand > div:first-child { transform: scale(0.9); }
      .rsp-nav {
        order: 3 !important;
        width: 100% !important;
        flex: none !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch;
        border-top: 1px solid var(--border);
        scrollbar-width: none;
      }
      .rsp-nav::-webkit-scrollbar { display: none !important; }
      .rsp-nav button {
        padding: 12px 16px !important;
        font-size: 11px !important;
        flex-shrink: 0;
      }
      .rsp-paso2 { flex-direction: column !important; }
      .rsp-paso2 > *:first-child { flex: none !important; width: 100% !important; }
      .rsp-stack { flex-direction: column !important; align-items: flex-start !important; }
      .rsp-table-inner { min-width: 520px; }
      .rsp-item-actions { flex-direction: row !important; flex-wrap: wrap !important; gap: 4px !important; }

      /* Kanban: scroll horizontal en desktop */
      .kanban-board {
        display: flex;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      /* Kanban mobile: apilado vertical, 100% ancho, sin scroll horizontal */
      .kanban-board-mobile-fix,
      .lista-mobile-row { display: none; }

    }

    @media (max-width: 768px) {
      .kanban-board {
        flex-direction: column !important;
        overflow: visible !important;
        gap: 16px !important;
        padding-bottom: 0 !important;
      }
      .kanban-col {
        flex: none !important;
        width: 100% !important;
        min-width: 0 !important;
      }
      .kanban-col-header {
        justify-content: center !important;
        text-align: center !important;
      }
      /* Lista: colapsar grid a 1 columna, ocultar columnas desktop */
      .lista-fila {
        grid-template-columns: 1fr !important;
        gap: 0 !important;
      }
      .lista-desktop-col { display: none !important; }
      .lista-mobile-row { display: flex !important; }
      .lista-header { display: none !important; }

      /* Filtros de estado: columna vertical en mobile */
      .filtros-estado {
        flex-direction: column !important;
        gap: 6px !important;
      }
      .filtros-estado > button {
        width: 100% !important;
        justify-content: flex-start !important;
      }

      /* Deshabilitar hover-lift en touch */
      .hover-lift:hover {
        transform: none !important;
        box-shadow: none !important;
      }
    }
  `}</style>
);

// ══════════════════════════════════════════════════════════════════
// 6. UI PRIMITIVOS
// ══════════════════════════════════════════════════════════════════
// ── UI Primitives ─────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "'DM Mono',monospace",
          color: "var(--text-muted)",
          display: "block",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
function TextInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  suffix,
  small,
  disabled,
}) {
  return (
    <Field label={label}>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            fontFamily: "'DM Mono',monospace",
            padding: small ? "6px 10px" : "10px 12px",
            fontSize: small ? 13 : 14,
            paddingRight: suffix ? 36 : undefined,
            background: "var(--bg-subtle)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            borderRadius: 6,
            outline: "none",
            transition: "border-color 0.2s",
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : undefined,
          }}
          onFocus={(e) => {
            if (!disabled) e.target.style.borderColor = "var(--accent)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border)";
            onBlur && onBlur(e.target.value);
          }}
        />
        {suffix && (
          <span
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 11,
              fontFamily: "'DM Mono',monospace",
              color: "var(--text-muted)",
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}
function Select({ label, value, onChange, options, small }) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          fontFamily: "'DM Mono',monospace",
          padding: small ? "6px 8px" : "10px 10px",
          fontSize: small ? 13 : 14,
          background: "var(--bg-base)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          borderRadius: 6,
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
function Btn({
  children,
  onClick,
  variant = "primary",
  small,
  full,
  disabled,
}) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Mono',monospace",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    borderRadius: 6,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s",
    opacity: disabled ? 0.5 : 1,
    width: full ? "100%" : undefined,
    padding: small ? "6px 14px" : "10px 20px",
    fontSize: small ? 12 : 13,
  };
  if (variant === "primary")
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          ...base,
          background:
            "linear-gradient(135deg,var(--accent),var(--accent-hover))",
          color: "var(--text-inverted)",
          boxShadow: "0 3px 12px rgba(180,100,20,0.28)",
        }}
      >
        {children}
      </button>
    );
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...base,
        background: "var(--accent-soft)",
        border: "1px solid var(--accent-border)",
        color: "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}
// ▶ Card acepta className para poder agregar rsp-card en móvil
function Card({ children, style, highlight, onClick, className }) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: highlight ? "var(--accent-soft)" : "var(--bg-surface)",
        border: `1px solid ${highlight ? "var(--accent-border)" : "var(--border)"}`,
        borderRadius: 14,
        padding: 20,
        boxShadow: highlight
          ? "0 4px 24px rgba(212,175,55,0.08), var(--shadow-sm)"
          : "0 2px 12px rgba(0,0,0,0.28), var(--shadow-sm)",
        cursor: onClick ? "pointer" : undefined,
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.18s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
function Badge({ children, color }) {
  const c = color || "var(--accent)";
  return (
    <span
      style={{
        background: c + "22",
        border: `1px solid ${c}55`,
        color: c,
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily: "'DM Mono',monospace",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {children}
    </span>
  );
}
function SectionTitle({ children, sub }) {
  return (
    <div className="anim-fadeup" style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: sub ? 8 : 0 }}>
        <div style={{ width: 3, height: 28, borderRadius: 999, background: "linear-gradient(180deg, var(--accent) 0%, var(--accent-border) 100%)", flexShrink: 0 }} />
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.8, lineHeight: 1 }}>
          {children}
        </h2>
      </div>
      {sub && (
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, marginLeft: 15, fontWeight: 300, letterSpacing: "0.01em", lineHeight: 1.5 }}>
          {sub}
        </p>
      )}
    </div>
  );
}
function SaveIndicator({ estado }) {
  const cfg = {
    guardando: {
      color: "var(--text-secondary)",
      icon: "⟳",
      label: "Guardando...",
    },
    guardado: { color: "#7ecf8a", icon: "✓", label: "Guardado" },
    error: { color: "#e07070", icon: "✗", label: "Error" },
  }[estado];
  if (!cfg) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontFamily: "'DM Mono',monospace",
        letterSpacing: "0.05em",
        color: cfg.color,
      }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}
function ToggleSwitch({ value, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 11,
        fontFamily: "'DM Mono',monospace",
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s",
        border: "1px solid",
        background: value ? "var(--accent-soft)" : "transparent",
        borderColor: value ? "var(--accent-border)" : "var(--border)",
        color: value ? "var(--accent)" : "var(--text-muted)",
      }}
    >
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: 28,
          height: 14,
          background: value ? "var(--accent)" : "var(--border)",
          borderRadius: 7,
          flexShrink: 0,
          transition: "background 0.2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
            left: value ? 16 : 2,
          }}
        />
      </span>
      {label}
    </button>
  );
}

// ── HojaCostos primitives (nivel superior) ────────────────────────
const hcBb = {
  padding: "3px 10px",
  borderRadius: 5,
  fontSize: 11,
  fontWeight: 700,
  fontFamily: "'DM Mono',monospace",
  cursor: "pointer",
  transition: "all 0.15s",
  border: "1px solid",
};
const hcLc = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontFamily: "'DM Mono',monospace",
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 4,
};
const hcFV = {
  padding: "10px 12px",
  background: "var(--bg-subtle)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  marginBottom: 5,
  transition: "border-color 0.15s",
};
const hcFE = {
  padding: "12px",
  background: "var(--accent-soft)",
  border: "1px solid var(--accent-border)",
  borderRadius: 8,
  marginBottom: 5,
};
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
function SeccionGastosFijos({ costos, save }) {
  const gf = costos.gastosFijos || { items: [], horasProductivasMes: 160 };

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoMonto, setNuevoMonto] = useState("");

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

  const eliminarItem = (id) =>
    saveGf({ ...gf, items: gf.items.filter((i) => i.id !== id) });

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
                <tr key={item.id} style={{ borderBottom: "1px solid var(--separator)" }}>
                  <td style={{ padding: "9px 12px", color: "var(--text-primary)", fontWeight: 500 }}>
                    {item.nombre}
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>$</span>
                      <input
                        type="number" min="0"
                        defaultValue={item.monto}
                        onBlur={(e) => actualizarMonto(item.id, e.target.value)}
                        style={{ ...inpSm, width: 120, textAlign: "right" }}
                        onFocus={(e) => e.target.style.borderColor = "var(--accent-border)"}
                      />
                    </div>
                  </td>
                  <td style={{ padding: "9px 8px", textAlign: "center" }}>
                    <button
                      onClick={() => eliminarItem(item.id)}
                      title="Eliminar gasto"
                      style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 5, transition: "background 0.12s" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(200,60,60,0.10)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                    >×</button>
                  </td>
                </tr>
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
            defaultValue={gf.horasProductivasMes}
            onBlur={(e) => actualizarHoras(e.target.value)}
            style={{ ...inpSm, width: 80, textAlign: "center", fontWeight: 700 }}
            onFocus={(e) => e.target.style.borderColor = "var(--accent-border)"}
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
    // Bloquear si el factor haría precios negativos
    if (factor <= 0) {
      alert(`⚠ Con ${pct}% los precios quedarían negativos o en cero. Usá un valor mayor a -100%.`);
      return;
    }
    await guardarSnapshotPrecios(costos);
    const updated = {
      ...costos,
      materiales: costos.materiales.map(m => ({ ...m, precioM2: Math.round(m.precioM2 * factor) })),
      herrajes: costos.herrajes.map(h => ({ ...h, precio: Math.round(h.precio * factor) })),
      manoDeObra: costos.manoDeObra.map(m => ({ ...m, precio: Math.round(m.precio * factor) })),
      tapacanto: (costos.tapacanto || []).map(t => ({ ...t, precio: Math.round(t.precio * factor) })),
    };
    save(updated);
    setHistorial(await cargarHistorialPrecios());
    setPctInflacion("");
    setConfirmInflacion(false);
  };

  const restaurarDesdeHistorial = async (snap) => {
    if (!window.confirm(`¿Restaurar precios del ${new Date(snap.fecha).toLocaleDateString("es-AR")}?`)) return;
    const updated = {
      ...costos,
      materiales: costos.materiales.map(m => {
        const h = snap.materiales.find(x => x.nombre === m.nombre);
        return h ? { ...m, precioM2: h.precioM2 } : m;
      }),
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
          Actualiza en un solo clic materiales, herrajes, tapacanto y mano de obra. Se guarda un snapshot antes de aplicar.
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
    </div>
  );
}

// ── FilaPieza ─────────────────────────────────────────────────────
function FilaPieza({ pieza, idx, onDelete, dims, espesor, tapacanto }) {
  const d1 = pieza.especial
    ? (parseInt(pieza.dimLibre1) || 0)
    : resolverDim(dims[pieza.usaDim], pieza.offsetEsp, pieza.offsetMm, pieza.divisor || 1, espesor);
  const d2 = pieza.especial
    ? (parseInt(pieza.dimLibre2) || 0)
    : resolverDim(dims[pieza.usaDim2], pieza.offsetEsp2, pieza.offsetMm2, pieza.divisor2 || 1, espesor);
  const area = (d1 * d2 * pieza.cantidad) / 1_000_000;
  const tcDef = tapacanto?.find((t) => t.id === pieza.tc?.id);
  const mTc = pieza.tc?.id
    ? (pieza.cantidad *
        ((pieza.tc.lados1 || 0) * d1 + (pieza.tc.lados2 || 0) * d2)) /
      1000
    : 0;
  const offsetLabel = (esp, mm, div) => {
    const p = [];
    if (esp) p.push(`${esp > 0 ? "+" : ""}${esp} esp.`);
    if (mm) p.push(`${mm > 0 ? "+" : ""}${mm} mm`);
    if (div && div > 1) p.push(`÷${div}`);
    return p.length ? `(${p.join(", ")})` : "";
  };
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "var(--accent-soft)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        marginBottom: 6,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 36px 130px 90px 90px 24px",
          gap: 8,
          alignItems: "center",
        }}
      >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
              {pieza.nombre}
              {pieza.especial && (
                <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(212,175,55,0.18)", color: "var(--accent)", border: "1px solid var(--accent-border)", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>✦ ESP</span>
              )}
            </div>
            <div style={{ fontSize: 11, marginTop: 2, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {pieza.especial
                ? `libre: ${pieza.dimLibre1 || 0} × ${pieza.dimLibre2 || 0} mm`
                : `${pieza.usaDim} ${offsetLabel(pieza.offsetEsp, pieza.offsetMm, pieza.divisor || 1)} × ${pieza.usaDim2} ${offsetLabel(pieza.offsetEsp2, pieza.offsetMm2, pieza.divisor2 || 1)}`}
            </div>
          </div>
        <div
          style={{
            textAlign: "center",
            fontFamily: "'DM Mono',monospace",
            fontSize: 13,
            color: "var(--accent)",
          }}
        >
          ×{pieza.cantidad}
        </div>
        <div style={{ textAlign: "right", minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            medidas reales
          </div>
          <div
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 12,
              color: "#c8d098",
              whiteSpace: "nowrap",
            }}
          >
            {Math.round(d1)}×{Math.round(d2)} mm
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            área
          </div>
          <div
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 12,
              color: "#7ecf8a",
              whiteSpace: "nowrap",
            }}
          >
            {fmtNum(area)} m²
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {tcDef ? (
            <>
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                }}
              >
                tapacanto
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 12,
                  color: "var(--accent)",
                }}
              >
                {fmtNum(mTc, 2)} m
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              sin tapac.
            </div>
          )}
        </div>
        <button
          onClick={() => onDelete(idx)}
          style={{
            background: "none",
            border: "none",
            color: "#e07070",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            opacity: 0.6,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.target.style.opacity = 1)}
          onMouseLeave={(e) => (e.target.style.opacity = 0.6)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ── FormPieza ─────────────────────────────────────────────────────
// ── DimRow ── (fuera de FormPieza para evitar re-mount en cada render)
function DimRow({ titulo, dimKey, espKey, mmKey, divKey, resultado, fp, setFp, espesor }) {
  const divVal = parseInt(fp[divKey]) || 1;
  return (
    <div style={{ background: "rgba(0,0,0,0.18)", borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>
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
        <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#7ecf8a" }}>
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
      <div style={{ fontSize: 11, marginTop: 6, fontFamily: "'DM Mono',monospace", color: "#7ecf8a" }}>
        → {parseInt(fp[valKey]) || 0} mm
      </div>
    </div>
  );
}

function FormPieza({ fp, setFp, onAgregar, error, dims, espesor, tapacanto }) {
  const esEspecial = !!fp.especial;
  const d1 = esEspecial
    ? (parseInt(fp.dimLibre1) || 0)
    : resolverDim(dims[fp.usaDim], parseInt(fp.offsetEsp) || 0, parseInt(fp.offsetMm) || 0, parseInt(fp.divisor) || 1, espesor);
  const d2 = esEspecial
    ? (parseInt(fp.dimLibre2) || 0)
    : resolverDim(dims[fp.usaDim2], parseInt(fp.offsetEsp2) || 0, parseInt(fp.offsetMm2) || 0, parseInt(fp.divisor2) || 1, espesor);

  return (
    <Card className="rsp-card" highlight>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)" }}>
          ➕ Agregar pieza
        </h4>
        {/* Toggle pieza especial */}
        <button
          onClick={() => setFp(p => ({ ...p, especial: !p.especial, dimLibre1: p.dimLibre1 || 0, dimLibre2: p.dimLibre2 || 0 }))}
          title="Pieza especial: medidas libres sin fórmula"
          style={{
            display: "flex", alignItems: "center", gap: 5, padding: "3px 10px",
            borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
            fontFamily: "'DM Mono',monospace", transition: "all 0.15s",
            background: esEspecial ? "rgba(212,175,55,0.18)" : "transparent",
            border: `1px solid ${esEspecial ? "var(--accent-border)" : "var(--border)"}`,
            color: esEspecial ? "var(--accent)" : "var(--text-muted)",
          }}>
          ✦ {esEspecial ? "Especial activa" : "Pieza especial"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
          <TextInput label="Nombre" placeholder="Lateral, Base, Puerta..." value={fp.nombre}
            onChange={(v) => setFp((p) => ({ ...p, nombre: v }))} small />
          <TextInput label="Cantidad" type="number" value={fp.cantidad}
            onChange={(v) => setFp((p) => ({ ...p, cantidad: v }))} small />
        </div>

        {esEspecial ? (
          <>
            <div style={{ fontSize: 11, padding: "6px 10px", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.20)", borderRadius: 6, color: "var(--accent)" }}>
              ✦ Medidas libres — no dependen de las dimensiones del módulo
            </div>
            <DimRowLibre titulo="Dim 1 (altura)" valKey="dimLibre1" fp={fp} setFp={setFp} />
            <DimRowLibre titulo="Dim 2 (ancho)" valKey="dimLibre2" fp={fp} setFp={setFp} />
          </>
        ) : (
          <>
            <DimRow titulo="Dim 1 (altura)" dimKey="usaDim" espKey="offsetEsp" mmKey="offsetMm" divKey="divisor"
              resultado={d1} fp={fp} setFp={setFp} espesor={espesor} />
            <DimRow titulo="Dim 2 (ancho)" dimKey="usaDim2" espKey="offsetEsp2" mmKey="offsetMm2" divKey="divisor2"
              resultado={d2} fp={fp} setFp={setFp} espesor={espesor} />
          </>
        )}

        <div style={{ background: "rgba(0,0,0,0.18)", borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>
            🎗 Tapacanto
          </div>
          <div style={{ marginBottom: 8 }}>
            <Select label="Tipo de cinta" value={fp.tc.id} small
              onChange={(v) => setFp((p) => ({ ...p, tc: { ...p.tc, id: parseInt(v) } }))}
              options={[{ value: 0, label: "Sin tapacanto" }, ...(tapacanto || []).map((t) => ({ value: t.id, label: t.nombre }))]} />
          </div>
          <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <TextInput label={`Lados D1 (${esEspecial ? "libre" : fp.usaDim})`} type="number" value={fp.tc.lados1} small
              onChange={(v) => setFp((p) => ({ ...p, tc: { ...p.tc, lados1: parseInt(v) || 0 } }))} />
            <TextInput label={`Lados D2 (${esEspecial ? "libre" : fp.usaDim2})`} type="number" value={fp.tc.lados2} small
              onChange={(v) => setFp((p) => ({ ...p, tc: { ...p.tc, lados2: parseInt(v) || 0 } }))} />
          </div>
          {fp.tc.id > 0 && (
            <div style={{ fontSize: 11, marginTop: 6, fontFamily: "'DM Mono',monospace", color: "var(--accent)" }}>
              → {fmtNum((parseInt(fp.cantidad || 1) * ((fp.tc.lados1 || 0) * d1 + (fp.tc.lados2 || 0) * d2)) / 1000, 2)} m lineales
            </div>
          )}
        </div>

        {error && <p style={{ color: "#e07070", fontSize: 12 }}>⚠ {error}</p>}
        <Btn onClick={onAgregar} full>+ Agregar esta pieza</Btn>
      </div>
    </Card>
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
    <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
      {steps.map(([n, label], i) => {
        const done = paso > i + 1;
        const active = paso === i + 1;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  transition: "all 0.2s",
                  background: active
                    ? "var(--accent)"
                    : done
                    ? "rgba(126,207,138,0.2)"
                    : "var(--bg-subtle)",
                  border: `2px solid ${
                    active
                      ? "var(--accent)"
                      : done
                      ? "#7ecf8a"
                      : "var(--border)"
                  }`,
                  color: active
                    ? "#fff"
                    : done
                    ? "#7ecf8a"
                    : "var(--text-muted)",
                }}
              >
                {done ? "✓" : n}
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: active
                    ? "var(--accent)"
                    : done
                    ? "#7ecf8a"
                    : "var(--text-muted)",
                  fontWeight: active ? 700 : 400,
                }}
              >
                {label}
              </span>
            </div>
            {i < 2 && (
              <div
                style={{
                  width: 28,
                  height: 1,
                  background: "var(--border)",
                  margin: "0 10px",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
function FormModulo({
  costos,
  onGuardar,
  onCancelar,
  moduloBase,
  codigoEditar,
}) {
  const esEdicion = !!codigoEditar;
  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState(() =>
    moduloBase
      ? {
          codigo: codigoEditar || "",
          nombre: moduloBase.nombre,
          descripcion: moduloBase.descripcion || "",
          dimensiones: { ...moduloBase.dimensiones },
          material: moduloBase.material,
          categoria: moduloBase.categoria || "otros",
        }
      : {
          codigo: "",
          nombre: "",
          descripcion: "",
          dimensiones: { ancho: 600, profundidad: 550, alto: 700 },
          material: "melamina",
          categoria: "otros",
        }
  );
  const [piezas, setPiezas] = useState(
    moduloBase
      ? moduloBase.piezas.map((p) => ({
          ...p,
          divisor: p.divisor || 1,
          divisor2: p.divisor2 || 1,
          tc: p.tc ? { ...p.tc } : { id: 0, lados1: 0, lados2: 0 },
        }))
      : []
  );
  const [herrajes, setHerrajes] = useState(
    moduloBase ? moduloBase.herrajes.map((h) => ({ ...h })) : []
  );
  const [moDeObra, setMoDeObra] = useState(
    moduloBase ? { ...moduloBase.moDeObra } : { tipo: "por_modulo", horas: 0 }
  );
  const [error, setError] = useState("");
  const [fp, setFp] = useState({ ...PIEZA_VACIA });
  const [fpError, setFpError] = useState("");
  const matDef =
    costos.materiales.find((m) => m.tipo === datos.material) ||
    costos.materiales[0];
  const espesor = matDef?.espesor || 18;
  const agregarPieza = () => {
    if (!fp.nombre.trim()) {
      setFpError("Ingresá el nombre.");
      return;
    }
    setPiezas((prev) => [
      ...prev,
      {
        ...fp,
        cantidad: parseInt(fp.cantidad) || 1,
        offsetEsp: parseInt(fp.offsetEsp) || 0,
        offsetMm: parseInt(fp.offsetMm) || 0,
        divisor: Math.max(1, parseInt(fp.divisor) || 1),
        offsetEsp2: parseInt(fp.offsetEsp2) || 0,
        offsetMm2: parseInt(fp.offsetMm2) || 0,
        divisor2: Math.max(1, parseInt(fp.divisor2) || 1),
        tc: {
          id: parseInt(fp.tc.id) || 0,
          lados1: parseInt(fp.tc.lados1) || 0,
          lados2: parseInt(fp.tc.lados2) || 0,
        },
      },
    ]);
    setFp({ ...PIEZA_VACIA });
    setFpError("");
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
  const guardar = () =>
    onGuardar(datos.codigo.trim().toUpperCase(), {
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      dimensiones: datos.dimensiones,
      material: datos.material,
      categoria: datos.categoria || "otros",
      piezas,
      herrajes,
      moDeObra,
    });
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
            color: "#e08080",
          }}
        >
          ⚠ {error}
        </div>
      )}

      {paso === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            className="rsp-grid-1"
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr",
              gap: 12,
            }}
          >
            <TextInput
              label="Código"
              placeholder="MC003"
              value={datos.codigo}
              onChange={(v) =>
                setDatos((d) => ({ ...d, codigo: v.toUpperCase() }))
              }
              disabled={esEdicion}
            />
            <TextInput
              label="Nombre"
              placeholder="Módulo bajo mesada 80cm"
              value={datos.nombre}
              onChange={(v) => setDatos((d) => ({ ...d, nombre: v }))}
            />
          </div>
          <TextInput
            label="Descripción (opcional)"
            value={datos.descripcion}
            onChange={(v) => setDatos((d) => ({ ...d, descripcion: v }))}
          />
          <div
            className="rsp-grid-1"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 12,
            }}
          >
            <TextInput
              label="Ancho (mm)"
              type="number"
              suffix="mm"
              value={datos.dimensiones.ancho}
              onChange={(v) =>
                setDatos((d) => ({
                  ...d,
                  dimensiones: { ...d.dimensiones, ancho: parseInt(v) || 0 },
                }))
              }
            />
            <TextInput
              label="Profund. (mm)"
              type="number"
              suffix="mm"
              value={datos.dimensiones.profundidad}
              onChange={(v) =>
                setDatos((d) => ({
                  ...d,
                  dimensiones: {
                    ...d.dimensiones,
                    profundidad: parseInt(v) || 0,
                  },
                }))
              }
            />
            <TextInput
              label="Alto (mm)"
              type="number"
              suffix="mm"
              value={datos.dimensiones.alto}
              onChange={(v) =>
                setDatos((d) => ({
                  ...d,
                  dimensiones: { ...d.dimensiones, alto: parseInt(v) || 0 },
                }))
              }
            />
            <Select
              label="Material"
              value={datos.material}
              onChange={(v) => setDatos((d) => ({ ...d, material: v }))}
              options={costos.materiales.map((m) => ({
                value: m.tipo,
                label: `${m.nombre} (${m.espesor}mm)`,
              }))}
            />
          </div>
          {matDef && (
            <div
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12,
                background: "var(--accent-soft)",
                border: "1px solid var(--accent-border)",
                color: "var(--accent)",
              }}
            >
              Material: <strong>{matDef.nombre}</strong> — espesor{" "}
              <strong>{matDef.espesor}mm</strong>
              {!esEdicion && moduloBase && (
                <span style={{ marginLeft: 12, opacity: 0.7 }}>
                  📋 Copia — editá el código antes de guardar.
                </span>
              )}
            </div>
          )}

          {/* Selector de categoría */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>
              Categoría
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CATEGORIAS_DEFAULT.map(cat => {
                const activa = datos.categoria === cat.id;
                return (
                  <button key={cat.id} onClick={() => setDatos(d => ({ ...d, categoria: cat.id }))}
                    style={{
                      padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                      fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
                      transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5,
                      background: activa ? `${cat.color}25` : "transparent",
                      border: `1px solid ${activa ? cat.color : "var(--border)"}`,
                      color: activa ? cat.color : "var(--text-muted)",
                      boxShadow: activa ? `0 0 10px ${cat.color}30` : "none",
                    }}>
                    {cat.icon} {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Btn variant="ghost" onClick={onCancelar}>Cancelar</Btn>
            {esEdicion && (
              <Btn variant="ghost" onClick={guardar} style={{ borderColor: "var(--accent-border)", color: "var(--accent)" }}>
                💾 Guardar y cerrar
              </Btn>
            )}
            <Btn onClick={siguiente}>Siguiente → Piezas</Btn>
          </div>
        </div>
      )}

      {paso === 2 && (
        // rsp-paso2: apila verticalmente en móvil
        <div className="rsp-paso2" style={{ display: "flex", gap: 20 }}>
          <div
            style={{
              flex: "0 0 340px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <FormPieza
              fp={fp}
              setFp={setFp}
              onAgregar={agregarPieza}
              error={fpError}
              dims={datos.dimensiones}
              espesor={espesor}
              tapacanto={costos.tapacanto}
            />
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h4
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                }}
              >
                Piezas{" "}
                <span style={{ color: "var(--accent)" }}>
                  ({piezas.length})
                </span>
              </h4>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Espesor:{" "}
                <span style={{ color: "var(--accent)" }}>{espesor}mm</span>
              </span>
            </div>
            {piezas.length === 0 ? (
              <div
                style={{
                  padding: "24px 0",
                  textAlign: "center",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px dashed var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                Sin piezas todavía.
              </div>
            ) : (
              piezas.map((p, i) => (
                <FilaPieza
                  key={i}
                  pieza={p}
                  idx={i}
                  dims={datos.dimensiones}
                  espesor={espesor}
                  tapacanto={costos.tapacanto}
                  onDelete={(i) =>
                    setPiezas((prev) => prev.filter((_, j) => j !== i))
                  }
                />
              ))
            )}
            {preview && (
              <Card style={{ borderColor: "rgba(126,207,138,0.15)" }}>
                <div
                  className="rsp-grid-1"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr",
                    gap: 10,
                  }}
                >
                  {[
                    ["m² neto", `${fmtNum(preview.m2Neto)} m²`],
                    ["m² c/desp.", `${fmtNum(preview.m2Total)} m²`],
                    [
                      `Desp.(${preview.pctDesp}%)`,
                      `${fmtNum(preview.m2Total - preview.m2Neto)} m²`,
                    ],
                    ["Tapacanto", `${fmtNum(preview.metrosTapacanto, 2)} m`],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        textAlign: "center",
                        background: "rgba(0,0,0,0.2)",
                        borderRadius: 8,
                        padding: "8px 4px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "#5a7040",
                        }}
                      >
                        {k}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontFamily: "'DM Mono',monospace",
                          fontWeight: 700,
                          marginTop: 2,
                          color: "#7ecf8a",
                        }}
                      >
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <Btn
                variant="ghost"
                onClick={() => { setPaso(1); setError(""); }}
              >
                ← Volver
              </Btn>
              {esEdicion && (
                <Btn variant="ghost" onClick={guardar} style={{ borderColor: "var(--accent-border)", color: "var(--accent)" }}>
                  💾 Guardar y cerrar
                </Btn>
              )}
              <Btn onClick={siguiente} disabled={piezas.length === 0}>
                Siguiente → Herrajes
              </Btn>
            </div>
          </div>
        </div>
      )}

      {paso === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            className="rsp-grid-1"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
          >
            <Card className="rsp-card">
              <h4
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 700,
                  color: "var(--accent)",
                  marginBottom: 14,
                }}
              >
                🔩 Herrajes
              </h4>
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
                      borderBottom: "1px solid var(--border)",
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
                            justifyContent: "center",
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
                            cant > 0 ? "var(--accent)" : "var(--text-muted)",
                        }}
                      >
                        {cant}
                      </span>
                    </div>
                  </div>
                );
              })}
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Card className="rsp-card">
                <h4
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: 700,
                    color: "var(--accent)",
                    marginBottom: 14,
                  }}
                >
                  🔨 Mano de obra
                </h4>
                <Select
                  label="Tipo"
                  value={moDeObra.tipo}
                  onChange={(v) => setMoDeObra((m) => ({ ...m, tipo: v }))}
                  options={costos.manoDeObra.map((m) => ({
                    value: m.tipo,
                    label: `${m.nombre} — ${fmtPeso(m.precio)}`,
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
                          horas: parseFloat(v) || 0,
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
                          display: "flex", justifyContent: "space-between", alignItems: "center",
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
              </Card>
              {(() => {
                const c = calcularModulo(
                  { ...datos, piezas, herrajes, moDeObra },
                  costos
                );
                if (!c) return null;
                return (
                  <Card
                    className="rsp-card"
                    style={{
                      borderColor: "rgba(126,207,138,0.20)",
                      background: "rgba(126,207,138,0.03)",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#7ecf8a",
                        marginBottom: 12,
                      }}
                    >
                      Resumen
                    </h4>
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
                          fontSize: 13,
                        }}
                      >
                        <span
                          style={{
                            color: k.startsWith("──")
                              ? "var(--text-primary)"
                              : "var(--text-muted)",
                            fontWeight: k.startsWith("──") ? 700 : 400,
                          }}
                        >
                          {k}
                        </span>
                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              fontFamily: "'DM Mono',monospace",
                              color: "#c8c098",
                            }}
                          >
                            {fmtPeso(v)}
                          </span>
                          {note && (
                            <span
                              style={{
                                fontSize: 10,
                                marginLeft: 6,
                                color: "var(--text-muted)",
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
                        paddingTop: 10,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        Precio de venta
                      </span>
                      <span
                        style={{
                          fontFamily: "'DM Mono',monospace",
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#7ecf8a",
                        }}
                      >
                        {fmtPeso(c.total)}
                      </span>
                    </div>
                  </Card>
                );
              })()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn
              variant="ghost"
              onClick={() => {
                setPaso(2);
                setError("");
              }}
            >
              ← Volver
            </Btn>
            <Btn onClick={guardar}>
              {esEdicion ? "✓ Guardar cambios" : "✓ Guardar módulo"}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 8. CATÁLOGO
// ══════════════════════════════════════════════════════════════════
// ── CatalogoModulos ───────────────────────────────────────────────
function AccionesModulo({ onEditar, onEliminar, onDuplicar }) {
  const [confirmar, setConfirmar] = useState(false);
  const s = (type) => ({
    padding: "5px 12px", borderRadius: 6, fontSize: 11,
    fontWeight: 700, fontFamily: "'DM Mono',monospace",
    cursor: "pointer", transition: "all 0.15s", width: "100%",
    background:
      type === "edit" ? "var(--accent-soft)" :
      type === "dup"  ? "rgba(112,144,176,0.12)" : "transparent",
    border:
      type === "edit" ? "1px solid var(--accent-border)" :
      type === "dup"  ? "1px solid rgba(112,144,176,0.30)" :
                        "1px solid rgba(200,60,60,0.22)",
    color:
      type === "edit" ? "var(--accent)" :
      type === "dup"  ? "#7090b0" : "#e07070",
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 90 }}>
      <button onClick={onEditar} style={s("edit")}>✏ editar</button>
      <button onClick={onDuplicar} style={s("dup")}>⧉ duplicar</button>
      {confirmar ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button onClick={() => { onEliminar(); setConfirmar(false); }}
            style={{ ...s("del"), background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", fontWeight: 900 }}>
            ✓ confirmar
          </button>
          <button onClick={() => setConfirmar(false)}
            style={{ ...s("del"), color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            cancelar
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirmar(true)} style={s("del")}>× borrar</button>
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
        padding: "4px 8px",
        borderRadius: 6,
        fontSize: 14,
        cursor: "pointer",
        transition: "all 0.15s",
        background: vista === id ? "var(--accent-soft)" : "transparent",
        border: `1px solid ${
          vista === id ? "var(--accent-border)" : "var(--border)"
        }`,
        color: vista === id ? "var(--accent)" : "var(--text-muted)",
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
function comprimirImagen(file, maxW = 400, maxH = 280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
            transition: "border-color 0.15s",
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
                backdropFilter: "blur(4px)", transition: "background 0.15s",
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
              transition: "background 0.15s",
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
        animation: "fadeIn 0.2s ease",
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

function TarjetaModuloGrid({ cod, mod, c, onEditar, onEliminar, onDuplicar, onImagenChange }) {
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
                <div style={{ fontFamily: "'DM Mono',monospace", color: "#9ab080" }}>{fmtNum(c.m2Neto)} m²</div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Tapacanto</div>
                <div style={{ fontFamily: "'DM Mono',monospace", color: "var(--accent)" }}>{fmtNum(c.metrosTapacanto, 2)} m</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Precio de venta</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 17, fontWeight: 700, marginTop: 2, color: "#7ecf8a" }}>{fmtPeso(c.total)}</div>
            </div>
          </div>
          {/* Botones — columna derecha */}
          <AccionesModulo onEditar={onEditar} onEliminar={onEliminar} onDuplicar={onDuplicar} />
        </div>
      </div>
    </Card>
  );
}

function FilaModuloLista({ cod, mod, c, onEditar, onEliminar, onDuplicar, onImagenChange }) {
  return (
    <div
      className="rsp-lista-item"
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border)", transition: "border-color 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
    >
      <ImagenModulo imagen={mod.imagen} cod={cod} compact
        onSubir={(b64) => onImagenChange(cod, b64)}
        onBorrar={() => onImagenChange(cod, null)}
      />
      <div style={{ flex: 2, minWidth: 0 }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)", marginRight: 8 }}>{cod}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{mod.nombre}</span>
        {mod.descripcion && (
          <p style={{ fontSize: 11, marginTop: 2, color: "var(--text-muted)", fontStyle: "italic" }}>{mod.descripcion}</p>
        )}
      </div>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
        {mod.dimensiones.ancho}×{mod.dimensiones.profundidad}×{mod.dimensiones.alto} mm
      </span>
      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        <Badge>{TIPO_MAT[mod.material]}</Badge>
        <Badge color="#705090">{c.espesor}mm</Badge>
      </div>
      <div className="rsp-lista-precio" style={{ display: "flex", gap: 16, flexShrink: 0, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
        <span style={{ color: "#9ab080" }}>{fmtNum(c.m2Neto)} m²</span>
        <span style={{ color: "#7ecf8a", fontWeight: 700 }}>{fmtPeso(c.total)}</span>
      </div>
      <AccionesModulo onEditar={onEditar} onEliminar={onEliminar} onDuplicar={onDuplicar} />
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
}) {
  const [modo, setModo] = useState(null);
  const [msg, setMsg] = useState(null);
  const [vistaLayout, setVista] = useState("grid");
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
    const existente = modulos[codigo];
    const datosConImagen = existente?.imagen && !datos.imagen
      ? { ...datos, imagen: existente.imagen }
      : datos;
    const nuevo = { ...modulos, [codigo]: datosConImagen };
    setModulos(nuevo);
    onSave(nuevo);
    setModo(null);
    showMsg(
      modo?.tipo === "editar"
        ? `"${codigo}" actualizado.`
        : modo?.tipo === "duplicar"
        ? `"${codigo}" duplicado.`
        : `"${codigo}" guardado.`
    );
  };

  const handleImagenChange = (cod, base64) => {
    const nuevo = {
      ...modulos,
      [cod]: { ...modulos[cod], imagen: base64 || undefined },
    };
    setModulos(nuevo);
    onSave(nuevo);
  };

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
      perfil: perfil || {},
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carpicalc-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
          gap: 16,
        }}
      >
        <SectionTitle sub="Definí tus módulos con piezas reales, espesores automáticos y tapacanto">
          Catálogo de Módulos
        </SectionTitle>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
            flexShrink: 0,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {/* Buscador + toggle de vista agrupados */}
          {!modo && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-muted)", pointerEvents: "none" }}>🔍</span>
                <input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar módulo..."
                  style={{
                    paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                    fontFamily: "'DM Mono',monospace", fontSize: 12,
                    background: "var(--bg-surface)", border: "1px solid var(--border)",
                    color: "var(--text-primary)", borderRadius: 7, outline: "none",
                    width: 160, transition: "border-color 0.15s, width 0.2s",
                  }}
                  onFocus={e => { e.target.style.borderColor = "var(--accent-border)"; e.target.style.width = "200px"; }}
                  onBlur={e => { e.target.style.borderColor = "var(--border)"; if (!busqueda) e.target.style.width = "160px"; }}
                />
                {busqueda && (
                  <button onClick={() => setBusqueda("")}
                    style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}>
                    ×
                  </button>
                )}
              </div>
              {/* Separador */}
              <div style={{ width: 1, height: 22, background: "var(--border)", margin: "0 2px" }} />
              <VistaToggle vista={vistaLayout} onChange={setVista} />
            </div>
          )}
          {/* BOTONES DE BACKUP (Estilo idéntico a Nuevo Módulo) */}
          {!modo && (
            <>
              <button
                onClick={handleExport}
                title="Descargar Backup a la PC"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  padding: "8px 16px",
                  fontSize: 20,
                  fontWeight: "bold",
                  background:
                    "var(--accent)" /* Mismo naranja que el botón principal */,
                  color: "#ffffff" /* Flecha en color blanco puro */,
                }}
              >
                ↓
              </button>
              <label
                title="Cargar Backup desde la PC"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  padding: "8px 16px",
                  fontSize: 20,
                  fontWeight: "bold",
                  background:
                    "var(--accent)" /* Mismo naranja que el botón principal */,
                  color: "#ffffff" /* Flecha en color blanco puro */,
                  margin: 0,
                }}
              >
                ↑
                <input
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={handleImport}
                />
              </label>
            </>
          )}

          {!modo && (
            <Btn onClick={() => abrirModo({ tipo: "nuevo" })}>+ Nuevo módulo</Btn>
          )}
        </div>
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
            color: msg.tipo === "warn" ? "#d4a040" : "#7ecf8a",
          }}
        >
          {msg.tipo === "warn" ? "⚠" : "✓"} {msg.texto}
        </div>
      )}

      {modo && (
        <div ref={formRef}>
        <Card className="rsp-card" highlight style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <h3
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--accent)",
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
          />
        </Card>
        </div>
      )}

      {/* Grid / List view agrupado por categorías */}
      {(() => {
        const filtrados = Object.entries(modulos).filter(([cod, mod]) =>
          !busqueda || cod.toLowerCase().includes(busqueda.toLowerCase()) || mod.nombre.toLowerCase().includes(busqueda.toLowerCase())
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
                cursor: "pointer", transition: "all 0.18s",
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
                        onImagenChange={handleImagenChange} />;
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
                        onImagenChange={handleImagenChange} />;
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

  // Agrupar módulos por categoría
  const grupos = {};
  Object.entries(modulos).forEach(([cod, mod]) => {
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
            transition: "border-color 0.15s",
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
                    border: "none", cursor: "pointer", transition: "background 0.15s",
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
                          transition: "all 0.13s", display: "flex", alignItems: "center", gap: 5,
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
// 9. PRESUPUESTO
// ══════════════════════════════════════════════════════════════════
// ── GestorPresupuestos ────────────────────────────────────────────
function GestorPresupuestos({
  presupuestos,
  onCargar,
  onNuevo,
  onEliminar,
  onCambiarEstado,
  totalActual,
  itemsActual,
  nombreInicial = "",
  clienteInicial = { nombre: "", tel: "", dir: "" },
  onVer,
  itemsActivos = [],
  costosVersion = 0,
  onActualizarPresupuesto,
  modulos,
  costos,
}) {
  const [abierto, setAbierto] = useState(false);
  const [confirmDelId, setConfirmDelId] = useState(null);
  const [busquedaPres, setBusquedaPres] = useState("");
  const [avisoVerId, setAvisoVerId] = useState(null); // aviso de cambios sin guardar

  const totalEntries = Object.keys(presupuestos).length;
  const entries = Object.entries(presupuestos)
    .sort((a, b) => b[0] - a[0])
    .filter(([, p]) => {
      if (!busquedaPres.trim()) return true;
      const q = busquedaPres.toLowerCase();
      return p.nombre?.toLowerCase().includes(q) || p.cliente?.nombre?.toLowerCase().includes(q);
    });

  return (
    <div>
      {/* Cabecera colapsable */}
      <button onClick={() => setAbierto(a => !a)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderRadius: abierto ? "10px 10px 0 0" : 10, cursor: "pointer",
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        fontFamily: "'DM Mono',monospace", transition: "all 0.15s",
        borderBottom: abierto ? "none" : "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14 }}>🗄</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
            Mis presupuestos
          </span>
          {totalEntries > 0 && (
            <span style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 999, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>
              {totalEntries}
            </span>
          )}
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderTop: "1px solid var(--separator)", borderRadius: "0 0 10px 10px", overflow: "visible" }}>

          {/* Buscador — solo con más de 3 */}
          {totalEntries > 3 && (
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--separator)" }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-muted)", pointerEvents: "none" }}>🔍</span>
                <input value={busquedaPres} onChange={e => setBusquedaPres(e.target.value)}
                  placeholder="Buscar por nombre o cliente..."
                  style={{ width: "100%", paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 12, background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 6, outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
            </div>
          )}

          {/* Lista de presupuestos */}
          {entries.length === 0 ? (
            <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              {busquedaPres ? `Sin resultados para "${busquedaPres}"` : "No hay presupuestos guardados todavía"}
            </div>
          ) : (
            entries.map(([id, p]) => {
              const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
              return (
                <div key={id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                  borderBottom: "1px solid var(--separator)", transition: "background 0.12s",
                  flexWrap: "wrap",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-subtle)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, background: `${est.color}20`, color: est.color, border: `1px solid ${est.color}30`, borderRadius: 3, padding: "1px 5px", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
                        {est.icon} {est.label}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, fontFamily: "'DM Mono',monospace" }}>
                      {fmtFecha(parseInt(id))} · {p.items?.length || 0} mód.
                      {p.cliente?.nombre && <span> · 👤 {p.cliente.nombre}</span>}
                      <span style={{ color: "#7ecf8a", fontWeight: 700, marginLeft: 8 }}>{fmtPeso(p.total)}</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center", flexWrap: "wrap" }}>

                    {/* Aviso cambios sin guardar al ir a Ver */}
                    {avisoVerId === id && (
                      <div style={{ position: "absolute", right: 14, top: "100%", zIndex: 100, background: "var(--bg-surface)", border: "1px solid rgba(200,160,42,0.40)", borderRadius: 8, padding: "10px 14px", boxShadow: "0 6px 20px rgba(0,0,0,0.40)", minWidth: 240 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#c8a02a", marginBottom: 6 }}>⚠ Tenés un presupuesto activo sin guardar</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>¿Querés ir a Vista Previa de todas formas?</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { onVer(id); setAbierto(false); setAvisoVerId(null); }}
                            style={{ padding: "5px 12px", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a", borderRadius: 5 }}>
                            Ir a Vista Previa
                          </button>
                          <button onClick={() => setAvisoVerId(null)}
                            style={{ padding: "5px 10px", fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 5 }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    <button onClick={() => { onCargar(p, id); setAbierto(false); }}
                      style={{ padding: "4px 10px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                      ✎ Editar
                    </button>
                    {/* Botón Actualizar precio — se habilita cuando los costos cambiaron después de crear el presupuesto */}
                    {onActualizarPresupuesto && modulos && costos && (() => {
                      const necesita = presupuestoNecesitaActualizacion(id, costosVersion, p);
                      return (
                        <button
                          disabled={!necesita}
                          onClick={() => {
                            const nuevoTotal = recalcularTotalPresupuesto(p, modulos, costos);
                            if (nuevoTotal !== null) onActualizarPresupuesto(id, { total: Math.round(nuevoTotal), costosVersionAl: Date.now() });
                          }}
                          title={necesita ? "Los costos cambiaron desde que se creó este presupuesto" : "Los precios están actualizados"}
                          style={{
                            padding: "4px 10px", borderRadius: 5, cursor: necesita ? "pointer" : "not-allowed",
                            fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                            background: necesita ? "rgba(200,160,42,0.15)" : "transparent",
                            border: `1px solid ${necesita ? "rgba(200,160,42,0.40)" : "var(--border)"}`,
                            color: necesita ? "#c8a02a" : "var(--text-muted)",
                            opacity: necesita ? 1 : 0.45, transition: "all 0.2s",
                          }}>
                          ↻ Actualizar
                        </button>
                      );
                    })()}
                    {onVer && (
                      <button onClick={() => itemsActivos.length > 0 ? setAvisoVerId(id) : (onVer(id), setAbierto(false))}
                        style={{ padding: "4px 10px", background: "rgba(112,144,176,0.12)", border: "1px solid rgba(112,144,176,0.30)", color: "#7090b0", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                        👁 Ver
                      </button>
                    )}
                    {confirmDelId === id ? (
                      <>
                        <button onClick={() => { onEliminar(id); setConfirmDelId(null); }}
                          style={{ padding: "4px 10px", background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                          ✓ Confirmar
                        </button>
                        <button onClick={() => setConfirmDelId(null)}
                          style={{ padding: "4px 8px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDelId(id)}
                        style={{ padding: "4px 8px", background: "transparent", border: "1px solid rgba(200,60,60,0.22)", color: "#e07070", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>
                        ×
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Pie del panel */}
          <div style={{ height: 4 }} />
        </div>
      )}
    </div>
  );
}

// ── imprimirPresupuesto ───────────────────────────────────────────
function imprimirPresupuesto(
  items,
  modulos,
  costos,
  getModUsado,
  totalGeneral,
  nombre,
  mostrarPrecioUnitario,
  cliente,
  textoApertura = "",
  condiciones = "",
  descuento = 0,
  gananciaExtra = 0,
  tema = "dorado"
) {
  const perfil = leerPerfil();
  const fecha = fmtFechaLarga(Date.now());
  const tv = calcularTotalVisual(totalGeneral, descuento, gananciaExtra);

  // ── Paletas de color premium ───────────────────────────────────
  const TEMAS = {
    dorado: {
      acento:       "#a07030",   // líneas y bordes principales
      acentoSuave:  "#c8a060",   // borde inferior encabezado tabla
      fondoHeader:  "#f5ede0",   // fondo encabezado tabla + pie
      fondoFila:    "#fdfaf6",   // filas alternas
      fondoCliente: "#fff8ee",   // tarjeta del cliente
      bordeCliente: "#e8d0a0",
      textoAcento:  "#9a7040",   // textos en dorado (labels, muted)
      textoPrincipal:"#1a0e04",  // texto oscuro principal
      textoSec:     "#7a6040",   // texto secundario
      totalColor:   "#1a6a30",   // total final (verde)
      descuentoColor:"#e07070",
      separador:    "#ede0cc",
    },
    gris: {
      acento:        "#5a5a5a",
      acentoSuave:   "#9a9a9a",
      fondoHeader:   "#f0f0f0",
      fondoFila:     "#fafafa",
      fondoCliente:  "#f5f5f5",
      bordeCliente:  "#d8d8d8",
      textoAcento:   "#777777",
      textoPrincipal:"#1a1a1a",
      textoSec:      "#555555",
      totalColor:    "#222222",
      descuentoColor:"#888888",
      separador:     "#e0e0e0",
    },
    carbon: {
      acento:        "#2c2c2c",
      acentoSuave:   "#555555",
      fondoHeader:   "#222222",
      fondoFila:     "#f8f8f8",
      fondoCliente:  "#1a1a1a",
      bordeCliente:  "#333333",
      textoAcento:   "#aaaaaa",
      textoPrincipal:"#111111",
      textoSec:      "#444444",
      totalColor:    "#111111",
      descuentoColor:"#666666",
      separador:     "#dddddd",
      // overrides especiales para encabezado oscuro
      headerTexto:   "#ffffff",
      headerTextoSec:"#cccccc",
    },
    bosque: {
      acento:        "#2d5a27",
      acentoSuave:   "#5a8a54",
      fondoHeader:   "#edf5ec",
      fondoFila:     "#f7fbf7",
      fondoCliente:  "#f0f7ef",
      bordeCliente:  "#b8d8b4",
      textoAcento:   "#4a7a44",
      textoPrincipal:"#0f1e0d",
      textoSec:      "#3a5a36",
      totalColor:    "#1a4016",
      descuentoColor:"#c0392b",
      separador:     "#c8e0c4",
    },
    marino: {
      acento:        "#1a3a5c",
      acentoSuave:   "#3a6a9c",
      fondoHeader:   "#edf2f8",
      fondoFila:     "#f7f9fc",
      fondoCliente:  "#eef3f9",
      bordeCliente:  "#b0c8e0",
      textoAcento:   "#3a5a7a",
      textoPrincipal:"#0a1520",
      textoSec:      "#2a4a6a",
      totalColor:    "#0a2040",
      descuentoColor:"#c0392b",
      separador:     "#c0d4e8",
    },
    bordo: {
      acento:        "#6b1a2a",
      acentoSuave:   "#9a3a4a",
      fondoHeader:   "#f8eeef",
      fondoFila:     "#fdf7f7",
      fondoCliente:  "#f8eced",
      bordeCliente:  "#e0b0b8",
      textoAcento:   "#7a3040",
      textoPrincipal:"#1a0508",
      textoSec:      "#5a2030",
      totalColor:    "#3a0a14",
      descuentoColor:"#8a1a2a",
      separador:     "#e8c8cc",
    },
  };

  const p = TEMAS[tema] || TEMAS.dorado;
  const encabezadoTaller = perfil?.nombre
    ? `<div style="display:flex;align-items:center;gap:14px">
        ${perfil.logo ? `<img src="${perfil.logo}" style="height:44px;object-fit:contain" />` : ""}
        <div>
          <div style="font-family:'Georgia',serif;font-size:20px;font-weight:900;color:${p.acento}">${perfil.nombre}</div>
          ${perfil.slogan ? `<div style="font-size:11px;color:${p.textoAcento};font-style:italic">${perfil.slogan}</div>` : ""}
          <div style="font-size:10px;color:${p.textoAcento};margin-top:2px;opacity:0.7">${[perfil.tel, perfil.email, perfil.direccion].filter(Boolean).join(" · ")}</div>
        </div>
      </div>`
    : `<div><div style="font-size:22px;font-weight:900;color:${p.acento}">CarpiCálc</div><div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;color:${p.textoAcento}">Presupuesto de carpintería</div></div>`;
  const filas = items
    .map((item) => {
      const modBase = modulos[item.codigo];
      if (!modBase) return "";
      const modUsado = getModUsado(item);
      const calc = calcularModulo(modUsado, costos);
      if (!calc) return "";
      const over = modUsado.dimensiones;
      const dimDif =
        over.ancho !== modBase.dimensiones.ancho ||
        over.profundidad !== modBase.dimensiones.profundidad ||
        over.alto !== modBase.dimensiones.alto;
      return `<tr>
        <td class="cod" style="color:${p.acento}">${item.codigo}</td>
        <td>
          <div class="mod-nombre" style="color:${p.textoPrincipal}">${modBase.nombre}</div>
          ${modBase.descripcion ? `<div class="mod-desc" style="color:${p.textoSec}">${modBase.descripcion}</div>` : ""}
          ${item.nota?.trim() ? `<div class="mod-nota" style="color:${p.acento}">📝 ${item.nota}</div>` : ""}
          <div class="mod-dim" style="color:${dimDif ? p.acento : p.textoAcento}">
            ${over.ancho}×${over.profundidad}×${over.alto} mm${dimDif ? " ★ personalizado" : ""} · ${TIPO_MAT[modUsado.material]}
          </div>
        </td>
        <td class="num" style="font-weight:700;color:${p.acento}">${item.cantidad}</td>
        ${mostrarPrecioUnitario ? `<td class="num precio-u" style="color:${p.textoSec}">${fmtPeso(calc.total)}</td>` : ""}
        <td class="num subtotal" style="color:${p.totalColor}">${fmtPeso(calc.total * item.cantidad)}</td>
      </tr>`;
    })
    .join("");
  const totalUnid = items.reduce((a, i) => a + i.cantidad, 0);
  // ── HTML del PDF ──────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${perfil?.nombre || "CarpiCálc"} — ${nombre || "Presupuesto"}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #fff;
      color: ${p.textoPrincipal};
      padding: 36px 44px;
      max-width: 920px;
      margin: 0 auto;
      font-size: 13px;
      line-height: 1.5;
    }
    @media print {
      body { padding: 16px 20px; font-size: 12px; }
      @page { margin: 1.2cm 1.4cm; }
    }
    .tabla-items { width: 100%; border-collapse: collapse; }
    .tabla-items thead tr { background: ${p.fondoHeader}; }
    .tabla-items th {
      font-size: 9px; text-transform: uppercase; letter-spacing: 0.16em;
      font-weight: 700; color: ${tema === "carbon" ? p.headerTextoSec : p.textoAcento};
      padding: 10px 14px; border-bottom: 2px solid ${p.acentoSuave};
    }
    .tabla-items th.num { text-align: right; }
    .tabla-items th.txt { text-align: left; }
    .tabla-items td { padding: 11px 14px; border-bottom: 1px solid ${p.separador}; vertical-align: top; }
    .tabla-items tbody tr:nth-child(even) td { background: ${p.fondoFila}; }
    .cod  { font-family: monospace; font-size: 10px; font-weight: 700; white-space: nowrap; }
    .num  { text-align: right; font-family: monospace; }
    .subtotal { font-size: 14px; font-weight: 700; }
    .precio-u  { font-size: 12px; }
    .mod-nombre { font-size: 13px; font-weight: 700; }
    .mod-desc   { font-size: 11px; font-style: italic; margin-top: 3px; }
    .mod-dim    { font-size: 10px; font-family: monospace; margin-top: 4px; }
    .mod-nota   { font-size: 11px; font-style: italic; margin-top: 4px; }
  </style>
</head>
<body>

  <!-- ZONA 1: HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid ${p.acento};margin-bottom:16px;gap:24px">
    <div style="flex:1">${encabezadoTaller}</div>
    <div style="text-align:right;min-width:200px">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.2em;color:${p.textoAcento};margin-bottom:4px">Presupuesto</div>
      <div style="font-size:11px;color:${p.textoAcento};margin-bottom:12px;opacity:0.7">${fecha}</div>
      ${cliente && (cliente.nombre || cliente.tel || cliente.dir) ? `
      <div style="background:${p.fondoCliente};border:1px solid ${p.bordeCliente};border-radius:8px;padding:10px 14px;font-size:12px;color:${p.textoSec};text-align:left;display:inline-block;min-width:180px">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.14em;color:${p.textoAcento};font-weight:700;margin-bottom:6px">Cliente</div>
        ${cliente.nombre ? `<div style="font-weight:700;font-size:13px;margin-bottom:3px;color:${p.textoPrincipal}">${cliente.nombre}</div>` : ""}
        ${cliente.tel ? `<div style="font-size:11px;margin-top:2px">📞 ${cliente.tel}</div>` : ""}
        ${cliente.dir ? `<div style="font-size:11px;margin-top:2px">📍 ${cliente.dir}</div>` : ""}
      </div>` : ""}
    </div>
  </div>

  ${nombre ? `<div style="text-align:center;font-family:'Georgia',serif;font-size:18px;font-style:italic;font-weight:700;color:${p.acento};padding:10px 0 20px 0;letter-spacing:0.02em">${nombre}</div>` : ""}

  ${textoApertura ? `<div style="margin-bottom:20px;padding:12px 16px;background:${p.fondoCliente};border-left:3px solid ${p.acentoSuave};border-radius:0 6px 6px 0;font-size:13px;color:${p.textoSec};line-height:1.7">${textoApertura.replace(/\n/g, "<br>")}</div>` : ""}

  <!-- ZONA 2: TABLA -->
  <table class="tabla-items">
    <thead>
      <tr>
        <th class="txt" style="width:70px">Código</th>
        <th class="txt">Módulo / Descripción</th>
        <th class="num" style="width:52px">Cant.</th>
        ${mostrarPrecioUnitario ? `<th class="num" style="width:110px">P. unit.</th>` : ""}
        <th class="num" style="width:120px">Subtotal</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>

  <!-- ZONA 3: PIE -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:32px;margin-top:0;padding:20px 0 0 0;border-top:2px solid ${p.acento}">

    <div style="flex:1;max-width:55%">
      ${condiciones ? `
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.16em;font-weight:700;color:${p.textoAcento};margin-bottom:8px">Condiciones y observaciones</div>
      <div style="font-size:11px;color:${p.textoSec};line-height:1.7;background:${p.fondoFila};border:1px solid ${p.separador};border-radius:6px;padding:10px 14px">${condiciones.replace(/\n/g, "<br>")}</div>
      ` : `<div style="font-size:11px;color:${p.textoAcento};font-style:italic;opacity:0.6">Sin condiciones especificadas.</div>`}
      <div style="margin-top:12px;font-size:10px;color:${p.textoAcento};opacity:0.7">
        ${totalUnid} unidad${totalUnid !== 1 ? "es" : ""} · ${items.length} módulo${items.length !== 1 ? "s" : ""}
      </div>
    </div>

    <div style="min-width:220px;text-align:right">
      <table style="width:100%;border-collapse:collapse;font-family:'Segoe UI',Arial,sans-serif">
        <tr>
          <td style="font-size:11px;color:${p.textoAcento};padding:4px 0;text-align:left">Subtotal</td>
          <td style="font-size:13px;font-weight:700;color:${tv.hayDescuento ? p.textoAcento : p.textoPrincipal};text-align:right;padding:4px 0;${tv.hayDescuento ? "text-decoration:line-through;opacity:0.55;letter-spacing:0.02em" : ""}">
            ${fmtPeso(tv.totalOriginal)}
          </td>
        </tr>
        ${tv.hayDescuento ? `
        <tr>
          <td style="font-size:11px;color:${p.descuentoColor};padding:4px 0;text-align:left">🏷 Descuento</td>
          <td style="font-size:13px;font-weight:700;color:${p.descuentoColor};text-align:right;padding:4px 0">− ${fmtPeso(tv.descuentoVal)}</td>
        </tr>` : ""}
        ${tv.hayGanancia ? `
        <tr>
          <td style="font-size:11px;color:${p.textoAcento};padding:4px 0;text-align:left">Recargo</td>
          <td style="font-size:13px;font-weight:700;color:${p.textoSec};text-align:right;padding:4px 0">+ ${fmtPeso(tv.gananciaVal)}</td>
        </tr>` : ""}
        ${tv.hayDescuento || tv.hayGanancia ? `
        <tr><td colspan="2" style="padding:6px 0 0 0;border-top:1px solid ${p.acentoSuave}"></td></tr>` : ""}
        <tr>
          <td style="font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:${p.textoAcento};padding-top:6px;text-align:left">Total del trabajo</td>
          <td style="padding-top:6px;text-align:right">
            <span style="font-family:'Georgia',serif;font-size:28px;font-weight:900;color:${p.totalColor};letter-spacing:-0.5px">${fmtPeso(tv.totalFinal)}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="font-size:9px;color:${p.textoAcento};padding-top:4px;text-align:right;opacity:0.7">IVA no incluido</td>
        </tr>
      </table>
    </div>
  </div>

<script>window.onload=()=>window.print();</script>
</body>
</html>`;
  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  } else alert("El navegador bloqueó la ventana emergente.");
}

// ── Ficha de Obra ─────────────────────────────────────────────────
function generarFichaObra(id, p, modulos, costos, perfil = {}) {
  const fecha = fmtFechaLarga(Date.now());
  const creacion = fmtFechaLarga(parseInt(id));
  const cobros = p.cobros || [];
  const totalCobrado = cobros.reduce((a, c) => a + c.monto, 0);
  const saldo = p.total - totalCobrado;

  const encabezadoTaller = perfil?.nombre ? `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px">
      ${perfil.logo ? `<img src="${perfil.logo}" style="height:40px;object-fit:contain" />` : ""}
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:18px;font-weight:900;color:#7a4a10">${perfil.nombre}</div>
        ${perfil.slogan ? `<div style="font-size:11px;color:#9a7040;font-style:italic">${perfil.slogan}</div>` : ""}
        <div style="font-size:10px;color:#aaa">${[perfil.tel, perfil.email, perfil.direccion].filter(Boolean).join(" · ")}</div>
      </div>
    </div>` : `<div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:900;color:#7a4a10">CarpiCálc</div>`;

  // Calcular piezas de corte agrupadas
  const piezasCorte = [];
  (p.items || []).forEach(item => {
    const modBase = modulos[item.codigo];
    if (!modBase) return;
    const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
    const modUsado = { ...modBase, dimensiones: dims };
    const matDef = costos.materiales.find(m => m.tipo === modUsado.material) || costos.materiales[0];
    const esp = matDef?.espesor || 18;
    const dimMap = { ancho: dims.ancho, profundidad: dims.profundidad, alto: dims.alto };
    modUsado.piezas.forEach(pz => {
      const d1 = pz.especial ? (parseInt(pz.dimLibre1) || 0)
        : Math.round(resolverDim(dimMap[pz.usaDim], pz.offsetEsp, pz.offsetMm, pz.divisor || 1, esp));
      const d2 = pz.especial ? (parseInt(pz.dimLibre2) || 0)
        : Math.round(resolverDim(dimMap[pz.usaDim2], pz.offsetEsp2, pz.offsetMm2, pz.divisor2 || 1, esp));
      const cant = (pz.cantidad || 1) * (item.cantidad || 1);
      piezasCorte.push({ nombre: pz.nombre, modulo: `${item.codigo} ${modBase.nombre}`, d1, d2, cant, especial: !!pz.especial });
    });
  });

  // Calcular materiales necesarios
  const calcMat = (() => {
    const matMap = {};
    (p.items || []).forEach(item => {
      const modBase = modulos[item.codigo];
      if (!modBase) return;
      const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
      const modUsado = { ...modBase, dimensiones: dims };
      const calc = calcularModulo(modUsado, costos);
      if (!calc) return;
      const key = modUsado.material;
      if (!matMap[key]) matMap[key] = { nombre: costos.materiales.find(m => m.tipo === key)?.nombre || key, m2: 0, espesor: costos.materiales.find(m => m.tipo === key)?.espesor || 18, placaL: costos.materiales.find(m => m.tipo === key)?.placaLargo || 2750, placaA: costos.materiales.find(m => m.tipo === key)?.placaAncho || 1830 };
      matMap[key].m2 += calc.m2Total * item.cantidad;
    });
    return Object.values(matMap).map(m => ({
      ...m,
      placas: Math.ceil(m.m2 / ((m.placaL * m.placaA) / 1_000_000))
    }));
  })();

  const calcTc = (() => {
    const tcMap = {};
    (p.items || []).forEach(item => {
      const modBase = modulos[item.codigo];
      if (!modBase) return;
      const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
      const modUsado = { ...modBase, dimensiones: dims };
      const calc = calcularModulo(modUsado, costos);
      if (!calc) return;
      modUsado.piezas.forEach(pz => {
        if (!pz.tc?.id) return;
        const tcDef = costos.tapacanto?.find(t => t.id === pz.tc.id);
        if (!tcDef) return;
        const esp = costos.materiales.find(m => m.tipo === modUsado.material)?.espesor || 18;
        const dimMap = { ancho: dims.ancho, profundidad: dims.profundidad, alto: dims.alto };
        const d1 = pz.especial ? (parseInt(pz.dimLibre1) || 0) : resolverDim(dimMap[pz.usaDim], pz.offsetEsp, pz.offsetMm, pz.divisor || 1, esp);
        const d2 = pz.especial ? (parseInt(pz.dimLibre2) || 0) : resolverDim(dimMap[pz.usaDim2], pz.offsetEsp2, pz.offsetMm2, pz.divisor2 || 1, esp);
        const metros = (pz.cantidad * item.cantidad * ((pz.tc.lados1 || 0) * d1 + (pz.tc.lados2 || 0) * d2)) / 1000;
        if (!tcMap[tcDef.id]) tcMap[tcDef.id] = { nombre: tcDef.nombre, metros: 0 };
        tcMap[tcDef.id].metros += metros;
      });
    });
    return Object.values(tcMap);
  })();

  const calcHerrajes = (() => {
    const hMap = {};
    (p.items || []).forEach(item => {
      const modBase = modulos[item.codigo];
      if (!modBase) return;
      (modBase.herrajes || []).forEach(h => {
        const hDef = costos.herrajes?.find(hd => hd.id === h.id);
        if (!hDef) return;
        if (!hMap[h.id]) hMap[h.id] = { nombre: hDef.nombre, unidad: hDef.unidad || "u", cant: 0 };
        hMap[h.id].cant += (h.cantidad || 1) * item.cantidad;
      });
    });
    return Object.values(hMap);
  })();

  const filasCorte = piezasCorte.map((pz, i) =>
    `<tr style="background:${i % 2 === 0 ? '#f9f6f0' : '#fff'}">
      <td style="padding:7px 12px;font-size:12px;color:#5a3a10;font-family:monospace">${pz.modulo}</td>
      <td style="padding:7px 12px;font-size:13px;font-weight:600;color:#1a0e04">${pz.nombre}${pz.especial ? ' <span style="font-size:9px;background:#fff3cd;color:#8a6010;border:1px solid #e0c060;border-radius:3px;padding:1px 4px">ESP</span>' : ''}</td>
      <td style="padding:7px 12px;font-family:monospace;font-size:13px;font-weight:700;color:#1a6a30;text-align:right">${pz.d1}</td>
      <td style="padding:7px 12px;font-family:monospace;font-size:13px;font-weight:700;color:#1a6a30;text-align:right">${pz.d2}</td>
      <td style="padding:7px 12px;font-family:monospace;font-size:14px;font-weight:900;color:#7a4a10;text-align:center">×${pz.cant}</td>
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Ficha de Obra — ${p.nombre}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a0e04;padding:28px 36px;max-width:960px;margin:0 auto;font-size:13px}
  h2{font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#7a4a10;margin-bottom:14px;padding-bottom:6px;border-bottom:2px solid #e8d0a0}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  th{font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:7px 12px;border-bottom:2px solid #c8a060;text-align:left;background:#fdf6ec}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700}
  .section{margin-bottom:24px;padding:16px 18px;border:1px solid #e8d0a0;border-radius:8px;background:#fdf9f3}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
  .label{font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#9a7040;font-weight:700;margin-bottom:3px}
  .val{font-size:14px;font-weight:700;color:#1a0e04;font-family:monospace}
  .chip{display:inline-block;background:#f0e8d8;border:1px solid #c8a060;border-radius:4px;padding:2px 8px;font-size:11px;color:#7a4a10;margin:2px}
  @media print{body{padding:12px 16px} .no-print{display:none}}
</style></head><body>

<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:14px;border-bottom:3px solid #a07030">
  <div>${encabezadoTaller}
    <div style="font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#aaa;margin-top:6px">FICHA DE OBRA</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:18px;font-weight:800;color:#1a0e04">${p.nombre}</div>
    <div style="font-size:11px;color:#888;margin-top:3px">Creado: ${creacion} · Impreso: ${fecha}</div>
    <span class="badge" style="background:#c85030;color:#fff;margin-top:6px">🪚 En producción</span>
  </div>
</div>

${p.cliente && (p.cliente.nombre || p.cliente.tel || p.cliente.dir) ? `
<div class="section" style="margin-bottom:20px">
  <div class="grid3">
    ${p.cliente.nombre ? `<div><div class="label">Cliente</div><div class="val">${p.cliente.nombre}</div></div>` : ''}
    ${p.cliente.tel ? `<div><div class="label">Teléfono</div><div class="val">${p.cliente.tel}</div></div>` : ''}
    ${p.cliente.dir ? `<div><div class="label">Dirección entrega</div><div class="val">${p.cliente.dir}</div></div>` : ''}
  </div>
</div>` : ''}

<div class="grid2" style="margin-bottom:20px">
  <div class="section">
    <h2>📦 Módulos del trabajo</h2>
    ${(p.items || []).map(item => {
      const modBase = modulos[item.codigo];
      if (!modBase) return '';
      const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
      return `<div style="padding:8px 0;border-bottom:1px solid #e8d8c0;display:flex;justify-content:space-between;align-items:center">
        <div>
          <span style="font-family:monospace;font-size:10px;color:#9a7040;font-weight:700">${item.codigo}</span>
          <span style="font-size:13px;font-weight:700;color:#1a0e04;margin-left:8px">${modBase.nombre}</span>
          <div style="font-size:11px;color:#7a6040;font-family:monospace;margin-top:2px">${dims.ancho}×${dims.profundidad}×${dims.alto} mm</div>
        </div>
        <span style="font-family:monospace;font-size:16px;font-weight:900;color:#7a4a10">×${item.cantidad}</span>
      </div>`;
    }).join('')}
  </div>

  <div>
    <div class="section" style="margin-bottom:12px">
      <h2>🪵 Material necesario</h2>
      ${calcMat.map(m => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #e8d8c0">
          <div>
            <div style="font-weight:700;color:#1a0e04">${m.nombre} ${m.espesor}mm</div>
            <div style="font-size:11px;color:#888;font-family:monospace">${m.m2.toFixed(2)} m² (c/desp.)</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:18px;font-weight:900;color:#7a4a10;font-family:monospace">${m.placas}</div>
            <div style="font-size:10px;color:#888">placas</div>
          </div>
        </div>`).join('')}
      ${calcTc.length > 0 ? `<div style="margin-top:10px"><div class="label">Tapacanto</div>${calcTc.map(t => `<span class="chip">🎗 ${t.nombre}: ${t.metros.toFixed(1)} m</span>`).join('')}</div>` : ''}
      ${calcHerrajes.length > 0 ? `<div style="margin-top:10px"><div class="label">Herrajes</div>${calcHerrajes.map(h => `<span class="chip">⚙ ${h.nombre}: ${h.cant} ${h.unidad}</span>`).join('')}</div>` : ''}
    </div>

    <div class="section">
      <h2>💵 Estado de cobros</h2>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="color:#888">Total acordado</span>
        <span style="font-family:monospace;font-weight:700;color:#1a6a30">${fmtPeso(p.total)}</span>
      </div>
      ${cobros.map(c => `
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0">
          <span style="color:#888">${c.concepto} — ${fmtFecha(c.fecha)}</span>
          <span style="font-family:monospace;color:#5a8a5a">${fmtPeso(c.monto)}</span>
        </div>`).join('')}
      <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:2px solid #e8d0a0">
        <span style="font-weight:700">Saldo pendiente</span>
        <span style="font-family:monospace;font-weight:900;font-size:16px;color:${saldo > 0 ? '#c84040' : '#1a6a30'}">${fmtPeso(Math.max(0, saldo))}</span>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <h2>✂ Lista de corte completa (${piezasCorte.length} piezas · ${piezasCorte.reduce((a, p) => a + p.cant, 0)} unidades)</h2>
  <table>
    <thead><tr>
      <th>Módulo</th><th>Pieza</th>
      <th style="text-align:right">Alto (mm)</th>
      <th style="text-align:right">Ancho (mm)</th>
      <th style="text-align:center">Cant.</th>
    </tr></thead>
    <tbody>${filasCorte}</tbody>
  </table>
</div>

${p.nota ? `<div class="section"><h2>📋 Observaciones</h2><p style="font-size:13px;color:#3a2810;line-height:1.6;margin-top:6px">${p.nota}</p></div>` : ''}

<div style="margin-top:16px;padding:12px 16px;background:#f0f0f0;border-radius:6px;display:flex;justify-content:space-between;font-size:11px;color:#888">
  <span>CarpiCálc · Ficha de Obra generada el ${fecha}</span>
  <span>${p.nombre} · ${(p.items||[]).length} módulo${(p.items||[]).length !== 1 ? 's' : ''}</span>
</div>

<script>window.onload=()=>window.print();</script>
</body></html>`;

  const win = window.open("", "_blank", "width=1000,height=750");
  if (win) { win.document.write(html); win.document.close(); }
  else alert("El navegador bloqueó la ventana. Permití popups para este sitio.");
}

// ── ResumenPresupuesto ────────────────────────────────────────────
function ResumenPresupuesto({
  items,
  modulos,
  costos,
  getModUsado,
  totalGeneral,
  mostrarPrecioUnitario,
  nombrePresupuesto,
  descuento = 0,
  gananciaExtra = 0,
}) {
  const [mostrarIVA, setMostrarIVA] = useState(false);
  const totalConIVA = Math.round(totalGeneral * 1.21);
  // LÓGICA - Precios Tachados y PDF: usar función centralizada
  const tv = calcularTotalVisual(totalGeneral, descuento, gananciaExtra);
  const totalAjustadoConIVA = Math.round(tv.totalFinal * 1.21);
  if (items.length === 0) return null;
  const itemsValidos = items.filter(item => {
    const mod = getModUsado(item);
    return mod && mod.piezas;
  });
  if (itemsValidos.length === 0) return null;
  const cols = mostrarPrecioUnitario
    ? "80px 1fr 50px 120px 130px"
    : "80px 1fr 50px 130px";
  const fechaHoy = fmtFechaLarga(Date.now());
  return (
    <div>
      <div
        className="print-only"
        style={{
          marginBottom: 28,
          borderBottom: "2px solid #a07030",
          paddingBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 22,
                fontWeight: 900,
                color: "#7a4a10",
                lineHeight: 1,
              }}
            >
              CarpiCálc
            </div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginTop: 4,
                color: "#888",
              }}
            >
              Presupuesto de carpintería
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {nombrePresupuesto && (
              <div style={{ fontSize: 16, fontWeight: 700, color: "#2c1a08" }}>
                {nombrePresupuesto}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
              {fechaHoy}
            </div>
          </div>
        </div>
      </div>
      {/* rsp-scroll-x: scroll horizontal táctil en móvil */}
      <div
        className="rsp-scroll-x"
        style={{
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        <div className="rsp-table-inner">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              gap: 0,
              padding: "10px 20px",
              background: "var(--accent-soft)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {[
              "Código",
              "Módulo",
              "Cant.",
              ...(mostrarPrecioUnitario ? ["P. unit."] : [""]),
              "Subtotal",
            ]
              .filter((h) => h)
              .map((h) => (
                <div
                  key={h}
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontWeight: 700,
                    fontFamily: "'DM Mono',monospace",
                    color: "var(--text-muted)",
                    textAlign:
                      h === "Cant." || h === "P. unit." || h === "Subtotal"
                        ? "right"
                        : "left",
                  }}
                >
                  {h}
                </div>
              ))}
          </div>
          {(itemsValidos).map((item, idx) => {
            const modBase = modulos[item.codigo];
            if (!modBase) return null;
            const modUsado = getModUsado(item);
            const calc = calcularModulo(modUsado, costos);
            if (!calc) return null;
            const over = modUsado.dimensiones;
            const dimDif =
              over.ancho !== modBase.dimensiones.ancho ||
              over.profundidad !== modBase.dimensiones.profundidad ||
              over.alto !== modBase.dimensiones.alto;
            return (
              <div
                key={item.id || item.codigo}
                className="print-table-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: cols,
                  gap: 0,
                  padding: "14px 20px",
                  borderBottom:
                    idx < items.length - 1 ? "1px solid var(--border)" : "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--accent-soft)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "var(--accent)",
                    paddingTop: 3,
                  }}
                >
                  {item.codigo}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {modBase.nombre}
                  </div>
                  {modBase.descripcion && (
                    <div
                      style={{
                        fontSize: 12,
                        marginTop: 2,
                        fontStyle: "italic",
                        color: "var(--text-muted)",
                      }}
                    >
                      {modBase.descripcion}
                    </div>
                  )}
                  {item.nota && item.nota.trim() && (
                    <div
                      className="item-nota-print"
                      style={{
                        fontSize: 12,
                        marginTop: 4,
                        color: "var(--accent)",
                        fontStyle: "italic",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span style={{ opacity: 0.7 }}>📝</span> {item.nota}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 5,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "'DM Mono',monospace",
                        color: dimDif ? "var(--accent)" : "var(--text-muted)",
                      }}
                    >
                      {over.ancho}×{over.profundidad}×{over.alto} mm
                    </span>
                    {dimDif && (
                      <Badge color="var(--accent)">★ personalizado</Badge>
                    )}
                    <Badge color="#7090b0">{TIPO_MAT[modUsado.material]}</Badge>
                  </div>
                </div>
                <div style={{ textAlign: "right", paddingTop: 3 }}>
                  <span
                    style={{
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--accent)",
                    }}
                  >
                    {item.cantidad}
                  </span>
                </div>
                {mostrarPrecioUnitario && (
                  <div
                    style={{
                      textAlign: "right",
                      paddingTop: 3,
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {fmtPeso(calc.total)}
                  </div>
                )}
                <div
                  style={{
                    textAlign: "right",
                    paddingTop: 3,
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#7ecf8a",
                  }}
                >
                  {fmtPeso(calc.total * item.cantidad)}
                </div>
              </div>
            );
          })}
          <div
            className="print-total-block"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 20,
              padding: "16px 24px",
              alignItems: "center",
              background: "var(--bg-surface)",
              borderTop: "1px solid var(--accent-border)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {items.reduce((a, i) => a + i.cantidad, 0)} unidades ·{" "}
                {items.length} módulo{items.length !== 1 ? "s" : ""}
              </div>
              <button onClick={() => setMostrarIVA(v => !v)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: mostrarIVA ? "rgba(126,207,138,0.12)" : "var(--accent-soft)",
                  border: `1px solid ${mostrarIVA ? "rgba(126,207,138,0.30)" : "var(--accent-border)"}`,
                  color: mostrarIVA ? "#7ecf8a" : "var(--accent)",
                  borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                  fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, width: "fit-content",
                  transition: "all 0.15s",
                }}>
                {mostrarIVA ? "✓ Con IVA 21%" : "+ Ver con IVA 21%"}
              </button>
            </div>
            <div style={{ textAlign: "right" }}>
              {/* Total original — tachado si hay descuento */}
              {tv.hayDescuento || tv.hayGanancia ? (
                <>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 2, color: "var(--text-muted)" }}>
                    {mostrarIVA ? "Total + IVA 21%" : "Total sin IVA"}
                  </div>
                  {tv.hayDescuento && (
                    <div style={{
                      fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700,
                      color: "var(--text-muted)", textDecoration: "line-through",
                      opacity: 0.55, letterSpacing: "0.02em", marginBottom: 4,
                    }}>
                      {fmtPeso(mostrarIVA ? totalConIVA : totalGeneral)}
                    </div>
                  )}
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1, color: "#7ecf8a", transition: "all 0.2s" }}>
                    {fmtPeso(mostrarIVA ? totalAjustadoConIVA : tv.totalFinal)}
                  </div>
                  {tv.hayDescuento && (
                    <div style={{ fontSize: 10, color: "#e07070", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
                      🏷 Precio con descuento
                    </div>
                  )}
                  {mostrarIVA && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
                      base: {fmtPeso(tv.totalFinal)} · iva: {fmtPeso(totalAjustadoConIVA - tv.totalFinal)}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 4, color: "var(--text-muted)" }}>
                    {mostrarIVA ? "Total + IVA 21%" : "Total sin IVA"}
                  </div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1, color: "#7ecf8a", transition: "all 0.2s" }}>
                    {fmtPeso(mostrarIVA ? totalConIVA : totalGeneral)}
                  </div>
                  {mostrarIVA && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
                      base: {fmtPeso(totalGeneral)} · iva: {fmtPeso(totalConIVA - totalGeneral)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BarraTotal ────────────────────────────────────────────────────
function BarraTotal({ items, modulos, costos, getModUsado, totalGeneral, nombrePresupuesto, descuento = 0, gananciaExtra = 0 }) {
  const [expandido, setExpandido] = useState(false);
  const [mostrarIVA, setMostrarIVA] = useState(false);
  const totalConIVA = Math.round(totalGeneral * 1.21);
  const totalUnid = items.reduce((a, i) => a + i.cantidad, 0);
  // LÓGICA - Precios Tachados: usar función centralizada para reactividiad instantánea
  const tv = calcularTotalVisual(totalGeneral, descuento, gananciaExtra);
  const totalFinalConIVA = Math.round(tv.totalFinal * 1.21);
  const hayAjuste = tv.hayDescuento || tv.hayGanancia;

  return (
    <div style={{ borderRadius: expandido ? "10px 10px 0 0" : 10, overflow: "hidden", border: "1px solid var(--accent-border)", background: "var(--bg-surface)" }}>
      {/* Barra principal — siempre visible */}
      <div style={{
        padding: "10px 16px", display: "flex", alignItems: "center",
        gap: 12, flexWrap: "wrap", cursor: "pointer",
        background: "var(--accent-soft)",
        borderBottom: expandido ? "1px solid var(--accent-border)" : "none",
      }}
        onClick={() => setExpandido(v => !v)}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
            {totalUnid} u · {items.length} mód.
          </span>
          <button
            onClick={e => { e.stopPropagation(); setMostrarIVA(v => !v); }}
            style={{
              padding: "3px 10px", borderRadius: 5, fontSize: 10,
              fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer",
              background: mostrarIVA ? "rgba(126,207,138,0.15)" : "transparent",
              border: `1px solid ${mostrarIVA ? "rgba(126,207,138,0.35)" : "var(--accent-border)"}`,
              color: mostrarIVA ? "#7ecf8a" : "var(--accent)",
              transition: "all 0.15s",
            }}>
            {mostrarIVA ? "✓ Con IVA" : "+ IVA 21%"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Total original — tachado elegante si hay descuento */}
          {tv.hayDescuento && (
            <span style={{
              fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700,
              color: "var(--text-muted)", textDecoration: "line-through",
              opacity: 0.5, letterSpacing: "0.02em",
            }}>
              {fmtPeso(mostrarIVA ? totalConIVA : totalGeneral)}
            </span>
          )}
          {/* Total final — verde destacado */}
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 900, color: "#7ecf8a", letterSpacing: -0.5 }}>
            {fmtPeso(mostrarIVA ? (hayAjuste ? totalFinalConIVA : totalConIVA) : (hayAjuste ? tv.totalFinal : totalGeneral))}
          </span>
          {mostrarIVA && !hayAjuste && (
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
              base {fmtPeso(totalGeneral)}
            </span>
          )}
          <span style={{ color: "var(--accent)", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
            {expandido ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Resumen expandido */}
      {expandido && (
        <ResumenPresupuesto
          items={items}
          modulos={modulos}
          costos={costos}
          getModUsado={getModUsado}
          totalGeneral={totalGeneral}
          nombrePresupuesto={nombrePresupuesto}
          descuento={descuento}
          gananciaExtra={gananciaExtra}
        />
      )}
    </div>
  );
}

// ── Presupuesto ───────────────────────────────────────────────────
function Presupuesto({
  modulos,
  costos,
  items,
  setItems,
  dimOverride,
  setDimOverride,
  getModUsado,
  totalGeneral,
  presupuestos,
  onGuardarPresupuesto,
  onCargarPresupuesto,
  onEliminarPresupuesto,
  onCambiarEstado,
  onActualizarPresupuesto,
  onVerPresupuesto,
  costosVersion = 0,
}) {
  const [inputCod, setInputCod] = useState("");
  const [inputCant, setInputCant] = useState(1);
  const [error, setError] = useState("");
  const [expandido, setExpandido] = useState(null);
  const [preDim, setPreDim] = useState(null);
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [clienteActivo, setClienteActivo] = useState({ nombre: "", tel: "", dir: "" });
  const [nombreTrabajo, setNombreTrabajo] = useState("");
  const [presupuestoActivoId, setPresupuestoActivoId] = useState(null); // id del pres cargado
  const [dialogoGuardar, setDialogoGuardar] = useState(false); // diálogo actualizar/copia
  const { pushUndo, ToastContainer } = useUndo();
  const formRef = React.useRef(null); // ref al formulario para autoscroll

  // Detectar presupuesto desactualizado cuando se carga uno guardado
  const [alertaPrecios, setAlertaPrecios] = useState(null); // { idPres, totalOriginal, totalRecalculado }

  // Al cargar un presupuesto verificar si los precios cambiaron
  const verificarPrecios = (p, id) => {
    if (!p.items || p.items.length === 0) return;
    const totalRecalculado = p.items.reduce((acc, item) => {
      const base = modulos[item.codigo];
      if (!base) return acc;
      const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || base.dimensiones;
      const mod = { ...base, dimensiones: dims };
      const calc = calcularModulo(mod, costos);
      if (!calc) return acc;
      return acc + calc.total * item.cantidad;
    }, 0);
    const diff = Math.abs(totalRecalculado - p.total);
    if (diff > 1) { // diferencia mayor a $1 → precios cambiaron
      setAlertaPrecios({ id, totalOriginal: p.total, totalRecalculado: Math.round(totalRecalculado) });
    } else {
      setAlertaPrecios(null);
    }
  };

  const handleCargar = (p, id) => {
    onCargarPresupuesto(p);
    setClienteActivo(p.cliente || { nombre: "", tel: "", dir: "" });
    setNombreTrabajo(p.nombre || "");
    setPresupuestoActivoId(id || null);
    setAlertaPrecios(null);
    setEditandoCliente(false);
    verificarPrecios(p, id);
  };

  const handleNuevoPresupuesto = () => {
    setItems([]);
    setClienteActivo({ nombre: "", tel: "", dir: "" });
    setNombreTrabajo("");
    setPresupuestoActivoId(null);
    setAlertaPrecios(null);
    setEditandoCliente(true); // abre panel de cliente
  };

  const handleCodChange = (val) => {
    const cod = val.toUpperCase();
    setInputCod(cod);
    setError("");
    if (modulos[cod]) setPreDim({ ...modulos[cod].dimensiones });
    else setPreDim(null);
  };
  const agregar = () => {
    const cod = inputCod.trim().toUpperCase();
    if (!cod) {
      setError("Ingresá un código.");
      return;
    }
    const modBase = modulos[cod];
    if (!modBase) {
      setError(`"${cod}" no encontrado.`);
      return;
    }
    const cant = parseInt(inputCant) || 1;
    const nuevoId =
      Date.now().toString(36) + Math.random().toString(36).substring(2);
    const isCustom =
      preDim &&
      (preDim.ancho !== modBase.dimensiones.ancho ||
        preDim.profundidad !== modBase.dimensiones.profundidad ||
        preDim.alto !== modBase.dimensiones.alto);
    if (!isCustom) {
      const idx = items.findIndex(
        (i) =>
          i.codigo === cod &&
          !dimOverride[i.id || i.codigo] &&
          (!i.nota || i.nota.trim() === "")
      );
      if (idx >= 0) {
        const n = [...items];
        n[idx].cantidad += cant;
        setItems(n);
        setInputCod("");
        setInputCant(1);
        setPreDim(null);
        setError("");
        return;
      }
    }
    setItems([
      ...items,
      { id: nuevoId, codigo: cod, cantidad: cant, nota: "" },
    ]);
    if (isCustom) {
      setDimOverride((prev) => ({
        ...prev,
        [nuevoId]: {
          ancho: parseInt(preDim.ancho) || 0,
          profundidad: parseInt(preDim.profundidad) || 0,
          alto: parseInt(preDim.alto) || 0,
        },
      }));
    }
    setInputCod("");
    setInputCant(1);
    setPreDim(null);
    setError("");
    // Autoscroll suave al formulario
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };
  const setNota = (keyId, v) =>
    setItems((its) =>
      its.map((it) =>
        (it.id || it.codigo) === keyId ? { ...it, nota: v } : it
      )
    );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* 1. Mis presupuestos */}
      <div className="no-print">
        <GestorPresupuestos
          presupuestos={presupuestos}
          onCargar={handleCargar}
          onNuevo={handleNuevoPresupuesto}
          onEliminar={onEliminarPresupuesto}
          onCambiarEstado={onCambiarEstado}
          totalActual={totalGeneral}
          itemsActual={items}
          nombreInicial={nombreTrabajo}
          clienteInicial={clienteActivo}
          onVer={onVerPresupuesto}
          itemsActivos={items}
          costosVersion={costosVersion}
          onActualizarPresupuesto={onActualizarPresupuesto}
          modulos={modulos}
          costos={costos}
        />
      </div>

      {/* 2. Tarjeta de trabajo activo */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{
          padding: "14px 20px", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 12, flexWrap: "wrap",
          borderBottom: editandoCliente ? "1px solid var(--border)" : "none",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {!items.length && !editandoCliente && !nombreTrabajo ? (
              <div style={{ fontSize: 14, color: "var(--text-muted)", fontStyle: "italic" }}>Sin presupuesto activo</div>
            ) : (
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                  {nombreTrabajo || "Nuevo presupuesto"}
                </div>
                {clienteActivo.nombre && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    👤 {clienteActivo.nombre}{clienteActivo.tel && ` · ${clienteActivo.tel}`}
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
            {items.length > 0 && (
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color: "#7ecf8a" }}>
                {fmtPeso(totalGeneral)}
              </span>
            )}
            {items.length > 0 && (
              <>
                {/* Botón Actualizar — habilitado solo si los costos cambiaron desde que se cargó el presupuesto */}
                {presupuestoActivoId && (() => {
                  const necesita = presupuestoNecesitaActualizacion(presupuestoActivoId, costosVersion, presupuestos[presupuestoActivoId]);
                  return (
                    <button
                      disabled={!necesita}
                      onClick={() => {
                        const pActivo = presupuestos[presupuestoActivoId];
                        const nuevoTotal = recalcularTotalPresupuesto(pActivo, modulos, costos);
                        if (nuevoTotal !== null) onActualizarPresupuesto(presupuestoActivoId, { total: Math.round(nuevoTotal), costosVersionAl: Date.now() });
                      }}
                      title={necesita ? "Los costos cambiaron — actualizá el precio" : "El precio está actualizado"}
                      style={{
                        padding: "6px 12px", borderRadius: 7, fontSize: 11,
                        fontFamily: "'DM Mono',monospace", fontWeight: 700,
                        cursor: necesita ? "pointer" : "not-allowed",
                        background: necesita ? "rgba(200,160,42,0.15)" : "transparent",
                        border: `1px solid ${necesita ? "rgba(200,160,42,0.40)" : "var(--border)"}`,
                        color: necesita ? "#c8a02a" : "var(--text-muted)",
                        opacity: necesita ? 1 : 0.45, transition: "all 0.2s",
                      }}>
                      ↻ Actualizar
                    </button>
                  );
                })()}
                <button onClick={() => presupuestoActivoId ? setDialogoGuardar(true) : (() => {
                  onGuardarPresupuesto(nombreTrabajo || "Sin nombre", clienteActivo, "");
                  setItems([]); setDimOverride({}); setNombreTrabajo(""); setClienteActivo({ nombre: "", tel: "", dir: "" }); setPresupuestoActivoId(null); setEditandoCliente(false);
                })()}
                  style={{ padding: "6px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)", boxShadow: "0 2px 8px rgba(180,100,20,0.25)" }}>
                  💾 Guardar
                </button>
                <button onClick={() => {
                  setItems([]); setDimOverride({}); setNombreTrabajo(""); setClienteActivo({ nombre: "", tel: "", dir: "" }); setPresupuestoActivoId(null); setEditandoCliente(false); setAlertaPrecios(null);
                }}
                  style={{ padding: "6px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "transparent", border: "1px solid rgba(200,60,60,0.30)", color: "#e07070", transition: "all 0.15s" }}>
                  ✕ Cancelar
                </button>
              </>
            )}
            {/* Nuevo presupuesto — solo cuando no hay nada activo */}
            {!items.length && !nombreTrabajo && !editandoCliente && (
              <button onClick={() => setEditandoCliente(true)}
                style={{ padding: "6px 16px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", transition: "all 0.15s" }}>
                + Nuevo presupuesto
              </button>
            )}
            {/* Editar datos — solo cuando hay algo activo */}
            {(items.length > 0 || nombreTrabajo) && (
              <button onClick={() => setEditandoCliente(v => !v)}
                style={{ padding: "6px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", transition: "all 0.15s" }}>
                ✎ Datos
              </button>
            )}
          </div>
        </div>
        {editandoCliente && (
          <div style={{ padding: "14px 20px", background: "var(--bg-subtle)" }}>
            <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 10 }}>
              <TextInput label="Nombre del trabajo" placeholder="Ej: Cocina Rodríguez" small value={nombreTrabajo} onChange={setNombreTrabajo} />
              <TextInput label="Cliente" placeholder="Nombre del cliente" small value={clienteActivo.nombre} onChange={v => setClienteActivo(c => ({ ...c, nombre: v }))} />
              <TextInput label="Teléfono" placeholder="341 555-1234" small value={clienteActivo.tel} onChange={v => setClienteActivo(c => ({ ...c, tel: v }))} />
            </div>
            <TextInput label="Dirección de entrega" placeholder="Av. San Martín 456" small value={clienteActivo.dir} onChange={v => setClienteActivo(c => ({ ...c, dir: v }))} />
          </div>
        )}
      </div>

      {/* Diálogo guardar */}
      {dialogoGuardar && (
        <div style={{ padding: "16px 20px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--accent-border)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>💾 ¿Cómo querés guardar?</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>"{nombreTrabajo || "Sin nombre"}"</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => {
              onActualizarPresupuesto && onActualizarPresupuesto(presupuestoActivoId, { nombre: nombreTrabajo, cliente: clienteActivo, items: [...items], dimOverride: { ...dimOverride }, total: totalGeneral });
              setDialogoGuardar(false);
              setItems([]); setDimOverride({}); setNombreTrabajo(""); setClienteActivo({ nombre: "", tel: "", dir: "" }); setPresupuestoActivoId(null); setEditandoCliente(false);
            }} style={{ padding: "8px 18px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
              ✓ Actualizar original
            </button>
            <button onClick={() => {
              onGuardarPresupuesto(nombreTrabajo || "Sin nombre", clienteActivo, "");
              setDialogoGuardar(false);
              setItems([]); setDimOverride({}); setNombreTrabajo(""); setClienteActivo({ nombre: "", tel: "", dir: "" }); setPresupuestoActivoId(null); setEditandoCliente(false);
            }}
              style={{ padding: "8px 18px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              + Guardar como copia
            </button>
            <button onClick={() => setDialogoGuardar(false)}
              style={{ padding: "8px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Alerta precios */}
      {alertaPrecios && (
        <div style={{ padding: "12px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "rgba(200,160,42,0.10)", border: "1px solid rgba(200,160,42,0.30)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#c8a02a", marginBottom: 2 }}>⚠ Los precios cambiaron desde que se creó este presupuesto</div>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
              Original: {fmtPeso(alertaPrecios.totalOriginal)} → Recalculado: {fmtPeso(alertaPrecios.totalRecalculado)}
              <span style={{ marginLeft: 8, color: alertaPrecios.totalRecalculado > alertaPrecios.totalOriginal ? "#e07070" : "#7ecf8a", fontWeight: 700 }}>
                ({alertaPrecios.totalRecalculado > alertaPrecios.totalOriginal ? "+" : ""}{fmtPeso(alertaPrecios.totalRecalculado - alertaPrecios.totalOriginal)})
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setAlertaPrecios(null)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>Mantener</button>
            <button onClick={() => { if (alertaPrecios.id) onActualizarPresupuesto && onActualizarPresupuesto(alertaPrecios.id, { total: alertaPrecios.totalRecalculado }); setAlertaPrecios(null); }}
              style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a" }}>
              ✓ Actualizar precio
            </button>
          </div>
        </div>
      )}

      {/* 3. Módulos cargados */}
      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, idx) => {
            const keyId = item.id || item.codigo;
            const modUsado = getModUsado(item);
            if (!modUsado) return null;
            const calc = calcularModulo(modUsado, costos);
            if (!calc) return null;
            const modBase = modulos[item.codigo];
            const over = modUsado.dimensiones;
            const dimDif = modBase && (over.ancho !== modBase.dimensiones.ancho || over.profundidad !== modBase.dimensiones.profundidad || over.alto !== modBase.dimensiones.alto);
            return (
              <div key={keyId} className="hover-lift anim-fadeup" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>{item.codigo}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{modUsado.nombre}</div>
                    <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: dimDif ? "var(--accent)" : "var(--text-muted)", marginTop: 2 }}>
                      {over.ancho}×{over.profundidad}×{over.alto} mm{dimDif ? " ★ personalizado" : ""} · {TIPO_MAT[modUsado.material]}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button onClick={() => setItems(its => its.map((it, i) => i === idx ? { ...it, cantidad: Math.max(1, it.cantidad - 1) } : it))}
                        style={{ width: 26, height: 26, borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, minWidth: 22, textAlign: "center" }}>{item.cantidad}</span>
                      <button onClick={() => setItems(its => its.map((it, i) => i === idx ? { ...it, cantidad: it.cantidad + 1 } : it))}
                        style={{ width: 26, height: 26, borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                    </div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: "#7ecf8a", minWidth: 80, textAlign: "right" }}>
                      {fmtPeso(calc.total * item.cantidad)}
                    </span>
                    <button onClick={() => {
                      const itemEl = item;
                      const dimEl = dimOverride[keyId];
                      setItems(its => its.filter((_, i) => i !== idx));
                      pushUndo({ mensaje: `"${item.codigo}" eliminado del presupuesto`, onDeshacer: () => {
                        setItems(its => { const n = [...its]; n.splice(idx, 0, itemEl); return n; });
                        if (dimEl) setDimOverride(d => ({ ...d, [keyId]: dimEl }));
                      }});
                    }} style={{ background: "transparent", border: "1px solid rgba(200,60,60,0.22)", color: "#e07070", borderRadius: 5, cursor: "pointer", fontSize: 11, padding: "3px 8px" }}>×</button>
                  </div>
                </div>
                {expandido === keyId && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--separator)" }}>
                    <TextInput label="Nota del ítem" placeholder="Observación..." small value={item.nota || ""} onChange={v => setNota(keyId, v)} />
                  </div>
                )}
                <button onClick={() => setExpandido(expandido === keyId ? null : keyId)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 11, marginTop: 4, padding: 0, fontFamily: "'DM Mono',monospace" }}>
                  {expandido === keyId ? "▲ menos" : "▼ detalle"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Barra de total colapsable — entre módulos y formulario */}
      {items.length > 0 && (
        <BarraTotal
          items={items}
          modulos={modulos}
          costos={costos}
          getModUsado={getModUsado}
          totalGeneral={totalGeneral}
          nombrePresupuesto={nombreTrabajo}
          descuento={presupuestoActivoId ? (presupuestos[presupuestoActivoId]?.descuento || 0) : 0}
          gananciaExtra={presupuestoActivoId ? (presupuestos[presupuestoActivoId]?.gananciaExtra || 0) : 0}
        />
      )}

      {/* 5. Formulario agregar módulo */}
      <div ref={formRef}>
        <Card className="rsp-card no-print">
          <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 100px auto", gap: 12, alignItems: "end" }}>
            <div>
              <TextInput label="Código de módulo" placeholder="MC001" value={inputCod} onChange={handleCodChange} />
              {error && <p style={{ color: "#e07070", fontSize: 12, marginTop: 5 }}>⚠ {error}</p>}
            </div>
            <TextInput label="Cantidad" type="number" value={inputCant} onChange={setInputCant} />
            <div><Btn onClick={agregar}>Agregar</Btn></div>
          </div>
          {preDim && (
            <div style={{ marginTop: 14, padding: 14, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 10 }}>
                ✎ Dimensiones para {inputCod} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(editables antes de agregar)</span>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {["ancho", "profundidad", "alto"].map(dim => (
                  <div key={dim} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{dim}</label>
                    <input type="number" value={preDim[dim]} onChange={e => setPreDim(p => ({ ...p, [dim]: parseInt(e.target.value) || 0 }))}
                      style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, padding: "6px 10px", background: "var(--bg-base)", border: "1px solid var(--accent-border)", color: "var(--text-primary)", borderRadius: 6, outline: "none", width: 90 }} />
                    <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>mm</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <PanelSelectorModulos modulos={modulos} onSeleccionar={cod => handleCodChange(cod)} />
        </Card>
      </div>

      <ToastContainer />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 10. VISTA PREVIA
// ══════════════════════════════════════════════════════════════════
// ── VistaPrevia ───────────────────────────────────────────────────
function VistaPrevia({
  items, modulos, costos, onLimpiar, getModUsado,
  totalGeneral, presupuestos, perfil,
  onActualizarPresupuesto, onCambiarEstado, onCargarPresupuesto,
  presupuestoSelId, onSeleccionarPresupuesto,
  costosVersion = 0,
  onVerRentabilidad,
}) {
  const entries = Object.entries(presupuestos).sort((a, b) => b[0] - a[0]);
  const [presSelIdLocal, setPresSelIdLocal] = useState(presupuestoSelId || null);
  const presSelId = presupuestoSelId !== undefined ? presupuestoSelId : presSelIdLocal;
  const setPresSelId = (id) => {
    setPresSelIdLocal(id);
    if (onSeleccionarPresupuesto) onSeleccionarPresupuesto(id);
  };
  const [mostrarLista, setMostrarLista] = useState(!presupuestoSelId);
  const [mostrarPrecioUnitario, setMostrarPrecioUnitario] = useState(true);
  const [temaPDF, setTemaPDF] = useState(() => {
    try { return localStorage.getItem("carpicalc:temaPDF") || "dorado"; }
    catch { return "dorado"; }
  });

  const cambiarTema = (t) => {
    setTemaPDF(t);
    try { localStorage.setItem("carpicalc:temaPDF", t); } catch {}
  };
  const [whatsappCopiado, setWhatsappCopiado] = useState(false);
  const [guardandoTexto, setGuardandoTexto] = useState(false);

  useEffect(() => {
    if (presupuestoSelId) setMostrarLista(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const presSel = presSelId ? presupuestos[presSelId] : null;
  const [textoApertura, setTextoApertura] = useState("");
  const [condiciones, setCondiciones] = useState("");

  // UI - Campos de Ajuste: sincronizados bidireccionalmente con Caja
  // Se leen del presupuesto al seleccionarlo y se guardan al cambiar (onBlur)
  const [descuentoVP, setDescuentoVP] = useState("");
  const [gananciaExtraVP, setGananciaExtraVP] = useState("");

  useEffect(() => {
    if (presSel) {
      setTextoApertura(presSel.textoApertura || perfil?.textoApertura || "");
      setCondiciones(presSel.condiciones || perfil?.condiciones || "");
      // Sincronización: cargar ajustes desde el presupuesto seleccionado
      setDescuentoVP(presSel.descuento ?? "");
      setGananciaExtraVP(presSel.gananciaExtra ?? "");
      setMostrarLista(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presSelId]);

  const guardarTextos = () => {
    if (!presSelId) return;
    const prevTotal = presSel.total;
    const cambios = { textoApertura, condiciones };
    // Historial si cambió el total
    if (presSel.total !== prevTotal) {
      cambios.historialVersiones = [
        ...(presSel.historialVersiones || []),
        { fecha: Date.now(), total: presSel.total }
      ].slice(-5);
    }
    onActualizarPresupuesto(presSelId, cambios);
    setGuardandoTexto(true);
    setTimeout(() => setGuardandoTexto(false), 1800);
  };

  const handleWhatsApp = () => {
    if (!presSel) return;
    const txt = generarTextoWhatsApp(
      presSel.items, modulos, costos,
      (item) => { const base = modulos[item.codigo]; const dims = (presSel.dimOverride && presSel.dimOverride[`${item.codigo}-${item.id||0}`]) || base?.dimensiones; return { ...base, dimensiones: dims }; },
      presSel.total, presSel.nombre, presSel.cliente
    );
    navigator.clipboard.writeText(txt).then(() => { setWhatsappCopiado(true); setTimeout(() => setWhatsappCopiado(false), 2500); });
  };

  const handlePDF = () => {
    if (!presSel) return;
    const getModUsadoLocal = (item) => {
      const base = modulos[item.codigo];
      const dims = (presSel.dimOverride && presSel.dimOverride[`${item.codigo}-${item.id||0}`]) || base?.dimensiones;
      return { ...base, dimensiones: dims };
    };
    imprimirPresupuesto(presSel.items, modulos, costos, getModUsadoLocal, presSel.total, presSel.nombre, mostrarPrecioUnitario, presSel.cliente, textoApertura, condiciones, presSel.descuento || 0, presSel.gananciaExtra || 0, temaPDF);
  };

  const estSel = presSel ? (ESTADOS_TRABAJO.find(e => e.id === (presSel.estado || "nuevo")) || ESTADOS_TRABAJO[0]) : null;

  const btnAcc = (color, children, onClick) => (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
      borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700,
      cursor: "pointer", transition: "all 0.15s",
      background: color === "gold" ? "linear-gradient(135deg,var(--accent),var(--accent-hover))" :
                  color === "wa" ? "rgba(37,211,102,0.15)" : "var(--accent-soft)",
      border: color === "wa" ? "1px solid rgba(37,211,102,0.35)" :
              color === "ghost" ? "1px solid var(--accent-border)" : "none",
      color: color === "gold" ? "var(--text-inverted)" :
             color === "wa" ? "#25d366" : "var(--accent)",
      boxShadow: color === "gold" ? "0 3px 12px rgba(180,100,20,0.28)" : "none",
    }}>{children}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <SectionTitle sub="Editá y enviá tus presupuestos guardados">
          Vista Previa
        </SectionTitle>
        {presSelId && (
          <button onClick={() => { setPresSelId(null); setMostrarLista(true); if (onSeleccionarPresupuesto) onSeleccionarPresupuesto(null); }}
            style={{ padding: "6px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "transparent", border: "1px solid rgba(200,60,60,0.25)", color: "#e07070", flexShrink: 0, marginTop: 4 }}>
            ✕ Limpiar vista
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", borderRadius: 12, border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
          <div style={{ marginBottom: 18, opacity: 0.7 }} dangerouslySetInnerHTML={{ __html: `<svg width="52" height="52" viewBox="0 0 52 52" fill="none"><rect x="10" y="8" width="32" height="36" rx="6" stroke="var(--accent)" stroke-width="1.5" opacity="0.5"/><line x1="18" y1="20" x2="34" y2="20" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/><line x1="18" y1="27" x2="34" y2="27" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/><line x1="18" y1="34" x2="26" y2="34" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" opacity="0.25"/></svg>` }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Sin presupuestos guardados</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>Todavía no hay nada acá.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>Guardá uno desde <strong style={{ color: "var(--accent)" }}>📋 Presupuesto</strong>.</p>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }} className="vp-layout">
          {/* ── Panel izquierdo: lista de trabajos ── */}
          <div className={`vp-lista ${!mostrarLista ? "vp-lista-hidden" : ""}`} style={{
            width: 260, flexShrink: 0, background: "var(--bg-surface)",
            border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden",
          }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", background: "var(--accent-soft)" }}>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--accent)" }}>
                {entries.length} presupuestos
              </div>
            </div>
            {entries.map(([id, p]) => {
              const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
              const activo = presSelId === id;
              return (
                <div key={id} onClick={() => setPresSelId(id)} style={{
                  padding: "12px 14px", cursor: "pointer", transition: "background 0.12s",
                  borderBottom: "1px solid var(--separator)",
                  background: activo ? "var(--accent-soft)" : "transparent",
                  borderLeft: `3px solid ${activo ? "var(--accent)" : "transparent"}`,
                }}
                  onMouseEnter={e => { if (!activo) e.currentTarget.style.background = "var(--bg-subtle)"; }}
                  onMouseLeave={e => { if (!activo) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Nombre del presupuesto — principal */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: activo ? "var(--accent)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 5 }}>
                    {p.nombre}
                  </div>
                  {/* Precio — destacado */}
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: "#7ecf8a", marginBottom: 6 }}>
                    {fmtPeso(p.total)}
                  </div>
                  {/* Estado + cliente + NAVEGACIÓN */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, background: `${est.color}20`, color: est.color, border: `1px solid ${est.color}30`, borderRadius: 3, padding: "1px 5px", fontFamily: "'DM Mono',monospace" }}>
                        {est.icon} {est.label}
                      </span>
                      {p.cliente?.nombre && (
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>👤 {p.cliente.nombre}</span>
                      )}
                    </div>
                    {/* NAVEGACIÓN - Enlace Presupuesto a Caja */}
                    {onVerRentabilidad && (
                      <button
                        onClick={e => { e.stopPropagation(); onVerRentabilidad(id); }}
                        title="Ver rentabilidad en Caja"
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "2px 8px", borderRadius: 5, cursor: "pointer",
                          fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                          background: "rgba(126,207,138,0.12)",
                          border: "1px solid rgba(126,207,138,0.30)",
                          color: "#7ecf8a", transition: "all 0.15s", flexShrink: 0,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(126,207,138,0.25)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(126,207,138,0.12)"}
                      >
                        📊 Rentabilidad
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Panel derecho: documento ── */}
          <div className={`vp-doc ${mostrarLista && !presSel ? "vp-doc-hidden" : ""}`} style={{ flex: 1, minWidth: 0 }}>
            {!presSel ? (
              <div style={{ textAlign: "center", padding: "60px 20px", borderRadius: 16, border: "1px dashed var(--border)", color: "var(--text-muted)", background: "var(--bg-subtle)" }}>
                <div style={{ marginBottom: 18, opacity: 0.7 }} dangerouslySetInnerHTML={{ __html: `<svg width="52" height="52" viewBox="0 0 52 52" fill="none"><path d="M16 26l10 10 18-18" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/><circle cx="26" cy="26" r="18" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.25"/></svg>` }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Seleccioná un presupuesto</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>Elegí uno de la lista para ver el detalle</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Botón volver mobile */}
                <button className="vp-back" onClick={() => setMostrarLista(true)}
                  style={{ display: "none", alignSelf: "flex-start", padding: "6px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", marginBottom: 4 }}>
                  ← Lista de presupuestos
                </button>

                {/* Toolbar — sin nombre del cliente, ya figura en la lista lateral */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "12px 16px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10 }}>
                  {/* Estado */}
                  <select value={presSel.estado || "nuevo"} onChange={e => onCambiarEstado(presSelId, e.target.value)}
                    style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "6px 9px", background: `${estSel.color}18`, border: `1px solid ${estSel.color}44`, color: estSel.color, borderRadius: 7, cursor: "pointer", outline: "none", fontWeight: 700 }}>
                    {ESTADOS_TRABAJO.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
                  </select>
                  <ToggleSwitch value={mostrarPrecioUnitario} onChange={setMostrarPrecioUnitario} label="P. unit." />
                  {/* Botón Actualizar precio — visible siempre, habilitado solo si los costos cambiaron */}
                  {(() => {
                    const necesita = presSelId && presupuestoNecesitaActualizacion(presSelId, costosVersion, presSel);
                    return (
                      <button
                        disabled={!necesita}
                        onClick={() => {
                          const nuevoTotal = recalcularTotalPresupuesto(presSel, modulos, costos);
                          if (nuevoTotal !== null) onActualizarPresupuesto(presSelId, { total: Math.round(nuevoTotal), costosVersionAl: Date.now() });
                        }}
                        title={necesita ? "Los costos cambiaron — actualizá el precio" : "El precio está actualizado"}
                        style={{
                          padding: "7px 13px", borderRadius: 7, fontSize: 11,
                          fontFamily: "'DM Mono',monospace", fontWeight: 700,
                          cursor: necesita ? "pointer" : "not-allowed",
                          background: necesita ? "rgba(200,160,42,0.15)" : "transparent",
                          border: `1px solid ${necesita ? "rgba(200,160,42,0.40)" : "var(--border)"}`,
                          color: necesita ? "#c8a02a" : "var(--text-muted)",
                          opacity: necesita ? 1 : 0.45, transition: "all 0.2s",
                        }}>
                        ↻ Actualizar precio
                      </button>
                    );
                  })()}
                  {btnAcc("wa", whatsappCopiado ? "✓ Copiado" : "📲 WhatsApp", handleWhatsApp)}
                  {/* Selector de tema de color del PDF */}
                  <select
                    value={temaPDF}
                    onChange={e => cambiarTema(e.target.value)}
                    title="Tema de color del PDF"
                    style={{
                      fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
                      padding: "7px 10px", borderRadius: 7, cursor: "pointer",
                      outline: "none", background: "var(--bg-surface)",
                      border: "1px solid var(--border)", color: "var(--text-secondary)",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"}
                  >
                    <option value="dorado">🟡 Dorado</option>
                    <option value="gris">⬜ Gris Perla</option>
                    <option value="carbon">⬛ Carbón</option>
                    <option value="bosque">🟢 Bosque</option>
                    <option value="marino">🔵 Marino</option>
                    <option value="bordo">🟥 Burdeos</option>
                  </select>
                  {btnAcc("gold", "🖨 PDF", handlePDF)}
                </div>

                {/* Historial de versiones */}
                {(presSel.historialVersiones || []).length > 0 && (
                  <div style={{ padding: "8px 14px", background: "rgba(200,160,42,0.08)", border: "1px solid rgba(200,160,42,0.20)", borderRadius: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--accent)", fontWeight: 700 }}>📊 Versiones anteriores:</span>
                    {(presSel.historialVersiones || []).map((v, i) => (
                      <span key={i} style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
                        {fmtFecha(v.fecha)}: {fmtPeso(v.total)}
                      </span>
                    ))}
                  </div>
                )}

                {/* UI - Campos de Ajuste en Vista Previa: sincronizados bidireccionalmente con Caja */}
                {(() => {
                  const descuentoActual = parseFloat(presSel.descuento) || 0;
                  const gananciaActual  = parseFloat(presSel.gananciaExtra) || 0;
                  const totalAjustadoVP = presSel.total + gananciaActual - descuentoActual;
                  const guardarAjuste = (d, g) => {
                    onActualizarPresupuesto(presSelId, {
                      descuento: parseFloat(d) || 0,
                      gananciaExtra: parseFloat(g) || 0,
                    });
                  };
                  return (
                    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
                          💲 Ajustes de precio
                        </span>
                        {(descuentoActual > 0 || gananciaActual > 0) && (
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 900, color: "#7ecf8a" }}>
                            Total ajustado: {fmtPeso(totalAjustadoVP)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 0 }}>
                        {/* Descuento */}
                        <div style={{ flex: 1, padding: "10px 14px", borderRight: "1px solid var(--border)", background: descuentoActual > 0 ? "rgba(224,112,112,0.06)" : "transparent" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 13 }}>🏷</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>Descuento</span>
                            <span style={{ fontSize: 12, color: "#e07070", fontWeight: 900, fontFamily: "'DM Mono',monospace" }}>−</span>
                          </div>
                          {/* UI - Acción de Confirmación */}
                        <input
                            type="number" min="0" value={descuentoVP} placeholder="0"
                            onChange={e => setDescuentoVP(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && guardarAjuste(descuentoVP, gananciaExtraVP)}
                            style={{
                              width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700,
                              padding: "6px 10px", textAlign: "right", background: "var(--bg-base)",
                              border: "1px solid var(--border)", borderRadius: 7, color: "#e07070",
                              outline: "none", transition: "border-color 0.15s",
                            }}
                            onFocus={e => e.target.style.borderColor = "#e07070"}
                          />
                          <button onClick={() => guardarAjuste(descuentoVP, gananciaExtraVP)}
                            title="Confirmar descuento"
                            style={{
                              marginTop: 6, width: "100%", padding: "5px 0", borderRadius: 6, cursor: "pointer",
                              background: parseFloat(descuentoVP) !== parseFloat(presSel?.descuento || 0) ? "rgba(224,112,112,0.18)" : "var(--bg-base)",
                              border: `1px solid ${parseFloat(descuentoVP) !== parseFloat(presSel?.descuento || 0) ? "#e07070" : "var(--border)"}`,
                              color: "#e07070", fontSize: 13, fontWeight: 700, transition: "all 0.15s",
                            }}>
                            ✓ Confirmar
                          </button>
                        </div>
                        {/* Ganancia Extra */}
                        <div style={{ flex: 1, padding: "10px 14px", background: gananciaActual > 0 ? "rgba(126,207,138,0.06)" : "transparent" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 13 }}>💵</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>Ganancia extra</span>
                            <span style={{ fontSize: 12, color: "#7ecf8a", fontWeight: 900, fontFamily: "'DM Mono',monospace" }}>+</span>
                          </div>
                          {/* UI - Acción de Confirmación */}
                        <input
                            type="number" min="0" value={gananciaExtraVP} placeholder="0"
                            onChange={e => setGananciaExtraVP(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && guardarAjuste(descuentoVP, gananciaExtraVP)}
                            style={{
                              width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700,
                              padding: "6px 10px", textAlign: "right", background: "var(--bg-base)",
                              border: "1px solid var(--border)", borderRadius: 7, color: "#7ecf8a",
                              outline: "none", transition: "border-color 0.15s",
                            }}
                            onFocus={e => e.target.style.borderColor = "#7ecf8a"}
                          />
                          <button onClick={() => guardarAjuste(descuentoVP, gananciaExtraVP)}
                            title="Confirmar ganancia extra"
                            style={{
                              marginTop: 6, width: "100%", padding: "5px 0", borderRadius: 6, cursor: "pointer",
                              background: parseFloat(gananciaExtraVP) !== parseFloat(presSel?.gananciaExtra || 0) ? "rgba(126,207,138,0.18)" : "var(--bg-base)",
                              border: `1px solid ${parseFloat(gananciaExtraVP) !== parseFloat(presSel?.gananciaExtra || 0) ? "#7ecf8a" : "var(--border)"}`,
                              color: "#7ecf8a", fontSize: 13, fontWeight: 700, transition: "all 0.15s",
                            }}>
                            ✓ Confirmar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Texto de apertura editable */}
                <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>
                    📝 Texto de apertura
                  </div>
                  <textarea value={textoApertura} onChange={e => setTextoApertura(e.target.value)}
                    placeholder="Ej: Estimado cliente, le hacemos llegar el presente presupuesto..."
                    rows={3}
                    style={{
                      width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13,
                      padding: "9px 12px", background: "var(--bg-base)", border: "1px solid var(--border)",
                      color: "var(--text-primary)", borderRadius: 8, outline: "none", resize: "vertical",
                      lineHeight: 1.6, transition: "border-color 0.15s",
                    }}
                    onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"} />
                </div>

                {/* Resumen del presupuesto */}
                <ResumenPresupuesto
                  items={presSel.items}
                  modulos={modulos}
                  costos={costos}
                  getModUsado={(item) => {
                    const base = modulos[item.codigo];
                    const dims = (presSel.dimOverride && presSel.dimOverride[`${item.codigo}-${item.id||0}`]) || base?.dimensiones;
                    return { ...base, dimensiones: dims };
                  }}
                  totalGeneral={presSel.total}
                  mostrarPrecioUnitario={mostrarPrecioUnitario}
                  nombrePresupuesto={presSel.nombre}
                  descuento={presSel.descuento || 0}
                  gananciaExtra={presSel.gananciaExtra || 0}
                />

                {/* Condiciones editables */}
                <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>
                    📋 Condiciones y observaciones
                  </div>
                  <textarea value={condiciones} onChange={e => setCondiciones(e.target.value)}
                    placeholder="Ej: Validez 15 días. Precios sin IVA. Seña del 40% para iniciar fabricación."
                    rows={3}
                    style={{
                      width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13,
                      padding: "9px 12px", background: "var(--bg-base)", border: "1px solid var(--border)",
                      color: "var(--text-primary)", borderRadius: 8, outline: "none", resize: "vertical",
                      lineHeight: 1.6, transition: "border-color 0.15s",
                    }}
                    onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"} />
                </div>

                {/* Guardar textos */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={guardarTextos} style={{
                    padding: "9px 22px", borderRadius: 8, cursor: "pointer",
                    background: guardandoTexto ? "rgba(126,207,138,0.15)" : "var(--accent-soft)",
                    border: `1px solid ${guardandoTexto ? "rgba(126,207,138,0.4)" : "var(--accent-border)"}`,
                    color: guardandoTexto ? "#7ecf8a" : "var(--accent)",
                    fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, transition: "all 0.2s",
                  }}>
                    {guardandoTexto ? "✓ Guardado" : "💾 Guardar cambios"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .vp-layout { align-items: flex-start; }
        @media (max-width: 768px) {
          .vp-layout { flex-direction: column !important; }
          .vp-lista { width: 100% !important; }
          .vp-lista-hidden { display: none !important; }
          .vp-doc { width: 100% !important; }
          .vp-doc-hidden { display: none !important; }
          .vp-back { display: inline-flex !important; }
        }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 11. LISTA DE CORTE
// ══════════════════════════════════════════════════════════════════
// ── ListaCorte ────────────────────────────────────────────────────
const thStyle = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: 700,
  fontFamily: "'DM Mono',monospace",
  color: "var(--text-muted)",
  textAlign: "left",
  padding: "10px 16px",
};
const tdStyle = {
  padding: "12px 16px",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
  color: "var(--text-primary)",
};

function ResumenCompra({ nombreMat, placaLargo, placaAncho, areaNetaM2 }) {
  const areaPlacaM2 = (placaLargo * placaAncho) / 1_000_000;
  const areaConDesp = areaNetaM2 * 1.2;
  const placasNec = Math.ceil(areaConDesp / areaPlacaM2);
  const pct = ((areaNetaM2 / (placasNec * areaPlacaM2)) * 100).toFixed(1);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 20px",
        marginBottom: 16,
        background: "rgba(200,128,42,0.06)",
        border: "1px solid var(--accent-border)",
        borderRadius: 10,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 28 }}>🛒</div>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 700,
            color: "var(--text-muted)",
            marginBottom: 4,
          }}
        >
          Resumen de compra
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Área neta:{" "}
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              color: "var(--text-primary)",
            }}
          >
            {fmtNum(areaNetaM2)} m²
          </span>
          <span style={{ margin: "0 6px", color: "var(--text-muted)" }}>·</span>
          +20%:{" "}
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              color: "var(--text-primary)",
            }}
          >
            {fmtNum(areaConDesp)} m²
          </span>
          <span style={{ margin: "0 6px", color: "var(--text-muted)" }}>·</span>
          Placa:{" "}
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              color: "var(--text-primary)",
            }}
          >
            {placaLargo}×{placaAncho}mm
          </span>
        </div>
        <div style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}>
          Aprovechamiento estimado: {pct}%
        </div>
      </div>
      <div
        style={{
          flexShrink: 0,
          textAlign: "center",
          background: "var(--accent-soft)",
          border: "1px solid var(--accent-border)",
          borderRadius: 10,
          padding: "10px 20px",
          minWidth: 80,
        }}
      >
        <div
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 36,
            fontWeight: 900,
            color: "var(--accent)",
            lineHeight: 1,
          }}
        >
          {placasNec}
        </div>
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            marginTop: 4,
          }}
        >
          placa{placasNec !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

function TablaGrupoCorte({ nombreMat, piezas }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h3
          style={{
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 700,
            color: "var(--accent)",
            margin: 0,
          }}
        >
          🪵 {nombreMat}
        </h3>
        <Badge color="#7090b0">{piezas.length} cortes</Badge>
      </div>
      {/* rsp-scroll-x: scroll táctil en tablas */}
      <div
        className="rsp-scroll-x"
        style={{
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        <div className="rsp-table-inner">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead
              style={{
                background: "var(--accent-soft)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <tr>
                <th style={thStyle}>Módulo</th>
                <th style={thStyle}>Pieza</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cant.</th>
                <th style={{ ...thStyle, textAlign: "center" }}>
                  Medidas reales
                </th>
                <th style={thStyle}>Tapacanto</th>
              </tr>
            </thead>
            <tbody>
              {piezas.map((pz, idx) => (
                <tr
                  key={idx}
                  style={{ transition: "background 0.15s" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--accent-soft)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontFamily: "'DM Mono',monospace",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--accent)",
                        marginRight: 8,
                      }}
                    >
                      {pz.codigo}
                    </span>
                    {pz.modulo}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {pz.piezaNombre}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontFamily: "'DM Mono',monospace",
                      fontWeight: 700,
                      fontSize: 16,
                      color: "var(--accent)",
                    }}
                  >
                    {pz.cantidad}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      fontFamily: "'DM Mono',monospace",
                      color: "#c8d098",
                      fontSize: 14,
                    }}
                  >
                    {pz.d1} × {pz.d2} mm
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    {pz.tcNombre}{" "}
                    <span
                      style={{
                        fontFamily: "'DM Mono',monospace",
                        marginLeft: 4,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {pz.tcLados}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function imprimirCorte(grupos, nombre) {
  const fecha = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  let seccionesHtml = "";
  Object.entries(grupos).forEach(([nombreMat, datos]) => {
    const areaPlacaM2 = (datos.placaLargo * datos.placaAncho) / 1_000_000;
    const areaConDesp = datos.areaNetaM2 * 1.2;
    const placasNec = Math.ceil(areaConDesp / areaPlacaM2);
    seccionesHtml += `<div style="background:#fff8ee;border:1px solid #c8a060;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:16px;"><div style="flex:1"><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#9a7040;margin-bottom:4px">Resumen de compra · ${nombreMat}</div><div style="font-size:12px;color:#5a3a10">Área neta: <b>${fmtNum(
      datos.areaNetaM2
    )} m²</b> · +20%: <b>${fmtNum(areaConDesp)} m²</b> · Placa: <b>${
      datos.placaLargo
    }×${
      datos.placaAncho
    }mm</b></div></div><div style="text-align:center;background:#a07030;color:#fff;border-radius:8px;padding:8px 18px;"><div style="font-size:28px;font-weight:900;line-height:1">${placasNec}</div><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px">placa${
      placasNec !== 1 ? "s" : ""
    }</div></div></div><table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><thead><tr style="background:#e8dcc8"><td colspan="5" style="padding:8px 16px;font-weight:700;font-size:14px;color:#5a3a10;text-transform:uppercase;letter-spacing:0.1em;border-bottom:2px solid #c8a060;">🪵 ${nombreMat} (${
      datos.piezas.length
    } cortes)</td></tr><tr style="background:#f5ede0"><th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:left;border-bottom:2px solid #c8a060">Módulo</th><th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:left;border-bottom:2px solid #c8a060">Pieza</th><th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:right;border-bottom:2px solid #c8a060">Cant.</th><th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:center;border-bottom:2px solid #c8a060">Medidas Reales</th><th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:left;border-bottom:2px solid #c8a060">Tapacanto</th></tr></thead><tbody>${datos.piezas
      .map(
        (pz) =>
          `<tr><td style="padding:10px 16px;border-bottom:1px solid #e8dcc8;font-size:12px;color:#1a0e04;"><span style="font-family:monospace;font-weight:700;color:#8a5a1a;margin-right:6px;">${pz.codigo}</span>${pz.modulo}</td><td style="padding:10px 16px;border-bottom:1px solid #e8dcc8;font-size:12px;font-weight:700;color:#1a0e04;">${pz.piezaNombre}</td><td style="padding:10px 16px;border-bottom:1px solid #e8dcc8;text-align:right;font-family:monospace;font-size:15px;font-weight:700;color:#8a5a1a;">${pz.cantidad}</td><td style="padding:10px 16px;border-bottom:1px solid #e8dcc8;text-align:center;font-family:monospace;font-size:14px;font-weight:700;color:#1a6a30;">${pz.d1} × ${pz.d2} mm</td><td style="padding:10px 16px;border-bottom:1px solid #e8dcc8;font-size:10px;color:#6a5040;">${pz.tcNombre} <span style="font-family:monospace;">${pz.tcLados}</span></td></tr>`
      )
      .join("")}</tbody></table>`;
  });
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Lista de Corte — ${
    nombre || "Trabajo"
  }</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a0e04;padding:32px 40px;max-width:960px;margin:0 auto}@media print{body{padding:16px 20px}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #a07030"><div><div style="font-size:22px;font-weight:900;color:#7a4a10;letter-spacing:-0.5px">CarpiCálc</div><div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;color:#888">Lista de Corte para Taller</div></div><div style="text-align:right">${
    nombre
      ? `<div style="font-size:15px;font-weight:700;color:#1a0e04">${nombre}</div>`
      : ""
  }<div style="font-size:11px;color:#666;margin-top:4px">${fecha}</div></div></div>${seccionesHtml}<script>window.onload=()=>window.print();</script></body></html>`;
  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  } else
    alert(
      "El navegador bloqueó la ventana emergente. Habilitá los popups para este sitio e intentá de nuevo."
    );
}

function ListaCorte({ items, modulos, costos, getModUsado, presupuestos, presupuestoVistaPreviaId }) {
  // Si hay un presupuesto seleccionado en Vista Previa, usarlo en lugar del activo
  const presVP = presupuestoVistaPreviaId ? presupuestos[presupuestoVistaPreviaId] : null;
  const itemsEfectivos = presVP ? (presVP.items || []) : items;
  const getModUsadoEfectivo = presVP
    ? (item) => {
        const base = modulos[item.codigo];
        if (!base) return null;
        const dims = (presVP.dimOverride && presVP.dimOverride[`${item.codigo}-${item.id || 0}`]) || base.dimensiones;
        return { ...base, dimensiones: dims };
      }
    : getModUsado;

  if (itemsEfectivos.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <SectionTitle sub="Lista detallada agrupada por material con medidas listas para la escuadradora">
          Lista de Corte{presVP ? ` — ${presVP.nombre}` : ""}
        </SectionTitle>
        <div style={{ textAlign: "center", padding: "60px 0", borderRadius: 12, border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🪚</div>
          <p style={{ fontSize: 14 }}>No hay piezas para cortar.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>
            Agregá módulos desde{" "}
            <strong style={{ color: "var(--accent)" }}>📋 Presupuesto</strong>{" "}
            para generar la lista.
          </p>
        </div>
      </div>
    );

  }
  const nombreActivo = presVP ? presVP.nombre : (() => {
    const entries = Object.entries(presupuestos || {});
    const codsActuales = itemsEfectivos.map((i) => i.codigo).join(",");
    const match = entries.find(
      ([, p]) => p.items.map((i) => i.codigo).join(",") === codsActuales
    );
    return match ? match[1].nombre : null;
  })();
  const grupos = {};
  itemsEfectivos.forEach((item) => {
    const modBase = modulos[item.codigo];
    if (!modBase) return;
    const modUsado = getModUsadoEfectivo(item);
    const matDef =
      costos.materiales.find((m) => m.tipo === modUsado.material) ||
      costos.materiales[0];
    if (!matDef) return;
    const esp = matDef.espesor || 18;
    const matKey = `${matDef.nombre} (${esp}mm)`;
    if (!grupos[matKey])
      grupos[matKey] = {
        nombre: matDef.nombre,
        espesor: esp,
        placaLargo: matDef.placaLargo ?? 2750,
        placaAncho: matDef.placaAncho ?? 1830,
        areaNetaM2: 0,
        piezas: [],
      };
    modUsado.piezas.forEach((p) => {
      const d1 = resolverDim(
        modUsado.dimensiones[p.usaDim],
        p.offsetEsp,
        p.offsetMm,
        p.divisor || 1,
        esp
      );
      const d2 = resolverDim(
        modUsado.dimensiones[p.usaDim2],
        p.offsetEsp2,
        p.offsetMm2,
        p.divisor2 || 1,
        esp
      );
      const tcDef = costos.tapacanto?.find((t) => t.id === p.tc?.id);
      const cant = p.cantidad * item.cantidad;
      grupos[matKey].areaNetaM2 += (d1 * d2 * cant) / 1_000_000;
      grupos[matKey].piezas.push({
        modulo: modBase.nombre,
        codigo: item.codigo,
        piezaNombre: p.nombre,
        cantidad: cant,
        d1: Math.round(d1),
        d2: Math.round(d2),
        tcNombre: tcDef ? tcDef.nombre : "Sin tapacanto",
        tcLados: p.tc?.id
          ? `[D1:${p.tc.lados1 || 0} | D2:${p.tc.lados2 || 0}]`
          : "-",
      });
    });
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <SectionTitle sub="Medidas reales descontando espesores y offsets, agrupadas para el operario">
          Lista de Corte
        </SectionTitle>
        <button
          onClick={() => imprimirCorte(grupos, nombreActivo)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 16px",
            borderRadius: 6,
            fontSize: 12,
            fontFamily: "'DM Mono',monospace",
            fontWeight: 700,
            letterSpacing: "0.05em",
            cursor: "pointer",
            transition: "all 0.18s",
            background:
              "linear-gradient(135deg,var(--accent),var(--accent-hover))",
            border: "none",
            color: "var(--text-inverted)",
            boxShadow: "0 3px 12px rgba(180,100,20,0.28)",
            flexShrink: 0,
            marginTop: 4,
          }}
        >
          🖨 Imprimir Lista
        </button>
      </div>
      <div className="no-print">
        {Object.entries(grupos).map(([nombreMat, datos]) => (
          <Card
            key={nombreMat}
            className="rsp-card"
            style={{ marginBottom: 20 }}
          >
            <ResumenCompra
              nombreMat={nombreMat}
              placaLargo={datos.placaLargo}
              placaAncho={datos.placaAncho}
              areaNetaM2={datos.areaNetaM2}
            />
            <TablaGrupoCorte nombreMat={nombreMat} piezas={datos.piezas} />
          </Card>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 12. TABLERO DE TRABAJOS
// ══════════════════════════════════════════════════════════════════
// ── TableroKanban ─────────────────────────────────────────────────
function AccionesTrabajo({ id, p, onCambiarEstado, onEliminar, onCargar, compact }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const estadoActual = ESTADOS_TRABAJO.findIndex(e => e.id === (p.estado || "nuevo"));
  const prev = ESTADOS_TRABAJO[estadoActual - 1];
  const next = ESTADOS_TRABAJO[estadoActual + 1];
  const btnBase = {
    fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700,
    borderRadius: 6, cursor: "pointer", padding: compact ? "4px 9px" : "5px 12px",
    transition: "all 0.15s", outline: "none",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
      {prev && (
        <button onClick={() => onCambiarEstado(id, prev.id)} title={`← ${prev.label}`}
          style={{ ...btnBase, background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-subtle)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
          ←
        </button>
      )}
      {next && (
        <button onClick={() => onCambiarEstado(id, next.id)} title={`${next.label} →`}
          style={{ ...btnBase, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,175,55,0.20)"; e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--accent-soft)"; e.currentTarget.style.borderColor = "var(--accent-border)"; }}>
          →
        </button>
      )}
      {confirmDel ? (
        <>
          <button onClick={() => { onEliminar(id); setConfirmDel(false); }}
            style={{ ...btnBase, background: "rgba(200,60,60,0.18)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070" }}>✓</button>
          <button onClick={() => setConfirmDel(false)}
            style={{ ...btnBase, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
        </>
      ) : (
        <button onClick={() => setConfirmDel(true)}
          style={{ ...btnBase, background: "transparent", border: "1px solid rgba(200,60,60,0.25)", color: "#e07070" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,60,60,0.12)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>×</button>
      )}
    </div>
  );
}

function TarjetaKanban({ id, p, onCambiarEstado, onEliminar, onCargar, modulos, costos }) {
  const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
  const esProduccion = (p.estado || "nuevo") === "produccion";
  return (
    <div className="hover-lift anim-fadeup" style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10,
      padding: "12px 13px", marginBottom: 8,
      boxShadow: "var(--shadow-sm)", borderLeft: `3px solid ${est.color}`,
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-strong)"}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.borderLeftColor = est.color; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: est.color, flexShrink: 0, marginTop: 4, boxShadow: `0 0 6px ${est.color}80` }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>{p.nombre}</span>
      </div>
      {p.cliente && p.cliente.nombre && (
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2, paddingLeft: 15, fontWeight: 300 }}>
          👤 {p.cliente.nombre}
          {p.cliente.tel && <span style={{ color: "var(--text-muted)", marginLeft: 5 }}>· {p.cliente.tel}</span>}
        </div>
      )}
      <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", marginBottom: 10, paddingLeft: 15, fontWeight: 300 }}>
        {fmtFecha(parseInt(id))} · {p.items.length} mód.
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(p.total)}</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          {esProduccion && modulos && costos && (
            <button onClick={() => generarFichaObra(id, p, modulos, costos, leerPerfil())}
              style={{ padding: "4px 9px", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(200,80,48,0.15)", border: "1px solid rgba(200,80,48,0.35)", color: "#c85030", borderRadius: 5, cursor: "pointer" }}>
              📋 Ficha
            </button>
          )}
          <AccionesTrabajo id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} compact />
        </div>
      </div>
    </div>
  );
}

function FilaLista({ id, p, onCambiarEstado, onEliminar, onCargar, modulos, costos, onActualizarPresupuesto }) {
  const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
  const [expandido, setExpandido] = useState(false);
  const [tabActiva, setTabActiva] = useState("presupuesto");

  const tabs = [
    { id: "presupuesto", label: "Presupuesto", icon: "📋" },
    { id: "corte",       label: "Corte",       icon: "✂" },
    { id: "modulos",     label: "Módulos",     icon: "🪵" },
    { id: "ficha",       label: "Ficha",       icon: "📄" },
  ];

  return (
    <div className="anim-fadeup" style={{
      border: `1px solid ${expandido ? "var(--accent-border)" : "var(--border)"}`,
      borderRadius: 10, overflow: "visible", transition: "border-color 0.18s",
      background: "var(--bg-surface)", marginBottom: 2,
    }}>
      {/* Fila principal — click para expandir */}
      <div className="lista-fila" style={{
        display: "grid", gridTemplateColumns: "1fr 120px 130px auto",
        alignItems: "center", gap: 12, padding: "12px 16px",
        cursor: "pointer", transition: "background 0.12s",
        borderRadius: expandido ? "10px 10px 0 0" : 10,
        borderBottom: expandido ? "1px solid var(--border)" : "none",
      }}
        onClick={() => setExpandido(v => !v)}
        onMouseEnter={e => e.currentTarget.style.background = "var(--accent-soft)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", background: `${est.color}22`, color: est.color, border: `1px solid ${est.color}44`, borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>
              {est.icon} {est.label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 300 }}>
            {fmtFecha(parseInt(id))} · {p.items.length} mód.
            {p.cliente?.nombre && <span> · 👤 {p.cliente.nombre}</span>}
          </div>
          {/* Mobile row */}
          <div className="lista-mobile-row" style={{ display: "none", marginTop: 8, alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(p.total)}</span>
            <select value={p.estado || "nuevo"} onChange={e => { e.stopPropagation(); onCambiarEstado(id, e.target.value); }}
              onClick={e => e.stopPropagation()}
              style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "4px 6px", background: `${est.color}18`, border: `1px solid ${est.color}44`, color: est.color, borderRadius: 6, cursor: "pointer", outline: "none", fontWeight: 700 }}>
              {ESTADOS_TRABAJO.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
            </select>
          </div>
        </div>
        <div className="lista-desktop-col" style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: "#7ecf8a", textAlign: "right" }}>
          {fmtPeso(p.total)}
        </div>
        <select className="lista-desktop-col" value={p.estado || "nuevo"}
          onChange={e => { e.stopPropagation(); onCambiarEstado(id, e.target.value); }}
          onClick={e => e.stopPropagation()}
          style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "5px 6px", background: `${est.color}18`, border: `1px solid ${est.color}44`, color: est.color, borderRadius: 6, cursor: "pointer", outline: "none", fontWeight: 700 }}>
          {ESTADOS_TRABAJO.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
        </select>
        <div className="lista-desktop-col" onClick={e => e.stopPropagation()}>
          <AccionesTrabajo id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} compact />
        </div>
      </div>

      {/* Panel expandido */}
      {expandido && (
        <div style={{ padding: "0 0 16px 0" }}>
          {/* Tabs internas */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", padding: "0 16px" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTabActiva(t.id)} style={{
                padding: "10px 16px", background: "transparent", border: "none",
                borderBottom: `2px solid ${tabActiva === t.id ? "var(--accent)" : "transparent"}`,
                color: tabActiva === t.id ? "var(--accent)" : "var(--text-muted)",
                fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
                transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5,
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "16px 16px 0" }}>
            {tabActiva === "presupuesto" && (
              <TabPresupuestoTrabajo p={p} modulos={modulos} costos={costos} />
            )}
            {tabActiva === "corte" && (
              <TabCorteTrabajo p={p} modulos={modulos} costos={costos} />
            )}
            {tabActiva === "modulos" && (
              <TabModulosTrabajo id={id} p={p} modulos={modulos} costos={costos} onActualizar={onActualizarPresupuesto} />
            )}
            {tabActiva === "ficha" && modulos && costos && (
              <div style={{ textAlign: "center", paddingTop: 8 }}>
                <button onClick={() => generarFichaObra(id, p, modulos, costos, leerPerfil())}
                  style={{
                    padding: "12px 28px", borderRadius: 8, cursor: "pointer",
                    background: "rgba(200,80,48,0.12)", border: "1px solid rgba(200,80,48,0.35)",
                    color: "#c85030", fontFamily: "'DM Mono',monospace", fontSize: 12,
                    fontWeight: 700, letterSpacing: "0.08em", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(200,80,48,0.22)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(200,80,48,0.12)"}>
                  📋 Generar Ficha de Obra — lista para imprimir o compartir
                </button>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10, fontFamily: "'DM Mono',monospace" }}>
                  Incluye módulos, lista de corte, materiales y estado de cobros
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tabs internas de FilaLista ────────────────────────────────────
function TabPresupuestoTrabajo({ p, modulos, costos }) {
  if (!p.items || p.items.length === 0) return <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Sin módulos cargados.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {p.items.map((item, idx) => {
        const modBase = modulos[item.codigo];
        if (!modBase) return null;
        const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
        const modUsado = { ...modBase, dimensiones: dims };
        const calc = calcularModulo(modUsado, costos);
        return (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-subtle)", borderRadius: 8, gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>{item.codigo}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginLeft: 8 }}>{modBase.nombre}</span>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
                {dims.ancho}×{dims.profundidad}×{dims.alto} mm · ×{item.cantidad}
              </div>
            </div>
            {calc && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#7ecf8a", flexShrink: 0 }}>{fmtPeso(calc.total * item.cantidad)}</span>}
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--separator)" }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 900, color: "#7ecf8a" }}>{fmtPeso(p.total)}</span>
      </div>
    </div>
  );
}

function TabCorteTrabajo({ p, modulos, costos }) {
  if (!p.items || p.items.length === 0) return <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Sin módulos cargados.</div>;
  const piezas = [];
  p.items.forEach(item => {
    const modBase = modulos[item.codigo];
    if (!modBase) return;
    const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
    const modUsado = { ...modBase, dimensiones: dims };
    const matDef = costos.materiales.find(m => m.tipo === modUsado.material) || costos.materiales[0];
    const esp = matDef?.espesor || 18;
    const dimMap = { ancho: dims.ancho, profundidad: dims.profundidad, alto: dims.alto };
    modUsado.piezas.forEach(pz => {
      const d1 = pz.especial ? (parseInt(pz.dimLibre1)||0) : Math.round(resolverDim(dimMap[pz.usaDim], pz.offsetEsp, pz.offsetMm, pz.divisor||1, esp));
      const d2 = pz.especial ? (parseInt(pz.dimLibre2)||0) : Math.round(resolverDim(dimMap[pz.usaDim2], pz.offsetEsp2, pz.offsetMm2, pz.divisor2||1, esp));
      piezas.push({ nombre: pz.nombre, modulo: `${item.codigo} ${modBase.nombre}`, d1, d2, cant: (pz.cantidad||1)*(item.cantidad||1) });
    });
  });
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "var(--accent-soft)" }}>
            {["Módulo","Pieza","Alto","Ancho","Cant"].map(h => (
              <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, borderBottom: "1px solid var(--border)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {piezas.map((pz, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--separator)" }}>
              <td style={{ padding: "6px 10px", fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>{pz.modulo}</td>
              <td style={{ padding: "6px 10px", fontWeight: 600, color: "var(--text-primary)" }}>{pz.nombre}</td>
              <td style={{ padding: "6px 10px", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#7ecf8a" }}>{pz.d1}</td>
              <td style={{ padding: "6px 10px", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#7ecf8a" }}>{pz.d2}</td>
              <td style={{ padding: "6px 10px", fontFamily: "'DM Mono',monospace", fontWeight: 900, color: "var(--accent)" }}>×{pz.cant}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabModulosTrabajo({ id, p, modulos, costos, onActualizar }) {
  const [editandoIdx, setEditandoIdx] = useState(null);
  const [dimsEdit, setDimsEdit] = useState({});

  const abrirEdit = (idx, item) => {
    const modBase = modulos[item.codigo];
    const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase?.dimensiones || { ancho: 600, profundidad: 550, alto: 700 };
    setDimsEdit({ ...dims });
    setEditandoIdx(idx);
  };

  const guardarDims = (idx, item) => {
    const keyId = `${item.codigo}-${item.id || 0}`;
    const nuevoOverride = { ...(p.dimOverride || {}), [keyId]: { ...dimsEdit } };
    onActualizar(id, { dimOverride: nuevoOverride });
    setEditandoIdx(null);
  };

  const inp = { fontFamily: "'DM Mono',monospace", fontSize: 13, padding: "6px 9px", background: "var(--bg-base)", border: "1px solid var(--accent-border)", color: "var(--text-primary)", borderRadius: 6, outline: "none", width: 80, textAlign: "center" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
        Los cambios aplican solo a este presupuesto. El catálogo no se modifica.
      </p>
      {p.items.map((item, idx) => {
        const modBase = modulos[item.codigo];
        if (!modBase) return null;
        const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || modBase.dimensiones;
        const estaEditando = editandoIdx === idx;
        const cat = CATEGORIAS_DEFAULT.find(c => c.id === (modBase.categoria || "otros")) || CATEGORIAS_DEFAULT[5];

        return (
          <div key={idx} style={{
            background: estaEditando ? "var(--accent-soft)" : "var(--bg-subtle)",
            border: `1px solid ${estaEditando ? "var(--accent-border)" : "var(--border)"}`,
            borderRadius: 10, padding: "12px 14px", transition: "all 0.15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: estaEditando ? 14 : 0, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, background: `${cat.color}20`, color: cat.color, border: `1px solid ${cat.color}30`, borderRadius: 4, padding: "1px 7px", fontFamily: "'DM Mono',monospace" }}>
                {cat.icon} {item.codigo}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{modBase.nombre}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--text-muted)" }}>
                {dims.ancho}×{dims.profundidad}×{dims.alto} mm · ×{item.cantidad}
              </span>
              {!estaEditando && (
                <button onClick={() => abrirEdit(idx, item)}
                  style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                  ✎ Editar dimensiones
                </button>
              )}
            </div>

            {estaEditando && (
              <div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
                  {["ancho", "profundidad", "alto"].map(dim => (
                    <div key={dim} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                      <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{dim}</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input type="number" value={dimsEdit[dim]} onChange={e => setDimsEdit(d => ({ ...d, [dim]: parseInt(e.target.value) || 0 }))}
                          style={inp} />
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>mm</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => guardarDims(idx, item)}
                    style={{ padding: "7px 18px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                    ✓ Guardar
                  </button>
                  <button onClick={() => setEditandoIdx(null)}
                    style={{ padding: "7px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    Cancelar
                  </button>
                  {p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`] && (
                    <button onClick={() => {
                      const keyId = `${item.codigo}-${item.id || 0}`;
                      const nuevoOverride = { ...(p.dimOverride || {}) };
                      delete nuevoOverride[keyId];
                      onActualizar(id, { dimOverride: nuevoOverride });
                      setEditandoIdx(null);
                    }}
                      style={{ padding: "7px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid rgba(200,60,60,0.25)", color: "#e07070" }}>
                      ↩ Restaurar original
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
function TableroKanban({ presupuestos, onCambiarEstado, onEliminar, onCargar, modulos, costos, onActualizarPresupuesto }) {
  const [vistaTab, setVistaTab] = useState("lista");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [orden, setOrden] = useState("fecha_desc");

  const ORDENES = [
    { id: "fecha_desc",  label: "Más reciente",  fn: (a, b) => b[0] - a[0] },
    { id: "fecha_asc",   label: "Más antiguo",   fn: (a, b) => a[0] - b[0] },
    { id: "total_desc",  label: "Mayor monto",   fn: (a, b) => b[1].total - a[1].total },
    { id: "total_asc",   label: "Menor monto",   fn: (a, b) => a[1].total - b[1].total },
    { id: "nombre_asc",  label: "Nombre A→Z",    fn: (a, b) => a[1].nombre.localeCompare(b[1].nombre) },
  ];

  const fnOrden = ORDENES.find(o => o.id === orden)?.fn || ORDENES[0].fn;
  const entries = Object.entries(presupuestos).sort(fnOrden);
  const filtradas = filtroEstado === "todos" ? entries : entries.filter(([, p]) => (p.estado || "nuevo") === filtroEstado);

  const btnVista = (id, icon, label) => (
    <button onClick={() => setVistaTab(id)} style={{
      padding: "6px 14px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace",
      fontWeight: 700, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6,
      background: vistaTab === id ? "var(--accent-soft)" : "transparent",
      border: `1px solid ${vistaTab === id ? "var(--accent-border)" : "var(--border)"}`,
      color: vistaTab === id ? "var(--accent)" : "var(--text-muted)",
    }}>{icon} {label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <SectionTitle sub="Seguí el avance de cada trabajo de un vistazo">
          Tablero de Trabajos
        </SectionTitle>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
          {/* Selector de orden */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Ordenar</span>
            <select value={orden} onChange={e => setOrden(e.target.value)} style={{
              fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
              padding: "6px 10px", borderRadius: 6, cursor: "pointer", outline: "none",
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", transition: "border-color 0.15s",
            }}
              onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            >
              {ORDENES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          {btnVista("kanban", "⊞", "Kanban")}
          {btnVista("lista", "☰", "Lista")}
        </div>
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", borderRadius: 12, border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <p style={{ fontSize: 14 }}>No hay trabajos guardados todavía.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>Guardá un presupuesto desde <strong style={{ color: "var(--accent)" }}>📋 Presupuesto</strong> para verlo acá.</p>
        </div>
      ) : (
        <>
          {/* Contadores siempre visibles */}
          <div className="filtros-estado" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ESTADOS_TRABAJO.map(est => {
              const count = entries.filter(([, p]) => (p.estado || "nuevo") === est.id).length;
              const active = filtroEstado === est.id;
              return (
                <button key={est.id} onClick={() => setFiltroEstado(active ? "todos" : est.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                    background: active ? `${est.color}25` : count > 0 ? `${est.color}10` : "var(--bg-surface)",
                    border: `1px solid ${active ? est.color : count > 0 ? est.color + "44" : "var(--border)"}`,
                    transition: "all 0.15s",
                  }}>
                  <span style={{ fontSize: 14 }}>{est.icon}</span>
                  <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 900, color: count > 0 ? est.color : "var(--text-muted)", lineHeight: 1 }}>{count}</span>
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: active ? est.color : "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{est.label}</span>
                </button>
              );
            })}
            {filtroEstado !== "todos" && (
              <button onClick={() => setFiltroEstado("todos")}
                style={{ padding: "7px 12px", borderRadius: 8, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>
                × Ver todos
              </button>
            )}
          </div>

          {/* ── Vista KANBAN ── */}
          {vistaTab === "kanban" && (
            <div className="kanban-board" style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: 8 }}>
              {ESTADOS_TRABAJO.filter(est => filtroEstado === "todos" || filtroEstado === est.id).map(est => {
                const cards = entries.filter(([, p]) => (p.estado || "nuevo") === est.id);
                return (
                  <div key={est.id} className="kanban-col" style={{ flex: "0 0 210px", minWidth: 210 }}>
                    <div className="kanban-col-header" style={{
                      padding: "9px 13px", borderRadius: "10px 10px 0 0",
                      background: `${est.color}20`, border: `1px solid ${est.color}40`, borderBottom: "none",
                      display: "flex", alignItems: "center", gap: 7,
                    }}>
                      <span style={{ fontSize: 15 }}>{est.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: est.color, fontFamily: "'DM Mono',monospace", flex: 1 }}>{est.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace", background: `${est.color}30`, color: est.color, borderRadius: 999, padding: "1px 7px" }}>{cards.length}</span>
                    </div>
                    <div style={{ minHeight: 80, maxHeight: 520, overflowY: "auto", padding: "8px 8px 4px", border: `1px solid ${est.color}40`, borderRadius: "0 0 10px 10px", background: "var(--bg-subtle)" }}>
                      {cards.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>Sin trabajos</div>
                      ) : (
                        cards.map(([id, p]) => (
                          <TarjetaKanban key={id} id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} modulos={modulos} costos={costos} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Vista LISTA ── */}
          {vistaTab === "lista" && (
            <Card className="rsp-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="lista-header" style={{ display: "grid", gridTemplateColumns: "1fr 120px 130px auto", gap: 12, padding: "9px 16px", background: "var(--accent-soft)", borderBottom: "1px solid var(--border)" }}>
                {["Trabajo / Cliente", "Total", "Estado", "Acciones"].map(h => (
                  <div key={h} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>{h}</div>
                ))}
              </div>
              {filtradas.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)", fontSize: 13 }}>No hay trabajos en este estado.</div>
              ) : (
                filtradas.map(([id, p]) => (
                  <FilaLista key={id} id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} modulos={modulos} costos={costos} onActualizarPresupuesto={onActualizarPresupuesto} />
                ))
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 13. CAJA
// ══════════════════════════════════════════════════════════════════
// ── PanelCaja ─────────────────────────────────────────────────────
function FilaCaja({ id, p, onActualizar, modulos, costos, autoAbrir = false }) {
  const [abierto, setAbierto] = useState(autoAbrir); // auto-abrir si viene de "Ver Rentabilidad"
  const [montoCobro, setMontoCobro] = useState("");
  const [conceptoCobro, setConceptoCobro] = useState("Seña");
  const [costoReal, setCostoReal] = useState(p.costoReal ?? "");
  const [diasVigencia, setDiasVigencia] = useState(p.diasVigencia ?? 15);
  const [editandoCosto, setEditandoCosto] = useState(false);
  const [editandoVigencia, setEditandoVigencia] = useState(false);
  const [descuento, setDescuento] = useState(p.descuento ?? "");
  const [gananciaExtra, setGananciaExtra] = useState(p.gananciaExtra ?? "");

  // Costo automático: recalcular con los costos actuales del sistema
  const costoAutomatico = (() => {
    if (!p.items || !modulos || !costos) return 0;
    return Math.round(p.items.reduce((acc, item) => {
      const base = modulos[item.codigo];
      if (!base) return acc;
      const dims = (p.dimOverride && p.dimOverride[`${item.codigo}-${item.id || 0}`]) || base.dimensiones;
      const calc = calcularModulo({ ...base, dimensiones: dims }, costos);
      if (!calc) return acc;
      return acc + calc.costoBase * item.cantidad; // solo costo sin ganancia
    }, 0));
  })();

  // Prioridad: si el usuario ingresó un costo real manual, se usa ese. Si no, el automático.
  const costoEfectivo = p.costoReal > 0 ? p.costoReal : costoAutomatico;

  // Total ajustado: precio base + ganancia extra − descuento
  const descuentoVal = parseFloat(p.descuento) || 0;
  const gananciaExtraVal = parseFloat(p.gananciaExtra) || 0;
  const totalAjustado = p.total + gananciaExtraVal - descuentoVal;

  const cobros = p.cobros || [];
  const totalCobrado = cobros.reduce((a, c) => a + c.monto, 0);
  const saldoPendiente = Math.max(0, totalAjustado - totalCobrado);
  const totalValido = totalAjustado > 0;
  const pctCobrado = totalValido ? Math.min(100, Math.round((totalCobrado / totalAjustado) * 100)) : 0;

  // Margen calculado sobre el total ajustado vs el costo efectivo
  const margen = (totalValido && costoEfectivo > 0)
    ? Math.round(((totalAjustado - costoEfectivo) / totalAjustado) * 100)
    : null;

  // Vencimiento: solo relevante si está enviado
  const diasTranscurridos = Math.floor((Date.now() - parseInt(id)) / 86400000);
  const diasRestantes = (p.diasVigencia || 15) - diasTranscurridos;
  const vencido = diasRestantes < 0;
  const porVencer = diasRestantes >= 0 && diasRestantes <= 3;
  const estadoVigencia = p.estado === "enviado" || p.estado === "nuevo"
    ? vencido ? "vencido" : porVencer ? "por_vencer" : "vigente"
    : null;

  const agregarCobro = () => {
    const monto = parseFloat(montoCobro);
    if (!monto || isNaN(monto) || monto <= 0) return;
    const nuevoCobro = { fecha: Date.now(), monto, concepto: conceptoCobro };
    onActualizar(id, { cobros: [...cobros, nuevoCobro] });
    setMontoCobro("");
  };

  const eliminarCobro = (idx) => {
    onActualizar(id, { cobros: cobros.filter((_, i) => i !== idx) });
  };

  const guardarCostoReal = () => {
    const v = parseFloat(costoReal);
    onActualizar(id, { costoReal: isNaN(v) ? 0 : v });
    setEditandoCosto(false);
  };

  const guardarVigencia = () => {
    const v = parseInt(diasVigencia);
    onActualizar(id, { diasVigencia: isNaN(v) ? 15 : v });
    setEditandoVigencia(false);
  };

  const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];

  const inputSm = {
    fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "5px 9px",
    background: "var(--bg-base)", border: "1px solid var(--accent-border)",
    color: "var(--text-primary)", borderRadius: 6, outline: "none",
  };

  return (
    <div id={`filacaja-${id}`} className="hover-lift anim-fadeup" style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 12, overflow: "visible", transition: "border-color 0.18s",
      borderLeft: `3px solid ${est.color}`,
    }}>
      {/* Cabecera */}
      <div style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
        onClick={() => setAbierto(a => !a)}
        onMouseEnter={e => e.currentTarget.parentElement.style.borderColor = "var(--border-strong)"}
        onMouseLeave={e => e.currentTarget.parentElement.style.borderColor = "var(--border)"}
      >
        {/* Info principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", background: `${est.color}22`, color: est.color, border: `1px solid ${est.color}44`, borderRadius: 4, padding: "2px 7px" }}>
              {est.icon} {est.label}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{p.nombre}</span>
            {p.cliente?.nombre && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· 👤 {p.cliente.nombre}</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 300 }}>
            {fmtFecha(parseInt(id))} · {p.items.length} mód.
          </div>
        </div>

        {/* Vencimiento */}
        {estadoVigencia && (
          <div style={{
            fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, padding: "3px 9px",
            borderRadius: 6, flexShrink: 0,
            background: vencido ? "rgba(200,60,60,0.15)" : porVencer ? "rgba(200,160,42,0.15)" : "rgba(100,180,80,0.10)",
            color: vencido ? "#e07070" : porVencer ? "#c8a02a" : "#7ecf8a",
            border: `1px solid ${vencido ? "rgba(200,60,60,0.35)" : porVencer ? "rgba(200,160,42,0.35)" : "rgba(100,180,80,0.25)"}`,
          }}>
            {vencido ? `⚠ Vencido hace ${Math.abs(diasRestantes)}d` : `📅 Vence en ${diasRestantes}d`}
          </div>
        )}

        {/* Barra cobro */}
        <div style={{ flexShrink: 0, textAlign: "right", minWidth: 120 }}>
          <div style={{ marginBottom: 4, textAlign: "right" }}>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: saldoPendiente > 0 ? "#e07070" : "#7ecf8a" }}>
              {fmtPeso(saldoPendiente > 0 ? saldoPendiente : 0)} pendiente
            </span>
          </div>
          <div style={{ height: 5, background: "var(--bg-subtle)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pctCobrado}%`, background: pctCobrado >= 100 ? "#7ecf8a" : "var(--accent)", borderRadius: 999, transition: "width 0.4s" }} />
          </div>
        </div>

        {/* Total y margen */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700, color: totalValido ? "#7ecf8a" : "#e07070" }}>
            {fmtPeso(p.total)}
          </div>
          {!totalValido && (
            <div style={{ fontSize: 10, color: "#e07070", fontFamily: "'DM Mono',monospace" }}>⚠ Revisar costos</div>
          )}
          {margen !== null && totalValido && (
            <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: margen >= 30 ? "#7ecf8a" : margen >= 15 ? "#c8a02a" : "#e07070", fontWeight: 700 }}>
              {margen}% margen
            </div>
          )}
        </div>

        <span style={{ color: "var(--text-muted)", fontSize: 12, flexShrink: 0 }}>{abierto ? "▲" : "▼"}</span>
      </div>

      {/* Panel expandido */}
      {abierto && (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid var(--separator)", paddingTop: 16 }}>
          {/* Botón Ficha de Obra — solo en producción */}
          {(p.estado === "produccion") && modulos && costos && (
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => generarFichaObra(id, p, modulos, costos, leerPerfil())}
                style={{
                  width: "100%", padding: "10px 16px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(200,80,48,0.12)", border: "1px solid rgba(200,80,48,0.35)",
                  color: "#c85030", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(200,80,48,0.22)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(200,80,48,0.12)"}>
                📋 Generar Ficha de Obra — lista para imprimir o compartir
              </button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }} className="rsp-grid-1">

            {/* 1. Cobros */}
            <div>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 10, fontWeight: 700 }}>
                💳 Cobros recibidos
              </div>
              {cobros.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Sin cobros registrados</div>
              ) : (
                <div style={{ marginBottom: 10 }}>
                  {cobros.map((c, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--separator)" }}>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{c.concepto}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>{fmtFecha(c.fecha)}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(c.monto)}</span>
                        <button onClick={() => eliminarCobro(i)}
                          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, padding: 0 }}>×</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>SALDO PENDIENTE</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: saldoPendiente > 0 ? "#e07070" : "#7ecf8a" }}>
                      {fmtPeso(Math.max(0, saldoPendiente))}
                    </span>
                  </div>
                </div>
              )}
              {/* Nuevo cobro */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <select value={conceptoCobro} onChange={e => setConceptoCobro(e.target.value)}
                  style={{ ...inputSm, flex: "0 0 auto" }}>
                  {["Seña","Anticipo materiales","Cuota","Saldo final","Otro"].map(c => <option key={c}>{c}</option>)}
                </select>
                <input type="number" value={montoCobro} onChange={e => setMontoCobro(e.target.value)}
                  placeholder="Monto $" onKeyDown={e => e.key === "Enter" && agregarCobro()}
                  style={{ ...inputSm, flex: 1, minWidth: 80 }} />
                <button onClick={agregarCobro}
                  style={{ padding: "5px 12px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                  + Cobro
                </button>
              </div>
            </div>

            {/* 2. Rentabilidad */}
            <div>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 10, fontWeight: 700 }}>
                📈 Rentabilidad
              </div>
              <div style={{ marginBottom: 12 }}>

                {/* LÓGICA - Precios Tachados y PDF */}
                {(() => {
                  const tv = calcularTotalVisual(p.total, p.descuento, p.gananciaExtra);
                  return (
                    <>
                      {/* Precio base — con tachado elegante si hay descuento */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tv.hayDescuento ? 4 : 10 }}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {tv.hayDescuento ? "Precio original" : "Precio base"}
                        </span>
                        <span style={{
                          fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700,
                          color: tv.hayDescuento ? "var(--text-muted)" : "#7ecf8a",
                          textDecoration: tv.hayDescuento ? "line-through" : "none",
                          opacity: tv.hayDescuento ? 0.55 : 1,
                          letterSpacing: tv.hayDescuento ? "0.02em" : "normal",
                        }}>
                          {fmtPeso(tv.totalOriginal)}
                        </span>
                      </div>
                      {/* Total con descuento — solo si hay descuento */}
                      {tv.hayDescuento && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#e07070" }}>🏷 Con descuento</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 900, color: "#7ecf8a" }}>
                            {fmtPeso(tv.totalFinal)}
                          </span>
                        </div>
                      )}
                      {/* Total con ganancia — solo si hay ganancia (sin mostrar el original) */}
                      {tv.hayGanancia && !tv.hayDescuento && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#7ecf8a" }}>💵 Total final</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 900, color: "#7ecf8a" }}>
                            {fmtPeso(tv.totalFinal)}
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* UI - Acción de Confirmación: campos de ajuste con botón ✔ */}
                <div style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden", marginBottom: 12 }}>
                  {/* Fila Descuento */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
                    background: descuentoVal > 0 ? "rgba(224,112,112,0.08)" : "var(--bg-subtle)",
                    borderBottom: "1px solid var(--border)",
                  }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>🏷</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1, fontWeight: 600 }}>Descuento</span>
                    <span style={{ fontSize: 13, color: "#e07070", fontFamily: "'DM Mono',monospace", fontWeight: 900 }}>−</span>
                    <input
                      type="number" min="0" value={descuento} placeholder="0"
                      onChange={e => setDescuento(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { onActualizar(id, { descuento: parseFloat(descuento) || 0, gananciaExtra: parseFloat(gananciaExtra) || 0 }); e.target.blur(); } }}
                      style={{
                        fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700,
                        padding: "4px 8px", width: 100, textAlign: "right",
                        background: "var(--bg-base)", border: "1px solid var(--border)",
                        borderRadius: 6, color: "#e07070", outline: "none",
                      }}
                      onFocus={e => e.target.style.borderColor = "#e07070"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                    {/* UI - Acción de Confirmación */}
                    <button
                      title="Confirmar descuento"
                      onClick={() => onActualizar(id, { descuento: parseFloat(descuento) || 0, gananciaExtra: parseFloat(gananciaExtra) || 0 })}
                      style={{
                        width: 26, height: 26, borderRadius: 6, cursor: "pointer", flexShrink: 0,
                        background: parseFloat(descuento) !== descuentoVal ? "rgba(224,112,112,0.2)" : "var(--bg-base)",
                        border: `1px solid ${parseFloat(descuento) !== descuentoVal ? "#e07070" : "var(--border)"}`,
                        color: "#e07070", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}>
                      ✓
                    </button>
                  </div>
                  {/* Fila Ganancia Extra */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
                    background: gananciaExtraVal > 0 ? "rgba(126,207,138,0.08)" : "var(--bg-subtle)",
                  }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>💵</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1, fontWeight: 600 }}>Ganancia extra</span>
                    <span style={{ fontSize: 13, color: "#7ecf8a", fontFamily: "'DM Mono',monospace", fontWeight: 900 }}>+</span>
                    <input
                      type="number" min="0" value={gananciaExtra} placeholder="0"
                      onChange={e => setGananciaExtra(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { onActualizar(id, { descuento: parseFloat(descuento) || 0, gananciaExtra: parseFloat(gananciaExtra) || 0 }); e.target.blur(); } }}
                      style={{
                        fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700,
                        padding: "4px 8px", width: 100, textAlign: "right",
                        background: "var(--bg-base)", border: "1px solid var(--border)",
                        borderRadius: 6, color: "#7ecf8a", outline: "none",
                      }}
                      onFocus={e => e.target.style.borderColor = "#7ecf8a"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                    {/* UI - Acción de Confirmación */}
                    <button
                      title="Confirmar ganancia extra"
                      onClick={() => onActualizar(id, { descuento: parseFloat(descuento) || 0, gananciaExtra: parseFloat(gananciaExtra) || 0 })}
                      style={{
                        width: 26, height: 26, borderRadius: 6, cursor: "pointer", flexShrink: 0,
                        background: parseFloat(gananciaExtra) !== gananciaExtraVal ? "rgba(126,207,138,0.2)" : "var(--bg-base)",
                        border: `1px solid ${parseFloat(gananciaExtra) !== gananciaExtraVal ? "#7ecf8a" : "var(--border)"}`,
                        color: "#7ecf8a", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}>
                      ✓
                    </button>
                  </div>
                </div>

                {/* Costo calculado automáticamente */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Costo calculado
                    {p.costoReal > 0 && <span style={{ fontSize: 10, color: "#c8a02a", marginLeft: 6 }}>(ignorado)</span>}
                  </span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: p.costoReal > 0 ? "var(--text-muted)" : "#e07070", textDecoration: p.costoReal > 0 ? "line-through" : "none", opacity: p.costoReal > 0 ? 0.5 : 1 }}>
                    {fmtPeso(costoAutomatico)}
                  </span>
                </div>

                {/* Costo real manual — prioridad sobre el automático */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Costo real (manual)
                    {p.costoReal > 0 && <span style={{ fontSize: 10, color: "#7ecf8a", marginLeft: 6 }}>● activo</span>}
                  </span>
                  {editandoCosto ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <input type="number" value={costoReal} onChange={e => setCostoReal(e.target.value)}
                        autoFocus onKeyDown={e => e.key === "Enter" && guardarCostoReal()}
                        style={{ ...inputSm, width: 100 }} />
                      <button onClick={guardarCostoReal}
                        style={{ padding: "4px 8px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>✓</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditandoCosto(true)}
                      style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: p.costoReal > 0 ? "#e07070" : "var(--text-muted)", background: "none", border: "1px dashed var(--border)", borderRadius: 5, padding: "2px 8px", cursor: "pointer" }}>
                      {p.costoReal > 0 ? fmtPeso(p.costoReal) : "Ingresar →"}
                    </button>
                  )}
                </div>

                {/* Resultado: ganancia neta y semáforo */}
                {margen !== null && totalValido && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid var(--separator)" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Ganancia neta</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: (totalAjustado - costoEfectivo) >= 0 ? "#7ecf8a" : "#e07070" }}>
                        {fmtPeso(totalAjustado - costoEfectivo)}
                      </span>
                    </div>
                    <div style={{ height: 8, background: "var(--bg-subtle)", borderRadius: 999, overflow: "hidden", marginTop: 8 }}>
                      <div style={{
                        height: "100%", borderRadius: 999, transition: "width 0.4s",
                        width: `${Math.max(0, Math.min(100, margen))}%`,
                        background: margen >= 30 ? "#7ecf8a" : margen >= 15 ? "#c8a02a" : "#e07070",
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontFamily: "'DM Mono',monospace" }}>
                      {margen >= 30 ? "✅ Margen saludable" : margen >= 15 ? "⚠ Margen ajustado" : "🔴 Margen bajo — revisar costos"}
                    </div>
                  </>
                )}
                {!totalValido && (
                  <div style={{ fontSize: 11, color: "#e07070", fontFamily: "'DM Mono',monospace", padding: "6px 0", borderTop: "1px solid var(--separator)" }}>
                    ⚠ El total del presupuesto es negativo. Revisá los costos en 💰 Costos.
                  </div>
                )}
                {margen === null && totalValido && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                    Margen calculado automáticamente. Podés ingresar un costo real para mayor precisión.
                  </div>
                )}
              </div>
            </div>

            {/* 3. Vigencia */}
            <div>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 10, fontWeight: 700 }}>
                📅 Vigencia del presupuesto
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Válido por</span>
                  {editandoVigencia ? (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <input type="number" value={diasVigencia} onChange={e => setDiasVigencia(e.target.value)}
                        autoFocus onKeyDown={e => e.key === "Enter" && guardarVigencia()}
                        style={{ ...inputSm, width: 60 }} />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>días</span>
                      <button onClick={guardarVigencia}
                        style={{ padding: "4px 8px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>✓</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditandoVigencia(true)}
                      style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "var(--accent)", background: "none", border: "1px dashed var(--accent-border)", borderRadius: 5, padding: "2px 8px", cursor: "pointer" }}>
                      {p.diasVigencia || 15} días
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Creado</span>
                  <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: "var(--text-secondary)" }}>{fmtFecha(parseInt(id))}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Vencimiento</span>
                  <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: vencido ? "#e07070" : porVencer ? "#c8a02a" : "var(--text-secondary)", fontWeight: 700 }}>
                    {fmtFecha(parseInt(id) + (p.diasVigencia || 15) * 86400000)}
                  </span>
                </div>
                {estadoVigencia && (
                  <div style={{
                    padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: vencido ? "rgba(200,60,60,0.12)" : porVencer ? "rgba(200,160,42,0.12)" : "rgba(100,180,80,0.10)",
                    color: vencido ? "#e07070" : porVencer ? "#c8a02a" : "#7ecf8a",
                    border: `1px solid ${vencido ? "rgba(200,60,60,0.30)" : porVencer ? "rgba(200,160,42,0.30)" : "rgba(100,180,80,0.20)"}`,
                  }}>
                    {vencido
                      ? `⚠ Vencido hace ${Math.abs(diasRestantes)} días. Actualizá el precio antes de reenviar.`
                      : porVencer
                      ? `⏳ Vence en ${diasRestantes} días. Hacé seguimiento con el cliente.`
                      : `✅ Vigente por ${diasRestantes} días más.`}
                  </div>
                )}
                {!estadoVigencia && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                    La vigencia aplica cuando el presupuesto está en estado Nuevo o Enviado.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelCaja({ presupuestos, onActualizar, modulos, costos, cajaPresId, onClearCajaPresId }) {
  const entries = Object.entries(presupuestos).sort((a, b) => b[0] - a[0]);

  // NAVEGACIÓN - Enlace Presupuesto a Caja
  // Si cajaPresId está seteado, hace scroll a esa fila y la marca para auto-abrir.
  // Se limpia después del primer render para no interferir con la navegación normal.
  const [autoAbrirId, setAutoAbrirId] = useState(cajaPresId || null);
  useEffect(() => {
    if (cajaPresId) {
      setAutoAbrirId(cajaPresId);
      // Scroll suave a la fila después de renderizar
      setTimeout(() => {
        const el = document.getElementById(`filacaja-${cajaPresId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        onClearCajaPresId && onClearCajaPresId();
      }, 150);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajaPresId]);

  // Métricas globales
  const totalPresupuestado = entries.reduce((a, [, p]) => a + p.total, 0);
  const totalCobrado = entries.reduce((a, [, p]) => {
    const cobros = p.cobros || [];
    return a + cobros.reduce((b, c) => b + c.monto, 0);
  }, 0);
  const totalPendiente = entries.reduce((a, [, p]) => {
    if (p.estado === "entregado" || p.estado === "aceptado" || p.estado === "produccion") {
      const cobros = p.cobros || [];
      const cobrado = cobros.reduce((b, c) => b + c.monto, 0);
      return a + Math.max(0, p.total - cobrado);
    }
    return a;
  }, 0);
  const vencidos = entries.filter(([id, p]) => {
    if (p.estado !== "enviado" && p.estado !== "nuevo") return false;
    const dias = Math.floor((Date.now() - parseInt(id)) / 86400000);
    return dias > (p.diasVigencia || 15);
  }).length;

  const metricaStyle = {
    background: "var(--bg-surface)", border: "1px solid var(--border)",
    borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 140,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Cobros, márgenes y vencimientos de tus trabajos">
        Caja
      </SectionTitle>

      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", borderRadius: 12, border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💵</div>
          <p style={{ fontSize: 14 }}>No hay trabajos guardados todavía.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>Guardá un presupuesto desde <strong style={{ color: "var(--accent)" }}>📋 Presupuesto</strong> para gestionarlo acá.</p>
        </div>
      ) : (
        <>
          {/* Métricas resumen */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="anim-fadeup stagger-1" style={{ ...metricaStyle, borderTop: "3px solid var(--accent)" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: 6 }}>Total presupuestado</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 900, color: "var(--accent)" }}>{fmtPeso(totalPresupuestado)}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 300 }}>{entries.length} trabajos</div>
            </div>
            <div className="anim-fadeup stagger-2" style={{ ...metricaStyle, borderTop: "3px solid #7ecf8a" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: 6 }}>Total cobrado</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 900, color: "#7ecf8a" }}>{fmtPeso(totalCobrado)}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 300 }}>
                {totalPresupuestado !== 0 ? Math.round((totalCobrado / Math.abs(totalPresupuestado)) * 100) : 0}% del total
              </div>
            </div>
            <div className="anim-fadeup stagger-3" style={{ ...metricaStyle, borderTop: "3px solid #e07070" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: 6 }}>Pendiente de cobro</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 900, color: "#e07070" }}>{fmtPeso(totalPendiente)}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 300 }}>en trabajos activos</div>
            </div>
            {vencidos > 0 && (
              <div className="anim-fadeup stagger-4" style={{ ...metricaStyle, borderTop: "3px solid #c8a02a" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: 6 }}>Presupuestos vencidos</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 900, color: "#c8a02a" }}>{vencidos}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 300 }}>requieren seguimiento</div>
              </div>
            )}
          </div>

          {/* Lista de trabajos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {entries.map(([id, p]) => (
              <FilaCaja key={id} id={id} p={p} onActualizar={onActualizar} modulos={modulos} costos={costos} autoAbrir={autoAbrirId === id} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 14. MI TALLER
// ══════════════════════════════════════════════════════════════════
// ── PanelPerfil ───────────────────────────────────────────────────
function PanelPerfil({ perfil, onGuardar }) {
  const [form, setForm] = useState({ ...perfil });
  const [guardado, setGuardado] = useState(false);
  const logoRef = React.useRef();

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await comprimirImagen(file, 300, 120, 0.88);
    upd("logo", b64);
    e.target.value = "";
  };

  const handleGuardar = () => {
    onGuardar({ ...form });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  const inp = {
    fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: "9px 13px",
    background: "var(--bg-base)", border: "1px solid var(--border)",
    color: "var(--text-primary)", borderRadius: 8, outline: "none",
    width: "100%", transition: "border-color 0.15s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 640 }}>
      <SectionTitle sub="Esta información aparece en todos los documentos generados">
        ⚙ Mi Taller
      </SectionTitle>

      <Card className="rsp-card">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Logo */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 10 }}>
              Logo del taller
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 120, height: 60, borderRadius: 8, overflow: "hidden",
                border: "1px dashed var(--border)", display: "flex", alignItems: "center",
                justifyContent: "center", background: "var(--bg-subtle)", flexShrink: 0,
                cursor: "pointer", transition: "border-color 0.15s",
              }}
                onClick={() => logoRef.current?.click()}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
              >
                {form.logo
                  ? <img src={form.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  : <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", textAlign: "center" }}>🖼 Subir logo</span>
                }
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                  PNG o JPG recomendado. Se comprime automáticamente a 300×120px.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => logoRef.current?.click()}
                    style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                    {form.logo ? "Cambiar" : "Subir logo"}
                  </button>
                  {form.logo && (
                    <button onClick={() => upd("logo", null)}
                      style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px solid rgba(200,60,60,0.25)", color: "#e07070" }}>
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
          </div>

          <div style={{ height: 1, background: "var(--separator)" }} />

          {/* Nombre y slogan */}
          <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Nombre del taller
              </label>
              <input value={form.nombre} onChange={e => upd("nombre", e.target.value)}
                placeholder="Ej: Carpintería del Sur"
                style={inp}
                onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Slogan (opcional)
              </label>
              <input value={form.slogan} onChange={e => upd("slogan", e.target.value)}
                placeholder="Ej: Muebles a medida con calidad"
                style={inp}
                onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"} />
            </div>
          </div>

          {/* Contacto */}
          <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {[
              { k: "tel", label: "Teléfono", ph: "Ej: 341 555-1234" },
              { k: "email", label: "Email", ph: "Ej: taller@mail.com" },
              { k: "direccion", label: "Dirección", ph: "Ej: Av. San Martín 456" },
            ].map(({ k, label, ph }) => (
              <div key={k}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  {label}
                </label>
                <input value={form[k]} onChange={e => upd(k, e.target.value)}
                  placeholder={ph} style={inp}
                  onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
            ))}
          </div>

          {/* Preview */}
          {(form.nombre || form.logo) && (
            <div style={{ padding: "14px 16px", background: "#fff", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                Vista previa del encabezado
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "2px solid #a07030", paddingBottom: 10 }}>
                {form.logo && <img src={form.logo} alt="logo" style={{ height: 40, objectFit: "contain" }} />}
                <div>
                  {form.nombre && <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 900, color: "#7a4a10" }}>{form.nombre}</div>}
                  {form.slogan && <div style={{ fontSize: 11, color: "#9a7040", fontStyle: "italic" }}>{form.slogan}</div>}
                  <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>
                    {[form.tel, form.email, form.direccion].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Textos predeterminados */}
          <div style={{ height: 1, background: "var(--separator)" }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 4 }}>
              Texto de apertura predeterminado
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
              Aparece al inicio de cada presupuesto en Vista Previa. Podés editarlo por presupuesto.
            </p>
            <textarea value={form.textoApertura || ""} onChange={e => upd("textoApertura", e.target.value)}
              rows={3} placeholder="Ej: Estimado cliente, le hacemos llegar el presente presupuesto por los trabajos solicitados."
              style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 4 }}>
              Condiciones predeterminadas
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
              Aparece al pie de cada presupuesto. Podés editarlo por presupuesto.
            </p>
            <textarea value={form.condiciones || ""} onChange={e => upd("condiciones", e.target.value)}
              rows={3} placeholder="Ej: Validez del presupuesto: 15 días. Precios sin IVA. Seña del 40% para iniciar fabricación."
              style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"} />
          </div>

          {/* Guardar */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleGuardar} style={{
              padding: "10px 24px", borderRadius: 8, cursor: "pointer",
              background: guardado ? "rgba(126,207,138,0.15)" : "linear-gradient(135deg,var(--accent),var(--accent-hover))",
              border: guardado ? "1px solid rgba(126,207,138,0.4)" : "none",
              color: guardado ? "#7ecf8a" : "var(--text-inverted)",
              fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.08em", transition: "all 0.2s",
              boxShadow: guardado ? "none" : "0 3px 12px rgba(180,100,20,0.28)",
            }}>
              {guardado ? "✓ Guardado" : "Guardar datos del taller"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 15. APP PRINCIPAL
// ══════════════════════════════════════════════════════════════════
// ── Header ────────────────────────────────────────────────────────
function Header({ vista, setVista, tabs, saveEst, tema, toggleTema }) {
  return (
    <header
      className="no-print rsp-header-inner"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "0 28px",
        background: "rgba(15,17,21,0.80)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 1px 0 var(--separator), var(--shadow-sm)",
        transition: "background 0.3s",
      }}
    >
      {/* Brand — logo CarpiCálc */}
      <div className="rsp-brand" style={{ padding: "12px 0", flexShrink: 0, display: "flex", alignItems: "center", gap: 9 }}>
        <img
          src="data:image/png;base64,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"
          alt="CarpiCálc isotipo"
          style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }}
        />
        <div className="rsp-brand-text">
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 900, color: "var(--accent)", lineHeight: 1, letterSpacing: "-0.02em" }}>
            CarpiCálc
          </div>
          <div style={{ fontSize: 8, letterSpacing: "0.24em", textTransform: "uppercase", marginTop: 3, color: "var(--text-muted)", fontWeight: 400, fontFamily: "'DM Mono',monospace" }}>
            Diseño & Costos
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="rsp-nav" style={{ display: "flex", flex: 1 }}>
        {tabs.map((t) => {
          const active = vista === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setVista(t.id)}
              style={{
                position: "relative",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                color: active ? "var(--accent)" : "var(--text-muted)",
                padding: "18px 20px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontFamily: "'DM Mono',monospace",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderBottomColor = "var(--accent-border)"; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderBottomColor = "transparent"; }}}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </nav>

      {/* Controles */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <SaveIndicator estado={saveEst} />
        <button
          onClick={toggleTema}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 999, fontSize: 11,
            fontFamily: "'DM Mono',monospace", fontWeight: 700,
            cursor: "pointer", transition: "all 0.2s",
            border: "1px solid var(--accent-border)",
            background: "var(--accent-soft)",
            color: "var(--accent)", whiteSpace: "nowrap",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,175,55,0.18)"; e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--accent-soft)"; e.currentTarget.style.borderColor = "var(--accent-border)"; }}
        >
          {tema === "dark" ? "☀ Cálido" : "🌑 Taller"}
        </button>
      </div>
    </header>
  );
}

// ── Login ─────────────────────────────────────────────────────────
const PASS_KEY = "carpicalc:auth";
const PASS_HASH = btoa("carpicalc2025"); // ← cambiá esto por tu contraseña

function LoginScreen({ onAccess }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const intentar = () => {
    if (btoa(input) === PASS_HASH) {
      sessionStorage.setItem(PASS_KEY, "1");
      onAccess();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setError(false), 2000);
      setInput("");
    }
  };

  return (
    <>
      <GlobalStyles />
      <div style={{
        minHeight: "100vh", background: "var(--bg-base)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}>
        <div style={{
          width: "100%", maxWidth: 380,
          background: "var(--bg-surface)", borderRadius: 16,
          border: "1px solid var(--border)", padding: "40px 36px",
          boxShadow: "var(--shadow)",
          animation: shake ? "shake 0.4s ease" : "scaleIn 0.45s cubic-bezier(0.22,1,0.36,1)",
        }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <img
              src="data:image/png;base64,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"
              alt="CarpiCálc"
              style={{ width: 120, height: 108, objectFit: "contain", marginBottom: 10 }}
            />
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>
              CarpiCálc
            </div>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 6, color: "var(--text-muted)", fontWeight: 300, fontFamily: "'DM Mono',monospace" }}>
              Diseño & Gestión de Costos
            </div>
          </div>

          {/* Campo contraseña */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: 8 }}>
              Contraseña de acceso
            </label>
            <input
              type="password"
              value={input}
              onChange={e => { setInput(e.target.value); setError(false); }}
              onKeyDown={e => e.key === "Enter" && intentar()}
              placeholder="••••••••"
              autoFocus
              style={{
                width: "100%", padding: "11px 14px",
                fontFamily: "'DM Mono',monospace", fontSize: 16,
                background: "var(--bg-base)",
                border: `1px solid ${error ? "#e07070" : "var(--border)"}`,
                borderRadius: 8, color: "var(--text-primary)", outline: "none",
                transition: "border-color 0.2s",
                letterSpacing: "0.15em",
              }}
              onFocus={e => { if (!error) e.target.style.borderColor = "var(--accent-border)"; }}
              onBlur={e => { if (!error) e.target.style.borderColor = "var(--border)"; }}
            />
            {error && (
              <div style={{ marginTop: 6, fontSize: 11, color: "#e07070", fontFamily: "'DM Mono',monospace" }}>
                Contraseña incorrecta
              </div>
            )}
          </div>

          {/* Botón */}
          <button onClick={intentar} style={{
            width: "100%", padding: "11px 0",
            background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
            border: "none", borderRadius: 8, color: "var(--text-inverted)",
            fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700,
            letterSpacing: "0.1em", cursor: "pointer", transition: "opacity 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Ingresar →
          </button>
        </div>

        <style>{`
          @keyframes shake {
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-8px)}
            40%{transform:translateX(8px)}
            60%{transform:translateX(-6px)}
            80%{transform:translateX(6px)}
          }
        `}</style>
      </div>
    </>
  );
}

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  const [autenticado, setAutenticado] = useState(
    () => sessionStorage.getItem(PASS_KEY) === "1"
  );

  if (!autenticado) return <LoginScreen onAccess={() => setAutenticado(true)} />;

  return <AppInterna />;
}

function AppInterna() {
  const { tema, toggleTema } = useTema();
  const [vista, setVista] = useState("presupuesto");
  const [modulos, setModulos] = useState(null);
  const [costos, setCostos] = useState(null);
  const [presupuestos, setPresupuestos] = useState({});
  const [perfil, setPerfil] = useState({ ...PERFIL_VACIO });
  const [cargando, setCargando] = useState(true);
  const [saveEst, setSaveEst] = useState(null);
  const [items, setItems] = useState([]);
  const [dimOverride, setDimOverride] = useState({});
  const [presupuestoVistaPreviaId, setPresupuestoVistaPreviaId] = useState(null);
  // NAVEGACIÓN - Enlace Presupuesto a Caja
  // Cuando el usuario hace click en "Ver Rentabilidad" desde Vista Previa,
  // guardamos el id aquí para que PanelCaja abra esa fila automáticamente.
  const [cajaPresId, setCajaPresId] = useState(null);
  // Versión de costos: timestamp de la última modificación en la pestaña Costos.
  // Se compara contra el timestamp del presupuesto para saber si sus precios están desactualizados.
  const [costosVersion, setCostosVersion] = useState(leerVersionCostos);

  useEffect(() => {
    cargarDatos().then(({ modulos, costos, presupuestos, perfil }) => {
      setModulos(modulos);
      setCostos(costos);
      setPresupuestos(presupuestos || {});
      if (perfil) setPerfil(perfil);
      // Recuperar borrador guardado (persiste entre cierres de pestaña)
      try {
        const borrador = localStorage.getItem("carpicalc:borrador");
        if (borrador) {
          const { items: bItems, dimOverride: bDim } = JSON.parse(borrador);
          if (bItems?.length > 0) {
            setItems(bItems);
            setDimOverride(bDim || {});
          }
        }
      } catch {}
      setCargando(false);
    });
  }, []);

  // Autosave borrador en localStorage — persiste entre cierres de pestaña
  useEffect(() => {
    if (items.length > 0) {
      try {
        localStorage.setItem("carpicalc:borrador", JSON.stringify({ items, dimOverride }));
      } catch {}
    } else {
      localStorage.removeItem("carpicalc:borrador");
    }
  }, [items, dimOverride]);

  // Avisa antes de cerrar si hay un presupuesto sin guardar
  useEffect(() => {
    const handler = (e) => {
      if (items.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [items]);

  const withSave = async (fn) => {
    setSaveEst("guardando");
    const ok = await fn();
    setSaveEst(ok ? "guardado" : "error");
    setTimeout(() => setSaveEst(null), 2500);
  };
  const hSaveM = (data) => withSave(() => guardarModulos(data));
  const hSaveC = (data) => {
    setCostosVersion(Date.now());
    return withSave(() => guardarCostos(data));
  };

  const getModUsado = useCallback(
    (item) => {
      if (!modulos || !item) return null;
      const cod = typeof item === "string" ? item : item.codigo;
      const keyId = typeof item === "string" ? item : item.id || item.codigo;
      const base = modulos[cod];
      if (!base) return null;
      const over = dimOverride[keyId] || {};
      return {
        ...base,
        dimensiones: {
          ancho: over.ancho ?? base.dimensiones.ancho,
          profundidad: over.profundidad ?? base.dimensiones.profundidad,
          alto: over.alto ?? base.dimensiones.alto,
        },
      };
    },
    [modulos, dimOverride]
  );

  const totalGeneral = !costos
    ? 0
    : items.reduce((acc, it) => {
        const m = getModUsado(it);
        if (!m) return acc;
        const c = calcularModulo(m, costos);
        if (!c) return acc;
        return acc + c.total * it.cantidad;
      }, 0);

  const handleGuardarPresupuesto = async (nombre, cliente, nota, presupuestoCompleto) => {
    const id = String(Date.now());
    const nuevo = {
      ...presupuestos,
      [id]: presupuestoCompleto || {
        nombre,
        cliente: cliente || { nombre: "", tel: "", dir: "" },
        nota: nota || "",
        estado: "nuevo",
        items: [...items],
        dimOverride: { ...dimOverride },
        total: totalGeneral,
      },
    };
    setPresupuestos(nuevo);
    withSave(() => guardarPresupuestos(nuevo));
    localStorage.removeItem("carpicalc:borrador");
  };
  const handleCargarPresupuesto = (p) => {
    setItems(p.items ? [...p.items] : []);
    setDimOverride(p.dimOverride && typeof p.dimOverride === "object" ? { ...p.dimOverride } : {});
    localStorage.removeItem("carpicalc:borrador");
  };
  const handleEliminarPresupuesto = async (id) => {
    const nuevo = { ...presupuestos };
    delete nuevo[id];
    setPresupuestos(nuevo);
    withSave(() => guardarPresupuestos(nuevo));
  };
  const handleCambiarEstado = async (id, nuevoEstado) => {
    const nuevo = {
      ...presupuestos,
      [id]: { ...presupuestos[id], estado: nuevoEstado },
    };
    setPresupuestos(nuevo);
    withSave(() => guardarPresupuestos(nuevo));
  };

  const handleActualizarPresupuesto = async (id, cambios) => {
    const nuevo = {
      ...presupuestos,
      [id]: { ...presupuestos[id], ...cambios },
    };
    setPresupuestos(nuevo);
    withSave(() => guardarPresupuestos(nuevo));
  };

  const tabs = [
    { id: "presupuesto", label: "Presupuesto", icon: "📋" },
    { id: "preview",     label: "Vista previa", icon: "📄" },
    { id: "corte",       label: "Corte",        icon: "🪚" },
    { id: "trabajos",    label: "Trabajos",     icon: "📊" },
    { id: "caja",        label: "Caja",         icon: "💵" },
    { id: "catalogo",    label: "Catálogo",     icon: "🗂" },
    { id: "costos",      label: "Costos",       icon: "💰" },
    { id: "config",      label: "Mi taller",    icon: "⚙" },
  ];

  if (cargando)
    return (
      <>
        <GlobalStyles />
        <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="anim-scalein" style={{ textAlign: "center" }}>
            <img
              src="data:image/png;base64,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"
              alt="CarpiCálc"
              style={{ width: 160, height: 144, objectFit: "contain", marginBottom: 20 }}
            />
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 900, color: "var(--accent)", letterSpacing: "-0.02em", marginBottom: 6 }}>
              CarpiCálc
            </div>
            <div style={{ fontSize: 9, letterSpacing: "0.30em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 28, fontWeight: 400, fontFamily: "'DM Mono',monospace" }}>
              Diseño & Gestión de Costos
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%", background: "var(--accent)",
                  animation: `dotPulse 1.2s ease-in-out infinite`,
                  animationDelay: `${i * 0.18}s`,
                  opacity: 0.3,
                }} />
              ))}
            </div>
            <style>{`
              @keyframes dotPulse {
                0%,80%,100%{opacity:0.3;transform:scale(1)}
                40%{opacity:1;transform:scale(1.4)}
              }
            `}</style>
          </div>
        </div>
      </>
    );

  return (
    <>
      <GlobalStyles />
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-base)",
          color: "var(--text-primary)",
          transition: "background 0.3s",
        }}
      >
        <Header
          vista={vista}
          setVista={setVista}
          tabs={tabs}
          saveEst={saveEst}
          tema={tema}
          toggleTema={toggleTema}
        />
        {/* rsp-main: padding reducido en móvil */}
        <main
          className="rsp-main"
          style={{ maxWidth: 980, margin: "0 auto", padding: "28px 20px" }}
        >
          {/* tab-view: animación de entrada al cambiar de pestaña */}
          <div key={vista} className="tab-view">
          {vista === "presupuesto" && (
            <Presupuesto
              modulos={modulos}
              costos={costos}
              items={items}
              setItems={setItems}
              dimOverride={dimOverride}
              setDimOverride={setDimOverride}
              getModUsado={getModUsado}
              totalGeneral={totalGeneral}
              presupuestos={presupuestos}
              onGuardarPresupuesto={handleGuardarPresupuesto}
              onCargarPresupuesto={handleCargarPresupuesto}
              onEliminarPresupuesto={handleEliminarPresupuesto}
              onCambiarEstado={handleCambiarEstado}
              onActualizarPresupuesto={handleActualizarPresupuesto}
              onVerPresupuesto={(id) => { setPresupuestoVistaPreviaId(id); setVista("preview"); }}
              costosVersion={costosVersion}
            />
          )}
          {vista === "preview" && (
            <VistaPrevia
              items={items}
              modulos={modulos}
              costos={costos}
              onLimpiar={() => { setItems([]); setDimOverride({}); }}
              getModUsado={getModUsado}
              totalGeneral={totalGeneral}
              presupuestos={presupuestos}
              perfil={perfil}
              onActualizarPresupuesto={handleActualizarPresupuesto}
              onCambiarEstado={handleCambiarEstado}
              onCargarPresupuesto={handleCargarPresupuesto}
              presupuestoSelId={presupuestoVistaPreviaId}
              onSeleccionarPresupuesto={setPresupuestoVistaPreviaId}
              costosVersion={costosVersion}
              onVerRentabilidad={(id) => {
                setCajaPresId(id);
                setVista("caja");
              }}
            />
          )}
          {vista === "corte" && (
            <ListaCorte
              items={items}
              modulos={modulos}
              costos={costos}
              getModUsado={getModUsado}
              presupuestos={presupuestos}
              presupuestoVistaPreviaId={presupuestoVistaPreviaId}
            />
          )}
          {vista === "trabajos" && (
            <TableroKanban
              presupuestos={presupuestos}
              onCambiarEstado={handleCambiarEstado}
              onEliminar={handleEliminarPresupuesto}
              onCargar={(p) => { handleCargarPresupuesto(p); setVista("presupuesto"); }}
              modulos={modulos}
              costos={costos}
              onActualizarPresupuesto={handleActualizarPresupuesto}
            />
          )}
          {vista === "caja" && (
            <PanelCaja
              presupuestos={presupuestos}
              onActualizar={handleActualizarPresupuesto}
              modulos={modulos}
              costos={costos}
              cajaPresId={cajaPresId}
              onClearCajaPresId={() => setCajaPresId(null)}
            />
          )}
          {vista === "catalogo" && (
            <CatalogoModulos
              modulos={modulos}
              setModulos={setModulos}
              costos={costos}
              onSave={hSaveM}
              setCostos={setCostos}
              hSaveC={hSaveC}
              presupuestos={presupuestos}
              perfil={perfil}
              onGuardarPerfil={(nuevo) => {
                setPerfil(nuevo);
                withSave(() => guardarPerfil(nuevo));
              }}
            />
          )}
          {vista === "costos" && (
            <HojaCostos costos={costos} setCostos={setCostos} onSave={hSaveC} />
          )}
          {vista === "config" && (
            <PanelPerfil
              perfil={perfil}
              onGuardar={(nuevo) => {
                setPerfil(nuevo);
                withSave(() => guardarPerfil(nuevo));
              }}
            />
          )}
          </div>{/* cierre tab-view */}
        </main>
      </div>
    </>
  );
}
