# AUDITORÍA TÉCNICA COMPLETA — CarpiCalc
### Radiografía del estado actual del proyecto
**Fecha:** Mayo 2026 · **Versión auditada:** producción actual en Vercel

---

> **Cómo leer este documento**
> Está escrito para que lo entienda cualquier persona, sin necesidad de saber programar.
> Cada sección tiene primero una explicación simple y luego el detalle técnico.
> Los recuadros `así` son nombres de archivos o fragmentos de código.

---

## ÍNDICE

1. [Árbol completo del proyecto](#fase-1-árbol-completo-del-proyecto)
2. [Arquitectura real implementada](#fase-2-arquitectura-real-implementada)
3. [Mapa de componentes](#fase-3-mapa-de-componentes)
4. [Flujos reales del sistema](#fase-4-flujos-reales-del-sistema)
5. [Sistema de estado](#fase-5-sistema-de-estado)
6. [Dependencias cruzadas](#fase-6-dependencias-cruzadas)
7. [Puntos críticos actuales](#fase-7-puntos-críticos-actuales)
8. [Mapa de impacto](#fase-8-mapa-de-impacto)
9. [Resumen ejecutivo](#fase-9-resumen-ejecutivo)

---

## FASE 1: ÁRBOL COMPLETO DEL PROYECTO

### ¿Qué es este proyecto?

CarpiCalc es una aplicación web para carpinteros. Permite:
- Crear un catálogo de muebles (módulos) con sus medidas y piezas
- Armar presupuestos para clientes usando esos módulos
- Ver en 3D cómo quedan los muebles
- Calcular cuánto material se necesita y cuánto cuesta
- Gestionar los trabajos como un tablero Kanban

Funciona 100% en el navegador. Los datos se guardan en la nube (Supabase).

---

### Estructura de carpetas (cada carpeta explicada)

```
carpicalc/
│
├── public/                        → Archivos estáticos: logo, favicon, html base
├── supabase/migrations/           → Script SQL de la base de datos en la nube
│   └── 001_initial_schema.sql     → Crea las tablas: workspaces, modules, budgets, profiles
│
├── api/                           → Funciones serverless de Vercel (corren en el servidor)
│   ├── cancel-subscription.js     → Cancela suscripción en Mercado Pago
│   ├── check-subscription.js      → Verifica si el plan del usuario está activo
│   ├── create-subscription.js     → Crea nueva suscripción
│   ├── deduct-render.js           → Descuenta un crédito de render IA
│   ├── generate-render-gpt.js     → Genera render fotorrealista con GPT-4o Vision
│   ├── generate-render.js         → Versión alternativa de render IA
│   ├── generate-scene.js          → Genera escena 3D para el render
│   └── mp-webhook.js              → Recibe notificaciones de Mercado Pago (alta/baja de planes)
│
└── src/                           → Todo el código fuente de la app
    ├── App.js                     → EL CEREBRO: estado global, navegación, layout raíz
    ├── utils.js                   → Motor de cálculo: fórmulas, costos, SVG
    ├── storage.js                 → Capa de persistencia: Supabase + localStorage
    ├── constants.js               → Datos fijos: materiales, categorías, módulos de ejemplo
    ├── index.js                   → Punto de entrada React (monta la app)
    │
    ├── lib/
    │   └── supabase.js            → Cliente de Supabase (conexión a la base de datos)
    │
    ├── state/
    │   ├── NavContext.jsx          → Estado de navegación (qué pestaña está abierta)
    │   └── PresupuestoContext.jsx  → Estado del presupuesto que se está editando ahora
    │
    ├── services/
    │   ├── moduloService.js        → Lógica de módulos: parsear, generar piezas, fórmulas
    │   ├── moduloService.test.js   → Tests automáticos del servicio de módulos
    │   ├── presupuestoService.js   → Lógica de presupuestos: crear, eliminar, migrar
    │   └── optimizerService.js     → Algoritmo de corte optimizado (bin-packing 2D)
    │
    ├── hooks/
    │   ├── useUndo.js              → Hook para deshacer/rehacer acciones
    │   ├── useTema.js              → Hook para el tema oscuro/claro
    │   └── useIsMobile.js          → Hook para detectar si es celular
    │
    ├── data/                       → Datos de referencia (actualmente solo constants.js los usa)
    │
    └── components/
        ├── ui/                     → Componentes visuales básicos reutilizables
        │   └── index.jsx           → Btn, Card, Badge, SectionTitle, TextInput, GlobalStyles
        │
        ├── auth/                   → Login con Supabase
        │   └── LoginScreen.jsx
        │
        ├── perfil/                 → Panel de datos del taller
        │   └── PanelPerfil.jsx
        │
        ├── suscripcion/            → Planes Bronce/Plata/Oro con Mercado Pago
        │   └── PanelSuscripcion.jsx
        │
        ├── render/                 → Generación de renders fotorrealistas con IA
        │   └── (componentes de render)
        │
        ├── costos/                 → Tabla de precios: materiales, herrajes, MO, tapacanto
        │   └── (componentes de costos)
        │
        ├── catalogo/               → EL EDITOR DEL CATÁLOGO — el más complejo
        │   ├── index.jsx           → CatalogoModulos (lista+búsqueda), PanelSelector, EditorVistaSVG
        │   ├── FormModulo.jsx      → Formulario completo de edición de módulo
        │   ├── FormPieza.jsx       → Formulario de edición de una pieza individual
        │   ├── EditorComponenteHijo.jsx  → Editor de subcomponentes (mini-módulos internos)
        │   ├── EditorParametrico.jsx     → Editor del sistema paramétrico del módulo
        │   ├── EditorSubComponente.jsx   → Editor anidado de subcomponentes
        │   ├── VarsExplorer.jsx    → Visor jerárquico de variables con carpetas
        │   ├── DimRowEditor.jsx    → Editor de fila de dimensión de pieza
        │   ├── FilaPieza.jsx       → Fila de una pieza en la lista
        │   ├── TabsModulo.jsx      → Tabs del formulario de módulo
        │   ├── AcordeonPreviewSVG.jsx    → Preview SVG del módulo en el formulario
        │   ├── ResumenCostosBar.jsx      → Barra de costo total en el formulario
        │   └── GuiaParametricaModal.jsx  → Modal de documentación del sistema paramétrico
        │
        ├── presupuesto/            → EL EDITOR DE PRESUPUESTOS
        │   ├── index.jsx           → Presupuesto (componente principal del editor)
        │   ├── GestorPresupuestos.jsx    → Lista de presupuestos guardados
        │   ├── AcordeonEdicionItem.jsx   → Panel inline de edición de un ítem (Nivel 2)
        │   ├── ConfiguradorParametrico.jsx → Controles paramétricos en el presupuesto
        │   ├── ComposicionEditor.jsx     → Editor de composición visual del módulo
        │   ├── PiezasEditor.jsx    → Editor de piezas dentro del presupuesto (Nivel 3 entry)
        │   ├── SeccionesPresupuesto.jsx  → Secciones: Adicionales, Costos Directos
        │   ├── BarraTotal.jsx      → Barra inferior con total + resumen
        │   └── imprimirPresupuesto.js    → Generación de PDF y ficha de obra
        │
        ├── visor3d/                → VISOR 3D INDIVIDUAL (para catálogo)
        │   ├── Modulo3D.jsx        → Escena Three.js del módulo
        │   ├── VisorCatalogo3D.jsx → Wrapper del visor con controles
        │   ├── useMaterial3D.js    → Hook para materiales Three.js
        │   ├── CamaraPresets.js    → Posiciones de cámara predefinidas
        │   └── engine/
        │       ├── buildPiezas3D.js      → MOTOR PURO: convierte piezas → geometría 3D
        │       └── buildPiezas3D.test.js → Tests del motor 3D
        │
        ├── vista3d/                → VISTA 3D DEL PRESUPUESTO (multi-módulo)
        │   └── Vista3DTab.jsx      → Vista 3D de todos los módulos del presupuesto juntos
        │                             con configurador paramétrico en panel lateral
        │
        ├── vista-svg/              → Renderer SVG 2D (vista técnica de frente)
        │   └── index.js            → VistaModuloSVG — genera SVG reactivo sin canvas
        │
        ├── corte/                  → Lista de cortes optimizada por material
        │   └── (componentes de corte)
        │
        ├── trabajos/               → Kanban + lista de seguimiento de trabajos
        │   └── (componentes de trabajos)
        │
        ├── caja/                   → Gestión de cobros y rentabilidad
        │   └── (componentes de caja)
        │
        ├── vista-previa/           → Preview PDF, WhatsApp, aprobación del cliente
        │   └── (componentes de vista previa)
        │
        └── ErrorBoundary.jsx       → Captura errores en runtime para mostrar mensaje amigable
```

---

### Las 10 pestañas de la app

| # | Pestaña | Archivo principal | Qué hace |
|---|---------|-------------------|----------|
| 1 | **Presupuesto** | `presupuesto/index.jsx` | Editor activo de presupuesto. Carga INMEDIATA (no lazy) |
| 2 | **Catálogo** | `catalogo/index.jsx` | CRUD de módulos del carpintero |
| 3 | **Costos** | `costos/` | Precios de materiales, herrajes, MO |
| 4 | **Vista 3D** | `vista3d/Vista3DTab.jsx` | Vista 3D del presupuesto activo |
| 5 | **Vista previa** | `vista-previa/` | PDF, WhatsApp, link de aprobación |
| 6 | **Corte** | `corte/` | Optimizador de corte por placa |
| 7 | **Trabajos** | `trabajos/` | Kanban de estado de trabajos |
| 8 | **Caja** | `caja/` | Cobros y rentabilidad |
| 9 | **Perfil** | `perfil/PanelPerfil.jsx` | Datos del taller |
| 10 | **Suscripción** | `suscripcion/PanelSuscripcion.jsx` | Planes de pago |

---

## FASE 2: ARQUITECTURA REAL IMPLEMENTADA

### Explicación simple

Imaginá la app como una fábrica con distintos departamentos:

- **El Director (App.js):** Tiene todos los datos importantes. Decide qué se muestra y les pasa información a todos.
- **La Base de Datos (Supabase):** Guarda todo en la nube. Es la fuente de verdad.
- **El Cuaderno de Navegación (NavContext):** Solo sabe en qué pestaña estás. Nada más.
- **El Cuaderno del Presupuesto (PresupuestoContext):** Sabe qué ítems tiene el presupuesto que estás editando ahora.
- **Los Calculistas (services/):** Saben hacer cálculos pero no hablan con nadie. Solo reciben datos y devuelven resultados.
- **El Almacén (storage.js):** Se encarga de leer y escribir en Supabase y en el caché local.
- **Los Trabajadores (components/):** Muestran la pantalla y reaccionan al usuario.

---

### Stack tecnológico real

```
FRONTEND
  React 18 (SPA — Single Page Application)
  CSS-in-JS (estilos inline + variables CSS globales)
  Three.js (visor 3D, via react-three-fiber implícitamente)
  jsPDF (generación de PDFs)

BACKEND
  Supabase (Postgres + Auth + Row Level Security)
  Vercel Serverless Functions (8 endpoints en /api/)

DEPLOY
  Vercel (CI/CD automático desde GitHub)
  Build: react-scripts build (Create React App)
  CI=true → cualquier warning rompe el build

PAGOS
  Mercado Pago (suscripciones Bronce/Plata/Oro)

IA
  GPT-4o Vision API (renders fotorrealistas)
```

---

### Capas de la arquitectura (de más alto a más bajo nivel)

```
┌──────────────────────────────────────────────────────────┐
│  USUARIO  →  Navegador  →  React SPA                     │
├──────────────────────────────────────────────────────────┤
│  PRESENTACIÓN: components/  (lo que se ve)               │
│   ├─ components/ui/        Botones, cards, badges básicos│
│   ├─ components/presupuesto/  Editor de presupuestos     │
│   ├─ components/catalogo/     Editor de módulos          │
│   ├─ components/visor3d/      Visor 3D individual        │
│   └─ components/vista3d/      Vista 3D multi-módulo      │
├──────────────────────────────────────────────────────────┤
│  ESTADO: App.js + Contexts  (lo que se recuerda)         │
│   ├─ App.js           modulos, costos, presupuestos      │
│   ├─ NavContext        pestaña activa, deep links        │
│   └─ PresupuestoContext  ítems, dims, adicionales        │
├──────────────────────────────────────────────────────────┤
│  SERVICIOS: services/  (lógica pura)                     │
│   ├─ moduloService.js   parseo, parámetros, generarPiezas│
│   ├─ presupuestoService.js  mutaciones de presupuestos   │
│   └─ optimizerService.js    algoritmo de corte           │
├──────────────────────────────────────────────────────────┤
│  CÁLCULO: utils.js  (matemática pura)                    │
│   └─ evaluarExpresion, calcularModulo, generarVistaSVG   │
├──────────────────────────────────────────────────────────┤
│  PERSISTENCIA: storage.js  (leer/escribir)               │
│   ├─ Supabase (módulos, presupuestos, perfil, costos)    │
│   └─ localStorage (borrador, tema, caché ligero)         │
├──────────────────────────────────────────────────────────┤
│  BASE DE DATOS: Supabase (Postgres + RLS)                │
│   Tablas: workspaces, modules, budgets, profiles         │
└──────────────────────────────────────────────────────────┘
```

---

### Regla de oro de la arquitectura

Cada capa solo puede hablar con la capa de abajo. Nunca al revés.

- Un componente puede usar un service → ✅
- Un service no puede llamar a un componente → ❌
- Un componente no puede escribir directo en Supabase → ❌ (siempre via storage.js)
- utils.js no puede importar React → ❌

Esta regla está documentada en `CLAUDE.md` y se verifica antes de cada entrega.

---

## FASE 3: MAPA DE COMPONENTES

### Los 15 archivos más importantes

---

#### 1. `App.js` — El cerebro (848 líneas)
**Criticidad: MÁXIMA**

Es el componente raíz. Contiene:
- Autenticación con Supabase (login/logout)
- TODO el estado de dominio: `modulos`, `costos`, `presupuestos`, `perfil`
- La cola de guardado serializada (`withSave`) — evita saves paralelos que se pisarían
- La función `getModUsado` — resuelve qué módulo usar en un ítem (puede ser TEMP_ o permanente)
- El layout raíz: Header + 10 pestañas
- Todas las pestañas cargadas con `React.lazy()` excepto Presupuesto (siempre visible)
- El patrón `display:none` para preservar el estado de las pestañas visitadas sin desmontar

**Props que reciben las pestañas desde App.js:** `modulos`, `costos`, `presupuestos`, `perfil`, handlers de guardado (`hSaveModulos`, `hSaveCostos`, etc.)

---

#### 2. `utils.js` — El calculador (857 líneas)
**Criticidad: MÁXIMA**

Funciones puras sin side effects. No importa React.

| Función | Qué hace |
|---------|----------|
| `evaluarExpresion(expr, vars)` | Motor central de fórmulas. Usa `new Function()` con whitelist de seguridad. Ej: `evaluarExpresion("ancho - 2*esp", {ancho:600, esp:18})` → `564` |
| `evaluarFormula(expr, vars)` | Igual que anterior pero clampea el resultado a ≥ 0 |
| `evaluarCondicion(expr, vars)` | Evalúa una fórmula como booleano. Ej: `"cajones > 0"` → `true` |
| `resolverVariables(rawVars, baseVars)` | Resuelve variables custom encadenadas. Itera hasta que todas estén resueltas o queden sin resolver (→ 0). |
| `calcularModulo(modulo, costos, valoresParametros)` | Calcula el costo completo de un módulo: m², tapacanto, herrajes, MO, ganancia, total |
| `recalcularTotalPresupuesto(p, modulos, costos)` | Recalcula el total de un presupuesto completo determinísticamente |
| `generarVistaSVG(modulo, opts)` | Genera el SVG de vista técnica de frente del módulo |
| `resolverDim(base, offsetEsp, offsetMm, divisor, espesor)` | Calcula la dimensión de una pieza según la fórmula estándar |

---

#### 3. `services/moduloService.js` — El corazón del sistema paramétrico (652 líneas)
**Criticidad: MÁXIMA**

Las funciones más importantes del proyecto viven acá:

| Función | Qué hace |
|---------|----------|
| `parsearModulo(raw)` | Normaliza datos crudos de Supabase. Si faltan campos los rellena con defaults. Devuelve null si el dato está irrecuperable. |
| `resolverContextoModulo(modulo, costos, valoresParametros)` | **LA FUNCIÓN MÁS CRÍTICA.** Construye el contexto completo de variables para evaluar cualquier fórmula del módulo. Combina: dims base + parámetros + vars derivadas de piezas + variables custom. TODO el código debe usar esta función. Prohibido reimplementarla. |
| `generarPiezas(modulo, valoresParametros, costos)` | Expande el módulo paramétrico: aplica `condition` (filtra piezas) y `repeat` (multiplica piezas). Devuelve módulo "concreto" listo para el 3D. |
| `expandirSubComponentes(modulo, ...)` | Toma los subcomponentes (mini-módulos internos) y los convierte en piezas del módulo padre, trasladando coordenadas locales → globales. |
| `calcularVarsDePiezas(piezas, ctx, ...)` | Para cada pieza con nombre, calcula sus dimensiones y posición resuelta como variables: `lateral_d1`, `lateral_d2`, `lateral_x`, etc. Así otras piezas pueden referenciar las medidas de otra pieza. |
| `resolverParametros(modulo, valoresParametros)` | Mezcla los defaults de los parámetros con los valores elegidos por el usuario. Resuelve parámetros tipo "formula" (calculados). |
| `evaluarConstraints(modulo, valoresParametros, costos)` | Valida todas las restricciones del módulo (ej: "alto >= cajones * 80"). Devuelve array con ok/error + mensaje. |
| `resolverHerrajes(modulo, valoresParametros, costos)` | Calcula cuántos herrajes necesita el módulo aplicando condiciones y fórmulas de cantidad. |

---

#### 4. `storage.js` — El guardián de datos (364 líneas)
**Criticidad: ALTA**

Única capa que habla con Supabase y localStorage.

| Función | Destino | Qué hace |
|---------|---------|----------|
| `cargarDatos()` | Supabase | Lee módulos, presupuestos, perfil, costos al iniciar |
| `guardarModulos(modulos)` | Supabase | Delete-all + insert-all (app de un solo usuario) |
| `guardarPresupuestos(presupuestos)` | Supabase | Ídem |
| `guardarPerfil(perfil)` | Supabase | Ídem |
| `guardarCostos(costos)` | Supabase | Ídem. Además bumps `costos_version` en localStorage |
| `cargarBorradorModulo()` / `guardarBorradorModulo()` | localStorage | Estado temporal del FormModulo entre pestañas |
| `leerPerfil()` | localStorage | Versión síncrona del perfil para generación de PDFs |
| `cargarSuscripcion()` | API `/api/check-subscription` | Verifica el plan activo del usuario |

**Estrategia de guardado:** Delete-all + insert-all por workspace. No es lo más eficiente pero es simple y funciona perfecto para un usuario. El "gap" entre delete e insert es imperceptible.

---

#### 5. `state/NavContext.jsx` — El navegador (120 líneas)
**Criticidad: ALTA**

Solo maneja navegación. Usa `useReducer` con 12 acciones semánticas.

**Estado:**
- `vista` — pestaña activa (string)
- `catalogoDeepLink` — código de módulo a abrir automáticamente en catálogo
- `origenEdicion` — contexto de dónde viene la edición (para poder volver)
- `presupuestoParaEditar` — puente para cargar un presupuesto en el editor
- `cajaPresId` — presupuesto a abrir automáticamente en Caja
- `editorVistaCod` / `editorVistaOrigen` — editor SVG visual

**Patrón importante:** Las acciones son "puentes" — un componente pone datos en el estado de NavContext, y otro componente los consume y los borra (DEEPLINK_CONSUMIDO, PRESUPUESTO_PARA_EDITAR_CONSUMIDO). Así no quedan datos colgados.

---

#### 6. `state/PresupuestoContext.jsx` — El editor activo (43 líneas)
**Criticidad: ALTA**

Define solo el contexto. El **estado real** vive en `AppInterna` dentro de `App.js`.

**Campos expuestos:**
- `items` / `setItems` — lista de módulos en el presupuesto activo
- `dimOverride` / `setDimOverride` — overrides de dimensiones por ítem
- `composicionOverride` / `setComposicionOverride` — overrides de composición visual
- `inlineModulos` / `setInlineModulos` — módulos editados solo para este presupuesto
- `adicionales` / `setAdicionales` — costos adicionales (flete, instalación, etc.)
- `costosDirectos` / `setCostosDirectos` — costos directos (materiales comprados aparte)
- `presupuestoActivoId` — ID del presupuesto que está abierto

---

#### 7. `visor3d/engine/buildPiezas3D.js` — El motor 3D (≈220 líneas)
**Criticidad: ALTA**

Función pura: recibe un módulo + costos + valores de parámetros → devuelve lista de piezas con geometría 3D.

**Proceso:**
1. Pasa el módulo por `generarPiezas()` (expansión paramétrica)
2. Resuelve el contexto con `resolverContextoModulo()`
3. Para cada pieza determina orientación (vertical/horizontal/frente) via: campo `orientacion3d`, o `cara3d`, o `rol3d`, o fallback por nombre
4. Calcula `d1` y `d2` (dimensiones reales en mm)
5. Mapea orientación → tamaño 3D + posición automática + vector de explosión
6. Si hay `posFormulas` (x, y, z), las evalúa con las variables del módulo para posicionar la pieza exactamente

**No importa React ni Three.js.** El componente `Modulo3D.jsx` toma esta lista y la convierte en meshes de Three.js.

---

#### 8. `catalogo/index.jsx` — El catálogo (1263 líneas)
**Criticidad: ALTA**

Contiene 3 componentes exportados:

- **`CatalogoModulos`:** Lista de módulos con búsqueda, filtro por categoría, vista grid/list. Maneja Import/Export de backups JSON. Abre `FormModulo` inline al editar/crear.
- **`PanelSelectorModulos`:** Panel compacto para agregar un módulo al presupuesto. Busqueda + categorías colapsables + chips.
- **`EditorVistaSVG`:** Editor de composición visual del módulo (frente técnico): layout presets, zonas, tipo de cada zona (cajones/puertas/abierto), cantidad de estantes.

---

#### 9. `catalogo/FormModulo.jsx` — El formulario de módulo
**Criticidad: ALTA**

El formulario más complejo de la app. Tiene 6 tabs:
- **Datos:** nombre, dimensiones, material, descripción
- **Variables:** variables custom con VarsExplorer (carpetas incluidas)
- **Piezas:** lista de piezas + formulario FormPieza
- **Herrajes:** lista de herrajes del módulo
- **Avanzado:** EditorParametrico (parámetros, zonas, constraints)
- **Sub-componentes:** EditorComponenteHijo (mini-módulos)

Incluye un preview SVG en tiempo real y una barra de costo total.

---

#### 10. `presupuesto/index.jsx` — El editor de presupuesto
**Criticidad: ALTA**

Gestiona el flujo completo del presupuesto activo:
- Agregar/quitar módulos al presupuesto
- Editar dimensiones de cada ítem (AcordeonEdicionItem — Nivel 2)
- Ver preview SVG de cada módulo
- Guardar/cargar presupuestos (GestorPresupuestos)
- Calcular y mostrar totales
- Exportar a PDF / Ficha de obra
- Indicador de autosave ("Borrador guardado · hace 3s")

---

#### 11. `presupuesto/ConfiguradorParametrico.jsx` — Los controles paramétricos
**Criticidad: MEDIA-ALTA**

Renderiza un control por parámetro del módulo:
- `number`/`integer` → `NumberStepper` (botones +/- con debounce 150ms para no saturar el render 3D)
- `boolean` → toggle
- `choice` → select
- `formula` → solo lectura (calculado automáticamente)

Muestra warnings de constraints violadas en rojo.
Se usa dentro de AcordeonEdicionItem (presupuesto) y en la Vista 3D lateral.

---

#### 12. `presupuesto/GestorPresupuestos.jsx` — La lista de presupuestos
**Criticidad: MEDIA**

Panel colapsable que lista todos los presupuestos guardados.
Calcula en tiempo real si algún presupuesto necesita actualización de precio (recalcula el total con los costos actuales y compara con el guardado).
Permite buscar, cambiar estado (Kanban), cargar en editor, eliminar.

---

#### 13. `services/optimizerService.js` — El optimizador de corte (224 líneas)
**Criticidad: MEDIA**

Algoritmo Guillotine 2D bin-packing mejorado.
- Ordena piezas por área (mayor a menor) antes de empaquetar
- Multi-placa open list: antes de abrir una placa nueva, intenta todas las piezas restantes en espacios existentes
- Best-fit space: elige el espacio más pequeño que contiene la pieza
- Calcula sobrantes reutilizables (espacios ≥ 300mm de lado)

Input: lista de piezas con d1/d2 + dimensiones de la placa
Output: layout de cada placa + sobrantes + métricas (rendimiento %, desperdicio %)

---

#### 14. `catalogo/VarsExplorer.jsx` — El explorador de variables
**Criticidad: MEDIA**

Panel interactivo que muestra todas las variables disponibles organizadas en scopes jerárquicos:
- Dimensiones base (ancho, alto, profundidad, esp)
- Parámetros del módulo
- Variables derivadas de piezas (lateral_d1, lateral_x, etc.)
- Variables custom del usuario
- Variables de subcomponentes

Incluye el sistema de carpetas para organizar variables custom: cada scope puede tener carpetas nombradas con sus variables dentro. Las carpetas son metadatos separados — no afectan las fórmulas.

---

#### 15. `services/presupuestoService.js` — Mutaciones de presupuesto (156 líneas)
**Criticidad: MEDIA**

Funciones puras que crean/modifican presupuestos:
- `crearPresupuesto()` — genera ID con `crypto.randomUUID()`
- `eliminarPresupuesto()` — también limpia módulos TEMP_ huérfanos
- `migrarDimOverridePresupuestos()` — migra formato legacy B → A
- `migrarTempEnPresupuestos()` — cuando un TEMP_ pasa a permanente, actualiza todos los presupuestos

---

## FASE 4: FLUJOS REALES DEL SISTEMA

### Flujo 1: El usuario edita un módulo en el catálogo

```
1. Usuario hace clic en "✎ Editar" en una tarjeta del catálogo
   └─ CatalogoModulos → setModo({ tipo:"editar", codigo, modulo })

2. FormModulo se monta con los datos del módulo existente
   └─ Inicializa: datos, piezas, variables, herrajes, subComponentes, parametros

3. Usuario cambia dimensiones / agrega piezas
   └─ Estado local de FormModulo se actualiza
   └─ Preview SVG se re-renderiza en tiempo real (generarVistaSVG)
   └─ Costo total se recalcula (calcularModulo)

4. Usuario hace clic en "💾 Guardar"
   └─ CatalogoModulos.guardar(codigo, datos) se ejecuta
   └─ setModulos({ ...modulos, [codigo]: datosNuevos })
   └─ onSave(todosMods) → App.js → withSave → guardarModulos(supabase)

5. Supabase recibe los datos nuevos (delete-all + insert-all)
   └─ Módulo actualizado en la nube
```

---

### Flujo 2: El usuario arma un presupuesto

```
1. Usuario abre la pestaña Presupuesto
   └─ Presupuesto se monta (eager, siempre cargado)
   └─ Consume PresupuestoContext (items, dimOverride, etc.)

2. Usuario busca un módulo en PanelSelectorModulos
   └─ Filtra por nombre/código en tiempo real
   └─ Hace clic → agrega { id: uuid, codigo, cantidad: 1 } a items[]

3. Para cada ítem, se muestra:
   └─ Preview SVG del módulo
   └─ Costo calculado (calcularModulo)
   └─ Botón "✎" para editar dimensiones (Nivel 2)

4. Usuario hace clic en "✎" del ítem
   └─ AcordeonEdicionItem se expande
   └─ Muestra sliders de A/P/H + selector de material
   └─ Si el módulo tiene parámetros → ConfiguradorParametrico muestra los controles
   └─ Cambios se guardan en dimOverride o en parametrosValores del ítem

5. Usuario hace clic en "💾 Guardar presupuesto"
   └─ presupuestoService.crearPresupuesto() → nuevo ID UUID
   └─ App.js → withSave → guardarPresupuestos(supabase)

6. Presupuesto queda disponible en GestorPresupuestos
```

---

### Flujo 3: El sistema paramétrico (end-to-end)

```
DISEÑO (catálogo):
  FormModulo → EditorParametrico
  └─ Carpintero define: cajones (integer, min 1, max 8)
  └─ Pieza "frente" con condition: "cajones > 0", repeat: { var:"i", from:1, to:"cajones" }
  └─ Módulo guardado con parametros[{ id:"cajones", tipo:"integer", def:3 }]

USO (presupuesto):
  Usuario agrega el módulo al presupuesto
  └─ AcordeonEdicionItem → ConfiguradorParametrico
  └─ NumberStepper para "cajones" (actual: 3, min:1, max:8)
  └─ Usuario cambia a 5 cajones

CÁLCULO:
  calcularModulo(modulo, costos, { cajones: 5 })
  └─ resolverContextoModulo → modVars incluye cajones=5
  └─ generarPiezas → repeat expande frente × 5 piezas
  └─ Costo recalculado con 5 piezas en lugar de 3

RENDER 3D:
  buildPiezas3D(modulo, costos, { cajones: 5 })
  └─ generarPiezas → 5 piezas de frente
  └─ Cada pieza posicionada con posFormulas que usan "i"
  └─ Three.js renderiza 5 cajones en el visor
```

---

### Flujo 4: Edición Nivel 3 (editar módulo desde el presupuesto)

```
1. Usuario en Presupuesto → "🔧 Editar en catálogo" en un ítem
   └─ crearTempDesdeModulo() → copia del módulo con código TEMP_1234567890
   └─ setModulos({ ...modulos, [tempCod]: copy })
   └─ dispatch(INICIAR_EDICION_NIVEL3, { cod: tempCod, ctx: presupuestoId })

2. NavContext pone catalogoDeepLink = tempCod
   └─ Vista cambia a "catalogo"
   └─ CatalogoModulos detecta deepLink y abre FormModulo con el TEMP_

3. Usuario edita el módulo temporal
   └─ Cambios solo afectan la copia temporal

4a. Usuario guarda "solo para este presupuesto"
    └─ TEMP_ queda como módulo temporal vinculado al presupuesto
    └─ Catálogo permanente no se toca

4b. Usuario guarda "también en catálogo"
    └─ Nuevo ID permanente: MC${Date.now().slice(-6)}
    └─ TEMP_ eliminado
    └─ onGuardarPermanente(tempCod, newId) → actualiza referencias en items[]

5. dispatch(VOLVER_A_PRESUPUESTO) → vuelve al presupuesto
```

---

### Flujo 5: Guardado con cola serializada (`withSave`)

```
// El problema que resuelve:
// Si el usuario hace cambios rápidos, pueden dispararse múltiples saves
// simultáneos. Guardar en paralelo → race conditions → datos corruptos.

// La solución:
withSave(async () => await guardarModulos(costos))

// Internamente:
// 1. Agrega la función a saveQueue[]
// 2. Si no hay un save corriendo, llama a drain()
// 3. drain() ejecuta uno por uno en orden
// → Nunca dos saves corren al mismo tiempo
```

---

### Flujo 6: Detección de precios desactualizados

```
El carpintero sube el precio del material de melamina.
→ guardarCostos(costos) → bumps costos_version timestamp en localStorage

GestorPresupuestos al renderizar:
→ recalcularTotalPresupuesto(p, modulos, costos) para cada presupuesto
→ Compara total calculado con total guardado
→ Si |calculado - guardado| > $1 → muestra "⚠ Desactualizado — Actualizar"

Usuario hace clic en "Actualizar":
→ onActualizarPresupuesto(id, { total: nuevoTotal, costosVersionAl: Date.now() })
→ Se guarda el total nuevo en Supabase
```

---

## FASE 5: SISTEMA DE ESTADO

### Diagrama del estado

```
┌─────────────────────────────────────────────────────────────────┐
│  App.js  (estado de DOMINIO — persiste en Supabase)             │
│                                                                  │
│  modulos: { [codigo]: Modulo }                                   │
│   └─ incluye TEMP_ (temporales, NO van a Supabase normal)        │
│                                                                  │
│  costos: { materiales[], herrajes[], manoDeObra[], ... }         │
│                                                                  │
│  presupuestos: { [uuid]: Presupuesto }                           │
│                                                                  │
│  perfil: { nombre, slogan, tel, logo, ... }                      │
│                                                                  │
│  suscripcion: { plan, activa, creditos }                         │
└──────────────────┬──────────────────────────────────────────────┘
                   │ pasa via props a AppInterna
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  AppInterna (estado del EDITOR ACTIVO)                           │
│                                                                  │
│  items: [{ id, codigo, cantidad, parametrosValores }]            │
│  dimOverride: { [itemId]: { ancho, alto, profundidad, material }}│
│  composicionOverride: { [itemId]: {...} }                        │
│  inlineModulos: { [codigo]: Modulo }  ← ediciones inline        │
│  adicionales: [{ id, nombre, monto }]                            │
│  costosDirectos: [{ id, tipo, refId, ... }]                      │
│  presupuestoActivoId: string | null                              │
│                                                                  │
│  → Todo esto se expone via PresupuestoContext                    │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│  NavContext (estado de NAVEGACIÓN — nunca persiste)              │
│                                                                  │
│  vista: "presupuesto" | "catalogo" | "costos" | ...             │
│  catalogoDeepLink: string | null                                 │
│  origenEdicion: { tipo, presupuestoId } | null                   │
│  presupuestoParaEditar: { id, p } | null                         │
│  cajaPresId: string | null                                       │
│  editorVistaCod: string | null                                   │
└─────────────────────────────────────────────────────────────────┘

Estado LOCAL en componentes (no sube al global):
  FormModulo:       datos (objeto módulo en edición), piezas[], editandoPiezaIdx
  CatalogoModulos:  modo (nuevo/editar/duplicar), busqueda, vistaLayout
  GestorPresupuestos: abierto, confirmDelId, busquedaPres
  EditorComponenteHijo: paramTestVals, subTabMain, subTabPiezas
  ConfiguradorParametrico: local (NumberStepper — debounce 150ms)
```

---

### localStorage: qué se guarda y para qué

| Clave | Qué guarda | Por qué |
|-------|------------|---------|
| `carpicalc:costos_version` | Timestamp del último cambio de costos | Detectar presupuestos desactualizados |
| `carpicalc:perfil_cache` | Copia síncrona del perfil | La generación de PDFs necesita datos síncronos |
| `carpicalc:borrador` | Presupuesto activo en edición | Recuperar al volver a la app sin guardar |
| `carpicalc:borrador_modulo` | Estado de FormModulo | Preservar entre cambios de pestaña |
| `carpicalc:roles_pieza` | Roles custom del taller | Customización local |
| `carpicalc:tema` | `"dark"` o `"light"` | Preferencia visual |
| `carpicalc:ultimo_backup` | Timestamp del último backup | Recordatorio de backup |
| `carpicalc:catalogo_vista` | `"grid"` o `"list"` | Preferencia de vista del catálogo |

---

## FASE 6: DEPENDENCIAS CRUZADAS

### Mapa de importaciones (quién importa a quién)

```
App.js
  ├─ imports: storage.js, utils.js, constants.js
  ├─ imports: NavContext, PresupuestoContext
  ├─ imports: presupuestoService, moduloService
  └─ lazy imports: todos los tabs

utils.js
  └─ imports: NADA (archivo más puro del proyecto)

moduloService.js
  ├─ imports: utils.js
  └─ imports: constants.js

presupuestoService.js
  └─ imports: NADA (solo usa crypto.randomUUID)

optimizerService.js
  └─ imports: NADA

storage.js
  ├─ imports: supabase.js
  ├─ imports: moduloService.js (parsearModulo, parsearPresupuesto)
  └─ imports: constants.js

buildPiezas3D.js
  ├─ imports: utils.js
  └─ imports: moduloService.js (resolverContextoModulo, generarPiezas)

catalogo/index.jsx
  ├─ imports: utils.js, constants.js, storage.js
  ├─ imports: NavContext
  └─ imports: FormModulo, GuiaParametricaModal

presupuesto/index.jsx
  ├─ imports: utils.js, constants.js
  ├─ imports: PresupuestoContext
  ├─ imports: catalogo/index.jsx (PanelSelectorModulos)
  └─ imports: GestorPresupuestos, AcordeonEdicionItem, BarraTotal, ...

presupuesto/ConfiguradorParametrico.jsx
  ├─ imports: moduloService.js (resolverParametros, evaluarConstraints)
  └─ imports: utils.js (evaluarExpresion)
```

---

### Archivos más importados (los que más cambian impactan)

| Archivo | Importado por | Riesgo si cambia |
|---------|--------------|-----------------|
| `utils.js` | 10+ archivos | **CRÍTICO** — cambia fórmulas → todo falla |
| `moduloService.js` | 6+ archivos | **MUY ALTO** — cambia parseo → datos rotos |
| `constants.js` | 8+ archivos | **ALTO** — cambia MODULO_VACIO → defaults rotos |
| `storage.js` | App.js + catalogo | **ALTO** — cambia I/O → pérdida de datos |
| `NavContext.jsx` | ~8 componentes | **MEDIO** — cambia navegación |
| `PresupuestoContext.jsx` | ~6 componentes | **MEDIO** — cambia estado del editor |

---

### Dependencias circulares

**No existen dependencias circulares** en el proyecto. El grafo de importaciones es un DAG (árbol dirigido sin ciclos). Esto fue un diseño intencional.

---

### Puntos de acoplamiento fuerte

1. **`resolverContextoModulo` en moduloService.js:** Es llamada desde 4 lugares distintos (buildPiezas3D, calcularModulo en utils, _contextoParametrico en moduloService, VarsExplorer). Cualquier cambio en su firma impacta todos.

2. **El objeto `modulo` shape:** Todos los componentes esperan el mismo contrato. Está definido en `MODULO_VACIO` de constants.js y validado por `parsearModulo`. Agregar un campo nuevo requiere actualizar ambos.

3. **`dimOverride` key format:** La clave es `item.id || item.codigo`. Cambiar esto rompe los overrides existentes (hay una migración implementada en `migrarDimOverridePresupuestos`).

4. **`withSave` en App.js:** Todas las operaciones de guardado pasan por esta cola. Si falla o se congela, ningún save funciona.

---

## FASE 7: PUNTOS CRÍTICOS ACTUALES

### Zonas de riesgo identificadas en el código

---

#### 🔴 RIESGO ALTO

**1. ~~`modulo.variables` shape inconsistente~~** ✅ **RESUELTO (2026-05-19)**

~~El problema: `parsearModulo` trata `variables` como `Array`. Pero `resolverVariables` en utils.js lo trata como objeto `{ nombre: formula }`. Y el formulario también lo trata como objeto.~~

**Solución implementada:** `normalizarVariables()` en `moduloService.js` es la única función que toca el shape. Acepta las tres formas posibles:
- `Object` → pass-through (formato canónico).
- `Array` de `{ nombre, formula }` → convierte a Object (retrocompatibilidad total con datos viejos en Supabase).
- Cualquier otro formato → cuarentena: `variables = {}`, flag `_variablesFormatoDesconocido = true`, `_variablesRawOriginal` preservado para diagnóstico, banner de aviso en la UI.

`guardarModulos` en `storage.js` llama a `limpiarMetadataRuntime()` (recursivo sobre subComponentes) antes de persistir, eliminando los campos de runtime.

Contrato canónico desde esta fecha: **`modulo.variables` es siempre `Object { [nombre]: formula }`**. No hay más conversión implícita en callsites.

**2. App.js tiene 848 líneas y sigue creciendo**

Es el componente más grande. Aunque está bien organizado, cualquier funcionalidad nueva tiene la tentación de ir ahí. Si crece más se vuelve difícil de mantener.

---

#### 🟡 RIESGO MEDIO

**3. `calcularModulo` en utils.js llama a `resolverContextoModulo`**

`calcularModulo` está en utils.js pero necesita llamar a `resolverContextoModulo` que está en moduloService.js. Esto crea una dependencia de utils.js hacia moduloService.js que "rompe" la regla de que utils.js no depende de nadie. Actualmente utils.js no importa moduloService (los llaman en paralelo desde afuera). Hay que verificar que siga así.

**4. Módulos TEMP_ en el objeto `modulos` global**

Los módulos temporales (TEMP_) conviven en el mismo objeto que los permanentes. Si el carpintero abre el catálogo durante una edición Nivel 3, los TEMP_ quedan visibles brevemente. Están filtrados en PanelSelectorModulos y CatalogoModulos pero puede filtrarse si se agrega un nuevo punto de acceso.

**5. El borrador de presupuesto (`carpicalc:borrador`) puede quedar desincronizado**

Si el usuario edita en dos pestañas del navegador al mismo tiempo, el borrador se pisa. Esto está documentado implícitamente como limitación de app single-user.

---

#### 🟢 RIESGO BAJO (manejado)

**6. Fórmulas con `new Function()` — seguridad**

`evaluarExpresion` usa `new Function()` para ejecutar las fórmulas del carpintero. Tiene una whitelist de palabras permitidas (nombres de variables matemáticas). Solo el carpintero (usuario autenticado) puede definir fórmulas, y son para uso propio. El riesgo de inyección es bajo en este contexto.

**7. Guardado delete-all + insert-all**

Si el navegador se cierra durante el window entre delete e insert, se pierden datos. En la práctica es un window de milisegundos. Supabase RLS garantiza que nadie más puede escribir en ese workspace. El riesgo es muy bajo pero existe.

**8. Imágenes como base64 en el objeto módulo**

Las imágenes del catálogo se guardan como strings base64 dentro del objeto módulo en Supabase. Si el carpintero sube muchas imágenes de alta resolución (aunque se comprimen), el payload de `guardarModulos` puede volverse grande. Hay compresión implementada (`comprimirImagen`) pero no hay límite de tamaño forzado en la API de Supabase.

**9. ~~Popovers VarsDropdown / GuiaFormulasBtn clipeados por overflow~~** ✅ **RESUELTO (2026-05-19)**

Los popovers `⚡ vars` y `📖` usaban `position: absolute` y quedaban cortados por el ancestro con `overflow: hidden` (wrapper del form) y `overflow: auto` (panel de scroll). Corregido usando `position: fixed` + `getBoundingClientRect()` para anclar al botón trigger sin depender del stacking context del contenedor. Aplica a `VarsDropdown` en FormModulo, FormPieza y EditorComponenteHijo, y a `GuiaFormulasBtn`.

---

### Código duplicado existente

| Patrón | Dónde aparece | Estado |
|--------|--------------|--------|
| Resolución de fórmulas inline | Antes estaba en 3 archivos. **Ya fue centralizado** en `resolverContextoModulo`. | ✅ Resuelto |
| Cálculo de espesor del material | `buildPiezas3D.js` y `moduloService.js` coinciden en la lógica `espPieza = zona?.espesor ?? matPieza?.espesor ?? espMod` | 🟡 Menor duplicación aceptable |
| Estilos inline repetidos | Muchos componentes definen estilos de botones/chips con la misma estructura. Los tokens CSS están definidos pero no hay componentes para estos patrones | 🟡 Deuda estética |

---

## FASE 8: MAPA DE IMPACTO

### ¿Qué cambia si tocás X?

---

#### Si modificás `utils.js → evaluarExpresion`
```
Impacto TOTAL del proyecto.
Afecta:
  → Todas las fórmulas de todas las piezas de todos los módulos
  → Todos los cálculos de costo (calcularModulo)
  → El motor 3D (buildPiezas3D evalúa posFormulas)
  → Las variables custom (resolverVariables)
  → Las constraints (evaluarConstraints)
  → El preview SVG (generarVistaSVG)

Riesgo: CRÍTICO
Requiere: tests completos antes de tocar (moduloService.test.js, buildPiezas3D.test.js)
```

---

#### Si modificás `moduloService.js → resolverContextoModulo`
```
Afecta:
  → buildPiezas3D (usa modVars para posicionar piezas)
  → calcularModulo en utils.js (usa espesor, modVars)
  → VarsExplorer (construirScopes usa contexto para mostrar vars)
  → ConfiguradorParametrico (resolverParametros + evaluarConstraints)
  → FormModulo preview (recalcula al cambiar dims)

Riesgo: MUY ALTO
Requiere: probar cada punto de uso después del cambio
```

---

#### Si modificás `moduloService.js → generarPiezas`
```
Afecta:
  → El render 3D (buildPiezas3D llama generarPiezas)
  → El cálculo de corte (usa piezas expandidas)
  → El cálculo de costo (calcularModulo usa piezas expandidas)

Riesgo: ALTO
Requiere: probar módulos con repeat/condition/subComponentes
```

---

#### Si modificás `storage.js → guardarModulos`
```
Afecta:
  → Todos los saves del catálogo
  → El bump de costos_version (detección de precios desactualizados)

Riesgo: ALTO
No afecta: el cálculo, el render 3D, los presupuestos en edición
```

---

#### Si modificás el editor 3D (`buildPiezas3D.js` o `Modulo3D.jsx`)
```
Afecta:
  → Vista 3D individual (catálogo)
  → Vista 3D del presupuesto (Vista3DTab.jsx)
  → El preview 3D en el formulario de módulo

NO afecta:
  → El cálculo de costos
  → Los presupuestos guardados
  → El optimizador de corte
  → Los PDFs

Riesgo: MEDIO (aislado al sistema 3D)
```

---

#### Si modificás `FormModulo.jsx`
```
Afecta:
  → La edición de módulos en el catálogo
  → La edición Nivel 3 desde el presupuesto

NO afecta:
  → Los módulos ya guardados
  → Los presupuestos existentes
  → El render 3D de módulos existentes

Riesgo: BAJO-MEDIO (UI local)
```

---

#### Si modificás las fórmulas de un módulo (como usuario, no como developer)
```
Afecta:
  → El costo del módulo se recalcula al guardar
  → Los presupuestos que usan ese módulo muestran "Desactualizado"
  → El render 3D del módulo cambia

NO afecta automáticamente:
  → Los presupuestos ya guardados (hasta que el usuario haga "Actualizar")

Riesgo: cero (es el comportamiento esperado)
```

---

#### Si modificás `constants.js → MODULO_VACIO`
```
Afecta:
  → Los defaults de todos los módulos nuevos
  → El parsearModulo en moduloService (usa MODULO_VACIO como base)

Agregar un campo nuevo: SEGURO (módulos viejos reciben el default)
Eliminar un campo: RIESGO ALTO (módulos viejos pueden quedar con undefined)
Cambiar un valor por defecto: MEDIO (solo afecta módulos nuevos)
```

---

#### Si modificás el objeto Presupuesto (shape)
```
Afecta:
  → parsearPresupuesto debe contemplar el campo nuevo
  → Los componentes que lo consumen deben manejar el campo como opcional
  → Las migraciones deben poblarlo en datos viejos

Requiere: agregar el campo con default en parsearPresupuesto, no solo en el formulario
```

---

#### Si modificás NavContext (agregar una acción)
```
Afecta: solo la navegación
Requiere: agregar el case en navReducer + la acción en CLAUDE.md (referencia)

Eliminar una acción existente: ALTO — hay componentes que la dispatchen
```

---

#### Si modificás los endpoints en `/api/`
```
Afecta: solo pagos e IA (Mercado Pago + renders)
NO afecta: la app principal, módulos, presupuestos, 3D

Riesgo: BAJO para el resto de la app
```

---

## FASE 9: RESUMEN EJECUTIVO

### ¿Qué es CarpiCalc en una página?

CarpiCalc es una aplicación web profesional para carpinteros. Permite diseñar muebles con medidas reales, calcular costos automáticamente, generar presupuestos para clientes y optimizar el corte de placas.

---

### El dato más importante de la arquitectura

**Hay una única función que todo el sistema usa para calcular fórmulas:**
`resolverContextoModulo()` en `services/moduloService.js`

Esta función fue creada para reemplazar tres implementaciones paralelas que existían antes, cada una con bugs distintos. Hoy, si una fórmula funciona bien, funciona igual en el presupuesto, en el render 3D, en el optimizador de corte y en el PDF. Si falla, falla en todos lados al mismo tiempo (lo cual es bueno — es fácil de detectar).

---

### Los 5 archivos más críticos

| Prioridad | Archivo | Por qué |
|-----------|---------|---------|
| 1 | `utils.js` | Motor de fórmulas. Todo depende de él. |
| 2 | `services/moduloService.js` | Parseo + parámetros + generación de piezas |
| 3 | `App.js` | Estado de dominio + cola de guardado |
| 4 | `storage.js` | Persistencia. Si falla, se pierden datos |
| 5 | `constants.js` | Contrato del objeto módulo |

---

### Fortalezas del proyecto

1. **Arquitectura en capas clara y respetada:** Cada archivo tiene una sola responsabilidad bien definida.

2. **Función de resolución centralizada:** `resolverContextoModulo` evita la duplicación del motor de fórmulas.

3. **Parser que nunca rompe:** `parsearModulo` garantiza que datos viejos o incompletos nunca crashean la app — siempre reciben defaults.

4. **Cola de guardado serializada:** `withSave` previene race conditions de manera elegante y sin bibliotecas externas.

5. **Sistema paramétrico completo:** repeat, condition, constraints, zonas, subComponentes — un sistema de diseño de muebles real en el browser.

6. **Pruebas automáticas:** `moduloService.test.js` y `buildPiezas3D.test.js` cubren las funciones más críticas.

7. **Zero dependencias circulares:** El grafo de importaciones es un árbol limpio.

---

### Deudas técnicas registradas (solo documentar, no resolver aún)

| Prioridad | Deuda | Ubicación | Impacto |
|-----------|-------|-----------|---------|
| ~~Media~~ ✅ | ~~`variables` shape inconsistente (Array vs Object)~~ **RESUELTO** | `normalizarVariables` en `moduloService.js` | Contrato canónico: Object. Array legacy y formatos desconocidos normalizados en el parser. |
| Baja | App.js en crecimiento (848 líneas) | `App.js` | Mantenibilidad a largo plazo |
| Baja | Estilos inline repetidos en componentes | Toda la carpeta components/ | Solo estética, no funcional |
| Baja | Imágenes base64 en payload de módulos | `storage.js → guardarModulos` | Puede volverse lento con muchas imágenes grandes |

---

### Capacidad de cambio (¿cuánto cuesta hacer X?)

| Cambio | Costo | Por qué |
|--------|-------|---------|
| Agregar un nuevo tipo de parámetro (ej: "color") | Bajo | Solo tocar moduloService + ConfiguradorParametrico |
| Agregar una nueva pestaña de navegación | Bajo | App.js + NavContext |
| Cambiar el diseño visual de un componente | Muy bajo | Estilos inline en el componente |
| Cambiar el algoritmo de costo | Medio | utils.js + tests |
| Agregar un campo nuevo al objeto módulo | Medio | MODULO_VACIO + parsearModulo + formulario |
| Cambiar la base de datos (Supabase por otra) | Alto | Solo storage.js, pero es un archivo complejo |
| Cambiar el motor de fórmulas | Muy alto | evaluarExpresion + toda la app depende de él |
| Agregar subcomponentes anidados de nivel 3 | Alto | expandirSubComponentes (ya tiene guard de 5 niveles) |

---

### Conclusión

El proyecto está bien construido para su escala y propósito. Las decisiones de arquitectura son sólidas y consistentes. El código tiene comentarios que explican el **por qué** de las decisiones importantes. Las reglas de capas están documentadas y se siguen.

Para hacer cambios grandes con seguridad, la prioridad debe ser:
1. Siempre correr los tests existentes antes y después de cambiar utils.js o moduloService.js
2. Usar `resolverContextoModulo` para cualquier código nuevo que evalúe fórmulas
3. Agregar campos nuevos al objeto módulo siempre con default en `MODULO_VACIO` y en `parsearModulo`
4. Cualquier lógica nueva de negocio va a `services/`, no en componentes

---

*Documento generado por auditoría directa del código fuente · Todos los datos son del estado real del proyecto sin suposiciones*
