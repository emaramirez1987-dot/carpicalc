# CarpiCalc — Project Instructions

## Stack

React SPA · **Supabase** (Postgres + Auth, fuente de verdad) · localStorage (cache efímero/UI) · APIs serverless en `/api/` (Mercado Pago + render IA) · Vercel · `react-scripts build` (CI=true, warnings = errors)

## Architecture

```
src/
├── App.js                       # Root: orquesta estado de dominio + auth de Supabase + layout
├── lib/
│   └── supabase.js              # Cliente Supabase (auth + Postgres + RLS)
├── state/
│   ├── NavContext.jsx            # Navigation state only (useReducer, 10 acciones)
│   └── PresupuestoContext.jsx    # Active editor state (items, dims, adicionales, etc.)
├── services/
│   ├── moduloService.js          # Pure domain: parser/normalizer + paramétrico + subcomponentes
│   ├── moduloService.test.js
│   ├── presupuestoService.js     # Pure mutations: crear/eliminar/cambiarEstado/migraciones
│   └── optimizerService.js       # Optimización de corte por placa (Guillotine 2D)
├── components/
│   ├── ui/                       # Visual primitives only (Btn, Card, Badge, etc.)
│   ├── auth/                     # LoginScreen (Supabase auth)
│   ├── perfil/                   # PanelPerfil del taller
│   ├── suscripcion/              # PanelSuscripcion (Mercado Pago — Bronce/Plata/Oro)
│   ├── render/                   # Generación de renders IA con créditos
│   ├── costos/                   # Price table, waste, overhead
│   ├── catalogo/                 # FormModulo, EditorParametrico, EditorComponenteHijo,
│   │                             # VarsExplorer (con carpetas), GuiaParametricaModal, etc.
│   ├── presupuesto/              # Active editor, GestorPresupuestos, BarraTotal,
│   │                             # AcordeonEdicionItem, ConfiguradorParametrico
│   ├── vista-previa/             # PDF, WhatsApp, client approval
│   ├── corte/                    # Cut list by material
│   ├── trabajos/                 # Kanban + list tracking
│   ├── caja/                     # Payments, profitability, validity
│   ├── visor3d/                  # Visor 3D individual (catálogo) — engine puro en visor3d/engine/
│   │   └── engine/
│   │       ├── buildPiezas3D.js
│   │       └── buildPiezas3D.test.js
│   ├── vista3d/                  # Vista 3D del presupuesto (multi-módulo) + configurador en vivo
│   ├── vista-svg/                # Renderer SVG 2D del módulo
│   └── ErrorBoundary.jsx         # Captura de errores en runtime
├── utils.js               # Pure calculation functions (fórmulas + costos + SVG)
├── utils.test.js
├── storage.js             # I/O Supabase (fuente de verdad) + localStorage (cache UI)
├── constants.js           # Domain data: states, materials, defaults, MODULO_VACIO
└── hooks/
    ├── useUndo.js
    ├── useTema.js
    └── useIsMobile.js

api/                       # Functions serverless de Vercel
├── cancel-subscription.js
├── check-subscription.js
├── create-subscription.js
├── deduct-render.js
├── generate-render-gpt.js
├── generate-render.js
├── generate-scene.js
└── mp-webhook.js          # Webhook de Mercado Pago para alta/baja de planes

supabase/migrations/
└── 001_initial_schema.sql
```

## Sistema paramétrico

CarpiCálc tiene un sistema de **módulos paramétricos** — el autor define en el catálogo:
- **Parámetros** (cantidad de cajones, manija sí/no, etc.) — tipos: `number`, `integer`, `boolean`, `choice`, `formula`
- **Zonas** (agrupación de piezas con material propio)
- **Piezas con `condition` y `repeat`** (aparecen/desaparecen, se multiplican)
- **Herrajes con `cantidad`-fórmula y `condition`**
- **Constraints** (validaciones tipo "alto >= cajones * 80")
- **Subcomponentes** (mini-módulos con su propio eje local; se expanden a piezas/herrajes concretos en coords del padre)

El usuario del presupuesto cambia los parámetros desde dos lugares (panel del item · Vista 3D) y todo se recalcula en vivo (3D + costo + cortes + materiales + total).

Ver `GUIA_PARAMETRICA.md` y `src/ARCHITECTURE.md` para el detalle. La guía también está accesible en la app desde el botón **📖 Guía** del catálogo.

