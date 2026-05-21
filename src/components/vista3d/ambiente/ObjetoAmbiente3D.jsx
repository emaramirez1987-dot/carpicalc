// ObjetoAmbiente3D.jsx
// Renderiza UNA instancia de un objeto 3D de ambiente (escenografía) en la escena.
//
// Renderer + interacción (Fase 1): carga el GLB, lo auto-escala a tamaño real,
// lo apoya en el piso, permite seleccionar / arrastrar / rotar / eliminar.
//
// Auto-fit: en vez de calibrar un `escalaBase` por asset a mano, se mide el
// bounding box del modelo y se escala para que su lado mayor mida `tamanoBase`
// metros. Funciona con cualquier GLB. La base queda apoyada en y=0.
//
// Debe renderizarse dentro de <Suspense> (useGLTF suspende) y de un
// ObjetoErrorBoundary (un GLB caído no debe tumbar la escena).

import React, { useRef, useMemo, useEffect } from 'react';
import { useGLTF, Clone, Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const ROT_STEP = Math.PI / 12; // 15° por click

const BTN = {
  width: 22, height: 22, borderRadius: 4,
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: 'rgba(185,195,215,0.82)', cursor: 'pointer',
  fontSize: 11, lineHeight: 1, padding: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

export function ObjetoAmbiente3D({
  inst, objeto, isSelected, onSelect, onMover, onRotar, onEliminar, orbitRef,
}) {
  const grupoRef    = useRef();
  const arrastrando = useRef(false);
  const huboDrag    = useRef(false);
  const origenMouse = useRef({ x: 0, y: 0 });
  const { camera, gl, scene: escena3D } = useThree();

  const { scene } = useGLTF(objeto.modelUrl);

  const planoPiso = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // Auto-fit: escala el GLB para que su lado mayor mida `tamanoBase` metros,
  // lo centra en X/Z y apoya su base en y=0. `size` (en unidades del modelo)
  // sirve para el recuadro de selección.
  const { fitScale, fitOffset, size } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const sz = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(sz.x, sz.y, sz.z) || 1;
    return {
      fitScale: (objeto.tamanoBase || 1) / maxDim,
      fitOffset: [-center.x, -box.min.y, -center.z],
      size: sz,
    };
  }, [scene, objeto.tamanoBase]);

  const t = inst.transform || {};
  const pos = t.position || { x: 0, y: 0, z: 0 };
  const escalaFinal = fitScale * (t.scale ?? 1);

  // Dimensiones visibles (para recuadro de selección y posición del overlay).
  const vw = size.x * escalaFinal;
  const vh = size.y * escalaFinal;
  const vd = size.z * escalaFinal;

  // Ref "latest" — evita closures viejas en los listeners DOM.
  const latest = useRef();
  latest.current = { instanceId: inst.instanceId, onMover };

  // Drag sobre el plano del piso. Mutamos la posición del grupo en vivo y
  // commiteamos al estado solo al soltar (evita re-render por cada mousemove).
  useEffect(() => {
    const canvas = gl.domElement;

    const onMove = (e) => {
      if (!arrastrando.current) return;
      if (!huboDrag.current) {
        const dx = e.clientX - origenMouse.current.x;
        const dy = e.clientY - origenMouse.current.y;
        if (Math.hypot(dx, dy) < 5) return; // umbral click vs drag
        huboDrag.current = true;
      }
      if (!grupoRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const nx =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      const ny = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera({ x: nx, y: ny }, camera);
      // Snap a superficies válidas (piso, mesada) — marcadas con userData.snapTarget.
      // El objeto arrastrado no tiene el flag → no se snapea a sí mismo.
      const hits = raycaster.intersectObjects(escena3D.children, true);
      const hit = hits.find(h => h.object?.userData?.snapTarget);
      if (hit) {
        grupoRef.current.position.copy(hit.point);
      } else {
        // Fallback: plano del piso
        const p = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(planoPiso, p)) {
          grupoRef.current.position.set(p.x, 0, p.z);
        }
      }
    };

    const onUp = () => {
      if (!arrastrando.current) return;
      arrastrando.current = false;
      if (orbitRef?.current) orbitRef.current.enabled = true;
      canvas.style.cursor = 'auto';
      if (huboDrag.current && grupoRef.current) {
        const p = grupoRef.current.position;
        latest.current.onMover(latest.current.instanceId, { x: p.x, y: p.y, z: p.z });
      }
      huboDrag.current = false;
    };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup',   onUp);
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup',   onUp);
    };
  }, [camera, gl, escena3D, raycaster, planoPiso, orbitRef]);

  return (
    <group
      ref={grupoRef}
      position={[pos.x || 0, pos.y || 0, pos.z || 0]}
      rotation={[0, t.rotation?.y || 0, 0]}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        arrastrando.current = true;
        huboDrag.current = false;
        origenMouse.current = { x: e.clientX, y: e.clientY };
        if (orbitRef?.current) orbitRef.current.enabled = false;
        gl.domElement.style.cursor = 'grabbing';
        onSelect();
      }}
      onPointerOver={(e) => { e.stopPropagation(); gl.domElement.style.cursor = 'grab'; }}
      onPointerOut={() => { if (!arrastrando.current) gl.domElement.style.cursor = 'auto'; }}
    >
      {/* Modelo: centrado en X/Z, base en y=0, auto-escalado a tamaño real */}
      <group scale={escalaFinal}>
        <group position={fitOffset}>
          <Clone object={scene} />
        </group>
      </group>

      {/* Recuadro de selección */}
      {isSelected && vw > 0 && (
        <mesh position={[0, vh / 2, 0]}>
          <boxGeometry args={[vw + 0.03, vh + 0.03, vd + 0.03]} />
          <meshBasicMaterial color="#4D8CFF" wireframe transparent opacity={0.5} />
        </mesh>
      )}

      {/* Overlay flotante — rotar / eliminar */}
      {isSelected && (
        <Html
          position={[0, vh + 0.18, 0]}
          center
          distanceFactor={2.5}
          zIndexRange={[50, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(12,14,20,0.88)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 7, padding: '4px 5px',
              display: 'flex', gap: 3, alignItems: 'center',
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              boxShadow: '0 3px 12px rgba(0,0,0,0.55)',
              userSelect: 'none', whiteSpace: 'nowrap',
            }}
          >
            <button style={{ ...BTN, color: 'rgba(100,140,255,0.92)' }}
              onClick={() => onRotar(inst.instanceId, -ROT_STEP)} title="Rotar izquierda">↺</button>
            <button style={{ ...BTN, color: 'rgba(100,140,255,0.92)' }}
              onClick={() => onRotar(inst.instanceId, ROT_STEP)} title="Rotar derecha">↻</button>
            <div style={{ width: 1, height: 11, background: 'rgba(255,255,255,0.13)', flexShrink: 0 }} />
            <button style={{ ...BTN, color: 'rgba(210,80,80,0.92)' }}
              onClick={() => onEliminar(inst.instanceId)} title="Quitar objeto">✕</button>
          </div>
        </Html>
      )}
    </group>
  );
}
