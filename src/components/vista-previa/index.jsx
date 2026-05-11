import React, { useState, useEffect } from 'react';
import { ToggleSwitch } from '../ui/index.jsx';
import useIsMobile from '../../hooks/useIsMobile.js';
import VistaModuloSVG from '../vista-svg/index.js';
import { useTema } from '../../hooks/useTema.js';
import { fmtPeso, fmtNum, fmtFecha,
         calcularModulo, calcularTotalVisual, recalcularTotalPresupuesto,
         getPrecioRefActual, presupuestoNecesitaActualizacion,
         generarTextoWhatsApp } from '../../utils.js';
import { ESTADOS_TRABAJO, TIPO_MAT } from '../../constants.js';
import { imprimirPresupuesto } from '../presupuesto/index.jsx';

// ── Paper document colors (always light — mimics printed sheet) ─────────
const P = {
  bg:     '#FDFAF5',
  text:   '#1C1A16',
  muted:  '#7A7060',
  accent: '#9A7620',
  sep:    '#CCBFA0',
  border: '#DDD5BF',
  rowAlt: '#F7F2E8',
  green:  '#1A5C3A',
};

const COLOR_CD = { mo: "#9b7fd4", material: "#7090c0", herraje: "#c0906a", tapacanto: "#6aab8e" };
const LABEL_CD = { mo: "M.O.", material: "Material", herraje: "Herraje", tapacanto: "Tapacanto" };

// ── BtnOjo ────────────────────────────────────────────────────────────────
function BtnOjo({ keyId, itemsOcultos, onToggleOculto }) {
  const esOculto = itemsOcultos.includes(keyId);
  return (
    <button
      onClick={() => onToggleOculto(keyId)}
      title={esOculto ? "Oculto del PDF — clic para mostrar" : "Visible en PDF — clic para ocultar"}
      style={{
        padding: "4px 8px", borderRadius: 5, cursor: "pointer", flexShrink: 0,
        border: `1px solid ${esOculto ? "rgba(200,60,60,0.40)" : "var(--border)"}`,
        background: esOculto ? "rgba(200,60,60,0.10)" : "transparent",
        color: esOculto ? "#e07070" : "var(--text-muted)",
        fontSize: 13, lineHeight: 1, transition: "all 0.15s",
      }}
    >
      {esOculto ? "🚫" : "👁"}
    </button>
  );
}

// ── SeccionColapsable (sidebar) ───────────────────────────────────────────
function SeccionColapsable({ titulo, resumen, children, defaultOpen = false }) {
  const [abierta, setAbierta] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button
        onClick={() => setAbierta(a => !a)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 20px", cursor: "pointer", background: "transparent", border: "none", textAlign: "left" }}
      >
        <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", flexShrink: 0 }}>
          {titulo}
        </span>
        {!abierta && resumen && (
          <span style={{ flex: 1, fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>
            {resumen}
          </span>
        )}
        {abierta && <div style={{ flex: 1 }} />}
        <span style={{ color: "var(--text-muted)", fontSize: 11, display: "inline-block", transition: "transform 0.18s", transform: abierta ? "rotate(180deg)" : "none", flexShrink: 0 }}>▾</span>
      </button>
      {abierta && (
        <div style={{ padding: "0 20px 16px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── ListaItemsVP (sidebar visibility panel) ───────────────────────────────
function ListaItemsVP({ items, modulos, costos, dimOverride, composicionOverride, costosDirectos = [], adicionales = [], itemsOcultos, onToggleOculto, mostrarPrecioUnitario }) {
  const { tema } = useTema();
  const validos = (items || []).filter(item => modulos[item.codigo]);
  const hayCDs  = costosDirectos.length > 0;
  const hayAds  = adicionales.length > 0;

  if (validos.length === 0 && !hayCDs && !hayAds) return (
    <div style={{ padding: "12px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
      Sin ítems.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {validos.map((item) => {
        const keyId  = item.id || item.codigo;
        const base   = modulos[item.codigo];
        const dims   = (dimOverride && dimOverride[keyId]) || base?.dimensiones;
        const comp   = composicionOverride?.[keyId];
        const modUsado = { ...base, dimensiones: dims, vistaConfig: comp?.vistaConfig ?? base?.vistaConfig };
        const calc   = calcularModulo(modUsado, costos);
        if (!calc) return null;
        const esOculto = itemsOcultos.includes(keyId);

        return (
          <div key={keyId} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7,
            background: esOculto ? "rgba(200,60,60,0.05)" : "var(--bg-subtle)",
            border: `1px solid ${esOculto ? "rgba(200,60,60,0.20)" : "var(--border)"}`,
            opacity: esOculto ? 0.6 : 1, transition: "all 0.15s",
          }}>
            <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 5, overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
              <VistaModuloSVG modulo={modUsado} vistaConfig={modUsado.vistaConfig} theme={tema} width={36} height={36} plano={true} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {modUsado.nombre}
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "var(--text-muted)", display: "flex", gap: 6 }}>
                <span>×{item.cantidad}</span>
                {mostrarPrecioUnitario && <span>{fmtPeso(calc.total * item.cantidad)}</span>}
              </div>
            </div>
            <BtnOjo keyId={keyId} itemsOcultos={itemsOcultos} onToggleOculto={onToggleOculto} />
          </div>
        );
      })}

      {hayCDs && costosDirectos.map(x => {
        const keyId  = `cd-${x.id}`;
        const esOculto = itemsOcultos.includes(keyId);
        return (
          <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7, background: esOculto ? "rgba(200,60,60,0.05)" : "var(--bg-subtle)", border: `1px solid ${esOculto ? "rgba(200,60,60,0.20)" : "var(--border)"}`, opacity: esOculto ? 0.6 : 1 }}>
            <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: COLOR_CD[x.tipo] || "var(--text-secondary)", minWidth: 54 }}>{LABEL_CD[x.tipo] || x.tipo}</span>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.nombre}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--color-positive)", flexShrink: 0 }}>{fmtPeso(x.subtotal)}</span>
            <BtnOjo keyId={keyId} itemsOcultos={itemsOcultos} onToggleOculto={onToggleOculto} />
          </div>
        );
      })}

      {hayAds && adicionales.map(x => {
        const keyId  = `ad-${x.id}`;
        const esOculto = itemsOcultos.includes(keyId);
        return (
          <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7, background: esOculto ? "rgba(200,60,60,0.05)" : "var(--bg-subtle)", border: `1px solid ${esOculto ? "rgba(200,60,60,0.20)" : "var(--border)"}`, opacity: esOculto ? 0.6 : 1 }}>
            <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--text-muted)", minWidth: 54 }}>EXTRA</span>
            <span style={{ flex: 1, fontSize: 12, fontStyle: "italic", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.nombre}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--color-positive)", flexShrink: 0 }}>{fmtPeso(x.monto)}</span>
            <BtnOjo keyId={keyId} itemsOcultos={itemsOcultos} onToggleOculto={onToggleOculto} />
          </div>
        );
      })}

      {itemsOcultos.length > 0 && (
        <div style={{ marginTop: 4, padding: "5px 8px", borderRadius: 5, background: "rgba(200,60,60,0.06)", border: "1px solid rgba(200,60,60,0.18)", fontSize: 10, fontFamily: "'DM Mono',monospace", color: "#e07070" }}>
          🚫 {itemsOcultos.length} oculto{itemsOcultos.length !== 1 ? "s" : ""} del PDF
        </div>
      )}
    </div>
  );
}

