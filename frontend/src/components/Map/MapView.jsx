// Componente Cartográfico: Contenedor Leaflet interactivo para Tuxtla Gutiérrez
// Integra visualización de 8 rutas, paradas, telemetría cinemática en vivo,
// alertas viales, puntos personales (Casa/Escuela/Trabajo) y planificación de viajes.

import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { RouteLayer } from './RouteLayer.jsx';
import { StopMarkers } from './StopMarkers.jsx';
import { LiveUnitsLayer } from './LiveUnitsLayer.jsx';
import { PersonalPointsMarkers } from './PersonalPointsMarkers.jsx';
import { RoadAlertMarkers } from './RoadAlertMarkers.jsx';
import { PlannedTripLayer } from './PlannedTripLayer.jsx';

const TUXTLA_CENTER = [16.7516, -93.1161];
const DEFAULT_ZOOM = 13;

// Límites geográficos estrictos para encerrar la cámara exclusivamente en Tuxtla Gutiérrez y su zona conurbada
const TUXTLA_MAX_BOUNDS = [
  [16.6850, -93.2250], // Suroeste (Terán Sur / Real del Bosque / Copoya)
  [16.8350, -93.0200]  // Noreste (Cañón del Sumidero / Chiapa de Corzo)
];

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
 * Controlador de eventos del mapa: Clics para geolocalizar usuario o fijar coordenadas
 */
function MapClickHandler({ onMapClick, pickingTarget, onPickCoordinate }) {
  useMapEvents({
    click(e) {
      const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (pickingTarget && onPickCoordinate) {
        onPickCoordinate(coords);
      } else if (onMapClick) {
        onMapClick(coords);
      }
    }
  });
  return null;
}

/**
 * Controlador de cámara animada (flyTo y fitBounds seguros y estables)
 */
function MapCameraController({ selectedRouteId, routes = [], activeStop, userLocation, selectedTrip }) {
  const map = useMap();
  const prevRouteIdRef = React.useRef(null);
  const prevStopIdRef = React.useRef(null);
  const prevUserLocRef = React.useRef(null);

  // Enfoque a ruta completa ÚNICAMENTE cuando cambia el valor primitivo selectedRouteId
  useEffect(() => {
    if (prevRouteIdRef.current === selectedRouteId) {
      return;
    }
    prevRouteIdRef.current = selectedRouteId;

    if (!selectedRouteId || activeStop || selectedTrip) {
      return;
    }

    const route = routes.find((r) => r.id === selectedRouteId);
    if (!route) return;

    const rawCoords = route.geometry?.coordinates || route.coordinates || [];
    if (!Array.isArray(rawCoords) || rawCoords.length === 0) return;

    try {
      // Invertir estrictamente GeoJSON [lng, lat] -> Leaflet [lat, lng]
      const leafletPositions = rawCoords
        .map((coord) => {
          if (!Array.isArray(coord) || coord.length < 2) return null;
          const lng = Number(coord[0]);
          const lat = Number(coord[1]);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return [lat, lng];
        })
        .filter(Boolean);

      if (leafletPositions.length === 0) return;

      const bounds = L.latLngBounds(leafletPositions);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [40, 40],
          maxZoom: 15,
          animate: true,
          duration: 0.8
        });
      }
    } catch (err) {
      console.warn('[MapCameraController] Error al enfocar ruta seleccionada:', err);
    }
  }, [selectedRouteId, routes, activeStop, selectedTrip, map]);

  // Enfoque a parada individual cuando cambia activeStop
  useEffect(() => {
    const stopId = activeStop?.id;
    if (prevStopIdRef.current === stopId) return;
    prevStopIdRef.current = stopId;

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
        try {
          map.flyTo([lat, lng], 16, { duration: 0.8 });
        } catch (err) {
          console.warn('[MapCameraController] Error al volar a parada:', err);
        }
      }
    }
  }, [activeStop, map]);

  // Enfoque a ubicación de usuario recién seleccionada
  const userLocKey = userLocation ? `${userLocation.lat},${userLocation.lng}` : null;
  useEffect(() => {
    if (prevUserLocRef.current === userLocKey) return;
    prevUserLocRef.current = userLocKey;

    if (userLocation && !activeStop && !selectedRouteId && !selectedTrip) {
      try {
        map.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 0.8 });
      } catch (err) {
        console.warn('[MapCameraController] Error al volar a ubicación de usuario:', err);
      }
    }
  }, [userLocKey, userLocation, activeStop, selectedRouteId, selectedTrip, map]);

  return null;
}

