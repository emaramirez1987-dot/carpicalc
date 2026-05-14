# Guía — Módulos paramétricos

Cómo configurar un módulo del catálogo para que se pueda **personalizar al usarlo en un presupuesto**: cambiar cantidad de cajones, agregar/quitar puertas, elegir tipo de frente, etc., sin tener que duplicar el módulo.

---

## El concepto en una línea

> Un módulo paramétrico es un molde. El usuario del presupuesto elige los valores de los parámetros y el sistema arma las piezas, calcula los costos y dibuja el 3D solo.

---

## Las 5 piezas del rompecabezas

Todo módulo paramétrico tiene cinco componentes que podés configurar:

| # | Componente | Para qué sirve |
|---|---|---|
| 1 | **Parámetros** | Lo que el usuario va a poder ajustar (ej: cantidad de cajones, manija sí/no) |
| 2 | **Zonas** | Agrupar piezas que comparten material (ej: "cuerpo" en melamina, "frentes" en MDF) |
| 3 | **Piezas paramétricas** | Cómo cambia cada pieza según los parámetros (aparece/desaparece, se repite, cambia tamaño) |
| 4 | **Reglas** *(opcional)* | Validaciones (ej: "el alto no alcanza para tantos cajones") |
| 5 | **Sub-componentes** *(opcional)* | Mini-módulos dentro del módulo, cada uno con su propio mundo (eje, dims, piezas, herrajes, parámetros). Ideal para "cajón armado", "puerta con marco", etc. |

---

## Workflow general

```
1. Crear el módulo en el catálogo (forma básica)
2. Definir parámetros, zonas, reglas
3. Asignar a cada pieza su zona, condición y/o repetición
4. Asignar a cada herraje su cantidad-fórmula y/o condición
5. Guardar el módulo
6. En el presupuesto: cargar el módulo y ajustar parámetros
```

---

## Paso 1 — Definir los parámetros

**Catálogo → editar módulo → al final del formulario hay un panel colapsable:**

> **⚙ PARAMETRIZAR ESTE MÓDULO** ▼

Abrilo y vas a tres sub-secciones. La primera es **🎚 Parámetros configurables**.

Para cada parámetro definís:

| Campo | Qué es |
|---|---|
| **ID** | Nombre interno usable en fórmulas (ej: `cajones`, `puertas`). Solo letras, números y `_`. |
| **Nombre visible** | Lo que ve el usuario (ej: "Cantidad de cajones") |
| **Tipo** | `Número entero` · `Número decimal` · `Sí/No` · `Opción de lista` · `Fórmula calculada` |
| **Default** | Valor inicial cuando se carga el módulo |
| **Min / Max** | Solo para números — restringe el rango |
| **Opciones** | Solo para "Opción de lista" — los valores separados por coma |
| **Expresión** | Solo para "Fórmula calculada" — fórmula que se evalúa automáticamente |

### Tipos de parámetro — cuándo usar cada uno

- **Número entero** → cantidad de cosas (cajones, puertas, estantes)
- **Número decimal** → medidas con coma (raro)
- **Sí/No** → tiene/no tiene algo (manija, puerta vidriada, retro-iluminación)
- **Opción de lista** → variantes con nombres (tipo de frente: liso/manija/gola)
- **Fórmula calculada** → valor derivado que el usuario no edita pero que se usa en otras fórmulas (ej: `altoUtil = alto - 2*esp`)

---

## Paso 2 — Definir las zonas

Sub-sección **🎨 Zonas (material por grupo de piezas)**.

Una zona es una agrupación lógica de piezas con material propio. Los nombres son **libres** — vos decidís.

Ejemplo típico de cocina:

| Zona | Material | Para qué |
|---|---|---|
| `cuerpo` | melamina 18mm | Laterales, base, tapa |
| `frentes` | MDF lacado 18mm | Puertas, frentes de cajón |
| `fondos` | fibrofácil 5mm | Fondo del módulo |
| `interiores` | melamina 15mm | Estantes interiores |

