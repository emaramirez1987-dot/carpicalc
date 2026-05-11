import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getMaterialProps } from './useMaterial3D.js';
import { resolverDim, evaluarFormula } from '../../utils.js';

// ── Orientaciones 3D ──────────────────────────────────────────────────────────
// Solo 3 orientaciones + ignorar. La posición exacta siempre viene de posFormulas.
export const ORIENTACIONES_3D = [
  { id: 'vertical',    label: 'Vertical'   },  // espesor en X — laterales, divisores
  { id: 'horizontal',  label: 'Horizontal' },  // espesor en Y — techo, base, estantes
  { id: 'frente',      label: 'De frente'  },  // espesor en Z — puertas, cajones, fondos
  { id: 'ignorar',     label: 'No mostrar' },
];

// Migración desde sistemas anteriores (rol3d / cara3d)
const ROL3D_TO_ORIENT = {
  lateral_izq: 'vertical', lateral_der: 'vertical', lateral: 'vertical',
  techo: 'horizontal', base: 'horizontal', fondo: 'frente',
  puerta: 'frente', cajon: 'frente', estante: 'horizontal',
  horizontal_interna: 'horizontal', ignorar: 'ignorar',
};
const CARA_TO_ORIENT = {
  left: 'vertical', right: 'vertical',
  top: 'horizontal', bottom: 'horizontal', interior: 'horizontal',
  back: 'frente', front: 'frente',
  estante: 'horizontal', cajon: 'frente', ignorar: 'ignorar',
};

// Fallback por nombre cuando no hay campo orientacion3d/rol3d/cara3d
function clasificarPorNombre(nombre) {
  const n = (nombre || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/cajon|cajones|gaveta|puerta|frente|fondo|trasera|respaldo/.test(n)) return 'frente';
  if (/lateral|costado/.test(n))                                           return 'vertical';
  if (/techo|base|piso|estante|balda|horizontal|entrepa/.test(n))          return 'horizontal';
  return null;
}

function getOrientacion(pieza) {
  if (pieza.orientacion3d) return pieza.orientacion3d;
  if (pieza.cara3d  && CARA_TO_ORIENT[pieza.cara3d])  return CARA_TO_ORIENT[pieza.cara3d];
  if (pieza.rol3d   && ROL3D_TO_ORIENT[pieza.rol3d])  return ROL3D_TO_ORIENT[pieza.rol3d];
  return clasificarPorNombre(pieza.nombre);
}

