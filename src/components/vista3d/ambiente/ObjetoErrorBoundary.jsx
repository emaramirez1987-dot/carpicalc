// ObjetoErrorBoundary.jsx
// Aísla la carga de cada objeto de ambiente. Si un GLB falla (URL caída,
// formato inválido), este boundary lo absorbe y renderiza `null` — el objeto
// no aparece, pero la escena 3D (y el resto de los objetos) sigue viva.

import React from 'react';

export class ObjetoErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { falló: false };
  }

  static getDerivedStateFromError() {
    return { falló: true };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.warn('[Escenografía] no se pudo cargar un objeto de ambiente:', error?.message || error);
  }

  render() {
    if (this.state.falló) return null;
    return this.props.children;
  }
}
