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
│   ├── NavContext.jsx            # Navigation state only (useReducer, 12 semantic actions)
│   └── PresupuestoContext.jsx    # Active editor state (items, dims, adicionales, etc.)
├── services/
│   ├── moduloService.js          # Pure domain: parser/normalizer + parametrico (Fase 1-5)
│   ├── moduloService.test.js
│   ├── presupuestoService.js     # Pure mutations: crear/eliminar/cambiarEstado/migraciones
│   └── optimizerService.js       # Optimización de corte por placa
├── components/
│   ├── ui/                       # Visual primitives only (Btn, Card, Badge, etc.)
│   ├── auth/                     # LoginScreen (Supabase auth)
│   ├── perfil/                   # PanelPerfil del taller
│   ├── suscripcion/              # PanelSuscripcion (Mercado Pago — Bronce/Plata/Oro)
│   ├── render/                   # Generación de renders IA con créditos
│   ├── costos/                   # Price table, waste, overhead
│   ├── catalogo/                 # FormModulo, EditorParametrico, GuiaParametricaModal, PanelSelector
│   ├── presupuesto/              # Active editor, GestorPresupuestos, BarraTotal,
│   │                             # AcordeonEdicionItem, ConfiguradorParametrico (Fase 7)
│   ├── vista-previa/             # PDF, WhatsApp, client approval
│   ├── corte/                    # Cut list by material
│   ├── trabajos/                 # Kanban + list tracking
│   ├── caja/                     # Payments, profitability, validity
│   ├── visor3d/                  # Visor 3D individual (catálogo) — engine puro en visor3d/engine/
│   ├── vista3d/                  # Vista 3D del presupuesto (multi-módulo) + configurador en vivo
│   ├── vista-svg/                # Renderer SVG 2D del módulo
│   └── ErrorBoundary.jsx         # Captura de errores en runtime
├── utils.js               # Pure calculation functions (fórmulas + costos)
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

