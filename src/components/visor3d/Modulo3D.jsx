import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getMaterialProps } from './useMaterial3D.js';
import { resolverDim, evaluarFormula } from '../../utils.js';

// ── Roles 3D ──────────────────────────────────────────────────────────────────
export const ROLES_3D = [
  { id: 'lateral_izq', label: 'Lateral Izq.' },
  { id: 'lateral_der', label: 'Lateral Der.' },
  { id: 'techo',       label: 'Techo'        },
  { id: 'base',        label: 'Base'         },
  { id: 'fondo',       label: 'Fondo'        },
  { id: 'puerta',      label: 'Puerta'       },
  { id: 'cajon',       label: 'Cajón'        },
  { id: 'estante',     label: 'Estante'      },
  { id: 'ignorar',     label: 'No mostrar'   },
];

// ── Clasificación por nombre (fallback) ───────────────────────────────────────
function clasificarPorNombre(nombre) {
  const n = (nombre || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/caj[ao]n|cajones|gaveta/.test(n))      return 'cajon';
  if (/lateral|costado/.test(n))              return 'lateral';
  if (/techo|tapa superior|superior/.test(n)) return 'techo';
  if (/base|piso|fondo inferior|inferior/.test(n)) return 'base';
  if (/fondo|trasera|respaldo/.test(n))       return 'fondo';
  if (/puerta/.test(n))                       return 'puerta';
  if (/estante|balda|horizontal|entrepa/.test(n)) return 'estante';
  return 'unknown';
}

function getRole(pieza) {
  return pieza.rol3d || clasificarPorNombre(pieza.nombre);
}

