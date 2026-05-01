// ════════════════════════════════════════════════════════════════════════════
// constants.js — CarpiCálc
// ════════════════════════════════════════════════════════════════════════════
//
// Centraliza TODOS los datos iniciales, constantes de dominio y listas
// de referencia de la aplicación.
//
// ¿Cuándo tocar este archivo?
//   • Para cambiar los valores por defecto de costos/módulos al instalar
//   • Para agregar un nuevo tipo de material (TIPO_MAT)
//   • Para agregar/modificar estados del Kanban (ESTADOS_TRABAJO)
//   • Para agregar categorías del catálogo (CATEGORIAS_DEFAULT)
//
// IMPORTANTE: Este archivo NO importa React ni hace side effects.
// Es puro JS — se puede usar en tests sin montar componentes.
// ════════════════════════════════════════════════════════════════════════════

// ── Contraseña de acceso ──────────────────────────────────────────────────
// Codificada en base64 para evitar que quede en texto plano en el bundle.
// Para cambiarla: btoa("nueva_contraseña")
export const PASS_HASH = btoa("carpicalc2025");
export const PASS_KEY  = "carpicalc:auth";

// ── Perfil vacío del taller ───────────────────────────────────────────────
// Estructura base que se usa cuando el usuario aún no cargó sus datos.
export const PERFIL_VACIO = {
  nombre:        "",
  slogan:        "",
  tel:           "",
  email:         "",
  direccion:     "",
  logo:          null,   // base64 string o null
  textoApertura: "",     // aparece al inicio del presupuesto PDF
  condiciones:   "",     // condiciones comerciales al pie del PDF
};

// ── Tipos de material (clave → etiqueta legible) ──────────────────────────
// Usado en selects y para mostrar el material de cada módulo.
export const TIPO_MAT = {
  melamina:     "Melamina",
  mdf:          "MDF",
  madera_maciza:"Madera maciza",
  terciado:     "Terciado",
};

// ── Categorías del catálogo de módulos ────────────────────────────────────
// Permiten organizar el catálogo por tipo de mueble.
// Cada categoría tiene: id único, etiqueta, ícono y color de acento.
export const CATEGORIAS_DEFAULT = [
  { id: "bajos",    label: "Bajos",    icon: "⬇", color: "#7090c0" },
  { id: "altos",    label: "Altos",    icon: "⬆", color: "#9070b0" },
  { id: "placares", label: "Placares", icon: "🚪", color: "#70a080" },
  { id: "living",   label: "Living",   icon: "🛋", color: "#c09050" },
  { id: "banio",    label: "Baño",     icon: "🚿", color: "#5090a0" },
  { id: "otros",    label: "Otros",    icon: "📦", color: "#808080" },
];

// ── Estados del Kanban de Trabajos ────────────────────────────────────────
// Define el flujo de vida de un presupuesto/trabajo.
// El orden de este array determina el orden en el tablero Kanban.
export const ESTADOS_TRABAJO = [
  { id: "nuevo",      label: "Nuevo",          color: "#7090b0", icon: "🆕" },
  { id: "enviado",    label: "Enviado",         color: "#c8a030", icon: "📤" },
  { id: "aceptado",   label: "Aceptado",        color: "#60a870", icon: "✅" },
  { id: "produccion", label: "En producción",   color: "#c85030", icon: "🪚" },
  { id: "entregado",  label: "Entregado",       color: "#7ecf8a", icon: "📦" },
];

// ════════════════════════════════════════════════════════════════════════════
// DATOS DE EJEMPLO / VALORES INICIALES
// ════════════════════════════════════════════════════════════════════════════
//
// Se usan solo la primera vez que el usuario abre la app (cuando localStorage
// está vacío). No se modifican en runtime.
//
// costoIniciales   → tabla de precios de materiales, herrajes, MO y tapacanto
// modulosIniciales → catálogo de ejemplo con 2 módulos parametrizados
// ════════════════════════════════════════════════════════════════════════════

// ── Costos iniciales ──────────────────────────────────────────────────────
export const costoIniciales = {
  // Materiales: cada uno tiene tipo, espesor, precio por m², y tamaño de placa estándar
  materiales: [
    { id: 1, nombre: "Melamina 18mm",  tipo: "melamina",      espesor: 18, precioM2: 4200, placaLargo: 2750, placaAncho: 1830 },
    { id: 2, nombre: "MDF 18mm",       tipo: "mdf",           espesor: 18, precioM2: 3800, placaLargo: 2750, placaAncho: 1830 },
    { id: 3, nombre: "Madera maciza",  tipo: "madera_maciza", espesor: 20, precioM2: 9500, placaLargo: 2440, placaAncho: 1220 },
    { id: 4, nombre: "Terciado 15mm",  tipo: "terciado",      espesor: 15, precioM2: 3200, placaLargo: 2440, placaAncho: 1220 },
  ],
  // Mano de obra: "por_modulo" es precio fijo; "por_hora" requiere ingresar las horas
  manoDeObra: [
    { id: 1, nombre: "Armado módulo estándar", tipo: "por_modulo", precio: 8000 },
    { id: 2, nombre: "Instalación en obra",    tipo: "por_hora",   precio: 3500 },
  ],
  // Herrajes: precio unitario (bisagras, corredores, etc.)
  herrajes: [
    { id: 1, nombre: "Bisagra cazoleta",           precio: 450,  unidad: "u" },
    { id: 2, nombre: "Corredor telescópico 45cm",  precio: 1800, unidad: "u" },
    { id: 3, nombre: "Manija barra aluminio",       precio: 900,  unidad: "u" },
    { id: 4, nombre: "Perno minifix",               precio: 120,  unidad: "u" },
  ],
  // Tapacanto: precio por metro lineal
  tapacanto: [
    { id: 1, nombre: "Tapacanto melamina 19mm", precio: 180 },
    { id: 2, nombre: "Tapacanto PVC 2mm",        precio: 250 },
  ],
  // Porcentaje de desperdicio de material aplicado a m² bruto
  desperdicioPct: 20,
  // Porcentaje de ganancia aplicado sobre el costo base total
  gastosGenerales: 18,
  // Extras frecuentes: aparecen como sugerencias en la sección Adicionales del Presupuesto.
  // El carpintero puede agregar sus propios desde esa misma sección.
  extrasFrecuentes: [
    { id: 1, nombre: "Flete",                  precio: 15000 },
    { id: 2, nombre: "Instalación / Montaje",  precio: 25000 },
    { id: 3, nombre: "Diseño y planos",         precio: 20000 },
    { id: 4, nombre: "Pintura y terminaciones", precio: 18000 },
  ],
  // Gastos fijos del taller: usados en Costos → Gastos Fijos para calcular
  // el "costo por hora" real del taller y compararlo contra presupuestos.
  gastosFijos: {
    items: [
      { id: 1, nombre: "Alquiler",                   monto: 80000 },
      { id: 2, nombre: "Servicios (luz, gas, agua)",  monto: 15000 },
      { id: 3, nombre: "Monotributo / Impuestos",     monto: 25000 },
      { id: 4, nombre: "Seguros",                     monto: 12000 },
    ],
    horasProductivasMes: 160,
  },
};

