import React, { useState, useEffect } from 'react';
import { useUndo } from '../../hooks/useUndo.js';
import { PanelSelectorModulos } from '../catalogo/index.jsx';
import { Btn, Badge, TextInput } from '../ui/index.jsx';
import { fmtPeso, fmtNum,
         calcularModulo,
         presupuestoNecesitaActualizacion, presupuestoTieneContenido,
         recalcularTotalPresupuesto } from '../../utils.js';
import { usePresupuesto } from '../../state/PresupuestoContext.jsx';

import VistaModuloSVG from '../vista-svg/index.js';
import { TIPO_MAT } from '../../constants.js';
import ComposicionEditor from './ComposicionEditor.jsx';
import PiezasEditor from './PiezasEditor.jsx';
import { BarraTotal, ResumenPresupuesto } from './BarraTotal.jsx';

import { imprimirPresupuesto, generarFichaObra } from './imprimirPresupuesto.js';


import { SeccionCostosDirectos, SeccionAdicionales } from './SeccionesPresupuesto.jsx';
import GestorPresupuestos from './GestorPresupuestos.jsx';

// ── Presupuesto (componente principal del editor) ─────────────────
function Presupuesto({
  modulos,
  costos,
  getModUsado,
  totalGeneral,
  presupuestos,
  onGuardarPresupuesto,
  onCargarPresupuesto,
  onEliminarPresupuesto,
  onCambiarEstado,
  onActualizarPresupuesto,
  costosVersion = 0,
  presupuestoParaEditar = null,
  onPresupuestoEditarConsumed,
  onGuardarExtraFrecuente,
  setModulos,
  hSaveModulos,
  onGuardarModuloCatalogo,
  borradorRecuperado = false,
  onDismissBorrador
}) {
  // Estado del editor activo: viene del contexto en lugar de props.
  // AppInterna sigue siendo dueña del estado; aquí solo lo consumimos.
  const {
    items, setItems,
    dimOverride, setDimOverride,
    composicionOverride, setComposicionOverride,
    inlineModulos, setInlineModulos,
    adicionales, setAdicionales,
    costosDirectos, setCostosDirectos,
    presupuestoActivoId, setPresupuestoActivoId,
  } = usePresupuesto();


  // LOGICA - Edición de Presupuestos Existentes
  // Cuando llega un presupuesto desde Vista Previa vía "Editar módulos",
  // lo cargamos en el estado activo y notificamos que fue consumido
  useEffect(() => {
    if (!presupuestoParaEditar) return;
    const { id, p } = presupuestoParaEditar;
    onCargarPresupuesto(p, id);
    setClienteActivo(p.cliente || { nombre: "", tel: "", dir: "" });
    setNombreTrabajo(p.nombre || "");
    setPresupuestoActivoId(id);
    setCostosDirectos(Array.isArray(p.costosDirectos) ? [...p.costosDirectos] : []);
    onPresupuestoEditarConsumed && onPresupuestoEditarConsumed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presupuestoParaEditar]);
  const [inputCod, setInputCod] = useState("");
  const [inputCant, setInputCant] = useState(1);
  const [error, setError] = useState("");
  const [preDim, setPreDim] = useState(null);
  const [clienteActivo, setClienteActivo] = useState({ nombre: "", tel: "", dir: "" });
  const [nombreTrabajo, setNombreTrabajo] = useState("");
  const [dialogoGuardar, setDialogoGuardar] = useState(false);
  const { ToastContainer } = useUndo();
  const formRef = React.useRef(null);

  // LÓGICA - Global Sync: índice del módulo que se está editando (null = agregar nuevo)
  const [editandoModuloIdx, setEditandoModuloIdx] = useState(null);
  const [confirmDelModulo, setConfirmDelModulo] = useState(null);
  // Modal Nivel 2 de edición
  const [modalEdicion, setModalEdicion] = useState(null);
  // Drawer de composición visual por instancia
  const [modalComposicion, setModalComposicion] = useState(null); // { item, idx } | null
  // Drawer de edición de piezas/herrajes por instancia
  const [modalModulo, setModalModulo] = useState(null); // { item, modInicial } | null
  const [pestañaActiva, setPestañaActiva] = useState("modulos");
  const [mostrarExtras, setMostrarExtras] = useState(true);
  const [mostrarCostosDirectos, setMostrarCostosDirectos] = useState(true);

  // Edición inline de extras frecuentes
  const [editandoExtraId, setEditandoExtraId] = useState(null);
  const [editandoExtraForm, setEditandoExtraForm] = useState(null);
  const [toastExtraSync, setToastExtraSync] = useState(null);

  // LÓGICA - Global Sync: actualiza el módulo en su posición original sin crear uno nuevo.
  // Dispara recálculo automático en Cortes, Caja y total del presupuesto.
  const handleUpdateModule = (cod, cant, dims) => {
    const modBase = modulos[cod];
    if (!modBase) return;
    const key = items[editandoModuloIdx]?.id || items[editandoModuloIdx]?.codigo || cod;
    const nuevoItem = { ...items[editandoModuloIdx], codigo: cod, cantidad: cant };
    const nuevoItems = items.map((it, i) => i === editandoModuloIdx ? nuevoItem : it);
    const nuevoDimOverride = { ...dimOverride };
    if (dims) nuevoDimOverride[key] = dims;
    setItems(nuevoItems);
    setDimOverride(nuevoDimOverride);
    // Persistir si hay presupuesto activo — sincroniza Cortes y Caja automáticamente
    if (presupuestoActivoId) {
      const totalNuevo = nuevoItems.reduce((acc, item) => {
        const base = modulos[item.codigo]; if (!base) return acc;
        const d = nuevoDimOverride[item.id || item.codigo] || base.dimensiones;
        const calc = calcularModulo({ ...base, dimensiones: d }, costos);
        return acc + (calc ? calc.total * item.cantidad : 0);
      }, 0);
      onActualizarPresupuesto && onActualizarPresupuesto(presupuestoActivoId, {
        items: nuevoItems,
        dimOverride: nuevoDimOverride,
        total: Math.round(totalNuevo)
      });
    }
    setEditandoModuloIdx(null);
    setInputCod(""); setInputCant(1); setPreDim(null); setError("");
  };

  // Aplica dims/material del acordeón abierto a dimOverride (sin cerrar el acordeón).
  // Llamado desde onBlur de inputs, onChange del select y botón "✓ Actualizar".
  const aplicarDims = () => {
    if (!modalEdicion) return;
    const esTemp = modalEdicion.item.codigo.startsWith("TEMP_");
    if (esTemp) {
      const tempCod = modalEdicion.item.codigo;
      const nuevosModulos = { ...modulos, [tempCod]: { ...modulos[tempCod], dimensiones: modalEdicion.dims, material: modalEdicion.material } };
      setModulos && setModulos(nuevosModulos);
      hSaveModulos && hSaveModulos(nuevosModulos);
      return;
    }

    const keyId = modalEdicion.item.id || modalEdicion.item.codigo;

    // Inline module: dims/material viven dentro del inline (dimOverride es ignorado por getModUsado)
    if (inlineModulos[keyId]) {
      const nuevoInline = {
        ...inlineModulos,
        [keyId]: { ...inlineModulos[keyId], dimensiones: { ...modalEdicion.dims }, material: modalEdicion.material },
      };
      setInlineModulos(nuevoInline);
      if (presupuestoActivoId && costos) {
        const pTemp = { items, dimOverride, inlineModulos: nuevoInline, adicionales, costosDirectos };
        const nuevoTotal = recalcularTotalPresupuesto(pTemp, modulos, costos);
        if (nuevoTotal !== null) {
          onActualizarPresupuesto && onActualizarPresupuesto(presupuestoActivoId, {
            inlineModulos: nuevoInline, total: Math.round(nuevoTotal),
          });
        }
      }
      return;
    }

    // Módulo normal: actualizar dimOverride
    const base = modulos[modalEdicion.origenCodigo];
    const bd = base?.dimensiones || {};
    const difiere = modalEdicion.dims.ancho !== bd.ancho || modalEdicion.dims.profundidad !== bd.profundidad || modalEdicion.dims.alto !== bd.alto || modalEdicion.material !== (base?.material ?? "melamina");
    const nuevoDimOverride = { ...dimOverride };
    if (difiere) nuevoDimOverride[keyId] = { ...modalEdicion.dims, material: modalEdicion.material };
    else delete nuevoDimOverride[keyId];
    setDimOverride(nuevoDimOverride);

    if (presupuestoActivoId && costos) {
      const pTemp = { items, dimOverride: nuevoDimOverride, inlineModulos, adicionales, costosDirectos };
      const nuevoTotal = recalcularTotalPresupuesto(pTemp, modulos, costos);
      if (nuevoTotal !== null) {
        onActualizarPresupuesto && onActualizarPresupuesto(presupuestoActivoId, {
          dimOverride: nuevoDimOverride, total: Math.round(nuevoTotal),
        });
      }
    }
  };

  // Detectar presupuesto desactualizado cuando se carga uno guardado
  const [alertaPrecios, setAlertaPrecios] = useState(null); // { idPres, totalOriginal, totalRecalculado }

  // Al cargar un presupuesto verificar si los precios cambiaron
  const verificarPrecios = (p, id) => {
    if (!presupuestoTieneContenido(p)) return;
    const totalRecalculado = recalcularTotalPresupuesto(p, modulos, costos);
    if (totalRecalculado === null) return;
    const diff = Math.abs(totalRecalculado - p.total);
    if (diff > 1) {
      setAlertaPrecios({ id, totalOriginal: p.total, totalRecalculado: Math.round(totalRecalculado) });
    } else {
      setAlertaPrecios(null);
    }
  };

  const handleCargar = (p, id) => {
    onCargarPresupuesto(p, id);
    setClienteActivo(p.cliente || { nombre: "", tel: "", dir: "" });
    setNombreTrabajo(p.nombre || "");
    setPresupuestoActivoId(id || null);
    setAlertaPrecios(null);
    setModalEdicion(null); setModalComposicion(null); setModalModulo(null);
    verificarPrecios(p, id);
  };

  const handleNuevoPresupuesto = () => {
    setItems([]);
    setClienteActivo({ nombre: "", tel: "", dir: "" });
    setNombreTrabajo("");
    setPresupuestoActivoId(null);
    setAlertaPrecios(null);
    setModalEdicion(null); setModalComposicion(null); setModalModulo(null);
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
    const nuevoId = crypto.randomUUID();
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
        const n = items.map((it, i) => i === idx ? { ...it, cantidad: it.cantidad + cant } : it);
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
          alto: parseInt(preDim.alto) || 0
        }
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

  // ── Helpers de limpieza y condiciones de render ───────────────────────────

  /** Limpia completamente el editor: ítems, adicionales, CDs, cliente, estado. */
  const limpiarEditor = () => {
    setItems([]); setDimOverride({}); setComposicionOverride({}); setInlineModulos({}); setAdicionales([]); setCostosDirectos([]);
    setNombreTrabajo(""); setClienteActivo({ nombre: "", tel: "", dir: "" });
    setPresupuestoActivoId(null); setAlertaPrecios(null);
    setEditandoModuloIdx(null); setInputCod(""); setPreDim(null);
    setModalEdicion(null); setModalComposicion(null); setModalModulo(null);
    setDialogoGuardar(false);
    onDismissBorrador && onDismissBorrador();
  };

  /** El editor tiene contenido guardable (al menos un ítem, extra o costo directo). */
  const tieneContenidoEditor = items.length > 0 || adicionales.length > 0 || costosDirectos.length > 0;

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
          costosVersion={costosVersion}
          onActualizarPresupuesto={onActualizarPresupuesto}
          modulos={modulos}
          costos={costos}
        />
      </div>

      {/* 2. Tarjeta de trabajo activo — formulario siempre visible */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.22)" }}>

        {/* Banner borrador recuperado */}
        {borradorRecuperado && (
          <div style={{ padding: "10px 20px", background: "rgba(200,160,42,0.12)", borderBottom: "1px solid rgba(200,160,42,0.25)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 12, color: "#c8a02a", fontWeight: 600 }}>
              ↩ Borrador recuperado — tenés {items.length} módulo{items.length !== 1 ? "s" : ""} sin guardar
            </span>
            <button onClick={() => onDismissBorrador && onDismissBorrador()}
              style={{ fontSize: 11, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {/* Header con nombre del trabajo */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
              {nombreTrabajo || <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontWeight: 400 }}>Nuevo presupuesto</span>}
            </div>
            {clienteActivo.nombre && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                👤 {clienteActivo.nombre}{clienteActivo.tel && ` · ${clienteActivo.tel}`}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {tieneContenidoEditor && (
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color: "var(--color-positive)" }}>
                {fmtPeso(totalGeneral)}
              </span>
            )}
            {tieneContenidoEditor && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {presupuestoActivoId && (() => {
                  const pActivo = presupuestos[presupuestoActivoId];
                  const nuevoTotal = pActivo ? recalcularTotalPresupuesto(pActivo, modulos, costos) : null;
                  const necesita = nuevoTotal !== null
                    ? Math.abs(Math.round(nuevoTotal) - (pActivo?.total || 0)) > 1
                    : presupuestoNecesitaActualizacion(presupuestoActivoId, costosVersion, pActivo);
                  return necesita ? (
                    <button onClick={() => {
                      if (nuevoTotal !== null) onActualizarPresupuesto(presupuestoActivoId, { total: Math.round(nuevoTotal), costosVersionAl: Date.now() });
                    }} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a" }}>
                      ↻ Actualizar
                    </button>
                  ) : null;
                })()}
                <button onClick={() => {
                  const hayOverrides = items.some(item => {
                    const key = item.id || item.codigo;
                    if (inlineModulos[key]) return true;
                    const over = dimOverride?.[key];
                    if (!over) return false;
                    const base = modulos[item.codigo];
                    if (!base) return false;
                    return (over.ancho != null && over.ancho !== base.dimensiones?.ancho)
                      || (over.alto != null && over.alto !== base.dimensiones?.alto)
                      || (over.profundidad != null && over.profundidad !== base.dimensiones?.profundidad)
                      || (over.material != null && over.material !== (base.material ?? "melamina"));
                  });
                  if (presupuestoActivoId || hayOverrides) { setDialogoGuardar(true); }
                  else { onGuardarPresupuesto(nombreTrabajo || "Sin nombre", clienteActivo, ""); limpiarEditor(); }
                }}
                  style={{ padding: "6px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)", boxShadow: "0 2px 8px rgba(180,100,20,0.25)" }}>
                  💾 Guardar
                </button>
                <button onClick={limpiarEditor} style={{ padding: "6px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer", background: "transparent", border: "1px solid rgba(200,60,60,0.30)", color: "#e07070" }}>
                  ✕ Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Formulario cliente — siempre visible */}
        <div style={{ padding: "10px 20px", background: "var(--bg-subtle)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.8fr 1fr", gap: 10 }}>
            <TextInput label="Trabajo *" placeholder="Ej: Cocina Rodríguez" small value={nombreTrabajo} onChange={setNombreTrabajo} />
            <TextInput label="Cliente" placeholder="Nombre del cliente" small value={clienteActivo.nombre} onChange={v => setClienteActivo(c => ({ ...c, nombre: v }))} />
            <TextInput label="Teléfono" placeholder="341 555-1234" small value={clienteActivo.tel} onChange={v => setClienteActivo(c => ({ ...c, tel: v }))} />
            <TextInput label="Dirección" placeholder="Av. San Martín 456" small value={clienteActivo.dir} onChange={v => setClienteActivo(c => ({ ...c, dir: v }))} />
          </div>
        </div>
      </div>

      {/* Diálogo guardar */}
      {dialogoGuardar && (() => {
        const itemsConOverride = items.filter(item => {
          const key = item.id || item.codigo;
          if (inlineModulos[key]) return true;
          const over = dimOverride?.[key];
          if (!over) return false;
          const base = modulos[item.codigo];
          if (!base) return false;
          return (over.ancho != null && over.ancho !== base.dimensiones?.ancho)
            || (over.alto != null && over.alto !== base.dimensiones?.alto)
            || (over.profundidad != null && over.profundidad !== base.dimensiones?.profundidad)
            || (over.material != null && over.material !== (base.material ?? "melamina"));
        });

        const crearVariantesYGuardar = (esNuevo) => {
          let newItems = [...items];
          let newDim = { ...dimOverride };
          let newInline = { ...inlineModulos };
          for (const item of itemsConOverride) {
            const key = item.id || item.codigo;
            const base = modulos[item.codigo];
            if (!base) continue;
            let newMod;
            if (newInline[key]) {
              newMod = { ...newInline[key] };
            } else {
              const over = newDim[key];
              if (!over) continue;
              newMod = {
                ...base,
                dimensiones: {
                  ...base.dimensiones,
                  ancho: over.ancho ?? base.dimensiones?.ancho,
                  alto: over.alto ?? base.dimensiones?.alto,
                  profundidad: over.profundidad ?? base.dimensiones?.profundidad,
                },
                material: over.material ?? base.material,
              };
            }
            const newId = onGuardarModuloCatalogo && onGuardarModuloCatalogo(newMod, `${base.nombre || item.codigo} (variante)`);
            if (newId) {
              newItems = newItems.map(it => (it.id || it.codigo) === key ? { ...it, codigo: newId } : it);
              delete newDim[key];
              delete newInline[key];
            }
          }
          setItems(newItems);
          setDimOverride(newDim);
          setInlineModulos(newInline);
          const newComp = Object.fromEntries(
            Object.entries(composicionOverride).filter(([key]) =>
              newItems.some(it => (it.id || it.codigo) === key)
            )
          );
          setComposicionOverride(newComp);
          if (esNuevo) {
            onGuardarPresupuesto(nombreTrabajo || "Sin nombre", clienteActivo, "");
          } else {
            onActualizarPresupuesto && onActualizarPresupuesto(presupuestoActivoId, { nombre: nombreTrabajo, cliente: clienteActivo, items: newItems, dimOverride: newDim, composicionOverride: newComp, inlineModulos: newInline, adicionales: [...adicionales], costosDirectos: [...costosDirectos], total: totalGeneral, costosVersionAl: Date.now() });
          }
          setDialogoGuardar(false);
          limpiarEditor();
        };

        const btnBase = { padding: "8px 14px", borderRadius: 7, fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, cursor: "pointer" };
        return (
          <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--bg-overlay)", border: "1px solid var(--accent-border)", boxShadow: "0 6px 24px rgba(0,0,0,0.35)" }}>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>💾 ¿Cómo querés guardar?</div>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", marginBottom: 12 }}>
              "{nombreTrabajo || "Sin nombre"}"
              {itemsConOverride.length > 0 && (
                <span style={{ marginLeft: 8, color: "#7090d8" }}>· {itemsConOverride.length} módulo{itemsConOverride.length > 1 ? "s" : ""} con personalización</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {itemsConOverride.length > 0 && (
                <button onClick={() => crearVariantesYGuardar(!presupuestoActivoId)}
                  style={{ ...btnBase, background: "rgba(100,140,220,0.15)", border: "1px solid rgba(100,140,220,0.35)", color: "#7090d8" }}>
                  📚 Crear variantes
                </button>
              )}
              {presupuestoActivoId ? (
                <>
                  <button onClick={() => {
                    onActualizarPresupuesto && onActualizarPresupuesto(presupuestoActivoId, { nombre: nombreTrabajo, cliente: clienteActivo, items: [...items], dimOverride: { ...dimOverride }, composicionOverride: { ...composicionOverride }, inlineModulos: { ...inlineModulos }, adicionales: [...adicionales], costosDirectos: [...costosDirectos], total: totalGeneral, costosVersionAl: Date.now() });
                    setDialogoGuardar(false);
                    limpiarEditor();
                  }} style={{ ...btnBase, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                    ✓ Actualizar
                  </button>
                  <button onClick={() => {
                    onGuardarPresupuesto(nombreTrabajo || "Sin nombre", clienteActivo, "");
                    setDialogoGuardar(false);
                    limpiarEditor();
                  }} style={{ ...btnBase, background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    + Copia
                  </button>
                </>
              ) : (
                <button onClick={() => {
                  onGuardarPresupuesto(nombreTrabajo || "Sin nombre", clienteActivo, "");
                  setDialogoGuardar(false);
                  limpiarEditor();
                }} style={{ ...btnBase, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                  💾 Guardar
                </button>
              )}
              <button onClick={() => setDialogoGuardar(false)}
                style={{ ...btnBase, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
            </div>
          </div>
        );
      })()}

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

      {/* ══════════════════════════════════════════════════════════
          CUERPO DEL PRESUPUESTO
          Tarjeta contenedora para ítems ya agregados.
          Los formularios de carga quedan FUERA de esta card.
          ══════════════════════════════════════════════════════════ */}
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        boxShadow: "0 4px 28px rgba(0,0,0,0.30), 0 1px 4px rgba(0,0,0,0.20)",
        overflow: "hidden",
        minHeight: 120
      }}>
        {/* Header de la card */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--separator)", background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text-muted)" }}>
            Ítems del presupuesto
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {/* Desglose del contador */}
            {(items.length > 0 || adicionales.length > 0 || costosDirectos.length > 0) && (
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
                {items.length} mód.
                {adicionales.length > 0 && ` · ${adicionales.length} extra${adicionales.length !== 1 ? "s" : ""}`}
                {costosDirectos.length > 0 && ` · ${costosDirectos.length} costo${costosDirectos.length !== 1 ? "s" : ""}`}
              </span>
            )}
            {/* Toggle 👁 extras */}
            {adicionales.length > 0 && (
              <button onClick={() => setMostrarExtras(v => !v)} title={mostrarExtras ? "Ocultar extras del resumen" : "Mostrar extras en el resumen"}
                style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", padding: "2px 8px", borderRadius: 5, cursor: "pointer", border: `1px solid ${mostrarExtras ? "var(--border)" : "rgba(200,160,42,0.40)"}`, background: mostrarExtras ? "transparent" : "rgba(200,160,42,0.10)", color: mostrarExtras ? "var(--text-muted)" : "#c8a02a", transition: "all 0.15s" }}>
                {mostrarExtras ? "👁 extras" : "👁 extras"}
              </button>
            )}
            {/* Toggle 👁 costos directos */}
            {costosDirectos.length > 0 && (
              <button onClick={() => setMostrarCostosDirectos(v => !v)} title={mostrarCostosDirectos ? "Ocultar costos directos del resumen" : "Mostrar costos directos en el resumen"}
                style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", padding: "2px 8px", borderRadius: 5, cursor: "pointer", border: `1px solid ${mostrarCostosDirectos ? "var(--border)" : "rgba(200,160,42,0.40)"}`, background: mostrarCostosDirectos ? "transparent" : "rgba(200,160,42,0.10)", color: mostrarCostosDirectos ? "var(--text-muted)" : "#c8a02a", transition: "all 0.15s" }}>
                {mostrarCostosDirectos ? "👁 costos" : "👁 costos"}
              </button>
            )}
          </div>
        </div>

        {/* Estado vacío */}
        {items.length === 0 && adicionales.length === 0 && costosDirectos.length === 0 && (
          <div style={{ padding: "52px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.18 }}>◻</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 400, letterSpacing: "0.01em", lineHeight: 1.6 }}>
              Agregue ítems al presupuesto
            </p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", opacity: 0.6, marginTop: 4 }}>
              Usá los formularios de arriba para sumar módulos o gastos extras
            </p>
          </div>
        )}

        {/* Módulos cargados — mismo sistema visual que FilaModuloLista del catálogo */}
        {items.length > 0 && (
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((item, idx) => {
            const keyId = item.id || item.codigo;
            const modUsado = getModUsado(item);
            if (!modUsado) return null;
            const calc = calcularModulo(modUsado, costos);
            if (!calc) return null;
            const modBase = modulos[item.codigo];
            const over = modUsado.dimensiones;
            const dimDif = modBase && (over.ancho !== modBase.dimensiones.ancho || over.profundidad !== modBase.dimensiones.profundidad || over.alto !== modBase.dimensiones.alto);
            const estaEditando = modalEdicion?.idx === idx;
            const esTemp = !!modBase?.temporal;

            return (
              <div key={keyId} style={{
                borderRadius: 10,
                border: `1px solid ${estaEditando ? "var(--accent-border)" : "var(--border)"}`,
                background: "var(--bg-surface)",
                overflow: "hidden",
                transition: "border-color 0.15s"
              }}
                onMouseEnter={e => { if (!estaEditando) e.currentTarget.style.borderColor = "var(--accent-border)"; }}
                onMouseLeave={e => { if (!estaEditando) e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                {/* Fila principal — mismo layout que FilaModuloLista */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", flexWrap: "wrap" }}>

                  {/* Thumbnail SVG → Composición visual por instancia */}
                  <div
                    onClick={() => setModalComposicion({ item, idx })}
                    title="Modificar composición visual"
                    style={{
                      width: 48, height: 48, flexShrink: 0, cursor: "pointer",
                      border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden",
                      background: "var(--bg-subtle)", transition: "border-color 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-border)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    <VistaModuloSVG
                      modulo={modUsado}
                      vistaConfig={modUsado.vistaConfig}
                      theme="dark"
                      width={48}
                      height={48}
                      plano={true}
                    />
                  </div>

                  {/* Código */}
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>
                    {item.codigo.startsWith("TEMP_") ? "VAR" : item.codigo}
                  </span>

                  {/* Nombre + badge temp + dimensiones */}
                  <div style={{ flex: 2, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{modUsado.nombre}</span>
                      {esTemp && (
                        <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.30)", color: "#c8a02a", borderRadius: 3, padding: "1px 5px" }}>
                          ✦ var
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: dimDif ? "var(--accent)" : "var(--text-muted)", marginTop: 2 }}>
                      {over.ancho}×{over.profundidad}×{over.alto} mm
                    </div>
                  </div>

                  {/* Material + espesor — mismo Badge del catálogo */}
                  <div style={{ display: "flex", gap: 5, flexShrink: 0, flexWrap: "wrap" }}>
                    <Badge>{TIPO_MAT[modUsado.material]}</Badge>
                    {calc.espesor && <Badge color="#705090">{calc.espesor}mm</Badge>}
                    {calc.materialFallback && (
                      <span title={`Material "${modUsado.material}" no encontrado — se usó el primero disponible`} style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444", borderRadius: 3, padding: "1px 5px", cursor: "help" }}>
                        ⚠ material
                      </span>
                    )}
                    {calc.piezasNegativas?.length > 0 && (
                      <span title={`Fórmulas con resultado negativo (clamped a 0): ${calc.piezasNegativas.join(", ")}`} style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.35)", color: "#ca8a04", borderRadius: 3, padding: "1px 5px", cursor: "help" }}>
                        ⚠ fórmula
                      </span>
                    )}
                  </div>

                  {/* Cantidad − n + */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setItems(its => its.map((it, i) => i === idx ? { ...it, cantidad: Math.max(1, it.cantidad - 1) } : it))}
                      style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, minWidth: 18, textAlign: "center", color: "var(--accent)" }}>{item.cantidad}</span>
                    <button onClick={() => setItems(its => its.map((it, i) => i === idx ? { ...it, cantidad: it.cantidad + 1 } : it))}
                      style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>

                  {/* Precio — mismo estilo que catálogo */}
                  <div style={{ display: "flex", gap: 16, flexShrink: 0, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
                    <span style={{ color: "var(--color-positive-muted)" }}>{fmtNum(calc.m2Neto)} m²</span>
                    <span style={{ color: "var(--color-positive)", fontWeight: 700 }}>{fmtPeso(calc.total * item.cantidad)}</span>
                  </div>

                  {/* Acciones: ✎ y × */}
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        if (estaEditando) {
                          // LEGACY COMPAT: revertir TEMP (cierra sin aplicar)
                          if (modalEdicion?.tempCod && modalEdicion?.origenCodigo) {
                            const nuevosModulos = { ...modulos };
                            delete nuevosModulos[modalEdicion.tempCod];
                            setModulos && setModulos(nuevosModulos);
                            hSaveModulos && hSaveModulos(nuevosModulos);
                            setItems(its => its.map((it, i) =>
                              i === idx ? { ...it, codigo: modalEdicion.origenCodigo } : it
                            ));
                          } else {
                            aplicarDims();
                          }
                          setModalEdicion(null);
                          return;
                        }
                        const modOrig = modulos[item.codigo];
                        if (modOrig?.temporal) {
                          // ítem ya tiene TEMP de edición Nivel 3 — abrir con dims actuales del TEMP
                          setModalEdicion({
                            item, idx, modBase: modOrig,
                            dims: { ...modOrig.dimensiones },
                            material: modOrig.material || "melamina",
                            cantidad: item.cantidad,
                            origenCodigo: modOrig.origenCodigo || item.codigo
                          });
                          return;
                        }
                        // ítem normal: abrir con dims del dimOverride actual (o base si no hay override)
                        const keyIdEdit = item.id || item.codigo;
                        const overEdit = dimOverride?.[keyIdEdit] || {};
                        setModalEdicion({
                          item, idx, modBase: modOrig,
                          dims: {
                            ancho:       overEdit.ancho       ?? modOrig?.dimensiones.ancho,
                            profundidad: overEdit.profundidad ?? modOrig?.dimensiones.profundidad,
                            alto:        overEdit.alto        ?? modOrig?.dimensiones.alto,
                          },
                          material: overEdit.material ?? modOrig?.material ?? "melamina",
                          cantidad: item.cantidad,
                          origenCodigo: item.codigo
                        });
                      }}
                      style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${estaEditando ? "var(--accent-border)" : "var(--border)"}`, background: estaEditando ? "var(--accent-soft)" : "transparent", color: estaEditando ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, transition: "all 0.15s" }}>
                      {estaEditando ? "▲" : "✎"}
                    </button>
                    {confirmDelModulo === keyId ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => { setItems(its => its.filter((_, i) => i !== idx)); if (estaEditando) setModalEdicion(null); setConfirmDelModulo(null); }}
                          style={{ padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070", fontFamily: "'DM Mono',monospace" }}>✓</button>
                        <button onClick={() => setConfirmDelModulo(null)}
                          style={{ padding: "4px 7px", borderRadius: 5, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelModulo(keyId)}
                        style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid rgba(200,60,60,0.22)", background: "transparent", color: "#e07070", cursor: "pointer", fontSize: 11, transition: "all 0.15s" }}>×</button>
                    )}
                  </div>
                </div>

                {/* Acordeón de edición por instancia */}
                {estaEditando && modalEdicion && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "10px 14px 12px", background: "var(--bg-subtle)" }}>

                    {/* Badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{
                        fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.08em", borderRadius: 4, padding: "2px 7px",
                        background: modalEdicion.item?.codigo?.startsWith("TEMP_") ? "var(--accent-soft)" : "rgba(120,180,100,0.12)",
                        border: `1px solid ${modalEdicion.item?.codigo?.startsWith("TEMP_") ? "var(--accent-border)" : "rgba(120,180,100,0.35)"}`,
                        color: modalEdicion.item?.codigo?.startsWith("TEMP_") ? "var(--accent)" : "#4a9e5c",
                      }}>
                        {modalEdicion.item?.codigo?.startsWith("TEMP_") ? "VARIANTE" : "SOLO PRESUPUESTO"}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'DM Mono',monospace" }}>
                        {modalEdicion.item?.codigo?.startsWith("TEMP_") ? "módulo temporal" : "catálogo sin cambios · ▲ aplica"}
                      </span>
                    </div>

                    {/* Dims + Material compactos */}
                    <div style={{ display: "flex", gap: 5, alignItems: "flex-end", marginBottom: 8 }}>
                      {[["A", "ancho"], ["P", "profundidad"], ["H", "alto"]].map(([label, key]) => (
                        <div key={key} style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "center", marginBottom: 3, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                          <input type="number" min="1"
                            value={modalEdicion.dims[key]}
                            onChange={e => setModalEdicion(m => ({ ...m, dims: { ...m.dims, [key]: parseInt(e.target.value) || 0 } }))}
                            style={{ width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, padding: "5px 4px", textAlign: "center", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none" }}
                            onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                            onBlur={e => { e.target.style.borderColor = "var(--border)"; aplicarDims(); }} />
                        </div>
                      ))}
                      <div style={{ flex: 1.8 }}>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 3, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>Mat.</div>
                        <select value={modalEdicion.material}
                          onChange={e => {
                            const newMat = e.target.value;
                            setModalEdicion(m => ({ ...m, material: newMat }));
                            if (modalEdicion && !modalEdicion.item.codigo.startsWith("TEMP_")) {
                              const keyId = modalEdicion.item.id || modalEdicion.item.codigo;
                              const base = modulos[modalEdicion.origenCodigo];
                              const bd = base?.dimensiones || {};
                              const d = modalEdicion.dims;
                              const difiere = d.ancho !== bd.ancho || d.profundidad !== bd.profundidad || d.alto !== bd.alto || newMat !== (base?.material ?? "melamina");
                              setDimOverride(prev => { const n = { ...prev }; if (difiere) n[keyId] = { ...d, material: newMat }; else delete n[keyId]; return n; });
                            }
                          }}
                          style={{ width: "100%", padding: "5px 4px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontFamily: "'DM Mono',monospace", fontSize: 11, outline: "none" }}>
                          {Object.entries(TIPO_MAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Acciones compactas */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={aplicarDims}
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
                      <button onClick={() => setModalEdicion(null)}
                        style={{ padding: "5px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, background: "transparent", border: "1px solid rgba(200,60,60,0.28)", color: "#e07070" }}>
                        ✕
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}

        {/* Adicionales — mismo sistema visual que módulos */}
        {adicionales.length > 0 && (
          <div style={{ padding: "0 12px 10px", opacity: mostrarExtras ? 1 : 0.45, transition: "opacity 0.2s" }}>
            {items.length > 0 && <div style={{ height: 1, background: "var(--separator)", margin: "0 0 6px", opacity: 0.4 }} />}
            {adicionales.map(x => {
              const editandoEste = editandoExtraId === x.id;
              const esFrecuente = (costos?.extrasFrecuentes || []).some(f => f.nombre.toLowerCase() === x.nombre.toLowerCase());
              return (
                <div key={x.id} style={{
                  borderRadius: 10, border: `1px solid ${editandoEste ? "var(--accent-border)" : "var(--border)"}`,
                  background: "var(--bg-surface)", overflow: "hidden", marginBottom: 6, transition: "border-color 0.15s"
                }}
                  onMouseEnter={e => { if (!editandoEste) e.currentTarget.style.borderColor = "var(--accent-border)"; }}
                  onMouseLeave={e => { if (!editandoEste) e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  {/* Fila principal — mismo layout que módulos */}
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", alignItems: "center", gap: 14, padding: "10px 14px" }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "#c8a02a", flexShrink: 0 }}>
                      Extra
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.nombre}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "var(--color-positive)", whiteSpace: "nowrap" }}>{fmtPeso(x.monto)}</span>
                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                      <button onClick={() => {
                        if (editandoEste) { setEditandoExtraId(null); setEditandoExtraForm(null); }
                        else { setEditandoExtraId(x.id); setEditandoExtraForm({ nombre: x.nombre, monto: String(x.monto) }); }
                      }} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${editandoEste ? "var(--accent-border)" : "var(--border)"}`, background: editandoEste ? "var(--accent-soft)" : "transparent", color: editandoEste ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                        {editandoEste ? "▲" : "✎"}
                      </button>
                      {confirmDelModulo === `extra-${x.id}` ? (
                        <>
                          <button onClick={() => { setAdicionales(prev => prev.filter(a => a.id !== x.id)); setConfirmDelModulo(null); if (editandoEste) { setEditandoExtraId(null); setEditandoExtraForm(null); } }}
                            style={{ padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070", fontFamily: "'DM Mono',monospace" }}>✓</button>
                          <button onClick={() => setConfirmDelModulo(null)}
                            style={{ padding: "4px 7px", borderRadius: 5, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelModulo(`extra-${x.id}`)}
                          style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid rgba(200,60,60,0.22)", background: "transparent", color: "#e07070", cursor: "pointer", fontSize: 11 }}>×</button>
                      )}
                    </div>
                  </div>
                  {/* Acordeón edición — inline */}
                  {editandoEste && editandoExtraForm && (
                    <div style={{ padding: "8px 4px 10px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                      <input type="text" value={editandoExtraForm.nombre}
                        onChange={e => setEditandoExtraForm(f => ({ ...f, nombre: e.target.value }))}
                        style={{ flex: 1, minWidth: 120, fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 12, padding: "6px 10px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-primary)", outline: "none" }}
                        onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                        onBlur={e => e.target.style.borderColor = "var(--border)"} />
                      <input type="number" min="0" value={editandoExtraForm.monto}
                        onChange={e => setEditandoExtraForm(f => ({ ...f, monto: e.target.value }))}
                        style={{ width: 100, fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, padding: "6px 10px", textAlign: "right", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--color-positive)", outline: "none" }}
                        onFocus={e => e.target.style.borderColor = "var(--color-positive)"}
                        onBlur={e => e.target.style.borderColor = "var(--border)"} />
                      <button onClick={() => {
                        const nuevoNombre = editandoExtraForm.nombre.trim();
                        const nuevoMonto = parseFloat(editandoExtraForm.monto) || 0;
                        setAdicionales(prev => prev.map(a => a.id === x.id ? { ...a, nombre: nuevoNombre, monto: nuevoMonto } : a));
                        if (esFrecuente && nuevoNombre !== x.nombre) {
                          setToastExtraSync({ viejo: x.nombre, nuevo: nuevoNombre, monto: nuevoMonto, id: x.id });
                        } else if (esFrecuente) {
                          onGuardarExtraFrecuente && onGuardarExtraFrecuente({ nombre: nuevoNombre, precio: nuevoMonto, actualizar: x.nombre });
                        }
                        setEditandoExtraId(null); setEditandoExtraForm(null);
                      }} style={{ padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)" }}>
                        ✓
                      </button>
                      <button onClick={() => { setEditandoExtraId(null); setEditandoExtraForm(null); }}
                        style={{ padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontSize: 11, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                    </div>
                  )}
                  {toastExtraSync?.id === x.id && (
                    <div style={{ margin: "0 4px 8px", padding: "8px 12px", borderRadius: 7, background: "rgba(200,160,42,0.10)", border: "1px solid rgba(200,160,42,0.25)", fontSize: 11, color: "#c8a02a" }}>
                      <div style={{ marginBottom: 6 }}>💡 ¿Actualizar "{x.nombre}" en tus recurrentes de Costos?</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { onGuardarExtraFrecuente && onGuardarExtraFrecuente({ nombre: toastExtraSync.nuevo, precio: toastExtraSync.monto, actualizar: toastExtraSync.viejo }); setToastExtraSync(null); }}
                          style={{ padding: "3px 10px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, background: "rgba(200,160,42,0.18)", border: "1px solid rgba(200,160,42,0.40)", color: "#c8a02a", fontFamily: "'DM Mono',monospace" }}>Actualizar</button>
                        <button onClick={() => setToastExtraSync(null)}
                          style={{ padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>No</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Costos directos — mismo sistema visual que módulos */}
        {costosDirectos.length > 0 && (
          <div style={{ padding: `0 12px 10px`, opacity: mostrarCostosDirectos ? 1 : 0.45, transition: "opacity 0.2s" }}>
            {(items.length > 0 || adicionales.length > 0) && <div style={{ height: 1, background: "var(--separator)", margin: "0 0 6px", opacity: 0.4 }} />}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {costosDirectos.map(x => {
              const COLOR = { mo: "#9b7fd4", material: "#7090c0", herraje: "#c0906a", tapacanto: "#6aab8e" };
              const LABEL = { mo: "Mano de obra", material: "Material", herraje: "Herraje", tapacanto: "Tapacanto" };
              return (
                <div key={x.id} style={{
                  borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-surface)", overflow: "hidden", transition: "border-color 0.15s"
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", alignItems: "center", gap: 14, padding: "10px 14px" }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: COLOR[x.tipo], flexShrink: 0 }}>
                      {LABEL[x.tipo]}
                    </span>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{x.nombre}</span>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {x.cantidad} {x.unidad}
                      </div>
                    </div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "var(--color-positive)", whiteSpace: "nowrap" }}>{fmtPeso(x.subtotal)}</span>
                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                      {confirmDelModulo === `cd-${x.id}` ? (
                        <>
                          <button onClick={() => { setCostosDirectos(prev => prev.filter(a => a.id !== x.id)); setConfirmDelModulo(null); }}
                            style={{ padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070", fontFamily: "'DM Mono',monospace" }}>✓</button>
                          <button onClick={() => setConfirmDelModulo(null)}
                            style={{ padding: "4px 7px", borderRadius: 5, cursor: "pointer", fontSize: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>✕</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelModulo(`cd-${x.id}`)}
                          style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid rgba(200,60,60,0.22)", background: "transparent", color: "#e07070", cursor: "pointer", fontSize: 11 }}>×</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
        {(items.length > 0 || adicionales.length > 0 || costosDirectos.length > 0) && (
          <div style={{ borderTop: "1px solid var(--separator)", marginTop: 4 }}>
            <BarraTotal
              items={items}
              modulos={modulos}
              costos={costos}
              getModUsado={getModUsado}
              totalGeneral={totalGeneral}
              nombrePresupuesto={nombreTrabajo}
              descuento={presupuestoActivoId ? (presupuestos[presupuestoActivoId]?.descuento || 0) : 0}
              gananciaExtra={presupuestoActivoId ? (presupuestos[presupuestoActivoId]?.gananciaExtra || 0) : 0}
              adicionales={adicionales}
              costosDirectos={costosDirectos}
              mostrarExtras={mostrarExtras}
              mostrarCostosDirectos={mostrarCostosDirectos}
            />
          </div>
        )}
      </div>{/* fin card Cuerpo del Presupuesto */}

      {/* Bloqueo visual si no hay nombre Y no hay ítems cargados */}
      {!nombreTrabajo.trim() && items.length === 0 && adicionales.length === 0 && costosDirectos.length === 0 && (
        <div style={{
          padding: "18px 20px", borderRadius: 12,
          background: "var(--bg-surface)", border: "1px dashed var(--border)",
          textAlign: "center", color: "var(--text-muted)"
        }}>
          <div style={{ fontSize: 13, fontStyle: "italic" }}>
            Completá el nombre del trabajo para agregar módulos y gastos
          </div>
        </div>
      )}

      {/* ══ Card unificada de carga — 3 pestañas ══ */}
      {(nombreTrabajo.trim() || items.length > 0 || adicionales.length > 0 || costosDirectos.length > 0) && (<>

      <div ref={formRef} style={{
        background: "var(--bg-surface)",
        border: editandoModuloIdx !== null ? "1.5px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "0 4px 24px rgba(0,0,0,0.28)",
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s"
      }}>

        {/* ── Barra de pestañas ── */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-subtle)",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none"
        }}>
          {[
            { id: "modulos",  label: "📦 Módulos"        },
            { id: "costos",   label: "🔩 Costos directos" },
            { id: "extras",   label: "🧾 Extras"          },
          ].map(tab => (
            <button key={tab.id} onClick={() => setPestañaActiva(tab.id)}
              style={{
                flexShrink: 0,
                padding: "11px 18px",
                border: "none",
                borderBottom: pestañaActiva === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                background: "transparent",
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "'DM Mono',monospace",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: pestañaActiva === tab.id ? "var(--accent)" : "var(--text-muted)",
                transition: "color 0.15s, border-color 0.15s",
                whiteSpace: "nowrap"
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Contenidos de pestañas — grid para mantener altura estable ── */}
        {/* Todos los paneles apilados en la misma celda; el más alto fija la altura del card */}
        <div style={{ display: "grid" }}>

        {/* Módulos */}
        <div style={{ gridArea: "1/1", padding: "16px 20px", visibility: pestañaActiva === "modulos" ? "visible" : "hidden", pointerEvents: pestañaActiva === "modulos" ? "auto" : "none" }}>
            {/* Indicador de modo edición */}
            {editandoModuloIdx !== null && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "7px 12px", background: "var(--accent-soft)", borderRadius: 7, border: "1px solid var(--accent-border)" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", fontFamily: "'DM Mono',monospace" }}>
                  ✎ Editando módulo #{editandoModuloIdx + 1} — {inputCod}
                </span>
                <button onClick={() => { setEditandoModuloIdx(null); setInputCod(""); setInputCant(1); setPreDim(null); setError(""); }}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
                  ✕ Cancelar edición
                </button>
              </div>
            )}
            <div className="rsp-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 100px auto", gap: 12, alignItems: "end" }}>
              <div>
                <TextInput label="Código de módulo" placeholder="MC001" value={inputCod} onChange={handleCodChange} />
                {error && <p style={{ color: "#e07070", fontSize: 12, marginTop: 5 }}>⚠ {error}</p>}
              </div>
              <TextInput label="Cantidad" type="number" value={inputCant} onChange={setInputCant} />
              <div>
                {editandoModuloIdx !== null
                  ? <Btn onClick={() => handleUpdateModule(inputCod, parseInt(inputCant) || 1, preDim)}>Actualizar</Btn>
                  : <Btn onClick={agregar}>Agregar</Btn>
                }
              </div>
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
        </div>

        {/* Costos directos */}
        <div style={{ gridArea: "1/1", visibility: pestañaActiva === "costos" ? "visible" : "hidden", pointerEvents: pestañaActiva === "costos" ? "auto" : "none" }}>
          <SeccionCostosDirectos
            costosDirectos={costosDirectos}
            setCostosDirectos={setCostosDirectos}
            costos={costos}
            sinCard
          />
        </div>

        {/* Extras */}
        <div style={{ gridArea: "1/1", visibility: pestañaActiva === "extras" ? "visible" : "hidden", pointerEvents: pestañaActiva === "extras" ? "auto" : "none" }}>
          <SeccionAdicionales
            adicionales={adicionales}
            setAdicionales={setAdicionales}
            costos={costos}
            onGuardarFrecuente={onGuardarExtraFrecuente}
            sinCard
          />
        </div>

        </div>{/* fin grid */}

      </div>
      </>)}{/* fin secciones de carga */}

      <ToastContainer />

      {/* ── Drawer de edición de piezas/herrajes ─────────────────── */}
      {modalModulo && (() => {
        const { item, modInicial } = modalModulo;
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1100,
            display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
          }}
            onClick={() => setModalModulo(null)}
          >
            <div style={{
              width: "min(380px, 100vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px 0 0 16px",
              padding: 20,
              boxShadow: "-6px 0 32px rgba(0,0,0,0.40)",
              animation: "slideInRight 0.2s ease",
            }}
              onClick={e => e.stopPropagation()}
            >
              <PiezasEditor
                modulo={modInicial}
                costos={costos}
                onGuardar={(moduloModificado) => {
                  const keyId = item.id || item.codigo;
                  setInlineModulos(prev => ({ ...prev, [keyId]: moduloModificado }));
                  setDimOverride(prev => { const n = { ...prev }; delete n[keyId]; return n; });
                  setComposicionOverride(prev => { const n = { ...prev }; delete n[keyId]; return n; });
                  setModalModulo(null);
                }}
                onCancelar={() => setModalModulo(null)}
              />
            </div>
          </div>
        );
      })()}

      {/* ── Drawer de composición visual ──────────────────────────── */}
      {modalComposicion && (() => {
        const { item } = modalComposicion;
        const modBase = modulos[item.codigo];
        const vistaConfigInicial = composicionOverride[item.id]?.vistaConfig ?? modBase?.vistaConfig ?? null;
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1100,
            display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
          }}
            onClick={() => setModalComposicion(null)}
          >
            <div style={{
              width: "min(360px, 100vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px 0 0 16px",
              padding: 20,
              boxShadow: "-6px 0 32px rgba(0,0,0,0.40)",
              animation: "slideInRight 0.2s ease",
            }}
              onClick={e => e.stopPropagation()}
            >
              <ComposicionEditor
                modBase={modBase}
                vistaConfigInicial={vistaConfigInicial}
                onGuardar={(vistaConfig) => {
                  setComposicionOverride(prev => ({ ...prev, [item.id]: { vistaConfig } }));
                  setModalComposicion(null);
                }}
                onCancelar={() => setModalComposicion(null)}
              />
            </div>
          </div>
        );
      })()}

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 10. VISTA PREVIA
// ══════════════════════════════════════════════════════════════════
// ── VistaPrevia ───────────────────────────────────────────────────

export { Presupuesto, GestorPresupuestos, ResumenPresupuesto,
          BarraTotal, SeccionCostosDirectos, SeccionAdicionales,
          imprimirPresupuesto, generarFichaObra };
