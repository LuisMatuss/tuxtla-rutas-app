// Componente Cartográfico: Marcadores interactivos para paradas y radar inteligente de rutas
import React, { useMemo } from 'react';
import { CircleMarker, Circle, Popup, Tooltip, Marker } from 'react-leaflet';
import L from 'leaflet';
import { calculateHaversineDistance } from '../../api/client.js';

export function getRouteShortBadge(name) {
  if (!name) return 'R';
  const m = name.match(/Ruta\s+([A-Za-z0-9]+)/i);
  return m ? m[1] : name.slice(0, 3);
}

export function StopMarkers({
  stops = [],
  routes = [],
  visibleRouteIds = null,
  selectedRouteId = null,
  activeStop = null,
  userLocation = null,
  searchRadius = 600,
  onSelectStop,
  onSelectRoute,
  onToggleRouteVisibility,
  onClearUserLocation,
  onStartTripFromLocation
}) {
  // Mapeo rápido de colores y nombres de ruta
  const routeMap = useMemo(() => {
    const map = new Map();
    for (const r of routes) {
      map.set(r.id, r);
    }
    return map;
  }, [routes]);

  // Filtrar paradas para mostrar exclusivamente las de rutas visibles en el mapa o la seleccionada
  const activeStops = useMemo(() => {
    if (!Array.isArray(stops)) return [];
    return stops.filter((stop) => {
      const isVisible = Array.isArray(visibleRouteIds) ? visibleRouteIds.includes(stop.routeId) : false;
      const isSelected = Boolean(selectedRouteId && stop.routeId === selectedRouteId);
      return isVisible || isSelected;
    });
  }, [stops, visibleRouteIds, selectedRouteId]);

  // Rutas únicas que pasan dentro del círculo radar de 600 metros
  const passingRoutes = useMemo(() => {
    if (!userLocation || !Array.isArray(routes)) return [];
    const matched = [];
    for (const r of routes) {
      let isNear = false;
      // 1. Verificar paradas de la ruta dentro de 600m
      if (Array.isArray(r.stops)) {
        for (const s of r.stops) {
          const d = calculateHaversineDistance(userLocation.lat, userLocation.lng, s.lat, s.lng);
          if (d <= 600) {
            isNear = true;
            break;
          }
        }
      }
      // 2. Si no hubo parada cercana, verificar trazado geométrico muestreado
      if (!isNear) {
        const coords = r.outboundGeometry?.coordinates || r.geometry?.coordinates || [];
        for (let i = 0; i < coords.length; i += 6) {
          const [lng, lat] = coords[i];
          const d = calculateHaversineDistance(userLocation.lat, userLocation.lng, lat, lng);
          if (d <= 600) {
            isNear = true;
            break;
          }
        }
      }
      if (isNear) {
        matched.push(r);
      }
    }

    // Ordenar de forma natural: 1, A, 22, 30, 43, 51, 52, 58, 73, 90, 108, 115
    return matched.sort((a, b) => {
      const codeA = getRouteShortBadge(a.name);
      const codeB = getRouteShortBadge(b.name);
      const numA = parseInt(codeA, 10);
      const numB = parseInt(codeB, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;
      return codeA.localeCompare(codeB);
    });
  }, [userLocation, routes]);

  // Coordenada del extremo norte del círculo (userLocation.lat + 0.0056, userLocation.lng)
  const hudPosition = useMemo(() => {
    if (!userLocation) return null;
    return [userLocation.lat + 0.0056, userLocation.lng];
  }, [userLocation]);

  return (
    <>
      {/* 1. Círculo Radar Inteligente (Radio 600 metros, verde esmeralda #10b981) */}
      {userLocation && (
        <>
          {/* Círculo de 600m con borde verde esmeralda y relleno sutil */}
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={600}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.08,
              weight: 2.5
            }}
          />

          {/* Marcador central del radar (clic para cerrar el círculo) */}
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={8}
            pathOptions={{
              color: '#ffffff',
              fillColor: '#10b981',
              fillOpacity: 1,
              weight: 3
            }}
            eventHandlers={{
              click: () => {
                if (onClearUserLocation) onClearUserLocation();
              }
            }}
          >
            <Tooltip direction="bottom" offset={[0, 8]}>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                📍 Centro del Radar (Haz clic o pulsa Esc para cerrar)
              </span>
            </Tooltip>
          </CircleMarker>

          {/* Cartel Flotante HUD justo encima del borde norte del círculo */}
          {hudPosition && (
            <Marker
              position={hudPosition}
              icon={L.divIcon({
                className: 'radar-hud-anchor',
                html: '',
                iconSize: [0, 0]
              })}
            >
              <Tooltip
                permanent
                interactive
                direction="top"
                offset={[0, -2]}
                className="radar-hud-tooltip"
              >
                <div
                  id="radar-hud-card"
                  style={{
                    background: 'rgba(15, 23, 42, 0.96)',
                    backdropFilter: 'blur(16px)',
                    border: '1.5px solid #10b981',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.65), 0 0 15px rgba(16, 185, 129, 0.25)',
                    minWidth: '220px',
                    maxWidth: '300px',
                    color: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    pointerEvents: 'auto',
                    fontFamily: 'inherit'
                  }}
                >
                  {/* Encabezado: Título corto "Rutas" y Botón de Cierre "✕" */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#10b981',
                          boxShadow: '0 0 8px #10b981'
                        }}
                      />
                      <strong style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
                        Rutas
                      </strong>
                      <span style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 700 }}>
                        ({passingRoutes.length})
                      </span>
                    </div>

                    <button
                      type="button"
                      id="btn-close-radar-hud"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onClearUserLocation) onClearUserLocation();
                      }}
                      title="Eliminar círculo radar (o presiona Escape)"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        width: '22px',
                        height: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.35)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Badges numéricos grandes de cada ruta única */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      padding: '2px 0'
                    }}
                  >
                    {passingRoutes.length > 0 ? (
                      passingRoutes.map((r) => {
                        const badge = getRouteShortBadge(r.name);
                        const isSelected = selectedRouteId === r.id;
                        const routeColor = r.color || '#10b981';

                        return (
                          <button
                            key={r.id}
                            type="button"
                            id={`radar-route-badge-${badge}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectRoute) onSelectRoute(r.id);
                              if (onToggleRouteVisibility && (!visibleRouteIds || !visibleRouteIds.includes(r.id))) {
                                onToggleRouteVisibility(r.id);
                              }
                            }}
                            title={`Activar y resaltar ${r.name}`}
                            style={{
                              minWidth: '38px',
                              height: '32px',
                              padding: '0 8px',
                              borderRadius: '8px',
                              border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.25)',
                              background: routeColor,
                              color: '#ffffff',
                              fontSize: '13px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: isSelected
                                ? '0 0 12px rgba(255, 255, 255, 0.6)'
                                : '0 2px 6px rgba(0, 0, 0, 0.4)',
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                          >
                            {badge}
                          </button>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
                        Sin rutas directas en 600m
                      </span>
                    )}
                  </div>

                  {/* Botón rápido "Ir desde aquí" */}
                  <button
                    type="button"
                    id="btn-radar-ir-desde-aqui"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onStartTripFromLocation) {
                        onStartTripFromLocation(userLocation);
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>🚶</span>
                    <span>Ir desde aquí</span>
                  </button>
                </div>
              </Tooltip>
            </Marker>
          )}
        </>
      )}

      {/* 2. Marcadores de Paradas Oficiales */}
      {activeStops.map((stop) => {
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