Para cada zona:

| Campo | Qué es |
|---|---|
| **ID** | Nombre interno (ej: `frente`) |
| **Nombre** | Etiqueta visible |
| **Material** | De la lista de materiales de la app |
| **Espesor** *(opcional)* | Override — sino usa el del material |

> **Si no definís zonas:** todas las piezas usan el material del módulo. No es obligatorio definir zonas, solo si querés mezclar materiales.

---

## Paso 3 — Conectar las piezas a los parámetros

Cuando editás una pieza (sea nueva o existente) en **FormPieza**, abajo de "Configuración avanzada" aparece un nuevo panel:

> **⚙ PARAMETRIZACIÓN (ZONA · CONDICIÓN · REPETICIÓN)** ▼

Tres campos opcionales:

### 3.1 — Zona

Asigna la pieza a una de las zonas que definiste en el Paso 2. Si no asignás, la pieza usa el material del módulo (legacy).

### 3.2 — Condición *(opcional)*

Una **expresión booleana**. Si da `false`, la pieza **no se crea** (no aparece en 3D ni en el costo).

Ejemplos:

| Expresión | Significado |
|---|---|
| `cajones > 0` | La pieza solo existe si hay cajones |
| `tieneTapa` | La pieza solo existe si el booleano `tieneTapa` es Sí |
| `frente == 'aluminio'` | La pieza solo si el frente elegido es "aluminio" |
| `cajones >= 3 && puertas == 0` | Más de 3 cajones Y sin puertas |

### 3.3 — Repetición *(opcional)*

Hace que la pieza se **multiplique** según un valor. Tres campos:

| Campo | Qué es | Ejemplos |
|---|---|---|
| **Variable** | Nombre del índice (default `i`) | `i`, `n`, `idx` |
| **Desde** | Primer valor (suele ser 1) | `1` |
| **Hasta** | Último valor — puede ser fórmula | `cajones`, `puertas`, `5` |

Dentro de las fórmulas (formula1/formula2/posFormulas) podés usar `i` para diferenciar cada copia.

En el **nombre** podés usar `{i}` o `#{i}` para que cada copia tenga su número:
- `Frente cajón #{i}` → "Frente cajón 1", "Frente cajón 2", ...

---

## Paso 4 — Conectar los herrajes a los parámetros

En el acordeón de **Herrajes** del módulo, cada fila tiene un botón **"fx"**.

- **Modo normal:** cantidad numérica (ej: 4 bisagras)
- **Modo fx (fórmula):** cantidad calculada por fórmula (ej: `cajones`)

En modo fx aparecen dos campos:

| Campo | Qué es |
|---|---|
| **Cantidad (fórmula)** | Cuántos herrajes — puede ser fórmula |
| **Condición** *(opcional)* | Si es false, no se incluye el herraje |

### Ejemplos

| Herraje | Cantidad | Condición |
|---|---|---|
| Corredera de cajón | `cajones` | `cajones > 0` |
| Bisagra de cazoleta | `puertas * 2` | `puertas > 0` |
| Perfil aluminio H | `puertas` | `frente == 'aluminio'` |
| Manija | `puertas + cajones` | `manija == true` |

---

## Sintaxis de fórmulas

Tanto en parámetros tipo "fórmula" como en `condition`, `repeat.to`, `cantidad` de herraje, `formula1/2` de pieza y `posFormulas` se usa la misma sintaxis.

### Variables disponibles

| Variable | Qué es |
|---|---|
| `ancho`, `alto`, `profundidad` | Dimensiones del módulo (mm) |
| `esp` | Espesor del material de la pieza (mm) |
| Cualquier `parametro.id` | Valor actual del parámetro |
| Cualquier `variable` custom | Definida en el panel "Variables" del módulo |
| `i` (en fórmulas de pieza con `repeat`) | Índice actual |
| `parent.X`, `material.X` | Notación con punto (avanzado) |

### Operadores

