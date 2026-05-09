import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getMaterialProps } from './useMaterial3D.js';
import { resolverDim, evaluarFormula } from '../../utils.js';

// Classify piece role from its name (Spanish cabinet vocabulary)
function clasificar(nombre) {
  const n = (nombre || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/caj[ao]n|cajones|gaveta/.test(n)) return 'cajon';
  if (/lateral|costado/.test(n))         return 'lateral';
  if (/techo|tapa superior|superior/.test(n)) return 'techo';
  if (/base|piso|fondo inferior|inferior/.test(n)) return 'base';
  if (/fondo|trasera|respaldo/.test(n))  return 'fondo';
  if (/puerta/.test(n))                  return 'puerta';
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

  const hw = ancho      / 2 / M;
  const hh = alto       / 2 / M;
  const hd = profundidad / 2 / M;
  const te = esp / M;

  // Pre-pass: count pieces per role
  const roleCounts = {};
  for (const p of modulo.piezas) {
    const r = clasificar(p.nombre);
    roleCounts[r] = (roleCounts[r] || 0) + (p.cantidad || 1);
  }
  const doorTotal  = roleCounts['puerta'] || 0;
  const cajonTotal = roleCounts['cajon']  || 0;

  let shelfIdx = 0;
  let doorIdx  = 0;
  let cajonIdx = 0;

  const result  = [];
  // Track door/cajon positions for handle generation
  const handleSources = [];

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

    const role    = clasificar(p.nombre);
    const cantidad = p.cantidad || 1;

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
          const offset = doorTotal > 1
            ? -hw + (hw * 2 / doorTotal) * (doorIdx + 0.5)
            : 0;
          size = [d2 / M, d1 / M, te];
          pos  = [offset, 0, hd + te / 2];
          explodeVec = [0, 0, 1];
          // Handle: offset toward right edge (0.7 of half-width within door slot)
          const hSlot = hw * 2 / (doorTotal || 1);
          handleSources.push({ x: offset + hSlot * 0.25, y: 0, z: hd + te, type: 'puerta' });
          doorIdx++;
          break;
        }
        case 'cajon': {
          // Stack drawers evenly from bottom to top
          const innerH   = (alto - esp * 2) / M; // inner height in meters
          const step     = innerH / cajonTotal;
          const baseY    = -(hh - te);            // bottom inner edge
          const centerY  = baseY + step * (cajonIdx + 0.5);
          const frontH   = step - 0.004;           // 4mm gap between drawers
          const frontW   = (ancho / M) - te * 2;
          size = [frontW, frontH, te];
          pos  = [0, centerY, hd + te / 2];
          explodeVec = [0, 0, 1];
          handleSources.push({ x: 0, y: centerY, z: hd + te, type: 'cajon' });
          cajonIdx++;
          break;
        }
        case 'estante': {
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
        isHandle: false,
      });
    }
  }

  // ── Auto-generate handles for doors and drawers ──────────────────────────
  // Handle: thin horizontal bar, 100mm wide × 10mm tall × 18mm deep, metallic
  const HANDLE_W = 0.10;
  const HANDLE_H = 0.010;
  const HANDLE_D = 0.018;

  for (let idx = 0; idx < handleSources.length; idx++) {
    const h = handleSources[idx];
    result.push({
      id:          `handle-${idx}`,
      nombre:      'manija',
      role:        'manija',
      size:        [HANDLE_W, HANDLE_H, HANDLE_D],
      pos:         [h.x, h.y, h.z + HANDLE_D / 2],
      explodeVec:  [0, 0, 1],
      materialTipo: 'manija',
      isHandle:    true,
    });
  }

  return result;
}

// ── Pieza ─────────────────────────────────────────────────────────────────────
function Pieza({ size, pos, explodeVec, explodeFactor, materialTipo, selected, onClick, texturaDataUrl }) {
  const matProps = getMaterialProps(materialTipo);
  const ep = explodeFactor * 0.35;
  const finalPos = [
    pos[0] + explodeVec[0] * ep,
    pos[1] + explodeVec[1] * ep,
    pos[2] + explodeVec[2] * ep,
  ];

  // Cargar textura desde data URL si hay una asignada (solo para piezas no-manija)
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
          onClick={(e) => { e.stopPropagation(); onSelectPieza?.(p.id === selectedPieza ? null : p.id); }}
          texturaDataUrl={p.isHandle ? null : texturaDataUrl}
        />
      ))}
    </group>
  );
}
