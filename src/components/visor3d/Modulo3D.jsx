import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getMaterialProps } from './useMaterial3D.js';
import { resolverDim, evaluarFormula } from '../../utils.js';

// ── Roles 3D predefinidos ─────────────────────────────────────────────────────
export const ROLES_3D = [
  { id: 'lateral_izq', label: 'Lateral Izq.' },
  { id: 'lateral_der', label: 'Lateral Der.' },
  { id: 'techo',       label: 'Techo'        },
  { id: 'base',        label: 'Base'         },
  { id: 'fondo',       label: 'Fondo'        },
  { id: 'cajon',       label: 'Cajón'        },
  { id: 'estante',     label: 'Estante'      },
  { id: 'ignorar',     label: 'No mostrar'   },
];

// ── Caras disponibles para roles personalizados ───────────────────────────────
// Definen la orientación y cara del módulo donde se ubica la pieza por defecto.
// El usuario ajusta la posición exacta con posFormulas u offset3d.
export const CARAS_3D = [
  { id: 'front',    label: 'Frente'    },
  { id: 'back',     label: 'Trasera'   },
  { id: 'left',     label: 'Lat. Izq.' },
  { id: 'right',    label: 'Lat. Der.' },
  { id: 'top',      label: 'Techo'     },
  { id: 'bottom',   label: 'Base'      },
  { id: 'interior', label: 'Interior'  },
];

// Posición por defecto según cara — origen en esquina inferior-izquierda-fondo.
function autoPosPorCara(cara, d1, d2, hw, hh, hd, te, M) {
  switch (cara) {
    case 'front':    return { size: [d2/M, d1/M, te],    autoPos: [-hw + d2/M/2,  -hh + d1/M/2,  hd + te/2],       explodeVec: [0,  0,    1] };
    case 'back':     return { size: [d1/M, d2/M, te],    autoPos: [-hw + d1/M/2,  -hh + d2/M/2, -(hd - te/2)],     explodeVec: [0,  0,   -1] };
    case 'left':     return { size: [te, d1/M, d2/M],    autoPos: [-(hw - te/2),  -hh + d1/M/2,  -hd + d2/M/2],    explodeVec: [-1, 0,    0] };
    case 'right':    return { size: [te, d1/M, d2/M],    autoPos: [hw - te/2,     -hh + d1/M/2,  -hd + d2/M/2],    explodeVec: [1,  0,    0] };
    case 'top':      return { size: [d1/M, te, d2/M],    autoPos: [-hw + d1/M/2,  hh - te/2,     -hd + d2/M/2],    explodeVec: [0,  1,    0] };
    case 'bottom':   return { size: [d1/M, te, d2/M],    autoPos: [-hw + d1/M/2, -(hh - te/2),   -hd + d2/M/2],    explodeVec: [0, -1,    0] };
    case 'interior': return { size: [d1/M, te, d2/M],    autoPos: [-hw + d1/M/2,  0,              -hd + d2/M/2],   explodeVec: [0,  0.5,  0] };
    default:         return { size: [d2/M, te, d1/M],    autoPos: [0, 0, 0],                                        explodeVec: [0,  1,    0] };
  }
}

// ── Clasificación por nombre (fallback) ───────────────────────────────────────
function clasificarPorNombre(nombre) {
  const n = (nombre || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/caj[ao]n|cajones|gaveta/.test(n))           return 'cajon';
  if (/lateral|costado/.test(n))                   return 'lateral';
  if (/techo|tapa superior|superior/.test(n))      return 'techo';
  if (/base|piso|fondo inferior|inferior/.test(n)) return 'base';
  if (/fondo|trasera|respaldo/.test(n))            return 'fondo';
  if (/puerta/.test(n))                            return 'puerta';
  if (/estante|balda|horizontal|entrepa/.test(n))  return 'estante';
  return 'unknown';
}

function getRole(pieza) {
  return pieza.rol3d || clasificarPorNombre(pieza.nombre);
}

