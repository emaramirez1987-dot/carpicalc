import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { CAMARAS } from '../visor3d/CamaraPresets.js';
import { PanelModulos3D } from './PanelModulos3D.jsx';
import { Escena3DPrincipal } from './Escena3DPrincipal.jsx';
import ConfiguradorParametrico from '../presupuesto/ConfiguradorParametrico.jsx';
import { calcularModulo, fmtPeso } from '../../utils.js';

// ── Lectura de tema robusta — usa localStorage como fallback cuando
// data-theme aún no fue seteado por useTema (efecto corre después del primer render)
function getTema() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr) return attr;
  try { return localStorage.getItem('carpicalc:tema') || 'dark'; }
  catch { return 'dark'; }
}

// ── Theme observer ─────────────────────────────────────────────────────────────
function useIsDark() {
  const [isDark, setIsDark] = useState(() => getTema() !== 'light');
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.getAttribute('data-theme') !== 'light')
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

// ── Theme tokens ───────────────────────────────────────────────────────────────
// Components read isDark from DOM so they re-theme on every parent re-render.
function tok() {
  const d = getTema() !== 'light';
  return d ? {
    outerBg:      '#07090c',
    panelBg:      '#0b0d12',
    panelShadow:  '1px 0 18px rgba(0,0,0,0.45)',
    border:       'rgba(255,255,255,0.06)',
    borderSub:    'rgba(255,255,255,0.04)',
    toolbarBg:    'rgba(9,11,16,0.97)',
    toolbarShadow:'0 1px 0 rgba(255,255,255,0.05)',
    text:         '#7a7e8a',
    textDim:      '#3c404c',
    label:        '#282b35',
    btnBg:        'rgba(255,255,255,0.05)',
    btnBord:      'rgba(255,255,255,0.09)',
    btnText:      '#7a7e8a',
    btnHoverBg:   'rgba(255,255,255,0.10)',
    btnHoverText: '#c8cad4',
    swatchBord:   'rgba(255,255,255,0.16)',
    dpBg:         'rgba(255,255,255,0.04)',
    dpBord:       'rgba(255,255,255,0.09)',
    dpText:       '#7a7e8a',
    dotBg:        'rgba(255,255,255,0.025)',
    dotBord:      'rgba(255,255,255,0.05)',
    matBg:        'rgba(255,255,255,0.04)',
    matBord:      'rgba(255,255,255,0.09)',
    matText:      '#666',
    snapBg:       'rgba(212,175,55,0.07)',
    snapBord:     'rgba(212,175,55,0.22)',
    snapText:     '#9a7828',
    rmBg:         'rgba(200,60,60,0.08)',
    rmBord:       'rgba(200,60,60,0.26)',
    rmText:       '#c06060',
    clrBg:        'rgba(255,255,255,0.03)',
    clrBord:      'rgba(255,255,255,0.07)',
    clrText:      '#3c404c',
    divider:      'rgba(255,255,255,0.06)',
    countText:    '#3c404c',
    emptyIcon:    'rgba(255,255,255,0.10)',
    emptyTitle:   'rgba(255,255,255,0.14)',
    emptySub:     'rgba(255,255,255,0.07)',
    hint:         'rgba(255,255,255,0.18)',
    canvasFallbk: '#080a0d',
  } : {
    outerBg:      '#e4e7ed',
    panelBg:      '#ffffff',
    panelShadow:  '1px 0 14px rgba(0,0,0,0.07)',
    border:       'rgba(0,0,0,0.07)',
    borderSub:    'rgba(0,0,0,0.04)',
    toolbarBg:    'rgba(252,253,255,0.97)',
    toolbarShadow:'0 1px 0 rgba(0,0,0,0.07)',
    text:         '#5a5e6a',
    textDim:      '#9a9eaa',
    label:        '#b8bcc8',
    btnBg:        'rgba(0,0,0,0.04)',
    btnBord:      'rgba(0,0,0,0.09)',
    btnText:      '#666',
    btnHoverBg:   'rgba(0,0,0,0.08)',
    btnHoverText: '#2a2d38',
    swatchBord:   'rgba(0,0,0,0.16)',
    dpBg:         'rgba(0,0,0,0.04)',
    dpBord:       'rgba(0,0,0,0.09)',
    dpText:       '#7a7e8a',
    dotBg:        'rgba(0,0,0,0.025)',
    dotBord:      'rgba(0,0,0,0.07)',
    matBg:        'rgba(0,0,0,0.04)',
    matBord:      'rgba(0,0,0,0.09)',
    matText:      '#777',
    snapBg:       'rgba(212,175,55,0.09)',
    snapBord:     'rgba(212,175,55,0.32)',
    snapText:     '#8a6818',
    rmBg:         'rgba(200,60,60,0.07)',
    rmBord:       'rgba(200,60,60,0.22)',
    rmText:       '#b04040',
    clrBg:        'rgba(0,0,0,0.04)',
    clrBord:      'rgba(0,0,0,0.08)',
    clrText:      '#888',
    divider:      'rgba(0,0,0,0.07)',
    countText:    '#999',
    emptyIcon:    'rgba(0,0,0,0.08)',
    emptyTitle:   'rgba(0,0,0,0.18)',
    emptySub:     'rgba(0,0,0,0.10)',
    hint:         'rgba(0,0,0,0.22)',
    canvasFallbk: '#eff0f4',
  };
}

