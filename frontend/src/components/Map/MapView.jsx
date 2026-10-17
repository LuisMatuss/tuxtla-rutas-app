// Componente Cartográfico: Contenedor Leaflet interactivo para Tuxtla Gutiérrez
import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { RouteLayer } from './RouteLayer.jsx';
import { StopMarkers } from './StopMarkers.jsx';
import { LiveUnitsLayer } from './LiveUnitsLayer.jsx';

const TUXTLA_CENTER = [16.7516, -93.1161];
const DEFAULT_ZOOM = 13;

// Catálogo de capas base 100% libres de API Key
const BASEMAP_PROVIDERS = {
  osm: {
    id: 'osm',
    name: 'Mapa Urbano OSM (Estándar)',
    icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  esri: {
    id: 'esri',
    name: 'Mapa Vial Claro (Esri Street)',
    icon: '🛣️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, METI, TomTom',
    maxZoom: 19
  },
  hot: {
    id: 'hot',
    name: 'Mapa Humanitario (OSM HOT)',
    icon: '🌍',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by HOT',
    maxZoom: 19
  }
};

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
  // Capa base seleccionada (por defecto OSM Estándar)
  const [activeBasemapKey, setActiveBasemapKey] = useState('osm');
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const currentBasemap = BASEMAP_PROVIDERS[activeBasemapKey] || BASEMAP_PROVIDERS.osm;

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
      {/* Selector Flotante de Capas en la esquina superior derecha */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 1000
        }}
      >
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            id="basemap-selector-toggle"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              color: '#f8fafc',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <span>{currentBasemap.icon}</span>
            <span>{currentBasemap.name}</span>
            <span style={{ fontSize: '10px', opacity: 0.7 }}>▼</span>
          </button>

          {showLayerMenu && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                width: '260px',
                background: 'rgba(15, 23, 42, 0.96)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '8px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#94a3b8',
                  padding: '4px 8px 2px'
                }}
              >
                Capas 100% Libres (Sin API Key)
              </div>

              {Object.values(BASEMAP_PROVIDERS).map((provider) => {
                const isSelected = provider.id === activeBasemapKey;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => {
                      setActiveBasemapKey(provider.id);
                      setShowLayerMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      background: isSelected
                        ? 'rgba(37, 99, 235, 0.25)'
                        : 'transparent',
                      border: isSelected
                        ? '1px solid rgba(59, 130, 246, 0.5)'
                        : '1px solid transparent',
                      borderRadius: '8px',
                      color: isSelected ? '#60a5fa' : '#e2e8f0',
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{provider.icon}</span>
                    <span style={{ flex: 1 }}>{provider.name}</span>
                    {isSelected && <span style={{ color: '#60a5fa' }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <MapContainer
        center={TUXTLA_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        {/* Capa de mosaicos oficial libre de API Key con render dinámico según selección */}
        <TileLayer
          key={currentBasemap.id}
          url={currentBasemap.url}
          attribution={currentBasemap.attribution}
          maxZoom={currentBasemap.maxZoom}
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