```
Aritmética:    +  -  *  /  ( )
Comparación:   >  <  >=  <=  ==  !=
Lógicos:       &&  ||
Ternario:      cond ? a : b
```

### Funciones

```
min(a, b, ...)  max(a, b, ...)
round(x)        ceil(x)        floor(x)
abs(x)
```

### Ejemplos prácticos

```js
// Alto del cajón = (alto disponible / cantidad) - margen
(alto - 2*esp) / cajones - 4

// Ancho de la pieza con margen
ancho - 4

// Cantidad de herraje según parámetro booleano
manija ? puertas + cajones : 0

// Constraint de validación
alto >= cajones * 80
```

---

## Paso 5 — Reglas de validación *(opcional)*

Sub-sección **⚠ Reglas de validación** del panel paramétrico.

Cada regla tiene:

| Campo | Qué es |
|---|---|
| **Condición que debe ser verdadera** | Fórmula booleana |
| **Mensaje al usuario** | Lo que aparece si la condición falla |

Ejemplos:

| Condición | Mensaje |
|---|---|
| `alto >= cajones * 80` | "El alto no alcanza para tantos cajones (mínimo 80mm cada uno)" |
| `ancho <= 1200` | "Excede el ancho máximo de placa (1200mm)" |
| `cajones + puertas <= 8` | "Demasiados elementos para este módulo" |

Si una regla falla, el usuario verá el mensaje **en rojo** debajo del configurador, pero el módulo sigue funcionando (es un warning, no un bloqueo).

---

## Paso 6 — Sub-componentes *(opcional pero potente)*

Sub-sección **🧩 Sub-componentes (módulos hijos)** del panel paramétrico.

### Qué son

Un sub-componente es un **mini-módulo dentro del módulo padre**. Tiene:

- **Su propio eje 0,0,0 local** (esquina inferior-izquierda-fondo del subcomp)
- **Sus propias dimensiones** locales (pueden ser fórmulas que usan vars del padre)
- **Sus propios parámetros**
- **Sus propias piezas** (diseñadas en coords locales — más fácil mentalmente)
- **Sus propios herrajes**
- **Un origen `{x, y, z}`** que ancla ese (0,0,0) en el padre
- **Repeat opcional** — N instancias por subcomp (ej: `to: "cajones"`)
- **Condition opcional** — el subcomp solo existe si truthy

### Cuándo usar uno

| Caso | Usar `pieza.repeat`? | Usar `subComponente.repeat`? |
|---|---|---|
| Solo se replica el frente del cajón | ✅ | ❌ (overkill) |
| Cajón armado completo (5 piezas + 2 correderas + tirador) | ❌ (sería 8 piezas con repeat separadas) | ✅ |
| Puerta con marco perimetral | depende | ✅ si tiene 4+ piezas que dependen de la puerta |
| Estantes interiores apilados | ✅ si es solo 1 pieza | ✅ si lleva soportes adicionales |

Regla rápida: **si lo que se replica son ≥ 3 piezas relacionadas, usá subcomponente**. Si es 1-2 piezas, alcanza con `pieza.repeat`.

### Los dos pasos para diseñar un subcomp

**Paso 6.1 — Armarlo "en su mundo":**
Las piezas del subcomp se diseñan como si fuera un módulo aislado. Las fórmulas usan `ancho` / `alto` / `profundidad` del SUBCOMP (no del padre). Y `posFormulas` ubican las piezas dentro del subcomp con origen en (0,0,0).

**Paso 6.2 — Ubicarlo en el padre:**
El campo **Origen** (x/y/z) dice dónde va a parar ese (0,0,0) del subcomp dentro del módulo padre. Acá las fórmulas usan vars del padre y el índice `i` del repeat.

### Campos del editor

