import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import ResizablePanels from '../ui/ResizablePanels.jsx';
import EditorParametrico from './EditorParametrico.jsx';
import { Btn, TextInput, Select } from '../ui/index.jsx';
import { fmtPeso, calcularModulo } from '../../utils.js';
import { CATEGORIAS_DEFAULT } from '../../constants.js';
import { piezasQueUsanVar, resolverContextoModulo } from '../../services/moduloService.js';
import VarsExplorer, { construirScopes } from './VarsExplorer.jsx';
import GuiaFormulasBtn from './GuiaFormulasBtn.jsx';
import { cargarBorradorModulo, guardarBorradorModulo, limpiarBorradorModulo } from '../../storage.js';
import FilaPieza from './FilaPieza.jsx';
import FormPieza from './FormPieza.jsx';
import TabsModulo from './TabsModulo.jsx';
import ResumenCostosBar from './ResumenCostosBar.jsx';
import EditorComponenteHijo from './EditorComponenteHijo.jsx';
// VisorCatalogo3D lazy — three.js solo se descarga si el preview se muestra.
// Unifica el preview compacto + el editor 3D expandido (overlay sobre el form).
const VisorCatalogo3D = lazy(() => import('../visor3d/VisorCatalogo3D.jsx'));

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
  especial: false, dimLibre1: "", dimLibre2: "",
  posFormulas: { x: null, y: null, z: null },
  offset3d:    { x: 0, y: 0, z: 0 },
  rot3d:        0,
  orientacion3d: undefined,
  zona:          undefined,
  condition:     undefined,
  repeat:        undefined,
};

