// useMaterial3D.js — re-export del resolver de props PBR por tipo.
//
// La fuente de verdad del mapa tipo→PBR vive en materialesService.js (capa de
// servicio, pura). Este archivo se mantiene como nombre estable para los
// consumidores del visor 3D (Modulo3D, VisorCatalogo3D).

export { getMaterialProps } from '../../services/materialesService.js';
