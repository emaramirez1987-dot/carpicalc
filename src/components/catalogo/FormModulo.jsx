import React, { useState, useEffect } from 'react';
import EditorParametrico from './EditorParametrico.jsx';
import { Btn, TextInput, Select } from '../ui/index.jsx';
import { fmtPeso, fmtNum, resolverDim, calcularModulo, evaluarFormula, resolverVariables } from '../../utils.js';
import { CATEGORIAS_DEFAULT } from '../../constants.js';
import { cargarBorradorModulo, guardarBorradorModulo, limpiarBorradorModulo } from '../../storage.js';
import FilaPieza from './FilaPieza.jsx';
import FormPieza from './FormPieza.jsx';
import AcordeonPreviewSVG from './AcordeonPreviewSVG.jsx';

// ════════════════════════════════════════════════════════════════════════════
// FormModulo — formulario completo de edición de un módulo del catálogo
// ════════════════════════════════════════════════════════════════════════════

// Estado inicial vacío de una pieza nueva en el formulario
const PIEZA_VACIA = {
  nombre: "", cantidad: 1,
  formula1: "alto", formula2: "profundidad",
  usaDim: "alto", usaDim2: "profundidad",
  offsetEsp: 0, offsetMm: 0, divisor: 1,
  offsetEsp2: 0, offsetMm2: 0, divisor2: 1,
  tc: { id: 1, lados1: 1, lados2: 0 },
  especial: false, dimLibre1: "", dimLibre2: ""
};
function FormModulo({
  costos,
  onGuardar,
  onCancelar,
  moduloBase,
  codigoEditar,
  esDeepLinkPresupuesto = false, // true = viene de Nivel 3, mostrar modal antes de guardar
  presupuestosRef = {},          // para verificar presupuestos afectados al actualizar desde catálogo
  onRecalcularAfectados = null,  // (cod) → recalcula precios en presupuestos que usan ese módulo
}) {
  const esEdicion = !!codigoEditar;
  // Borrador persistido: solo para módulos nuevos (no edición de existentes)
  const _draft = !moduloBase ? cargarBorradorModulo() : null;
  const [secs, setSecs] = useState({ ident: true, tc: false, dims: false, clasif: false, vars: false, her: false, mo: false, res: false });
  const toggleSec = k => setSecs(p => ({ ...p, [k]: !p[k] }));
  // Modal de decisión: aparece al guardar desde Nivel 3
  // null = cerrado, "pidiendo" = mostrando opciones, "nombre" = ingresando nombre para catálogo
  const [modalDecision, setModalDecision] = useState(null);
  const [nombreCatalogo, setNombreCatalogo] = useState("");
  // Cancelar con confirmación si hay cambios sin guardar
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  // Acordeón de decisión al guardar desde catálogo (no desde presupuesto)
  const [decisionCatalogo, setDecisionCatalogo] = useState(null);
  // "actualizando" | "nuevo" | null
  const [nombreNuevoCatalogo, setNombreNuevoCatalogo] = useState("");
  const [listaPiezasAbierta, setListaPiezasAbierta] = useState(false);
  const [paramAbierto, setParamAbierto] = useState(false);
  const [datos, setDatos] = useState(() =>
    moduloBase
      ? {
          codigo: codigoEditar || "",
          nombre: moduloBase.nombre,
          descripcion: moduloBase.descripcion || "",
          dimensiones: { ...moduloBase.dimensiones },
          material: moduloBase.material,
          categoria: moduloBase.categoria || "otros",
          tipoVisual: moduloBase.tipoVisual || null,
          variables: moduloBase.variables ? { ...moduloBase.variables } : {},
          parametros:     Array.isArray(moduloBase.parametros)     ? moduloBase.parametros     : [],
          zonas:          Array.isArray(moduloBase.zonas)          ? moduloBase.zonas          : [],
          constraints:    Array.isArray(moduloBase.constraints)    ? moduloBase.constraints    : [],
          subComponentes: Array.isArray(moduloBase.subComponentes) ? moduloBase.subComponentes : [],
        }
      : (_draft?.datos || {
          codigo: "",
          nombre: "",
          descripcion: "",
          dimensiones: { ancho: 600, profundidad: 550, alto: 700 },
          material: "melamina",
          categoria: "otros",
          tipoVisual: null,
          variables: {},
          parametros:     [],
          zonas:          [],
          constraints:    [],
          subComponentes: [],
        })
  );
  const [piezas, setPiezas] = useState(() =>
    moduloBase
      ? moduloBase.piezas.map((p) => ({
          ...p,
          divisor: p.divisor || 1,
          divisor2: p.divisor2 || 1,
          tc: p.tc ? { ...p.tc } : { id: 0, lados1: 0, lados2: 0 }
        }))
      : (_draft?.piezas || [])
  );
  const [herrajes, setHerrajes] = useState(() =>
    moduloBase ? moduloBase.herrajes.map((h) => ({ ...h })) : (_draft?.herrajes || [])
  );
  const [moDeObra, setMoDeObra] = useState(() =>
    moduloBase ? { ...moduloBase.moDeObra } : (_draft?.moDeObra || { tipo: "por_modulo", horas: 0 })
  );

  // Persistir borrador automáticamente en cada cambio (solo módulos nuevos)
  useEffect(() => {
    if (moduloBase) return;
    guardarBorradorModulo({ datos, piezas, herrajes, moDeObra });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, piezas, herrajes, moDeObra]);
  const [error, setError] = useState("");
  const [fp, setFp] = useState({ ...PIEZA_VACIA });
  const [fpError, setFpError] = useState("");
  // Edición de pieza existente: idx !== null = modo edición
  const [editandoPiezaIdx, setEditandoPiezaIdx] = useState(null);
  // Nombres sugeridos para autocompletado rápido
  const NOMBRES_SUGERIDOS = ["Lateral", "Base", "Techo", "Fondo", "Puerta", "Entrepaño", "Zarpa", "Zócalo", "Cajón"];
  const matDef =
    costos.materiales.find((m) => m.tipo === datos.material) ||
    costos.materiales[0];
  const espesor = matDef?.espesor || 18;
  const normalizarPieza = (p) => ({
    ...p,
    cantidad: Math.max(1, parseInt(p.cantidad) || 1),
    offsetEsp: parseInt(p.offsetEsp) || 0,
    offsetMm: parseInt(p.offsetMm) || 0,
    divisor: Math.max(1, parseInt(p.divisor) || 1),
    offsetEsp2: parseInt(p.offsetEsp2) || 0,
    offsetMm2: parseInt(p.offsetMm2) || 0,
    divisor2: Math.max(1, parseInt(p.divisor2) || 1),
    tc: {
      id: parseInt(p.tc?.id) || 0,
      lados1: parseInt(p.tc?.lados1) || 0,
      lados2: parseInt(p.tc?.lados2) || 0
    }
  });

  const agregarPieza = () => {
    if (!fp.nombre.trim()) { setFpError("Ingresá el nombre."); return; }
    const nueva = normalizarPieza(fp);
    if (editandoPiezaIdx !== null) {
      // Modo edición — reemplazar la pieza en su posición
      setPiezas(prev => prev.map((p, i) => i === editandoPiezaIdx ? nueva : p));
      setEditandoPiezaIdx(null);
    } else {
      setPiezas(prev => [...prev, nueva]);
    }
    setFp({ ...PIEZA_VACIA });
    setFpError("");
  };

  const editarPieza = (idx) => {
    setFp({ ...piezas[idx] });
    setEditandoPiezaIdx(idx);
    // Scroll al formulario
    setTimeout(() => document.getElementById("form-pieza")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const cancelarEdicion = () => {
    setFp({ ...PIEZA_VACIA });
    setEditandoPiezaIdx(null);
    setFpError("");
  };

  const duplicarPieza = (idx) => {
    const copia = { ...piezas[idx], nombre: `${piezas[idx].nombre} (copia)` };
    setPiezas(prev => [...prev.slice(0, idx + 1), copia, ...prev.slice(idx + 1)]);
  };

  const moverPieza = (idx, dir) => {
    const dest = idx + dir;
    if (dest < 0 || dest >= piezas.length) return;
    setPiezas(prev => {
      const n = [...prev];
      [n[idx], n[dest]] = [n[dest], n[idx]];
      return n;
    });
  };
  // Detecta si el formulario fue modificado respecto al módulo original
  const hayCambios = () => {
    if (!moduloBase) return piezas.length > 0 || datos.nombre.trim() !== "";
    if (datos.nombre !== moduloBase.nombre ||
        datos.descripcion !== (moduloBase.descripcion || "") ||
        datos.material !== moduloBase.material ||
        datos.categoria !== (moduloBase.categoria || "otros") ||
        datos.tipoVisual !== (moduloBase.tipoVisual || null)) return true;
    if (JSON.stringify(datos.dimensiones) !== JSON.stringify(moduloBase.dimensiones)) return true;
    if (JSON.stringify(datos.variables || {}) !== JSON.stringify(moduloBase.variables || {})) return true;
    const piezasBase = (moduloBase.piezas || []).map(p => ({
      ...p, divisor: p.divisor || 1, divisor2: p.divisor2 || 1,
      tc: p.tc ? { ...p.tc } : { id: 0, lados1: 0, lados2: 0 }
    }));
    if (JSON.stringify(piezas) !== JSON.stringify(piezasBase)) return true;
    if (JSON.stringify(herrajes) !== JSON.stringify((moduloBase.herrajes || []).map(h => ({ ...h })))) return true;
    return false;
  };

  // Cancelar: pregunta si hubo cambios, cierra directo si no
  const handleCancelar = () => {
    if (hayCambios()) { setConfirmandoCancelar(true); }
    else { limpiarBorradorModulo(); onCancelar(); }
  };

  const datosGuardar = () => ({
    nombre:      datos.nombre,
    descripcion: datos.descripcion,
    dimensiones: datos.dimensiones,
    material:    datos.material,
    categoria:   datos.categoria || "otros",
    tipoVisual:  datos.tipoVisual || null,
    variables:   datos.variables || {},
    parametros:     datos.parametros     || [],
    zonas:          datos.zonas          || [],
    constraints:    datos.constraints    || [],
    subComponentes: datos.subComponentes || [],
    piezas,
    herrajes,
    moDeObra
  });

  // Wrapper: limpia el borrador antes de delegar al padre
  const guardarYLimpiar = (cod, d) => {
    limpiarBorradorModulo();
    onGuardar(cod, d);
  };

  const guardar = () => {
    if (!datos.codigo.trim() || !datos.nombre.trim()) {
      setError("Código y nombre son obligatorios.");
      setSecs(p => ({ ...p, ident: true }));
      return;
    }
    setError("");
    // Desde presupuesto (Nivel 3): modal de decisión existente sin cambios
    if (esDeepLinkPresupuesto) {
      setNombreCatalogo(datos.nombre || "");
      setModalDecision("pidiendo");
      return;
    }
    // Desde catálogo directo: acordeón de decisión nuevo
    if (esEdicion) {
      setNombreNuevoCatalogo(`${datos.nombre} (copia)`);
      setDecisionCatalogo("pidiendo");
      return;
    }
    // Nuevo módulo — guardar directo
    guardarYLimpiar(datos.codigo.trim().toUpperCase(), datosGuardar());
  };
  const preview =
    piezas.length > 0
      ? calcularModulo({ ...datos, piezas, herrajes, moDeObra }, costos)
      : null;
  // Helper para header de acordeón
  const secHdr = (icon, title, previewNode, isOpen, onToggle) => (
    <div onClick={onToggle} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.10)", borderLeft: "3px solid rgba(200,160,42,0.5)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
      <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em", color: "#c8a02a" }}>{icon} {title}</span>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {!isOpen && previewNode}
        <span style={{ fontSize: 10, color: "var(--text-muted)", display: "inline-block", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Error banner */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, fontSize: 13, background: "rgba(200,60,60,0.10)", border: "1px solid rgba(200,60,60,0.30)", color: "#e08080" }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Vista unificada: FormPieza + Acordeones ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Columna izquierda: FormPieza */}
        <FormPieza
          fp={fp} setFp={setFp}
          onCancelar={cancelarEdicion}
          editando={editandoPiezaIdx !== null}
          dims={datos.dimensiones}
          espesor={espesor}
          nombresSugeridos={NOMBRES_SUGERIDOS}
          variables={datos.variables || {}}
          onVarsUpdate={v => setDatos(d => ({ ...d, variables: v }))}
          piezas={datos.piezas || []}
          zonas={datos.zonas || []}
          parametros={datos.parametros || []}
        />

        {/* Columna derecha: Acordeones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Identificación */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {secHdr('📌', 'Identificación',
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>{datos.codigo || '—'} · {datos.nombre || 'sin nombre'}</span>,
              secs.ident, () => toggleSec('ident'))}
            {secs.ident && (
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-surface)' }}>
                <div className="rsp-grid-1" style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12 }}>
                  <TextInput
                    label="Código"
                    placeholder="MC003"
                    value={datos.codigo}
                    onChange={(v) => setDatos((d) => ({ ...d, codigo: v.toUpperCase() }))}
                    disabled={esEdicion}
                    style={esEdicion ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                  />
                  <TextInput
                    label="Nombre"
                    placeholder="Módulo bajo mesada 80cm"
                    value={datos.nombre}
                    onChange={(v) => setDatos((d) => ({ ...d, nombre: v }))}
                  />
                </div>
                {esEdicion && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: -6 }}>
                    El código no se puede modificar en modo edición
                  </div>
                )}
                <TextInput
                  label="Descripción (opcional)"
                  value={datos.descripcion}
                  onChange={(v) => setDatos((d) => ({ ...d, descripcion: v }))}
                />
              </div>
            )}
          </div>

          {/* Tapacanto */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {secHdr('🎗', 'Tapacanto',
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>
                {fp.tc.id > 0 ? (costos.tapacanto.find(t => t.id === fp.tc.id)?.nombre || 'cinta') : 'sin cinta'}
              </span>,
              secs.tc, () => toggleSec('tc'))}
            {secs.tc && (
              <div style={{ padding: '14px 16px', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Select label="Tipo de cinta" value={fp.tc.id} small
                  onChange={(v) => setFp((p) => ({ ...p, tc: { ...p.tc, id: parseInt(v) } }))}
                  options={[{ value: 0, label: 'Sin tapacanto' }, ...(costos.tapacanto || []).map((t) => ({ value: t.id, label: t.nombre }))]} />
                <div className="rsp-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <TextInput label={`Lados D1 (${fp.especial ? 'libre' : 'altura'})`} type="number" value={fp.tc.lados1} small
                    onChange={(v) => setFp((p) => ({ ...p, tc: { ...p.tc, lados1: parseInt(v) || 0 } }))} />
                  <TextInput label={`Lados D2 (${fp.especial ? 'libre' : 'ancho'})`} type="number" value={fp.tc.lados2} small
                    onChange={(v) => setFp((p) => ({ ...p, tc: { ...p.tc, lados2: parseInt(v) || 0 } }))} />
                </div>
                {fp.tc.id > 0 && (() => {
                  const paramDefs = Object.fromEntries((datos.parametros || []).filter(pr => pr.tipo !== 'formula').map(pr => [pr.id, pr.def]));
                  const allVars = resolverVariables({ ...(datos.variables || {}), ...paramDefs }, { ancho: datos.dimensiones.ancho || 0, alto: datos.dimensiones.alto || 0, profundidad: datos.dimensiones.profundidad || 0, esp: espesor });
                  const d1tc = fp.especial ? (parseInt(fp.dimLibre1) || 0) : fp.formula1 ? (evaluarFormula(fp.formula1, allVars) ?? 0) : resolverDim(datos.dimensiones[fp.usaDim], parseInt(fp.offsetEsp) || 0, parseInt(fp.offsetMm) || 0, parseInt(fp.divisor) || 1, espesor);
                  const d2tc = fp.especial ? (parseInt(fp.dimLibre2) || 0) : fp.formula2 ? (evaluarFormula(fp.formula2, allVars) ?? 0) : resolverDim(datos.dimensiones[fp.usaDim2], parseInt(fp.offsetEsp2) || 0, parseInt(fp.offsetMm2) || 0, parseInt(fp.divisor2) || 1, espesor);
                  return (
                    <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: 'var(--accent)', background: 'rgba(212,175,55,0.07)', borderRadius: 6, padding: '5px 10px' }}>
                      → <strong>{fmtNum((parseInt(fp.cantidad || 1) * ((fp.tc.lados1 || 0) * d1tc + (fp.tc.lados2 || 0) * d2tc)) / 1000, 2)} m lineales</strong>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Dimensiones y Material */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {secHdr('📐', 'Dimensiones y Material',
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>{datos.dimensiones.ancho}×{datos.dimensiones.profundidad}×{datos.dimensiones.alto}mm</span>,
              secs.dims, () => toggleSec('dims'))}
            {secs.dims && (
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-surface)' }}>
                <div className="rsp-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                  <TextInput label="Ancho (mm)" type="number" suffix="mm" value={datos.dimensiones.ancho}
                    onChange={(v) => setDatos((d) => ({ ...d, dimensiones: { ...d.dimensiones, ancho: parseInt(v) || 0 } }))} />
                  <TextInput label="Profund. (mm)" type="number" suffix="mm" value={datos.dimensiones.profundidad}
                    onChange={(v) => setDatos((d) => ({ ...d, dimensiones: { ...d.dimensiones, profundidad: parseInt(v) || 0 } }))} />
                  <TextInput label="Alto (mm)" type="number" suffix="mm" value={datos.dimensiones.alto}
                    onChange={(v) => setDatos((d) => ({ ...d, dimensiones: { ...d.dimensiones, alto: parseInt(v) || 0 } }))} />
                  <Select label="Material" value={datos.material}
                    onChange={(v) => setDatos((d) => ({ ...d, material: v }))}
                    options={costos.materiales.map((m) => ({ value: m.tipo, label: `${m.nombre} (${m.espesor}mm)` }))} />
                </div>
                {matDef && (
                  <div style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, background: 'rgba(212,175,55,0.08)', border: '1px solid var(--accent-border)', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ opacity: 0.5 }}>▶</span>
                    <span>Material activo: <strong>{matDef.nombre}</strong> — espesor <strong>{matDef.espesor}mm</strong></span>
                    {!esEdicion && moduloBase && (
                      <span style={{ marginLeft: 8, opacity: 0.6, fontSize: 11 }}>📋 Copia — editá el código antes de guardar.</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clasificación */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {secHdr('🏷', 'Clasificación',
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>{datos.categoria || 'sin cat.'}</span>,
              secs.clasif, () => toggleSec('clasif'))}
            {secs.clasif && (
              <div style={{ background: 'var(--bg-surface)' }}>
                <div className="rsp-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div style={{ padding: '14px 16px', borderRight: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>Categoría</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {CATEGORIAS_DEFAULT.map(cat => {
                        const activa = datos.categoria === cat.id;
                        return (
                          <button key={cat.id} onClick={() => setDatos(d => ({ ...d, categoria: cat.id }))}
                            style={{ padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5, background: activa ? `${cat.color}22` : 'var(--bg-subtle)', border: `1px solid ${activa ? cat.color : 'var(--border)'}`, color: activa ? cat.color : 'var(--text-muted)', boxShadow: activa ? `0 0 14px ${cat.color}40` : 'none' }}>
                            {cat.icon} {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>Tipo visual — Plano 2D</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { id: null,    label: 'Sin definir', icon: '—',  color: '#606880' },
                        { id: 'bajo',  label: 'Bajo',        icon: '⬇',  color: '#7090c8' },
                        { id: 'aereo', label: 'Aéreo',       icon: '⬆',  color: '#a070c8' },
                        { id: 'torre', label: 'Torre',       icon: '⬛', color: 'var(--color-positive)' },
                      ].map((tipo) => {
                        const activo = datos.tipoVisual === tipo.id;
                        return (
                          <button key={String(tipo.id)} onClick={() => setDatos((d) => ({ ...d, tipoVisual: tipo.id }))}
                            style={{ padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5, background: activo ? `${tipo.color}22` : 'var(--bg-subtle)', border: `1px solid ${activo ? tipo.color : 'var(--border)'}`, color: activo ? tipo.color : 'var(--text-muted)', boxShadow: activo ? `0 0 14px ${tipo.color}40` : 'none' }}>
                            {tipo.icon} {tipo.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '0 16px 14px' }}>
                  <AcordeonPreviewSVG datos={datos} herrajes={herrajes} />
                </div>
              </div>
            )}
          </div>

          {/* Herrajes */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {secHdr('🔩', 'Herrajes',
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>{herrajes.reduce((a, h) => a + (typeof h.cantidad === 'number' ? h.cantidad : 0), 0)} uds{herrajes.some(h => typeof h.cantidad === 'string') ? ' + fx' : ''}</span>,
              secs.her, () => toggleSec('her'))}
            {secs.her && (
              <div style={{ padding: '12px 16px', background: 'var(--bg-surface)' }}>
                {costos.herrajes.map((h) => {
                  const item = herrajes.find((x) => x.id === h.id);
                  const cant = item?.cantidad || 0;
                  const esFormula = typeof item?.cantidad === 'string';
                  const tieneCondition = !!item?.condition;
                  const activo = !!item && (cant > 0 || esFormula || tieneCondition);
                  const setItem = (patch) => setHerrajes((prev) => {
                    const idx = prev.findIndex((x) => x.id === h.id);
                    if (idx < 0) return [...prev, { id: h.id, cantidad: 1, ...patch }];
                    const n = [...prev];
                    n[idx] = { ...n[idx], ...patch };
                    return n;
                  });
                  const quitarItem = () => setHerrajes((prev) => prev.filter((x) => x.id !== h.id));
                  return (
                    <div key={h.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{h.nombre}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtPeso(h.precio)}/{h.unidad}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={() => {
                            if (esFormula || tieneCondition) {
                              // Pasar a numérico (1) y limpiar fórmula/condition
                              setItem({ cantidad: 1, condition: undefined });
                            } else {
                              // Activar modo fórmula con la cantidad actual o "1"
                              setItem({ cantidad: String(cant || 1) });
                            }
                          }}
                            title={esFormula ? 'Volver a número' : 'Cantidad como fórmula / condición'}
                            style={{ width: 28, height: 28, background: (esFormula || tieneCondition) ? 'var(--accent)' : 'var(--bg-subtle)', border: '1px solid var(--accent-border)', color: (esFormula || tieneCondition) ? '#0a0a0a' : 'var(--text-muted)', borderRadius: 5, cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>
                            fx
                          </button>
                          {!esFormula && (
                            <>
                              <button onClick={() => { if (cant <= 1) quitarItem(); else setItem({ cantidad: cant - 1 }); }}
                                style={{ width: 28, height: 28, background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent)', borderRadius: 5, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                              <button onClick={() => setItem({ cantidad: (cant || 0) + 1 })}
                                style={{ width: 28, height: 28, background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent)', borderRadius: 5, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                            </>
                          )}
                          <span style={{ fontFamily: "'DM Mono',monospace", minWidth: 24, textAlign: 'center', color: activo ? 'var(--accent)' : 'var(--text-muted)' }}>{esFormula ? 'fx' : cant}</span>
                        </div>
                      </div>
                      {(esFormula || tieneCondition) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                          <div>
                            <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Cantidad (fórmula)</div>
                            <input value={typeof item.cantidad === 'string' ? item.cantidad : String(item.cantidad || '')}
                              placeholder="ej: cajones · puertas * 2"
                              onChange={e => setItem({ cantidad: e.target.value })}
                              style={{ width: '100%', fontFamily: "'DM Mono',monospace", fontSize: 11, padding: '5px 7px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Condición (opcional)</div>
                            <input value={item.condition || ''}
                              placeholder="ej: cajones > 0"
                              onChange={e => setItem({ condition: e.target.value || undefined })}
                              style={{ width: '100%', fontFamily: "'DM Mono',monospace", fontSize: 11, padding: '5px 7px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mano de Obra */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {secHdr('🔨', 'Mano de Obra',
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>{moDeObra.tipo}</span>,
              secs.mo, () => toggleSec('mo'))}
            {secs.mo && (
              <div style={{ padding: '12px 16px', background: 'var(--bg-surface)' }}>
                <Select label="Tipo" value={moDeObra.tipo}
                  onChange={(v) => setMoDeObra((m) => ({ ...m, tipo: v }))}
                  options={costos.manoDeObra.map((m) => ({ value: m.tipo, label: `${m.nombre} — ${fmtPeso(m.precio)}` }))}
                />
                {moDeObra.tipo === 'por_hora' && (
                  <div style={{ marginTop: 10 }}>
                    <TextInput label="Horas estimadas" type="number" suffix="hs" value={moDeObra.horas}
                      onChange={(v) => setMoDeObra((m) => ({ ...m, horas: parseFloat(v) || 0 }))} />
                    {(() => {
                      const gf = costos.gastosFijos;
                      if (!gf?.items?.length || !moDeObra.horas) return null;
                      const totalMensual = gf.items.reduce((a, i) => a + (parseFloat(i.monto) || 0), 0);
                      const costoHora = gf.horasProductivasMes > 0 ? totalMensual / gf.horasProductivasMes : 0;
                      const impacto = Math.round(costoHora * moDeObra.horas);
                      return (
                        <div style={{ marginTop: 8, padding: '7px 11px', borderRadius: 7, background: 'rgba(112,144,176,0.10)', border: '1px solid rgba(112,144,176,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>⏱ {moDeObra.horas}h × {fmtPeso(Math.round(costoHora))}/h taller</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#7090c0', fontFamily: "'DM Mono',monospace" }}>{fmtPeso(impacto)}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resumen de Costos */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(126,207,138,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {secHdr('📊', 'Resumen de Costos',
              preview
                ? <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: 'var(--color-positive)' }}>{fmtPeso(preview.total)}</span>
                : <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>sin piezas</span>,
              secs.res, () => toggleSec('res'))}
            {secs.res && (
              <div style={{ padding: '12px 16px', background: 'var(--bg-surface)' }}>
                {preview ? (
                  <>
                    {[
                      ['Material', preview.costoMaterial, `${fmtNum(preview.m2Neto)}m²+${preview.pctDesp}%`],
                      ['Tapacanto', preview.costoTapacanto, `${fmtNum(preview.metrosTapacanto, 2)}m`],
                      ['MO', preview.costoMO, ''],
                      ['Herrajes', preview.costoHerrajes, ''],
                      ['── Costo base', preview.costoBase, ''],
                      ['Ganancia', preview.ganancia, ''],
                    ].map(([k, v, note]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <span style={{ color: k.startsWith('──') ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: k.startsWith('──') ? 700 : 400 }}>{k}</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontFamily: "'DM Mono',monospace", color: '#c8c098' }}>{fmtPeso(v)}</span>
                          {note && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--text-muted)' }}>{note}</span>}
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 4, borderTop: '1px solid rgba(126,207,138,0.2)' }}>
                      <span style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Precio de venta</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 900, color: 'var(--color-positive)', textShadow: '0 0 20px rgba(126,207,138,0.4)' }}>{fmtPeso(preview.total)}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Agregá piezas para ver el resumen de costos.</div>
                )}
              </div>
            )}
          </div>

          {/* Agregar pieza */}
          {fpError && <p style={{ color: "#e07070", fontSize: 12, margin: 0 }}>⚠ {fpError}</p>}
          <button onClick={agregarPieza} style={{
            width: "100%", padding: "11px 0", borderRadius: 8, cursor: "pointer", fontWeight: 700,
            fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: "0.05em",
            transition: "all 0.2s", background: "rgba(200,160,42,0.15)",
            border: "1px solid rgba(200,160,42,0.45)", color: "#c8a02a",
          }}>
            {editandoPiezaIdx !== null ? "✓ ACTUALIZAR PIEZA" : "+ AGREGAR ESTA PIEZA"}
          </button>

        </div>
      </div>

      {/* Lista de piezas */}
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <div onClick={() => setListaPiezasAbierta(v => !v)}
          style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.10)', borderBottom: listaPiezasAbierta ? '1px solid rgba(200,160,42,0.25)' : 'none', borderLeft: '3px solid rgba(200,160,42,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
          <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#c8a02a' }}>
            🪵 Piezas <span style={{ color: 'var(--accent)', marginLeft: 6 }}>({piezas.length})</span>
          </span>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'var(--text-muted)' }}>
              Espesor: <span style={{ color: 'var(--accent)' }}>{espesor}mm</span>
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', transition: 'transform 0.2s', display: 'inline-block', transform: listaPiezasAbierta ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </div>
        </div>
        {listaPiezasAbierta && (
          <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {piezas.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center', fontSize: 12, borderRadius: 8, border: '1px dashed var(--border)', color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>
                Sin piezas todavía — agregá la primera arriba
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {piezas.map((p, i) => (
                  <FilaPieza key={i} pieza={p} idx={i} dims={datos.dimensiones} espesor={espesor} tapacanto={costos.tapacanto}
                    isFirst={i === 0} isLast={i === piezas.length - 1}
                    modVars={{ ...(datos.variables || {}), ...Object.fromEntries((datos.parametros || []).filter(pr => pr.tipo !== 'formula').map(pr => [pr.id, pr.def])) }}
                    onDelete={(i) => { setPiezas(prev => prev.filter((_, j) => j !== i)); if (editandoPiezaIdx === i) cancelarEdicion(); }}
                    onEdit={editarPieza} onDuplicate={duplicarPieza}
                    onMoveUp={(i) => moverPieza(i, -1)} onMoveDown={(i) => moverPieza(i, 1)}
                    onChangeCantidad={(cant) => setPiezas(prev => prev.map((px, j) => j === i ? { ...px, cantidad: cant } : px))} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Panel paramétrico (Fase 6) — full width, debajo de las dos columnas ── */}
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <div onClick={() => setParamAbierto(v => !v)}
          style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.10)', borderBottom: paramAbierto ? '1px solid rgba(200,160,42,0.25)' : 'none', borderLeft: '3px solid rgba(200,160,42,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
          <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#c8a02a' }}>
            ⚙ Parametrizar este módulo
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 10, fontWeight: 400, textTransform: 'none', letterSpacing: '0.02em' }}>
              {(datos.parametros?.length || 0) + (datos.zonas?.length || 0) + (datos.constraints?.length || 0) + (datos.subComponentes?.length || 0) > 0
                ? `${datos.parametros?.length || 0} param · ${datos.zonas?.length || 0} zonas · ${datos.constraints?.length || 0} reglas · ${datos.subComponentes?.length || 0} subcomp`
                : "opcional · permite configurar el módulo desde el presupuesto"}
            </span>
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', transition: 'transform 0.2s', display: 'inline-block', transform: paramAbierto ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
        </div>
        {paramAbierto && (
          <div style={{ padding: 14, background: 'var(--bg-surface)' }}>
            <EditorParametrico
              parametros={datos.parametros || []}
              zonas={datos.zonas || []}
              constraints={datos.constraints || []}
              subComponentes={datos.subComponentes || []}
              moduloPreview={{ ...datos, piezas, herrajes, moDeObra }}
              costos={costos}
              onChange={({ parametros, zonas, constraints, subComponentes }) =>
                setDatos(d => ({ ...d, parametros, zonas, constraints, subComponentes }))} />
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div style={{ display: 'grid', gridTemplateColumns: esEdicion ? '1fr 1fr 1fr' : '1fr 1fr', gap: 10, paddingTop: 4 }}>
        <Btn variant="ghost" onClick={handleCancelar} style={{ width: '100%' }}>Cancelar</Btn>
        {esEdicion && (
          <Btn variant="ghost" onClick={guardar} style={{ width: '100%', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}>
            💾 Guardar y cerrar
          </Btn>
        )}
        <button onClick={guardar}
          style={{ width: '100%', padding: '10px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 900, fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: '0.06em', transition: 'all 0.2s', background: 'linear-gradient(135deg, var(--accent), #b8852a)', border: 'none', color: '#0a0a0a', boxShadow: '0 4px 16px rgba(212,175,55,0.35)' }}>
          {esEdicion ? '✓ Guardar cambios' : '✓ Guardar módulo'}
        </button>
      </div>

      {/* Acordeón de decisión inline — desde presupuesto */}
      {modalDecision && (
        <div className="anim-fadeup" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--accent-border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: 12 }}>
            ¿Dónde guardás esta variante?
          </div>
          {modalDecision === 'nombre' ? (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Nombre en el catálogo:</div>
              <input autoFocus value={nombreCatalogo} onChange={e => setNombreCatalogo(e.target.value)}
                placeholder="Nombre del nuevo módulo..."
                style={{ width: '100%', fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: '8px 12px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-border)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                onKeyDown={e => e.key === 'Enter' && guardarYLimpiar(datos.codigo.trim().toUpperCase(), { ...datosGuardar(), nombre: nombreCatalogo.trim() || datos.nombre, _guardarEnCatalogo: true })} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { guardarYLimpiar(datos.codigo.trim().toUpperCase(), { ...datosGuardar(), nombre: nombreCatalogo.trim() || datos.nombre, _guardarEnCatalogo: true }); setModalDecision(null); }}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg,var(--accent),var(--accent-hover))', border: 'none', color: 'var(--text-inverted)' }}>
                  ✓ Confirmar nombre
                </button>
                <button onClick={() => setModalDecision('pidiendo')}
                  style={{ padding: '9px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>
                  ← Volver
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { guardarYLimpiar(datos.codigo.trim().toUpperCase(), { ...datosGuardar(), _soloPresupuesto: true }); setModalDecision(null); }}
                style={{ padding: '11px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                📋 Solo en este presupuesto
                <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginTop: 3 }}>El catálogo no cambia. Se elimina con el presupuesto.</div>
              </button>
              <button onClick={() => { setNombreCatalogo(datos.nombre || ''); setModalDecision('nombre'); }}
                style={{ padding: '11px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                📚 Guardar en catálogo
                <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginTop: 3 }}>Disponible para futuros presupuestos.</div>
              </button>
              <button onClick={() => setModalDecision(null)}
                style={{ padding: '7px 0', borderRadius: 8, cursor: 'pointer', fontSize: 11, background: 'transparent', border: 'none', color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>
                ✕ Cancelar
              </button>
            </div>
          )}
        </div>
      )}
      {/* ── Acordeón de decisión al guardar desde catálogo directo ── */}
      {decisionCatalogo && !esDeepLinkPresupuesto && (
        <div className="anim-fadeup" style={{ marginTop: 14, background: "var(--bg-subtle)", border: "1px solid var(--accent-border)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: 12 }}>
            ¿Cómo querés guardar?
          </div>
          {decisionCatalogo?.tipo === "confirmarAfectados" ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#c8a02a", marginBottom: 8 }}>
                ⚠ Este módulo se usa en {decisionCatalogo.afectados.length} presupuesto{decisionCatalogo.afectados.length !== 1 ? "s" : ""}:
              </div>
              <div style={{ marginBottom: 12 }}>
                {decisionCatalogo.afectados.slice(0, 4).map((n, i) => (
                  <div key={i} style={{ fontSize: 11, color: "var(--text-muted)", paddingLeft: 8, lineHeight: 1.8 }}>· {n}</div>
                ))}
                {decisionCatalogo.afectados.length > 4 && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", paddingLeft: 8 }}>· y {decisionCatalogo.afectados.length - 4} más...</div>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
                Sus precios pueden quedar desactualizados. Podés recalcularlos ahora o hacerlo después desde "Mis presupuestos".
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => {
                  const cod = datos.codigo.trim().toUpperCase();
                  const moduloActualizado = datosGuardar();
                  onGuardar(cod, moduloActualizado);
                  // Disparar recálculo en los presupuestos afectados
                  if (onRecalcularAfectados) onRecalcularAfectados(cod, null, null, moduloActualizado);
                  setDecisionCatalogo(null);
                }} style={{ padding: "10px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", fontSize: 12, fontWeight: 700 }}>
                  ✓ Actualizar módulo y recalcular precios
                </button>
                <button onClick={() => {
                  guardarYLimpiar(datos.codigo.trim().toUpperCase(), datosGuardar());
                  setDecisionCatalogo(null);
                }} style={{ padding: "10px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700 }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                  Actualizar solo el catálogo
                  <div style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginTop: 2 }}>Los presupuestos muestran ↻ cuando los abrás.</div>
                </button>
                <button onClick={() => setDecisionCatalogo("pidiendo")}
                  style={{ padding: "7px 0", borderRadius: 8, cursor: "pointer", fontSize: 11, background: "transparent", border: "none", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                  ← Volver
                </button>
              </div>
            </div>
          ) : decisionCatalogo === "nuevo" ? (
            <>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Nombre del nuevo módulo:</div>
              <input autoFocus value={nombreNuevoCatalogo} onChange={e => setNombreNuevoCatalogo(e.target.value)}
                placeholder="Nombre del nuevo módulo..."
                style={{ width: "100%", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, padding: "8px 12px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", outline: "none", marginBottom: 10, boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "var(--accent-border)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
                onKeyDown={e => e.key === "Enter" && document.getElementById("btn-crear-nuevo-mod")?.click()} />

              {/* Checkboxes: presupuestos que usan el original */}
              {(() => {
                const cod = datos.codigo.trim().toUpperCase();
                const afectados = Object.entries(presupuestosRef || {})
                  .filter(([, p]) => (p.items || []).some(it => it.codigo === cod));
                if (afectados.length === 0) return null;
                return (
                  <div style={{ marginBottom: 12, padding: "10px 12px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      ¿Reemplazar el módulo en estos presupuestos?
                    </div>
                    {afectados.map(([pid, p]) => {
                      const checked = (decisionCatalogo?.seleccionados || new Set(afectados.map(([id]) => id))).has(pid);
                      return (
                        <label key={pid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)" }}>
                          <input type="checkbox" checked={checked}
                            onChange={e => {
                              const sel = new Set(decisionCatalogo?.seleccionados || afectados.map(([id]) => id));
                              e.target.checked ? sel.add(pid) : sel.delete(pid);
                              setDecisionCatalogo({ ...decisionCatalogo, seleccionados: sel });
                            }}
                            style={{ accentColor: "var(--accent)", width: 14, height: 14, cursor: "pointer" }} />
                          <span style={{ flex: 1 }}>{p.nombre || "Sin nombre"}</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--color-positive)" }}>{fmtPeso(p.total)}</span>
                        </label>
                      );
                    })}
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
                      Reemplaza todas las instancias del módulo original en los seleccionados.
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", gap: 8 }}>
                <Btn id="btn-crear-nuevo-mod" onClick={() => {
                  const newCod = `MC${String(Date.now()).slice(-6)}`;
                  const nombreFinal = nombreNuevoCatalogo.trim() || datos.nombre;
                  onGuardar(newCod, { ...datosGuardar(), nombre: nombreFinal });
                  // Reemplazar en los presupuestos seleccionados
                  const cod = datos.codigo.trim().toUpperCase();
                  const afectados = Object.entries(presupuestosRef || {})
                    .filter(([, p]) => (p.items || []).some(it => it.codigo === cod));
                  const seleccionados = decisionCatalogo?.seleccionados || new Set(afectados.map(([id]) => id));
                  afectados.forEach(([pid, p]) => {
                    if (!seleccionados.has(pid)) return;
                    const itemsActualizados = (p.items || []).map(it =>
                      it.codigo === cod ? { ...it, codigo: newCod } : it
                    );
                    const instancias = itemsActualizados.filter(it => it.codigo === newCod).length;
                    if (instancias > 0 && onRecalcularAfectados) {
                      onRecalcularAfectados(cod, pid, itemsActualizados);
                    }
                  });
                  setDecisionCatalogo(null);
                }}>✓ Crear módulo nuevo</Btn>
                <Btn variant="ghost" onClick={() => setDecisionCatalogo("pidiendo")}>← Volver</Btn>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => {
                // Verificar si hay presupuestos afectados antes de guardar
                const cod = datos.codigo.trim().toUpperCase();
                const afectados = Object.entries(presupuestosRef || {})
                  .filter(([, p]) => (p.items || []).some(it => it.codigo === cod))
                  .map(([, p]) => p.nombre || "Sin nombre");
                if (afectados.length > 0) {
                  setDecisionCatalogo({ tipo: "confirmarAfectados", afectados });
                } else {
                  onGuardar(cod, datosGuardar());
                  setDecisionCatalogo(null);
                }
              }} style={{ padding: "11px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", fontSize: 12, fontWeight: 700 }}>
                ✓ Actualizar este módulo
                <div style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginTop: 3 }}>
                  Sobreescribe el módulo existente en el catálogo.
                </div>
              </button>
              <button onClick={() => setDecisionCatalogo("nuevo")}
                style={{ padding: "11px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-border)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                ➕ Guardar como módulo nuevo
                <div style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginTop: 3 }}>
                  El original queda intacto. Se crea una copia con nuevo nombre.
                </div>
              </button>
              <button onClick={() => setDecisionCatalogo(null)}
                style={{ padding: "7px 0", borderRadius: 8, cursor: "pointer", fontSize: 11, background: "transparent", border: "none", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                ✕ Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Acordeón de confirmación al Cancelar con cambios ── */}
      {confirmandoCancelar && (
        <div className="anim-fadeup" style={{ marginTop: 14, background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.25)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#e07070", marginBottom: 8 }}>
            ¿Descartás los cambios?
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
            Hay cambios sin guardar. Si salís ahora se pierden.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { limpiarBorradorModulo(); onCancelar(); }}
              style={{ padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.40)", color: "#e07070" }}>
              Descartar cambios
            </button>
            <button onClick={() => setConfirmandoCancelar(false)}
              style={{ padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
              Seguir editando
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FormModulo;