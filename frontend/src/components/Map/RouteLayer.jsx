// Componente de Mapa: Renderizado de trazados vectoriales y geometrías GeoJSON para rutas seleccionadas
import React from 'react';
import { Polyline } from 'react-leaflet';

export function RouteLayer({ route }) {
  if (!route || !route.coordinates || route.coordinates.length === 0) {
    return null;
  }

  // Las coordenadas Leaflet se expresan en [latitud, longitud]
  const polylinePositions = route.coordinates.map(([lng, lat]) => [lat, lng]);

  return (
    <Polyline
      positions={polylinePositions}
      pathOptions={{
        color: route.color || '#2563EB',
        weight: 5,
        opacity: 0.85
      }}
    />
  );
}