### Sistema de carpetas en VarsExplorer

Las variables custom del módulo (y de cada subcomponente) se pueden organizar en carpetas con nombre. Los metadatos viven en `modulo.variablesCarpetas` separado del objeto `modulo.variables` (que sigue plano para no romper las fórmulas). Forma: `{ [scopeId]: { [carpetaId]: { nombre, vars[] } } }`.

## Layer Responsibilities

| Layer | Owns | Must NOT |
|---|---|---|
| `App.js` | Estado de dominio (modulos, costos, presupuestos, perfil), sesión Supabase, layout | Business logic, nav state |
| `NavContext` | Navigation transitions only | Mutate domain data |
| `PresupuestoContext` | Estado del editor activo (items, dims, adicionales, composicionOverride, inlineModulos) | Persist directly, business logic |
| `services/` | Pure domain mutations + parser + motor paramétrico + optimizador | Call setState, dispatch |
| `utils.js` | Pure calculations + motor de fórmulas (`evaluarExpresion`, `evaluarFormula`, `calcularModulo`, `generarVistaSVG`) | State, effects, UI, localStorage |
| `storage.js` | I/O Supabase + I/O localStorage (cache) | Business logic |
| `lib/supabase.js` | Cliente Supabase singleton | Lógica de negocio |
| `components/[domain]/` | Visual + local interaction | Direct persistence |
| `components/ui/` | Visual primitives | Any logic or context |

## Persistencia

- **Supabase es la fuente de verdad** para módulos, presupuestos, perfil, suscripciones
- **localStorage** se usa solo para datos efímeros/UI:
  - `carpicalc:costos_version` — timestamp UI para detección de stale
  - `carpicalc:perfil_cache` — copia sync del perfil para `leerPerfil()` (PDFs)
  - `carpicalc:borrador` — autosave del presupuesto activo
  - `carpicalc:borrador_modulo` — estado de FormModulo entre pestañas
  - `carpicalc:roles_pieza` — roles personalizados del taller
  - `carpicalc:tema` — `"dark" | "light"`
  - `carpicalc:catalogo_vista` — `"grid" | "list"` para el catálogo
  - `carpicalc:ultimo_backup` — timestamp del último backup exportado
- `withSave` en App.js usa cola serializada (`saveQueue` + `drain`) — saves paralelos se procesan en orden
- **Validación de schema:** `storage.js` pasa los datos de Supabase por `parsearModulo`/`parsearPresupuesto` (services). Datos malformados se descartan con warning, no se cargan corruptos.
- **Estrategia de guardado:** delete-all + insert-all por workspace (app single-user, gap imperceptible).

## Key Data Flows

**Edición Nivel 3 (editar módulo del catálogo desde el presupuesto):**
```
User clicks "🔧 Editar en catálogo" en un ítem
→ crearTempDesdeModulo()        [moduloService]
→ setModulos({...prev, [tempCod]: copy, _origen: presupuestoId})
→ navega al catálogo con deepLink = tempCod
→ CatalogoModulos detecta deepLinkCodigo y abre FormModulo
→ User edita → guarda como TEMP o promueve a permanente
→ migrarTempAPermanente()  + actualizarReferenciasEnItems()  (si promueve)
→ dispatch(VOLVER_A_PRESUPUESTO)
```
> Nota: `catalogoDeepLink` y `origenEdicion` viven en el estado de NavContext y se LIMPIAN por las acciones `DEEPLINK_CONSUMIDO`, `ABRIR_CATALOGO` y `VOLVER_A_PRESUPUESTO`. Su SETEO actual ocurre fuera del reducer (App.js los lee de un origen externo y los pasa por props a CatalogoModulos). Ver "Deuda técnica registrada".

**Cost update detection:**
```
guardarModulos/guardarCostos → bumps costos_version timestamp
GestorPresupuestos render → recalcularTotalPresupuesto(p, modulos, costos)
Math.abs(calculated - p.total) > 1 → show update button
```
Detection is deterministic (real total comparison), NOT timestamp-based.

**Flujo paramétrico end-to-end:**
```
Catálogo (FormModulo + EditorParametrico + EditorComponenteHijo)
  → módulo con parametros[]/zonas[]/constraints[]/subComponentes[]
Presupuesto (AcordeonEdicionItem · ConfiguradorParametrico)
  → item.parametrosValores
Vista 3D (ConfiguradorParametrico en panel lateral)
  → mismo item.parametrosValores
calcularModulo(modulo, costos, item.parametrosValores)
  → costo, piezas y total se recalculan
buildPiezas3D(modulo, costos, item.parametrosValores)
  → render se actualiza
```

