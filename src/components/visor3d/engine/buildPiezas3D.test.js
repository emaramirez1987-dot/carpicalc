// ════════════════════════════════════════════════════════════════════════════
// buildPiezas3D.test.js — verifica el motor 3D end-to-end con módulo paramétrico
// ════════════════════════════════════════════════════════════════════════════

import { buildPiezas3D } from './buildPiezas3D.js';

const COSTOS = {
  materiales: [
    { tipo: 'melamina', nombre: 'Melamina 18mm', espesor: 18, precioM2: 100 },
    { tipo: 'mdf',      nombre: 'MDF 18mm',      espesor: 18, precioM2: 120 },
  ],
};

// Módulo de ejemplo igual al del botón "🧪 Ejemplo paramétrico" en Catalogo.
const MODULO_CAJONERA = {
  nombre: 'Cajonera',
  material: 'melamina',
  dimensiones: { ancho: 600, alto: 720, profundidad: 550 },
  variables: {},
  parametros: [
    { id: 'cajones', nombre: 'Cantidad de cajones', tipo: 'integer', def: 3, min: 1, max: 6 },
  ],
  zonas: [
    { id: 'cuerpo', nombre: 'Cuerpo',  material: 'melamina' },
    { id: 'frente', nombre: 'Frentes', material: 'mdf' },
  ],
  piezas: [
    { nombre: 'Lateral izq', cantidad: 1, zona: 'cuerpo', cara3d: 'left',
      formula1: 'alto', formula2: 'profundidad' },
    { nombre: 'Lateral der', cantidad: 1, zona: 'cuerpo', cara3d: 'right',
      formula1: 'alto', formula2: 'profundidad',
      posFormulas: { x: 'ancho - esp', y: '0', z: '0' } },
    { nombre: 'Base', cantidad: 1, zona: 'cuerpo', cara3d: 'bottom',
      formula1: 'ancho - 2*esp', formula2: 'profundidad',
      posFormulas: { x: 'esp', y: '0', z: '0' } },
    { nombre: 'Tapa', cantidad: 1, zona: 'cuerpo', cara3d: 'top',
      formula1: 'ancho - 2*esp', formula2: 'profundidad',
      posFormulas: { x: 'esp', y: 'alto - esp', z: '0' } },
    { nombre: 'Frente cajón #{i}', cantidad: 1, zona: 'frente', orientacion3d: 'frente',
      formula1: '(alto - 2*esp) / cajones - 4', formula2: 'ancho - 4',
      posFormulas: {
        x: '2',
        y: '(i-1) * ((alto - 2*esp) / cajones) + esp + 2',
        z: 'profundidad',
      },
      repeat: { var: 'i', from: 1, to: 'cajones' } },
  ],
  herrajes: [],
  moDeObra: { tipo: 'por_modulo', horas: 0 },
};

describe('buildPiezas3D — módulo cajonera paramétrico', () => {
  test('con cajones=3 (default) produce 4 piezas de cuerpo + 3 frentes = 7', () => {
    const out = buildPiezas3D(MODULO_CAJONERA, COSTOS, { cajones: 3 });
    expect(out).toHaveLength(7); // 2 lat + base + tapa + 3 frentes
    const frentes = out.filter(p => p.nombre.startsWith('Frente'));
    expect(frentes).toHaveLength(3);
    // Cada frente tiene size > 0 (no son piezas vacías)
    for (const f of frentes) {
      expect(f.size[0]).toBeGreaterThan(0);
      expect(f.size[1]).toBeGreaterThan(0);
      expect(f.size[2]).toBeGreaterThan(0);
    }
    // Las Y de los frentes son distintas (no apilados en el mismo lugar)
    const ys = frentes.map(f => f.pos[1]);
    expect(new Set(ys).size).toBe(3);
  });

  test('con cajones=5 produce 4 + 5 = 9 piezas', () => {
    const out = buildPiezas3D(MODULO_CAJONERA, COSTOS, { cajones: 5 });
    expect(out).toHaveLength(9);
    const frentes = out.filter(p => p.nombre.startsWith('Frente'));
    expect(frentes).toHaveLength(5);
  });

  test('frente tiene material mdf (de la zona "frente")', () => {
    const out = buildPiezas3D(MODULO_CAJONERA, COSTOS, { cajones: 3 });
    const frentes = out.filter(p => p.nombre.startsWith('Frente'));
    expect(frentes[0].materialTipo).toBe('mdf');
  });

  test('SIN parametrosValores → resolverParametros usa defaults (cajones=3)', () => {
    // resolverParametros aplica `def` cuando el usuario no provee valor,
    // así que el preview funciona aunque el caller no pase parametrosValores.
    const out = buildPiezas3D(MODULO_CAJONERA, COSTOS);
    const frentes = out.filter(p => p.nombre.startsWith('Frente'));
    expect(frentes).toHaveLength(3);
    expect(frentes[0].size[1]).toBeGreaterThan(0);
  });
});
