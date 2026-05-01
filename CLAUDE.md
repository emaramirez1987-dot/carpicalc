# CarpiCalc — Project Instructions

## Stack
React SPA · Vercel · localStorage · `react-scripts build` (CI=true, warnings = errors)

## Architecture

```
src/
├── App.js                  # Root: domain state + handlers + layout
├── state/NavContext.jsx    # Navigation state (useReducer, 12 semantic actions)
├── services/
│   └── moduloService.js   # Pure domain logic: TEMP lifecycle, migration, cleanup
├── components/
│   ├── ui/                # Visual primitives only (Btn, Card, Badge, etc.)
│   ├── costos/            # Price table, waste, overhead
│   ├── catalogo/          # Parametric modules, FormModulo, PanelSelector
│   ├── presupuesto/       # Active editor, GestorPresupuestos, BarraTotal
│   ├── vista-previa/      # PDF, WhatsApp, client approval
│   ├── corte/             # Cut list by material
│   ├── trabajos/          # Kanban + list tracking
│   └── caja/              # Payments, profitability, validity
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
| `services/` | Pure domain mutations | Call setState, dispatch |
| `utils.js` | Pure calculations | State, effects, UI |
| `storage.js` | localStorage I/O | Business logic |
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
- `withSave` is fire-and-forget (known limitation — queue planned)
- `guardarModulos` bumps `costos_version` — required for stale detection

**IDs:**
- Presupuesto IDs: `String(Date.now())` — known limitation, migration needed for Supabase
- TEMP codes: `TEMP_${Date.now()}` — always cleaned up on save or delete
- Permanent module codes: `MC${String(Date.now()).slice(-6)}`

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

1. **`withSave` concurrency** — no execution queue, parallel saves not guaranteed ordered
2. **`presupuestoService.js` missing** — mutation logic still in App.js handlers
3. **Prop drilling** — AppInterna passes 25+ props to Presupuesto; domain contexts not yet extracted
4. **No schema validation** — malformed localStorage data can cause unpredictable behavior
5. **String(Date.now()) IDs** — incompatible with relational DBs; migration needed before Supabase

## Roadmap

| Priority | Feature | Notes |
|---|---|---|
| High | `withSave` queue | Infra, ~20 lines, zero UI impact |
| High | `presupuestoService.js` | Completes service layer pattern |
| High | Public budget link | Client approval flow |
| Medium | Supabase migration | Auth + PostgreSQL + RLS, region São Paulo |
| Medium | Lemon Squeezy subscriptions | Bronce $8 / Plata $18 / Oro $35 USD |
| Low | Monthly summary, m² calculator, purchase list export | |

## Before Every Delivery — Checklist

```
□ Zero unused imports
□ Zero unused variables/setters/states
□ Zero orphaned props (declared in signature but never used)
□ Zero references to deleted functions/setters
□ JSX brace balance verified
□ No direct localStorage calls outside storage.js
□ No navigation state added to App.js (use NavContext)
□ No domain logic added to components (extract to services/)
□ CSS vars used in component exist in GlobalStyles (both themes)
□ Static analysis script passes with 0 errors, 0 warnings
```
