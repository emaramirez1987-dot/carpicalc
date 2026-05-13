# CarpiCalc — Architecture Reference

Documento vivo. Se actualiza con cada fase de desarrollo.  
Complementa `../CLAUDE.md` (reglas de calidad y convenciones de código).

---

## Estado actual — post Fase 0

Fase 0 dejó la app lista para soportar el editor 3D paramétrico sin tocar código existente:

| Paso | Qué establece |
|---|---|
| Modelo formal del módulo | Contrato único, normalizador, `parametros[]` reservado |
| Motor 3D aislado | `visor3d/engine/` puro — sin React, sin three.js |
| Store del editor 3D | Schema completo en `store/editor3dStore.js` |
| Punto de anclaje | `AcordeonEdicionItem` — donde el editor 3D se integra |

---

## Capas y responsabilidades

```
App.js                  Estado de dominio (modulos, costos, presupuestos, perfil)
                        Handlers de persistencia. Nada más.

state/NavContext        Navegación entre vistas. Solo dispatch semántico.
state/PresupuestoContext Estado del editor activo (items, dims, adicionales).
                        No persiste. No tiene lógica de negocio.

services/               Funciones puras de dominio. Reciben datos, retornan datos.
  moduloService.js      → parsearModulo(), parsearPresupuesto()
  presupuestoService.js → crear, eliminar, cambiarEstado

store/                  Contratos de estado para futuros stores (Zustand).
  editor3dStore.js      → EDITOR3D_STORE_DEFAULT, helpers de history

utils.js                Cálculos puros. Sin estado, sin efectos.
storage.js              I/O de Supabase y localStorage. Único punto de persistencia.
constants.js            Datos de dominio: MODULO_VACIO, TIPO_MAT, ESTADOS_TRABAJO, etc.
```

**Regla de capas:** si no podés responder en cuál de estas vive el código nuevo, tiene responsabilidades mezcladas. Separalo antes de escribirlo.

---

## Regla de oro: resolución de fórmulas

**Cualquier código que necesite evaluar fórmulas o variables de un módulo DEBE usar `resolverContextoModulo(modulo, costos)` de `services/moduloService.js`.**

```js
import { resolverContextoModulo } from 'services/moduloService.js';

const { baseVars, modVars, espesor, materialDef } = resolverContextoModulo(modulo, costos);
// usar modVars con evaluarFormula(p.formula1, modVars)
```

**Reimplementar la lógica inline está PROHIBIDO.** Razón histórica: tres archivos (`corte/index.jsx`, `visor3d/buildPiezas3D.js`, `FormModulo` preview) reimplementaron el resuelvo inline y cada copia tenía bugs distintos:

- Una sola pasada → variables con dependencias en orden inverso resolvían a 0
- Spread `...variables` → una variable custom llamada `ancho` pisaba la dim base
- `?? 0` después de `evaluarFormula` → fórmulas inválidas se silenciaban a 0

Todos esos bugs se manifestaban al cambiar dimensiones. La función centralizada los resuelve todos y `resolverVariables` además rechaza colisiones con dims base con warning en consola.

**Excepción permitida:** `engine/` puede importar de `services/` siempre que la función importada sea pura (sin React, sin three.js, sin DOM). `resolverContextoModulo` cumple esa condición.

---

## Contrato formal del módulo

Definido en `constants.js → MODULO_VACIO`.

```js
{
  nombre:      string,      // obligatorio
  descripcion: string,
  categoria:   string,      // id de CATEGORIAS_DEFAULT
  material:    string,      // clave de TIPO_MAT (default cuando una pieza no tiene zona)
  dimensiones: { ancho, alto, profundidad },  // mm
  piezas:      PiezaModulo[],
  variables:   Variable[],
  herrajes:    Herraje[],   // { id, cantidad: number|string, condition?: string }
  moDeObra:    { tipo, horas },
  imagen:      base64 | null,
  tipoVisual:  string | null,

  // ── Schema paramétrico (Fase 1) ───────────────────────────────────────
  parametros:  Parametro[],   // lo que el usuario edita por instancia
  zonas:       Zona[],        // agrupación de piezas con material propio
  constraints: Constraint[],  // validaciones del módulo
}
```

### Tipos del schema paramétrico