// ── buildPiezas3D ─────────────────────────────────────────────────────────────
export function buildPiezas3D(modulo, costos) {
  if (!modulo?.piezas || !costos?.materiales) return [];

  const matDef = costos.materiales.find(m => m.tipo === modulo.material) || costos.materiales[0];
  if (!matDef) return [];

  const { ancho = 600, alto = 700, profundidad = 550 } = modulo.dimensiones || {};
  const esp = matDef.espesor || 18;
  const M   = 1000;

  const dimBase = { ancho, alto, profundidad, esp };
  const customVarsResolved = {};
  Object.entries(modulo.variables || {}).forEach(([k, v]) => {
    customVarsResolved[k] = typeof v === 'number'
      ? v
      : (evaluarFormula(String(v), dimBase) ?? parseFloat(String(v)) ?? 0);
  });
  const modVars = { ...dimBase, ...customVarsResolved };

  const hw = ancho       / 2 / M;
  const hh = alto        / 2 / M;
  const hd = profundidad / 2 / M;
  const te = esp / M;

  const result = [];

  modulo.piezas.forEach((p, piezaIdx) => {
    const orientacion = getOrientacion(p);
    if (orientacion === 'ignorar') return;

    const d1 = p.especial
      ? (parseFloat(p.dimLibre1) || 0)
      : p.formula1 != null
        ? (evaluarFormula(p.formula1, modVars) ?? 0)
        : resolverDim({ ancho, alto, profundidad }[p.usaDim], p.offsetEsp, p.offsetMm, p.divisor  || 1, esp);

    const d2 = p.especial
      ? (parseFloat(p.dimLibre2) || 0)
      : p.formula2 != null
        ? (evaluarFormula(p.formula2, modVars) ?? 0)
        : resolverDim({ ancho, alto, profundidad }[p.usaDim2], p.offsetEsp2, p.offsetMm2, p.divisor2 || 1, esp);

    const cantidad = p.cantidad || 1;

    for (let i = 0; i < cantidad; i++) {
      let size, autoPos, explodeVec;

      // Orientación determina cómo se mapean d1/d2 a los ejes 3D.
      // La posición exacta viene de posFormulas; estos son los defaults.
      switch (orientacion) {
        case 'vertical':
          size       = [te, d1 / M, d2 / M];
          autoPos    = [-(hw - te / 2), 0, 0];
          explodeVec = [-1, 0, 0];
          break;
        case 'horizontal':
          size       = [d1 / M, te, d2 / M];
          autoPos    = [0, hh - te / 2, 0];
          explodeVec = [0, 1, 0];
          break;
        case 'frente':
          size       = [d2 / M, d1 / M, te];
          autoPos    = [0, 0, hd + te / 2];
          explodeVec = [0, 0, 1];
          break;
        default:
          size       = [d1 / M || 0.3, te, d2 / M || 0.3];
          autoPos    = [0, 0, 0];
          explodeVec = [0, 1, 0];
      }

      // posFormulas: posición exacta desde esquina inferior-izquierda-fondo (mm).
      //   X: 0 = borde izq  →  ancho       = borde der
      //   Y: 0 = piso       →  alto        = techo
      //   Z: 0 = fondo      →  profundidad = frente
      if (p.posFormulas) {
        const pf      = p.posFormulas;
        const posVars = { ...modVars, d1, d2 };
        if (pf.x != null && pf.x !== '') { const v = evaluarFormula(String(pf.x), posVars); if (v !== null) autoPos[0] = v / 1000 + size[0] / 2 - hw; }
        if (pf.y != null && pf.y !== '') { const v = evaluarFormula(String(pf.y), posVars); if (v !== null) autoPos[1] = v / 1000 + size[1] / 2 - hh; }
        if (pf.z != null && pf.z !== '') { const v = evaluarFormula(String(pf.z), posVars); if (v !== null) autoPos[2] = v / 1000 + size[2] / 2 - hd; }
      }

      const offset3d = p.offset3d || { x: 0, y: 0, z: 0 };
      const rot3d    = p.rot3d || 0;
      const pos = [
        autoPos[0] + (offset3d.x || 0) / 1000,
        autoPos[1] + (offset3d.y || 0) / 1000,
        autoPos[2] + (offset3d.z || 0) / 1000,
      ];
      const hasOffset =
        Math.abs(offset3d.x || 0) > 0.01 ||
        Math.abs(offset3d.y || 0) > 0.01 ||
        Math.abs(offset3d.z || 0) > 0.01;
      const status = !orientacion ? 'unassigned' : hasOffset ? 'manual' : 'auto';

      result.push({
        id:           `${p.nombre}-${i}`,
        nombre:       p.nombre,
        role:         orientacion ?? 'unassigned',
        piezaIdx,
        size,
        pos,
        autoPos,
        explodeVec,
        offset3d,
        rot3d,
        status,
        materialTipo: modulo.material || 'melamina',
        isHandle:     false,
        hasManualPos: hasOffset,
      });
    }
  });

  return result;
}

// ── Pieza ─────────────────────────────────────────────────────────────────────
function Pieza({ size, pos, explodeVec, explodeFactor, materialTipo, selected, onClick, texturaDataUrl, rotY = 0 }) {
  const matProps = getMaterialProps(materialTipo);
  const ep       = explodeFactor * 0.35;
  const finalPos = [
    pos[0] + explodeVec[0] * ep,
    pos[1] + explodeVec[1] * ep,
    pos[2] + explodeVec[2] * ep,
  ];

  const texture = useMemo(() => {
    if (!texturaDataUrl || materialTipo === 'manija') return null;
    const tex = new THREE.TextureLoader().load(texturaDataUrl);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }, [texturaDataUrl, materialTipo]);

  return (
    <group position={finalPos} rotation={[0, rotY * Math.PI / 180, 0]} onClick={onClick}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          key={texturaDataUrl ?? 'plain'}
          color={selected ? '#d4af37' : (texture ? '#ffffff' : matProps.color)}
          roughness={texture ? 0.65 : matProps.roughness}
          metalness={texture ? 0.0  : matProps.metalness}
          map={texture ?? undefined}
          transparent={selected}
          opacity={selected ? 0.9 : 1}
        />
      </mesh>
    </group>
  );
}

// ── Modulo3D (default export — used in main scene) ────────────────────────────
export default function Modulo3D({ modulo, costos, explodeFactor = 0, selectedPieza, onSelectPieza, texturaDataUrl }) {
  const piezas = useMemo(
    () => buildPiezas3D(modulo, costos),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modulo?.codigo, modulo?.dimensiones, modulo?.material, modulo?.piezas, costos]
  );

  return (
    <group>
      {piezas.filter(p => !p.isHandle).map(p => (
        <Pieza
          key={p.id}
          size={p.size}
          pos={p.pos}
          explodeVec={p.explodeVec}
          explodeFactor={explodeFactor}
          materialTipo={p.materialTipo}
          selected={selectedPieza === p.id}
          rotY={p.rot3d || 0}
          onClick={(e) => {
            e.stopPropagation();
            onSelectPieza?.({ id: p.id, piezaIdx: p.piezaIdx, nombre: p.nombre, role: p.role, size: p.size, pos: p.pos });
          }}
          texturaDataUrl={texturaDataUrl}
        />
      ))}
    </group>
  );
}
