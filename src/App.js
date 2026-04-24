import { useState, useCallback, useEffect } from "react";

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

// ── Persistencia ──────────────────────────────────────────────────
async function cargarDatos() {
  try {
    const rm = localStorage.getItem("carpicalc:modulos");
    const rc = localStorage.getItem("carpicalc:costos");
    const rp = localStorage.getItem("carpicalc:presupuestos");
    return {
      modulos: rm ? JSON.parse(rm) : modulosIniciales,
      costos: rc ? JSON.parse(rc) : costoIniciales,
      presupuestos: rp ? JSON.parse(rp) : {},
    };
  } catch {
    return {
      modulos: modulosIniciales,
      costos: costoIniciales,
      presupuestos: {},
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
const guardarModulos = (d) => _save("carpicalc:modulos", d);
const guardarCostos = (d) => _save("carpicalc:costos", d);
const guardarPresupuestos = (d) => _save("carpicalc:presupuestos", d);

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

// ── Cálculo (intacto) ────────────────────────────────────────────
function resolverDim(base, offsetEsp, offsetMm, divisor, espesor) {
  const raw = (base || 0) + (offsetEsp || 0) * (espesor || 0) + (offsetMm || 0);
  return Math.max(0, raw / Math.max(1, divisor || 1));
}
function calcularModulo(modulo, costos) {
  const matDef =
    costos.materiales.find((m) => m.tipo === modulo.material) ||
    costos.materiales[0];
  if (!matDef) return null;
  const { ancho, profundidad, alto } = modulo.dimensiones;
  const dimMap = { ancho, profundidad, alto };
  const esp = matDef.espesor || 18;
  let m2Neto = 0,
    metrosTapacanto = 0;
  const desglosePiezas = [];
  for (const p of modulo.piezas) {
    const d1 = resolverDim(
      dimMap[p.usaDim],
      p.offsetEsp,
      p.offsetMm,
      p.divisor || 1,
      esp
    );
    const d2 = resolverDim(
      dimMap[p.usaDim2],
      p.offsetEsp2,
      p.offsetMm2,
      p.divisor2 || 1,
      esp
    );
    const area = (d1 * d2 * p.cantidad) / 1_000_000;
    m2Neto += area;
    let mTc = 0;
    if (p.tc?.id)
      mTc =
        (p.cantidad * ((p.tc.lados1 || 0) * d1 + (p.tc.lados2 || 0) * d2)) /
        1000;
    metrosTapacanto += mTc;
    desglosePiezas.push({
      nombre: p.nombre,
      cantidad: p.cantidad,
      d1,
      d2,
      area,
      mTc,
    });
  }
  const pctDesp = costos.desperdicioPct || 20;
  const m2Total = m2Neto * (1 + pctDesp / 100);
  const costoMaterial = m2Total * matDef.precioM2;
  let costoTapacanto = 0;
  if (costos.tapacanto && modulo.piezas.some((p) => p.tc?.id)) {
    for (const p of modulo.piezas) {
      if (!p.tc?.id) continue;
      const d1 = resolverDim(
        dimMap[p.usaDim],
        p.offsetEsp,
        p.offsetMm,
        p.divisor || 1,
        esp
      );
      const d2 = resolverDim(
        dimMap[p.usaDim2],
        p.offsetEsp2,
        p.offsetMm2,
        p.divisor2 || 1,
        esp
      );
      const mTc =
        (p.cantidad * ((p.tc.lados1 || 0) * d1 + (p.tc.lados2 || 0) * d2)) /
        1000;
      const tcDef = costos.tapacanto.find((t) => t.id === p.tc.id);
      if (tcDef) costoTapacanto += mTc * tcDef.precio;
    }
  }
  let costoMO = 0;
  const moItem = costos.manoDeObra.find(
    (m) => m.tipo === modulo.moDeObra?.tipo
  );
  if (moItem)
    costoMO =
      moItem.tipo === "por_modulo"
        ? moItem.precio
        : moItem.precio * (modulo.moDeObra.horas || 0);
  let costoHerrajes = 0;
  for (const h of modulo.herrajes || []) {
    const herr = costos.herrajes.find((x) => x.id === h.id);
    if (herr) costoHerrajes += herr.precio * h.cantidad;
  }
  const costoBase = costoMaterial + costoTapacanto + costoMO + costoHerrajes;
  const ganancia = costoBase * (costos.gastosGenerales / 100);
  const total = costoBase + ganancia;
  return {
    costoMaterial,
    costoTapacanto,
    costoMO,
    costoHerrajes,
    costoBase,
    ganancia,
    total,
    m2Neto,
    m2Total,
    pctDesp,
    metrosTapacanto,
    desglosePiezas,
    espesor: esp,
  };
}

// ── Helpers ───────────────────────────────────────────────────────
const fmtPeso = (n) => "$ " + Math.round(n).toLocaleString("es-AR");
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
const TIPO_MAT = {
  melamina: "Melamina",
  mdf: "MDF",
  madera_maciza: "Madera maciza",
  terciado: "Terciado",
};

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
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap');
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
    }

    body{
      background-color:var(--bg-base);
      color:var(--text-primary);
      font-family:'Inter',system-ui,sans-serif;
      font-weight:400;
      transition:background-color 0.3s,color 0.3s;
      -webkit-font-smoothing:antialiased;
    }

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

    @media print{
      .no-print{display:none !important;}.print-only{display:block !important;}
      body{background:#fff !important;color:#1a1a1a !important;font-size:12px;}
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
      .rsp-brand { padding: 14px 0 !important; }
      .rsp-brand > div:first-child { font-size: 17px !important; }
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
    }
  `}</style>
);

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
        border: `1px solid ${
          highlight ? "var(--accent-border)" : "var(--border)"
        }`,
        borderRadius: 12,
        padding: 20,
        boxShadow: "var(--shadow)",
        cursor: onClick ? "pointer" : undefined,
        transition: "border-color 0.2s",
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
    <div style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: 24,
          fontWeight: 900,
          color: "var(--accent)",
          letterSpacing: -0.5,
          lineHeight: 1,
        }}
      >
        {children}
      </h2>
      {sub && (
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
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
  useEffect(() => {
    setDesp(String(costos.desperdicioPct));
  }, [costos.desperdicioPct]);
  useEffect(() => {
    setGan(String(costos.gastosGenerales));
  }, [costos.gastosGenerales]);
  return (
    <HcSec icon="📊" titulo="Desperdicio y Ganancia">
      {/* rsp-grid-1: colapsa a 1 columna en móvil */}
      <div
        className="rsp-grid-1"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
      >
        <div>
          <TextInput
            label="% Desperdicio de material"
            type="number"
            suffix="%"
            value={desp}
            onChange={setDesp}
            onBlur={(v) =>
              save({ ...costos, desperdicioPct: parseFloat(v) || 0 })
            }
          />
          <p
            style={{
              fontSize: 12,
              marginTop: 8,
              lineHeight: 1.6,
              color: "var(--text-muted)",
            }}
          >
            Cubre disco de corte, retazos y errores. Recomendado: 15–25%.
          </p>
        </div>
        <div>
          <TextInput
            label="% Ganancia del taller"
            type="number"
            suffix="%"
            value={gan}
            onChange={setGan}
            onBlur={(v) =>
              save({ ...costos, gastosGenerales: parseFloat(v) || 0 })
            }
          />
          <p
            style={{
              fontSize: 12,
              marginTop: 8,
              lineHeight: 1.6,
              color: "var(--text-muted)",
            }}
          >
            Se aplica sobre el costo total. El precio de venta siempre incluye
            tu margen limpio.
          </p>
        </div>
      </div>
      <div
        className="rsp-grid-1"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginTop: 16,
        }}
      >
        {[
          ["Desperdicio", desp, "de material extra cubierto"],
          ["Ganancia", gan, "sobre costo total"],
        ].map(([label, val, note]) => (
          <div
            key={label}
            style={{
              background: "var(--accent-soft)",
              border: "1px solid var(--accent-border)",
              borderRadius: 12,
              padding: "14px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 28,
                fontWeight: 900,
                color: "var(--accent)",
              }}
            >
              {parseFloat(val) || 0}%
            </div>
            <div
              style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}
            >
              {label} · {note}
            </div>
          </div>
        ))}
      </div>
    </HcSec>
  );
}

// ── FilaVista (nivel superior) ─────────────────────────────────────
const FilaVista = ({ style, onEnter, onLeave, children }) => (
  <div style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>
    {children}
  </div>
);

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
    await guardarSnapshotPrecios(costos);
    const factor = 1 + pct / 100;
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
          </div>
          <div>
            {!confirmInflacion ? (
              <button
                disabled={!pctInflacion || isNaN(parseFloat(pctInflacion))}
                onClick={() => setConfirmInflacion(true)}
                style={{
                  padding: "9px 18px", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.4)",
                  color: "#c8a02a", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace",
                  fontWeight: 700, fontSize: 12, opacity: (!pctInflacion || isNaN(parseFloat(pctInflacion))) ? 0.4 : 1,
                }}
              >
                📈 Aplicar +{pctInflacion || 0}%
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
            <button onClick={() => setVerHistorial(v => !v)}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, textDecoration: "underline" }}>
              {verHistorial ? "▲ Ocultar" : "▼ Ver"} historial de precios ({historial.length})
            </button>
            {verHistorial && (
              <div style={{ marginTop: 10, background: "rgba(0,0,0,0.15)", borderRadius: 8, padding: 12 }}>
                {historial.map((snap, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: i < historial.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>
                      {new Date(snap.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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
    </div>
  );
}

// ── FilaPieza ─────────────────────────────────────────────────────
function FilaPieza({ pieza, idx, onDelete, dims, espesor, tapacanto }) {
  const d1 = resolverDim(
    dims[pieza.usaDim],
    pieza.offsetEsp,
    pieza.offsetMm,
    pieza.divisor || 1,
    espesor
  );
  const d2 = resolverDim(
    dims[pieza.usaDim2],
    pieza.offsetEsp2,
    pieza.offsetMm2,
    pieza.divisor2 || 1,
    espesor
  );
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
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {pieza.nombre}
          </div>
          <div
            style={{
              fontSize: 11,
              marginTop: 2,
              fontFamily: "'DM Mono',monospace",
              color: "var(--text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {pieza.usaDim}{" "}
            {offsetLabel(pieza.offsetEsp, pieza.offsetMm, pieza.divisor || 1)}
            {" × "}
            {pieza.usaDim2}{" "}
            {offsetLabel(
              pieza.offsetEsp2,
              pieza.offsetMm2,
              pieza.divisor2 || 1
            )}
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
function FormPieza({ fp, setFp, onAgregar, error, dims, espesor, tapacanto }) {
  const d1 = resolverDim(
    dims[fp.usaDim],
    parseInt(fp.offsetEsp) || 0,
    parseInt(fp.offsetMm) || 0,
    parseInt(fp.divisor) || 1,
    espesor
  );
  const d2 = resolverDim(
    dims[fp.usaDim2],
    parseInt(fp.offsetEsp2) || 0,
    parseInt(fp.offsetMm2) || 0,
    parseInt(fp.divisor2) || 1,
    espesor
  );
  const DimRow = ({ titulo, dimKey, espKey, mmKey, divKey, resultado }) => {
    const divVal = parseInt(fp[divKey]) || 1;
    return (
      <div
        style={{ background: "rgba(0,0,0,0.18)", borderRadius: 8, padding: 10 }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            marginBottom: 8,
          }}
        >
          {titulo}
        </div>
        <div
          className="rsp-grid-1"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <Select
            label="Toma de"
            value={fp[dimKey]}
            small
            onChange={(v) => setFp((p) => ({ ...p, [dimKey]: v }))}
            options={DIMS.map((d) => ({ value: d, label: d }))}
          />
          <TextInput
            label="Dividir ÷"
            type="number"
            value={fp[divKey]}
            placeholder="1"
            suffix="÷"
            small
            onChange={(v) =>
              setFp((p) => ({ ...p, [divKey]: Math.max(1, parseInt(v) || 1) }))
            }
          />
          <TextInput
            label="Espesores ±"
            type="number"
            value={fp[espKey]}
            placeholder="0"
            suffix="esp"
            small
            onChange={(v) => setFp((p) => ({ ...p, [espKey]: v }))}
          />
          <TextInput
            label="mm fijos ±"
            type="number"
            value={fp[mmKey]}
            placeholder="0"
            suffix="mm"
            small
            onChange={(v) => setFp((p) => ({ ...p, [mmKey]: v }))}
          />
        </div>
        <div
          style={{
            fontSize: 11,
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>→</span>
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              fontWeight: 700,
              color: "#7ecf8a",
            }}
          >
            {Math.round(resultado)} mm
          </span>
          {(parseInt(fp[espKey]) || 0) !== 0 && (
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                color: "var(--accent)",
                fontSize: 11,
              }}
            >
              {parseInt(fp[espKey])} esp × {espesor}mm ={" "}
              {(parseInt(fp[espKey]) || 0) * espesor}mm
            </span>
          )}
          {divVal > 1 && (
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                color: "#7090c0",
                fontSize: 11,
              }}
            >
              ÷ {divVal}
            </span>
          )}
        </div>
      </div>
    );
  };
  return (
    <Card className="rsp-card" highlight>
      <h4
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--accent)",
          marginBottom: 14,
        }}
      >
        ➕ Agregar pieza
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          className="rsp-grid-1"
          style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}
        >
          <TextInput
            label="Nombre"
            placeholder="Lateral, Base, Puerta..."
            value={fp.nombre}
            onChange={(v) => setFp((p) => ({ ...p, nombre: v }))}
            small
          />
          <TextInput
            label="Cantidad"
            type="number"
            value={fp.cantidad}
            onChange={(v) => setFp((p) => ({ ...p, cantidad: v }))}
            small
          />
        </div>
        <DimRow
          titulo="Dim 1 (altura)"
          dimKey="usaDim"
          espKey="offsetEsp"
          mmKey="offsetMm"
          divKey="divisor"
          resultado={d1}
        />
        <DimRow
          titulo="Dim 2 (ancho)"
          dimKey="usaDim2"
          espKey="offsetEsp2"
          mmKey="offsetMm2"
          divKey="divisor2"
          resultado={d2}
        />
        <div
          style={{
            background: "rgba(0,0,0,0.18)",
            borderRadius: 8,
            padding: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              marginBottom: 8,
            }}
          >
            🎗 Tapacanto
          </div>
          <div style={{ marginBottom: 8 }}>
            <Select
              label="Tipo de cinta"
              value={fp.tc.id}
              small
              onChange={(v) =>
                setFp((p) => ({ ...p, tc: { ...p.tc, id: parseInt(v) } }))
              }
              options={[
                { value: 0, label: "Sin tapacanto" },
                ...(tapacanto || []).map((t) => ({
                  value: t.id,
                  label: t.nombre,
                })),
              ]}
            />
          </div>
          <div
            className="rsp-grid-1"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <TextInput
              label={`Lados D1 (${fp.usaDim})`}
              type="number"
              value={fp.tc.lados1}
              small
              onChange={(v) =>
                setFp((p) => ({
                  ...p,
                  tc: { ...p.tc, lados1: parseInt(v) || 0 },
                }))
              }
            />
            <TextInput
              label={`Lados D2 (${fp.usaDim2})`}
              type="number"
              value={fp.tc.lados2}
              small
              onChange={(v) =>
                setFp((p) => ({
                  ...p,
                  tc: { ...p.tc, lados2: parseInt(v) || 0 },
                }))
              }
            />
          </div>
          {fp.tc.id > 0 && (
            <div
              style={{
                fontSize: 11,
                marginTop: 6,
                fontFamily: "'DM Mono',monospace",
                color: "var(--accent)",
              }}
            >
              →{" "}
              {fmtNum(
                (parseInt(fp.cantidad || 1) *
                  ((fp.tc.lados1 || 0) * d1 + (fp.tc.lados2 || 0) * d2)) /
                  1000,
                2
              )}{" "}
              m lineales
            </div>
          )}
        </div>
        {error && <p style={{ color: "#e07070", fontSize: 12 }}>⚠ {error}</p>}
        <Btn onClick={onAgregar} full>
          + Agregar esta pieza
        </Btn>
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
        }
      : {
          codigo: "",
          nombre: "",
          descripcion: "",
          dimensiones: { ancho: 600, profundidad: 550, alto: 700 },
          material: "melamina",
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
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={onCancelar}>
              Cancelar
            </Btn>
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
                onClick={() => {
                  setPaso(1);
                  setError("");
                }}
              >
                ← Volver
              </Btn>
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

// ── CatalogoModulos ───────────────────────────────────────────────
function AccionesModulo({ onEditar, onEliminar, onDuplicar }) {
  const s = (type) => ({
    padding: "5px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "'DM Mono',monospace",
    cursor: "pointer",
    transition: "all 0.15s",
    background:
      type === "edit"
        ? "var(--accent-soft)"
        : type === "dup"
        ? "rgba(112,144,176,0.12)"
        : "transparent",
    border:
      type === "edit"
        ? "1px solid var(--accent-border)"
        : type === "dup"
        ? "1px solid rgba(112,144,176,0.30)"
        : "1px solid rgba(200,60,60,0.22)",
    color:
      type === "edit"
        ? "var(--accent)"
        : type === "dup"
        ? "#7090b0"
        : "#e07070",
  });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      <button onClick={onEditar} style={s("edit")}>
        ✏ editar
      </button>
      <button onClick={onDuplicar} style={s("dup")}>
        ⧉ duplicar
      </button>
      <button onClick={onEliminar} style={s("del")}>
        × borrar
      </button>
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
function TarjetaModuloGrid({ cod, mod, c, onEditar, onEliminar, onDuplicar }) {
  return (
    <Card className="rsp-card">
      <div style={{ marginBottom: 10 }}>
        <span
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "var(--accent)",
          }}
        >
          {cod}
        </span>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            marginTop: 2,
            color: "var(--text-primary)",
          }}
        >
          {mod.nombre}
        </h3>
        {mod.descripcion && (
          <p style={{ fontSize: 12, marginTop: 2, color: "var(--text-muted)" }}>
            {mod.descripcion}
          </p>
        )}
      </div>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}
      >
        <Badge>{TIPO_MAT[mod.material]}</Badge>
        <Badge color="#7090b0">{mod.piezas.length} piezas</Badge>
        <Badge color="#705090">{c.espesor}mm</Badge>
      </div>
      <p
        style={{
          fontSize: 11,
          marginBottom: 10,
          fontFamily: "'DM Mono',monospace",
          color: "var(--text-muted)",
        }}
      >
        {mod.dimensiones.ancho} × {mod.dimensiones.profundidad} ×{" "}
        {mod.dimensiones.alto} mm
      </p>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 10,
            fontSize: 11,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
              }}
            >
              m² neto
            </div>
            <div
              style={{ fontFamily: "'DM Mono',monospace", color: "#9ab080" }}
            >
              {fmtNum(c.m2Neto)} m²
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
              }}
            >
              Tapacanto
            </div>
            <div
              style={{
                fontFamily: "'DM Mono',monospace",
                color: "var(--accent)",
              }}
            >
              {fmtNum(c.metrosTapacanto, 2)} m
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
              }}
            >
              Precio de venta
            </div>
            <div
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 17,
                fontWeight: 700,
                marginTop: 2,
                color: "#7ecf8a",
              }}
            >
              {fmtPeso(c.total)}
            </div>
          </div>
          <AccionesModulo
            onEditar={onEditar}
            onEliminar={onEliminar}
            onDuplicar={onDuplicar}
          />
        </div>
      </div>
    </Card>
  );
}
function FilaModuloLista({ cod, mod, c, onEditar, onEliminar, onDuplicar }) {
  return (
    <div
      className="rsp-lista-item"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 16px",
        borderRadius: 10,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--accent-border)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--border)")
      }
    >
      <div style={{ flex: 2, minWidth: 0 }}>
        <span
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--accent)",
            marginRight: 8,
          }}
        >
          {cod}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {mod.nombre}
        </span>
        {mod.descripcion && (
          <p
            style={{
              fontSize: 11,
              marginTop: 2,
              color: "var(--text-muted)",
              fontStyle: "italic",
            }}
          >
            {mod.descripcion}
          </p>
        )}
      </div>
      <span
        style={{
          fontFamily: "'DM Mono',monospace",
          fontSize: 11,
          color: "var(--text-muted)",
          flexShrink: 0,
        }}
      >
        {mod.dimensiones.ancho}×{mod.dimensiones.profundidad}×
        {mod.dimensiones.alto} mm
      </span>
      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        <Badge>{TIPO_MAT[mod.material]}</Badge>
        <Badge color="#705090">{c.espesor}mm</Badge>
      </div>
      <div
        className="rsp-lista-precio"
        style={{
          display: "flex",
          gap: 16,
          flexShrink: 0,
          fontFamily: "'DM Mono',monospace",
          fontSize: 12,
        }}
      >
        <span style={{ color: "#9ab080" }}>{fmtNum(c.m2Neto)} m²</span>
        <span style={{ color: "#7ecf8a", fontWeight: 700 }}>
          {fmtPeso(c.total)}
        </span>
      </div>
      <AccionesModulo
        onEditar={onEditar}
        onEliminar={onEliminar}
        onDuplicar={onDuplicar}
      />
    </div>
  );
}
// ── CatalogoModulos ACTUALIZADO (Fase 5.1) ────────────────────────
function CatalogoModulos({
  modulos,
  setModulos,
  costos,
  onSave,
  setCostos,
  hSaveC,
}) {
  const [modo, setModo] = useState(null);
  const [msg, setMsg] = useState(null);
  const [vistaLayout, setVista] = useState("grid");
  const [busqueda, setBusqueda] = useState("");

  const showMsg = (texto, tipo = "ok") => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 3500);
  };

  const guardar = (codigo, datos) => {
    const nuevo = { ...modulos, [codigo]: datos };
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

  const eliminar = (cod) => {
    const n = { ...modulos };
    delete n[cod];
    setModulos(n);
    onSave(n);
    showMsg(`"${cod}" eliminado.`, "warn");
  };

  // 💾 LÓGICA DE BACKUP (Exportar/Importar)
  const handleExport = () => {
    const data = { modulos, costos };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carpicalc-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
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
        if (data.modulos && data.costos) {
          setModulos(data.modulos);
          onSave(data.modulos);
          // Actualizamos también los costos si las funciones están presentes
          if (setCostos && hSaveC) {
            setCostos(data.costos);
            hSaveC(data.costos);
          }
          showMsg("Backup cargado con éxito.");
        } else {
          showMsg("El archivo no tiene el formato correcto.", "warn");
        }
      } catch (err) {
        showMsg("Error al leer el archivo.", "warn");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Resetea el input
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
            <Btn onClick={() => setModo({ tipo: "nuevo" })}>+ Nuevo módulo</Btn>
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
      )}

      {/* Grid / List view logic */}
      {vistaLayout === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
            gap: 12,
          }}
        >
          {Object.entries(modulos).filter(([cod, mod]) =>
            !busqueda || cod.toLowerCase().includes(busqueda.toLowerCase()) || mod.nombre.toLowerCase().includes(busqueda.toLowerCase())
          ).map(([cod, mod]) => {
            const c = calcularModulo(mod, costos);
            if (!c) return null;
            return (
              <TarjetaModuloGrid
                key={cod}
                cod={cod}
                mod={mod}
                c={c}
                onEditar={() =>
                  setModo({ tipo: "editar", codigo: cod, modulo: mod })
                }
                onEliminar={() => eliminar(cod)}
                onDuplicar={() =>
                  setModo({
                    tipo: "duplicar",
                    modulo: mod,
                    codigoSugerido: cod,
                  })
                }
              />
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(modulos).filter(([cod, mod]) =>
            !busqueda || cod.toLowerCase().includes(busqueda.toLowerCase()) || mod.nombre.toLowerCase().includes(busqueda.toLowerCase())
          ).map(([cod, mod]) => {
            const c = calcularModulo(mod, costos);
            if (!c) return null;
            return (
              <FilaModuloLista
                key={cod}
                cod={cod}
                mod={mod}
                c={c}
                onEditar={() =>
                  setModo({ tipo: "editar", codigo: cod, modulo: mod })
                }
                onEliminar={() => eliminar(cod)}
                onDuplicar={() =>
                  setModo({
                    tipo: "duplicar",
                    modulo: mod,
                    codigoSugerido: cod,
                  })
                }
              />
            );
          })}
        </div>
      )}

      {Object.keys(modulos).length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            borderRadius: 12,
            border: "1px dashed var(--border)",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>🗂</div>
          <p style={{ fontSize: 14 }}>No hay módulos en el catálogo.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>
            Hacé clic en{" "}
            <strong style={{ color: "var(--accent)" }}>+ Nuevo módulo</strong>{" "}
            para empezar.
          </p>
        </div>
      )}
    </div>
  );
}

// ── GestorPresupuestos ────────────────────────────────────────────
function GestorPresupuestos({
  presupuestos,
  onCargar,
  onGuardarNuevo,
  onEliminar,
  onCambiarEstado,
  totalActual,
  itemsActual,
}) {
  const [abierto, setAbierto] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [clienteNuevo, setClienteNuevo] = useState({ nombre: "", tel: "", dir: "" });
  const [notaNueva, setNotaNueva] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [estadoOpen, setEstadoOpen] = useState(null);
  const entries = Object.entries(presupuestos).sort((a, b) => b[0] - a[0]);
  const handleGuardar = () => {
    if (!nombreNuevo.trim()) return;
    onGuardarNuevo(nombreNuevo.trim(), clienteNuevo, notaNueva.trim());
    setNombreNuevo("");
    setClienteNuevo({ nombre: "", tel: "", dir: "" });
    setNotaNueva("");
  };

  const inputStyle = {
    flex: 1, fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "6px 9px",
    background: "var(--bg-base)", border: "1px solid var(--accent-border)",
    color: "var(--text-primary)", borderRadius: 6, outline: "none", minWidth: 0,
  };

  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setAbierto((a) => !a)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
          background: "var(--bg-surface)", border: "1px solid var(--border)", fontFamily: "'DM Mono',monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14 }}>🗄</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
            Mis presupuestos
          </span>
          {entries.length > 0 && (
            <span style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 999, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>
              {entries.length}
            </span>
          )}
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{abierto ? "▲" : "▼"}</span>
      </button>
      {abierto && (
        <div style={{ marginTop: 6, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          {itemsActual.length > 0 && (
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", background: "var(--accent-soft)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 10 }}>
                💾 Guardar presupuesto activo — {fmtPeso(totalActual)} ({itemsActual.length} módulo{itemsActual.length !== 1 ? "s" : ""})
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <input
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  placeholder="Nombre del trabajo (ej: Cocina Rodríguez)"
                  onKeyDown={(e) => e.key === "Enter" && handleGuardar()}
                  style={{ ...inputStyle, fontSize: 13, padding: "7px 10px", flex: "2 1 200px" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent-hover)"}
                  onBlur={e => e.target.style.borderColor = "var(--accent-border)"}
                />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <input value={clienteNuevo.nombre} onChange={e => setClienteNuevo(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="👤 Nombre del cliente" style={{ ...inputStyle, flex: "2 1 140px" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent-hover)"} onBlur={e => e.target.style.borderColor = "var(--accent-border)"} />
                <input value={clienteNuevo.tel} onChange={e => setClienteNuevo(p => ({ ...p, tel: e.target.value }))}
                  placeholder="📞 Teléfono" style={{ ...inputStyle, flex: "1 1 100px" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent-hover)"} onBlur={e => e.target.style.borderColor = "var(--accent-border)"} />
                <input value={clienteNuevo.dir} onChange={e => setClienteNuevo(p => ({ ...p, dir: e.target.value }))}
                  placeholder="📍 Dirección" style={{ ...inputStyle, flex: "2 1 140px" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent-hover)"} onBlur={e => e.target.style.borderColor = "var(--accent-border)"} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "flex-start" }}>
                <textarea value={notaNueva} onChange={e => setNotaNueva(e.target.value)}
                  placeholder="📋 Observaciones generales del trabajo (opcional)"
                  rows={2}
                  style={{ ...inputStyle, flex: "1 1 200px", resize: "vertical", lineHeight: 1.5, fontSize: 12 }}
                  onFocus={e => e.target.style.borderColor = "var(--accent-hover)"} onBlur={e => e.target.style.borderColor = "var(--accent-border)"} />
                <Btn onClick={handleGuardar} small disabled={!nombreNuevo.trim()}>Guardar</Btn>
              </div>
            </div>
          )}
          {entries.length === 0 ? (
            <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No hay presupuestos guardados todavía.
            </div>
          ) : (
            <div>
              {entries.map(([id, p]) => {
                const estadoInfo = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
                return (
                  <div key={id} style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)", transition: "background 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--accent-soft)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.nombre}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 2, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
                          {fmtFecha(parseInt(id))} · {p.items.length} módulo{p.items.length !== 1 ? "s" : ""}
                          {p.cliente && p.cliente.nombre && <span> · 👤 {p.cliente.nombre}</span>}
                          {p.cliente && p.cliente.tel && <span> · 📞 {p.cliente.tel}</span>}
                        </div>
                      </div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#7ecf8a", flexShrink: 0 }}>
                        {fmtPeso(p.total)}
                      </div>
                      {/* Badge de estado */}
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <button
                          onClick={() => setEstadoOpen(estadoOpen === id ? null : id)}
                          style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", border: `1px solid ${estadoInfo.color}55`, background: `${estadoInfo.color}22`, color: estadoInfo.color }}>
                          {estadoInfo.icon} {estadoInfo.label} ▾
                        </button>
                        {estadoOpen === id && (
                          <div style={{ position: "absolute", right: 0, top: "110%", zIndex: 20, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow)", minWidth: 160, overflow: "hidden" }}>
                            {ESTADOS_TRABAJO.map(est => (
                              <button key={est.id} onClick={() => { onCambiarEstado(id, est.id); setEstadoOpen(null); }}
                                style={{ width: "100%", padding: "8px 14px", background: est.id === (p.estado || "nuevo") ? `${est.color}22` : "transparent", border: "none", color: est.id === (p.estado || "nuevo") ? est.color : "var(--text-secondary)", cursor: "pointer", textAlign: "left", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                                {est.icon} {est.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {confirmDel === id ? (
                        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                          <button onClick={() => { onEliminar(id); setConfirmDel(null); }}
                            style={{ padding: "4px 10px", background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.35)", color: "#e07070", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                            Sí, borrar
                          </button>
                          <button onClick={() => setConfirmDel(null)}
                            style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                          <button onClick={() => onCargar(p)}
                            style={{ padding: "4px 10px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                            ↩ Cargar
                          </button>
                          <button onClick={() => setConfirmDel(id)}
                            style={{ padding: "4px 10px", background: "transparent", border: "1px solid rgba(200,60,60,0.22)", color: "#e07070", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
  cliente
) {
  const fecha = fmtFechaLarga(Date.now());
  const clienteHtml = cliente && (cliente.nombre || cliente.tel || cliente.dir)
    ? `<div style="margin-top:12px;padding:10px 14px;background:#fff8ee;border:1px solid #e8d0a0;border-radius:6px;font-size:12px;color:#5a3a10">
        ${cliente.nombre ? `<div>👤 <b>${cliente.nombre}</b></div>` : ""}
        ${cliente.tel ? `<div style="margin-top:2px">📞 ${cliente.tel}</div>` : ""}
        ${cliente.dir ? `<div style="margin-top:2px">📍 ${cliente.dir}</div>` : ""}
      </div>` : "";
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
      return `<tr><td style="font-family:monospace;font-size:11px;font-weight:700;color:#8a5a1a;padding:12px 16px;border-bottom:1px solid #e8dcc8;vertical-align:top">${
        item.codigo
      }</td><td style="padding:12px 16px;border-bottom:1px solid #e8dcc8;vertical-align:top"><div style="font-size:13px;font-weight:700;color:#1a0e04">${
        modBase.nombre
      }</div>${
        modBase.descripcion
          ? `<div style="font-size:11px;color:#7a6040;font-style:italic;margin-top:2px">${modBase.descripcion}</div>`
          : ""
      }${
        item.nota && item.nota.trim()
          ? `<div style="font-size:11px;color:#8a5a1a;font-style:italic;margin-top:4px">📝 ${item.nota}</div>`
          : ""
      }<div style="font-size:11px;color:${
        dimDif ? "#8a5a1a" : "#9a8060"
      };font-family:monospace;margin-top:4px">${over.ancho}×${
        over.profundidad
      }×${over.alto} mm${dimDif ? " ★ personalizado" : ""} · ${
        TIPO_MAT[modUsado.material]
      }</div></td><td style="text-align:right;padding:12px 16px;border-bottom:1px solid #e8dcc8;font-family:monospace;font-size:14px;font-weight:700;color:#8a5a1a;vertical-align:top">${
        item.cantidad
      }</td>${
        mostrarPrecioUnitario
          ? `<td style="text-align:right;padding:12px 16px;border-bottom:1px solid #e8dcc8;font-family:monospace;font-size:12px;color:#6a5040;vertical-align:top">${fmtPeso(
              calc.total
            )}</td>`
          : ""
      }<td style="text-align:right;padding:12px 16px;border-bottom:1px solid #e8dcc8;font-family:monospace;font-size:14px;font-weight:700;color:#1a6a30;vertical-align:top">${fmtPeso(
        calc.total * item.cantidad
      )}</td></tr>`;
    })
    .join("");
  const totalUnid = items.reduce((a, i) => a + i.cantidad, 0);
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>CarpiCálc — ${
    nombre || "Presupuesto"
  }</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a0e04;padding:32px 40px;max-width:900px;margin:0 auto}@media print{body{padding:16px 20px}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #a07030"><div><div style="font-size:22px;font-weight:900;color:#7a4a10;letter-spacing:-0.5px">🪵 CarpiCálc</div><div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;color:#888">Presupuesto de carpintería</div></div><div style="text-align:right">${
    nombre
      ? `<div style="font-size:15px;font-weight:700;color:#1a0e04">${nombre}</div>`
      : ""
  }<div style="font-size:11px;color:#666;margin-top:4px">${fecha}</div>${clienteHtml}</div></div><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f5ede0">${[
    "Código",
    "Módulo",
    "Cant.",
    ...(mostrarPrecioUnitario ? ["P. unit."] : [""]),
    "Subtotal",
  ]
    .filter((h) => h)
    .map(
      (h, i) =>
        `<th style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#9a7040;padding:8px 16px;text-align:${
          i > 1 ? "right" : "left"
        };border-bottom:2px solid #c8a060">${h}</th>`
    )
    .join(
      ""
    )}</tr></thead><tbody>${filas}</tbody></table><div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:#f5ede0;border-top:2px solid #a07030;border-radius:0 0 8px 8px"><div style="font-size:11px;color:#9a7040">${totalUnid} unidades · ${
    items.length
  } módulo${
    items.length !== 1 ? "s" : ""
  } · IVA no incluido</div><div style="text-align:right"><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.2em;color:#9a7040;margin-bottom:4px">Total del trabajo</div><div style="font-size:26px;font-weight:900;color:#1a6a30;letter-spacing:-0.5px">${fmtPeso(
    totalGeneral
  )}</div></div></div><script>window.onload=()=>window.print();</script></body></html>`;
  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  } else alert("El navegador bloqueó la ventana emergente.");
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
}) {
  if (items.length === 0) return null;
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
              🪵 CarpiCálc
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
          {items.map((item, idx) => {
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
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {items.reduce((a, i) => a + i.cantidad, 0)} unidades ·{" "}
              {items.length} módulo{items.length !== 1 ? "s" : ""} · IVA no
              incluido
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  marginBottom: 4,
                  color: "var(--text-muted)",
                }}
              >
                Total del trabajo
              </div>
              <div
                style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: 30,
                  fontWeight: 900,
                  letterSpacing: -0.5,
                  lineHeight: 1,
                  color: "#7ecf8a",
                }}
              >
                {fmtPeso(totalGeneral)}
              </div>
            </div>
          </div>
        </div>
      </div>
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
}) {
  const [inputCod, setInputCod] = useState("");
  const [inputCant, setInputCant] = useState(1);
  const [error, setError] = useState("");
  const [expandido, setExpandido] = useState(null);
  const [mostrarPrecioUnitario, setMostrarPrecioUnitario] = useState(false);
  const [preDim, setPreDim] = useState(null);
  const handleCodChange = (val) => {
    const cod = val.toUpperCase();
    setInputCod(cod);
    setError("");
    if (modulos[cod]) {
      setPreDim({ ...modulos[cod].dimensiones });
    } else {
      setPreDim(null);
    }
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
  };
  const setNota = (keyId, v) =>
    setItems((its) =>
      its.map((it) =>
        (it.id || it.codigo) === keyId ? { ...it, nota: v } : it
      )
    );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionTitle sub="Ingresá códigos para armar el presupuesto del trabajo">
        Armar Presupuesto
      </SectionTitle>
      <div className="no-print">
        <GestorPresupuestos
          presupuestos={presupuestos}
          onCargar={onCargarPresupuesto}
          onGuardarNuevo={onGuardarPresupuesto}
          onEliminar={onEliminarPresupuesto}
          onCambiarEstado={onCambiarEstado}
          totalActual={totalGeneral}
          itemsActual={items}
        />
      </div>
      <Card className="rsp-card no-print">
        {/* rsp-grid-1: el form de agregar colapsa en móvil */}
        <div
          className="rsp-grid-1"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 100px auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <TextInput
              label="Código de módulo"
              placeholder="MC001"
              value={inputCod}
              onChange={handleCodChange}
            />
            {error && (
              <p style={{ color: "#e07070", fontSize: 12, marginTop: 5 }}>
                ⚠ {error}
              </p>
            )}
          </div>
          <TextInput
            label="Cantidad"
            type="number"
            value={inputCant}
            onChange={setInputCant}
          />
          <div>
            <Btn onClick={agregar}>Agregar</Btn>
          </div>
        </div>
        {preDim && (
          <div
            style={{
              marginTop: 16,
              padding: "14px",
              background: "var(--accent-soft)",
              border: "1px solid var(--accent-border)",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 700,
                color: "var(--accent)",
                marginBottom: 12,
              }}
            >
              📐 Modificar medidas antes de agregar
            </div>
            <div
              className="rsp-grid-1"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
              }}
            >
              <TextInput
                label="Ancho"
                type="number"
                small
                suffix="mm"
                value={preDim.ancho}
                onChange={(v) =>
                  setPreDim((p) => ({ ...p, ancho: parseInt(v) || 0 }))
                }
              />
              <TextInput
                label="Profundidad"
                type="number"
                small
                suffix="mm"
                value={preDim.profundidad}
                onChange={(v) =>
                  setPreDim((p) => ({ ...p, profundidad: parseInt(v) || 0 }))
                }
              />
              <TextInput
                label="Alto"
                type="number"
                small
                suffix="mm"
                value={preDim.alto}
                onChange={(v) =>
                  setPreDim((p) => ({ ...p, alto: parseInt(v) || 0 }))
                }
              />
            </div>
          </div>
        )}
        <div
          style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 5 }}
        >
          {Object.entries(modulos).map(([cod, mod]) => (
            <button
              key={cod}
              onClick={() => handleCodChange(cod)}
              style={{
                background: "var(--accent-soft)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                borderRadius: 5,
                padding: "4px 9px",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "'DM Mono',monospace",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--accent-border)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--border)")
              }
            >
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>
                {cod}
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                {" "}
                — {mod.nombre}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {items.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
            fontSize: 14,
            color: "var(--text-muted)",
          }}
        >
          📋 El presupuesto está vacío.
        </div>
      ) : (
        items.map((item, idx) => {
          const keyId = item.id || item.codigo;
          const modBase = modulos[item.codigo];
          if (!modBase) return null;
          const modUsado = getModUsado(item);
          const calc = calcularModulo(modUsado, costos);
          if (!calc) return null;
          const isOpen = expandido === keyId;
          const over = dimOverride[keyId] || {};
          return (
            <Card
              key={keyId}
              className="rsp-card"
              style={{
                borderColor: isOpen ? "var(--accent-border)" : "var(--border)",
              }}
            >
              {/* rsp-stack: en móvil se apila el header del ítem */}
              <div
                className="rsp-stack"
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'DM Mono',monospace",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--accent)",
                      }}
                    >
                      {item.codigo}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      {modBase.nombre}
                    </span>
                    <Badge>{TIPO_MAT[modUsado.material]}</Badge>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      marginTop: 4,
                      color: "var(--text-muted)",
                    }}
                  >
                    {modUsado.dimensiones.ancho}×
                    {modUsado.dimensiones.profundidad}×
                    {modUsado.dimensiones.alto} mm
                    {(over.ancho || over.profundidad || over.alto) && (
                      <span style={{ marginLeft: 8, color: "var(--accent)" }}>
                        ★ personalizado
                      </span>
                    )}
                  </div>
                  {item.nota && item.nota.trim() && !isOpen && (
                    <div
                      style={{
                        fontSize: 12,
                        marginTop: 4,
                        color: "var(--accent)",
                        fontStyle: "italic",
                      }}
                    >
                      📝 {item.nota}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexShrink: 0,
                  }}
                >
                  {[
                    ["−", -1],
                    ["+", 1],
                  ].map(([lbl, d]) => (
                    <button
                      key={lbl}
                      onClick={() =>
                        setItems((it) =>
                          it.map((x, i) =>
                            i === idx
                              ? { ...x, cantidad: Math.max(1, x.cantidad + d) }
                              : x
                          )
                        )
                      }
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
                      fontWeight: 700,
                      width: 24,
                      textAlign: "center",
                      color: "var(--accent)",
                    }}
                  >
                    {item.cantidad}
                  </span>
                </div>
                <div
                  style={{ textAlign: "right", flexShrink: 0, minWidth: 100 }}
                >
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {fmtPeso(calc.total)} / u
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#7ecf8a",
                    }}
                  >
                    {fmtPeso(calc.total * item.cantidad)}
                  </div>
                </div>
                {/* rsp-item-actions: botones en fila en móvil */}
                <div
                  className="rsp-item-actions"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    flexShrink: 0,
                  }}
                >
                  <button
                    onClick={() => setExpandido(isOpen ? null : keyId)}
                    style={{
                      padding: "4px 8px",
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                      borderRadius: 5,
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {isOpen ? "▲" : "▼"} detalle
                  </button>
                  <button
                    title="Duplicar módulo con las mismas dimensiones"
                    onClick={() => {
                      const nuevoId = `${item.codigo}-${Date.now()}`;
                      const copia = { ...item, id: nuevoId };
                      const overCopia = dimOverride[keyId] ? { ...dimOverride[keyId] } : undefined;
                      setItems(it => {
                        const nuevo = [...it];
                        nuevo.splice(idx + 1, 0, copia);
                        return nuevo;
                      });
                      if (overCopia) setDimOverride(d => ({ ...d, [nuevoId]: overCopia }));
                    }}
                    style={{
                      padding: "4px 8px",
                      background: "var(--accent-soft)",
                      border: "1px solid var(--accent-border)",
                      color: "var(--accent)",
                      borderRadius: 5,
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(212,175,55,0.20)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--accent-soft)"}
                  >
                    ⧉ duplicar
                  </button>
                  <button
                    onClick={() =>
                      setItems((it) => it.filter((_, i) => i !== idx))
                    }
                    style={{
                      padding: "4px 8px",
                      background: "transparent",
                      border: "1px solid rgba(200,60,60,0.22)",
                      color: "#e07070",
                      borderRadius: 5,
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(200,60,60,0.10)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    eliminar
                  </button>
                </div>
              </div>
              {isOpen && (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        fontFamily: "'DM Mono',monospace",
                        color: "var(--text-muted)",
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      📝 Nota para este módulo
                    </label>
                    <textarea
                      value={item.nota || ""}
                      onChange={(e) => setNota(keyId, e.target.value)}
                      placeholder="Ej: sin puerta, color wengué, medida a confirmar en obra..."
                      rows={2}
                      style={{
                        width: "100%",
                        fontFamily: "'DM Mono',monospace",
                        fontSize: 13,
                        padding: "8px 12px",
                        background: "var(--bg-subtle)",
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                        borderRadius: 6,
                        outline: "none",
                        resize: "vertical",
                        transition: "border-color 0.2s",
                        lineHeight: 1.5,
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "var(--accent)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "var(--border)")
                      }
                    />
                  </div>
                  <div
                    className="rsp-grid-1"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          fontWeight: 700,
                          color: "var(--text-secondary)",
                          marginBottom: 10,
                        }}
                      >
                        Dimensiones para este trabajo
                      </h4>
                      <div
                        className="rsp-grid-1"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: 8,
                        }}
                      >
                        {DIMS.map((dim) => (
                          <TextInput
                            key={dim}
                            label={dim}
                            type="number"
                            small
                            suffix="mm"
                            value={over[dim] ?? modBase.dimensiones[dim]}
                            onChange={(v) =>
                              setDimOverride((d) => ({
                                ...d,
                                [keyId]: {
                                  ...(d[keyId] || {}),
                                  [dim]: parseInt(v) || 0,
                                },
                              }))
                            }
                          />
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          setDimOverride((d) => {
                            const n = { ...d };
                            delete n[keyId];
                            return n;
                          })
                        }
                        style={{
                          marginTop: 8,
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: 12,
                          textDecoration: "underline",
                        }}
                      >
                        Restaurar originales
                      </button>
                    </div>
                    <div>
                      <h4
                        style={{
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          fontWeight: 700,
                          color: "var(--text-secondary)",
                          marginBottom: 10,
                        }}
                      >
                        Desglose de costo
                      </h4>
                      {[
                        [
                          "Material",
                          calc.costoMaterial,
                          `${fmtNum(calc.m2Neto)} m²+${calc.pctDesp}%`,
                        ],
                        [
                          "Tapacanto",
                          calc.costoTapacanto,
                          `${fmtNum(calc.metrosTapacanto, 2)} m`,
                        ],
                        ["MO", calc.costoMO, ""],
                        ["Herrajes", calc.costoHerrajes, ""],
                        ["── Costo base", calc.costoBase, ""],
                        ["Ganancia", calc.ganancia, ""],
                      ].map(([label, val, note]) => (
                        <div
                          key={label}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "4px 0",
                            borderBottom: "1px solid var(--border)",
                            fontSize: 13,
                          }}
                        >
                          <div>
                            <span
                              style={{
                                color: label.startsWith("──")
                                  ? "var(--text-primary)"
                                  : "var(--text-muted)",
                                fontWeight: label.startsWith("──") ? 700 : 400,
                              }}
                            >
                              {label}
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
                          <span
                            style={{
                              fontFamily: "'DM Mono',monospace",
                              color: "#b8b080",
                            }}
                          >
                            {fmtPeso(val)}
                          </span>
                        </div>
                      ))}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          paddingTop: 8,
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ color: "var(--text-primary)" }}>
                          Precio de venta
                        </span>
                        <span
                          style={{
                            fontFamily: "'DM Mono',monospace",
                            fontSize: 16,
                            color: "#7ecf8a",
                          }}
                        >
                          {fmtPeso(calc.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })
      )}

      {items.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            paddingTop: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flex: 1,
              }}
            >
              <div
                style={{ height: 1, width: 32, background: "var(--border)" }}
              />
              <span
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                }}
              >
                Resumen del presupuesto
              </span>
              <div
                style={{ height: 1, flex: 1, background: "var(--border)" }}
              />
            </div>
            <div style={{ marginLeft: 16 }}>
              <ToggleSwitch
                value={mostrarPrecioUnitario}
                onChange={setMostrarPrecioUnitario}
                label="Mostrar precio unitario"
              />
            </div>
          </div>
          <ResumenPresupuesto
            items={items}
            modulos={modulos}
            costos={costos}
            getModUsado={getModUsado}
            totalGeneral={totalGeneral}
            mostrarPrecioUnitario={mostrarPrecioUnitario}
          />
        </div>
      )}
    </div>
  );
}

// ── VistaPrevia ───────────────────────────────────────────────────
function VistaPrevia({
  items,
  modulos,
  costos,
  onLimpiar,
  getModUsado,
  totalGeneral,
  presupuestos,
}) {
  const [mostrarPrecioUnitario, setMostrarPrecioUnitario] = useState(true);
  const [whatsappCopiado, setWhatsappCopiado] = useState(false);

  const presupuestoActivo = (() => {
    if (!items.length) return null;
    const entries = Object.entries(presupuestos || {});
    const codsActuales = items.map((i) => i.codigo).join(",");
    const match = entries.find(
      ([, p]) => p.items.map((i) => i.codigo).join(",") === codsActuales
    );
    return match ? match[1] : null;
  })();
  const nombreActivo = presupuestoActivo ? presupuestoActivo.nombre : null;
  const clienteActivo = presupuestoActivo ? presupuestoActivo.cliente : null;

  const handleWhatsApp = () => {
    const txt = generarTextoWhatsApp(items, modulos, costos, getModUsado, totalGeneral, nombreActivo, clienteActivo);
    navigator.clipboard.writeText(txt).then(() => {
      setWhatsappCopiado(true);
      setTimeout(() => setWhatsappCopiado(false), 2500);
    });
  };

  const btnStyle = (color) => ({
    display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 16px",
    borderRadius: 6, fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700,
    letterSpacing: "0.05em", cursor: "pointer", transition: "all 0.18s",
    background: color === "green" ? "linear-gradient(135deg,var(--accent),var(--accent-hover))" : "rgba(37,211,102,0.15)",
    border: color === "green" ? "none" : "1px solid rgba(37,211,102,0.4)",
    color: color === "green" ? "var(--text-inverted)" : "#25d366",
    boxShadow: color === "green" ? "0 3px 12px rgba(180,100,20,0.28)" : "none",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* rsp-stack en móvil: título y botones se apilan */}
      <div className="rsp-stack" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <SectionTitle sub="Vista limpia para imprimir o enviar al cliente">
          Vista Previa del Presupuesto
        </SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexShrink: 0, flexWrap: "wrap" }}>
          <ToggleSwitch value={mostrarPrecioUnitario} onChange={setMostrarPrecioUnitario} label="Mostrar precio unitario" />
          {items.length > 0 && (
            <>
              <button onClick={handleWhatsApp} style={btnStyle("whatsapp")}>
                {whatsappCopiado ? "✓ ¡Copiado!" : "📲 WhatsApp"}
              </button>
              <button
                onClick={() => imprimirPresupuesto(items, modulos, costos, getModUsado, totalGeneral, nombreActivo, mostrarPrecioUnitario, clienteActivo)}
                style={btnStyle("green")}
              >
                🖨 Imprimir / PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Datos del cliente activo */}
      {clienteActivo && (clienteActivo.nombre || clienteActivo.tel || clienteActivo.dir) && (
        <div style={{ display: "flex", gap: 16, padding: "12px 16px", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: 10, flexWrap: "wrap" }}>
          {clienteActivo.nombre && <span style={{ fontSize: 13, color: "var(--text-primary)" }}>👤 <b>{clienteActivo.nombre}</b></span>}
          {clienteActivo.tel && <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>📞 {clienteActivo.tel}</span>}
          {clienteActivo.dir && <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>📍 {clienteActivo.dir}</span>}
        </div>
      )}

      {items.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            borderRadius: 12,
            border: "1px dashed var(--border)",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          <p style={{ fontSize: 14 }}>El presupuesto está vacío.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>
            Agregá módulos desde{" "}
            <strong style={{ color: "var(--accent)" }}>📋 Presupuesto</strong>.
          </p>
        </div>
      ) : (
        <>
          <div
            className="no-print"
            style={{ display: "flex", justifyContent: "flex-end" }}
          >
            <button
              onClick={onLimpiar}
              style={{
                padding: "6px 14px",
                background: "transparent",
                fontSize: 11,
                fontFamily: "'DM Mono',monospace",
                cursor: "pointer",
                borderRadius: 6,
                border: "1px solid rgba(200,60,60,0.25)",
                color: "#e07070",
                transition: "all 0.15s",
              }}
            >
              × Limpiar presupuesto
            </button>
          </div>
          <ResumenPresupuesto
            items={items}
            modulos={modulos}
            costos={costos}
            getModUsado={getModUsado}
            totalGeneral={totalGeneral}
            mostrarPrecioUnitario={mostrarPrecioUnitario}
            nombrePresupuesto={nombreActivo}
          />
        </>
      )}
    </div>
  );
}

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
  }</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a0e04;padding:32px 40px;max-width:960px;margin:0 auto}@media print{body{padding:16px 20px}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #a07030"><div><div style="font-size:22px;font-weight:900;color:#7a4a10;letter-spacing:-0.5px">🪵 CarpiCálc</div><div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;color:#888">Lista de Corte para Taller</div></div><div style="text-align:right">${
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

function ListaCorte({ items, modulos, costos, getModUsado, presupuestos }) {
  if (items.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <SectionTitle sub="Lista detallada agrupada por material con medidas listas para la escuadradora">
          Lista de Corte
        </SectionTitle>
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            borderRadius: 12,
            border: "1px dashed var(--border)",
            color: "var(--text-muted)",
          }}
        >
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
  const nombreActivo = (() => {
    const entries = Object.entries(presupuestos || {});
    const codsActuales = items.map((i) => i.codigo).join(",");
    const match = entries.find(
      ([, p]) => p.items.map((i) => i.codigo).join(",") === codsActuales
    );
    return match ? match[1].nombre : null;
  })();
  const grupos = {};
  items.forEach((item) => {
    const modBase = modulos[item.codigo];
    if (!modBase) return;
    const modUsado = getModUsado(item);
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

function TarjetaKanban({ id, p, onCambiarEstado, onEliminar, onCargar }) {
  const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10,
      padding: "12px 13px", marginBottom: 8,
      transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
      boxShadow: "var(--shadow-sm)", borderLeft: `3px solid ${est.color}`,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.35)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderLeftColor = est.color; }}
    >
      {/* Nombre con punto de color */}
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(p.total)}</span>
        <AccionesTrabajo id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} compact />
      </div>
    </div>
  );
}

function FilaLista({ id, p, onCambiarEstado, onEliminar, onCargar }) {
  const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
  return (
    <div className="lista-fila" style={{
      display: "grid", gridTemplateColumns: "1fr 120px 130px auto",
      alignItems: "center", gap: 12, padding: "12px 16px",
      borderBottom: "1px solid var(--border)", transition: "background 0.12s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--accent-soft)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {/* Info */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", background: `${est.color}22`, color: est.color, border: `1px solid ${est.color}44`, borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>
            {est.icon} {est.label}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", fontWeight: 300 }}>
          {fmtFecha(parseInt(id))} · {p.items.length} mód.
          {p.cliente && p.cliente.nombre && <span> · 👤 {p.cliente.nombre}</span>}
        </div>
        {/* Total y acciones visibles solo en mobile (dentro del bloque info) */}
        <div className="lista-mobile-row" style={{ display: "none", marginTop: 10, alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(p.total)}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <select value={p.estado || "nuevo"} onChange={e => onCambiarEstado(id, e.target.value)}
              style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "4px 6px", background: `${est.color}18`, border: `1px solid ${est.color}44`, color: est.color, borderRadius: 6, cursor: "pointer", outline: "none", fontWeight: 700 }}>
              {ESTADOS_TRABAJO.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
            </select>
            <AccionesTrabajo id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} compact />
          </div>
        </div>
      </div>
      {/* Total — oculto en mobile */}
      <div className="lista-desktop-col lista-fila-total" style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: "#7ecf8a", textAlign: "right" }}>
        {fmtPeso(p.total)}
      </div>
      {/* Selector — oculto en mobile */}
      <select className="lista-desktop-col" value={p.estado || "nuevo"} onChange={e => onCambiarEstado(id, e.target.value)}
        style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "5px 6px", background: `${est.color}18`, border: `1px solid ${est.color}44`, color: est.color, borderRadius: 6, cursor: "pointer", outline: "none", fontWeight: 700 }}>
        {ESTADOS_TRABAJO.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
      </select>
      {/* Acciones — ocultas en mobile */}
      <div className="lista-desktop-col">
        <AccionesTrabajo id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} compact />
      </div>
    </div>
  );
}

function TableroKanban({ presupuestos, onCambiarEstado, onEliminar, onCargar }) {
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
                          <TarjetaKanban key={id} id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} />
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
                  <FilaLista key={id} id={id} p={p} onCambiarEstado={onCambiarEstado} onEliminar={onEliminar} onCargar={onCargar} />
                ))
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

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
      {/* Brand */}
      <div className="rsp-brand" style={{ padding: "16px 0", flexShrink: 0 }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 19, fontWeight: 900, color: "var(--accent)", lineHeight: 1, letterSpacing: "-0.01em" }}>
          🪵 CarpiCálc
        </div>
        <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 3, color: "var(--text-muted)", fontWeight: 300 }}>
          Sistema de presupuestos
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
          transform: shake ? "translateX(0)" : "none",
          animation: shake ? "shake 0.4s ease" : "none",
        }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🪵</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>
              CarpiCálc
            </div>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 6, color: "var(--text-muted)", fontWeight: 300 }}>
              Sistema de presupuestos
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
  const [cargando, setCargando] = useState(true);
  const [saveEst, setSaveEst] = useState(null);
  const [items, setItems] = useState([]);
  const [dimOverride, setDimOverride] = useState({});

  useEffect(() => {
    cargarDatos().then(({ modulos, costos, presupuestos }) => {
      setModulos(modulos);
      setCostos(costos);
      setPresupuestos(presupuestos || {});
      setCargando(false);
    });
  }, []);

  // 5. Prevenir pérdida de datos al cerrar/recargar con presupuesto activo
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
  const hSaveC = (data) => withSave(() => guardarCostos(data));

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

  const handleGuardarPresupuesto = async (nombre, cliente, nota) => {
    const id = String(Date.now());
    const nuevo = {
      ...presupuestos,
      [id]: {
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
  };
  const handleCargarPresupuesto = (p) => {
    setItems([...p.items]);
    setDimOverride({ ...p.dimOverride });
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

  const tabs = [
    { id: "presupuesto", label: "Presupuesto", icon: "📋" },
    { id: "preview", label: "Vista previa", icon: "📄" },
    { id: "corte", label: "Corte", icon: "🪚" },
    { id: "trabajos", label: "Trabajos", icon: "📊" },
    { id: "catalogo", label: "Catálogo", icon: "🗂" },
    { id: "costos", label: "Costos", icon: "💰" },
  ];

  if (cargando)
    return (
      <>
        <GlobalStyles />
        <div
          style={{
            minHeight: "100vh",
            background: "var(--bg-base)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'DM Mono',monospace",
              color: "var(--text-muted)",
              fontSize: 14,
              letterSpacing: "0.15em",
            }}
          >
            ⟳ Cargando...
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
            />
          )}
          {vista === "preview" && (
            <VistaPrevia
              items={items}
              modulos={modulos}
              costos={costos}
              onLimpiar={() => {
                setItems([]);
                setDimOverride({});
              }}
              getModUsado={getModUsado}
              totalGeneral={totalGeneral}
              presupuestos={presupuestos}
            />
          )}
          {vista === "corte" && (
            <ListaCorte
              items={items}
              modulos={modulos}
              costos={costos}
              getModUsado={getModUsado}
              presupuestos={presupuestos}
            />
          )}
          {vista === "trabajos" && (
            <TableroKanban
              presupuestos={presupuestos}
              onCambiarEstado={handleCambiarEstado}
              onEliminar={handleEliminarPresupuesto}
              onCargar={(p) => { handleCargarPresupuesto(p); setVista("presupuesto"); }}
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
            />
          )}
          {vista === "costos" && (
            <HojaCostos costos={costos} setCostos={setCostos} onSave={hSaveC} />
          )}
        </main>
      </div>
    </>
  );
}
