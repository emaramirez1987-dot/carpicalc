// ════════════════════════════════════════════════════════════════════════════
// VarsExplorer.jsx
// Navegador jerárquico de variables paramétricas disponibles en el contexto.
//
// Diseño:
//   • Buscador en el tope: filtra en tiempo real sobre todos los scopes/piezas/vars.
//   • Sin búsqueda: árbol colapsable por scope → piezas → variables.
//   • Con búsqueda: lista plana de resultados, cada uno con su breadcrumb.
//   • Click en una variable → onInsert(nombre). El padre maneja el cierre.
//   • Carpetas: las variables custom se pueden organizar en carpetas. Cuando
//     se pasan `carpetas` y `onCarpetasChange`, aparece UI de gestión de
//     carpetas (crear, mover vars a/desde carpetas).
//
// El componente es PURO: recibe scopes ya construidos y delega la inserción.
// El helper `construirScopes` arma la estructura desde un módulo + costos.
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { resolverContextoModulo, normalizarAliasPieza } from '../../services/moduloService.js';
import { evaluarFormula } from '../../utils.js';

const M = "'DM Mono', monospace";

// Paleta consistente con el resto del catálogo
const COL = {
  base:    'var(--text-primary)',
  custom:  '#8ab4e8',
  pieza:   '#7fcb96',
  scope:   'var(--accent)',
  carpeta: '#b8a0d8',
};

// ── Helper: armar scopes desde un módulo ────────────────────────────────────
function _piezasGrupo(piezas, ctx) {
  const groups = new Map();
  for (const p of (Array.isArray(piezas) ? piezas : [])) {
    const alias = normalizarAliasPieza(p?.nombre);
    if (!alias || groups.has(alias)) continue;
    const vars = ['d1','d2','x','y','z']
      .map(s => ({ name: `${alias}_${s}`, value: ctx[`${alias}_${s}`] }))
      .filter(v => v.value != null);
    if (vars.length === 0) continue;
    groups.set(alias, { alias, nombre: p.nombre || alias, vars });
  }
  return [...groups.values()];
}

function _scopeFromCtx({ id, label, icon, modulo, ctx }) {
  return {
    id, label, icon,
    varsBase: [
      { name: 'ancho',       value: ctx.ancho },
      { name: 'alto',        value: ctx.alto },
      { name: 'profundidad', value: ctx.profundidad },
      { name: 'esp',         value: ctx.esp },
    ].filter(v => v.value != null),
    varsCustom: Object.keys(modulo?.variables || {}).map(name => ({
      name, value: ctx[name],
    })),
    paramVars: (modulo?.parametros || []).map(p => ({
      name: p.id, value: ctx[p.id], unidad: p.unidad,
    })).filter(v => v.value != null),
    piezas: _piezasGrupo(modulo?.piezas, ctx),
  };
}

/**
 * Construye el array de scopes para el VarsExplorer a partir de un módulo
 * (con sus subcomponentes) y los valores actuales del configurador.
 */
export function construirScopes(modulo, costos, valoresParametros = {}) {
  if (!modulo) return [];
  const { modVars: ctxPadre, espesor } = resolverContextoModulo(modulo, costos, valoresParametros);
  const scopes = [];
  scopes.push(_scopeFromCtx({
    id: 'padre',
    label: modulo.nombre || modulo.codigo || 'Módulo',
    icon: '📦',
    modulo,
    ctx: ctxPadre,
  }));

  const evalDim = (raw, fallback) => {
    if (raw == null || raw === '') return fallback;
    if (typeof raw === 'number') return raw;
    const v = evaluarFormula(String(raw), ctxPadre);
    return (v != null && Number.isFinite(v)) ? v : fallback;
  };
  const piezaVarsDelPadre = Object.fromEntries(
    Object.entries(ctxPadre).filter(([k]) => /_(d1|d2|x|y|z)$/.test(k)),
  );

  for (const sub of (modulo.subComponentes || [])) {
    const dimsLocales = {
      ancho:       evalDim(sub.dimensiones?.ancho,       modulo.dimensiones?.ancho || 0),
      alto:        evalDim(sub.dimensiones?.alto,        modulo.dimensiones?.alto  || 0),
      profundidad: evalDim(sub.dimensiones?.profundidad, modulo.dimensiones?.profundidad || 0),
    };
    const moduloSub = {
      dimensiones: dimsLocales,
      variables:   { ...piezaVarsDelPadre, ...(modulo.variables || {}), ...(sub.variables || {}) },
      parametros:  [...(modulo.parametros || []), ...(sub.parametros || [])],
      piezas:      sub.piezas || [],
      material:    modulo.material,
    };
    const { modVars: ctxSub } = resolverContextoModulo(moduloSub, costos, valoresParametros);
    if (ctxSub.esp == null && espesor != null) ctxSub.esp = espesor;
    scopes.push(_scopeFromCtx({
      id:    `sub:${sub.id || sub.nombre || scopes.length}`,
      label: sub.nombre || sub.id || `Hijo ${scopes.length}`,
      icon:  '🧩',
      modulo: moduloSub,
      ctx: ctxSub,
    }));
  }
  return scopes;
}