// ── buildPiezas3D ─────────────────────────────────────────────────────────────
export function buildPiezas3D(modulo, costos) {
  if (!modulo?.piezas || !costos?.materiales) return [];

  const matDef = costos.materiales.find(m => m.tipo === modulo.material) || costos.materiales[0];
  if (!matDef) return [];

  const { ancho = 600, alto = 700, profundidad = 550 } = modulo.dimensiones || {};
  const esp = matDef.espesor || 18;
  const M   = 1000;

  const dimMap  = { ancho, alto, profundidad };
  // Resolver variables personalizadas como fórmulas (pueden usar ancho/alto/profundidad/esp)
  const dimBase = { ...dimMap, esp };
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

  const rolesCustom = modulo.rolesCustom || [];

  const roleCounts = {};
  for (const p of modulo.piezas) {
    const r = getRole(p);
    roleCounts[r] = (roleCounts[r] || 0) + (p.cantidad || 1);
  }
  const cajonTotal = roleCounts['cajon']  || 0;

  let shelfIdx = 0;
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

      // Roles personalizados tienen prioridad sobre el switch predefinido
      const customRolDef = rolesCustom.find(r => r.id === role);
      if (customRolDef) {
        const c = autoPosPorCara(customRolDef.cara, d1, d2, hw, hh, hd, te, M);
        size = c.size; autoPos = [...c.autoPos]; explodeVec = c.explodeVec;
      } else switch (role) {
        case 'lateral_izq': {
          size       = [te, d1 / M, d2 / M];
          autoPos    = [-(hw - te / 2), 0, 0];
          explodeVec = [-1, 0, 0];
          break;
        }
        case 'lateral_der': {
          size       = [te, d1 / M, d2 / M];
          autoPos    = [hw - te / 2, 0, 0];
          explodeVec = [1, 0, 0];
          break;
        }
        case 'lateral': {
          const side = latIdx === 0 ? -1 : 1;
          size       = [te, d1 / M, d2 / M];
          autoPos    = [side * (hw - te / 2), 0, 0];
          explodeVec = [side, 0, 0];
          latIdx++;
          break;
        }
        case 'techo': {
          size       = [d1 / M, te, d2 / M];
          autoPos    = [0, hh - te / 2, 0];
          explodeVec = [0, 1, 0];
          break;
        }
        case 'base': {
          size       = [d1 / M, te, d2 / M];
          autoPos    = [0, -(hh - te / 2), 0];
          explodeVec = [0, -1, 0];
          break;
        }
        case 'fondo': {
          size       = [d1 / M, d2 / M, te];
          autoPos    = [0, 0, -(hd - te / 2)];
          explodeVec = [0, 0, -1];
          break;
        }
        case 'puerta': {
          // Cada puerta se posiciona de forma independiente.
          // Default: esquina inferior-izquierda del frente (X=izq, Y=piso).
          // Usar posFormulas (X/Y desde esquina del módulo) u offset3d para ubicarla.
          size       = [d2 / M, d1 / M, te];
          autoPos    = [-(hw - d2 / M / 2), -(hh - d1 / M / 2), hd + te / 2];
          explodeVec = [0, 0, 1];
          handleSources.push({ x: -(hw - d2 / M / 2), y: 0, z: hd + te });
          break;
        }
        case 'cajon': {
          const innerH  = (alto - esp * 2) / M;
          const step    = innerH / cajonTotal;
          const baseY   = -(hh - te);
          const centerY = baseY + step * (cajonIdx + 0.5);
          const frontH  = step - 0.004;
          const frontW  = (ancho / M) - te * 2;
          size       = [frontW, frontH, te];
          autoPos    = [0, centerY, hd + te / 2];
          explodeVec = [0, 0, 1];
          handleSources.push({ x: 0, y: centerY, z: hd + te });
          cajonIdx++;
          break;
        }
        case 'estante': {
          const shelfCount = roleCounts['estante'] || 1;
          const step  = (alto - esp * 4) / (shelfCount + 1);
          const shelfY = -hh + (step * (shelfIdx + 1)) / M + te * 2;
          size       = [d1 / M, te, d2 / M];
          autoPos    = [0, shelfY, 0];
          explodeVec = [0, shelfIdx % 2 === 0 ? 0.5 : -0.5, 0];
          shelfIdx++;
          break;
        }
        default: {
          size       = [d2 / M || 0.3, te, d1 / M || 0.3];
          autoPos    = [0, hh + te * (i + 2), -hd - te * (i + 2)];
          explodeVec = [0, 1, -1];
          break;
        }
      }

      // posFormulas: esquina inferior-izquierda-fondo de la pieza (en mm desde la esquina del módulo).
      //   X: 0 = borde izq  →  ancho = borde der
      //   Y: 0 = piso       →  alto  = techo
      //   Z: 0 = fondo      →  profundidad = frente
      // Variables disponibles: ancho, alto, profundidad, esp (módulo) + d1, d2 (esta pieza).
      // Se suma size/2 para convertir al centro que usa Three.js (sistema centrado).
      if (p.posFormulas) {
        const pf      = p.posFormulas;
        const posVars = { ...modVars, d1, d2 };
        if (pf.x != null && pf.x !== '') { const v = evaluarFormula(String(pf.x), posVars); if (v !== null) autoPos[0] = v / 1000 + size[0] / 2 - hw; }
        if (pf.y != null && pf.y !== '') { const v = evaluarFormula(String(pf.y), posVars); if (v !== null) autoPos[1] = v / 1000 + size[1] / 2 - hh; }
        if (pf.z != null && pf.z !== '') { const v = evaluarFormula(String(pf.z), posVars); if (v !== null) autoPos[2] = v / 1000 + size[2] / 2 - hd; }
      }

      // offset3d (mm) + rot3d (degrees) — ajuste manual encima de la posición calculada
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
      const status = role === 'unknown' ? 'unassigned' : hasOffset ? 'manual' : 'auto';

      result.push({
        id:          `${p.nombre}-${i}`,
        nombre:      p.nombre,
        role,
        piezaIdx,
        size,
        pos,
        autoPos,
        explodeVec,
        offset3d,
        rot3d,
        status,
        materialTipo: modulo.material || 'melamina',
        isHandle:    false,
        hasManualPos: hasOffset,
      });
    }
  });

  // Conflict detection: flag duplicate single-instance roles
  const singleRoles  = ['techo', 'base', 'fondo'];
  const roleCountFin = {};
  result.forEach(p => { if (!p.isHandle) roleCountFin[p.role] = (roleCountFin[p.role] || 0) + 1; });
  result.forEach(p => {
    if (singleRoles.includes(p.role) && roleCountFin[p.role] > 1) p.status = 'conflict';
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
      offset3d:     { x: 0, y: 0, z: 0 },
      rot3d:        0,
      status:       'auto',
      materialTipo: 'manija',
      isHandle:     true,
      hasManualPos: false,
    });
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
