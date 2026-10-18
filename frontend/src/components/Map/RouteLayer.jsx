// Componente Cartográfico: Renderizado de trazados vectoriales (LineString) de las 8 rutas
// Mantiene siempre las 8 rutas en el DOM (ruta activa con weight: 6, opacity: 1.0; 7 rutas secundarias con weight: 3, opacity: 0.35)
import React, { useMemo } from 'react';
import { Polyline, Tooltip } from 'react-leaflet';

export function RouteLayer({ routes = [], selectedRouteId = null, onSelectRoute }) {
  if (!routes || routes.length === 0) {
    return null;
  }

  // Ordenar para que la ruta seleccionada se renderice al final (encima de las demás capas vectoriales)
  const sortedRoutes = useMemo(() => {
    if (!selectedRouteId) return routes;
    return [...routes].sort((a, b) => {
      if (a.id === selectedRouteId) return 1;
      if (b.id === selectedRouteId) return -1;
      return 0;
    });
  }, [routes, selectedRouteId]);

  return (
    <>
      {sortedRoutes.map((route) => {
        const rawCoords =
          route.geometry?.coordinates ||
          route.coordinates ||
          [];

        if (!Array.isArray(rawCoords) || rawCoords.length === 0) {
          return null;
        }

        // Conversión canónica OGC GeoJSON [longitud, latitud] -> Leaflet [latitud, longitud]
        const leafletPositions = rawCoords
          .map((coord) => {
            if (!Array.isArray(coord) || coord.length < 2) return null;
            const lng = Number(coord[0]);
            const lat = Number(coord[1]);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return [lat, lng];
          })
          .filter(Boolean);

        if (leafletPositions.length === 0) return null;

        const isSelected = selectedRouteId === route.id;
        const hasSelection = Boolean(selectedRouteId);

        // Estilos dinámicos: destacar ruta activa o mantener las otras 7 rutas visibles en segundo plano
        const color = route.color || '#2563EB';
        const weight = isSelected ? 6 : hasSelection ? 3 : 5;
        const opacity = isSelected ? 1.0 : hasSelection ? 0.35 : 0.85;

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
              <span style={{ fontWeight: 600, fontSize: '12px' }}>{route.name}</span>
            </Tooltip>
          </Polyline>
        );
      })}
    </>
  );
}
