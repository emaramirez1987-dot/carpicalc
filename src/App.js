import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  LogoIsotipo, GlobalStyles, SaveIndicator
} from "./components/ui/index.jsx";
import { HojaCostos } from "./components/costos/index.jsx";
import { CatalogoModulos, EditorVistaSVG } from "./components/catalogo/index.jsx";
import { Presupuesto } from "./components/presupuesto/index.jsx";
import { VistaPrevia } from "./components/vista-previa/index.jsx";
import { ListaCorte } from "./components/corte/index.jsx";
import { TableroKanban } from "./components/trabajos/index.jsx";
import { PanelCaja } from "./components/caja/index.jsx";
import { NavProvider, useNav } from "./state/NavContext.jsx";
import { PresupuestoContext } from "./state/PresupuestoContext.jsx";
import { LoginScreen } from "./components/auth/LoginScreen.jsx";
import { PanelPerfil } from "./components/perfil/PanelPerfil.jsx";
import { PlanoDos } from "./components/plano/index.jsx";

import { PERFIL_VACIO } from "./constants.js";
import { supabase } from "./lib/supabase.js";
import { calcularModulo } from "./utils.js";
import {
  cargarDatos, cargarSuscripcion,
  guardarModulos, guardarPresupuestos, guardarPerfil, guardarCostos,
  leerVersionCostos, guardarPlano,
} from "./storage.js";
import { useTema } from "./hooks/useTema.js";
import {
  crearPresupuesto,
  eliminarPresupuesto,
  cambiarEstado,
  actualizarPresupuesto,
  migrarTempEnPresupuestos,
  migrarDimOverridePresupuestos,
} from "./services/presupuestoService.js";