// ── buildPiezas3D (exported for editor use) ───────────────────────────────────
export function buildPiezas3D(modulo, costos) {
  if (!modulo?.piezas || !costos?.materiales) return [];

  const matDef = costos.materiales.find(m => m.tipo === modulo.material) || costos.materiales[0];
  if (!matDef) return [];

  const { ancho = 600, alto = 700, profundidad = 550 } = modulo.dimensiones || {};
  const esp = matDef.espesor || 18;
  const M   = 1000;

  const dimMap  = { ancho, alto, profundidad };
  const modVars = { ...dimMap, esp, ...(modulo.variables || {}) };

  const hw = ancho       / 2 / M;
  const hh = alto        / 2 / M;
  const hd = profundidad / 2 / M;
  const te = esp / M;

  const roleCounts = {};
  for (const p of modulo.piezas) {
    const r = getRole(p);
    roleCounts[r] = (roleCounts[r] || 0) + (p.cantidad || 1);
  }
  const doorTotal  = roleCounts['puerta'] || 0;
  const cajonTotal = roleCounts['cajon']  || 0;

  let shelfIdx = 0;
  let doorIdx  = 0;
  let cajonIdx = 0;
  let latIdx   = 0;

  const result        = [];
  const handleSources = [];

  modulo.piezas.forEach((p, piezaIdx) => {
    const role = getRole(p);
    if (role === 'ignorar') return;

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

    const cantidad = p.cantidad || 1;

    for (let i = 0; i < cantidad; i++) {
      let size, autoPos, explodeVec;

      switch (role) {
        case 'lateral_izq': {
          size      = [te, d1 / M, d2 / M];
          autoPos   = [-(hw - te / 2), 0, 0];
          explodeVec = [-1, 0, 0];
          break;
        }
        case 'lateral_der': {
          size      = [te, d1 / M, d2 / M];
          autoPos   = [hw - te / 2, 0, 0];
          explodeVec = [1, 0, 0];
          break;
        }
        case 'lateral': {
          const side = latIdx === 0 ? -1 : 1;
          size      = [te, d1 / M, d2 / M];
          autoPos   = [side * (hw - te / 2), 0, 0];
          explodeVec = [side * 1, 0, 0];
          latIdx++;
          break;
        }
        case 'techo': {
          size      = [d1 / M, te, d2 / M];
          autoPos   = [0, hh - te / 2, 0];
          explodeVec = [0, 1, 0];
          break;
        }
        case 'base': {
          size      = [d1 / M, te, d2 / M];
          autoPos   = [0, -(hh - te / 2), 0];
          explodeVec = [0, -1, 0];
          break;
        }
        case 'fondo': {
          size      = [d1 / M, d2 / M, te];
          autoPos   = [0, 0, -(hd - te / 2)];
          explodeVec = [0, 0, -1];
          break;
        }
        case 'puerta': {
          const offset = doorTotal > 1
            ? -hw + (hw * 2 / doorTotal) * (doorIdx + 0.5)
            : 0;
          size      = [d2 / M, d1 / M, te];
          autoPos   = [offset, 0, hd + te / 2];
          explodeVec = [0, 0, 1];
          handleSources.push({ x: offset + (hw * 2 / (doorTotal || 1)) * 0.25, y: 0, z: hd + te });
          doorIdx++;
          break;
        }
        case 'cajon': {
          const innerH  = (alto - esp * 2) / M;
          const step    = innerH / cajonTotal;
          const baseY   = -(hh - te);
          const centerY = baseY + step * (cajonIdx + 0.5);
          const frontH  = step - 0.004;
          const frontW  = (ancho / M) - te * 2;
          size      = [frontW, frontH, te];
          autoPos   = [0, centerY, hd + te / 2];
          explodeVec = [0, 0, 1];
          handleSources.push({ x: 0, y: centerY, z: hd + te });
          cajonIdx++;
          break;
        }
        case 'estante': {
          const shelfCount = roleCounts['estante'] || 1;
          const step = (alto - esp * 4) / (shelfCount + 1);
          const shelfY = -hh + (step * (shelfIdx + 1)) / M + te * 2;
          size      = [d1 / M, te, d2 / M];
          autoPos   = [0, shelfY, 0];
          explodeVec = [0, shelfIdx % 2 === 0 ? 0.5 : -0.5, 0];
          shelfIdx++;
          break;
        }
        default: {
          size      = [d2 / M || 0.3, te, d1 / M || 0.3];
          autoPos   = [0, hh + te * (i + 2), -hd - te * (i + 2)];
          explodeVec = [0, 1, -1];
          break;
        }
      }

      // pos3d override: use manual position if set, else auto
      const pos = p.pos3d ? [p.pos3d[0], p.pos3d[1], p.pos3d[2]] : autoPos;

      result.push({
        id:          `${p.nombre}-${i}`,
        nombre:      p.nombre,
        role,
        piezaIdx,
        size,
        pos,
        autoPos,
        explodeVec,
        materialTipo: modulo.material || 'melamina',
        isHandle:    false,
        hasManualPos: !!p.pos3d,
      });
    }
  });

  // Auto-generate handles
  handleSources.forEach((h, idx) => {
    result.push({
      id:           `handle-${idx}`,
      nombre:       'manija',
      role:         'manija',
      piezaIdx:     -1,
      size:         [0.10, 0.010, 0.018],
      pos:          [h.x, h.y, h.z + 0.009],
      autoPos:      [h.x, h.y, h.z + 0.009],
      explodeVec:   [0, 0, 1],
      materialTipo: 'manija',
      isHandle:     true,
      hasManualPos: false,
    });
  });

  return result;
}

// ── Pieza ─────────────────────────────────────────────────────────────────────
function Pieza({ size, pos, explodeVec, explodeFactor, materialTipo, selected, onClick, texturaDataUrl }) {
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
    <mesh position={finalPos} onClick={onClick} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={selected ? '#d4af37' : (texture ? '#ffffff' : matProps.color)}
        roughness={texture ? 0.65 : matProps.roughness}
        metalness={texture ? 0.0  : matProps.metalness}
        map={texture ?? undefined}
        transparent={selected}
        opacity={selected ? 0.9 : 1}
      />
    </mesh>
  );
}

export default function Modulo3D({ modulo, costos, explodeFactor = 0, selectedPieza, onSelectPieza, texturaDataUrl }) {
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
          onClick={(e) => {
            e.stopPropagation();
            if (!p.isHandle) onSelectPieza?.({ id: p.id, piezaIdx: p.piezaIdx, nombre: p.nombre, role: p.role, size: p.size, pos: p.pos });
          }}
          texturaDataUrl={p.isHandle ? null : texturaDataUrl}
        />
      ))}
    </group>
  );
}
