// ════════════════════════════════════════════════════════════════════════════
// MaterialesManager — Container de gestión de materiales
// ════════════════════════════════════════════════════════════════════════════
//
// Orquesta:
//   - Sidebar de categorías
//   - Toolbar (buscador + ordenamiento + vista + + Nuevo)
//   - Grid visual de cards
//   - Drawer lateral de edición (crear/editar)
//
// Inputs (props):
//   materiales: Material[]              ← entidad top-level (App.js)
//   categorias: Categoria[]              ← top-level (App.js)
//   onSave: (mats, cats?) => void        ← persiste materiales (y opcionalmente categorías)
//
// Capa: container. Sin localStorage directo, sin supabase directo.
// Toda mutación va por `onSave` que llama internamente a guardarMateriales.
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useDeferredValue, useEffect } from "react";
import MaterialesSidebar from "./MaterialesSidebar.jsx";
import MaterialSearchToolbar from "./MaterialSearchToolbar.jsx";
import MaterialEditorDrawer from "./MaterialEditorDrawer.jsx";
import MaterialCard from "./MaterialCard.jsx";
import {
  useMaterialesFilter,
  CATEGORIA_TODOS, CATEGORIA_SIN_ASIGNAR,
} from "./useMaterialesFilter.js";
import { agruparVariantes } from "./agruparVariantes.js";
import { MATERIAL_VACIO } from "../../services/materialesService.js";

const M = "'DM Mono',monospace";

