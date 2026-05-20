import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { CAMARAS } from '../visor3d/CamaraPresets.js';
import { Escena3DPrincipal } from './Escena3DPrincipal.jsx';
import { SceneOutliner } from './SceneOutliner.jsx';
import { InspectorPanel } from './InspectorPanel.jsx';
import { ViewportToolbar } from './ViewportToolbar.jsx';
import { useIsDark, tok, SectionLabel, PanelDivider } from './tokens.js';
import { calcularModulo, fmtPeso } from '../../utils.js';

// ── Vista3DTab ─────────────────────────────────────────────────────────────────
export function Vista3DTab({
  modulos,
  costos,
  items = [],
  setItems,
  dimOverride = {},
  setDimOverride,
  inlineModulos = {},
  presupuestoActivoId,
  onCaptura,
}) {
  const isDark  = useIsDark();
  const glRef   = useRef(null);
  const T       = tok(); // re-computed every render; isDark drives re-render

  // ── Scene state ───────────────────────────────────────────────────────────
  const [modulosEnEscena, setModulosEnEscena] = useState([]);
  const [selectedCod,     setSelectedCod]     = useState(null);

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
      const inline = inlineModulos?.[keyId];
      const base   = modulos?.[it.codigo];
      const mod    = inline ?? base;
      if (!mod) return { ...it, costoUnitario: 0, costoTotal: 0, modulo: null, dims: null };
      const ov   = dimOverride[keyId] || {};
      const dims = {
        ancho:       ov.ancho       ?? mod.dimensiones?.ancho       ?? 600,
        alto:        ov.alto        ?? mod.dimensiones?.alto        ?? 700,
        profundidad: ov.profundidad ?? mod.dimensiones?.profundidad ?? 550,
      };
      const modResuelto = {
        ...mod,
        dimensiones: dims,
        material:    ov.material   ?? mod.material,
        materialId:  ov.materialId ?? mod.materialId,
      };
      const calc = calcularModulo(modResuelto, costos, it.parametrosValores || {});
      const costoUnitario = calc?.total || 0;
      return { ...it, costoUnitario, costoTotal: costoUnitario * (it.cantidad || 1), modulo: mod, dims };
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

  const dimsActuales = useMemo(() => {
    if (!selectedInst?.itemKey || !selectedModulo) return null;
    const ov = dimOverride[selectedInst.itemKey] || {};
    return {
      ancho:       ov.ancho       ?? selectedModulo.dimensiones?.ancho       ?? 600,
      alto:        ov.alto        ?? selectedModulo.dimensiones?.alto        ?? 700,
      profundidad: ov.profundidad ?? selectedModulo.dimensiones?.profundidad ?? 550,
    };
  }, [selectedInst, selectedModulo, dimOverride]);

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
    if (inst?.itemKey && setItems) {
      setItems(prev => prev.map(it => {
        const key = it.id || it.codigo;
        if (key !== inst.itemKey) return it;
        const nuevaCantidad = (it.cantidad || 1) - 1;
        return nuevaCantidad > 0 ? { ...it, cantidad: nuevaCantidad } : it;
      }));
    } else {
      setModulosEnEscena(prev => prev.filter(m => m.instanceId !== instanceId));
    }
    setSelectedCod(null);
  };

  const handleLimpiarEscena = () => { setModulosEnEscena([]); setSelectedCod(null); };

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
      display: 'flex', flexDirection: 'row',
      background: T.outerBg,
    } : {
      display: 'flex', flexDirection: 'row',
      height: 'calc(100vh - 120px)',
      margin: '0 -20px',
      background: T.outerBg,
      transition: 'background 0.35s ease',
    }}>

      {/* ── LEFT: Scene Outliner ─────────────────────────────────────── */}
      <div style={{
        width: 220, flexShrink: 0,
        background: T.panelBg,
        boxShadow: T.panelShadow,
        borderRight: `1px solid ${T.border}`,
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

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

        {/* Canvas area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

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
              background: isDark ? 'rgba(8,10,13,0.85)' : 'rgba(255,255,255,0.90)',
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
            onPointerMissed={() => setSelectedCod(null)}
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
              costos={costos}
              mostrarPiso={mostrarPiso}
              mostrarPared={mostrarPared}
              mostrarMesada={mostrarMesada}
              colorPiso={colorPiso}
              colorPared={colorPared}
              colorMesada={colorMesada}
              camTarget={camTarget}
              onSelectModulo={setSelectedCod}
              selectedCod={selectedCod}
              onUpdatePosicion={handleUpdatePosicion}
              biblioteca={biblioteca}
              dimOverride={dimOverride}
              isDark={isDark}
              shadowIntensidad={shadowIntensidad}
              shadowAngle={shadowAngle}
              mostrarGrilla={mostrarGrilla}
              contornos={contornosConfig}
              camLookAt={sceneCenter}
              texturaRepeat={texturaRepeat}
              divisionesGrilla={divisionesGrilla}
              mostrarParedIzq={mostrarParedIzq}
              mostrarParedDer={mostrarParedDer}
              onRotar90={handleRotar90}
              onEliminarModulo={handleEliminarModulo}
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

      {/* ── RIGHT: Inspector ─────────────────────────────────────────── */}
      <div style={{
        width: 210, flexShrink: 0,
        background: T.panelBg,
        borderLeft: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', zIndex: 2,
        transition: 'background 0.35s ease',
      }}>
        <SectionLabel style={{ padding: '12px 14px 6px' }}>Inspector</SectionLabel>
        <PanelDivider />
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
      </div>

    </div>
  );

  return maximizado
    ? ReactDOM.createPortal(inner, document.body)
    : inner;
}