**Save queue:**
Todas las escrituras (módulos, costos, presupuestos, perfil) entran a `withSave` en App.js → encolan en `saveQueue` → `drain()` ejecuta de a una. Evita race conditions sin librerías externas.

## Critical Rules

**Code quality:**
- All warnings are build errors in CI. Zero tolerance.
- Run static analysis before every delivery (imports, unused vars, broken refs)
- Check JSX brace balance — extraction scripts can leave orphaned callback bodies
- `eslint-disable exhaustive-deps` is acceptable only to prevent infinite loops

**State:**
- Navigation state → NavContext only. Never add nav vars to App.js state.
- Domain state (modulos, costos, presupuestos) → App.js only, until domain contexts are built.
- NavContext actions must be semantic (ABRIR_EDITOR_VISTA) not generic (SET_STATE)

**Services:**
- Functions in `services/` must be pure: receive data, return data, no side effects
- Follow the pattern of `moduloService.js` y `presupuestoService.js` exactamente
- When adding domain mutation logic, always extract to a service first

**Persistencia:**
- Toda escritura al backend pasa por `storage.js`
- Componentes nunca llaman directamente a `supabase.from(...)` para escribir datos de dominio
- Lectura: usar los helpers de `storage.js` que ya hacen el parser de schema
- `guardarModulos` bumps `costos_version` — required for stale detection

**IDs:**
- Presupuesto IDs: `crypto.randomUUID()` — globally unique, Supabase-compatible
- Items dentro de presupuesto: `crypto.randomUUID()` (migración legacy → UUID en `migrarDimOverridePresupuestos`)
- TEMP codes: `TEMP_${Date.now()}` — always cleaned up on save or delete
- Permanent module codes: `MC${String(Date.now()).slice(-6)}`
- **Never use `Date.now()` as a persistent entity ID** — it's a timestamp, not an identifier

**Resolución de fórmulas (regla de oro paramétrico):**
- Cualquier código que necesite resolver fórmulas o variables de un módulo DEBE usar `resolverContextoModulo(modulo, costos, valoresParametros?)` de `services/moduloService.js`
- Reimplementar la lógica inline está PROHIBIDO. Razón: tres archivos lo hacían y cada copia tenía bugs distintos al cambiar dimensiones.

**CSS / Design:**
- Design tokens defined in `GlobalStyles` in `components/ui/index.jsx`
- Font: Playfair Display (headings) · Bricolage Grotesque (body) · DM Mono (numbers/labels)
- Dark palette: bg `#080A0D` · surface `#141720` · accent `#D4AF37`
- Always define CSS vars in both `[data-theme="dark"]` and `[data-theme="light"]`
- `--bg-nav` required for header; `anim-shake` required for login error

## NavContext Actions Reference

Las 10 acciones reales del reducer (`src/state/NavContext.jsx`):

```js
dispatch({ type: "CAMBIAR_VISTA",                payload: { vista } })
dispatch({ type: "ABRIR_CATALOGO" })
dispatch({ type: "DEEPLINK_CONSUMIDO" })
dispatch({ type: "VOLVER_A_PRESUPUESTO" })
dispatch({ type: "EDITAR_PRESUPUESTO",           payload: { id, p } })
dispatch({ type: "PRESUPUESTO_PARA_EDITAR_CONSUMIDO" })
dispatch({ type: "ABRIR_CAJA",                   payload: { presupuestoId } })
dispatch({ type: "CAJA_PRES_ID_CONSUMIDO" })
dispatch({ type: "ABRIR_EDITOR_VISTA",           payload: { cod } })
dispatch({ type: "EDITOR_VISTA_CERRADO" })
```

Estado expuesto: `vista`, `catalogoDeepLink`, `origenEdicion`, `presupuestoParaEditar`, `cajaPresId`, `editorVistaCod`, `editorVistaOrigen`.

## Presupuesto Object Shape