export default function MaterialesManager({
  materiales = [],
  categorias = [],
  onSave,
}) {
  const [query, setQuery] = useState("");
  const queryDeferred = useDeferredValue(query);
  const [orden, setOrden] = useState("nombre");
  const [categoriaActiva, setCategoriaActiva] = useState(CATEGORIA_TODOS);
  const [vistaUser, setVistaUser] = useState(null);  // null = auto
  const [pagina, setPagina] = useState(0);
  const [paginasPorCat, setPaginasPorCat] = useState({});
  const POR_PAGINA = 12;

  // Auto-default vista: agrupada si hay categorías, plana si no
  const vista = vistaUser || (categorias.length > 0 ? "agrupada" : "plana");

  // Drawer state
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [materialEditando, setMaterialEditando] = useState(null);

  const { enCategoriaActiva, agrupados, counts } = useMaterialesFilter({
    materiales, categorias, query: queryDeferred, categoriaActiva, vista, orden,
  });

  // Resetear páginas cuando cambia el filtro
  useEffect(() => { setPagina(0); setPaginasPorCat({}); }, [queryDeferred, categoriaActiva, orden]);

  // Agrupar variantes (AGL/MDF del mismo color → una sola card)
  const gruposFiltrados = useMemo(() => agruparVariantes(enCategoriaActiva), [enCategoriaActiva]);
  const totalPaginas = Math.ceil(gruposFiltrados.length / POR_PAGINA);
  const gruposPagina = gruposFiltrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  const agrupadosGrupos = useMemo(() => {
    if (!agrupados) return null;
    const m = new Map();
    for (const [cid, items] of agrupados) m.set(cid, agruparVariantes(items));
    return m;
  }, [agrupados]);

  // Mapa categoriaId → categoria, para resolución rápida en cada card
  const categoriaPorId = useMemo(() => {
    const m = new Map();
    for (const c of categorias) m.set(c.id, c);
    return m;
  }, [categorias]);

  // ── Mutaciones ──────────────────────────────────────────────────────────
  const abrirCrear = () => {
    const ahora = Date.now();
    const id = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `mat_${ahora}`;
    setMaterialEditando({
      ...MATERIAL_VACIO,
      id,
      // Pre-asignar categoría si hay una activa
      categoria: (categoriaActiva !== CATEGORIA_TODOS && categoriaActiva !== CATEGORIA_SIN_ASIGNAR)
        ? categoriaActiva : null,
      fechaCreacion: ahora,
      fechaActualizacion: ahora,
    });
    setDrawerAbierto(true);
  };

  const abrirEditar = (mat) => {
    setMaterialEditando(mat);
    setDrawerAbierto(true);
  };

  const cerrarDrawer = () => {
    setDrawerAbierto(false);
    setMaterialEditando(null);
  };

  const guardarMaterial = (data) => {
    const existe = materiales.some(m => m.id === data.id);
    const nuevos = existe
      ? materiales.map(m => m.id === data.id ? data : m)
      : [...materiales, data];
    // 3er arg: el material guardado. El handler de App aplica
    // single-default-por-tipo si data.esDefault === true.
    onSave(nuevos, undefined, data);
    cerrarDrawer();
  };

  const eliminarMaterial = (id) => {
    const nuevos = materiales.filter(m => m.id !== id);
    onSave(nuevos);
    cerrarDrawer();
  };

  const eliminarDesdeCard = (id) => {
    const mat = materiales.find(m => m.id === id);
    if (!window.confirm(`¿Eliminar "${mat?.nombre || mat?.codigo || "este material"}"?`)) return;
    onSave(materiales.filter(m => m.id !== id));
  };

  const crearCategoria = (cat) => {
    onSave(materiales, [...categorias, cat]);
  };

  const eliminarCategoria = (id) => {
    const nuevosMats = materiales.map(m => m.categoria === id ? { ...m, categoria: null } : m);
    const nuevasCats = categorias.filter(c => c.id !== id);
    onSave(nuevosMats, nuevasCats);
    if (categoriaActiva === id) setCategoriaActiva(CATEGORIA_TODOS);
  };

  const btnPagStyle = {
    padding: "4px 10px", borderRadius: 5, border: "1px solid var(--border)",
    background: "transparent", color: "var(--text-muted)", cursor: "pointer",
    fontFamily: M, fontSize: 12, fontWeight: 700, transition: "all 0.12s",
  };

  const PaginacionControls = ({ pag, total, onChange }) => {
    if (total <= 1) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
        <button onClick={() => onChange(Math.max(0, pag - 1))} disabled={pag === 0}
          style={{ ...btnPagStyle, opacity: pag === 0 ? 0.3 : 1 }}>‹</button>
        {Array.from({ length: total }, (_, i) => (
          <button key={i} onClick={() => onChange(i)} style={{
            ...btnPagStyle, minWidth: 30,
            background: pag === i ? "var(--accent)" : "transparent",
            color: pag === i ? "#000" : "var(--text-muted)",
            borderColor: pag === i ? "var(--accent)" : "var(--border)",
          }}>{i + 1}</button>
        ))}
        <button onClick={() => onChange(Math.min(total - 1, pag + 1))} disabled={pag === total - 1}
          style={{ ...btnPagStyle, opacity: pag === total - 1 ? 0.3 : 1 }}>›</button>
      </div>
    );
  };

  // ── Render de cards ─────────────────────────────────────────────────────
  const renderCard = (grupo) => (
    <MaterialCard
      key={grupo.key}
      variantes={grupo.variantes}
      categoriaPorId={categoriaPorId}
      onEditar={abrirEditar}
      onEliminar={eliminarDesdeCard}
    />
  );

  const grid = (grupos) => (
    <div className="materiales-grid" style={{
      display: "grid",
      gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
      gap: 10,
    }}>
      {grupos.map(renderCard)}
    </div>
  );

  return (
    <div style={{
      display: "flex",
      background: "var(--bg-base)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      overflow: "hidden",
      minHeight: 480,
    }}>
      <MaterialesSidebar
        categorias={categorias}
        counts={counts}
        categoriaActiva={categoriaActiva}
        onSelectCategoria={setCategoriaActiva}
        onCrearCategoria={crearCategoria}
        onEliminarCategoria={eliminarCategoria}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <MaterialSearchToolbar
          query={query}
          onQueryChange={setQuery}
          orden={orden}
          onOrdenChange={setOrden}
          vista={vista}
          onVistaChange={setVistaUser}
          resultadosCount={gruposFiltrados.length}
          onNuevo={abrirCrear}
        />

        <div style={{ flex: 1, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {enCategoriaActiva.length === 0 ? (
            <div style={{
              padding: "60px 20px", textAlign: "center", fontSize: 12, fontFamily: M,
              color: "var(--text-muted)",
              border: "1px dashed var(--border)", borderRadius: 8,
            }}>
              {query
                ? `Sin resultados para "${query}"`
                : materiales.length === 0
                  ? "No hay materiales cargados. Cliqueá + Nuevo material para empezar."
                  : "No hay materiales en esta categoría"}
            </div>
          ) : vista === "agrupada" && agrupadosGrupos && categoriaActiva !== CATEGORIA_TODOS ? (
            // Vista agrupada: paginación por categoría
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {[...agrupadosGrupos.entries()].map(([cid, grupos]) => {
                if (grupos.length === 0) return null;
                const c = cid === CATEGORIA_SIN_ASIGNAR
                  ? { nombre: "Sin categoría", color: "var(--text-muted)" }
                  : categoriaPorId.get(cid);
                if (!c) return null;
                const pag = paginasPorCat[cid] || 0;
                const totalPag = Math.ceil(grupos.length / POR_PAGINA);
                const slice = grupos.slice(pag * POR_PAGINA, (pag + 1) * POR_PAGINA);
                return (
                  <div key={cid}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontFamily: M, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.10em" }}>
                        {c.nombre}
                      </span>
                      <span style={{ fontSize: 10, fontFamily: M, color: "var(--text-muted)" }}>
                        ({grupos.length})
                      </span>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>
                    {grid(slice)}
                    <PaginacionControls
                      pag={pag}
                      total={totalPag}
                      onChange={n => setPaginasPorCat(prev => ({ ...prev, [cid]: n }))}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            // Vista plana: paginada
            <>
              <div style={{ flex: 1 }}>{grid(gruposPagina)}</div>
              <PaginacionControls
                pag={pagina}
                total={totalPaginas}
                onChange={setPagina}
              />
            </>
          )}
        </div>
      </div>

      <MaterialEditorDrawer
        abierto={drawerAbierto}
        material={materialEditando}
        categorias={categorias}
        onClose={cerrarDrawer}
        onSave={guardarMaterial}
        onEliminar={materialEditando?.id && materiales.some(m => m.id === materialEditando.id) ? eliminarMaterial : null}
      />
    </div>
  );
}
