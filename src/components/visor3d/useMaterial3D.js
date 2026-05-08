// Maps material type string → MeshStandardMaterial props
// EGGER-inspired palette — can be extended with real EGGER codes later

const MATERIAL_COLORS = {
  melamina:     { color: '#e8d8b0', roughness: 0.6, metalness: 0.05 },
  mdf:          { color: '#c8b080', roughness: 0.75, metalness: 0.0  },
  madera_maciza:{ color: '#a07040', roughness: 0.8,  metalness: 0.0  },
  terciado:     { color: '#b89060', roughness: 0.75, metalness: 0.0  },
  default:      { color: '#d4c090', roughness: 0.65, metalness: 0.05 },
};

export function getMaterialProps(tipo) {
  return MATERIAL_COLORS[tipo] ?? MATERIAL_COLORS.default;
}
