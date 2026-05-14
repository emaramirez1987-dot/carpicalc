// Camera presets — offset relativo al CENTRO del bbox de la escena.
// Vista3DTab calcula sceneCenter y suma el offset para posicionar la cámara.
// El target de la cámara siempre apunta al centro (camLookAt en Escena3D).
//
// Convención: el offset es la distancia desde el centro hasta la cámara
// en metros. Y=0 → cámara a la altura del centro (mirada horizontal).

export const CAMARAS = {
  iso:   { label: 'Iso',    pos: [1.4,  1.0,  1.4 ] },
  front: { label: 'Frente', pos: [0,    0,    2.2 ] },
  side:  { label: 'Lado',   pos: [2.2,  0,    0   ] },
  top:   { label: 'Arriba', pos: [0,    2.2,  0.01] },
};