// ── VistaPrevia ───────────────────────────────────────────────────────────
function VistaPrevia({
  // eslint-disable-next-line no-unused-vars
  items, modulos, costos, onLimpiar, getModUsado,
  // eslint-disable-next-line no-unused-vars
  totalGeneral, presupuestos, perfil,
  onActualizarPresupuesto, onCambiarEstado,
  // eslint-disable-next-line no-unused-vars
  onCargarPresupuesto,
  presupuestoSelId,
  costosVersion = 0,
  onVerRentabilidad,
  onEditarModulos,
}) {
  const isMobile = useIsMobile();
  const entries = Object.entries(presupuestos).sort((a, b) => (b[1].creadoEn || 0) - (a[1].creadoEn || 0));

  const [presSelIdLocal, setPresSelIdLocal] = useState(presupuestoSelId || null);
  const presSelId = presupuestoSelId !== undefined ? presupuestoSelId : presSelIdLocal;
  const setPresSelId = (id) => setPresSelIdLocal(id);

  const [selectorAbierto, setSelectorAbierto]   = useState(!presupuestoSelId);
  const [busqueda, setBusqueda]                 = useState("");
  const [mostrarPrecioUnitario, setMostrarPrecioUnitario] = useState(true);
  const [itemsOcultos, setItemsOcultos]         = useState([]);
  const [extraPages, setExtraPages]             = useState([]);
  const [paginaActiva, setPaginaActiva]         = useState('main');
  const agregarHoja = (tipo) => {
    const id = crypto.randomUUID();
    setExtraPages(p => [...p, { id, tipo }]);
    setPaginaActiva(id);
  };
  const eliminarHoja = (id) => {
    setExtraPages(p => p.filter(h => h.id !== id));
    setPaginaActiva(prev => prev === id ? 'main' : prev);
  };
  const temaPDF = "dorado";
  const [whatsappCopiado, setWhatsappCopiado]   = useState(false);
  const [guardandoTexto, setGuardandoTexto]     = useState(false);
  const [actualizadoVP, setActualizadoVP]       = useState(false);
  const [textoApertura, setTextoApertura]       = useState("");
  const [condiciones, setCondiciones]           = useState("");
  const [descuentoVP, setDescuentoVP]           = useState("");
  const [gananciaExtraVP, setGananciaExtraVP]   = useState("");

  const presSel  = presSelId ? presupuestos[presSelId] : null;
  const estSel   = presSel ? (ESTADOS_TRABAJO.find(e => e.id === (presSel.estado || "nuevo")) || ESTADOS_TRABAJO[0]) : null;
  const descuentoActual = parseFloat(presSel?.descuento) || 0;
  const gananciaActual  = parseFloat(presSel?.gananciaExtra) || 0;
  const totalAjustado   = (presSel?.total || 0) + gananciaActual - descuentoActual;
  const hayAjustes      = descuentoActual > 0 || gananciaActual > 0;
  const necesitaAct     = presSelId && presupuestoNecesitaActualizacion(presSelId, costosVersion, presSel);

  useEffect(() => {
    const p = presSelId ? presupuestos[presSelId] : null;
    if (p) {
      setTextoApertura(p.textoApertura || perfil?.textoApertura || "");
      setCondiciones(p.condiciones || perfil?.condiciones || "");
      setDescuentoVP(p.descuento ?? "");
      setGananciaExtraVP(p.gananciaExtra ?? "");
      setItemsOcultos(p.itemsOcultos || []);
      setSelectorAbierto(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presSelId]);

  const toggleOculto = (keyId) => {
    const nuevos = itemsOcultos.includes(keyId)
      ? itemsOcultos.filter(k => k !== keyId)
      : [...itemsOcultos, keyId];
    setItemsOcultos(nuevos);
    onActualizarPresupuesto(presSelId, { itemsOcultos: nuevos });
  };

  const guardarTextos = () => {
    if (!presSelId) return;
    onActualizarPresupuesto(presSelId, { textoApertura, condiciones });
    setGuardandoTexto(true);
    setTimeout(() => setGuardandoTexto(false), 1800);
  };

  const guardarAjuste = (d, g) =>
    onActualizarPresupuesto(presSelId, { descuento: parseFloat(d) || 0, gananciaExtra: parseFloat(g) || 0 });

  const itemsVisibles = (presSel?.items || []).filter(item => !itemsOcultos.includes(item.id || item.codigo));

  const handleWhatsApp = () => {
    if (!presSel) return;
    const getModUsadoLocal = (item) => {
      const base = modulos[item.codigo];
      const key = item.id || item.codigo;
      const dims = presSel.dimOverride?.[key] || base?.dimensiones;
      const comp = presSel.composicionOverride?.[key];
      return { ...base, dimensiones: dims, vistaConfig: comp?.vistaConfig ?? base?.vistaConfig };
    };
    const txt = generarTextoWhatsApp(itemsVisibles, modulos, costos, getModUsadoLocal, presSel.total, presSel.nombre, presSel.cliente);
    navigator.clipboard.writeText(txt).then(() => { setWhatsappCopiado(true); setTimeout(() => setWhatsappCopiado(false), 2500); });
  };

  const handlePDF = () => {
    if (!presSel) return;
    const getModUsadoLocal = (item) => {
      const base = modulos[item.codigo];
      const key = item.id || item.codigo;
      const dims = presSel.dimOverride?.[key] || base?.dimensiones;
      const comp = presSel.composicionOverride?.[key];
      return { ...base, dimensiones: dims, vistaConfig: comp?.vistaConfig ?? base?.vistaConfig };
    };
    const adicionalesVisibles   = (presSel.adicionales   || []).filter(x => !itemsOcultos.includes(`ad-${x.id}`));
    const costosDirectosVisibles = (presSel.costosDirectos || []).filter(x => !itemsOcultos.includes(`cd-${x.id}`));
    imprimirPresupuesto(itemsVisibles, modulos, costos, getModUsadoLocal, presSel.total, presSel.nombre, mostrarPrecioUnitario, presSel.cliente, textoApertura, condiciones, presSel.descuento || 0, presSel.gananciaExtra || 0, temaPDF, adicionalesVisibles, costosDirectosVisibles, presSel.renderUrl || null);
  };

  const handleActualizar = () => {
    const nuevoTotalMod  = recalcularTotalPresupuesto(presSel, modulos, costos);
    const nuevosCDs      = (presSel.costosDirectos || []).map(x => {
      if (x.precioManual) return x;
      const p = getPrecioRefActual(x.tipo, x.refId, costos);
      return p ? { ...x, precioUnit: p, subtotal: Math.round(x.cantidad * p) } : x;
    });
    const totalCD  = nuevosCDs.reduce((a, x) => a + (x.subtotal || 0), 0);
    const totalAd  = (presSel.adicionales || []).reduce((a, x) => a + (parseFloat(x.monto) || 0), 0);
    onActualizarPresupuesto(presSelId, { total: Math.round((nuevoTotalMod || 0) + totalCD + totalAd), costosVersionAl: Date.now(), costosDirectos: nuevosCDs });
    setActualizadoVP(true);
    setTimeout(() => setActualizadoVP(false), 3000);
  };

  const limpiarVista = () => {
    setPresSelId(null);
    setSelectorAbierto(true);
    setBusqueda("");
  };

  // ── btn styles helpers ────────────────────────────────────────────
  const btnBase = { padding: "7px 14px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, transition: "all 0.15s", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)" };
  const btnAccent = { ...btnBase, border: "1.5px solid var(--accent)", color: "var(--accent)" };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div style={{ margin: "0 -20px", display: "flex", flexDirection: "column", position: "relative" }}>

      {/* ── TOP TOOLBAR ─────────────────────────────────────────────── */}
      <div style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "8px 12px" : "10px 20px", flexWrap: isMobile ? "wrap" : "nowrap", boxShadow: "0 1px 0 var(--separator)", position: "relative", zIndex: 101 }}>

        {/* Selector button */}
        <button
          onClick={() => setSelectorAbierto(a => !a)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 7, cursor: "pointer", background: selectorAbierto ? "var(--accent-soft)" : "var(--bg-subtle)", border: `1px solid ${selectorAbierto ? "var(--accent-border)" : "var(--border)"}`, maxWidth: 280, minWidth: 120, transition: "all 0.15s" }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, opacity: 0.45 }}>
            <circle cx="5.5" cy="5.5" r="4" stroke="var(--text-muted)" strokeWidth="1.5"/>
            <line x1="8.7" y1="8.7" x2="12" y2="12" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {presSel ? (
            <>
              {estSel && (
                <span style={{ fontSize: 8, fontWeight: 700, background: `${estSel.color}20`, color: estSel.color, border: `1px solid ${estSel.color}30`, borderRadius: 3, padding: "2px 5px", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
                  {estSel.icon}
                </span>
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {presSel.nombre}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
              Seleccioná un presupuesto...
            </span>
          )}
          <span style={{ color: "var(--text-muted)", fontSize: 10, flexShrink: 0, transition: "transform 0.18s", display: "inline-block", transform: selectorAbierto ? "rotate(180deg)" : "none" }}>▾</span>
        </button>

        {/* Estado select */}
        {presSel && estSel && (
          <select
            value={presSel.estado || "nuevo"}
            onChange={e => onCambiarEstado(presSelId, e.target.value)}
            style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 700, padding: "6px 8px", borderRadius: 6, cursor: "pointer", outline: "none", background: `${estSel.color}14`, border: `1.5px solid ${estSel.color}50`, color: estSel.color }}
          >
            {ESTADOS_TRABAJO.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
          </select>
        )}

        <div style={{ flex: 1 }} />

        {/* Actualizar */}
        {presSel && necesitaAct && !actualizadoVP && (
          <button onClick={handleActualizar} style={{ ...btnBase, background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a", whiteSpace: "nowrap" }}>
            ↻ Actualizar
          </button>
        )}
        {actualizadoVP && (
          <span style={{ padding: "6px 10px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(126,207,138,0.15)", border: "1px solid rgba(126,207,138,0.40)", color: "var(--color-positive)", whiteSpace: "nowrap" }}>✓ Actualizado</span>
        )}

        {/* WA */}
        {presSel && (
          <button onClick={handleWhatsApp} style={{ ...btnBase, background: whatsappCopiado ? "rgba(126,207,138,0.12)" : "transparent", border: `1px solid ${whatsappCopiado ? "rgba(126,207,138,0.40)" : "var(--border)"}`, color: whatsappCopiado ? "#7ecf8a" : "var(--text-secondary)" }}>
            {whatsappCopiado ? "✓ Copiado" : "📲 WA"}
          </button>
        )}

        {/* PDF */}
        {presSel && (
          <button onClick={handlePDF} style={btnAccent}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "var(--text-inverted)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--accent)"; }}
          >
            🖨 PDF
          </button>
        )}

        {/* Guardar */}
        {presSel && (
          <button onClick={guardarTextos} style={{ ...btnBase, background: guardandoTexto ? "rgba(126,207,138,0.15)" : "var(--accent-soft)", border: `1px solid ${guardandoTexto ? "rgba(126,207,138,0.4)" : "var(--accent-border)"}`, color: guardandoTexto ? "#7ecf8a" : "var(--accent)" }}>
            {guardandoTexto ? "✓ Guardado" : "💾 Guardar"}
          </button>
        )}

        {/* + Hoja / + Plano */}
        {presSel && (
          <>
            <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />
            <button onClick={() => agregarHoja('continua')} style={{ ...btnBase, padding: "5px 10px", fontSize: 10 }}>+ Hoja</button>
          </>
        )}

        {/* Clear */}
        {presSelId && (
          <button onClick={limpiarVista} style={{ ...btnBase, border: "1px solid rgba(200,60,60,0.25)", color: "#e07070", padding: "6px 10px" }}>
            ✕
          </button>
        )}
      </div>

      {/* ── DROPDOWN SELECTOR ────────────────────────────────────────── */}
      {selectorAbierto && (
        <div style={{ position: "absolute", top: 52, left: 0, right: 0, zIndex: 200, background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          {/* Buscador */}
          <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--separator)" }}>
            <input
              autoFocus
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o cliente..."
              style={{ width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: "7px 12px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />
          </div>

          {entries.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Sin presupuestos guardados.
            </div>
          ) : (
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {(() => {
                const q = busqueda.toLowerCase();
                const filtrados = entries.filter(([, p]) =>
                  !q || p.nombre?.toLowerCase().includes(q) || p.cliente?.nombre?.toLowerCase().includes(q)
                );
                if (filtrados.length === 0) return (
                  <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 12, fontStyle: "italic" }}>Sin resultados.</div>
                );
                return filtrados.map(([id, p]) => {
                  const est   = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
                  const activo = presSelId === id;
                  const tv    = calcularTotalVisual(p.total, p.descuento, p.gananciaExtra);
                  return (
                    <div key={id}
                      onClick={() => { setPresSelId(id); setSelectorAbierto(false); setBusqueda(""); }}
                      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--separator)", background: activo ? "var(--accent-soft)" : "transparent", borderLeft: `3px solid ${activo ? "var(--accent)" : "transparent"}`, transition: "background 0.12s" }}
                      onMouseEnter={e => { if (!activo) e.currentTarget.style.background = "var(--bg-subtle)"; }}
                      onMouseLeave={e => { if (!activo) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: 9, fontWeight: 700, background: `${est.color}20`, color: est.color, border: `1px solid ${est.color}30`, borderRadius: 3, padding: "2px 6px", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
                        {est.icon} {est.label}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: activo ? "var(--accent)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</div>
                        {p.cliente?.nombre && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.cliente.nombre}</div>}
                      </div>
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: tv.hayDescuento ? "var(--text-muted)" : "#7ecf8a", textDecoration: tv.hayDescuento ? "line-through" : "none", opacity: tv.hayDescuento ? 0.55 : 1 }}>
                          {fmtPeso(p.total)}
                        </div>
                        {tv.hayDescuento && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "var(--color-positive)" }}>{fmtPeso(tv.totalFinal)}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        {onVerRentabilidad && (
                          <button onClick={e => { e.stopPropagation(); onVerRentabilidad(id); }}
                            style={{ padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(134,200,150,0.15)", border: "1px solid rgba(134,200,150,0.35)", color: "#6db885" }}>
                            Rent.
                          </button>
                        )}
                        {onEditarModulos && (
                          <button onClick={e => { e.stopPropagation(); onEditarModulos(id, p); }}
                            style={{ padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                            ✎
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── MAIN AREA: Document + Sidebar ───────────────────────────── */}
      {entries.length === 0 ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400, background: "var(--bg-base)" }}>
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <div style={{ marginBottom: 16, opacity: 0.5 }} dangerouslySetInnerHTML={{ __html: `<svg width="52" height="52" viewBox="0 0 52 52" fill="none"><rect x="10" y="8" width="32" height="36" rx="6" stroke="var(--accent)" stroke-width="1.5" opacity="0.5"/><line x1="18" y1="20" x2="34" y2="20" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/><line x1="18" y1="27" x2="34" y2="27" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/><line x1="18" y1="34" x2="26" y2="34" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" opacity="0.25"/></svg>` }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Sin presupuestos guardados</p>
            <p style={{ fontSize: 12, lineHeight: 1.6 }}>Guardá uno desde <strong style={{ color: "var(--accent)" }}>📋 Presupuesto</strong>.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: isMobile ? "auto" : "calc(100vh - 130px)" }}>

          {/* ── DOCUMENT CANVAS ───────────────────────────────────── */}
          <div style={{ flex: 1, background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden", order: isMobile ? 2 : 1, minHeight: isMobile ? 420 : "auto" }}>

            {/* ── Tab bar ──────────────────────────────────────────── */}
            {presSel && (
              <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-end", gap: 2, padding: "10px 20px 0", background: "#f4f4f4", borderBottom: "1px solid #ddd" }}>
                <div onClick={() => setPaginaActiva('main')} style={{ padding: "6px 14px", borderRadius: "6px 6px 0 0", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: -1, transition: "all 0.15s", background: paginaActiva === 'main' ? "#fff" : "transparent", border: `1px solid ${paginaActiva === 'main' ? "#ddd" : "transparent"}`, borderBottom: `1px solid ${paginaActiva === 'main' ? "#fff" : "transparent"}`, color: paginaActiva === 'main' ? "#1a1a1a" : "#888", opacity: paginaActiva === 'main' ? 1 : 0.65 }}>
                  Pág. 1
                </div>
                {extraPages.map((page, i) => (
                  <div key={page.id} onClick={() => setPaginaActiva(page.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 8px 6px 14px", borderRadius: "6px 6px 0 0", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, marginBottom: -1, transition: "all 0.15s", background: paginaActiva === page.id ? "#fff" : "transparent", border: `1px solid ${paginaActiva === page.id ? "#ddd" : "transparent"}`, borderBottom: `1px solid ${paginaActiva === page.id ? "#fff" : "transparent"}`, color: paginaActiva === page.id ? "#1a1a1a" : "#888", opacity: paginaActiva === page.id ? 1 : 0.65 }}>
                    <span>{`Pág. ${i + 2}`}</span>
                    <button onClick={e => { e.stopPropagation(); eliminarHoja(page.id); }} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: "#999", padding: 0, lineHeight: 1, opacity: 0.6 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Paper scroll area ────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: "auto", background: "#fff", padding: "40px 48px 80px" }}>
            {!presSel ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, color: "var(--text-muted)", gap: 12, opacity: 0.6 }}>
                <span style={{ fontSize: 32 }}>📋</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>Seleccioná un presupuesto</p>
                <p style={{ fontSize: 12, margin: 0 }}>Usá el selector de arriba para elegir uno</p>
              </div>
            ) : (() => {
              const itemsVisiblesPaper = (presSel.items || []).filter(item => {
                if (itemsOcultos.includes(item.id || item.codigo)) return false;
                return !!modulos[item.codigo];
              });
              const cdsVisibles = (presSel.costosDirectos || []).filter(x => !itemsOcultos.includes(`cd-${x.id}`));
              const adsVisibles = (presSel.adicionales || []).filter(x => !itemsOcultos.includes(`ad-${x.id}`));
              const totalUnidades = (presSel.items || []).reduce((s, i) => s + i.cantidad, 0);

              const paperStyle = { width: "100%", background: P.bg, color: P.text, padding: "52px 56px", fontFamily: "'Bricolage Grotesque', sans-serif" };
              const cabecera = (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 }}>
                    <div>
                      {perfil?.logo && <img src={perfil.logo} alt="logo" style={{ height: 40, marginBottom: 6, display: "block" }} />}
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: P.accent, lineHeight: 1 }}>{perfil?.nombre || "CarpiCálc"}</div>
                      {perfil?.slogan && <div style={{ fontSize: 9, color: P.muted, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 3 }}>{perfil.slogan}</div>}
                      <div style={{ marginTop: 10, fontSize: 10, color: P.muted, lineHeight: 1.8 }}>
                        {perfil?.email && <div>✉ {perfil.email}</div>}
                        {perfil?.tel && <div>✆ {perfil.tel}</div>}
                        {perfil?.direccion && <div>⌖ {perfil.direccion}</div>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: P.muted }}>PRESUPUESTO</div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, color: P.text, marginTop: 2, letterSpacing: "-0.01em" }}>{presSel.nombre}</div>
                      {presSel.creadoEn && <div style={{ marginTop: 8, fontSize: 10, color: P.muted }}>Fecha: {fmtFecha(presSel.creadoEn)}</div>}
                    </div>
                  </div>
                  <div style={{ height: 1.5, background: `linear-gradient(90deg, transparent, ${P.sep}, transparent)`, margin: "0 0 14px" }} />
                  {textoApertura && <div style={{ fontSize: 11, color: P.muted, fontStyle: "italic", marginBottom: 20, lineHeight: 1.8, paddingBottom: 16, borderBottom: `1px solid ${P.border}` }}>{textoApertura}</div>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
                    <div style={{ border: `1px solid ${P.border}`, borderRadius: 5, padding: "9px 11px" }}>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: P.accent, marginBottom: 5 }}>Cliente</div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{presSel.cliente?.nombre || "—"}</div>
                      {presSel.cliente?.tel && <div style={{ fontSize: 10, color: P.muted }}>Tel: {presSel.cliente.tel}</div>}
                      {presSel.cliente?.dir && <div style={{ fontSize: 10, color: P.muted }}>Dir: {presSel.cliente.dir}</div>}
                    </div>
                    <div style={{ border: `1px solid ${P.border}`, borderRadius: 5, padding: "9px 11px" }}>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: P.accent, marginBottom: 5 }}>Proyecto</div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{presSel.nota || "—"}</div>
                    </div>
                  </div>
                </>
              );

              // ── Páginas extra ────────────────────────────────────
              if (paginaActiva !== 'main') {
                const activePage = extraPages.find(p => p.id === paginaActiva);
                if (!activePage) return null;
                return <div style={paperStyle}>{cabecera}</div>;
              }

              return (
                <div style={paperStyle}>
                  {cabecera}

                  {presSel.renderUrl && (
                    <div style={{ marginBottom: 24, borderRadius: 8, overflow: "hidden", border: `1px solid ${P.border}` }}>
                      <img src={presSel.renderUrl} alt="Render del trabajo" style={{ width: "100%", maxHeight: 420, objectFit: "cover", display: "block" }} />
                    </div>
                  )}

                  {/* Items section header */}
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: P.accent, marginBottom: 6, paddingBottom: 6, borderBottom: `1.5px solid ${P.accent}` }}>
                    Detalle de Ítems
                  </div>

                  {/* Table header */}
                  <div style={{ display: "grid", gridTemplateColumns: "38px 52px 1fr 76px 38px 32px 78px", gap: 6, padding: "5px 4px 5px 4px", background: P.rowAlt, borderBottom: `1px solid ${P.border}`, marginBottom: 0 }}>
                    {["", "CÓD.", "DESCRIPCIÓN", "MATERIAL", "ESP.", "×Q", "TOTAL"].map((h, i) => (
                      <div key={i} style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: P.muted, fontFamily: "'DM Mono', monospace", textAlign: i >= 5 ? "right" : "left" }}>{h}</div>
                    ))}
                  </div>

                  {/* Module rows */}
                  {itemsVisiblesPaper.map((item, rowIdx) => {
                    const base = modulos[item.codigo];
                    const keyVP = item.id || item.codigo;
                    const dims = presSel.dimOverride?.[keyVP] || base?.dimensiones;
                    const compVP = presSel.composicionOverride?.[keyVP];
                    const modUsado = { ...base, dimensiones: dims, vistaConfig: compVP?.vistaConfig ?? base?.vistaConfig };
                    const calc = calcularModulo(modUsado, costos);
                    if (!calc) return null;
                    return (
                      <div key={item.id || item.codigo} style={{ display: "grid", gridTemplateColumns: "38px 52px 1fr 76px 38px 32px 78px", gap: 6, padding: "7px 4px", borderBottom: `1px solid ${P.border}`, background: rowIdx % 2 === 1 ? `${P.rowAlt}80` : "transparent", alignItems: "center" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 3, overflow: "hidden", border: `1px solid ${P.border}`, background: "#f0ece0", flexShrink: 0 }}>
                          <VistaModuloSVG modulo={modUsado} vistaConfig={modUsado.vistaConfig} theme="light" width={32} height={32} plano={true} />
                        </div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700, color: P.accent }}>{item.codigo.startsWith("TEMP_") ? "VAR" : item.codigo}</div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: P.text }}>{modUsado.nombre}</div>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: P.muted }}>{dims?.ancho}×{dims?.profundidad}×{dims?.alto} mm · {fmtNum(calc.m2Neto)} m²</div>
                        </div>
                        <div style={{ fontSize: 10, color: P.muted }}>{TIPO_MAT[modUsado.material] || modUsado.material}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: P.muted }}>{calc.espesor ? `${calc.espesor}mm` : "—"}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: P.text, textAlign: "right" }}>×{item.cantidad}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, textAlign: "right", color: P.text }}>{fmtPeso(calc.total * item.cantidad)}</div>
                      </div>
                    );
                  })}

                  {/* CD rows */}
                  {cdsVisibles.map((x, rowIdx) => (
                    <div key={x.id} style={{ display: "grid", gridTemplateColumns: "38px 52px 1fr 76px 38px 32px 78px", gap: 6, padding: "6px 4px", borderBottom: `1px solid ${P.border}`, background: (itemsVisiblesPaper.length + rowIdx) % 2 === 1 ? `${P.rowAlt}80` : "transparent", alignItems: "center" }}>
                      <div />
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, fontWeight: 700, color: COLOR_CD[x.tipo] || P.muted }}>{LABEL_CD[x.tipo] || x.tipo}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: P.text }}>{x.nombre}</div>
                      <div style={{ gridColumn: "4 / 7", fontSize: 9, color: P.muted }}>{x.cantidad} {x.unidad} × {fmtPeso(x.precioUnit)}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, textAlign: "right", color: P.text }}>{fmtPeso(x.subtotal)}</div>
                    </div>
                  ))}

                  {/* Adicionales rows */}
                  {adsVisibles.map((x, rowIdx) => (
                    <div key={x.id} style={{ display: "grid", gridTemplateColumns: "38px 52px 1fr 76px 38px 32px 78px", gap: 6, padding: "6px 4px", borderBottom: `1px solid ${P.border}`, background: (itemsVisiblesPaper.length + cdsVisibles.length + rowIdx) % 2 === 1 ? `${P.rowAlt}80` : "transparent", alignItems: "center" }}>
                      <div />
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, fontWeight: 700, color: P.muted }}>EXTRA</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontStyle: "italic", color: P.text, gridColumn: "3 / 7" }}>{x.nombre}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, textAlign: "right", color: P.text }}>{fmtPeso(x.monto)}</div>
                    </div>
                  ))}

                  {/* Totals block */}
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                    <div style={{ fontSize: 9, color: P.muted, fontFamily: "'DM Mono', monospace" }}>
                      Total de ítems: {(presSel.items || []).length} · Total unidades: {totalUnidades}
                    </div>
                    {mostrarPrecioUnitario && itemsVisiblesPaper.map(item => {
                      const base = modulos[item.codigo];
                      const dims = presSel.dimOverride?.[item.id || item.codigo] || base?.dimensiones;
                      const calc = calcularModulo({ ...base, dimensiones: dims }, costos);
                      if (!calc || item.cantidad <= 1) return null;
                      return (
                        <div key={item.id} style={{ fontSize: 9, color: P.muted, fontFamily: "'DM Mono', monospace" }}>
                          {item.codigo.startsWith("TEMP_") ? "VAR" : item.codigo}: {fmtPeso(calc.total)} c/u
                        </div>
                      );
                    })}
                    {hayAjustes && (
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: P.muted, textDecoration: "line-through", opacity: 0.6 }}>
                        {fmtPeso(presSel.total)}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "10px 18px", background: P.rowAlt, border: `1.5px solid ${P.border}`, borderRadius: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: P.muted, fontFamily: "'DM Mono', monospace" }}>TOTAL</span>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, color: P.green }}>
                        {fmtPeso(hayAjustes ? totalAjustado : presSel.total)}
                      </span>
                    </div>
                  </div>

                  {/* Conditions */}
                  {condiciones && (
                    <div style={{ marginTop: 28, paddingTop: 16, borderTop: `1px solid ${P.border}` }}>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: P.accent, marginBottom: 8 }}>
                        Condiciones comerciales
                      </div>
                      <div style={{ fontSize: 10, color: P.muted, lineHeight: 1.8 }}>{condiciones}</div>
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ marginTop: 40, paddingTop: 14, borderTop: `1px solid ${P.sep}60`, textAlign: "center", fontSize: 9, color: P.muted, fontStyle: "italic", letterSpacing: "0.04em" }}>
                    Gracias por confiar en {perfil?.nombre || "CarpiCálc"}.
                  </div>

                </div>
              );
            })()}
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ─────────────────────────────────────── */}
          <div style={{ width: isMobile ? "100%" : 308, borderLeft: isMobile ? "none" : "1px solid var(--border)", borderBottom: isMobile ? "1px solid var(--border)" : "none", background: "var(--bg-surface)", overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column", order: isMobile ? 1 : 2 }}>
            {!presSel ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13, marginTop: 40 }}>
                <div style={{ fontSize: 24, marginBottom: 10, opacity: 0.4 }}>⚙</div>
                Seleccioná un presupuesto para editar
              </div>
            ) : (
              <>
                {/* Resumen del total */}
                <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                  <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 4 }}>
                    Total del presupuesto
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 900, color: "var(--color-positive)" }}>
                      {fmtPeso(hayAjustes ? totalAjustado : presSel.total)}
                    </span>
                    {hayAjustes && (
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--text-muted)", textDecoration: "line-through", opacity: 0.5 }}>
                        {fmtPeso(presSel.total)}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                    {(presSel.items || []).length} mód.
                    {(presSel.costosDirectos || []).length > 0 && ` · ${presSel.costosDirectos.length} CD`}
                    {(presSel.adicionales || []).length > 0 && ` · ${presSel.adicionales.length} extra`}
                  </div>
                </div>

                {/* Ítems + visibilidad */}
                <SeccionColapsable titulo="Ítems del presupuesto" defaultOpen={true}>
                  <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>👁 visible &nbsp;·&nbsp; 🚫 oculto del PDF</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>P.U.</span>
                      <ToggleSwitch value={mostrarPrecioUnitario} onChange={setMostrarPrecioUnitario} label="" />
                    </div>
                  </div>
                  <ListaItemsVP
                    items={presSel.items}
                    modulos={modulos}
                    costos={costos}
                    dimOverride={presSel.dimOverride}
                    composicionOverride={presSel.composicionOverride}
                    costosDirectos={presSel.costosDirectos || []}
                    adicionales={presSel.adicionales || []}
                    itemsOcultos={itemsOcultos}
                    onToggleOculto={toggleOculto}
                    mostrarPrecioUnitario={mostrarPrecioUnitario}
                  />
                </SeccionColapsable>

                {/* Ajustes de precio */}
                {(() => {
                  const resumenAjustes = descuentoActual > 0 || gananciaActual > 0
                    ? `${descuentoActual > 0 ? `−${fmtPeso(descuentoActual)}` : ""}${descuentoActual > 0 && gananciaActual > 0 ? " / " : ""}${gananciaActual > 0 ? `+${fmtPeso(gananciaActual)}` : ""} → ${fmtPeso(totalAjustado)}`
                    : "Sin ajustes";
                  return (
                    <SeccionColapsable titulo="Ajustes de precio" resumen={resumenAjustes}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#e07070", marginBottom: 5 }}>🏷 Descuento −</div>
                          <input type="number" min="0" value={descuentoVP} placeholder="0"
                            onChange={e => setDescuentoVP(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && guardarAjuste(descuentoVP, gananciaExtraVP)}
                            style={{ width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, padding: "6px 8px", textAlign: "right", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "#e07070", outline: "none", boxSizing: "border-box" }}
                            onFocus={e => e.target.style.borderColor = "#e07070"}
                            onBlur={e => { e.target.style.borderColor = "var(--border)"; guardarAjuste(descuentoVP, gananciaExtraVP); }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-positive)", marginBottom: 5 }}>💵 Extra +</div>
                          <input type="number" min="0" value={gananciaExtraVP} placeholder="0"
                            onChange={e => setGananciaExtraVP(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && guardarAjuste(descuentoVP, gananciaExtraVP)}
                            style={{ width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, padding: "6px 8px", textAlign: "right", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--color-positive)", outline: "none", boxSizing: "border-box" }}
                            onFocus={e => e.target.style.borderColor = "var(--color-positive)"}
                            onBlur={e => { e.target.style.borderColor = "var(--border)"; guardarAjuste(descuentoVP, gananciaExtraVP); }}
                          />
                        </div>
                      </div>
                    </SeccionColapsable>
                  );
                })()}

                {/* Render IA */}
                <SeccionColapsable titulo="Render IA" resumen={presSel.renderUrl ? "Incluido en PDF" : "Sin render"} defaultOpen={!!presSel.renderUrl}>
                  {presSel.renderUrl ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <img src={presSel.renderUrl} alt="render" style={{ width: "100%", borderRadius: 7, display: "block" }} />
                      <button
                        onClick={() => onActualizarPresupuesto(presSelId, { renderUrl: null })}
                        style={{ width: "100%", padding: "6px 0", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, background: "rgba(200,60,60,0.10)", border: "1px solid rgba(200,60,60,0.30)", color: "#e07070" }}>
                        Quitar render del presupuesto
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                      Generá un render en la sección <strong style={{ color: "var(--accent)" }}>Render IA</strong> con un presupuesto activo y usá "Importar al presupuesto".
                    </div>
                  )}
                </SeccionColapsable>

                {/* Texto de apertura */}
                <SeccionColapsable titulo="Texto de apertura" resumen={textoApertura ? textoApertura.slice(0, 60) + (textoApertura.length > 60 ? "…" : "") : "Sin texto"}>
                  <textarea value={textoApertura} onChange={e => setTextoApertura(e.target.value)}
                    placeholder="Ej: Estimado cliente, le hacemos llegar el presente presupuesto..."
                    rows={4}
                    style={{ width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 12, padding: "8px 10px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 7, outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }}
                    onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                    onBlur={e => { e.target.style.borderColor = "var(--border)"; guardarTextos(); }}
                  />
                </SeccionColapsable>

                {/* Condiciones */}
                <SeccionColapsable titulo="Condiciones" resumen={condiciones ? condiciones.slice(0, 60) + (condiciones.length > 60 ? "…" : "") : "Sin condiciones"}>
                  <textarea value={condiciones} onChange={e => setCondiciones(e.target.value)}
                    placeholder="Ej: Validez 15 días. Seña del 40% para iniciar."
                    rows={4}
                    style={{ width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 12, padding: "8px 10px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 7, outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }}
                    onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                    onBlur={e => { e.target.style.borderColor = "var(--border)"; guardarTextos(); }}
                  />
                </SeccionColapsable>

                {/* Historial */}
                {(presSel.historialVersiones || []).length > 0 && (
                  <SeccionColapsable titulo="Historial de versiones">
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {(presSel.historialVersiones || []).map((v, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
                          <span>{fmtFecha(v.fecha)}</span>
                          <span>{fmtPeso(v.total)}</span>
                        </div>
                      ))}
                    </div>
                  </SeccionColapsable>
                )}

                {/* Guardar texto (footer del sidebar) */}
                <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", marginTop: "auto" }}>
                  <button onClick={guardarTextos} style={{ width: "100%", padding: "9px 0", borderRadius: 8, cursor: "pointer", background: guardandoTexto ? "rgba(126,207,138,0.15)" : "var(--accent-soft)", border: `1px solid ${guardandoTexto ? "rgba(126,207,138,0.4)" : "var(--accent-border)"}`, color: guardandoTexto ? "#7ecf8a" : "var(--accent)", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, transition: "all 0.2s" }}>
                    {guardandoTexto ? "✓ Guardado" : "💾 Guardar cambios"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { VistaPrevia };