```js
{
  nombre: string,
  cliente: { nombre, tel, dir },
  nota: string,
  estado: "nuevo"|"enviado"|"aceptado"|"produccion"|"entregado",
  items: [{
    id, codigo, cantidad,
    parametrosValores?: { [paramId]: valor },  // sistema paramétrico
    ...
  }],
  dimOverride:         { [item.id || item.codigo]: { ancho, alto, profundidad, material? } },
  composicionOverride: { [itemKey]: {...} },              // override de composicionVisual por ítem
  inlineModulos:       { [codigo]: Modulo },              // ediciones inline solo del presupuesto
  adicionales:         [{ id, nombre, monto }],
  costosDirectos:      [{ id, tipo, refId, cantidad, precioUnit, precioManual, subtotal }],
  total:               number,
  costosVersionAl:     timestamp,                          // sync marker for stale detection
  cobros:              [{ fecha, monto, concepto }],
  costoReal:           number,
  diasVigencia:        number,
  creadoEn:            number,                             // Date.now() de la creación
}
```

## Modulo Object Shape

```js
{
  nombre, descripcion, categoria, material,
  dimensiones: { ancho, alto, profundidad },
  variables: { [name]: formula | number },        // OJO: ver "Deuda técnica" — shape ambiguo
  variablesCarpetas?: {                            // metadatos de organización en carpetas
    [scopeId]: { [carpetaId]: { nombre, vars: [...] } }
  },
  piezas: [{
    nombre, cantidad, formula1, formula2, ...,
    zona?: string,                                 // referencia a modulo.zonas[*].id
    condition?: string,                            // expr booleana — pieza solo si truthy
    repeat?: { var, from, to },                    // genera N piezas con var en contexto
    posFormulas?: { x, y, z },                     // posición exacta en coords del módulo
  }],
  herrajes: [{
    id,
    cantidad: number | string,                     // string = fórmula
    condition?: string,
  }],
  moDeObra: { tipo: "por_modulo"|"por_hora", horas },
  imagen, tipoVisual,
  // Schema paramétrico:
  parametros:    [{ id, nombre, tipo, def, min?, max?, opciones?, expr?, unidad? }],
  zonas:         [{ id, nombre, material, espesor? }],
  constraints:   [{ expr, msg }],
  subComponentes: [{                               // mini-módulos con eje local
    id, nombre,
    repeat?: { var, from, to },
    condition?: string,
    origen?: { x, y, z },                          // coords en el padre
    dimensiones: { ancho, alto, profundidad },     // LOCALES (pueden ser fórmulas)
    parametros?: [...],
    piezas: [...],                                 // en coords locales del subcomp
    herrajes?: [...],
    variables?: { [name]: formula },
    variablesCarpetas?: {...},
  }],
  temporal?: boolean,                              // true para TEMP_ (no aparecen en catálogo)
  presupuestoId?: string,                          // si temporal, qué presupuesto lo originó
}
```

## Tests existentes

```
src/utils.test.js
src/services/moduloService.test.js
src/components/visor3d/engine/buildPiezas3D.test.js
```

Cubren el motor de fórmulas, parámetros, subcomponentes y armado 3D.

## Roadmap

### Features pendientes
| Priority | Feature | Notes |
|---|---|---|
| Alta | Public budget link | Flujo de aprobación del cliente vía link público |
| Baja | Resumen mensual / m² calculator / export lista de compras | |
| Opcional | Editor 3D inmersivo Nivel 2/3 | Medir, esconder/explotar, sección · gizmos drag, snap, history. Diferido hasta que haya uso real que lo justifique. |

### Deuda técnica registrada
| Priority | Tarea | Detalle |
|---|---|---|
| Alta | `modulo.variables` shape inconsistente | El parser lo valida como `Array`, pero `FormModulo`, `corte/`, `visor3d/`, `VarsExplorer` y `resolverVariables` lo tratan como objeto `{ key: formula }`. Funciona por conversión implícita en la lectura. Unificar a objeto en parser y callsites. Documentado en `src/ARCHITECTURE.md`. |
| Alta | `catalogoDeepLink` / `origenEdicion` se setean fuera del reducer | El reducer de NavContext los LIMPIA pero no tiene acción que los SETEE. App.js los lee del estado y los pasa por props a CatalogoModulos — sin embargo, no hay un dispatch claro que los inicialice. Investigar: o son legacy, o se setean por mutación directa del state inicial / efecto. |
| Media | App.js en crecimiento (848 líneas) | Mantenibilidad a largo plazo. Mover handlers de dominio a hooks/services, sacar Header y lógica de auth a sus carpetas. |
| Baja | Estilos inline repetidos | Patrones de IconBtn / ConfirmBtn / Chip duplicados en muchos componentes. Extraer a `components/ui/`. |
| Baja | `catalogo/index.jsx` 1263 líneas, contiene 3 componentes | Partir en `CatalogoModulos.jsx`, `PanelSelectorModulos.jsx`, `EditorVistaSVG.jsx`. |