export function MapView({
  routes = [],
  selectedRouteId = null,
  selectedRoute = null,
  activeStop = null,
  userLocation = null,
  units = [],
  personalPoints = {},
  incidents = [],
  selectedTrip = null,
  pickingTarget = null,
  onPickCoordinate,
  onCancelPicking,
  onMapClick,
  onSelectRoute,
  onSelectStop
}) {
  // Capa base seleccionada (por defecto OSM Estándar)
  const [activeBasemapKey, setActiveBasemapKey] = useState('osm');
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const currentBasemap = BASEMAP_PROVIDERS[activeBasemapKey] || BASEMAP_PROVIDERS.osm;

  // Paradas de las 8 rutas: se mantienen todas en el DOM para que ninguna desaparezca al seleccionar ruta
  const allStops = useMemo(() => {
    const all = [];
    const seenIds = new Set();
    for (const r of routes) {
      if (Array.isArray(r.stops)) {
        for (const s of r.stops) {
          if (!seenIds.has(s.id)) {
            seenIds.add(s.id);
            all.push({
              ...s,
              routeId: s.routeId || r.id,
              routeName: r.name,
              routeColor: r.color
            });
          }
        }
      }
    }
    return all;
  }, [routes]);

  // Nombre legible del objetivo de selección en mapa
  const pickingLabel = useMemo(() => {
    if (!pickingTarget) return '';
    if (pickingTarget === 'casa') return '🏠 Mi Casa (Punto de Partida)';
    if (pickingTarget === 'escuela') return '🎓 Escuela / UNACH';
    if (pickingTarget === 'trabajo') return '💼 Mi Trabajo';
    if (pickingTarget === 'incident') return '⚠️ Ubicación de la Alerta Vial';
    return 'Punto de Referencia';
  }, [pickingTarget]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Banner flotante de MODO SELECCIÓN / PICKING */}
      {pickingTarget && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1100,
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.96) 0%, rgba(15, 23, 42, 0.96) 100%)',
            backdropFilter: 'blur(12px)',
            border: '2px solid #60a5fa',
            borderRadius: '24px',
            padding: '8px 20px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'pulse 2s infinite'
          }}
        >
          <span style={{ fontSize: '16px' }}>📍</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
            Haz clic en cualquier calle para fijar: <strong style={{ color: '#93c5fd' }}>{pickingLabel}</strong>
          </span>
          {onCancelPicking && (
            <button
              type="button"
              onClick={onCancelPicking}
              style={{
                background: 'rgba(239, 68, 68, 0.25)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                borderRadius: '12px',
                padding: '3px 10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      )}

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
            <span style={{ fontSize: '12px', opacity: 0.7 }}>▼</span>
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
                  fontSize: '12px',
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
        minZoom={12}
        maxBounds={TUXTLA_MAX_BOUNDS}
        maxBoundsViscosity={1.0}
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
        <MapClickHandler
          onMapClick={onMapClick}
          pickingTarget={pickingTarget}
          onPickCoordinate={onPickCoordinate}
        />
        <MapCameraController
          selectedRouteId={selectedRouteId}
          routes={routes}
          activeStop={activeStop}
          userLocation={userLocation}
          selectedTrip={selectedTrip}
        />

        {/* Trazados vectoriales de rutas */}
        <RouteLayer
          routes={routes}
          selectedRouteId={selectedRouteId}
          onSelectRoute={onSelectRoute}
        />

        {/* Marcadores de paradas y usuario (mantiene las 8 rutas visibles) */}
        <StopMarkers
          stops={allStops}
          routes={routes}
          selectedRouteId={selectedRouteId}
          activeStop={activeStop}
          userLocation={userLocation}
          searchRadius={1500}
          onSelectStop={onSelectStop}
        />

        {/* Marcadores de puntos personales: Casa, Escuela, Trabajo */}
        <PersonalPointsMarkers personalPoints={personalPoints} />

        {/* Marcadores de alertas viales activas */}
        <RoadAlertMarkers incidents={incidents} routes={routes} />

        {/* Capa de telemetría de unidades colectivas en tiempo real */}
        <LiveUnitsLayer units={units} />

        {/* Resaltado de viaje seleccionado (Directo o Trasbordo) */}
        {selectedTrip && <PlannedTripLayer selectedTrip={selectedTrip} />}
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
        <span>
          {pickingTarget
            ? 'Haz clic sobre el mapa para fijar la coordenada'
            : 'Haz clic en cualquier punto para encontrar paradas cercanas'}
        </span>
      </div>
    </div>
  );
}
