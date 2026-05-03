# CarpiCalc — Project Instructions

## ⚠ WORKTREE ACTIVO — Leer esto primero

El dev server siempre corre desde el worktree, NO desde el repo principal.

**Antes de cualquier Read o Edit, verificar la ruta:**
- ✅ CORRECTO: `carpicalc/.claude/worktrees/ecstatic-dubinsky-8ba8e5/src/...`
- ❌ INCORRECTO: `carpicalc/src/...`

Si editás el repo principal (`carpicalc/src/`), el dev server no ve los cambios.
**Regla:** Abrir archivos desde el worktree, editar en el worktree, commitear en el worktree.
Al terminar: merge worktree → main → push.

---

## Stack
React SPA · Vercel · localStorage · `react-scripts build` (CI=true, warnings = errors)

## Architecture

```
src/
├── App.js                      # Root: domain state + persistence handlers + layout
├── state/
│   ├── NavContext.jsx           # Navigation state only (useReducer, 12 semantic actions)
│   └── PresupuestoContext.jsx   # Active editor state (items, dims, adicionales, etc.)
├── services/
│   ├── moduloService.js         # Pure domain logic: TEMP lifecycle, migration, cleanup
│   └── presupuestoService.js    # Pure domain mutations: crear, eliminar, cambiarEstado
├── components/
│   ├── ui/                      # Visual primitives only (Btn, Card, Badge, etc.)
│   ├── costos/                  # Price table, waste, overhead
│   ├── catalogo/                # Parametric modules, FormModulo, PanelSelector
│   ├── presupuesto/             # Active editor, GestorPresupuestos, BarraTotal
│   ├── vista-previa/            # PDF, WhatsApp, client approval
│   ├── corte/                   # Cut list by material
│   ├── trabajos/                # Kanban + list tracking
│   └── caja/                    # Payments, profitability, validity
├── utils.js               # Pure calculation functions (no state, no effects)
├── storage.js             # localStorage I/O only — single door to persistence
├── constants.js           # Domain data: states, materials, defaults
└── hooks/useUndo.js · useTema.js
```

## Layer Responsibilities

