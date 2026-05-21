import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { CAMARAS } from '../visor3d/CamaraPresets.js';
import { Escena3DPrincipal } from './Escena3DPrincipal.jsx';
import { SceneOutliner } from './SceneOutliner.jsx';
import { InspectorPanel } from './InspectorPanel.jsx';
import { ViewportToolbar } from './ViewportToolbar.jsx';
import { useIsDark, tok } from './tokens.js';
import { SectionLabel, PanelDivider } from './ui.jsx';
import { calcularModulo, fmtPeso } from '../../utils.js';
import { resolverModuloEfectivo } from '../../services/moduloService.js';
import { cargarCatalogoAmbiente, crearInstanciaAmbiente } from '../../services/ambienteService.js';
import { GaleriaAmbiente } from './ambiente/GaleriaAmbiente.jsx';
import { InspectorObjeto } from './ambiente/InspectorObjeto.jsx';

// ── Vista3DTab ─────────────────────────────────────────────────────────────────
export function Vista3DTab({
  modulos,
  costos,
  items = [],
  setItems,
  dimOverride = {},
  setDimOverride,
  inlineModulos = {},
  escenografia = [],
  setEscenografia,
  presupuestoActivoId,
  onCaptura,
}) {
  const isDark  = useIsDark();
  const glRef   = useRef(null);
  const T       = tok(); // re-computed every render; isDark drives re-render

  // ── Scene state ───────────────────────────────────────────────────────────
  const [modulosEnEscena, setModulosEnEscena] = useState([]);
  const [selectedCod,     setSelectedCod]     = useState(null);

  // ── Escenografía — objetos 3D de ambiente ─────────────────────────────────
  const catalogoAmbiente = useMemo(() => cargarCatalogoAmbiente(), []);
  const [objetoSelId,    setObjetoSelId]    = useState(null);
  const [galeriaAbierta, setGaleriaAbierta] = useState(false);

  // ── Display toggles ───────────────────────────────────────────────────────
  const [mostrarPiso,     setMostrarPiso]     = useState(true);
  const [mostrarPared,    setMostrarPared]    = useState(true);
  const [mostrarMesada,   setMostrarMesada]   = useState(true);
  const [mostrarParedIzq, setMostrarParedIzq] = useState(false);
  const [mostrarParedDer, setMostrarParedDer] = useState(false);
  const [mostrarGrilla,   setMostrarGrilla]   = useState(true);
  const [mostrarContornos, setMostrarContornos] = useState(false);

  // ── Colors ────────────────────────────────────────────────────────────────
  const [colorPiso,      setColorPiso]      = useState(() => isDark ? '#1e2028' : '#e8e9ed');
  const [colorPared,     setColorPared]     = useState(() => isDark ? '#1c1f28' : '#e0e1e5');
  const [colorMesada,    setColorMesada]    = useState('#c8b89a');
  const [colorGrilla,    setColorGrilla]    = useState(() => isDark ? '#2a2d35' : '#c4c5ce');
  const [colorContornos, setColorContornos] = useState('#000000');

  // ── Light / grid config ───────────────────────────────────────────────────
  const [shadowIntensidad, setShadowIntensidad] = useState(1.0);
  const [shadowAngle,      setShadowAngle]      = useState(45);
  // Grid divisiones — fixed for now; no toolbar UI. Restore as useState when re-adding the selector.
  const divisionesGrilla = 50;
  const [grosorContornos,  setGrosorContornos]  = useState(1);

  // ── Camera ────────────────────────────────────────────────────────────────
  const [camTarget, setCamTarget] = useState(CAMARAS.iso.pos);
  const [camView,   setCamView]   = useState('iso');

  // ── Texture repeat (global for all modules — per-item in future) ──────────
  const [texturaRepeat, setTexturaRepeat] = useState(1);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [capturado,  setCapturado]  = useState(false);
  const [maximizado, setMaximizado] = useState(false);

  // ── Scene version (forces Escena3DPrincipal remount on catalog changes) ───
  const [escenaVersion, setEscenaVersion] = useState(0);
  const modulosHash = useMemo(() => {
    if (!modulos) return '';
    return Object.entries(modulos)
      .map(([k, m]) => {
        const d = m?.dimensiones || {};
        const piezasFp = (m?.piezas || []).map(p =>
          `${p.nombre}|${p.formula1}|${p.formula2}|${p.cantidad}|${p.orientacion3d}|${p.rot3d}|${p.offset3d?.x}|${p.offset3d?.y}|${p.offset3d?.z}|${p.posFormulas?.x}|${p.posFormulas?.y}|${p.posFormulas?.z}`
        ).join(';');
        const varsFp  = JSON.stringify(m?.variables || {});
        const paramsFp = JSON.stringify(m?.parametros || []);
        return `${k}:${d.ancho}:${d.alto}:${d.profundidad}:${m?.material}::${piezasFp}::${varsFp}::${paramsFp}`;
      })
      .join('||');
  }, [modulos]);
  const hashRef = useRef(modulosHash);
  useEffect(() => {
    if (hashRef.current !== modulosHash) {
      hashRef.current = modulosHash;
      setEscenaVersion(v => v + 1);
    }
  }, [modulosHash]);

  const contornosConfig = mostrarContornos
    ? { color: colorContornos, linewidth: grosorContornos }
    : null;

  // ── Sync theme colors ─────────────────────────────────────────────────────
  useEffect(() => {
    setColorPiso(isDark ? '#1e2028' : '#e8e9ed');
    setColorPared(isDark ? '#1c1f28' : '#e0e1e5');
    setColorGrilla(isDark ? '#2a2d35' : '#c4c5ce');
  }, [isDark]);

  // ── Reset scene on budget change ──────────────────────────────────────────
  useEffect(() => {
    setModulosEnEscena([]);
    setSelectedCod(null);
  }, [presupuestoActivoId]);

  // ── Sync budget items → scene instances ──────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const itemsKey = items.map(i => `${i.id || i.codigo}:${i.cantidad || 1}`).join('|');
  useEffect(() => {
    setModulosEnEscena(prev => {
      const fromItems = [];
      items.forEach((it, idx) => {
        const itemKey = it.id || it.codigo;
        const cantidad = it.cantidad || 1;
        for (let k = 0; k < cantidad; k++) {
          const instKey = `${itemKey}#${k}`;
          const existing = prev.find(m => m.instKey === instKey);
          fromItems.push(existing
            ? { ...existing, codigo: it.codigo, itemIdx: idx }
            : { instanceId: `pres-${instKey}`, instKey, codigo: it.codigo, posicion: [0, 0, 0], itemIdx: idx, itemKey }
          );
        }
      });
      const manuales = prev.filter(m => !m.itemKey);
      return [...fromItems, ...manuales];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  // ── Derived: material library ─────────────────────────────────────────────
  const biblioteca = useMemo(() => costos?.bibliotecaMateriales || [], [costos]);

  // ── Derived: items with calculated cost (feeds SceneOutliner + totalPresupuesto) ──
  const itemsConCosto = useMemo(() => {
    return items.map(it => {
      const keyId  = it.id || it.codigo;
      const base   = inlineModulos?.[keyId] ?? modulos?.[it.codigo];
      if (!base) return { ...it, costoUnitario: 0, costoTotal: 0, modulo: null, dims: null };
      const modResuelto = resolverModuloEfectivo({
        codigo: it.codigo,
        modulos,
        inline: inlineModulos?.[keyId],
        dimOverride: dimOverride[keyId],
      });
      const d = modResuelto.dimensiones || {};
      const dims = {
        ancho:       d.ancho       ?? 600,
        alto:        d.alto        ?? 700,
        profundidad: d.profundidad ?? 550,
      };
      const calc = calcularModulo(modResuelto, costos, it.parametrosValores || {});
      const costoUnitario = calc?.total || 0;
      return { ...it, costoUnitario, costoTotal: costoUnitario * (it.cantidad || 1), modulo: base, dims };
    });
  }, [items, modulos, inlineModulos, costos, dimOverride]);

  const totalPresupuesto = useMemo(
    () => itemsConCosto.reduce((sum, it) => sum + (it.costoTotal || 0), 0),
    [itemsConCosto]
  );

  // ── Derived: selected instance + its module + resolved dims ───────────────
  const selectedInst = modulosEnEscena.find(m => m.instanceId === selectedCod) || null;

  const selectedModulo = useMemo(() => {
    if (!selectedInst) return null;
    return inlineModulos?.[selectedInst.itemKey] ?? modulos?.[selectedInst.codigo] ?? null;
  }, [selectedInst, modulos, inlineModulos]);

  // Objeto de escenografía seleccionado + su definición de catálogo.
  const objetoSelInst = useMemo(
    () => escenografia.find(o => o.instanceId === objetoSelId) || null,
    [escenografia, objetoSelId],
  );
  const objetoSelDef = useMemo(
    () => (objetoSelInst ? catalogoAmbiente.find(o => o.id === objetoSelInst.objetoId) || null : null),
    [objetoSelInst, catalogoAmbiente],
  );

  const dimsActuales = useMemo(() => {
    if (!selectedInst?.itemKey || !selectedModulo) return null;
    const mod = resolverModuloEfectivo({
      codigo: selectedInst.codigo,
      modulos,
      inline: inlineModulos?.[selectedInst.itemKey],
      dimOverride: dimOverride[selectedInst.itemKey],
    });
    const d = mod?.dimensiones || {};
    // Defaults de UI (capa visual) — el resolver no los aplica.
    return {
      ancho:       d.ancho       ?? 600,
      alto:        d.alto        ?? 700,
      profundidad: d.profundidad ?? 550,
    };
  }, [selectedInst, selectedModulo, modulos, inlineModulos, dimOverride]);

  const materialIdActual = selectedInst?.itemKey
    ? (dimOverride[selectedInst.itemKey]?.materialId || '')
    : '';

  // ── Scene center (for camera presets) ────────────────────────────────────
  const sceneCenter = useMemo(() => {
    if (modulosEnEscena.length === 0) return [0, 0.5, 0];
    let totalAncho = 0, maxAlto = 0;
    for (const inst of modulosEnEscena) {
      const mod = modulos?.[inst.codigo];
      if (!mod) continue;
      const dims = mod.dimensiones || {};
      totalAncho += (dims.ancho || 600) / 1000;
      maxAlto = Math.max(maxAlto, (dims.alto || 700) / 1000);
    }
    return [totalAncho / 2, maxAlto / 2, 0];
  }, [modulosEnEscena, modulos]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const irACamara = (key) => {
    setCamView(key);
    const offset = CAMARAS[key].pos;
    const [cx, cy, cz] = sceneCenter;
    setCamTarget([cx + offset[0], cy + offset[1], cz + offset[2]]);
  };

  const handleAgregar = ({ itemId, codigo, dimsOverride }) => {
    if (itemId && setItems) {
      setItems(prev => prev.map(it =>
        (it.id || it.codigo) === itemId
          ? { ...it, cantidad: (it.cantidad || 1) + 1 }
          : it
      ));
    } else {
      const instanceId = `${codigo}-${crypto.randomUUID()}`;
      setModulosEnEscena(prev => [...prev, { instanceId, codigo, posicion: [0, 0, 0], dimsOverride }]);
    }
  };

  const handleUpdatePosicion = (instanceId, newPos) =>
    setModulosEnEscena(prev => prev.map(m =>
      m.instanceId === instanceId ? { ...m, posicion: newPos } : m
    ));

  const handleCapturar = () => {
    if (!glRef.current) return;
    onCaptura?.(glRef.current.domElement.toDataURL('image/png'));
    setCapturado(true);
    setTimeout(() => setCapturado(false), 2000);
  };

  const handleRotar90 = (instanceId) => {
    setModulosEnEscena(prev => prev.map(m =>
      m.instanceId === instanceId
        ? { ...m, rotacionY: ((m.rotacionY || 0) + Math.PI / 2) % (Math.PI * 2) }
        : m
    ));
  };

  const handleEliminarModulo = (instanceId) => {
    const inst = modulosEnEscena.find(m => m.instanceId === instanceId);

    // Siempre quitar la instancia de la escena 3D
    setModulosEnEscena(prev => prev.filter(m => m.instanceId !== instanceId));

    // Si está vinculado a un ítem del presupuesto: decrementar cantidad,
    // o eliminar el ítem si cantidad llega a 0
    if (inst?.itemKey && setItems) {
      setItems(prev => prev
        .map(it => {
          const key = it.id || it.codigo;
          if (key !== inst.itemKey) return it;
          const nuevaCantidad = (it.cantidad || 1) - 1;
          return nuevaCantidad > 0 ? { ...it, cantidad: nuevaCantidad } : null;
        })
        .filter(Boolean)
      );
    }

    setSelectedCod(null);
  };

  const handleLimpiarEscena = () => { setModulosEnEscena([]); setSelectedCod(null); };

  // ── Escenografía — handlers ───────────────────────────────────────────────
  const handleAgregarObjeto = (objetoId) => {
    if (!setEscenografia) return;
    // Offset escalonado para que objetos nuevos no se apilen exactamente.
    const x = (escenografia.length % 5) * 0.5 - 1;
    const nueva = crearInstanciaAmbiente(objetoId, { x, z: 1.2 });
    setEscenografia(prev => [...prev, nueva]);
    setObjetoSelId(nueva.instanceId);
    setSelectedCod(null);
  };

  const handleMoverObjeto = (instanceId, { x, z }) => {
    if (!setEscenografia) return;
    setEscenografia(prev => prev.map(o =>
      o.instanceId === instanceId
        ? { ...o, transform: { ...o.transform, position: { ...o.transform.position, x, z } } }
        : o
    ));
  };

  const handleRotarObjeto = (instanceId, deltaY) => {
    if (!setEscenografia) return;
    setEscenografia(prev => prev.map(o =>
      o.instanceId === instanceId
        ? { ...o, transform: { ...o.transform, rotation: { y: (o.transform.rotation?.y || 0) + deltaY } } }
        : o
    ));
  };

  const handleEscalarObjeto = (instanceId, scale) => {
    if (!setEscenografia) return;
    setEscenografia(prev => prev.map(o =>
      o.instanceId === instanceId
        ? { ...o, transform: { ...o.transform, scale } }
        : o
    ));
  };

  const handleEliminarObjeto = (instanceId) => {
    if (!setEscenografia) return;
    setEscenografia(prev => prev.filter(o => o.instanceId !== instanceId));
    setObjetoSelId(prev => (prev === instanceId ? null : prev));
  };

  // Selección exclusiva — un objeto de ambiente O un módulo, nunca ambos.
  const handleSelectObjeto = (instanceId) => {
    setObjetoSelId(instanceId);
    setSelectedCod(null);
  };
  const handleSelectModulo = (cod) => {
    setSelectedCod(cod);
    setObjetoSelId(null);
  };

  const handleSetParametros = (itemIdx, valores) => {
    if (!setItems || itemIdx == null) return;
    setItems(items.map((it, i) => i === itemIdx ? { ...it, parametrosValores: valores } : it));
  };

  // ── Material — fuente única de costo + visual ─────────────────────────────
  const handleAsignarMaterial = (materialId) => {
    if (!selectedInst?.itemKey || !setDimOverride) return;
    const keyId = selectedInst.itemKey;
    setDimOverride(prev => {
      const next = { ...(prev[keyId] || {}) };
      if (materialId) next.materialId = materialId;
      else delete next.materialId;
      const out = { ...prev };
      if (Object.keys(next).length === 0) delete out[keyId];
      else out[keyId] = next;
      return out;
    });
  };

  // ── Dim change — handler ready for when Inspector inputs become editable ──
  // To activate: remove `readOnly` from DimInput in InspectorPanel.jsx
  const handleDimChange = (campo, valor) => {
    if (!selectedInst?.itemKey || !setDimOverride) return;
    const keyId = selectedInst.itemKey;
    setDimOverride(prev => {
      const next = { ...(prev[keyId] || {}), [campo]: Number(valor) };
      return { ...prev, [keyId]: next };
    });
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  const inner = (
    <div style={maximizado ? {
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', padding: '8px',
      background: T.outerBg,
      boxSizing: 'border-box',
      transition: 'background 0.35s ease',
    } : {
      display: 'flex', padding: '10px',
      height: 'calc(100vh - 120px)',
      margin: '0 -20px',
      background: T.outerBg,
      boxSizing: 'border-box',
      transition: 'background 0.35s ease',
    }}>

      {/* ── WORKSPACE SURFACE — unified container behind floating panels ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'row',
        alignItems: 'stretch', gap: 12, padding: '12px',
        background: T.workspaceBg,
        border: `1px solid ${T.workspaceBorder}`,
        borderRadius: 18,
        boxSizing: 'border-box',
        transition: 'background 0.35s ease',
      }}>

      {/* ── LEFT: Scene Outliner ─────────────────────────────────────── */}
      <div style={{
        width: 218, flexShrink: 0,
        background: T.panelBg,
        boxShadow: T.cardShadow,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', zIndex: 2,
        transition: 'background 0.35s ease',
      }}>
        <SceneOutliner
          modulosEnEscena={modulosEnEscena}
          modulos={modulos}
          itemsConCosto={itemsConCosto}
          totalPresupuesto={totalPresupuesto}
          selectedCod={selectedCod}
          onSelect={setSelectedCod}
          onRemove={handleEliminarModulo}
          onAgregar={handleAgregar}
          onLimpiar={handleLimpiarEscena}
        />
      </div>

      {/* ── CENTER: Toolbar + Canvas ─────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>

        <ViewportToolbar
          camView={camView}
          onCameraPreset={irACamara}
          mostrarPiso={mostrarPiso}         setMostrarPiso={setMostrarPiso}
          colorPiso={colorPiso}             setColorPiso={setColorPiso}
          mostrarPared={mostrarPared}       setMostrarPared={setMostrarPared}
          colorPared={colorPared}           setColorPared={setColorPared}
          mostrarParedIzq={mostrarParedIzq} setMostrarParedIzq={setMostrarParedIzq}
          mostrarParedDer={mostrarParedDer} setMostrarParedDer={setMostrarParedDer}
          mostrarMesada={mostrarMesada}     setMostrarMesada={setMostrarMesada}
          colorMesada={colorMesada}         setColorMesada={setColorMesada}
          mostrarGrilla={mostrarGrilla}     setMostrarGrilla={setMostrarGrilla}
          colorGrilla={colorGrilla}         setColorGrilla={setColorGrilla}
          mostrarContornos={mostrarContornos} setMostrarContornos={setMostrarContornos}
          colorContornos={colorContornos}   setColorContornos={setColorContornos}
          grosorContornos={grosorContornos} setGrosorContornos={setGrosorContornos}
          shadowIntensidad={shadowIntensidad} setShadowIntensidad={setShadowIntensidad}
          shadowAngle={shadowAngle}         setShadowAngle={setShadowAngle}
          onActualizar={() => setEscenaVersion(v => v + 1)}
          capturado={capturado}             onCapturar={handleCapturar}
          maximizado={maximizado}           onMaximizar={() => setMaximizado(v => !v)}
          modulosCount={modulosEnEscena.length}
        />

        {/* Canvas area — viewport card */}
        <div style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          borderRadius: 20,
          boxShadow: T.cardShadow,
        }}>

          {/* Empty state */}
          {modulosEnEscena.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 5,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 36, marginBottom: 10, color: T.emptyIcon }}>◈</div>
              <p style={{
                fontSize: 13, fontWeight: 600,
                fontFamily: "'Bricolage Grotesque',sans-serif",
                color: T.emptyTitle, margin: 0,
              }}>
                Escena vacía
              </p>
              <p style={{
                fontSize: 11, fontFamily: "'DM Mono',monospace",
                color: T.emptySub, margin: '5px 0 0',
              }}>
                Usá el panel izquierdo para agregar módulos
              </p>
            </div>
          )}

          {/* Total presupuesto badge */}
          {items.length > 0 && (
            <div style={{
              position: 'absolute', bottom: 12, right: 12, zIndex: 10,
              padding: '8px 14px', borderRadius: 8,
              background: T.canvas.overlayBg,
              border: `1px solid ${T.goldBord}`,
              backdropFilter: 'blur(6px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.20)',
              pointerEvents: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
            }}>
              <span style={{
                fontSize: 8, fontFamily: "'DM Mono',monospace",
                textTransform: 'uppercase', letterSpacing: '0.10em',
                color: T.goldDim,
              }}>
                Total presupuesto
              </span>
              <span style={{
                fontSize: 16, fontWeight: 700,
                fontFamily: "'DM Mono',monospace",
                color: T.gold,
              }}>
                {fmtPeso(totalPresupuesto)}
              </span>
              <span style={{
                fontSize: 8, fontFamily: "'DM Mono',monospace",
                color: T.textMuted, marginTop: 1,
              }}>
                {items.length} módulo{items.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Canvas R3F */}
          <Canvas
            shadows
            camera={{ position: CAMARAS.iso.pos, fov: 45, near: 0.01, far: 100 }}
            gl={{ preserveDrawingBuffer: true }}
            onCreated={({ gl }) => { glRef.current = gl; }}
            onPointerMissed={() => { setSelectedCod(null); setObjetoSelId(null); }}
            style={{ background: T.canvasFallbk, width: '100%', height: '100%' }}
          >
            <Escena3DPrincipal
              key={escenaVersion}
              modulosEnEscena={modulosEnEscena.map(m => (
                m.itemIdx != null
                  ? { ...m, parametrosValores: items[m.itemIdx]?.parametrosValores || {} }
                  : m
              ))}
              modulos={modulos}
              inlineModulos={inlineModulos}
              costos={costos}
              mostrarPiso={mostrarPiso}
              mostrarPared={mostrarPared}
              mostrarMesada={mostrarMesada}
              colorPiso={colorPiso}
              colorPared={colorPared}
              colorMesada={colorMesada}
              camTarget={camTarget}
              onSelectModulo={handleSelectModulo}
              selectedCod={selectedCod}
              onUpdatePosicion={handleUpdatePosicion}
              biblioteca={biblioteca}
              dimOverride={dimOverride}
              isDark={isDark}
              shadowIntensidad={shadowIntensidad}
              shadowAngle={shadowAngle}
              mostrarGrilla={mostrarGrilla}
              colorGrilla={colorGrilla}
              contornos={contornosConfig}
              camLookAt={sceneCenter}
              texturaRepeat={texturaRepeat}
              divisionesGrilla={divisionesGrilla}
              mostrarParedIzq={mostrarParedIzq}
              mostrarParedDer={mostrarParedDer}
              onRotar90={handleRotar90}
              onEliminarModulo={handleEliminarModulo}
              escenografia={escenografia}
              catalogoAmbiente={catalogoAmbiente}
              objetoSelId={objetoSelId}
              onSelectObjeto={handleSelectObjeto}
              onMoverObjeto={handleMoverObjeto}
              onRotarObjeto={handleRotarObjeto}
              onEliminarObjeto={handleEliminarObjeto}
            />
          </Canvas>

          {/* Hint overlay */}
          <div style={{
            position: 'absolute', bottom: 10, left: 14,
            fontSize: 10, fontFamily: "'DM Mono',monospace",
            color: T.hint, pointerEvents: 'none', letterSpacing: '0.03em',
          }}>
            Arrastrá para rotar · Scroll zoom · Click para seleccionar
          </div>
        </div>
      </div>

      {/* ── RIGHT: Ambiente + Inspector ──────────────────────────────── */}
      <div style={{
        width: 218, flexShrink: 0,
        background: T.panelBg,
        boxShadow: T.cardShadow,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', zIndex: 2,
        transition: 'background 0.35s ease',
      }}>

        {/* Sección Ambiente — desplegable, arriba del Inspector */}
        <button
          onClick={() => setGaleriaAbierta(v => !v)}
          style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 14px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            width: '100%',
          }}
        >
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 9, fontFamily: "'DM Mono',monospace",
            letterSpacing: '0.10em', textTransform: 'uppercase',
            color: T.section.text,
          }}>
            <span style={{ fontSize: 12 }}>◫</span> Ambiente
          </span>
          <span style={{ fontSize: 9, color: T.textDim }}>
            {galeriaAbierta ? '▾' : '▸'}
          </span>
        </button>
        {galeriaAbierta && (
          <div style={{
            flexShrink: 0, maxHeight: 300, overflowY: 'auto', overflowX: 'hidden',
            borderTop: `1px solid ${T.divider}`,
          }}>
            <GaleriaAmbiente catalogo={catalogoAmbiente} onAgregar={handleAgregarObjeto} />
          </div>
        )}

        {/* Inspector — objeto de ambiente si hay uno seleccionado, si no el módulo */}
        <div style={{
          flex: 1, minHeight: 0,
          display: 'flex', flexDirection: 'column',
          borderTop: `1px solid ${T.divider}`,
        }}>
          <SectionLabel style={{ padding: '12px 14px 6px' }}>
            {objetoSelInst ? 'Objeto' : 'Inspector'}
          </SectionLabel>
          <PanelDivider />
          {objetoSelInst ? (
            <InspectorObjeto
              objeto={objetoSelDef}
              inst={objetoSelInst}
              onEscalar={handleEscalarObjeto}
              onRotar={handleRotarObjeto}
              onEliminar={handleEliminarObjeto}
            />
          ) : (
            <InspectorPanel
              selectedInst={selectedInst}
              modulo={selectedModulo}
              dims={dimsActuales}
              items={items}
              costos={costos}
              biblioteca={biblioteca}
              materialIdActual={materialIdActual}
              onAsignarMaterial={handleAsignarMaterial}
              onRotar={() => selectedCod && handleRotar90(selectedCod)}
              onEliminar={() => selectedCod && handleEliminarModulo(selectedCod)}
              onSetParametros={handleSetParametros}
              texturaRepeat={texturaRepeat}
              onTexturaRepeat={setTexturaRepeat}
              onDimChange={handleDimChange}
            />
          )}
        </div>
      </div>

      {/* ── End workspace surface ─────────────────────────────────────── */}
      </div>

    </div>
  );

  return maximizado
    ? ReactDOM.createPortal(inner, document.body)
    : inner;
}