// ─── Header ──────────────────────────────────────────────────────────────────
function Header({ tabs, saveEst, tema, toggleTema }) {
  const { nav, dispatch } = useNav();
  return (
    <header
      className="no-print rsp-header-inner"
      style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", gap: 24,
        padding: "0 28px",
        background: "var(--bg-nav)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 1px 0 var(--separator), var(--shadow-sm)",
        transition: "background 0.3s",
      }}
    >
      {/* Brand */}
      <div className="rsp-brand" style={{ padding: "12px 0", flexShrink: 0, display: "flex", alignItems: "center", gap: 9 }}>
        <LogoIsotipo size={36} />
        <div className="rsp-brand-text">
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 900, color: "var(--accent)", lineHeight: 1, letterSpacing: "-0.02em" }}>
            CarpiCálc
          </div>
          <div style={{ fontSize: 8, letterSpacing: "0.26em", textTransform: "uppercase", marginTop: 3, color: "var(--text-muted)", fontWeight: 400, fontFamily: "'DM Mono',monospace" }}>
            Diseño & Costos
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="rsp-nav" style={{ display: "flex", flex: 1, overflowX: "auto", scrollbarWidth: "none" }}>
        {tabs.map(t => {
          const active = nav.vista === t.id;
          return (
            <button
              key={t.id}
              data-vista={t.id}
              onClick={() => dispatch({ type: "CAMBIAR_VISTA", payload: { vista: t.id } })}
              style={{
                position: "relative",
                background: "transparent", border: "none",
                borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                color: active ? "var(--accent)" : "var(--text-muted)",
                padding: "18px 20px",
                cursor: "pointer",
                fontSize: 11, fontWeight: active ? 700 : 500,
                letterSpacing: "0.12em", textTransform: "uppercase",
                fontFamily: "'DM Mono',monospace",
                transition: "all 0.2s", flexShrink: 0, whiteSpace: "nowrap",
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

// ─── AppInterna ───────────────────────────────────────────────────────────────
// Estado de dominio + coordinación. La navegación vive en NavContext.
function AppInterna() {
  const { tema, toggleTema } = useTema();
  const { nav, dispatch } = useNav();

  // ── Estado de dominio (no es navegación — queda aquí) ────────────────────
  const [modulos,        setModulos]        = useState(null);
  const [costos,         setCostos]         = useState(null);
  const [presupuestos,   setPresupuestos]   = useState({});
  const [perfil,         setPerfil]         = useState({ ...PERFIL_VACIO });
  const [cargando,       setCargando]       = useState(true);
  const [saveEst,        setSaveEst]        = useState(null);
  const [items,              setItems]              = useState([]);
  const [dimOverride,        setDimOverride]        = useState({});
  const [composicionOverride, setComposicionOverride] = useState({});
  const [adicionales,        setAdicionales]        = useState([]);
  const [costosDirectos,     setCostosDirectos]     = useState([]);
  const [costosVersion,      setCostosVersion]      = useState(leerVersionCostos);
  const [borradorRecuperado, setBorradorRecuperado] = useState(false);
  // ID del presupuesto en edición activa. null = presupuesto nuevo sin guardar.
  // Se levanta aquí (no en Presupuesto) para que el borrador pueda persistirlo
  // y restaurarlo correctamente entre sesiones.
  const [presupuestoActivoId, setPresupuestoActivoId] = useState(null);
  const [suscripcion,         setSuscripcion]         = useState(null);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Verificar si el usuario volvió de MercadoPago con preapproval_id
    const params = new URLSearchParams(window.location.search);
    const preapprovalId = params.get("preapproval_id");
    if (preapprovalId) {
      window.history.replaceState({}, "", window.location.pathname);
      supabase.from("workspaces").select("id").single().then(({ data: ws }) => {
        if (!ws) return;
        fetch("/api/check-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preapprovalId, workspaceId: ws.id }),
        }).finally(() => cargarSuscripcion().then(setSuscripcion));
      });
    } else {
      cargarSuscripcion().then(setSuscripcion);
    }
    cargarDatos().then(({ modulos, costos, presupuestos, perfil }) => {
      const { presupuestos: migrados, cambiaron } = migrarDimOverridePresupuestos(presupuestos || {});
      setModulos(modulos);
      setCostos(costos);
      setPresupuestos(migrados);
      if (cambiaron) guardarPresupuestos(migrados);
      if (perfil) setPerfil(perfil);
      // Primera vez: perfil vacío y nunca completó onboarding → ir a Mi Taller
      const onboardingDone = localStorage.getItem("carpicalc:onboarding_done");
      if (!perfil?.nombre && !onboardingDone) {
        dispatch({ type: "CAMBIAR_VISTA", payload: { vista: "config" } });
      }
      try {
        const borrador = localStorage.getItem("carpicalc:borrador");
        if (borrador) {
          const { items: bItems, dimOverride: bDim, composicionOverride: bComp, presupuestoActivoId: bPresId } = JSON.parse(borrador);
          if (bItems?.length > 0) {
            setItems(bItems);
            setDimOverride(bDim || {});
            setComposicionOverride(bComp || {});
            if (bPresId) setPresupuestoActivoId(bPresId);
            setBorradorRecuperado(true);
          }
        }
      } catch {}
      setCargando(false);
    });
  }, [dispatch]);

  // ── Autosave de borrador ──────────────────────────────────────────────────
  useEffect(() => {
    if (items.length > 0) {
      try {
        localStorage.setItem("carpicalc:borrador", JSON.stringify({
          items, dimOverride, composicionOverride,
          ...(presupuestoActivoId ? { presupuestoActivoId } : {}),
        }));
      }
      catch {}
    } else {
      localStorage.removeItem("carpicalc:borrador");
    }
  }, [items, dimOverride, composicionOverride, presupuestoActivoId]);

  // ── Aviso antes de cerrar con datos sin guardar ───────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (items.length > 0) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [items]);

  // ── Persistencia con cola serializada ─────────────────────────────────────
  // Garantiza que saves paralelos no se pisen entre sí.
  const saveQueue   = useRef([]);
  const saveRunning = useRef(false);

  const withSave = useCallback((fn) => {
    saveQueue.current.push(fn);
    if (saveRunning.current) return;
    const drain = async () => {
      saveRunning.current = true;
      setSaveEst("guardando");
      let lastOk = true;
      while (saveQueue.current.length > 0) {
        const next = saveQueue.current.shift();
        const ok = await next();
        if (!ok) lastOk = false;
      }
      setSaveEst(lastOk ? "guardado" : "error");
      setTimeout(() => setSaveEst(null), 2500);
      saveRunning.current = false;
    };
    drain();
  }, []);

  const hSaveM = (data) => {
    const ts = Date.now();
    setCostosVersion(ts);
    return withSave(() => guardarModulos(data, ts));
  };

  const hSaveC = (data) => {
    setCostosVersion(Date.now());
    return withSave(() => guardarCostos(data));
  };

  // ── getModUsado — resuelve módulo con dimOverride del presupuesto activo ──
  const getModUsado = useCallback((item) => {
    if (!modulos || !item) return null;
    const cod   = typeof item === "string" ? item : item.codigo;
    const keyId = typeof item === "string" ? item : item.id || item.codigo;
    const base  = modulos[cod];
    if (!base) return null;
    const over  = dimOverride[keyId] || {};
    const comp  = composicionOverride[keyId];
    return {
      ...base,
      material: over.material ?? base.material,
      dimensiones: {
        ancho:       over.ancho       ?? base.dimensiones.ancho,
        profundidad: over.profundidad ?? base.dimensiones.profundidad,
        alto:        over.alto        ?? base.dimensiones.alto,
      },
      vistaConfig: comp?.vistaConfig ?? base.vistaConfig,
    };
  }, [modulos, dimOverride, composicionOverride]);

  // ── Total del presupuesto activo ──────────────────────────────────────────
  const totalModulos = !costos ? 0 : items.reduce((acc, it) => {
    const m = getModUsado(it);
    if (!m) return acc;
    const c = calcularModulo(m, costos);
    if (!c) return acc;
    return acc + c.total * it.cantidad;
  }, 0);
  const totalAdicionales    = adicionales.reduce((a, x) => a + (parseFloat(x.monto) || 0), 0);
  const totalCostosDirectos = costosDirectos.reduce((a, x) => a + (parseFloat(x.subtotal) || 0), 0);
  const totalGeneral        = totalModulos + totalAdicionales + totalCostosDirectos;

  // ── Handlers de dominio de presupuestos ───────────────────────────────────
  const handleGuardarPresupuesto = (nombre, cliente, nota, presupuestoCompleto) => {
    const { id, presupuestos: nuevo } = crearPresupuesto({
      presupuestos, nombre, cliente, nota,
      items, dimOverride, composicionOverride, adicionales, costosDirectos,
      total: totalGeneral,
      costosVersionAl: leerVersionCostos() || Date.now(),
      presupuestoCompleto,
    });
    setPresupuestos(nuevo);
    setPresupuestoActivoId(id);   // el nuevo presupuesto ya tiene ID permanente
    withSave(() => guardarPresupuestos(nuevo));
    localStorage.removeItem("carpicalc:borrador");
    guardarPlano({ bloques: [], altoCielorraso: 2400 });
  };

  const handleCargarPresupuesto = (p, id) => {
    // Ensure every item has a stable UUID (legacy items may lack id)
    const rawItems = p.items ? [...p.items] : [];
    const migratedItems = rawItems.map(item =>
      item.id ? item : { ...item, id: crypto.randomUUID() }
    );
    // Remap Format B dimOverride keys (`${codigo}-${id}`) to Format A (`id || codigo`)
    const rawDim = p.dimOverride && typeof p.dimOverride === "object" ? { ...p.dimOverride } : {};
    const migratedDim = {};
    migratedItems.forEach(item => {
      const keyA = item.id || item.codigo;
      const keyB = `${item.codigo}-${item.id || 0}`;
      if (rawDim[keyA] !== undefined) migratedDim[keyA] = rawDim[keyA];
      else if (rawDim[keyB] !== undefined) migratedDim[keyA] = rawDim[keyB];
    });
    setItems(migratedItems);
    setDimOverride(migratedDim);
    setComposicionOverride(p.composicionOverride && typeof p.composicionOverride === "object" ? { ...p.composicionOverride } : {});
    setAdicionales(Array.isArray(p.adicionales) ? [...p.adicionales] : []);
    setCostosDirectos(Array.isArray(p.costosDirectos) ? [...p.costosDirectos] : []);
    if (id) setPresupuestoActivoId(id);
    localStorage.removeItem("carpicalc:borrador");
    const bloques = migratedItems.flatMap(item => {
      const mod = modulos[item.codigo];
      if (!mod) return [];
      const over = migratedDim[item.id || item.codigo] || {};
      return Array.from({ length: item.cantidad }, () => ({
        id: crypto.randomUUID(),
        itemId: item.id,          // identity anchor for composicionOverride lookup
        codigo: item.codigo,
        nombre: mod.nombre,
        tipoVisual: mod.tipoVisual || null,
        ancho: over.ancho || mod.dimensiones.ancho,
        alto: over.alto || mod.dimensiones.alto,
        profundidad: over.profundidad || mod.dimensiones.profundidad,
      }));
    });
    guardarPlano({ bloques, altoCielorraso: 2400 });
  };

  const handleEliminarPresupuesto = (id) => {
    const { presupuestos: nuevo, modulos: nuevosModulos, modulosCambiaron } =
      eliminarPresupuesto({ presupuestos, modulos, id });
    if (modulosCambiaron) {
      setModulos(nuevosModulos);
      withSave(() => guardarModulos(nuevosModulos));
    }
    setPresupuestos(nuevo);
    withSave(() => guardarPresupuestos(nuevo));
  };

  const handleCambiarEstado = (id, estado) => {
    const nuevo = cambiarEstado({ presupuestos, id, estado });
    setPresupuestos(nuevo);
    withSave(() => guardarPresupuestos(nuevo));
  };

  const handleActualizarPresupuesto = (id, cambios) => {
    const nuevo = actualizarPresupuesto({ presupuestos, id, cambios });
    setPresupuestos(nuevo);
    withSave(() => guardarPresupuestos(nuevo));
  };

  const handleGuardarExtraFrecuente = (extra) => {
    const nuevo = {
      ...costos,
      extrasFrecuentes: [...(costos.extrasFrecuentes || []),
        { id: Date.now(), nombre: extra.nombre, precio: extra.precio }],
    };
    setCostos(nuevo);
    withSave(() => guardarCostos(nuevo));
  };

  const tabs = [
    { id: "presupuesto", label: "Presupuesto", icon: "📋" },
    { id: "preview",     label: "Vista previa", icon: "📄" },
    { id: "corte",       label: "Corte",        icon: "🪚" },
    { id: "plano",       label: "Plano 2D",     icon: "📐" },
    { id: "trabajos",    label: "Trabajos",     icon: "📊" },
    { id: "caja",        label: "Caja",         icon: "💵" },
    { id: "catalogo",    label: "Catálogo",     icon: "🗂" },
    { id: "costos",      label: "Costos",       icon: "💰" },
    { id: "config",      label: "Mi taller",    icon: "⚙" },
  ];

  // ── Valor del contexto del editor activo ──────────────────────────────────
  // Debe ir ANTES del return temprano de carga — regla de hooks.
  // Estado permanece en AppInterna; el contexto solo lo publica para que
  // Presupuesto lo consuma sin recibir 10 props extra.
  // useMemo evita re-renders innecesarios cuando AppInterna actualiza por
  // razones ajenas al editor (ej: cambio de nav).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const presupuestoCtxValue = useMemo(() => ({
    items, setItems,
    dimOverride, setDimOverride,
    composicionOverride, setComposicionOverride,
    adicionales, setAdicionales,
    costosDirectos, setCostosDirectos,
    presupuestoActivoId, setPresupuestoActivoId,
  }), [items, dimOverride, composicionOverride, adicionales, costosDirectos, presupuestoActivoId]);

  if (cargando)
    return (
      <>
        <GlobalStyles />
        <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="anim-scalein" style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <LogoIsotipo size={88} />
            </div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 900, color: "var(--accent)", letterSpacing: "-0.02em", marginBottom: 6 }}>
              CarpiCálc
            </div>
            <div style={{ fontSize: 9, letterSpacing: "0.30em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 28, fontWeight: 400, fontFamily: "'DM Mono',monospace" }}>
              Diseño & Gestión de Costos
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", animation: "dotPulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.18}s`, opacity: 0.3 }} />
              ))}
            </div>
            <style>{`@keyframes dotPulse{0%,80%,100%{opacity:0.3;transform:scale(1)}40%{opacity:1;transform:scale(1.4)}}`}</style>
          </div>
        </div>
      </>
    );

  return (
    <PresupuestoContext.Provider value={presupuestoCtxValue}>
    <>
      <GlobalStyles />
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", transition: "background 0.3s" }}>
        <Header tabs={tabs} saveEst={saveEst} tema={tema} toggleTema={toggleTema} />
        <main className="rsp-main" style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px" }}>
          <div key={nav.vista} className="tab-view">

            {nav.vista === "presupuesto" && (
              <Presupuesto
                modulos={modulos}
                costos={costos}
                getModUsado={getModUsado}
                totalGeneral={totalGeneral}
                presupuestos={presupuestos}
                onGuardarPresupuesto={handleGuardarPresupuesto}
                onCargarPresupuesto={handleCargarPresupuesto}
                onEliminarPresupuesto={handleEliminarPresupuesto}
                onCambiarEstado={handleCambiarEstado}
                onActualizarPresupuesto={handleActualizarPresupuesto}
                onVerPresupuesto={(id) => dispatch({ type: "ABRIR_VISTA_PREVIA", payload: { presupuestoId: id } })}
                costosVersion={costosVersion}
                presupuestoParaEditar={nav.presupuestoParaEditar}
                onPresupuestoEditarConsumed={() => dispatch({ type: "PRESUPUESTO_PARA_EDITAR_CONSUMIDO" })}
                borradorRecuperado={borradorRecuperado}
                onDismissBorrador={() => setBorradorRecuperado(false)}
                onGuardarExtraFrecuente={handleGuardarExtraFrecuente}
                onVerCatalogo={(codigo, contexto) => dispatch({
                  type: "INICIAR_EDICION_NIVEL3",
                  payload: { cod: codigo, contexto },
                })}
                onDeepLinkListo={(cod, contexto) => dispatch({
                  type: "DEEPLINK_LISTO",
                  payload: { cod, contexto },
                })}
                pendingDeepLink={nav.pendingDeepLink}
                pendingDeepLinkCtx={nav.pendingDeepLinkCtx}
                setModulos={setModulos}
                hSaveModulos={hSaveM}
                onLimpiarTemps={(itemsActuales) => {
                  const codsTemp = itemsActuales.filter(it => it.codigo?.startsWith("TEMP_")).map(it => it.codigo);
                  if (codsTemp.length === 0) return;
                  // No borrar TEMPs que ya quedaron guardados en algún presupuesto
                  const codsEnPresupuestos = new Set(
                    Object.values(presupuestos).flatMap(p => (p.items || []).map(it => it.codigo))
                  );
                  const codsABorrar = codsTemp.filter(c => !codsEnPresupuestos.has(c));
                  if (codsABorrar.length === 0) return;
                  const nuevos = Object.fromEntries(Object.entries(modulos).filter(([c]) => !codsABorrar.includes(c)));
                  setModulos(nuevos);
                  hSaveM(nuevos);
                }}
                onAbrirEditorVista={(cod) => dispatch({ type: "ABRIR_EDITOR_VISTA", payload: { cod } })}
                onGuardarModuloCatalogo={(nuevoMod, nombreFinal, tempCod, presupuestoId) => {
                  const newId = `MC${String(Date.now()).slice(-6)}`;
                  const modPermanente = {
                    ...nuevoMod, nombre: nombreFinal || nuevoMod.nombre,
                    temporal: false, presupuestoId: undefined, origenCodigo: undefined,
                  };
                  const nuevosModulos = { ...modulos, [newId]: modPermanente };
                  if (tempCod && nuevosModulos[tempCod]) delete nuevosModulos[tempCod];
                  setModulos(nuevosModulos);
                  hSaveM(nuevosModulos);
                  if (presupuestoId && tempCod && presupuestos[presupuestoId]) {
                    const nuevosPres = migrarTempEnPresupuestos({ presupuestos, tempCod, newId });
                    setPresupuestos(nuevosPres);
                    withSave(() => guardarPresupuestos(nuevosPres));
                  }
                  return newId;
                }}
              />
            )}

            {nav.vista === "preview" && (
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
                presupuestoSelId={nav.presupuestoVistaPreviaId}
                onSeleccionarPresupuesto={(id) => dispatch({ type: "SELECCIONAR_PRESUPUESTO_PREVIEW", payload: { presupuestoId: id } })}
                costosVersion={costosVersion}
                onVerRentabilidad={(id) => dispatch({ type: "ABRIR_CAJA", payload: { presupuestoId: id } })}
                onEditarModulos={(id, p) => {
                  handleCargarPresupuesto(p, id);
                  dispatch({ type: "EDITAR_PRESUPUESTO", payload: { id, p } });
                }}
              />
            )}

            {nav.vista === "corte" && (
              <ListaCorte
                items={items}
                modulos={modulos}
                costos={costos}
                getModUsado={getModUsado}
                presupuestos={presupuestos}
                presupuestoVistaPreviaId={nav.presupuestoVistaPreviaId}
                onActualizarPresupuesto={handleActualizarPresupuesto}
              />
            )}

            {nav.vista === "plano" && (
              <PlanoDos modulos={modulos} items={items} dimOverride={dimOverride} composicionOverride={composicionOverride} />
            )}

            {nav.vista === "trabajos" && (
              <TableroKanban
                presupuestos={presupuestos}
                onCambiarEstado={handleCambiarEstado}
                onEliminar={handleEliminarPresupuesto}
                onCargar={(p) => {
                  handleCargarPresupuesto(p);
                  dispatch({ type: "CAMBIAR_VISTA", payload: { vista: "presupuesto" } });
                }}
                modulos={modulos}
                costos={costos}
                onActualizarPresupuesto={handleActualizarPresupuesto}
              />
            )}

            {nav.vista === "caja" && (
              <PanelCaja
                presupuestos={presupuestos}
                onActualizar={handleActualizarPresupuesto}
                modulos={modulos}
                costos={costos}
                cajaPresId={nav.cajaPresId}
                onClearCajaPresId={() => dispatch({ type: "CAJA_PRES_ID_CONSUMIDO" })}
              />
            )}

            {nav.vista === "catalogo" && (
              <CatalogoModulos
                modulos={modulos}
                setModulos={setModulos}
                costos={costos}
                onSave={hSaveM}
                setCostos={setCostos}
                hSaveC={hSaveC}
                presupuestos={presupuestos}
                perfil={perfil}
                onGuardarPerfil={(nuevo) => { setPerfil(nuevo); withSave(() => guardarPerfil(nuevo)); }}
                deepLinkCodigo={nav.catalogoDeepLink}
                onDeepLinkConsumed={() => dispatch({ type: "DEEPLINK_CONSUMIDO" })}
                origenEdicion={nav.origenEdicion}
                onGuardarPresupuestoAfectado={(pid, cambios) => handleActualizarPresupuesto(pid, cambios)}
                onGuardarPermanente={(tempCod, newId) => {
                  if (nav.origenEdicion?.presupuestoId && presupuestos[nav.origenEdicion.presupuestoId]) {
                    const nuevosPres = migrarTempEnPresupuestos({ presupuestos, tempCod, newId });
                    setPresupuestos(nuevosPres);
                    withSave(() => guardarPresupuestos(nuevosPres));
                  }
                  setItems(prev => prev.map(it => it.codigo === tempCod ? { ...it, codigo: newId } : it));
                }}
                onVolverAlPresupuesto={nav.origenEdicion?.tipo === "presupuesto"
                  ? () => dispatch({ type: "VOLVER_A_PRESUPUESTO" })
                  : (nav.catalogoDeepLink
                    ? () => dispatch({ type: "VOLVER_A_PRESUPUESTO" })
                    : null)
                }
              />
            )}

            {nav.vista === "costos" && (
              <HojaCostos costos={costos} setCostos={setCostos} onSave={hSaveC} />
            )}

            {nav.vista === "config" && (
              <PanelPerfil
                perfil={perfil}
                onGuardar={(nuevo) => { setPerfil(nuevo); withSave(() => guardarPerfil(nuevo)); }}
                suscripcion={suscripcion}
              />
            )}

            {nav.vista === "editor_vista" && nav.editorVistaCod && modulos?.[nav.editorVistaCod] && (
              <EditorVistaSVG
                modulo={modulos[nav.editorVistaCod]}
                onGuardar={(vistaConfig) => {
                  const cod = nav.editorVistaCod;
                  const updated = { ...modulos, [cod]: { ...modulos[cod], vistaConfig } };
                  setModulos(updated);
                  withSave(() => guardarModulos(updated));
                  dispatch({ type: "EDITOR_VISTA_CERRADO" });
                }}
                onCerrar={() => dispatch({ type: "EDITOR_VISTA_CERRADO" })}
              />
            )}

          </div>
        </main>
      </div>
    </>
    </PresupuestoContext.Provider>
  );
}

// ─── App (raíz) ───────────────────────────────────────────────────────────────
const LOCAL_DEV = process.env.REACT_APP_LOCAL_DEV === "true";

export default function App() {
  // null = cargando sesión, false = no autenticado, true = autenticado
  const [autenticado, setAutenticado] = useState(LOCAL_DEV ? true : null);

  useEffect(() => {
    if (LOCAL_DEV) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAutenticado(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAutenticado(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (autenticado === null) {
    return (
      <>
        <GlobalStyles />
        <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LogoIsotipo size={48} />
        </div>
      </>
    );
  }
  if (!autenticado) return <LoginScreen />;
  return (
    <NavProvider>
      <AppInterna />
    </NavProvider>
  );
}