| Bloque | Campos |
|---|---|
| Identificación | ID (válido como variable), nombre, ✕ Quitar |
| Repetición | `var` (default "i"), `desde`, `hasta` (núm o fórmula), `condición` opcional |
| 📐 Dimensiones LOCALES | `ancho` / `alto` / `profundidad` — fórmulas que pueden usar vars del padre |
| 📍 Origen en el padre | `x` / `y` / `z` — fórmulas que pueden usar vars del padre + `i` |
| 🪵 Piezas | Lista propia. Las fórmulas usan vars LOCALES (`ancho`, `alto`, `profundidad` = del subcomp) |
| 🔩 Herrajes | id, cantidad (núm o fórmula), condición opcional |

### Ejemplo: cajón armado completo

Caso real: una cajonera donde cada cajón debe replicarse entero (no solo el frente).

**Subcomponente "cajón":**

| Campo | Valor |
|---|---|
| ID | `cajon` |
| Nombre | `Cajón armado` |
| Repeat var / desde / hasta | `i` / `1` / `cajones` |
| Origen x / y / z | `esp` / `(i-1) * ((alto - 2*esp) / cajones) + esp` / `0` |
| Dim local ancho | `ancho - 2*esp` |
| Dim local alto | `(alto - 2*esp) / cajones - 4` |
| Dim local profundidad | `profundidad - 20` |

**Piezas del cajón** (todas en coords locales):

| Nombre | Fórmula 1 | Fórmula 2 | Cara | Zona |
|---|---|---|---|---|
| Frente cajón | `alto` | `ancho` | front | frente |
| Lateral izq caja | `alto` | `profundidad` | left | cajon |
| Lateral der caja | `alto` | `profundidad` | right | cajon |
| Trasera caja | `alto` | `ancho` | back | cajon |
| Base caja | `ancho` | `profundidad` | bottom | cajon |

**Herrajes del cajón:**

| Herraje | Cantidad | Condición |
|---|---|---|
| Corredera | `2` | — |
| Tirador | `1` | — |

**Resultado:** un solo parámetro `cajones` en el padre genera todos los cajones armados completos, posicionados automáticamente. Cambias `cajones=3` a `cajones=5` y aparecen 2 cajones más con todas sus piezas + correderas + tiradores.

### Vars disponibles dentro de un subcomp

| Donde la usás | Qué vars hay |
|---|---|
| `repeat.to`, `origen.x/y/z`, `condition` del subcomp | Vars del padre + parámetros del padre + `i` |
| `dimensiones` del subcomp | Vars del padre + parámetros del padre + `i` |
| Fórmulas de piezas/herrajes DENTRO del subcomp | Vars LOCALES (`ancho`, `alto`, `profundidad` = del subcomp), parámetros propios del subcomp, `esp` |

---

## Cómo lo usa el usuario del presupuesto

Una vez guardado el módulo paramétrico, hay **dos lugares** donde el usuario puede cambiar los parámetros:

### Lugar 1 — Panel inline del item del presupuesto

1. Click en el módulo en la lista del presupuesto
2. Se expande el panel inline (dims/material)
3. Debajo aparece **⚙ Configuración paramétrica** con un control por parámetro
4. Cambiar cualquier valor recalcula al instante: 3D, costo, total, lista de cortes

### Lugar 2 — Vista 3D del presupuesto

1. Tab **Vista 3D**
2. Los módulos del presupuesto aparecen automáticamente en la escena
3. Click en un módulo en la escena
4. Panel lateral derecho muestra **PARÁMETROS** con los mismos controles
5. Mismo comportamiento: todo se actualiza en vivo

Ambos lugares son **bidireccionales** — cambias en uno, se refleja en el otro.

---

## Cómo afecta al resto de la app

Cuando el usuario cambia un parámetro:

| Componente | Qué se actualiza |
|---|---|
| Modelo 3D | Piezas se generan/eliminan, dimensiones cambian |
| Costo del módulo | Materiales (m² de cada zona), tapacanto, herrajes |
| Total del presupuesto | Suma actualizada |
| Lista de cortes | Cantidad y dimensiones de cada pieza |
| Vista previa / PDF | Refleja el costo y la cantidad de items |
| Caja | Costo automático para cálculo de ganancia |
| Trabajos (kanban) | Costo del item |