// ── Nodos del árbol ────────────────────────────────────────────────────────

function NodoVar({ v, kind, esperada, readOnly, onInsert, accion }) {
  const isEsp = v.name === esperada;
  const color = kind === 'pieza' ? COL.pieza : kind === 'custom' ? COL.custom : kind === 'param' ? COL.scope : COL.base;
  const inserta = (e) => {
    if (readOnly) return;
    e.preventDefault();
    onInsert(v.name);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button onMouseDown={inserta}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flex: 1, padding: '3px 10px 3px 28px',
          background: isEsp ? 'rgba(212,175,55,0.15)' : 'transparent',
          border: 'none', borderRadius: 4,
          cursor: readOnly ? 'default' : 'pointer',
          fontFamily: M, fontSize: 11, textAlign: 'left',
        }}
        onMouseEnter={e => { if (!readOnly && !isEsp) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { if (!isEsp) e.currentTarget.style.background = 'transparent'; }}>
        <span style={{ color, fontWeight: isEsp ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {v.name}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8, flexShrink: 0 }}>
          = {v.value != null ? Math.round(v.value * 10) / 10 : '?'}
        </span>
      </button>
      {accion && (
        <button onMouseDown={e => { e.preventDefault(); accion.onClick(); }}
          title={accion.titulo}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 10, padding: '0 5px', opacity: 0.45, flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = 0.45; }}>
          {accion.icono}
        </button>
      )}
    </div>
  );
}

function Caret({ open }) {
  return (
    <span style={{
      fontSize: 9, opacity: 0.55, width: 10, display: 'inline-block',
      transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s',
    }}>▶</span>
  );
}

function NodoPieza({ pieza, esperada, readOnly, onInsert, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          width: '100%', padding: '3px 8px 3px 12px',
          background: 'transparent', border: 'none', borderRadius: 4,
          cursor: 'pointer', fontFamily: M, fontSize: 11, textAlign: 'left',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
        <Caret open={open} />
        <span style={{ color: COL.pieza, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🪵 {pieza.nombre}
        </span>
        <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 'auto', flexShrink: 0 }}>
          {pieza.vars.length}
        </span>
      </button>
      {open && (
        <div>
          {pieza.vars.map(v => (
            <NodoVar key={v.name} v={v} kind="pieza"
              esperada={esperada} readOnly={readOnly} onInsert={onInsert} />
          ))}
        </div>
      )}
    </div>
  );
}