```js
// Parametro — un input editable por el usuario en el configurador
{
  id:       string,    // identificador (válido como variable JS)
  nombre:   string,    // etiqueta UI
  tipo:     "number" | "integer" | "boolean" | "choice" | "formula",
  def:      number | boolean | string,
  min?:     number,    // number/integer
  max?:     number,    // number/integer
  opciones?:string[],  // choice
  expr?:    string,    // formula (calculado, no editable)
  unidad?:  string,
}

// Zona — agrupación de piezas con material propio (libre, definida por el autor)
//   Ejemplos típicos: cuerpo, frente, fondos, interiores, respaldo, patas
//   Una pieza apunta a su zona vía `pieza.zona`. Sin zona → hereda modulo.material.
{
  id:        string,
  nombre:    string,
  material:  string,   // clave de TIPO_MAT
  espesor?:  number,   // override opcional
}

// Constraint — validación del módulo paramétrico
{
  expr: string,  // fórmula booleana (ej: "alto >= cajones * 80")
  msg:  string,  // mensaje al usuario si expr es false
}

// Herraje — extendido con cantidad-fórmula y condition
{
  id:         number | string,
  cantidad:   number | string,  // puede ser fórmula
  condition?: string,           // herraje incluido solo si truthy
}
```

### Normalización — parsearModulo()

Todo dato crudo que entra a la app (Supabase, import JSON) pasa por `parsearModulo()` en `services/moduloService.js`.

- Retorna `null` si el dato es irrecuperable (sin nombre, sin piezas, sin dimensiones)
- Retorna el módulo normalizado si es válido: completa campos faltantes desde `MODULO_VACIO`
- Agrega `parametros: []` automáticamente si el módulo es antiguo

**Patrón:** parse, don't validate. Un módulo que salió de `parsearModulo()` siempre tiene todos los campos del contrato.

---

## Motor 3D — frontera engine / UI

```
src/components/visor3d/
├── engine/
│   └── buildPiezas3D.js     ← motor puro
├── Modulo3D.jsx             ← componente React (render)
├── VisorModulo3D.jsx        ← visor completo single-module
├── useMaterial3D.js         ← propiedades PBR
└── CamaraPresets.js         ← presets compartidos con vista3d/

src/components/vista3d/      ← escena multi-módulo (tab "Vista 3D")
├── Vista3DTab.jsx
├── Escena3DPrincipal.jsx    ← consume Modulo3D del engine
├── PanelModulos3D.jsx
└── useAutoLayout3D.js
```

### Regla de la frontera

`engine/buildPiezas3D.js` es el corazón del motor:
- **NO importa React**
- **NO importa three.js**
- Solo depende de `utils.js` (resolverDim, evaluarFormula)
- Recibe `(modulo, costos)` → retorna piezas con geometría y metadatos

Cuando el editor paramétrico agregue lógica nueva (ej: `aplicarParametros()`), va en `engine/`. Los componentes React solo consumen lo que el engine produce.

### Flujo de datos 3D

```
MODULO_VACIO + parametros[]
  → aplicarParametros()          [engine/ — futuro]
  → modulo con dims/piezas computadas
  → buildPiezas3D(modulo, costos) [engine/buildPiezas3D.js]
  → piezas[] con { size, pos, role, status, ... }
  → <Modulo3D piezas={piezas} />  [Modulo3D.jsx]
  → render en Canvas              [VisorModulo3D / Escena3DPrincipal]
```

---

## Store del editor 3D paramétrico

Definido en `store/editor3dStore.js`.

### Shape del estado

```js
{
  // Contexto
  contexto:        null,    // { presupuestoId, itemId } | null
  modulo:          null,    // Modulo en edición
  moduloSnapshot:  null,    // copia al abrir — para revertir / diff
  parametros:      {},      // { [paramId]: valor }
  dirty:           false,
  unidad:          "mm",

  // Selección (multi)
  selectedPiezaIds:     [],
  selectedParametroIds: [],

  // Herramienta activa
  activeTool: "select",
  // "select"|"translate"|"rotate"|"scale"|"measure"|"section"|"param"

  // Snapping
  snap: { enabled, toGrid, toVertex, toEdge, toFace, gridSize: 10, angle: 15 },
  lockedAxes: { x: false, y: false, z: false },

  // Cámara y visualización
  cameraPreset:     "perspective",  // | "front" | "top" | "side" | null
  cameraProjection: "perspective",  // | "orthographic"
  renderMode:       "solid",        // | "wireframe" | "xray"
  explodeFactor:    0,
  piezasOcultas:    {},
  cuttingPlane:     null,

  // Transforms manuales
  transformOverrides: {},   // { [piezaId]: { offset3d, rot3d } }

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
}
```

