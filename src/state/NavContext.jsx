import React, { createContext, useContext, useReducer } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Estado inicial — representa el estado de navegación en reposo
// ─────────────────────────────────────────────────────────────────────────────
const estadoInicial = {
  vista:                    "presupuesto", // pestaña activa
  catalogoDeepLink:         null,          // código del módulo a abrir en catálogo (usado por DEEPLINK_CONSUMIDO)
  origenEdicion:            null,          // contexto del catálogo: tipo, presupuestoId (lectura en App.js)
  presupuestoVistaPreviaId: null,          // presupuesto seleccionado en Vista Previa
  presupuestoParaEditar:    null,          // { id, p } — puente para cargar presupuesto en editor
  cajaPresId:               null,          // presupuesto a abrir automáticamente en Caja
  editorVistaCod:           null,          // código del módulo abierto en EditorVistaSVG
  editorVistaOrigen:        null,          // vista desde donde se abrió el editor (para volver)
};

// ─────────────────────────────────────────────────────────────────────────────
// Reducer — cada case describe una transición de navegación real y concreta.
// Reglas de diseño:
//   1. Acciones semánticas — describen intención, no mutación
//   2. Cada case resuelve su transición de forma atómica
//   3. Los retornos son siempre objetos completos — nunca mutación parcial implícita
// ─────────────────────────────────────────────────────────────────────────────
function navReducer(estado, accion) {
  switch (accion.type) {

    // Cambio simple de pestaña — sin contexto adicional
    case "CAMBIAR_VISTA":
      return { ...estado, vista: accion.payload.vista };

    // Usuario abre catálogo directamente desde el menú — sin deep link ni retorno
    case "ABRIR_CATALOGO":
      return {
        ...estado,
        vista:             "catalogo",
        catalogoDeepLink:  null,
        origenEdicion:     null,
      };

    // CatalogoModulos consumió el deep link — abrió el formulario.
    // Limpiamos para que no se re-dispare en re-renders.
    case "DEEPLINK_CONSUMIDO":
      return { ...estado, catalogoDeepLink: null };

    // Retorno limpio al presupuesto desde cualquier flujo de edición.
    // Garantiza que no queden estados de navegación colgados.
    case "VOLVER_A_PRESUPUESTO":
      return {
        ...estado,
        vista:            "presupuesto",
        catalogoDeepLink: null,
        origenEdicion:    null,
      };

    // Abrir un presupuesto específico en Vista Previa
    case "ABRIR_VISTA_PREVIA":
      return {
        ...estado,
        vista:                    "preview",
        presupuestoVistaPreviaId: accion.payload.presupuestoId,
      };

    // Seleccionar qué presupuesto mostrar dentro de Vista Previa (sin cambiar vista)
    case "SELECCIONAR_PRESUPUESTO_PREVIEW":
      return { ...estado, presupuestoVistaPreviaId: accion.payload.presupuestoId };

    // Cargar un presupuesto en el editor y navegar a la pestaña Presupuesto.
    // presupuestoParaEditar actúa como puente — Presupuesto lo consume y lo limpia.
    case "EDITAR_PRESUPUESTO":
      return {
        ...estado,
        vista:                 "presupuesto",
        presupuestoParaEditar: accion.payload,  // { id, p }
      };

    // Presupuesto consumió el puente — limpiarlo para que no se re-dispare
    case "PRESUPUESTO_PARA_EDITAR_CONSUMIDO":
      return { ...estado, presupuestoParaEditar: null };

    // Navegar a Caja con un presupuesto específico pre-abierto
    case "ABRIR_CAJA":
      return {
        ...estado,
        vista:      "caja",
        cajaPresId: accion.payload.presupuestoId,
      };

    // Caja consumió el autoAbrir — limpiar para que no se re-dispare
    case "CAJA_PRES_ID_CONSUMIDO":
      return { ...estado, cajaPresId: null };

    // Abrir editor visual de frente de un módulo
    case "ABRIR_EDITOR_VISTA":
      return { ...estado, vista: "editor_vista", editorVistaCod: accion.payload.cod, editorVistaOrigen: estado.vista };

    // Cerrar editor visual y volver al origen (catálogo o presupuesto)
    case "EDITOR_VISTA_CERRADO":
      return { ...estado, vista: estado.editorVistaOrigen || "catalogo", editorVistaCod: null, editorVistaOrigen: null };

    default:
      if (process.env.NODE_ENV === "development") {
        console.warn(`[NavContext] Acción desconocida: "${accion.type}"`);
      }
      return estado;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contexto y Provider
// ─────────────────────────────────────────────────────────────────────────────
const NavContext = createContext(null);

export function NavProvider({ children }) {
  const [nav, dispatch] = useReducer(navReducer, estadoInicial);
  return (
    <NavContext.Provider value={{ nav, dispatch }}>
      {children}
    </NavContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook público — los componentes solo ven nav y dispatch, nunca el contexto crudo
// ─────────────────────────────────────────────────────────────────────────────
export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) {
    throw new Error("useNav() debe usarse dentro de <NavProvider>. " +
                    "Asegurate de que el componente esté dentro del árbol de NavProvider.");
  }
  return ctx;
}
