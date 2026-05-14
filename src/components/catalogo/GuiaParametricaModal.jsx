// ════════════════════════════════════════════════════════════════════════════
// GuiaParametricaModal.jsx
// ════════════════════════════════════════════════════════════════════════════
//
// Overlay full-screen con la guía de uso del sistema paramétrico.
// Se abre desde el botón "📖 Guía" en el catálogo.
// El contenido refleja GUIA_PARAMETRICA.md (raíz del repo).
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';

const C = {
  bg:        'rgba(8, 10, 13, 0.90)',
  card:      'var(--bg-base)',
  border:    'var(--border)',
  borderAcc: 'rgba(200,160,42,0.35)',
  text:      'var(--text-primary)',
  textDim:   'var(--text-secondary)',
  textMute:  'var(--text-muted)',
  accent:    '#c8a02a',
  accentBg:  'rgba(200,160,42,0.10)',
  hi:        '#d4af37',
  warn:      '#e07070',
  warnBg:    'rgba(200,60,60,0.08)',
  warnBord:  'rgba(200,60,60,0.30)',
  surface:   'var(--bg-surface)',
};

const M = "'DM Mono', monospace";
const S = "'Bricolage Grotesque', sans-serif";

const codeStyle = {
  fontFamily: M, fontSize: 11, background: C.surface,
  border: `1px solid ${C.border}`, borderRadius: 4,
  padding: '1px 6px', color: C.hi,
};
const Codeline = ({ children }) => (
  <div style={{
    fontFamily: M, fontSize: 12, background: C.surface,
    border: `1px solid ${C.border}`, borderRadius: 6,
    padding: '8px 12px', color: C.hi, whiteSpace: 'pre-wrap',
    margin: '6px 0',
  }}>{children}</div>
);

// ── Tabla simple con estilo de la app ──────────────────────────────────────
const Tabla = ({ headers, rows }) => (
  <div style={{
    margin: '10px 0', borderRadius: 8, overflow: 'hidden',
    border: `1px solid ${C.border}`,
  }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${headers.length}, 1fr)`,
      background: 'rgba(255,255,255,0.04)',
    }}>
      {headers.map((h, i) => (
        <div key={i} style={{
          padding: '8px 12px', fontSize: 10, fontFamily: M, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', color: C.accent,
          borderRight: i < headers.length - 1 ? `1px solid ${C.border}` : 'none',
        }}>{h}</div>
      ))}
    </div>
    {rows.map((row, ri) => (
      <div key={ri} style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${headers.length}, 1fr)`,
        borderTop: `1px solid ${C.border}`,
      }}>
        {row.map((cell, ci) => (
          <div key={ci} style={{
            padding: '8px 12px', fontSize: 12, color: C.text,
            borderRight: ci < row.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>{cell}</div>
        ))}
      </div>
    ))}
  </div>
);