### Helpers de history (puros)

```js
snapshotFromState(state)       → HistorySnapshot
pushHistory(state, snapshot)   → { history, historyIndex }
canUndo(state)                 → boolean
canRedo(state)                 → boolean
```

### Plan de implementación — Zustand vs Context

**Decisión diferida.** El contrato (shape + helpers) es agnóstico.

- **Zustand** (recomendado si el editor tiene más de 3-4 componentes consumiendo el store, o si hay actualizaciones de alta frecuencia como drag)
- **useReducer + Context** (suficiente si el editor queda chico y aislado)

La decisión se toma al construir el componente raíz del editor. Los helpers de `editor3dStore.js` sirven igual para ambas opciones.

**Migración de App.js a Zustand** (cuando llegue):
- `modulos`, `costos`, `presupuestos` → slices de Zustand
- `PresupuestoContext` → slice del presupuesto activo
- App.js queda solo como layout raíz (sin estado de dominio)

---

## Punto de anclaje del editor 3D

`src/components/presupuesto/AcordeonEdicionItem.jsx`

Es el panel de nivel 2 que se expande bajo cada ítem del presupuesto. Hoy muestra dims + material. El editor 3D paramétrico se integra aquí.

**Opciones de integración (a decidir en Fase 1):**

```
A) Reemplazar el panel completo
   AcordeonEdicionItem → EditorParametrico3D

B) Extender con una pestaña nueva
   Tabs: [Dimensiones] [3D Paramétrico]

C) Abrir el editor en overlay sobre el presupuesto
   AcordeonEdicionItem conserva dims básicas
   Botón "Abrir editor 3D" → overlay/drawer
```

La opción C es la más conservadora y la más fácil de iterar. La B es la más limpia si el editor es liviano. La A es la más disruptiva.

---

## Próximos pasos — Fases del editor 3D

### Fase 1 — Parámetros en el catálogo
Agregar `parametros[]` como campo editable en `FormModulo.jsx`.  
Cada parámetro: `{ id, nombre, tipo, min, max, default, formula? }`.  
El motor `buildPiezas3D` recibe los valores y los pasa al resolver de fórmulas.

### Fase 2 — Configurador en el presupuesto
Integrar en `AcordeonEdicionItem`: panel con sliders/inputs para cada parámetro.  
Preview 3D en tiempo real usando `VisorModulo3D`.  
Guardar valores en `presupuesto.items[i].parametrosValores`.

### Fase 3 — Editor 3D completo (Zustand)
Activar el store del editor 3D con Zustand.  
Herramientas: select, translate, rotate, measure, section.  
Snapping, history, clipboard.

### Fase 4 — Validación de fabricación
`fabricacionWarnings[]` se llena desde el engine.  
Reglas: piezas más grandes que la placa estándar, corredores que no entran, etc.

---

## Decisiones registradas

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Motor puro en `engine/` sin React | Motor dentro del componente | Testeable, importable desde cualquier lugar |
| `parsearModulo` retorna objeto o null | `validarModulo` retorna boolean | Un solo paso: validar + normalizar + completar |
| `parametros[]` en el schema desde Fase 0 | Agregar después | Módulos viejos no rompen; simplemente tienen `[]` |
| `resolverContextoModulo` único punto de verdad | Reimplementar inline donde se necesite | 3 reimplementaciones produjeron 3 bugs al cambiar dimensiones |

---

## Deuda técnica registrada

| Ítem | Detalle |
|---|---|
| `modulo.variables` shape inconsistente | `parsearModulo` lo valida como `Array`, pero `FormModulo`, `corte/`, `visor3d/` y `resolverVariables` lo tratan como objeto `{ key: formula }`. Resolver: unificar a objeto en el parser y todos los callsites, o explicitar conversión. Bloquea limpieza del schema antes de Fase 6. |
| Zustand diferido | Instalar ahora | El 3D editor necesita su propio estado nuevo, no migrar App.js |
| `AcordeonEdicionItem` como archivo separado | Inline en index.jsx | Punto de integración limpio para el editor 3D |