Todo automático — vos solo definís el módulo bien, el resto sale solo.

---

## Ejemplo guiado — Cajonera con N cajones

> Si querés ver el resultado final ya armado, en el catálogo hay un botón **🧪 Ejemplo paramétrico** que carga esta cajonera de una.

### Diseño

- Módulo: 600 × 720 × 550 mm
- Cuerpo: 2 laterales + base + tapa (melamina 18mm)
- Frentes: N cajones apilados (MDF lacado 18mm)
- 1 corredera por cajón
- Validación: el alto debe alcanzar para todos los cajones (80mm mínimo c/u)

### Configuración paso a paso

**1. Crear el módulo** con dims 600×720×550, material melamina.

**2. Parámetro:**

| Campo | Valor |
|---|---|
| ID | `cajones` |
| Nombre | Cantidad de cajones |
| Tipo | Número entero |
| Default | 3 |
| Min | 1 |
| Max | 6 |

**3. Zonas:**

| ID | Nombre | Material |
|---|---|---|
| `cuerpo` | Cuerpo | melamina |
| `frente` | Frentes | mdf |

**4. Regla:**

| Condición | Mensaje |
|---|---|
| `alto >= cajones * 80` | El alto no alcanza para tantos cajones |

**5. Piezas:**

| Nombre | Cantidad | Zona | Cara | Fórmula1 | Fórmula2 | Repeat |
|---|---|---|---|---|---|---|
| Lateral izq | 1 | cuerpo | left | `alto` | `profundidad` | — |
| Lateral der | 1 | cuerpo | right | `alto` | `profundidad` | — |
| Base | 1 | cuerpo | bottom | `ancho - 2*esp` | `profundidad` | — |
| Tapa | 1 | cuerpo | top | `ancho - 2*esp` | `profundidad` | — |
| `Frente cajón #{i}` | 1 | frente | frente | `(alto - 2*esp) / cajones - 4` | `ancho - 4` | `i` de `1` a `cajones` |

**6. Herrajes:**

| Herraje | Cantidad | Condición |
|---|---|---|
| Corredera | `cajones` | `cajones > 0` |

### Resultado

- Por defecto: 3 cajones, costo X
- Usuario cambia a 5 → automáticamente: 5 frentes en 3D, 5 correderas, alto/cajón se reajusta, costo cambia, lista de cortes muestra 5 frentes
- Usuario cambia a 6 con módulo bajo (alto=400) → aparece warning: "El alto no alcanza para tantos cajones"

---

## Tips y trucos

- **Empezá simple.** Hacé andar el módulo sin parametros primero, después agregás uno por vez.
- **Usá el visor 3D del editor** mientras armás el módulo — los defaults de los parámetros se aplican y ves el resultado en vivo.
- **Los nombres de parámetros son sensibles a mayúsculas/minúsculas.** `Cajones` y `cajones` son distintos.
- **Si una fórmula da `0` y no entendés por qué:** revisá que las variables que usás existan (que el parámetro esté definido, que la zona tenga material, etc.). Probá en el visor 3D del editor — si la pieza no aparece o tiene tamaño raro, la fórmula está mal.
- **Las constraints son warnings, no bloqueos.** El usuario puede ignorarlas si quiere.
- **Para borrar un parámetro/zona/regla** usá el botón ✕ Quitar de cada fila.
- **El botón "🧪 Ejemplo paramétrico"** del catálogo se puede apretar varias veces — actualiza el módulo a la última versión.

---

## Glosario rápido

| Término | Significado |
|---|---|
| Parámetro | Variable que el usuario del presupuesto puede ajustar |
| Zona | Grupo de piezas con material común (cuerpo, frente, etc.) |
| Condition | Expresión booleana que decide si una pieza/herraje existe |
| Repeat | Multiplicación automática de una pieza según un valor |
| Constraint | Regla de validación con mensaje al usuario |
| Default | Valor inicial de un parámetro |
| Fórmula | Expresión matemática que combina variables, parámetros y operadores |
