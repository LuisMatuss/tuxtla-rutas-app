// Componente Cartográfico: Marcadores interactivos para paradas y ubicación del usuario
import React from 'react';
import { CircleMarker, Circle, Popup, Tooltip } from 'react-leaflet';

export function StopMarkers({
  stops = [],
  routes = [],
  selectedRouteId = null,
  activeStop = null,
  userLocation = null,
  searchRadius = 1500,
  onSelectStop
}) {
  // Mapeo rápido de colores y nombres de ruta
  const routeMap = React.useMemo(() => {
    const map = new Map();
    for (const r of routes) {
      map.set(r.id, r);
    }
    return map;
  }, [routes]);

  return (
    <>
      {/* 1. Marcador y Radio de Búsqueda de Ubicación del Usuario */}
      {userLocation && (
        <>
          {/* Círculo de cobertura/radio de búsqueda en metros */}
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={searchRadius}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: '6, 8'
            }}
          />

          {/* Halo exterior pulsante */}
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={18}
            pathOptions={{
              color: '#60a5fa',
              fillColor: '#3b82f6',
              fillOpacity: 0.25,
              weight: 1
            }}
          />

          {/* Marcador central del usuario */}
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={8}
            pathOptions={{
              color: '#ffffff',
              fillColor: '#2563eb',
              fillOpacity: 1,
              weight: 3
            }}
          >
            <Popup>
              <div style={{ color: '#0f172a', padding: '4px' }}>
                <strong style={{ fontSize: '13px', display: 'block', color: '#1e40af' }}>
                  📍 Tu Punto Seleccionado
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                  Radio: {searchRadius}m
                </p>
              </div>
            </Popup>
          </CircleMarker>
        </>
      )}

      {/* 2. Marcadores de Paradas */}
      {stops.map((stop) => {
        const lat =
          stop.lat !== undefined
            ? Number(stop.lat)
            : stop.geometry?.coordinates?.[1] ||
              stop.coordinate?.latitude;

        const lng =
          stop.lng !== undefined
            ? Number(stop.lng)
            : stop.geometry?.coordinates?.[0] ||
              stop.coordinate?.longitude;

        if (!lat || !lng || !Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }

        const route = routeMap.get(stop.routeId);
        const routeColor = stop.routeColor || route?.color || '#059669';
        const routeName = stop.routeName || route?.name || 'Transporte Colectivo';
        const isRouteSelected = Boolean(selectedRouteId && stop.routeId === selectedRouteId);
        const isActive = activeStop?.id === stop.id;

        // Estilo discreto cuando no hay ruta seleccionada para no saturar Tuxtla; destacado al seleccionar ruta
        const radius = isActive
          ? 8.5
          : selectedRouteId
            ? (isRouteSelected ? 6.5 : 3.5)
            : 3.5;
        const fillOpacity = isActive
          ? 0.95
          : selectedRouteId
            ? (isRouteSelected ? 0.9 : 0.25)
            : 0.55;
        const weight = isActive
          ? 2.5
          : selectedRouteId
            ? (isRouteSelected ? 2 : 1)
            : 1;
        const borderColor = isActive ? '#fbbf24' : '#ffffff';

        return (
          <CircleMarker
            key={stop.id || `${lat}-${lng}`}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              color: borderColor,
              fillColor: routeColor,
              fillOpacity,
              weight
            }}
            eventHandlers={{
              click: () => {
                if (onSelectStop) {
                  onSelectStop(stop);
                }
              }
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <span style={{ fontWeight: 600, fontSize: '12px' }}>
                {stop.stopOrder ? `#${stop.stopOrder} ` : ''}
                {stop.name}
              </span>
            </Tooltip>

            <Popup>
              <div style={{ color: '#0f172a', minWidth: '180px', padding: '2px' }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: routeColor,
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '6px'
                  }}
                >
                  {routeName}
                </div>

                <h4 style={{ margin: '2px 0 6px 0', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  {stop.name}
                </h4>

                {stop.stopOrder && (
                  <p style={{ margin: '2px 0', fontSize: '12px', color: '#64748b' }}>
                    <strong>Orden:</strong> #{stop.stopOrder}
                  </p>
                )}

                {stop.distanceMeters !== undefined && stop.distanceMeters !== null && (
                  <p style={{ margin: '4px 0 2px 0', fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>
                    🚶 {stop.distanceMeters} m ({stop.walkingTimeMinutes || Math.ceil(stop.distanceMeters / 80)} min)
                  </p>
                )}

                {stop.nextBusMinutes !== undefined && stop.nextBusMinutes !== null && (
                  <p style={{ margin: '2px 0', fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                    🚌 Próxima unidad: ~{stop.nextBusMinutes} min
                  </p>
                )}

                {route?.scheduleInfo && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                    Frecuencia: cada {route.scheduleInfo.frequencyMinutes} min
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
