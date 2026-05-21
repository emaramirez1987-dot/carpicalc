import React, { useState, useCallback, useEffect, useRef, useMemo, Suspense, lazy } from "react";
import {
  LogoIsotipo, GlobalStyles, SaveIndicator
} from "./components/ui/index.jsx";
// Eager: vistas que necesito al primer render (Presupuesto es default).
import { Presupuesto } from "./components/presupuesto/index.jsx";
import { LoginScreen } from "./components/auth/LoginScreen.jsx";
import { NavProvider, useNav } from "./state/NavContext.jsx";
import { PresupuestoContext } from "./state/PresupuestoContext.jsx";
import { PERFIL_VACIO } from "./constants.js";
import { supabase } from "./lib/supabase.js";
import { calcularModulo } from "./utils.js";
import {
  cargarDatos, cargarSuscripcion,
  guardarModulos, guardarPresupuestos, guardarPerfil, guardarCostos,
  guardarMateriales,
  leerVersionCostos,
} from "./storage.js";
import {
  backfillEsDefault,
  aplicarDefaultExclusivo,
  autopromoverPorTipo,
  derivarCostosMateriales,
} from "./services/materialesService.js";
import { useTema } from "./hooks/useTema.js";
import { useAtajosTeclado } from "./hooks/useAtajosTeclado.js";
import { useToastErrores } from "./hooks/useToastErrores.js";
import ModalAtajos from "./components/ui/ModalAtajos.jsx";
import AvisoTrial from "./components/suscripcion/AvisoTrial.jsx";
import {
  crearPresupuesto,
  eliminarPresupuesto,
  cambiarEstado,
  actualizarPresupuesto,
  migrarTempEnPresupuestos,
  migrarDimOverridePresupuestos,
} from "./services/presupuestoService.js";

// Lazy: el resto se descarga en chunks separados al primer click de su tab.
// Code splitting reduce el bundle inicial de ~441 kB a ~150-200 kB.
const HojaCostos     = lazy(() => import("./components/costos/index.jsx").then(m => ({ default: m.HojaCostos })));
const CatalogoModulos = lazy(() => import("./components/catalogo/index.jsx").then(m => ({ default: m.CatalogoModulos })));
const EditorVistaSVG  = lazy(() => import("./components/catalogo/index.jsx").then(m => ({ default: m.EditorVistaSVG })));
const VistaPrevia    = lazy(() => import("./components/vista-previa/index.jsx").then(m => ({ default: m.VistaPrevia })));
const ListaCorte     = lazy(() => import("./components/corte/index.jsx").then(m => ({ default: m.ListaCorte })));
const TableroKanban  = lazy(() => import("./components/trabajos/index.jsx").then(m => ({ default: m.TableroKanban })));
const PanelCaja      = lazy(() => import("./components/caja/index.jsx").then(m => ({ default: m.PanelCaja })));
const PanelPerfil    = lazy(() => import("./components/perfil/PanelPerfil.jsx").then(m => ({ default: m.PanelPerfil })));
const RenderIA       = lazy(() => import("./components/render/index.jsx").then(m => ({ default: m.RenderIA })));
const Vista3DTab     = lazy(() => import("./components/vista3d/Vista3DTab.jsx").then(m => ({ default: m.Vista3DTab })));

