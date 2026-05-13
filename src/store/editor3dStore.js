// ════════════════════════════════════════════════════════════════════════════
// editor3dStore.js — contrato del store del editor 3D paramétrico
// ════════════════════════════════════════════════════════════════════════════
//
// Este archivo define EL CONTRATO del estado del editor 3D. No incluye
// implementación de mutaciones ni elige Zustand vs Context — esas
// decisiones se toman al construir el editor real.
//
// Lo que sí define:
//   • Forma del estado (JSDoc + EDITOR3D_STORE_DEFAULT)
//   • Helpers puros de history (testables, agnósticos del backend)
//
// REGLA: este archivo NO importa React, three.js ni nada del DOM.
// Solo exporta tipos, defaults y funciones puras.
//
// Versionado: el schema puede crecer. Nuevos campos van con su default
// para no romper consumidores existentes.
// ════════════════════════════════════════════════════════════════════════════

// ── Sub-tipos ────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Snap
 * @property {boolean} enabled  Snap global on/off
 * @property {boolean} toGrid   Snap a la grilla
 * @property {boolean} toVertex Snap a esquinas de otras piezas
 * @property {boolean} toEdge   Snap a aristas
 * @property {boolean} toFace   Snap a caras
 * @property {number}  gridSize Tamaño de la grilla en mm
 * @property {number}  angle    Snap angular en grados (rotación)
 */

/**
 * @typedef {Object} LockedAxes
 * @property {boolean} x
 * @property {boolean} y
 * @property {boolean} z
 */

/**
 * @typedef {Object} CuttingPlane
 * @property {"x"|"y"|"z"} axis
 * @property {number}      position  En mm desde el origen
 */

/**
 * @typedef {Object} Medicion
 * @property {string}  id
 * @property {[number,number,number]} p1
 * @property {[number,number,number]} p2
 * @property {string=} label
 */

/**
 * @typedef {Object} TransformOverride
 * @property {{x:number,y:number,z:number}=} offset3d  Desplazamiento en mm
 * @property {number=} rot3d                          Rotación Y en grados
 */

/**
 * @typedef {Object} ContextoEditor
 * @property {string} presupuestoId
 * @property {string} itemId
 */

/**
 * @typedef {Object} HistorySnapshot
 * @property {Object} modulo
 * @property {Object} parametros
 * @property {Object} transformOverrides
 * @property {number} timestamp
 */

/**
 * @typedef {("select"|"translate"|"rotate"|"scale"|"measure"|"section"|"param")} ActiveTool
 */

// ── Estado principal ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} Editor3DState
 *
 * Contexto:
 * @property {ContextoEditor|null} contexto       Qué presupuesto/item se edita
 * @property {Object|null}         modulo         Módulo en edición
 * @property {Object|null}         moduloSnapshot Copia al abrir (para revertir/diff)
 * @property {Object}              parametros     { [paramId]: valor }
 * @property {boolean}             dirty          Cambios sin guardar
 * @property {("mm"|"cm"|"in")}    unidad
 *
 * Selección (multi):
 * @property {string[]} selectedPiezaIds
 * @property {string[]} selectedParametroIds
 *
 * Herramienta activa:
 * @property {ActiveTool} activeTool
 *
 * Snapping y restricciones:
 * @property {Snap}       snap
 * @property {LockedAxes} lockedAxes
 *
 * Cámara y visualización:
 * @property {("perspective"|"front"|"top"|"side"|null)} cameraPreset
 * @property {("perspective"|"orthographic")}            cameraProjection
 * @property {("solid"|"wireframe"|"xray")}              renderMode
 * @property {number}                                    explodeFactor   0..1
 * @property {Object<string,boolean>}                    piezasOcultas
 * @property {CuttingPlane|null}                         cuttingPlane
 *
 * Transforms manuales por pieza:
 * @property {Object<string,TransformOverride>} transformOverrides
 *
 * Mediciones y notas:
 * @property {Medicion[]}            mediciones
 * @property {Object<string,string>} notas
 *
 * Clipboard interno:
 * @property {Object|null} clipboard
 *
 * Persistencia:
 * @property {boolean}     isSaving
 * @property {string|null} saveError
 *
 * Validación:
 * @property {Object<string,string>} validationErrors    Errores de parámetros
 * @property {string[]}              engineErrors         Errores al evaluar geometría
 * @property {Array<{piezaId:string, tipo:string, mensaje:string}>} fabricacionWarnings
 *
 * Historial:
 * @property {HistorySnapshot[]} history
 * @property {number}            historyIndex     -1 = sin historial
 * @property {number}            maxHistorySize
 */

