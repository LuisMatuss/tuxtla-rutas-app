// Componente de Mapa: Contenedor base de Leaflet centrado en Tuxtla Gutiérrez (16.7516, -93.1161)
import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { RouteLayer } from './RouteLayer.jsx';
import { StopMarkers } from './StopMarkers.jsx';

const TUXTLA_CENTER = [16.7516, -93.1161];
const DEFAULT_ZOOM = 13;

export function MapView({ selectedRoute, stops = [] }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={TUXTLA_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <RouteLayer route={selectedRoute} />
        <StopMarkers stops={stops} />
      </MapContainer>
    </div>
  );
}