// ─── Header ──────────────────────────────────────────────────────────────────
function Header({ tabs, saveEst, tema, toggleTema }) {
  const { nav, dispatch } = useNav();
  return (
    <header
      className="no-print rsp-header-inner"
      style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center",
        padding: "0 20px",
        background: "var(--bg-nav)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 1px 0 var(--separator), var(--shadow-sm)",
        transition: "background 0.3s",
      }}
    >
      {/* Brand */}
      <div className="rsp-brand" style={{ padding: "12px 0", flexShrink: 0, display: "flex", alignItems: "center", gap: 8, marginRight: 16 }}>
        <LogoIsotipo size={28} />
        <div className="rsp-brand-text">
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 900, color: "var(--accent)", lineHeight: 1, letterSpacing: "-0.02em" }}>
            CarpiCálc
          </div>
          <div style={{ fontSize: 7, letterSpacing: "0.26em", textTransform: "uppercase", marginTop: 3, color: "var(--text-muted)", fontWeight: 400, fontFamily: "'DM Mono',monospace" }}>
            Diseño & Costos
          </div>
        </div>
      </div>

      {/* Nav — flex:1 con space-evenly para repartir tabs en todo el ancho disponible */}
      <nav className="rsp-nav" style={{ display: "flex", flex: 1, justifyContent: "space-evenly", alignItems: "stretch", minWidth: 0 }}>
        {tabs.map((t, idx) => {
          const active = nav.vista === t.id;
          const isSeparatorBefore = idx === tabs.findIndex(x => x.id === "catalogo");
          return (
            <React.Fragment key={t.id}>
              {isSeparatorBefore && (
                <div style={{ width: 1, background: "var(--border)", margin: "8px 0", flexShrink: 0, alignSelf: "stretch" }} />
              )}
              <button
                data-vista={t.id}
                onClick={() => dispatch({ type: "CAMBIAR_VISTA", payload: { vista: t.id } })}
                style={{
                  background: "transparent", border: "none",
                  borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  padding: "13px 8px",
                  cursor: "pointer",
                  fontSize: 10, fontWeight: active ? 700 : 400,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  fontFamily: "'DM Mono',monospace",
                  transition: "all 0.2s", whiteSpace: "nowrap",
                  flex: 1, textAlign: "center",
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderBottomColor = "var(--accent-border)"; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderBottomColor = "transparent"; }}}
              >
                {t.icon} {t.label}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Controles — siempre visible a la derecha */}
      <div style={{ marginLeft: 12, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <SaveIndicator estado={saveEst} />
        <button
          onClick={toggleTema}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 12px", borderRadius: 999, fontSize: 10,
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

  // Code splitting — mount-on-visit. Cada tab visitada queda montada
  // (display:none preserva su estado al cambiar). Las nunca visitadas
  // no descargan su chunk hasta el primer click.
  const [tabsVisitadas, setTabsVisitadas] = useState(() => new Set(["presupuesto"]));
  useEffect(() => {
    setTabsVisitadas(prev => prev.has(nav.vista) ? prev : new Set([...prev, nav.vista]));
  }, [nav.vista]);

  // Atajos de teclado globales — Ctrl+1..9 cambia tab, ? muestra ayuda
  const [mostrarAtajos, setMostrarAtajos] = useState(false);
  const atajos = useMemo(() => {
    const irA = (vista) => () => dispatch({ type: "CAMBIAR_VISTA", payload: { vista } });
    return {
      "?":      () => setMostrarAtajos(v => !v),
      "Escape": () => setMostrarAtajos(false),
      "ctrl+1": irA("presupuesto"),
      "ctrl+2": irA("preview"),
      "ctrl+3": irA("corte"),
      "ctrl+4": irA("vista3d"),
      "ctrl+5": irA("render"),
      "ctrl+6": irA("trabajos"),
      "ctrl+7": irA("caja"),
      "ctrl+8": irA("catalogo"),
      "ctrl+9": irA("costos"),
    };
  }, [dispatch]);
  useAtajosTeclado(atajos);

  // Toasts de errores globales (Supabase, etc.)
  const { toasts: toastsError, dismiss: dismissToast } = useToastErrores();

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
  const [inlineModulos,      setInlineModulos]      = useState({});
  const [adicionales,        setAdicionales]        = useState([]);
  const [costosDirectos,     setCostosDirectos]     = useState([]);
  const [costosVersion,      setCostosVersion]      = useState(leerVersionCostos);
  const [borradorRecuperado, setBorradorRecuperado] = useState(false);
  // ID del presupuesto en edición activa. null = presupuesto nuevo sin guardar.
  // Se levanta aquí (no en Presupuesto) para que el borrador pueda persistirlo
  // y restaurarlo correctamente entre sesiones.
  const [presupuestoActivoId, setPresupuestoActivoId] = useState(null);
  const [suscripcion,         setSuscripcion]         = useState(null);
  const [imagenRef3D,         setImagenRef3D]         = useState(null);

  // Materiales como entidad top-level (consumibles desde Costos, Vista 3D,
  // Render IA, Presupuestos). Persistencia: storage.guardarMateriales — hoy
  // dentro de costos.datos para evitar migración SQL, pero el contrato del
  // service ya está aislado para que el día de mañana migre a tabla propia.
  const [materiales,           setMateriales]           = useState([]);
  const [materialesCategorias, setMaterialesCategorias] = useState([]);

  // Puente al motor de costo: arma `costos.materiales` desde la biblioteca,
  // usando UN material por tipo (el default). Conserva entradas legacy de
  // costos.materiales para tipos no cubiertos (transitorio). `calcularModulo`
  // recibe `costosResueltos` en lugar de `costos`. La tabla original sigue
  // intacta para edición desde Costos.
  const costosResueltos = useMemo(() => {
    if (!costos) return costos;
    return {
      ...costos,
      materiales: derivarCostosMateriales(materiales, costos.materiales || []),
      // Biblioteca completa — calcularModulo la usa para resolver por materialId.
      bibliotecaMateriales: materiales,
    };
  }, [costos, materiales]);

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
    cargarDatos().then(({ modulos, costos, presupuestos, perfil, materiales: mats, materialesCategorias: cats }) => {
      const { presupuestos: migrados, cambiaron } = migrarDimOverridePresupuestos(presupuestos || {});
      setModulos(modulos);
      setCostos(costos);
      setPresupuestos(migrados);
      if (cambiaron) guardarPresupuestos(migrados);
      if (perfil) setPerfil(perfil);
      // Backfill one-time de esDefault para materiales pre-feature.
      // Criterio determinista: por tipo, el más antiguo por fechaCreacion
      // queda marcado como default. Persiste una sola vez; en cargas
      // posteriores `cambiado` es false y no se reescribe nada.
      const matsArr = mats || [];
      const bf = backfillEsDefault(matsArr);
      if (bf.cambiado) {
        bf.log.forEach(l => console.info("[materiales]", l));
        guardarMateriales(bf.materiales, cats || []);
      }
      setMateriales(bf.materiales);
      setMaterialesCategorias(cats || []);
      // Primera vez: perfil vacío y nunca completó onboarding → ir a Mi Taller
      const onboardingDone = localStorage.getItem("carpicalc:onboarding_done");
      if (!perfil?.nombre && !onboardingDone) {
        dispatch({ type: "CAMBIAR_VISTA", payload: { vista: "config" } });
      }
      try {
        const borrador = localStorage.getItem("carpicalc:borrador");
        if (borrador) {
          const { items: bItems, dimOverride: bDim, composicionOverride: bComp, inlineModulos: bInline, presupuestoActivoId: bPresId } = JSON.parse(borrador);
          if (bItems?.length > 0) {
            setItems(bItems);
            setDimOverride(bDim || {});
            setComposicionOverride(bComp || {});
            setInlineModulos(bInline || {});
            if (bPresId) setPresupuestoActivoId(bPresId);
            setBorradorRecuperado(true);
          }
        }
      } catch {}
      setCargando(false);
    });
  }, [dispatch]);

  // ── Autosave de borrador ──────────────────────────────────────────────────
  // Trackea timestamp del último guardado para mostrar feedback visible
  // tipo "Guardado · hace 3s" en el editor del presupuesto.
  const [lastBorradorSave, setLastBorradorSave] = useState(null);
  useEffect(() => {
    if (items.length > 0) {
      try {
        localStorage.setItem("carpicalc:borrador", JSON.stringify({
          items, dimOverride, composicionOverride, inlineModulos,
          ...(presupuestoActivoId ? { presupuestoActivoId } : {}),
        }));
        setLastBorradorSave(Date.now());
      }
      catch {}
    } else {
      localStorage.removeItem("carpicalc:borrador");
      setLastBorradorSave(null);
    }
  }, [items, dimOverride, composicionOverride, inlineModulos, presupuestoActivoId]);

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

  // Save de materiales (entidad top-level).
  //
  // Firma: hSaveMateriales(mats, cats?, guardado?)
  //   - mats:     array final (caller arma create/update/delete)
  //   - cats:     opcional. Si undefined, conserva las categorías actuales.
  //   - guardado: opcional. Si vino y guardado.esDefault === true, se
  //               desmarcan otros del mismo tipo (single-default-por-tipo).
  //
  // Después aplica autopromoverPorTipo SIEMPRE: cubre el caso de borrar el
  // default de un tipo, o cambiar el tipo de un material default. Promueve
  // al más antiguo del tipo huérfano por fechaCreacion. Emite warnings.
  const hSaveMateriales = useCallback((mats, cats, guardado) => {
    let final = Array.isArray(mats) ? mats : [];
    if (guardado && guardado.esDefault === true) {
      final = aplicarDefaultExclusivo(final, guardado);
    }
    const { materiales: postPromote, promociones } = autopromoverPorTipo(final);
    if (promociones.length > 0) {
      promociones.forEach(p => console.warn(`[materiales] ${p.motivo} — tipo="${p.tipo}", promovido="${p.codigo}"`));
    }
    setMateriales(postPromote);
    const catsFinal = cats !== undefined ? cats : materialesCategorias;
    if (cats !== undefined) setMaterialesCategorias(cats);
    setCostosVersion(Date.now()); // los precios efectivos pueden haber cambiado
    return withSave(() => guardarMateriales(postPromote, catsFinal));
  }, [materialesCategorias, withSave]);

  // (Los handlers legacy handleGuardarMaterial3D / handleEliminarMaterial3D
  // ya no se usan: la biblioteca 3D de Render IA fue reemplazada por
  // MaterialesManager unificado. La migración legacy se hace en cargarDatos.)

  // ── getModUsado — resuelve módulo con overrides del presupuesto activo ─────
  // Prioridad: inlineModulos (fuente única completa) → base + dimOverride + composicionOverride
  const getModUsado = useCallback((item) => {
    if (!modulos || !item) return null;
    const cod   = typeof item === "string" ? item : item.codigo;
    const keyId = typeof item === "string" ? item : item.id || item.codigo;
    const inline = inlineModulos[keyId];
    if (inline) return inline;
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
  }, [modulos, dimOverride, composicionOverride, inlineModulos]);

  // ── Total del presupuesto activo ──────────────────────────────────────────
  const totalModulos = !costosResueltos ? 0 : items.reduce((acc, it) => {
    const m = getModUsado(it);
    if (!m) return acc;
    const c = calcularModulo(m, costosResueltos, it.parametrosValores || {});
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
      items, dimOverride, composicionOverride, inlineModulos, adicionales, costosDirectos,
      total: totalGeneral,
      costosVersionAl: leerVersionCostos() || Date.now(),
      presupuestoCompleto,
    });
    setPresupuestos(nuevo);
    setPresupuestoActivoId(id);   // el nuevo presupuesto ya tiene ID permanente
    withSave(() => guardarPresupuestos(nuevo));
    localStorage.removeItem("carpicalc:borrador");
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
    setInlineModulos(p.inlineModulos && typeof p.inlineModulos === "object" ? { ...p.inlineModulos } : {});
    setAdicionales(Array.isArray(p.adicionales) ? [...p.adicionales] : []);
    setCostosDirectos(Array.isArray(p.costosDirectos) ? [...p.costosDirectos] : []);
    if (id) setPresupuestoActivoId(id);
    localStorage.removeItem("carpicalc:borrador");
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

  const handleImportarRender = (renderData) => {
    if (!presupuestoActivoId) return;
    handleActualizarPresupuesto(presupuestoActivoId, { renderUrl: renderData });
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
    { id: "vista3d",     label: "Vista 3D",     icon: "◈" },
    { id: "render",      label: "Render IA",    icon: "✨" },
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
    inlineModulos, setInlineModulos,
    adicionales, setAdicionales,
    costosDirectos, setCostosDirectos,
    presupuestoActivoId, setPresupuestoActivoId,
  }), [items, dimOverride, composicionOverride, inlineModulos, adicionales, costosDirectos, presupuestoActivoId]);

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
        {/* Banner de trial (si quedan ≤5 días) — arriba del header */}
        {suscripcion && suscripcion.app_role !== "admin" && suscripcion.estado === "trialing"
          && suscripcion.trial_ends_at
          && Math.ceil((new Date(suscripcion.trial_ends_at) - new Date()) / 86400000) > 0
          && Math.ceil((new Date(suscripcion.trial_ends_at) - new Date()) / 86400000) <= 5 && (
          <AvisoTrial
            suscripcion={suscripcion}
            onIrASuscripcion={() => dispatch({ type: "CAMBIAR_VISTA", payload: { vista: "config" } })} />
        )}
        <Header tabs={tabs} saveEst={saveEst} tema={tema} toggleTema={toggleTema} />
        <main className="rsp-main" style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 100px" }}>
          <div className="tab-view">

            {/* ── Vistas que permanecen montadas — display:none preserva estado local ── */}

            <div style={{ display: nav.vista === "presupuesto" ? undefined : "none" }}>
              <Presupuesto
                modulos={modulos}
                costos={costosResueltos}
                getModUsado={getModUsado}
                totalGeneral={totalGeneral}
                presupuestos={presupuestos}
                onGuardarPresupuesto={handleGuardarPresupuesto}
                onCargarPresupuesto={handleCargarPresupuesto}
                onEliminarPresupuesto={handleEliminarPresupuesto}
                onCambiarEstado={handleCambiarEstado}
                onActualizarPresupuesto={handleActualizarPresupuesto}
                costosVersion={costosVersion}
                presupuestoParaEditar={nav.presupuestoParaEditar}
                onPresupuestoEditarConsumed={() => dispatch({ type: "PRESUPUESTO_PARA_EDITAR_CONSUMIDO" })}
                borradorRecuperado={borradorRecuperado}
                lastBorradorSave={lastBorradorSave}
                onDismissBorrador={() => setBorradorRecuperado(false)}
                onGuardarExtraFrecuente={handleGuardarExtraFrecuente}
                setModulos={setModulos}
                hSaveModulos={hSaveM}
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
            </div>

            {tabsVisitadas.has("preview") && (
            <div style={{ display: nav.vista === "preview" ? undefined : "none" }}>
              <Suspense fallback={null}>
              <VistaPrevia
                items={items}
                modulos={modulos}
                costos={costosResueltos}
                onLimpiar={() => { setItems([]); setDimOverride({}); }}
                getModUsado={getModUsado}
                totalGeneral={totalGeneral}
                presupuestos={presupuestos}
                perfil={perfil}
                onActualizarPresupuesto={handleActualizarPresupuesto}
                onCambiarEstado={handleCambiarEstado}
                onCargarPresupuesto={handleCargarPresupuesto}
                presupuestoSelId={presupuestoActivoId}
                costosVersion={costosVersion}
                onVerRentabilidad={(id) => dispatch({ type: "ABRIR_CAJA", payload: { presupuestoId: id } })}
                onEditarModulos={(id, p) => {
                  handleCargarPresupuesto(p, id);
                  dispatch({ type: "EDITAR_PRESUPUESTO", payload: { id, p } });
                }}
              />
              </Suspense>
            </div>
            )}

            {tabsVisitadas.has("corte") && (
            <div style={{ display: nav.vista === "corte" ? undefined : "none" }}>
              <Suspense fallback={null}>
              <ListaCorte
                items={items}
                modulos={modulos}
                costos={costosResueltos}
                getModUsado={getModUsado}
                presupuestos={presupuestos}
                presupuestoActivoId={presupuestoActivoId}
                onActualizarPresupuesto={handleActualizarPresupuesto}
              />
              </Suspense>
            </div>
            )}

            {tabsVisitadas.has("render") && (
            <div style={{ display: nav.vista === "render" ? undefined : "none" }}>
              <Suspense fallback={null}>
              <RenderIA
                modulos={modulos}
                composicionOverride={composicionOverride}
                items={items}
                dimOverride={dimOverride}
                inlineModulos={inlineModulos}
                presupuestoActivoId={presupuestoActivoId}
                suscripcion={suscripcion}
                onRenderGenerado={() => cargarSuscripcion().then(setSuscripcion)}
                onImportarRender={handleImportarRender}
                imagenRef3D={imagenRef3D}
                materiales={materiales}
                materialesCategorias={materialesCategorias}
                onSaveMateriales={hSaveMateriales}
              />
              </Suspense>
            </div>
            )}

            {tabsVisitadas.has("vista3d") && (
            <div style={{ display: nav.vista === "vista3d" ? undefined : "none" }}>
              <Suspense fallback={null}>
              <Vista3DTab
                modulos={modulos}
                costos={costosResueltos}
                items={items}
                setItems={setItems}
                dimOverride={dimOverride}
                setDimOverride={setDimOverride}
                inlineModulos={inlineModulos}
                presupuestoActivoId={presupuestoActivoId}
                onCaptura={(base64) => setImagenRef3D(base64)}
              />
              </Suspense>
            </div>
            )}

            {tabsVisitadas.has("catalogo") && (
            <div style={{ display: nav.vista === "catalogo" ? undefined : "none" }}>
              <Suspense fallback={null}>
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
              </Suspense>
            </div>
            )}

            {/* ── Vistas utilitarias — se montan solo cuando están activas ── */}

            {nav.vista === "trabajos" && (
              <Suspense fallback={null}>
              <TableroKanban
                presupuestos={presupuestos}
                onCambiarEstado={handleCambiarEstado}
                onEliminar={handleEliminarPresupuesto}
                onCargar={(p) => {
                  handleCargarPresupuesto(p);
                  dispatch({ type: "CAMBIAR_VISTA", payload: { vista: "presupuesto" } });
                }}
                modulos={modulos}
                costos={costosResueltos}
                onActualizarPresupuesto={handleActualizarPresupuesto}
              />
              </Suspense>
            )}

            {nav.vista === "caja" && (
              <Suspense fallback={null}>
              <PanelCaja
                presupuestos={presupuestos}
                onActualizar={handleActualizarPresupuesto}
                modulos={modulos}
                costos={costosResueltos}
                cajaPresId={nav.cajaPresId}
                onClearCajaPresId={() => dispatch({ type: "CAJA_PRES_ID_CONSUMIDO" })}
              />
              </Suspense>
            )}

            {nav.vista === "costos" && (
              <Suspense fallback={null}>
                <HojaCostos
                  costos={costos}
                  setCostos={setCostos}
                  onSave={hSaveC}
                  materiales={materiales}
                  materialesCategorias={materialesCategorias}
                  onSaveMateriales={hSaveMateriales}
                />
              </Suspense>
            )}

            {nav.vista === "config" && (
              <Suspense fallback={null}>
              <PanelPerfil
                perfil={perfil}
                onGuardar={(nuevo) => { setPerfil(nuevo); withSave(() => guardarPerfil(nuevo)); }}
                suscripcion={suscripcion}
              />
              </Suspense>
            )}

            {nav.vista === "editor_vista" && nav.editorVistaCod && modulos?.[nav.editorVistaCod] && (
              <Suspense fallback={null}>
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
              </Suspense>
            )}

          </div>
        </main>
        {/* Paywall del trial cuando vence (overlay bloqueante). El banner
            de "te quedan X días" va arriba del header (más arriba en el JSX). */}
        {suscripcion && suscripcion.app_role !== "admin" && (() => {
          const e = suscripcion.estado;
          const dias = suscripcion.trial_ends_at
            ? Math.ceil((new Date(suscripcion.trial_ends_at) - new Date()) / 86400000)
            : null;
          const vencido = (e === "trialing" && dias !== null && dias <= 0)
            || e === "past_due" || e === "canceled" || e === "unpaid";
          return vencido ? <AvisoTrial suscripcion={suscripcion} /> : null;
        })()}
        {/* Modal de atajos de teclado — se abre con "?" */}
        {mostrarAtajos && <ModalAtajos onClose={() => setMostrarAtajos(false)} />}
        {/* Hint flotante — solo se muestra una vez */}
        <HintAtajos />
        {/* Toasts de errores globales (Supabase, save, etc.) */}
        {toastsError.length > 0 && (
          <div style={{
            position: "fixed", top: 70, right: 20, zIndex: 1500,
            display: "flex", flexDirection: "column", gap: 8,
            maxWidth: 360,
          }}>
            {toastsError.map(t => (
              <div key={t.id} style={{
                padding: "10px 14px", borderRadius: 8,
                background: "rgba(40, 12, 12, 0.96)",
                border: "1px solid rgba(200,60,60,0.45)",
                boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
                display: "flex", alignItems: "flex-start", gap: 10,
                color: "#ffbcbc", fontFamily: "'Bricolage Grotesque',sans-serif",
                fontSize: 13, lineHeight: 1.4,
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
                <span style={{ flex: 1 }}>{t.mensaje}</span>
                <button onClick={() => dismissToast(t.id)} style={{
                  padding: "0 6px", borderRadius: 4, cursor: "pointer",
                  background: "transparent", border: "none",
                  color: "#ffbcbc", fontSize: 14, lineHeight: 1,
                }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
    </PresupuestoContext.Provider>
  );
}

// Mini hint que aparece la primera vez (después se oculta — usa localStorage)
function HintAtajos() {
  const [visible, setVisible] = useState(() => !localStorage.getItem("carpicalc:hint_atajos_visto"));
  if (!visible) return null;
  const ocultar = () => {
    localStorage.setItem("carpicalc:hint_atajos_visto", "1");
    setVisible(false);
  };
  return (
    <div style={{
      position: "fixed", bottom: 16, right: 16, zIndex: 999,
      padding: "8px 14px", borderRadius: 8,
      background: "rgba(8,10,13,0.92)",
      border: "1px solid rgba(212,175,55,0.40)",
      backdropFilter: "blur(4px)",
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      fontSize: 11, fontFamily: "'DM Mono',monospace",
      color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 10,
    }}>
      <span>Apretá <kbd style={{ padding: "2px 6px", borderRadius: 3, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "#d4af37" }}>?</kbd> para ver atajos</span>
      <button onClick={ocultar} style={{
        padding: "2px 8px", borderRadius: 4, cursor: "pointer",
        background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
        color: "var(--text-muted)", fontSize: 10,
      }}>OK</button>
    </div>
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
