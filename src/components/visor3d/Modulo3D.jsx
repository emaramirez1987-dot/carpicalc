import React, { useMemo } from 'react';
import { getMaterialProps } from './useMaterial3D.js';
import { resolverDim, evaluarFormula } from '../../utils.js';

// Classify piece role from its name (Spanish cabinet vocabulary)
function clasificar(nombre) {
  const n = (nombre || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/lateral|costado/.test(n)) return 'lateral';
  if (/techo|tapa superior|superior/.test(n)) return 'techo';
  if (/base|piso|fondo inferior|inferior/.test(n)) return 'base';
  if (/fondo|trasera|respaldo/.test(n)) return 'fondo';
  if (/puerta/.test(n)) return 'puerta';
  if (/estante|balda|horizontal|entrepa/.test(n)) return 'estante';
  return 'unknown';
}

// Build position + size for each piece in 3D space (units: meters)
function buildPiezas3D(modulo, costos) {
  if (!modulo?.piezas || !costos?.materiales) return [];

  const matDef = costos.materiales.find(m => m.tipo === modulo.material) || costos.materiales[0];
  if (!matDef) return [];

  const { ancho = 600, alto = 700, profundidad = 550 } = modulo.dimensiones || {};
  const esp = matDef.espesor || 18;
  const M = 1000; // mm → m

  const dimMap = { ancho, alto, profundidad };
  const modVars = { ...dimMap, esp, ...(modulo.variables || {}) };

  // Half-dimensions (meters)
  const hw = ancho / 2 / M;
  const hh = alto  / 2 / M;
  const hd = profundidad / 2 / M;
  const te = esp / M;

  // Track shelf count for vertical distribution
  let shelfIdx = 0;
  // Track door count
  let doorIdx = 0;
  let doorTotal = 0;
  // Pre-pass: count pieces per role
  const roleCounts = {};
  for (const p of modulo.piezas) {
    const r = clasificar(p.nombre);
    roleCounts[r] = (roleCounts[r] || 0) + (p.cantidad || 1);
  }
  doorTotal = roleCounts['puerta'] || 0;

  const result = [];

  for (const p of modulo.piezas) {
    const d1 = p.especial
      ? (parseFloat(p.dimLibre1) || 0)
      : p.formula1 != null
        ? (evaluarFormula(p.formula1, modVars) ?? 0)
        : resolverDim(dimMap[p.usaDim],  p.offsetEsp,  p.offsetMm,  p.divisor  || 1, esp);

    const d2 = p.especial
      ? (parseFloat(p.dimLibre2) || 0)
      : p.formula2 != null
        ? (evaluarFormula(p.formula2, modVars) ?? 0)
        : resolverDim(dimMap[p.usaDim2], p.offsetEsp2, p.offsetMm2, p.divisor2 || 1, esp);

    const role = clasificar(p.nombre);
    const cantidad = p.cantidad || 1;

    // Generate one mesh entry per unit
    for (let i = 0; i < cantidad; i++) {
      let size, pos, explodeVec;

      switch (role) {
        case 'lateral': {
          const side = i === 0 ? -1 : 1;
          size = [te, d1 / M, d2 / M];
          pos  = [side * (hw - te / 2), 0, 0];
          explodeVec = [side * 1, 0, 0];
          break;
        }
        case 'techo': {
          size = [d1 / M, te, d2 / M];
          pos  = [0, hh - te / 2, 0];
          explodeVec = [0, 1, 0];
          break;
        }
        case 'base': {
          size = [d1 / M, te, d2 / M];
          pos  = [0, -(hh - te / 2), 0];
          explodeVec = [0, -1, 0];
          break;
        }
        case 'fondo': {
          size = [d1 / M, d2 / M, te];
          pos  = [0, 0, -(hd - te / 2)];
          explodeVec = [0, 0, -1];
          break;
        }
        case 'puerta': {
          // Distribute doors horizontally if multiple
          const offset = doorTotal > 1
            ? -hw + (hw * 2 / doorTotal) * (doorIdx + 0.5)
            : 0;
          size = [d2 / M, d1 / M, te];
          pos  = [offset, 0, hd + te / 2];
          explodeVec = [0, 0, 1];
          doorIdx++;
          break;
        }
        case 'estante': {
          // Distribute shelves evenly in vertical space
          const shelfCount = roleCounts['estante'] || 1;
          const step = (alto - esp * 4) / (shelfCount + 1);
          const shelfY = -hh + (step * (shelfIdx + 1)) / M + te * 2;
          size = [d1 / M, te, d2 / M];
          pos  = [0, shelfY, 0];
          explodeVec = [0, shelfIdx % 2 === 0 ? 0.5 : -0.5, 0];
          shelfIdx++;
          break;
        }
        default: {
          // Unknown pieces: float above the module
          size = [d2 / M || 0.3, te, d1 / M || 0.3];
          pos  = [0, hh + te * (i + 2), -hd - te * (i + 2)];
          explodeVec = [0, 1, -1];
          break;
        }
      }

      result.push({
        id: `${p.nombre}-${i}`,
        nombre: p.nombre,
        role,
        size,
        pos,
        explodeVec,
        materialTipo: modulo.material || 'melamina',
      });
    }
  }

  return result;
}

function Pieza({ size, pos, explodeVec, explodeFactor, materialTipo, selected, onClick }) {
  const matProps = getMaterialProps(materialTipo);
  const ep = explodeFactor * 0.35;
  const finalPos = [
    pos[0] + explodeVec[0] * ep,
    pos[1] + explodeVec[1] * ep,
    pos[2] + explodeVec[2] * ep,
  ];

  return (
    <mesh position={finalPos} onClick={onClick} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={selected ? '#d4af37' : matProps.color}
        roughness={matProps.roughness}
        metalness={matProps.metalness}
        transparent={selected}
        opacity={selected ? 0.9 : 1}
      />
    </mesh>
  );
}

export default function Modulo3D({ modulo, costos, explodeFactor = 0, selectedPieza, onSelectPieza }) {
  const piezas = useMemo(
    () => buildPiezas3D(modulo, costos),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modulo?.codigo, modulo?.dimensiones, modulo?.material, modulo?.piezas, costos]
  );

  return (
    <group>
      {piezas.map(p => (
        <Pieza
          key={p.id}
          size={p.size}
          pos={p.pos}
          explodeVec={p.explodeVec}
          explodeFactor={explodeFactor}
          materialTipo={p.materialTipo}
          selected={selectedPieza === p.id}
          onClick={(e) => { e.stopPropagation(); onSelectPieza?.(p.id === selectedPieza ? null : p.id); }}
        />
      ))}
    </group>
  );
}
