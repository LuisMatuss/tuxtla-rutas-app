// Componente Cartográfico: Contenedor Leaflet interactivo para Tuxtla Gutiérrez
import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { RouteLayer } from './RouteLayer.jsx';
import { StopMarkers } from './StopMarkers.jsx';
import { LiveUnitsLayer } from './LiveUnitsLayer.jsx';

const TUXTLA_CENTER = [16.7516, -93.1161];
const DEFAULT_ZOOM = 13;

/**
 * Controlador de eventos del mapa: Clics para geolocalizar usuario
 */
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    }
  });
  return null;
}

/**
 * Controlador de cámara animada (flyTo y fitBounds suaves)
 */
function MapCameraController({ selectedRoute, activeStop, userLocation }) {
  const map = useMap();

  // Enfoque a parada individual
  useEffect(() => {
    if (activeStop) {
      const lat =
        activeStop.lat !== undefined
          ? Number(activeStop.lat)
          : activeStop.geometry?.coordinates?.[1];
      const lng =
        activeStop.lng !== undefined
          ? Number(activeStop.lng)
          : activeStop.geometry?.coordinates?.[0];

      if (lat && lng && Number.isFinite(lat) && Number.isFinite(lng)) {
        map.flyTo([lat, lng], 16, { duration: 1.2 });
      }
    }
  }, [activeStop, map]);

  // Enfoque a ruta completa mediante bounding box
  useEffect(() => {
    if (selectedRoute && !activeStop) {
      const rawCoords =
        selectedRoute.geometry?.coordinates ||
        selectedRoute.coordinates ||
        [];

      if (Array.isArray(rawCoords) && rawCoords.length > 0) {
        const leafletPositions = rawCoords.map(([lng, lat]) => [lat, lng]);
        const bounds = L.latLngBounds(leafletPositions);
        map.fitBounds(bounds, { padding: [50, 50], duration: 1.2 });
      }
    }
  }, [selectedRoute, activeStop, map]);

  // Enfoque a ubicación de usuario recién seleccionada
  useEffect(() => {
    if (userLocation && !activeStop && !selectedRoute) {
      map.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 1.0 });
    }
  }, [userLocation, activeStop, selectedRoute, map]);

  return null;
}

export function MapView({
  routes = [],
  selectedRouteId = null,
  selectedRoute = null,
  activeStop = null,
  userLocation = null,
  units = [],
  onMapClick,
  onSelectRoute,
  onSelectStop
}) {
  // Paradas visibles según la selección actual
  const visibleStops = useMemo(() => {
    if (selectedRoute && selectedRoute.stops && selectedRoute.stops.length > 0) {
      return selectedRoute.stops;
    }
    // Si no hay ruta seleccionada, muestra todas las paradas de todas las rutas
    const all = [];
    const seenIds = new Set();
    for (const r of routes) {
      if (Array.isArray(r.stops)) {
        for (const s of r.stops) {
          if (!seenIds.has(s.id)) {
            seenIds.add(s.id);
            all.push({
              ...s,
              routeName: r.name,
              routeColor: r.color
            });
          }
        }
      }
    }
    return all;
  }, [routes, selectedRoute]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={TUXTLA_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        {/* Capa de mosaicos CartoDB Voyager para alta legibilidad urbana */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* Controladores de cámara y eventos */}
        <MapClickHandler onMapClick={onMapClick} />
        <MapCameraController
          selectedRoute={selectedRoute}
          activeStop={activeStop}
          userLocation={userLocation}
        />

        {/* Trazados vectoriales de rutas */}
        <RouteLayer
          routes={routes}
          selectedRouteId={selectedRouteId}
          onSelectRoute={onSelectRoute}
        />

        {/* Marcadores de paradas y usuario */}
        <StopMarkers
          stops={visibleStops}
          routes={routes}
          selectedRouteId={selectedRouteId}
          activeStop={activeStop}
          userLocation={userLocation}
          searchRadius={1500}
          onSelectStop={onSelectStop}
        />

        {/* Capa de telemetría de unidades colectivas en tiempo real */}
        <LiveUnitsLayer units={units} />
      </MapContainer>

      {/* Indicador de ayuda flotante */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '8px 14px',
          borderRadius: '20px',
          color: '#e2e8f0',
          fontSize: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          pointerEvents: 'none'
        }}
      >
        <span>💡</span>
        <span>Haz clic en cualquier punto del mapa para encontrar paradas cercanas</span>
      </div>
    </div>
  );
}
