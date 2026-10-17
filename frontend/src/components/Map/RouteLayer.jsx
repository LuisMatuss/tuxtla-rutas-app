// Componente Cartográfico: Renderizado de trazados vectoriales (LineString) de rutas
// REGLA ESPACIAL CRÍTICA: Convierte explícitamente GeoJSON [lng, lat] a Leaflet [lat, lng]
import React from 'react';
import { Polyline, Tooltip } from 'react-leaflet';

export function RouteLayer({ routes = [], selectedRouteId = null, onSelectRoute }) {
  if (!routes || routes.length === 0) {
    return null;
  }

  return (
    <>
      {routes.map((route) => {
        const rawCoords =
          route.geometry?.coordinates ||
          route.coordinates ||
          [];

        if (!Array.isArray(rawCoords) || rawCoords.length === 0) {
          return null;
        }

        // Conversión canónica OGC GeoJSON [longitud, latitud] -> Leaflet [latitud, longitud]
        const leafletPositions = rawCoords.map(([lng, lat]) => [lat, lng]);

        const isSelected = selectedRouteId === route.id;
        const hasSelection = Boolean(selectedRouteId);

        // Estilos dinámicos: destacar ruta activa o atenuar rutas secundarias
        const color = route.color || '#2563EB';
        const weight = isSelected ? 6 : hasSelection ? 3 : 5;
        const opacity = isSelected ? 0.95 : hasSelection ? 0.35 : 0.85;

        return (
          <Polyline
            key={route.id}
            positions={leafletPositions}
            pathOptions={{
              color,
              weight,
              opacity,
              lineCap: 'round',
              lineJoin: 'round'
            }}
            eventHandlers={{
              click: () => {
                if (onSelectRoute) {
                  onSelectRoute(route.id);
                }
              }
            }}
          >
            <Tooltip sticky direction="top">
              <span style={{ fontWeight: 600 }}>{route.name}</span>
            </Tooltip>
          </Polyline>
        );
      })}
    </>
  );
}