// ── Defaults ─────────────────────────────────────────────────────────────────

/** @type {Editor3DState} */
export const EDITOR3D_STORE_DEFAULT = {
  // Contexto
  contexto:        null,
  modulo:          null,
  moduloSnapshot:  null,
  parametros:      {},
  dirty:           false,
  unidad:          "mm",

  // Selección
  selectedPiezaIds:     [],
  selectedParametroIds: [],

  // Herramienta
  activeTool: "select",

  // Snapping
  snap: {
    enabled:  true,
    toGrid:   true,
    toVertex: true,
    toEdge:   false,
    toFace:   false,
    gridSize: 10,
    angle:    15,
  },
  lockedAxes: { x: false, y: false, z: false },

  // Cámara y visualización
  cameraPreset:     "perspective",
  cameraProjection: "perspective",
  renderMode:       "solid",
  explodeFactor:    0,
  piezasOcultas:    {},
  cuttingPlane:     null,

  // Transforms
  transformOverrides: {},

  // Mediciones y notas
  mediciones: [],
  notas:      {},

  // Clipboard
  clipboard: null,

  // Persistencia
  isSaving:  false,
  saveError: null,

  // Validación
  validationErrors:    {},
  engineErrors:        [],
  fabricacionWarnings: [],

  // Historial
  history:        [],
  historyIndex:   -1,
  maxHistorySize: 50,
};

// ── Helpers puros de history ─────────────────────────────────────────────────
//
// Funciones puras: reciben estado, retornan estado nuevo. Ninguna toca
// React ni dispatch. Sirven igual desde Zustand, useReducer o tests.

/**
 * Crea un snapshot del estado actual del módulo en edición.
 * @param {Editor3DState} state
 * @returns {HistorySnapshot}
 */
export function snapshotFromState(state) {
  return {
    modulo:             state.modulo,
    parametros:         state.parametros,
    transformOverrides: state.transformOverrides,
    timestamp:          Date.now(),
  };
}

/**
 * Apila un snapshot en la history. Trunca el "redo tail" y respeta
 * maxHistorySize descartando los más viejos.
 * @param {Editor3DState} state
 * @param {HistorySnapshot} snapshot
 * @returns {{history: HistorySnapshot[], historyIndex: number}}
 */
export function pushHistory(state, snapshot) {
  // Trunca cualquier "redo tail" (entradas posteriores al index actual)
  const base = state.history.slice(0, state.historyIndex + 1);
  const next = [...base, snapshot];

  // Respeta maxHistorySize tirando los más viejos
  const overflow = next.length - state.maxHistorySize;
  const trimmed  = overflow > 0 ? next.slice(overflow) : next;

  return {
    history:      trimmed,
    historyIndex: trimmed.length - 1,
  };
}

/**
 * Calcula si se puede deshacer.
 * @param {Editor3DState} state
 * @returns {boolean}
 */
export function canUndo(state) {
  return state.historyIndex > 0;
}

/**
 * Calcula si se puede rehacer.
 * @param {Editor3DState} state
 * @returns {boolean}
 */
export function canRedo(state) {
  return state.historyIndex < state.history.length - 1;
}

// ── Notas de implementación ──────────────────────────────────────────────────
//
// Cuando se construya el editor real, este store se materializa en uno de:
//
//   A) Zustand (recomendado si el editor crece) — un slice por área
//      (selección, snap, history, etc.) compartiendo este shape.
//
//   B) useReducer + Context — si el editor queda chico y aislado.
//
// La decisión se toma al construir el componente raíz del editor.
// Los helpers de este archivo (snapshotFromState, pushHistory, canUndo,
// canRedo) sirven igual para ambas implementaciones.