const clonarPieza = (p) => (typeof structuredClone === "function" ? structuredClone(p) : JSON.parse(JSON.stringify(p)));
const piezaVaciaNueva = () => clonarPieza(PIEZA_VACIA);
// ── VarsDropdown — botón ⚡ vars + popover con VarsExplorer ──────────────────
// Mismo patrón que FormPieza y EditorComponenteHijo.
function VarsDropdown({ rowKey, openKey, onToggle, scopes, onInsert }) {
  const isOpen = openKey === rowKey;
  return (
    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
      <GuiaFormulasBtn />
      <div style={{ position: "relative" }}>
        <button
          onMouseDown={e => { e.preventDefault(); onToggle(isOpen ? null : rowKey); }}
          style={{
            height: 26, padding: "0 8px", borderRadius: 5, cursor: "pointer",
            fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 600,
            background: isOpen ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${isOpen ? "rgba(212,175,55,0.40)" : "var(--border)"}`,
            color: isOpen ? "var(--accent)" : "var(--text-muted)",
            display: "flex", alignItems: "center", gap: 4,
            transition: "all 0.12s",
          }}>
          ⚡ vars <span style={{ fontSize: 8, opacity: 0.7 }}>{isOpen ? "▲" : "▼"}</span>
        </button>
        {isOpen && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 200 }}>
            <VarsExplorer
              scopes={scopes}
              defaultScopeId="padre"
              onInsert={(name) => { onInsert(name); onToggle(null); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SubTabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onMouseDown={e => e.preventDefault()} onClick={() => onSelect(t.id)} style={{
          background: 'none', border: 'none', padding: '8px 14px', cursor: 'pointer',
          fontSize: 10, fontFamily: "'DM Mono',monospace",
          fontWeight: active === t.id ? 700 : 400,
          letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          borderBottom: active === t.id ? '2px solid var(--accent)' : '2px solid transparent',
          color: active === t.id ? 'var(--accent)' : 'var(--text-muted)',
          marginBottom: -1, transition: 'color 0.12s',
        }}>{t.label}</button>
      ))}
    </div>
  );
}

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
  // Tab activa del editor (rediseño tipo ficha). Se elige el tab inicial
  // según contexto: módulo nuevo arranca en "identificacion" (faltan datos
  // básicos), edición arranca en "piezas" (lo más usado).
  const [tabActiva, setTabActiva] = useState(() => moduloBase ? "piezas" : "datos");
  // Sub-tab dentro de "datos"
  const [subTabDatos, setSubTabDatos] = useState('identificacion');
  // Estado CRUD variables del módulo (usado en Piezas > Variables)
  const [modVarsAgregando, setModVarsAgregando] = useState(false);
  const [modVarsNuevoNombre, setModVarsNuevoNombre] = useState('');
  const [modVarsConfirmDelete, setModVarsConfirmDelete] = useState(null);
  const [modVarsEditando, setModVarsEditando] = useState(null);
  const [modVarsValorEditando, setModVarsValorEditando] = useState('');
  const [modVarsOpen, setModVarsOpen] = useState(null);
  const modVarsInputRef = useRef(null);
  // Inserta el nombre de una variable en el input activo de fórmula de variable,
  // respetando la posición del cursor igual que FormPieza / EditorComponenteHijo.
  const insertarVarModulo = (nombre) => {
    const el = modVarsInputRef.current;
    if (!el) return;
    const start  = el.selectionStart ?? el.value.length;
    const end    = el.selectionEnd   ?? el.value.length;
    const newVal = el.value.slice(0, start) + nombre + el.value.slice(end);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, newVal);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    setTimeout(() => { el.setSelectionRange(start + nombre.length, start + nombre.length); el.focus(); }, 0);
  };
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
  // Valores de prueba para el configurador paramétrico — permiten al autor
  // simular qué verá el cliente. Se reflejan en el preview 3D de la derecha.
  const [valoresPrueba, setValoresPrueba] = useState({});
  // Visor 3D maximizado — preferencia persistida por taller.
  const [visor3DMax, setVisor3DMaxState] = useState(() => {
    try { return localStorage.getItem("carpicalc:visor3d_max") === "true"; }
    catch (_e) { return false; }
  });
  const setVisor3DMax = (v) => {
    setVisor3DMaxState(v);
    try { localStorage.setItem("carpicalc:visor3d_max", String(v)); } catch (_e) { /* sin-op */ }
  };
  const [fp, setFp] = useState(() => piezaVaciaNueva());
  const [fpError, setFpError] = useState("");
  // Edición de pieza existente: idx !== null = modo edición
  const [editandoPiezaIdx, setEditandoPiezaIdx] = useState(null);
  // Sub-tab dentro de "piezas": 'editor' | 'lista'
  const [subTabPiezas, setSubTabPiezas] = useState('editor');

  // Piezas que se pasan al preview 3D en tiempo real.
  // Incluye `fp` en curso si tiene al menos una fórmula o es modo libre con medidas.
  // En modo edición reemplaza la pieza en su posición; en modo nueva la agrega al final.
  const piezasPreview = useMemo(() => {
    // El nombre es el gate: sin nombre el usuario aún no empezó a definir la pieza,
    // así que no mostramos nada en el preview para evitar piezas fantasma al abrir.
    const fpVisible = fp.nombre.trim() && (fp.especial
      ? (parseInt(fp.dimLibre1) > 0 || parseInt(fp.dimLibre2) > 0)
      : (fp.formula1?.trim() || fp.formula2?.trim()));
    if (!fpVisible) return piezas;
    const fpNorm = {
      ...fp,
      cantidad: Math.max(1, parseInt(fp.cantidad) || 1),
      offsetEsp: parseInt(fp.offsetEsp) || 0,  offsetMm: parseInt(fp.offsetMm) || 0,
      divisor:   Math.max(1, parseInt(fp.divisor) || 1),
      offsetEsp2: parseInt(fp.offsetEsp2) || 0, offsetMm2: parseInt(fp.offsetMm2) || 0,
      divisor2:  Math.max(1, parseInt(fp.divisor2) || 1),
      tc: { id: parseInt(fp.tc?.id) || 0, lados1: parseInt(fp.tc?.lados1) || 0, lados2: parseInt(fp.tc?.lados2) || 0 },
    };
    if (editandoPiezaIdx !== null) {
      return piezas.map((p, i) => i === editandoPiezaIdx ? fpNorm : p);
    }
    return [...piezas, fpNorm];
  }, [fp, piezas, editandoPiezaIdx]);
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
    const nueva = clonarPieza(normalizarPieza(fp));
    if (editandoPiezaIdx !== null) {
      setPiezas(prev => prev.map((p, i) => i === editandoPiezaIdx ? nueva : p));
      setEditandoPiezaIdx(null);
    } else {
      setPiezas(prev => [...prev, nueva]);
    }
    setFp(piezaVaciaNueva());
    setFpError("");
  };

  const editarPieza = (idx) => {
    setFp({ ...piezaVaciaNueva(), ...clonarPieza(piezas[idx]) });
    setEditandoPiezaIdx(idx);
    setSubTabPiezas('editor');
  };

  const cancelarEdicion = () => {
    setFp(piezaVaciaNueva());
    setEditandoPiezaIdx(null);
    setFpError("");
  };

  const duplicarPieza = (idx) => {
    const copia = { ...clonarPieza(piezas[idx]), nombre: `${piezas[idx].nombre} (copia)` };
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

  // ── Subcomponentes (hijos) ────────────────────────────────────────────
  // Cada hijo se edita en su propia pestaña dinámica (tipo "hijo").
  // tabActiva usa el formato "hijo:<id>" para identificar cuál está abierto.
  const subComponentes = datos.subComponentes || [];

  const _generarIdHijo = () => {
    // ID único entre los hijos existentes
    const usados = new Set(subComponentes.map(s => s.id));
    let n = subComponentes.length + 1;
    while (usados.has(`hijo${n}`)) n++;
    return `hijo${n}`;
  };

  const agregarHijo = () => {
    const nuevoId = _generarIdHijo();
    const idx = subComponentes.length + 1;
    const nuevo = {
      id: nuevoId,
      nombre: `Componente ${idx}`,
      dimensiones: { ancho: "ancho", alto: "alto", profundidad: "profundidad" },
      origen: { x: "0", y: "0", z: "0" },
      parametros: [],
      piezas: [],
      herrajes: [],
      subComponentes: [],
    };
    setDatos(d => ({ ...d, subComponentes: [...(d.subComponentes || []), nuevo] }));
    setTabActiva(`hijo:${nuevoId}`);
  };

  const actualizarHijo = (idx, nuevo) => {
    const viejo = subComponentes[idx];
    setDatos(d => ({
      ...d,
      subComponentes: (d.subComponentes || []).map((s, i) => i === idx ? nuevo : s),
    }));
    // Si el ID cambió y la pestaña activa apuntaba al viejo, seguirla
    if (viejo && viejo.id !== nuevo.id && tabActiva === `hijo:${viejo.id}`) {
      setTabActiva(`hijo:${nuevo.id}`);
    }
  };

  const eliminarHijo = (idx) => {
    setDatos(d => ({
      ...d,
      subComponentes: (d.subComponentes || []).filter((_, i) => i !== idx),
    }));
    setTabActiva("piezas");
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

  // Mergea los cambios pendientes del editor de pieza (`fp`) en `piezas[]` antes de guardar.
  // Sin esto, si el usuario edita un campo (ej: posFormulas.y) y va directo a "Guardar cambios"
  // sin clickear "✓ Actualizar pieza", su cambio se pierde silenciosamente. `fp` y `piezas[]`
  // son dos estados paralelos: este merge cierra la brecha al momento de persistir.
  const piezasParaGuardar = () => {
    if (editandoPiezaIdx === null || !fp.nombre.trim()) return piezas;
    const fpCommit = clonarPieza(normalizarPieza(fp));
    return piezas.map((p, i) => i === editandoPiezaIdx ? fpCommit : p);
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
    piezas:      piezasParaGuardar(),
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
      setTabActiva("identificacion");
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
  // Pasar valoresPrueba para que el preview de costos refleje los parámetros
  // que el usuario configura en el panel paramétrico (mismo flujo que usa la
  // Vista 3D del presupuesto). Sin esto, cambiar `estantes` actualizaba la
  // geometría pero no los costos.
  const preview =
    piezas.length > 0
      ? calcularModulo({ ...datos, piezas, herrajes, moDeObra }, costos, valoresPrueba)
      : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Error banner */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, fontSize: 13, background: "rgba(200,60,60,0.10)", border: "1px solid rgba(200,60,60,0.30)", color: "#e08080" }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Bloque unificado: header + tabs + body (sin gap entre ellos) ── */}
      <div style={{
        display: "flex", flexDirection: "column",
        border: "1px solid var(--accent-border)", borderRadius: 10, overflow: "hidden",
      }}>

        {/* Header compacto — enunciado a la derecha, sin línea inferior */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          padding: "5px 14px", background: "var(--bg-surface)",
        }}>
          <span style={{
            fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700,
            letterSpacing: "0.08em", color: "var(--text-muted)",
          }}>
            {esEdicion ? "✎ Editando" : "＋ Nuevo módulo"}
            {(datos.codigo || datos.nombre) && (
              <span style={{ color: "var(--text-primary)", fontWeight: 700, marginLeft: 6 }}>
                {datos.codigo || "—"}{datos.nombre && ` · ${datos.nombre}`}
              </span>
            )}
          </span>
        </div>

        {/* Tabs — fluyen directamente del header, sin gap */}
        <TabsModulo
          activeId={tabActiva}
          onChange={setTabActiva}
          tabs={[
            { id: "datos", icon: "◈", label: "Padre",
              badge: (datos.codigo && datos.nombre
                && datos.dimensiones?.ancho && datos.dimensiones?.alto && datos.dimensiones?.profundidad) ? "ok" : "warn" },
            { id: "piezas",         icon: "▤", label: piezas.length > 0 ? `Piezas · ${piezas.length}` : "Piezas",
              badge: piezas.length > 0 ? "ok" : "warn" },
            { id: "configurable",   icon: "⊹", label: "Panel Vista",
              badge: (datos.parametros?.length > 0) ? "ok" : null },
            ...subComponentes.map((sub, idx) => ({
              id: `hijo:${sub.id}`,
              icon: "◻",
              label: (sub.nombre || `Comp. ${idx + 1}`).length > 12
                ? (sub.nombre || `Comp. ${idx + 1}`).slice(0, 11) + "…"
                : (sub.nombre || `Comp. ${idx + 1}`),
              tipo: "hijo",
              badge: (sub.piezas?.length > 0) ? "ok" : "warn",
            })),
            { id: "__add_hijo__", icon: "＋", label: "Hijo",
              tipo: "add", onAction: agregarHijo },
          ]} />

        {/* Body: contenido de tab activa (izq) + preview 3D (der).
            Sin borde propio — el wrapper exterior ya lo da. El tab activo
            cubre el borde inferior del tab bar con marginBottom:-1, creando
            la conexión visual "pestaña → hoja". */}
        <ResizablePanels
          defaultSplit={55}
          style={{ background: "var(--bg-surface)", minHeight: 520, position: "relative" }}
          left={
        <div style={{ padding: 14, overflowY: "auto", maxHeight: "78vh" }}>

          {tabActiva === "datos" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <SubTabBar
                tabs={[
                  { id: 'identificacion', label: 'Identificación' },
                  { id: 'dims_clasif',    label: 'Dims. y clasif.' },
                  { id: 'mo',             label: '🔨 Mano de obra' },
                  { id: 'herrajes',       label: `🔩 Herrajes${herrajes.length > 0 ? ` · ${herrajes.length}` : ''}` },
                ]}
                active={subTabDatos}
                onSelect={setSubTabDatos}
              />

              {subTabDatos === 'identificacion' && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 8 }}>
                    <TextInput label="Código" placeholder="MC003" value={datos.codigo} small
                      onChange={(v) => setDatos(d => ({ ...d, codigo: v.toUpperCase() }))}
                      disabled={esEdicion} autoFocus={!esEdicion} />
                    <TextInput label="Nombre" placeholder="Módulo bajo mesada 80cm" value={datos.nombre} small
                      onChange={(v) => setDatos(d => ({ ...d, nombre: v }))} />
                  </div>
                  {esEdicion && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>
                      El código no se puede modificar en modo edición.
                    </div>
                  )}
                  <TextInput label="Descripción (opcional)" value={datos.descripcion} small
                    onChange={(v) => setDatos(d => ({ ...d, descripcion: v }))} />
                </div>
              )}

              {subTabDatos === 'dims_clasif' && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", color: "#c8a02a", marginBottom: 8 }}>📐 Dimensiones y material</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.4fr", gap: 8 }}>
                      <TextInput label="Ancho (mm)" type="number" suffix="mm" value={datos.dimensiones.ancho} small
                        onChange={(v) => setDatos(d => ({ ...d, dimensiones: { ...d.dimensiones, ancho: parseInt(v) || 0 } }))} />
                      <TextInput label="Profund. (mm)" type="number" suffix="mm" value={datos.dimensiones.profundidad} small
                        onChange={(v) => setDatos(d => ({ ...d, dimensiones: { ...d.dimensiones, profundidad: parseInt(v) || 0 } }))} />
                      <TextInput label="Alto (mm)" type="number" suffix="mm" value={datos.dimensiones.alto} small
                        onChange={(v) => setDatos(d => ({ ...d, dimensiones: { ...d.dimensiones, alto: parseInt(v) || 0 } }))} />
                      <Select label="Material" value={datos.material} small
                        onChange={(v) => setDatos(d => ({ ...d, material: v }))}
                        options={costos.materiales.map((m) => ({ value: m.tipo, label: `${m.nombre} (${m.espesor}mm)` }))} />
                    </div>
                    {matDef && (
                      <div style={{ marginTop: 6, padding: "5px 10px", borderRadius: 6, fontSize: 11, background: "rgba(212,175,55,0.08)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                        ▶ {matDef.nombre} · {matDef.espesor}mm
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", color: "#c8a02a", marginBottom: 8 }}>🏷 Clasificación</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div>
                        <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 6 }}>Categoría</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {CATEGORIAS_DEFAULT.map(cat => {
                            const activa = datos.categoria === cat.id;
                            return (
                              <button key={cat.id} onClick={() => setDatos(d => ({ ...d, categoria: cat.id }))}
                                style={{ padding: "4px 9px", borderRadius: 16, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, background: activa ? `${cat.color}22` : "var(--bg-subtle)", border: `1px solid ${activa ? cat.color : "var(--border)"}`, color: activa ? cat.color : "var(--text-muted)" }}>
                                {cat.icon} {cat.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 6 }}>Tipo visual</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {[
                            { id: null,    label: "Sin def.", icon: "—",  color: "#606880" },
                            { id: "bajo",  label: "Bajo",     icon: "⬇",  color: "#7090c8" },
                            { id: "aereo", label: "Aéreo",    icon: "⬆",  color: "#a070c8" },
                            { id: "torre", label: "Torre",    icon: "⬛", color: "var(--color-positive)" },
                          ].map((tipo) => {
                            const activo = datos.tipoVisual === tipo.id;
                            return (
                              <button key={String(tipo.id)} onClick={() => setDatos(d => ({ ...d, tipoVisual: tipo.id }))}
                                style={{ padding: "4px 9px", borderRadius: 16, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, background: activo ? `${tipo.color}22` : "var(--bg-subtle)", border: `1px solid ${activo ? tipo.color : "var(--border)"}`, color: activo ? tipo.color : "var(--text-muted)" }}>
                                {tipo.icon} {tipo.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {subTabDatos === 'mo' && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 14 }}>
                  <Select label="Tipo" value={moDeObra.tipo}
                    onChange={(v) => setMoDeObra(m => ({ ...m, tipo: v }))}
                    options={costos.manoDeObra.map((m) => ({ value: m.tipo, label: `${m.nombre} — ${fmtPeso(m.precio)}` }))} />
                  {moDeObra.tipo === "por_hora" && (
                    <>
                      <TextInput label="Horas estimadas" type="number" suffix="hs" value={moDeObra.horas} small
                        onChange={(v) => setMoDeObra(m => ({ ...m, horas: parseFloat(v) || 0 }))} />
                      {(() => {
                        const gf = costos.gastosFijos;
                        if (!gf?.items?.length || !moDeObra.horas) return null;
                        const totalMensual = gf.items.reduce((a, i) => a + (parseFloat(i.monto) || 0), 0);
                        const costoHora = gf.horasProductivasMes > 0 ? totalMensual / gf.horasProductivasMes : 0;
                        const impacto = Math.round(costoHora * moDeObra.horas);
                        return (
                          <div style={{ padding: "7px 10px", borderRadius: 6, background: "rgba(112,144,176,0.10)", border: "1px solid rgba(112,144,176,0.25)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>⏱ {moDeObra.horas}h × {fmtPeso(Math.round(costoHora))}/h</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#7090c0", fontFamily: "'DM Mono',monospace" }}>{fmtPeso(impacto)}</span>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}

              {subTabDatos === 'herrajes' && (
                <div style={{ paddingTop: 14 }}>
                  {costos.herrajes.length === 0 && (
                    <div style={{ padding: "28px 0", textAlign: "center", fontSize: 12, borderRadius: 8, border: "1px dashed var(--border)", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                      No hay herrajes configurados en Costos
                    </div>
                  )}
                  {costos.herrajes.map((h) => {
                    const item = herrajes.find((x) => x.id === h.id);
                    const cant = item?.cantidad || 0;
                    const esFormula = typeof item?.cantidad === 'string';
                    const tieneCondition = !!item?.condition;
                    const activo = !!item && (cant > 0 || esFormula || tieneCondition);
                    const setItem = (patch) => setHerrajes((prev) => {
                      const idx = prev.findIndex((x) => x.id === h.id);
                      if (idx < 0) return [...prev, { id: h.id, cantidad: 1, ...patch }];
                      const n = [...prev]; n[idx] = { ...n[idx], ...patch }; return n;
                    });
                    const quitarItem = () => setHerrajes((prev) => prev.filter((x) => x.id !== h.id));
                    return (
                      <div key={h.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{h.nombre}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{fmtPeso(h.precio)}/{h.unidad}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <button onClick={() => {
                              if (esFormula || tieneCondition) setItem({ cantidad: 1, condition: undefined });
                              else setItem({ cantidad: String(cant || 1) });
                            }} title={esFormula ? "Volver a número" : "Fórmula / condición"}
                              style={{ width: 26, height: 26, background: (esFormula || tieneCondition) ? "var(--accent)" : "var(--bg-subtle)", border: "1px solid var(--accent-border)", color: (esFormula || tieneCondition) ? "#0a0a0a" : "var(--text-muted)", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>
                              fx
                            </button>
                            {!esFormula && (
                              <>
                                <button onClick={() => { if (cant <= 1) quitarItem(); else setItem({ cantidad: cant - 1 }); }}
                                  style={{ width: 26, height: 26, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 5, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                                <button onClick={() => setItem({ cantidad: (cant || 0) + 1 })}
                                  style={{ width: 26, height: 26, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: 5, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                              </>
                            )}
                            <span style={{ fontFamily: "'DM Mono',monospace", minWidth: 20, textAlign: "center", fontSize: 12, color: activo ? "var(--accent)" : "var(--text-muted)" }}>{esFormula ? "fx" : cant}</span>
                          </div>
                        </div>
                        {(esFormula || tieneCondition) && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 5 }}>
                            <div>
                              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Cantidad (fórmula)</div>
                              <input value={typeof item.cantidad === "string" ? item.cantidad : String(item.cantidad || "")}
                                placeholder="ej: cajones · puertas * 2"
                                onChange={e => setItem({ cantidad: e.target.value })}
                                style={{ width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "5px 7px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Condición (opcional)</div>
                              <input value={item.condition || ""}
                                placeholder="ej: cajones > 0"
                                onChange={e => setItem({ condition: e.target.value || undefined })}
                                style={{ width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "5px 7px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tabActiva === "piezas" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <SubTabBar
                tabs={[
                  { id: 'editor',    label: editandoPiezaIdx !== null ? '✎ Editando' : '✎ Editor' },
                  { id: 'variables', label: `⚡ Variables${Object.keys(datos.variables || {}).length > 0 ? ` · ${Object.keys(datos.variables || {}).length}` : ''}` },
                  { id: 'lista',     label: `▤ Lista · ${piezas.length}` },
                ]}
                active={subTabPiezas}
                onSelect={setSubTabPiezas}
              />

              {subTabPiezas === 'editor' && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 20 }}>
                  <FormPieza
                    fp={fp} setFp={setFp}
                    onCancelar={cancelarEdicion}
                    onConfirmar={agregarPieza}
                    editando={editandoPiezaIdx !== null}
                    modulo={datos}
                    costos={costos}
                    valoresParametros={valoresPrueba}
                    nombresSugeridos={NOMBRES_SUGERIDOS} />

                  {fpError && <p style={{ color: "#e07070", fontSize: 12, margin: 0 }}>⚠ {fpError}</p>}

                  {editandoPiezaIdx === null ? (
                    <button onClick={agregarPieza} style={{
                      width: "100%", padding: "7px 0", borderRadius: 7, cursor: "pointer", fontWeight: 600,
                      fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.05em",
                      background: "rgba(200,160,42,0.15)", border: "1px solid rgba(200,160,42,0.45)", color: "#c8a02a",
                    }}>
                      + AGREGAR ESTA PIEZA
                    </button>
                  ) : (
                    <button onClick={agregarPieza} style={{
                      width: "100%", padding: "7px 0", borderRadius: 7, cursor: "pointer", fontWeight: 700,
                      fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.05em",
                      background: "rgba(126,207,138,0.15)", border: "1px solid rgba(126,207,138,0.45)", color: "var(--color-positive)",
                    }}>
                      ✓ ACTUALIZAR PIEZA
                    </button>
                  )}

                </div>
              )}

              {subTabPiezas === 'variables' && (() => {
                const variables = datos.variables || {};
                const customEntries = Object.entries(variables);
                // Contexto centralizado: usa el punto único de verdad (ver CLAUDE.md).
                // `piezas` vive en state separado de `datos` — se mergea para que
                // resolverContextoModulo compute pieza-vars del módulo padre.
                const moduloUnificado = { ...datos, piezas, subComponentes: datos.subComponentes || [] };
                const { modVars: resolved } = resolverContextoModulo(moduloUnificado, costos, valoresPrueba || {});
                // Scopes para el explorador jerárquico (padre + subcomponentes).
                const scopesPadre = construirScopes(moduloUnificado, costos, valoresPrueba || {});
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 14 }}>
                    {/* Contexto disponible — explorador unificado (modo lectura) */}
                    <div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Contexto disponible — navegá la jerarquía para descubrir variables
                      </div>
                      <VarsExplorer
                        scopes={scopesPadre}
                        defaultScopeId="padre"
                        readOnly={false}
                        onInsert={insertarVarModulo}
                        style={{ width: "100%", maxHeight: 360 }}
                        carpetas={datos.variablesCarpetas || {}}
                        onCarpetasChange={(scopeId, newC) =>
                          setDatos(d => ({ ...d, variablesCarpetas: { ...(d.variablesCarpetas || {}), [scopeId]: newC } }))
                        }
                      />
                    </div>

                    {/* Agregar variable custom */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>Variables custom</div>
                      {modVarsAgregando ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input autoFocus value={modVarsNuevoNombre}
                            onChange={e => setModVarsNuevoNombre(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { const n = modVarsNuevoNombre.trim(); if (n && !(n in variables)) { setDatos(d => ({ ...d, variables: { ...(d.variables || {}), [n]: '' } })); setModVarsNuevoNombre(''); setModVarsAgregando(false); } }
                              if (e.key === 'Escape') { setModVarsAgregando(false); setModVarsNuevoNombre(''); }
                            }}
                            placeholder="nombre (ej: luz)"
                            style={{ width: 110, fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "5px 8px", background: "var(--bg-base)", border: "1px solid var(--accent-border)", borderRadius: 6, color: "var(--text-primary)", outline: "none" }} />
                          <button onClick={() => { const n = modVarsNuevoNombre.trim(); if (n && !(n in variables)) { setDatos(d => ({ ...d, variables: { ...(d.variables || {}), [n]: '' } })); setModVarsNuevoNombre(''); setModVarsAgregando(false); } }}
                            style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)" }}>OK</button>
                          <button onClick={() => { setModVarsAgregando(false); setModVarsNuevoNombre(''); }}
                            style={{ padding: "5px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setModVarsAgregando(true); setModVarsNuevoNombre(''); }}
                          style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "transparent", border: "1px dashed rgba(212,175,55,0.40)", color: "var(--accent)" }}>
                          + Variable custom
                        </button>
                      )}
                    </div>

                    {customEntries.length === 0 && !modVarsAgregando && (
                      <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12, borderRadius: 8, border: "1px dashed var(--border)", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                        Sin variables custom — usá las bases o creá una nueva
                      </div>
                    )}

                    {customEntries.map(([nombre, valor]) => {
                      const valStr = typeof valor === 'number' ? String(valor) : (valor || '');
                      const evalStr = resolved[nombre] != null ? String(Math.round(resolved[nombre] * 10) / 10) : null;
                      const pendiente = modVarsConfirmDelete === nombre;
                      const enEdicion = modVarsEditando === nombre;
                      const usadas = pendiente ? piezasQueUsanVar(nombre, piezas) : [];
                      const confirmar = () => { setDatos(d => ({ ...d, variables: { ...(d.variables || {}), [nombre]: modVarsValorEditando } })); setModVarsEditando(null); };
                      const cancelar = () => { setModVarsEditando(null); setModVarsValorEditando(''); };
                      return (
                        <div key={nombre} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(212,175,55,0.07)", border: `1px solid ${enEdicion ? "rgba(212,175,55,0.55)" : "rgba(212,175,55,0.22)"}`, borderRadius: 7, padding: "5px 8px" }}>
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>{nombre} =</span>
                            {enEdicion ? (
                              <>
                                <input autoFocus ref={modVarsInputRef} type="text" value={modVarsValorEditando} onChange={e => setModVarsValorEditando(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') confirmar(); if (e.key === 'Escape') cancelar(); }}
                                  style={{ flex: 1, minWidth: 60, fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, padding: "3px 6px", background: "var(--bg-base)", border: "1px solid rgba(212,175,55,0.45)", borderRadius: 5, color: "var(--text-primary)", outline: "none" }} />
                                <VarsDropdown
                                  rowKey={`modvar_${nombre}`}
                                  openKey={modVarsOpen}
                                  onToggle={setModVarsOpen}
                                  scopes={scopesPadre}
                                  onInsert={insertarVarModulo}
                                />
                                <button onClick={confirmar} style={{ padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "linear-gradient(135deg,var(--accent),var(--accent-hover))", border: "none", color: "var(--text-inverted)", flexShrink: 0 }}>✓</button>
                                <button onClick={cancelar} style={{ padding: "2px 6px", borderRadius: 5, fontSize: 11, cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>✕</button>
                              </>
                            ) : (
                              <>
                                <span style={{ flex: 1, fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, padding: "3px 6px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {valStr || <span style={{ color: "var(--text-muted)", fontWeight: 400, fontStyle: "italic" }}>(vacío)</span>}
                                </span>
                                {evalStr !== null && evalStr !== valStr && (
                                  <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--color-positive)", fontWeight: 700, flexShrink: 0 }}>= {evalStr}</span>
                                )}
                                <button onClick={() => { setModVarsEditando(nombre); setModVarsValorEditando(valStr); }}
                                  style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 11, padding: "2px 8px", borderRadius: 5, flexShrink: 0, fontFamily: "'DM Mono',monospace" }}>✎</button>
                                <button onClick={() => setModVarsConfirmDelete(nombre)}
                                  style={{ background: "none", border: "none", color: "#e07070", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "0 2px", opacity: 0.45, flexShrink: 0 }}
                                  onMouseEnter={e => { e.currentTarget.style.opacity = 1; }} onMouseLeave={e => { e.currentTarget.style.opacity = 0.45; }}>×</button>
                              </>
                            )}
                          </div>
                          {pendiente && (
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "6px 10px", background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.30)", borderRadius: 7 }}>
                              {usadas.length > 0
                                ? <span style={{ fontSize: 10, color: "#e07070", fontFamily: "'DM Mono',monospace", flex: 1 }}>⚠ Usada en: <strong>{usadas.map(p => p.nombre).join(', ')}</strong></span>
                                : <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace", flex: 1 }}>¿Eliminar <strong style={{ color: "var(--accent)" }}>{nombre}</strong>?</span>
                              }
                              <button onClick={() => { const { [nombre]: _r, ...rest } = variables; setDatos(d => ({ ...d, variables: rest })); setModVarsConfirmDelete(null); }}
                                style={{ padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", cursor: "pointer", background: "rgba(200,60,60,0.20)", border: "1px solid rgba(200,60,60,0.45)", color: "#e07070" }}>Sí, eliminar</button>
                              <button onClick={() => setModVarsConfirmDelete(null)}
                                style={{ padding: "3px 8px", borderRadius: 5, fontSize: 11, cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>Cancelar</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {subTabPiezas === 'lista' && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", color: "#c8a02a" }}>
                      {piezas.length} pieza{piezas.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>
                      Espesor: <span style={{ color: "var(--accent)" }}>{espesor}mm</span>
                    </span>
                  </div>
                  {piezas.length === 0 ? (
                    <div style={{ padding: "28px 0", textAlign: "center", fontSize: 12, borderRadius: 8, border: "1px dashed var(--border)", color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                      Sin piezas todavía — agregá la primera en el Editor
                    </div>
                  ) : (
                    piezas.map((p, i) => (
                      <FilaPieza key={i} pieza={p} idx={i} dims={datos.dimensiones} espesor={espesor} tapacanto={costos.tapacanto}
                        isFirst={i === 0} isLast={i === piezas.length - 1}
                        modVars={{ ...(datos.variables || {}), ...Object.fromEntries((datos.parametros || []).filter(pr => pr.tipo !== 'formula').map(pr => [pr.id, (valoresPrueba || {})[pr.id] ?? pr.def])) }}
                        onDelete={(i) => { setPiezas(prev => prev.filter((_, j) => j !== i)); if (editandoPiezaIdx === i) cancelarEdicion(); }}
                        onEdit={editarPieza} onDuplicate={duplicarPieza}
                        onMoveUp={(i) => moverPieza(i, -1)} onMoveDown={(i) => moverPieza(i, 1)}
                        />
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {tabActiva === "configurable" && (
            <EditorParametrico
              parametros={datos.parametros || []}
              zonas={datos.zonas || []}
              constraints={datos.constraints || []}
              moduloPreview={{ ...datos, piezas, herrajes, moDeObra }}
              costos={costos}
              valoresPrueba={valoresPrueba}
              onValoresPruebaChange={setValoresPrueba}
              onChange={({ parametros, zonas, constraints }) =>
                setDatos(d => ({ ...d, parametros, zonas, constraints }))} />
          )}

          {tabActiva.startsWith("hijo:") && (() => {
            const idHijo = tabActiva.slice(5);
            const idx = subComponentes.findIndex(s => s.id === idHijo);
            if (idx < 0) {
              // Pestaña obsoleta — el hijo fue eliminado en otra acción.
              return (
                <div style={{ padding: 30, textAlign: "center", color: "var(--text-muted)", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
                  Este componente fue eliminado. Volvé a "Piezas" o creá uno nuevo.
                </div>
              );
            }
            return (
              <EditorComponenteHijo
                subcomp={subComponentes[idx]}
                onChange={(nuevo) => actualizarHijo(idx, nuevo)}
                onDelete={() => eliminarHijo(idx)}
                parentDims={datos.dimensiones}
                parentVariables={datos.variables || {}}
                parentParametros={datos.parametros || []}
                parentZonas={datos.zonas || []}
                parentPiezas={piezas}
                parentValoresParametros={valoresPrueba}
                espesor={espesor}
                costos={costos} />
            );
          })()}

        </div>
          }
          right={
        <div style={{ background: "#0a0c10", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 14px", fontSize: 10, fontFamily: "'DM Mono',monospace", color: "#c8a02a", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            👁 Preview 3D
          </div>
          <div style={{ flex: 1, minHeight: 460, position: "relative" }}>
            {piezasPreview.length === 0 ? (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--text-muted)", lineHeight: 1.6 }}>
                  Sin piezas todavía<br />
                  <span style={{ opacity: 0.7 }}>El preview aparece al escribir la primera fórmula</span>
                </div>
              </div>
            ) : !visor3DMax ? (
              <Suspense fallback={
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>Cargando 3D…</div>
              }>
                <VisorCatalogo3D
                  modulo={{ ...datos, piezas: piezasPreview, herrajes, moDeObra }}
                  costos={costos}
                  parametrosValores={valoresPrueba}
                  maximizado={false}
                  onToggleMaximizar={setVisor3DMax}
                  onActualizar={(nuevoMod) => {
                    if (nuevoMod?.piezas)   setPiezas(nuevoMod.piezas);
                    if (nuevoMod?.herrajes) setHerrajes(nuevoMod.herrajes);
                  }}
                  onSelectPieza={(idx, subComponenteId) => {
                    if (idx == null) {
                      if (editandoPiezaIdx !== null) cancelarEdicion();
                      return;
                    }
                    // Pieza de subcomponente: navegar al tab del hijo correcto.
                    if (subComponenteId) {
                      setTabActiva(`hijo:${subComponenteId}`);
                      return;
                    }
                    // piezasPreview puede tener fp en la última posición (modo nueva).
                    // Si el usuario clickea esa pieza fantasma, no abrir edición de otra.
                    if (editandoPiezaIdx === null && idx === piezasPreview.length - 1 && idx >= piezas.length) return;
                    setTabActiva("piezas");
                    editarPieza(idx);
                  }}
                />
              </Suspense>
            ) : (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.30)", fontSize: 10, fontFamily: "'DM Mono',monospace",
              }}>
                Editor 3D maximizado
              </div>
            )}
          </div>
        </div>

        {/* Overlay del visor cuando está maximizado — cubre form + columna preview */}
        {visor3DMax && piezasPreview.length > 0 && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 20,
            background: "#0a0c10",
          }}>
            <Suspense fallback={
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>Cargando 3D…</div>
            }>
              <VisorCatalogo3D
                modulo={{ ...datos, piezas: piezasPreview, herrajes, moDeObra }}
                costos={costos}
                parametrosValores={valoresPrueba}
                maximizado={true}
                onToggleMaximizar={setVisor3DMax}
                onActualizar={(nuevoMod) => {
                  if (nuevoMod?.piezas)   setPiezas(nuevoMod.piezas);
                  if (nuevoMod?.herrajes) setHerrajes(nuevoMod.herrajes);
                }}
                onSelectPieza={(idx, subComponenteId) => {
                  if (idx == null) { if (editandoPiezaIdx !== null) cancelarEdicion(); return; }
                  if (subComponenteId) { setTabActiva(`hijo:${subComponenteId}`); return; }
                  if (editandoPiezaIdx === null && idx === piezasPreview.length - 1 && idx >= piezas.length) return;
                  setTabActiva("piezas");
                  editarPieza(idx);
                }}
              />
            </Suspense>
          </div>
        )}
      </div>
          }
        />
      </div>{/* cierre del bloque unificado header+tabs+body */}

      {/* Footer sticky: resumen de costos + botones de acción */}
      <ResumenCostosBar
        calc={preview}
        sinPiezas={piezas.length === 0}
        onCancelar={handleCancelar}
        onGuardar={guardar}
        labelGuardar={esEdicion ? "✓ Guardar cambios" : "✓ Guardar módulo"}
      />

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