// Componente Cartográfico: Renderizado de trazados vectoriales diferenciados de IDA y VUELTA
// Respeta visibleRouteIds para evitar saturación en el mapa y soporta filtro de sentido (Ida y Vuelta / Solo Ida / Solo Vuelta)
import React, { useMemo } from 'react';
import { Polyline, Tooltip } from 'react-leaflet';

function convertGeoJsonToLeaflet(coords) {
  if (!Array.isArray(coords) || coords.length === 0) return [];
  return coords
    .map((coord) => {
      if (!Array.isArray(coord) || coord.length < 2) return null;
      const lng = Number(coord[0]);
      const lat = Number(coord[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return [lat, lng];
    })
    .filter(Boolean);
}

export function RouteLayer({
  routes = [],
  visibleRouteIds = null,
  selectedRouteId = null,
  directionFilter = 'ALL',
  onSelectRoute
}) {
  // Filtrar únicamente rutas visibles (o la ruta seleccionada)
  const activeRoutes = useMemo(() => {
    if (!routes || routes.length === 0) return [];
    return routes.filter((route) => {
      if (selectedRouteId === route.id) return true;
      if (visibleRouteIds && Array.isArray(visibleRouteIds) && visibleRouteIds.length > 0) {
        return visibleRouteIds.includes(route.id);
      }
      return false;
    });
  }, [routes, visibleRouteIds, selectedRouteId]);

  // Ordenar para que la ruta seleccionada se renderice al frente
  const sortedRoutes = useMemo(() => {
    if (!selectedRouteId) return activeRoutes;
    return [...activeRoutes].sort((a, b) => {
      if (a.id === selectedRouteId) return 1;
      if (b.id === selectedRouteId) return -1;
      return 0;
    });
  }, [activeRoutes, selectedRouteId]);

  if (sortedRoutes.length === 0) {
    return null;
  }

  const showOutbound = directionFilter === 'ALL' || directionFilter === 'IDA';
  const showInbound = directionFilter === 'ALL' || directionFilter === 'VUELTA';

  return (
    <>
      {sortedRoutes.map((route) => {
        const isSelected = selectedRouteId === route.id;
        const color = route.color || '#2563EB';

        // 1. Trazado de IDA (outbound)
        const outboundRaw = route.outboundGeometry?.coordinates || route.geometry?.coordinates || [];
        const outboundPositions = convertGeoJsonToLeaflet(outboundRaw);

        // 2. Trazado de VUELTA (inbound con offset lateral independiente)
        const inboundRaw = route.inboundGeometry?.coordinates || [];
        const inboundPositions = convertGeoJsonToLeaflet(inboundRaw);

        const outboundWeight = isSelected ? 6 : 4;
        const outboundOpacity = isSelected ? 1.0 : 0.85;

        const inboundWeight = isSelected ? 5 : 3;
        const inboundOpacity = isSelected ? 0.9 : 0.7;

        return (
          <React.Fragment key={route.id}>
            {/* Trazado de IDA: Línea continua sólida */}
            {showOutbound && outboundPositions.length > 0 && (
              <Polyline
                positions={outboundPositions}
                pathOptions={{
                  color,
                  weight: outboundWeight,
                  opacity: outboundOpacity,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
                eventHandlers={{
                  click: () => {
                    if (onSelectRoute) onSelectRoute(route.id);
                  }
                }}
              >
                <Tooltip sticky direction="top">
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>
                    <strong>{route.name}</strong>
                    <div style={{ color: '#38bdf8' }}>Sentido: Ida ➔</div>
                  </div>
                </Tooltip>
              </Polyline>
            )}

            {/* Trazado de VUELTA: Línea punteada diferenciada */}
            {showInbound && inboundPositions.length > 0 && (
              <Polyline
                positions={inboundPositions}
                pathOptions={{
                  color,
                  weight: inboundWeight,
                  opacity: inboundOpacity,
                  dashArray: '6, 8',
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
                eventHandlers={{
                  click: () => {
                    if (onSelectRoute) onSelectRoute(route.id);
                  }
                }}
              >
                <Tooltip sticky direction="top">
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>
                    <strong>{route.name}</strong>
                    <div style={{ color: '#fbbf24' }}>Sentido: Vuelta ↩</div>
                  </div>
                </Tooltip>
              </Polyline>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