supabase/migrations/        # Schema SQL versionado
└── 001_initial_schema.sql
```

## Sistema paramétrico

CarpiCálc tiene un sistema de **módulos paramétricos** — el autor define en el catálogo:
- **Parámetros** (cantidad de cajones, manija sí/no, etc.)
- **Zonas** (agrupación de piezas con material propio)
- **Piezas con `condition` y `repeat`** (aparecen/desaparecen, se multiplican)
- **Herrajes con `cantidad`-fórmula y `condition`**
- **Constraints** (validaciones)

El usuario del presupuesto cambia los parámetros desde dos lugares (panel del item · Vista 3D) y todo se recalcula en vivo (3D + costo + cortes + materiales + total).

Ver `GUIA_PARAMETRICA.md` y `src/ARCHITECTURE.md` para el detalle. La guía también está accesible en la app desde el botón **📖 Guía** del catálogo.

## Layer Responsibilities

| Layer | Owns | Must NOT |
|---|---|---|
| `App.js` | Estado de dominio (modulos, costos, presupuestos, perfil), sesión Supabase, layout | Business logic, nav state |
| `NavContext` | Navigation transitions only | Mutate domain data |
| `PresupuestoContext` | Estado del editor activo (items, dims, adicionales) | Persist directly, business logic |
| `services/` | Pure domain mutations + parser + motor paramétrico | Call setState, dispatch |
| `utils.js` | Pure calculations + motor de fórmulas (`evaluarExpresion`, `evaluarFormula`, `calcularModulo`) | State, effects, UI, localStorage |
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
  - `carpicalc:ultimo_backup` — timestamp del último backup exportado
- `withSave` usa cola serializada (`saveQueue` + `drain`) — saves paralelos se procesan en orden
- **Validación de schema:** `storage.js` pasa los datos de Supabase por `parsearModulo`/`parsearPresupuesto` (services). Datos malformados se descartan con warning, no se cargan corruptos.

## Key Data Flows

**TEMP flow (Nivel 3 editing):**
```
User clicks ✎ on item
→ crearTempDesdeModulo()        [moduloService]
→ setModulos({...prev, [tempCod]: copy})
→ onVerCatalogo(tempCod, ctx)
→ dispatch(INICIAR_EDICION_NIVEL3)  [NavContext: sets pendingDeepLink]
→ useEffect in Presupuesto detects modulos[tempCod] exists
→ dispatch(DEEPLINK_LISTO)          [NavContext: vista=catalogo]
→ User edits → saves
→ migrarTempAPermanente()       [moduloService]
→ actualizarReferenciasEnItems() [moduloService]
→ dispatch(VOLVER_A_PRESUPUESTO)
```

**Cost update detection:**
```
guardarModulos/guardarCostos → bumps costos_version timestamp
GestorPresupuestos render → recalcularTotalPresupuesto(p, modulos, costos)
Math.abs(calculated - p.total) > 1 → show update button
```
Detection is deterministic (real total comparison), NOT timestamp-based.

**Flujo paramétrico end-to-end:**
```
Catálogo (FormModulo + EditorParametrico) → módulo con parametros[]/zonas[]/constraints[]
Presupuesto (AcordeonEdicionItem · ConfiguradorParametrico) → item.parametrosValores
Vista 3D (ConfiguradorParametrico en panel lateral) → mismo item.parametrosValores
calcularModulo(modulo, costos, item.parametrosValores) → costo, piezas y total se recalculan
buildPiezas3D(modulo, costos, item.parametrosValores) → render se actualiza
```

## Critical Rules

**Code quality:**
- All warnings are build errors in CI. Zero tolerance.
- Run static analysis before every delivery (imports, unused vars, broken refs)
- Check JSX brace balance — extraction scripts can leave orphaned callback bodies
- `eslint-disable exhaustive-deps` is acceptable only to prevent infinite loops

**State:**
- Navigation state → NavContext only. Never add nav vars to App.js state.
- Domain state (modulos, costos, presupuestos) → App.js only, until domain contexts are built.
- NavContext actions must be semantic (ABRIR_VISTA_PREVIA) not generic (SET_STATE)

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

```js
dispatch({ type: "CAMBIAR_VISTA",                payload: { vista } })
dispatch({ type: "ABRIR_CATALOGO" })
dispatch({ type: "INICIAR_EDICION_NIVEL3",       payload: { cod, contexto } })
dispatch({ type: "DEEPLINK_LISTO",               payload: { cod, contexto } })
dispatch({ type: "DEEPLINK_CONSUMIDO" })
dispatch({ type: "VOLVER_A_PRESUPUESTO" })
dispatch({ type: "ABRIR_VISTA_PREVIA",           payload: { presupuestoId } })
dispatch({ type: "SELECCIONAR_PRESUPUESTO_PREVIEW", payload: { presupuestoId } })
dispatch({ type: "EDITAR_PRESUPUESTO",           payload: { id, p } })
dispatch({ type: "PRESUPUESTO_PARA_EDITAR_CONSUMIDO" })
dispatch({ type: "ABRIR_CAJA",                  payload: { presupuestoId } })
dispatch({ type: "CAJA_PRES_ID_CONSUMIDO" })
```

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
  dimOverride: { [codigo-id]: { ancho, alto, profundidad, material? } },
  adicionales: [{ id, nombre, monto }],
  costosDirectos: [{ id, tipo, refId, cantidad, precioUnit, precioManual, subtotal }],
  total: number,
  costosVersionAl: timestamp,  // sync marker for stale detection
  cobros: [{ fecha, monto, concepto }],
  costoReal: number,
  diasVigencia: number,
}
```

## Modulo Object Shape (con paramétrico)

```js
{
  nombre, descripcion, categoria, material,
  dimensiones: { ancho, alto, profundidad },
  variables: { [name]: formula | number },
  piezas: [{
    nombre, cantidad, formula1, formula2, ...,
    zona?: string,                                // Fase 4
    condition?: string,                           // Fase 3
    repeat?: { var, from, to },                   // Fase 3
  }],
  herrajes: [{
    id,
    cantidad: number | string,                    // string = fórmula (Fase 5)
    condition?: string,                           // Fase 5
  }],
  moDeObra: { tipo, horas },
  imagen, tipoVisual,
  // Schema paramétrico (Fase 1):
  parametros: [{ id, nombre, tipo, def, min?, max?, opciones?, expr?, unidad? }],
  zonas:      [{ id, nombre, material, espesor? }],
  constraints:[{ expr, msg }],
}
```

## Roadmap

### Features pendientes
| Priority | Feature | Notes |
|---|---|---|
| Alta | Public budget link | Flujo de aprobación del cliente vía link público |
| Baja | Resumen mensual / m² calculator / export lista de compras | |
| Opcional | Editor 3D inmersivo Nivel 2/3 | Medir, esconder/explotar, sección · gizmos drag, snap, history. Plan paramétrico Fase 8 lo dejó como diferido — solo si se justifica con uso real. |

### Deuda técnica registrada
| Priority | Tarea | Detalle |
|---|---|---|
| Media | `modulo.variables` shape inconsistente | El parser lo valida como `Array`, pero `FormModulo`, `corte/`, `visor3d/` y `resolverVariables` lo tratan como objeto `{ key: formula }`. Unificar a objeto en parser y callsites. Documentado en `src/ARCHITECTURE.md`. |

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
