import React, { useState, useEffect } from 'react';
import { SectionTitle, ToggleSwitch, Badge } from '../ui/index.jsx';
import VistaModuloSVG from '../vista-svg/index.js';
import { useTema } from '../../hooks/useTema.js';
import { fmtPeso, fmtNum, fmtFecha,
         calcularModulo, calcularTotalVisual, recalcularTotalPresupuesto,
         getPrecioRefActual, presupuestoNecesitaActualizacion,
         generarTextoWhatsApp } from '../../utils.js';
import { ESTADOS_TRABAJO } from '../../constants.js';
import { TIPO_MAT } from '../../constants.js';
import { imprimirPresupuesto } from '../presupuesto/index.jsx';
import { guardarPlano } from '../../storage.js';

// ── Helpers internos ──────────────────────────────────────────────
const COLOR_CD = { mo: "#9b7fd4", material: "#7090c0", herraje: "#c0906a", tapacanto: "#6aab8e" };
const LABEL_CD = { mo: "M. de obra", material: "Material", herraje: "Herraje", tapacanto: "Tapacanto" };

function BtnOjo({ keyId, itemsOcultos, onToggleOculto, titleVisible, titleOculto }) {
  const esOculto = itemsOcultos.includes(keyId);
  return (
    <button
      onClick={() => onToggleOculto(keyId)}
      title={esOculto ? titleOculto : titleVisible}
      style={{
        padding: "5px 9px", borderRadius: 6, cursor: "pointer", flexShrink: 0,
        border: `1px solid ${esOculto ? "rgba(200,60,60,0.40)" : "var(--border)"}`,
        background: esOculto ? "rgba(200,60,60,0.10)" : "transparent",
        color: esOculto ? "#e07070" : "var(--text-muted)",
        fontSize: 14, lineHeight: 1, transition: "all 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = esOculto ? "#e07070" : "var(--accent-border)"; e.currentTarget.style.color = esOculto ? "#e07070" : "var(--accent)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = esOculto ? "rgba(200,60,60,0.40)" : "var(--border)"; e.currentTarget.style.color = esOculto ? "#e07070" : "var(--text-muted)"; }}
    >
      {esOculto ? "🚫" : "👁"}
    </button>
  );
}

function SeccionColapsable({ titulo, resumen, children }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <button
        onClick={() => setAbierta(a => !a)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", background: "transparent", border: "none", textAlign: "left" }}
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
        <span style={{ color: "var(--text-muted)", fontSize: 12, display: "inline-block", transition: "transform 0.18s", transform: abierta ? "rotate(180deg)" : "none", flexShrink: 0 }}>▾</span>
      </button>
      {abierta && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── ListaItemsVP ──────────────────────────────────────────────────
// Muestra módulos, costos directos y adicionales con la misma
// estructura visual del editor de Presupuesto + toggle de visibilidad.
// Eye en módulos/adicionales/costos directos → afecta PDF/impresión.
function ListaItemsVP({ items, modulos, costos, dimOverride, costosDirectos = [], adicionales = [], itemsOcultos, onToggleOculto, mostrarPrecioUnitario }) {
  const { tema } = useTema();
  const [expandidoItem, setExpandidoItem] = useState(null); // id del item expandido
  const validos = (items || []).filter(item => modulos[item.codigo]);
  const hayCDs  = costosDirectos.length > 0;
  const hayAds  = adicionales.length > 0;
  const hayOcultosVisible = [...validos, ...adicionales].some(
    x => itemsOcultos.includes(x.id || x.codigo)
  );

  if (validos.length === 0 && !hayCDs && !hayAds) return (
    <div style={{ padding: "20px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
      Sin ítems en este presupuesto.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Módulos ── */}
      {validos.length > 0 && (
        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {validos.map((item) => {
            const keyId = item.id || item.codigo;
            const base = modulos[item.codigo];
            const dims = (dimOverride && dimOverride[`${item.codigo}-${item.id || 0}`]) || base?.dimensiones;
            const modUsado = { ...base, dimensiones: dims };
            const calc = calcularModulo(modUsado, costos);
            if (!calc) return null;

            const over   = modUsado.dimensiones;
            const dimDif = base && (over.ancho !== base.dimensiones.ancho || over.profundidad !== base.dimensiones.profundidad || over.alto !== base.dimensiones.alto);
            const esTemp  = !!base?.temporal;
            const esOculto = itemsOcultos.includes(keyId);
            const expandido = expandidoItem === keyId;

            return (
              <div key={keyId} style={{
                borderRadius: 10,
                border: `1px solid ${esOculto ? "rgba(200,60,60,0.25)" : "var(--border)"}`,
                background: esOculto ? "rgba(200,60,60,0.04)" : "var(--bg-surface)",
                overflow: "hidden", opacity: esOculto ? 0.6 : 1, transition: "all 0.18s",
              }}>
                {/* Fila principal */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", flexWrap: "wrap" }}>

                  {/* Thumbnail compacto — clic para expandir */}
                  <div
                    onClick={() => setExpandidoItem(expandido ? null : keyId)}
                    title={expandido ? "Cerrar detalle" : "Ver detalle"}
                    style={{
                      width: 56, height: 56, flexShrink: 0, cursor: "pointer",
                      border: `1px solid ${expandido ? "var(--accent-border)" : "var(--border)"}`,
                      borderRadius: 7, overflow: "hidden",
                      background: "var(--bg-subtle)", transition: "border-color 0.15s",
                      opacity: esOculto ? 0.35 : 1, filter: esOculto ? "grayscale(80%)" : "none",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-border)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = expandido ? "var(--accent-border)" : "var(--border)"; }}
                  >
                    <VistaModuloSVG
                      modulo={modUsado}
                      vistaConfig={modUsado.vistaConfig}
                      theme={tema}
                      width={56}
                      height={56}
                      plano={true}
                    />
                  </div>

                  {/* Código */}
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>
                    {item.codigo.startsWith("TEMP_") ? "VAR" : item.codigo}
                  </span>

                  {/* Nombre + dims */}
                  <div style={{ flex: 2, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{modUsado.nombre}</span>
                      {esTemp && (
                        <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.30)", color: "#c8a02a", borderRadius: 3, padding: "1px 5px" }}>✦ var</span>
                      )}
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: dimDif ? "var(--accent)" : "var(--text-muted)", marginTop: 2 }}>
                      {over.ancho}×{over.profundidad}×{over.alto} mm
                    </div>
                  </div>

                  {/* Material + espesor */}
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <Badge>{TIPO_MAT[modUsado.material]}</Badge>
                    {calc.espesor && <Badge color="#705090">{calc.espesor}mm</Badge>}
                  </div>

                  {/* Cantidad */}
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>
                    ×{item.cantidad}
                  </span>

                  {/* Precio */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, flexShrink: 0, fontFamily: "'DM Mono',monospace" }}>
                    <span style={{ fontSize: 12, color: "#7ecf8a", fontWeight: 700 }}>{fmtPeso(calc.total * item.cantidad)}</span>
                    {mostrarPrecioUnitario && item.cantidad > 1 && (
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{fmtPeso(calc.total)} c/u</span>
                    )}
                    <span style={{ fontSize: 10, color: "#9ab080" }}>{fmtNum(calc.m2Neto)} m²</span>
                  </div>

                  <BtnOjo keyId={keyId} itemsOcultos={itemsOcultos} onToggleOculto={onToggleOculto}
                    titleVisible="Visible en PDF — clic para ocultar"
                    titleOculto="Oculto de PDF — clic para mostrar" />
                </div>

                {/* Panel expandible */}
                {expandido && (
                  <div style={{
                    display: "grid", gridTemplateColumns: "300px 1fr", gap: 20,
                    padding: 20, background: "rgba(0,0,0,0.1)", borderTop: "1px solid var(--border)",
                  }}>
                    <div>
                      <VistaModuloSVG
                        modulo={modUsado}
                        vistaConfig={modUsado.vistaConfig}
                        theme={tema}
                        width={300}
                        height={300}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start", gap: 12 }}>
                      <h4 style={{ margin: 0, color: "var(--text-primary)" }}>{modUsado.nombre}</h4>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                        {modUsado.descripcion}
                      </p>
                      <dl style={{ margin: 0, fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div>
                          <dt style={{ fontWeight: 700, color: "var(--text-muted)" }}>Material:</dt>
                          <dd style={{ margin: 0, color: "var(--text-primary)" }}>{TIPO_MAT[modUsado.material]}</dd>
                        </div>
                        <div>
                          <dt style={{ fontWeight: 700, color: "var(--text-muted)" }}>Acabado:</dt>
                          <dd style={{ margin: 0, color: "var(--text-primary)" }}>{modUsado.acabado || "—"}</dd>
                        </div>
                        {modUsado.herrajes && modUsado.herrajes.length > 0 && (
                          <div>
                            <dt style={{ fontWeight: 700, color: "var(--text-muted)" }}>Herrajes:</dt>
                            <dd style={{ margin: 0, color: "var(--text-primary)" }}>{modUsado.herrajes.join(", ")}</dd>
                          </div>
                        )}
                      </dl>
                      <button
                        onClick={() => setExpandidoItem(null)}
                        style={{
                          alignSelf: "flex-start", marginTop: 8, padding: "6px 12px", fontSize: 11,
                          borderRadius: 6, border: "1px solid var(--border)", background: "transparent",
                          color: "var(--text-muted)", cursor: "pointer", fontWeight: 700,
                        }}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Costos directos ── */}
      {hayCDs && (
        <>
          <div style={{ margin: "0 12px 4px", height: 1, background: "var(--separator)" }} />
          <div style={{ padding: "4px 12px 6px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", padding: "4px 2px" }}>
              Costos directos
            </div>
            {costosDirectos.map(x => {
              const keyId  = `cd-${x.id}`;
              const esOculto = itemsOcultos.includes(keyId);
              const color  = COLOR_CD[x.tipo] || "var(--text-secondary)";
              return (
                <div key={x.id} style={{
                  borderRadius: 10,
                  border: `1px solid ${esOculto ? "rgba(200,60,60,0.25)" : "var(--border)"}`,
                  background: esOculto ? "rgba(200,60,60,0.04)" : "var(--bg-surface)",
                  overflow: "hidden", opacity: esOculto ? 0.6 : 1, transition: "all 0.18s",
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", alignItems: "center", gap: 12, padding: "10px 14px" }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>
                      {LABEL_CD[x.tipo] || x.tipo}
                    </span>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{x.nombre}</span>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {x.cantidad} {x.unidad} × {fmtPeso(x.precioUnit)}
                      </div>
                    </div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "#7ecf8a", whiteSpace: "nowrap" }}>
                      {fmtPeso(x.subtotal)}
                    </span>
                    <BtnOjo keyId={keyId} itemsOcultos={itemsOcultos} onToggleOculto={onToggleOculto}
                      titleVisible="Visible en PDF — clic para ocultar"
                      titleOculto="Oculto de PDF — clic para mostrar" />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Adicionales ── */}
      {hayAds && (
        <>
          <div style={{ margin: "0 12px 4px", height: 1, background: "var(--separator)" }} />
          <div style={{ padding: "4px 12px 6px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", padding: "4px 2px" }}>
              Servicios y adicionales
            </div>
            {adicionales.map(x => {
              const keyId  = `ad-${x.id}`;
              const esOculto = itemsOcultos.includes(keyId);
              return (
                <div key={x.id} style={{
                  borderRadius: 10,
                  border: `1px solid ${esOculto ? "rgba(200,60,60,0.25)" : "var(--border)"}`,
                  background: esOculto ? "rgba(200,60,60,0.04)" : "var(--bg-surface)",
                  overflow: "hidden", opacity: esOculto ? 0.6 : 1, transition: "all 0.18s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", flexShrink: 0 }}>
                      + Extra
                    </span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontStyle: "italic" }}>
                      {x.nombre}
                    </span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "#7ecf8a", flexShrink: 0 }}>
                      {fmtPeso(x.monto)}
                    </span>
                    <BtnOjo keyId={keyId} itemsOcultos={itemsOcultos} onToggleOculto={onToggleOculto}
                      titleVisible="Visible en PDF — clic para ocultar"
                      titleOculto="Oculto de PDF — clic para mostrar" />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Leyenda cuando hay ítems ocultos que afectan el PDF */}
      {hayOcultosVisible && (
        <div style={{ margin: "0 12px 10px", padding: "6px 10px", borderRadius: 6, background: "rgba(200,60,60,0.06)", border: "1px solid rgba(200,60,60,0.18)", fontSize: 11, fontFamily: "'DM Mono',monospace", color: "#e07070" }}>
          🚫 Ítems marcados no aparecen en el PDF ni la impresión. El total no cambia.
        </div>
      )}
    </div>
  );
}

function VistaPrevia({
  items, modulos, costos, onLimpiar, getModUsado,
  totalGeneral, presupuestos, perfil,
  onActualizarPresupuesto, onCambiarEstado, onCargarPresupuesto,
  presupuestoSelId, onSeleccionarPresupuesto,
  costosVersion = 0,
  onVerRentabilidad,
  onEditarModulos
}) {
  const entries = Object.entries(presupuestos).sort((a, b) => b[0] - a[0]);
  const [presSelIdLocal, setPresSelIdLocal] = useState(presupuestoSelId || null);
  const presSelId = presupuestoSelId !== undefined ? presupuestoSelId : presSelIdLocal;
  const setPresSelId = (id) => {
    setPresSelIdLocal(id);
    if (onSeleccionarPresupuesto) onSeleccionarPresupuesto(id);
  };
  const [acordeonAbierto, setAcordeonAbierto] = useState(!presupuestoSelId);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarPrecioUnitario, setMostrarPrecioUnitario] = useState(true);
  const [itemsOcultos, setItemsOcultos] = useState([]);
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
  const [actualizadoVP, setActualizadoVP] = useState(false);

  const presSel = presSelId ? presupuestos[presSelId] : null;
  const [textoApertura, setTextoApertura] = useState("");
  const [condiciones, setCondiciones] = useState("");

  // UI - Campos de Ajuste: sincronizados bidireccionalmente con Caja
  // Se leen del presupuesto al seleccionarlo y se guardan al cambiar (onBlur)
  const [descuentoVP, setDescuentoVP] = useState("");
  const [gananciaExtraVP, setGananciaExtraVP] = useState("");

  useEffect(() => {
    const p = presSelId ? presupuestos[presSelId] : null;
    if (p) {
      setTextoApertura(p.textoApertura || perfil?.textoApertura || "");
      setCondiciones(p.condiciones || perfil?.condiciones || "");
      setDescuentoVP(p.descuento ?? "");
      setGananciaExtraVP(p.gananciaExtra ?? "");
      setItemsOcultos(p.itemsOcultos || []);
      setAcordeonAbierto(false);
      // Auto-sync Plano 2D — cubre "Ver" desde GestorPresupuestos y selección en acordeón
      const bloques = (p.items || []).flatMap(item => {
        const mod = modulos[item.codigo];
        if (!mod) return [];
        return Array.from({ length: item.cantidad }, () => ({
          id: crypto.randomUUID(),
          codigo: item.codigo,
          nombre: mod.nombre,
          tipoVisual: mod.tipoVisual || null,
          ancho: mod.dimensiones.ancho,
          alto: mod.dimensiones.alto,
          profundidad: mod.dimensiones.profundidad,
        }));
      });
      guardarPlano({ bloques, altoCielorraso: 2400 });
    } else {
      guardarPlano({ bloques: [], altoCielorraso: 2400 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presSelId]);

  // Toggle visibilidad de un ítem en el PDF/impresión
  const toggleOculto = (keyId) => {
    const nuevos = itemsOcultos.includes(keyId)
      ? itemsOcultos.filter(k => k !== keyId)
      : [...itemsOcultos, keyId];
    setItemsOcultos(nuevos);
    onActualizarPresupuesto(presSelId, { itemsOcultos: nuevos });
  };

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

  // Items visibles (filtrar ocultos para PDF y WhatsApp — no afecta cálculos)
  const itemsVisibles = (presSel?.items || []).filter(
    item => !itemsOcultos.includes(item.id || item.codigo)
  );

  const handleWhatsApp = () => {
    if (!presSel) return;
    const txt = generarTextoWhatsApp(
      itemsVisibles, modulos, costos,
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
    // Filtrar módulos, adicionales y costos directos ocultos
    const adicionalesVisibles = (presSel.adicionales || []).filter(
      x => !itemsOcultos.includes(`ad-${x.id}`)
    );
    const costosDirectosVisibles = (presSel.costosDirectos || []).filter(
      x => !itemsOcultos.includes(`cd-${x.id}`)
    );
    imprimirPresupuesto(itemsVisibles, modulos, costos, getModUsadoLocal, presSel.total, presSel.nombre, mostrarPrecioUnitario, presSel.cliente, textoApertura, condiciones, presSel.descuento || 0, presSel.gananciaExtra || 0, temaPDF, adicionalesVisibles, costosDirectosVisibles);
  };

  const estSel = presSel ? (ESTADOS_TRABAJO.find(e => e.id === (presSel.estado || "nuevo")) || ESTADOS_TRABAJO[0]) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <SectionTitle sub="Editá y enviá tus presupuestos guardados">
          Vista Previa
        </SectionTitle>
        {presSelId && (
          <button onClick={() => { guardarPlano({ bloques: [], altoCielorraso: 2400 }); setPresSelId(null); setAcordeonAbierto(true); setBusqueda(""); if (onSeleccionarPresupuesto) onSeleccionarPresupuesto(null); }}
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
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ── Acordeón selector ── */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.22)" }}>
            {/* Trigger — siempre visible */}
            <button
              onClick={() => setAcordeonAbierto(a => !a)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", cursor: "pointer", background: "transparent", border: "none", textAlign: "left" }}
            >
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--accent)", flexShrink: 0 }}>
                {entries.length} pres.
              </span>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0, overflow: "hidden" }}>
                {presSel && estSel ? (
                  <>
                    <span style={{ fontSize: 9, fontWeight: 700, background: `${estSel.color}20`, color: estSel.color, border: `1px solid ${estSel.color}30`, borderRadius: 3, padding: "2px 6px", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
                      {estSel.icon} {estSel.label}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {presSel.nombre}
                    </span>
                    {presSel.cliente?.nombre && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 2 }}>
                        · {presSel.cliente.nombre}
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
                    Seleccioná un presupuesto...
                  </span>
                )}
              </div>
              {presSel && (
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#7ecf8a", flexShrink: 0 }}>
                  {fmtPeso(presSel.total)}
                </span>
              )}
              <span style={{ color: "var(--text-muted)", fontSize: 14, flexShrink: 0, display: "inline-block", transition: "transform 0.2s", transform: acordeonAbierto ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
            </button>

            {/* Cuerpo desplegable */}
            {acordeonAbierto && (
              <div style={{ borderTop: "1px solid var(--border)" }}>
                {/* Buscador */}
                <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--separator)" }}>
                  <input
                    autoFocus
                    type="text"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre o cliente..."
                    style={{ width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: "8px 12px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-primary)", outline: "none" }}
                    onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"}
                  />
                </div>
                {/* Lista filtrada */}
                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {(() => {
                    const q = busqueda.toLowerCase();
                    const filtrados = entries.filter(([, p]) =>
                      !q || p.nombre?.toLowerCase().includes(q) || p.cliente?.nombre?.toLowerCase().includes(q)
                    );
                    if (filtrados.length === 0) {
                      return (
                        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 12, fontStyle: "italic" }}>
                          Sin resultados para "{busqueda}"
                        </div>
                      );
                    }
                    return filtrados.map(([id, p]) => {
                      const est = ESTADOS_TRABAJO.find(e => e.id === (p.estado || "nuevo")) || ESTADOS_TRABAJO[0];
                      const activo = presSelId === id;
                      const tv = calcularTotalVisual(p.total, p.descuento, p.gananciaExtra);
                      return (
                        <div key={id}
                          onClick={() => {
                            setPresSelId(id);
                            setAcordeonAbierto(false);
                            setBusqueda("");
                            const bloques = (p.items || []).flatMap(item => {
                              const mod = modulos[item.codigo];
                              if (!mod) return [];
                              return Array.from({ length: item.cantidad }, () => ({
                                id: crypto.randomUUID(),
                                codigo: item.codigo,
                                nombre: mod.nombre,
                                tipoVisual: mod.tipoVisual || null,
                                ancho: mod.dimensiones.ancho,
                                alto: mod.dimensiones.alto,
                                profundidad: mod.dimensiones.profundidad,
                              }));
                            });
                            guardarPlano({ bloques, altoCielorraso: 2400 });
                          }}
                          style={{
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                            padding: "10px 16px", borderBottom: "1px solid var(--separator)",
                            background: activo ? "var(--accent-soft)" : "transparent",
                            borderLeft: `3px solid ${activo ? "var(--accent)" : "transparent"}`,
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={e => { if (!activo) e.currentTarget.style.background = "var(--bg-subtle)"; }}
                          onMouseLeave={e => { if (!activo) e.currentTarget.style.background = "transparent"; }}
                        >
                          <span style={{ fontSize: 9, fontWeight: 700, background: `${est.color}20`, color: est.color, border: `1px solid ${est.color}30`, borderRadius: 3, padding: "2px 6px", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
                            {est.icon} {est.label}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: activo ? "var(--accent)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.nombre}
                            </div>
                            {p.cliente?.nombre && (
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{p.cliente.nombre}</div>
                            )}
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right" }}>
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: tv.hayDescuento ? "var(--text-muted)" : "#7ecf8a", textDecoration: tv.hayDescuento ? "line-through" : "none", opacity: tv.hayDescuento ? 0.55 : 1 }}>
                              {fmtPeso(p.total)}
                            </div>
                            {tv.hayDescuento && (
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "#7ecf8a" }}>{fmtPeso(tv.totalFinal)}</div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                            {onVerRentabilidad && (
                              <button
                                onClick={e => { e.stopPropagation(); onVerRentabilidad(id); }}
                                title="Ver rentabilidad en Caja"
                                style={{ padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(134,200,150,0.15)", border: "1px solid rgba(134,200,150,0.35)", color: "#6db885", transition: "all 0.15s" }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(134,200,150,0.28)"}
                                onMouseLeave={e => e.currentTarget.style.background = "rgba(134,200,150,0.15)"}
                              >
                                Rent.
                              </button>
                            )}
                            {onEditarModulos && (
                              <button
                                onClick={e => { e.stopPropagation(); onEditarModulos(id, p); }}
                                title="Editar módulos de este presupuesto"
                                style={{ padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", transition: "all 0.15s" }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(212,175,55,0.20)"}
                                onMouseLeave={e => e.currentTarget.style.background = "var(--accent-soft)"}
                              >
                                ✎
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* ── Editor o hint de selección ── */}
          {!presSel ? (
            <div style={{ textAlign: "center", padding: "48px 20px", borderRadius: 16, border: "1px dashed var(--border)", color: "var(--text-muted)", background: "var(--bg-subtle)" }}>
              <div style={{ marginBottom: 14, opacity: 0.45, fontSize: 32 }}>📋</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Seleccioná un presupuesto</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>Abrí el acordeón de arriba y elegí uno de la lista</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* ── 1. Encabezado prominente ── */}
              {(() => {
                const descuentoActual = parseFloat(presSel.descuento) || 0;
                const gananciaActual  = parseFloat(presSel.gananciaExtra) || 0;
                const totalAjustado   = presSel.total + gananciaActual - descuentoActual;
                const hayAjustes      = descuentoActual > 0 || gananciaActual > 0;
                const necesitaAct     = presSelId && presupuestoNecesitaActualizacion(presSelId, costosVersion, presSel);
                return (
                  <div style={{ background: "var(--bg-surface)", border: "1px solid var(--accent-border)", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.32)" }}>
                    {/* Título + total */}
                    <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {presSel.nombre}
                        </div>
                        {(presSel.cliente?.nombre || presSel.cliente?.tel) && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                            {[presSel.cliente.nombre, presSel.cliente.tel].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "'DM Mono',monospace", color: "#7ecf8a" }}>
                          {fmtPeso(hayAjustes ? totalAjustado : presSel.total)}
                        </div>
                        {hayAjustes && (
                          <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", opacity: 0.6, textDecoration: "line-through" }}>
                            {fmtPeso(presSel.total)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Estado + acciones */}
                    <div style={{ padding: "10px 14px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: "rgba(0,0,0,0.06)" }}>
                      <select
                        value={presSel.estado || "nuevo"}
                        onChange={e => onCambiarEstado(presSelId, e.target.value)}
                        style={{
                          fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700,
                          padding: "6px 10px", borderRadius: 7, cursor: "pointer", outline: "none",
                          background: `${estSel.color}14`, border: `1.5px solid ${estSel.color}50`,
                          color: estSel.color, letterSpacing: "0.04em"
                        }}
                      >
                        {ESTADOS_TRABAJO.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
                      </select>

                      <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />

                      <button onClick={handleWhatsApp} style={{
                        padding: "6px 14px", borderRadius: 7, cursor: "pointer", fontSize: 11,
                        fontFamily: "'DM Mono',monospace", fontWeight: 700,
                        background: whatsappCopiado ? "rgba(126,207,138,0.12)" : "var(--bg-subtle)",
                        border: `1px solid ${whatsappCopiado ? "rgba(126,207,138,0.40)" : "var(--border)"}`,
                        color: whatsappCopiado ? "#7ecf8a" : "var(--text-secondary)", transition: "all 0.15s"
                      }}>
                        {whatsappCopiado ? "✓ Copiado" : "📲 WA"}
                      </button>

                      <button onClick={handlePDF}
                        style={{ padding: "6px 14px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "transparent", border: "1.5px solid var(--accent)", color: "var(--accent)", transition: "all 0.18s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "var(--text-inverted)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--accent)"; }}
                      >
                        🖨 PDF
                      </button>

                      <div style={{ flex: 1 }} />

                      {necesitaAct && !actualizadoVP && (
                        <button
                          onClick={() => {
                            const nuevoTotalModulos = recalcularTotalPresupuesto(presSel, modulos, costos);
                            const nuevosCostosDirectos = (presSel.costosDirectos || []).map(x => {
                              if (x.precioManual) return x;
                              const precActual = getPrecioRefActual(x.tipo, x.refId, costos);
                              if (!precActual) return x;
                              return { ...x, precioUnit: precActual, subtotal: Math.round(x.cantidad * precActual) };
                            });
                            const totalCD = nuevosCostosDirectos.reduce((a, x) => a + (x.subtotal || 0), 0);
                            const totalAd = (presSel.adicionales || []).reduce((a, x) => a + (parseFloat(x.monto) || 0), 0);
                            const nuevoTotal = (nuevoTotalModulos || 0) + totalCD + totalAd;
                            onActualizarPresupuesto(presSelId, { total: Math.round(nuevoTotal), costosVersionAl: Date.now(), costosDirectos: nuevosCostosDirectos });
                            setActualizadoVP(true);
                            setTimeout(() => setActualizadoVP(false), 3000);
                          }}
                          style={{ padding: "6px 12px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a", whiteSpace: "nowrap" }}
                        >↻ Actualizar</button>
                      )}
                      {actualizadoVP && (
                        <span style={{ padding: "6px 12px", borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, background: "rgba(126,207,138,0.15)", border: "1px solid rgba(126,207,138,0.40)", color: "#7ecf8a", whiteSpace: "nowrap" }}>
                          ✓ Actualizado
                        </span>
                      )}

                      <select value={temaPDF} onChange={e => cambiarTema(e.target.value)}
                        title="Tema del PDF"
                        style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 600, padding: "5px 8px", borderRadius: 6, cursor: "pointer", outline: "none", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", maxWidth: 110 }}
                      >
                        <option value="dorado">🟡 Dorado</option>
                        <option value="gris">⬜ Gris Perla</option>
                        <option value="carbon">⬛ Carbón</option>
                        <option value="bosque">🟢 Bosque</option>
                        <option value="marino">🔵 Marino</option>
                        <option value="bordo">🟥 Burdeos</option>
                      </select>

                      <button onClick={guardarTextos} style={{
                        padding: "6px 18px", borderRadius: 7, cursor: "pointer",
                        background: guardandoTexto ? "rgba(126,207,138,0.15)" : "var(--accent-soft)",
                        border: `1px solid ${guardandoTexto ? "rgba(126,207,138,0.4)" : "var(--accent-border)"}`,
                        color: guardandoTexto ? "#7ecf8a" : "var(--accent)",
                        fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, transition: "all 0.2s"
                      }}>
                        {guardandoTexto ? "✓ Guardado" : "💾 Guardar"}
                      </button>
                    </div>

                    {/* Historial de versiones (si hay) */}
                    {(presSel.historialVersiones || []).length > 0 && (
                      <div style={{ padding: "6px 14px", background: "rgba(200,160,42,0.06)", borderTop: "1px solid rgba(200,160,42,0.15)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>versiones:</span>
                        {(presSel.historialVersiones || []).map((v, i) => (
                          <span key={i} style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
                            {fmtFecha(v.fecha)}: {fmtPeso(v.total)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── 2. Lista de ítems (bloque central, mayor jerarquía) ── */}
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.22)" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
                    📦 {(presSel.items?.length || 0) + (presSel.costosDirectos?.length || 0) + (presSel.adicionales?.length || 0)} ítems
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
                      👁 visible &nbsp;·&nbsp; 🚫 oculto
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>Precio unit.</span>
                      <ToggleSwitch value={mostrarPrecioUnitario} onChange={setMostrarPrecioUnitario} label="" />
                    </div>
                  </div>
                </div>
                <ListaItemsVP
                  items={presSel.items}
                  modulos={modulos}
                  costos={costos}
                  dimOverride={presSel.dimOverride}
                  costosDirectos={presSel.costosDirectos || []}
                  adicionales={presSel.adicionales || []}
                  itemsOcultos={itemsOcultos}
                  onToggleOculto={toggleOculto}
                  mostrarPrecioUnitario={mostrarPrecioUnitario}
                />
                <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", background: "var(--bg-subtle)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16 }}>
                  <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
                    {(presSel.items || []).length} mód.
                    {(presSel.costosDirectos || []).length > 0 && ` · ${presSel.costosDirectos.length} CD`}
                    {(presSel.adicionales || []).length > 0 && ` · ${presSel.adicionales.length} extra${presSel.adicionales.length !== 1 ? "s" : ""}`}
                    {itemsOcultos.length > 0 && ` · ${itemsOcultos.length} oculto${itemsOcultos.length !== 1 ? "s" : ""}`}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: "#7ecf8a" }}>
                    {fmtPeso(presSel.total)}
                  </span>
                </div>
              </div>

              {/* ── 3. Ajustes de precio (colapsable) ── */}
              {(() => {
                const descuentoActual = parseFloat(presSel.descuento) || 0;
                const gananciaActual  = parseFloat(presSel.gananciaExtra) || 0;
                const totalAjustadoVP = presSel.total + gananciaActual - descuentoActual;
                const guardarAjuste   = (d, g) => onActualizarPresupuesto(presSelId, { descuento: parseFloat(d) || 0, gananciaExtra: parseFloat(g) || 0 });
                const resumenAjustes  = descuentoActual > 0 || gananciaActual > 0
                  ? `${descuentoActual > 0 ? `−${fmtPeso(descuentoActual)}` : ""}${descuentoActual > 0 && gananciaActual > 0 ? " / " : ""}${gananciaActual > 0 ? `+${fmtPeso(gananciaActual)}` : ""} → ${fmtPeso(totalAjustadoVP)}`
                  : "Sin ajustes";
                return (
                  <SeccionColapsable titulo="Ajustes de precio" resumen={resumenAjustes}>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>🏷 Descuento</span>
                          <span style={{ fontSize: 12, color: "#e07070", fontWeight: 900, fontFamily: "'DM Mono',monospace" }}>−</span>
                        </div>
                        <input type="number" min="0" value={descuentoVP} placeholder="0"
                          onChange={e => setDescuentoVP(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && guardarAjuste(descuentoVP, gananciaExtraVP)}
                          style={{ width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, padding: "6px 10px", textAlign: "right", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "#e07070", outline: "none" }}
                          onFocus={e => e.target.style.borderColor = "#e07070"}
                          onBlur={e => e.target.style.borderColor = "var(--border)"}
                        />
                        <button onClick={() => guardarAjuste(descuentoVP, gananciaExtraVP)}
                          style={{ marginTop: 6, width: "100%", padding: "5px 0", borderRadius: 6, cursor: "pointer", background: parseFloat(descuentoVP) !== parseFloat(presSel?.descuento || 0) ? "rgba(224,112,112,0.18)" : "var(--bg-base)", border: `1px solid ${parseFloat(descuentoVP) !== parseFloat(presSel?.descuento || 0) ? "#e07070" : "var(--border)"}`, color: "#e07070", fontSize: 13, fontWeight: 700 }}>
                          ✓ Confirmar
                        </button>
                      </div>
                      <div style={{ width: 1, background: "var(--border)", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>💵 Ganancia extra</span>
                          <span style={{ fontSize: 12, color: "#7ecf8a", fontWeight: 900, fontFamily: "'DM Mono',monospace" }}>+</span>
                        </div>
                        <input type="number" min="0" value={gananciaExtraVP} placeholder="0"
                          onChange={e => setGananciaExtraVP(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && guardarAjuste(descuentoVP, gananciaExtraVP)}
                          style={{ width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, padding: "6px 10px", textAlign: "right", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "#7ecf8a", outline: "none" }}
                          onFocus={e => e.target.style.borderColor = "#7ecf8a"}
                          onBlur={e => e.target.style.borderColor = "var(--border)"}
                        />
                        <button onClick={() => guardarAjuste(descuentoVP, gananciaExtraVP)}
                          style={{ marginTop: 6, width: "100%", padding: "5px 0", borderRadius: 6, cursor: "pointer", background: parseFloat(gananciaExtraVP) !== parseFloat(presSel?.gananciaExtra || 0) ? "rgba(126,207,138,0.18)" : "var(--bg-base)", border: `1px solid ${parseFloat(gananciaExtraVP) !== parseFloat(presSel?.gananciaExtra || 0) ? "#7ecf8a" : "var(--border)"}`, color: "#7ecf8a", fontSize: 13, fontWeight: 700 }}>
                          ✓ Confirmar
                        </button>
                      </div>
                    </div>
                  </SeccionColapsable>
                );
              })()}

              {/* ── 4. Texto de apertura (colapsable) ── */}
              <SeccionColapsable titulo="Texto de apertura" resumen={textoApertura ? textoApertura.slice(0, 80) + (textoApertura.length > 80 ? "…" : "") : "Sin texto"}>
                <textarea value={textoApertura} onChange={e => setTextoApertura(e.target.value)}
                  placeholder="Ej: Estimado cliente, le hacemos llegar el presente presupuesto..."
                  rows={3}
                  style={{ width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: "9px 12px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 8, outline: "none", resize: "vertical", lineHeight: 1.6 }}
                  onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
              </SeccionColapsable>

              {/* ── 5. Condiciones (colapsable) ── */}
              <SeccionColapsable titulo="Condiciones y observaciones" resumen={condiciones ? condiciones.slice(0, 80) + (condiciones.length > 80 ? "…" : "") : "Sin condiciones"}>
                <textarea value={condiciones} onChange={e => setCondiciones(e.target.value)}
                  placeholder="Ej: Validez 15 días. Precios sin IVA. Seña del 40% para iniciar fabricación."
                  rows={3}
                  style={{ width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: "9px 12px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 8, outline: "none", resize: "vertical", lineHeight: 1.6 }}
                  onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
              </SeccionColapsable>

            </div>
            )}
          </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 11. LISTA DE CORTE
// ══════════════════════════════════════════════════════════════════
// ── ListaCorte ────────────────────────────────────────────────────


export { VistaPrevia };