| Layer | Owns | Must NOT |
|---|---|---|
| `App.js` | Domain state, persistence handlers | Business logic, nav state |
| `NavContext` | Navigation transitions only | Mutate domain data |
| `PresupuestoContext` | Active editor state (items, dims, adicionales) | Persist directly, business logic |
| `services/` | Pure domain mutations | Call setState, dispatch |
| `utils.js` | Pure calculations | State, effects, UI, localStorage |
| `storage.js` | localStorage I/O + leerPerfil() | Business logic |
| `components/[domain]/` | Visual + local interaction | Direct persistence |
| `components/ui/` | Visual primitives | Any logic or context |

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
guardarModulos/guardarCostos → persists costos_version timestamp
GestorPresupuestos render → recalcularTotalPresupuesto(p, modulos, costos)
Math.abs(calculated - p.total) > 1 → show update button
```
Detection is deterministic (real total comparison), NOT timestamp-based.

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
- Follow the pattern of moduloService.js exactly
- When adding domain mutation logic, always extract to a service first

**Persistence:**
- Only `storage.js` touches localStorage directly
- `withSave` usa cola serializada (saveQueue + drain) — saves paralelos se procesan en orden
- `guardarModulos` bumps `costos_version` — required for stale detection

**IDs:**
- Presupuesto IDs: `crypto.randomUUID()` — globally unique, Supabase-compatible
- TEMP codes: `TEMP_${Date.now()}` — always cleaned up on save or delete
- Permanent module codes: `MC${String(Date.now()).slice(-6)}`
- **Never use `Date.now()` as a persistent entity ID** — it's a timestamp, not an identifier

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

## localStorage Keys

```
carpicalc:modulos        → module catalog
carpicalc:costos         → prices + config
carpicalc:costos_version → timestamp, bumped on modulos OR costos save
carpicalc:presupuestos   → all budgets
carpicalc:perfil         → workshop profile
carpicalc:historial      → price snapshots (max 20)
carpicalc:borrador       → active unsaved draft
carpicalc:auth           → session flag
```

## Presupuesto Object Shape

```js
{
  nombre: string,
  cliente: { nombre, tel, dir },
  nota: string,
  estado: "nuevo"|"enviado"|"aceptado"|"produccion"|"entregado",
  items: [{ id, codigo, cantidad, ... }],
  dimOverride: { [codigo-id]: { ancho, alto, profundidad } },
  adicionales: [{ id, nombre, monto }],
  costosDirectos: [{ id, tipo, refId, cantidad, precioUnit, precioManual, subtotal }],
  total: number,
  costosVersionAl: timestamp,  // sync marker for stale detection
  cobros: [{ fecha, monto, concepto }],
  costoReal: number,
  diasVigencia: number,
}
```

## Known Limitations (Planned)

1. **No schema validation** — malformed localStorage data can cause unpredictable behavior
2. **App.js handlers** — crear/actualizar/eliminar presupuesto todavía viven en App.js; mover a `presupuestoService.js` cuando se extraiga dominio completo

## Roadmap

| Priority | Feature | Notes |
|---|---|---|
| High | Public budget link | Flujo de aprobación del cliente |
| Medium | Supabase migration | Auth + PostgreSQL + RLS, región São Paulo |
| Medium | Lemon Squeezy subscriptions | Bronce $8 / Plata $18 / Oro $35 USD |
| Low | Monthly summary, m² calculator, purchase list export | |

## Architecture Principles — Non-negotiable

Estas reglas existen porque aprendimos lo que pasa cuando no se siguen.
Aplican a CUALQUIER código nuevo, sin excepción.

### Single Responsibility
Cada archivo/función tiene UNA razón para cambiar.
- Si un componente maneja UI Y lógica de negocio → extraer la lógica a un service
- Si una función lee datos Y los transforma → separarla en dos
- Si App.js crece por algo que no es "orquestar estado de dominio" → está mal ubicado

### Dónde va el código nuevo — Protocolo de 4 preguntas

Antes de escribir cualquier función o estado, respondé estas preguntas en orden:

```
1. ¿Es lógica de navegación?          → NavContext
2. ¿Es estado del editor activo?      → PresupuestoContext (via AppInterna)
3. ¿Es mutación de datos de dominio?  → services/ (función pura)
4. ¿Es cálculo puro sin side effects? → utils.js
5. ¿Es I/O de localStorage?           → storage.js
6. Si ninguna → estado local del componente que lo necesita
```

Si no podés responder la pregunta, el código tiene responsabilidades mezcladas.
Separalo antes de escribirlo.

### IDs de entidades persistentes
- **Siempre `crypto.randomUUID()`** para cualquier entidad que vaya a localStorage o base de datos
- Nunca `Date.now()` como ID — es un timestamp, no un identificador único global
- Nunca usar el ID para inferir fecha de creación — guardá `creadoEn: Date.now()` por separado si necesitás ese dato

### Supuestos explícitos
Cuando tomés una decisión técnica que depende de un supuesto ("esto nunca va a una BD"),
documentalo como comentario en el código o en Known Limitations.
Un supuesto no documentado es deuda técnica invisible.

```js
// SUPUESTO: esta app es single-user, local.
// Si se agrega multi-usuario, este campo necesita ser UUID global.
const id = crypto.randomUUID(); // ← ya corregido
```

### Límite de props por componente
- Más de **8 props** en un componente → analizar si necesita un Context o se puede dividir
- Más de **5 setters** pasados como props → mover el estado al contexto correspondiente
- Props que empiezan con `set` pasadas 2+ niveles abajo → Context obligatorio

### Anti-patrones prohibidos
- **God Component**: ningún componente tiene más de una responsabilidad de dominio
- **localStorage directo en componentes**: siempre a través de `storage.js`
- **Lógica de negocio en JSX**: extraer a función nombrada antes de renderizar
- **Estado de navegación en App.js**: siempre NavContext
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
```

**Arquitectura (protocolo de capas):**
```
□ No direct localStorage calls outside storage.js
□ No navigation state added to App.js (use NavContext)
□ No editor state passed as props 2+ levels deep (use PresupuestoContext)
□ No domain logic added to components (extract to services/)
□ No new persistent entity uses Date.now() as ID (use crypto.randomUUID())
□ New code answers the "4 preguntas" del protocolo de capas
```

**CSS / Design:**
```
□ CSS vars used in component exist in GlobalStyles (both themes)
□ No hardcoded colors — use CSS variables
```