// ── Módulos iniciales ─────────────────────────────────────────────────────
//
// Cada módulo define:
//   nombre / descripcion / dimensiones (en mm) / material
//   piezas: lista de cortes parametrizados
//     - usaDim / usaDim2: de qué dimensión del módulo toma la medida ("ancho", "alto", "profundidad")
//     - offsetEsp: cuántos espesores de placa restar/sumar a esa dimensión
//     - offsetMm: milímetros fijos a restar/sumar
//     - divisor: divide la dimensión (ej: para puertas dobles, divisor=2)
//     - tc: tapacanto — id del tipo + cantidad de lados en cada dimensión
//     - especial: true = usa dimLibre1/dimLibre2 en lugar de calcularlo
//   herrajes: lista de { id, cantidad } referenciando costos.herrajes[].id
//   moDeObra: tipo de mano de obra + horas (si aplica)
//
export const modulosIniciales = {
  MC001: {
    nombre:      "Módulo bajo mesada 60cm",
    descripcion: "Bajo mesada con puerta",
    dimensiones: { ancho: 600, profundidad: 550, alto: 700 },
    material:    "melamina",
    piezas: [
      { nombre: "Lateral", cantidad: 2, usaDim: "alto",  usaDim2: "profundidad", offsetEsp: 0,  offsetMm: 0, divisor: 1, offsetEsp2: 0, offsetMm2: 0, divisor2: 1, tc: { id: 1, lados1: 1, lados2: 0 } },
      { nombre: "Base",    cantidad: 1, usaDim: "ancho", usaDim2: "profundidad", offsetEsp: -2, offsetMm: 0, divisor: 1, offsetEsp2: 0, offsetMm2: 0, divisor2: 1, tc: { id: 1, lados1: 0, lados2: 1 } },
      { nombre: "Techo",   cantidad: 1, usaDim: "ancho", usaDim2: "profundidad", offsetEsp: -2, offsetMm: 0, divisor: 1, offsetEsp2: 0, offsetMm2: 0, divisor2: 1, tc: { id: 1, lados1: 1, lados2: 1 } },
      { nombre: "Puerta",  cantidad: 1, usaDim: "alto",  usaDim2: "ancho",       offsetEsp: 0,  offsetMm: 0, divisor: 1, offsetEsp2: 0, offsetMm2: 0, divisor2: 1, tc: { id: 1, lados1: 2, lados2: 2 } },
    ],
    herrajes: [{ id: 1, cantidad: 2 }],
    moDeObra: { tipo: "por_modulo", horas: 0 },
  },
  MC002: {
    nombre:      "Módulo colgante 60cm",
    descripcion: "Alacena 2 puertas",
    dimensiones: { ancho: 600, profundidad: 350, alto: 700 },
    material:    "melamina",
    piezas: [
      { nombre: "Lateral", cantidad: 2, usaDim: "alto",  usaDim2: "profundidad", offsetEsp: 0,  offsetMm: 0, divisor: 1, offsetEsp2: 0, offsetMm2: 0, divisor2: 1, tc: { id: 1, lados1: 1, lados2: 0 } },
      { nombre: "Base",    cantidad: 1, usaDim: "ancho", usaDim2: "profundidad", offsetEsp: -2, offsetMm: 0, divisor: 1, offsetEsp2: 0, offsetMm2: 0, divisor2: 1, tc: { id: 1, lados1: 0, lados2: 1 } },
      { nombre: "Techo",   cantidad: 1, usaDim: "ancho", usaDim2: "profundidad", offsetEsp: -2, offsetMm: 0, divisor: 1, offsetEsp2: 0, offsetMm2: 0, divisor2: 1, tc: { id: 1, lados1: 1, lados2: 1 } },
      { nombre: "Puerta",  cantidad: 2, usaDim: "alto",  usaDim2: "ancho",       offsetEsp: 0,  offsetMm: 0, divisor: 1, offsetEsp2: 0, offsetMm2: 0, divisor2: 1, tc: { id: 1, lados1: 2, lados2: 2 } },
    ],
    herrajes: [{ id: 1, cantidad: 4 }],
    moDeObra: { tipo: "por_modulo", horas: 0 },
  },
};