function Encabezado({ texto }) {
  return (
    <div style={{
      fontSize: 8, color: 'var(--text-muted)', fontFamily: M,
      padding: '5px 12px 2px', textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{texto}</div>
  );
}

// ── Carpeta de variables custom ──────────────────────────────────────────────
function NodoCarpeta({ carpetaId, carpeta, vars, esperada, readOnly, onInsert, onMoverARoot, onEliminarCarpeta }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginLeft: 4, borderLeft: '1px solid rgba(184,160,216,0.20)', paddingLeft: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, flex: 1,
            padding: '3px 6px 3px 8px',
            background: 'transparent', border: 'none', borderRadius: 4,
            cursor: 'pointer', fontFamily: M, fontSize: 10, textAlign: 'left',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(184,160,216,0.07)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          <Caret open={open} />
          <span style={{ color: COL.carpeta, fontWeight: 600 }}>📁 {carpeta.nombre}</span>
          <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 'auto', flexShrink: 0 }}>{vars.length}</span>
        </button>
        {/* Eliminar carpeta (solo si está vacía) */}
        {onEliminarCarpeta && vars.length === 0 && (
          <button onMouseDown={e => { e.preventDefault(); onEliminarCarpeta(carpetaId); }}
            title="Eliminar carpeta vacía"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e07070', fontSize: 11, padding: '0 4px', opacity: 0.45 }}
            onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = 0.45; }}>×</button>
        )}
      </div>
      {open && (
        <div>
          {vars.length === 0 && (
            <div style={{ padding: '4px 28px', fontSize: 10, color: 'var(--text-muted)', fontFamily: M, fontStyle: 'italic' }}>
              Carpeta vacía
            </div>
          )}
          {vars.map(v => (
            <NodoVar key={v.name} v={v} kind="custom"
              esperada={esperada} readOnly={readOnly} onInsert={onInsert}
              accion={onMoverARoot ? { titulo: 'Sacar de carpeta', icono: '↑', onClick: () => onMoverARoot(carpetaId, v.name) } : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Scope completo ───────────────────────────────────────────────────────────
function NodoScope({
  scope, esperada, readOnly, onInsert, defaultOpen,
  carpetas, onCarpetasChange,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [creandoCarpeta, setCreandoCarpeta] = useState(false);
  const [nombreCarpeta, setNombreCarpeta] = useState('');
  const [moverVar, setMoverVar]  = useState(null); // nombre de la var que se está moviendo

  // Vars en carpetas
  const todasEnCarpeta = useMemo(() => {
    const s = new Set();
    Object.values(carpetas || {}).forEach(c => (c.vars || []).forEach(n => s.add(n)));
    return s;
  }, [carpetas]);

  // Vars custom sin carpeta (raíz)
  const varsRaiz = scope.varsCustom.filter(v => !todasEnCarpeta.has(v.name));

  const crearCarpeta = () => {
    const n = nombreCarpeta.trim();
    if (!n) return;
    const id = `c_${Date.now()}`;
    onCarpetasChange({ ...(carpetas || {}), [id]: { nombre: n, vars: [] } });
    setNombreCarpeta('');
    setCreandoCarpeta(false);
  };

  const moverACarpeta = (carpetaId, varName) => {
    const prev = carpetas || {};
    const nuevas = Object.fromEntries(
      Object.entries(prev).map(([cid, c]) => {
        if (cid === carpetaId) return [cid, { ...c, vars: [...(c.vars || []), varName] }];
        // quitar de otras carpetas por si estaba en otra
        return [cid, { ...c, vars: (c.vars || []).filter(v => v !== varName) }];
      })
    );
    onCarpetasChange(nuevas);
    setMoverVar(null);
  };

  const moverARoot = (carpetaId, varName) => {
    const prev = carpetas || {};
    onCarpetasChange(Object.fromEntries(
      Object.entries(prev).map(([cid, c]) =>
        cid === carpetaId
          ? [cid, { ...c, vars: (c.vars || []).filter(v => v !== varName) }]
          : [cid, c]
      )
    ));
  };

  const eliminarCarpeta = (carpetaId) => {
    const { [carpetaId]: _rm, ...resto } = carpetas || {};
    onCarpetasChange(resto);
  };

  const puedeEditarCarpetas = !!onCarpetasChange;

  return (
    <div style={{ marginBottom: 2 }}>
      <button onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          padding: '6px 10px',
          background: open ? 'rgba(212,175,55,0.06)' : 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 5, cursor: 'pointer',
          fontFamily: M, fontSize: 11, fontWeight: 700,
          color: COL.scope, textAlign: 'left',
        }}>
        <Caret open={open} />
        <span>{scope.icon} {scope.label}</span>
      </button>
      {open && (
        <div style={{ paddingTop: 2 }}>
          {scope.varsBase.length > 0 && (
            <>
              <Encabezado texto="Base" />
              {scope.varsBase.map(v => (
                <NodoVar key={v.name} v={v} kind="base"
                  esperada={esperada} readOnly={readOnly} onInsert={onInsert} />
              ))}
            </>
          )}
          {scope.paramVars.length > 0 && (
            <>
              <Encabezado texto="Parámetros" />
              {scope.paramVars.map(v => (
                <NodoVar key={v.name} v={v} kind="param"
                  esperada={esperada} readOnly={readOnly} onInsert={onInsert} />
              ))}
            </>
          )}
          {(scope.varsCustom.length > 0 || puedeEditarCarpetas) && (
            <>
              {/* Header de vars custom + botón nueva carpeta */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 12px 2px' }}>
                <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: M, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Variables custom
                </span>
                {puedeEditarCarpetas && !creandoCarpeta && (
                  <button onMouseDown={e => { e.preventDefault(); setCreandoCarpeta(true); setNombreCarpeta(''); }}
                    title="Nueva carpeta"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: COL.carpeta, fontSize: 10, padding: '0 2px', fontFamily: M }}>
                    📁+
                  </button>
                )}
              </div>

              {/* Crear carpeta inline */}
              {creandoCarpeta && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px 4px 20px' }}>
                  <input autoFocus value={nombreCarpeta}
                    onChange={e => setNombreCarpeta(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') crearCarpeta(); if (e.key === 'Escape') setCreandoCarpeta(false); }}
                    placeholder="nombre carpeta"
                    style={{ flex: 1, fontFamily: M, fontSize: 11, padding: '3px 6px', background: 'var(--bg-base)', border: '1px solid rgba(184,160,216,0.45)', borderRadius: 4, color: 'var(--text-primary)', outline: 'none', minWidth: 0 }} />
                  <button onMouseDown={e => { e.preventDefault(); crearCarpeta(); }}
                    style={{ padding: '2px 7px', borderRadius: 4, cursor: 'pointer', fontFamily: M, fontSize: 10, fontWeight: 700, background: 'rgba(184,160,216,0.20)', border: '1px solid rgba(184,160,216,0.45)', color: COL.carpeta }}>OK</button>
                  <button onMouseDown={e => { e.preventDefault(); setCreandoCarpeta(false); }}
                    style={{ padding: '2px 5px', borderRadius: 4, cursor: 'pointer', fontFamily: M, fontSize: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>✕</button>
                </div>
              )}

              {/* Carpetas */}
              {Object.entries(carpetas || {}).map(([cid, carpeta]) => {
                const varsEnCarpeta = scope.varsCustom.filter(v => (carpeta.vars || []).includes(v.name));
                return (
                  <NodoCarpeta key={cid}
                    carpetaId={cid} carpeta={carpeta} vars={varsEnCarpeta}
                    esperada={esperada} readOnly={readOnly} onInsert={onInsert}
                    onMoverARoot={puedeEditarCarpetas ? moverARoot : undefined}
                    onEliminarCarpeta={puedeEditarCarpetas ? eliminarCarpeta : undefined}
                  />
                );
              })}

              {/* Vars raíz (no asignadas a carpeta) */}
              {varsRaiz.map(v => {
                const estaMoviendoEsta = moverVar === v.name;
                return (
                  <div key={v.name}>
                    <NodoVar v={v} kind="custom"
                      esperada={esperada} readOnly={readOnly} onInsert={onInsert}
                      accion={puedeEditarCarpetas && Object.keys(carpetas || {}).length > 0
                        ? {
                            titulo: 'Mover a carpeta',
                            icono: '📁→',
                            onClick: () => setMoverVar(estaMoviendoEsta ? null : v.name),
                          }
                        : undefined}
                    />
                    {/* Mini picker de carpeta */}
                    {estaMoviendoEsta && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 28px 6px' }}>
                        {Object.entries(carpetas || {}).map(([cid, carp]) => (
                          <button key={cid} onMouseDown={e => { e.preventDefault(); moverACarpeta(cid, v.name); }}
                            style={{ padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontFamily: M, fontSize: 10, fontWeight: 600, background: 'rgba(184,160,216,0.15)', border: '1px solid rgba(184,160,216,0.35)', color: COL.carpeta }}>
                            📁 {carp.nombre}
                          </button>
                        ))}
                        <button onMouseDown={e => { e.preventDefault(); setMoverVar(null); }}
                          style={{ padding: '2px 6px', borderRadius: 4, cursor: 'pointer', fontFamily: M, fontSize: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
          {scope.piezas.length > 0 && (
            <>
              <Encabezado texto={`Piezas (${scope.piezas.length})`} />
              {scope.piezas.map(p => (
                <NodoPieza key={p.alias} pieza={p}
                  esperada={esperada} readOnly={readOnly} onInsert={onInsert}
                  defaultOpen={false} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────

/**
 * @param {Object}   props
 * @param {Array}    props.scopes          Construir con `construirScopes(...)`
 * @param {string=}  props.defaultScopeId  Scope abierto por default
 * @param {string=}  props.esperada        Nombre de var resaltada como sugerida
 * @param {boolean=} props.readOnly        Si true, click no inserta nada
 * @param {Function} props.onInsert        (name: string) => void
 * @param {Object=}  props.style           Override del wrapper
 * @param {Object=}  props.carpetas        { [scopeId]: { [carpetaId]: { nombre, vars[] } } }
 * @param {Function=} props.onCarpetasChange (scopeId, newCarpetas) => void — habilita edición de carpetas
 */
export default function VarsExplorer({
  scopes, defaultScopeId, esperada, readOnly = false,
  onInsert, style,
  carpetas, onCarpetasChange,
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!readOnly && inputRef.current) inputRef.current.focus();
  }, [readOnly]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return null;
    const out = [];
    for (const sc of scopes) {
      const push = (kind, v, pieza) => {
        if (!v.name.toLowerCase().includes(q)) return;
        out.push({ scope: sc, pieza, kind, v });
      };
      sc.varsBase.forEach(v => push('base', v));
      sc.paramVars.forEach(v => push('param', v));
      sc.varsCustom.forEach(v => push('custom', v));
      sc.piezas.forEach(p => p.vars.forEach(v => push('pieza', v, p)));
    }
    return out;
  }, [q, scopes]);

  const wrapperStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 7, boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
    width: 340, maxHeight: 460,
    display: 'flex', flexDirection: 'column',
    ...style,
  };

  return (
    <div style={wrapperStyle}>
      {/* Buscador */}
      <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
        <input ref={inputRef} type="search" value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && filtered && filtered.length > 0 && !readOnly) {
              e.preventDefault();
              onInsert(filtered[0].v.name);
            }
          }}
          placeholder="🔍 Buscar variable…"
          style={{
            width: '100%', fontFamily: M, fontSize: 12,
            padding: '6px 10px', background: 'var(--bg-base)',
            border: '1px solid var(--border)', borderRadius: 5,
            color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
          }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
        {filtered ? (
          filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontFamily: M }}>
              Sin resultados para "{query}"
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.map((it) => {
                const color = it.kind === 'pieza' ? COL.pieza
                  : it.kind === 'custom' ? COL.custom
                  : it.kind === 'param'  ? COL.scope
                  : COL.base;
                return (
                  <button key={`${it.scope.id}/${it.pieza?.alias || ''}/${it.v.name}`}
                    onMouseDown={e => {
                      if (readOnly) return;
                      e.preventDefault();
                      onInsert(it.v.name);
                    }}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      width: '100%', padding: '6px 10px',
                      background: 'transparent', border: 'none', borderRadius: 4,
                      cursor: readOnly ? 'default' : 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={e => { if (!readOnly) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: M, marginBottom: 2 }}>
                      {it.scope.icon} {it.scope.label}{it.pieza ? ` › 🪵 ${it.pieza.nombre}` : ''}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: M, fontSize: 11, fontWeight: 600, color }}>
                        {it.v.name}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        = {it.v.value != null ? Math.round(it.v.value * 10) / 10 : '?'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {scopes.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontFamily: M }}>
                Sin scopes disponibles
              </div>
            ) : scopes.map(sc => (
              <NodoScope key={sc.id} scope={sc}
                esperada={esperada} readOnly={readOnly} onInsert={onInsert}
                defaultOpen={false}
                carpetas={(carpetas || {})[sc.id] || {}}
                onCarpetasChange={onCarpetasChange
                  ? (newC) => onCarpetasChange(sc.id, newC)
                  : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