// ── BTN ────────────────────────────────────────────────────────────────────────
const BTN = ({ active, onClick, children, style }) => {
  const t = tok();
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(212,175,55,0.20)' : t.btnBg,
        border:     active ? '1px solid rgba(212,175,55,0.52)' : `1px solid ${t.btnBord}`,
        color:      active ? '#D4AF37' : t.btnText,
        borderRadius: 6, padding: '4px 11px', cursor: 'pointer',
        fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: '0.04em',
        transition: 'all 0.14s',
        ...style,
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = t.btnHoverBg; e.currentTarget.style.color = t.btnHoverText; }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = t.btnBg; e.currentTarget.style.color = t.btnText; }}}
    >
      {children}
    </button>
  );
};

// ── ColorToggle ────────────────────────────────────────────────────────────────
function ColorToggle({ value, onToggle, color, onColor, label }) {
  const inputRef = useRef();
  const t = tok();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <BTN active={value} onClick={onToggle}>{value ? '✓ ' : ''}{label}</BTN>
      <div
        onClick={() => inputRef.current?.click()}
        title={`Color de ${label}`}
        style={{
          width: 14, height: 14, borderRadius: 3, cursor: 'pointer',
          background: color,
          border: `1px solid ${t.swatchBord}`,
          flexShrink: 0, transition: 'transform 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.25)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      />
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={e => onColor(e.target.value)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      />
    </div>
  );
}

// ── DropItem ───────────────────────────────────────────────────────────────────
function DropItem({ active, onClick, children }) {
  const t = tok();
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(212,175,55,0.18)' : 'transparent',
        border: active ? '1px solid rgba(212,175,55,0.42)' : '1px solid transparent',
        color: active ? '#D4AF37' : t.btnText,
        borderRadius: 5, padding: '5px 10px', cursor: 'pointer',
        fontSize: 11, fontFamily: "'DM Mono',monospace",
        textAlign: 'left', width: '100%', transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = t.btnHoverBg; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ── Dropdown ───────────────────────────────────────────────────────────────────
function Dropdown({ label, active, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  const t = tok();
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <BTN active={active || open} onClick={() => setOpen(v => !v)}>
        {label} <span style={{ fontSize: 7, marginLeft: 2, opacity: 0.65 }}>▾</span>
      </BTN>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 5px)', left: 0,
          background: t.toolbarBg, border: `1px solid ${t.border}`,
          borderRadius: 8, padding: 5, zIndex: 300, minWidth: 140,
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.30)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Colores default de la escena ───────────────────────────────────────────────
const DEFAULTS = { colorMesada: '#c8b89a' };
const initColor = (dark, light) => () => getTema() === 'light' ? light : dark;

// ── Vista3DTab ─────────────────────────────────────────────────────────────────
export function Vista3DTab({
  modulos,
  costos,
  items = [],
  setItems,
  dimOverride = {},
  inlineModulos = {},  // eslint-disable-line no-unused-vars
  presupuestoActivoId,  // eslint-disable-line no-unused-vars
  onCaptura,
  materiales3D = {},
}) {
  const isDark = useIsDark();
  const glRef  = useRef(null);
  const T      = tok(); // computed every render — isDark drives re-render

  const [modulosEnEscena, setModulosEnEscena] = useState([]);
  const [selectedCod,     setSelectedCod]     = useState(null);
  const [mostrarPiso,     setMostrarPiso]      = useState(true);
  const [mostrarPared,    setMostrarPared]     = useState(true);
  const [mostrarMesada,   setMostrarMesada]    = useState(true);
  const [colorPiso,        setColorPiso]        = useState(initColor('#1e2028', '#e8e9ed'));
  const [colorPared,       setColorPared]       = useState(initColor('#1c1f28', '#e0e1e5'));
  const [colorMesada,      setColorMesada]      = useState(DEFAULTS.colorMesada);
  const [camTarget,        setCamTarget]        = useState(CAMARAS.iso.pos);
  const [camView,          setCamView]          = useState('iso');
  const [capturado,        setCapturado]        = useState(false);
  const [shadowIntensidad, setShadowIntensidad] = useState(1.0);
  const [shadowAngle,      setShadowAngle]      = useState(45);
  const [mostrarGrilla,    setMostrarGrilla]    = useState(true);
  const [divisionesGrilla, setDivisionesGrilla] = useState(50);
  const [mostrarParedIzq,  setMostrarParedIzq]  = useState(false);
  const [mostrarParedDer,  setMostrarParedDer]  = useState(false);
  const [maximizado,       setMaximizado]       = useState(false);

  // Sincronizar colores de piso/pared con el tema — igual que VisorModulo3D
  // El usuario puede personalizar con el color picker, pero al cambiar tema se resetean
  useEffect(() => {
    setColorPiso(isDark ? '#1e2028' : '#e8e9ed');
    setColorPared(isDark ? '#1c1f28' : '#e0e1e5');
  }, [isDark]);

  // ── Sincronizar items del presupuesto → modulosEnEscena (Fase 8 N1+) ──
  // Cada item del presupuesto se refleja como un inst en la escena.
  // Los insts manuales (sin itemKey) se mantienen entre renders.
  // Posición/rotación/textura quedan en el state local (no en el item).
  // parametrosValores se LEE del item directamente (no se cachea).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const itemsKey = items.map(i => i.id || i.codigo).join('|');
  useEffect(() => {
    setModulosEnEscena(prev => {
      const fromItems = items.map((it, idx) => {
        const itemKey = it.id || it.codigo;
        const existing = prev.find(m => m.itemKey === itemKey);
        if (existing) return { ...existing, codigo: it.codigo, itemIdx: idx };
        return {
          instanceId: `pres-${itemKey}`,
          codigo: it.codigo,
          posicion: [0, 0, 0],
          itemIdx: idx,
          itemKey,
        };
      });
      const manuales = prev.filter(m => !m.itemKey);
      return [...fromItems, ...manuales];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  // Handler para cambiar parámetros de un item del presupuesto
  const handleSetParametros = (itemIdx, valores) => {
    if (!setItems || itemIdx == null) return;
    setItems(items.map((it, i) => i === itemIdx ? { ...it, parametrosValores: valores } : it));
  };

  // Total del presupuesto (módulos) — se recalcula cuando cambian items,
  // costos o parametrosValores. Para ver el cambio en vivo al editar params.
  const totalPresupuesto = useMemo(() => {
    if (!costos || !modulos || items.length === 0) return 0;
    return items.reduce((acc, it) => {
      const base = modulos[it.codigo];
      if (!base) return acc;
      const dims = (dimOverride && dimOverride[it.id || it.codigo]) || base.dimensiones;
      const mat  = (dimOverride && dimOverride[it.id || it.codigo]?.material) || base.material;
      const calc = calcularModulo({ ...base, dimensiones: dims, material: mat }, costos, it.parametrosValores || {});
      if (!calc) return acc;
      return acc + calc.total * (it.cantidad || 1);
    }, 0);
  }, [items, modulos, costos, dimOverride]);

  const irACamara = (key) => { setCamView(key); setCamTarget([...CAMARAS[key].pos]); };

  const handleAgregar = ({ codigo, dimsOverride }) => {
    const instanceId = `${codigo}-${crypto.randomUUID()}`;
    setModulosEnEscena(prev => [...prev, { instanceId, codigo, posicion: [0, 0, 0], dimsOverride }]);
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

  const handleLimpiarEscena = () => { setModulosEnEscena([]); setSelectedCod(null); };
  const handleEliminarModulo = (instanceId) => {
    setModulosEnEscena(prev => prev.filter(m => m.instanceId !== instanceId));
    setSelectedCod(null);
  };
  const handleAsignarTextura = (texturaCode) => {
    if (!selectedCod) return;
    setModulosEnEscena(prev => prev.map(m =>
      m.instanceId === selectedCod ? { ...m, texturaCode: texturaCode || null } : m
    ));
  };

  const selectedInst    = modulosEnEscena.find(m => m.instanceId === selectedCod);
  const texturaCodActual = selectedInst?.texturaCode || null;
  const materialesKeys  = Object.keys(materiales3D);

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

      {/* ── Panel izquierdo ──────────────────────────────────────── */}
      <div style={{
        width: 236, flexShrink: 0,
        background: T.panelBg,
        boxShadow: T.panelShadow,
        borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 2,
        transition: 'background 0.35s ease, box-shadow 0.35s ease',
      }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <PanelModulos3D
            items={items}
            modulos={modulos}
            inlineModulos={inlineModulos}
            dimOverride={dimOverride}
            costos={costos}
            onAgregar={handleAgregar}
          />
        </div>

        {/* Panel inferior izquierdo */}
        {modulosEnEscena.length > 0 && (
          <div style={{ borderTop: `1px solid ${T.borderSub}`, flexShrink: 0 }}>

            {/* Count bar */}
            <div style={{ padding: '6px 12px 4px', fontSize: 9, fontFamily: "'DM Mono',monospace", color: T.countText, letterSpacing: '0.07em' }}>
              EN ESCENA · {modulosEnEscena.length}
            </div>

              {/* Panel paramétrico — Fase 8 N1+ */}
              {selectedInst?.itemIdx != null && (() => {
                const modSel = modulos?.[selectedInst.codigo];
                if (!modSel) return null;
                const tieneParams = (modSel.parametros?.length || 0) > 0;
                if (!tieneParams) return null;
                return (
                  <div style={{ borderTop: `1px solid ${T.borderSub}`, padding: '8px 10px 12px' }}>
                    <div style={{ padding: '0 0 6px', fontSize: 9, fontFamily: "'DM Mono',monospace", color: T.countText, letterSpacing: '0.07em' }}>
                      PARÁMETROS
                    </div>
                    <ConfiguradorParametrico
                      modulo={modSel}
                      valores={items[selectedInst.itemIdx]?.parametrosValores || {}}
                      onChange={(v) => handleSetParametros(selectedInst.itemIdx, v)}
                      costos={costos} />
                  </div>
                );
              })()}

              {/* Panel de material del módulo seleccionado */}
              {selectedCod && (
                <div style={{ borderTop: `1px solid ${T.borderSub}` }}>
                  <div style={{ padding: '6px 12px 4px', fontSize: 9, fontFamily: "'DM Mono',monospace", color: T.countText, letterSpacing: '0.07em' }}>
                    MATERIAL
                  </div>
                  <div style={{ padding: '0 10px 10px', maxHeight: 200, overflowY: 'auto' }}>
                    {materialesKeys.length === 0 ? (
                      <p style={{
                        fontSize: 10, color: T.text, fontFamily: "'DM Mono',monospace",
                        textAlign: 'center', margin: '14px 0', lineHeight: 1.6,
                      }}>
                        Cargá materiales en la pestaña<br />Render IA
                      </p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                        {/* None option */}
                        <button
                          onClick={() => handleAsignarTextura(null)}
                          style={{
                            borderRadius: 6, cursor: 'pointer', overflow: 'hidden',
                            background: !texturaCodActual ? 'rgba(212,175,55,0.12)' : T.matBg,
                            border: !texturaCodActual ? '1.5px solid rgba(212,175,55,0.50)' : `1px solid ${T.matBord}`,
                            padding: 0, display: 'flex', flexDirection: 'column',
                          }}
                        >
                          <div style={{
                            width: '100%', height: 36,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, color: T.textDim, background: T.dotBg,
                          }}>—</div>
                          <span style={{
                            fontSize: 8, fontFamily: "'DM Mono',monospace",
                            color: !texturaCodActual ? '#D4AF37' : T.text,
                            padding: '3px 5px', letterSpacing: '0.04em',
                            textAlign: 'left',
                          }}>
                            SIN TEXTURA
                          </span>
                        </button>

                        {materialesKeys.map(cod => (
                          <button
                            key={cod}
                            onClick={() => handleAsignarTextura(cod)}
                            title={materiales3D[cod].nombre || cod}
                            style={{
                              borderRadius: 6, cursor: 'pointer', overflow: 'hidden',
                              background: texturaCodActual === cod ? 'rgba(212,175,55,0.12)' : T.matBg,
                              border: texturaCodActual === cod ? '1.5px solid rgba(212,175,55,0.50)' : `1px solid ${T.matBord}`,
                              padding: 0, display: 'flex', flexDirection: 'column',
                            }}
                          >
                            <div style={{
                              width: '100%', height: 36,
                              backgroundImage: `url(${materiales3D[cod].dataUrl})`,
                              backgroundSize: 'cover', backgroundPosition: 'center',
                            }} />
                            <span style={{
                              fontSize: 8, fontFamily: "'DM Mono',monospace",
                              color: texturaCodActual === cod ? '#D4AF37' : T.text,
                              padding: '3px 5px', letterSpacing: '0.04em',
                              textAlign: 'left',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {materiales3D[cod].nombre || cod}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            <div style={{ padding: '8px 12px', borderTop: `1px solid ${T.borderSub}` }}>
              <button
                onClick={handleLimpiarEscena}
                style={{
                  width: '100%', padding: '5px 0', borderRadius: 6, cursor: 'pointer',
                  background: T.clrBg, border: `1px solid ${T.clrBord}`,
                  color: T.clrText, fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                }}
              >
                Limpiar escena
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Área derecha: toolbar + canvas ───────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

        {/* ── Toolbar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '7px 14px',
          background: T.toolbarBg,
          boxShadow: T.toolbarShadow,
          borderBottom: `1px solid ${T.border}`,
          flexWrap: 'wrap',
          flexShrink: 0,
          zIndex: 10,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          transition: 'background 0.35s ease, box-shadow 0.35s ease',
        }}>
          {/* Vistas */}
          <Dropdown label="Vistas" active={false}>
            {Object.entries(CAMARAS).map(([k, v]) => (
              <DropItem key={k} active={camView === k} onClick={() => irACamara(k)}>{v.label}</DropItem>
            ))}
          </Dropdown>

          <div style={{ width: 1, height: 14, background: T.divider, margin: '0 4px', flexShrink: 0 }} />

          {/* Piso */}
          <ColorToggle value={mostrarPiso} onToggle={() => setMostrarPiso(v => !v)} color={colorPiso} onColor={setColorPiso} label="Piso" />

          {/* Grilla */}
          <Dropdown label="Grilla" active={mostrarGrilla}>
            <DropItem active={mostrarGrilla} onClick={() => setMostrarGrilla(v => !v)}>
              {mostrarGrilla ? '✓ ' : ''}Mostrar grilla
            </DropItem>
            {mostrarGrilla && (
              <>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '3px 0' }} />
                {[[20, 'Gruesa  · 20 div'],[50, 'Media   · 50 div'],[100, 'Fina   · 100 div']].map(([div, lbl]) => (
                  <DropItem key={div} active={divisionesGrilla === div} onClick={() => setDivisionesGrilla(div)}>{lbl}</DropItem>
                ))}
              </>
            )}
          </Dropdown>

          {/* Paredes */}
          <Dropdown label="Paredes" active={mostrarPared || mostrarParedIzq || mostrarParedDer}>
            <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <ColorToggle value={mostrarPared}    onToggle={() => setMostrarPared(v => !v)}    color={colorPared} onColor={setColorPared} label="Trasera" />
              <BTN active={mostrarParedIzq} onClick={() => setMostrarParedIzq(v => !v)}>Izquierda</BTN>
              <BTN active={mostrarParedDer} onClick={() => setMostrarParedDer(v => !v)}>Derecha</BTN>
            </div>
          </Dropdown>

          {/* Mesada */}
          <ColorToggle value={mostrarMesada} onToggle={() => setMostrarMesada(v => !v)} color={colorMesada} onColor={setColorMesada} label="Mesada" />

          <div style={{ width: 1, height: 14, background: T.divider, margin: '0 4px', flexShrink: 0 }} />

          {/* Luz */}
          <Dropdown label="Luz" active={false}>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 170 }}>
              <div>
                <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: T.label, letterSpacing: '0.08em', marginBottom: 5 }}>
                  ÁNGULO · {shadowAngle}°
                </div>
                <input type="range" min={0} max={359} step={1} value={shadowAngle}
                  onChange={e => setShadowAngle(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#D4AF37', cursor: 'pointer' }} />
              </div>
              <div>
                <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: T.label, letterSpacing: '0.08em', marginBottom: 5 }}>
                  INTENSIDAD · {Math.round(shadowIntensidad * 100)}%
                </div>
                <input type="range" min={20} max={140} step={5}
                  value={Math.round(shadowIntensidad * 100)}
                  onChange={e => setShadowIntensidad(Number(e.target.value) / 100)}
                  style={{ width: '100%', accentColor: '#D4AF37', cursor: 'pointer' }} />
              </div>
            </div>
          </Dropdown>

          <div style={{ flex: 1 }} />

          {modulosEnEscena.length > 0 && (
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: T.countText, marginRight: 4 }}>
              {modulosEnEscena.length} módulo{modulosEnEscena.length !== 1 ? 's' : ''}
            </span>
          )}

          <button
            onClick={handleCapturar}
            disabled={modulosEnEscena.length === 0}
            style={{
              padding: '5px 14px', borderRadius: 6,
              cursor: modulosEnEscena.length === 0 ? 'default' : 'pointer',
              background: capturado ? 'rgba(126,207,138,0.14)' : 'rgba(212,175,55,0.14)',
              border: capturado ? '1px solid rgba(126,207,138,0.48)' : '1px solid rgba(212,175,55,0.42)',
              color: capturado ? '#7ecf8a' : '#D4AF37',
              fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700,
              letterSpacing: '0.04em',
              opacity: modulosEnEscena.length === 0 ? 0.30 : 1,
              transition: 'all 0.2s',
            }}
          >
            {capturado ? '✓ Capturado' : '◈ Capturar'}
          </button>

          <button
            onClick={() => setMaximizado(v => !v)}
            title={maximizado ? 'Restaurar' : 'Pantalla completa'}
            style={{
              marginLeft: 4,
              padding: '5px 9px', borderRadius: 6, cursor: 'pointer',
              background: maximizado ? 'rgba(212,175,55,0.14)' : T.btnBg,
              border: maximizado ? '1px solid rgba(212,175,55,0.42)' : `1px solid ${T.btnBord}`,
              color: maximizado ? '#D4AF37' : T.btnText,
              fontSize: 13, lineHeight: 1,
              transition: 'all 0.15s',
            }}
          >
            {maximizado ? '⤡' : '⤢'}
          </button>
        </div>

        {/* ── Empty state ── */}
        {modulosEnEscena.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', zIndex: 5,
          }}>
            <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.55, color: T.emptyIcon }}>◈</div>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.emptyTitle, margin: 0, fontFamily: "'Bricolage Grotesque',sans-serif" }}>
              Escena vacía
            </p>
            <p style={{ fontSize: 11, color: T.emptySub, margin: '5px 0 0', fontFamily: "'DM Mono',monospace" }}>
              Usá el panel izquierdo para agregar módulos
            </p>
          </div>
        )}

        {/* ── Canvas R3F ── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Badge de total del presupuesto — overlay sobre el canvas */}
          {items.length > 0 && (
            <div style={{
              position: 'absolute', top: 12, right: 12, zIndex: 10,
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(8, 10, 13, 0.85)',
              border: '1px solid rgba(212,175,55,0.40)',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
              pointerEvents: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
            }}>
              <span style={{
                fontSize: 9, fontFamily: "'DM Mono',monospace",
                textTransform: 'uppercase', letterSpacing: '0.10em',
                color: '#9a8540',
              }}>
                Total presupuesto
              </span>
              <span style={{
                fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono',monospace",
                color: '#d4af37',
              }}>
                {fmtPeso(totalPresupuesto)}
              </span>
              <span style={{
                fontSize: 9, fontFamily: "'DM Mono',monospace",
                color: '#5a5d68', marginTop: 1,
              }}>
                {items.length} módulo{items.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          <Canvas
            shadows
            camera={{ position: CAMARAS.iso.pos, fov: 45, near: 0.01, far: 100 }}
            gl={{ preserveDrawingBuffer: true }}
            onCreated={({ gl }) => { glRef.current = gl; }}
            onPointerMissed={() => setSelectedCod(null)}
            style={{ background: T.canvasFallbk, width: '100%', height: '100%' }}
          >
            <Escena3DPrincipal
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
              materiales3D={materiales3D}
              isDark={isDark}
              shadowIntensidad={shadowIntensidad}
              shadowAngle={shadowAngle}
              mostrarGrilla={mostrarGrilla}
              divisionesGrilla={divisionesGrilla}
              mostrarParedIzq={mostrarParedIzq}
              mostrarParedDer={mostrarParedDer}
              onRotar90={handleRotar90}
              onEliminarModulo={handleEliminarModulo}
            />
          </Canvas>

          {/* Hint inferior */}
          <div style={{
            position: 'absolute', bottom: 10, left: 14,
            fontSize: 10, fontFamily: "'DM Mono',monospace",
            color: T.hint,
            pointerEvents: 'none',
            letterSpacing: '0.03em',
          }}>
            Arrastrá para rotar · Scroll zoom · Click para seleccionar
          </div>
        </div>
      </div>
    </div>
  );

  return maximizado
    ? ReactDOM.createPortal(inner, document.body)
    : inner;
}