## Architecture Principles — Non-negotiable

Estas reglas existen porque aprendimos lo que pasa cuando no se siguen.
Aplican a CUALQUIER código nuevo, sin excepción.

### Single Responsibility
Cada archivo/función tiene UNA razón para cambiar.
- Si un componente maneja UI Y lógica de negocio → extraer la lógica a un service
- Si una función lee datos Y los transforma → separarla en dos
- Si App.js crece por algo que no es "orquestar estado de dominio" → está mal ubicado

### Componentes nuevos — fuera de App.js desde el día 1
**Nunca crear un componente nuevo dentro de `App.js`.** Aunque sea pequeño hoy, va a escalar.
- Componentes de autenticación → `components/auth/`
- Componentes de perfil/taller → `components/perfil/`
- Componentes de suscripción/planes → `components/suscripcion/`
- Cualquier otro dominio → `components/[dominio]/`

App.js solo orquesta: declara estado de dominio, define handlers, arma el layout raíz. Nada más.

### Dónde va el código nuevo — Protocolo de 4 preguntas

Antes de escribir cualquier función o estado, respondé estas preguntas en orden:

```
1. ¿Es lógica de navegación?          → NavContext
2. ¿Es estado del editor activo?      → PresupuestoContext (via AppInterna)
3. ¿Es mutación de datos de dominio?  → services/ (función pura)
4. ¿Es cálculo puro sin side effects? → utils.js
5. ¿Es I/O de Supabase o localStorage?→ storage.js
6. Si ninguna → estado local del componente que lo necesita
```

Si no podés responder la pregunta, el código tiene responsabilidades mezcladas.
Separalo antes de escribirlo.

### IDs de entidades persistentes
- **Siempre `crypto.randomUUID()`** para cualquier entidad que vaya a Supabase o localStorage
- Nunca `Date.now()` como ID — es un timestamp, no un identificador único global
- Nunca usar el ID para inferir fecha de creación — guardá `creadoEn: Date.now()` por separado si necesitás ese dato

### Supuestos explícitos
Cuando tomés una decisión técnica que depende de un supuesto, documentalo como comentario en el código o en este archivo. Un supuesto no documentado es deuda técnica invisible.

### Límite de props por componente
- Más de **8 props** en un componente → analizar si necesita un Context o se puede dividir
- Más de **5 setters** pasados como props → mover el estado al contexto correspondiente
- Props que empiezan con `set` pasadas 2+ niveles abajo → Context obligatorio

### Anti-patrones prohibidos
- **God Component**: ningún componente tiene más de una responsabilidad de dominio
- **`supabase.from(...)` directo en componentes**: siempre a través de `storage.js`
- **`localStorage.setItem` directo en componentes**: siempre a través de `storage.js`
- **Lógica de negocio en JSX**: extraer a función nombrada antes de renderizar
- **Estado de navegación en App.js**: siempre NavContext
- **Reimplementar resolución de fórmulas**: usar `resolverContextoModulo` siempre
- **Comentarios que explican QUÉ hace el código**: el código bien nombrado ya lo dice; comentar solo el POR QUÉ no obvio

---

## Before Every Delivery — Checklist

**Calidad de código:**
```
□ Zero unused imports
□ Zero unused variables/setters/states
□ Zero orphaned props (declared in signature but never used)
□ Zero references to deleted functions/setters
□ JSX brace balance verified
□ Static analysis passes with 0 errors, 0 warnings
□ Tests pasan (npm test -- --watchAll=false)
```

**Arquitectura (protocolo de capas):**
```
□ No `supabase.from(...)` ni `localStorage` directo fuera de storage.js
□ No navigation state added to App.js (use NavContext)
□ No editor state passed as props 2+ levels deep (use PresupuestoContext)
□ No domain logic added to components (extract to services/)
□ No new persistent entity uses Date.now() as ID (use crypto.randomUUID())
□ No reimplementación inline de resolución de fórmulas (usar resolverContextoModulo)
□ New code answers the "4 preguntas" del protocolo de capas
```

**CSS / Design:**
```
□ CSS vars used in component exist in GlobalStyles (both themes)
□ No hardcoded colors — use CSS variables
```