// ── Sección colapsable ──────────────────────────────────────────────────────
const Seccion = ({ icon, titulo, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${C.border}`, marginBottom: 10,
    }}>
      <div onClick={() => setOpen(o => !o)} style={{
        padding: '12px 16px', background: 'rgba(255,255,255,0.05)',
        borderLeft: `3px solid ${C.borderAcc}`, cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        userSelect: 'none',
      }}>
        <span style={{
          fontSize: 12, fontFamily: M, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '0.10em', color: C.accent,
        }}>{icon} {titulo}</span>
        <span style={{
          fontSize: 11, color: C.textMute, transition: 'transform 0.2s',
          display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>▼</span>
      </div>
      {open && (
        <div style={{
          padding: '14px 18px', background: C.card, color: C.text,
          fontSize: 13, fontFamily: S, lineHeight: 1.65,
        }}>{children}</div>
      )}
    </div>
  );
};

const P = ({ children, dim }) => (
  <p style={{
    margin: '6px 0', color: dim ? C.textDim : C.text, fontFamily: S, fontSize: 13, lineHeight: 1.6,
  }}>{children}</p>
);
const H = ({ children }) => (
  <div style={{
    fontSize: 12, fontFamily: M, fontWeight: 700, letterSpacing: '0.06em',
    color: C.hi, marginTop: 12, marginBottom: 6, textTransform: 'uppercase',
  }}>{children}</div>
);
const Quote = ({ children }) => (
  <div style={{
    margin: '10px 0', padding: '10px 14px', borderRadius: 6,
    background: C.accentBg, borderLeft: `3px solid ${C.borderAcc}`,
    color: C.text, fontSize: 13, fontStyle: 'italic',
  }}>{children}</div>
);
const Lista = ({ items }) => (
  <ul style={{ margin: '6px 0 6px 20px', padding: 0, color: C.text, fontFamily: S, fontSize: 13, lineHeight: 1.7 }}>
    {items.map((it, i) => <li key={i}>{it}</li>)}
  </ul>
);

// ────────────────────────────────────────────────────────────────────────────
// Modal principal
// ────────────────────────────────────────────────────────────────────────────

export default function GuiaParametricaModal({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: C.bg, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 960, maxHeight: '92vh',
        background: C.card, borderRadius: 14, overflow: 'hidden',
        border: `1px solid ${C.borderAcc}`, display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: S }}>
              📖 Guía — Módulos paramétricos
            </div>
            <div style={{ fontSize: 11, color: C.textMute, fontFamily: M, marginTop: 2 }}>
              Cómo configurar módulos personalizables del catálogo
            </div>
          </div>
          <button onClick={onClose} style={{
            padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${C.warnBord}`,
            color: C.warn, fontFamily: M, fontSize: 12,
          }}>✕ Cerrar</button>
        </div>

        {/* Body scrolleable */}
        <div style={{ overflowY: 'auto', padding: '18px 20px', flex: 1 }}>

          {/* Concepto en una línea */}
          <Quote>
            Un módulo paramétrico es un molde. El usuario del presupuesto elige los valores y el sistema arma las piezas, calcula los costos y dibuja el 3D solo.
          </Quote>

          {/* Workflow general */}
          <Seccion icon="🚀" titulo="Workflow general" defaultOpen>
            <P>El orden recomendado para armar un módulo paramétrico:</P>
            <Codeline>{`1. Crear el módulo en el catálogo (forma básica)
2. Definir parámetros, zonas y reglas
3. Asignar a cada pieza su zona, condición y/o repetición
4. Asignar a cada herraje su cantidad-fórmula y/o condición
5. Guardar el módulo
6. En el presupuesto: cargar el módulo y ajustar parámetros`}</Codeline>
            <P dim>Tip: empezá simple. Hacé andar el módulo sin parámetros primero, después agregás uno por vez.</P>
          </Seccion>

          {/* Las 4 piezas */}
          <Seccion icon="🧩" titulo="Las 4 piezas del rompecabezas" defaultOpen>
            <Tabla
              headers={["Componente", "Para qué sirve"]}
              rows={[
                ["Parámetros", "Lo que el usuario va a poder ajustar (cantidad de cajones, manija sí/no)"],
                ["Zonas",      "Agrupar piezas que comparten material (cuerpo en melamina, frentes en MDF)"],
                ["Piezas paramétricas", "Cómo cambia cada pieza según los parámetros (aparece, se repite, cambia tamaño)"],
                ["Reglas",     "Validaciones opcionales (ej: 'el alto no alcanza para tantos cajones')"],
              ]}
            />
          </Seccion>

          {/* Paso 1 — Parámetros */}
          <Seccion icon="🎚" titulo="Paso 1 — Definir los parámetros">
            <P>En el editor del módulo, al final del formulario:</P>
            <Quote><span style={codeStyle}>⚙ PARAMETRIZAR ESTE MÓDULO</span> → primera sub-sección: <b>🎚 Parámetros configurables</b></Quote>
            <H>Para cada parámetro definís</H>
            <Tabla
              headers={["Campo", "Qué es"]}
              rows={[
                [<code style={codeStyle}>ID</code>, "Nombre interno usable en fórmulas (ej: cajones, puertas). Solo letras, números y _."],
                ["Nombre visible", "Lo que ve el usuario (ej: 'Cantidad de cajones')"],
                ["Tipo", "Número entero · Decimal · Sí/No · Opción de lista · Fórmula calculada"],
                ["Default", "Valor inicial al cargar el módulo"],
                ["Min / Max", "Solo para números — restringe el rango"],
                ["Opciones", "Solo para 'Opción de lista' — valores separados por coma"],
                ["Expresión", "Solo para 'Fórmula calculada' — se evalúa automáticamente"],
              ]}
            />
            <H>Cuándo usar cada tipo</H>
            <Lista items={[
              <><b>Número entero</b> → cantidad de cosas (cajones, puertas, estantes)</>,
              <><b>Número decimal</b> → medidas con coma (raro)</>,
              <><b>Sí/No</b> → tiene/no tiene algo (manija, vidriado, retro-iluminación)</>,
              <><b>Opción de lista</b> → variantes con nombre (frente: liso/manija/gola)</>,
              <><b>Fórmula calculada</b> → valor derivado que el usuario no edita pero se usa en otras fórmulas (ej: <code style={codeStyle}>altoUtil = alto - 2*esp</code>)</>,
            ]} />
          </Seccion>

          {/* Paso 2 — Zonas */}
          <Seccion icon="🎨" titulo="Paso 2 — Definir las zonas">
            <P>Sub-sección <b>🎨 Zonas (material por grupo de piezas)</b>.</P>
            <P>Una zona es una agrupación lógica de piezas con material propio. Los nombres son <b>libres</b> — vos decidís.</P>
            <H>Ejemplo típico de cocina</H>
            <Tabla
              headers={["Zona", "Material", "Para qué"]}
              rows={[
                [<code style={codeStyle}>cuerpo</code>, "melamina 18mm", "Laterales, base, tapa"],
                [<code style={codeStyle}>frentes</code>, "MDF lacado 18mm", "Puertas, frentes de cajón"],
                [<code style={codeStyle}>fondos</code>, "fibrofácil 5mm", "Fondo del módulo"],
                [<code style={codeStyle}>interiores</code>, "melamina 15mm", "Estantes interiores"],
              ]}
            />
            <P dim><b>Si no definís zonas:</b> todas las piezas usan el material del módulo. Solo definí zonas si querés mezclar materiales.</P>
          </Seccion>

          {/* Paso 3 — Piezas */}
          <Seccion icon="🪵" titulo="Paso 3 — Conectar las piezas a los parámetros">
            <P>Al editar una pieza en <b>FormPieza</b>, debajo de "Configuración avanzada":</P>
            <Quote><span style={codeStyle}>⚙ PARAMETRIZACIÓN (ZONA · CONDICIÓN · REPETICIÓN)</span></Quote>

            <H>3.1 — Zona</H>
            <P>Asigna la pieza a una de las zonas del Paso 2. Sin asignar, la pieza usa el material del módulo.</P>

            <H>3.2 — Condición (opcional)</H>
            <P>Expresión booleana. Si da <code style={codeStyle}>false</code>, la pieza <b>no se crea</b> (no aparece en 3D ni en el costo).</P>
            <Tabla
              headers={["Expresión", "Significado"]}
              rows={[
                [<code style={codeStyle}>cajones &gt; 0</code>, "La pieza solo si hay cajones"],
                [<code style={codeStyle}>tieneTapa</code>, "La pieza solo si el booleano es Sí"],
                [<code style={codeStyle}>frente == 'aluminio'</code>, "Solo si el frente elegido es 'aluminio'"],
                [<code style={codeStyle}>cajones &gt;= 3 && puertas == 0</code>, "Más de 3 cajones Y sin puertas"],
              ]}
            />

            <H>3.3 — Repetición (opcional)</H>
            <P>Hace que la pieza se <b>multiplique</b> según un valor.</P>
            <Tabla
              headers={["Campo", "Qué es", "Ejemplos"]}
              rows={[
                ["Variable", "Nombre del índice (default i)", <code style={codeStyle}>i, n, idx</code>],
                ["Desde", "Primer valor (suele ser 1)", <code style={codeStyle}>1</code>],
                ["Hasta", "Último valor — puede ser fórmula", <code style={codeStyle}>cajones, puertas, 5</code>],
              ]}
            />
            <P>Dentro de las fórmulas (formula1/formula2/posFormulas) podés usar <code style={codeStyle}>i</code> para diferenciar cada copia.</P>
            <P>En el <b>nombre</b> podés usar <code style={codeStyle}>{"{i}"}</code> o <code style={codeStyle}>{"#{i}"}</code> para que cada copia tenga su número:</P>
            <Codeline>{`Frente cajón #{i}  →  "Frente cajón 1", "Frente cajón 2", ...`}</Codeline>
          </Seccion>

          {/* Paso 4 — Herrajes */}
          <Seccion icon="🔩" titulo="Paso 4 — Conectar los herrajes a los parámetros">
            <P>En el acordeón de <b>Herrajes</b> del módulo, cada fila tiene un botón <b>"fx"</b>:</P>
            <Lista items={[
              <><b>Modo normal:</b> cantidad numérica fija (ej: 4 bisagras)</>,
              <><b>Modo fx (fórmula):</b> cantidad calculada por fórmula (ej: <code style={codeStyle}>cajones</code>)</>,
            ]} />
            <P>En modo fx aparecen dos campos:</P>
            <Tabla
              headers={["Campo", "Qué es"]}
              rows={[
                ["Cantidad (fórmula)", "Cuántos herrajes — puede ser fórmula"],
                ["Condición (opcional)", "Si es false, no se incluye el herraje"],
              ]}
            />
            <H>Ejemplos</H>
            <Tabla
              headers={["Herraje", "Cantidad", "Condición"]}
              rows={[
                ["Corredera de cajón", <code style={codeStyle}>cajones</code>, <code style={codeStyle}>cajones &gt; 0</code>],
                ["Bisagra de cazoleta", <code style={codeStyle}>puertas * 2</code>, <code style={codeStyle}>puertas &gt; 0</code>],
                ["Perfil aluminio H", <code style={codeStyle}>puertas</code>, <code style={codeStyle}>frente == 'aluminio'</code>],
                ["Manija", <code style={codeStyle}>puertas + cajones</code>, <code style={codeStyle}>manija == true</code>],
              ]}
            />
          </Seccion>

          {/* Sintaxis de fórmulas */}
          <Seccion icon="🧮" titulo="Sintaxis de fórmulas" defaultOpen>
            <P>Las fórmulas se usan en parámetros tipo "fórmula", en <code style={codeStyle}>condition</code>, <code style={codeStyle}>repeat.to</code>, cantidad de herraje, formula1/2 de pieza y posFormulas.</P>

            <H>Variables disponibles</H>
            <Tabla
              headers={["Variable", "Qué es"]}
              rows={[
                [<code style={codeStyle}>ancho, alto, profundidad</code>, "Dimensiones del módulo (mm)"],
                [<code style={codeStyle}>esp</code>, "Espesor del material de la pieza (mm)"],
                ["Cualquier parametro.id", "Valor actual del parámetro"],
                ["Cualquier variable custom", "Definida en el panel 'Variables' del módulo"],
                [<code style={codeStyle}>i</code>, "En piezas con repeat — índice actual"],
                [<code style={codeStyle}>parent.X, material.X</code>, "Notación con punto (avanzado)"],
              ]}
            />

            <H>Operadores y funciones</H>
            <Codeline>{`Aritmética:    +  -  *  /  ( )
Comparación:   >  <  >=  <=  ==  !=
Lógicos:       &&  ||
Ternario:      cond ? a : b

Funciones:
  min(a, b, ...)  max(a, b, ...)
  round(x)        ceil(x)        floor(x)
  abs(x)`}</Codeline>

            <H>Ejemplos prácticos</H>
            <Codeline>{`// Alto del cajón = (alto disponible / cantidad) - margen
(alto - 2*esp) / cajones - 4

// Ancho de la pieza con margen
ancho - 4

// Cantidad de herraje según parámetro booleano
manija ? puertas + cajones : 0

// Constraint de validación
alto >= cajones * 80`}</Codeline>
          </Seccion>

          {/* Paso 5 — Reglas */}
          <Seccion icon="⚠" titulo="Paso 5 — Reglas de validación (opcional)">
            <P>Sub-sección <b>⚠ Reglas de validación</b> del panel paramétrico.</P>
            <Tabla
              headers={["Campo", "Qué es"]}
              rows={[
                ["Condición que debe ser verdadera", "Fórmula booleana"],
                ["Mensaje al usuario", "Lo que aparece si la condición falla"],
              ]}
            />
            <H>Ejemplos</H>
            <Tabla
              headers={["Condición", "Mensaje"]}
              rows={[
                [<code style={codeStyle}>alto &gt;= cajones * 80</code>, "El alto no alcanza para tantos cajones"],
                [<code style={codeStyle}>ancho &lt;= 1200</code>, "Excede el ancho máximo de placa"],
                [<code style={codeStyle}>cajones + puertas &lt;= 8</code>, "Demasiados elementos para este módulo"],
              ]}
            />
            <P dim>Si una regla falla, el usuario verá el mensaje <b style={{color: C.warn}}>en rojo</b> debajo del configurador, pero el módulo sigue funcionando (es un warning, no un bloqueo).</P>
          </Seccion>

          {/* Cómo lo usa el usuario */}
          <Seccion icon="👤" titulo="Cómo lo usa el usuario del presupuesto" defaultOpen>
            <P>Una vez guardado el módulo, hay <b>dos lugares</b> donde el usuario puede ajustar los parámetros:</P>

            <H>Lugar 1 — Panel inline del item del presupuesto</H>
            <Lista items={[
              "Click en el módulo en la lista del presupuesto",
              "Se expande el panel inline (dims/material)",
              <>Debajo aparece <b>⚙ Configuración paramétrica</b> con un control por parámetro</>,
              "Cambiar cualquier valor recalcula al instante: 3D, costo, total, lista de cortes",
            ]} />

            <H>Lugar 2 — Vista 3D del presupuesto</H>
            <Lista items={[
              "Tab Vista 3D",
              "Los módulos del presupuesto aparecen automáticamente en la escena",
              "Click en un módulo en la escena",
              <>Panel lateral derecho muestra <b>PARÁMETROS</b> con los mismos controles</>,
              "Mismo comportamiento: todo se actualiza en vivo",
            ]} />

            <P dim>Ambos lugares son <b>bidireccionales</b> — cambias en uno, se refleja en el otro.</P>
          </Seccion>

          {/* Cómo afecta al resto */}
          <Seccion icon="🔄" titulo="Cómo afecta al resto de la app">
            <P>Cuando el usuario cambia un parámetro:</P>
            <Tabla
              headers={["Componente", "Qué se actualiza"]}
              rows={[
                ["Modelo 3D", "Piezas se generan/eliminan, dimensiones cambian"],
                ["Costo del módulo", "Materiales (m² de cada zona), tapacanto, herrajes"],
                ["Total del presupuesto", "Suma actualizada"],
                ["Lista de cortes", "Cantidad y dimensiones de cada pieza"],
                ["Vista previa / PDF", "Refleja el costo y la cantidad de items"],
                ["Caja", "Costo automático para cálculo de ganancia"],
                ["Trabajos (kanban)", "Costo del item"],
              ]}
            />
            <P>Todo automático — vos solo definís el módulo bien, el resto sale solo.</P>
          </Seccion>

          {/* Ejemplo guiado */}
          <Seccion icon="🧪" titulo="Ejemplo guiado — Cajonera con N cajones" defaultOpen>
            <Quote>
              Si querés ver el resultado final ya armado, en el catálogo hay un botón <b>🧪 Ejemplo paramétrico</b> que carga esta cajonera de una.
            </Quote>

            <H>Diseño</H>
            <Lista items={[
              "Módulo: 600 × 720 × 550 mm",
              "Cuerpo: 2 laterales + base + tapa (melamina 18mm)",
              "Frentes: N cajones apilados (MDF lacado 18mm)",
              "1 corredera por cajón",
              "Validación: el alto debe alcanzar (80mm mínimo por cajón)",
            ]} />

            <H>Parámetro</H>
            <Tabla
              headers={["Campo", "Valor"]}
              rows={[
                ["ID", <code style={codeStyle}>cajones</code>],
                ["Nombre", "Cantidad de cajones"],
                ["Tipo", "Número entero"],
                ["Default", "3"],
                ["Min / Max", "1 / 6"],
              ]}
            />

            <H>Zonas</H>
            <Tabla
              headers={["ID", "Nombre", "Material"]}
              rows={[
                [<code style={codeStyle}>cuerpo</code>, "Cuerpo", "melamina"],
                [<code style={codeStyle}>frente</code>, "Frentes", "mdf"],
              ]}
            />

            <H>Regla</H>
            <Tabla
              headers={["Condición", "Mensaje"]}
              rows={[[<code style={codeStyle}>alto &gt;= cajones * 80</code>, "El alto no alcanza para tantos cajones"]]}
            />

            <H>Piezas</H>
            <Tabla
              headers={["Nombre", "Zona", "Cara", "Fórmula1", "Fórmula2", "Repeat"]}
              rows={[
                ["Lateral izq", "cuerpo", "left",   "alto", "profundidad", "—"],
                ["Lateral der", "cuerpo", "right",  "alto", "profundidad", "—"],
                ["Base",        "cuerpo", "bottom", "ancho - 2*esp", "profundidad", "—"],
                ["Tapa",        "cuerpo", "top",    "ancho - 2*esp", "profundidad", "—"],
                ["Frente cajón #{i}", "frente", "frente", "(alto - 2*esp) / cajones - 4", "ancho - 4", "i de 1 a cajones"],
              ]}
            />

            <H>Herrajes</H>
            <Tabla
              headers={["Herraje", "Cantidad", "Condición"]}
              rows={[["Corredera", <code style={codeStyle}>cajones</code>, <code style={codeStyle}>cajones &gt; 0</code>]]}
            />

            <H>Resultado</H>
            <Lista items={[
              "Por defecto: 3 cajones, costo X",
              "Usuario cambia a 5 → automáticamente: 5 frentes en 3D, 5 correderas, alto/cajón se reajusta, costo cambia",
              "Usuario cambia a 6 con módulo bajo (alto=400) → aparece warning: 'El alto no alcanza para tantos cajones'",
            ]} />
          </Seccion>

          {/* Tips */}
          <Seccion icon="💡" titulo="Tips y trucos">
            <Lista items={[
              <><b>Empezá simple.</b> Hacé andar el módulo sin parámetros primero, después agregás uno por vez.</>,
              <><b>Usá el visor 3D del editor</b> mientras armás el módulo — los defaults de los parámetros se aplican y ves el resultado en vivo.</>,
              <><b>Los nombres de parámetros son sensibles a mayúsculas/minúsculas.</b> <code style={codeStyle}>Cajones</code> y <code style={codeStyle}>cajones</code> son distintos.</>,
              <><b>Si una fórmula da 0 y no entendés por qué:</b> revisá que las variables que usás existan (parámetro definido, zona con material). En el visor 3D del editor la pieza no aparece o tiene tamaño raro.</>,
              <><b>Las constraints son warnings, no bloqueos.</b> El usuario puede ignorarlas si quiere.</>,
              <><b>Para borrar un parámetro/zona/regla</b> usá el botón ✕ Quitar de cada fila.</>,
              <><b>El botón 🧪 Ejemplo paramétrico</b> del catálogo se puede apretar varias veces — actualiza el módulo a la última versión.</>,
            ]} />
          </Seccion>

          {/* Glosario */}
          <Seccion icon="📚" titulo="Glosario rápido">
            <Tabla
              headers={["Término", "Significado"]}
              rows={[
                ["Parámetro", "Variable que el usuario del presupuesto puede ajustar"],
                ["Zona", "Grupo de piezas con material común"],
                ["Condition", "Expresión booleana que decide si una pieza/herraje existe"],
                ["Repeat", "Multiplicación automática de una pieza según un valor"],
                ["Constraint", "Regla de validación con mensaje al usuario"],
                ["Default", "Valor inicial de un parámetro"],
                ["Fórmula", "Expresión matemática que combina variables, parámetros y operadores"],
              ]}
            />
          </Seccion>

        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 20px', borderTop: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <span style={{ fontSize: 10, color: C.textMute, fontFamily: M }}>
            Click fuera del panel para cerrar
          </span>
          <button onClick={onClose} style={{
            padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
            background: C.accentBg, border: `1px solid ${C.borderAcc}`,
            color: C.accent, fontFamily: M, fontSize: 11, fontWeight: 700,
          }}>✓ Entendido</button>
        </div>
      </div>
    </div>
  );
}
