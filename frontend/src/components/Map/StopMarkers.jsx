// Componente de Mapa: Renderizado de marcadores interactivos (Point) para paradas de autobús
import React from 'react';
import { CircleMarker, Popup } from 'react-leaflet';

export function StopMarkers({ stops = [] }) {
  if (!stops || stops.length === 0) {
    return null;
  }

  return (
    <>
      {stops.map((stop) => (
        <CircleMarker
          key={stop.id}
          center={[stop.coordinate.latitude, stop.coordinate.longitude]}
          radius={6}
          pathOptions={{
            color: '#ffffff',
            fillColor: '#059669',
            fillOpacity: 0.9,
            weight: 2
          }}
        >
          <Popup>
            <div style={{ color: '#0f172a' }}>
              <strong>{stop.name}</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>{stop.address}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
