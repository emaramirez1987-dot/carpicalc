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

import React, { useState, useMemo, useDeferredValue } from "react";
import MaterialesSidebar from "./MaterialesSidebar.jsx";
import MaterialSearchToolbar from "./MaterialSearchToolbar.jsx";
import MaterialEditorDrawer from "./MaterialEditorDrawer.jsx";
import MaterialCard from "./MaterialCard.jsx";
import {
  useMaterialesFilter,
  CATEGORIA_TODOS, CATEGORIA_SIN_ASIGNAR,
} from "./useMaterialesFilter.js";
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

  // Auto-default vista: agrupada si hay categorías, plana si no
  const vista = vistaUser || (categorias.length > 0 ? "agrupada" : "plana");

  // Drawer state
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [materialEditando, setMaterialEditando] = useState(null);

  const { enCategoriaActiva, agrupados, counts } = useMaterialesFilter({
    materiales, categorias, query: queryDeferred, categoriaActiva, vista, orden,
  });

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
    onSave(nuevos);
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

  // ── Render de cards ─────────────────────────────────────────────────────
  const renderCard = (mat) => (
    <MaterialCard
      key={mat.id}
      mat={mat}
      categoria={mat.categoria ? categoriaPorId.get(mat.categoria) || null : null}
      onEditar={() => abrirEditar(mat)}
      onEliminar={() => eliminarDesdeCard(mat.id)}
    />
  );

  const grid = (items) => (
    <div className="materiales-grid" style={{
      display: "grid",
      gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
      gap: 10,
    }}>
      {items.map(renderCard)}
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
          resultadosCount={enCategoriaActiva.length}
          onNuevo={abrirCrear}
        />

        <div style={{ flex: 1, padding: 14, overflowY: "auto" }}>
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
          ) : vista === "agrupada" && agrupados ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {[...agrupados.entries()].map(([cid, items]) => {
                if (items.length === 0) return null;
                const c = cid === CATEGORIA_SIN_ASIGNAR
                  ? { nombre: "Sin categoría", color: "var(--text-muted)" }
                  : categoriaPorId.get(cid);
                if (!c) return null;
                return (
                  <div key={cid}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
                    }}>
                      <span style={{
                        width: 9, height: 9, borderRadius: "50%",
                        background: c.color, flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: 10, fontFamily: M, fontWeight: 700,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase", letterSpacing: "0.10em",
                      }}>
                        {c.nombre}
                      </span>
                      <span style={{
                        fontSize: 10, fontFamily: M, color: "var(--text-muted)",
                      }}>
                        ({items.length})
                      </span>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>
                    {grid(items)}
                  </div>
                );
              })}
            </div>
          ) : (
            grid(enCategoriaActiva)
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
